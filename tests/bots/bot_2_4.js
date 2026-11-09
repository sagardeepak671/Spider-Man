// Boss bot for stage 2-4: plays the Green Goblin fight with keyboard events (same listener as real keys), only from
// the roof floor: dodges bombs (predicted landing + lit rings), jumps over swoops in its lane, shoots when he is at
// web height, picks up canisters when low. It records what happened.
(function() {
	var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, X: 88 };
	function key(code, down) {
		var e = new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true, cancelable: true });
		Object.defineProperty(e, "keyCode", { get: function() { return code; } });
		document.dispatchEvent(e);
	}
	var bot = { held: {}, shootWait: 0, hits: [], log: [], stats: { bombHits: 0, swoopHits: 0, jumpsOverSwoop: 0, shots: 0, refills: 0 },
		hold: function(c, on) { if (on && !this.held[c]) { key(c, true); this.held[c] = true; } if (!on && this.held[c]) { key(c, false); this.held[c] = false; } },
		tap: function(c) { key(c, true); key(c, false); this.held[c] = false; },
		releaseAll: function() { for (var c in this.held) if (this.held[c]) this.hold(+c, false); } };
	window.BOSSBOT = bot;
	var CFG = SpidermanGame.__boss ? SpidermanGame.__boss.GOBLIN : { BLAST: 62, BOMB_GRAVITY: 0.14 };

	function walkTo(s, x, tolerance) {
		var cx = s.centerX();
		if (Math.abs(cx - x) <= (tolerance || 6)) { bot.hold(K.LEFT, false); bot.hold(K.RIGHT, false); return true; }
		bot.hold(x > cx ? K.RIGHT : K.LEFT, true); bot.hold(x > cx ? K.LEFT : K.RIGHT, false);
		return false;
	}
	// where a flying bomb comes down at the height of his feet
	function landingX(b, feet) {
		var x = b.x, y = b.y, vx = b.velocityX, vy = b.velocityY;
		for (var i = 0; i < 200; i++) { vy += CFG.BOMB_GRAVITY; x += vx; y += vy; if (vy > 0 && y + b.radius >= feet) return x; }
		return x;
	}
	bot.tick = function(s) {
		var game = window.game;
		if (game.state !== "PLAYING" || s !== game.spiderman || !game.level || !game.level.boss) return;
		var boss = game.level.boss, W = game.level.width, cx = s.centerX(), hb = s.getHitbox(), feet = hb.bottom;
		if (this.hp !== undefined && s.health < this.hp) {
			var cause = boss.state === "SWOOP" ? "swoop" : "bomb";
			if (cause === "swoop") this.stats.swoopHits++; else this.stats.bombHits++;
			this.hits.push(cause + "@" + game.levelFrames);
		}
		this.hp = s.health;
		if (this.web !== undefined && s.web > this.web) this.stats.refills++;
		this.web = s.web;
		if (boss.state === "DEFEATED" || boss.state === "ENTER") { this.releaseAll(); return; }

		// 1. a swoop in his lane: jump when the goblin is about to reach him
		if (!window.NODODGE && boss.state === "SWOOP" && boss.swoop && Math.abs(boss.swoop.laneY - (feet - 42)) < 35) {
			if (boss.swoop.rushing) {
				var dir = boss.swoop.dir, speed = boss.phase === 2 ? 11 : 9;
				var bb = boss.getHitbox();
				var gap = dir > 0 ? hb.left - bb.right : bb.left - hb.right;   // > 0 while he is still coming
				if (gap > 0 && gap < speed * 9 && s.onGround) { this.tap(K.SPACE); this.stats.jumpsOverSwoop++; }
				this.hold(K.LEFT, false); this.hold(K.RIGHT, false);
				return;
			}
		}
		// 2. bombs: lit rings and predicted landings near him -> move away (toward the side with more room)
		var danger = null;
		var bombs = game.scene.projectiles.filter(function(p) { return p.name === "PUMPKIN_BOMB"; });
		for (var i = 0; i < bombs.length; i++) {
			var b = bombs[i], bx = b.fuse >= 0 ? b.x : landingX(b, feet);
			if (b.fuse >= 0 && Math.abs(b.y + b.radius - feet) > 60) continue;
			if (Math.abs(bx - cx) < CFG.BLAST + 45) { danger = bx; break; }
		}
		if (danger !== null && s.onGround && !window.NODODGE) {
			var goRight = danger < cx ? true : false;
			if (goRight && cx > W - 110) goRight = false;
			if (!goRight && cx < 110) goRight = true;
			var safeX = goRight ? danger + CFG.BLAST + 80 : danger - CFG.BLAST - 80;
			walkTo(s, Math.max(60, Math.min(W - 60, safeX)), 4);
			return;
		}
		// 3. low on web: go get a canister lying on the floor
		if (s.web < 6) {
			var cans = game.scene.pickups.filter(function(p) { return p.type === "WEB" && !p.collected && p.y > 450; });
			if (cans.length) { cans.sort(function(a, b) { return Math.abs(a.x - cx) - Math.abs(b.x - cx); }); walkTo(s, cans[0].x, 8); return; }
		}
		// 4. attack: stand 180-320 px from him, face him, shoot when he is at web height
		var webY = s.y + s.bodyHeight() / 2, gb = boss.getHitbox();
		var atHeight = gb.top < webY && gb.bottom > webY;
		var bxc = boss.centerX(), dist = bxc - cx;
		var want = bxc + (cx < bxc ? -240 : 240);
		if (want < 60 || want > W - 60) want = bxc + (cx < bxc ? 240 : -240);
		want = Math.max(60, Math.min(W - 60, want));
		if (atHeight && Math.abs(dist) > 110) {
			var face = dist > 0 ? 1 : -1;
			if (s.runningDirection !== face) { this.hold(face > 0 ? K.RIGHT : K.LEFT, true); this.hold(face > 0 ? K.LEFT : K.RIGHT, false); return; }
			this.hold(K.LEFT, false); this.hold(K.RIGHT, false);
			if (this.shootWait-- <= 0) { this.tap(K.X); this.shootWait = 14; this.stats.shots++; }
			return;
		}
		walkTo(s, want, 30);
	};
	var orig = SpiderMan.prototype.update;
	SpiderMan.prototype.update = function() {
		try { if (window.BOSSBOT) window.BOSSBOT.tick(this); } catch (e) { window.BOSSBOT.log.push("ERR " + e.message); }
		return orig.apply(this, arguments);
	};
})();
