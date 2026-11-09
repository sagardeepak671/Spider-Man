# World 3: unlocking after the World 2 boss, stage 3-1, the rescue system (E / the RESCUE touch button,
# rescued counter, exit that needs every worker), checkpoints / retry / restart, saved progress, dev mode, mobile
from harness import *
from touch import Fingers, center, buttons_shown
t = T("World 3: unlock, rescue system (E + touch), exit lock, HUD counter, checkpoints / retry, saves, dev mode")

WORLD2 = ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3"]
from world3_helpers import *

def start(pg, stage):
    ev(pg, f"game.startCampaignLevel('{stage}'); game.introFrames = 0")
    frames(pg, 2)

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    pg.context.add_init_script(HOOK)   # records canvas texts on every page load (also after a refresh)
    pg.reload(); pg.wait_for_timeout(500)
    TOTAL = total(pg)

    # ================= fresh save: world 3 is locked =================
    t.check(TOTAL == 12 and badge(pg) == "0/12", f"12 stages in 3 worlds, badge 0/12 ({badge(pg)})")
    click(pg, '[data-action="campaign"]')
    tabs = ev(pg, "[...document.querySelectorAll('.spiderman-game-world-tab')].map(t => t.textContent + '|' + t.className)")
    t.check(len(tabs) == 3 and tabs[2].startswith("WORLD 3|") and "is-world-locked" in tabs[2], f"WORLD 3 tab, locked {tabs}")
    click(pg, '.spiderman-game-world-tab[data-world="2"]')
    t.check("WORLD 3 - HARBOUR" in ev(pg, "document.querySelector('.spiderman-game-world-title').textContent"), "world 3 title")
    t.check(tile_status(pg) == ["3-1:LOCKED:L", "3-2:LOCKED:L", "3-3:LOCKED:L", "3-4:LOCKED:L"], f"world 3 tiles locked {tile_status(pg)}")
    boss_tile = ev(pg, "(t => t.classList.contains('is-boss') + '|' + t.textContent)(document.querySelector('[data-level=\"3-4\"]'))")
    t.check(boss_tile.startswith("true|BOSS") and "SANDMAN" in boss_tile, f"3-4 is the SANDMAN boss tile ({boss_tile})")
    t.check(note(pg) == "Defeat the World 2 boss to unlock World 3.", f"locked world note: {note(pg)}")
    click(pg, '[data-level="3-1"]')
    t.check(state(pg) == "MENU" and "World 3 is locked" in note(pg) and "2-4" in note(pg), f"locked 3-1 does not start: {note(pg)}")

    # ================= World 2 cleared (real results path) -> World 3 opens =================
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:10, time:10}))" % WORLD2)
    t.check(ev(pg, "game.isLevelUnlocked('3-1')") is False, "3-1 still locked before the goblin is beaten")
    start(pg, "2-4")
    ev(pg, "game.level.boss.startDefeat()")
    for i in range(100):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    res = ev(pg, "[...document.querySelectorAll('.spiderman-game-complete-menu .spiderman-game-panel-title, .spiderman-game-complete-menu .spiderman-game-unlock-line')].map(e => e.textContent)")
    nb = ev(pg, "(b => b.style.display + '|' + b.textContent)(document.querySelector('.spiderman-game-next-button'))")
    t.check(res == ["WORLD 2 CLEARED!", "WORLD 3 - HARBOUR UNLOCKED!"] and nb == "|NEXT WORLD", f"goblin beaten: {res}, {nb}")
    t.check(ev(pg, "game.isLevelUnlocked('3-1', true) && !game.isLevelUnlocked('3-2', true)"), "3-1 open, 3-2 still locked")
    click(pg, '.spiderman-game-complete-menu .spiderman-game-next-button')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-1" and ev(pg, "game.introFrames") > 0, "NEXT WORLD starts 3-1 with its STAGE 3-1 card")
    t.check(ev(pg, "game.backdrop.theme") == "HARBOR" and ev(pg, "game.level.name") == "HARBOUR DOCKS", "3-1: HARBOUR DOCKS, harbour backdrop")
    st = s(pg)
    t.check(st["total"] == 2 and st["saved"] == 0 and st["open"] is False, f"two trapped workers, none saved, exit shut {st}")
    t.check(ev(pg, "game.level.goal !== null && game.level.checkpoints.length === 4"), "goal flag, four checkpoints")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="level-select"]')
    t.check(ev(pg, "game.campaignWorldIndex") == 2, "level select from 3-1 opens on world 3")
    t.check(tile_status(pg) == ["3-1:PLAY", "3-2:LOCKED:L", "3-3:LOCKED:L", "3-4:LOCKED:L"], f"world 3 tiles {tile_status(pg)}")
    tabs = ev(pg, "[...document.querySelectorAll('.spiderman-game-world-tab')].map(t => t.className)")
    t.check("is-world-cleared" in tabs[1] and "is-world-locked" not in tabs[2], f"world 2 tab checked, world 3 tab open {tabs}")
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]')
    t.check(ev(pg, "game.campaignWorldIndex") == 2 and ev(pg, "document.querySelector('.spiderman-game-level-tile.is-selected').getAttribute('data-level')") == "3-1",
            "after a refresh: opens on world 3 with 3-1 preselected")
    t.check(badge(pg) == "8/12", f"badge 8/12 ({badge(pg)})")

    # ================= the rescue: E only next to a worker, counter, HUD =================
    click(pg, '[data-level="3-1"]'); ev(pg, "game.introFrames = 0")
    tx = texts(pg)
    t.check("RESCUED 0/2" in tx, f"HUD says RESCUED 0/2 ({sorted(tx)[:12]})")
    w1, w2 = worker(pg, "W1"), worker(pg, "W2")
    put(pg, 300, 540)
    pg.keyboard.press("e"); frames(pg, 5)
    t.check(s(pg)["saved"] == 0 and s(pg)["reach"] is None, "E far from the workers does nothing")
    # worker 2 in the ship's hold: walk up to him with the real arrow key (from past the sparking wires) until the
    # prompt shows
    put(pg, w2[0] - 95, w2[1])
    t.check("HELP!" in texts(pg, 40), "a trapped worker (not in reach yet) calls HELP!")
    walk(pg, until="!!game.level.rescueInReach")
    st = s(pg)
    t.check(st["reach"] == "W2" and abs(st["x"] - w2[0]) <= ev(pg, "SpidermanGame.__rescue.REACH_X"), f"walking up to him: W2 in reach at {st['x'] - w2[0]:.0f} px")
    tx = texts(pg, 20)
    t.check("E  RESCUE" in tx, "in reach: the [E] RESCUE prompt is drawn above him")
    # holding E does not count, only a fresh press (a held key never chains actions)
    ev(pg, "game.spiderman.keydowns.push(69)"); frames(pg, 10); ev(pg, "game.spiderman.keyup(69)")
    t.check(s(pg)["saved"] == 0, "a held (not freshly pressed) E does not free him")
    ev(pg, "window.SFX = []; (() => { var o = game.sfx.play; game.sfx.play = function(n) { SFX.push(n); return o.apply(this, arguments); }; })()")
    pg.keyboard.press("e"); frames(pg, 3)
    st = s(pg)
    t.check(st["saved"] == 1 and st["w"] == "W1:0 W2:1" and st["reach"] is None, f"E next to him: W2 rescued, 1/2 {st}")
    t.check("RESCUE" in ev(pg, "SFX"), "rescue jingle played")
    tx = texts(pg, 30)
    t.check("RESCUED 1/2" in tx and "WORKER RESCUED! 1/2" in tx and "THANKS!" in tx, f"HUD RESCUED 1/2, WORKER RESCUED! 1/2, he says THANKS! ")
    frames(pg, 15)
    t.check(ev(pg, "game.level.rescues[1].freeFrames") == ev(pg, "SpidermanGame.__rescue.FREE_FRAMES"), "the beam-lifting animation runs to its end (frame counted)")
    pg.keyboard.press("e"); frames(pg, 3)
    t.check(s(pg)["saved"] == 1, "E again next to a freed worker: still 1/2")

    # ================= the exit needs every worker =================
    ev(pg, "window.SFX = []")
    gx = ev(pg, "[game.level.goal.x, game.level.goal.y]")
    put(pg, gx[0] - 120, gx[1])
    walk(pg, until="game.level.goal.touchesSpiderman()"); frames(pg, 3)   # walks right into the flag and stops there
    tx = texts(pg, 10)
    st = s(pg)
    t.check(st["st"] == "PLAYING" and ev(pg, "game.level.goal.touchesSpiderman()"), f"walking into the flag with 1/2: the stage does not end {st}")
    t.check("GATE_LOCKED" in ev(pg, "SFX"), "locked sound at the flag")
    frames(pg, 60)
    t.check(state(pg) == "PLAYING", "standing at the locked flag for a second: still playing")
    t.check("RESCUE 1/2" in tx, "the flag label says RESCUE 1/2")
    ev(pg, "window.TXT = []; window.TXT_ON = true; game.level.exitWarned = 0"); frames(pg, 3)
    t.check(any(x.startswith("EXIT LOCKED - RESCUE THE WORKERS 1/2") for x in ev(pg, "window.TXT_ON = false, TXT")), "EXIT LOCKED - RESCUE THE WORKERS 1/2 message")

    # worker 1 in the alley between the container stacks
    put(pg, w1[0] - 45, w1[1])
    t.check(s(pg)["feet"] == w1[1] and s(pg)["g"] and s(pg)["reach"] == "W1", "down in the container alley: W1 in reach")
    pg.keyboard.press("e"); frames(pg, 3)
    st = s(pg)
    t.check(st["saved"] == 2 and st["open"] is True, f"W1 rescued: 2/2, exit open {st}")
    tx = texts(pg, 10)
    t.check("RESCUED 2/2" in tx and "EVERYONE IS SAFE - EXIT OPEN!" in tx, "HUD 2/2, EXIT OPEN message")
    # walk to the flag for real
    put(pg, gx[0] - 150, gx[1])
    t.check("GOAL" in texts(pg, 5), "the flag says GOAL again")
    walk(pg, limit=200)                          # until the stage ends (at most 200 frames)
    t.check(state(pg) == "COMPLETE", f"with everyone safe the flag clears the stage ({state(pg)})")
    cm = ev(pg, """(() => { var m = document.querySelector('.spiderman-game-complete-menu'); return {
        title: m.querySelector('.spiderman-game-panel-title').textContent, unlock: m.querySelector('.spiderman-game-unlock-line').textContent,
        rescued: m.querySelector('.spiderman-game-result-rescued').textContent, shown: m.querySelector('.spiderman-game-rescue-stat').style.display,
        next: m.querySelector('.spiderman-game-next-button').style.display }; })()""")
    t.check(cm == {"title": "STAGE CLEAR!", "unlock": "STAGE 3-2 UNLOCKED!", "rescued": "2/2", "shown": "", "next": ""}, f"results: {cm} (NEXT STAGE -> 3-2)")

    # ================= saved progress =================
    saved = ev(pg, "JSON.parse(localStorage.getItem('spiderman-game-campaign')).levels['3-1']")
    t.check(saved and saved["completed"], f"3-1 saved {saved}")
    pg.reload(); pg.wait_for_timeout(500)
    t.check(badge(pg) == "9/12", f"after a refresh: badge 9/12 ({badge(pg)})")
    click(pg, '[data-action="campaign"]')
    st3 = tile_status(pg)
    t.check(st3[0].startswith("3-1:CLEARED") and st3[1] == "3-2:PLAY" and st3[2] == "3-3:LOCKED:L" and st3[3] == "3-4:LOCKED:L", f"tiles after the clear {st3}")
    click(pg, '[data-level="3-3"]')
    t.check(state(pg) == "MENU" and "locked" in note(pg), f"3-3 still locked: {note(pg)}")
    best = ev(pg, "game.getLevelProgress('3-1')")
    ev(pg, "game.saveLevelProgress('3-1', {completed:true, score:0, time:9999})")
    t.check(ev(pg, "game.getLevelProgress('3-1')") == best, "a worse replay never lowers the best")
    # other stages' completion screens have no RESCUED stat
    start(pg, "2-1")
    ev(pg, "(() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; })()")
    for i in range(30):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    t.check(state(pg) == "COMPLETE" and ev(pg, "document.querySelector('.spiderman-game-rescue-stat').style.display") == "none", "2-1 (no workers): flag clears right away, no RESCUED stat")
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    start(pg, "1-1"); frames(pg, 10)
    t.check(not any("RESCUE" in x for x in ev(pg, "window.TXT_ON = false, TXT")), "1-1: no rescue counter in the HUD")
    pg.keyboard.press("e"); frames(pg, 5)
    t.check(state(pg) == "PLAYING", "E in a stage without workers does nothing")

    # ================= checkpoints, retry, restart =================
    ev(pg, "game.resetCampaignProgress(); %s.concat(['2-4']).forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % WORLD2)
    start(pg, "3-1")
    cpx = ev(pg, "game.level.checkpoints[1].x")          # checkpoint 2: after worker 1, before worker 2
    # W1 (before the checkpoint) freed, checkpoint touched, W2 (after it) freed, then death
    put(pg, w1[0] - 40, w1[1]); pg.keyboard.press("e"); frames(pg, 3)
    through_checkpoint(pg, cpx)
    st = s(pg)
    t.check(st["cp"] == 1 and ev(pg, "game.levelCheckpoint.rescued") == {"W1": True}, f"checkpoint saved with W1 free {st}")
    put(pg, w2[0] - 40, w2[1]); pg.keyboard.press("e"); frames(pg, 3)
    t.check(s(pg)["saved"] == 2, "W2 freed after the checkpoint")
    t.check(die(pg) and ev(pg, "document.querySelector('.spiderman-game-checkpoint-button').style.display") == "", "death: game over with RETRY FROM CHECKPOINT")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    st = s(pg)
    t.check(st["st"] == "PLAYING" and st["w"] == "W1:1 W2:0" and st["saved"] == 1 and abs(st["x"] - cpx) < 40, f"retry from checkpoint: W1 still free, W2 trapped again, at the checkpoint {st}")
    tx = texts(pg, 10)
    t.check("RESCUED 1/2" in tx, "the HUD says 1/2 after the retry")
    # free W2 again, die again, retry again: the checkpoint itself was not changed by the second rescue
    put(pg, w2[0] - 40, w2[1]); pg.keyboard.press("e"); frames(pg, 3)
    t.check(s(pg)["saved"] == 2, "W2 freed again")
    t.check(die(pg), "second death: game over")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(s(pg)["w"] == "W1:1 W2:0", f"second retry: W2 trapped again (the checkpoint keeps only W1) {s(pg)['w']}")
    # restart stage from the pause menu: everyone trapped again, no checkpoint
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    st = s(pg)
    t.check(st["st"] == "PLAYING" and st["saved"] == 0 and st["cp"] == -1 and st["x"] < 200, f"RESTART STAGE: 0/2, from the start {st}")
    # checkpoint touched BEFORE freeing W1: W1 is trapped again on a retry ...
    through_checkpoint(pg, cpx)
    put(pg, w1[0] - 40, w1[1]); pg.keyboard.press("e"); frames(pg, 3)
    t.check(die(pg), "death: game over")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(s(pg)["w"] == "W1:0 W2:0", f"W1 freed after the checkpoint is trapped again on a retry {s(pg)['w']}")
    # ... unless he walks back through the checkpoint afterwards (it saves again)
    put(pg, w1[0] - 40, w1[1]); pg.keyboard.press("e"); frames(pg, 3)
    through_checkpoint(pg, cpx)
    t.check(die(pg), "death: game over")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(s(pg)["w"] == "W1:1 W2:0", f"re-entering the checkpoint after the rescue saves it {s(pg)['w']}")
    # falling into the water before any checkpoint (real keys) -> RESTART STAGE
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    put(pg, w1[0] - 40, w1[1]); pg.keyboard.press("e"); frames(pg, 3)
    put(pg, 1350, 540, inv=True)
    walk(pg, limit=300)                          # off the quay into the water: until the game is over
    t.check(state(pg) == "GAMEOVER" and ev(pg, "game.gameoverReason") == "WATER", "walking off the quay: game over (water)")
    t.check(ev(pg, "document.querySelector('.spiderman-game-checkpoint-button').style.display") == "none", "no checkpoint yet: only RESTART STAGE")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')
    t.check(s(pg)["saved"] == 0 and state(pg) == "PLAYING", "restart after falling in: 0/2")

    # ================= dev mode =================
    ev(pg, "game.resetCampaignProgress()"); ev(pg, "game.showMainMenu()")
    click(pg, '[data-action="toggle-dev"]')
    click(pg, '[data-action="campaign"]')
    click(pg, '.spiderman-game-world-tab[data-world="2"]')
    tabs = ev(pg, "[...document.querySelectorAll('.spiderman-game-world-tab')].map(t => t.className)")
    t.check("is-world-locked" not in tabs[2], "dev mode: WORLD 3 tab open on a fresh save")
    t.check(tile_status(pg) == ["3-1:DEV", "3-2:DEV", "3-3:DEV", "3-4:DEV"], f"dev mode tiles {tile_status(pg)}")
    click(pg, '[data-level="3-4"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.boss.bossName") == "SANDMAN", "dev mode: the Sandman fight can be started")
    ev(pg, "game.showMainMenu(); game.handleMenuAction('campaign')")
    click(pg, '.spiderman-game-world-tab[data-world="2"]')
    click(pg, '[data-level="3-1"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-1", "dev mode: 3-1 starts from the tile")
    ev(pg, "game.introFrames = 0; game.level.rescues.forEach(r => game.level.rescueWorker(r))")
    ev(pg, "(() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; })()")
    for i in range(30):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    t.check(state(pg) == "COMPLETE" and ev(pg, "game.isLevelCompleted('3-1')"), "dev-mode clear of 3-1 is saved normally")
    ev(pg, "game.showMainMenu()"); click(pg, '[data-action="toggle-dev"]')
    click(pg, '[data-action="campaign"]')
    t.check(ev(pg, "game.campaignWorldIndex") == 0 and ev(pg, "game.isLevelUnlocked('3-1')") is False, "dev off: world 3 really locked again (2-4 not beaten)")
    click(pg, '.spiderman-game-world-tab[data-world="2"]')
    t.check(tile_status(pg)[0] == "3-1:LOCKED:L", f"the locked tile wins over a dev clear {tile_status(pg)}")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()

    # ================= mobile: the RESCUE button =================
    b = p.chromium.launch()
    for dev in ["Pixel 7 landscape", "iPhone 12"]:
        ctx = b.new_context(**p.devices[dev]); pg = ctx.new_page()
        merrs = []; pg.on("pageerror", lambda e: merrs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(600); ev(pg, "localStorage.clear()"); pg.reload(); pg.wait_for_timeout(900)
        f = Fingers(ctx, pg)
        def tap_sel(sel, wait=200):
            x, y, _, _ = center(pg, sel); f.tap(x, y); pg.wait_for_timeout(wait)
        ev(pg, "game.setDevMode(true)")
        tap_sel('[data-action="campaign"]'); tap_sel('.spiderman-game-world-tab[data-world="0"]'); tap_sel('[data-level="1-1"]', 300)
        t.check(buttons_shown(pg) and ev(pg, "getComputedStyle(document.querySelector('.is-rescue')).display") == "none", f"{dev}: 1-1 has no RESCUE button")
        ev(pg, "game.showMainMenu()")
        tap_sel('[data-action="campaign"]'); tap_sel('.spiderman-game-world-tab[data-world="2"]'); tap_sel('[data-level="3-1"]', 300)
        ev(pg, "game.introFrames = 0")
        t.check(ev(pg, "game.level && game.level.id") == "3-1" and ev(pg, "getComputedStyle(document.querySelector('.is-rescue')).display") != "none", f"{dev}: tapping WORLD 3 -> 3-1 starts it, RESCUE button shown")
        L = ev(pg, """(() => { var c = document.querySelector('canvas').getBoundingClientRect(), s = game.viewScale;
            var btns = [...document.querySelectorAll('.spiderman-touch-btn')].filter(b => b.getClientRects().length).map(b => { var r = b.getBoundingClientRect(); return { name: b.getAttribute('data-name'), l: r.left, t: r.top, r: r.right, b: r.bottom }; });
            return { vw: innerWidth, vh: innerHeight, c: { l: c.left, t: c.top, r: c.right, b: c.bottom }, hud: c.top + 66 * s, btns: btns }; })()""")
        rb = [x for x in L["btns"] if x["name"] == "rescue"][0]
        others = [x for x in L["btns"] if x["name"] != "rescue"]
        overlaps = [x["name"] for x in others if min(x["r"], rb["r"]) - max(x["l"], rb["l"]) > 0 and min(x["b"], rb["b"]) - max(x["t"], rb["t"]) > 0]
        t.check(min(rb["r"] - rb["l"], rb["b"] - rb["t"]) >= 44 and rb["l"] >= 0 and rb["r"] <= L["vw"] and rb["b"] <= L["vh"], f"{dev}: RESCUE is at least 44 px and on the screen {rb}")
        t.check(rb["t"] > L["hud"] and not overlaps, f"{dev}: RESCUE does not reach the HUD or cover another button {overlaps}")
        if "landscape" in dev:
            cw, ch = L["c"]["r"] - L["c"]["l"], L["c"]["b"] - L["c"]["t"]
            cover = sum(max(0, min(x["r"], L["c"]["r"]) - max(x["l"], L["c"]["l"])) * max(0, min(x["b"], L["c"]["b"]) - max(x["t"], L["c"]["t"])) for x in L["btns"])
            t.check(cover / (cw * ch) < 0.06, f"{dev}: all buttons incl. RESCUE cover only {100 * cover / (cw * ch):.1f} % of the game")
        else:
            t.check(rb["t"] >= L["c"]["b"], f"{dev}: portrait - RESCUE sits under the game")
        w1 = ev(pg, "[game.level.rescues[0].x, game.level.rescues[0].y]")
        put(pg, 300, 540)
        t.check("is-ready" not in ev(pg, "document.querySelector('.is-rescue').className"), f"{dev}: away from the worker the button is not lit")
        f.tap(*center(pg, '.spiderman-touch-btn[data-name="rescue"]')[:2]); frames(pg, 3)
        t.check(ev(pg, "game.level.rescuedCount()") == 0, f"{dev}: RESCUE tapped far away: nothing happens")
        # next to him (placed: walking timing is covered by the desktop part)
        put(pg, w1[0] - 40, w1[1])
        t.check("is-ready" in ev(pg, "document.querySelector('.is-rescue').className"), f"{dev}: next to the worker the RESCUE button lights up")
        f.tap(*center(pg, '.spiderman-touch-btn[data-name="rescue"]')[:2]); frames(pg, 3)
        t.check(ev(pg, "game.level.rescuedCount()") == 1 and "is-ready" not in ev(pg, "document.querySelector('.is-rescue').className"), f"{dev}: RESCUE tapped: 1/2, button dims again")
        # a second finger on RESCUE while the first one holds WEB (several fingers at once), next to worker 2
        w2 = ev(pg, "[game.level.rescues[1].x, game.level.rescues[1].y]")
        put(pg, w2[0] - 40, w2[1])
        W = center(pg, '.spiderman-touch-btn[data-name="web"]'); Rb = center(pg, '.spiderman-touch-btn[data-name="rescue"]')
        f.down(1, W[0], W[1]); frames(pg, 3)
        f.down(2, Rb[0], Rb[1]); frames(pg, 3); f.up(2); f.up(1); frames(pg, 3)
        t.check(ev(pg, "game.level.rescuedCount()") == 2, f"{dev}: RESCUE with a second finger while WEB is held: 2/2")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
        t.check(not buttons_shown(pg), f"{dev}: paused: touch buttons hidden")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
        t.check(buttons_shown(pg) and ev(pg, "getComputedStyle(document.querySelector('.is-rescue')).display") != "none", f"{dev}: resumed: RESCUE button back")
        hint = ev(pg, "SpidermanGame.__touchHintText('PRESS E NEXT TO A TRAPPED WORKER')")
        t.check(hint == "TAP RESCUE NEXT TO A TRAPPED WORKER", f"{dev}: the stage hint names the button ({hint})")
        ev(pg, "game.showMainMenu()")
        tap_sel('[data-action="controls"]')
        t.check("FREE A TRAPPED WORKER" in ev(pg, "document.querySelector('.spiderman-game-touch-help').textContent"), f"{dev}: CONTROLS lists the RESCUE button")
        t.check(not merrs, f"{dev}: no errors {merrs}")
        ctx.close()
    b.close()
t.report()
