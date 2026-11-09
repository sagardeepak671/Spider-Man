# World 1 stage data (design, coins, enemies, roofs, pickups, checkpoints, spawn, camera, zoom) identical to the baseline
from harness import *
JS = """(() => {
  var out = {};
  var w = SpidermanGame.campaign.worlds[0];
  for (const l of w.levels) {
    game.devMode = true;
    game.startCampaignLevel(l.id);
    var lv = game.level;
    out[l.id] = { design: JSON.stringify(l.design), name: l.name, label: l.label||null, boss: !!l.boss,
      width: lv.width, coins: lv.totalCoins, enemies: lv.totalEnemies, roofs: game.scene.roofs.length,
      pickups: game.scene.pickups.length, cps: lv.checkpoints.length, spawn: [game.spiderman.x, game.spiderman.y],
      cam: [lv.cameraMinY, lv.cameraMaxY, game.cameraX, game.cameraY], zoom: game.zoom };
  }
  game.showMainMenu();
  return out;
})()"""
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for port in (8766, 8765):
        pg = b.new_page(viewport={"width": 711, "height": 400})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URLS[port]); pg.wait_for_timeout(600)
        res[port] = pg.evaluate(JS)
        print(port, "errors", errs)
    b.close()
a, bb = res[8766], res[8765]
bad = 0
for k in a:
    diff = [f for f in a[k] if a[k][f] != bb[k][f]]
    bad += 1 if diff else 0
    print(k, "IDENTICAL" if not diff else f"DIFF {diff}", a[k]["coins"], a[k]["enemies"], a[k]["width"])
print(f"== World 1 stage data vs baseline: {len(a) - bad} identical, {bad} different")
sys.exit(1 if bad else 0)
