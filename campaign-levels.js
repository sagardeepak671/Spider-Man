/*
 * Campaign worlds and stages.
 *
 * Load this file after spiderman-game.js. Every world is registered with
 * SpidermanGame.campaign.addWorld() and shows up as a tab in the level select.
 * All stages form one unlock chain in the order the worlds are added: 1-1 is
 * always open, every other stage needs the previous one cleared, and a world's
 * first stage needs the previous world's boss. Progress is saved per stage id
 * in localStorage by the game, so ids must be unique across worlds.
 *
 * Stages are written with SpidermanGame.LevelBuilder (see the CampaignLevel
 * comment in spiderman-game.js for the raw format). Everything is in world
 * pixels; the campaign view is 960 x 540 world pixels, the street is at
 * y = 540 and smaller y is higher. Spider-Man jumps ~153 px high and ~215 px
 * far at full speed, so:
 *   - gaps to jump:            <= 150 px (same height), upward steps <= 100 px
 *   - one-way ledges:          <= 120 px above the surface below
 *   - web swing gaps:          anchor ~140 px past the edge and ~310 px above
 *                              the take-off surface, landing 250-280 px away
 *   - underpasses:             100 px high (no jumping inside)
 */
(function() {

	/* ================================================================
	 * STAGE 1-1 - ROOKIE ROOFTOPS
	 * A walk through downtown: main street, an underpass with a switch,
	 * a rooftop run with web swings, Venom's street, the tower that holds
	 * the keycard, back alleys, a warehouse yard, the upper town rooftops
	 * and the finale on the police station roof.
	 * ================================================================ */
	function buildStage11() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "CITY" });

		// swing over a pit / gap: anchor 140 px past the edge and 310 px above the take-off surface. That high,
		// the low point of the arc stays above the take-off surface however early the web is shot, and both an
		// early and a late (apex) attach land ~250-360 px past the edge
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }

		/* ---------- A. MAIN STREET (0 .. 3250) ---------- */
		L.spawn(60, F);
		L.street(0, 1480);
		L.hint(170, F - 110, "ARROWS = MOVE   SPACE = JUMP");
		L.hint(600, F - 110, "X = SHOOT WEB");
		L.prop("LAMP_POST", 260, F).prop("MAILBOX", 420, F).prop("HYDRANT", 520, F);
		L.coins(300, F, 5);
		L.prop("FENCE_LOW", 700, F);
		L.hint(730, F - 130, "JUMP OVER FENCES");
		L.coins(690, F, 3, 70);
		L.prop("BENCH", 850, F).prop("TRASH_CAN", 930, F).prop("LAMP_POST", 1000, F);
		L.thug(1150, F);
		L.prop("DUMPSTER", 1300, F);
		L.coins(1290, F, 3, 75);
		L.prop("STREET_SIGN", 1400, F);
		L.hint(1440, F - 140, "MIND THE GAP");
		// pit 1480 .. 1600
		L.street(1600, 1400);                                  // 1600 .. 3000
		L.coins(1700, F, 4);
		L.thug(1950, F);
		L.prop("LAMP_POST", 2100, F).prop("FENCE_LOW", 2200, F).prop("HYDRANT", 2400, F);
		var deli = L.building(2500, 300, 150);                 // roof at 390
		L.ladder(2488, deli, F);
		L.hint(2380, F - 170, "UP AT THE LADDER = CLIMB");
		L.coins(2560, deli, 4);
		L.prop("VENT", 2650, deli);
		L.web(2740, deli);
		L.prop("LAMP_POST", 2850, F);
		L.checkpoint(2920, F);
		L.hint(2960, F - 160, "JUMP, THEN SPACE NEAR THE HOOK = WEB SWING");
		// pit 3000 .. 3250: first swing
		swing(3000, F);

		/* ---------- B. THE UNDERPASS (3250 .. 6000) ---------- */
		L.street(3250, 2750);                                  // 3250 .. 6000
		L.coins(3320, F, 3);
		L.prop("TRASH_CAN", 3450, F);
		L.thug(3700, F);
		L.prop("LAMP_POST", 3900, F);
		L.prop("FENCE_LOW", 4050, F);
		L.coins(4040, F, 3, 70);
		L.hint(4000, F - 170, "CLOSED SHUTTER - FIND THE SWITCH");
		// a block over the street (underpass), shutter inside, switch on top; a taller block after it so the
		// roof is a dead end
		L.block(4200, 700, 200, 440);                          // 4200 .. 4915
		L.gate(4240, 440, F, "G1", "SWITCH");
		L.pipe(4185, 200, F);
		L.hint(4090, 330, "UP AT THE PIPE = CLIMB");
		L.coins(4320, 200, 5);
		L.prop("AC_UNIT", 4520, 200);
		L.thug(4420, 200);
		L.prop("ANTENNA", 4790, 200);
		L.lever(4860, 200, "G1");
		L.hint(4820, 150, "HIT THE SWITCH");
		L.block(4915, 360, 30, 440);                           // 4915 .. 5290 (too tall to climb onto)
		L.coins(4420, F, 4);
		L.coins(4900, F, 4);
		L.coins(5150, F, 3);
		L.thug(5450, F);
		L.prop("DUMPSTER", 5600, F);
		L.coins(5590, F, 3, 75);
		L.prop("LAMP_POST", 5750, F);
		L.health(5850, F);
		L.checkpoint(5920, F);

		/* ---------- C. ROOFTOP RUN (6000 .. 8575) ---------- */
		var c1 = L.building(6000, 400, 280);                   // 6000 .. 6415, roof 260
		L.ladder(5988, c1, F);
		L.hint(5890, F - 180, "CLIMB TO THE ROOFTOPS");
		L.coins(6060, c1, 5);
		L.prop("WATER_TANK", 6280, c1);
		var c2 = L.building(6535, 300, 340);                   // gap 120, roof 200
		L.prop("CRATE", 6580, c2);
		L.thug(6720, c2);
		L.arc(6415, 6535, c1 - 30, 50);
		var c3 = L.building(6990, 300, 300);                   // gap 140, roof 240
		L.coins(7040, c3, 4);
		L.prop("CHIMNEY", 7220, c3);
		L.hint(7140, c3 - 140, "SPACE IN THE AIR NEAR THE HOOK = SWING");
		swing(7305, c3);                                       // gap 7305 .. 7565
		var c4 = L.building(7565, 380, 280);                   // roof 260
		L.coins(7620, c4, 4);
		L.thug(7820, c4);
		L.checkpoint(7900, c4);
		swing(7960, c4);                                       // gap 7960 .. 8240
		var c5 = L.building(8240, 320, 240);                   // roof 300
		L.prop("BILLBOARD", 8420, c5);
		L.coins(8290, c5, 3);

		/* ---------- D. VENOM'S STREET (8575 .. 10525) ---------- */
		L.street(8575, 1700);                                  // 8575 .. 10275
		L.hint(8700, F - 130, "VENOM BITES - KEEP YOUR DISTANCE");
		L.prop("LAMP_POST", 8800, F).prop("HYDRANT", 9000, F);
		L.ledge(9100, 140, F - 110);                           // safe spot to shoot from
		L.coins(9110, F - 110, 4);
		L.venom(9400, F);
		L.prop("DUMPSTER", 9750, F);
		L.coins(9740, F, 3, 75);
		L.health(9950, F);
		L.prop("FENCE_LOW", 10080, F);
		L.checkpoint(10200, F);
		swing(10275, F);                                       // pit 10275 .. 10525

		/* ---------- E. THE TOWER + KEYCARD (10525 .. 13775) ---------- */
		L.street(10525, 3250);                                 // 10525 .. 13775 (runs under the tower)
		L.coins(10600, F, 4);
		L.prop("LAMP_POST", 10650, F);
		L.thug(10850, F);
		L.prop("MAILBOX", 11050, F).prop("FENCE_LOW", 11250, F);
		L.hint(11450, F - 150, "THE SHUTTER AHEAD NEEDS A KEYCARD");
		L.hint(11620, F - 200, "KEYCARD ON THE TOWER ROOF - CLIMB UP");
		var tower = L.block(11925, 600, -20, 440);             // 11925 .. 12540, roof -20, underpass below
		// fire escape up the left wall: pipe, balcony, ladder, balcony, pipe, balcony, pipe up to the roof
		L.pipe(11910, 380, F);
		L.ledge(11825, 100, 380);
		L.ladder(11912, 220, 380);
		L.ledge(11825, 100, 220);
		L.pipe(11910, 60, 220);
		L.ledge(11825, 100, 60);
		L.pipe(11910, tower, 60);
		L.coins(11835, 380, 3).coins(11835, 220, 3).coins(11835, 60, 3);
		L.web(12000, tower);
		L.thug(12090, tower);
		L.prop("WATER_TANK", 12240, tower);
		L.goblin(12400, tower);
		L.key(12495, tower);
		L.hint(12200, tower - 200, "GRAB THE KEYCARD");
		// balconies down the right wall
		L.ledge(12545, 100, 120);
		L.ledge(12545, 100, 280);
		L.ledge(12545, 100, 420);
		L.coins(12555, 280, 3);
		L.coins(12000, F, 5);                                  // inside the underpass
		L.coins(12300, F, 4);
		L.prop("HYDRANT", 12750, F);
		L.thug(12950, F);
		L.coins(12820, F, 3);
		L.block(13200, 300, 300, 440);                         // shutter block
		L.gate(13240, 440, F, "G2", "KEY");
		L.hint(13120, F - 150, "KEYCARD SHUTTER");
		L.coins(13360, F, 3);
		L.prop("LAMP_POST", 13560, F);
		L.checkpoint(13660, F);

		/* ---------- F. BACK ALLEYS (13775 .. 19005) ---------- */
		// pit 13775 .. 13905
		L.street(13905, 1300);                                 // 13905 .. 15205
		L.fence(14100, F - 180, F, 20);                        // taller than a jump: must be climbed
		L.hint(14000, F - 180, "UP AT THE FENCE = CLIMB OVER");
		L.coins(14170, F, 3);
		L.prop("TRASH_CAN", 14280, F);
		L.thug(14480, F);
		L.prop("DUMPSTER", 14680, F);
		L.coins(14670, F, 3, 75);
		L.prop("FENCE_LOW", 14880, F).prop("LAMP_POST", 14980, F);
		L.fence(15120, F - 200, F, 20);
		// sunken yard, ladder back up
		L.street(15205, 400, F + 80);                          // 15205 .. 15605
		L.coins(15260, F + 80, 5);
		L.thug(15470, F + 80);
		L.ladder(15588, F, F + 80);
		L.street(15605, 1400);                                 // 15605 .. 17005
		L.prop("BARRIER", 15720, F);
		L.coins(15710, F, 3, 70);
		L.thug(15920, F);
		L.prop("LAMP_POST", 16120, F).prop("FENCE_LOW", 16320, F);
		L.goblin(16700, F);
		L.checkpoint(16900, F);
		L.hint(16950, F - 180, "CRANE HOOKS - SWING ACROSS");
		swing(17005, F);                                       // pit 17005 .. 17255
		L.street(17255, 300);                                  // 17255 .. 17555
		L.coins(17320, F, 3);
		swing(17555, F);                                       // pit 17555 .. 17805
		L.street(17805, 1200);                                 // 17805 .. 19005
		L.coins(17860, F, 4);
		L.thug(18120, F);
		L.prop("DUMPSTER", 18320, F).prop("LAMP_POST", 18520, F);
		L.health(18720, F);
		L.checkpoint(18900, F);

		/* ---------- G. WAREHOUSE YARD (19005 .. 23060) ---------- */
		var w1 = L.building(19005, 500, 120);                  // 19005 .. 19520, roof 420
		L.hint(18960, F - 200, "JUMP ONTO THE WAREHOUSE");
		L.prop("CRATE", 19120, w1).prop("CRATE_STACK", 19280, w1);
		L.thug(19440, w1);
		L.coins(19060, w1, 3, 30);
		var w2 = L.building(19620, 300, 240);                  // gap 100, roof 300
		L.coins(19670, w2, 4);
		L.prop("VENT", 19840, w2);
		L.street(19935, 1600);                                 // 19935 .. 21535
		L.prop("LAMP_POST", 20050, F);
		L.ledge(20350, 120, F - 110);
		L.coins(20360, F - 110, 3);
		L.venom(20700, F);
		L.prop("DUMPSTER", 21000, F);
		L.coins(20990, F, 3, 75);
		L.thug(21250, F);
		L.checkpoint(21420, F);
		// pit 21535 .. 21665
		L.street(21665, 1395);                                 // 21665 .. 23060
		L.prop("BARRIER", 21800, F);
		L.coins(21790, F, 3, 70);
		L.thug(22020, F);
		L.prop("FENCE_LOW", 22260, F);
		L.goblin(22520, F);
		L.prop("LAMP_POST", 22700, F);
		L.health(22880, F);
		L.checkpoint(22960, F);

		/* ---------- H. UPPER TOWN ROOFTOPS (23060 .. 28575) ---------- */
		var g1 = L.building(23060, 400, 300);                  // 23060 .. 23475, roof 240
		L.pipe(23045, g1, F);
		L.hint(22990, F - 200, "PIPE UP TO THE ROOFTOPS");
		L.coins(23120, g1, 4);
		L.prop("DOOR", 23360, g1);
		var g2 = L.building(23605, 300, 360);                  // gap 130, roof 180
		L.prop("CRATE_STACK", 23650, g2);
		L.thug(23780, g2);
		var g3 = L.building(24030, 300, 440);                  // gap 110, roof 100
		L.coins(24080, g3, 4);
		L.prop("ANTENNA", 24260, g3);
		var g4 = L.building(24495, 400, 380);                  // gap 150, roof 160
		L.prop("AC_UNIT", 24560, g4);
		L.goblin(24700, g4);
		L.prop("AC_UNIT", 24810, g4);
		L.coins(24620, g4, 4);
		L.checkpoint(24860, g4);
		swing(24910, g4);                                      // gap 24910 .. 25170
		var g5 = L.building(25170, 300, 340);                  // roof 200
		L.coins(25220, g5, 4);
		L.thug(25360, g5);
		L.ledge(25510, 120, g5 - 110);                         // hop up via a ledge ...
		L.coins(25520, g5 - 110, 3);
		var g6 = L.building(25660, 300, 480);                  // ... onto a tall roof at 60
		L.prop("BILLBOARD", 25760, g6);
		L.web(25900, g6);
		var g7 = L.building(26095, 300, 400);                  // gap 120, roof 140
		L.thug(26260, g7);
		L.prop("CHIMNEY", 26120, g7);
		swing(26410, g7);                                      // gap 26410 .. 26690
		var g8 = L.building(26690, 400, 360);                  // roof 180
		L.coins(26740, g8, 5);
		L.prop("WATER_TANK", 26960, g8);
		L.checkpoint(27040, g8);
		L.hint(27080, g8 - 130, "DROP DOWN THE BALCONIES");
		L.ledge(27115, 100, 300);
		L.ledge(27115, 100, 420);
		L.coins(27125, 300, 3);

		/* ---------- I. FINALE (27105 .. 31900) ---------- */
		L.street(27105, 1400);                                 // 27105 .. 28505
		L.prop("LAMP_POST", 27300, F);
		L.thug(27500, F);
		L.prop("FENCE_LOW", 27700, F);
		L.coins(27690, F, 3, 70);
		L.thug(27980, F);
		L.prop("DUMPSTER", 28160, F);
		L.health(28340, F);
		L.checkpoint(28430, F);
		swing(28505, F);                                       // pit 28505 .. 28755
		L.street(28755, 2615);                                 // 28755 .. 31370
		L.thug(28900, F);
		L.prop("BARRIER", 29080, F);
		L.coins(29000, F, 4);
		L.thug(29300, F);
		L.prop("LAMP_POST", 29450, F);
		L.venom(29700, F);
		L.ledge(30150, 140, F - 110);
		L.coins(30160, F - 110, 4);
		L.prop("DUMPSTER", 30450, F);
		L.coins(30440, F, 3, 75);
		L.thug(30650, F);
		L.prop("FENCE_LOW", 30850, F);
		L.coins(30840, F, 3, 70);
		L.thug(31050, F);
		L.prop("LAMP_POST", 31200, F);
		L.hint(31300, F - 180, "THE FLAG IS ON THE ROOF");
		var fin = L.building(31370, 500, 200);                 // 31370 .. 31885, roof 340
		L.ladder(31358, fin, F);
		L.coins(31430, fin, 5);
		L.prop("DOOR", 31650, fin);
		L.goal(31800, fin);

		// the camera may drop a little lower than the street (sunken yard, falls into pits)
		L.set("cameraMaxY", 200);

		return L.build();
	}

	/* ================================================================
	 * STAGE 1-2 - HIGH STEEL
	 * A construction site: scaffold towers, half built skeleton buildings,
	 * crane girders, sparking junction boxes and rebar, two power switches
	 * that must both be on before the lift to the finale works.
	 * ================================================================ */
	function buildStage12() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "SITE" });
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }

		/* ---------- A. SITE ENTRANCE (0 .. 2600) ---------- */
		L.spawn(60, F);
		L.dirt(0, 3700);                                       // 0 .. 3700 (runs under the first towers)
		L.hint(200, F - 110, "CONSTRUCTION SITE - MIND THE HAZARDS");
		L.prop("WARNING_SIGN", 320, F).prop("CONE", 430, F).prop("CONE", 480, F);
		L.prop("BARRIER", 620, F);
		L.coins(610, F, 3, 70);
		L.prop("SANDBAGS", 820, F);
		L.hazard("SPARK", 1010, F);
		L.hint(1000, F - 130, "JUMP OVER SPARKING BOXES");
		L.thug(1260, F);
		L.prop("PALLET", 1420, F).prop("CRATE_STACK", 1540, F);
		L.coins(1530, F, 3, 90);
		// scaffold tower 1: three planks, a pole up the left side
		var t1a = L.scaffold(1800, 400, F - 130, F);           // 410
		var t1b = L.scaffold(1800, 400, F - 260, F);           // 280
		var t1c = L.scaffold(1800, 400, F - 390, F);           // 150
		L.pole(1785, t1c, F);
		L.hint(1690, F - 180, "UP AT A POLE = CLIMB");
		L.coins(1860, t1a, 4);
		L.thug(2050, t1b);
		L.coins(1860, t1c, 4);
		L.health(2120, t1c);
		L.hint(2080, t1c - 120, "JUMP, THEN SPACE NEAR THE HOOK");
		swing(2200, t1c);                                      // to the skeleton at 2460

		/* ---------- B. SKELETON TOWER 1 (2460 .. 3480) ---------- */
		var b1 = L.slab(2460, 1000, 190, F);                   // landing floor
		L.slab(2460, 1000, 320, F);
		L.slab(2460, 1000, 450, F);
		var b4 = L.slab(2460, 1000, 60, F);
		var b5 = L.slab(2460, 1000, -70, F);
		L.hint(2540, 190 - 120, "JUMP UP THROUGH THE FLOORS");
		L.coins(2520, 190, 5);
		L.hazard("SPARK", 2820, 190);
		L.thug(3100, 320);
		L.coins(2700, 320, 3);
		L.hazard("SPARK", 3120, b4);
		L.coins(2520, b4, 4);
		L.web(3300, b4);
		L.thug(3000, b5);
		L.coins(2700, b5, 4);
		L.rope(3330, b5, 320);                                 // rope from the top floor down through the floors
		L.checkpoint(2560, b5);
		// lift back up from the ground if you fall
		L.lift(3500, 90, F, b5, 3, null, "L1");
		L.hint(3420, F - 170, "LIFT");

		/* ---------- C. CRANE WALK (3600 .. 6300), foundation pit below ---------- */
		var cA = L.beam(3620, 300, -70);                       // 3620 .. 3920
		L.checkpoint(3700, cA);
		L.hint(3760, cA - 110, "RIDE THE CRANE GIRDERS");
		L.girder(120, -70, 3940, 4220, 1.6, "G1");             // right edge reaches 4340
		var cB = L.beam(4360, 260, -70);                       // 4360 .. 4620
		L.hazard("SPARK", 4480, cB);
		L.coins(4380, cB, 3, 80);
		L.girder(120, -70, 4640, 4960, 1.8, "G2");             // reaches 5080
		var cC = L.beam(5100, 300, -70);                       // 5100 .. 5400
		L.thug(5300, cC);
		L.coins(5120, cC, 4);
		swing(5400, cC);                                       // to 5660
		var cD = L.beam(5660, 400, -40);                       // 5660 .. 6060
		L.coins(5700, cD, 4);
		L.rope(6040, cD, 250);
		var cE = L.scaffold(5960, 340, 250, F);                // 5960 .. 6300
		L.goblin(6120, cE);
		L.pole(6292, cE, F);

		/* ---------- D. POWER STATION 1 (6300 .. 8880) ---------- */
		L.dirt(6300, 2900);                                    // 6300 .. 9200
		L.checkpoint(6420, F);
		L.prop("CONE", 6520, F).prop("SPOOL", 6640, F);
		L.thug(6860, F);
		L.hazard("SPARK", 7040, F);
		L.hazard("SPARK", 7090, F);
		L.prop("SANDBAGS", 7250, F);
		L.coins(7160, F, 3, 90);
		var shed1 = L.concrete(7400, 400, F - 140);            // 7400 .. 7815, top 400
		L.ladder(7388, shed1, F);
		L.hint(7300, F - 210, "POWER SWITCH 1 OF 2");
		L.lever(7720, shed1, "P2");
		L.web(7560, shed1);
		L.coins(7460, shed1, 3);
		L.prop("WARNING_SIGN", 7900, F);
		L.goblin(8100, F);
		// scaffold tower 2, pole on the right
		var t2a = L.scaffold(8200, 380, F - 130, F);
		var t2b = L.scaffold(8200, 380, F - 260, F);
		var t2c = L.scaffold(8200, 380, F - 390, F);
		var t2d = L.scaffold(8200, 380, F - 520, F);           // 20
		L.pole(8590, t2d, F);
		L.coins(8250, t2a, 3).coins(8250, t2c, 3);
		L.hazard("SPARK", 8400, t2b);
		L.health(8300, t2d);
		swing(8580, t2d);                                      // to 8840

		/* ---------- E. SKELETON TOWER 2 + mid checkpoint (8840 .. 10200) ---------- */
		var e1 = L.slab(8840, 1000, 40, F);                    // 8840 .. 9840
		L.slab(8840, 1000, 170, F);
		L.slab(8840, 1000, 300, F);
		L.slab(8840, 1000, 430, F);
		L.dirt(9200, 1000);                                    // 9200 .. 10200
		L.checkpoint(8920, e1);
		L.coins(8900, e1, 5);
		L.thug(9500, e1);
		L.hazard("SPARK", 9300, 170);
		L.coins(9000, 170, 4);
		L.thug(9700, 300);
		L.coins(9100, 300, 3);
		L.hazard("SPARK", 9600, 430);
		L.venom(9700, F);
		L.coins(9300, F, 4);
		L.rope(9830, e1, 430);
		var e5 = L.beam(9870, 260, 40);                        // 9870 .. 10130
		L.coins(9900, e5, 3);

		/* ---------- F. THE YARD (10130 .. 12200) ---------- */
		// drop to the ground, hook sequence over two pits
		L.dirt(10200, 1000);                                   // 10200 .. 11200
		L.prop("BARRIER", 10350, F).prop("CONE", 10450, F);
		L.thug(10600, F);
		L.prop("PALLET", 10800, F);
		L.coins(10790, F, 3, 70);
		L.hazard("REBAR", 10960, F, 80);
		L.hint(11050, F - 170, "HOOKS OVER THE PITS");
		swing(11200, F);                                       // pit 11200 .. 11460
		L.dirt(11460, 300);                                    // 11460 .. 11760
		L.coins(11520, F, 3);
		swing(11760, F);                                       // pit 11760 .. 12020
		L.dirt(12020, 2480);                                   // 12020 .. 14500
		L.checkpoint(12120, F);

		/* ---------- G. SCAFFOLD MAZE (12200 .. 14500) ---------- */
		L.prop("SPOOL", 12260, F);
		var g1 = L.scaffold(12400, 250, F - 120, F);           // 420
		var g2 = L.scaffold(12760, 250, F - 240, F);           // 300 (gap 110, +120)
		var g3 = L.scaffold(13120, 250, F - 360, F);           // 180
		L.coins(12420, g1, 3).coins(12780, g2, 3).coins(13140, g3, 3);
		L.thug(12900, F);
		L.hazard("REBAR", 13050, F, 80);
		L.prop("SANDBAGS", 13500, F);
		// tall scaffold with a pole, spark boxes on two planks
		var g4 = L.scaffold(13480, 380, F - 130, F);
		var g5 = L.scaffold(13480, 380, F - 260, F);
		var g6 = L.scaffold(13480, 380, F - 390, F);
		var g7 = L.scaffold(13480, 380, F - 520, F);           // 20
		var g8 = L.scaffold(13480, 380, F - 650, F);           // -110
		L.pole(13465, g8, F);
		L.hazard("SPARK", 13700, g5);
		L.hazard("SPARK", 13600, g7);
		L.thug(13750, g6);
		L.coins(13520, g4, 3).coins(13520, g6, 3).coins(13700, g8, 4);
		L.health(13560, g8);
		L.venom(14150, F);
		L.coins(14050, F, 4);
		swing(13860, g8);                                      // to 14120 at -90

		/* ---------- H. HIGH GIRDERS + descent (14120 .. 16000) ---------- */
		var h1 = L.beam(14120, 300, -90);                      // 14120 .. 14420
		L.checkpoint(14200, h1);
		L.girder(120, -90, 14440, 14760, 1.8, "G3");           // reaches 14880
		var h2 = L.beam(14900, 300, -90);                      // 14900 .. 15200
		L.thug(15100, h2);
		L.coins(14920, h2, 4);
		L.hazard("SPARK", 15020, h2);
		L.rope(15190, h2, 200);
		var h3 = L.scaffold(15200, 300, 200, F);               // 15200 .. 15500
		L.coins(15220, h3, 4);
		L.pole(15492, h3, F);
		L.dirt(14500, 1700);                                   // 14500 .. 16200
		L.prop("CONE", 15600, F).prop("WARNING_SIGN", 15700, F);
		L.thug(15900, F);

		/* ---------- I. POWER STATION 2, in the pit (16200 .. 17900) ---------- */
		L.dirt(16200, 1500, F + 100);                          // 16200 .. 17700 at 640
		L.hint(16100, F - 160, "POWER SWITCH 2 IS DOWN IN THE PIT");
		L.hazard("REBAR", 16320, F + 100, 80);
		L.hazard("SPARK", 16600, F + 100);
		var shed2 = L.concrete(16800, 400, F - 60, F + 112);   // 16800 .. 17215, top 480
		L.ladder(16788, shed2, F + 100);
		L.lever(17120, shed2, "P2");
		L.hint(16900, shed2 - 110, "POWER SWITCH 2 OF 2");
		L.coins(16860, shed2, 3);
		L.goblin(17400, F + 100);
		L.hazard("REBAR", 17300, F + 100, 80);
		L.coins(17450, F + 100, 4);
		L.ladder(17688, F, F + 100);
		L.dirt(17700, 1300);                                   // 17700 .. 19000
		L.checkpoint(17800, F);
		L.health(17900, F);
		L.prop("SANDBAGS", 18050, F).prop("PALLET", 18150, F);

		/* ---------- J. THE TOWER LIFT (18490 .. 18960) ---------- */
		L.hint(18300, F - 200, "THE LIFT NEEDS BOTH POWER SWITCHES");
		var core = L.concrete(18600, 300, -390);               // 18600 .. 18915, solid core, top -390
		L.lift(18490, 90, F, core, 3.5, "P2", "L2");           // rides up the left side of the core
		L.thug(18780, core);
		L.checkpoint(18660, core);
		L.coins(18640, core, 3);

		/* ---------- K. FINALE ON THE HIGH STEEL (18960 .. 22600) ---------- */
		var k1 = L.beam(18960, 400, -390);                     // 18960 .. 19360 (gap 45 from the core)
		L.coins(19000, k1, 4);
		swing(19360, k1);                                      // to 19620
		var k2 = L.beam(19620, 300, -360);                     // 19620 .. 19920
		L.coins(19680, k2, 4);
		L.girder(120, -360, 19940, 20260, 2, "G4");            // reaches 20380
		var k3 = L.beam(20400, 300, -360);                     // 20400 .. 20700
		L.hazard("SPARK", 20520, k3);
		L.coins(20420, k3, 3, 80);
		var k4 = L.beam(20810, 300, -280);                     // gap 110, down 80
		L.goblin(20970, k4);
		var k5 = L.beam(21220, 400, -200);                     // gap 110, down 80
		L.checkpoint(21290, k5);
		L.thug(21470, k5);
		L.coins(21270, k5, 4);
		swing(21620, k5);                                      // to 21880
		var top = L.slab(21880, 700, -160, F);                 // 21880 .. 22580
		L.coins(21950, top, 5);
		L.prop("WARNING_SIGN", 22170, top);
		L.goal(22470, top);

		L.set("cameraMaxY", 220);
		return L.build();
	}

	/* ================================================================
	 * STAGE 1-3 - MYSTERIO'S WAREHOUSE
	 * Foggy docks, a warehouse with two ways in (front door or the pipe
	 * to the skylight), a storage hall and catwalk offices full of
	 * Mysterio's tricks (fake walls that shimmer, fake doors whose lamp
	 * flickers, planks that give way, patrol drones, holograms). The two
	 * PROJECTOR CORES - one downstairs behind a fake wall, one upstairs
	 * in the office - open the projector gate to the illusion wing, the
	 * rooftops and the shipyard where the boss door waits.
	 * ================================================================ */
	function buildStage13() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "HIDEOUT" });
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }

		/* ---------- A. FOGGY DOCKS (0 .. 3600) ---------- */
		L.spawn(60, F);
		L.street(0, 3600);
		L.hint(230, F - 110, "MYSTERIO'S WAREHOUSE - NOT EVERYTHING IS REAL");
		L.prop("BARRIER", 420, F).prop("CONE", 540, F);
		L.hologram(760, F, "WELCOME, SPIDER-MAN");
		L.prop("SPOOL", 900, F);
		L.coins(890, F, 3, 75);
		L.thug(1100, F);
		L.prop("CRATE_STACK", 1260, F).prop("TRASH_CAN", 1330, F);
		var ca = L.container(1450, 200, F - 90, "#1b5e8a");
		var cb = L.container(1700, 200, F - 180, "#8a3d2e");
		L.coins(1470, ca, 3);
		L.coins(1720, cb, 4);
		L.web(1860, cb);
		L.thug(2100, F);
		// the first trick: a container wall that is not there (green static now and then)
		L.hint(2080, F - 200, "THAT SHIMMER... IS IT REAL?");
		L.container(2300, 300, F - 260, "#2e6b63", { phantom: true });
		L.coins(2340, F, 4);
		L.hologram(2700, F, "HA HA HA");
		L.thug(2900, F);
		L.health(3100, F);
		L.checkpoint(3300, F);
		L.hint(3380, F - 220, "TWO WAYS IN: THE DOOR, OR THE PIPE TO THE SKYLIGHT");

		/* ---------- B. WAREHOUSE FRONT (3600 .. 5300) ---------- */
		var facade = L.panel(3600, 1700, -260, F + 12, { color: "#2f3545" });   // 3600 .. 5300, roof at -260
		L.door("D1", 3560, F, "D1IN", { label: "FRONT DOOR" });
		L.pipe(3585, facade, F);
		L.prop("VENT", 3700, facade).prop("ANTENNA", 4200, facade).prop("AC_UNIT", 4500, facade);
		L.coins(3800, facade, 4);
		L.thug(4000, facade);
		L.goblin(4700, facade);
		L.coins(4300, facade, 3);
		L.door("D2", 4900, facade, "D2IN", { label: "SKYLIGHT" });
		L.checkpoint(4800, facade);

		/* ---------- C. GROUND FLOOR - STORAGE HALL (5400 .. 9000) ---------- */
		L.room(5350, -20, 3700, 580);
		L.floor(5400, 3600);                                   // 5400 .. 9000
		L.panel(5400, 3310, -80, 20, { color: "#262a36" });    // ceiling 5400 .. 8710 (hole at 8710 .. 8770)
		L.panel(8770, 230, -80, 20, { color: "#262a36" });
		L.panel(5300, 100, -80, F + 12);                       // left wall
		L.panel(9000, 100, -80, F + 12);                       // right wall
		L.door("D1IN", 5500, F, "D1", { label: "FRONT DOOR" });
		L.prop("CRATE_STACK", 5650, F).prop("CRATE", 5760, F);
		L.coins(5640, F, 3, 95);
		L.thug(5950, F);
		L.hint(6150, F - 160, "WATCH THE DRONES");
		L.drone("x", 6200, 6800, F - 45, 1.8);
		L.coins(6300, F, 5);
		// a hole in the floor with rebar, crossed on planks that give way
		L.hint(6850, F - 190, "THE PLANKS WON'T HOLD LONG");
		L.floor(6900, 250, F + 100);                           // the bottom of the hole
		L.hazard("REBAR", 6930, F + 100, 190);
		L.catwalk(6900, 120, F - 10, { crumble: true });
		L.catwalk(7035, 115, F - 10, { crumble: true });
		L.floor(7150, 1850);                                   // 7150 .. 9000
		L.thug(7400, F);
		L.hologram(7750, F, "YOU WILL NEVER FIND THEM");
		L.prop("CRATE", 7950, F);
		L.coins(7940, F, 3, 70);
		L.checkpoint(8150, F);
		// core A: behind a fake wall panel
		L.hint(8180, 300, "SHIMMER = FAKE");
		L.panel(8300, 100, 200, F + 12, { phantom: true });
		L.item("CORE_A", 8500, F, "CORE", "CORE");
		L.coins(8420, F, 3);
		// up to the catwalk floor: ledges, then the ladder through the hole in the ceiling
		L.ledge(8600, 120, F - 120);
		L.ledge(8660, 120, F - 240);
		L.ledge(8720, 120, F - 360);
		L.ladder(8740, -80, 200);
		L.hint(8700, F - 430, "UP THROUGH THE HOLE");
		L.door("D3", 8900, F, "C1", { label: "CONTROL ROOM" });

		/* ---------- D. UPPER FLOOR - CATWALKS + THE HALL OF DOORS (5400 .. 9000, y -80 .. -560) ---------- */
		L.room(5350, -570, 3700, 500);
		L.panel(5400, 3600, -580, -480, { color: "#262a36" });  // ceiling
		L.panel(5300, 100, -580, -80);                          // left wall
		L.panel(9000, 100, -580, -80);                          // right wall
		// the floor of the upper room is the top of the ground floor's ceiling (-80)
		var cw0 = L.beam(5450, 220, -400);                      // skylight landing
		L.door("D2IN", 5550, cw0, "D2", { label: "SKYLIGHT" });
		L.hint(5700, -450, "SOME PLANKS AREN'T THERE");
		var cw1 = L.beam(5770, 280, -300);
		L.coins(5800, cw1, 4);
		var cw2 = L.beam(6160, 240, -380);
		L.catwalk(6520, 220, -380, { phantom: true });          // looks like the way on... it is not
		swing(6400, cw2);
		var cw3 = L.beam(6780, 260, -360);
		L.coins(6800, cw3, 4);
		L.drone("y", -470, -120, 7150, 1.6);
		var cw4 = L.beam(7150, 200, -300);
		L.web(7200, cw4);
		L.thug(6600, -80);
		L.coins(6000, -80, 4);
		L.checkpoint(7400, -80);
		// the hall of doors: two fake exits and the real office door (real lamps glow steady)
		L.hint(7700, -260, "REAL DOORS GLOW STEADY - FAKE ONES FLICKER");
		L.door("H0", 7420, -80, "H0");                           // where the fake doors drop you (no label)
		L.door("HF1", 7650, -80, "H0", { fake: true, label: "EXIT" });
		L.door("HO", 7900, -80, "O1", { label: "OFFICE" });
		L.door("HF2", 8150, -80, "H0", { fake: true, label: "EXIT" });
		L.hologram(8450, -80, "PICK A DOOR");
		L.thug(8650, -80);
		L.coins(8300, -80, 3);

		/* ---------- OFFICE (9200 .. 10000) ---------- */
		L.room(9150, -520, 900, 560);
		L.floor(9200, 800);                                     // 9200 .. 10000
		L.panel(9200, 800, -530, -430, { color: "#262a36" });
		L.panel(9100, 100, -530, F + 12);
		L.panel(10000, 100, -530, F + 12);
		L.door("O1", 9300, F, "HO", { label: "HALL" });
		L.prop("BENCH", 9450, F).prop("CRATE_STACK", 9600, F);
		L.ledge(9700, 140, F - 130);
		L.item("CORE_B", 9770, F - 130, "CORE", "CORE");
		L.hologram(9550, F, "TOO SLOW");
		L.coins(9360, F, 3);
		L.door("O2", 9930, F, "C1", { label: "CONTROL ROOM" });

		/* ---------- E. CONTROL ROOM (10200 .. 11300) ---------- */
		L.room(10150, -20, 1200, 580);
		L.floor(10200, 1100);                                   // 10200 .. 11300
		L.panel(10200, 1100, -80, 20, { color: "#262a36" });
		L.panel(10100, 100, -80, F + 12);
		L.panel(11300, 100, -80, F + 12);
		L.door("C1", 10300, F, "D3", { label: "BACK" });
		L.checkpoint(10420, F);
		L.hint(10560, F - 200, "THE PROJECTOR GATE NEEDS BOTH CORES");
		L.panel(10660, 120, 20, 440, { color: "#2f3545" });     // block above the gate: no jumping over
		L.itemGate(10700, 440, F, "PG", ["CORE_A", "CORE_B"]);
		L.coins(10800, F, 4);
		L.hologram(11000, F, "IMPOSSIBLE");
		L.door("C2", 11200, F, "I1", { label: "ILLUSION WING" });

		/* ---------- F. ILLUSION WING (11400 .. 15000) ---------- */
		L.room(11350, -300, 3700, 860);
		L.panel(11400, 3600, -360, -260, { color: "#262a36" });
		L.panel(11300, 100, -360, F + 12);
		L.panel(15000, 100, -360, F + 12);
		L.floor(11400, 700);                                    // 11400 .. 12100
		L.door("I1", 11500, F, "C2", { label: "BACK" });
		L.hint(11750, F - 180, "THE MIDDLE PLANK FLICKERS - SWING OVER IT");
		L.floor(12100, 600, F + 100);                           // the pit floor 12100 .. 12700
		L.hazard("REBAR", 12130, F + 100, 200);
		L.hazard("REBAR", 12450, F + 100, 200);
		L.catwalk(12100, 150, F - 60);
		L.catwalk(12280, 150, F - 60, { phantom: true });
		L.catwalk(12460, 150, F - 60);
		L.anchor(12355, F - 60 - 300);
		L.ladder(12688, F, F + 100);
		L.floor(12700, 800);                                    // 12700 .. 13500
		L.coins(12760, F, 4);
		L.thug(13000, F);
		L.hologram(13150, F, "THIS WAY, HERO");
		L.door("IF", 13300, F, "I1", { fake: true, label: "EXIT" });
		L.hint(13380, F - 230, "FLICKERING LAMP... AND THAT WALL?");
		L.panel(13450, 60, 100, F + 12, { phantom: true });     // fake wall, the real way on
		L.floor(13500, 1500);                                   // 13500 .. 15000
		L.drone("x", 13700, 14250, F - 45, 2);
		L.coins(13800, F, 5);
		L.checkpoint(14100, F);
		L.thug(14250, F);
		L.floor(14400, 300, F + 100);                           // second hole
		L.hazard("REBAR", 14420, F + 100, 250);
		L.catwalk(14400, 110, F - 10, { crumble: true });
		L.catwalk(14530, 110, F - 10, { crumble: true });
		L.catwalk(14660, 50, F - 10, { crumble: true });
		L.hologram(14850, F, "LEAVING SO SOON?");
		L.door("I2", 14900, F, "R1", { label: "ROOF" });

		/* ---------- G. ROOFTOPS (15200 .. 19400) ---------- */
		var r1 = L.building(15200, 700, 700);                   // roof -160
		L.door("R1", 15300, r1, "I2", { label: "ROOF DOOR" });
		L.prop("VENT", 15450, r1).prop("AC_UNIT", 15600, r1);
		L.thug(15750, r1);
		L.coins(15480, r1, 4);
		L.checkpoint(15400, r1);
		swing(15915, r1);
		var r2 = L.building(16175, 400, 680);                   // roof -140
		L.goblin(16375, r2);
		L.coins(16200, r2, 4);
		L.hint(16300, r2 - 150, "THE PLANKS CRUMBLE - KEEP MOVING");
		L.catwalk(16590, 110, r2, { crumble: true });
		L.catwalk(16720, 110, r2, { crumble: true });
		L.catwalk(16850, 110, r2, { crumble: true });
		var r3 = L.building(16980, 500, 660);                   // roof -120
		L.drone("y", r3 - 260, r3 - 20, 17250, 2);
		L.coins(17020, r3, 3);
		L.checkpoint(17300, r3);
		L.thug(17400, r3);
		swing(17495, r3);
		var r4 = L.building(17755, 400, 600);                   // roof -60
		L.coins(17800, r4, 4);
		L.health(17950, r4);
		L.pole(18172, r4, F);
		L.street(18170, 1230);                                  // 18170 .. 19400
		L.hint(18250, F - 150, "DOWN THE POLE");
		L.venom(18900, F);
		L.prop("SPOOL", 18500, F).prop("CONE", 19200, F);
		L.coins(18600, F, 3);

		/* ---------- H. SHIPYARD FINALE (19400 .. 22700) ---------- */
		L.street(19400, 3300);                                  // 19400 .. 22700
		L.checkpoint(19500, F);
		L.container(19600, 250, F - 90, "#1b5e8a");
		L.container(19600, 250, F - 180, "#8a3d2e", { bottom: F - 90 });
		L.container(19600, 250, F - 270, "#2e6b63", { bottom: F - 180 });
		L.pole(19585, F - 270, F);
		L.coins(19620, F - 270, 4);
		L.container(19950, 250, F - 200, "#6d4a3a");
		L.coins(19970, F - 200, 4);
		L.container(20300, 250, F - 280, "#1b5e8a");
		L.thug(20420, F - 280);
		L.container(20650, 200, F - 120, "#8a3d2e");
		L.thug(20300, F);
		L.prop("BARRIER", 20950, F);
		// the last trick: a tall container wall. The "EXIT" door in front of it is fake (a dead end room);
		// the real way is up the pole and over the wall
		L.hint(21050, F - 170, "EXIT? OR OVER THE TOP?");
		L.door("FD", 21120, F, "DE1", { fake: true, label: "EXIT" });
		L.door("FDB", 21040, F, "FDB");
		L.container(21200, 300, F - 330, "#2f3545");
		L.pole(21185, F - 330, F);
		L.coins(21220, F - 330, 5);
		L.hologram(21700, F, "SEE YOU SOON, SPIDER-MAN");
		L.thug(21900, F);
		L.container(22000, 250, F - 200, "#2e6b63", { phantom: true });
		L.coins(22040, F, 4);
		L.hint(22350, F - 200, "THE BOSS DOOR");
		L.goal(22500, F);
		// dead end room (reached through the fake exit)
		L.room(22850, -20, 700, 580);
		L.floor(22900, 600);
		L.panel(22900, 600, -80, 20, { color: "#262a36" });
		L.panel(22800, 100, -80, F + 12);
		L.panel(23500, 100, -80, F + 12);
		L.door("DE1", 23000, F, "FDB", { label: "BACK" });
		L.hologram(23250, F, "DEAD END. NICE TRY.");
		L.coins(23150, F, 3);

		L.set("cameraMaxY", 200);
		return L.build();
	}

	/* ================================================================
	 * STAGE 1-4 - BOSS: MYSTERIO
	 * His projection chamber: a flat floor, two side ledges and a catwalk
	 * in the middle (so webs can reach him at every height he hovers at),
	 * two web anchors to get across quickly, two hearts on the ledges.
	 * ================================================================ */
	function buildStage14() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "HIDEOUT" });

		L.spawn(120, F);
		L.room(-100, -420, 1700, 980);
		L.floor(0, 1500);                                       // 0 .. 1500
		L.panel(0, 1500, -420, -320, { color: "#262a36" });     // ceiling
		L.panel(-100, 100, -420, F + 12);                       // walls
		L.panel(1500, 100, -420, F + 12);
		var lLedge = L.ledge(140, 280, F - 140);                // 400, 140 .. 420
		var rLedge = L.ledge(1080, 280, F - 140);               // 1080 .. 1360
		var cat = L.beam(520, 460, F - 260);                    // 280, 520 .. 980 (a jump from either ledge)
		L.anchor(470, 190);
		L.anchor(1030, 190);
		L.health(200, lLedge);
		L.health(1300, rLedge);
		L.web(700, cat);
		L.coins(600, cat, 5);
		L.hint(700, F - 370, "JUMP FROM A LEDGE TO THE CATWALK");
		L.hint(300, F - 230, "ONLY THE REAL MYSTERIO TAKES DAMAGE - COPIES FLICKER");
		L.hint(1100, F - 230, "WEBS FLY STRAIGHT: GET TO HIS HEIGHT");
		// hover spots: ground level (hit from the floor), ledge level, catwalk level
		L.boss(750, 300, [
			{ x: 300, y: 480 }, { x: 750, y: 480 }, { x: 1200, y: 480 },
			{ x: 330, y: 370 }, { x: 1170, y: 370 },
			{ x: 640, y: 250 }, { x: 860, y: 250 },
		], 30);
		// the camera sits a little higher than usual so the whole chamber is visible from the floor
		L.set("cameraMinY", 40);
		L.set("cameraMaxY", 60);
		L.set("endPadding", 0);
		return L.build();
	}

	/* ================================================================
	 * STAGE 2-1 - INDUSTRIAL ZONE
	 * Oscorp's industrial district at night: the factory gate with the
	 * first conveyor belts, a pipe run over a sludge pit, the pump yard,
	 * the assembly hall (belts on two levels), the smokestack roofs with a
	 * crane girder and steam vents, the power control yard and, behind
	 * the blast door, the loading bay with the exit on the plant roof.
	 *
	 * Switch puzzle: the blast door to the final area needs BOTH generator
	 * switches. Generator 2 is down in the boiler pit. Generator 1 sits on
	 * the press at the end of the reject line, a belt that runs backwards
	 * faster than Spider-Man can run (and jumping keeps the belt's speed,
	 * so it cannot be hopped either) - the BELT CONTROL switch on top of
	 * the control tank reverses it.
	 *
	 * Belt rules used here: gaps are never jumped against a belt's flow
	 * (the jump is ~40 % shorter), landings after a belt that runs with you
	 * are wide (the jump is ~35 % longer).
	 * ================================================================ */
	function buildStage21() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "INDUSTRIAL" });
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }
		var STEEL = "#3a3f4f", RUST = "#5a3a34", OSCORP = "#2f4a5a";

		/* ---------- A. FACTORY GATE (0 .. 2760) ---------- */
		L.spawn(60, F);
		L.street(0, 1200);                                     // 0 .. 1200
		L.hint(230, F - 110, "OSCORP INDUSTRIAL DISTRICT");
		L.prop("LAMP_POST", 120, F).prop("BARRIER", 420, F).prop("CONE", 520, F);
		L.coins(410, F, 3, 75);
		L.prop("GAS_TANK", 640, F).prop("GAS_TANK", 665, F);
		L.coins(760, F, 4);
		L.thug(980, F);
		L.hazard("SPARK", 1100, F);
		L.floor(1200, 1560);                                   // 1200 .. 2760 (factory yard)
		L.hint(1380, F - 120, "CONVEYOR BELTS CARRY YOU");
		L.conveyor(1350, 400, F, 2);                           // 1350 .. 1750, with you
		L.coins(1420, F, 5, 45);
		L.prop("BARREL", 1830, F);
		L.arc(1790, 1900, F - 40, 50);
		L.hint(2080, F - 120, "WALK OR JUMP AGAINST THE FLOW");
		L.conveyor(1950, 350, F, -2);                          // 1950 .. 2300, against you
		L.coins(2000, F, 4, 45);
		L.hint(2440, F - 170, "STEAM VENTS - WAIT FOR THE PUFF");
		L.steam(2420, F, 0);
		L.web(2350, F);
		L.checkpoint(2580, F);

		/* ---------- B. PIPE RUN over the sludge pit (2700 .. 4500) ---------- */
		// pit 2760 .. 4420; big pipes at different heights, a drone between two of them, a web swing
		var p1 = L.pipeline(2700, 300, F - 110, F + 110);      // 2700 .. 3000 at 430 (jump up through it)
		L.hint(2900, p1 - 110, "DON'T FALL IN THE SLUDGE");
		L.coins(2760, p1, 4);
		var p2 = L.pipeline(3110, 280, 360, F + 110);          // 3110 .. 3390 (gap 110, +70)
		L.coins(3150, p2, 4);
		L.drone("y", 230, 420, 3430, 1.6);                     // patrols the gap 3390 .. 3500
		var p3 = L.pipeline(3500, 400, 300, F + 110, RUST);    // 3500 .. 3900 (gap 110, +60)
		L.coins(3530, p3, 3);
		L.thug(3820, p3);
		L.hint(3860, p3 - 95, "JUMP, THEN SPACE NEAR THE HOOK");
		swing(3900, p3);                                       // gap 3900 .. 4160
		var p4 = L.pipeline(4160, 340, 300, F);                // 4160 .. 4500 (the floor resumes under it)
		L.coins(4200, p4, 4);
		L.health(4400, p4);

		/* ---------- C. PUMP YARD (4420 .. 6000) ---------- */
		L.floor(4420, 1580);                                   // 4420 .. 6000
		L.checkpoint(4560, F);
		L.steam(4720, F, 0);
		L.steam(4840, F, 100);
		L.coins(4700, F, 5, 40);
		L.thug(5200, F);                                       // 290 px after the vents: room to shoot
		L.prop("BARREL", 5400, F);
		L.coins(5390, F, 3, 70);
		L.web(5520, F);
		L.prop("GAS_TANK", 5600, F);
		// the pump tank: climb its pipe up to the assembly hall's upper belt
		var tank = L.factory(5700, 300, 300, { color: "#4f6b5a" }); // pump house 5700 .. 6000, top 300
		L.pipe(5688, tank, F);
		L.hint(5600, F - 200, "UP AT THE PIPE = CLIMB");
		L.coins(5740, tank, 3);
		L.web(5940, tank);
		L.checkpoint(5800, tank);

		/* ---------- D. ASSEMBLY HALL (6000 .. 9800), belts up top, floor route below ---------- */
		L.room(6000, 60, 3800, 480);
		L.floor(6000, 3800);                                   // 6000 .. 9800 (falling down here is safe)
		// upper route
		var c1 = L.conveyor(6000, 500, 300, 2.5);              // 6000 .. 6500, with you
		L.coins(6080, c1, 5, 40, 70);
		var m1 = L.panel(6620, 240, 280, 400, { color: STEEL }); // press 6620 .. 6860 (wide: the jump off the belt is long)
		L.coins(6700, m1, 3);
		var c2 = L.conveyor(6980, 500, 330, 2);                // 6980 .. 7480, with you
		L.coins(7040, c2, 5, 40, 70);
		var m2 = L.panel(7600, 260, 260, 400, { color: STEEL }); // press 7600 .. 7860
		L.web(7820, m2);
		L.coins(7640, m2, 3);
		// floor route
		L.hint(6250, F - 130, "LOWER ROUTE: MIND THE VENTS");
		L.steam(6700, F, 0);
		L.goblin(7050, F, 200);                                // the first flying goblin of world 2, over both routes
		L.thug(7200, F);
		L.steam(7420, F, 110);
		L.coins(6900, F, 4);
		// both routes meet
		L.checkpoint(7940, F);
		L.hint(8150, F - 130, "THE BELT RUNS INTO A VENT - TIME IT");
		L.conveyor(8000, 560, F, 3);                           // 8000 .. 8560
		L.steam(8600, F, 60);
		L.coins(8060, F, 6, 30, 80);
		L.prop("BARREL", 8700, F);
		L.health(8820, F);
		L.thug(9020, F);                                       // far enough behind the barrel to shoot him
		L.hazard("SPARK", 9200, F);
		L.lift(9300, 90, F, 200, 2.5, null, "HALL");           // up to the catwalk
		L.hint(9280, F - 170, "LIFT");
		var cat = L.beam(9390, 410, 200);                      // 9390 .. 9800
		L.coins(9440, cat, 5);

		/* ---------- E. SMOKESTACK ROOFS (9800 .. 12700), everything below is a pit ---------- */
		var r1 = L.factory(9800, 600, 220);                    // 9800 .. 10400 (also closes the hall)
		L.checkpoint(9880, r1);
		L.prop("VENT", 9980, r1);
		L.steam(10150, r1, 40);
		L.coins(10000, r1, 3).coins(10230, r1, 3);
		var r2 = L.factory(10520, 380, 300, { color: "#7a4a3a" }); // 10520 .. 10900 (gap 120, -80)
		L.thug(10800, r2);
		L.coins(10560, r2, 3);
		L.hint(10860, r2 - 150, "RIDE THE CRANE GIRDER");
		L.girder(120, 300, 10920, 11360, 1.8, "CRANE");        // reaches 11480
		L.arc(10980, 11440, r2 - 60, 50, 4);
		var r3 = L.factory(11500, 400, 300, { color: "#4a5a6a" }); // 11500 .. 11900
		L.coins(11530, r3, 3);
		L.web(11620, r3);
		swing(11900, r3);                                      // gap 11900 .. 12160
		var r4 = L.factory(12160, 540, 300, { color: "#7a4a3a" }); // 12160 .. 12700
		L.checkpoint(12260, r4);
		L.steam(12380, r4, 0);
		L.steam(12500, r4, 90);
		L.health(12640, r4);
		L.coins(12280, r4, 6, 40, 70);

		/* ---------- F. POWER CONTROL: the switch puzzle (12700 .. 16400) ---------- */
		L.floor(12700, 2000);                                  // 12700 .. 14700
		L.checkpoint(12780, F);
		L.hint(12900, F - 250, "THE BLAST DOOR NEEDS BOTH GENERATOR SWITCHES");
		// control tank with the belt control on top (off the main path)
		var ctrl = L.factory(12950, 160, 240, { color: "#4f6b5a" }); // 12950 .. 13110, top 240
		L.ladder(12938, ctrl, F);
		L.lever(13070, ctrl, "BELT");
		L.hint(13030, ctrl - 60, "BELT CONTROL");
		L.coins(12990, ctrl, 2);
		// booth: the way onto the reject line
		var booth = L.panel(13250, 170, 400, F + 12, { color: STEEL }); // 13250 .. 13420, top 400
		L.ladder(13238, booth, F);
		L.coins(13280, booth, 3);
		L.hint(13800, 380 - 150, "REJECT LINE - TOO FAST TO RUN AGAINST");
		// the reject line runs backwards at 5.5 px/frame (running is 5) until the belt control reverses it
		L.conveyor(13500, 600, 380, -5.5, { powerId: "BELT", poweredSpeed: 3 });   // 13500 .. 14100
		L.coins(13620, 380, 6, 40, 70);
		// the press with generator switch 1 (only reachable from the end of the reject line)
		var press = L.panel(14100, 200, 300, F + 12, { color: OSCORP }); // 14100 .. 14300, top 300
		L.lever(14250, press, "EXIT");
		L.hint(14200, press - 70, "GENERATOR 1");
		L.coins(14130, press, 2);
		L.thug(13800, F);                                      // guard on the floor under the belt
		L.prop("BARREL", 14420, F);
		L.goblin(14450, F, 150);                               // guards the press and the way down to the boiler pit
		// boiler pit with generator switch 2
		L.hint(14640, F - 150, "GENERATOR 2 IS DOWN IN THE BOILER PIT");
		L.floor(14700, 1000, F + 100);                         // 14700 .. 15700 at 640
		L.health(14780, F + 100);
		L.steam(14900, F + 100, 0);
		L.steam(15080, F + 100, 66);
		L.steam(15260, F + 100, 133);
		L.coins(14960, F + 100, 3, 30, 60);
		var ped = L.panel(15380, 160, F + 40, F + 112, { color: STEEL }); // 15380 .. 15540, top 580
		L.lever(15500, ped, "EXIT");
		L.hint(15460, ped - 70, "GENERATOR 2");
		L.ladder(15688, F, F + 100);
		L.floor(15700, 1000);                                  // 15700 .. 16700 (up to the far side of the door)
		L.checkpoint(15780, F);
		// the blast door: a wall too high to get over, the door in its underpass, one lamp per generator
		L.panel(16400, 300, -360, 440, { color: RUST });       // 16400 .. 16700
		L.gate(16440, 440, F, "EXIT", "SWITCH");
		L.hint(16250, F - 170, "BLAST DOOR");
		L.coins(15860, F, 4);

		/* ---------- G. LOADING BAY + EXIT (16700 .. 18920) ---------- */
		L.floor(16700, 1150);                                  // 16700 .. 17850 (venom's floor ends at the step)
		L.checkpoint(16780, F);
		L.health(16860, F);
		L.web(16940, F);
		L.venom(17400, F);
		L.coins(17100, F, 4);
		L.prop("BARREL", 17700, F);
		L.thug(17620, F);
		// a step, a belt on its housing, then up onto the plant roof
		var step = L.panel(17850, 100, 460, F + 12, { color: STEEL }); // 17850 .. 17950 (+80)
		L.coins(17870, step, 2);
		var lastBelt = L.conveyor(17950, 450, 400, 3, { bottom: F + 12 });   // 17950 .. 18400 (+60)
		L.coins(18000, lastBelt, 5, 40, 70);
		L.hint(18250, lastBelt - 85, "JUMP UP TO THE ROOF");
		var plant = L.factory(18400, 520, 300, { color: OSCORP }); // oscorp plant 18400 .. 18920 (+100)
		L.prop("GAS_TANK", 18520, plant).prop("VENT", 18600, plant);
		L.coins(18460, plant, 3);
		L.goal(18840, plant);

		// the camera may drop to the boiler pit
		L.set("cameraMaxY", 220);
		return L.build();
	}

	/* ================================================================
	 * STAGE 2-2 - RESEARCH LABS
	 * Inside Oscorp's research building: a clean, bright lab look (light
	 * walls, white tiles, specimen tanks, consoles, server racks) instead
	 * of the dark, rusty industrial district. The lobby's laser gates, the
	 * upper floor genetics lab (a drone, a decontamination duct with a low
	 * beam to slide under, timed lasers), the glass atrium over a long drop
	 * (web swings, a hover platform), the security wing with the puzzle,
	 * the containment breach (Venom), a "wave" laser corridor and the
	 * evacuation elevator up to the exit.
	 *
	 * Lasers: green lamp = off, blinking yellow lamp + a dotted line that
	 * fills toward the far emitter = about to fire (harmless), red = on.
	 *
	 * Security puzzle: the LEVEL-3 KEYCARD (it opens the security door) is
	 * behind a laser grid. The grid needs two overrides: one in the
	 * robotics lab upstairs (through the ROBOTICS LAB door), one in the
	 * server room in the basement (down the maintenance shaft).
	 * ================================================================ */
	function buildStage22() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "LAB" });
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }
		var WHITE = "#9fb0ba", STEEL = "#4a5560", DARK = "#2c323d";
		var T = { period: 180, on: 70, warn: 50 };              // standard timing of a laser gate
		function timed(offset) { return { period: T.period, on: T.on, warn: T.warn, offset: offset }; }

		/* ---------- A. LOBBY (0 .. 2440) ---------- */
		L.room(-100, -300, 2540, 840, "LAB");
		L.labfloor(0, 2440);                                   // 0 .. 2440
		L.spawn(60, F);
		L.hint(240, F - 110, "OSCORP RESEARCH LABS - RESTRICTED AREA");
		L.prop("CONSOLE", 300, F).prop("SPECIMEN_TANK", 470, F);
		L.coins(560, F, 4);
		L.thug(900, F);                                        // security guard
		L.coins(1020, F, 3);
		// laser gate 1: an arch hanging from the ceiling, the beam below it cannot be jumped over
		L.hint(1110, F - 160, "LASERS: GREEN = SAFE  BLINKING YELLOW = ABOUT TO FIRE");
		L.panel(1240, 120, 200, 330, { color: WHITE });
		L.laser(1300, 330, F, timed(0));
		L.coins(1380, F, 3);
		L.checkpoint(1500, F);
		// laser gate 2: two beams under one arch, firing one after the other; wait between them
		L.hint(1700, F - 160, "WAIT BETWEEN THE BEAMS");
		L.panel(1800, 260, 200, 330, { color: WHITE });
		L.laser(1850, 330, F, timed(0));
		L.laser(2010, 330, F, timed(90));
		L.coins(1905, F, 2, 30, 40);
		L.prop("SPECIMEN_TANK", 2120, F);
		L.web(2200, F);
		// the lift to the upper floor (its shaft runs along the genetics lab's wall)
		L.lift(2350, 90, F, 250, 2.5, null, "LOBBY");
		L.hint(2300, F - 170, "LIFT TO THE LABS");

		/* ---------- B. GENETICS LAB, upper floor at 250 (2440 .. 5000) ---------- */
		var up = L.labfloor(2440, 2560, 250, F + 12);          // 2440 .. 5000, solid down to the lobby floor
		L.room(2440, -450, 2560, 700, "LAB");
		L.checkpoint(2520, up);
		L.hint(2700, up - 120, "GENETICS LAB");
		L.prop("LAB_BENCH", 2640, up).prop("SPECIMEN_TANK", 2800, up).prop("SPECIMEN_TANK", 2840, up).prop("SPECIMEN_TANK", 2880, up);
		L.prop("CONSOLE", 2960, up);
		L.coins(2660, up, 4, 80);
		// security drone sweeping the lab at head height: jump over it
		L.drone("x", 3100, 3420, up - 35, 1.5);
		L.hint(3150, up - 120, "SECURITY DRONE - JUMP OVER IT");
		L.coins(3120, up, 5, 110);
		L.prop("LAB_BENCH", 3460, up);
		// decontamination duct: 100 px of headroom, a low beam that is always on - slide under it
		L.panel(3600, 320, 40, 150, { color: WHITE });
		L.hlaser(3750, 3780, up - 52, { period: 0, post: up });   // narrow: the slide has a fair timing window
		L.hint(3440, up - 130, "DECONTAMINATION: SLIDE UNDER THE BEAM (DOWN)");
		L.coins(3640, up, 2, 30, 220);
		// specimen room: two timed beams from a ceiling rail
		L.panel(4080, 340, 0, 20, { color: STEEL });
		L.laser(4150, 20, up, timed(0));
		L.laser(4340, 20, up, timed(60));
		L.prop("SPECIMEN_TANK", 4220, up).prop("SPECIMEN_TANK", 4260, up);
		L.coins(4180, up, 3, 30, 60);
		L.web(4480, up);
		L.thug(4700, up);
		L.health(4560, up);
		L.coins(4800, up, 4);

		/* ---------- C. THE GLASS ATRIUM (5000 .. 7600), a long drop below ---------- */
		L.room(5000, -450, 2600, 1000, "ATRIUM");
		L.hint(4900, up - 160, "THE ATRIUM - DON'T LOOK DOWN");
		swing(5000, up);                                       // gap 5000 .. 5260
		L.arc(5020, 5240, up - 90, 60);
		var g1 = L.glass(5260, 300, up);                       // 5260 .. 5560
		L.checkpoint(5330, g1);
		L.hover(120, up, 5580, 5980, 1.6, "HOVER");            // reaches 6100
		L.hint(5500, up - 130, "HOVER PLATFORM");
		L.arc(5600, 6080, up - 70, 50, 5);
		var g2 = L.glass(6120, 300, up);                       // 6120 .. 6420
		L.panel(6230, 80, -20, 40, { color: STEEL });
		L.laser(6270, 40, up, timed(30));
		L.coins(6140, g2, 2).coins(6330, g2, 2);
		swing(6420, g2);                                       // gap 6420 .. 6680
		var g3 = L.glass(6680, 300, up);                       // 6680 .. 6980
		L.coins(6720, g3, 4);
		L.health(6920, g3);
		L.drone("y", 130, 340, 7030, 1.4);                     // patrols the drop to the next walkway
		var g4 = L.glass(7080, 220, 360);                      // 7080 .. 7300 (down 110)
		L.coins(7110, g4, 3);
		var g5 = L.glass(7380, 200, 460);                      // 7380 .. 7580 (down 100)
		L.coins(7400, g5, 3);

		/* ---------- D. SECURITY WING: the puzzle (7600 .. 11000) ---------- */
		L.room(7600, -450, 3400, 990, "LAB");
		// maintenance shaft 8950 .. 9090: 140 px, wide enough that running into it really drops you in (a narrow
		// gap is crossed at running speed), narrow enough to jump over on the way back
		L.labfloor(7600, 1350);                                // 7600 .. 8950
		L.labfloor(9090, 1910);                                // 9090 .. 11000
		L.checkpoint(7680, F);
		L.hint(7820, F - 150, "SECURITY WING - LEVEL 3 KEYCARD REQUIRED");
		L.prop("CONSOLE", 7900, F);
		// robotics lab upstairs (floor 180), reached through a door
		L.door("ROB", 8200, F, "ROBB", { label: "ROBOTICS LAB" });
		var rob = L.labfloor(7900, 1700, 180, 230);            // 7900 .. 9600
		L.room(7900, -450, 1700, 630);                         // dark, high tech
		L.panel(7860, 40, -450, 230, { color: DARK });         // its walls
		L.panel(9600, 40, -450, 230, { color: DARK });
		L.door("ROBB", 7980, rob, "ROB", { label: "EXIT" });
		L.hint(8150, rob - 130, "ROBOTICS LAB - GRID OVERRIDE AT THE FAR END");
		L.prop("SERVER_RACK", 8080, rob).prop("CONSOLE", 8250, rob);
		L.coins(8100, rob, 3, 30, 60);
		L.health(8330, rob);
		L.panel(8420, 620, -120, -100, { color: STEEL });      // ceiling rail for the lasers
		L.laser(8480, -100, rob, timed(0));
		L.laser(8680, -100, rob, timed(50));
		L.laser(8880, -100, rob, timed(100));
		L.coins(8540, rob, 3, 30, 50).coins(8740, rob, 3, 30, 50);
		L.drone("x", 9060, 9300, rob - 35, 1.5);
		L.thug(9420, rob);
		L.web(9000, rob);
		L.lever(9540, rob, "GRID");
		L.hint(9480, rob - 100, "GRID OVERRIDE 1");
		// the basement server room (floor 840), down the maintenance shaft
		L.hint(8990, F - 150, "MAINTENANCE SHAFT - SERVER ROOM BELOW");
		L.ladder(9075, F, 840);
		var bas = L.labfloor(8400, 1500, 840, 980);            // 8400 .. 9900
		L.room(8400, 560, 1500, 280, "SERVER");
		L.panel(8360, 40, 560, 852, { color: DARK });
		L.panel(9900, 40, 560, 852, { color: DARK });
		L.prop("SERVER_RACK", 8480, bas).prop("SERVER_RACK", 8520, bas).prop("SERVER_RACK", 8800, bas);
		L.coins(8460, bas, 4);
		L.health(8650, bas);
		// ankle height beams: time them (no room to jump over them). Far enough from the shaft that falling in
		// at running speed never lands on one
		function ankle(o) { var t = timed(o); t.post = bas; return t; }
		L.hlaser(9260, 9360, bas - 20, ankle(0));
		L.hlaser(9460, 9560, bas - 20, ankle(90));
		L.prop("SERVER_RACK", 9400, bas);
		L.coins(9240, bas, 2, 30, 150).coins(9440, bas, 2, 30, 150);
		L.thug(9720, bas);
		L.lever(9840, bas, "GRID");
		L.hint(9780, bas - 80, "GRID OVERRIDE 2");
		// the keycard vault: a laser grid (solid while on) under its frame
		L.panel(9660, 140, 240, 300, { color: STEEL });
		L.laser(9700, 300, F, { powerId: "GRID" });
		L.laser(9730, 300, F, { powerId: "GRID" });
		L.laser(9760, 300, F, { powerId: "GRID" });
		L.hint(9600, F - 290, "KEYCARD VAULT");
		L.item("L3", 9950, F, "KEYCARD", "L3 KEYCARD");          // the level-3 keycard
		L.checkpoint(10060, F);
		// the security door
		L.panel(10300, 200, -450, 440, { color: DARK });
		L.itemGate(10340, 440, F, "SEC", ["L3"]);
		L.hint(10200, F - 180, "SECURITY DOOR");
		L.coins(10560, F, 4);

		/* ---------- E. CONTAINMENT BREACH + EXIT (11000 .. 14490) ---------- */
		L.room(11000, -450, 3500, 990, "VAULT");
		L.labfloor(11000, 1100);                               // 11000 .. 12100: venom's floor
		L.hint(11100, F - 160, "CONTAINMENT BREACH - SUBJECT ESCAPED");
		L.prop("SPECIMEN_TANK", 11200, F).prop("SPECIMEN_TANK", 11240, F);
		L.venom(11650, F);
		L.coins(11400, F, 4);
		L.health(12000, F);
		L.labfloor(12100, 1690);                               // 12100 .. 13790
		L.checkpoint(12660, F);
		// the wave: five beams whose dark moment travels right a little slower than he runs
		L.hint(12660, F - 200, "RIDE THE WAVE: RUN WHEN THE FIRST BEAM GOES DARK");
		L.panel(12780, 680, 250, 300, { color: STEEL });
		var wave = { period: 160, on: 50, warn: 40 };
		for (var k = 0; k < 5; k++) L.laser(12840 + k * 140, 300, F, { period: wave.period, on: wave.on, warn: wave.warn, offset: (wave.period - 25 * k) % wave.period });
		L.coins(12900, F, 4, 30, 140);
		L.checkpoint(13560, F);
		L.health(13480, F);
		// evacuation elevator up to the exit floor
		L.lift(13700, 90, F, 200, 2.5, null, "EVAC");
		L.hint(13640, F - 170, "EVACUATION ELEVATOR");
		var top = L.labfloor(13790, 700, 200, F + 12);         // 13790 .. 14490
		L.panel(13960, 80, -140, -100, { color: STEEL });
		L.laser(14000, -100, top, timed(0));
		L.coins(13830, top, 3);
		L.thug(14200, top);
		L.prop("CONSOLE", 14300, top);
		L.goal(14420, top);

		// the camera may go down to the basement server room; falling out of the atrium ends far below
		L.set("cameraMaxY", 440);
		L.set("deathY", 980);
		return L.build();
	}

	/* ================================================================
	 * STAGE 2-3 - OSCORP TOWER
	 * A climb from the street to the rooftop, mostly vertical (the same
	 * camera as every other stage: it follows up and down inside a band).
	 * The plaza, the lower floors zig-zagging up (lobby lift, maintenance
	 * floor with steam and sparks, ladder, security floor with lasers,
	 * pole), out of a window onto the facade (a climbable steel lattice
	 * with a laser fence, a web swing to a construction scaffold, a window
	 * washer gondola, a crane walkway to the sky terrace), back inside for
	 * the upper floors and up the glass elevator to the rooftop.
	 *
	 * Objective: the EXECUTIVE ELEVATOR to the roof has no power. Switch 1
	 * is on the research floor, switch 2 on the maintenance floor above
	 * it; the elevator (lamps show 0/2) runs once both are on.
	 *
	 * Floors are 240 px apart (tops): lobby 540, 300, 60, -180, ... the
	 * upper floors -1100, -1340, -1580 and the roof at -2060. Ladders and
	 * poles stand at the edge of the floor they lead to, so the hop at the
	 * top always lands on it. Only the light well outside is a pit.
	 * ================================================================ */
	function buildStage23() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "TOWER" });
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }
		var GLASS = "#1f2533", STEEL = "#4a5560";
		var T = { period: 180, on: 70, warn: 50 };
		function timed(offset) { return { period: T.period, on: T.on, warn: T.warn, offset: offset }; }
		var L1 = 300, L2 = 60, L3 = -180, FA = -1100, FB = -1340, FC = -1580, ROOF = -2060;
		function slab(x, w, top) { return L.labfloor(x, w, top, top + 20); }

		/* ---------- A. PLAZA (0 .. 1200) ---------- */
		L.spawn(60, F);
		L.street(0, 1200);
		L.hint(240, F - 110, "OSCORP TOWER - GET TO THE ROOF");
		L.prop("LAMP_POST", 150, F).prop("BENCH", 330, F).prop("PLANT", 470, F).prop("LAMP_POST", 560, F);
		L.coins(380, F, 4);
		L.thug(650, F);
		L.prop("HYDRANT", 900, F).prop("PLANT", 1100, F);
		L.coins(820, F, 4);

		/* ---------- the tower shell (1200 .. 2600) ---------- */
		L.labfloor(1200, 1400, F, F + 140);                    // lobby floor
		// roof parapets are 300 px: a jump plus the step-up onto a wall whose top is below his head reaches ~220 px
		L.panel(1200, 20, ROOF - 300, 320, { color: GLASS });  // left wall (lobby entrance open below 320, roof parapet on top)
		L.panel(2580, 20, L3, F + 12, { color: GLASS });       // right wall, lower floors
		L.panel(2580, 20, FA, -400, { color: GLASS });         // right wall, facade (the window to the balcony is below -400)
		L.panel(2580, 20, ROOF - 300, -1320, { color: GLASS }); // right wall, upper floors + parapet (terrace opening below -1320)
		// every floor's office (windows show the city)
		[[320, F], [80, L1], [-160, L2], [-400, L3], [-640, -420], [-880, -660], [-1080, -900], [-1320, FA], [-1560, FB], [-2040, FC]].forEach(function(r) {
			L.room(1220, r[0], 1360, r[1] - r[0], "OFFICE");
		});

		/* ---------- B. LOBBY (540) ---------- */
		L.checkpoint(1300, F);
		L.hint(1500, F - 130, "OSCORP TOWER LOBBY");
		L.prop("DESK", 1560, F).prop("PLANT", 1700, F).prop("CONSOLE", 1880, F).prop("PLANT", 2050, F);
		L.coins(1400, F, 5, 30, 60).coins(1950, F, 4);
		L.health(2300, F);
		L.lift(2460, 100, F, L1, 2.5, null, "LIFT1");
		L.hint(2380, F - 160, "LIFT");

		/* ---------- C. MAINTENANCE FLOOR (300): go left ---------- */
		slab(1220, 1220, L1);                                  // 1220 .. 2440 (lift shaft to the right)
		L.hint(2250, L1 - 130, "MAINTENANCE - MIND THE STEAM");
		L.steam(2150, L1, 0);
		L.steam(1900, L1, 100);
		L.coins(1980, L1, 3, 30, 50);
		L.thug(1700, L1);
		L.hazard("SPARK", 1560, L1);
		L.prop("BARREL", 1460, L1).prop("GAS_TANK", 1400, L1);
		L.web(1350, L1);
		L.ladder(1305, L2, L1);                                // up to the security floor (at its floor's edge)
		L.hint(1330, L1 - 140, "UP THE LADDER");

		/* ---------- D. SECURITY FLOOR (60): go right ---------- */
		slab(1320, 1260, L2);                                  // 1320 .. 2580 (ladder opening on the left)
		L.checkpoint(1400, L2);
		L.laser(1750, L3 + 20, L2, timed(0));
		L.laser(2050, L3 + 20, L2, timed(90));
		L.hint(1620, L2 - 150, "SECURITY FLOOR - TIME THE LASERS");
		L.coins(1800, L2, 4, 30, 60);
		L.prop("SERVER_RACK", 1550, L2).prop("DESK", 2130, L2);
		L.thug(2250, L2);
		L.health(2380, L2);
		L.pole(2425, L3, L2);                                  // up to the window floor

		/* ---------- E. WINDOW FLOOR (-180): out onto the facade ---------- */
		slab(1220, 1120, L3);                                  // 1220 .. 2340 (a quiet office)
		slab(2440, 140, L3);                                   // 2440 .. 2580, the way to the window
		L.prop("DESK", 1700, L3).prop("PLANT", 1900, L3);
		L.coins(1600, L3, 5);
		[-420, -660, -900].forEach(function(y) { slab(1220, 1360, y); });   // closed floors above

		/* ---------- F. THE FACADE (outside, 2600 .. 3460) - the light well below is a pit ---------- */
		var b1 = L.ledge(2600, 220, L3);                       // balcony 1
		L.checkpoint(2700, b1);
		L.health(2780, b1);
		L.hint(2660, L3 - 150, "CLIMB THE LATTICE (UP) - WATCH THE LASER FENCE");
		L.lattice(2600, -700, L3, 120);                        // wide: crawl up and sideways
		L.hlaser(2600, 2720, -440, timed(0));                  // laser fence across the lattice
		L.coins(2640, -560, 2, 0, 40).coins(2640, -300, 2, 0, 40);
		var b2 = L.ledge(2600, 200, -700);                     // balcony 2, the top of the lattice
		L.hint(2700, -700 - 100, "JUMP, THEN SPACE NEAR THE HOOK");
		swing(2800, b2);                                       // over the light well
		L.arc(2820, 3040, -700 - 80, 60);
		var sc = L.scaffold(3060, 240, -700, F);               // construction scaffold 3060 .. 3300
		L.checkpoint(3180, sc);
		L.web(3260, sc);
		L.gondola(3320, 120, -700, FA, 1.5, null, "GONDOLA");  // up to the crane walkway
		L.hint(3260, -700 - 110, "WINDOW WASHER GONDOLA");
		// crane walkway 2940 .. 3300: it is one-way, so the gap to the gondola must stay narrower than his body
		// (walking off a platform he only lands on a one-way one he is still above)
		var walk = L.beam(2940, 360, FA);
		L.coins(2980, walk, 5);
		// the sky terrace and back inside
		L.labfloor(2600, 300, FA, FA + 20);                    // terrace 2600 .. 2900
		L.checkpoint(2700, FA);
		L.health(2850, FA);
		L.hint(2700, FA - 160, "POWER THE EXECUTIVE ELEVATOR - 2 SWITCHES");

		/* ---------- G. RESEARCH FLOOR (-1100): go left, power switch 1 ---------- */
		slab(1220, 1360, FA);
		L.laser(2350, FB + 20, FA, timed(0));
		L.laser(2050, FB + 20, FA, timed(60));
		L.prop("SPECIMEN_TANK", 2200, FA).prop("CONSOLE", 1900, FA).prop("LAB_BENCH", 1600, FA);
		L.coins(2150, FA, 3, 30, 60);
		L.web(2450, FA);
		L.thug(1750, FA);
		L.lever(1450, FA, "POWER");
		L.hint(1450, FA - 110, "POWER SWITCH 1");
		L.pole(1305, FB, FA);                                  // up to the maintenance floor

		/* ---------- H. UPPER MAINTENANCE FLOOR (-1340): go right, power switch 2 ---------- */
		slab(1320, 1260, FB);                                  // 1320 .. 2580 (pole opening on the left)
		L.checkpoint(1400, FB);
		L.health(1500, FB);
		L.steam(1700, FB, 0);
		L.conveyor(1900, 300, FB, 2.5);                        // cargo belt toward the switch
		L.coins(1920, FB, 5, 40, 55);
		L.prop("GAS_TANK", 2250, FB).prop("BARREL", 2300, FB);
		L.lever(2380, FB, "POWER");
		L.hint(2380, FB - 110, "POWER SWITCH 2");
		L.lift(2460, 100, FB, FC, 2.5, null, "LIFT2");         // up to the sky lobby

		/* ---------- I. SKY LOBBY (-1580): go left to the executive elevator ---------- */
		slab(1340, 1100, FC);                                  // 1340 .. 2440 (elevator shaft on the left, lift on the right)
		L.checkpoint(2300, FC);
		L.health(2200, FC);
		L.thug(1700, FC);
		L.prop("PLANT", 2050, FC).prop("DESK", 1850, FC).prop("PLANT", 1500, FC);
		L.coins(1950, FC, 4);
		L.hint(1500, FC - 170, "EXECUTIVE ELEVATOR - NEEDS POWER");
		L.elevator(1240, 100, FC, ROOF, 2.5, "POWER", "ELEV");

		/* ---------- J. ROOFTOP (-2060) ---------- */
		slab(1340, 1260, ROOF);                                // 1340 .. 2600
		L.prop("AC_UNIT", 1600, ROOF).prop("ANTENNA", 1760, ROOF).prop("WATER_TANK", 2150, ROOF);
		L.steam(2000, ROOF, 0);
		L.goblin(1900, ROOF, 200);
		L.coins(1420, ROOF, 4);
		L.hint(2300, ROOF - 150, "THE ROOF!");
		L.goal(2500, ROOF);

		return L.build();
	}

	/* ================================================================
	 * STAGE 2-4 - BOSS: THE GREEN GOBLIN
	 * The oscorp tower rooftop at night, high above the city: the roof
	 * (a helipad), two side ledges and a catwalk in the middle (a jump
	 * from either ledge) so webs can reach him at every height he glides
	 * at, two swing hooks, parapets at both ends (nobody falls off),
	 * hearts and web canisters on the ledges. See GoblinBoss for his
	 * attacks (pumpkin bombs with a fuse, the swoop with its lane).
	 * ================================================================ */
	function buildStage24() {
		var F = 540;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "TOWER" });
		var GLASS = "#1f2533";

		// the whole arena fits one screen (960 px): he, his bombs and his swoop lanes are always in view
		L.spawn(120, F);
		L.labfloor(0, 960, F, F + 140);                         // the roof
		L.panel(0, 20, F - 300, F + 12, { color: GLASS });      // parapets (too tall to jump)
		L.panel(940, 20, F - 300, F + 12, { color: GLASS });
		var lLedge = L.ledge(80, 200, F - 140);                 // 400, 80 .. 280
		var rLedge = L.ledge(680, 200, F - 140);                // 680 .. 880
		var cat = L.beam(380, 200, F - 260);                    // 280, 380 .. 580 (a jump from either ledge)
		L.anchor(330, 150);
		L.anchor(630, 150);
		L.health(110, lLedge);
		L.health(850, rLedge);
		L.web(250, lLedge);
		L.web(710, rLedge);
		L.coins(420, cat, 4, 30, 40);
		L.prop("HELIPAD", 430, F).prop("ANTENNA", 40, F).prop("AC_UNIT", 880, F).prop("VENT", 300, F);
		L.hint(180, F - 190, "BOMBS: LEAVE THE RED RING");
		L.hint(780, F - 190, "SWOOP: JUMP OVER HIM");
		// reachable glide spots (floor / ledge / catwalk height) and throwing spots above the arena
		L.goblinBoss(480, 220, [
			{ x: 200, y: 480 }, { x: 480, y: 480 }, { x: 760, y: 480 },
			{ x: 180, y: 360 }, { x: 780, y: 360 },
			{ x: 420, y: 230 }, { x: 540, y: 230 },
		], [
			{ x: 200, y: 170 }, { x: 480, y: 165 }, { x: 760, y: 170 },
		]);                                                     // health: BOSS.GOBLIN.HEALTH (40)
		L.set("cameraMinY", 30);
		L.set("cameraMaxY", 30);
		L.set("endPadding", 0);
		L.set("skylineSink", 260);                              // high above the city
		return L.build();
	}

	/* ================================================================
	 * STAGE 3-1 - HARBOUR DOCKS
	 * The harbour at night (~10 500 px): the quay, wooden piers over the
	 * water with a web swing, a container yard (worker 1 is trapped in
	 * the alley between two stacks - drop in, free him, take the ladder
	 * out), a crane gap that only opens when a web cuts the marked rope
	 * and the crane's container drops into the water, a cargo ship whose
	 * deck is reached over a pallet that drops the same way (worker 2 is
	 * in the ship's hold, down through the open hatch), the last pier, a
	 * final swing and the exit (it needs both workers).
	 * Water: every gap is open water (falling in = game over).
	 * ================================================================ */
	function buildStage31() {
		var F = 540;                                           // quay / pier level
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "HARBOR" });
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }
		L.water(F + 45);

		/* ---------- A. THE QUAY (0 .. 1500) ---------- */
		L.spawn(80, F);
		L.quay(0, 1500);
		L.hint(300, F - 120, "HARBOUR DOCKS - TWO WORKERS ARE TRAPPED SOMEWHERE");
		L.prop("LAMP_POST", 150, F).prop("BOLLARD", 340, F).prop("LIFEBUOY", 560, F).prop("ROPE_COIL", 620, F);
		L.coins(400, F, 5);
		L.prop("CRATE_STACK", 760, F);                         // jump it
		L.arc(700, 860, F - 60, 70);
		L.thug(1100, F);
		L.prop("BOLLARD", 1300, F).prop("LAMP_POST", 1440, F);
		L.hint(1380, F - 150, "DON'T FALL IN THE WATER");
		// water 1500 .. 1630
		L.arc(1500, 1630, F - 30, 70);

		/* ---------- B. THE PIERS (1630 .. 3030) ---------- */
		L.pier(1630, 520);                                     // 1630 .. 2150
		L.prop("ROPE_COIL", 1760, F);
		L.coins(1700, F, 3, 40);
		L.thug(2020, F);
		L.hint(2060, F - 170, "JUMP, THEN SPACE NEAR THE HOOK");
		swing(2150, F);                                        // water 2150 .. 2430
		L.arc(2180, 2400, F - 150, 90, 4);
		L.pier(2430, 600);                                     // 2430 .. 3030
		L.checkpoint(2620, F);
		L.prop("BOLLARD", 2520, F).prop("LIFEBUOY", 2760, F);
		L.coins(2700, F, 4);
		L.health(2930, F);
		// water 3030 .. 3130 (a hop)

		/* ---------- C. CONTAINER YARD (3130 .. 5430) - worker 1 ---------- */
		L.quay(3130, 2300);                                    // 3130 .. 5430
		L.hint(3230, F - 130, "SOMEONE IS CALLING FOR HELP - CHECK BEHIND THE CARGO");
		var s1 = L.container(3330, 240, F - 90, "#1b5e8a");    // 450
		var s2 = L.container(3570, 240, F - 180, "#8a3d2e");   // 360
		var s3 = L.container(3810, 240, F - 270, "#2e6b3a");   // 270 (3810 .. 4050)
		// the alley between s3 and s4 (4050 .. 4190): a 140 px drop, too deep to jump out of - the ladder leads up
		L.rescue(4115, F, "W1");
		L.ladder(4175, s3, F);
		var s4 = L.container(4190, 240, F - 270, "#b8862b");   // 270 (4190 .. 4430)
		var s5 = L.container(4430, 240, F - 180, "#1b5e8a");   // 360
		var s6 = L.container(4670, 200, F - 90, "#8a3d2e");    // 450
		L.coins(3360, s1, 3).coins(3600, s2, 3).coins(3850, s3, 4);
		L.arc(4050, 4190, s3 - 20, 50);
		L.goblin(4310, s4, 150);
		L.coins(4460, s5, 3).coins(4700, s6, 3);
		L.prop("BARREL", 5080, F).prop("LAMP_POST", 4930, F);
		L.checkpoint(5000, F);

		/* ---------- D. THE CRANE GAP (5430 .. 5830) - web the marked rope ---------- */
		L.crane(5170, F - 390, 5060, 5640);                    // legs 5170 / 5260, boom over the water, pulley ~5630
		L.web(5130, F);
		L.hint(5330, F - 175, "WEB THE MARKED ROPE TO DROP THE CARGO (X)");
		// water 5430 .. 5830 (too wide to jump): the container drops into it as a stepping stone
		L.hangingCargo("C1", 5530, 200, F - 290, F, { kind: "CONTAINER", color: "#c0561e", pulleyY: F - 362.5 });
		L.quay(5830, 1070);                                    // 5830 .. 6900
		L.ropeKnot("C1", 5880, F);

		/* ---------- E. SHIP BERTH (5830 .. 6900) - drop the pallet ---------- */
		L.checkpoint(6010, F);
		L.coins(6080, F, 4);
		L.prop("LAMP_POST", 6250, F).prop("ROPE_COIL", 6330, F);
		L.hint(6280, F - 160, "THE SHIP'S DECK IS TOO HIGH - DROP THAT PALLET");
		L.venom(6620, F);
		L.crane(6420, F - 390, 6370, 6850);                    // pulley ~6840
		// lands as a 140 px step (quay -> pallet -> deck); 152 px tall: once down it reaches 12 px into the quay, so its
		// sides block walking (like every block standing on a floor)
		// it lands right against the ship's side (no slot to fall into); its rope is tied off before it, on the left
		L.hangingCargo("P1", 6780, 120, F - 300, F - 140, { kind: "PALLET", height: 152, pulleyY: F - 362.5 });
		L.ropeKnot("P1", 6700, F);

		/* ---------- F. THE CARGO SHIP (6900 .. 8150) - worker 2 in the hold ---------- */
		// the deck (280): 260 px above the quay - more than a jump + step-up reaches (~220), so only the pallet gets you up
		var D = F - 260;
		L.hull(6900, 200, D, F + 120, { name: "HARBOR QUEEN" });   // bow 6900 .. 7100
		L.deck(7100, 340, D);                                  // 7100 .. 7440 (over the hold)
		// the open hatch 7440 .. 7570 - the ladder down into the hold stands at the edge of the deck beyond it
		L.ladder(7555, D, F);
		L.deck(7570, 330, D);                                  // 7570 .. 7900
		L.hull(7900, 250, D, F + 120);                         // stern 7900 .. 8150
		L.cabin(7960, 120, D - 90, D);                         // the bridge
		L.hull(7100, 800, F, F + 120);                         // the hold's floor
		L.room(7100, D + 20, 800, F - D - 20, "HOLD");
		L.hint(7300, D - 110, "AN OPEN HATCH - ANYONE DOWN THERE?");
		L.coins(7150, D, 4);
		L.coins(7620, D, 4);
		// the hold: crates, a barrel, sparking wires and worker 2 at the far end
		L.prop("CRATE_STACK", 7230, F).prop("BARREL", 7400, F);
		L.coins(7180, F, 2).coins(7236, F - 55, 1);
		L.web(7320, F);
		L.health(7600, F);
		L.hazard("SPARK", 7690, F);
		L.rescue(7830, F, "W2");
		L.checkpoint(7930, D);
		L.prop("ANTENNA", 8020, D - 90).prop("LIFEBUOY", 8110, D);
		L.coins(7985, D - 90, 3);
		// water 8150 .. 8290

		/* ---------- G. THE LAST PIER (8290 .. 9300) ---------- */
		L.pier(8290, 1010);                                    // 8290 .. 9300
		L.prop("ROPE_COIL", 8480, F).prop("BOLLARD", 8700, F);
		L.coins(8400, F, 5);
		L.thug(8960, F);
		L.health(9150, F);
		L.prop("LIFEBUOY", 9260, F);
		L.hint(9200, F - 160, "ONE LAST SWING");
		swing(9300, F);                                        // water 9300 .. 9580
		L.arc(9330, 9550, F - 150, 90, 4);

		/* ---------- H. EXIT QUAY (9580 .. 10480) ---------- */
		L.quay(9580, 900);                                     // 9580 .. 10480
		L.prop("LAMP_POST", 9700, F).prop("BOLLARD", 9850, F);
		L.coins(9720, F, 3);
		L.thug(9990, F);
		L.prop("LIFEBUOY", 10200, F);
		L.hint(10150, F - 170, "THE EXIT OPENS ONCE EVERY WORKER IS SAFE");
		L.goal(10330, F);

		return L.build();
	}

	/* ================================================================
	 * STAGE 3-2 - FLOODED SEWERS
	 * Under the city (~8 700 px of brick tunnels): water that can be at
	 * different heights. Shallow water slows spider-man down, deeper water
	 * is "TOO DEEP" (no swimming: a heart and back to dry ground), and
	 * pumps / valves (E) move a pool's level between HIGH and LOW.
	 *  A. the entry: a shallow dip (wading) and a deep channel to jump
	 *  B. a tunnel flooded to the ceiling - the PUMP drains it; worker 1
	 *     waits in the pump room beyond
	 *  C. the cistern: the way on is 260 px up - stand on the raft and
	 *     turn the valve, the water carries you up (worker 2 on a grate up
	 *     there; a second valve on the walkway resets it)
	 *  D. the upper pipe run over a deep channel (steam, a thug, a swing,
	 *     Venom)
	 *  E. the overflow chamber: catwalks over deep water, a swing, the
	 *     MAIN DRAIN - draining it opens the lower walkway (worker 3 up a
	 *     ladder) and the exit tunnel
	 * ================================================================ */
	function buildStage32() {
		var F = 540, U = 280;                                  // the main walkways / the upper run
		var L = new SpidermanGame.LevelBuilder({ floorY: 800, theme: "SEWER" });
		function ceiling(x, w, bottom) { return L.brick(x, w, -400, bottom); }
		function swing(edgeX, surfaceY) { L.anchor(edgeX + 140, surfaceY - 310); }

		/* ---------- A. ENTRY (0 .. 1490): shallow water, a deep channel ---------- */
		L.spawn(60, F);
		ceiling(0, 1490, 300);
		L.brick(0, 500, F, 900);                               // 0 .. 500
		L.hint(260, F - 120, "FLOODED SEWERS - THE MAINTENANCE CREW IS TRAPPED DOWN HERE");
		L.prop("BARREL", 330, F);
		L.brick(500, 400, F + 25, 900);                        // a dip 500 .. 900
		L.pool("S0", 500, 400, F + 25, F - 5);                 // 30 px of water: wading
		L.hint(700, F - 140, "SHALLOW WATER SLOWS YOU DOWN");
		L.coins(560, F + 25, 5, 30, 60);
		L.brick(900, 450, F, 900);                             // 900 .. 1350
		L.thug(1200, F);
		L.hint(1240, F - 170, "DEEP WATER - NO SWIMMING! JUMP IT");
		L.brick(1350, 140, F + 150, 900);                      // the channel 1350 .. 1490
		L.pool("D1", 1350, 140, F + 150, F + 30);              // 120 px deep
		L.arc(1350, 1490, F - 30, 60);

		/* ---------- B. THE FLOODED TUNNEL (1490 .. 3550) ---------- */
		L.brick(1490, 700, F, 900);                            // 1490 .. 2190
		ceiling(1490, 700, 300);
		L.prop("WARNING_SIGN", 1700, F);
		L.hint(1850, F - 170, "FLOODED TUNNEL - USE THE PUMP (E)");
		L.pump("P1", 1990, F, ["T1"], "PUMP");
		L.web(2100, F);
		L.brick(2190, 700, F, 900);                            // the tunnel floor 2190 .. 2890
		ceiling(2190, 700, F - 120);                           // 120 px high
		L.pool("T1", 2190, 700, F, F - 120, F - 18, "HIGH");   // full to the ceiling / 18 px after pumping
		L.coins(2260, F, 4, 30, 45).coins(2680, F, 4, 30, 45);
		L.prop("CRATE", 2520, F);
		L.brick(2890, 660, F, 900);                            // the pump room 2890 .. 3550
		ceiling(2890, 660, 300);
		L.room(2890, 300, 660, 240, "PUMPROOM");
		L.checkpoint(2960, F);
		L.hazard("SPARK", 3150, F);
		L.rescue(3320, F, "W1");
		L.health(3440, F);

		/* ---------- C. THE CISTERN (3550 .. 4070): ride the raft up ---------- */
		ceiling(3550, 520, 40);
		L.valve("V1A", 3520, F, ["C1"], "VALVE");             // on the walkway: resets the cistern
		L.brick(3550, 400, F + 100, 900);                      // the cistern floor
		L.pool("C1", 3550, 400, F + 100, U + 30, F + 50, "LOW");
		L.grate(3620, 120, F + 25);                            // a step down to the raft (3620 .. 3740)
		L.raft(3790, 120, "C1");                               // 3790 .. 3910 (50 px on: narrower than him), 580 / 300
		L.valve("V1", 3925, F + 40, ["C1"], "VALVE");         // only reachable from the raft
		L.hint(3720, F - 110, "STAND ON THE RAFT, THEN TURN THE VALVE (E)");
		L.grate(3560, 130, U + 20);                            // a ledge up in the shaft ...
		L.rescue(3630, U + 20, "W2");                          // ... with worker 2 (a jump from the raft when it is up)
		L.brick(3950, 120, U, 900);                            // the shaft's far wall, the upper run starts on top

		/* ---------- D. THE UPPER PIPE RUN (4070 .. 5800) over a deep channel ---------- */
		ceiling(4070, 1730, -40);
		L.brick(4070, 1730, F + 100, 900);
		L.pool("LC", 4070, 1730, F + 100, F + 10);             // 90 px deep
		L.brick(4070, 300, U, U + 40);                         // 4070 .. 4370
		L.checkpoint(4160, U);
		L.web(4300, U);
		L.pipeline(4500, 400, U + 20, F + 100, "#4e6a5a");    // 4500 .. 4900, top 300
		L.steam(4690, U + 20, 0);
		L.coins(4540, U + 20, 3);
		L.thug(4860, U + 20);
		L.hint(4860, U - 130, "SWING OVER THE CHANNEL");
		swing(4900, U + 20);                                   // 4900 .. 5180
		L.arc(4930, 5150, U - 110, 80, 4);
		L.brick(5180, 620, U, U + 40);                         // 5180 .. 5800
		L.venom(5550, U);
		L.coins(5250, U, 4);
		L.health(5760, U);

		/* ---------- E. THE OVERFLOW CHAMBER (5800 .. 8700) ---------- */
		var C = 420, W = 720;                                  // catwalks / the lower walkway
		ceiling(5800, 2200, -40);
		L.brick(5800, 1000, W + 40, 900);                      // the basin 5800 .. 6800
		L.brick(6800, 1200, W, 900);                           // the lower walkway 6800 .. 8000
		L.pool("M", 5800, 2300, W + 40, C + 50, W - 20, "HIGH");   // 470 (high) / 700 (low)
		L.hint(6000, C - 120, "THE OVERFLOW CHAMBER - FIND THE MAIN DRAIN");
		L.grate(5850, 250, C);                                 // 5850 .. 6100
		L.coins(5880, C, 4);
		L.grate(6250, 250, C);                                 // 6250 .. 6500
		L.checkpoint(6330, C);
		swing(6500, C);                                        // 6500 .. 6780
		L.grate(6780, 300, C);                                 // 6780 .. 7080: the main drain
		L.pump("D1", 6980, C, ["M"], "MAIN DRAIN");
		L.ladder(6805, C, W);                                  // down to the lower walkway (once it is drained)
		L.checkpoint(6900, W);
		L.coins(7050, W, 5);
		L.thug(7470, W);
		L.hazard("SPARK", 7620, W);
		// worker 3 on a maintenance ledge above the water line; its ladder starts on the lower walkway
		L.brick(7750, 250, C + 10, C + 50);                    // 7750 .. 8000, top 430
		L.ladder(7735, C + 10, W);
		L.rescue(7880, C + 10, "W3");
		L.coins(7780, C + 10, 3);
		L.health(7975, C + 10);
		// the exit tunnel (its first 100 px are under water while the chamber is full)
		L.brick(8000, 700, W - 20, 900);                       // 8000 .. 8700, floor 700
		ceiling(8000, 700, W - 160);                           // 140 px high
		L.thug(8330, W - 20);
		L.hint(8450, W - 100, "EXIT - EVERY WORKER SAFE?");
		L.goal(8620, W - 20);

		L.set("cameraMinY", -60);
		L.set("cameraMaxY", 320);
		return L.build();
	}

	/* ================================================================
	 * STAGE 3-3 - UNDERGROUND PUMP STATION
	 * The station that keeps the sewers dry (~7 100 px): concrete halls,
	 * pump machinery, giant pipes. Four workers are trapped, each behind a
	 * different water task, and the exit only opens when all four are safe.
	 *  A. the intake: climb the pipe over a pump housing, ride the trolley
	 *     over the deep intake channel
	 *  B. the sump: the SUMP PUMP drains the basement - worker 1 is
	 *     stranded on a pump housing in the middle (climb its pipe); the
	 *     breaker down there powers the lift back up
	 *  C. the twin basins: the TRANSFER PUMP (no power until the breaker in
	 *     the east tunnel is on) moves the water from one basin to the
	 *     other. East low: its floor leads to the breaker tunnel (worker 3).
	 *     East high: its raft is the stepping stone to the way on. West
	 *     low: the crawl under the bulkhead to worker 2. Every ladder and
	 *     the pump stay reachable, so the water can be moved back any time
	 *  D. the main pump hall: machines over a deep reservoir, a hover
	 *     platform, steam, a goblin, a lattice up the pump tower - the MAIN
	 *     PUMP drains the hall, which unseals the control room (worker 4)
	 *     and the way to the exit
	 * ================================================================ */
	function buildStage33() {
		var F = 540, U = 300;
		var L = new SpidermanGame.LevelBuilder({ floorY: 1000, theme: "STATION" });
		function ceiling(x, w, bottom) { return L.station(x, w, -400, bottom); }

		/* ---------- A. THE INTAKE (0 .. 1050) ---------- */
		L.spawn(60, F);
		ceiling(0, 4670, 40);
		L.station(0, 700, F, 1000);                             // 0 .. 700
		L.hint(230, F - 120, "UNDERGROUND PUMP STATION - THE NIGHT CREW IS TRAPPED DOWN HERE");
		L.machine(450, 200, U, F + 12);                         // a pump housing too tall to jump (240)
		L.pipe(436, U, F);
		L.hint(330, F - 200, "CLIMB THE PIPE (UP)");
		L.coins(480, U, 5);
		L.station(700, 350, 800, 1000);                         // the intake channel 700 .. 1050
		L.pool("IN", 700, 350, 800, F + 40);                    // 220 px deep
		L.girder(100, F, 710, 940, 1.5, "TROLLEY");             // a trolley riding across
		L.hint(880, F - 170, "RIDE THE TROLLEY ACROSS");

		/* ---------- B. THE SUMP (1050 .. 2420) ---------- */
		L.station(1050, 550, F, 1000);                          // 1050 .. 1600
		L.checkpoint(1120, F);
		L.web(1300, F);
		L.coins(1160, F, 4);
		L.hint(1380, F - 160, "THE SUMP IS FLOODED - PUMP IT OUT (E)");
		L.pump("P1", 1520, F, ["SUMP"], "SUMP PUMP");
		L.station(1600, 820, 740, 1000);                        // the basement 1600 .. 2420
		L.pool("SUMP", 1600, 820, 740, F + 20, 725, "HIGH");    // 180 px deep / 15 after pumping
		L.ladder(1600, F, 740);                                 // the way back up
		L.coins(1660, 740, 5, 30, 35);
		L.machine(1850, 160, 520, 752);                         // worker 1's island (dry whatever the water does)
		L.pipe(1836, 520, 740);
		L.rescue(1945, 520, "W1");
		L.lever(2170, 740, "PWR1");
		L.hint(2170, 660, "BREAKER - LIFT POWER");
		L.lift(2310, 100, 740, U, 2, "PWR1", "LIFT1");          // up to the upper gallery once powered

		/* ---------- C. THE TWIN BASINS (2420 .. 4670) ---------- */
		L.station(2420, 470, U, U + 40);                        // the gallery 2420 .. 2890
		L.checkpoint(2480, U);
		L.coins(2600, U, 5);
		L.station(2420, 180, U + 40, 1000);
		// under the gallery: worker 2's crawlspace, behind a bulkhead with a low gap at the bottom
		L.station(2600, 290, 765, 1000);                        // 2600 .. 2890, floor 765
		L.station(2870, 20, U + 40, 700);                       // the bulkhead (the gap: 700 .. 765)
		L.room(2600, U + 40, 270, 765 - U - 40);
		L.rescue(2720, 765, "W2");
		L.web(2630, 765);
		L.coins(2790, 765, 2);
		// the west basin (starts full) with its raft, a ladder up to the gallery
		L.station(2890, 420, 800, 1000);                        // 2890 .. 3310
		L.pool("BW", 2890, 420, 800, U + 30, 770, "HIGH", 3);
		L.raft(3040, 120, "BW");
		L.ladder(2890, U, 800);
		// the pump house between the basins
		L.station(3310, 240, U, 1000);                          // 3310 .. 3550
		L.ladder(3295, U, 800).ladder(3550, U, 800);
		L.checkpoint(3350, U);
		L.pump("TP", 3440, U, ["BW", "BE"], "TRANSFER PUMP", "PWR2");
		L.hint(3430, U - 150, "TRANSFER PUMP - ONE BASIN FILLS, THE OTHER EMPTIES");
		L.health(3520, U);
		// the east basin (starts low) with its raft
		L.station(3550, 420, 800, 1000);                        // 3550 .. 3970
		L.pool("BE", 3550, 420, 800, U + 30, 770, "LOW", 3);
		L.raft(3700, 120, "BE");
		// the east tunnel under the east gallery: worker 3, a thug, the breaker for the transfer pump
		L.station(3970, 400, 765, 1000);                        // 3970 .. 4370, floor 765
		L.station(3970, 700, U, 640);                           // the east gallery 3970 .. 4670 (its underside: the tunnel ceiling)
		L.station(4370, 300, 640, 1000);
		L.room(3970, 640, 400, 125, "PUMPROOM");
		L.rescue(4130, 765, "W3");
		L.coins(3995, 765, 3);
		L.thug(4250, 765);
		L.lever(4330, 765, "PWR2");
		L.hint(4170, 705, "BREAKER - TRANSFER PUMP POWER");
		L.health(4500, U);
		L.coins(4100, U, 5);
		L.checkpoint(4450, U);

		/* ---------- D. THE MAIN PUMP HALL (4670 .. 7100) ---------- */
		ceiling(4670, 2430, -200);
		L.station(4670, 2430, 880, 1000);                       // the hall floor 4670 .. 7100
		L.pool("R", 4670, 1630, 880, 620, 860, "HIGH");         // 260 px deep / 20 after the main pump
		L.hint(4760, U - 120, "THE MAIN PUMP IS UP ON THE TOWER");
		L.machine(4760, 140, 330, 892);                         // M1 4760 .. 4900
		L.coins(4790, 330, 3);
		L.machine(5040, 160, 290, 892);                         // M2 5040 .. 5200
		L.hover(100, 290, 5210, 5480, 1.2, "HOVER1");            // 5210 .. 5580 and back
		L.arc(5240, 5560, 240, 60, 4);
		L.machine(5590, 300, 290, 892);                         // M3 5590 .. 5890 (room to fight)
		L.goblin(5800, 290, 110);
		L.steam(5680, 290, 0);
		L.health(5800, 290);
		L.coins(5610, 290, 2, 30, 40);
		L.coins(5905, 60, 2, 30, 25);
		L.lattice(5770, 60, 290, 120);                          // up the tower's side
		L.hint(5700, 170, "CLIMB THE LATTICE (UP)");
		L.machine(5890, 120, 60, 892);                          // the pump tower 5890 .. 6010
		L.pump("MP", 5950, 60, ["R"], "MAIN PUMP");
		L.ladder(6010, 60, 880);                                // down into the (drained) hall
		L.poolPower("R", "LOW", "CTRL", "CONTROL ROOM UNSEALED");
		L.checkpoint(6100, 880);
		L.hint(6160, 790, "CONTROL ROOM - SEALED WHILE THE HALL IS FLOODED");
		L.gate(6300, 740, 880, "CTRL", "SWITCH");
		L.station(6300, 800, -400, 740);                        // the control room / exit corridor ceiling
		L.room(6330, 740, 300, 140, "PUMPROOM");
		L.rescue(6480, 880, "W4");
		L.coins(6680, 880, 4);
		L.thug(6860, 880);
		L.hint(6850, 800, "EXIT - EVERY WORKER SAFE?");
		L.goal(7020, 880);

		L.set("cameraMinY", -150);
		L.set("cameraMaxY", 560);
		return L.build();
	}

	/* ================================================================
	 * STAGE 3-4 - BOSS: SANDMAN
	 * The harbour's dry dock at night, buried in sand. The arena fits one
	 * screen (960 px): the sand floor, a grate ledge at each side with a
	 * hydrant VALVE on it, dock walls too tall to jump at both ends, two
	 * swing hooks high up (the way over him: he is too tall to jump), a
	 * web canister and a heart on each ledge, no checkpoints.
	 * Sandman (see Sandman / BOSS.SANDMAN) walks after spiderman; webs do
	 * nothing to dry sand. Each valve pours water from its pipe onto the
	 * floor next to its ledge - exactly where he stops when he walks up to
	 * spiderman standing at that valve. Soaked, he turns to mud and webs
	 * hurt him; then the valve recharges (its gauge). He slams sand fists
	 * (a red zone first) and sends ground waves (red arrows first).
	 * ================================================================ */
	function buildStage34() {
		var F = 540, LEDGE = F - 110;
		var L = new SpidermanGame.LevelBuilder({ floorY: F, theme: "HARBOR" });
		L.spawn(110, F);
		L.sand(0, 960, F, F + 160);                              // the dock floor
		L.station(0, 20, F - 300, F + 12);                       // the dock walls (too tall to jump)
		L.station(940, 20, F - 300, F + 12);
		L.grate(20, 230, LEDGE);                                 // left ledge 20 .. 250
		L.grate(710, 230, LEDGE);                                // right ledge 710 .. 940
		// the valves: each pipe pours onto the floor just inside its ledge - where he stands when he comes for you (his
		// center never gets closer to a ledge than 330 / 630: an 80 px gap up there to step out of a fist's zone)
		L.hydrant("VL", 60, LEDGE, { x: 330, top: 175, bottom: F, width: 130 });
		L.hydrant("VR", 900, LEDGE, { x: 630, top: 175, bottom: F, width: 130 });
		L.web(200, LEDGE).web(760, LEDGE);
		L.health(150, LEDGE).health(810, LEDGE);
		L.anchor(400, 125).anchor(560, 125);                     // swing over him (he is too tall to jump)
		L.hint(480, 235, "WEBS DO NOTHING TO DRY SAND");
		L.hint(170, 330, "STAND AT A VALVE, LET HIM COME...");
		L.hint(790, 330, "...THEN SOAK HIM (E)");
		L.sandmanBoss(480, F);                                   // health: BOSS.SANDMAN.HEALTH (48)
		L.set("cameraMinY", 40);
		L.set("cameraMaxY", 40);
		L.set("endPadding", 0);
		return L.build();
	}

	SpidermanGame.campaign.addWorld({
		id: 1,
		name: "WORLD 1 - DOWNTOWN",
		subtitle: "Clear every stage to reach the boss",
		clearedText: "MYSTERIO'S SHOW IS OVER - EVERY STAGE OF WORLD 1 IS YOURS",
		levels: [
			{ id: "1-1", name: "ROOKIE ROOFTOPS", design: buildStage11() },
			{ id: "1-2", name: "HIGH STEEL", design: buildStage12() },
			{ id: "1-3", name: "MYSTERIO'S WAREHOUSE", design: buildStage13() },
			{ id: "1-4", label: "BOSS", name: "MYSTERIO", boss: true, design: buildStage14() },
		],
	});

	// World 2 opens once the World 1 boss is beaten (its first stage follows 1-4 in the unlock chain).
	// Stages with design: null are listed as "SOON" and cannot be started yet
	SpidermanGame.campaign.addWorld({
		id: 2,
		name: "WORLD 2 - OSCORP",
		subtitle: "Clear every stage to reach the boss",
		clearedText: "THE GOBLIN IS GROUNDED - EVERY STAGE OF WORLD 2 IS YOURS",
		levels: [
			{ id: "2-1", name: "INDUSTRIAL ZONE", design: buildStage21() },
			{ id: "2-2", name: "RESEARCH LABS", design: buildStage22() },
			{ id: "2-3", name: "OSCORP TOWER", design: buildStage23() },
			{ id: "2-4", label: "BOSS", name: "GREEN GOBLIN", boss: true, design: buildStage24() },
		],
	});

	// World 3 opens once the World 2 boss is beaten: the harbour, the sewers, the pump station and the Sandman fight
	SpidermanGame.campaign.addWorld({
		id: 3,
		name: "WORLD 3 - HARBOUR",
		subtitle: "Clear every stage to reach the boss",
		clearedText: "SANDMAN IS WASHED UP - EVERY STAGE OF WORLD 3 IS YOURS",
		levels: [
			{ id: "3-1", name: "HARBOUR DOCKS", design: buildStage31() },
			{ id: "3-2", name: "FLOODED SEWERS", design: buildStage32() },
			{ id: "3-3", name: "PUMP STATION", design: buildStage33() },
			{ id: "3-4", label: "BOSS", name: "SANDMAN", boss: true, design: buildStage34() },
		],
	});

})();
