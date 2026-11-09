from harness import *
t = T("Stage 2-4 Green Goblin: arena, damage, phase 2, bombs, swoop + stall, refills, death / retry, defeat + world completion, unlocking")

def frames(pg, n):
    f0 = ev(pg, "game.levelFrames")
    while ev(pg, "game.levelFrames") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

BOSS = "game.level.boss"
def boss(pg): return ev(pg, f"({{ hp: {BOSS}.health, max: {BOSS}.maxHealth, state: {BOSS}.state, phase: {BOSS}.phase, x: {BOSS}.centerX(), y: {BOSS}.centerY() }})")

def put(pg, x, surface, extra=""):
    ev(pg, f"""(() => {{ var s = game.spiderman; s.x = {x} - s.bodyWidth() / 2; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityY = 0; s.velocityX = 0; s.momentumX = 0;
        s.health = 5; s.invulnerableFrames = 0; s.releaseAllKeys(); {extra} }})()""")
    frames(pg, 2)

def start(pg):
    ev(pg, "game.setDevMode(true); game.showMainMenu()")
    click(pg, '[data-action="campaign"]'); click(pg, '.spiderman-game-world-tab[data-world="1"]'); click(pg, '[data-level="2-4"]')
    ev(pg, "game.introFrames = 0")

def hover(pg, x, y):
    """park the goblin at (x, y) in his HOVER state with no attack coming for a while"""
    ev(pg, f"(() => {{ var g = {BOSS}; g.setState('HOVER'); g.spots = [{{ x: {x}, y: {y} }}]; g.target = g.spots[0]; g.x = {x} - g.width() / 2; g.y = {y} - g.height() / 2; g.attackTimer = 9999; }})()")

def web_at_boss(pg):
    """real X key from where spiderman stands, facing the goblin; returns boss health lost"""
    ev(pg, f"game.spiderman.runningDirection = {BOSS}.centerX() > game.spiderman.centerX() ? 1 : -1")
    h0 = boss(pg)["hp"]; pg.keyboard.press("x"); frames(pg, 40)
    return h0 - boss(pg)["hp"]

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    ev(pg, "(() => { window.TXT = []; var o = game.addFloatingText.bind(game); game.addFloatingText = function(t) { TXT.push(t); return o.apply(null, arguments); }; })()")
    start(pg)

    # ================= arena =================
    a = ev(pg, """(() => { var lv = game.level, g = lv.boss;
        return { name: lv.name, theme: game.backdrop.theme, width: lv.width, view: game.viewWidth, camY: [lv.cameraMinY, lv.cameraMaxY], type: g.constructor.name,
                 bossName: g.bossName, hp: g.health, cps: lv.checkpoints.length, anchors: lv.anchors.length,
                 hearts: lv.pickups.filter(p => p.type === 'HEALTH').length, webs: lv.pickups.filter(p => p.type === 'WEB').length,
                 surfaces: lv.roofs.filter(r => r.style !== 'PANEL').map(r => [r.style, r.x, r.x + r.fullWidth, r.y]),
                 parapets: lv.roofs.filter(r => r.style === 'PANEL').map(r => [r.x, r.y, r.bottom()]), spots: g.spots, high: g.high }; })()""")
    print("   arena:", {k: a[k] for k in ("width", "view", "camY", "hp", "anchors", "hearts", "webs")})
    t.check(a["name"] == "GREEN GOBLIN" and a["theme"] == "TOWER" and a["type"] == "GoblinBoss" and a["bossName"] == "GREEN GOBLIN", "2-4 is the Green Goblin on the tower roof")
    t.check(a["hp"] == 40 and a["cps"] == 0, "40 health (20 web hits), no checkpoints (the fight restarts whole)")
    t.check(a["width"] <= a["view"] + 1 and a["camY"][0] == a["camY"][1], "the arena fits one screen: he, his bombs and his lanes are always in view")
    t.check(all(p[1] <= 540 - 299 for p in a["parapets"]) and len(a["parapets"]) == 2, "parapets at both ends too tall to jump (300 px)")
    t.check(a["anchors"] == 2 and a["hearts"] == 2 and a["webs"] == 2, "2 swing hooks, 2 hearts and 2 web canisters on the ledges")
    # every reachable glide spot lines up with a web fired from a surface; the throwing spots with none
    heights = sorted(set(r[3] for r in a["surfaces"]))
    gh = ev(pg, f"{BOSS}.height()")
    def reach(y): return [h for h in heights if y - gh / 2 + 8 < h - 30 < y + gh / 2 - 6]
    t.check(all(reach(sp["y"]) for sp in a["spots"]), f"every glide spot is at web height of a floor / ledge / catwalk {[(sp['y'], reach(sp['y'])) for sp in a['spots']]}")
    t.check(not any(reach(sp["y"]) for sp in a["high"]), "the throwing spots are out of reach")

    # ================= entrance, HUD, damage =================
    t.check(boss(pg)["state"] == "ENTER", "he flies in first")
    put(pg, 120, 540); hover(pg, 480, 480); ev(pg, f"{BOSS}.setState('ENTER'); {BOSS}.stateFrames = 5")
    t.check(web_at_boss(pg) == 0, "no damage while he makes his entrance")
    frames(pg, 1); hover(pg, 480, 480)
    t.check(web_at_boss(pg) == 2, "a web hit costs him 2 health")
    t.check("HIT" in ev(pg, "TXT.splice(0)"), "'HIT' shown")
    hud = ev(pg, """(() => { var c = game.ctx, s = []; var o = c.fillText; c.fillText = function(t) { s.push(String(t)); return o.apply(this, arguments); }; game.drawHud(); c.fillText = o; return s; })()""")
    t.check("GREEN GOBLIN" in hud and "38/40" in hud, f"the boss bar says GREEN GOBLIN 38/40 ({[h for h in hud if 'GOBLIN' in h or '/40' in h]})")
    # from a ledge and from the catwalk
    put(pg, 180, 400); hover(pg, 520, 360)
    t.check(web_at_boss(pg) == 2, "hit from a side ledge while he glides at ledge height")
    put(pg, 420, 280); hover(pg, 700, 230)
    t.check(web_at_boss(pg) == 2, "hit from the catwalk while he glides at catwalk height")
    put(pg, 120, 540); hover(pg, 480, 170)
    t.check(web_at_boss(pg) == 0, "out of reach while he throws from high up")

    # ================= phase 2: once, with one heart =================
    ev(pg, f"{BOSS}.health = 18; TXT.length = 0")
    hearts0 = ev(pg, "game.scene.pickups.filter(p => p.type === 'HEALTH').length")
    put(pg, 120, 540); hover(pg, 480, 480); web_at_boss(pg)
    g = boss(pg)
    t.check(g["phase"] == 2 and g["hp"] == 16, f"at 40 % health phase 2 starts ({g['hp']}/40)")
    msgs = ev(pg, "TXT.splice(0)")
    t.check("THE GOBLIN IS FURIOUS!" in msgs and ev(pg, "game.scene.pickups.filter(p => p.type === 'HEALTH').length") == hearts0 + 1, f"'THE GOBLIN IS FURIOUS!' and one heart drops ({msgs})")
    hover(pg, 480, 480); web_at_boss(pg); hover(pg, 480, 480); web_at_boss(pg)
    t.check(ev(pg, "game.scene.pickups.filter(p => p.type === 'HEALTH').length") == hearts0 + 1, "no more hearts on later hits (only one extra phase)")
    t.check(abs(ev(pg, f"{BOSS}.speed()") - 2.6 * 1.35) < 0.01 and ev(pg, f"{BOSS}.attackInterval()") == 85, "phase 2: faster gliding, attacks come more often")

    # ================= bombs =================
    start(pg)
    frames(pg, 100)
    def volley(phase):
        ev(pg, f"(() => {{ var g = {BOSS}; g.phase = {phase}; g.x = 480 - g.width() / 2; g.y = 165 - g.height() / 2; g.setState('BOMBS'); g.target = {{ x: 480, y: 165 }}; g.attackTimer = 9999; }})()")
        ev(pg, "window.THROWN = 0; (() => { var o = game.level.boss.throwBomb; game.level.boss.throwBomb = function() { THROWN++; return o.apply(this, arguments); }; })()")
        frames(pg, 130)
        n = ev(pg, "THROWN"); ev(pg, "delete game.level.boss.throwBomb")
        return n
    put(pg, 200, 540, "s.invulnerableFrames = 99999;")
    t.check(volley(1) == 2, "phase 1: two bombs a volley")
    frames(pg, 120)
    t.check(volley(2) == 3, "phase 2: three bombs a volley")
    frames(pg, 120)
    # a bomb thrown at spiderman under a ledge falls through the ledge and lands on the floor next to him
    put(pg, 180, 540, "s.invulnerableFrames = 99999;")
    ev(pg, "game.scene.projectiles.filter(p => p.name === 'PUMPKIN_BOMB').forEach(p => p.remove())")
    # frame exact: the frame it lands (lit) and the frame it is gone, recorded by the game loop itself
    ev(pg, """(() => { window.FUSEREC = { lit: null, gone: null }; var o = game.update; window.OUPD = o; game.update = function() {
        var b = game.scene.projectiles.find(p => p.name === 'PUMPKIN_BOMB');
        if (b && b.fuse >= 0 && FUSEREC.lit === null) FUSEREC.lit = game.levelFrames;
        if (!b && FUSEREC.lit !== null && FUSEREC.gone === null) FUSEREC.gone = game.levelFrames;
        return o.apply(this, arguments); }; })()""")
    ev(pg, f"{BOSS}.phase = 1; {BOSS}.attackTimer = 9999; {BOSS}.x = 480; {BOSS}.y = 120; {BOSS}.throwBomb(180, 530)")
    for i in range(120):
        frames(pg, 1)
        lit = ev(pg, "game.scene.projectiles.filter(p => p.name === 'PUMPKIN_BOMB' && p.fuse >= 0).map(p => [Math.round(p.x), Math.round(p.y + p.radius)])")
        if lit: break
    t.check(lit and lit[0][1] == 540, f"a bomb aimed at him under a ledge passes the ledge and lands on the roof floor {lit}")
    frames(pg, 60)
    rec = ev(pg, "FUSEREC"); ev(pg, "(() => { game.update = OUPD; })()")
    fuse = (rec["gone"] - rec["lit"]) if rec["gone"] is not None and rec["lit"] is not None else -1
    t.check(40 <= fuse <= 50, f"the lit bomb burns its fuse for ~45 frames before exploding ({fuse})")
    # the blast: inside the ring hurts, outside does not
    def blast(dx):
        put(pg, 480 + dx, 540)
        ev(pg, "game.scene.projectiles.filter(p => p.name === 'PUMPKIN_BOMB').forEach(p => p.remove())")
        ev(pg, f"(() => {{ {BOSS}.throwBomb(480, 530); var b = game.scene.projectiles[game.scene.projectiles.length - 1]; b.x = 480; b.y = 540 - b.radius; b.velocityX = 0; b.velocityY = 0; b.fuse = 3; }})()")
        hp0 = ev(pg, "game.spiderman.health"); frames(pg, 12)
        return hp0 - ev(pg, "game.spiderman.health")
    t.check(blast(40) == 1, "standing inside the ring when it explodes: one heart")
    t.check(blast(140) == 0, "standing outside the ring: safe")
    # walking into a lit bomb sets it off: one heart, not two
    put(pg, 380, 540)
    ev(pg, f"(() => {{ {BOSS}.throwBomb(480, 530); var b = game.scene.projectiles[game.scene.projectiles.length - 1]; b.x = 470; b.y = 540 - b.radius; b.velocityX = 0; b.velocityY = 0; b.fuse = 45; }})()")
    hp0 = ev(pg, "game.spiderman.health"); pg.keyboard.down("ArrowRight"); frames(pg, 30); pg.keyboard.up("ArrowRight")
    t.check(hp0 - ev(pg, "game.spiderman.health") == 1 and not ev(pg, "game.scene.projectiles.some(p => p.name === 'PUMPKIN_BOMB')"), "walking into a lit bomb: it goes off, exactly one heart")

    # ================= swoop =================
    start(pg); frames(pg, 100)
    def swoop(x, surface, phase=1):
        put(pg, x, surface, "s.invulnerableFrames = 0;")
        ev(pg, f"(() => {{ var g = {BOSS}; g.phase = {phase}; g.setState('SWOOP'); g.attackTimer = 9999; }})()")
        frames(pg, 2)
        return ev(pg, f"{BOSS}.swoop")
    sw = swoop(300, 540)
    t.check(sw and abs(sw["laneY"] - (540 - 42)) < 1 and sw["dir"] == -1, f"the swoop lane is at his height (floor), he comes from the far side {sw}")
    sw2 = swoop(780, 400)
    t.check(abs(sw2["laneY"] - (400 - 42)) < 1 and sw2["dir"] == 1, "standing on a ledge: the lane is at ledge height")
    # the wind-up is long enough to react, and the lane is drawn meanwhile
    sw = swoop(300, 540)
    ev(pg, "window.LANE = 0; (() => { var P = SpidermanGame.__pixelArt, o = P.rect; P.rect = function(ctx, color) { if (color === '#ff3030') LANE++; return o.apply(this, arguments); }; window.ORECT = o; })()")
    # frame exact: frames from the start of the swoop until he first rushes (moves > 6 px in a frame)
    ev(pg, f"""(() => {{ window.WIND = {{ start: game.levelFrames, rush: null }}; var g = {BOSS}, o = g.update; window.OBU = o; g.update = function() {{
        var r = o.apply(this, arguments); if (WIND.rush === null && this.state === 'SWOOP' && this.swoop && this.swoop.rushing) {{ WIND.rush = this.stateFrames; WIND.x = this.centerX(); WIND.startX = this.swoop.startX; }} return r; }}; }})()""")
    frames(pg, 100)
    w = ev(pg, "WIND"); wind = w["rush"] if w["rush"] else -1
    lane = ev(pg, "LANE"); ev(pg, "(() => { SpidermanGame.__pixelArt.rect = ORECT; })()")
    t.check(wind >= 50 and lane > 100, f"~0.9 s wind-up with the blinking lane drawn ({wind} frames, {lane} lane pieces)")
    t.check(w["rush"] is not None and abs(w["x"] - w["startX"]) < 12, f"the rush starts from the far side of the roof ({w.get('x')} vs {w.get('startX')})")
    # standing in the lane: he hits
    for i in range(120):
        frames(pg, 1)
        if ev(pg, f"{BOSS}.state") != "SWOOP": break
    t.check(ev(pg, "game.spiderman.health") == 4, "standing still in his lane: the swoop costs a heart")
    # jumping over him with the real key at the right moment: no damage
    # (frame exact, in the page: a keydown event for SPACE the first frame he is 0-150 px away, keyup 6 frames later)
    sw = swoop(500, 540)
    ev(pg, f"""(() => {{ var g = {BOSS}, o = g.update; window.JMP = null;
        function key(down) {{ var e = new KeyboardEvent(down ? 'keydown' : 'keyup'); Object.defineProperty(e, 'keyCode', {{ get: () => 32 }}); document.dispatchEvent(e); }}
        g.update = function() {{ var r = o.apply(this, arguments); var bb = this.getHitbox(), hb = game.spiderman.getHitbox(), gap = hb.left - bb.right;
            if (JMP === null && this.state === 'SWOOP' && this.swoop && this.swoop.rushing && gap > 0 && gap < 150) {{ JMP = {{ gap: gap, f: game.levelFrames }}; key(true); }}
            else if (JMP && !JMP.up && game.levelFrames >= JMP.f + 6) {{ JMP.up = true; key(false); }}
            return r; }}; }})()""")
    frames(pg, 150)
    print("   jump:", ev(pg, "JMP")); ev(pg, f"delete {BOSS}.update")
    t.check(ev(pg, "game.spiderman.health") == 5, "jumping over him as he comes: no damage")
    # the stall: at the far side, in the lane, for ~75 frames - a web hits him
    for i in range(100):
        frames(pg, 1)
        if ev(pg, f"{BOSS}.state") == "STALL": break
    g = boss(pg)
    t.check(g["state"] == "STALL" and g["x"] > 700 and abs(g["y"] - (540 - 42)) < 25, f"after the swoop his glider stalls at the far side, in the lane {g}")
    put(pg, 480, 540)
    t.check(web_at_boss(pg) == 2, "a web hits him while he stalls")
    n = 0
    while ev(pg, f"{BOSS}.state") == "STALL" and n < 200:
        frames(pg, 1); n += 1
    t.check(ev(pg, f"{BOSS}.state") == "HOVER", f"then he takes off again ({n} more frames)")

    # ================= web refills =================
    start(pg); frames(pg, 100)
    ev(pg, f"{BOSS}.attackTimer = 99999")
    ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB').forEach(p => p.remove())")
    put(pg, 480, 540); ev(pg, "game.spiderman.web = 0")
    frames(pg, 60)
    cans = ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB').map(p => Math.round(p.x))")
    t.check(len(cans) == 1 and abs(cans[0] - 480) < 160, f"an empty web tank: a canister lands near him within a second {cans}")
    frames(pg, 200)
    t.check(len(ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB')")) == 1, "only one at a time (none while one is lying around)")
    pg.keyboard.down("ArrowLeft" if cans[0] < 480 else "ArrowRight"); frames(pg, 40); pg.keyboard.up("ArrowLeft"); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.spiderman.web") >= 15, "walking over it refills the web")
    ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB').forEach(p => p.remove()); game.spiderman.web = 10")
    frames(pg, 170)
    t.check(len(ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB')")) == 1, "running low (10 webs): a canister comes after ~2.5 s")

    # ================= pause =================
    start(pg); frames(pg, 120)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    a1 = boss(pg); pg.wait_for_timeout(700); a2 = boss(pg)
    t.check(ev(pg, "game.state") == "PAUSED" and a1 == a2, "pause freezes the goblin")
    pg.keyboard.press("Escape")

    # ================= death and retry =================
    start(pg); frames(pg, 100)
    hover(pg, 480, 480); put(pg, 120, 540); web_at_boss(pg); web_at_boss(pg)
    ev(pg, f"{BOSS}.health = 14; {BOSS}.phase = 2")
    ev(pg, f"{BOSS}.throwBomb(300, 530)")
    ev(pg, "game.scene.pickups.filter(p => p.type === 'HEALTH').forEach(p => p.remove())")
    ev(pg, "(() => { var s = game.spiderman; s.health = 1; s.invulnerableFrames = 0; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()"); frames(pg, 3)
    t.check(ev(pg, "game.state") == "GAMEOVER", "losing the last heart during the fight: game over")
    t.check(ev(pg, "getComputedStyle(document.querySelector('.spiderman-game-checkpoint-button')).display") == "none", "no checkpoint retry in the boss fight")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')
    fresh = ev(pg, f"""({{ st: game.state, hp: {BOSS}.health, bstate: {BOSS}.state, phase: {BOSS}.phase, me: game.spiderman.health, web: game.spiderman.web,
        bombs: game.scene.projectiles.filter(p => p.name === 'PUMPKIN_BOMB').length, hearts: game.scene.pickups.filter(p => p.type === 'HEALTH').length,
        cans: game.scene.pickups.filter(p => p.type === 'WEB').length, time: game.levelFrames, score: game.score, defeated: game.level.bossDefeated }})""")
    t.check(fresh == {"st": "PLAYING", "hp": 40, "bstate": "ENTER", "phase": 1, "me": 5, "web": 50, "bombs": 0, "hearts": 2, "cans": 2, "time": fresh["time"], "score": 0, "defeated": False} and fresh["time"] < 40,
            f"RESTART STAGE resets the whole fight {fresh}")
    # restart from the pause menu too
    frames(pg, 100); hover(pg, 480, 480); put(pg, 120, 540); web_at_boss(pg)
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    t.check(boss(pg)["hp"] == 40 and boss(pg)["state"] == "ENTER", "RESTART STAGE from the pause menu: a fresh goblin")

    # ================= defeat + world 2 cleared =================
    b.close()
    b, pg, errs2 = open_page(p)
    ev(pg, "['1-1','1-2','1-3','1-4','2-1','2-2'].forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))")
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]')
    st = tile_status(pg)
    t.check(st[3] == "2-4:LOCKED:L", f"before 2-3 is cleared the boss is locked {st}")
    click(pg, '[data-level="2-3"]')
    ev(pg, "(() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; game.scene.enemies.forEach(e => game.removeEnemy(e)); })()")
    for i in range(20):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    unlock = ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-unlock-line').textContent")
    nxt = ev(pg, "document.querySelector('.spiderman-game-next-button').style.display")
    t.check(unlock == "STAGE 2-4 UNLOCKED!" and nxt == "", f"clearing 2-3: {unlock}, NEXT STAGE offered")
    click(pg, '.spiderman-game-complete-menu .spiderman-game-next-button')
    t.check(ev(pg, "game.level.id") == "2-4" and ev(pg, f"{BOSS}.bossName") == "GREEN GOBLIN", "NEXT STAGE starts the boss fight")
    ev(pg, "game.introFrames = 0"); frames(pg, 100)
    ev(pg, f"{BOSS}.throwBomb(600, 530)")
    hover(pg, 480, 480); put(pg, 120, 540); ev(pg, f"{BOSS}.health = 2")
    web_at_boss(pg)
    t.check(boss(pg)["state"] == "DEFEATED" and not ev(pg, "game.scene.projectiles.some(p => p.name === 'PUMPKIN_BOMB')"), "the last web: he is defeated, his bombs fizzle out")
    t.check(ev(pg, "game.kills") >= 1 and ev(pg, "game.score") >= 400, "+400 points")
    for i in range(60):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    res = ev(pg, "[...document.querySelectorAll('.spiderman-game-complete-menu .spiderman-game-panel-title, .spiderman-game-complete-menu .spiderman-game-stage-line, .spiderman-game-complete-menu .spiderman-game-unlock-line')].map(e => e.textContent)")
    t.check(res[0] == "WORLD 2 CLEARED!" and res[1] == "BOSS DEFEATED - GREEN GOBLIN", f"results: {res[:2]}")
    nb = ev(pg, "(b => b.style.display + '|' + b.textContent)(document.querySelector('.spiderman-game-next-button'))")
    t.check(res[2] == "WORLD 3 - HARBOUR UNLOCKED!" and nb == "|NEXT WORLD", f"{res[2]}, next button {nb}")
    t.check(ev(pg, "game.isLevelCompleted('2-4') && game.isWorldCleared(1)"), "the clear is saved: world 2 cleared")
    click(pg, '.spiderman-game-complete-menu [data-action="level-select"]')
    st = tile_status(pg)
    tabs = ev(pg, "[...document.querySelectorAll('.spiderman-game-world-tab')].map(t => t.className)")
    t.check(st[3].startswith("2-4:CLEARED") and "is-world-cleared" in tabs[1], f"level select: boss cleared, world 2 tab checked {st[3]}")
    t.check(note(pg) == "World 2 cleared! WORLD 3 - HARBOUR is open." and badge(pg) == f"8/{total(pg)}", f"'{note(pg)}', badge {badge(pg)}")
    pg.reload(); pg.wait_for_timeout(500)
    t.check(badge(pg) == f"8/{total(pg)}" and ev(pg, "game.isWorldCleared(1) && game.isWorldCleared(0) && game.isLevelUnlocked('3-1', true)"), "after a refresh: 8 cleared, both worlds cleared, 3-1 open")
    # replaying the cleared boss: fresh fight, still WORLD 2 CLEARED at the end (the level select now opens on world 3)
    click(pg, '[data-action="campaign"]'); click(pg, '.spiderman-game-world-tab[data-world="1"]'); click(pg, '[data-level="2-4"]')
    t.check(boss(pg)["hp"] == 40 and boss(pg)["state"] == "ENTER", "replaying the boss: a fresh fight")
    print("errors:", errs + errs2); t.check(not errs and not errs2, "no browser errors")
    b.close()
t.report()
