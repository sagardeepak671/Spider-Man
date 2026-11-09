# Stage 3-2 FLOODED SEWERS: structure, the water system (wading: slower, no slide, splash; too deep: a heart and
# back to safe ground; the last heart: "THE FLOOD SWEPT YOU AWAY"), pumps / valves moving the water (frame counted,
# both ways), the raft riding the water, collisions that change with the water (the tunnel, the lower walkway, the
# ladder), the three rescues, checkpoints keeping the water levels (retry, double retry, restart), touch (the button
# label follows what E does) and a full run by the route bot with real key events
import os, json
from harness import *
from touch import Fingers, center
from world3_helpers import *
t = T("Stage 3-2 Flooded Sewers: water levels, wading, too deep, pumps / valves, raft, rescues, checkpoints, touch, full run")
BEFORE = ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1"]

def pool(pg, pid):
    return ev(pg, f"(() => {{ var p = game.level.poolById('{pid}'); return {{ level: p.level, state: p.state, moving: p.moving, high: p.high, low: p.low, bottom: p.bottom, x: p.x, w: p.width }}; }})()")

def ctrl(pg, cid):
    return ev(pg, f"(() => {{ var c = game.level.controls.find(c => c.id === '{cid}'); return {{ x: c.x, y: c.y, pools: c.pools, kind: c.kind }}; }})()")

def raft(pg):
    return ev(pg, "(() => { var r = game.scene.roofs.find(r => r.style === 'RAFT'); return { x: r.x, w: r.width, y: r.y }; })()")

def settle(pg, pid, limit=600):
    """game frames until the pool stops moving"""
    f0 = ev(pg, "game.frame")
    for i in range(limit):
        if not pool(pg, pid)["moving"]: break
        frames(pg, 2)
    n = ev(pg, "game.frame") - f0
    frames(pg, 2)                                           # (rafts follow the water one frame later)
    return n

def start32(pg):
    ev(pg, "game.startCampaignLevel('3-2'); game.introFrames = 0; game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    frames(pg, 2)

def hp(pg): return ev(pg, "game.spiderman.health")

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    pg.context.add_init_script(HOOK)
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE))
    pg.reload(); pg.wait_for_timeout(500)

    # ================= unlock + structure =================
    click(pg, '[data-action="campaign"]')
    t.check(ev(pg, "game.campaignWorldIndex") == 2 and tile_status(pg)[1] == "3-2:PLAY", f"3-1 cleared: 3-2 is open {tile_status(pg)}")
    t.check("FLOODED SEWERS" in ev(pg, "document.querySelector('[data-level=\"3-2\"]').textContent"), "the tile says FLOODED SEWERS")
    click(pg, '[data-level="3-2"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-2" and ev(pg, "game.backdrop.theme") == "SEWER", "3-2 starts with the sewer backdrop")
    L = ev(pg, """(() => { var l = game.level; return { pools: l.pools.map(p => [p.id, p.state, p.high, p.low]), controls: l.controls.map(c => [c.id, c.kind, c.pools.join()]),
        workers: l.rescues.map(r => [r.id, r.x, r.y]), cps: l.checkpoints.map(c => [c.x, c.y]), rafts: game.scene.roofs.filter(r => r.style === 'RAFT').length,
        enemies: l.enemies.map(e => e.name).sort(), hearts: l.pickups.filter(p => p.type === 'HEALTH').length, width: l.width, waterY: l.waterY }; })()""")
    print("  ", L)
    t.check(len(L["workers"]) == 3 and len(L["cps"]) == 4 and L["rafts"] == 1 and L["width"] > 8000 and L["waterY"] is None, "3 workers, 4 checkpoints, a raft, ~8.7k px, no harbour water")
    t.check([c[0] for c in L["controls"]] == ["P1", "V1A", "V1", "D1"] and [c[1] for c in L["controls"]] == ["PUMP", "VALVE", "VALVE", "PUMP"], f"controls {L['controls']}")
    t.check({p[0]: p[1] for p in L["pools"]} == {"S0": "HIGH", "D1": "HIGH", "T1": "HIGH", "C1": "LOW", "LC": "HIGH", "M": "HIGH"}, f"pools start {L['pools']}")
    # no worker can ever end up under deep water, whatever the pumps do
    drown = ev(pg, """(() => { var l = game.level, bad = []; l.rescues.forEach(r => l.pools.forEach(p => { if (r.x < p.x || r.x > p.x + p.width) return;
        [p.high, p.low].forEach(lv => { if (r.y - lv > SpidermanGame.__pools.DEEP) bad.push(r.id + ':' + p.id); }); })); return bad; })()""")
    t.check(drown == [], f"no worker is ever under deep water {drown}")
    rule = ev(pg, """(() => { var bad = []; game.level.checkpoints.forEach(c => game.level.enemies.forEach(e => {
        if (Math.abs(e.centerX() - c.x) < 560 && Math.abs(e.centerY() - (c.y - 30)) < 260) bad.push(c.x + ':' + e.name); })); return bad; })()""")
    t.check(rule == [], f"no enemy within attack range of a checkpoint {rule}")
    t.check("RESCUED 0/3" in texts(pg, 5), "HUD: RESCUED 0/3")
    start32(pg)
    sfx_spy(pg)

    # ================= wading =================
    s0 = pool(pg, "S0")
    put(pg, 1550, 540)
    x0 = s(pg)["x"]; walk(pg, n=30); dry = s(pg)["x"] - x0
    put(pg, s0["x"] + 60, s0["bottom"])
    t.check(ev(pg, "game.level.waterDepthAt(game.spiderman.centerX(), game.spiderman.y + game.spiderman.bodyHeight())") == 30, "the dip holds 30 px of water")
    frames(pg, 3)
    t.check(ev(pg, "game.spiderman.wading") is True, "standing in it: wading")
    x0 = s(pg)["x"]; walk(pg, n=30); wet = s(pg)["x"] - x0
    t.check(abs(dry - 150) < 8 and abs(wet - 90) < 8, f"walking 30 frames: {dry:.0f} px on dry ground, {wet:.0f} px wading (60 %)")
    press(pg, "ArrowDown", 3)
    t.check(not ev(pg, "game.spiderman.hasState('SLIDE')"), "no slide dash while wading")
    ev(pg, "TOP = 9999; (() => { if (window.__top) return; window.__top = 1; var o = SpidermanGame.prototype.update; SpidermanGame.prototype.update = function() { TOP = Math.min(TOP, game.spiderman.y + game.spiderman.bodyHeight()); return o.apply(this, arguments); }; })()")
    press(pg, "Space", 50)
    t.check(s0["bottom"] - ev(pg, "TOP") > 140, f"jumping still works in shallow water ({s0['bottom'] - ev(pg, 'TOP'):.0f} px high)")
    t.check(ev(pg, "SFX").count("SPLASH") >= 1, "landing back in the water: a splash")
    ev(pg, "window.FG = 0; (() => { var o = game.level.drawPoolsFront; game.level.drawPoolsFront = function() { FG++; return o.apply(this, arguments); }; })()")
    frames(pg, 10)
    t.check(ev(pg, "FG") >= 9, "the water is drawn in front of him every frame (his legs under the surface)")
    put(pg, 200, 540); frames(pg, 3)
    t.check(ev(pg, "game.spiderman.wading") is False, "back on the walkway: not wading")

    # ================= too deep =================
    d1 = pool(pg, "D1")
    put(pg, d1["x"] - 120, 540, inv=False)
    walk(pg, until="game.spiderman.health < 5", limit=120)          # walk off the edge into the channel (no jump)
    frames(pg, 3)
    st = s(pg)
    t.check(hp(pg) == 4 and st["feet"] == 540 and st["x"] < d1["x"] - 60, f"walking into the deep channel: TOO DEEP - a heart, back on the walkway well before the edge {st}")
    t.check(ev(pg, "game.spiderman.keydowns.length") == 0, "... the keys are let go")
    # the flooded tunnel: walking in is too deep too
    t1 = pool(pg, "T1")
    put(pg, t1["x"] - 150, 540, inv=False)
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    walk(pg, until="game.spiderman.health < 5", limit=150)
    frames(pg, 2)
    tx = ev(pg, "window.TXT_ON = false, TXT")
    st = s(pg)
    t.check(hp(pg) == 4 and st["x"] < t1["x"] - 100 and "TOO DEEP!" in tx, f"walking into the flooded tunnel: TOO DEEP!, put back {t1['x'] - st['x']:.0f} px before it")
    # the last heart in deep water ends the run
    put(pg, d1["x"] - 120, 540, inv=False); ev(pg, "game.spiderman.health = 1")
    walk(pg, limit=150)
    t.check(state(pg) == "GAMEOVER" and ev(pg, "game.gameoverReason") == "FLOOD", f"the last heart: game over ({ev(pg, 'game.gameoverReason')})")
    t.check(ev(pg, "document.querySelector('.spiderman-game-gameover-reason').textContent") == "THE FLOOD SWEPT YOU AWAY", "THE FLOOD SWEPT YOU AWAY")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')
    ev(pg, "game.introFrames = 0; game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    sfx_spy(pg)

    # ================= the pump: drains the tunnel, and back =================
    p1 = ctrl(pg, "P1")
    put(pg, p1["x"] - 200, 540)
    press(pg, "e")
    t.check(pool(pg, "T1")["state"] == "HIGH", "E away from the pump does nothing")
    put(pg, p1["x"] - 30, 540); frames(pg, 2)
    t.check(ev(pg, "game.level.controlInReach && game.level.controlInReach.id") == "P1" and "E  LOWER WATER" in texts(pg, 20), "at the pump: E  LOWER WATER")
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    press(pg, "e", 2)
    t1 = pool(pg, "T1")
    t.check(t1["state"] == "LOW" and t1["moving"] and "PUMP" in ev(pg, "SFX"), "E: the pump runs, the tunnel drains")
    n = settle(pg, "T1")
    t1 = pool(pg, "T1")
    expect = (t1["low"] - t1["high"]) / ev(pg, "SpidermanGame.__pools.SPEED")
    t.check(t1["level"] == t1["low"] and not t1["moving"] and abs(n - expect) <= 8, f"the level moves at a fixed speed: {t1['high']} -> {t1['low']} in {n} frames (~{expect:.0f})")
    t.check("DRAINING..." in ev(pg, "window.TXT_ON = false, TXT"), "DRAINING...")
    t.check("E  RAISE WATER" in texts(pg, 20), "now the pump offers E  RAISE WATER")
    # through the drained tunnel: wading (the crate to hop), out into the pump room
    put(pg, t1["x"] - 40, 540)
    run_right(pg, f"game.spiderman.onGround && game.spiderman.x > {t1['x'] + t1['w'] + 20}", limit=500)
    st = s(pg)
    t.check(st["x"] > t1["x"] + t1["w"] and hp(pg) == 5, f"through the drained tunnel without harm {st}")
    # back at the pump, flood it again: the tunnel is blocked again
    put(pg, p1["x"] - 30, 540); press(pg, "e"); settle(pg, "T1")
    t.check(pool(pg, "T1")["level"] == pool(pg, "T1")["high"], "E again: FLOODING back to the ceiling")
    put(pg, t1["x"] - 150, 540, inv=False)
    walk(pg, until="game.spiderman.health < 5", limit=150)
    t.check(hp(pg) == 4 and s(pg)["x"] < t1["x"], "the tunnel blocks the way again")
    # the water rising while he is inside: back to safe ground (his spots inside are under water now)
    put(pg, p1["x"] - 30, 540); press(pg, "e"); settle(pg, "T1")
    put(pg, t1["x"] + 300, 540, inv=False); walk(pg, n=60)
    ev(pg, "game.level.useControl(game.level.controls[0])")      # (the pump is far away: raise it from here)
    for i in range(200):
        if hp(pg) < 5: break
        frames(pg, 1)
    frames(pg, 3)
    st = s(pg)
    t.check(hp(pg) == 4 and ev(pg, f"game.level.waterDepthAt(game.spiderman.centerX(), game.spiderman.y + game.spiderman.bodyHeight())") <= 0 and st["feet"] == 540,
            f"caught by the rising water inside: back to dry ground {st}")

    # ================= the cistern: raft + valves =================
    start32(pg)
    c1, r, v1, v1a = pool(pg, "C1"), raft(pg), ctrl(pg, "V1"), ctrl(pg, "V1A")
    t.check(c1["state"] == "LOW" and r["y"] == c1["level"] - 10, f"the raft floats on the low water {r} {c1}")
    put(pg, 3540, 540)
    t.check(ev(pg, "game.level.controlInReach && game.level.controlInReach.id") == "V1A", "the walkway valve is in reach from the walkway")
    put(pg, 3680, 565); frames(pg, 2)
    t.check(ev(pg, "game.level.controlInReach") is None, "the raft's valve is out of reach from the grate")
    # onto the raft with a real jump from the walkway edge
    put(pg, 3480, 540)
    run_right(pg, "game.spiderman.onGround && game.spiderman.groundRoof && game.spiderman.groundRoof.style === 'GRATE'", limit=200)
    walk(pg, until="game.spiderman.onGround && game.spiderman.groundRoof && game.spiderman.groundRoof.style === 'RAFT'", limit=100)
    t.check(ev(pg, "game.spiderman.groundRoof && game.spiderman.groundRoof.style") == "RAFT", f"walkway -> grate -> raft {s(pg)}")
    walk(pg, until=f"game.spiderman.x + game.spiderman.bodyWidth() >= {r['x'] + r['w'] - 4}", limit=60)
    t.check(ev(pg, "game.level.controlInReach && game.level.controlInReach.id") == "V1", "on the raft: the valve is in reach")
    ev(pg, "window.RIDE = []; (() => { var o = SpidermanGame.prototype.update; SpidermanGame.prototype.update = function() { var r = game.scene.roofs.find(r => r.style === 'RAFT'); if (window.RIDE) RIDE.push([Math.round(r.y), Math.round(game.spiderman.y + game.spiderman.bodyHeight()), game.spiderman.onGround]); return o.apply(this, arguments); }; })()")
    press(pg, "e")
    n = settle(pg, "C1")
    ride = ev(pg, "RIDE")
    carried = all(abs(a - f) < 1.5 for a, f, g in ride[3:] if g)
    t.check(pool(pg, "C1")["state"] == "HIGH" and raft(pg)["y"] == pool(pg, "C1")["high"] - 10, f"the water rises, the raft with it ({n} frames)")
    t.check(carried and s(pg)["feet"] == raft(pg)["y"] and ev(pg, "game.spiderman.onGround"), "he rides on it the whole way (feet on the raft every frame)")
    ev(pg, "window.RIDE = null")
    # worker 2 on the ledge, then up onto the wall
    w2 = ev(pg, "[game.level.rescues[1].x, game.level.rescues[1].y]")
    walk(pg, until=f"game.spiderman.x <= {r['x'] + 4}", key="ArrowLeft", code=37, limit=80)
    pg.keyboard.down("ArrowLeft"); press(pg, "Space", 40); pg.keyboard.up("ArrowLeft"); frames(pg, 5)
    t.check(s(pg)["feet"] == w2[1] and s(pg)["reach"] == "W2", f"a jump left from the raft onto worker 2's ledge {s(pg)}")
    press(pg, "e")
    t.check(s(pg)["w"] == "W1:0 W2:1 W3:0", "worker 2 freed")
    put(pg, r["x"] + 40, raft(pg)["y"])
    run_right(pg, "game.spiderman.onGround && game.spiderman.y + game.spiderman.bodyHeight() <= 281 && game.spiderman.x > 3960", limit=150)
    t.check(s(pg)["feet"] == 280, f"off the raft onto the upper run {s(pg)}")
    # from below, the raft up there is out of reach: the walkway valve brings it back down
    put(pg, 3480, 540)
    t.check(ev(pg, "game.level.controlInReach && game.level.controlInReach.id") == "V1A", "back on the walkway: the reset valve")
    press(pg, "e"); settle(pg, "C1")
    t.check(pool(pg, "C1")["state"] == "LOW" and raft(pg)["y"] == pool(pg, "C1")["low"] - 10, "it lowers the water and the raft again")
    press(pg, "e"); settle(pg, "C1")
    t.check(raft(pg)["y"] == pool(pg, "C1")["high"] - 10 and s(pg)["feet"] == 540, "(pressed from the walkway the raft goes up without him)")
    # falling into the cistern when it is full: too deep, back to safe ground
    put(pg, 4010, 280, inv=False)
    walk(pg, until="game.spiderman.health < 5", key="ArrowLeft", code=37, limit=120)
    frames(pg, 3)
    t.check(hp(pg) == 4 and s(pg)["feet"] == 280, f"stepping off the wall into the full cistern: TOO DEEP, back on the wall {s(pg)}")

    # ================= the overflow chamber: the lower walkway only exists when it is drained =================
    start32(pg)
    m, d1c = pool(pg, "M"), ctrl(pg, "D1")
    lad = ev(pg, "(() => { var c = game.level.climbables.find(c => c.type === 'LADDER' && c.x > 6700 && c.x < 6900); return [c.x + c.width / 2, c.top, c.bottom]; })()")
    put(pg, lad[0], lad[1], inv=False)
    pg.keyboard.down("ArrowDown"); frames(pg, 60); pg.keyboard.up("ArrowDown"); frames(pg, 3)
    t.check(hp(pg) == 4 and s(pg)["feet"] == lad[1], f"climbing down into the full chamber: TOO DEEP, back on the catwalk {s(pg)}")
    put(pg, d1c["x"] - 20, d1c["y"]); press(pg, "e")
    n = settle(pg, "M")
    t.check(pool(pg, "M")["level"] == m["low"], f"the MAIN DRAIN: {m['high']} -> {m['low']} in {n} frames")
    put(pg, lad[0], lad[1])
    pg.keyboard.down("ArrowDown")
    for i in range(200):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround") and i > 5: break
        frames(pg, 2)
    pg.keyboard.up("ArrowDown"); frames(pg, 3)
    st = s(pg)
    t.check(st["feet"] == lad[2] and ev(pg, "game.spiderman.wading") and hp(pg) == 5, f"drained: down the ladder onto the lower walkway, wading {st}")
    # worker 3 up his ladder, then the exit
    lad3 = ev(pg, "(() => { var c = game.level.climbables.find(c => c.type === 'LADDER' && c.x > 7600); return [c.x + c.width / 2, c.top]; })()")
    put(pg, lad3[0] - 10, 720)
    pg.keyboard.down("ArrowUp")
    for i in range(200):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround") and i > 5: break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); frames(pg, 3)
    t.check(s(pg)["feet"] == lad3[1], f"up the ladder to worker 3's ledge {s(pg)}")
    walk(pg, until="!!game.level.rescueInReach", limit=80)
    press(pg, "e")
    ev(pg, "game.level.rescueWorker(game.level.rescues[0]); game.level.rescueWorker(game.level.rescues[1])")
    t.check(s(pg)["saved"] == 3 and s(pg)["open"], "worker 3 freed (and the other two): 3/3, the exit opens")
    gx = ev(pg, "[game.level.goal.x, game.level.goal.y]")
    put(pg, gx[0] - 200, gx[1])
    walk(pg, limit=200)
    t.check(state(pg) == "COMPLETE", f"through the exit tunnel: STAGE CLEAR ({state(pg)})")
    t.check(ev(pg, "document.querySelector('.spiderman-game-result-rescued').textContent") == "3/3", "results: RESCUED 3/3")
    t.check(ev(pg, "document.querySelector('.spiderman-game-unlock-line').textContent") == "STAGE 3-3 UNLOCKED!" and ev(pg, "document.querySelector('.spiderman-game-next-button').style.display") == "", "3-3 unlocked (NEXT STAGE)")

    # ================= checkpoints keep the water =================
    start32(pg)
    cps = ev(pg, "game.level.checkpoints.map(c => [c.x, c.y])")
    ev(pg, "game.level.useControl(game.level.controls[0])"); settle(pg, "T1")
    ev(pg, "game.level.rescueWorker(game.level.rescues[0])")
    through_checkpoint(pg, cps[0][0], cps[0][1])
    t.check(ev(pg, "game.levelCheckpoint.pools.T1") == "LOW", "checkpoint 1 remembers the drained tunnel")
    ev(pg, "game.level.useControl(game.level.controls[2])"); settle(pg, "C1")                # the cistern up (after the checkpoint)
    t.check(die(pg), "death")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    ev(pg, "game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    t.check(pool(pg, "T1")["level"] == pool(pg, "T1")["low"] and pool(pg, "C1")["state"] == "LOW" and raft(pg)["y"] == pool(pg, "C1")["low"] - 10,
            "retry from checkpoint 1: the tunnel stays drained, the cistern is low again (raised after the checkpoint), raft down")
    t.check(s(pg)["w"] == "W1:1 W2:0 W3:0", "... worker 1 (before it) still free")
    ev(pg, "game.level.useControl(game.level.controls[2])"); settle(pg, "C1")
    ev(pg, "game.level.rescueWorker(game.level.rescues[1])")
    through_checkpoint(pg, cps[1][0], cps[1][1])
    t.check(die(pg), "death after checkpoint 2")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    ev(pg, "game.scene.enemies.slice().forEach(e => game.removeEnemy(e))")
    t.check(pool(pg, "C1")["state"] == "HIGH" and raft(pg)["y"] == pool(pg, "C1")["high"] - 10 and s(pg)["feet"] == cps[1][1], "retry from checkpoint 2: the cistern full, the raft up, on the upper run")
    through_checkpoint(pg, cps[2][0], cps[2][1])
    ev(pg, "game.level.useControl(game.level.controls[3])"); settle(pg, "M")                 # drain the chamber after checkpoint 3
    t.check(die(pg), "death after draining (before checkpoint 4)")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(pool(pg, "M")["level"] == pool(pg, "M")["high"], "retry from checkpoint 3: the chamber is full again")
    ev(pg, "game.level.useControl(game.level.controls[3])"); settle(pg, "M")
    t.check(die(pg), "second death")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    t.check(pool(pg, "M")["level"] == pool(pg, "M")["high"], "second retry: still full (the checkpoint was not changed)")
    ev(pg, "game.scene.enemies.slice().forEach(e => game.removeEnemy(e)); game.level.useControl(game.level.controls[3])"); settle(pg, "M")
    through_checkpoint(pg, cps[3][0], cps[3][1])
    t.check(die(pg), "death after checkpoint 4 (on the lower walkway)")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
    frames(pg, 5)
    t.check(pool(pg, "M")["level"] == pool(pg, "M")["low"] and s(pg)["feet"] == cps[3][1] and hp(pg) == 5 and state(pg) == "PLAYING",
            f"retry from checkpoint 4: drained, standing in the shallow water {s(pg)}")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    states = ev(pg, "game.level.pools.map(p => p.id + ':' + p.state + ':' + (p.level === (p.state === 'HIGH' ? p.high : p.low)))")
    t.check(states == ["S0:HIGH:true", "D1:HIGH:true", "T1:HIGH:true", "C1:LOW:true", "LC:HIGH:true", "M:HIGH:true"] and s(pg)["saved"] == 0, f"RESTART STAGE: every pool back to its start {states}")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()

    # ================= touch: the button says what E does =================
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    merrs = []; pg.on("pageerror", lambda e: merrs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900)
    f = Fingers(ctx, pg)
    ev(pg, "game.setDevMode(true)"); start32(pg)
    label = lambda: ev(pg, "document.querySelector('.is-rescue').textContent + '|' + document.querySelector('.is-rescue').className.includes('is-ready') + '|' + getComputedStyle(document.querySelector('.is-rescue')).display")
    t.check(label() == "USE|false|flex", f"touch: the button is there and says USE ({label()})")
    put(pg, 1960, 540); frames(pg, 3)
    t.check(label() == "LOWER|true|flex", f"touch: at the pump it says LOWER and lights up ({label()})")
    Rb = center(pg, '.spiderman-touch-btn[data-name="rescue"]')
    f.tap(Rb[0], Rb[1]); frames(pg, 3)
    t.check(pool(pg, "T1")["state"] == "LOW" and label().startswith("RAISE"), f"touch: tapped - the tunnel drains, the button now says RAISE ({label()})")
    put(pg, 3280, 540); frames(pg, 3)
    t.check(label() == "RESCUE|true|flex", f"touch: next to worker 1 it says RESCUE ({label()})")
    t.check(ev(pg, "SpidermanGame.__touchHintText('FLOODED TUNNEL - USE THE PUMP (E)')") == "FLOODED TUNNEL - USE THE PUMP (USE BUTTON)", "touch: the hint names the button")
    t.check(not merrs, f"touch: no errors {merrs}")
    b.close()

    # ================= the whole stage with real keys (route bot) =================
    b, pg, errs3 = open_page(p)
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE))
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]'); click(pg, '[data-level="3-2"]')
    ev(pg, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bots", "bot_3_2.js")).read())
    deaths = 0
    for i in range(800):
        pg.wait_for_timeout(250)
        st = state(pg)
        if st == "COMPLETE": break
        if st == "GAMEOVER":                                 # like a player: retry from the checkpoint (or restart)
            deaths += 1
            cpb = pg.locator('.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
            if cpb.is_visible(): cpb.click()
            else: pg.locator('.spiderman-game-gameover-menu .spiderman-game-retry-button').click()
            ev(pg, "BOT.resume()")
    print("   bot deaths:", deaths)
    res = ev(pg, """(() => { var m = document.querySelector('.spiderman-game-complete-menu'); return { st: game.state, frames: game.levelFrames,
        rescued: m.querySelector('.spiderman-game-result-rescued').textContent, pools: game.level.poolStates(), saved: game.getLevelProgress('3-2'), log: BOT.log.slice(-6) }; })()""")
    print("  ", res)
    t.check(res["st"] == "COMPLETE" and res["rescued"] == "3/3", f"the route bot clears the stage with all three workers ({res['frames']} frames)")
    t.check(res["pools"]["T1"] == "LOW" and res["pools"]["C1"] == "HIGH" and res["pools"]["M"] == "LOW", "... having drained the tunnel, raised the cistern and drained the chamber")
    t.check(res["saved"] and res["saved"]["completed"], "the clear is saved")
    t.check(not errs3, f"full run: no browser errors {errs3}")
    b.close()
t.report()
