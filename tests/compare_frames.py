# frame-exact regression: same seeded randomness + same per-frame inputs on the baseline and the new code
#   python3 compare_frames.py <1-1|1-2|1-3|1-4|ENDLESS> <seed> <frames>
# Spider-Man's position / speed / state and the enemies are traced every frame on both; any difference is reported
# with the first frame it happens (exit code 1). Needs the baseline game at BASELINE_URL.
from harness import *
import sys, json
SETUP = """(args) => {
  var stage = args[0], seed = args[1], frames = args[2];
  function mulberry(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var inputRand = mulberry(seed * 7 + 1);
  Math.random = mulberry(seed);
  game.devMode = true;
  if (stage === 'ENDLESS') { game.setTheme('CITY'); game.startEndlessRun(); } else game.startCampaignLevel(stage);
  var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, X: 88 };
  function key(code, down) { var e = new KeyboardEvent(down ? 'keydown' : 'keyup'); Object.defineProperty(e, 'keyCode', { get: () => code }); document.dispatchEvent(e); }
  var held = {}; function hold(c, on) { if (!!held[c] !== on) { key(c, on); held[c] = on; } }
  window.TRACE = []; var f = 0;
  var orig = SpiderMan.prototype.update;
  SpiderMan.prototype.update = function() {
    if (game.state === 'PLAYING' && f < frames) {
      // mostly run right; sometimes stop / go left, jump, shoot, climb, slide
      var r = inputRand();
      if (f % 30 === 0) { var mode = inputRand(); hold(K.RIGHT, mode < 0.75); hold(K.LEFT, mode >= 0.88); }
      hold(K.SPACE, r < 0.08); hold(K.UP, inputRand() < 0.12); hold(K.X, inputRand() < 0.1); hold(K.DOWN, inputRand() < 0.02);
      this.health = 5;   // keep the run going (same on both sides)
      // rescue (same on both sides): about to fall out of the world -> back to the last ground spot
      var deathY = game.level ? game.level.deathY : game.viewHeight;
      if (this.onGround && !this.climbing) window.LASTGROUND = [this.x, this.y];
      if (this.y > deathY - 60 && window.LASTGROUND) { this.x = LASTGROUND[0] - 80; this.y = LASTGROUND[1] - 40; this.velocityY = 0; this.velocityX = 0; }
    }
    var out = orig.apply(this, arguments);
    if (f < frames) {
      var s = game.spiderman;
      TRACE.push([f, +s.x.toFixed(3), +s.y.toFixed(3), +s.velocityX.toFixed(3), +s.velocityY.toFixed(3), s.onGround ? 1 : 0, s.climbing ? 1 : 0, s.swinging ? 1 : 0, game.score, game.coins, game.kills, +game.cameraX.toFixed(2), +game.cameraY.toFixed(2), game.scene.enemies.length, game.scene.projectiles.length, game.state]);
    }
    f++;
    return out;
  };
  return true;
}"""
stage, seed, frames = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
traces = {}
with sync_playwright() as p:
    for port in (8766, 8765):
        b, pg, errs = open_page(p, url=URLS[port])
        pg.evaluate(SETUP, [stage, seed, frames])
        for i in range(400):
            pg.wait_for_timeout(250)
            n = ev(pg, "TRACE.length")
            if n >= frames or ev(pg, "game.state") not in ("PLAYING",): break
        traces[port] = ev(pg, "TRACE")
        if errs: print(port, "errors", errs)
        b.close()
a, bb = traces[8766], traces[8765]
n = min(len(a), len(bb))
diff = next((i for i in range(n) if a[i] != bb[i]), None)
maxx = max(r[1] for r in bb) if bb else 0
same = diff is None and len(a) == len(bb)
print(f"{stage} seed {seed}: frames {len(a)}/{len(bb)} max x {maxx:.0f} -> " + ("IDENTICAL" if diff is None and len(a) == len(bb) else f"DIFF at frame {diff}: {a[diff] if diff is not None else ''} vs {bb[diff] if diff is not None else ''}"))
sys.exit(0 if same else 1)
