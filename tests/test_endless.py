from harness import *
import sys
# python3 test_endless.py            -> the game under test
# python3 test_endless.py baseline   -> the same checks on the original game (they must pass there too)
which = sys.argv[1] if len(sys.argv) > 1 else "new"
url = BASELINE_URL if which == "baseline" else URL
t = T(f"Endless run ({which})")
with sync_playwright() as p:
    b, pg, errs = open_page(p, url=url)
    click(pg, '[data-action="endless"]')
    themes = ev(pg, "[...document.querySelectorAll('.spiderman-game-theme-list [data-action=theme]')].map(b => b.getAttribute('data-theme'))")
    t.check(themes == ["CITY", "DESERT", "BRIDGE", "BEACH", "SNOW"], f"exactly the five endless themes {themes}")
    ev(pg, "game.showMainMenu()")
    for th in themes:
        click(pg, '[data-action="endless"]'); click(pg, f'[data-theme="{th}"]')
        t.check(state(pg) == "PLAYING" and ev(pg, "game.mode") == "ENDLESS" and ev(pg, "game.zoom") == 1 and ev(pg, "game.level") is None, f"{th}: endless mode, zoom 1")
        t.check(ev(pg, "game.backdrop.theme") == th, f"{th}: backdrop")
        ev(pg, "game.spiderman.invulnerableFrames = 100000")
        pg.keyboard.down("ArrowRight")
        for i in range(200):
            pg.wait_for_timeout(20)
            if state(pg) != "PLAYING": break
            # jump near the end of the current roof (real Space key)
            near = ev(pg, """(() => { var s = game.spiderman; if (!s.onGround) return false; var r = s.x + s.bodyWidth();
                return game.scene.roofs.some(f => Math.abs(f.y - (s.y + s.bodyHeight())) < 4 && r <= f.x + f.width + 5 && f.x + f.width - r < 45); })()""")
            if near: pg.keyboard.press("Space")
            if i % 25 == 0: pg.keyboard.press("x")
        pg.keyboard.up("ArrowRight")
        st = ev(pg, "({x: game.spiderman.x, cy: game.cameraY, roofs: game.scene.roofs.length, score: game.score, dist: game.distance, state: game.state})")
        t.check(st["cy"] == 0, f"{th}: no vertical camera")
        t.check(st["dist"] > 300 and st["score"] > 0, f"{th}: distance scored {st}")
        t.check(st["roofs"] >= 2, f"{th}: roofs generated")
        if st["state"] == "PLAYING":
            pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
            t.check(state(pg) == "PAUSED" and ev(pg, "document.querySelector('.spiderman-game-pause-menu .spiderman-game-retry-button').textContent") == "RETRY RUN", f"{th}: pause shows RETRY RUN")
            t.check(ev(pg, "document.querySelector('.spiderman-game-pause-menu [data-action=level-select]').style.display") == "none", f"{th}: no level select in endless pause")
            click(pg, '.spiderman-game-pause-menu [data-action="main-menu"]')
    # spawn table: enemies appear on the random roofs as the run goes on (autopilot with god mode)
    # (a fall into a gap just starts another run: the autopilot's jump timing depends on the test machine)
    kinds = set()
    for attempt in range(4):
      ev(pg, "game.showMainMenu()")
      click(pg, '[data-action="endless"]'); click(pg, '[data-theme="CITY"]')
      pg.keyboard.down("ArrowRight")
      for i in range(900):
        pg.wait_for_timeout(20)
        if state(pg) != "PLAYING": break
        r = ev(pg, """(() => { var s = game.spiderman; s.health = 5; s.invulnerableFrames = 100;
            var names = game.scene.enemies.map(e => e.name);
            if (!s.onGround) return [false, names]; var r = s.x + s.bodyWidth();
            return [game.scene.roofs.some(f => Math.abs(f.y - (s.y + s.bodyHeight())) < 4 && r <= f.x + f.width + 5 && f.x + f.width - r < 45), names]; })()""")
        if r[0]: pg.keyboard.press("Space")
        kinds.update(r[1])
        if len(kinds) >= 3: break
      pg.keyboard.up("ArrowRight")
      if "THUG" in kinds: break
    print("   enemy kinds seen:", sorted(kinds), "distance", ev(pg, "Math.round(game.distance)"))
    t.check({"THUG"} <= kinds, "random roofs spawn thugs")
    ev(pg, "game.showMainMenu()")
    # game over + best score
    ev(pg, "game.showMainMenu()")
    click(pg, '[data-action="endless"]'); click(pg, '[data-theme="DESERT"]')
    pg.keyboard.down("ArrowRight"); pg.wait_for_timeout(1500); pg.keyboard.up("ArrowRight")
    ev(pg, "game.gameover('FELL')"); pg.wait_for_timeout(150)
    score = ev(pg, "game.score")
    gm = ev(pg, """(() => { var m = document.querySelector('.spiderman-game-gameover-menu'); return {
        title: m.querySelector('.spiderman-game-panel-title').textContent,
        dist: m.querySelector('.spiderman-game-endless-only').style.display,
        stage: m.querySelector('.spiderman-game-stage-line').style.display,
        cp: m.querySelector('.spiderman-game-checkpoint-button').style.display,
        retry: m.querySelector('.spiderman-game-retry-button').textContent,
        reason: m.querySelector('.spiderman-game-gameover-reason').textContent }; })()""")
    t.check(gm == {"title": "GAME OVER", "dist": "", "stage": "none", "cp": "none", "retry": "RETRY", "reason": "YOU FELL OFF THE ROOFTOPS"}, f"endless game over screen {gm}")
    best = int(ev(pg, "localStorage.getItem('spiderman-game-best-score')") or 0)
    t.check(best == ev(pg, "game.bestScore") and best >= score > 0, f"best score saved ({best} >= {score})")
    click(pg, '.spiderman-game-gameover-menu [data-action="retry"]')
    t.check(state(pg) == "PLAYING" and ev(pg, "game.mode") == "ENDLESS" and ev(pg, "game.score") == 0, "retry starts a new endless run")
    ev(pg, "game.showMainMenu()")
    t.check(ev(pg, "localStorage.getItem('spiderman-game-theme')") == "DESERT", "theme remembered")
    pg.reload(); pg.wait_for_timeout(500)
    t.check(ev(pg, "document.querySelector('.spiderman-game-best-score-value').textContent") == str(best), "BEST RUN on the menu after refresh")
    t.check(ev(pg, "game.campaignProgress.levels") == {}, "endless never touches campaign progress")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()
t.report()
