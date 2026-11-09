from harness import *
t = T("Stage 2-3 Oscorp Tower: structure, climbing, lifts, collisions, camera, elevator objective, checkpoints, unlocking")

S = """(() => { var s = game.spiderman; return { x: s.x, y: s.y, feet: s.y + s.bodyHeight(), cx: s.x + s.bodyWidth() / 2, g: s.onGround,
    ground: s.groundRoof ? (s.groundRoof.tag || s.groundRoof.style) : null, hp: s.health, f: game.levelFrames, st: game.state,
    climb: !!s.climbing, camX: game.cameraX, camY: game.cameraY }; })()"""

def frames(pg, n):
    f0 = ev(pg, "game.levelFrames")
    while ev(pg, "game.levelFrames") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

def put(pg, x, surface, extra=""):
    # a clean start: no keys, no slide dash / cooldown left over from the previous check (a dash still running
    # after the teleport would add its speed to the next measurement)
    ev(pg, f"""(() => {{ var s = game.spiderman; s.x = {x}; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityY = 0; s.velocityX = 0;
        s.airBeltX = 0; s.momentumX = 0; s.climbing = null; s.swinging = null; s.health = 5; s.releaseAllKeys(); s.slideFrames = 0; s.slideCooldown = 0; s.invulnerableFrames = 99999; game.smoothCamera = null; {extra} }})()""")
    frames(pg, 3)

def start(pg, dev=True):
    ev(pg, f"game.setDevMode({'true' if dev else 'false'}); game.showMainMenu()")
    click(pg, '[data-action="campaign"]')
    click(pg, '.spiderman-game-world-tab[data-world="1"]')
    click(pg, '[data-level="2-3"]')
    ev(pg, "game.introFrames = 0")
    frames(pg, 5)

def roof(tag): return f"game.scene.roofs.find(r => r.tag === '{tag}')"

def kill(pg):
    for i in range(10):
        ev(pg, "(() => { var s = game.spiderman; s.health = 1; s.invulnerableFrames = 0; s.wasDamagedOnPreviousFrame = false; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()")
        frames(pg, 3)
        if ev(pg, "game.state") == "GAMEOVER": return

def climb_up(pg, max_frames=400):
    pg.keyboard.down("ArrowUp")
    for i in range(max_frames // 4):
        frames(pg, 4)
        s = ev(pg, S)
        if s["g"] and not s["climb"] and i > 3: break
    pg.keyboard.up("ArrowUp")
    frames(pg, 10)
    return ev(pg, S)

def ride(pg, tag, top, board_from, dir_key):
    """wait for the platform at its lower stop, walk onto it (real keys), ride to the top, return (on it all the way?, final state)"""
    for i in range(600):
        frames(pg, 1)
        p = ev(pg, f"[{roof(tag)}.y, {roof(tag)}.motion.waitFrames]")
        if p[0] >= board_from - 1 and p[1] > 30: break
    pg.keyboard.down(dir_key)
    for i in range(60):
        frames(pg, 1)
        # walk on until he stands on the middle of it (like a player would)
        if ev(pg, f"(() => {{ var s = game.spiderman, p = {roof(tag)}; return s.onGround && s.groundRoof === p && Math.abs(s.centerX() - (p.x + p.width / 2)) < 20; }})()"): break
    pg.keyboard.up(dir_key)
    gaps = 0
    for i in range(500):
        frames(pg, 1)
        st = ev(pg, f"[game.spiderman.onGround && game.spiderman.groundRoof === {roof(tag)}, Math.abs(game.spiderman.y + game.spiderman.bodyHeight() - {roof(tag)}.y), {roof(tag)}.y]")
        if not st[0] or st[1] > 0.5: gaps += 1
        if st[2] <= top + 0.5: break
    return gaps, ev(pg, S)

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    ev(pg, "(() => { window.TXT = []; var o = game.addFloatingText.bind(game); game.addFloatingText = function(t) { TXT.push(t); return o.apply(null, arguments); }; })()")
    start(pg)

    # ================= structure =================
    info = ev(pg, """(() => { var lv = game.level, d = lv.design;
        return { name: lv.name, theme: game.backdrop.theme, camera: d.camera, height: lv.cameraMaxY - lv.cameraMinY, enemies: lv.totalEnemies,
            names: lv.enemies.map(e => e.name), want: d.enemies.map(e => e.type), props: [d.props.length, game.scene.roofs.reduce((n, r) => n + r.props.length, 0)],
            cps: lv.checkpoints.length, climbables: lv.climbables.map(c => c.type), lifts: lv.roofs.filter(r => r.motion).map(r => r.tag + ':' + r.style),
            switches: lv.switches.length, lasers: lv.lasers.length, steam: lv.hazards.filter(h => h.kind === 'STEAM').length, anchors: lv.anchors.length,
            hearts: lv.pickups.filter(p => p.type === 'HEALTH').length, webs: lv.pickups.filter(p => p.type === 'WEB').length, coins: lv.totalCoins,
            offices: lv.rooms.filter(r => r.style === 'OFFICE').length }; })()""")
    print("   level:", {k: v for k, v in info.items() if k not in ("names", "want")})
    t.check(info["name"] == "OSCORP TOWER" and info["theme"] == "TOWER" and info["camera"] is None, "2-3 is the tower, its own backdrop, the same camera as every other stage")
    t.check(info["height"] > 2500, f"a vertical stage ({info['height']:.0f} px of camera travel)")
    t.check(info["names"] == info["want"] and info["enemies"] == 6, f"every enemy placed as its type {info['names']}")
    t.check(info["props"][0] == info["props"][1], f"every prop placed {info['props']}")
    t.check(info["cps"] == 7 and sorted(info["climbables"]) == ["LADDER", "LATTICE", "POLE", "POLE"], f"7 checkpoints, ladder + 2 poles + a lattice {info['climbables']}")
    t.check(sorted(info["lifts"]) == ["ELEV:ELEVATOR", "GONDOLA:GONDOLA", "LIFT1:LIFT", "LIFT2:LIFT"], f"lifts {info['lifts']}")
    t.check(info["switches"] == 2 and info["lasers"] == 5 and info["steam"] >= 4 and info["anchors"] == 1, "2 power switches, lasers, steam vents and a swing hook")
    t.check(info["hearts"] >= 6 and info["webs"] >= 3, "pickups: hearts and web canisters")
    # climbables stand at the edge of the floor they lead to: the hop at the top lands on it
    tops = ev(pg, """game.level.climbables.filter(c => c.type !== 'LATTICE').map(c => { var mid = c.x + c.width / 2, bw = game.spiderman.bodyWidth();
        var ok = game.scene.roofs.some(r => Math.abs(r.y - c.top) < 1 && r.x < mid + bw / 2 - 5 && r.x + r.fullWidth > mid - bw / 2 + 5); return [c.type, c.x, ok]; })""")
    t.check(all(o for _, _, o in tops), f"every ladder / pole has a floor under its top hop {tops}")
    threats = ev(pg, """game.level.checkpoints.map(c => [c.x, c.y, game.scene.enemies.filter(e => Math.abs(e.centerX() - c.x) <= 560 && Math.abs(e.centerY() - (c.y - 30)) <= 120).map(e => e.name)]).filter(c => c[2].length)""")
    t.check(threats == [], f"no enemy on a checkpoint's floor within attack range {threats}")

    # ================= climbing =================
    put(pg, 1280, 300); s = climb_up(pg)
    t.check(abs(s["feet"] - 60) < 1 and s["g"], f"ladder: climbed from the maintenance floor onto the security floor ({s['feet']:.0f})")
    put(pg, 2400, 60); s = climb_up(pg)
    t.check(abs(s["feet"] + 180) < 1 and s["g"] and s["ground"] == "LABFLOOR", f"pole: onto the window floor ({s['feet']:.0f}, {s['cx']:.0f})")
    put(pg, 1280, -1100); s = climb_up(pg)
    t.check(abs(s["feet"] + 1340) < 1 and s["g"], f"pole: research floor to the maintenance floor ({s['feet']:.0f})")
    # lattice: grab from the balcony, crawl sideways, the laser fence only hurts while on
    put(pg, 2630, -180); pg.keyboard.down("ArrowUp"); frames(pg, 20); pg.keyboard.up("ArrowUp")
    t.check(ev(pg, "game.spiderman.climbing && game.spiderman.climbing.type") == "LATTICE", "UP on the balcony grabs the lattice")
    x0 = ev(pg, S)["x"]; pg.keyboard.down("ArrowRight"); frames(pg, 15); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, S)["x"] > x0 + 30 and ev(pg, "!!game.spiderman.climbing"), "crawls sideways on the lattice")
    ev(pg, """(() => { window.HURT = {}; var lv = game.level, o = lv.updateObjects; lv.updateObjects = function() { var s = game.spiderman, h = s.health;
        o.apply(this, arguments); var l = lv.lasers.find(l => !l.vertical), st = lv.laserState(l).state; if (s.health < h) { HURT[st] = (HURT[st] || 0) + 1; s.health = 5; }
        s.invulnerableFrames = 0; if (!s.climbing) { s.climbing = lv.climbables.find(c => c.type === 'LATTICE'); } s.y = -470; s.velocityY = 0; }; })()""")
    frames(pg, 200)
    hurt = ev(pg, "HURT"); ev(pg, "delete game.level.updateObjects")
    t.check(list(hurt.keys()) == ["ON"], f"the laser fence across the lattice only hurts while on ({hurt})")
    put(pg, 2630, -180); ev(pg, "game.spiderman.invulnerableFrames = 99999"); s = climb_up(pg, 600)
    t.check(abs(s["feet"] + 700) < 1 and s["g"] and s["ground"] == "LEDGE", f"climbing past the lattice top hops onto balcony 2 ({s['feet']:.0f}, {s['ground']})")
    # falling off the lattice lands on balcony 1 (not the light well)
    put(pg, 2630, -180); pg.keyboard.down("ArrowUp"); frames(pg, 80); pg.keyboard.up("ArrowUp")
    pg.keyboard.press("Space"); frames(pg, 120)
    s = ev(pg, S)
    t.check(s["st"] == "PLAYING" and abs(s["feet"] + 180) < 1, f"jumping off the lattice lands back on balcony 1 ({s['feet']:.0f})")

    # ================= lifts (real keys on / off) =================
    put(pg, 2380, 540)
    gaps, s = ride(pg, "LIFT1", 300, 540, "ArrowRight")
    t.check(gaps == 0 and abs(s["feet"] - 300) < 1, f"lobby lift: stands on it the whole ride up to the maintenance floor (lost contact {gaps} frames)")
    put(pg, 3200, -700)
    gaps, s = ride(pg, "GONDOLA", -1100, -700, "ArrowRight")
    t.check(gaps == 0 and abs(s["feet"] + 1100) < 1, f"gondola: rides from the scaffold up to the crane walkway ({gaps})")
    pg.keyboard.down("ArrowLeft"); frames(pg, 140); pg.keyboard.up("ArrowLeft")
    s = ev(pg, S)
    t.check(abs(s["feet"] + 1100) < 1 and s["cx"] < 2920 and s["st"] == "PLAYING", f"from the gondola over the crane walkway to the sky terrace ({s['cx']:.0f})")
    put(pg, 2400, -1340)
    gaps, s = ride(pg, "LIFT2", -1580, -1340, "ArrowRight")
    t.check(gaps == 0 and abs(s["feet"] + 1580) < 1, f"upper lift: maintenance floor to the sky lobby ({gaps})")

    # ================= the executive elevator objective =================
    start(pg)
    el = roof("ELEV")
    y0 = ev(pg, f"{el}.y"); frames(pg, 120)
    t.check(ev(pg, f"{el}.y") == y0 == -1580 and not ev(pg, f"{el}.powered"), "without power the elevator stays at the sky lobby")
    ev(pg, "TXT.length = 0")
    put(pg, 1400, -1580); pg.keyboard.down("ArrowLeft"); frames(pg, 30); pg.keyboard.up("ArrowLeft")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("NO POWER - SWITCHES 0/2" in msgs, f"stepping near it: NO POWER - SWITCHES 0/2 ({msgs})")
    put(pg, 1560, -1100, "game.scene.enemies.filter(e => Math.abs(e.centerX() - 1750) < 80).forEach(e => game.removeEnemy(e));")
    pg.keyboard.down("ArrowLeft"); frames(pg, 40); pg.keyboard.up("ArrowLeft")
    t.check(ev(pg, "game.level.switchesOn('POWER')") == 1 and not ev(pg, f"{el}.powered"), "switch 1 (research floor): 1/2, still no power")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("POWER 1/2" in msgs, f"'POWER 1/2' ({msgs})")
    put(pg, 2300, -1340); pg.keyboard.down("ArrowRight"); frames(pg, 25); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, f"{el}.powered") == True, "switch 2 (maintenance floor): the elevator is powered")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("ELEVATOR POWERED" in msgs, f"'ELEVATOR POWERED' ({msgs})")
    put(pg, 1420, -1580)
    gaps, s = ride(pg, "ELEV", -2060, -1580, "ArrowLeft")
    t.check(gaps == 0 and abs(s["feet"] + 2060) < 1, f"the elevator carries him up to the roof ({gaps})")
    # camera on the 480 px elevator ride: never loses him, moves smoothly
    put(pg, 1420, -1580)
    ev(pg, f"""(() => {{ window.CAMR = []; var o = SpiderMan.prototype.update; window.ORIGU = o; SpiderMan.prototype.update = function() {{
        var r = o.apply(this, arguments); var hb = this.getHitbox(); CAMR.push([game.cameraY, hb.top - game.cameraY, hb.bottom - game.cameraY, {el}.y]); return r; }}; }})()""")
    ride(pg, "ELEV", -2060, -1580, "ArrowLeft")
    camr = ev(pg, "CAMR"); ev(pg, "(() => { SpiderMan.prototype.update = ORIGU; })()")
    moving = [c for c in camr if -2059 < c[3] < -1581]
    dv = [abs((c[0] - b_[0]) - (b_[0] - a[0])) for a, b_, c in zip(camr, camr[1:], camr[2:])]
    t.check(min(c[1] for c in moving) > 60 and max(c[2] for c in moving) < 540 - 60, "elevator ride: he stays well inside the view")
    t.check(max(dv) < 2.5, f"elevator ride: the camera accelerates smoothly (max speed change {max(dv):.2f} px/frame)")
    t.check(any(c[1] > 330 for c in moving), "while riding up the view looks ahead (he sits low in it)")

    # ================= collisions =================
    ev(pg, "game.level.goal.x = -9999")        # the flag stands right before the parapet: keep it out of these tests
    put(pg, 2500, -2060); pg.keyboard.down("ArrowRight"); frames(pg, 40); pg.keyboard.press("Space"); frames(pg, 70); pg.keyboard.up("ArrowRight")
    s = ev(pg, S)
    t.check(s["cx"] < 2580 and abs(s["feet"] + 2060) < 1, "the roof parapet on the right cannot be walked or jumped over")
    put(pg, 1400, -2060, f"{el}.y = -2060; {el}.motion.waitFrames = 9999;")
    pg.keyboard.down("ArrowLeft"); frames(pg, 40); pg.keyboard.press("Space"); frames(pg, 70); pg.keyboard.up("ArrowLeft")
    s = ev(pg, S)
    t.check(s["cx"] > 1220 and s["feet"] > -2100, f"the left parapet cannot be jumped over either ({s['cx']:.0f}, {s['feet']:.0f})")
    put(pg, 1400, -2060, f"{el}.y = -1580; {el}.motion.waitFrames = 9999;")
    pg.keyboard.down("ArrowLeft")
    for i in range(60):
        frames(pg, 1)
        if not ev(pg, "game.spiderman.onGround"): break
    pg.keyboard.up("ArrowLeft")
    for i in range(120):
        frames(pg, 1)
        s = ev(pg, S)
        if s["g"] and s["feet"] > -2000: break
    t.check(s["st"] == "PLAYING" and s["g"] and s["feet"] > -1600, f"stepping into the open elevator shaft drops him down inside the tower, not to his death (feet {s['feet']:.0f})")
    put(pg, 1700, 300); pg.keyboard.press("Space")
    top = 999
    for i in range(30):
        frames(pg, 1); top = min(top, ev(pg, "game.spiderman.y"))
    t.check(top >= 80 - 0.5, f"the floor above is a ceiling: his head never goes through a slab ({top:.1f})")
    put(pg, 2500, 540); pg.keyboard.down("ArrowRight"); frames(pg, 30); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, S)["cx"] < 2580, "the tower's outer wall holds (no way out into the light well from inside)")
    put(pg, 2700, -700); pg.keyboard.down("ArrowRight"); frames(pg, 120); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.state") == "GAMEOVER" and ev(pg, "game.gameoverReason") == "FELL", "running off balcony 2 (missing the swing): into the light well - YOU FELL INTO THE PIT")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')
    put(pg, 3250, -700, "var g = game.scene.roofs.find(r => r.tag === 'GONDOLA'); g.y = -1100; g.motion.waitFrames = 9999;")
    pg.keyboard.down("ArrowRight"); frames(pg, 150); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.state") == "GAMEOVER" and ev(pg, "game.gameoverReason") == "FELL", "falling into the open light well (gondola away): YOU FELL INTO THE PIT")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')

    # ================= checkpoints: retry everywhere + objective state =================
    start(pg)
    cps = ev(pg, "game.level.checkpoints.map(c => [c.x, c.y])")
    ok_all = []
    for (cx_, cy_) in cps:
        put(pg, cx_ - 40, cy_); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")
        active = ev(pg, f"game.levelCheckpoint && game.levelCheckpoint.x === {cx_} && game.levelCheckpoint.y === {cy_}")
        kill(pg)
        if not ev(pg, "game.state === 'GAMEOVER' && !!game.levelCheckpoint"):
            print("   checkpoint problem at", cx_, cy_, ev(pg, "[game.state, game.levelCheckpoint && [game.levelCheckpoint.x, game.levelCheckpoint.y]]"), ev(pg, S)); ok_all.append(False); continue
        pg.locator('.spiderman-game-gameover-menu .spiderman-game-checkpoint-button').click()
        frames(pg, 150)
        s = ev(pg, S)
        inview = ev(pg, "(() => { var hb = game.spiderman.getHitbox(); return hb.left - game.cameraX > 60 && hb.right - game.cameraX < game.viewWidth - 60 && hb.top - game.cameraY > 60 && hb.bottom - game.cameraY < game.viewHeight - 60; })()")
        ok = active and s["st"] == "PLAYING" and s["g"] and abs(s["cx"] - cx_) < 60 and abs(s["feet"] - cy_) < 1 and s["hp"] == 5 and inview
        ok_all.append(ok)
        if not ok: print("   retry problem at", cx_, cy_, active, inview, s)
    t.check(all(ok_all), f"die + RETRY FROM CHECKPOINT at all {len(cps)} checkpoints: on it, full hearts, unhurt for 2.5 s, camera on him")
    start(pg)
    put(pg, 2660, -1100); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")   # terrace checkpoint
    ev(pg, "game.level.switches.find(w => w.x === 1450).on = true")
    kill(pg); click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(ev(pg, "game.level.switchesOn('POWER')") == 0, "a switch flipped after the last checkpoint is undone on retry")
    ev(pg, "game.level.switches.forEach(w => { w.on = true; }); game.level.setPowered('POWER')")
    put(pg, 2260, -1580); pg.keyboard.down("ArrowRight"); frames(pg, 12); pg.keyboard.up("ArrowRight")    # sky lobby checkpoint
    ev(pg, "TXT.length = 0")
    kill(pg); click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(ev(pg, f"{el}.powered") and ev(pg, "game.level.switchesOn('POWER')") == 2, "power from before the checkpoint is kept: the elevator runs after a retry")
    t.check("ELEVATOR POWERED" not in ev(pg, "TXT.splice(0)"), "restored quietly")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    t.check(not ev(pg, f"{el}.powered") and ev(pg, "game.levelCheckpoint") is None, "RESTART STAGE resets the power")

    # ================= completion + unlocking =================
    put(pg, 2440, -2060, "game.scene.enemies.forEach(e => game.removeEnemy(e));"); pg.keyboard.down("ArrowRight"); frames(pg, 40); pg.keyboard.up("ArrowRight")
    pg.wait_for_timeout(200)
    t.check(ev(pg, "game.state") == "COMPLETE", "the roof flag clears the stage")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()

    # unlocking, without dev mode, through the real menus
    b, pg, errs = open_page(p)
    ev(pg, "['1-1','1-2','1-3','1-4','2-1'].forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))")
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]')
    st = tile_status(pg)
    t.check(st == ["2-1:CLEARED - 1", "2-2:PLAY", "2-3:LOCKED:L", "2-4:LOCKED:L"], f"before 2-2: {st}")
    click(pg, '[data-level="2-3"]')
    t.check(state(pg) == "MENU" and note(pg) == "Stage 2-3 is locked. Clear stage 2-2 first.", f"2-3 locked: {note(pg)}")
    click(pg, '[data-level="2-2"]')
    ev(pg, "(() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; })()")
    for i in range(20):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    t.check(ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-unlock-line').textContent") == "STAGE 2-3 UNLOCKED!", "clearing 2-2: STAGE 2-3 UNLOCKED!")
    click(pg, '.spiderman-game-complete-menu .spiderman-game-next-button')
    t.check(ev(pg, "game.level.id") == "2-3" and ev(pg, "game.backdrop.theme") == "TOWER", "NEXT STAGE starts 2-3")
    ev(pg, "(() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; game.scene.enemies.forEach(e => game.removeEnemy(e)); })()")
    for i in range(20):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    unlock = ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-unlock-line').textContent")
    t.check(unlock == "STAGE 2-4 UNLOCKED!" and ev(pg, "document.querySelector('.spiderman-game-next-button').style.display") == "", f"clearing 2-3 unlocks the boss: {unlock}, NEXT STAGE offered")
    t.check(ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-panel-title').textContent") == "STAGE CLEAR!", "2-3 is a normal stage clear (not a world clear)")
    click(pg, '.spiderman-game-complete-menu [data-action="level-select"]')
    st = tile_status(pg)
    t.check(st[2].startswith("2-3:CLEARED") and st[3] == "2-4:PLAY", f"level select: 2-3 cleared, GREEN GOBLIN boss tile open {st}")
    click(pg, '[data-level="2-4"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "2-4", "the boss fight starts")
    ev(pg, "game.showMainMenu()")
    t.check(ev(pg, "game.isWorldCleared(1)") is False and badge(pg) == f"7/{total(pg)}", f"world 2 not cleared yet, badge 7/total ({badge(pg)})")
    pg.reload(); pg.wait_for_timeout(500)
    t.check(badge(pg) == f"7/{total(pg)}" and ev(pg, "game.isLevelUnlocked('2-4')") and ev(pg, "game.isLevelCompleted('2-3')"), "saved after a refresh")
    print("errors:", errs); t.check(not errs, "no browser errors (unlocking)")
    b.close()
t.report()
