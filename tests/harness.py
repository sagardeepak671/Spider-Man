# shared helpers for the browser tests (Python Playwright + Chromium)
#   GAME_URL      the game under test   (default http://127.0.0.1:8765/index.html)
#   BASELINE_URL  the original game, for the World 1 / endless regression compares (default port 8766)
#   BROWSER_ARGS  extra Chromium flags, e.g. "--disable-frame-rate-limit --disable-gpu-vsync" to run the game at
#                 several hundred frames per second (a quick way to shake out timing assumptions in a test)
#   GAME_FPS      run the game's frame loop at this rate instead of the display's (e.g. 30 or 120, like a 120 Hz
#                 screen): the game does one update per animation frame, so tests must count game frames, not time
# run_all.py starts both servers itself and sets these.
import json, os, sys
from playwright.sync_api import sync_playwright
URL = os.environ.get("GAME_URL", "http://127.0.0.1:8765/index.html")
BASELINE_URL = os.environ.get("BASELINE_URL", "http://127.0.0.1:8766/index.html")
URLS = {8766: BASELINE_URL, 8765: URL}   # the compare scripts key their results by these two "ports"
class T:
    def __init__(self, name):
        self.name = name; self.passed = 0; self.failed = []
    def check(self, cond, label):
        if cond: self.passed += 1
        else: self.failed.append(label); print("   FAIL:", label)
    def report(self):
        print(f"== {self.name}: {self.passed} passed, {len(self.failed)} failed")
        sys.stdout.flush()
        if self.failed: sys.exit(1)
        return True
def open_page(p, url=URL, clear=True):
    b = p.chromium.launch(args=os.environ.get("BROWSER_ARGS", "").split())
    ctx = b.new_context(viewport={"width": 711, "height": 400})
    if os.environ.get("GAME_FPS"):
        ctx.add_init_script("""(() => { var step = 1000 / %s, next = 0;
            window.requestAnimationFrame = function(cb) { var now = performance.now(); next = Math.max(now, next + step);
                return setTimeout(function() { cb(performance.now()); }, next - now); }; })()""" % float(os.environ["GAME_FPS"]))
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    pg.goto(url); pg.wait_for_timeout(500)
    if clear:
        pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(500)
    return b, pg, errs
def ev(pg, js): return pg.evaluate(js)
def click(pg, sel):
    pg.locator(sel).first.click(); pg.wait_for_timeout(120)
def tile_status(pg):
    return ev(pg, """[...document.querySelectorAll('.spiderman-game-level-tile')].map(t => t.getAttribute('data-level') + ':' + t.querySelector('.spiderman-game-level-status').textContent + (t.classList.contains('is-locked') ? ':L' : ''))""")
def note(pg): return ev(pg, "document.querySelector('.spiderman-game-campaign-note').textContent")
def badge(pg): return ev(pg, "document.querySelector('.spiderman-game-campaign-badge').textContent")
def state(pg): return ev(pg, "game.state")
def total(pg): return ev(pg, "game.getAllCampaignLevels().length")   # stages of every world (badge "n/total")
