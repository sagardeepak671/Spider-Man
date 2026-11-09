from harness import *
t = T("World 1 stages still play")
with sync_playwright() as p:
    b, pg, errs = open_page(p)
    ev(pg, "['1-1','1-2','1-3'].forEach(id => game.saveLevelProgress(id, {completed:true, score:1, time:1}))")
    for id in ["1-1", "1-2", "1-3", "1-4"]:
        ev(pg, "game.showMainMenu()")
        click(pg, '[data-action="campaign"]')
        click(pg, '.spiderman-game-world-tab[data-world="0"]')
        click(pg, f'[data-level="{id}"]')
        t.check(state(pg) == "PLAYING" and ev(pg, "game.level.id") == id, f"{id} starts from its tile")
        x0 = ev(pg, "game.spiderman.x")
        pg.keyboard.down("ArrowRight")
        for i in range(12):
            pg.wait_for_timeout(250)
            if i % 3 == 0: pg.keyboard.press("Space")
            if i % 2 == 0: pg.keyboard.press("x")
        pg.keyboard.up("ArrowRight")
        t.check(state(pg) in ("PLAYING", "GAMEOVER"), f"{id} still running ({state(pg)})")
        t.check(ev(pg, "game.spiderman.x") > x0 + 100, f"{id} Spider-Man moved right")
        if state(pg) == "PLAYING":
            pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
            t.check(state(pg) == "PAUSED" and "STAGE " + id in ev(pg, "document.querySelector('.spiderman-game-pause-menu').textContent"), f"{id} pause")
            click(pg, '.spiderman-game-pause-menu [data-action="retry"]')
            t.check(state(pg) == "PLAYING" and abs(ev(pg, "game.spiderman.x") - x0) < 1, f"{id} restart stage")
        if id == "1-4":
            # real fight for a few seconds: the boss acts, webs hit him
            h0 = ev(pg, "game.level.boss.health")
            hit = False
            for i in range(30):
                # line up with him (webs fly straight) and face him, then shoot with the real key
                ev(pg, """(() => { var s = game.spiderman, m = game.level.boss; s.invulnerableFrames = 60;
                    var left = m.centerX() > 700; s.x = m.centerX() + (left ? -260 : 260); s.y = m.centerY() - s.bodyHeight() / 2 - 10; s.velocityY = 0;
                    s.runningDirection = left ? 1 : -1; })()""")
                pg.keyboard.press("x"); pg.wait_for_timeout(200)
                if ev(pg, "game.level && game.level.boss ? game.level.boss.health : 0") < h0: hit = True; break
            t.check(hit, "Mysterio takes web damage")
    ev(pg, "game.showMainMenu()")
    print("errors:", errs); t.check(not errs, "no browser errors")
    b.close()
t.report()
