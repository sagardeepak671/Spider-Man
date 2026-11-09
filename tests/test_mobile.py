from harness import T, URL
from playwright.sync_api import sync_playwright
t = T("Mobile: layout (portrait / landscape), touch buttons, multi-touch, pause, menus, rotation, fullscreen, music, desktop unchanged")

def ev(pg, js): return pg.evaluate(js)

class Fingers:
    """real touch events through the DevTools protocol (several fingers at once)"""
    def __init__(self, ctx, pg):
        self.cdp = ctx.new_cdp_session(pg); self.pts = {}
    def _send(self, kind):
        self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y, "id": i} for i, (x, y) in self.pts.items()]})
    def down(self, i, x, y):
        self.pts[i] = (x, y); self._send("touchStart")
    def move(self, i, x, y):
        self.pts[i] = (x, y); self._send("touchMove")
    def up(self, i):
        del self.pts[i]
        # DevTools touch emulation cannot lift one finger out of several reliably (it ends the wrong one), so all
        # are lifted and the others put back down right away (real phones report each finger on its own)
        self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        if self.pts: self._send("touchStart")
    def tap(self, x, y, i=9):
        self.down(i, x, y); self.up(i)

def center(pg, sel):
    r = ev(pg, f"(() => {{ var r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height]; }})()")
    return r

def frames(pg, n):
    f0 = ev(pg, "game.frame")
    while ev(pg, "game.frame") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

def layout(pg):
    return ev(pg, """(() => { var c = document.querySelector('canvas').getBoundingClientRect(), s = game.viewScale;
        var btns = [...document.querySelectorAll('.spiderman-touch-btn')].filter(b => b.getClientRects().length).map(b => { var r = b.getBoundingClientRect(); return { name: b.getAttribute('data-name'), l: r.left, t: r.top, r: r.right, b: r.bottom }; });
        return { vw: innerWidth, vh: innerHeight, c: { l: c.left, t: c.top, r: c.right, b: c.bottom }, hudBottom: c.top + 66 * s, btns: btns,
                 shown: getComputedStyle(document.querySelector('.spiderman-touch')).display !== 'none', portrait: document.querySelector('.spiderman-touch').classList.contains('is-portrait') }; })()""")

def start_stage(pg, fingers, stage="1-1"):
    ev(pg, "game.setDevMode(true); game.showMainMenu()")
    x, y, _, _ = center(pg, '[data-action="campaign"]'); fingers.tap(x, y); pg.wait_for_timeout(150)
    if stage.startswith("2"):
        x, y, _, _ = center(pg, '.spiderman-game-world-tab[data-world="1"]'); fingers.tap(x, y); pg.wait_for_timeout(150)
    x, y, _, _ = center(pg, f'[data-level="{stage}"]'); fingers.tap(x, y); pg.wait_for_timeout(300)
    ev(pg, "game.introFrames = 0; game.spiderman.invulnerableFrames = 99999")

def put(pg, x, surface):
    ev(pg, f"(() => {{ var s = game.spiderman; s.x = {x}; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityY = 0; s.invulnerableFrames = 99999; s.releaseAllKeys(); }})()")
    frames(pg, 3)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=user-gesture-required"])

    # ================= layout on four phone setups =================
    for dev in ["iPhone 12", "iPhone 12 landscape", "Pixel 7", "Pixel 7 landscape"]:
        ctx = b.new_context(**p.devices[dev]); pg = ctx.new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(900)
        fingers = Fingers(ctx, pg)
        L = layout(pg)
        t.check(ev(pg, "game.touchMode") and not L["shown"], f"{dev}: touch mode on, no buttons on the main menu")
        t.check(L["c"]["l"] >= -0.5 and L["c"]["t"] >= -0.5 and L["c"]["r"] <= L["vw"] + 0.5 and L["c"]["b"] <= L["vh"] + 0.5, f"{dev}: the game fits the screen {L['c']}")
        start_stage(pg, fingers)
        L = layout(pg)
        t.check(ev(pg, "game.state") == "PLAYING" and L["shown"], f"{dev}: tapping CAMPAIGN -> 1-1 starts the stage, buttons shown")
        small = [x["name"] for x in L["btns"] if min(x["r"] - x["l"], x["b"] - x["t"]) < 44]
        t.check(small == [], f"{dev}: every button at least 44 px (comfortable for a thumb) {small}")
        onscreen = all(x["l"] >= 0 and x["r"] <= L["vw"] and x["t"] >= 0 and x["b"] <= L["vh"] for x in L["btns"])
        t.check(onscreen, f"{dev}: every button is on the screen")
        t.check(all(x["t"] > L["hudBottom"] for x in L["btns"]), f"{dev}: no button reaches the HUD")
        cw, ch = L["c"]["r"] - L["c"]["l"], L["c"]["b"] - L["c"]["t"]
        overlap = sum(max(0, min(x["r"], L["c"]["r"]) - max(x["l"], L["c"]["l"])) * max(0, min(x["b"], L["c"]["b"]) - max(x["t"], L["c"]["t"])) for x in L["btns"])
        if "landscape" in dev:
            t.check(overlap / (cw * ch) < 0.06, f"{dev}: buttons cover only {100 * overlap / (cw * ch):.1f} % of the game (corners)")
            t.check(ch >= L["vh"] * 0.9, f"{dev}: the game uses the screen height ({ch:.0f} of {L['vh']})")
        else:
            t.check(L["portrait"] and overlap == 0, f"{dev}: portrait - the buttons sit under the game, covering nothing ({overlap:.0f} px2)")
            t.check(abs(cw - L["vw"]) < 2, f"{dev}: portrait - the game uses the full width")
        # pause with the HUD button, resume with the menu
        r = ev(pg, "(() => { var r = game.pauseButtonRect(), c = game.canvas.getBoundingClientRect(); return [c.left + (r.x + r.width / 2) * c.width / game.canvas.width, c.top + (r.y + r.height / 2) * c.height / game.canvas.height]; })()")
        fingers.tap(r[0], r[1]); pg.wait_for_timeout(150)
        t.check(ev(pg, "game.state") == "PAUSED" and not layout(pg)["shown"], f"{dev}: tapping the HUD pause button pauses, buttons hidden")
        x, y, _, _ = center(pg, '.spiderman-game-pause-menu [data-action="resume"]'); fingers.tap(x, y); pg.wait_for_timeout(150)
        t.check(ev(pg, "game.state") == "PLAYING" and layout(pg)["shown"], f"{dev}: tapping RESUME resumes, buttons back")
        t.check(not errs, f"{dev}: no errors {errs}")
        ctx.close()

    # ================= input (landscape phone) =================
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900)
    f = Fingers(ctx, pg)
    start_stage(pg, f)
    B = {n: center(pg, f'.spiderman-touch-btn[data-name="{n}"]') for n in ["up", "left", "right", "down", "jump", "web", "slide"]}
    put(pg, 300, 540)
    x0 = ev(pg, "game.spiderman.x"); f.down(1, *B["right"][:2]); frames(pg, 30)
    x1 = ev(pg, "game.spiderman.x"); f.up(1); frames(pg, 10); x2 = ev(pg, "game.spiderman.x"); frames(pg, 10)
    t.check(x1 - x0 > 100 and abs(ev(pg, "game.spiderman.x") - x2) < 0.5, f"hold > : runs right ({x1 - x0:.0f} px), let go: stops")
    t.check(ev(pg, "game.spiderman.keydowns.length") == 0, "no key stuck after letting go")
    # two fingers: hold right, tap jump
    put(pg, 300, 540)
    f.down(1, *B["right"][:2]); frames(pg, 5); f.down(2, *B["jump"][:2]); frames(pg, 4)
    air = ev(pg, "!game.spiderman.onGround && game.spiderman.velocityY < 0"); f.up(2); frames(pg, 10)
    t.check(air and ev(pg, "game.spiderman.velocityX") > 0, "two fingers: holding > and tapping JUMP jumps forward")
    f.up(1); frames(pg, 40)
    t.check(ev(pg, "game.spiderman.keydowns.length") == 0 and ev(pg, "game.spiderman.onGround"), "both fingers up: nothing held, he lands")
    # sliding a finger from > to < turns him around
    put(pg, 600, 540)
    f.down(1, *B["right"][:2]); frames(pg, 10); a = ev(pg, "game.spiderman.x")
    f.move(1, *B["left"][:2]); frames(pg, 15); bb = ev(pg, "game.spiderman.x"); f.up(1)
    t.check(bb < a - 30 and ev(pg, "game.spiderman.runningDirection") == -1, f"sliding the finger from > to < runs left ({a:.0f} -> {bb:.0f})")
    # web
    put(pg, 300, 540); w0 = ev(pg, "game.spiderman.web")
    f.tap(*B["web"][:2]); frames(pg, 4)
    t.check(ev(pg, "game.spiderman.web") == w0 - 1 and ev(pg, "game.scene.projectiles.some(p => p.name === 'WEB')"), "WEB shoots a web (costs 1 fluid)")
    # slide
    put(pg, 300, 540); frames(pg, 15); f.down(1, *B["right"][:2]); frames(pg, 3); f.tap(*B["slide"][:2], i=2); frames(pg, 3)
    t.check(ev(pg, "game.spiderman.hasState('SLIDE')"), "SLIDE dashes")
    f.up(1); frames(pg, 30)
    # down on the d-pad and SLIDE share a key: letting one go keeps the other held
    put(pg, 300, 540); frames(pg, 15)
    f.down(1, *B["down"][:2]); f.down(2, *B["slide"][:2]); f.up(2); frames(pg, 2)
    t.check(ev(pg, "game.spiderman.keyIsDown(40)"), "v and SLIDE both held, SLIDE let go: down is still held")
    f.up(1); frames(pg, 2)
    t.check(not ev(pg, "game.spiderman.keyIsDown(40)"), "... and released with the last finger")
    # up at a ladder climbs
    put(pg, 2460, 540)
    f.down(1, *B["up"][:2]); frames(pg, 20)
    t.check(ev(pg, "!!game.spiderman.climbing"), "^ at the deli ladder climbs")
    frames(pg, 60); f.up(1); frames(pg, 20)
    t.check(abs(ev(pg, "game.spiderman.y + game.spiderman.bodyHeight()") - 390) < 1, "holding ^ climbs up onto the roof")
    # swing: jump off the edge with JUMP, JUMP near the hook attaches, JUMP again lets go
    put(pg, 2870, 540)
    f.down(1, *B["right"][:2])
    for i in range(60):
        frames(pg, 1)
        if ev(pg, "game.spiderman.x + game.spiderman.bodyWidth() > 2992"): break
    f.tap(*B["jump"][:2], i=2)
    for i in range(40):
        frames(pg, 1)
        if ev(pg, "!!game.level.findAnchor(game.spiderman)"): break
    f.tap(*B["jump"][:2], i=2); frames(pg, 4)
    t.check(ev(pg, "!!game.spiderman.swinging"), "JUMP in the air near the hook: web swing")
    frames(pg, 14); f.tap(*B["jump"][:2], i=2); frames(pg, 3)
    t.check(not ev(pg, "!!game.spiderman.swinging"), "JUMP again lets go")
    f.up(1); frames(pg, 60)
    t.check(ev(pg, "game.state") == "PLAYING" and ev(pg, "game.spiderman.x") > 3200, "... and he lands across the gap")
    # a finger held through a pause does not stay stuck
    put(pg, 300, 540); f.down(1, *B["right"][:2]); frames(pg, 5)
    ev(pg, "game.pause()"); pg.wait_for_timeout(100); f.up(1); ev(pg, "game.unpause()"); frames(pg, 20)
    t.check(ev(pg, "game.spiderman.keydowns.length") == 0, "a finger held while pausing leaves no stuck key")
    # menus with taps: game over -> retry
    ev(pg, "(() => { var s = game.spiderman; s.invulnerableFrames = 0; s.health = 1; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()"); pg.wait_for_timeout(200)
    t.check(ev(pg, "game.state") == "GAMEOVER" and not layout(pg)["shown"], "game over: buttons hidden")
    x, y, _, _ = center(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button'); f.tap(x, y); pg.wait_for_timeout(200)
    t.check(ev(pg, "game.state") == "PLAYING" and layout(pg)["shown"], "tapping RESTART STAGE works, buttons back")
    # the controls panel on a phone
    ev(pg, "game.showMainMenu()"); x, y, _, _ = center(pg, '[data-action="controls"]'); f.tap(x, y); pg.wait_for_timeout(200)
    cp = ev(pg, """(() => { var p = document.querySelector('.spiderman-game-controls-panel'), r = p.getBoundingClientRect(), c = game.canvas.getBoundingClientRect();
        return { inside: r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1, scroll: p.scrollHeight - p.clientHeight,
                 touch: getComputedStyle(p.querySelector('.spiderman-game-touch-help')).display !== 'none' }; })()""")
    t.check(cp["inside"] and cp["scroll"] <= 0 and cp["touch"], f"CONTROLS on a phone: fits the game screen, shows the touch buttons {cp}")
    t.check(not errs, f"input: no errors {errs}")
    ctx.close()

    # ================= rotation =================
    ctx = b.new_context(**p.devices["iPhone 12"]); pg = ctx.new_page()
    pg.goto(URL); pg.wait_for_timeout(900); f = Fingers(ctx, pg)
    start_stage(pg, f)
    P = layout(pg)
    pg.set_viewport_size({"width": 844, "height": 390}); pg.wait_for_timeout(400)
    Lr = layout(pg)
    t.check(P["portrait"] and not Lr["portrait"] and Lr["shown"], "rotating to landscape switches the layout, buttons stay")
    t.check(Lr["c"]["b"] - Lr["c"]["t"] > (P["c"]["b"] - P["c"]["t"]) * 1.4, f"... and the game gets bigger ({P['c']['b'] - P['c']['t']:.0f} -> {Lr['c']['b'] - Lr['c']['t']:.0f} px tall)")
    t.check(ev(pg, "getComputedStyle(document.querySelector('.spiderman-touch-rotate')).display") == "none", "... the rotate hint goes away")
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(400)
    t.check(layout(pg)["portrait"] and ev(pg, "getComputedStyle(document.querySelector('.spiderman-touch-rotate')).display") != "none", "rotating back: portrait layout + hint again")
    ctx.close()

    # ================= fullscreen =================
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); f = Fingers(ctx, pg)
    x, y, _, _ = center(pg, '.spiderman-game-main-menu-home [data-action="toggle-fullscreen"]'); f.tap(x, y); pg.wait_for_timeout(500)
    fs = ev(pg, "!!document.fullscreenElement")
    t.check(fs and ev(pg, "document.querySelector('[data-action=\"toggle-fullscreen\"]').textContent") == "WINDOWED", f"tapping FULLSCREEN on a phone enters full screen ({fs})")
    L = layout(pg)
    t.check(L["c"]["r"] <= L["vw"] + 0.5 and L["c"]["b"] <= L["vh"] + 0.5, "the game is fitted again in full screen")
    x, y, _, _ = center(pg, '.spiderman-game-main-menu-home [data-action="toggle-fullscreen"]'); f.tap(x, y); pg.wait_for_timeout(500)
    t.check(not ev(pg, "!!document.fullscreenElement"), "tapping WINDOWED leaves it")
    t.check(not errs, f"fullscreen: no errors (orientation lock refused quietly) {errs}")
    ctx.close()
    ctx = b.new_context(**p.devices["iPhone 12"]); pg = ctx.new_page()
    pg.add_init_script("Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false }); Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => false }); Element.prototype.requestFullscreen = undefined; Element.prototype.webkitRequestFullscreen = undefined;")
    pg.goto(URL); pg.wait_for_timeout(900)
    t.check(ev(pg, "[...document.querySelectorAll('[data-action=\"toggle-fullscreen\"]')].every(b => b.style.display === 'none')"), "a browser without full screen (iPhone Safari): the FULLSCREEN buttons are hidden")
    t.check(ev(pg, "game.toggleFullscreen()") is False, "... and F / toggleFullscreen does nothing, no error")
    ctx.close()

    # ================= music =================
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    pg.goto(URL); pg.wait_for_timeout(1200); f = Fingers(ctx, pg)
    playing = lambda: ev(pg, "SpidermanGame.__audioLoop.some(n => !SpidermanGame.__audio[n].paused)")
    t.check(not playing() and ev(pg, "getComputedStyle(document.querySelector('.spiderman-game-music-hint')).display") != "none", "autoplay blocked by the browser: no music yet, 'TAP ANYWHERE TO START THE MUSIC' shown")
    t.check(ev(pg, "document.querySelector('.spiderman-game-music-hint').textContent") == "TAP ANYWHERE TO START THE MUSIC", "phone wording")
    f.tap(650, 60); pg.wait_for_timeout(600)          # an empty spot (no button)
    t.check(playing() and ev(pg, "getComputedStyle(document.querySelector('.spiderman-game-music-hint')).display") == "none", "the first tap anywhere starts the music, the hint goes away")
    t.check(ev(pg, "game.state") == "MENU" and ev(pg, "game.openPanel") is None, "... and that tap did nothing else")
    ctx.close()
    b.close()

    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1066, "height": 600}); pg.goto(URL); pg.wait_for_timeout(1500)
    t.check(ev(pg, "SpidermanGame.__audioLoop.some(n => !SpidermanGame.__audio[n].paused)") and ev(pg, "getComputedStyle(document.querySelector('.spiderman-game-music-hint')).display") == "none", "browser allows autoplay: the music starts as soon as the game has loaded, no hint")
    b.close()
    b = p.chromium.launch(args=["--autoplay-policy=user-gesture-required"])
    pg = b.new_page(viewport={"width": 1066, "height": 600}); pg.goto(URL); pg.wait_for_timeout(1200)
    t.check(ev(pg, "document.querySelector('.spiderman-game-music-hint').textContent") == "CLICK OR PRESS ANY KEY TO START THE MUSIC", "desktop wording")
    pg.mouse.click(1000, 40); pg.wait_for_timeout(600)
    t.check(ev(pg, "SpidermanGame.__audioLoop.some(n => !SpidermanGame.__audio[n].paused)"), "desktop: a click on an empty spot starts the music")
    pg.reload(); pg.wait_for_timeout(1200); pg.keyboard.press("a"); pg.wait_for_timeout(600)
    t.check(ev(pg, "SpidermanGame.__audioLoop.some(n => !SpidermanGame.__audio[n].paused)"), "desktop: any key starts the music")
    # music OFF in the settings: no hint, nothing starts
    ev(pg, "game.mute()"); pg.reload(); pg.wait_for_timeout(1200)
    t.check(ev(pg, "getComputedStyle(document.querySelector('.spiderman-game-music-hint')).display") == "none", "MUSIC: OFF - no hint")

    # ================= desktop unchanged =================
    ev(pg, "game.unmute(); game.setDevMode(true); game.startCampaignLevel('1-1'); game.introFrames = 0")
    pg.wait_for_timeout(200)
    t.check(not ev(pg, "game.touchMode") and ev(pg, "getComputedStyle(document.querySelector('.spiderman-touch')).display") == "none", "desktop (mouse): no touch buttons while playing")
    x0 = ev(pg, "game.spiderman.x"); pg.keyboard.down("ArrowRight"); pg.wait_for_timeout(500); pg.keyboard.up("ArrowRight")
    t.check(ev(pg, "game.spiderman.x") > x0 + 50, "desktop keyboard still moves him")
    c = ev(pg, "(() => { var c = document.querySelector('canvas').getBoundingClientRect(); return [c.left, c.top, c.width, c.height]; })()")
    t.check(abs(c[2] - 1066) < 2 and abs(c[3] - 600) < 2, f"desktop window: the game still fills it as before {c}")
    b.close()
t.report()
