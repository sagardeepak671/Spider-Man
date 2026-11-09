// Route bot for stage 3-1 HARBOUR DOCKS: runs inside the page once per game frame (hooked in front of
// SpiderMan.update) and plays with keyboard events dispatched on document - the same listener real key presses go
// through. It never teleports: it walks, jumps, swings, drops into the container alley, frees worker 1 with E, climbs
// the ladder out, webs both marked ropes (the container bridge and the pallet step), goes down the ship's hatch,
// frees worker 2, climbs back up and reaches the exit.
(function() {
	var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, X: 88, E: 69 };
	function key(code, down) {
		var e = new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true, cancelable: true });
		Object.defineProperty(e, "keyCode", { get: function() { return code; } });
		document.dispatchEvent(e);
	}

	var bot = {
		held: {}, log: [], step: 0, frames: 0, stuck: 0, lastX: null, shootWait: 0, deaths: 0, done: false,
		hold: function(code, on) {
			if (on && !this.held[code]) { key(code, true); this.held[code] = true; }
			if (!on && this.held[code]) { key(code, false); this.held[code] = false; }
		},
		tap: function(code) { key(code, true); key(code, false); this.held[code] = false; },
		releaseAll: function() { for (var c in this.held) if (this.held[c]) this.hold(+c, false); },
		note: function(t) { this.log.push(Math.round(game.levelFrames) + ": " + t); },
	};
	window.BOT = bot;

	function feet(s) { return s.y + s.bodyHeight(); }
	function right(s) { return s.x + s.bodyWidth(); }
	function cx(s) { return s.x + s.bodyWidth() / 2; }
	function ground(s) { return s.onGround ? s.groundRoof : null; }
	// is there a platform continuing right after the current one (about the same height, within 4 px)?
	function continues(s) {
		var g = ground(s);
		if (!g) return true;
		var end = g.x + g.fullWidth;
		var roofs = game.scene.roofs;
		for (var i = 0; i < roofs.length; i++) {
			var r = roofs[i];
			if (r === g || !r.isSolid()) continue;
			if (r.x <= end + 4 && r.x + r.fullWidth > end + 4 && Math.abs(r.y - g.y) <= 25) return true;
		}
		return false;
	}
	function enemyAhead(s, dir) {
		dir = dir || 1;
		var hb = s.getHitbox(), my = (hb.top + hb.bottom) / 2, best = null;
		var list = game.scene.enemies;
		for (var i = 0; i < list.length; i++) {
			var e = list[i];
			if (!(e.health > 0)) continue;
			var dx = (e.centerX() - cx(s)) * dir;
			if (dx < -40 || dx > 440) continue;
			if (Math.abs(e.centerY() - my) > 30) continue;
			// a web cannot get through cover (crate stacks, barrels): walk on and jump it instead
			var obs = game.getObstacles(), covered = false;
			for (var o = 0; o < obs.length; o++) {
				var lo = Math.min(cx(s), e.centerX()), hi = Math.max(cx(s), e.centerX());
				if (obs[o].left() > lo && obs[o].right() < hi && obs[o].top() <= my + 2 && obs[o].bottom() >= my - 2) covered = true;
			}
			if (covered) continue;
			if (!best || dx < best.dx) best = { e: e, dx: dx };
		}
		return best;
	}
	function hazardAhead(s, dir) {
		var hz = game.level.hazards;
		for (var i = 0; i < hz.length; i++) {
			var h = hz[i];
			var d = dir < 0 ? s.x - (h.x + h.width) : h.x - right(s);
			if (d > 0 && d < 34 && Math.abs(h.y - feet(s)) < 5) return h;
		}
		return null;
	}

	// generic "walk right" with reflexes. opts: { drop: true } walk off edges instead of jumping gaps
	function walkRight(s, opts) {
		opts = opts || {};
		var foe = enemyAhead(s, 1);
		if (foe) {
			bot.why = "foe " + foe.e.name;
			bot.hold(K.RIGHT, false);
			if (foe.dx < 110) { bot.hold(K.LEFT, true); return; }     // too close for a web: back off first
			bot.hold(K.LEFT, false);
			if (s.runningDirection !== 1) { bot.hold(K.RIGHT, true); return; }
			if (bot.shootWait-- <= 0 && s.web > 0) { bot.tap(K.X); bot.shootWait = 14; }
			return;
		}
		bot.why = "walk";
		bot.hold(K.LEFT, false);
		bot.hold(K.RIGHT, true);
		if (!s.onGround) return;
		if (hazardAhead(s, 1)) { bot.tap(K.SPACE); bot.note("jump hazard"); return; }
		var g = ground(s);
		if (g && !opts.drop && !continues(s) && g.x + g.fullWidth - right(s) < 10) { bot.tap(K.SPACE); bot.note("jump gap at " + Math.round(g.x + g.fullWidth)); return; }
		// blocked (a step up, a crate stack): jump
		if (bot.lastX !== null && Math.abs(s.x - bot.lastX) < 0.5) {
			if (++bot.stuck > 3) { bot.tap(K.SPACE); bot.stuck = 0; bot.note("jump blocked at " + Math.round(s.x)); }
		} else bot.stuck = 0;
	}

	// ---- route steps ----
	function reach(x, opts) { return { name: "walk to " + x, tick: function(s) { if (cx(s) >= x && s.onGround) return true; walkRight(s, opts); } }; }
	function walkLeftTo(x) {
		return { name: "walk left to " + x, tick: function(s) {
			bot.hold(K.RIGHT, false);
			if (cx(s) <= x && s.onGround) { bot.hold(K.LEFT, false); return true; }
			bot.hold(K.LEFT, true);
			if (s.onGround && hazardAhead(s, -1)) { bot.tap(K.SPACE); bot.note("jump hazard (left)"); }
		} };
	}
	function climbAt(ladderX, topY) {
		return { name: "climb at " + ladderX, tick: function(s) {
			if (!s.climbing && s.onGround && Math.abs(feet(s) - topY) < 3) { bot.hold(K.UP, false); return true; }
			if (s.climbing) { bot.hold(K.RIGHT, false); bot.hold(K.LEFT, false); bot.hold(K.UP, true); return; }
			bot.hold(K.UP, false);
			if (Math.abs(cx(s) - ladderX) > 22) { bot.hold(K.RIGHT, cx(s) < ladderX); bot.hold(K.LEFT, cx(s) > ladderX); return; }
			bot.hold(K.RIGHT, false); bot.hold(K.LEFT, false); bot.hold(K.UP, true);
		} };
	}
	function swingStep(anchorX, landX) {
		var phase = 0, owner = null;
		return { name: "swing " + anchorX, tick: function(s) {
			if (owner !== s) { owner = s; phase = 0; }   // a fresh spiderman (retry) starts the swing over
			if (phase === 0) {
				walkRight(s);
				if (!s.onGround) phase = 1;
			} else if (phase === 1) {
				bot.hold(K.RIGHT, true);
				if (game.level.findAnchor(s)) { bot.tap(K.SPACE); phase = 2; bot.note("web attach"); }
				if (s.onGround) phase = 0;
			} else if (phase === 2) {
				bot.hold(K.RIGHT, true);
				if (!s.swinging) { phase = 3; return; }
				if (cx(s) > anchorX + 70 && s.velocityX > 0) { bot.tap(K.SPACE); phase = 3; bot.note("web release"); }
			} else {
				bot.hold(K.RIGHT, cx(s) < landX);
				if (s.onGround) { bot.hold(K.RIGHT, false); return true; }
			}
		} };
	}
	// stand still next to a trapped worker and press E (a fresh press)
	function rescue(id) {
		return { name: "rescue " + id, tick: function(s) {
			var w = game.level.rescues.filter(function(r) { return r.id === id; })[0];
			if (w.rescued) return true;
			if (game.level.rescueInReach === w && s.onGround) { bot.releaseAll(); bot.tap(K.E); bot.note("E next to " + id); return; }
			var dir = w.x > cx(s) ? 1 : -1;
			bot.hold(K.RIGHT, dir > 0); bot.hold(K.LEFT, dir < 0);
		} };
	}
	// face right and web the marked knot until its rope is cut, then wait for the cargo to come down
	function shootKnot(id) {
		return { name: "web knot " + id, tick: function(s) {
			var cargo = game.level.drops.filter(function(d) { return d.drop.id === id; })[0];
			if (cargo.drop.state === "DOWN") return true;
			if (game.level.cut[id]) { bot.releaseAll(); return; }
			var foe = enemyAhead(s, 1);
			if (foe) { walkRight(s); return; }
			bot.hold(K.LEFT, false);
			if (s.runningDirection !== 1) { bot.hold(K.RIGHT, true); return; }
			bot.hold(K.RIGHT, false);
			if (s.onGround && bot.shootWait-- <= 0 && s.web > 0) { bot.tap(K.X); bot.shootWait = 20; bot.note("web at knot " + id); }
		} };
	}

	var route = [
		reach(1600),                       // quay, thug, first water gap
		swingStep(2290, 2500),             // pier 1 -> pier 2 over the water
		reach(3300),                       // checkpoint 1, the hop to the container yard
		reach(4000),                       // up the container stacks to s3
		reach(4110, { drop: true }),       // walk off s3 into the alley
		rescue("W1"),
		climbAt(4182, 270),                // the ladder out of the alley onto s4
		reach(5360, { drop: true }),       // down the stacks, checkpoint 2, to the crane gap
		shootKnot("C1"),
		reach(6560),                       // over the dropped container, checkpoint 3, past venom
		shootKnot("P1"),
		reach(7250),                       // onto the pallet, the ship's deck
		reach(7480, { drop: true }),       // into the open hatch
		rescue("W2"),                      // over the sparking wires to worker 2
		walkLeftTo(7575),
		climbAt(7562, 280),                // back up the ladder
		reach(8100),                       // checkpoint 4 on the deck
		reach(8320),                       // off the stern onto the last pier
		swingStep(9440, 9650),
		reach(10400),                      // the exit
	];
	bot.route = route;
	function stepNamed(name) { for (var i = 0; i < route.length; i++) if (route[i].name === name) return i; return 0; }
	var RESUME = { 2620: "walk to 3300", 5000: "walk to 5360", 6010: "walk to 6560", 7930: "walk to 8100" };
	bot.resume = function() {
		this.releaseAll();
		var cp = game.levelCheckpoint;
		this.step = cp ? stepNamed(RESUME[cp.x]) : 0;
		this.stuck = 0; this.bestX = undefined; this.lastX = null; this.hp = undefined;
		this.deaths++;
		this.note("RESUME at checkpoint " + (cp ? cp.x : "start") + " -> step " + this.step + " " + route[this.step].name);
	};

	bot.tick = function(s) {
		if (this.done || game.state !== "PLAYING" || s !== game.spiderman || game.transition) return;
		this.frames++;
		if (this.hp !== undefined && s.health < this.hp) this.note("HIT x " + Math.round(s.x) + " feet " + Math.round(feet(s)) + " hp " + s.health);
		this.hp = s.health;
		var step = route[this.step];
		if (!step) { walkRight(s); return; }
		// watchdog: no progress for 3 s while just walking -> hop
		if (this.bestX === undefined || s.x > this.bestX + 2) { this.bestX = s.x; this.still = 0; }
		else if (this.why === "walk" && s.onGround && ++this.still > 180) { this.tap(K.SPACE); this.still = 0; this.note("watchdog hop at " + Math.round(s.x)); }
		if (step.tick(s)) {
			this.note("done: " + step.name + " (x " + Math.round(s.x) + ")");
			this.step++;
			this.stuck = 0;
		}
		this.lastX = s.x;
	};

	var orig = SpiderMan.prototype.update;
	SpiderMan.prototype.update = function() {
		try { if (window.BOT) window.BOT.tick(this); } catch (e) { window.BOT.log.push("BOT ERROR " + e.message); }
		return orig.apply(this, arguments);
	};
})();
