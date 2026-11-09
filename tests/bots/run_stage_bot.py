# autopilot playthrough of a World 2 / World 3 stage with real key events (the bot only presses keys - no teleporting)
#   python3 run_stage_bot.py 2-1                 play 2-1 from the start to the flag (dying = RETRY like a player)
#   python3 run_stage_bot.py 2-2 3000 9000       ... and force a death at levelFrames 3000 and 9000 (tests retry + resume)
# Exit code 0 when the stage is cleared. The bot's log goes to bots/out/bot_<stage>.log
import os, sys, time, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from harness import *
HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = sys.argv[1] if len(sys.argv) > 1 else "2-1"
BOT = open(os.path.join(HERE, "bot_" + STAGE.replace("-", "_") + ".js")).read()
BEFORE = {"2-1": ["1-1", "1-2", "1-3", "1-4"], "2-2": ["1-1", "1-2", "1-3", "1-4", "2-1"], "2-3": ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2"],
          "3-1": ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4"], "3-2": ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1"],
          "3-3": ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2"]}[STAGE]
WORLD_TAB = int(STAGE.split("-")[0]) - 1   # the level select tab of the stage's world
KILL_AT = [int(a) for a in sys.argv[2:]]
deaths = []

def run(pg, max_s):
    t0 = time.time(); last = None
    while time.time() - t0 < max_s:
        pg.wait_for_timeout(500)
        if KILL_AT and ev(pg, "game.state") == "PLAYING" and ev(pg, "game.levelFrames") >= KILL_AT[0]:
            KILL_AT.pop(0)
            print("   FORCED DEATH at x", ev(pg, "Math.round(game.spiderman.x)"))
            ev(pg, "(() => { var s = game.spiderman; s.health = 1; s.invulnerableFrames = 0; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()")
            pg.wait_for_timeout(100)
        st = ev(pg, "({st: game.state, x: Math.round(game.spiderman.x), y: Math.round(game.spiderman.y), hp: game.spiderman.health, step: BOT.step, name: (BOT.route[BOT.step]||{}).name, t: game.levelFrames, reason: game.gameoverReason})")
        if st["step"] != (last or {}).get("step") or st["hp"] != (last or {}).get("hp"): print("  ", st)
        last = st
        if st["st"] == "COMPLETE": return "COMPLETE", st
        if st["st"] == "GAMEOVER":
            # continue like a player: RETRY FROM CHECKPOINT if offered, else RESTART STAGE (real buttons)
            print("   DEATH", st["reason"], "at x", st["x"])
            deaths.append((st["reason"], st["x"]))
            cpb = pg.locator('.spiderman-game-gameover-menu .spiderman-game-checkpoint-button')
            if cpb.is_visible(): cpb.click()
            else: pg.locator('.spiderman-game-gameover-menu .spiderman-game-retry-button').click()
            pg.wait_for_timeout(50)
            ev(pg, "BOT.resume()")
    return "TIMEOUT", last

with sync_playwright() as p:
    b, pg, errs = open_page(p)
    ev(pg, json.dumps(BEFORE) + ".forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))")
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]'); click(pg, f'.spiderman-game-world-tab[data-world="{WORLD_TAB}"]'); click(pg, f'[data-level="{STAGE}"]')
    ev(pg, BOT)
    res, st = run(pg, 1200)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    open(os.path.join(HERE, "out", f"bot_{STAGE}.log"), "w").write("\n".join(ev(pg, "BOT.log")))
    rep = ev(pg, f"""({{ coins: game.coins + '/' + (game.level && game.level.totalCoins), kills: game.kills + '/' + (game.level && game.level.totalEnemies),
        time: game.levelFrames, score: game.score, saved: game.getLevelProgress('{STAGE}'),
        result: document.querySelector('.spiderman-game-complete-menu').classList.contains('is-visible') ? [...document.querySelectorAll('.spiderman-game-complete-menu .spiderman-game-panel-title, .spiderman-game-complete-menu .spiderman-game-unlock-line')].map(e => e.textContent) : null }})""")
    print(json.dumps(rep))
    print("deaths:", deaths, "errors:", errs)
    ok = res == "COMPLETE" and not errs and rep["saved"] and rep["saved"].get("completed")
    print(f"== Bot {STAGE}: {res} after {st['t'] if st else '?'} frames, {len(deaths)} deaths -> " + ("PASS" if ok else "FAIL"))
    b.close()
sys.exit(0 if ok else 1)
