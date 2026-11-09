# Stage 3-3 UNDERGROUND PUMP STATION: unlocking (3-2 -> 3-3 -> the Sandman boss), structure, the climb / trolley / lift /
# hover / lattice, every water control (the sump pump, the transfer pump that needs power, the main pump that unseals
# the control room), the four rescues (each behind a different water task), checkpoints that restore water, power,
# levers, gates and rescues together (retry, double retry, restart, "too deep" never sends him into water), touch
# labels, and a full run by the route bot with real key events
import os, json, itertools
from harness import *
from touch import Fingers, center
from world3_helpers import *
t = T("Stage 3-3 Pump Station: unlock, controls + power, transfer pump, rescues, moving platforms, checkpoint consistency, full run, Sandman unlock")
BEFORE = ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2"]

def pool(pg, pid):
    return ev(pg, f"(() => {{ var p = game.level.poolById('{pid}'); return {{ level: p.level, state: p.state, moving: p.moving, high: p.high, low: p.low }}; }})()")

def settle(pg, pid, limit=600):
    f0 = ev(pg, "game.frame")
    for i in range(limit):
        if not pool(pg, pid)["moving"]: break
        frames(pg, 2)
    n = ev(pg, "game.frame") - f0
    frames(pg, 3)
    return n

def start33(pg, keep_enemies=False):
    ev(pg, "game.startCampaignLevel('3-3'); game.introFrames = 0" + ("" if keep_enemies else "; game.scene.enemies.slice().forEach(e => game.removeEnemy(e))"))
    frames(pg, 2)

def hp(pg): return ev(pg, "game.spiderman.health")
def roof(pg, tag): return ev(pg, f"(() => {{ var r = game.scene.roofs.find(r => r.tag === '{tag}'); return {{ x: r.x, y: r.y, powered: r.powered, w: r.width }}; }})()")
def rafts(pg): return ev(pg, "game.scene.roofs.filter(r => r.style === 'RAFT').map(r => Math.round(r.y))")
def use(pg, cid):
    """press E at control cid (placed right next to it)"""
    c = ev(pg, f"(() => {{ var c = game.level.controls.find(c => c.id === '{cid}'); return [c.x, c.y]; }})()")
    put(pg, c[0] - 25, c[1]); press(pg, "e", 3)

# everything that must come back together on a retry
STATE = """(() => { var l = game.level; return { pools: l.pools.map(p => p.id + ':' + p.state + ':' + (p.level === (p.state === 'HIGH' ? p.high : p.low) ? 'at' : 'moving')).join(' '),
    power: Object.keys(l.powered).filter(k => l.powered[k]).sort().join(','), levers: l.switches.map(s => s.on ? 1 : 0).join(''),
    gate: l.gates.map(g => g.state).join(','), rescued: l.rescues.map(r => r.rescued ? 1 : 0).join(''), rafts: game.scene.roofs.filter(r => r.style === 'RAFT').map(r => Math.round(r.y)).join(','),
    lift: game.scene.roofs.find(r => r.tag === 'LIFT1').powered, tp: l.controlPowered(l.controls.find(c => c.id === 'TP')) }; })()"""
def full(pg):
    st = ev(pg, STATE)
    st["gate"] = st["gate"].replace("OPENING", "OPEN")    # (a gate still rolling up counts as open: a retry restores it open)
    return st

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    pg.context.add_init_script(HOOK)

    # ================= unlocking: 3-2 -> 3-3 =================
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE[:-1]))
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]')
    st3 = tile_status(pg)
    t.check(st3[1] == "3-2:PLAY" and st3[2] == "3-3:LOCKED:L" and "PUMP STATION" in ev(pg, "document.querySelector('[data-level=\"3-3\"]').textContent"), f"before 3-2 is cleared, PUMP STATION is locked {st3}")
    click(pg, '[data-level="3-2"]')
    ev(pg, "game.level.rescues.forEach(r => game.level.rescueWorker(r)); (() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; })()")
    for i in range(40):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    unlock = ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-unlock-line').textContent")
    t.check(state(pg) == "COMPLETE" and unlock == "STAGE 3-3 UNLOCKED!" and ev(pg, "document.querySelector('.spiderman-game-next-button').style.display") == "", f"clearing 3-2: {unlock}, NEXT STAGE offered")
    click(pg, '.spiderman-game-complete-menu .spiderman-game-next-button')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-3" and ev(pg, "game.backdrop.theme") == "STATION", "NEXT STAGE starts 3-3 (pump station backdrop)")

    # ================= structure =================
    L = ev(pg, """(() => { var l = game.level; return { pools: l.pools.map(p => [p.id, p.state]), controls: l.controls.map(c => [c.id, c.pools.join('+'), c.requires]),
        workers: l.rescues.length, cps: l.checkpoints.length, watch: l.poolPowers.map(w => [w.pool, w.state, w.power]), gates: l.gates.map(g => [g.id, g.state]),
        movers: game.scene.roofs.filter(r => r.motion).map(r => r.style).sort(), climb: l.climbables.map(c => c.type).sort(), enemies: l.enemies.map(e => e.name).sort() }; })()""")
    print("  ", L)
    t.check(L["workers"] == 4 and L["cps"] == 5, "4 workers, 5 checkpoints")
    t.check(L["controls"] == [["P1", "SUMP", None], ["TP", "BW+BE", "PWR2"], ["MP", "R", None]], f"controls: the sump pump, the transfer pump (needs PWR2), the main pump {L['controls']}")
    t.check(L["watch"] == [["R", "LOW", "CTRL"]] and L["gates"] == [["CTRL", "CLOSED"]], "the control room gate opens once the hall is drained")
    t.check(L["movers"] == ["GIRDER", "HOVER", "LIFT", "RAFT", "RAFT"], f"moving platforms: trolley, lift, hover, two rafts {L['movers']}")
    t.check(L["climb"].count("PIPE") == 2 and L["climb"].count("LADDER") >= 5 and "LATTICE" in L["climb"], f"climbing: pipes, ladders, a lattice {L['climb']}")
    # no worker is ever under deep water - for every combination of pool states
    bad = ev(pg, """(() => { var l = game.level, bad = [], n = l.pools.length;
        for (var m = 0; m < (1 << n); m++) l.rescues.forEach(r => { var surface = null;
            l.pools.forEach((p, i) => { if (r.x < p.x || r.x > p.x + p.width) return; var lv = (m >> i) & 1 ? p.high : p.low; if (surface === null || lv < surface) surface = lv; });
            if (surface !== null && r.y - surface > SpidermanGame.__pools.DEEP) bad.push(r.id + '@' + m); });
        return bad; })()""")
    t.check(bad == [], f"no worker is under deep water in any of the 2^{len(L['pools'])} pool combinations {bad[:5]}")
    rule = ev(pg, """(() => { var bad = []; game.level.checkpoints.forEach(c => game.level.enemies.forEach(e => {
        if (Math.abs(e.centerX() - c.x) < 560 && Math.abs(e.centerY() - (c.y - 30)) < 260) bad.push(c.x + ':' + e.name); })); return bad; })()""")
    t.check(rule == [], f"no enemy within attack range of a checkpoint {rule}")
    t.check("RESCUED 0/4" in texts(pg, 5), "HUD: RESCUED 0/4")
    start33(pg)
    sfx_spy(pg)

    # ================= A. the pipe, the trolley =================
    put(pg, 380, 540)
    ev(pg, "TOP = 9999; (() => { if (window.__top) return; window.__top = 1; var o = SpidermanGame.prototype.update; SpidermanGame.prototype.update = function() { TOP = Math.min(TOP, game.spiderman.y + game.spiderman.bodyHeight()); return o.apply(this, arguments); }; })()")
    pg.keyboard.down("ArrowRight"); press(pg, "Space", 45); pg.keyboard.up("ArrowRight"); frames(pg, 5)
    t.check(s(pg)["feet"] == 540 and ev(pg, "TOP") > 330, f"the pump housing (240 px) cannot be jumped (peak feet {ev(pg, 'TOP'):.0f})")
    put(pg, 420, 540)
    pg.keyboard.down("ArrowUp")
    for i in range(150):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround") and i > 5: break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); frames(pg, 3)
    t.check(s(pg)["feet"] == 300, f"Up at the pipe: climbed onto the housing {s(pg)}")
    # the trolley: wait on the left bank until it is there, step on, ride, step off
    put(pg, 680, 540)
    for i in range(400):
        tr = roof(pg, "TROLLEY")
        if tr["x"] <= 712: break
        frames(pg, 2)
    walk(pg, until="game.spiderman.onGround && game.spiderman.groundRoof && game.spiderman.groundRoof.tag === 'TROLLEY' && game.spiderman.x > game.spiderman.groundRoof.x + 8", limit=60)
    x_on = roof(pg, "TROLLEY")["x"]
    for i in range(400):
        if roof(pg, "TROLLEY")["x"] >= 938: break
        frames(pg, 2)
    t.check(ev(pg, "game.spiderman.groundRoof && game.spiderman.groundRoof.tag") == "TROLLEY" and roof(pg, "TROLLEY")["x"] - x_on > 200, "riding the trolley across the intake (carried)")
    walk(pg, until="game.spiderman.onGround && game.spiderman.x > 1060", limit=80)
    t.check(s(pg)["feet"] == 540 and s(pg)["x"] > 1060 and hp(pg) == 5, "stepped off on the far side, dry")

    # ================= B. the sump =================
    sump = pool(pg, "SUMP")
    put(pg, 1560, 540, inv=False)
    walk(pg, until="game.spiderman.health < 5", limit=120); frames(pg, 3)
    t.check(hp(pg) == 4 and s(pg)["feet"] == 540, "the flooded basement: TOO DEEP, back on the walkway")
    lift0 = roof(pg, "LIFT1")
    frames(pg, 100)
    t.check(not lift0["powered"] and roof(pg, "LIFT1")["y"] == lift0["y"], "the lift has no power (it does not move)")
    use(pg, "P1")
    t.check(pool(pg, "SUMP")["state"] == "LOW" and "PUMP" in ev(pg, "SFX"), "the SUMP PUMP runs")
    n = settle(pg, "SUMP")
    t.check(pool(pg, "SUMP")["level"] == sump["low"], f"the basement drains in {n} frames ({sump['high']} -> {sump['low']})")
    put(pg, 1700, 740)
    t.check(ev(pg, "game.spiderman.wading") is not None and s(pg)["feet"] == 740 and hp(pg) == 5, "down in the drained basement (wading)")
    put(pg, 1825, 740)
    pg.keyboard.down("ArrowUp")
    for i in range(150):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround") and i > 5: break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); frames(pg, 3)
    t.check(s(pg)["feet"] == 520, f"up worker 1's pipe onto his housing {s(pg)}")
    walk(pg, until="!!game.level.rescueInReach", limit=60); press(pg, "e")
    t.check(s(pg)["w"] == "W1:1 W2:0 W3:0 W4:0", "worker 1 freed")
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    put(pg, 2120, 740); walk(pg, n=20)
    t.check(ev(pg, "game.level.switches[0].on") and roof(pg, "LIFT1")["powered"] and "LIFT POWERED" in ev(pg, "window.TXT_ON = false, TXT"), "walking into the breaker: LIFT POWERED")
    for i in range(300):
        lf = roof(pg, "LIFT1")
        if lf["y"] >= 739 and ev(pg, "game.scene.roofs.find(r => r.tag === 'LIFT1').motion.waitFrames") > 20: break
        frames(pg, 2)
    put(pg, 2360, 740)
    for i in range(300):
        if roof(pg, "LIFT1")["y"] <= 301: break
        frames(pg, 2)
    t.check(s(pg)["feet"] <= 302 and ev(pg, "game.spiderman.groundRoof && game.spiderman.groundRoof.tag") == "LIFT1", f"the lift carries him up to the gallery {s(pg)}")
    walk(pg, until="game.spiderman.onGround && game.spiderman.x > 2440", limit=60)
    t.check(s(pg)["feet"] == 300, "onto the gallery")

    # ================= C. the twin basins =================
    bw, be = pool(pg, "BW"), pool(pg, "BE")
    t.check(bw["state"] == "HIGH" and be["state"] == "LOW" and rafts(pg) == [bw["high"] - 10, min(be["low"] - 10, 780)], f"west basin full (its raft up), east basin low {rafts(pg)}")
    # over the west raft onto the pump house with real jumps
    put(pg, 2820, 300)
    run_right(pg, "game.spiderman.onGround && game.spiderman.x > 3330 && game.spiderman.y + game.spiderman.bodyHeight() <= 301", limit=200)
    t.check(s(pg)["feet"] == 300 and s(pg)["x"] > 3330, f"gallery -> west raft -> pump house {s(pg)}")
    # the transfer pump has no power yet
    ev(pg, "window.TXT = []; window.TXT_ON = true"); sfx_spy(pg)
    use(pg, "TP")
    tx = ev(pg, "window.TXT_ON = false, TXT")
    t.check(pool(pg, "BW")["state"] == "HIGH" and pool(pg, "BE")["state"] == "LOW" and "NO POWER" in tx and "GATE_LOCKED" in ev(pg, "SFX"), "TRANSFER PUMP without power: NO POWER, nothing moves")
    t.check("E  NO POWER" in texts(pg, 20), "its prompt says NO POWER")
    # down into the east basin (low), the east tunnel: worker 3 and the breaker
    put(pg, 3530, 300)
    walk(pg, until="game.spiderman.onGround && game.spiderman.y + game.spiderman.bodyHeight() > 700", limit=150)
    t.check(s(pg)["feet"] in (760, 800) and hp(pg) == 5, f"off the pump house down into the low east basin (floor or its resting raft), no harm {s(pg)}")
    walk(pg, until="!!game.level.rescueInReach", limit=300)
    press(pg, "e")
    t.check(s(pg)["w"] == "W1:1 W2:0 W3:1 W4:0", "worker 3 freed in the east tunnel")
    walk(pg, n=60)
    t.check(ev(pg, "game.level.switches[1].on") and ev(pg, "game.level.powered.PWR2") is True, "the breaker: the transfer pump has power")
    # back up the ladder, transfer
    put(pg, 3560, 800)
    pg.keyboard.down("ArrowUp")
    for i in range(250):
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround") and i > 5: break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); frames(pg, 3)
    t.check(s(pg)["feet"] == 300 and hp(pg) == 5, "back up the ladder out of the shallow basin onto the pump house (grabbing it in 30 px of water is not 'too deep')")
    put(pg, 3415, 300); frames(pg, 2)
    t.check("E  TRANSFER WATER" in texts(pg, 20), "now it offers E  TRANSFER WATER")
    press(pg, "e", 2)
    t.check(pool(pg, "BW")["state"] == "LOW" and pool(pg, "BE")["state"] == "HIGH" and pool(pg, "BW")["moving"] and pool(pg, "BE")["moving"], "E: the west basin empties while the east one fills")
    n = settle(pg, "BW")
    t.check(pool(pg, "BW")["level"] == bw["low"] and pool(pg, "BE")["level"] == be["high"] and abs(n - (bw["low"] - bw["high"]) / 3) < 8, f"... at the same time, in {n} frames")
    t.check(rafts(pg) == [min(bw["low"] - 10, 780), be["high"] - 10], f"the rafts follow (west down, east up) {rafts(pg)}")
    # worker 2: the west basin's floor, the crawl under the bulkhead
    put(pg, 3250, 800)
    walk(pg, until="!!game.level.rescueInReach", key="ArrowLeft", code=37, limit=300)
    st = s(pg)
    t.check(st["reach"] == "W2" and st["feet"] == 765 and hp(pg) == 5, f"under the bulkhead (a 65 px gap) to worker 2 {st}")
    press(pg, "e")
    t.check(s(pg)["w"] == "W1:1 W2:1 W3:1 W4:0", "worker 2 freed")
    # the east raft is the stepping stone now
    put(pg, 3480, 300)
    run_right(pg, "game.spiderman.onGround && game.spiderman.x > 3990 && game.spiderman.y + game.spiderman.bodyHeight() <= 301", limit=200)
    t.check(s(pg)["feet"] == 300 and s(pg)["x"] > 3990, f"pump house -> east raft -> east gallery {s(pg)}")
    # reversible: back on the pump house, transfer again - everything back, the west raft is the stepping stone again
    use(pg, "TP"); settle(pg, "BE")
    t.check(pool(pg, "BW")["state"] == "HIGH" and pool(pg, "BE")["state"] == "LOW" and rafts(pg)[0] == bw["high"] - 10, "transferred back: west full, east low")
    use(pg, "TP"); settle(pg, "BE")

    # ================= D. the main pump hall =================
    r = pool(pg, "R")
    put(pg, 4850, 330)
    run_right(pg, "game.spiderman.onGround && game.spiderman.x > 5060", limit=120)
    t.check(s(pg)["feet"] == 290, "machine 1 -> machine 2")
    for i in range(400):
        if roof(pg, "HOVER1")["x"] <= 5214: break
        frames(pg, 2)
    walk(pg, until="game.spiderman.onGround && game.spiderman.groundRoof && game.spiderman.groundRoof.tag === 'HOVER1' && game.spiderman.x > game.spiderman.groundRoof.x + 5", limit=60)
    for i in range(400):
        if roof(pg, "HOVER1")["x"] >= 5478: break
        frames(pg, 2)
    walk(pg, until="game.spiderman.onGround && game.spiderman.x > 5600", limit=60)
    t.check(s(pg)["feet"] == 290 and s(pg)["x"] > 5600, "rode the hover platform over to machine 3")
    gate = ev(pg, "[game.level.gates[0].x, game.level.gates[0].state]")
    put(pg, 5800, 290)
    pg.keyboard.down("ArrowUp")
    for i in range(200):
        if ev(pg, "!!game.spiderman.climbing") and s(pg)["feet"] < 100: pg.keyboard.down("ArrowRight")
        if not ev(pg, "!!game.spiderman.climbing") and ev(pg, "game.spiderman.onGround") and i > 5: break
        frames(pg, 2)
    pg.keyboard.up("ArrowUp"); pg.keyboard.up("ArrowRight"); frames(pg, 3)
    t.check(s(pg)["feet"] == 60, f"up the lattice onto the pump tower {s(pg)}")
    t.check(gate[1] == "CLOSED", "the control room is sealed")
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    use(pg, "MP")
    n = settle(pg, "R")
    tx = ev(pg, "window.TXT_ON = false, TXT")
    t.check(pool(pg, "R")["level"] == r["low"] and ev(pg, "game.level.powered.CTRL") is True and ev(pg, "game.level.gates[0].state") in ("OPENING", "OPEN"), f"the MAIN PUMP drains the hall ({n} frames) and the control room unseals")
    t.check("CONTROL ROOM UNSEALED" in tx, "CONTROL ROOM UNSEALED")
    put(pg, 6100, 880); frames(pg, 60)
    walk(pg, until="!!game.level.rescueInReach", limit=200); press(pg, "e")
    t.check(s(pg)["w"] == "W1:1 W2:1 W3:1 W4:1" and s(pg)["open"], "through the open gate: worker 4 freed - 4/4, the exit opens")
    gx = ev(pg, "[game.level.goal.x, game.level.goal.y]")
    put(pg, gx[0] - 150, gx[1]); walk(pg, limit=150)
    res = ev(pg, "[game.state, document.querySelector('.spiderman-game-result-rescued').textContent, document.querySelector('.spiderman-game-unlock-line').textContent, document.querySelector('.spiderman-game-next-button').style.display]")
    t.check(res[0] == "COMPLETE" and res[1] == "4/4", f"STAGE CLEAR, RESCUED 4/4 {res}")
    t.check(res[2] == "STAGE 3-4 UNLOCKED!" and res[3] == "", f"clearing 3-3 unlocks the Sandman boss (NEXT STAGE offered) {res[2]}")

    # ================= saved progress + the Sandman tile =================
    pg.reload(); pg.wait_for_timeout(500)
    t.check(badge(pg) == "11/12", f"after a refresh: badge 11/12 ({badge(pg)})")
    click(pg, '[data-action="campaign"]')
    st3 = tile_status(pg)
    t.check(st3[2].startswith("3-3:CLEARED") and st3[3] == "3-4:PLAY", f"3-3 cleared, the Sandman tile is open {st3}")
    t.check(ev(pg, "game.isLevelUnlocked('3-4', true) && !game.isWorldCleared(2)"), "3-4 really unlocked (not only dev mode); world 3 not cleared yet")
    click(pg, '[data-level="3-4"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-4" and ev(pg, "game.level.boss.bossName") == "SANDMAN", "the boss tile starts the Sandman fight")
    ev(pg, "game.showMainMenu(); game.handleMenuAction('campaign')")
    click(pg, '[data-level="3-3"]'); ev(pg, "game.introFrames = 0")

    # ================= checkpoints bring everything back together =================
    start33(pg)
    cps = ev(pg, "game.level.checkpoints.map(c => [c.x, c.y])")
    initial = full(pg)
    # 1. after checkpoint 1: the sump pumped, worker 1, the lift breaker -> all undone
    through_checkpoint(pg, cps[0][0], cps[0][1])
    use(pg, "P1"); settle(pg, "SUMP")
    ev(pg, "game.level.rescueWorker(game.level.rescues[0])")
    put(pg, 2120, 740); walk(pg, n=20)
    t.check(full(pg)["lift"] is True, "(sump pumped, worker 1 freed, lift powered)")
    t.check(die(pg), "death before checkpoint 2")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button'); frames(pg, 2)
    st = full(pg)
    t.check(st == initial, f"retry from checkpoint 1: the sump full, worker 1 trapped, breaker off, lift unpowered - exactly as at the checkpoint {st}")
    # 2. checkpoint 3 (the pump house) before the transfer breaker, then breaker + worker 3 + transfer -> all undone
    ev(pg, "game.level.useControl(game.level.controls[0]); game.level.rescueWorker(game.level.rescues[0])"); settle(pg, "SUMP")
    put(pg, 2120, 740); walk(pg, n=20)
    through_checkpoint(pg, cps[1][0], cps[1][1])
    through_checkpoint(pg, cps[2][0], cps[2][1])
    at_cp3 = full(pg)
    put(pg, 4300, 765); walk(pg, n=15)                        # the transfer breaker
    ev(pg, "game.level.rescueWorker(game.level.rescues[2])")
    use(pg, "TP"); settle(pg, "BE")
    t.check(full(pg)["pools"] != at_cp3["pools"] and full(pg)["tp"], "(breaker on, worker 3 freed, water transferred)")
    t.check(die(pg), "death before checkpoint 4")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button'); frames(pg, 2)
    st = full(pg)
    t.check(st == at_cp3 and not st["tp"], f"retry from checkpoint 3: basins as they were, transfer pump unpowered, breaker off, worker 3 trapped {st}")
    t.check(s(pg)["feet"] == 300 and abs(s(pg)["x"] - cps[2][0]) < 40, "... standing on the pump house")
    # 3. do it all again, reach checkpoint 4, die: everything kept
    put(pg, 4300, 765); walk(pg, n=15)
    ev(pg, "game.level.rescueWorker(game.level.rescues[2]); game.level.rescueWorker(game.level.rescues[1])")
    use(pg, "TP"); settle(pg, "BE")
    through_checkpoint(pg, cps[3][0], cps[3][1])
    at_cp4 = full(pg)
    t.check(die(pg), "death after checkpoint 4")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button'); frames(pg, 2)
    t.check(full(pg) == at_cp4 and at_cp4["tp"] and at_cp4["rescued"] == "1110", f"retry from checkpoint 4: breaker, transfer, rafts and workers 1-3 all kept {full(pg)}")
    # 4. the main pump after checkpoint 4: undone, the control room sealed again (never left open)
    use(pg, "MP"); settle(pg, "R")
    t.check(full(pg)["gate"] == "OPEN", "(the hall drained, the control room open)")
    t.check(die(pg), "death before checkpoint 5")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button'); frames(pg, 2)
    st = full(pg)
    t.check(st == at_cp4 and st["gate"] == "CLOSED" and "CTRL" not in st["power"], f"retry from checkpoint 4: the hall full again and the control room sealed again {st}")
    use(pg, "MP"); settle(pg, "R")
    t.check(die(pg), "second death before checkpoint 5")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button'); frames(pg, 2)
    t.check(full(pg) == at_cp4, "second retry: still exactly the checkpoint 4 state (the checkpoint itself was not changed)")
    # 5. checkpoint 5 on the drained hall floor
    use(pg, "MP"); settle(pg, "R")
    through_checkpoint(pg, cps[4][0], cps[4][1])
    at_cp5 = full(pg)
    t.check(die(pg), "death after checkpoint 5")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-checkpoint-button'); frames(pg, 5)
    st = full(pg)
    t.check(st == at_cp5 and st["gate"] == "OPEN" and "R:LOW" in st["pools"] and s(pg)["feet"] == 880 and state(pg) == "PLAYING", f"retry from checkpoint 5: drained, gate open, in the shallow water {st}")
    # 6. the hall flooded again from the tower: checkpoint 5 is under water now - "too deep" must not send him there
    use(pg, "MP"); settle(pg, "R")
    put(pg, 6040, 60, inv=False)
    walk(pg, until="game.spiderman.health < 5", limit=200)
    frames(pg, 10)
    t.check(hp(pg) == 4 and state(pg) == "PLAYING" and ev(pg, "game.level.waterDepthAt(game.spiderman.centerX(), game.spiderman.y + game.spiderman.bodyHeight())") <= 0,
            f"jumping into the re-flooded hall: one heart, put back on dry ground (not the drowned checkpoint) {s(pg)}")
    frames(pg, 120)
    t.check(hp(pg) == 4, "... and it does not happen again (no loop)")
    # 7. restart: every piece of state back to the start
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    t.check(full(pg) == initial and s(pg)["cp"] == -1, f"RESTART STAGE: water, power, levers, gate, rescues, rafts all back to the start {full(pg)}")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()

    # ================= touch =================
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    merrs = []; pg.on("pageerror", lambda e: merrs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900)
    f = Fingers(ctx, pg)
    ev(pg, "game.setDevMode(true)"); start33(pg)
    label = lambda: ev(pg, "document.querySelector('.is-rescue').textContent")
    put(pg, 3415, 300); frames(pg, 3)
    t.check(label() == "NO POWER", f"touch: at the unpowered transfer pump the button says NO POWER ({label()})")
    ev(pg, "game.level.setPowered('PWR2')"); frames(pg, 3)
    t.check(label() == "TRANSFER", f"touch: powered, it says TRANSFER ({label()})")
    Rb = center(pg, '.spiderman-touch-btn[data-name="rescue"]')
    f.tap(Rb[0], Rb[1]); frames(pg, 3)
    t.check(pool(pg, "BW")["state"] == "LOW" and pool(pg, "BE")["state"] == "HIGH", "touch: tapped - the water transfers")
    t.check(not merrs, f"touch: no errors {merrs}")
    b.close()

    # ================= the whole stage with real keys (route bot) =================
    b, pg, errs3 = open_page(p)
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE))
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]'); click(pg, '[data-level="3-3"]')
    ev(pg, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bots", "bot_3_3.js")).read())
    deaths = 0
    for i in range(1200):
        pg.wait_for_timeout(250)
        st = state(pg)
        if st == "COMPLETE": break
        if st == "GAMEOVER":
            deaths += 1
            cpb = pg.locator('.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
            if cpb.is_visible(): cpb.click()
            else: pg.locator('.spiderman-game-gameover-menu .spiderman-game-retry-button').click()
            ev(pg, "BOT.resume()")
    res = ev(pg, """(() => { var m = document.querySelector('.spiderman-game-complete-menu'); return { st: game.state, frames: game.levelFrames,
        rescued: m.querySelector('.spiderman-game-result-rescued').textContent, pools: game.level.poolStates(), unlock: m.querySelector('.spiderman-game-unlock-line').textContent,
        saved: game.getLevelProgress('3-3'), sandman: game.isLevelUnlocked('3-4', true) }; })()""")
    print("  ", res, "deaths:", deaths)
    t.check(res["st"] == "COMPLETE" and res["rescued"] == "4/4", f"the route bot clears the stage with all four workers ({res['frames']} frames, {deaths} deaths)")
    t.check(res["pools"] == {"IN": "HIGH", "SUMP": "LOW", "BW": "LOW", "BE": "HIGH", "R": "LOW"}, f"... having pumped the sump, transferred the basins and drained the hall {res['pools']}")
    t.check(res["saved"] and res["saved"]["completed"] and res["sandman"] and res["unlock"] == "STAGE 3-4 UNLOCKED!", "the clear is saved and the Sandman boss is unlocked")
    t.check(not errs3, f"full run: no browser errors {errs3}")
    b.close()
t.report()
