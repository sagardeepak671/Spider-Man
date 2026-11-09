# Stage 3-1 HARBOUR DOCKS: structure, the water (splash, "YOU FELL INTO THE HARBOUR"), the two hidden workers (the
# container alley, the ship's hold: not reachable from above, no way out but the ladder), the marked ropes (web hit
# cuts them, the cargo drops and opens the way; wrong height / direction does nothing; standing under the pallet),
# checkpoints with cut ropes + rescues (retry, double retry, restart), touch WEB button, and a full run by the route
# bot with real key events (both workers, both ropes, complete + saved)
import os, json
from harness import *
from touch import Fingers, center
from world3_helpers import *
t = T("Stage 3-1 Harbour Docks: structure, water, hidden workers, marked ropes + dropping cargo, checkpoints, touch, full run")
F, WATER = 540, 585
BEFORE = ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4"]

def knot(pg, kid):
    return ev(pg, f"""(() => {{ var k = game.level.knots.find(k => k.id === '{kid}'), d = game.level.drops.find(d => d.drop.id === '{kid}');
        return {{ cut: k.cut, kx: k.x, ky: k.y, state: d.drop.state, y: d.y, solid: d.isSolid(), x: d.x, w: d.width, to: d.drop.to }}; }})()""")

def wait_down(pg, kid, limit=120):
    n = 0
    while knot(pg, kid)["state"] != "DOWN" and n < limit:
        frames(pg, 1); n += 1
    return n

def start31(pg):
    ev(pg, "game.startCampaignLevel('3-1'); game.introFrames = 0; game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    frames(pg, 2)

def face_right(pg):
    ev(pg, "game.spiderman.runningDirection = 1")

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    pg.context.add_init_script(HOOK)
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE))
    pg.reload(); pg.wait_for_timeout(500)

    # ================= structure =================
    click(pg, '[data-action="campaign"]'); click(pg, '[data-level="3-1"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-1", "3-1 starts from the level select (World 3 opened by the goblin's clear)")
    L = ev(pg, """(() => { var l = game.level; return {
        theme: game.backdrop.theme, water: l.waterY, width: l.width, cps: l.checkpoints.map(c => [c.x, c.y]),
        workers: l.rescues.map(r => [r.id, r.x, r.y]), knots: l.knots.map(k => [k.id, k.x, k.surface]),
        drops: l.drops.map(d => [d.drop.id, d.style, d.drop.state, d.isSolid()]), cranes: l.cranes.length, anchors: l.anchors.length,
        ladders: l.climbables.filter(c => c.type === 'LADDER').length, enemies: l.enemies.map(e => e.name).sort(),
        coins: l.totalCoins, hearts: l.pickups.filter(p => p.type === 'HEALTH').length, webs: l.pickups.filter(p => p.type === 'WEB').length,
        goal: [l.goal.x, l.goal.y] }; })()""")
    print("  ", L)
    t.check(L["theme"] == "HARBOR" and L["water"] == WATER and L["width"] > 10000, f"harbour backdrop, water at {L['water']}, {L['width']} px long")
    t.check(len(L["cps"]) == 4 and len(L["workers"]) == 2 and len(L["knots"]) == 2 and L["cranes"] == 2, "4 checkpoints, 2 trapped workers, 2 marked ropes, 2 cranes")
    t.check([d[:3] for d in L["drops"]] == [["C1", "CONTAINER", "HANGING"], ["P1", "PALLET", "HANGING"]] and not any(d[3] for d in L["drops"]), f"a hanging container and a hanging pallet, neither solid while hanging {L['drops']}")
    t.check(L["anchors"] == 2 and L["ladders"] == 2, "2 swing hooks, 2 ladders (out of the alley, out of the hold)")
    t.check(L["enemies"] == ["GOBLIN", "THUG", "THUG", "THUG", "THUG", "VENOM"], f"enemies {L['enemies']}")
    t.check(L["coins"] >= 60 and L["hearts"] >= 3 and L["webs"] >= 2, f"{L['coins']} coins, {L['hearts']} hearts, {L['webs']} web canisters")
    rule = ev(pg, """(() => { var bad = []; game.level.checkpoints.forEach(c => game.level.enemies.forEach(e => {
        if (Math.abs(e.centerX() - c.x) < 560 && Math.abs(e.centerY() - (c.y - 30)) < 260) bad.push(c.x + ':' + e.name); })); return bad; })()""")
    t.check(rule == [], f"no enemy within attack range of a checkpoint {rule}")
    tx = texts(pg, 5)
    t.check("RESCUED 0/2" in tx, "HUD: RESCUED 0/2")
    start31(pg)
    sfx_spy(pg)

    # ================= water =================
    put(pg, 1400, F)
    walk(pg, limit=200)                                     # off the quay: no jump
    t.check("SPLASH" in ev(pg, "SFX"), "falling into the water: a splash")
    t.check(state(pg) == "GAMEOVER" and ev(pg, "game.gameoverReason") == "WATER", f"... and the run ends ({state(pg)}, {ev(pg, 'game.gameoverReason')})")
    reason = ev(pg, "document.querySelector('.spiderman-game-gameover-reason').textContent")
    t.check(reason == "YOU FELL INTO THE HARBOUR", f"game over: {reason}")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')
    ev(pg, "game.introFrames = 0; game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    ev(pg, "window.FG = 0; (() => { var o = game.level.drawForeground; game.level.drawForeground = function() { FG++; return o.apply(this, arguments); }; })()")
    frames(pg, 10)
    t.check(ev(pg, "FG") >= 9, "the water is drawn in front every frame (foreground)")
    ev(pg, "game.startCampaignLevel('1-1'); game.introFrames = 0")
    t.check(ev(pg, "game.level.waterY") is None, "1-1 has no water (its pits stay pits)")
    start31(pg)
    sfx_spy(pg)

    # ================= worker 1: the container alley =================
    w1 = ev(pg, "[game.level.rescues[0].x, game.level.rescues[0].y]")
    s3 = ev(pg, "(() => { var r = game.level.platformAt(3900, 270); return [r.x, r.x + r.width, r.y]; })()")
    s4 = ev(pg, "(() => { var r = game.level.platformAt(4300, 270); return [r.x, r.x + r.width, r.y]; })()")
    t.check(s3[1] < w1[0] < s4[0] and s4[0] - s3[1] >= 125, f"worker 1 is in the {s4[0] - s3[1]} px alley between two stacks {s3} {s4}")
    put(pg, s3[1] - 30, s3[2])
    t.check(s(pg)["reach"] is None, "from the top of the stack he is out of reach (you have to go down)")
    t.check("HELP!" in texts(pg, 40), "... but he can be heard: HELP!")
    walk(pg, until="game.spiderman.onGround && game.spiderman.y + game.spiderman.bodyHeight() > 500", limit=120)
    st = s(pg)
    t.check(st["feet"] == F and s3[1] < st["x"] < s4[0], f"walking off the stack drops him into the alley {st}")
    # no way out by jumping
    ev(pg, "window.TOP = 9999; (() => { var o = SpidermanGame.prototype.update; SpidermanGame.prototype.update = function() { TOP = Math.min(TOP, game.spiderman.y + game.spiderman.bodyHeight()); return o.apply(this, arguments); }; })()")
    press(pg, "Space", 50)
    t.check(ev(pg, "TOP") > s3[2] + 60 and s(pg)["feet"] == F, f"a jump in the alley peaks at feet {ev(pg, 'TOP'):.0f} - far below the stacks ({s3[2]})")
    t.check(s(pg)["reach"] == "W1", "down here W1 is in reach")
    press(pg, "e")
    t.check(s(pg)["w"] == "W1:1 W2:0", "E: worker 1 freed")
    # the ladder out (real Up)
    lad = ev(pg, "(() => { var c = game.level.climbables.find(c => c.type === 'LADDER' && c.x > 4100 && c.x < 4200); return c.x + c.width / 2; })()")
    put(pg, lad - 15, F)
    pg.keyboard.down("ArrowUp"); frames(pg, 8)
    t.check(ev(pg, "!!game.spiderman.climbing"), "Up at the ladder: climbing")
    for i in range(200):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround"): break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); frames(pg, 3)
    st = s(pg)
    t.check(st["feet"] == s4[2] and ev(pg, "game.spiderman.groundRoof && game.spiderman.groundRoof.x") == s4[0], f"climbing past the top puts him on the next stack {st}")

    # ================= the marked rope over the crane gap =================
    cp2 = ev(pg, "[game.level.checkpoints[1].x, game.level.checkpoints[1].y]")
    through_checkpoint(pg, cp2[0], cp2[1])
    k1 = knot(pg, "C1")
    near_edge = ev(pg, "game.level.platformAt(5300, 540).x + game.level.platformAt(5300, 540).width")
    far_start = ev(pg, "game.level.platformAt(5900, 540).x")
    t.check(far_start - near_edge >= 380, f"the crane gap is {far_start - near_edge} px of water (no jump can cross it)")
    t.check(k1["y"] == 250 and not k1["solid"] and not k1["cut"], f"the container hangs over it (not solid) {k1}")
    # trying to jump it: into the water
    put(pg, near_edge - 200, F)
    run_right(pg, "false", limit=300)
    t.check(state(pg) == "GAMEOVER" and ev(pg, "game.gameoverReason") == "WATER", "jumping the crane gap without the container: into the water")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')   # back at checkpoint 2 (reached on the way)
    ev(pg, "game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    t.check(ev(pg, "game.levelCheckpoint.x") == 5000 and s(pg)["w"] == "W1:1 W2:0", "retry from checkpoint 2 (W1 still free)")
    sfx_spy(pg)
    # a web at the wrong height: jump and shoot from the top of the jump
    put(pg, near_edge - 100, F); face_right(pg)
    pg.keyboard.press("Space")
    for i in range(40):                                     # wait for the jump to start, then for its top
        if ev(pg, "game.spiderman.velocityY < 0"): break
        frames(pg, 1)
    for i in range(40):
        if ev(pg, "game.spiderman.velocityY >= 0"): break
        frames(pg, 1)
    pg.keyboard.press("x"); frames(pg, 70)
    t.check(not knot(pg, "C1")["cut"], "a web shot from the top of a jump flies over the knot: nothing happens")
    # facing away
    put(pg, near_edge - 100, F); ev(pg, "game.spiderman.runningDirection = -1"); frames(pg, 40)
    pg.keyboard.press("x"); frames(pg, 60)
    t.check(not knot(pg, "C1")["cut"], "a web shot the other way: nothing happens")
    # the real shot, standing on the quay
    put(pg, near_edge - 100, F); face_right(pg); frames(pg, 35)
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    pg.keyboard.press("x")
    for i in range(120):
        if knot(pg, "C1")["cut"]: break
        frames(pg, 1)
    t.check(knot(pg, "C1")["cut"] and "ROPE_SNAP" in ev(pg, "SFX"), f"a web from the quay reaches the knot {k1['kx'] - near_edge + 100:.0f} px away: the rope snaps")
    t.check(knot(pg, "C1")["state"] == "FALLING", "the container starts to fall")
    n = wait_down(pg, "C1")
    k = knot(pg, "C1")
    t.check(k["state"] == "DOWN" and k["y"] == k["to"] == F and k["solid"] and n < 60, f"... it lands in the water as a stepping stone after {n} frames {k}")
    t.check("CARGO_DROP" in ev(pg, "SFX") and ev(pg, "SFX").count("SPLASH") >= 1 and ev(pg, "game.shake") >= 0, "thud + splash")
    frames(pg, 5)
    tx = set(ev(pg, "window.TXT_ON = false, TXT"))
    t.check("ROPE CUT!" in tx and "PATH OPEN!" in tx, "ROPE CUT! and PATH OPEN!")
    # across, with real keys (the two 100 px hops)
    put(pg, near_edge - 150, F)
    run_right(pg, f"game.spiderman.onGround && game.spiderman.x > {far_start + 20}", limit=300)
    t.check(state(pg) == "PLAYING" and s(pg)["feet"] == F and s(pg)["x"] > far_start, f"over the container to the far quay {s(pg)}")

    # ================= the pallet at the ship =================
    p1 = knot(pg, "P1")
    hull = ev(pg, "(() => { var r = game.level.platformAt(6950); return [r.x, r.y]; })()")
    t.check(p1["y"] < 300 and not p1["solid"] and F - hull[1] >= 250, f"the pallet hangs high, the deck is {F - hull[1]} px above the quay (more than jump + step-up) {p1} {hull}")
    # the deck cannot be reached by jumping
    put(pg, hull[0] - 60, F)
    ev(pg, "TOP = 9999")
    pg.keyboard.down("ArrowRight"); press(pg, "Space", 45); pg.keyboard.up("ArrowRight"); frames(pg, 10)
    t.check(s(pg)["feet"] == F and ev(pg, "TOP") > hull[1] + 20, f"jumping at the hull: the deck stays out of reach (peak feet {ev(pg, 'TOP'):.0f})")
    # standing under the pallet when the rope is cut (its knot is behind him, on the left): one heart, knocked clear
    t.check(p1["kx"] < p1["x"] and p1["x"] + p1["w"] == hull[0], f"the pallet hangs against the ship's side, its knot before it {p1}")
    put(pg, p1["x"] + 35, F, inv=False); ev(pg, "game.spiderman.runningDirection = -1"); frames(pg, 35)
    pg.keyboard.press("x")
    for i in range(120):
        if knot(pg, "P1")["state"] == "DOWN": break
        frames(pg, 1)
    frames(pg, 20)
    hp = ev(pg, "game.spiderman.health")
    inside = ev(pg, "(() => { var s = game.spiderman, d = game.level.drops[1]; return s.x + s.bodyWidth() > d.x + 1 && s.x < d.x + d.width - 1 && s.y + s.bodyHeight() > d.y + 1; })()")
    pd = knot(pg, "P1")
    t.check(pd["state"] == "DOWN" and pd["y"] == pd["to"] and 100 <= F - pd["y"] <= 150 and 100 <= pd["y"] - hull[1] <= 150, f"the pallet comes down on the quay: two jumpable steps, quay -> pallet -> deck ({F - pd['y']}, {pd['y'] - hull[1]})")
    t.check(hp == 4 and not inside and state(pg) == "PLAYING", f"standing under it costs a heart and knocks him clear (hp {hp}, inside {inside})")
    # up the pallet onto the deck with real keys: onto the pallet, to its far edge, jump
    put(pg, p1["x"] - 120, F)
    run_right(pg, f"game.spiderman.onGround && game.spiderman.y + game.spiderman.bodyHeight() <= {pd['y'] + 1}", limit=200)
    for i in range(60):                                    # (a jump that steps up onto a ledge bounces once: let it land)
        if ev(pg, "game.spiderman.onGround"): break
        frames(pg, 1)
    t.check(s(pg)["feet"] == pd["y"], f"onto the pallet {s(pg)}")
    walk(pg, until=f"game.spiderman.x + game.spiderman.bodyWidth() >= {pd['x'] + pd['w'] - 6}", limit=100)
    pg.keyboard.down("ArrowRight"); press(pg, "Space", 40); pg.keyboard.up("ArrowRight"); frames(pg, 10)
    t.check(s(pg)["feet"] == hull[1] and s(pg)["g"], f"... and from its edge a jump reaches the ship's deck {s(pg)}")

    # ================= worker 2: the cargo hold =================
    w2 = ev(pg, "[game.level.rescues[1].x, game.level.rescues[1].y]")
    put(pg, w2[0], hull[1])
    t.check(s(pg)["reach"] is None and s(pg)["feet"] == hull[1], "standing on the deck right above worker 2: out of reach")
    put(pg, 7300, hull[1])
    walk(pg, until="game.spiderman.onGround && game.spiderman.y + game.spiderman.bodyHeight() > 500", limit=200)
    st = s(pg)
    t.check(st["feet"] == F and 7100 < st["x"] < 7900, f"walking on, he drops through the open hatch into the hold {st}")
    ev(pg, "TOP = 9999"); press(pg, "Space", 50)
    t.check(ev(pg, "TOP") > hull[1] + 20, f"no jumping out of the hold (peak feet {ev(pg, 'TOP'):.0f})")
    put(pg, 7650, F, inv=False)
    walk(pg, n=20)
    t.check(ev(pg, "game.spiderman.health") == 4, "walking into the sparking wires costs a heart")
    put(pg, w2[0] - 45, F)
    press(pg, "e")
    t.check(s(pg)["w"] == "W1:1 W2:1" and s(pg)["open"], "E: worker 2 freed - 2/2, the exit is open")
    lad2 = ev(pg, "(() => { var c = game.level.climbables.find(c => c.type === 'LADDER' && c.x > 7400); return c.x + c.width / 2; })()")
    put(pg, lad2 + 10, F)
    pg.keyboard.down("ArrowUp"); frames(pg, 8)
    climbing = ev(pg, "!!game.spiderman.climbing")
    for i in range(200):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround"): break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); frames(pg, 3)
    t.check(climbing and s(pg)["feet"] == hull[1], f"the ladder takes him back up to the deck {s(pg)}")

    # ================= checkpoints: cut ropes + rescues =================
    start31(pg)
    cps = ev(pg, "game.level.checkpoints.map(c => [c.x, c.y])")
    ev(pg, "game.level.rescueWorker(game.level.rescues[0]); game.level.cutRope('C1')"); wait_down(pg, "C1")
    through_checkpoint(pg, cps[2][0], cps[2][1])           # checkpoint 3, after the crane gap
    t.check(ev(pg, "game.levelCheckpoint.cut") == {"C1": True}, "checkpoint 3 remembers the cut rope")
    ev(pg, "game.level.cutRope('P1'); game.level.rescueWorker(game.level.rescues[1])"); wait_down(pg, "P1")
    t.check(die(pg), "death after the pallet and worker 2 (before checkpoint 4)")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    ev(pg, "game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    c1, p1 = knot(pg, "C1"), knot(pg, "P1")
    t.check(c1["state"] == "DOWN" and c1["y"] == F and c1["solid"] and c1["cut"], f"retry from checkpoint 3: the container is still down in the water {c1}")
    t.check(p1["state"] == "HANGING" and p1["y"] < 300 and not p1["solid"] and not p1["cut"], f"... the pallet hangs again, its rope whole {p1}")
    t.check(s(pg)["w"] == "W1:1 W2:0" and abs(s(pg)["x"] - cps[2][0]) < 40, f"... worker 2 is trapped again, spider-man at checkpoint 3 {s(pg)}")
    # the pallet again (real shot), die again: still hanging on the next retry
    put(pg, p1["kx"] - 150, F); face_right(pg); frames(pg, 35); press(pg, "x", 60)
    t.check(knot(pg, "P1")["cut"], "the pallet's rope cut again (real web)")
    t.check(die(pg), "second death")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(knot(pg, "P1")["state"] == "HANGING" and knot(pg, "C1")["state"] == "DOWN", "second retry: pallet hanging again, container still down (the checkpoint was not changed)")
    # checkpoint 4 on the deck keeps everything
    ev(pg, "game.scene.enemies.slice().forEach(e => game.removeEnemy(e)); game.level.cutRope('P1'); game.level.rescueWorker(game.level.rescues[1])"); wait_down(pg, "P1")
    through_checkpoint(pg, cps[3][0], cps[3][1])
    t.check(ev(pg, "game.levelCheckpoint.checkpointIndex") == 3, "checkpoint 4 (on the deck) reached")
    t.check(die(pg), "death after checkpoint 4")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    st = s(pg)
    t.check(knot(pg, "P1")["state"] == "DOWN" and knot(pg, "C1")["state"] == "DOWN" and st["w"] == "W1:1 W2:1" and st["feet"] == cps[3][1], f"retry from checkpoint 4: both cargos down, both workers free, on the deck {st}")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    st = s(pg)
    t.check(knot(pg, "C1")["state"] == "HANGING" and knot(pg, "P1")["state"] == "HANGING" and st["saved"] == 0 and st["cp"] == -1, f"RESTART STAGE: both hanging, nobody free {st}")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()

    # ================= touch: the WEB button cuts the rope =================
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    merrs = []; pg.on("pageerror", lambda e: merrs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900)
    f = Fingers(ctx, pg)
    ev(pg, "game.setDevMode(true)"); start31(pg)
    t.check(ev(pg, "SpidermanGame.__touchHintText('WEB THE MARKED ROPE TO DROP THE CARGO (X)')") == "WEB THE MARKED ROPE TO DROP THE CARGO (WEB BUTTON)", "touch: the hint names the WEB button")
    put(pg, 5330, F); face_right(pg); frames(pg, 35)
    W = center(pg, '.spiderman-touch-btn[data-name="web"]')
    f.tap(W[0], W[1]); frames(pg, 70)
    t.check(knot(pg, "C1")["cut"], "touch: WEB tapped facing the knot cuts the rope")
    t.check(not merrs, f"touch: no errors {merrs}")
    b.close()

    # ================= the whole stage with real keys (route bot) =================
    b, pg, errs3 = open_page(p)
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE))
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]'); click(pg, '[data-level="3-1"]')
    ev(pg, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bots", "bot_3_1.js")).read())
    for i in range(600):
        pg.wait_for_timeout(250)
        if state(pg) != "PLAYING": break
    res = ev(pg, """(() => { var m = document.querySelector('.spiderman-game-complete-menu'); return { st: game.state, frames: game.levelFrames,
        rescued: m.querySelector('.spiderman-game-result-rescued').textContent, unlock: m.querySelector('.spiderman-game-unlock-line').textContent,
        cut: game.level.cut, deaths: BOT.deaths, kills: game.kills, coins: game.coins, saved: game.getLevelProgress('3-1') }; })()""")
    print("  ", res)
    t.check(res["st"] == "COMPLETE" and res["rescued"] == "2/2" and res["cut"] == {"C1": True, "P1": True}, f"the route bot clears the stage: both workers, both ropes ({res['frames']} frames)")
    t.check(res["saved"] and res["saved"]["completed"] and res["unlock"] == "STAGE 3-2 UNLOCKED!", f"the clear is saved, 3-2 unlocked ({res['unlock']})")
    t.check(not errs3, f"full run: no browser errors {errs3}")
    b.close()
t.report()
