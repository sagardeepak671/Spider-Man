# shared helpers for the World 3 suites (test_world3_rescue.py, test_stage_3_1.py): spider-man's state, placing him,
# counting game frames, walking that is stopped on the game frame (never by polling), canvas texts, dying
import json
from harness import ev, state

S = """(() => { var s = game.spiderman, l = game.level; return { x: s.x + s.bodyWidth() / 2, feet: s.y + s.bodyHeight(), g: s.onGround,
    st: game.state, saved: l ? l.rescuedCount() : null, total: l ? l.rescues.length : null,
    w: l ? l.rescues.map(r => r.id + ':' + (r.rescued ? 1 : 0)).join(' ') : '', reach: l && l.rescueInReach ? l.rescueInReach.id : null,
    open: l ? l.exitOpen() : null, cp: game.levelCheckpoint ? game.levelCheckpoint.checkpointIndex : -1 }; })()"""

HOOK = """(() => { var o = CanvasRenderingContext2D.prototype.fillText; window.TXT = []; window.TXT_ON = false;
    CanvasRenderingContext2D.prototype.fillText = function(text) { if (window.TXT_ON) TXT.push(String(text)); return o.apply(this, arguments); }; })()"""

def s(pg): return ev(pg, S)

def frames(pg, n):
    f0 = ev(pg, "game.frame")
    while ev(pg, "game.frame") < f0 + n and ev(pg, "game.state") == "PLAYING":
        pg.wait_for_timeout(16)

def put(pg, cx, surface, inv=True):
    """spider-man's center at cx, standing on the surface y, every key / motion reset, full health"""
    ev(pg, f"""(() => {{ var s = game.spiderman; s.releaseAllKeys(); if (s.climbing) s.stopClimb(0); s.swinging = null;
        s.x = {cx} - s.bodyWidth() / 2; s.y = {surface} - s.bodyHeight() - 0.5; s.velocityX = 0; s.velocityY = 0; s.momentumX = 0;
        s.invulnerableFrames = {99999 if inv else 0}; s.health = 5;
        if (game.level && game.level.safeSpots) game.level.safeSpots = []; }})()""")   # (a teleport starts a new path)
    frames(pg, 3)

def worker(pg, wid):
    return ev(pg, f"(() => {{ var r = game.level.rescues.find(r => r.id === '{wid}'); return [r.x, r.y]; }})()")

def texts(pg, n=20):
    """every text the canvas draws during the next n frames (HUD, bubbles, floating texts, flag label)"""
    ev(pg, "window.TXT = []; window.TXT_ON = true")
    frames(pg, n)
    out = ev(pg, "window.TXT_ON = false, TXT")
    return set(out)

# walking is stopped inside the page, on the game frame (never by polling from here, which overshoots under load):
# a hook in front of SpiderMan.update releases the key through the real keyup listener the frame a condition
# becomes true, or after exactly n frames with the key held
STOPPER = """(() => { if (window.__stopper) return; window.__stopper = true; window.STOP = null;
    var o = SpiderMan.prototype.update;
    SpiderMan.prototype.update = function() {
        var st = window.STOP;
        if (st && game.state === 'PLAYING' && game.spiderman.keyIsDown(st.key)) {
            var done = st.frames !== null ? --st.frames < 0 : !!st.test();
            if (done || --st.limit < 0) {
                var e = new KeyboardEvent('keyup', { bubbles: true, cancelable: true });
                Object.defineProperty(e, 'keyCode', { get: function() { return st.key; } });
                document.dispatchEvent(e);
                st.reached = done; window.STOP_DONE = st; window.STOP = null;
            }
        }
        return o.apply(this, arguments);
    }; })()"""

def walk(pg, until=None, n=None, key="ArrowRight", code=39, limit=400):
    """hold a key until the JS condition `until` is true (checked every frame) or for exactly n frames"""
    ev(pg, STOPPER)
    ev(pg, "window.STOP_DONE = null; window.STOP = { key: %d, frames: %s, test: new Function('return ' + %s), limit: %d }"
        % (code, n if n is not None else "null", json.dumps(until or "false"), limit))
    pg.keyboard.down(key)
    for i in range(2000):
        if ev(pg, "window.STOP === null || game.state !== 'PLAYING'"): break
        pg.wait_for_timeout(16)
    pg.keyboard.up(key); frames(pg, 2)
    return ev(pg, "!!(window.STOP_DONE && window.STOP_DONE.reached)")

def through_checkpoint(pg, cpx, surface=540):
    """walk through the checkpoint post with the real arrow key (15 frames: never far enough to touch a pickup behind
    it - touching a heart at 0 health would undo a forced death)"""
    put(pg, cpx - 60, surface); walk(pg, n=15)

def die(pg):
    """a hit with the last heart, then wait for the game over screen"""
    ev(pg, "(() => { var s = game.spiderman; s.invulnerableFrames = 0; s.health = 1; s.handleHitWithProjectile({ name: 'HAZARD', damage: 1 }); })()")
    for i in range(120):
        if state(pg) != "PLAYING": break
        pg.wait_for_timeout(16)
    return state(pg) == "GAMEOVER"


# jumping on the game frame (real key events): while window.AUTOJUMP is on, Space is tapped when he stands at the end of
# his platform with no platform continuing at about his height, or when he is blocked (a step up, cargo, a hull side)
JUMPER = """(() => { if (window.__jumper) return; window.__jumper = true; window.AUTOJUMP = false;
    var o = SpiderMan.prototype.update, lastX = null, stuck = 0;
    function tap(code) { ['keydown', 'keyup'].forEach(function(t) { var e = new KeyboardEvent(t, { bubbles: true, cancelable: true });
        Object.defineProperty(e, 'keyCode', { get: function() { return code; } }); document.dispatchEvent(e); }); }
    SpiderMan.prototype.update = function() {
        var s = game.spiderman;
        if (window.AUTOJUMP && game.state === 'PLAYING' && this === s && s.onGround && s.keyIsDown(39)) {
            var g = s.groundRoof, right = s.x + s.bodyWidth(), jump = false;
            if (g && g.x + g.fullWidth - right < 12) {
                var end = g.x + g.fullWidth, goesOn = false;
                game.scene.roofs.forEach(function(r) { if (r !== g && r.isSolid() && r.x <= end + 4 && r.x + r.fullWidth > end + 4 && Math.abs(r.y - g.y) <= 25) goesOn = true; });
                if (!goesOn) jump = true;
            }
            if (lastX !== null && Math.abs(s.x - lastX) < 0.5) { if (++stuck > 3) { jump = true; stuck = 0; } } else stuck = 0;
            if (jump) tap(32);
        }
        lastX = this === s ? s.x : lastX;
        return o.apply(this, arguments);
    }; })()"""

def run_right(pg, until, limit=600):
    """hold Right (jumping gaps and steps on the game frame) until the JS condition `until` is true"""
    ev(pg, JUMPER); ev(pg, "window.AUTOJUMP = true")
    ok = walk(pg, until=until, limit=limit)
    ev(pg, "window.AUTOJUMP = false")
    return ok

def sfx_spy(pg):
    """records every sound effect name in window.SFX"""
    ev(pg, "window.SFX = []; (() => { if (game.sfx.__spied) return; game.sfx.__spied = true; var o = game.sfx.play; game.sfx.play = function(n) { SFX.push(n); return o.apply(this, arguments); }; })()")

def press(pg, key, wait_frames=3):
    pg.keyboard.press(key); frames(pg, wait_frames)
