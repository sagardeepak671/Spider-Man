from harness import *
t = T("Stage 2-2 Research Labs: structure, lasers, slide duct, grid puzzle, doors, shaft, wave, checkpoints, death / retry, completion")

S = """(() => { var s = game.spiderman; return { x: s.x, y: s.y, feet: s.y + s.bodyHeight(), cx: s.x + s.bodyWidth() / 2, g: s.onGround,
    ground: s.groundRoof ? s.groundRoof.style : null, hp: s.health, f: game.levelFrames, st: game.state, climb: !!s.climbing }; })()"""

def frames(pg, n):
    f0 = ev(pg, "game.levelFrames")
    while ev(pg, "game.levelFrames") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

def put(pg, x, surface, extra=""):
    # a clean start: no keys, no slide dash / cooldown left over from the previous check (a dash still running
    # after the teleport would add its speed to the next measurement)
    ev(pg, f"""(() => {{ var s = game.spiderman; s.x = {x}; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityY = 0; s.velocityX = 0;
        s.airBeltX = 0; s.momentumX = 0; s.climbing = null; s.swinging = null; s.health = 5; s.releaseAllKeys(); s.slideFrames = 0; s.slideCooldown = 0; s.invulnerableFrames = 0; {extra} }})()""")
    frames(pg, 3)

def start(pg, dev=True):
    ev(pg, f"game.setDevMode({'true' if dev else 'false'}); game.showMainMenu()")
    click(pg, '[data-action="campaign"]')
    click(pg, '.spiderman-game-world-tab[data-world="1"]')
    click(pg, '[data-level="2-2"]')
    ev(pg, "game.introFrames = 0")
    frames(pg, 5)

def laser_at(x, y=None):
    return f"game.level.lasers.find(l => (l.vertical ? l.x : l.x1) === {x})"

def kill(pg):
    ev(pg, "(() => { var s = game.spiderman; s.health = 1; s.invulnerableFrames = 0; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()")
    frames(pg, 3)

INV = "s.invulnerableFrames = 99999;"

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    ev(pg, "(() => { window.TXT = []; var o = game.addFloatingText.bind(game); game.addFloatingText = function(t) { TXT.push(t); return o.apply(null, arguments); }; })()")
    start(pg)

    # ================= structure =================
    info = ev(pg, """(() => { var lv = game.level, d = lv.design;
        return { name: lv.name, theme: game.backdrop.theme, width: lv.width, coins: lv.totalCoins, enemies: lv.totalEnemies,
            designEnemies: d.enemies.length, names: lv.enemies.map(e => e.name), want: d.enemies.map(e => e.type),
            designProps: d.props.length, propsPlaced: game.scene.roofs.reduce((n, r) => n + r.props.length, 0),
            cps: lv.checkpoints.length, lasers: lv.lasers.length, timed: lv.lasers.filter(l => !l.powerId && l.period).length,
            grid: lv.lasers.filter(l => l.powerId).length, doors: lv.doors.length, switches: lv.switches.length, gates: lv.gates.length,
            anchors: lv.anchors.length, hearts: lv.pickups.filter(p => p.type === 'HEALTH').length, webs: lv.pickups.filter(p => p.type === 'WEB').length,
            keys: lv.pickups.filter(p => p.type === 'KEY').map(p => p.label), rooms: lv.rooms.map(r => r.style) }; })()""")
    print("   level:", {k: v for k, v in info.items() if k not in ("names", "want")})
    t.check(info["name"] == "RESEARCH LABS" and info["theme"] == "LAB", "2-2 is the research labs with its own backdrop")
    t.check(info["enemies"] == info["designEnemies"] == 6 and info["names"] == info["want"], f"every enemy placed as its type {info['names']}")
    t.check(info["propsPlaced"] == info["designProps"], f"every prop found its platform ({info['propsPlaced']}/{info['designProps']})")
    t.check(info["cps"] == 7 and info["grid"] == 3 and info["timed"] >= 15, f"7 checkpoints, a 3 beam grid, {info['timed']} timed lasers")
    t.check(info["doors"] == 2 and info["switches"] == 2 and info["gates"] == 1 and info["anchors"] == 2, "2 doors, 2 overrides, the security door, 2 swing anchors")
    t.check(info["keys"] == ["L3 KEYCARD"] and info["hearts"] == 6 and info["webs"] >= 3, "pickups: the L3 keycard, hearts, web canisters")
    t.check("LAB" in info["rooms"] and "SERVER" in info["rooms"] and "ATRIUM" in info["rooms"] and "VAULT" in info["rooms"], "lab, server room, atrium and containment rooms")
    mount = ev(pg, """(() => { var bad = [];
        function top(x, y) { return game.scene.roofs.some(r => r.x <= x && r.x + r.fullWidth >= x && Math.abs(r.y - y) < 1); }
        function bottom(x, y) { return game.scene.roofs.some(r => r.x <= x && r.x + r.fullWidth >= x && Math.abs(r.bottom() - y) < 1); }
        game.level.lasers.forEach(l => {
            if (l.vertical) { if (!top(l.x, l.y2)) bad.push('floor emitter ' + l.x); if (!bottom(l.x, l.y1)) bad.push('ceiling emitter ' + l.x); }
            else if (l.post === undefined || !top(l.x1 - 5, l.post) || !top(l.x2 + 5, l.post)) bad.push('posts ' + l.x1);
        });
        game.level.checkpoints.forEach(c => { if (!top(c.x, c.y)) bad.push('cp ' + c.x); });
        game.level.switches.forEach(w => { if (!top(w.x, w.y)) bad.push('switch ' + w.x); });
        game.level.doors.forEach(d => { if (!top(d.x, d.y)) bad.push('door ' + d.id); });
        game.level.pickups.filter(p => p.type !== 'COIN').forEach(p => { if (!top(p.x, p.y + 30) && !top(p.x, p.y + 32)) bad.push(p.type + ' ' + p.x); });
        return bad; })()""")
    t.check(mount == [], f"every laser emitter is mounted (floor + ceiling / posts), nothing floats {mount}")
    threats = ev(pg, """game.level.checkpoints.map(c => [c.x, game.scene.enemies.filter(e => Math.abs(e.centerX() - c.x) <= 560 && Math.abs(e.centerY() - (c.y - 30)) <= 260).map(e => e.name)]).filter(c => c[1].length)""")
    t.check(threats == [], f"no enemy can attack a fresh respawn at a checkpoint {threats}")
    near = ev(pg, """game.level.checkpoints.filter(c => game.level.lasers.some(l => { var r = game.level.laserRect(l); return r.right > c.x - 80 && r.left < c.x + 80 && r.bottom > c.y - 60 && r.top < c.y; })).map(c => c.x)""")
    t.check(near == [], f"no laser within 80 px of a checkpoint {near}")

    # ================= laser timing =================
    # phases over two full cycles of the first lobby gate, frame by frame (hooked into the level update)
    ev(pg, """(() => { window.PH = []; var lv = game.level, o = lv.updateObjects; lv.updateObjects = function() { o.apply(this, arguments); PH.push(lv.laserState(lv.lasers[0]).state); }; })()""")
    put(pg, 200, 540, INV); frames(pg, 370)
    ph = ev(pg, "PH"); ev(pg, "delete game.level.updateObjects")
    runs = []
    for s_ in ph:
        if runs and runs[-1][0] == s_: runs[-1][1] += 1
        else: runs.append([s_, 1])
    inner = runs[1:-1]
    t.check(" ".join(r[0] for r in inner) in " ".join(["OFF", "WARN", "ON"] * 4), f"a timed laser cycles OFF -> WARN -> ON ({[r[0] for r in inner]})")
    lens = {r[0]: r[1] for r in inner}
    t.check(lens.get("OFF") == 60 and lens.get("WARN") == 50 and lens.get("ON") == 70, f"phase lengths 60 / 50 / 70 frames ({lens})")
    # damage only while ON: stand in the beam (kept in place, safe time cleared every frame)
    ev(pg, """(() => { window.HURT = {}; var lv = game.level, o = lv.updateObjects; lv.updateObjects = function() { var s = game.spiderman, h = s.health;
        o.apply(this, arguments); var st = lv.laserState(lv.lasers[0]).state; if (s.health < h) { HURT[st] = (HURT[st] || 0) + 1; s.health = 5; }
        s.invulnerableFrames = 0; s.x = 1275; s.velocityY = 0; }; })()""")
    put(pg, 1275, 540); frames(pg, 200)
    hurt = ev(pg, "HURT"); ev(pg, "delete game.level.updateObjects")
    t.check(list(hurt.keys()) == ["ON"], f"a laser only hurts while it is on ({hurt})")
    # warning sounds: beeps in WARN, a zap when it fires
    ev(pg, """(() => { window.SND = []; var o = game.sfx.play.bind(game.sfx); game.sfx.play = function(n) { SND.push([n, game.level.laserState(game.level.lasers[0]).state]); return o(n); }; })()""")
    put(pg, 1180, 540, INV); frames(pg, 190)
    snd = ev(pg, "SND.filter(s => s[0].indexOf('LASER') === 0)")
    t.check(any(n == "LASER_WARN" and st_ == "WARN" for n, st_ in snd) and any(n == "LASER_ON" for n, st_ in snd), f"warning beeps while it warns, a zap when it fires ({snd[:6]})")
    t.check(len([1 for n, st_ in snd if n == "LASER_WARN"]) >= 3, "at least three beeps per warning near the gate")
    # the status lamp on the floor emitter, read from the canvas: green / yellow / red
    # sampled in the page right after the laser is drawn (frame exact: the warning lamp blinks)
    ev(pg, """(() => { window.LAMP = {}; var lv = game.level, l0 = lv.lasers[0], orig = lv.drawLaser;
        lv.drawLaser = function(l, frame) { orig.apply(this, arguments); if (l !== l0) return;
            var st = lv.laserState(l), bright = Math.floor(st.t / Math.max(2, 8 - Math.floor(st.t / 8))) % 2 === 0;
            if (LAMP[st.state] || (st.state === 'WARN' && (!bright || st.t < 4))) return;
            var z = game.zoom, sx = Math.round((l.x - game.cameraX) * z), sy = Math.round((l.y2 - 10 - game.cameraY) * z);
            var d = game.ctx.getImageData(sx, sy, 1, 1).data; LAMP[st.state] = [d[0], d[1], d[2]]; }; })()""")
    for i in range(60):
        frames(pg, 10)
        if len(ev(pg, "Object.keys(LAMP)")) == 3: break
    colors = ev(pg, "LAMP"); ev(pg, "delete game.level.drawLaser")
    print("   lamp colours:", colors)
    g_, y_, r_ = colors["OFF"], colors["WARN"], colors["ON"]
    t.check(g_[1] > g_[0] and g_[1] > g_[2], "lamp is green while off")
    t.check(y_[0] > 150 and y_[1] > 100 and y_[2] < 100, "lamp is yellow while warning")
    t.check(r_[0] > 200 and r_[1] < 100, "lamp is red while on")

    # ================= decontamination duct: slide under the low beam =================
    # DOWN about 60 px before the beam (the slide window is ~80 px: from ~90 px to ~10 px before it)
    put(pg, 3560, 250); pg.keyboard.down("ArrowRight")
    for i in range(60):
        frames(pg, 1)
        if ev(pg, "game.spiderman.x + game.spiderman.bodyWidth()") >= 3690: break
    pg.keyboard.press("ArrowDown"); frames(pg, 40); pg.keyboard.up("ArrowRight")
    s = ev(pg, S)
    t.check(s["hp"] == 5 and s["cx"] > 3830, f"sliding under the duct beam: unhurt ({s['hp']}, x {s['cx']:.0f})")
    put(pg, 3560, 250); pg.keyboard.down("ArrowRight"); frames(pg, 60); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, S)["hp"] == 4, "walking into it costs a heart")
    put(pg, 3650, 250); pg.keyboard.press("Space"); frames(pg, 5)
    t.check(ev(pg, "game.spiderman.y") >= 150 - 0.5, "no room to jump inside the duct (head stays under its ceiling)")

    # ================= grid + keycard + security door =================
    door = lambda: ev(pg, "game.level.gates[0].state")
    ev(pg, "TXT.length = 0")
    put(pg, 9580, 540); pg.keyboard.down("ArrowRight"); frames(pg, 40); pg.keyboard.up("ArrowRight")
    s = ev(pg, S)
    msgs = ev(pg, "TXT.splice(0)")
    t.check(s["cx"] < 9700 and "LASER GRID - OVERRIDE 0/2" in msgs, f"the grid is solid and says OVERRIDE 0/2 ({s['cx']:.0f}, {msgs})")
    t.check(s["hp"] == 4, "touching it zaps (one heart)")
    frames(pg, 120); pg.keyboard.down("ArrowRight"); frames(pg, 60); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, S)["cx"] < 9700, "still cannot get through after the safe time")
    # the security door without the keycard
    ev(pg, "TXT.length = 0")
    put(pg, 10200, 540, INV); pg.keyboard.down("ArrowRight"); frames(pg, 30); pg.keyboard.up("ArrowRight")
    msgs = ev(pg, "TXT.splice(0)")
    t.check(door() == "CLOSED" and any("NEEDS A L3 KEYCARD" in m for m in msgs), f"security door: LOCKED - NEEDS A L3 KEYCARD ({msgs})")
    # override 1 in the robotics lab, through the door
    put(pg, 8180, 540, INV); pg.keyboard.press("ArrowUp"); frames(pg, 45)
    s = ev(pg, S)
    t.check(abs(s["feet"] - 180) < 1 and abs(s["cx"] - 7980) < 30, f"UP at the ROBOTICS LAB door: upstairs ({s['feet']:.0f}, {s['cx']:.0f})")
    put(pg, 9480, 180, INV + "game.scene.enemies.filter(e => e.centerX() > 9300 && e.centerX() < 9500).forEach(e => game.removeEnemy(e));")
    pg.keyboard.down("ArrowRight"); frames(pg, 25); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.level.switchesOn('GRID')") == 1 and not ev(pg, "game.level.powered.GRID"), "override 1 on: grid 1/2, still on")
    put(pg, 7960, 180, INV); pg.keyboard.press("ArrowUp"); frames(pg, 45)
    t.check(abs(ev(pg, S)["feet"] - 540) < 1, "the EXIT door leads back down to the corridor")
    # the maintenance shaft: running into it drops you into the server room
    put(pg, 8850, 540, INV); pg.keyboard.down("ArrowRight"); frames(pg, 70); pg.keyboard.up("ArrowRight")
    s = ev(pg, S)
    t.check(abs(s["feet"] - 840) < 1 and ev(pg, "game.state") == "PLAYING", f"running into the 140 px shaft drops him into the basement (feet {s['feet']:.0f})")
    # override 2
    ev(pg, "TXT.length = 0")
    put(pg, 9780, 840, INV + "game.scene.enemies.filter(e => e.centerX() > 9600 && e.centerX() < 9800).forEach(e => game.removeEnemy(e));")
    pg.keyboard.down("ArrowRight"); frames(pg, 20); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.level.powered.GRID") == True, "override 2 on: grid powered down")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("LASER GRID OFFLINE" in msgs, f"'LASER GRID OFFLINE' shown ({msgs})")
    t.check(ev(pg, "game.level.lasers.filter(l => l.powerId).every(l => game.level.laserState(l).offline)") and ev(pg, "game.level.obstacles().filter(o => o.rect).length") == 0, "grid beams off and no longer solid")
    # back up the ladder
    put(pg, 9100, 840, INV); pg.keyboard.down("ArrowLeft"); frames(pg, 6); pg.keyboard.up("ArrowLeft"); pg.keyboard.down("ArrowUp")
    for i in range(160):
        frames(pg, 2)
        s = ev(pg, S)
        if s["g"] and not s["climb"] and s["feet"] < 545: break
    pg.keyboard.up("ArrowUp")
    t.check(abs(ev(pg, S)["feet"] - 540) < 1, "climbed the shaft ladder back up to the corridor")
    # through the grid, keycard, door
    put(pg, 9560, 540, INV); pg.keyboard.down("ArrowRight"); frames(pg, 110); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.level.keys.L3") == True, "walked through the dead grid and picked up the L3 keycard")
    t.check(ev(pg, "game.levelCheckpoint && game.levelCheckpoint.x") == 10060, "checkpoint after the keycard")
    pg.keyboard.down("ArrowRight"); frames(pg, 100); pg.keyboard.up("ArrowRight")
    t.check(door() in ("OPENING", "OPEN"), f"the keycard opens the security door ({door()})")
    frames(pg, 60); pg.keyboard.down("ArrowRight"); frames(pg, 60); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, S)["cx"] > 10500, "through the security door")

    # ================= checkpoints: puzzle state =================
    start(pg)
    put(pg, 7640, 540, INV); pg.keyboard.down("ArrowRight"); frames(pg, 15); pg.keyboard.up("ArrowRight")     # checkpoint 7680
    ev(pg, "(() => { var w = game.level.switches.find(w => w.x === 9540); w.on = true; })()")
    kill(pg); click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(ev(pg, "game.level.switchesOn('GRID')") == 0, "an override flipped after the last checkpoint is undone on retry")
    ev(pg, "game.level.switches.forEach(w => { w.on = true; }); game.level.setPowered('GRID'); game.level.keys.L3 = true")
    put(pg, 10020, 540, INV); pg.keyboard.down("ArrowRight"); frames(pg, 15); pg.keyboard.up("ArrowRight")   # checkpoint 10060
    ev(pg, "TXT.length = 0")
    kill(pg); click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    s = ev(pg, S)
    t.check(ev(pg, "game.level.powered.GRID") and ev(pg, "game.level.keys.L3") and ev(pg, "game.level.switchesOn('GRID')") == 2, "overrides, the dead grid and the keycard from before the checkpoint are kept")
    t.check(abs(s["cx"] - 10060) < 60 and s["hp"] == 5, "respawned at the checkpoint with full hearts")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("LASER GRID OFFLINE" not in msgs, "restored quietly")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    t.check(not ev(pg, "game.level.powered.GRID") and not ev(pg, "game.level.keys.L3") and door() == "CLOSED", "RESTART STAGE resets the grid, keycard and door")

    # retry at every checkpoint: back on it, full hearts, nothing hurts him for 2.5 s
    cps = ev(pg, "game.level.checkpoints.map(c => [c.x, c.y])")
    ok_all = []
    for (cx_, cy_) in cps:
        # the checkpoints behind the grid need it down
        ev(pg, "game.level.switches.forEach(w => { w.on = true; }); game.level.setPowered('GRID', true); game.level.keys.L3 = true")
        put(pg, cx_ - 40, cy_, INV); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")
        active = ev(pg, f"game.levelCheckpoint && game.levelCheckpoint.x === {cx_}")
        kill(pg)
        pg.locator('.spiderman-game-gameover-menu .spiderman-game-checkpoint-button').click()
        frames(pg, 150)
        s = ev(pg, S)
        ok = active and s["st"] == "PLAYING" and s["g"] and abs(s["cx"] - cx_) < 60 and abs(s["feet"] - cy_) < 1 and s["hp"] == 5
        ok_all.append(ok)
        if not ok: print("   retry problem at", cx_, active, s)
    t.check(all(ok_all), f"die + RETRY FROM CHECKPOINT at all {len(cps)} checkpoints: on the checkpoint, full hearts, unhurt for 2.5 s")

    # ================= the wave corridor =================
    def wave_run(wait_for):
        start(pg)
        put(pg, 12700, 540, INV)
        ev(pg, "game.spiderman.invulnerableFrames = 0; game.scene.enemies.forEach(e => game.removeEnemy(e))")
        first = laser_at(12840)
        # wait for the moment, then hold right (real key) until past the last beam
        for i in range(400):
            frames(pg, 1)
            stt = ev(pg, f"game.level.laserState({first})")
            if wait_for(stt): break
        hp0 = ev(pg, S)["hp"]
        pg.keyboard.down("ArrowRight")
        for i in range(200):
            frames(pg, 1)
            if ev(pg, S)["x"] > 13460: break
        pg.keyboard.up("ArrowRight")
        return hp0 - ev(pg, S)["hp"], ev(pg, S)["x"]
    lost, x_ = wave_run(lambda st: st["state"] == "OFF" and st["t"] == 0)
    t.check(lost == 0 and x_ > 13460, f"running right as the first beam goes dark rides the wave through all five ({lost} hearts lost)")
    lost2, _ = wave_run(lambda st: st["state"] == "ON" and st["left"] == 40)
    t.check(lost2 >= 1, f"running at a bad moment gets caught ({lost2} hearts lost)")

    # ================= real deaths =================
    start(pg)
    put(pg, 5380, 250); pg.keyboard.down("ArrowLeft"); frames(pg, 140); pg.keyboard.up("ArrowLeft")
    t.check(ev(pg, "game.state") == "GAMEOVER" and ev(pg, "game.gameoverReason") == "FELL", "falling off a glass walkway into the atrium: YOU FELL INTO THE PIT")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(abs(ev(pg, S)["cx"] - 5330) < 60 and abs(ev(pg, S)["feet"] - 250) < 1, "retry from the atrium checkpoint on the glass walkway")
    put(pg, 1275, 540, "s.health = 1;")
    for i in range(200):
        frames(pg, 1)
        if ev(pg, "game.state") != "PLAYING": break
        ev(pg, "(() => { var s = game.spiderman; if (s.onGround) s.x = 1275; })()")
    t.check(ev(pg, "game.state") == "GAMEOVER" and ev(pg, "game.gameoverReason") == "HEALTH", "a laser with the last heart: game over (HEALTH)")

    # ================= pause freezes lasers =================
    start(pg)
    put(pg, 200, 540, INV); frames(pg, 5)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    a = ev(pg, "[game.level.frame, JSON.stringify(game.level.laserState(game.level.lasers[0]))]"); pg.wait_for_timeout(900)
    bb = ev(pg, "[game.level.frame, JSON.stringify(game.level.laserState(game.level.lasers[0]))]")
    t.check(ev(pg, "game.state") == "PAUSED" and a == bb, "pause freezes the laser cycles")
    pg.keyboard.press("Escape"); frames(pg, 5)
    t.check(ev(pg, "game.level.frame") > a[0], "resume: lasers run again")

    # ================= completion =================
    put(pg, 14300, 200, INV + "game.scene.enemies.forEach(e => game.removeEnemy(e));"); pg.keyboard.down("ArrowRight"); frames(pg, 40); pg.keyboard.up("ArrowRight")
    pg.wait_for_timeout(200)
    t.check(ev(pg, "game.state") == "COMPLETE", "the exit flag clears the stage")
    t.check(ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-stage-line').textContent") == "STAGE 2-2 - RESEARCH LABS", "results name the stage")
    t.check(ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-unlock-line').textContent") == "STAGE 2-3 UNLOCKED!", "2-3 unlocked (NEXT STAGE)")
    t.check(ev(pg, "game.isLevelCompleted('2-2')"), "clear saved")

    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()
t.report()
