from harness import *
import itertools, json
t = T("World 1 behaviour vs baseline")
ids = ["1-1", "1-2", "1-3", "1-4"]
states = []
for bits in itertools.product([0, 1], repeat=4):
    for dev in (False, True):
        states.append(([i for i, b in zip(ids, bits) if b], dev))
PROBE = """(args) => {
  var done = args[0], dev = args[1];
  game.resetCampaignProgress();
  done.forEach(id => game.saveLevelProgress(id, {completed:true, score:50, time:30}));
  game.setDevMode(dev);
  game.level = null;
  game.showMainMenu(); game.handleMenuAction('campaign');
  if (game.selectCampaignWorld) game.selectCampaignWorld(0);
  var tiles = [...document.querySelectorAll('.spiderman-game-level-tile')].map(t => t.getAttribute('data-level') + ':' + t.querySelector('.spiderman-game-level-status').textContent + ':' + [...t.classList].filter(c => c !== 'is-selected').sort().join(' '));
  var unl = ['1-1','1-2','1-3','1-4'].map(id => game.isLevelUnlocked(id));
  var msgs = ['1-2','1-3','1-4'].map(id => { game.syncLevelGrid(); var ok = game.selectCampaignLevel(id); var m = document.querySelector('.spiderman-game-campaign-note').textContent; if (ok) { game.showMainMenu(); } return ok + '|' + m; });
  return { tiles: tiles, unl: unl, msgs: msgs };
}"""
CLEAR = """(id) => {
  game.resetCampaignProgress(); game.setDevMode(true);
  ['1-1','1-2','1-3'].forEach(x => { if (x < id) game.saveLevelProgress(x, {completed:true, score:1, time:1}); });
  game.setDevMode(false);
  game.startCampaignLevel(id);
  if (game.level.boss) game.level.boss.startDefeat();
  else { var s = game.spiderman, g = game.level.goal; s.x = g.x - 30; s.y = g.y - s.bodyHeight() - 2; }
  return true;
}"""
READ = """() => { var m = document.querySelector('.spiderman-game-complete-menu');
  return [m.querySelector('.spiderman-game-panel-title').textContent, m.querySelector('.spiderman-game-stage-line').textContent,
          m.querySelector('.spiderman-game-unlock-line').textContent, m.querySelector('.spiderman-game-unlock-line').style.display,
          m.querySelector('.spiderman-game-next-button').style.display, game.state]; }"""
out = {}
with sync_playwright() as p:
    for port in (8766, 8765):
        b, pg, errs = open_page(p, url=URLS[port])
        res = [pg.evaluate(PROBE, [d, dev]) for d, dev in states]
        clears = []
        for id in ids:
            pg.evaluate(CLEAR, id)
            for i in range(100):   # the boss defeat animation is counted in game frames: wait for the results screen
                pg.wait_for_timeout(100)
                if pg.evaluate("game.state") == "COMPLETE": break
            pg.wait_for_timeout(200)
            clears.append(pg.evaluate(READ))
        out[port] = (res, clears, errs)
        b.close()
base, new = out[8766], out[8765]
for (d, dev), a, bb in zip(states, base[0], new[0]):
    lab = f"{d} dev={dev}"
    t.check(a["tiles"] == bb["tiles"], f"tiles {lab}: {a['tiles']} vs {bb['tiles']}")
    t.check(a["unl"] == bb["unl"], f"unlock {lab}")
    if len(d) == 4 and not dev:
        # intended: a cleared World 1 now points to World 2 instead of "more worlds are on the way"
        t.check(all(m == 'true|World 1 cleared! WORLD 2 - OSCORP is open.' for m in bb["msgs"]), "cleared note points to world 2")
    else:
        t.check(a["msgs"] == bb["msgs"], f"messages {lab}: {a['msgs']} vs {bb['msgs']}")
for id, a, bb in zip(ids, base[1], new[1]):
    if id == "1-4":
        # intended change: World 2 now follows the boss
        print("   1-4 clear baseline:", a); print("   1-4 clear new     :", bb)
        t.check(a[0] == bb[0] and a[1] == bb[1] and a[5] == bb[5] == "COMPLETE", "1-4 title / stage line same")
    else:
        t.check(a == bb, f"{id} clear screen {a} vs {bb}")
t.check(not base[2] and not new[2], f"no browser errors {base[2]} {new[2]}")
t.report()
