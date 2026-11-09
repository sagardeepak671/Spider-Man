// Route bot for stage 3-3 UNDERGROUND PUMP STATION: runs inside the page once per game frame (hooked in front of
// SpiderMan.update) and plays with keyboard events dispatched on document - the same listener real key presses go
// through. It climbs the pipe, rides the trolley, pumps the sump, climbs to worker 1, flips the lift breaker, rides
// the lift, crosses the west basin on its raft, drops into the east basin, frees worker 3 and flips the transfer
// pump's breaker, runs the transfer pump, crawls to worker 2, crosses the east basin on its raft, rides the hover
// platform, climbs the lattice, runs the main pump, frees worker 4 and reaches the exit.
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
		var foe = s.onGround ? enemyAhead(s, 1) : null;         // (never turn back in the middle of a jump)
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

	// walk to a pump / valve, press E, wait until every pool it moves has arrived
	function useControl(id) {
		var pressed = false;
		return { name: "use " + id, reset: function() { pressed = false; }, tick: function(s) {
			var c = game.level.controls.filter(function(k) { return k.id === id; })[0];
			var pools = c.pools.map(function(p) { return game.level.poolById(p); });
			if (pressed) { bot.releaseAll(); return pools.every(function(p) { return !p.moving; }); }
			if (game.level.controlInReach === c && s.onGround) { bot.releaseAll(); bot.tap(K.E); pressed = true; bot.note("E at " + id); return; }
			var dir = c.x > cx(s) ? 1 : -1;
			bot.hold(K.RIGHT, dir > 0); bot.hold(K.LEFT, dir < 0);
		} };
	}
	// from the walkway edge onto the grate / the raft, then stand at the raft's right end
	function boardRaft() {
		return { name: "board the raft", tick: function(s) {
			var raft = game.scene.roofs.filter(function(r) { return r.style === "RAFT"; })[0];
			if (s.onGround && s.groundRoof === raft && right(s) >= raft.x + raft.width - 4) { bot.releaseAll(); return true; }
			bot.hold(K.LEFT, false); bot.hold(K.RIGHT, true);
			var g = ground(s);
			if (g && g.style === "BRICK" && g.x + g.fullWidth - right(s) < 10) { bot.tap(K.SPACE); bot.note("jump to the grate"); }
		} };
	}
	// left from the raft (up in the shaft) over to the ledge
	function jumpLeftTo(x, y) {
		return { name: "jump left to " + x, tick: function(s) {
			if (s.onGround && cx(s) <= x && Math.abs(feet(s) - y) < 3) { bot.releaseAll(); return true; }
			bot.hold(K.RIGHT, false); bot.hold(K.LEFT, true);
			var g = ground(s);
			if (g && s.x - g.x < 8 && cx(s) > x) { bot.tap(K.SPACE); bot.note("jump left"); }
		} };
	}
	function jumpRightTo(x, y) {
		return { name: "jump right to " + x, tick: function(s) {
			if (s.onGround && cx(s) >= x && Math.abs(feet(s) - y) < 3) { bot.releaseAll(); return true; }
			bot.hold(K.LEFT, false); bot.hold(K.RIGHT, true);
			var g = ground(s);
			if (g && g.x + g.fullWidth - right(s) < 8 && cx(s) < x) { bot.tap(K.SPACE); bot.note("jump right"); }
		} };
	}

	function roofTagged(tag) { return game.scene.roofs.filter(function(r) { return r.tag === tag; })[0]; }
	// wait at the edge for a moving platform, step on, ride it, step off on the far side
	function ride(tag, boardWhen, leaveWhen, dir, name) {
		var phase = 0, owner = null;
		return { name: name || "ride " + tag, tick: function(s) {
			if (owner !== s) { owner = s; phase = 0; }
			var r = roofTagged(tag);
			if (phase === 0) {
				bot.releaseAll();
				if (boardWhen(r)) phase = 1;
			} else if (phase === 1) {
				bot.hold(dir > 0 ? K.RIGHT : K.LEFT, true);
				if (s.onGround && s.groundRoof === r && (dir > 0 ? s.x > r.x + 5 : right(s) < r.x + r.width - 5)) { bot.releaseAll(); phase = 2; }
				if (s.onGround && s.groundRoof !== r && !boardWhen(r)) { bot.releaseAll(); phase = 0; }  // missed it: wait again
			} else if (phase === 2) {
				bot.releaseAll();
				if (leaveWhen(r)) phase = 3;
			} else {
				bot.hold(dir > 0 ? K.RIGHT : K.LEFT, true);
				if (s.onGround && s.groundRoof !== r) { bot.releaseAll(); return true; }
			}
		} };
	}
	// up the lattice; near the top also push right so the hop lands on the tower
	function climbLattice(x, topY) {
		return { name: "lattice " + x, tick: function(s) {
			if (!s.climbing && s.onGround && Math.abs(feet(s) - topY) < 3) { bot.releaseAll(); return true; }
			bot.hold(K.UP, true);
			bot.hold(K.RIGHT, s.climbing ? feet(s) < topY + 40 : false);
			if (!s.climbing && s.onGround && cx(s) < x) bot.hold(K.RIGHT, true);
		} };
	}
	function walkInto(x, name) {      // walk right until past x (levers are flipped by walking into them)
		return { name: name || "walk into " + x, tick: function(s) { if (cx(s) >= x && s.onGround) { bot.releaseAll(); return true; } walkRight(s, { drop: true }); } };
	}

	var route = [
		reach(410),                                                   // to the pipe
		climbAt(442, 300),                                            // over the pump housing
		reach(690, { drop: true }),
		ride("TROLLEY", function(r) { return r.x <= 712 && r.motion.waitFrames > 10; }, function(r) { return r.x >= 938; }, 1, "trolley"),
		reach(1470),                                                  // checkpoint 1
		useControl("P1"),                                             // pump the sump out
		reach(1700, { drop: true }),                                  // into the basement
		climbAt(1842, 520),                                           // worker 1's housing
		rescue("W1"),
		walkInto(2180, "the lift breaker"),
		ride("LIFT1", function(r) { return r.powered && r.y >= 739 && r.motion.waitFrames > 10; }, function(r) { return r.y <= 301; }, 1, "lift"),
		reach(2870),                                                  // the gallery, checkpoint 2
		reach(3400),                                                  // over the west raft onto the pump house, checkpoint 3
		reach(3620, { drop: true }),                                  // down into the (low) east basin
		rescue("W3"),                                                 // the east tunnel
		walkInto(4320, "the transfer breaker"),                       // (the thug on the way)
		walkLeftTo(3580),
		climbAt(3557, 300),                                           // back up onto the pump house
		useControl("TP"),                                             // west empties, east fills
		walkLeftTo(3250),                                             // down into the (now low) west basin
		rescue("W2"),                                                 // under the bulkhead
		climbAt(3302, 300),
		reach(4500),                                                  // over the east raft, checkpoint 4
		reach(5120),                                                  // onto the machines
		ride("HOVER1", function(r) { return r.x <= 5214 && r.motion.waitFrames > 5; }, function(r) { return r.x >= 5478; }, 1, "hover"),
		reach(5790),                                                  // the steam, to the lattice
		climbLattice(5830, 60),
		useControl("MP"),                                             // the main pump drains the hall
		reach(6150, { drop: true }),                                  // down into the hall, checkpoint 5
		rescue("W4"),                                                 // the control room
		reach(7100),                                                  // the exit
	];
	bot.route = route;
	function stepNamed(name) { for (var i = 0; i < route.length; i++) if (route[i].name === name) return i; return 0; }
	var RESUME = { 1120: "walk to 1470", 2480: "walk to 2870", 3350: "walk to 3400", 4450: "walk to 4500", 6100: "rescue W4" };
	bot.resume = function() {
		this.releaseAll();
		var cp = game.levelCheckpoint;
		this.step = cp ? stepNamed(RESUME[cp.x]) : 0;
		// work done after the checkpoint is undone by the retry: go back for it
		route.forEach(function(r) { if (r.reset) r.reset(); });
		var lv = game.level;
		if (cp && cp.x === 3350 && !lv.powered.PWR2) this.step = stepNamed("walk to 3620");
		if (cp && cp.x === 3350 && lv.powered.PWR2 && lv.poolById("BE").state === "LOW") this.step = stepNamed("use TP");
		if (cp && cp.x === 3350 && lv.poolById("BE").state === "HIGH" && !lv.rescues[1].rescued) this.step = stepNamed("walk left to 3250");
		if (cp && cp.x === 3350 && lv.poolById("BE").state === "HIGH" && lv.rescues[1].rescued) this.step = stepNamed("walk to 4500");
		this.stuck = 0; this.bestX = undefined; this.lastX = null; this.hp = undefined;
		this.deaths++;
		this.note("RESUME at checkpoint " + (cp ? cp.x : "start") + " -> step " + this.step + " " + route[this.step].name);
	};

	bot.tick = function(s) {
		if (this.done || game.state !== "PLAYING" || s !== game.spiderman || game.transition) return;
		this.frames++;
		if (this.hp !== undefined && s.health < this.hp) this.note("HIT x " + Math.round(s.x) + " feet " + Math.round(feet(s)) + " hp " + s.health);
		this.hp = s.health;
		// a held key the game forgot (it lets go of every key after "TOO DEEP"): pressed again, like keyboard auto-repeat
		for (var code in this.held) if (this.held[code] && !s.keyIsDown(+code)) key(+code, true);
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
