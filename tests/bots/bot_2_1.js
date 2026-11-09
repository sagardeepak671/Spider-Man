// Route bot for stage 2-1: runs inside the page once per game frame (hooked in front of SpiderMan.update) and
// plays with keyboard events dispatched on document - the same listener real key presses go through.
(function() {
	var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, X: 88 };
	function key(code, down) {
		var e = new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true, cancelable: true });
		Object.defineProperty(e, "keyCode", { get: function() { return code; } });
		document.dispatchEvent(e);
	}

	var bot = {
		held: {}, log: [], step: 0, frames: 0, stuck: 0, lastX: null, shootWait: 0, deaths: 0, done: false,
		events: [],
		hold: function(code, on) {
			if (on && !this.held[code]) { key(code, true); this.held[code] = true; }
			if (!on && this.held[code]) { key(code, false); this.held[code] = false; }
		},
		tap: function(code) { key(code, true); key(code, false); this.held[code] = false; },
		releaseAll: function() { for (var c in this.held) if (this.held[c]) this.hold(+c, false); },
		note: function(t) { this.log.push(Math.round(game.levelFrames) + ": " + t); },
	};
	window.BOT = bot;

	function S() { return game.spiderman; }
	function feet(s) { return s.y + s.bodyHeight(); }
	function right(s) { return s.x + s.bodyWidth(); }
	function cx(s) { return s.x + s.bodyWidth() / 2; }
	// platform he stands on
	function ground(s) { return s.onGround ? s.groundRoof : null; }
	// is there a platform continuing right after the current one (same height +- 100 px, within 4 px)?
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

	// ---- reflexes ----
	function enemyAhead(s) {
		var hb = s.getHitbox(), my = (hb.top + hb.bottom) / 2, best = null;
		var list = game.scene.enemies;
		for (var i = 0; i < list.length; i++) {
			var e = list[i];
			if (!(e.health > 0) || e.state === "DEFEATED") continue;
			var dx = e.centerX() - cx(s);
			if (dx < -40 || dx > 440) continue;
			if (Math.abs(e.centerY() - my) > 30) continue;
			// a web cannot get through cover (barrels, closed doors): walk on and jump it instead
			var obs = game.getObstacles(), covered = false;
			for (var o = 0; o < obs.length; o++) {
				if (obs[o].left() > cx(s) && obs[o].right() < e.centerX() && obs[o].top() <= my + 2 && obs[o].bottom() >= my - 2) covered = true;
			}
			if (covered) continue;
			if (!best || dx < best.dx) best = { e: e, dx: dx };
		}
		return best;
	}
	function hazardAhead(s) {
		var hz = game.level.hazards;
		for (var i = 0; i < hz.length; i++) {
			var h = hz[i];
			if (h.kind === "STEAM" || h.motion) continue;
			var d = h.x - right(s);
			if (d > 0 && d < 34 && Math.abs(h.y - feet(s)) < 5) return h;
		}
		return null;
	}
	// frames until the vent's next blast starts (0 while blasting) and frames until the current blast ends
	function untilBlast(h) {
		var ph = game.level.steamPhase(h), idle = h.period - 40 - 55;
		if (ph.state === "IDLE") return idle - ph.t + 40;
		if (ph.state === "WARN") return 40 - ph.t;
		return 0;
	}
	// a steam vent ahead on his surface that would blast while he is inside its column. Vents he is already
	// crossing are committed to (he never stops inside a column)
	function steamBlocks(s) {
		var hz = game.level.hazards, speed = Math.max(1, 5 + beltUnder(s));
		for (var i = 0; i < hz.length; i++) {
			var h = hz[i];
			if (h.kind !== "STEAM" || Math.abs(h.y - feet(s)) > 5) continue;
			var ahead = h.x - right(s);          // distance until he enters the column
			if (ahead < 8 || ahead > 200) continue;
			var enter = ahead / speed, leave = (h.x + h.width + 6 - s.x) / speed;
			var ph = game.level.steamPhase(h);
			if (ph.state === "BLAST") { if (55 - ph.t + 3 > enter) return h; continue; }
			if (untilBlast(h) < leave + 4) return h;
		}
		return null;
	}
	function inSteam(s) {
		var hz = game.level.hazards;
		for (var i = 0; i < hz.length; i++) {
			var h = hz[i];
			if (h.kind === "STEAM" && right(s) > h.x - 4 && s.x < h.x + h.width + 4 && Math.abs(h.y - feet(s)) < 5) return true;
		}
		return false;
	}
	function beltUnder(s) { var g = ground(s); return g && g.conveyor ? g.beltSpeed() : 0; }

	// generic "walk right" with reflexes. opts: { drop: true } walk off edges instead of jumping gaps
	function walkRight(s, opts) {
		opts = opts || {};
		var foe = enemyAhead(s);
		if (foe && inSteam(s)) foe = null;      // never stand still inside a steam column
		if (foe) {
			bot.why = "foe " + foe.e.name + " dx " + Math.round(foe.dx) + " dy " + Math.round(foe.e.centerY() - (s.getHitbox().top + s.getHitbox().bottom) / 2);
			bot.hold(K.RIGHT, false);
			if (foe.dx < 110) {
				// too close for a web (it starts in front of his hand): back off first
				bot.hold(K.LEFT, true);
				return;
			}
			// keep still on a belt: counter it
			var b = beltUnder(s);
			bot.hold(K.LEFT, b > 0);
			if (b < 0) bot.hold(K.RIGHT, true);
			// turn to face him: facing follows a HELD direction key, so hold RIGHT for a frame
			if (s.runningDirection !== 1) { bot.hold(K.LEFT, false); bot.hold(K.RIGHT, true); return; }
			if (bot.shootWait-- <= 0 && s.web > 0) { bot.tap(K.X); bot.shootWait = 14; }
			return;
		}
		var steam = s.onGround ? steamBlocks(s) : null;
		if (steam) {
			bot.why = "steam " + steam.x + " " + game.level.steamPhase(steam).state + " " + game.level.steamPhase(steam).t;
			// wait (on a belt that pushes him forward: walk against it, well before the column)
			var belt = beltUnder(s);
			bot.hold(K.RIGHT, false);
			bot.hold(K.LEFT, belt > 0 && right(s) > steam.x - 60);
			return;
		}
		bot.why = "walk";
		bot.hold(K.LEFT, false);
		bot.hold(K.RIGHT, true);
		if (!s.onGround) return;
		if (hazardAhead(s)) { bot.tap(K.SPACE); bot.note("jump hazard"); return; }
		var g = ground(s);
		if (g && !opts.drop && !continues(s) && g.x + g.fullWidth - right(s) < 10) { bot.tap(K.SPACE); bot.note("jump gap at " + Math.round(g.x + g.fullWidth)); return; }
		// blocked (wall step, barrel, crate): jump
		if (bot.lastX !== null && Math.abs(s.x - bot.lastX) < 0.5 && beltUnder(s) >= 0) {
			if (++bot.stuck > 3) { bot.tap(K.SPACE); bot.stuck = 0; bot.note("jump blocked at " + Math.round(s.x)); }
		} else bot.stuck = 0;
	}

	// ---- the route ----
	function reach(x, opts) { return { name: "walk to " + x, tick: function(s) { if (cx(s) >= x && s.onGround) return true; walkRight(s, opts); } }; }
	function climbAt(ladderX, topY) {
		return { name: "climb at " + ladderX, tick: function(s) {
			if (!s.climbing && s.onGround && Math.abs(feet(s) - topY) < 3) { bot.hold(K.UP, false); return true; }
			if (s.climbing) { bot.hold(K.RIGHT, false); bot.hold(K.UP, true); return; }
			if (cx(s) < ladderX - 25) { walkRight(s, { drop: true }); bot.hold(K.UP, false); return; }
			bot.hold(K.RIGHT, false); bot.hold(K.UP, true);
		} };
	}
	function waitFor(name, cond, action) { return { name: name, tick: function(s) { if (cond(s)) return true; bot.releaseAll(); if (action) action(s); } }; }
	function swingStep(anchorX, landX) {
		var phase = 0, owner = null;
		return { name: "swing " + anchorX, tick: function(s) {
			if (owner !== s) { owner = s; phase = 0; }   // a fresh spiderman (retry) starts the swing over
			if (phase === 0) {
				// run to the edge and jump
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
	function roof(tag) { for (var i = 0; i < game.scene.roofs.length; i++) if (game.scene.roofs[i].tag === tag) return game.scene.roofs[i]; }
	function lever(x) { var sw = game.level.switches; for (var i = 0; i < sw.length; i++) if (sw[i].x === x) return sw[i]; }

	var route = [
		reach(2620),
		// pipe run
		reach(2690, { drop: true }),
		{ name: "jump up onto pipe 1", tick: function(s) { if (s.onGround && feet(s) < 440) return true; bot.hold(K.RIGHT, true); if (s.onGround) bot.tap(K.SPACE); } },
		reach(3340),
		waitFor("drone low", function(s) { var d = game.level.hazards.filter(function(h) { return h.kind === "DRONE"; })[0]; return d.y >= 330; }),
		{ name: "edge to pipe 3", tick: function(s) { if (s.onGround && cx(s) > 3500) return true; walkRight(s); } },
		swingStep(4040, 4200),
		reach(4600, { drop: true }),
		reach(5600),
		climbAt(5688, 300),
		// assembly hall, upper belts
		reach(7700),
		reach(7900, { drop: true }),
		reach(9230),
		{ name: "jump spark, onto floor", tick: function(s) { if (s.onGround && cx(s) > 9395) return true; walkRight(s); } },
		waitFor("lift down", function(s) { return roof("HALL").y >= 539 && roof("HALL").motion.waitFrames > 20; }),
		{ name: "onto lift", tick: function(s) {
			var l = roof("HALL");
			if (s.onGround && s.groundRoof === l && cx(s) < 9360) { bot.releaseAll(); return true; }
			// the lift left before he got on: wait next to the shaft for the next ride (never walk past it)
			if (l.y < 539 || cx(s) < 9330) { bot.releaseAll(); if (cx(s) < 9400 && l.y < 539) bot.hold(K.RIGHT, true); return; }
			bot.hold(K.RIGHT, false); bot.hold(K.LEFT, true);
		} },
		waitFor("lift top", function(s) { return roof("HALL").y <= 201; }),
		reach(9600),
		// roofs
		reach(10860),
		waitFor("girder at r2", function(s) { var g = roof("CRANE"); return g.x <= 10921 && g.motion.waitFrames > 5; }),
		{ name: "onto girder", tick: function(s) { var g = roof("CRANE"); if (s.onGround && s.groundRoof === g && cx(s) > g.x + 50) { bot.releaseAll(); return true; } bot.hold(K.RIGHT, true); } },
		waitFor("girder at r3", function(s) { var g = roof("CRANE"); return g.x >= 11359; }),
		reach(11560, { drop: true }),
		swingStep(12040, 12200),
		reach(12760, { drop: true }),
		// the switch puzzle: belt control first
		reach(12900, { drop: true }),
		climbAt(12938, 240),
		reach(13180, { drop: true }),
		{ name: "belt reversed?", tick: function(s) { bot.note("BELT lever " + (lever(13070).on ? "ON" : "off")); return true; } },
		climbAt(13238, 400),
		reach(13380, { drop: true }),
		{ name: "jump onto the reject line", tick: function(s) { if (s.onGround && s.groundRoof && s.groundRoof.conveyor) return true; walkRight(s); } },
		reach(14270),
		reach(14560, { drop: true }),
		reach(15600, { drop: true }),
		reach(15760),
		reach(16720),
		reach(18800),
	];
	bot.route = route;
	// after "retry from checkpoint": continue with the route step that follows that checkpoint
	function stepNamed(name) { for (var i = 0; i < route.length; i++) if (route[i].name === name) return i; return 0; }
	var RESUME = { 2580: "walk to 2690", 4560: "walk to 5600", 5800: "walk to 7700", 7940: "walk to 9230", 9880: "walk to 10860",
		12260: "walk to 12760", 12780: "walk to 12900", 15780: "walk to 16720", 16780: "walk to 18800" };
	bot.resume = function() {
		this.releaseAll();
		var cp = game.levelCheckpoint;
		this.step = cp ? stepNamed(RESUME[cp.x]) : 0;
		// a step object may keep its own phase (swing): rebuild those
		this.stuck = 0; this.bestX = undefined; this.lastX = null; this.hp = undefined;
		this.deaths++;
		this.note("RESUME at checkpoint " + (cp ? cp.x : "start") + " -> step " + this.step + " " + route[this.step].name);
	};

	bot.tick = function(s) {
		if (this.done || game.state !== "PLAYING" || s !== game.spiderman) return;
		this.frames++;
		if (this.hp !== undefined && s.health < this.hp) {
			var near = game.scene.enemies.map(function(e) { return e.name + "@" + Math.round(e.centerX()); }).filter(function(t) { return Math.abs(+t.split("@")[1] - s.x) < 600; });
			this.note("HIT x " + Math.round(s.x) + " feet " + Math.round(feet(s)) + " hp " + s.health + " near " + near.join(","));
		}
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
