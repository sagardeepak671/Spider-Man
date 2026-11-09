// Boss bot for stage 3-4: plays the Sandman fight with keyboard events (same listener as real keys). It waits on the
// left ledge at the valve until sandman walks into the pipe's stream, opens it (E), webs him while he is soaked,
// steps out of fist zones, jumps ground waves, and fetches web canisters when the tank runs low. It records what
// happened. window.NODODGE: it never dodges (a careless player must lose).
(function() {
	var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, X: 88, E: 69 };
	function key(code, down) {
		var e = new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true, cancelable: true });
		Object.defineProperty(e, "keyCode", { get: function() { return code; } });
		document.dispatchEvent(e);
	}
	var bot = { held: {}, log: [], hits: [], stats: { fistHits: 0, waveHits: 0, contactHits: 0, soaks: 0, shots: 0, hits: 0, refills: 0, jumps: 0, dodges: 0 },
		hold: function(c, on) { if (on && !this.held[c]) { key(c, true); this.held[c] = true; } if (!on && this.held[c]) { key(c, false); this.held[c] = false; } },
		tap: function(c) { key(c, true); key(c, false); this.held[c] = false; },
		releaseAll: function() { for (var c in this.held) if (this.held[c]) this.hold(+c, false); },
		note: function(t) { this.log.push(Math.round(window.game.levelFrames) + ": " + t); } };
	window.BOSSBOT = bot;
	var CFG = SpidermanGame.__boss.SANDMAN;
	var LEDGE = 430, VALVE_X = 70;

	function walkTo(s, x, tolerance) {
		var cx = s.centerX();
		if (Math.abs(cx - x) <= (tolerance || 6)) { bot.hold(K.LEFT, false); bot.hold(K.RIGHT, false); return true; }
		bot.hold(x > cx ? K.RIGHT : K.LEFT, true); bot.hold(x > cx ? K.LEFT : K.RIGHT, false);
		return false;
	}
	function face(s, x) {
		var want = x > s.centerX() ? 1 : -1;
		if (s.runningDirection !== want) { bot.hold(want > 0 ? K.RIGHT : K.LEFT, true); return false; }
		bot.hold(K.LEFT, false); bot.hold(K.RIGHT, false);
		return true;
	}

	bot.tick = function(s) {
		var game = window.game;
		if (game.state !== "PLAYING" || s !== game.spiderman || !game.level || !game.level.boss) return;
		var boss = game.level.boss, hb = s.getHitbox(), cx = s.centerX(), feet = s.y + s.bodyHeight();
		// a held key the game forgot (hits let go of nothing, but a retry does): pressed again like auto-repeat
		for (var code in this.held) if (this.held[code] && !s.keyIsDown(+code)) key(+code, true);
		if (this.hp !== undefined && s.health < this.hp) {
			var cause = boss.fists.some(function(f) { return f.state === "REST" && f.t < 3; }) ? "fist" : (boss.waves.length ? "wave" : "contact");
			this.stats[cause + "Hits"]++;
			this.hits.push(cause + "@" + game.levelFrames);
		}
		this.hp = s.health;
		if (this.web !== undefined && s.web > this.web) this.stats.refills++;
		this.web = s.web;
		if (this.bossHp !== undefined && boss.health < this.bossHp) this.stats.hits++;
		this.bossHp = boss.health;
		if (boss.state === "DEFEATED" || boss.state === "ENTER") { this.releaseAll(); return; }
		var onLedge = s.onGround && Math.abs(feet - LEDGE) < 2 && cx < 260;

		if (!window.NODODGE) {
			// 1. a ground wave rolling at him on the floor: jump it
			if (s.onGround && feet > LEDGE + 50) {
				for (var i = 0; i < boss.waves.length; i++) {
					var w = boss.waves[i], gap = (w.x - cx) * -w.dir;     // > 0 while it is still coming
					if (gap > 20 && gap < 95) { this.tap(K.SPACE); this.stats.jumps++; this.note("jump wave"); return; }
				}
			}
			// 2. standing in a fist's zone: get out (on the ledge: to its inner edge; on the floor: away from it)
			for (var j = 0; j < boss.fists.length; j++) {
				var f = boss.fists[j];
				if ((f.state !== "WARN" && f.state !== "DROP") || Math.abs(f.surface - feet) > 4) continue;   // (still coming down: stay out)
				if (hb.right > f.x - CFG.FIST_WIDTH / 2 - 6 && hb.left < f.x + CFG.FIST_WIDTH / 2 + 6) {
					var target = onLedge ? (f.x < 150 ? 215 : 45) : (f.x < cx ? f.x + CFG.FIST_WIDTH / 2 + 40 : f.x - CFG.FIST_WIDTH / 2 - 40);
					if (this.lastDodge !== f) { this.stats.dodges++; this.lastDodge = f; this.note("dodge fist at " + Math.round(f.x)); }
					walkTo(s, target, 3);
					return;
				}
			}
		}
		// 3. soaked: web him from where he stands
		if (boss.isSoaked()) {
			if (!s.onGround) return;
			if (face(s, boss.centerX()) && s.shootCooldown <= 0 && s.web > 0) { this.tap(K.X); this.stats.shots++; }
			return;
		}
		// 4. low on web: fetch a canister (the closest)
		if (s.web <= 14) {
			var best = null;
			game.scene.pickups.forEach(function(p) { if (p.type === "WEB" && (!best || Math.abs(p.x - cx) < Math.abs(best.x - cx))) best = p; });
			if (best) {
				var up = best.y < LEDGE;                        // on a ledge
				if (up && !onLedge && best.x < 260) { if (walkTo(s, 110, 20) && s.onGround) this.tap(K.SPACE); return; }
				walkTo(s, best.x, 4);
				return;
			}
		}
		// 5. up onto the left ledge, to the valve
		if (!onLedge) {
			if (cx > 240) { walkTo(s, 120, 20); return; }
			this.hold(K.LEFT, false); this.hold(K.RIGHT, false);
			if (s.onGround) this.tap(K.SPACE);
			return;
		}
		if (!walkTo(s, VALVE_X, 8)) return;
		// 6. at the valve: open it when he is in the stream and it is ready
		var valve = game.level.controls.filter(function(c) { return c.id === "VL"; })[0];
		var me = boss.getHitbox(), sp = valve.spray;
		var inStream = me.right > sp.x - sp.width / 2 + 10 && me.left < sp.x + sp.width / 2 - 10;
		if (valve.cooldown <= 0 && inStream && game.level.controlInReach === valve) { this.tap(K.E); this.stats.soaks++; this.note("valve"); return; }
		face(s, boss.centerX());
	};

	var orig = SpiderMan.prototype.update;
	SpiderMan.prototype.update = function() {
		try { if (window.BOSSBOT) window.BOSSBOT.tick(this); } catch (e) { window.BOSSBOT.log.push("BOT ERROR " + e.message); }
		return orig.apply(this, arguments);
	};
})();
