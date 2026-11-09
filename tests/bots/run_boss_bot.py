# autopilot boss fight with real key events: 2-4 (Green Goblin, default) or 3-4 (Sandman)
#   python3 run_boss_bot.py [attempts] [--no-dodge] [--stage 3-4]
# --no-dodge: the bot never jumps over swoops / away from bombs (checks that a careless player does lose).
# Exit code 0 when the goblin is defeated (or, with --no-dodge, when the bot loses as expected).
import os, sys, time, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from harness import *
HERE = os.path.dirname(os.path.abspath(__file__))
NODODGE = "--no-dodge" in sys.argv
STAGE = sys.argv[sys.argv.index("--stage") + 1] if "--stage" in sys.argv else "2-4"
args = [a for i, a in enumerate(sys.argv[1:]) if not a.startswith("--") and sys.argv[i] != "--stage"]
attempts = int(args[0]) if args else 3
BOT = ("window.NODODGE = true;" if NODODGE else "") + open(os.path.join(HERE, "bot_" + STAGE.replace("-", "_") + ".js")).read()
ORDER = ["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2", "3-3", "3-4"]
BEFORE = ORDER[:ORDER.index(STAGE)]
BOSSNAME = {"2-4": "the goblin", "3-4": "sandman"}[STAGE]
with sync_playwright() as p:
    b, pg, errs = open_page(p)
    ev(pg, json.dumps(BEFORE) + ".forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))")
    pg.reload(); pg.wait_for_timeout(500)
    click(pg, '[data-action="campaign"]'); click(pg, f'.spiderman-game-world-tab[data-world="{int(STAGE[0]) - 1}"]'); click(pg, f'[data-level="{STAGE}"]')
    ev(pg, BOT)
    results = []
    for a in range(attempts):
        t0 = time.time(); phase2_at = None
        while time.time() - t0 < 200:
            pg.wait_for_timeout(500)
            st = ev(pg, "({st: game.state, t: game.levelFrames, hp: game.spiderman.health, web: game.spiderman.web, boss: game.level.boss ? [game.level.boss.health, game.level.boss.state, game.level.boss.phase] : null})")
            if st["boss"] and st["boss"][2] == 2 and phase2_at is None: phase2_at = st["t"]
            if st["st"] != "PLAYING": break
        r = {"attempt": a + 1, "result": st["st"], "frames": st["t"], "hp": st["hp"], "boss": st["boss"], "phase2_at": phase2_at, "stats": ev(pg, "BOSSBOT.stats")}
        results.append(r); print(json.dumps(r))
        if st["st"] == "COMPLETE":
            print("complete screen:", ev(pg, "[...document.querySelectorAll('.spiderman-game-complete-menu .spiderman-game-panel-title, .spiderman-game-complete-menu .spiderman-game-stage-line, .spiderman-game-complete-menu .spiderman-game-unlock-line')].map(e => e.textContent)"))
            break
        if st["st"] == "GAMEOVER":
            pg.locator('.spiderman-game-gameover-menu .spiderman-game-retry-button').click(); pg.wait_for_timeout(200)
            ev(pg, "Object.keys(BOSSBOT.stats).forEach(k => BOSSBOT.stats[k] = 0); BOSSBOT.hits = []; BOSSBOT.hp = undefined; BOSSBOT.bossHp = undefined")
    won = any(r["result"] == "COMPLETE" for r in results)
    saved = ev(pg, f"game.getLevelProgress('{STAGE}')")
    ok = (not won) if NODODGE else (won and saved and saved.get("completed"))
    ok = ok and not errs
    print("saved:", saved, "errors:", errs)
    print(f"== Boss bot {STAGE}{' (no dodging)' if NODODGE else ''}: " + (f"defeated {BOSSNAME}" if won else "did not win") + f" in {len(results)} attempt(s) -> " + ("PASS" if ok else "FAIL"))
    b.close()
sys.exit(0 if ok else 1)
