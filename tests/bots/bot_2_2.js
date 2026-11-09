// Route bot for stage 2-2: runs inside the page once per game frame (hooked in front of SpiderMan.update) and plays
// with keyboard events dispatched on document (the same listener real key presses use). It walks both ways,
// times lasers from their visible state, slides under the duct beam, uses doors, lifts, the hover platform, swings.
(function() {
	var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, X: 88 };
	function key(code, down) {
		var e = new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true, cancelable: true });
		Object.defineProperty(e, "keyCode", { get: function() { return code; } });
		document.dispatchEvent(e);
	}
	var bot = {
		held: {}, log: [], step: 0, deaths: 0, laserHits: 0, hits: [], shootWait: 0, stuck: 0, lastX: null, still: 0,
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
	function lv() { return game.level; }
	// front edge / back edge of his body for a walking direction
	function front(s, dir) { return dir > 0 ? right(s) : s.x; }

	function continues(s, dir) {
		var g = ground(s);
		if (!g) return true;
		var end = dir > 0 ? g.x + g.fullWidth : g.x;
		var roofs = game.scene.roofs;
		for (var i = 0; i < roofs.length; i++) {
			var r = roofs[i];
			if (r === g || !r.isSolid()) continue;
			var probe = end + dir * 4;
			if (r.x <= probe && r.x + r.fullWidth >= probe && Math.abs(r.y - g.y) <= 25) return true;
		}
		return false;
	}

	// ---- reflexes ----
	function enemyAhead(s, dir) {
		var hb = s.getHitbox(), my = (hb.top + hb.bottom) / 2, best = null;
		var list = game.scene.enemies;
		for (var i = 0; i < list.length; i++) {
			var e = list[i];
			if (!(e.health > 0) || e.state === "DEFEATED") continue;
			var dx = (e.centerX() - cx(s)) * dir;
			if (dx < -40 || dx > 440) continue;
			if (Math.abs(e.centerY() - my) > 30) continue;
			var obs = game.getObstacles(), covered = false;
			for (var o = 0; o < obs.length; o++) {
				var ol = Math.min(cx(s), e.centerX()), orr = Math.max(cx(s), e.centerX());
				if (obs[o].left() > ol && obs[o].right() < orr && obs[o].top() <= my + 2 && obs[o].bottom() >= my - 2) covered = true;
			}
			if (covered) continue;
			if (!best || dx < best.dx) best = { e: e, dx: dx };
		}
		return best;
	}
	// a laser on his way that would be on while he is inside it. Timed beams are crossed in their dark time
	// (the WARN phase is harmless); a grid that is on always blocks; the always-on duct beam is handled by its step
	function laserBlocks(s, dir, speed) {
		var L = lv(), hb = s.getHitbox();
		for (var i = 0; i < L.lasers.length; i++) {
			var l = L.lasers[i];
			if (!l.vertical && !l.period) continue;                 // the duct beam (slide step)
			var r = L.laserRect(l);
			if (r.bottom <= hb.top || r.top >= hb.bottom) continue; // not at his height
			var near = dir > 0 ? r.left : r.right;
			var ahead = (near - front(s, dir)) * dir;
			if (ahead < 6 || ahead > 220) continue;                 // committed / far away
			var st = L.laserState(l);
			if (st.grid) { if (!st.offline) return l; continue; }
			var width = r.right - r.left;
			var enter = ahead / speed, leave = (ahead + width + s.bodyWidth() + 6) / speed;
			if (st.state === "ON") { if (st.left > enter - 2) return l; continue; }
			var untilOn = st.state === "WARN" ? st.left : st.left + l.warn;
			if (untilOn < leave + 4) return l;
		}
		return null;
	}
	function hazardAhead(s, dir) {
		var hz = lv().hazards;
		for (var i = 0; i < hz.length; i++) {
			var h = hz[i];
			if (h.kind === "DRONE") {
				// drone at his height coming close: jump over it
				var db = { left: h.x, right: h.x + h.width, top: h.y - 25, bottom: h.y };
				var hb = s.getHitbox();
				if (db.bottom <= hb.top || db.top >= hb.bottom) continue;
				var gap = dir > 0 ? db.left - right(s) : s.x - db.right;
				if (gap > -10 && gap < 55) return h;
				continue;
			}
			if (h.motion) continue;
			var d = dir > 0 ? h.x - right(s) : s.x - (h.x + h.width);
			if (d > 0 && d < 34 && Math.abs(h.y - feet(s)) < 5) return h;
		}
		return null;
	}

	// walk in a direction with reflexes. opts: { drop: true } walk off edges instead of jumping gaps
	// standing inside the area a laser beam covers (never stop there)
	function underLaser(s) {
		var L = lv(), hb = s.getHitbox();
		for (var i = 0; i < L.lasers.length; i++) {
			var r = L.laserRect(L.lasers[i]);
			if (hb.right > r.left - 4 && hb.left < r.right + 4 && hb.bottom > r.top && hb.top < r.bottom) return true;
		}
		return false;
	}
	function walk(s, dir, opts) {
		opts = opts || {};
		var fwd = dir > 0 ? K.RIGHT : K.LEFT, back = dir > 0 ? K.LEFT : K.RIGHT;
		var under = underLaser(s);
		var foe = under ? null : enemyAhead(s, dir);
		var laser = !under ? laserBlocks(s, dir, 5) : null;
		if (foe) {
			bot.why = "foe " + foe.e.name;
			bot.hold(fwd, false);
			// too close for a web: back off (unless a laser is right behind)
			if (foe.dx < 110) { bot.hold(back, !laserBlocks(s, -dir, 5) && !underLaser(s)); return; }
			bot.hold(back, false);
			if (s.runningDirection !== dir && !laser) { bot.hold(fwd, true); return; }   // turn (facing follows a held key)
			if (bot.shootWait-- <= 0 && s.web > 0 && s.runningDirection === dir) { bot.tap(K.X); bot.shootWait = 14; }
			return;
		}
		if (laser) {
			bot.why = "laser";
			bot.hold(fwd, false); bot.hold(back, false);
			return;
		}
		bot.why = "walk";
		bot.hold(back, false);
		bot.hold(fwd, true);
		if (!s.onGround) return;
		if (hazardAhead(s, dir)) { bot.tap(K.SPACE); bot.note("jump hazard at " + Math.round(s.x)); return; }
		var g = ground(s);
		var edge = g ? (dir > 0 ? g.x + g.fullWidth - right(s) : s.x - g.x) : 99;
		if (g && !opts.drop && !continues(s, dir) && edge < 10) { bot.tap(K.SPACE); bot.note("jump gap at " + Math.round(s.x)); return; }
		if (bot.lastX !== null && Math.abs(s.x - bot.lastX) < 0.5) {
			if (++bot.stuck > 3) { bot.tap(K.SPACE); bot.stuck = 0; bot.note("jump blocked at " + Math.round(s.x)); }
		} else bot.stuck = 0;
	}

	// ---- route steps ----
	function reach(x, opts) { return { name: "walk to " + x, tick: function(s) { if (cx(s) >= x && s.onGround) return true; walk(s, 1, opts); } }; }
	function back(x, opts) { return { name: "walk back to " + x, tick: function(s) { if (cx(s) <= x && s.onGround) return true; walk(s, -1, opts); } }; }
	function waitFor(name, cond) { return { name: name, tick: function(s) { if (cond(s)) return true; bot.releaseAll(); } }; }
	function roof(tag) { for (var i = 0; i < game.scene.roofs.length; i++) if (game.scene.roofs[i].tag === tag) return game.scene.roofs[i]; }
	function door(x, arriveFeet) {
		var pressed = 0;
		return { name: "door at " + x, tick: function(s) {
			if (game.transition) { bot.releaseAll(); return; }
			if (pressed && s.onGround && Math.abs(feet(s) - arriveFeet) < 3) { pressed = 0; return true; }
			var d = cx(s) - x;
			if (Math.abs(d) > 6) { walk(s, d < 0 ? 1 : -1); return; }
			bot.releaseAll();
			if (s.onGround && ++pressed % 20 === 1) bot.tap(K.UP);
		} };
	}
	function climb(ladderX, topY, dir) {
		return { name: "climb at " + ladderX, tick: function(s) {
			if (!s.climbing && s.onGround && Math.abs(feet(s) - topY) < 3) { bot.hold(K.UP, false); return true; }
			if (s.climbing) { bot.hold(K.RIGHT, false); bot.hold(K.LEFT, false); bot.hold(K.UP, true); return; }
			if ((cx(s) - ladderX) * dir < -22) { walk(s, dir, { drop: true }); bot.hold(K.UP, false); return; }
			bot.hold(K.RIGHT, false); bot.hold(K.LEFT, false); bot.hold(K.UP, true);
		} };
	}
	function swingStep(anchorX, landX) {
		var phase = 0, owner = null;
		return { name: "swing " + anchorX, tick: function(s) {
			if (owner !== s) { owner = s; phase = 0; }
			if (phase === 0) { walk(s, 1); if (!s.onGround) phase = 1; }
			else if (phase === 1) {
				bot.hold(K.RIGHT, true);
				if (lv().findAnchor(s)) { bot.tap(K.SPACE); phase = 2; bot.note("web attach"); }
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
	function ride(tag, boardCond, exitCond, boardDir) {
		var phase = 0;
		return { name: "ride " + tag, tick: function(s) {
			var p = roof(tag);
			if (phase === 0) { bot.releaseAll(); if (boardCond(p, s)) phase = 1; return; }
			if (phase === 1) {
				if (s.onGround && s.groundRoof === p) { bot.releaseAll(); phase = 2; return; }
				if (!boardCond(p, s) && !(s.onGround && s.groundRoof === p)) { phase = 0; return; }
				bot.hold(boardDir > 0 ? K.RIGHT : K.LEFT, true);
				return;
			}
			bot.releaseAll();
			// stay on the middle of it while it moves
			if (s.onGround && s.groundRoof === p) {
				var mid = p.x + p.width / 2 - s.bodyWidth() / 2;
				if (s.x < mid - 15) bot.hold(K.RIGHT, true); else if (s.x > mid + 15) bot.hold(K.LEFT, true);
			}
			if (exitCond(p, s)) { bot.releaseAll(); phase = 0; return true; }
		} };
	}
	function slideUnder(beamX1) {
		var done = false;
		return { name: "slide under the duct beam", tick: function(s) {
			if (done && !s.hasState("SLIDE") && s.onGround) { done = false; return true; }
			bot.hold(K.RIGHT, true);
			if (!done && right(s) >= beamX1 - 40 && s.onGround) { bot.tap(K.DOWN); done = true; bot.note("slide at " + Math.round(s.x)); }
		} };
	}
	function drone(x) { var hz = lv().hazards; for (var i = 0; i < hz.length; i++) if (hz[i].kind === "DRONE" && Math.abs((hz[i].motion.axis === "y" ? hz[i].x : hz[i].motion.from) - x) < 5) return hz[i]; }
	function leverOn(x) { var sw = lv().switches; for (var i = 0; i < sw.length; i++) if (sw[i].x === x) return sw[i].on; }

	var route = [
		// A. lobby
		reach(2260),
		ride("LOBBY", function(p, s) { return p.y >= 539 && p.motion.waitFrames > 25; }, function(p, s) { return p.y <= 251; }, 1),
		// B. genetics lab
		reach(3580),
		slideUnder(3750),
		reach(4950),
		// C. atrium
		swingStep(5140, 5300),
		reach(5520),
		ride("HOVER", function(p, s) { return p.x <= 5582 && p.motion.waitFrames > 15; }, function(p, s) { return p.x >= 5978; }, 1),
		reach(6150),
		swingStep(6560, 6720),
		reach(6930),
		waitFor("atrium drone low", function(s) { return drone(7030).y >= 230; }),
		reach(7120),
		reach(7660),
		// D. security wing: robotics lab override
		door(8200, 180),
		reach(9560),
		{ name: "override 1 on?", tick: function(s) { bot.note("GRID override 1 " + (leverOn(9540) ? "ON" : "off")); return true; } },
		back(8000),
		door(7980, 540),
		// down the maintenance shaft to the server room
		reach(8975, { drop: true }),
		reach(9860, { drop: true }),
		{ name: "override 2 on?", tick: function(s) { bot.note("GRID override 2 " + (leverOn(9840) ? "ON" : "off") + ", grid " + (lv().powered.GRID ? "OFFLINE" : "on")); return true; } },
		back(9110, { drop: true }),
		climb(9082, 540, -1),
		// grid is off: keycard, security door, containment, the wave, the elevator
		reach(10000),
		reach(11000),
		reach(13600),
		ride("EVAC", function(p, s) { return p.y >= 539 && p.motion.waitFrames > 25; }, function(p, s) { return p.y <= 201; }, 1),
		reach(14440),
	];
	bot.route = route;
	function stepNamed(name) { for (var i = 0; i < route.length; i++) if (route[i].name === name) return i; return 0; }
	var RESUME = { 1500: "walk to 2260", 2520: "walk to 3580", 5330: "walk to 5520", 7680: "door at 8200", 10060: "walk to 11000",
		12660: "walk to 13600", 13560: "walk to 13600" };
	bot.resume = function() {
		this.releaseAll();
		var cp = game.levelCheckpoint;
		this.step = cp ? stepNamed(RESUME[cp.x]) : 0;
		this.stuck = 0; this.bestX = undefined; this.lastX = null; this.hp = undefined;
		this.deaths++;
		this.note("RESUME at checkpoint " + (cp ? cp.x : "start") + " -> " + route[this.step].name);
	};

	bot.tick = function(s) {
		if (game.state !== "PLAYING" || s !== game.spiderman) return;
		if (this.hp !== undefined && s.health < this.hp) {
			var l = lv(), hb = s.getHitbox(), byLaser = false;
			for (var i = 0; i < l.lasers.length; i++) {
				var r = l.laserRect(l.lasers[i]), st = l.laserState(l.lasers[i]);
				if (st.state === "ON" && hb.right > r.left - 4 && hb.left < r.right + 4 && hb.bottom > r.top && hb.top < r.bottom) byLaser = true;
			}
			if (byLaser) this.laserHits++;
			this.hits.push(Math.round(s.x) + (byLaser ? " LASER" : ""));
			this.note("HIT x " + Math.round(s.x) + " feet " + Math.round(feet(s)) + " hp " + s.health + (byLaser ? " (laser)" : ""));
		}
		this.hp = s.health;
		var step = route[this.step];
		if (!step) { walk(s, 1); return; }
		if (this.bestX === undefined || Math.abs(s.x - this.bestX) > 2) { this.bestX = s.x; this.still = 0; }
		else if (this.why === "walk" && s.onGround && ++this.still > 180) { this.tap(K.SPACE); this.still = 0; this.note("watchdog hop at " + Math.round(s.x)); }
		if (step.tick(s)) {
			this.note("done: " + step.name + " (x " + Math.round(s.x) + ", feet " + Math.round(feet(s)) + ")");
			this.step++;
			this.stuck = 0;
		}
		this.lastX = s.x;
	};

	var orig = SpiderMan.prototype.update;
	SpiderMan.prototype.update = function() {
		try { if (window.BOT) window.BOT.tick(this); } catch (e) { window.BOT.log.push("BOT ERROR " + e.message + " " + e.stack); }
		return orig.apply(this, arguments);
	};
})();
