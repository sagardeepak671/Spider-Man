from harness import *
import time
t = T("Stage 2-1 Industrial Zone: structure, conveyors, steam, switch puzzle, death / retry, completion")

S = """(() => { var s = game.spiderman; return { x: s.x, y: s.y, feet: s.y + s.bodyHeight(), cx: s.x + s.bodyWidth() / 2, g: s.onGround,
    ground: s.groundRoof ? s.groundRoof.style : null, belt: s.beltX, air: s.airBeltX, hp: s.health, f: game.levelFrames,
    st: game.state, climb: !!s.climbing, vy: s.velocityY }; })()"""

def put(pg, x, surface, extra=""):
    # a clean start: no keys, no slide dash / cooldown left over from the previous check (a dash still running
    # after the teleport would add its speed to the next measurement)
    ev(pg, f"""(() => {{ var s = game.spiderman; s.x = {x}; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityY = 0; s.velocityX = 0;
        s.airBeltX = 0; s.momentumX = 0; s.climbing = null; s.swinging = null; s.health = 5; s.releaseAllKeys(); s.slideFrames = 0; s.slideCooldown = 0; {extra} }})()""")
    frames(pg, 3)

def frames(pg, n):
    f0 = ev(pg, "game.levelFrames")
    while ev(pg, "game.levelFrames") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

def rate(pg, n=60, key=None, skip=2):
    """x speed in px per game frame, frame exact: an update hook records every frame's x change.
    With a key: the key is held and the n frames after the first `skip` frames that saw it are averaged, so how
    late the key event reaches the game or how long a test command takes (fast / slow / busy machines, 30 or 120
    fps) never shifts the window. Returns (speed, frames used); anything but a plain run / stand on the ground in
    those frames (a slide, jump, ...) is printed so a wrong value says why."""
    ev(pg, """(() => { window.RATE = []; var o = SpiderMan.prototype.update; window.RATE_ORIG = o; SpiderMan.prototype.update = function() {
        var x0 = this.x; var r = o.apply(this, arguments);
        RATE.push({ dx: this.x - x0, keys: this.keydowns.slice(), odd: this.states.filter(s => s !== 'STANDING' && s !== 'RUNNING').join('+'), ground: this.onGround });
        return r; }; })()""")
    code = {"ArrowRight": 39, "ArrowLeft": 37}.get(key)
    if key: pg.keyboard.down(key)
    for i in range(600):
        frames(pg, 1)
        rec = ev(pg, "RATE")
        use = [r for r in rec if not key or code in r["keys"]][skip:skip + n]
        if len(use) >= n: break
    if key: pg.keyboard.up(key)
    ev(pg, "(() => { SpiderMan.prototype.update = RATE_ORIG; })()")
    odd = sorted(set(r["odd"] for r in use if r["odd"])) + (["AIRBORNE"] if not all(r["ground"] for r in use) else [])
    if odd: print("   rate window also had:", odd)
    return sum(r["dx"] for r in use) / max(1, len(use)), use

def roof_at(pg, x, y):
    return ev(pg, f"(() => {{ var r = game.scene.roofs.find(r => r.x <= {x} && r.x + r.fullWidth >= {x} && Math.abs(r.y - {y}) < 1); return r ? {{ style: r.style, x: r.x, w: r.fullWidth, speed: r.beltSpeed() }} : null; }})()")

def start(pg, dev=True):
    ev(pg, f"game.setDevMode({'true' if dev else 'false'}); game.showMainMenu()")
    click(pg, '[data-action="campaign"]')
    click(pg, '.spiderman-game-world-tab[data-world="1"]')
    click(pg, '[data-level="2-1"]')
    ev(pg, "game.introFrames = 0")
    frames(pg, 5)

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    # every floating text the game shows is recorded (a message can expire before a check reads the screen)
    ev(pg, "(() => { window.TXT = []; var o = game.addFloatingText.bind(game); game.addFloatingText = function(t) { TXT.push(t); return o.apply(null, arguments); }; })()")
    start(pg)

    # ================= structure =================
    info = ev(pg, """(() => { var lv = game.level, d = lv.design;
        var propsPlaced = game.scene.roofs.reduce((n, r) => n + r.props.length, 0);
        return { name: lv.name, theme: game.backdrop.theme, width: lv.width, coins: lv.totalCoins, enemies: lv.totalEnemies,
            designEnemies: d.enemies.length, designProps: d.props.length, propsPlaced: propsPlaced, cps: lv.checkpoints.length,
            belts: lv.roofs.filter(r => r.conveyor).length, steam: lv.hazards.filter(h => h.kind === 'STEAM').length,
            switches: lv.switches.length, gates: lv.gates.length, anchors: lv.anchors.length, climbables: lv.climbables.length,
            hearts: lv.pickups.filter(p => p.type === 'HEALTH').length, webs: lv.pickups.filter(p => p.type === 'WEB').length,
            goal: lv.goal && lv.goal.x }; })()""")
    print("   level:", info)
    t.check(info["name"] == "INDUSTRIAL ZONE" and info["theme"] == "INDUSTRIAL", "2-1 is the industrial zone with its own backdrop")
    t.check(info["enemies"] == info["designEnemies"] == 11, f"every enemy found its platform ({info['enemies']}/{info['designEnemies']})")
    kinds = ev(pg, """(() => { var names = game.level.enemies.map(e => e.name); var want = game.level.design.enemies.map(e => e.type);
        return { got: names, want: want, sprites: game.level.enemies.every(e => e.stateImg === game.resources[e.name]) }; })()""")
    t.check(kinds["got"] == kinds["want"] and kinds["sprites"], f"every enemy is the type it was placed as {kinds['got']}")
    t.check(info["propsPlaced"] == info["designProps"], f"every prop found its platform ({info['propsPlaced']}/{info['designProps']})")
    t.check(info["cps"] == 9 and info["belts"] == 7 and info["steam"] == 12, "9 checkpoints, 7 belts, 12 steam vents")
    t.check(info["switches"] == 3 and info["gates"] == 1 and info["anchors"] == 2, "3 switches, 1 blast door, 2 swing anchors")
    t.check(info["hearts"] == 5 and info["webs"] == 6 and info["coins"] > 100, "pickups: 5 hearts, 6 web canisters, 100+ coins")
    # nothing is placed floating: every checkpoint / switch / steam vent stands on a platform top
    floating = ev(pg, """(() => { var lv = game.level, bad = [];
        function on(x, y) { return game.scene.roofs.some(r => r.x <= x && r.x + r.fullWidth >= x && Math.abs(r.y - y) < 1); }
        lv.checkpoints.forEach(c => { if (!on(c.x, c.y)) bad.push('cp ' + c.x); });
        lv.switches.forEach(w => { if (!on(w.x, w.y)) bad.push('switch ' + w.x); });
        lv.hazards.filter(h => !h.motion).forEach(h => { if (!on(h.x + 5, h.y) || !on(h.x + h.width - 5, h.y)) bad.push(h.kind + ' ' + h.x); });
        lv.pickups.filter(p => p.type !== 'COIN').forEach(p => { if (!on(p.x, p.y + 32)) bad.push(p.type + ' ' + p.x); });
        return bad; })()""")
    t.check(floating == [], f"checkpoints, switches, hazards, hearts, canisters all stand on a platform {floating}")
    # no steam vent / spark right next to a checkpoint (safe respawn)
    unsafe = ev(pg, """game.level.checkpoints.filter(c => game.level.hazards.some(h => !h.motion && Math.abs(h.y - c.y) < 2 && h.x + h.width > c.x - 90 && h.x < c.x + 90)).map(c => c.x)""")
    t.check(unsafe == [], f"no hazard within 90 px of a checkpoint {unsafe}")
    threats = ev(pg, """game.level.checkpoints.map(c => [c.x, game.scene.enemies.filter(e => Math.abs(e.centerX() - c.x) <= 560 && Math.abs(e.centerY() - (c.y - 30)) <= 260).map(e => e.name)]).filter(c => c[1].length)""")
    t.check(threats == [], f"no enemy can attack a fresh respawn at any checkpoint {threats}")

    # ================= conveyors =================
    # belt 1: 1350 .. 1750, +2 (flush with the yard floor)
    put(pg, 1400, 540)
    r, _ = rate(pg); bb = ev(pg, S)
    t.check(bb["ground"] == "CONVEYOR" and abs(r - 2) < 0.05, f"standing on a +2 belt moves him 2 px/frame ({r:.2f})")
    t.check(abs(bb["feet"] - 540) < 0.01, "stays exactly on the belt surface")
    put(pg, 1360, 540); r, _ = rate(pg, 30, "ArrowRight")
    t.check(abs(r - 7) < 0.05, f"walking with the belt: 7 px/frame ({r:.2f})")
    put(pg, 1650, 540); r, _ = rate(pg, 40, "ArrowLeft")
    t.check(abs(r + 3) < 0.05, f"walking against the belt: -3 px/frame, still progress ({r:.2f})")
    # belt 2: 1950 .. 2300, -2
    put(pg, 1980, 540); r, _ = rate(pg, 40, "ArrowRight")
    t.check(abs(r - 3) < 0.05, f"walking right against a -2 belt: 3 px/frame ({r:.2f})")
    # stepping on / off a flush belt: no bump
    put(pg, 1250, 540); pg.keyboard.down("ArrowRight")
    ys = []
    for i in range(30):
        frames(pg, 2); ys.append(ev(pg, S)["feet"])
    pg.keyboard.up("ArrowRight")
    t.check(max(ys) - min(ys) < 0.01, f"walking from the floor onto the belt: feet stay at 540 ({min(ys)}..{max(ys)})")
    # jump height on a belt == on the floor
    def apex(x):
        # frame exact: an update hook records the highest point of the feet
        put(pg, x, 540); frames(pg, 3)
        ev(pg, """(() => { window.APEX = 999; window.LANDED = null; var o = SpiderMan.prototype.update; window.ORIG_UPDATE = o;
            SpiderMan.prototype.update = function() { var r = o.apply(this, arguments); var f = this.y + this.bodyHeight();
              if (f < APEX) APEX = f; if (APEX < 530 && this.onGround && !LANDED) LANDED = this.groundRoof && this.groundRoof.style; return r; }; })()""")
        pg.keyboard.press("Space"); frames(pg, 60)
        res = ev(pg, "[540 - APEX, LANDED]")
        ev(pg, "(() => { SpiderMan.prototype.update = ORIG_UPDATE; })()")
        return res[0], {"ground": res[1]}
    h_floor, _ = apex(2600)
    h_belt, land = apex(1450)
    t.check(abs(h_floor - h_belt) < 0.01 and h_belt > 150, f"jump height on a belt = on the floor ({h_belt:.1f} vs {h_floor:.1f})")
    t.check(land and land["ground"] == "CONVEYOR", "a standing jump on a belt lands back on the belt")
    # air carry: a standing jump on the +2 belt drifts with it (~2 px per air frame)
    # (frame exact: x on the last frame on the belt before take-off and on the landing frame, recorded by a hook)
    put(pg, 1400, 540); frames(pg, 3)
    ev(pg, """(() => { window.AIR = { x0: null, x1: null, air: null, last: null }; var o = SpiderMan.prototype.update; window.AIR_ORIG = o;
        SpiderMan.prototype.update = function() { var before = { x: this.x, g: this.onGround }; var r = o.apply(this, arguments);
            if (AIR.x0 === null && before.g && !this.onGround) { AIR.x0 = before.x; AIR.air = this.airBeltX; }
            else if (AIR.x0 !== null && AIR.x1 === null && this.onGround) AIR.x1 = this.x;
            return r; }; })()""")
    pg.keyboard.press("Space")
    for i in range(120):
        frames(pg, 1)
        if ev(pg, "AIR.x1 !== null"): break
    air = ev(pg, "(() => { SpiderMan.prototype.update = AIR_ORIG; return AIR; })()")
    t.check(air["air"] == 2, f"in the air he keeps the belt's speed (airBeltX {air['air']})")
    drift = (air["x1"] - air["x0"]) if air["x1"] is not None else -1
    print("   air carry drift:", drift); t.check(80 <= drift <= 110, f"standing jump on the +2 belt lands ~2 px/frame further ({drift:.0f} px over the jump)")
    # walking off the end of a belt keeps the push in the air, then stops on the floor
    put(pg, 1690, 540); frames(pg, 40)
    s = ev(pg, S)
    t.check(s["ground"] in ("FLOOR",) and s["belt"] == 0 and s["air"] == 0, f"carried off the belt end onto the floor, push ends ({s['ground']}, x {s['x']:.0f})")
    # slide dash on a belt
    put(pg, 1400, 540); frames(pg, 3); pg.keyboard.press("ArrowRight"); x0 = ev(pg, S)["x"]; pg.keyboard.press("ArrowDown"); frames(pg, 10)
    t.check(ev(pg, S)["x"] - x0 > 60 and ev(pg, S)["feet"] > 539, "slide dash works on a belt")

    # ---- the reject line (13500 .. 14100 at 380): -5.5 until BELT is powered ----
    rl = roof_at(pg, 13600, 380)
    t.check(rl and rl["speed"] == -5.5, f"reject line runs backwards at 5.5 ({rl})")
    put(pg, 13950, 380, "s.invulnerableFrames = 9999;"); r, _ = rate(pg, 60, "ArrowRight", skip=6)
    print("   reject line rate:", round(r, 3)); t.check(-0.6 < r < -0.4, f"running against it loses ground (-0.5 px/frame: {r:.2f})")
    put(pg, 13900, 380, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); pg.keyboard.down("Space")
    x0 = ev(pg, S)["x"]; frames(pg, 150); pg.keyboard.up("Space"); pg.keyboard.up("ArrowRight")
    s = ev(pg, S)
    t.check(s["x"] < x0 and s["cx"] < 14100, f"hopping against it does not get through either ({x0:.0f} -> {s['x']:.0f})")
    put(pg, 13560, 380, "s.invulnerableFrames = 9999;"); frames(pg, 90)
    s = ev(pg, S)
    t.check(s["g"] and abs(s["feet"] - 400) < 0.5 and s["cx"] < 13450 and s["hp"] == 5, f"it throws him off its start back onto the booth, unhurt ({s})")
    # head bump from below: jumping under the raised belt never goes through it
    put(pg, 13700, 540, "s.invulnerableFrames = 9999;"); pg.keyboard.press("Space")
    top = 999
    for i in range(40):
        frames(pg, 1); top = min(top, ev(pg, "game.spiderman.y"))
    t.check(top >= 400 - 0.5, f"jumping under the belt bumps its underside (head never above 400: {top:.1f})")

    # ================= switch puzzle =================
    door = lambda: ev(pg, "game.level.gates[0].state")
    t.check(door() == "CLOSED" and ev(pg, "game.level.switchesOn('EXIT')") == 0, "blast door closed, 0/2 generators")
    # walk up to the door: locked message with the power count
    put(pg, 16300, 540, "s.invulnerableFrames = 9999; game.scene.enemies.filter(e => e.name === 'THUG' && Math.abs(e.centerX() - 16100) < 50).forEach(e => game.removeEnemy(e));")
    ev(pg, "TXT.length = 0")
    pg.keyboard.down("ArrowRight"); frames(pg, 30); pg.keyboard.up("ArrowRight")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("LOCKED - POWER 0/2" in msgs, f"door says LOCKED - POWER 0/2 ({msgs})")
    t.check(ev(pg, S)["cx"] < 16440, "the closed door blocks him")
    # generator 2 first (order does not matter): jump onto the pedestal in the boiler pit
    put(pg, 15330, 640, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); frames(pg, 6); pg.keyboard.press("Space"); frames(pg, 50); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.level.switches.find(w => w.x === 15500).on"), "generator 2 switched on in the boiler pit")
    t.check(ev(pg, "game.level.switchesOn('EXIT')") == 1 and door() == "CLOSED", "1/2: door still closed")
    # belt control: climb the control tank ladder, walk into the lever
    put(pg, 12890, 540, "s.invulnerableFrames = 9999;")
    pg.keyboard.down("ArrowRight"); frames(pg, 8); pg.keyboard.up("ArrowRight")
    pg.keyboard.down("ArrowUp")
    for i in range(150):
        frames(pg, 2)
        s = ev(pg, S)
        if s["g"] and not s["climb"] and s["feet"] < 245: break
    pg.keyboard.up("ArrowUp")
    t.check(abs(ev(pg, S)["feet"] - 240) < 1, "climbed the control tank ladder onto its roof")
    # walk right until the lever flips (from the ladder top it is ~20 frames - a fixed 20 was one frame short
    # whenever the key event reached the game a frame late)
    ev(pg, "TXT.length = 0")
    pg.keyboard.down("ArrowRight")
    for i in range(60):
        frames(pg, 1)
        if ev(pg, "game.level.switches.find(w => w.x === 13070).on"): break
    pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.level.switches.find(w => w.x === 13070).on"), "BELT CONTROL switched on")
    t.check(roof_at(pg, 13600, 380)["speed"] == 3, "the reject line now runs forward at 3")
    frames(pg, 2); msgs = ev(pg, "TXT.splice(0)")
    t.check("BELT REVERSED" in msgs, f"'BELT REVERSED' shown ({msgs})")
    # ride it into the press: held flush against its wall, no jitter, then jump up to generator 1
    put(pg, 13560, 380, "s.invulnerableFrames = 9999;")
    xs = []
    for i in range(40):
        frames(pg, 6); xs.append(round(ev(pg, S)["x"], 2))
    t.check(abs(xs[-1] - (14100 - 52.5)) < 0.1 and len(set(xs[-10:])) == 1, f"belt holds him flush against the press wall, no jitter ({xs[-3:]})")
    t.check(ev(pg, S)["feet"] == 380, "still standing on the belt (not pushed into / under the press)")
    pg.keyboard.down("ArrowRight"); pg.keyboard.press("Space"); frames(pg, 60); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.level.switches.find(w => w.x === 14250).on"), "jumped up onto the press: generator 1 on")
    frames(pg, 60)
    t.check(door() == "OPEN", f"both generators on: blast door open ({door()})")
    put(pg, 16300, 540, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); frames(pg, 90); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, S)["cx"] > 16720, "he walks through the door's underpass into the loading bay")

    # ================= steam vents =================
    start(pg)
    put(pg, 2400, 540)
    ev(pg, "(() => { var h = game.level.hazards.find(h => h.kind === 'STEAM' && h.x === 2420); window.V = h; })()")
    def phase(): return ev(pg, "game.level.steamPhase(V)")
    # stand right on the vent; measure damage per state
    hurt_in = set()
    put(pg, 2410, 540)
    ev(pg, """(() => { window.SEEN = {}; window.HURT = {}; var lv = game.level, s0 = game.spiderman, hp = s0.health;
        var orig = lv.updateObjects; lv.updateObjects = function() { var s = game.spiderman; s.invulnerableFrames = 0;
            var before = s.health; orig.apply(this, arguments); var ph = lv.steamPhase(V).state; SEEN[ph] = (SEEN[ph] || 0) + 1;
            if (s.health < before) { HURT[ph] = (HURT[ph] || 0) + 1; s.health = 5; } s.x = 2410; }; })()""")
    frames(pg, 420)
    seen = ev(pg, "SEEN"); hurt_in = set(ev(pg, "Object.keys(HURT)"))
    ev(pg, "delete game.level.updateObjects")
    t.check(hurt_in == {"BLAST"}, f"a vent only hurts while it blasts (hurt in {hurt_in}, frames per state {seen})")
    t.check(seen["WARN"] > 20 and seen["BLAST"] > 30, "warning hiss before every blast")
    # pit floor is not a death zone
    put(pg, 14750, 640, "s.invulnerableFrames = 9999;"); frames(pg, 120)
    t.check(ev(pg, "game.state") == "PLAYING", "standing on the boiler pit floor is safe (not a fall)")

    # ================= death / retry from every checkpoint =================
    start(pg)
    cps = ev(pg, "game.level.checkpoints.map(c => [c.x, c.y])")
    retry_ok = []
    for (cx, cy) in cps:
        put(pg, cx - 40, cy, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")
        active = ev(pg, f"game.levelCheckpoint && game.levelCheckpoint.x === {cx}")
        # die standing on the checkpoint: 1 heart, then a hit. (Not where the walk ended: how far 12 frames of
        # walking get him depends on when the key event arrives, and past 16780 he can end up on the heart at 16860 -
        # a heart touched in the same frame as the last hit is picked up and he survives, which is the game's rule)
        put(pg, cx - 26, cy, "s.invulnerableFrames = 9999;")
        ev(pg, "(() => { var s = game.spiderman; s.health = 1; s.invulnerableFrames = 0; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()")
        frames(pg, 3)
        over = ev(pg, "game.state") == "GAMEOVER"
        vis = ev(pg, "getComputedStyle(document.querySelector('.spiderman-game-checkpoint-button')).display !== 'none'")
        pg.locator('.spiderman-game-gameover-menu .spiderman-game-checkpoint-button').click()
        frames(pg, 150)   # idle for 2.5 s at the respawn point
        s = ev(pg, S)
        ok = active and over and vis and s["st"] == "PLAYING" and s["g"] and abs(s["cx"] - cx) < 60 and abs(s["feet"] - cy) < 1 and s["hp"] == 5
        retry_ok.append(ok)
        if not ok: print("   retry problem at", cx, active, over, vis, s)
    t.check(all(retry_ok), f"die + RETRY FROM CHECKPOINT at all {len(cps)} checkpoints: back on the checkpoint, full hearts, safe for 2.5 s")

    # real deaths: the sludge pit and a steam blast with the last heart
    start(pg)
    put(pg, 2500, 540); pg.keyboard.down("ArrowRight"); frames(pg, 90); pg.keyboard.up("ArrowRight")   # through checkpoint 2580, into the pit
    t.check(ev(pg, "game.state") == "GAMEOVER" and ev(pg, "game.gameoverReason") == "FELL", "walking into the sludge pit: YOU FELL INTO THE PIT")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(abs(ev(pg, S)["cx"] - 2580) < 60, "retry from checkpoint 2580 (touched on the way)")
    ev(pg, "game.spiderman.health = 1")
    put(pg, 2410, 540, "s.health = 1; s.invulnerableFrames = 0;")
    for i in range(260):
        frames(pg, 1)
        if ev(pg, "game.state") != "PLAYING": break
        ev(pg, "(() => { var s = game.spiderman; if (s.onGround && Math.abs(s.x - 2410) > 3) { s.x = 2410; } })()")
    t.check(ev(pg, "game.state") == "GAMEOVER" and ev(pg, "game.gameoverReason") == "HEALTH", "a steam blast with the last heart: game over (HEALTH)")

    # ---- puzzle state and checkpoints: progress after the last checkpoint is not kept, before it is ----
    start(pg)
    put(pg, 12740, 540, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")   # checkpoint 12780
    ev(pg, "game.level.switches.filter(w => w.gate === 'BELT').forEach(w => { w.on = true; game.level.setPowered('BELT'); })")
    ev(pg, "(() => { var w = game.level.switches.find(w => w.x === 14250); w.on = true; })()")
    ev(pg, "game.spiderman.health = 1; game.spiderman.invulnerableFrames = 0; game.spiderman.handleHitWithProjectile({ name: 'HAZARD', damage: 1 })")
    frames(pg, 3); click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(roof_at(pg, 13600, 380)["speed"] == -5.5 and not ev(pg, "game.level.switches.find(w => w.x === 13070).on"),
            "switches flipped AFTER the last checkpoint are undone on retry (belt runs backwards again)")
    # now flip everything, reach checkpoint 15780, die, retry: all kept
    ev(pg, "game.level.switches.forEach(w => { w.on = true; }); game.level.setPowered('BELT'); game.level.setPowered('EXIT')")
    frames(pg, 60)
    put(pg, 15740, 540, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")
    ev(pg, "game.spiderman.health = 1; game.spiderman.invulnerableFrames = 0; game.spiderman.handleHitWithProjectile({ name: 'HAZARD', damage: 1 })")
    frames(pg, 3); ev(pg, "TXT.length = 0"); click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(roof_at(pg, 13600, 380)["speed"] == 3 and door() == "OPEN" and ev(pg, "game.level.switchesOn('EXIT')") == 2,
            "switches / reversed belt / open door from BEFORE the checkpoint are kept on retry")
    frames(pg, 5); msgs = ev(pg, "TXT.splice(0)")
    t.check("BELT REVERSED" not in msgs and "LIFT POWERED" not in msgs, "restoring them is quiet (no floating texts)")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    t.check(roof_at(pg, 13600, 380)["speed"] == -5.5 and door() == "CLOSED" and ev(pg, "game.levelCheckpoint") is None, "RESTART STAGE resets the whole puzzle")

    # ================= pause freezes belts, steam and the timer =================
    put(pg, 1400, 540); frames(pg, 5)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    a = ev(pg, "[game.spiderman.x, game.level.frame, game.levelFrames]"); pg.wait_for_timeout(800); bb = ev(pg, "[game.spiderman.x, game.level.frame, game.levelFrames]")
    t.check(ev(pg, "game.state") == "PAUSED" and a == bb, f"pause freezes the belt push, steam cycle and timer ({a} / {bb})")
    pg.keyboard.press("Escape"); frames(pg, 10)
    t.check(ev(pg, S)["x"] > a[0] + 10, "resume: the belt moves him again")

    # ================= completion =================
    put(pg, 18700, 300, "s.invulnerableFrames = 9999;"); pg.keyboard.down("ArrowRight"); frames(pg, 60); pg.keyboard.up("ArrowRight")
    pg.wait_for_timeout(200)
    t.check(ev(pg, "game.state") == "COMPLETE", "the flag on the plant roof clears the stage")
    t.check(ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-stage-line').textContent") == "STAGE 2-1 - INDUSTRIAL ZONE", "results name the stage")
    t.check(ev(pg, "game.isLevelCompleted('2-1')"), "clear saved")

    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()
t.report()
