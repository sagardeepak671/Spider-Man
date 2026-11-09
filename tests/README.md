# Tests

Browser tests for the campaign (World 1, World 2 and the World 3 rescue system), the touch controls and the endless run. They drive the real
page in headless Chromium with real key / mouse / touch events.

```sh
pip install -r tests/requirements.txt
python3 -m playwright install chromium
python3 tests/run_all.py             # everything, ~15 min
python3 tests/run_all.py --quick     # without the bots and frame compares
python3 tests/run_all.py --only boss # suites whose name contains "boss"
```

`run_all.py` starts a local web server for the game and one for the **original game** (taken from git with
`git archive` of the first commit, i.e. before World 2) for the regression compares. Logs: `tests/out/<suite>.log`.

Run one script by hand (from this folder) against a server you started yourself:

```sh
python3 -m http.server 8765 --bind 127.0.0.1          # in the game folder
GAME_URL=http://127.0.0.1:8765/index.html python3 test_stage_2_2.py
```

| File | What |
|---|---|
| `harness.py`, `touch.py` | shared helpers (check counter, page setup, multi-touch through the DevTools protocol) |
| `test_campaign_flow.py`, `test_dev_mode.py`, `test_world2_connect.py` | world tabs, unlocking, saves, dev mode, old saves, stage to stage flow |
| `test_stage_2_1.py` ... `test_stage_2_4_boss.py` | each World 2 stage: structure, mechanics, puzzle, checkpoints, death / retry, completion |
| `test_world3_rescue.py` | World 3: unlocking after 2-4, rescue (E + touch RESCUE button), exit lock, HUD counter, checkpoints / retry, saves, dev mode |
| `test_stage_3_1.py` | Harbour Docks: water, the two hidden workers, marked ropes + dropping cargo, checkpoints with cut ropes, touch WEB, full run by the bot |
| `test_stage_3_2.py` | Flooded Sewers: water levels, wading, too deep, pumps / valves, the raft, rescues, checkpoints with water levels, touch label, full run by the bot |
| `test_stage_3_3.py` | Pump Station: unlocking (3-3, the Sandman boss), powered controls, the transfer pump, the four rescues, moving platforms, checkpoints restoring water + power + gates + rescues together, touch labels, full run by the bot |
| `test_stage_3_4_boss.py` | Sandman: water weakness (valves, soaking), telegraphed fist + wave, phase 2, web refills, death / restart reset, WORLD 3 CLEARED + saves, touch, the boss bot |
| `world3_helpers.py` | shared World 3 helpers: walking / jumping stopped on the game frame (never by polling), canvas texts, sound spy |
| `test_mobile.py`, `test_mobile_world2.py` | phone layouts and touch controls (World 1 and World 2) |
| `test_world1_play.py`, `test_endless.py [baseline]` | World 1 and the endless run still work |
| `compare_world1_levels.py`, `compare_world1_menus.py`, `compare_frames.py` | World 1 / endless compared with the original game (data, menus, frame-exact traces) |
| `bots/run_stage_bot.py <2-1\|2-2\|2-3\|3-1\|3-2\|3-3> [death frames]`, `bots/run_boss_bot.py [attempts] [--no-dodge] [--stage 3-4]` | autopilots that play a whole stage / the boss fight with real key events |

Timing: the game does **one update per animation frame** (no time step), so every speed / distance check counts
**game frames** (`game.levelFrames`, or an update hook that records each frame), never wall-clock time, and a
helper like `put()` resets Spider-Man completely (keys, slide dash, climbing, swinging) before the next check. To
shake out timing assumptions run a suite at another frame rate:

```sh
GAME_FPS=30  python3 test_stage_2_1.py     # or 120 (like a 120 Hz screen)
BROWSER_ARGS="--disable-frame-rate-limit --disable-gpu-vsync" python3 test_stage_2_1.py   # several hundred fps
```

Every script exits with code 1 when a check fails. More than ~4 browsers at once makes the timing checks flaky.
