# Stage 3-4 BOSS: SANDMAN - unlocking (3-3 -> 3-4), the arena, the sandman sprite as a giant boss, his entry, webs doing
# nothing to dry sand, the valves (reach, water, recharge), soaking (only then webs hurt, for a fixed time, then he
# dries), the sand fist (zone shown first, dodgeable, hits only inside), the ground wave (arrows first, jumpable,
# speed), contact, the one extra phase (faster, shorter wind-ups, follow-up fist, waves both ways, a heart), web
# refills, death / restart resetting the whole fight, the defeat -> WORLD 3 CLEARED + saves, touch, and the boss bot
import os, json
from harness import *
from touch import Fingers, center
from world3_helpers import *
t = T("Stage 3-4 Sandman: arena, water weakness, valves, fist + wave telegraphs, phase 2, refills, retry reset, WORLD 3 CLEARED")
BEFORE = ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2"]
B = "game.level.boss"

def boss(pg):
    return ev(pg, f"({{ hp: {B}.health, max: {B}.maxHealth, state: {B}.state, phase: {B}.phase, x: {B}.centerX(), soak: {B}.soakFrames, fists: {B}.fists.length, waves: {B}.waves.length, rise: {B}.rise }})")

def park(pg, x, extra=""):
    """sandman at center x, dry, in his WALK state but frozen in place (an instance override), no attack for a while"""
    ev(pg, f"(() => {{ var b = {B}; b.setState('WALK'); b.soakFrames = 0; b.fists = []; b.waves = []; b.waveDirs = []; b.rise = 1; b.x = {x} - b.width() / 2; b.attackTimer = 99999; b.speed = function() {{ return 0; }}; {extra} }})()")

def unfreeze(pg): ev(pg, f"delete {B}.speed")

def no_hearts(pg):
    """(a knock-back can push him onto a ledge heart, which would hide a lost heart)"""
    ev(pg, "game.scene.pickups.filter(p => p.type === 'HEALTH').forEach(p => p.remove())")

# jumps on the game frame (a real Space through the key listener) when a ground wave gets within 100 px
WAVEJUMP = """(() => { if (window.__wj) return; window.__wj = 1; var o = SpiderMan.prototype.update;
    SpiderMan.prototype.update = function() { var b = game.level && game.level.boss, s = game.spiderman;
        if (window.JUMPWAVE && this === s && s.onGround && b && b.waves && b.waves.some(w => Math.abs(w.x - s.centerX()) < 100 && (s.centerX() - w.x) * w.dir > 0)) {
            ['keydown', 'keyup'].forEach(function(t) { var e = new KeyboardEvent(t, { bubbles: true }); Object.defineProperty(e, 'keyCode', { get: () => 32 }); document.dispatchEvent(e); });
            window.JUMPWAVE = false; }
        return o.apply(this, arguments); }; })()"""

def valve(pg, vid):
    return ev(pg, f"(() => {{ var c = game.level.controls.find(c => c.id === '{vid}'); return {{ x: c.x, y: c.y, spray: c.sprayFrames, cd: c.cooldown, sx: c.spray.x, sw: c.spray.width }}; }})()")

def web_at_boss(pg):
    """a real X press facing sandman; returns his health lost"""
    ev(pg, f"game.spiderman.runningDirection = {B}.centerX() > game.spiderman.centerX() ? 1 : -1; game.spiderman.shootCooldown = 0")
    h0 = boss(pg)["hp"]; pg.keyboard.press("x"); frames(pg, 45)
    return h0 - boss(pg)["hp"]

def start34(pg):
    ev(pg, "game.startCampaignLevel('3-4'); game.introFrames = 0")
    frames(pg, 2)

def fight(pg):
    """start the stage and skip his entry"""
    start34(pg)
    ev(pg, f"{B}.rise = 1; {B}.setState('WALK'); {B}.attackTimer = 99999")
    no_hearts(pg)
    frames(pg, 2)

def hp(pg): return ev(pg, "game.spiderman.health")
LEDGE, F = 430, 540

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    pg.context.add_init_script(HOOK)

    # ================= unlocking: 3-3 -> the boss =================
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE))
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]')
    st3 = tile_status(pg)
    t.check(st3[2] == "3-3:PLAY" and st3[3] == "3-4:LOCKED:L", f"before 3-3 is cleared the Sandman tile is locked {st3}")
    click(pg, '[data-level="3-4"]')
    t.check(state(pg) == "MENU" and "locked" in note(pg), f"locked boss tile does not start: {note(pg)}")
    click(pg, '[data-level="3-3"]')
    ev(pg, "game.level.rescues.forEach(r => game.level.rescueWorker(r)); (() => { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; s.invulnerableFrames = 999; })()")
    for i in range(40):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    unlock = ev(pg, "document.querySelector('.spiderman-game-complete-menu .spiderman-game-unlock-line').textContent")
    t.check(unlock == "STAGE 3-4 UNLOCKED!" and ev(pg, "document.querySelector('.spiderman-game-next-button').style.display") == "", f"clearing 3-3: {unlock}, NEXT STAGE offered")
    click(pg, '.spiderman-game-complete-menu .spiderman-game-next-button')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == "3-4" and ev(pg, "game.introFrames") > 0, "NEXT STAGE starts the Sandman fight (STAGE 3-4 card)")

    # ================= the arena + the boss =================
    a = ev(pg, f"""(() => {{ var l = game.level, b = {B}; return {{ theme: game.backdrop.theme, width: l.width, view: game.viewWidth, cam: [l.cameraMinY, l.cameraMaxY], cps: l.checkpoints.length,
        type: b.constructor.name, name: b.bossName, hp: b.health, img: game.resources.SANDMAN ? game.resources.SANDMAN.width : 0, h: b.height(), sh: game.spiderman.bodyHeight(),
        valves: l.controls.map(c => c.kind + ':' + c.id), webs: l.pickups.filter(p => p.type === 'WEB').length, hearts: l.pickups.filter(p => p.type === 'HEALTH').length, anchors: l.anchors.length }}; }})()""")
    print("  ", a)
    t.check(a["type"] == "Sandman" and a["name"] == "SANDMAN" and a["hp"] == 48, "a Sandman boss (48 health = 24 webs) - not a normal enemy")
    t.check(a["img"] == 289 and a["h"] > 2.4 * 60, f"the repo's sandman sprite, drawn as a giant ({a['h']:.0f} px next to spider-man's 60)")
    t.check(a["width"] <= a["view"] + 1 and a["cam"][0] == a["cam"][1] and a["cps"] == 0 and a["theme"] == "HARBOR", "a one-screen arena (fixed camera, no checkpoints) at the harbour")
    t.check(a["valves"] == ["HYDRANT:VL", "HYDRANT:VR"] and a["webs"] == 2 and a["hearts"] == 2 and a["anchors"] == 2, "two valves, web canisters and hearts on the ledges, two swing hooks")
    sfx_spy(pg)
    # his entry: rising out of the sand, webs pass through him meanwhile
    t.check(boss(pg)["state"] == "ENTER" and boss(pg)["rise"] < 0.5, "ENTER: he rises out of the sand")
    put(pg, 300, F, inv=True); h0 = web_at_boss(pg)
    t.check(h0 == 0 and boss(pg)["state"] in ("ENTER", "WALK"), "webs do nothing while he rises")
    start34(pg)
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    for i in range(120):
        if boss(pg)["state"] != "ENTER": break
        frames(pg, 2)
    t.check(boss(pg)["state"] == "WALK" and boss(pg)["rise"] == 1, "then the fight starts (WALK)")
    t.check("YOU CAN'T HURT SAND, SPIDER-MAN!" in ev(pg, "window.TXT_ON = false, TXT"), "his taunt: YOU CAN'T HURT SAND, SPIDER-MAN!")

    # ================= dry sand: webs do nothing =================
    fight(pg)
    park(pg, 480); put(pg, 200, F)
    w0 = ev(pg, "game.spiderman.web")
    ev(pg, "window.TXT = []; window.TXT_ON = true"); sfx_spy(pg)
    lost = web_at_boss(pg)
    tx = ev(pg, "window.TXT_ON = false, TXT")
    t.check(lost == 0 and ev(pg, "game.spiderman.web") == w0 - 1, "a web at dry sand: no damage (the web is spent)")
    t.check("NO EFFECT - SOAK HIM FIRST!" in tx and "SAND_PUFF" in ev(pg, "SFX"), "... NO EFFECT - SOAK HIM FIRST! (a puff of sand)")
    t.check("DRY SAND" in tx, "the boss bar says DRY SAND")

    # ================= the valves =================
    vl = valve(pg, "VL")
    put(pg, vl["x"], F); frames(pg, 2)
    t.check(ev(pg, "game.level.controlInReach") is None, "the valve cannot be reached from the floor under its ledge")
    park(pg, 480)
    put(pg, vl["x"] + 10, LEDGE); frames(pg, 2)
    t.check(ev(pg, "game.level.controlInReach && game.level.controlInReach.id") == "VL" and "E  OPEN VALVE" in texts(pg, 20), "on the ledge at the valve: E  OPEN VALVE")
    sfx_spy(pg)
    press(pg, "e", 3)
    v = valve(pg, "VL")
    t.check(v["spray"] > 0 and v["cd"] > 0 and "WATER_SPRAY" in ev(pg, "SFX") and not boss(pg)["soak"], "E: water pours from the pipe (he is not under it: still dry), the valve recharges")
    press(pg, "e", 3)
    t.check("RECHARGING" in texts(pg, 5) and valve(pg, "VL")["spray"] < v["spray"], "E again while it recharges: RECHARGING, no water")
    f0 = ev(pg, "game.frame")
    for i in range(400):
        if valve(pg, "VL")["cd"] <= 0: break
        frames(pg, 4)
    cd_frames = ev(pg, "game.frame") - f0 + 6
    t.check(abs(cd_frames - ev(pg, "SpidermanGame.__boss.SANDMAN.VALVE_COOLDOWN")) < 30, f"it recharges in {cd_frames} frames (VALVE_COOLDOWN)")

    # ================= soaked: webs hurt, for a fixed time =================
    park(pg, vl["sx"])                                      # under the pipe
    ev(pg, f"{B}.fists.push({{ x: 100, surface: {LEDGE}, state: 'WARN', t: 0, windup: 56 }})")   # (a fist on its way)
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    put(pg, vl["x"] + 10, LEDGE); press(pg, "e", 4)
    tx = ev(pg, "window.TXT_ON = false, TXT")
    bs = boss(pg)
    t.check(bs["state"] == "SOAKED" and bs["soak"] > 0 and bs["fists"] == 0, f"water on him: SOAKED (the fist he was winding up crumbles) {bs}")
    t.check("SOAKED! WEB HIM NOW!" in tx and "SOAKED - HIT HIM!" in tx, "SOAKED! WEB HIM NOW! - the boss bar says SOAKED - HIT HIM!")
    lost = web_at_boss(pg)
    t.check(lost == 2, f"soaked, a web hurts him ({lost})")
    put(pg, boss(pg)["x"] - 30, F, inv=False); frames(pg, 20)
    t.check(hp(pg) == 5, "touching soaked sand does not hurt")
    soak_left = boss(pg)["soak"]
    f0 = ev(pg, "game.frame")
    for i in range(300):
        if boss(pg)["state"] != "SOAKED": break
        frames(pg, 2)
    t.check(boss(pg)["state"] == "DRY" and abs((ev(pg, "game.frame") - f0) - soak_left) < 8, f"the soak lasts its time, then he dries out ({ev(pg, 'game.frame') - f0} frames)")
    for i in range(60):
        if boss(pg)["state"] != "DRY": break
        frames(pg, 2)
    ev(pg, f"{B}.attackTimer = 99999")
    put(pg, 200, F); lost = web_at_boss(pg)
    t.check(boss(pg)["state"] == "WALK" and lost == 0, "dry again: back to walking, webs do nothing")
    # touching dry sand hurts
    park(pg, 480); put(pg, 480, F, inv=False); frames(pg, 5)
    t.check(hp(pg) == 4, "touching dry sand costs a heart")

    # ================= the sand fist =================
    fight(pg)
    park(pg, 600)
    put(pg, 100, LEDGE, inv=False)
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    ev(pg, f"{B}.attackTimer = 1"); frames(pg, 4)
    tx = ev(pg, "window.TXT_ON = false, TXT")
    bs = boss(pg)
    fist = ev(pg, f"(() => {{ var f = {B}.fists[0]; return f ? {{ x: f.x, surface: f.surface, state: f.state, windup: f.windup }} : null; }})()")
    t.check(bs["state"] == "FIST" and fist and abs(fist["x"] - 100) < 6 and fist["surface"] == LEDGE and fist["state"] == "WARN", f"up on a ledge he picks the fist, aimed at him, on the ledge {fist}")
    t.check("SAND FIST!" in tx, "SAND FIST! (a blinking red zone and a growing shadow where it will land)")
    # stay inside: one heart at the slam, not before
    frames(pg, fist["windup"] - 10)
    t.check(hp(pg) == 5 and boss(pg)["fists"] == 1, f"the zone is shown for {fist['windup']} frames before anything happens")
    frames(pg, 30)
    t.check(hp(pg) == 4, "staying in the zone: the fist slams, one heart")
    # step out: no damage
    park(pg, 600); put(pg, 100, LEDGE, inv=False)
    ev(pg, f"{B}.attackTimer = 1"); frames(pg, 4)
    walk(pg, until="game.spiderman.centerX() > 195", limit=60)     # to the ledge's inner end (the 80 px gap before him)
    frames(pg, 70)
    t.check(hp(pg) == 5 and ev(pg, f"{B}.fists.every(f => f.state !== 'WARN' && f.state !== 'DROP')"), "stepping out of the zone: the fist slams next to him and misses")
    # on the floor the fist follows him there
    park(pg, 600); put(pg, 300, F, inv=False)
    ev(pg, f"{B}.lastAttack = 'WAVE'; {B}.lastAttack2 = 'FIST'; window.__realRandom = window.__realRandom || Math.random; Math.random = () => 0.1; {B}.attackTimer = 1"); frames(pg, 4)
    fist = ev(pg, f"(() => {{ var f = {B}.fists[0]; return f ? {{ x: f.x, surface: f.surface }} : null; }})()")
    t.check(fist and fist["surface"] == F and abs(fist["x"] - 300) < 6, f"on the floor the fist comes down on the floor {fist}")
    ev(pg, "Math.random = window.__realRandom || Math.random")

    # ================= the ground wave =================
    fight(pg)
    ev(pg, "(() => { if (window.__wa) return; window.__wa = 1; var o = Sandman.prototype.releaseWaves; Sandman.prototype.releaseWaves = function() { window.WAVE_AT = this.stateFrames; return o.apply(this, arguments); }; })()")
    park(pg, 600)
    put(pg, 250, F, inv=False)
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    ev(pg, f"window.__realRandom = window.__realRandom || Math.random; Math.random = () => 0.1; {B}.lastAttack = 'FIST'; {B}.lastAttack2 = 'WAVE'; {B}.attackTimer = 1"); frames(pg, 3)
    ev(pg, "Math.random = window.__realRandom || Math.random")
    tx = ev(pg, "window.TXT_ON = false, TXT")
    t.check(boss(pg)["state"] == "WAVE" and ev(pg, f"{B}.waveDirs.join()") == "-1", "on the floor: a ground wave toward him (arrows on the floor meanwhile)")
    t.check("GROUND WAVE - JUMP!" in tx, "GROUND WAVE - JUMP!")
    ww = ev(pg, f"{B}.waveWindup()")
    for i in range(60):
        if boss(pg)["waves"] > 0: break
        frames(pg, 1)
    t.check(ev(pg, "window.WAVE_AT") == ww, f"the crouch (arrows on the floor) lasts {ww} frames before the wave rolls out ({ev(pg, 'window.WAVE_AT')})")
    x0, f0 = ev(pg, f"{B}.waves[0].x"), ev(pg, "game.frame")
    frames(pg, 20)
    speed = (x0 - ev(pg, f"{B}.waves.length ? {B}.waves[0].x : 0")) / (ev(pg, "game.frame") - f0)
    t.check(abs(speed - 5) < 0.3, f"it rolls along the floor at {speed:.2f} px / frame")
    for i in range(100):
        if boss(pg)["waves"] == 0: break
        frames(pg, 2)
    t.check(hp(pg) == 4, "standing still: the wave costs a heart")
    # jump it
    park(pg, 600); put(pg, 250, F, inv=False)
    ev(pg, f"window.__realRandom = window.__realRandom || Math.random; Math.random = () => 0.1; {B}.lastAttack = 'FIST'; {B}.lastAttack2 = 'WAVE'; {B}.attackTimer = 1"); frames(pg, 3)
    ev(pg, "Math.random = window.__realRandom || Math.random")
    ev(pg, WAVEJUMP); ev(pg, "window.JUMPWAVE = true")
    for i in range(200):
        if boss(pg)["waves"] == 0 and not ev(pg, "window.JUMPWAVE"): break
        frames(pg, 2)
    t.check(hp(pg) == 5 and not ev(pg, "window.JUMPWAVE"), "jumping over the wave (a real Space as it comes): no damage")

    # ================= the one extra phase =================
    fight(pg)
    park(pg, vl["sx"]); put(pg, vl["x"] + 10, LEDGE); press(pg, "e", 4)
    ev(pg, f"{B}.health = 21")
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    web_at_boss(pg)
    tx = ev(pg, "window.TXT_ON = false, TXT")
    bs = boss(pg)
    t.check(bs["phase"] == 2 and bs["hp"] == 19 and "SANDMAN IS FURIOUS!" in tx, f"below 40 %: SANDMAN IS FURIOUS! (phase 2) {bs}")
    t.check(ev(pg, "game.scene.pickups.filter(p => p.type === 'HEALTH').length") == 1, "... and a heart drops for the last round")
    unfreeze(pg)
    t.check(ev(pg, f"[{B}.speed(), {B}.fistWindup(), {B}.waveWindup(), {B}.attackInterval(), {B}.waveSpeed()]") == [1.1 * 1.45, 42, 34, 60, 6.2], "faster walk, shorter (still visible) wind-ups, shorter pauses, faster waves")
    ev(pg, f"{B}.health = 2")
    t.check(ev(pg, f"{B}.phase") == 2, "no further phases (phase 2 is the last)")
    park(pg, 600, "b.phase = 2;"); put(pg, 300, F)
    ev(pg, f"window.__realRandom = window.__realRandom || Math.random; Math.random = () => 0.1; {B}.lastAttack = 'FIST'; {B}.lastAttack2 = 'WAVE'; {B}.attackTimer = 1"); frames(pg, 3)
    ev(pg, "Math.random = window.__realRandom || Math.random")
    t.check(ev(pg, f"{B}.waveDirs.join()") == "-1,1", "phase 2: waves both ways")
    park(pg, 600, "b.phase = 2;"); put(pg, 100, LEDGE)
    ev(pg, f"{B}.attackTimer = 1"); frames(pg, 4)
    walk(pg, until="game.spiderman.centerX() > 195", limit=60)
    for i in range(60):
        if ev(pg, f"{B}.fists.length") >= 2: break
        frames(pg, 1)
    f2 = ev(pg, f"{B}.fists.map(f => [Math.round(f.x), f.state, f.windup])")
    t.check(len(f2) == 2 and f2[1][1] == "WARN" and abs(f2[1][0] - ev(pg, "game.spiderman.centerX()")) < 8 and f2[1][2] == 32, f"phase 2: a second fist follows, aimed where he is now (its own 32 frame warning) {f2}")

    # ================= web refills =================
    fight(pg)
    park(pg, 600); put(pg, 300, F)
    ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB').forEach(p => p.remove()); game.spiderman.web = 10")
    f0 = ev(pg, "game.frame")
    for i in range(200):
        if ev(pg, "game.scene.pickups.some(p => p.type === 'WEB')"): break
        frames(pg, 2)
    t.check(ev(pg, "game.scene.pickups.some(p => p.type === 'WEB')") and ev(pg, "game.frame") - f0 < 170, f"low on web (10) with no canister around: one drops ({ev(pg, 'game.frame') - f0} frames)")
    ev(pg, "game.scene.pickups.filter(p => p.type === 'WEB').forEach(p => p.remove()); game.spiderman.web = 0")
    f0 = ev(pg, "game.frame")
    for i in range(100):
        if ev(pg, "game.scene.pickups.some(p => p.type === 'WEB')"): break
        frames(pg, 2)
    t.check(ev(pg, "game.frame") - f0 < 60, f"an empty tank: within a second ({ev(pg, 'game.frame') - f0} frames)")

    # ================= death / restart reset the whole fight =================
    fight(pg)
    park(pg, vl["sx"]); put(pg, vl["x"] + 10, LEDGE); press(pg, "e", 4)
    ev(pg, f"{B}.health = 10; {B}.phase = 2; game.spiderman.web = 3; game.scene.pickups.filter(p => p.type !== 'COIN').forEach(p => p.remove())")
    ev(pg, f"{B}.fists.push({{ x: 300, surface: {F}, state: 'WARN', t: 0, windup: 56 }})")
    t.check(die(pg), "death in the middle of the fight")
    t.check(ev(pg, "document.querySelector('.spiderman-game-checkpoint-button').style.display") == "none", "no checkpoint in a boss fight: RESTART STAGE")
    click(pg, '.spiderman-game-gameover-menu .spiderman-game-retry-button')
    fresh = ev(pg, f"""(() => {{ var b = {B}, l = game.level; return {{ hp: b.health, state: b.state, phase: b.phase, soak: b.soakFrames, fists: b.fists.length, waves: b.waves.length,
        valves: l.controls.map(c => c.cooldown + '/' + c.sprayFrames).join(), webs: game.scene.pickups.filter(p => p.type === 'WEB').length, hearts: game.scene.pickups.filter(p => p.type === 'HEALTH').length,
        me: [game.spiderman.health, game.spiderman.web], bombs: game.scene.projectiles.length }}; }})()""")
    t.check(fresh == {"hp": 48, "state": "ENTER", "phase": 1, "soak": 0, "fists": 0, "waves": 0, "valves": "0/0,0/0", "webs": 2, "hearts": 2, "me": [5, 50], "bombs": 0}, f"RESTART: a fresh fight (48 health, entering, phase 1, valves ready, pickups back, full hearts / web) {fresh}")
    ev(pg, f"{B}.rise = 1; {B}.setState('WALK'); {B}.health = 7; {B}.phase = 2")
    pg.keyboard.press("Escape"); click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
    t.check(boss(pg)["hp"] == 48 and boss(pg)["phase"] == 1 and boss(pg)["state"] == "ENTER", "RESTART STAGE from the pause menu: a fresh fight too")

    # ================= the defeat: WORLD 3 CLEARED =================
    fight(pg)
    park(pg, vl["sx"]); put(pg, vl["x"] + 10, LEDGE); press(pg, "e", 4)
    ev(pg, f"{B}.health = 2")
    ev(pg, f"{B}.fists.push({{ x: 600, surface: {F}, state: 'WARN', t: 0, windup: 56 }}); {B}.waves.push({{ x: 700, dir: 1, speed: 5 }})")
    ev(pg, f"game.spiderman.runningDirection = 1; game.spiderman.shootCooldown = 0"); pg.keyboard.press("x"); frames(pg, 45)
    bs = boss(pg)
    t.check(bs["state"] == "DEFEATED" and bs["hp"] == 0 and bs["fists"] == 0 and bs["waves"] == 0, f"the last web: he melts into wet sand, his fist and wave crumble {bs}")
    t.check(ev(pg, "game.kills") >= 1 and ev(pg, "game.score") >= 500, "+500 points")
    for i in range(80):
        pg.wait_for_timeout(100)
        if state(pg) == "COMPLETE": break
    res = ev(pg, "[...document.querySelectorAll('.spiderman-game-complete-menu .spiderman-game-panel-title, .spiderman-game-complete-menu .spiderman-game-stage-line, .spiderman-game-complete-menu .spiderman-game-unlock-line')].map(e => e.textContent)")
    t.check(res == ["WORLD 3 CLEARED!", "BOSS DEFEATED - SANDMAN", "SANDMAN IS WASHED UP - EVERY STAGE OF WORLD 3 IS YOURS"], f"WORLD 3 CLEARED! {res}")
    t.check(ev(pg, "document.querySelector('.spiderman-game-next-button').style.display") == "none", "the last stage of the last world: no NEXT button")
    t.check(ev(pg, "game.isLevelCompleted('3-4') && game.isWorldCleared(2)"), "saved: 3-4 cleared, world 3 cleared")
    click(pg, '.spiderman-game-complete-menu [data-action="level-select"]')
    tabs = ev(pg, "[...document.querySelectorAll('.spiderman-game-world-tab')].map(t => t.className)")
    t.check(tile_status(pg)[3].startswith("3-4:CLEARED") and "is-world-cleared" in tabs[2], f"level select: the boss tile cleared, the WORLD 3 tab checked {tile_status(pg)}")
    t.check(note(pg) == "World 3 cleared! More worlds are on the way." and badge(pg) == "12/12", f"'{note(pg)}', badge {badge(pg)}")
    pg.reload(); pg.wait_for_timeout(500)
    t.check(badge(pg) == "12/12" and ev(pg, "game.isWorldCleared(0) && game.isWorldCleared(1) && game.isWorldCleared(2)"), "after a refresh: 12/12, every world cleared")
    click(pg, '[data-action="campaign"]'); click(pg, '[data-level="3-4"]')
    t.check(boss(pg)["hp"] == 48 and boss(pg)["state"] == "ENTER", "replaying the boss: a fresh fight")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()

    # ================= touch =================
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["Pixel 7 landscape"]); pg = ctx.new_page()
    merrs = []; pg.on("pageerror", lambda e: merrs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900)
    f = Fingers(ctx, pg)
    ev(pg, "game.setDevMode(true)"); fight(pg)
    label = lambda: ev(pg, "document.querySelector('.is-rescue').textContent")
    park(pg, 330); put(pg, 70, LEDGE); frames(pg, 3)
    t.check(label() == "VALVE", f"touch: at a valve the button says VALVE ({label()})")
    Rb = center(pg, '.spiderman-touch-btn[data-name="rescue"]')
    f.tap(Rb[0], Rb[1]); frames(pg, 4)
    t.check(boss(pg)["state"] == "SOAKED" and label() == "WAIT", f"touch: tapped - he is soaked, the button says WAIT while it recharges ({label()})")
    ev(pg, "game.spiderman.runningDirection = 1; game.spiderman.shootCooldown = 0")
    W = center(pg, '.spiderman-touch-btn[data-name="web"]')
    h0 = boss(pg)["hp"]; f.tap(W[0], W[1]); frames(pg, 45)
    t.check(boss(pg)["hp"] == h0 - 2, "touch: WEB tapped - he loses health")
    t.check(not merrs, f"touch: no errors {merrs}")
    b.close()

    # ================= the whole fight with real keys (boss bot) =================
    b, pg, errs3 = open_page(p)
    ev(pg, "%s.forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))" % json.dumps(BEFORE + ["3-3"]))
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]'); click(pg, '[data-level="3-4"]')
    ev(pg, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bots", "bot_3_4.js")).read())
    for i in range(600):
        pg.wait_for_timeout(250)
        if state(pg) != "PLAYING": break
    res = ev(pg, "({ st: game.state, frames: game.levelFrames, hp: game.spiderman.health, stats: BOSSBOT.stats, title: document.querySelector('.spiderman-game-complete-menu .spiderman-game-panel-title').textContent })")
    print("  ", res)
    t.check(res["st"] == "COMPLETE" and res["title"] == "WORLD 3 CLEARED!", f"the boss bot (real keys: valve, webs, dodges) beats him ({res['frames']} frames, {res['stats']['soaks']} soaks)")
    t.check(not errs3, f"boss bot: no browser errors {errs3}")
    b.close()
t.report()
