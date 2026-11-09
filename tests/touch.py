# shared helpers for the touch tests: real multi-touch through the DevTools protocol
def ev(pg, js): return pg.evaluate(js)

class Fingers:
    """real touch events through the DevTools protocol (several fingers at once)"""
    def __init__(self, ctx, pg):
        self.cdp = ctx.new_cdp_session(pg); self.pts = {}
    def _send(self, kind):
        self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y, "id": i} for i, (x, y) in self.pts.items()]})
    def down(self, i, x, y):
        self.pts[i] = (x, y); self._send("touchStart")
    def move(self, i, x, y):
        self.pts[i] = (x, y); self._send("touchMove")
    def up(self, i):
        del self.pts[i]
        # DevTools touch emulation cannot lift one finger out of several reliably, so all are lifted and the
        # others put back down right away (real phones report each finger on its own)
        self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        if self.pts: self._send("touchStart")
    def tap(self, x, y, i=9):
        self.down(i, x, y); self.up(i)

def center(pg, sel):
    return ev(pg, f"(() => {{ var r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height]; }})()")

def frames(pg, n):
    f0 = ev(pg, "game.frame")
    while ev(pg, "game.frame") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

def buttons_shown(pg):
    return ev(pg, "getComputedStyle(document.querySelector('.spiderman-touch')).display !== 'none'")

def buttons(pg):
    return {n: center(pg, f'.spiderman-touch-btn[data-name="{n}"]') for n in ["up", "left", "right", "down", "jump", "web", "slide"]}
