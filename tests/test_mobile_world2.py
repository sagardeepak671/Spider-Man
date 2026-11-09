# World 2 with real touch input on a landscape phone: every World 2 action done with the on-screen buttons
from harness import T, URL
from touch import *
from playwright.sync_api import sync_playwright
t = T("Mobile World 2: touch controls for conveyors, duct slide, doors, shaft ladder, lattice, boss, pause / retry, WORLD 2 CLEARED")

S = """(() => { var s = game.spiderman; return { x: s.x, cx: s.x + s.bodyWidth() / 2, feet: s.y + s.bodyHeight(), g: s.onGround, hp: s.health,
    climb: s.climbing ? s.climbing.type : null, st: game.state }; })()"""

def put(pg, x, surface, inv=True):
    ev(pg, f"""(() => {{ var s = game.spiderman; s.x = {x}; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityY = 0; s.velocityX = 0; s.momentumX = 0;
        s.health = 5; s.invulnerableFrames = {99999 if inv else 0}; s.releaseAllKeys(); }})()""")
    frames(pg, 3)

def tap_sel(pg, f, sel, wait=250):
    x, y, _, _ = center(pg, sel); f.tap(x, y); pg.wait_for_timeout(wait)

def start(pg, f, stage):
    """main menu -> CAMPAIGN -> WORLD 2 tab -> stage tile, all with taps"""
    ev(pg, "game.showMainMenu()")
    tap_sel(pg, f, '[data-action="campaign"]', 150)
    tap_sel(pg, f, '.spiderman-game-world-tab[data-world="1"]', 150)
    tap_sel(pg, f, f'[data-level="{stage}"]', 300)
    ev(pg, "game.introFrames = 0")

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(600); ev(pg, "localStorage.clear()"); pg.reload(); pg.wait_for_timeout(900)
    f = Fingers(ctx, pg)

    # ---------- unlock by touch: world 2 is locked until world 1 is cleared ----------
    tap_sel(pg, f, '[data-action="campaign"]', 150)
    tab = ev(pg, "document.querySelector('.spiderman-game-world-tab[data-world=\"1\"]').className")
    tap_sel(pg, f, '.spiderman-game-world-tab[data-world="1"]', 150)
    t.check("is-world-locked" in tab and ev(pg, "game.state === 'MENU' && game.openPanel === game.campaignPanel"), f"fresh save: the WORLD 2 tab is locked ({tab})")
    ev(pg, "game.setDevMode(true)")

    # ---------- 2-1: start by taps, run on a belt, pause / resume with the HUD button ----------
    start(pg, f, "2-1")
    t.check(ev(pg, "game.state") == "PLAYING" and ev(pg, "game.level.id") == "2-1" and buttons_shown(pg), "WORLD 2 tab -> 2-1 tile starts Industrial Zone, touch buttons shown")
    B = buttons(pg)
    belt = ev(pg, "(() => { var r = game.level.roofs.find(r => r.conveyor && r.conveyor.speed > 0 && r.width > 300); return r ? [r.x, r.y, r.width, r.conveyor.speed] : null; })()")
    put(pg, belt[0] + 40, belt[1])
    x0 = ev(pg, S)["x"]; frames(pg, 30); x1 = ev(pg, S)["x"]
    t.check(x1 - x0 > 20, f"standing on a forward belt carries him ({x1 - x0:.0f} px in 30 frames)")
    put(pg, belt[0] + 40, belt[1]); x0 = ev(pg, S)["x"]
    f.down(1, *B["right"][:2]); frames(pg, 30); f.up(1); x2 = ev(pg, S)["x"]
    t.check(x2 - x0 > (x1 - x0) + 60, f"holding > on the belt runs faster than the belt alone ({x2 - x0:.0f} px)")
    r = ev(pg, "(() => { var r = game.pauseButtonRect(), c = game.canvas.getBoundingClientRect(); return [c.left + (r.x + r.width / 2) * c.width / game.canvas.width, c.top + (r.y + r.height / 2) * c.height / game.canvas.height]; })()")
    f.tap(r[0], r[1]); pg.wait_for_timeout(200)
    t.check(ev(pg, "game.state") == "PAUSED" and not buttons_shown(pg), "HUD pause button tapped: paused, buttons hidden")
    tap_sel(pg, f, '.spiderman-game-pause-menu [data-action="resume"]', 200)
    t.check(ev(pg, "game.state") == "PLAYING" and buttons_shown(pg), "RESUME tapped: playing again")

    # ---------- 2-2: duct slide, lab door, shaft ladder ----------
    start(pg, f, "2-2"); B = buttons(pg)
    put(pg, 3560, 250, inv=False)
    # tap SLIDE about 60 px before the beam (the slide window is ~80 px: from ~90 px to ~10 px before it)
    f.down(1, *B["right"][:2])
    for i in range(60):
        frames(pg, 1)
        if ev(pg, "game.spiderman.x + game.spiderman.bodyWidth()") >= 3690: break
    f.tap(*B["slide"][:2], i=2); frames(pg, 40); f.up(1)
    s = ev(pg, S)
    t.check(s["hp"] == 5 and s["cx"] > 3830, f"> + SLIDE under the decontamination duct beam: unhurt ({s['hp']}, x {s['cx']:.0f})")
    put(pg, 8180, 540); f.tap(*B["up"][:2]); frames(pg, 45)
    s = ev(pg, S)
    t.check(abs(s["feet"] - 180) < 1, f"^ at the ROBOTICS LAB door goes upstairs ({s['feet']:.0f})")
    put(pg, 9100, 840); f.down(1, *B["left"][:2]); frames(pg, 6); f.up(1)
    f.down(1, *B["up"][:2])
    for i in range(160):
        frames(pg, 2); s = ev(pg, S)
        if s["g"] and not s["climb"] and s["feet"] < 545: break
    f.up(1)
    t.check(abs(ev(pg, S)["feet"] - 540) < 1, "holding ^ climbs the shaft ladder back up to the corridor")
    # death by touch play -> game over -> RESTART STAGE tapped
    ev(pg, "(() => { var s = game.spiderman; s.invulnerableFrames = 0; s.health = 1; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()"); pg.wait_for_timeout(250)
    t.check(ev(pg, "game.state") == "GAMEOVER" and not buttons_shown(pg), "losing the last heart in 2-2: game over, buttons hidden")
    tap_sel(pg, f, '.spiderman-game-gameover-menu .spiderman-game-retry-button', 250)
    t.check(ev(pg, "game.state") == "PLAYING" and ev(pg, "game.level.id") == "2-2" and buttons_shown(pg), "RESTART STAGE tapped: 2-2 again, buttons back")

    # ---------- 2-3: lattice ----------
    start(pg, f, "2-3"); B = buttons(pg)
    put(pg, 2630, -180); f.down(1, *B["up"][:2]); frames(pg, 20); f.up(1)
    t.check(ev(pg, S)["climb"] == "LATTICE", "^ on balcony 1 grabs the lattice")
    x0 = ev(pg, S)["x"]; f.down(1, *B["right"][:2]); frames(pg, 15); f.up(1)
    t.check(ev(pg, S)["x"] > x0 + 30 and ev(pg, S)["climb"] == "LATTICE", "> crawls sideways on the lattice")
    # the hook marker over balcony 2 (drawing only)
    ev(pg, "window.HM = 0; (() => { var lv = game.level, o = lv.drawHookMarker; lv.drawHookMarker = function() { HM++; return o.apply(this, arguments); }; })()")
    put(pg, 2700, -700); frames(pg, 60)
    t.check(ev(pg, "HM") > 5, f"standing on balcony 2: the off-screen hook above is marked under the HUD ({ev(pg, 'HM')} frames)")
    ev(pg, "delete game.level.drawHookMarker")

    # ---------- 2-4: the boss by touch, then WORLD 2 CLEARED ----------
    start(pg, f, "2-4"); B = buttons(pg)
    frames(pg, 100)
    ev(pg, "(() => { var g = game.level.boss; g.setState('HOVER'); g.spots = [{ x: 480, y: 470 }]; g.target = g.spots[0]; g.x = 480 - g.width() / 2; g.y = 470 - g.height() / 2; g.attackTimer = 9999; })()")
    put(pg, 200, 540); ev(pg, "game.spiderman.runningDirection = 1")
    h0 = ev(pg, "game.level.boss.health"); f.tap(*B["web"][:2]); frames(pg, 40)
    t.check(ev(pg, "game.level.boss.health") < h0, "WEB tapped facing the goblin: he loses health")
    f.tap(*B["jump"][:2]); frames(pg, 4)
    t.check(not ev(pg, "game.spiderman.onGround"), "JUMP works in the arena")
    frames(pg, 60)
    ev(pg, "game.level.boss.health = 1"); ev(pg, "game.spiderman.runningDirection = 1"); put(pg, 200, 540); ev(pg, "game.spiderman.runningDirection = 1")
    f.tap(*B["web"][:2])
    for i in range(80):
        pg.wait_for_timeout(100)
        if ev(pg, "game.state") == "COMPLETE": break
    t.check(ev(pg, "game.state") == "COMPLETE" and ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-panel-title').textContent") == "WORLD 2 CLEARED!", "the last web by touch: WORLD 2 CLEARED!")
    fit = ev(pg, """(() => { var m = document.querySelector('.spiderman-game-complete-menu').getBoundingClientRect();
        var btns = [...document.querySelectorAll('.spiderman-game-complete-menu .spiderman-game-menu-button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect());
        return { inside: m.top >= -1 && m.bottom <= innerHeight + 1, btns: btns.every(r => r.bottom <= innerHeight + 1 && r.height >= 24) }; })()""")
    t.check(fit["inside"] and fit["btns"], f"the WORLD 2 CLEARED panel fits the phone screen, buttons reachable {fit}")
    tap_sel(pg, f, '.spiderman-game-complete-menu [data-action="level-select"]', 250)
    t.check(ev(pg, "game.state === 'MENU' && game.openPanel === game.campaignPanel") and ev(pg, "game.isLevelCompleted('2-4')"), "LEVEL SELECT tapped: back on the map, the boss clear is saved")
    t.check(not errs, f"no errors {errs}")
    b.close()
t.report()
