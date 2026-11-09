# Spider-Man: Rooftop Run

A browser game built with HTML5 Canvas, CSS, and JavaScript. No build step, no dependencies.

**Live Demo:** [https://sagardeepak671.github.io/Spider-Man/](https://sagardeepak671.github.io/Spider-Man/)

This deployment uses the updated `feature/Campaign-Mode` branch and includes the multi-world campaign.

## Run locally

Open `index.html` in a desktop browser, or serve this directory with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://127.0.0.1:8000 in your browser. The game scales itself to fill the browser window
(press **F** or use the FULLSCREEN button for real full screen).

## Game flow

- **Main menu**: Endless Run, Campaign (with a cleared-stages badge), Controls, **Dev Mode** toggle (every campaign
  stage - also future ones - is open in the level select for testing; progress still saves normally; remembered),
  sound / music / fullscreen toggles, best run.
- **Endless Run** first asks for a **theme** (City Night, Desert Mountains, Bridge & Train, Sunny Beach, Snow Peaks);
  the last choice is remembered and also used behind the main menu.
- **Campaign**: level select with one tab per world - **World 1 - Downtown** (1-1, 1-2, 1-3, boss), **World 2 -
  Oscorp** (2-1, 2-2, 2-3, boss) and **World 3 - Harbour** (3-1 Harbour Docks, 3-2 Flooded Sewers, 3-3 Pump
  Station, boss: Sandman). Only 1-1 is open at first; clearing a stage unlocks the next one, beating a world's
  boss opens the next world, and the progress is saved (`localStorage`). See [Campaign](#campaign) below.
- **Pause** with `Esc` or the `II` button on the HUD: Resume, Retry Run / Restart Stage, Level Select (campaign),
  Main Menu, Sound, Music, Fullscreen.
- **Game over / results**: reason, final score, distance (m) / coins / enemies with their points, best score,
  Retry and Main Menu (campaign: Retry from checkpoint when one was reached, Restart Stage, Level Select, Main Menu;
  no distance points or best run).
- **Stage clear** (campaign): score, time, coins and enemies out of the stage totals, "new stage best", what got
  unlocked, Next Stage (when it exists), Replay Stage, Level Select, Main Menu. Beating a boss shows
  **WORLD N CLEARED!** instead, with a **Next World** button when the next world has a playable first stage.
- All menus work with mouse, keyboard (Up / Down, Enter or Space, Esc to go back) or touch.
- **Music** is started as soon as the game has loaded. Most browsers do not allow sound before the first interaction
  with a page: then the main menu says *CLICK OR PRESS ANY KEY* (*TAP ANYWHERE* on phones) *TO START THE MUSIC* and
  the very first click, tap or key press anywhere starts it (modifier keys like Shift alone do not count for the
  browser). Nothing errors if it is blocked; with MUSIC: OFF there is no hint.
- **Phones / tablets** - the game fits the screen in both orientations. Held **sideways** it fills the height (some
  room is kept at both sides for the buttons); held **upright** it sits at the top, the touch buttons get the space
  under it (nothing of the game is covered) and a line suggests turning the phone. **FULLSCREEN** works on phones
  that support it (Android Chrome: it also tries to lock landscape); where the browser has no full screen (iPhone
  Safari) the button is hidden - *Add to Home Screen* gives a full screen web app there. No pinch / double tap zoom.
- **Touch buttons** (only while playing, only on touch devices - a desktop with a mouse never shows them): a
  d-pad on the left (`<` `>` move, `^` climb / doors / jump, `v` climb down / slide) and on the right a big **JUMP**
  (also shoots the web to a swing hook in the air and lets go), **WEB** and **SLIDE**, plus **RESCUE** (= `E`) in stages
  with trapped workers only (it glows green while a worker is within reach). **Pause** is the `II` button
  of the HUD (a bigger touch area on phones). Several fingers at once work (hold a direction while jumping or
  shooting) and a finger can slide from one button to the next. The buttons press the same keys as the keyboard,
  stage hints name the buttons instead of keys, and the CONTROLS panel shows the touch buttons. Buttons are at
  least 48 px, semi-transparent, in the bottom corners, never over the HUD.

## Controls

| Key | Action |
|---|---|
| Left / Right | move. Walking left also scrolls the camera back up to ~450 px (handy when fighting) |
| Up or Space | jump |
| Down (tap) | short slide dash (~0.4 s, fixed length, small cooldown). It does **not** dodge projectiles |
| X | shoot web (range ~ one screen, short cooldown, costs 1 web fluid; empty = cannot shoot until a refill) |
| Esc / HUD `II` button | pause / resume |
| F | toggle full screen |

Campaign only (see [Campaign](#campaign)):

| Key | Action |
|---|---|
| Up / Down at a ladder, drainpipe, pole, rope or tall fence | grab and climb (Down at the top climbs down onto it). Climbing past the top hops onto the roof / over the fence |
| Space while climbing | jump off the surface (a held direction pushes him that way). Up never jumps off |
| Space (or Up) in the air near a web anchor | shoot a web and swing. Space again lets go (with the swing's momentum), Down drops |
| Up in front of a door | step through it (short fade) |
| E next to a trapped worker (World 3) | free him (touch: the **RESCUE** button) |
| Walk into / jump over a switch lever | flip it |
| Esc, then *Retry from checkpoint* / *Restart stage* / *Level select* | continue, start over, or leave (progress is kept) |

## Campaign

The campaign plays **fixed, hand designed stages** that are completely separate from the random endless rooftops.
Worlds and stages live in `campaign-levels.js` (loaded after the engine) and are registered with
`SpidermanGame.campaign.addWorld({...})`. The engine side is `CampaignLevel` (builds a stage from its data and runs
its objects), `LevelBuilder` (readable helpers to write a stage), `LevelGoal` (the flag) and the
`startCampaignLevel` / `completeLevel` flow in `spiderman-game.js`.

**World 1 - Downtown**:
- `1-1 Rookie Rooftops` (~32 000 px): main street, an underpass with a switch, a rooftop run with web swings, Venom's
  street, the keycard tower, back alleys, a warehouse yard, the upper town rooftops and the finale on the police
  station roof.
- `1-2 High Steel` (~22 700 px, much more vertical): a construction site at dusk - scaffold towers with poles, half
  built skeleton buildings whose floors you jump up through, ropes, crane girders that carry you over the foundation
  pit, sparking junction boxes and rebar, a lift, and **two power switches** (one on a shed roof, one down in a pit)
  that must both be on before the lift up the tower core to the high-steel finale works.
- `1-3 Mysterio's Warehouse` (~23 600 px, exploration + puzzle): foggy docks, two ways into the warehouse (front door
  or the pipe to the skylight), a storage hall and catwalk offices connected by **doors**, and Mysterio's tricks:
  walls and planks that are not there (they give off green static every couple of seconds), fake doors (their lamp
  flickers; real doors glow a steady green) that drop you back where you came from, planks that crumble, patrol
  drones and flickering holograms. The two **projector cores** - one behind a fake wall downstairs, one in the
  upstairs office - open the projector gate to the illusion wing, the rooftops and the shipyard with the boss door.
  Clearing it unlocks the boss.
- `1-4 BOSS: Mysterio` - his projection chamber: a floor, two side ledges, a catwalk (so webs can reach him at
  every height he hovers at), two web anchors, hearts on the ledges. **Mysterio** (30 hp, health bar at the bottom)
  floats between spots at three heights, throws green orbs, spawns flickering **copies** that shoot too but pop with
  one web (only the real one takes damage), and **dives** at the spot you stood on when his wind-up shake started (a
  marker shows it - move). Every third hit he vanishes and reappears elsewhere with fresh copies and drops a web
  canister; if your tank is empty and nothing is lying around, one lands next to you. Below 40 % health he gets
  faster, attacks more often and brings a third copy (a heart drops for the second round). Defeating him ends the
  stage with **WORLD 1 CLEARED!**, saves the clear (World 1 tab gets a check mark) and unlocks World 2. Dying or
  restarting resets the whole fight; the stage has no checkpoints.

**World 2 - Oscorp** (all four stages playable, opens after the World 1 boss):
- `2-1 Industrial Zone` (~19 000 px, new *Industrial District* backdrop: smoggy sky, factory halls, tanks and
  smoking smokestacks): the **factory gate** (first conveyor belts, one with you and one against you, a steam vent),
  the **pipe run** over a sludge pit (walkable pipes at different heights, a patrol drone, a web swing), the **pump
  yard** (two steam vents, the pipe up the pump house), the **assembly hall** (an upper route over two belts and two
  presses, a lower route with vents and a goblin, a belt that runs into a steam vent, a lift to the catwalk), the
  **smokestack roofs** (factory sheds over a pit, a roof vent, a crane girder, a web swing) and the **power
  control** yard with the switch puzzle, then the **loading bay** behind the blast door (Venom, a belt on a housing
  and the exit flag on the Oscorp plant roof). 9 checkpoints, 5 hearts, 6 web canisters, 132 coins, 11 enemies.
  **Switch puzzle** - the blast door to the final area needs **both generator switches** (one lamp each above the
  door; walking up to it says `LOCKED - POWER n/2`). Generator 2 is down in the boiler pit between three steam
  vents. Generator 1 sits on the press at the end of the **reject line**, a belt that runs backwards faster than
  Spider-Man can run (and jumping keeps the belt's speed, so it cannot be hopped either): the **BELT CONTROL** switch
  on top of the control tank reverses it (`BELT REVERSED`). The switches can be done in any order; switches flipped
  after the last checkpoint are undone on a retry, everything from before it (including the reversed belt and an
  open door) is kept.
- `2-2 Research Labs` (~14 500 px, mostly indoors, a clean bright lab look: light walls with a teal band, white tile
  floors, specimen tanks, consoles, server racks, lab benches; the glass atrium shows the city at night): the
  **lobby** (laser gates under ceiling arches, a double gate, the lift up), the **genetics lab** on the upper floor
  (a security drone, a decontamination duct with an always-on low beam you must **slide under** - start the slide
  ~10-90 px before it, two timed beams), the
  **glass atrium** over a long drop (web swings, a hover platform, a timed beam, a drone), the **security wing**
  (the puzzle: a door up to the **robotics lab**, a maintenance shaft down to the **server room**), the **containment
  breach** (Venom escaped), the **wave corridor** (five beams whose dark moment travels right a little slower than
  Spider-Man runs: start when the first goes dark and keep running) and the **evacuation elevator** to the exit.
  7 checkpoints, 6 hearts, 3 web canisters, 84 coins, 6 enemies. **Security puzzle** - the security door needs the
  **L3 keycard**, which lies behind a **laser grid** (solid while it is on: it zaps and blocks, it cannot be
  crossed for a heart; walking up to it says `LASER GRID - OVERRIDE n/2`, lamps above it show the count). The grid
  goes down (`LASER GRID OFFLINE`) once both **grid overrides** are on: one at the far end of the robotics lab
  upstairs (`ROBOTICS LAB` door in the corridor, `EXIT` door back), one in the basement server room past two
  ankle-height beams (the shaft ladder leads back up). Either order; overrides flipped after the last checkpoint
  are undone on a retry, the checkpoint after the keycard keeps the dead grid and the keycard.
- `2-3 Oscorp Tower` - a **vertical** stage (~2 640 px of climbing from the street to the roof, only ~3 500 px
  wide) with the same camera as every other stage and the *Oscorp Tower* backdrop (the city at night; its skyline sinks as you
  climb, office windows show it). The **plaza**, then the lower floors zig-zagging up (floors 240 px apart): the
  **lobby** lift, the **maintenance floor** (steam vents, a spark box, a barrel; go left) and its **ladder**, the
  **security floor** (two timed lasers; go right) and its **pole**, out of a window onto the **facade**: a wide
  climbable steel **lattice** with a timed **laser fence** across it, a **web swing** over the light well to a
  construction scaffold (its hook is above the top of the screen from balcony 2: a blinking hook marker under the
  HUD shows it), a **window washer gondola**, a crane walkway to the **sky terrace**. Back inside: the
  **research floor** (lasers, power switch 1; go left) and a **pole**, the upper **maintenance floor** (steam, a cargo
  belt, power switch 2; go right) and a **lift**, the **sky lobby** and the **executive glass elevator** (480 px) to
  the **rooftop** (a goblin, the flag). 7 checkpoints, 6 hearts, 3 web canisters, 57 coins, 6 enemies.
  **Objective** - the executive elevator has no power (`NO POWER - SWITCHES n/2`, two lamps on its cabin) until
  both power switches are on (`ELEVATOR POWERED`); switches after the last checkpoint are undone on a retry, power
  from before it is kept. Only the light well outside the tower is a pit (falling off the lattice lands on the
  balcony below it; the roof has 300 px parapets, falling down a shaft lands on a lower floor).
  Clearing 2-3 unlocks the **2-4 Green Goblin** boss fight.
- `2-4 BOSS: Green Goblin` - on the oscorp tower rooftop high above the city. The arena fits one screen (960 px, so
  he, his bombs and his swoop lanes are always in view): the roof with a helipad, two side ledges, a catwalk in the
  middle (a jump from either ledge), two swing hooks, 300 px parapets at both ends, a heart and a web canister on
  each ledge, no checkpoints. The **Green Goblin** (40 health = 20 web hits, health bar at the bottom) enters on his
  glider and then glides between spots at floor / ledge / catwalk height (webs fly straight: get to his height)
  and attacks in turns:
  - **Pumpkin bombs** (2 a volley, 3 in phase 2) from high up, out of reach: lobbed on an arc at where you stand
    (they fall through ledges above you, hiding under one is no shelter). A landed bomb burns its fuse for ~0.75 s
    with a blinking **red danger ring** (62 px), then explodes (one heart inside the ring, nothing outside). A bomb
    hit in the air or stepped on goes off right away (one heart).
  - **Swoop**: he laughs and rises to the side of the roof away from you while a blinking **lane of red arrows**
    shows the height he will fly across (yours at that moment) - at least ~0.9 s, and the rush always starts from
    the far side. Jump over him (he is 55-210 px away is the right moment) or get to another height. Touching him
    in the rush costs a heart. Afterwards **his glider stalls** at the far side, in the lane, for ~1.25 s
    (`HIS GLIDER STALLS - HIT HIM!`): the best window to hit him.
  - Below **40 %** (one extra phase, `THE GOBLIN IS FURIOUS!`, bar turns orange): glides 35 % faster, attacks every
    ~1.4 s instead of 2 s, three bombs a volley, a shorter wind-up, a faster swoop and a shorter stall; one heart
    drops once.
  - **Web refills**: a canister drops next to you whenever the tank is at 12 or less and none is lying around
    (within a second when it is empty), so the fight can always be finished.
  Dying or restarting starts the whole fight over (full health, hearts and canisters back). Defeating him ends the
  stage with **WORLD 2 CLEARED!** (`BOSS DEFEATED - GREEN GOBLIN`, `THE GOBLIN IS GROUNDED - EVERY STAGE OF WORLD 2
  IS YOURS`), saves the clear (8 stages cleared on the badge, a check mark on the World 2 tab, "World 2 cleared!"
  in the level select) and opens World 3 (`WORLD 3 - HARBOUR UNLOCKED!`, **NEXT WORLD** starts 3-1).

**World 3 - Harbour** (opens after the World 2 boss; only 3-1 is playable so far):
- `3-1 Harbour Docks` (~10 500 px, the new *Harbour* backdrop: the city across the water, a lighthouse, container
  ships and ship-to-shore cranes with blinking lights, seagulls, shimmering water). Every gap is **open water**
  (a splash, then `YOU FELL INTO THE HARBOUR`). The **quay** (a thug, a crate stack, the first water gap), two wooden
  **piers** on pilings with a **web swing** between them, the **container yard** - stacks 1 to 3 high; **worker 1** is
  trapped in the 140 px alley between two 3-high stacks (you hear his `HELP!` from the top; walk off into the alley, the
  walls are too tall to jump out, a **ladder** leads up onto the next stack; a goblin patrols the stacks), the
  **crane gap** - 400 px of water, too wide to jump: a dockside crane holds a container over it; **web the marked
  rope** (tied off on a bollard on the far quay, a blinking red / white target) and the container drops into the
  water as a stepping stone - then the **ship berth** (Venom) where the cargo ship *Harbor Queen*'s deck is 260 px
  up: web the second marked rope and a **pallet of crates** drops against the ship's side as a step; on deck, an
  **open hatch** leads down into the **cargo hold** (sparking wires, crates) where **worker 2** is trapped - the
  **ladder** is the only way back up - then off the stern onto the **last pier** (a thug), a final **web swing** and
  the **exit quay** (a thug, the exit flag: it needs both workers). 4 checkpoints (pier 2, after the container yard,
  across the crane gap, on the ship's deck after the hold), 3 hearts, 2 web canisters, 71 coins, 6 enemies (4 thugs,
  the goblin, Venom).
  **Marked ropes** - a rope tied off on a bollard with a blinking target at the knot (30 px above the ground: the
  height a web flies at when you shoot standing there) runs up to a crane's pulley. A web that reaches the knot cuts it
  (`ROPE CUT!`); the cargo hanging on it (not solid while it hangs) drops with a simple ease-in - no physics - lands
  with a thud (and a splash in the water), `PATH OPEN!`, and is a normal platform from then on. Standing under it
  when it lands costs a heart and knocks you clear. Webs shot from the top of a jump or the other way miss. Ropes cut
  before a checkpoint stay cut (the cargo is already down after a retry); ropes cut after it are whole again.
- `3-2 Flooded Sewers` (~8 700 px of brick tunnels under the city, the new *Sewer* backdrop: brick vaults, tunnel
  mouths with a green glow, wall pipes, light through street grates, drips). The **water system** (below) is the
  stage: **A** the entry - a shallow dip (wading, a thug shooting while you are slow) and a deep channel to jump
  (`DEEP WATER - NO SWIMMING!`); **B** a tunnel flooded to its ceiling - the **PUMP** before it drains it to 18 px
  (wade through, hop the crate), **worker 1** in the tiled pump room beyond (checkpoint 1, sparks); **C** the
  **cistern**: the way on is 260 px up - step down onto the grate and the **raft**, turn the **valve** next to the
  raft (it only reaches from the raft) and the rising water carries you up; up there **worker 2** waits on a
  grate in the shaft (a jump from the raft); a second valve on the walkway resets the cistern (no softlock);
  **D** the upper pipe run over a deep channel (checkpoint 2, a steam vent, a thug on the pipe, a web swing,
  Venom); **E** the **overflow chamber**: catwalks over deep water (checkpoint 3), a swing, the **MAIN DRAIN** -
  draining it (470 -> 700) turns the chamber floor into a shallow walkway (checkpoint 4, a thug in the water,
  sparks); **worker 3** is up a ladder on a maintenance ledge, and the exit tunnel (under water while the chamber is
  full) leads to the flag. 3 workers, 4 checkpoints, 3 hearts, 2 web canisters, 5 enemies (4 thugs, Venom).
  **Water system** - a pool is a body of water with a level; a **pump** or **valve** (`E` next to it, touch: the
  button, which then says `LOWER` / `RAISE`; a bubble says `E  LOWER WATER` / `E  RAISE WATER`) switches every
  pool wired to it between its HIGH and LOW level, and the water moves there at 1.5 px per frame
  (`DRAINING...` / `FLOODING...`, bubbles, a spinning wheel / a thrown lever, a gauge on the pump). Water up to
  40 px over his feet is **shallow**: he wades at 60 % speed, cannot slide (jumping works), splashes when he steps
  or falls in, and is drawn with his legs under the surface (rings around them while he wades). Deeper water is
  **too deep** - there is no swimming: `TOO DEEP!`, a heart, and he is put back where he stood on safe ground
  ~45 ground frames earlier (not right at the water's edge; if that spot has flooded since: the last checkpoint or
  the start); the keys are let go. On the last heart the run ends: `THE FLOOD SWEPT YOU AWAY`. **Rafts** float on
  their pool's surface and carry whoever stands on them (they rest on the pool's floor when it is drained).
  Checkpoints keep the water levels (pumps used after the last checkpoint are undone on a retry).
- `3-3 Pump Station` (~7 100 px, the new *Pump Station* backdrop: a concrete hall, giant penstock pipes, impeller
  wheels that turn, sodium lamps, gantries and chains). **Four workers**, each behind a different water task, and the
  exit only opens when all four are safe. **A** the intake: a pump housing too tall to jump (climb its **pipe**),
  a **trolley** riding over the deep intake channel; **B** the sump: the **SUMP PUMP** drains the basement - **worker
  1** is stranded on a pump housing in the middle (climb its pipe); the **breaker** down there powers the **lift**
  back up (`NO POWER - SWITCHES 0/1` until then); **C** the **twin basins** - the **TRANSFER PUMP** between them moves
  the water from one basin to the other (`E  TRANSFER WATER`), but has **no power** (red lamp, `NO POWER`) until the
  breaker in the east tunnel is on. West full / east low at first: the west raft is the stepping stone to the pump
  house, the east basin's floor leads to the tunnel with **worker 3** (and a thug) and the breaker. Transferred: the
  east raft floats up as the stepping stone to the way on, and the west basin's floor leads under the **bulkhead**
  (a 65 px gap) to **worker 2**. Every ladder and the pump stay reachable, so the water can be moved back and forth
  any time; **D** the **main pump hall**: pump machines over a deep reservoir, a **hover platform**, a steam vent, a
  goblin, a **lattice** up the pump tower - the **MAIN PUMP** drains the hall, which unseals the **control room**
  (`CONTROL ROOM UNSEALED`, **worker 4**) and the way to the exit. 5 checkpoints (after the trolley, the gallery, the
  pump house, the east gallery, the drained hall floor), 3 hearts, 2 web canisters, 44 coins, 3 enemies (2 thugs, the goblin).
  New here: controls that **need power** (`pump(..., requires)`), a gate powered by a **pool reaching a level**
  (`poolPower`), controls wired to two pools (**transfer**), per pool speeds. A retry restores water, power, levers,
  gates, rafts and rescues together, exactly as they were at the checkpoint (a drained hall after the last
  checkpoint is full again and its control room sealed again); if "too deep" cannot use a recent spot it goes to the
  latest checkpoint that is not under water.
  Clearing 3-3 unlocks the Sandman fight (`STAGE 3-4 UNLOCKED!`, NEXT STAGE).
- `3-4 BOSS: Sandman` - the harbour's dry dock at night, buried in sand (one screen, 960 px): the sand floor, dock walls
  too tall to jump at both ends, a grate **ledge** at each side with a **hydrant valve** on it, two swing hooks high up
  (he is too tall to jump over), a web canister and a heart on each ledge, no checkpoints. **Sandman** (the repo's
  `images/sandman.png`, drawn as a giant: ~160 px next to spider-man's 60; 48 health = 24 web hits) rises out of the
  sand (`YOU CAN'T HURT SAND, SPIDER-MAN!`) and walks after you - he is a grounded brawler, not a flyer like Mysterio
  and the goblin, and touching dry sand costs a heart.
  **Water is his weakness** - webs do nothing to dry sand (a puff, `NO EFFECT - SOAK HIM FIRST!`, the boss bar says
  `DRY SAND`). Each valve (`E`, touch: the button says `VALVE`) pours water from its pipe onto the floor just inside
  its ledge for ~1.3 s: standing at a valve, he walks up to you and stops right under that pipe. In the water he is
  **SOAKED** (mud: dark, dripping, sagging; `SOAKED! WEB HIM NOW!`, the bar says `SOAKED - HIT HIM!`) for 3.5 s: no
  attacks, no contact damage, and webs hurt him (2 each). Then he dries out (`HE'S DRYING OUT!`) and webs do nothing
  again. A valve then needs 9 s to recharge (its gauge fills; `RECHARGING`, touch `WAIT`), so use both sides.
  **Attacks, always shown first**: the **sand fist** - a blinking red zone with a growing shadow and an arrow where
  you stand (also up on a ledge; `SAND FIST!`) for ~0.9 s, then a giant fist of sand slams down (one heart inside the
  zone; the ledges leave an 80 px gap before him to step out to); the **ground wave** - he crouches, a red band with
  big arrows blinks along the floor (`GROUND WAVE - JUMP!`) for ~0.8 s, then a wave of sand rolls along the floor
  (5 px per frame, 42 px high: jump it, or be on a ledge). Up on a ledge he always uses the fist; on the floor mostly
  waves. **One extra phase** below 40 % (`SANDMAN IS FURIOUS!`, the bar turns orange, a heart drops): he walks 45 %
  faster, attacks more often, the wind-ups are shorter (still shown), a second fist follows the first (aimed where
  you are when the first slams, with its own 0.5 s warning), and waves roll both ways. **Web refills**: a canister
  drops whenever the tank runs to 12 or less and none is lying around (within a second when it is empty).
  Dying or restarting starts the whole fight over (full health, entering again, valves ready, pickups back).
  Defeating him (he melts into wet sand, `NO... NOT THE WATER...`) ends the stage with **WORLD 3 CLEARED!** (`BOSS
  DEFEATED - SANDMAN`, `SANDMAN IS WASHED UP - EVERY STAGE OF WORLD 3 IS YOURS`) and saves it (12/12 on the badge, a
  check mark on the World 3 tab, "World 3 cleared! More worlds are on the way."). Tuning: `BOSS.SANDMAN`.

**Rescue system** (any stage can use it, `L.rescue(x, y)`) - a **trapped worker** sits with his legs pinned under a
fallen steel beam and calls `HELP!`. Standing next to him (his center within 60 px, `RESCUE` table) shows a blinking
`[E] RESCUE` prompt over him and lights up the touch **RESCUE** button; a fresh press of **E** (holding it does
nothing) frees him: a jingle, the beam lifts off, he stands up, waves and says `THANKS!`, and
`WORKER RESCUED! n/N` floats up. A stage with workers shows a **`RESCUED n/N`** counter under the coins (grey, yellow
while some are saved, green when everyone is). Its **exit flag stays shut** until every worker is safe: the flag is red
and says `RESCUE n/N` instead of `GOAL`, and touching it says `EXIT LOCKED - RESCUE THE WORKERS n/N` (the stage does
not end). Once the last one is freed: `EVERYONE IS SAFE - EXIT OPEN!`. The stage clear screen adds `RESCUED n/N`.
**Checkpoints** keep the workers freed before them; workers freed after the last checkpoint are trapped again on a
retry (walking back through the checkpoint after a rescue saves it, like items). *Restart stage* traps everyone again.
Rescues give no points (the score stays coins + enemies).

**Unlocking / progress** - all stages of all worlds form one chain in the order the worlds are registered: 1-1 is
always open, every other stage needs the previous one cleared, and the stage before a world's first stage is the
previous world's boss (so 2-1 opens when 1-4 is cleared). Progress (`completed`, best score, best time per stage id)
is stored under `spiderman-game-campaign` in `localStorage`, so it survives a refresh; saves from before World 2
existed keep working (a cleared 1-4 opens 2-1 right away). The main menu badge counts cleared stages of every world.
The level select opens on the world of the stage you just played (or the latest unlocked world); the world tabs
show a padlock while locked and a check mark once the world's boss is beaten. **Dev mode** opens every world and
stage (tiles only open because of dev mode say `DEV`). The level select has a *Reset Progress* button (press twice
to confirm); it locks every later world again.

**Checkpoints** - green lamp posts along the stage. Touching one saves a snapshot (position, score, coins, web,
key items, opened gates, switches / power, collected pickups, defeated enemies, stage timer). Items picked up after
the last checkpoint are *not* kept on a retry (they are back in the stage); re-entering the latest checkpoint after
backtracking for an item saves again ("SAVED"). After dying the game over screen offers
*Retry from checkpoint* (rebuilds the stage and restores the snapshot, full hearts) or *Restart stage*; the pause
menu's *Restart stage* always starts over.

**Movement (campaign only)**

| Key | Action |
|---|---|
| `Up` / `Down` at a ladder, drainpipe, pole, rope or tall fence | grab and climb (reaching pose, alternating sides, leaning into the wall). `Down` at the top of a surface climbs down onto it. Climbing past the top hops him onto the roof / over the fence; climbing past the bottom lets go |
| `Space` while climbing | jump away from the surface (a held direction pushes him that way). `Up` never jumps off, so you cannot get "sucked" back: there is a short no-grab time after letting go and `Up` must be released before it counts as a jump again |
| `Space` (or `Up`) in the air near a **web anchor** | shoot a web to the anchor and swing. Anchors show a blue ring when you are close and a bright pulsing ring when a web can be shot right now |
| `Space` while swinging | let go (with a small upward boost and the swing's momentum). `Down` drops straight down |
| `Left` / `Right` while swinging | a little pumping; the swing always starts toward the side you face and gets at least enough energy to reach ~60 degrees on the far side, never more than ~75 degrees |

The swing is a simple pendulum on a fixed-length web (70-260 px, whatever the distance was when it attached) -
not free physics. Touching a roof, a wall or a ceiling while swinging lets go automatically.

**Nothing hides under the HUD** (drawing only, physics unchanged): a web anchor within ~500 px that is above the top
of the screen or behind the top HUD panels gets a blinking **hook marker** (up arrow + hook) right under the HUD at
its x, and a stage hint the vertical camera would put behind the HUD panels is drawn just below them instead (two
such hints are stacked, not drawn over each other).

**Objects** - key items (keycard, projector cores; shown in the HUD, a gate can need several), **doors** (`Up` in
front of one: short fade, you step out of the door it leads to; fake doors lead somewhere else and their lamp
flickers), **phantom** walls / planks (drawn like the real thing, no collision, green static every ~2.5 s),
**crumbling** planks (shake for a third of a second after you step on them, fall away, come back after ~3 s), patrol
**drones** (moving hazards), holograms (decoration), indoor rooms (dark wall panels drawn behind the platforms),
shipping containers, keycard (opens the locked shutter), shutters / gates (solid while closed, roll up when
opened by a switch or by walking up with the keycard), switches (walk into or jump over the lever; several switches
can be wired to one target: a gate or a lift only works once **all** of them are on, the lift shows one lamp per
switch and says what is missing), one-way ledges / scaffold planks / concrete slabs / steel beams (jump onto them
from below), floating blocks (underpasses with a ceiling: no jumping inside), street or dirt segments with deadly
pits between them, sunken yards, climbable ladders / pipes / fences / poles / ropes, **moving platforms** (lifts on
a cable between two heights, crane girders moving sideways; whoever stands on them is carried), **hazards**
(sparking boxes and rebar spikes: one heart and a knock-back), solid props (dumpsters, low fences, barriers,
sandbags, pallets, cable spools) and decoration (lamp posts, hydrants, benches, signs, cones, ...). Every object,
prop and pickup is drawn as pixel art on the same 2.5 px grid as the character sprites (`PIXEL_SPRITES`).

**Zoomed out view** - a stage is rendered zoomed out: the canvas stays 711 x 400 but ~960 x 540 *world* pixels are
visible (`CAMPAIGN.VIEW_HEIGHT`). Physics are in world pixels and are **not** changed by the zoom: Spider-Man still
jumps ~153 px high and ~215 px far at full speed. The camera keeps him at ~38 % of the view width, follows him
vertically (he is kept between 30 % and 70 % of the view height, eased) and is clamped to the stage bounds. Campaign
enemies only attack when you are within 560 px and roughly at their height.

**Sound** - climbing (grab, steps), web attach, letting go, keycard, gate opening / locked, switch, checkpoint,
head bumps, the steam vent hiss and the laser beeps / zap / shut-down are chiptune effects in `SFX_LIBRARY`.

**Writing a stage** - with `SpidermanGame.LevelBuilder` (everything in world pixels; the street is at y = 540 and
smaller y is higher; "y" arguments are the surface something stands on):

```js
var L = new SpidermanGame.LevelBuilder({ floorY: 540, theme: "CITY" });
L.spawn(60, 540);
L.street(0, 1480);                       // street segment (x, width[, top])   -> pits between segments are deadly
var roof = L.building(2500, 300, 150);   // building standing on the street, returns the roof y (390)
L.ladder(2488, roof, 540);               // ladder / pipe(x, top, bottom), fence(x, top, bottom, width)
L.block(4200, 700, 200, 440);            // floating block: underpass below it
L.ledge(9100, 140, 430);                 // one-way ledge
L.anchor(3140, 230);                     // web anchor (~140 px past an edge, ~310 px above the take-off surface)
L.thug(1150, 540); L.venom(9400, 540); L.goblin(12400, -20);
L.prop("DUMPSTER", 1300, 540);           // see PROP_TYPES
L.coins(300, 540, 5); L.arc(6415, 6535, 230, 50); L.health(5850, 540); L.web(2740, roof);
L.hint(170, 430, "ARROWS = MOVE");
L.checkpoint(2920, 540);
L.key(12495, -20); L.gate(13240, 440, 540, "G2", "KEY"); L.lever(4860, 200, "G1");
L.goal(31800, 340);
var design = L.build();
```

Mysterio helpers: `door(id, x, y, toId, { fake, label })`, `container(x, w, top, color, { phantom, bottom })`,
`panel(x, w, top, bottom, { phantom, color })`, `floor(x, w[, top])`, `catwalk(x, w, top, { phantom, crumble })`,
`room(x, y, w, h)`, `hologram(x, y, text)`, `drone(axis, from, to, fixed, speed)`, `item(id, x, y, sprite, label)`,
`itemGate(x, top, bottom, id, [itemIds])`.

Construction site helpers: `dirt(x, w[, top])`, `scaffold(x, w, top, frameTo)`, `slab(x, w, top, frameTo)`,
`beam(x, w, top)` (all one-way), `concrete(x, w, top[, bottom])` (solid), `lift(x, w, from, to, speed, powerId, tag)`,
`girder(w, y, from, to, speed, tag)`, `pole(x, top, bottom)`, `rope(x, top, bottom)`, `hazard("SPARK" | "REBAR", x, y[, w])`,
`lever(x, y, targetId)` (several levers with the same target id must all be on).

Industrial helpers: `conveyor(x, w, top, speed, { powerId, poweredSpeed, frameTo, bottom })` (solid belt, 20 px
thick; speed in px per frame, + right / - left; legs down to `frameTo`, or a machine housing down to `bottom`; a
belt laid into a floor uses `top = floorY`; with a `powerId` a lever can start, stop or reverse it),
`pipeline(x, w, top[, frameTo, color])` (walkable pipe, one-way), `factory(x, w, top, { color, bottom })` (solid
shed / hall with corrugated walls), `steam(x, y[, offset, period, height])` (timed steam vent on the surface y),
`goblin(x, y, range)` (optional `range` keeps his glide small), props `BARREL` (solid, low: webs and knives fly over
it) and `GAS_TANK`. A door (`gate(..., "SWITCH")`) wired to two or more levers shows one lamp per lever and a
`LOCKED - POWER n/2` message.

**Conveyor belts** - standing on a belt moves Spider-Man by the belt's speed every frame; walking adds his own
speed (5 px per frame), so walking against a slower belt still makes progress and walking with it is faster.
Leaving a belt (jumping or walking off its end) keeps the belt's speed until he lands, like stepping off a moving
walkway: jumps along a belt go farther (~300 px with a +2 belt instead of ~215), jumps against it are shorter (~130
px against a -2 belt), and a belt faster than he can run cannot be beaten by hopping. Grabbing a ladder, a web swing,
a hazard hit or hitting a wall ends the carried speed. Belts push him against walls without jitter and never through
them (collisions use his real movement: own speed + belt). Enemies and props are never placed on belts.

**Security lasers** - a beam between two emitters (ceiling and floor, or two posts for a low horizontal beam). A
timed laser cycles on a fixed clock (`LASER` table: 180 frames, 70 on, 50 warning by default; `offset` shifts beams
against each other): **green lamp** = off and safe, **blinking yellow lamp with a halo + a dotted line filling from
one emitter to the other + beeps** = about to fire (still harmless: when the line is full, it fires), **red beam**
= on (touching it costs a heart with a knock-back; it only hurts while it is on). `period: 0` makes an always-on
beam (the duct beam: low enough to slide under, 52 px above the floor - sliding makes Spider-Man 44 px tall). A
laser with a `powerId` is a **grid**: on and solid until every lever with that id is on, then off for good (gray
lamps). Beams under a ceiling / arch cannot be jumped over; ankle-height beams (20 px) under a low ceiling cannot be
jumped either. Lasers pause with the game and restart their clock when a stage is rebuilt (retry).

**Steam vents** - a fixed cycle (200 frames by default, `offset` shifts vents against each other): idle, a ~0.7 s
warning hiss with small puffs and a blinking lamp (harmless), then a ~0.9 s blast column (140 px) that costs a heart
with the usual knock-back.

Tower helpers: `lattice(x, top, bottom[, width])` (wide climbable steel lattice: crawl up and sideways),
`gondola(x, w, from, to, speed, powerId, tag)` (window washer cradle on cables), `elevator(x, w, from, to, speed,
powerId, tag)` (glass elevator cabin with power lamps), `room(..., "OFFICE")` (tower floor whose windows are real
openings onto the backdrop), props `PLANT`, `DESK`, theme `TOWER` (its layers also move with the vertical camera).

Lab helpers: `labfloor(x, w[, top, bottom])` (solid tile floor, any thickness: upper floors, basements),
`glass(x, w, top)` (one-way glass walkway), `hover(w, y, from, to, speed, tag[, axis])` (moving anti-grav
platform), `laser(x, y1, y2, { period, on, warn, offset, powerId })` (vertical beam from a ceiling emitter at y1 to
a floor emitter at y2), `hlaser(x1, x2, y, { ..., post: floorY })` (horizontal beam, emitters on posts),
`room(x, y, w, h, "LAB" | "SERVER" | "VAULT" | "ATRIUM")` (room styles; rooms that start below the street line are
drawn over the dark underground band), props `SPECIMEN_TANK`, `CONSOLE`, `SERVER_RACK`, `LAB_BENCH` (decoration,
animated), theme `LAB`. For a stage that goes below the street (a basement), set `deathY` and `cameraMaxY`.

Rules of thumb: gaps <= 150 px (same height), upward steps <= 100 px, ledges <= 120 px above the surface below
(floors 130 px apart can be jumped up through), swing gaps 250-280 px, underpasses 100 px high, tall fences
>= 170 px so they cannot be jumped. Belts: never make a gap that must be jumped against a belt's flow (the jump is
~40 % shorter), make landings after a belt that runs with you wide (~35 % longer jumps), and give raised belts at
least ~85 px of headroom above anything walked on under them (or a solid housing). Leave ~300 px between an
obstacle that must be jumped and the next thug (landing in his face leaves no room to shoot), and keep enemies out
of attack range (560 px) of checkpoints so a respawn is never shot at. A hole you should fall into must be at least
~125 px wide: a narrower gap is crossed at running speed (he dips and steps up onto the far side). Never let a fall
or a drop land on a laser, and keep beams out of the 80 px around a checkpoint. Walking off a platform he only
lands on a **one-way** platform (ledge, beam, glass, lift, gondola) he is still above: keep walking gaps onto one-way
platforms narrower than his body (~50 px); solid floors are forgiving (a gap under ~125 px is stepped over).
A jump plus the step-up onto a wall whose top is below his head reaches ~220 px: walls that must stop him (roof
parapets) need ~300 px. Ladders and poles should stand at the edge of the floor they lead to, so the hop at the
top lands on it. A stage with `design: null` is listed but
cannot be played yet.

**Adding a world / stage** - call `SpidermanGame.campaign.addWorld({ id, name, subtitle, clearedText, levels })` in
`campaign-levels.js`; worlds appear as tabs in the order they are added and chain onto the previous world's boss.
Stage ids must be unique across worlds (`"2-1"`, ...), a boss tile uses `label: "BOSS", boss: true`, and
`clearedText` is the line shown on the WORLD N CLEARED screen when nothing new was unlocked. To make a listed stage
playable, replace its `design: null` with a `LevelBuilder` design (e.g. `buildStage22()`). Note: `L.boss(...)`
creates Mysterio; `L.goblinBoss(x, y, spots, highSpots[, health])` creates the Green Goblin (`GoblinBoss`, tuning in
`BOSS.GOBLIN`).

World 3 helpers: `rescue(x, y[, id])` - a trapped worker standing on the surface `y` (default the street); ids default
to `W1`, `W2`, ... and are what a checkpoint remembers. Leave ~60 px of free floor on his left for the beam and the
rubble, and keep him out of the way of solid props (you stand next to him to free him).
Harbour: `water(y)` (the water surface: gaps show water, falling in is `WATER`), `quay(x, w[, top])` (solid concrete),
`pier(x, w[, top])` (solid 20 px plank deck on pilings), `hull(x, w, top, bottom, { name, color })` (a ship's hull; the
one with a `name` is the bow), `deck(x, w, top)` (thin ship's deck, e.g. over a hold), `cabin(x, w, top, bottom)`,
`room(..., "HOLD")`, `crane(x, top, boomFrom, boomTo[, { span, base }])` (decoration: legs at x and x + span, the
pulley at boomTo), `hangingCargo(id, x, w, hangTop, restTop, { kind: "CONTAINER" | "PALLET", color, height,
pulleyY })` (hangs until rope `id` is cut, then drops to restTop), `ropeKnot(id, x[, y])` (the marked rope's bollard;
the knot is 30 px above `y`), props `BOLLARD`, `LIFEBUOY`, `ROPE_COIL`, theme `HARBOR`. Tuning: the `HARBOR` table
(knot hit box, drop speed). Walls that must stop him need ~250 px or more (a jump + step-up reaches ~220): the ship's
deck is 260 px above the quay. A block that lands on a floor must reach 12 px into it (like containers), or he
walks through its sides.
Sewer: `brick(x, w, top, bottom)` (solid masonry: floors, walls, ceilings), `grate(x, w, top)` (one-way),
`pool(id, x, w, bottom, high[, low, start])` (a body of water over the floor at `bottom`; still water: no `low`),
`pump(id, x, y, [poolIds], label)` / `valve(...)` (a control standing on the surface `y`; E switches its pools),
`raft(x, w, poolId)`, `room(..., "PUMPROOM")`, theme `SEWER`. Tuning: the `POOLS` table (wading speed, how deep is too
deep, level speed, control reach, how far back "too deep" puts him). Keep workers where no pool state can put them
under deep water, put a reset control where a pool could strand the player, and make sure the control that must be
used from a raft is out of reach from anywhere else.
Sandman arena: `sand(x, w, top, bottom)` (a sand covered floor), `hydrant(id, x, y, { x, top, bottom, width })` (a
valve on the surface `y` whose pipe pours water over that column; E opens it, then it recharges), `sandmanBoss(x, y[,
health])` (`Sandman`, his center x on the floor `y`; tuning in `BOSS.SANDMAN`).
Pump station: `station(x, w, top, bottom)` (solid concrete with a hazard edge), `machine(x, w, top, bottom)` (solid pump
machinery with a turning flywheel), `pump(id, x, y, [pools], label, requires)` (a control that needs power id
`requires`: red lamp and `NO POWER` until a lever / watcher powers it; wired to two pools it is a transfer pump),
`pool(..., speed)`, `poolPower(pool, state, powerId, label)` (power an id - a `gate(..., id, "SWITCH")`, a lift -
once the pool has settled at HIGH / LOW), theme `STATION`.

## Endless Run systems

**HUD** - hearts + web bar (top left; last heart blinks, bar turns orange when low, red "EMPTY" at 0), score with
distance and best run (top centre), pause button and coins (top right).

**Enemies** (spawn naturally as you get farther; the first roof is always empty, never every roof is occupied):

| Enemy | Behaviour | Health | Score | From |
|---|---|---|---|---|
| Thug | stands, turns to face you, throws knives | 4 (2 webs) | 10 | start |
| Venom | chases you across his roof, bites on contact, never leaves his roof | 10 (5 webs) | 30 | ~1500 px |
| Green Goblin | glides and bobs above his roof, lobs pumpkin bombs on an arc | 6 (3 webs) | 20 | ~2500 px |

Enemies are animated procedurally (breathing, wind-up / recoil on throws, Venom's bounding run, the Goblin banking).
A web hit flashes the enemy sprite (no boxes) and defeat bursts into particles.

**Damage** - every hit costs one heart and gives ~1.25 s of safe time (soft pulse, projectiles pass through). Taking
damage flashes the screen red, shakes the world a little and plays a hurt sound. Health never regenerates by itself.

**Pickups** - coins (+5, some rows float high, some arc over gaps), hearts (+1, max 5) and web canisters (+15, max 50).
Full pickups are left in place ("FULL"). Hearts are spaced >= 1200 px apart, canisters >= 700 px.

**Rooftop props** - water tanks, chimneys, antennas, vents, doors and billboards are decoration; crates, crate stacks
and AC units are **solid**: they block walking and sliding, can be stood on, and crate stacks / AC units also stop
knives, webs and bombs (cover). Never on the first roof or on Venom's roof, never next to an enemy or a roof edge.
All props and pickups are pixel art sprites (`PIXEL_SPRITES`) on the same 2.5 px grid as the characters.

**Scoring** - 1 point per 50 px of progress (never re-awarded when walking back) + coins + enemies. The best score is
stored in `localStorage` and survives refreshes.

**Sound** - `shooting-web.mp3` for the web; jump, land, slide, hurt, enemy hit / defeat, coin, pickup, deny, empty,
pause / resume, menu, game over and new-best are chiptune effects generated with the Web Audio API
(`SFX_LIBRARY` in `spiderman-game.js`). `SOUND` and `MUSIC` toggles are separate and remembered.

All tuning lives in the tables at the top of `spiderman-game.js`: `COMBAT`, `CAMERA`, `CAMPAIGN`, `SLIDE`, `SCORING`,
`PICKUPS`, `ENEMIES`, `SPAWN`, `PROPS` / `PROP_TYPES`, `THEMES`.

## Known limitations

- **Music autoplay** is up to the browser: most only allow sound after the first click / tap / key press (the menu
  says so); iPhones in silent mode play no web audio at all.
- **iPhone Safari has no full screen** for web pages (the button is hidden there); *Add to Home Screen* gives a full
  screen web app. The landscape lock only works in real full screen on Android Chrome.
- **Portrait** phones: the game sits at the top with the buttons below it, so it is small - landscape is the
  intended way to play. On narrow phones the d-pad is close to the spawn area for the first second of a stage.
- The timing-based checks (lasers, swoop jump, slide window) were tuned with bots and tests in headless Chromium;
  how hard the stages *feel* for a person (especially the 2-4 fight and the 2-2 wave corridor) still needs human
  play-testing.

## Project files

- `index.html`: game page (a single canvas; the game scales to the window)
- `spiderman-game.js`: game engine: game flow, endless run, campaign runtime (`CampaignLevel`, `LevelGoal`), enemies,
  pickups, props, backdrops, HUD, sound and menus
- `campaign-levels.js`: campaign data (worlds and stage designs)
- `css/spiderman-game.css`: menu / overlay styles
- `images/`, `audio/`, `fonts/`: bundled game assets
- `tests/`: browser test suites, autopilot bots and the regression compares (see below)

## World 2 / campaign test suite (`tests/`)

Browser tests (Python Playwright + headless Chromium) that drive the real page with real key / mouse / touch events:

```sh
pip install -r tests/requirements.txt && python3 -m playwright install chromium
python3 tests/run_all.py            # everything (~15 min): suites, World 1 / endless compares, frame compares, bots
python3 tests/run_all.py --quick    # no bots / frame compares (~6 min)
python3 tests/run_all.py --only 2_2 # one suite
```

`run_all.py` serves the game itself and, for the regression compares, the **original game from git** (`git archive`
of the first commit - the version before World 2; `--baseline-rev REV` or `--baseline-dir DIR` to choose another).
Logs go to `tests/out/` (ignored by git). A single suite can also be run by hand against a running server
(`GAME_URL=http://127.0.0.1:8000/index.html python3 tests/test_stage_2_3.py`). More than ~4 browsers at once makes the
timing checks flaky (`--jobs`, default 3). The checks count game frames, not time; `GAME_FPS=30` / `GAME_FPS=120` (or
`BROWSER_ARGS="--disable-frame-rate-limit"`) runs a suite at another frame rate to catch timing assumptions.

| Suite | Checks | What it covers |
|---|---|---|
| `test_campaign_flow.py` | 53 | world tabs (three), unlock chain W1 -> W2 (1-4 opens 2-1, 2-x in order), badge, NEXT WORLD, pause / retry / level select / main menu in 2-1, saves + refresh, reset progress |
| `test_dev_mode.py` | 27 | dev mode opens every world / stage (`DEV` tiles), remembered, progress still saved, old saves (from before World 2) keep working |
| `test_world2_connect.py` | 18 | 2-1 -> 2-2 -> ... with NEXT STAGE, unlock lines, the World 2 tab state |
| `test_stage_2_1.py` | 58 | Industrial Zone: structure, conveyors (carry, air carry, walls, no jitter), steam vents, belt reversal + 2-generator door, checkpoints with puzzle state, death / retry / restart, completion + save |
| `test_stage_2_2.py` | 55 | Research Labs: timed lasers (safe / warning / on, lamp colours read from the canvas, beeps), duct slide, laser grid + overrides + keycard + security door, doors, shaft + ladder, wave corridor, checkpoints, death / retry, completion |
| `test_stage_2_3.py` | 57 | Oscorp Tower: ladder / poles / lattice + laser fence, lifts, gondola, powered glass elevator, parapets, collisions, camera, checkpoints, unlock of 2-4 |
| `test_stage_2_4_boss.py` | 57 | Green Goblin: arena, web damage, bombs (fuse, ring, falling through ledges), swoop lane + wind-up + stall, jumping over the swoop, phase 2, web refills, death / restart resets the fight, WORLD 2 CLEARED + save |
| `test_mobile.py` | 85 | 4 phone setups (portrait / landscape): layout, button sizes, multi-touch, slide, climb, swing, pause, menus, rotation, fullscreen, music hint, desktop unchanged |
| `test_mobile_world2.py` | 20 | World 2 with touch only: locked tab, belt, HUD pause, duct slide, lab door, shaft ladder, game over -> RESTART, lattice, hook marker, boss WEB / JUMP, WORLD 2 CLEARED panel fits the phone |
| `test_world1_play.py` | 22 | every World 1 stage still starts, runs, pauses, restarts; Mysterio takes web damage |
| `test_endless.py` (+ `baseline`) | 44 + 44 | the five themes, zoom 1, controls, scoring, spawns, game over, best score, settings - on the new game and the same checks on the original |
| `compare_world1_levels.py` | 4 stages | World 1 stage data (design, coins, enemies, roofs, pickups, checkpoints, spawn, camera, zoom) identical to the original |
| `compare_world1_menus.py` | 101 | World 1 level select / locks / notes / clear screens in all 32 save + dev combinations vs the original (only the intended "World 2 is open" texts differ) |
| `compare_frames.py` | 5 x 3000 frames | seeded random input, frame-by-frame trace of Spider-Man + enemies on 1-1, 1-2, 1-3, 1-4 and the endless run: identical to the original |
| `test_world3_rescue.py` | 103 | World 3: locked tab / tiles on a fresh save, the goblin's clear opens it (NEXT WORLD -> 3-1), the rescue with real E presses (out of reach, held E, walking into reach, prompt, counter, HUD texts, freeing animation), the exit flag locked until 2/2, results `RESCUED 2/2`, saves + refresh, `SOON` tiles, checkpoints (rescues before / after, double retry, re-saving), restart, falling into the water, dev mode, and on two phones the RESCUE button (only in 3-1, size, placement, lit in reach, tap, two fingers, pause) |
| `test_stage_3_1.py` | 67 | Harbour Docks: structure (water, 4 checkpoints, workers, ropes, cranes, enemy / checkpoint rule), water (splash, WATER game over + message, foreground), worker 1 (out of reach from the stacks, drop into the alley, no jumping out, E, ladder out), the crane gap (too wide; jumping it = water; web from a jump / the other way misses; the real shot: rope cut, fall, landing, splash, solid; across with real jumps), the pallet (deck out of jump reach, standing under it = 1 heart + knocked clear, two jumpable steps, up onto the deck), worker 2 (out of reach from the deck, through the hatch, no jumping out, sparks hurt, E, ladder up), checkpoints with cut ropes + rescues (retry, double retry, checkpoint 4, restart), touch WEB button, and a full run by the route bot |
| `test_stage_3_2.py` | 78 | Flooded Sewers: unlock + structure (pools, controls, no worker ever under deep water, enemy / checkpoint rule), wading (60 % speed measured in frames, no slide, jumping, splash, water drawn in front), too deep (walking into the channel / the flooded tunnel: a heart, put back well before the edge, keys let go; the last heart: FLOOD game over + message), the pump (out of reach, prompt, drains at a fixed speed counted in frames, through the drained tunnel, floods it back, the water rising while he is inside), the cistern (valve reach from walkway / grate / raft, riding the raft up frame by frame, worker 2's ledge, onto the upper run, the reset valve, falling into the full cistern), the chamber (ladder into deep water, the main drain, the ladder onto the shallow walkway, worker 3, the exit, RESCUED 3/3), checkpoints keeping water levels (retry, double retry, checkpoint 4 in the water, restart), touch (USE / LOWER / RAISE / RESCUE label), a full run by the route bot |
| `test_stage_3_3.py` | 82 | Pump Station: unlock 3-2 -> 3-3 (NEXT STAGE), structure (controls + power, watcher, gate, moving platforms, climbables, no worker under deep water in any of the 32 pool combinations, enemy / checkpoint rule), the housing (cannot be jumped, pipe climb), the trolley ride, the sump (too deep, pump, drain frame counted, worker 1's pipe, the breaker powers the lift, the lift ride), the twin basins (raft crossing, NO POWER, down into the low basin, worker 3, the breaker, the ladder out of shallow water, TRANSFER frame counted, rafts following, worker 2 under the bulkhead, the east raft crossing, transferring back), the hall (machines, hover ride, lattice, main pump, control room unsealed, worker 4, exit), 3-4 unlocked + saved + SOON tile, checkpoint consistency (retries after checkpoints 1, 3, 4, 5 restore water + power + levers + gate + rafts + rescues exactly; double retry; "too deep" never sends him into a flooded checkpoint; restart), touch labels (NO POWER / TRANSFER), a full run by the route bot |
| `test_stage_3_4_boss.py` | 67 | Sandman: unlock 3-3 -> 3-4 (NEXT STAGE), the arena, the sprite as a giant boss, his entry (webs pass through), dry sand (no effect, text, sound, the web spent), the valves (reach, the water, RECHARGING, recharge time counted), soaking (pending fist crumbles, webs hurt, no contact damage, soak time counted, drying, dry again), contact, the fist (zone on his surface, warning time, a heart inside, a miss outside, on the floor), the wave (wind-up counted in the page, speed, a heart, jumping it with a real Space), phase 2 (text, heart, speeds / wind-ups, waves both ways, the follow-up fist, no third phase), web refills (low / empty), death + restart reset everything, the defeat -> WORLD 3 CLEARED + saved + 12/12 + refresh, touch (VALVE / WAIT, WEB), the boss bot |
| `bots/run_stage_bot.py 2-1/2-2/2-3/3-1/3-2/3-3` | 6 | autopilots clear each stage with real key events (with forced deaths -> retry from checkpoint); the 3-1 bot goes into the alley and the hold, frees both workers with E, webs both ropes; the 3-2 bot works the pump, rides the raft, drains the chamber and frees all three workers; the 3-3 bot rides the trolley and the lift, transfers the basins and drains the hall for all four workers |
| `bots/run_boss_bot.py` (`--no-dodge`, `--stage 3-4`) | 4 | an autopilot beats the goblin / sandman (valve, webs, dodging fists and waves); one that never dodges loses |

**Latest results** (this version with all of World 3 - Harbour Docks, Flooded Sewers, Pump Station and the Sandman
fight - headless Chromium, `run_all.py`: 37/37 suites): every suite above passed - 53, 27, 18, 58, 55, 57, 57, 103, 67,
78, 82, 67, 85, 20, 22, 44 + 44, 101 checks with 0 failures; World 1 stage data and all five 3000-frame traces
IDENTICAL to the original; the 2-1, 2-2, 2-3, 3-1, 3-2 and 3-3 bots cleared their stages (also after forced deaths),
the boss bots beat the Green Goblin and Sandman (soaking him 4 times, 24 of 24 webs, 28 fists dodged) and the no-dodge
bots lost both fights as they should. No browser errors anywhere. The World 2 stage suites also pass with the game
loop at 30 and 120 fps (`GAME_FPS`), and 2-1 also uncapped (several hundred fps); the World 3 suites stop their walks
on the game frame (never by polling), so they hold up under load.

## Automated tests (original World 1 / endless work)

The game was verified with Playwright (headless Chromium) test scripts that drive the real page, covering
(numbers = checks):

- **Menu / controls flow (62, original endless suite)**: main menu first, Controls panel, keyboard + mouse navigation,
  sound / music toggles + persistence, Left / Right / Up / Space / Down / X / Esc, pause freezes the game, no stuck keys,
  no duplicate game loops, retry, main menu, game over, best score after refresh, no page scrolling.
- **Combat (25)**: web range (camera still and scrolling), cooldown on hold and on mashing, empty web, `addWeb` clamp,
  no web refund on kills, projectile cleanup, safe time after a hit.
- **Enemies (35)**: thug / Venom / Goblin behaviour, health, points, bombs arcing and exploding on roofs, spawn table
  by distance, live autopilot run.
- **Pickups & scoring (32)**: coins, hearts, canisters, full pickups, no regeneration, distance points, kill points,
  placement rules, cleanup, best score across retry / refresh / tabs.
- **Audio & feedback (31)**: strict autoplay policy without errors, unlock on first gesture, every effect on its trigger,
  sound OFF / music OFF, game over jingle, results screen, retry and main menu.
- **Window, themes, camera, slide, props (41)**: fit to window, fullscreen never throws, theme chooser + persistence,
  all backdrops animate, camera back-scroll limit and world retention, fixed-length slide, point-blank knives,
  enemy animations, sprite tint flashes, obstacles block / stand-on / placement rules, autopilot run.
- **Smoothness & final fixes (20)**: every visible roof / enemy is drawn every single frame while the world is
  recycled behind the camera (the rare one-frame hole at the bottom-left), no camera jitter against obstacles, no backdrop seam, bottom-left area never
  transparent / black, shake never exposes the canvas, smooth safe-time pulse, HUD pause button (hover, click, resume,
  ESC, inert while paused), crates stop webs and knives, thugs turn around, bounded object counts.
- **Playthrough**: an autopilot plays every theme for 16 s without god mode, checking for NaN, out-of-range health /
  web, score mismatches, camera jumps, sinking into roofs / obstacles, stuck states and browser errors.
- **Final regression (run last, all without browser errors)** - seven Playwright suites drive the real page:
  - *Stage 1-1 flow (57)*: level select, locks, keyboard navigation, stage load, idle safety, pause (Esc + HUD
    button, timer frozen), game over by health / fall, Retry from checkpoint / Restart stage / Level select, a route
    bot clearing the whole stage with real key events (climbs, swings, switch, keycard, shutters, fences), progress
    saved and still there after a refresh, Next Stage, replaying a cleared stage, reset progress, plus the endless
    regression block.
  - *Stage 1-2 route*: High Steel cleared by the route bot (poles, ropes, ladders, girder rides, skeleton floors,
    both power switches, the powered lift, hazards), checkpoint retries restoring the power state.
  - *Stage 1-3 route + puzzle state (35)*: Mysterio's Warehouse cleared without god mode; phantom vs real walls,
    doors both ways, crumbling planks, cores taken after / before a checkpoint, fake vs real doors, the two-core gate,
    re-saving checkpoints, restart, the dead-end trick, boss unlock, dev mode.
  - *Boss fight (17)*: the Mysterio fight with and without god mode, every attack observed, clean defeat, WORLD 1
    CLEARED results, the clear saved and shown everywhere, retries and restarts resetting the fight.
  - *Campaign systems (65)*: unlock chain, saved progress (best score / time never get worse, kept after main menu /
    refresh), pause / resume / retry / main menu from a stage, climbing (grab, 3 px/frame, top hop, Down from the
    top, no slide on grab, Space jump-off with momentum, grace, Up latch), swing (attach only in the air and in
    range, fixed web length, release with momentum, Down drop, grace, re-attach), camera (x / y clamped to the
    stage, vertical follow, no jumps), free and powered lifts, crane girder, switches / power, checkpoint with power,
    hazards, thug engage range, Venom chase bounds, goblin bombs, coins / web canister / heart rules, and Mysterio
    (enter, hit, copies, pop, teleport after 3 hits, phase 2 heart, empty-tank canister, defeat -> WORLD 1 CLEARED).
  - *Endless regression (33)*: exactly the five endless themes, every theme label fits its button, theme saved and
    used behind the menu, zoom 1 / no vertical camera, run controls (run, back-scroll limit, jump, Up jump, slide,
    web shot), distance / coin / enemy scoring, random roofs still spawn thugs / Venom / goblins, game over screen
    (distance row, best line, no campaign buttons), new best saved and kept, retry, BEST RUN on the menu after a
    refresh, sound / music settings saved and restored, separate storage keys, fullscreen toggle, ESC pause / resume.

Existing third-party font copyright and attribution metadata is retained.
