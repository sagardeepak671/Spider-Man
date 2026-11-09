#!/usr/bin/env python3
"""Runs the whole browser test battery and prints a summary.

    pip install playwright && python3 -m playwright install chromium
    python3 tests/run_all.py                # every suite + the baseline compares + the bots
    python3 tests/run_all.py --quick        # no bots, no frame compares (~5 min)
    python3 tests/run_all.py --only 2_3     # suites whose name contains "2_3"

It serves the game itself (a local http server on a free port) and, for the World 1 / endless regression
compares, the ORIGINAL game taken from git (`git archive` of the first commit, or --baseline-rev REV, or an
existing copy with --baseline-dir DIR). Every suite's output goes to tests/out/<suite>.log.
"""
import argparse, functools, http.server, os, re, shutil, socket, subprocess, sys, tempfile, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")

# (name, script + args, needs the baseline, kind)
SUITES = [
    ("campaign_flow",        ["test_campaign_flow.py"], False, "world2"),
    ("dev_mode",             ["test_dev_mode.py"], False, "world2"),
    ("world2_connect",       ["test_world2_connect.py"], False, "world2"),
    ("stage_2_1",            ["test_stage_2_1.py"], False, "world2"),
    ("stage_2_2",            ["test_stage_2_2.py"], False, "world2"),
    ("stage_2_3",            ["test_stage_2_3.py"], False, "world2"),
    ("stage_2_4_boss",       ["test_stage_2_4_boss.py"], False, "world2"),
    ("world3_rescue",        ["test_world3_rescue.py"], False, "world3"),
    ("stage_3_1",            ["test_stage_3_1.py"], False, "world3"),
    ("stage_3_2",            ["test_stage_3_2.py"], False, "world3"),
    ("stage_3_3",            ["test_stage_3_3.py"], False, "world3"),
    ("stage_3_4_boss",       ["test_stage_3_4_boss.py"], False, "world3"),
    ("mobile",               ["test_mobile.py"], False, "mobile"),
    ("mobile_world2",        ["test_mobile_world2.py"], False, "mobile"),
    ("world1_play",          ["test_world1_play.py"], False, "world1"),
    ("endless",              ["test_endless.py"], False, "endless"),
    ("endless_on_baseline",  ["test_endless.py", "baseline"], True, "endless"),
    ("world1_levels_vs_baseline", ["compare_world1_levels.py"], True, "world1"),
    ("world1_menus_vs_baseline",  ["compare_world1_menus.py"], True, "world1"),
] + [(f"frames_{s}_vs_baseline", ["compare_frames.py", s, "71", "3000"], True, "frames") for s in ["1-1", "1-2", "1-3", "1-4", "ENDLESS"]] + [
    ("bot_2_1",              ["bots/run_stage_bot.py", "2-1"], False, "bots"),
    ("bot_2_2",              ["bots/run_stage_bot.py", "2-2", "4000"], False, "bots"),
    ("bot_2_3",              ["bots/run_stage_bot.py", "2-3", "3000"], False, "bots"),
    ("bot_2_4_boss",         ["bots/run_boss_bot.py", "3"], False, "bots"),
    ("bot_3_1",              ["bots/run_stage_bot.py", "3-1"], False, "bots"),
    ("bot_3_1_retry",        ["bots/run_stage_bot.py", "3-1", "1200", "2100"], False, "bots"),
    ("bot_3_2",              ["bots/run_stage_bot.py", "3-2"], False, "bots"),
    ("bot_3_2_retry",        ["bots/run_stage_bot.py", "3-2", "1300", "2220"], False, "bots"),
    ("bot_3_3",              ["bots/run_stage_bot.py", "3-3"], False, "bots"),
    ("bot_3_3_retry",        ["bots/run_stage_bot.py", "3-3", "2300", "4300"], False, "bots"),
    ("bot_3_4_boss",         ["bots/run_boss_bot.py", "3", "--stage", "3-4"], False, "bots"),
    ("bot_3_4_no_dodge",     ["bots/run_boss_bot.py", "1", "--no-dodge", "--stage", "3-4"], False, "bots"),
    ("bot_2_4_no_dodge",     ["bots/run_boss_bot.py", "1", "--no-dodge"], False, "bots"),
]

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close(); return port

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve(directory):
    port = free_port()
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Quiet, directory=directory))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/index.html"

def baseline_copy(rev):
    """the original game from git -> a temp dir (None if git / the revision is not available)"""
    try:
        git = lambda *a: subprocess.check_output(["git", *a], cwd=GAME, stderr=subprocess.DEVNULL).decode().strip()
        prefix = git("rev-parse", "--show-prefix")
        rev = rev or git("rev-list", "--max-parents=0", "HEAD").splitlines()[-1]
        tmp = tempfile.mkdtemp(prefix="spiderman-baseline-")
        arch = subprocess.run(["git", "archive", rev, prefix or "."], cwd=git("rev-parse", "--show-toplevel"), capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", tmp], input=arch, check=True)
        path = os.path.join(tmp, prefix)
        return path if os.path.exists(os.path.join(path, "index.html")) else None
    except Exception as e:
        print("   (no baseline from git:", e, ")")
        return None

def run(suite, env, timeout):
    name, argv, _, _ = suite
    t0 = time.time()
    try:
        r = subprocess.run([sys.executable, *argv], cwd=HERE, env=env, capture_output=True, timeout=timeout)
        out, code = r.stdout.decode(errors="replace") + r.stderr.decode(errors="replace"), r.returncode
    except subprocess.TimeoutExpired as e:
        out, code = (e.stdout or b"").decode(errors="replace") + "\nTIMEOUT", -1
    open(os.path.join(OUT, name + ".log"), "w").write(out)
    summary = [l for l in out.splitlines() if l.startswith("==") or "IDENTICAL" in l or "DIFF" in l]
    return name, code, time.time() - t0, summary

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="skip the bots and the frame-exact compares")
    ap.add_argument("--only", help="run only suites whose name contains this")
    ap.add_argument("--jobs", type=int, default=3, help="browsers at once (more than ~4 makes timing checks flaky)")
    ap.add_argument("--baseline-rev", help="git revision of the original game (default: the first commit)")
    ap.add_argument("--baseline-dir", help="an existing copy of the original game instead of git")
    ap.add_argument("--timeout", type=int, default=1200)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    suites = [s for s in SUITES if not (a.quick and s[3] in ("bots", "frames")) and (not a.only or a.only in s[0])]
    env = dict(os.environ, GAME_URL=serve(GAME), PYTHONUNBUFFERED="1")
    if any(s[2] for s in suites):
        base = a.baseline_dir or baseline_copy(a.baseline_rev)
        if base: env["BASELINE_URL"] = serve(base)
        else:
            print("!! no baseline available: skipping the compares against the original game")
            suites = [s for s in suites if not s[2]]
    print(f"game: {env['GAME_URL']}" + (f"   baseline: {env['BASELINE_URL']}" if "BASELINE_URL" in env else ""))

    results = []
    with ThreadPoolExecutor(a.jobs) as pool:
        for fut in as_completed([pool.submit(run, s, env, a.timeout) for s in suites]):
            name, code, secs, summary = fut.result()
            mark = "PASS" if code == 0 else "FAIL"
            print(f"[{mark}] {name:28s} {secs:6.0f} s   " + (" | ".join(summary) if summary else ""), flush=True)
            results.append((name, code))
    failed = [n for n, c in results if c != 0]
    print(f"\n{len(results) - len(failed)}/{len(results)} suites passed" + (f" - FAILED: {', '.join(failed)} (see tests/out/<suite>.log)" if failed else ""))
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
