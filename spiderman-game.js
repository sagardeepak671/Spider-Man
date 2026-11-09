(function(window, document) {

// change this to relative path (relative to script) or to absolute path
// where the audio, fonts and images folders are located
// (include a slash at the end)
var RESOURCES_FOLDER_PATH = "";

var requestAnimationFrame = (function() {
	if (window.requestAnimationFrame) return window.requestAnimationFrame;
	if (window.oRequestAnimationFrame) return window.oRequestAnimationFrame;
	if (window.msRequestAnimationFrame) return window.msRequestAnimationFrame;
	if (window.mozRequestAnimationFrame) return window.mozRequestAnimationFrame;
	return function(callback) {
		setTimeout(callback, 1000 / 60);
	}
})();

window.requestAnimFrame = requestAnimationFrame;

var link = document.createElement("link");
link.setAttribute("rel", "stylesheet");
link.setAttribute("href", RESOURCES_FOLDER_PATH + "css/spiderman-game.css");
document.head.appendChild(link);


var RESOURCES = {
	"JUMP"               : "images/jump.png",
	"RUNNING_CHANGE_STEP": "images/running-change-step.png",
	"RUNNING_LEFT_STEP"  : "images/running-left-step.png",
	"RUNNING_RIGHT_STEP" : "images/running-right-step.png",
	"SHOOT_CHANGE_STEP"  : "images/shoot-change-step.png",
	"SHOOT_JUMP"         : "images/shoot-jump.png",
	"SHOOT_LEFT-STEP"    : "images/shoot-left-step.png",
	"SHOOT_RIGHT-STEP"   : "images/shoot-right-step.png",
	"SHOOT"              : "images/shoot.png",
	"SLIDE"              : "images/slide.png",
	"STANDING"           : "images/standing.png",
	"WEB_PROJECTILE"     : "images/web.png",
	"BACKGROUND"         : "images/background.jpg",
	"ROOF"               : "images/wall.jpg",
	"BUILDING"           : "images/building.png",
	"SPIDER_HEAD"        : "images/spider-head.png",
	"HEART"              : "images/heart.png",
	"VENOM"              : "images/venom.png",
	"THUG"               : "images/thug.png",
	"GOBLIN"             : "images/goblin.png",
	"KNIFE"              : "images/knife.png",
	"MYSTERIO"           : "images/mysterio.png",
	"SANDMAN"            : "images/sandman.png",
};

var AUDIO_RESOURCES = {
	"AMAZING_SPIDER_MAN_2" : new Audio(RESOURCES_FOLDER_PATH + "audio/amazing-spider-man-2.mp3"),
	"FRIENDLY_SPIDERMAN"   : new Audio(RESOURCES_FOLDER_PATH + "audio/60-theme-song.mp3"),
	"MOVIE_THEME"          : new Audio(RESOURCES_FOLDER_PATH + "audio/old-theme.mp3"),
	"ANIMATED_SERIES"      : new Audio(RESOURCES_FOLDER_PATH + "audio/animated-series-theme.mp3"),
	"SHOOT"                : new Audio(RESOURCES_FOLDER_PATH + "audio/shooting-web.mp3"),
};

var AUDIO_LOOP = [
	"AMAZING_SPIDER_MAN_2",
	"FRIENDLY_SPIDERMAN",
	"MOVIE_THEME",
	"ANIMATED_SERIES",
];

var KEY = {
	ARROW_LEFT: 37,
	ARROW_UP: 38,
	ARROW_RIGHT: 39,
	ARROW_DOWN: 40,
	SPACEBAR: 32,
	ENTER: 13,
	A: 65,
	S: 83,
	D: 68,
	W: 87,
	X: 88,
	E: 69,     // campaign: rescue a trapped worker (touch: the RESCUE button)
	F: 70,
	ESC: 27,
};

// keys that the game consumes while playing (so the page never scrolls)
var GAME_KEYS = [
	KEY.ARROW_LEFT, KEY.ARROW_UP, KEY.ARROW_RIGHT, KEY.ARROW_DOWN,
	KEY.SPACEBAR, KEY.X, KEY.E, KEY.ESC,
];

var DIRECTION = {
	RIGHT: 1,
	LEFT: -1,
}

// combat tuning (all values in pixels / frames, ~60 frames per second)
var COMBAT = {
	WEB_RANGE: 600,            // how far a web shot travels before it fizzles out (world pixels, camera independent; ~the visible screen)
	WEB_SPEED: 10,             // web projectile speed per frame
	SHOOT_COOLDOWN: 30,        // frames between two web shots (holding or tapping X)
	MAX_WEB: 50,               // web fluid capacity
	INVULNERABLE_FRAMES: 75,   // safe time after spiderman takes a hit (~1.25s)
	PROJECTILE_CLEANUP_MARGIN: 150, // projectiles this far outside the screen are removed
};

// enemy stats (web shots deal 2 damage)
var ENEMIES = {
	THUG:   { HEALTH: 4,  SCORE: 10 },
	VENOM:  { HEALTH: 10, SCORE: 30, SCALE: 0.55, SPEED: 2.6, DETECT_RANGE: 380, BITE_DAMAGE: 1 },
	GOBLIN: { HEALTH: 6,  SCORE: 20, SCALE: 1, ATTACK_INTERVAL: 120, HOVER_HEIGHT: 45, BOB_AMPLITUDE: 40,
	          PATROL_SPEED: 0.018, BOB_SPEED: 0.045, AIM_RANGE: 520, BOMB_SPEED: 6, BOMB_GRAVITY: 0.12 },
};

// camera: spiderman is kept at LEFT_EDGE while running; the world behind him is kept for BACKSCROLL
// pixels so the camera can scroll back a bit when he walks left (useful when fighting)
var CAMERA = {
	LEFT_EDGE: 150,
	BACK_DEADZONE: 20,   // spiderman can drift this far left of LEFT_EDGE before the camera scrolls back
	BACKSCROLL: 450,
};

// sliding: a short fixed dash, not a hold-to-slide
var SLIDE = {
	DURATION: 26,   // frames
	SPEED: 7,
	SCALE: 0.42,    // sprite scale while sliding (normal is 0.5) so spiderman gets lower
	COOLDOWN: 12,   // frames before the next slide can start
};

// scoring: points for distance, coins and defeated enemies
var SCORING = {
	DISTANCE_STEP: 50,   // 1 point for every 50 world pixels travelled
	COIN: 5,
};

// collectables
var PICKUPS = {
	COIN:   { RADIUS: 8 },
	HEALTH: { RADIUS: 11, AMOUNT: 1 },   // hearts restored
	WEB:    { RADIUS: 11, AMOUNT: 15 },  // web fluid restored
	KEY:    { RADIUS: 11 },              // campaign keycard (opens a locked gate)
	// placement (distances in world pixels)
	COIN_ROW_CHANCE: 0.6,        // chance that a roof carries a row of coins
	COIN_ROW_MIN: 3,
	COIN_ROW_MAX: 5,
	COIN_SPACING: 28,
	COIN_HIGH_ROW_CHANCE: 0.3,   // some rows float high and need a jump
	COIN_GAP_ARC_CHANCE: 0.35,   // coins arcing over the gap between two roofs
	HEALTH_CHANCE: 0.18,
	HEALTH_MIN_DISTANCE: 1200,   // at least this far between two health pickups
	WEB_CHANCE: 0.3,
	WEB_MIN_DISTANCE: 700,       // at least this far between two web pickups
	ENEMY_CLEARANCE: 70,         // keep pickups this far away from an enemy's spawn spot
};

// how enemies are placed on the roofs as the run goes on (distances in world pixels)
var SPAWN = {
	BASE_CHANCE: 0.5,             // chance that a roof near the start has an enemy
	MAX_CHANCE: 0.75,             // chance far into the run
	CHANCE_RAMP_DISTANCE: 1000,   // +10% chance per this many pixels
	CONSECUTIVE_PENALTY: 0.25,    // less likely right after an occupied roof
	THUG_WEIGHT: 10,
	VENOM_DISTANCE: 1500,         // venom starts showing up after this distance
	VENOM_START_WEIGHT: 2,
	VENOM_MAX_WEIGHT: 6,
	VENOM_MIN_ROOF_WIDTH: 300,    // venom needs room to run
	GOBLIN_DISTANCE: 2500,        // goblin starts showing up after this distance
	GOBLIN_START_WEIGHT: 2,
	GOBLIN_MAX_WEIGHT: 5,
	WEIGHT_RAMP_DISTANCE: 1500,   // +1 weight per this many pixels
};

// game modes: the endless run generates random roofs forever, the campaign plays fixed, hand made levels
var MODE = {
	ENDLESS: "ENDLESS",
	CAMPAIGN: "CAMPAIGN",
};

// campaign tuning. The campaign is rendered "zoomed out": the canvas stays 711x400 but the world is drawn
// smaller, so VIEW_HEIGHT world pixels fit vertically (~960 x 540 world pixels are visible instead of 711 x 400).
// Physics (jump height ~153 px, jump length ~215 px, speeds) are in world pixels and do not change with the zoom,
// so levels are designed in world pixels and play exactly the same at any zoom.
var CAMPAIGN = {
	VIEW_HEIGHT: 540,        // world pixels visible vertically (zoom = 400 / 540 = 0.74)
	CAMERA_ANCHOR: 0.38,     // spiderman is kept at this fraction of the view width while moving right
	CAMERA_DEADZONE: 40,     // he can walk this far back before the camera scrolls back with him
	INTRO_FRAMES: 150,       // "STAGE 1-1" title card at the start of a level (the level is playable meanwhile)
	ENEMY_ENGAGE_HEIGHT: 260, // ... and roughly at their height (vertical distance)
	ENEMY_ENGAGE_RANGE: 560, // campaign enemies only attack when spiderman is this close (the zoomed out view shows
	                         // them much earlier than in the endless run, where "on screen" = within ~560 px)
	GOAL_WIDTH: 40,          // touch area of the goal flag
	CAMERA_TOP: 0.30,        // vertical camera: spiderman is kept between these fractions of the view height ...
	CAMERA_BOTTOM: 0.70,
	CAMERA_EASE: 0.18,       // ... easing toward that band (jumps inside the band don't move the camera)
};

// climbing (campaign): ladders, pipes and tall fences are "climbable" surfaces. Spiderman grabs one with UP
// (or DOWN from the top), climbs up / down, and leaves it with SPACE (jump away) or by climbing past its ends
var CLIMB = {
	SPEED: 3,              // px per frame up / down
	GRAB_SLACK: 26,        // how far his body center may be from the surface's center to grab it
	JUMP_OFF_VY: -13,      // vertical speed when jumping away from a surface
	JUMP_OFF_VX: 4.5,      // extra horizontal push when jumping away while holding a direction
	TOP_HOP_VY: -8,        // small hop when climbing past the top of a surface
	GRACE: 14,             // frames during which he cannot grab again after leaving a surface
	STEP_SOUND_EVERY: 9,   // frames between two climbing step sounds
};

// web swing (campaign): press SPACE in the air near a web anchor to shoot a web to it and swing on a simple
// pendulum; SPACE again lets go (DOWN drops). Tuned for crossing designed gaps, not free swinging
var SWING = {
	RANGE_X: 230,          // anchor must be within this horizontal distance ...
	MIN_ABOVE: 30,         // ... and at least this far above his hands
	MAX_LENGTH: 260,       // longest web
	MIN_LENGTH: 70,
	MIN_ANGLE: 1.05,       // rad (~60 deg): every swing gets at least enough energy to reach this far on the other side
	MAX_ANGLE: 1.3,        // rad (~75 deg): the swing never goes higher than this
	PUMP: 0.0003,          // small extra angular push per frame while holding a direction (~15% of gravity)
	RELEASE_BOOST_VY: -2,  // little upward help when letting go
	MAX_RELEASE_SPEED: 12,
	GRACE: 15,             // frames before the next web can attach
};

// steam vents (campaign, industrial stages): a timed hazard on a fixed cycle of PERIOD frames - idle, a WARN
// hiss with small puffs (harmless), then a BLAST column that costs a heart (with the usual knock-back)
var STEAM = {
	PERIOD: 200,           // frames per cycle (a vent may override it; "offset" shifts vents against each other)
	WARN: 40,              // warning frames before the blast
	BLAST: 55,             // frames the column hurts
	WIDTH: 30,             // vent / column width
	HEIGHT: 140,           // column height above the vent
};

// security lasers (campaign, lab stages): a beam between two emitters. Timed lasers cycle OFF -> WARN -> ON every
// PERIOD frames (the WARN phase blinks the emitter lamps yellow and fills a dotted line toward the far emitter: when
// it is full, the beam fires). Lasers with a powerId are a grid that stays on until its switches are all on.
var LASER = {
	PERIOD: 180,           // frames per cycle (a laser may override it; "offset" shifts lasers against each other)
	ON: 70,                // frames the beam is on
	WARN: 50,              // warning frames before it fires
	HALF: 2.5,             // half the thickness of the deadly part of the beam
	SOUND_RANGE: 520,      // only lasers this close to spiderman beep / hum
};

// trapped workers (campaign, world 3): a worker pinned under a fallen beam. Stand next to him and press E (touch:
// the RESCUE button) to free him. Every stage with workers has a rescued counter in the HUD, and its exit flag only
// clears the stage once every worker is safe. Rescues are part of a checkpoint snapshot like key items
var RESCUE = {
	REACH_X: 60,           // spiderman's center must be this close (horizontally) to the worker ...
	REACH_ABOVE: 90,       // ... his feet at most this far above the worker's surface ...
	REACH_BELOW: 30,       // ... or this far below it
	FREE_FRAMES: 40,       // the beam is lifted off him over this many frames
	EXIT_WARN_EVERY: 120,  // frames between two "exit locked" messages while standing at a locked exit flag
};

// harbour (world 3): marked ropes that a web shot cuts (the cargo they hold drops and opens a path), water
var HARBOR = {
	KNOT_HIT_X: 18,        // a web within this far (horizontally) of a marked knot ...
	KNOT_HIT_Y: 22,        // ... and this far vertically cuts it (webs fly straight at mid-body height: a knot at
	                       // surface - 30 is hit from standing on that surface)
	DROP_GRAVITY: 0.9,     // px per frame added to a falling cargo's speed (a plain ease-in, no physics)
	DROP_MAX_SPEED: 16,
};

// sewer water (world 3): pools whose level a pump / valve moves between HIGH and LOW. Shallow water (up to DEEP px over
// his feet) slows spider-man down; deeper water is "TOO DEEP" (no swimming): a heart and back to the last dry or
// shallow ground he stood on. Rafts float on the surface (and rest on the pool's floor when it is drained)
var POOLS = {
	WADE_SPEED: 0.6,       // walking speed factor while wading
	DEEP: 40,              // water more than this far over his feet is too deep
	SPEED: 1.5,            // px per frame a pool's level moves toward its target
	REACH_X: 50,           // a pump / valve is used with E when his center is this close ...
	REACH_Y: 40,           // ... and his feet are this close to the control's surface
	RAFT_OFFSET: 10,       // a raft's top floats this far above the water
	SAFE_BACK: 45,         // "TOO DEEP" puts him back where he stood on safe ground this many ground frames ago (not
	                       // right at the water's edge, so a held direction does not walk him straight back in)
};

// touch devices: on-screen buttons (see buildTouchControls)
var TOUCH = {
	PORTRAIT_TOP: 8,          // css px above the game when the phone is held upright ...
	PORTRAIT_CONTROLS: 230,   // ... and at least this much room kept for the buttons under it
	PAUSE_PAD: 12,            // extra canvas px around the HUD pause button for fingers
	LANDSCAPE_SIDE: 90,       // css px kept free at each side of the game for the buttons (phone held sideways)
};

// high level game flow states
var STATE = {
	LOADING: "LOADING",
	MENU: "MENU",
	PLAYING: "PLAYING",
	PAUSED: "PAUSED",
	GAMEOVER: "GAMEOVER",
	COMPLETE: "COMPLETE",    // campaign stage cleared
};

var STORAGE_KEYS = {
	BEST_SCORE: "spiderman-game-best-score",
	SETTINGS: "spiderman-game-settings",
	THEME: "spiderman-game-theme",
	CAMPAIGN: "spiderman-game-campaign",
};

var GAMEOVER_MESSAGES = {
	FELL: "YOU FELL OFF THE ROOFTOPS",
	HEALTH: "THE THUGS TOOK YOU DOWN",
};
var CAMPAIGN_GAMEOVER_MESSAGES = {
	FELL: "YOU FELL INTO THE PIT",
	HEALTH: "THE STREET GOT THE BETTER OF YOU",
	WATER: "YOU FELL INTO THE HARBOUR",
	FLOOD: "THE FLOOD SWEPT YOU AWAY",
};

function readStorage(key) {
	try {
		return window.localStorage ? window.localStorage.getItem(key) : null;
	} catch (e) {
		return null;
	}
}

function writeStorage(key, value) {
	try {
		if (window.localStorage) window.localStorage.setItem(key, value);
	} catch (e) {}
}

/* ------------------------------------------------------------------
 * Sound effects
 *
 * The repo only ships one effect file (shooting-web.mp3), so the other
 * effects are tiny chiptune style sounds generated with the Web Audio
 * API. The AudioContext is created on the first user gesture, which is
 * what browsers require, so autoplay rules never cause errors.
 * ------------------------------------------------------------------ */

function SoundFX(game) {
	this.game = game;
	this.context = null;
	this.master = null;
	this.played = {}; // name -> how many times it was triggered (handy for debugging / tests)
}

SoundFX.prototype.isReady = function() {
	return !!(this.context && this.context.state === "running");
}

// must be called from a user gesture (click / key press)
SoundFX.prototype.unlock = function() {
	var AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if (!AudioContextClass) return false;

	if (!this.context) {
		try {
			this.context = new AudioContextClass();
			this.master = this.context.createGain();
			this.master.gain.value = 0.8;
			this.master.connect(this.context.destination);
		} catch (e) {
			this.context = null;
			return false;
		}
	}

	if (this.context.state === "suspended" && this.context.resume) {
		var result = this.context.resume();
		if (result && result.then) result.then(null, function() {});
	}

	return true;
}

// one note. opts: freq, freqEnd, type, duration, volume, delay, detune (adds a slightly detuned
// second oscillator for a fatter sound)
SoundFX.prototype.tone = function(opts) {
	var context = this.context;
	var now = context.currentTime + (opts.delay || 0);
	var duration = opts.duration || 0.1;
	var voices = opts.detune ? [0, opts.detune] : [0];

	var gain = context.createGain();
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.linearRampToValueAtTime(opts.volume || 0.2, now + 0.006);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
	gain.connect(this.master);

	for (var i = 0; i < voices.length; i++) {
		var oscillator = context.createOscillator();
		oscillator.type = opts.type || "square";
		oscillator.detune.value = voices[i];
		oscillator.frequency.setValueAtTime(opts.freq || 440, now);
		if (opts.freqEnd) {
			oscillator.frequency.exponentialRampToValueAtTime(opts.freqEnd, now + duration);
		}
		oscillator.connect(gain);
		oscillator.start(now);
		oscillator.stop(now + duration + 0.02);
	}
}

// a short burst of filtered noise. opts: duration, volume, filter, delay
SoundFX.prototype.noise = function(opts) {
	var context = this.context;
	var now = context.currentTime + (opts.delay || 0);
	var duration = opts.duration || 0.1;
	var length = Math.max(1, Math.floor(context.sampleRate * duration));

	var buffer = context.createBuffer(1, length, context.sampleRate);
	var data = buffer.getChannelData(0);
	for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

	var source = context.createBufferSource();
	source.buffer = buffer;

	var filter = context.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(opts.filter || 1000, now);
	if (opts.filterEnd) {
		filter.frequency.exponentialRampToValueAtTime(opts.filterEnd, now + duration);
	}

	var gain = context.createGain();
	gain.gain.setValueAtTime(opts.volume || 0.2, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	source.connect(filter);
	filter.connect(gain);
	gain.connect(this.master);
	source.start(now);
	source.stop(now + duration + 0.02);
}

var SFX_LIBRARY = {
	// springy two-step "boing": a short low blip, then a fast upward sweep
	JUMP: function(s) {
		s.tone({ type: "square", freq: 330, duration: 0.05, volume: 0.32 });
		s.tone({ type: "square", freq: 440, freqEnd: 1040, duration: 0.18, volume: 0.36, delay: 0.045, detune: 6 });
	},
	LAND: function(s) {
		s.noise({ duration: 0.07, volume: 0.3, filter: 420 });
		s.tone({ type: "triangle", freq: 140, freqEnd: 80, duration: 0.08, volume: 0.25 });
	},
	SLIDE: function(s) {
		s.noise({ duration: 0.26, volume: 0.4, filter: 1600, filterEnd: 250 });
		s.tone({ type: "sawtooth", freq: 260, freqEnd: 120, duration: 0.22, volume: 0.12 });
	},
	// crunchy "ouch": falling buzz with a noise crackle
	HURT: function(s) {
		s.tone({ type: "square", freq: 240, freqEnd: 95, duration: 0.14, volume: 0.42, detune: 12 });
		s.tone({ type: "sawtooth", freq: 130, freqEnd: 45, duration: 0.32, volume: 0.38, delay: 0.06 });
		s.noise({ duration: 0.16, volume: 0.32, filter: 1800, filterEnd: 300 });
	},
	ENEMY_HIT: function(s) {
		s.tone({ type: "square", freq: 920, freqEnd: 480, duration: 0.08, volume: 0.34 });
		s.noise({ duration: 0.06, volume: 0.22, filter: 2500 });
	},
	// little victory arpeggio + pop
	ENEMY_DEFEAT: function(s) {
		s.noise({ duration: 0.22, volume: 0.3, filter: 900, filterEnd: 200 });
		s.tone({ type: "triangle", freq: 660, duration: 0.07, volume: 0.36 });
		s.tone({ type: "triangle", freq: 880, duration: 0.07, volume: 0.36, delay: 0.07 });
		s.tone({ type: "triangle", freq: 1100, duration: 0.07, volume: 0.36, delay: 0.14 });
		s.tone({ type: "triangle", freq: 1320, duration: 0.22, volume: 0.36, delay: 0.21, detune: 8 });
	},
	// bright two note "ding"
	COIN: function(s) {
		s.tone({ type: "square", freq: 1318, duration: 0.07, volume: 0.34 });
		s.tone({ type: "square", freq: 1760, duration: 0.3, volume: 0.34, delay: 0.07, detune: 5 });
	},
	PICKUP: function(s) {
		s.tone({ type: "square", freq: 523, duration: 0.07, volume: 0.34 });
		s.tone({ type: "square", freq: 659, duration: 0.07, volume: 0.34, delay: 0.07 });
		s.tone({ type: "square", freq: 784, duration: 0.07, volume: 0.34, delay: 0.14 });
		s.tone({ type: "square", freq: 1047, duration: 0.3, volume: 0.36, delay: 0.21, detune: 6 });
	},
	DENY: function(s) {
		s.tone({ type: "square", freq: 190, freqEnd: 150, duration: 0.12, volume: 0.26 });
		s.tone({ type: "square", freq: 190, freqEnd: 140, duration: 0.16, volume: 0.26, delay: 0.14 });
	},
	EMPTY: function(s) {
		s.tone({ type: "square", freq: 130, duration: 0.05, volume: 0.28 });
		s.noise({ duration: 0.04, volume: 0.15, filter: 3000 });
	},
	PAUSE: function(s) {
		s.tone({ type: "square", freq: 700, duration: 0.07, volume: 0.3 });
		s.tone({ type: "square", freq: 470, duration: 0.14, volume: 0.3, delay: 0.08 });
	},
	RESUME: function(s) {
		s.tone({ type: "square", freq: 470, duration: 0.07, volume: 0.3 });
		s.tone({ type: "square", freq: 700, duration: 0.14, volume: 0.3, delay: 0.08 });
	},
	MENU_MOVE: function(s) {
		s.tone({ type: "square", freq: 640, freqEnd: 720, duration: 0.05, volume: 0.22 });
	},
	MENU_SELECT: function(s) {
		s.tone({ type: "square", freq: 720, freqEnd: 1300, duration: 0.12, volume: 0.3, detune: 6 });
	},
	// slow sad walk down
	GAME_OVER: function(s) {
		var notes = [494, 466, 440, 415];
		for (var i = 0; i < notes.length; i++) {
			s.tone({ type: "square", freq: notes[i], duration: 0.24, volume: 0.3, delay: i * 0.25, detune: 10 });
			s.tone({ type: "triangle", freq: notes[i] / 2, duration: 0.24, volume: 0.22, delay: i * 0.25 });
		}
		s.tone({ type: "square", freq: 392, freqEnd: 370, duration: 0.9, volume: 0.3, delay: 1.0, detune: 10 });
		s.tone({ type: "triangle", freq: 196, duration: 0.9, volume: 0.22, delay: 1.0 });
	},
	// grabbing a ladder / pipe / fence: short thud with a scrape
	CLIMB_GRAB: function(s) {
		s.noise({ duration: 0.06, volume: 0.3, filter: 900 });
		s.tone({ type: "square", freq: 220, freqEnd: 330, duration: 0.07, volume: 0.22 });
	},
	// one climbing step
	CLIMB_STEP: function(s) {
		s.noise({ duration: 0.035, volume: 0.18, filter: 1400 });
		s.tone({ type: "triangle", freq: 300, freqEnd: 200, duration: 0.04, volume: 0.12 });
	},
	// web line shoots up and snaps onto an anchor: fast rising zip + click
	WEB_ATTACH: function(s) {
		s.noise({ duration: 0.12, volume: 0.25, filter: 3000, filterEnd: 800 });
		s.tone({ type: "square", freq: 500, freqEnd: 1500, duration: 0.1, volume: 0.26 });
		s.tone({ type: "square", freq: 1200, duration: 0.04, volume: 0.3, delay: 0.1 });
	},
	// letting go of the web: a whoosh
	SWING_RELEASE: function(s) {
		s.noise({ duration: 0.22, volume: 0.3, filter: 600, filterEnd: 2400 });
		s.tone({ type: "triangle", freq: 700, freqEnd: 400, duration: 0.12, volume: 0.12 });
	},
	// found the keycard: sparkly arpeggio
	KEY: function(s) {
		var notes = [988, 1319, 1568, 1976];
		for (var i = 0; i < notes.length; i++) {
			s.tone({ type: "square", freq: notes[i], duration: 0.08, volume: 0.3, delay: i * 0.07, detune: 6 });
		}
		s.tone({ type: "triangle", freq: 2637, duration: 0.35, volume: 0.25, delay: 0.3 });
	},
	// shutter / gate rolling up: low rumble with mechanical ticks
	GATE_OPEN: function(s) {
		s.noise({ duration: 0.7, volume: 0.3, filter: 300, filterEnd: 900 });
		for (var i = 0; i < 6; i++) s.tone({ type: "square", freq: 180 + i * 25, duration: 0.05, volume: 0.16, delay: i * 0.1 });
		s.tone({ type: "triangle", freq: 330, duration: 0.2, volume: 0.22, delay: 0.62 });
	},
	// gate refuses to open
	GATE_LOCKED: function(s) {
		s.tone({ type: "square", freq: 150, duration: 0.07, volume: 0.28 });
		s.noise({ duration: 0.08, volume: 0.2, filter: 700 });
		s.tone({ type: "square", freq: 110, duration: 0.16, volume: 0.26, delay: 0.1 });
	},
	// switch lever
	SWITCH: function(s) {
		s.tone({ type: "square", freq: 420, duration: 0.04, volume: 0.28 });
		s.tone({ type: "square", freq: 640, duration: 0.05, volume: 0.28, delay: 0.05 });
		s.noise({ duration: 0.05, volume: 0.15, filter: 2200, delay: 0.05 });
	},
	// checkpoint reached: two rising notes
	// a web snaps a marked rope: a taut twang dropping in pitch + a crack
	ROPE_SNAP: function(s) {
		s.tone({ type: "square", freq: 1400, freqEnd: 380, duration: 0.16, volume: 0.3, detune: 8 });
		s.noise({ duration: 0.08, volume: 0.3, filter: 5000, filterEnd: 1200 });
		s.tone({ type: "triangle", freq: 220, freqEnd: 140, duration: 0.25, volume: 0.2, delay: 0.05 });
	},
	// dropped cargo comes down: a heavy boom with rumble
	CARGO_DROP: function(s) {
		s.noise({ duration: 0.45, volume: 0.5, filter: 700, filterEnd: 80 });
		s.tone({ type: "sawtooth", freq: 95, freqEnd: 38, duration: 0.4, volume: 0.35 });
	},
	// a pump / valve is thrown: a heavy clunk, then the motor spins up
	PUMP: function(s) {
		s.noise({ duration: 0.08, volume: 0.35, filter: 900 });
		s.tone({ type: "square", freq: 110, freqEnd: 220, duration: 0.6, volume: 0.16, delay: 0.06, detune: 10 });
		s.noise({ duration: 0.9, volume: 0.18, filter: 600, filterEnd: 1500, delay: 0.1 });
	},
	// sandman winds up: a deep rumble of shifting sand
	RUMBLE: function(s) {
		s.noise({ duration: 0.6, volume: 0.35, filter: 260, filterEnd: 120 });
		s.tone({ type: "sawtooth", freq: 60, freqEnd: 45, duration: 0.5, volume: 0.2 });
	},
	// a ground wave rolls out
	SAND_WAVE: function(s) {
		s.noise({ duration: 0.55, volume: 0.4, filter: 1400, filterEnd: 300 });
		s.tone({ type: "triangle", freq: 180, freqEnd: 70, duration: 0.4, volume: 0.2 });
	},
	// a web hits dry sand: a soft puff
	SAND_PUFF: function(s) {
		s.noise({ duration: 0.18, volume: 0.28, filter: 2200, filterEnd: 600 });
	},
	// a valve opens a water pipe
	WATER_SPRAY: function(s) {
		s.noise({ duration: 1.1, volume: 0.36, filter: 4000, filterEnd: 1500 });
		s.tone({ type: "sine", freq: 300, freqEnd: 500, duration: 0.3, volume: 0.12 });
	},
	// something (or someone) hits the water
	SPLASH: function(s) {
		s.noise({ duration: 0.5, volume: 0.42, filter: 3200, filterEnd: 300 });
		s.tone({ type: "sine", freq: 420, freqEnd: 120, duration: 0.2, volume: 0.18 });
	},
	// a freed worker: bright rising "hooray" arpeggio over a soft chord
	RESCUE: function(s) {
		var notes = [523, 659, 784, 1047, 1319];
		for (var i = 0; i < notes.length; i++) {
			s.tone({ type: "square", freq: notes[i], duration: 0.09, volume: 0.28, delay: i * 0.065, detune: 5 });
		}
		s.tone({ type: "triangle", freq: 262, duration: 0.45, volume: 0.22 });
		s.tone({ type: "triangle", freq: 1568, duration: 0.3, volume: 0.2, delay: 0.33 });
	},
	CHECKPOINT: function(s) {
		s.tone({ type: "square", freq: 784, duration: 0.09, volume: 0.3, detune: 6 });
		s.tone({ type: "square", freq: 1175, duration: 0.25, volume: 0.32, delay: 0.09, detune: 6 });
		s.tone({ type: "triangle", freq: 392, duration: 0.3, volume: 0.2, delay: 0.09 });
	},
	// a platform giving way
	// a pumpkin bomb explodes
	BOMB: function(s) {
		s.noise({ duration: 0.45, volume: 0.4, filter: 900, filterEnd: 120 });
		s.tone({ type: "square", freq: 120, freqEnd: 40, duration: 0.35, volume: 0.22 });
	},
	// laser about to fire: a short high beep
	LASER_WARN: function(s) {
		s.tone({ type: "square", freq: 1320, duration: 0.045, volume: 0.12 });
	},
	// laser fires: a bright zap with a buzzing tail
	LASER_ON: function(s) {
		s.tone({ type: "sawtooth", freq: 220, freqEnd: 880, duration: 0.12, volume: 0.12 });
		s.tone({ type: "square", freq: 110, duration: 0.25, volume: 0.08, delay: 0.08, detune: 8 });
	},
	// a laser grid shuts down: descending sweep
	LASER_OFF: function(s) {
		s.tone({ type: "sawtooth", freq: 900, freqEnd: 120, duration: 0.5, volume: 0.14 });
	},
	// steam vent blast: a rushing hiss
	STEAM: function(s) {
		s.noise({ duration: 0.55, volume: 0.22, filter: 3200, filterEnd: 1400 });
		s.noise({ duration: 0.25, volume: 0.12, filter: 800, delay: 0.05 });
	},
	CRUMBLE: function(s) {
		s.noise({ duration: 0.3, volume: 0.35, filter: 500, filterEnd: 150 });
		s.tone({ type: "square", freq: 160, freqEnd: 60, duration: 0.25, volume: 0.2 });
	},
	// stepping through a door: short descending whoosh + click
	DOOR: function(s) {
		s.noise({ duration: 0.25, volume: 0.25, filter: 1500, filterEnd: 300 });
		s.tone({ type: "triangle", freq: 520, freqEnd: 260, duration: 0.2, volume: 0.18 });
		s.tone({ type: "square", freq: 880, duration: 0.05, volume: 0.22, delay: 0.22 });
	},
	// a hologram / illusion revealing itself
	ILLUSION: function(s) {
		s.tone({ type: "sawtooth", freq: 300, freqEnd: 900, duration: 0.18, volume: 0.14, detune: 20 });
		s.noise({ duration: 0.2, volume: 0.15, filter: 2500, filterEnd: 600 });
	},
	// bumping the head on a ceiling
	BUMP: function(s) {
		s.tone({ type: "triangle", freq: 180, freqEnd: 120, duration: 0.06, volume: 0.22 });
		s.noise({ duration: 0.04, volume: 0.18, filter: 600 });
	},
	// stage cleared: quick rising fanfare
	LEVEL_CLEAR: function(s) {
		var notes = [523, 659, 784, 1047, 784, 1047, 1319];
		var lengths = [0.09, 0.09, 0.09, 0.18, 0.09, 0.09, 0.5];
		var t = 0;
		for (var i = 0; i < notes.length; i++) {
			s.tone({ type: "square", freq: notes[i], duration: lengths[i], volume: 0.34, delay: t, detune: 6 });
			s.tone({ type: "triangle", freq: notes[i] / 2, duration: lengths[i], volume: 0.22, delay: t });
			t += lengths[i];
		}
	},
	// fanfare after the game over jingle
	NEW_BEST: function(s) {
		var notes = [523, 659, 784, 1047, 784, 1047];
		var lengths = [0.1, 0.1, 0.1, 0.2, 0.1, 0.45];
		var t = 2.0;
		for (var i = 0; i < notes.length; i++) {
			s.tone({ type: "square", freq: notes[i], duration: lengths[i], volume: 0.34, delay: t, detune: 6 });
			t += lengths[i];
		}
	},
};

// plays an effect by name; silently does nothing when effects are off or audio isn't unlocked yet
SoundFX.prototype.play = function(name) {
	if (!this.game.soundEffects) return false;
	if (!SFX_LIBRARY[name]) return false;

	this.played[name] = (this.played[name] || 0) + 1;

	if (!this.isReady()) return false;

	try {
		SFX_LIBRARY[name](this);
	} catch (e) {
		return false;
	}
	return true;
}

/* ------------------------------------------------------------------
 * Small particle burst (enemy defeat)
 * ------------------------------------------------------------------ */

function Burst(game, x, y, color, count) {
	this.game = game;
	this.ctx = game.ctx;
	this.particles = [];
	this.life = 28;

	count = count || 10;
	for (var i = 0; i < count; i++) {
		var angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
		var speed = 1.5 + Math.random() * 2.5;
		this.particles.push({
			x: x,
			y: y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 1,
			size: 2 + Math.random() * 3,
		});
	}
	this.color = color || "white";
}

Burst.prototype.update = function() {
	var ctx = this.ctx;
	var alpha = this.life / 28;

	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.fillStyle = this.color;
	for (var i = 0; i < this.particles.length; i++) {
		var p = this.particles[i];
		ctx.fillRect(p.x - this.game.cameraX - p.size / 2, p.y - p.size / 2, p.size, p.size);
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.12;
	}
	ctx.restore();

	this.life--;
	if (this.life <= 0) this.game.removeFloatingText(this);
}

/* ------------------------------------------------------------------
 * Pixel art sprites
 *
 * Spider-Man's sprites are 5 px blocks drawn at 0.5 scale, so one "art
 * pixel" of the game is 2.5 world pixels. Every object drawn by the game
 * itself (props, pickups, ladders, anchors, ...) is defined here as a
 * small text grid on that same grid so everything matches. Each sprite is
 * rendered once into an offscreen canvas (5 canvas px per art pixel, like
 * the PNG sprites) and drawn scaled to PIXEL world pixels per art pixel.
 * ------------------------------------------------------------------ */

var PIXEL = 2.5;

var PIXEL_PALETTE = {
	"k": "#1b1b22", // outline / black
	"w": "#f4f4f4", // white
	"l": "#e8f7ff", // very light blue
	"y": "#ffd83d", // yellow
	"Y": "#b8860b", // dark gold
	"o": "#ff8a1f", // orange
	"h": "#ffb36b", // light orange
	"r": "#e3201b", // red
	"R": "#7a0c12", // dark red
	"b": "#7fb2ff", // light blue
	"B": "#1b3a8a", // dark blue
	"z": "#23306b", // navy
	"c": "#49b6ff", // cyan
	"g": "#8d949b", // gray
	"G": "#4e4a52", // dark gray
	"s": "#b7bec5", // silver
	"x": "#5f666d", // slate
	"d": "#2a2a33", // darkest gray
	"n": "#6d4a3a", // brown
	"m": "#8a5f4b", // mid brown
	"N": "#3b2a25", // dark brown
	"t": "#c9a36b", // tan
	"e": "#3fa534", // green
	"E": "#1f5a24", // dark green
	"p": "#a64dff", // purple
	"P": "#5a2d6e", // dark purple
	"q": "#9c5043", // brick
	"Q": "#7a3b30", // dark brick
	"a": "#e6cf5c", // sand (sandman's fists and waves)
	"A": "#b59a3a", // dark sand
	"u": "#f6eeb0", // pale sand
};

var PIXEL_SPRITES = {
	// ---- pickups ----
	COIN_0: [
		".YYYY.",
		"YyyyyY",
		"YyYyyY",
		"YyYyyY",
		"YyyyyY",
		".YYYY.",
	],
	COIN_1: [
		"..YY..",
		".YyyY.",
		".YYyY.",
		".YYyY.",
		".YyyY.",
		"..YY..",
	],
	COIN_2: [
		"..YY..",
		"..Yy..",
		"..Yy..",
		"..Yy..",
		"..Yy..",
		"..YY..",
	],
	HEART: [
		".RR...RR.",
		"RrwR.RrrR",
		"RrrrrrrrR",
		"RrrrrrrrR",
		".RrrrrrR.",
		"..RrrrR..",
		"...RrR...",
		"....R....",
	],
	WEB_CAN: [
		"..GGG..",
		".GsssG.",
		".GbbbG.",
		"GbwbwbG",
		"GbbwbbG",
		"GbwbwbG",
		".GbbbG.",
		".GGGGG.",
		"..sss..",
	],
	KEYCARD: [
		".kkkkkkk.",
		"kyyyyyyyk",
		"kyGGyyyyk",
		"kyGGywyyk",
		"kyyyyyyyk",
		".kkkkkkk.",
	],

	// ---- rooftop props ----
	CRATE: [
		"nnnnnnnnnnn",
		"nNtttttttNn",
		"ntNtttttNtn",
		"nttNtttNttn",
		"ntttNtNtttn",
		"nttttNttttn",
		"ntttNtNtttn",
		"nttNtttNttn",
		"ntNtttttNtn",
		"nNtttttttNn",
		"NNNNNNNNNNN",
	],
	AC_UNIT: [
		"xxxxxxxxxxxxxxxxxx",
		"xssssssssssssssssx",
		"xsgggggggsxxxxxxsx",
		"xsgGGGGGgsxGGGGxsx",
		"xsgGggGGgsxxxxxxsx",
		"xsgGgGGGgsxGGGGxsx",
		"xsgGGGGGgsxxxxxxsx",
		"xsgggggggsxGGGGxsx",
		"xssssssssssssssssx",
		"xxxxxxxxxxxxxxxxxx",
		".GG............GG.",
		".GG............GG.",
	],
	WATER_TANK: [
		".....xxxx.....",
		"...xxGGGGxx...",
		".xxGGGGGGGGxx.",
		"NNNNNNNNNNNNNN",
		"NmnnnnnnnnnnnN",
		"NmnnnnnnnnnnnN",
		"NNNNNNNNNNNNNN",
		"NmnnnnnnnnnnnN",
		"NmnnnnnnnnnnnN",
		"NmnnnnnnnnnnnN",
		"NmnnnnnnnnnnnN",
		"NmnnnnnnnnnnnN",
		"NNNNNNNNNNNNNN",
		"NmnnnnnnnnnnnN",
		"NmnnnnnnnnnnnN",
		"NNNNNNNNNNNNNN",
		".NN........NN.",
		".NN........NN.",
		".NN........NN.",
		".NNNNNNNNNNNN.",
		".NN........NN.",
		".NN........NN.",
	],
	CHIMNEY: [
		"xxxxxxxx",
		"xGGGGGGx",
		"QqqQqqQq",
		"qQqqQqqQ",
		"QqqQqqQq",
		"qQqqQqqQ",
		"QqqQqqQq",
		"qQqqQqqQ",
		"QqqQqqQq",
		"qQqqQqqQ",
		"QqqQqqQq",
		"qQqqQqqQ",
	],
	ANTENNA: [
		"..sw..",
		"..gg..",
		"..gg..",
		"gggggg",
		"..gg..",
		"..gg..",
		".gggg.",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		"..gg..",
		".GGGG.",
		"GGGGGG",
	],
	VENT: [
		"xxxxxxxxx",
		"xgggggggx",
		"xGGGGGGGx",
		"xgggggggx",
		"xGGGGGGGx",
		"xgggggggx",
		"xGGGGGGGx",
		"xxxxxxxxx",
	],
	DOOR: [
		"xxxxxxxxxxxxxx",
		"xggggggggggggx",
		"xgxxxxxxxxxxgx",
		"xgxddddddddxgx",
		"xgxdbbbbbbdxgx",
		"xgxdbbbbbbdxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xgxddddddyyxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xgxddddddddxgx",
		"xxxxxxxxxxxxxx",
	],
	BILLBOARD: [
		"xxxxxxxxxxxxxxxxxxxxxx",
		"xwwwwwwwwwwwwwwwwwwwwx",
		"xwrrrrrrrrrrrrrrrrrrwx",
		"xwrrrrrrrwwrrrrrrrrrwx",
		"xwrrrrrrwwwwrrrrrrrrwx",
		"xwrrrrrrrwwrrrrrrrrrwx",
		"xwBBBBBBBBBBBBBBBBBBwx",
		"xwBBwwBwwBwBwwBBBBBBwx",
		"xwBBwwwwwwwwwwwBBBBBwx",
		"xwBBBBBBBBBBBBBBBBBBwx",
		"xwwwwwwwwwwwwwwwwwwwwx",
		"xxxxxxxxxxxxxxxxxxxxxx",
		"....GG........GG......",
		"....GG........GG......",
		"....GG........GG......",
		"....GG........GG......",
	],

	// ---- street props ----
	DUMPSTER: [
		"EEEEEEEEEEEEEEEEEEEEEE",
		"EeeeeeeeeeeeeeeeeeeeeE",
		"EEEEEEEEEEEEEEEEEEEEEE",
		"EeeeeeeeeeeeeeeeeeeeeE",
		"EeEEEEEeeeeeeeEEEEEeeE",
		"EeeeeeeeeeeeeeeeeeeeeE",
		"EeeeeeewwwwwwweeeeeeeE",
		"EeeeeeeweeeeeweeeeeeeE",
		"EeeeeeewwwwwwweeeeeeeE",
		"EeeeeeeeeeeeeeeeeeeeeE",
		"EeeeeeeeeeeeeeeeeeeeeE",
		"EEEEEEEEEEEEEEEEEEEEEE",
		".kk................kk.",
		".kk................kk.",
	],
	HYDRANT: [
		".rrr.",
		"rRrRr",
		".rrr.",
		"rrrrr",
		".rrr.",
		".rrr.",
		".rrr.",
		".rRr.",
		"RRRRR",
	],
	LAMP_POST: [
		".yyyy.",
		"ylllly",
		"ylllly",
		"yyyyyy",
		"GGGGGG",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		"..GG..",
		".GGGG.",
		"GGGGGG",
		"GGGGGG",
	],
	TRASH_CAN: [
		"ssssss",
		"GggggG",
		"GgggGG",
		"GgggGG",
		"GgggGG",
		"GgggGG",
		"GgggGG",
		"GGGGGG",
	],
	FENCE_LOW: [
		"GG....................GG",
		"GGssssssssssssssssssssGG",
		"GGs.s.s.s.s.s.s.s.s.s.GG",
		"GG.s.s.s.s.s.s.s.s.s.sGG",
		"GGs.s.s.s.s.s.s.s.s.s.GG",
		"GG.s.s.s.s.s.s.s.s.s.sGG",
		"GGs.s.s.s.s.s.s.s.s.s.GG",
		"GG.s.s.s.s.s.s.s.s.s.sGG",
		"GGssssssssssssssssssssGG",
		"GG....................GG",
	],
	BARRIER: [
		"kkkkkkkkkkkkkkkk",
		"kooowwwooowwwook",
		"kwoooowwwooowwwk",
		"kwwoooowwwooowwk",
		"kkkkkkkkkkkkkkkk",
		"..kk........kk..",
		"..kk........kk..",
		"..kk........kk..",
		".kk..........kk.",
		".kk..........kk.",
	],
	MAILBOX: [
		".BBBB.",
		"BbbbbB",
		"BBBBBB",
		"BbbbbB",
		"BbwwbB",
		"BbbbbB",
		"BBBBBB",
		"..GG..",
		"..GG..",
		".GGGG.",
	],
	BENCH: [
		"nnnnnnnnnnnnnn",
		"tttttttttttttt",
		"nnnnnnnnnnnnnn",
		".GG........GG.",
		"tttttttttttttt",
		".GG........GG.",
	],
	STREET_SIGN: [
		"eeeeee",
		"ewwwwe",
		"eewwee",
		"eeeeee",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		".GGGG.",
	],

	// ---- campaign objects ----
	ANCHOR: [
		"GGGGGGGGGG",
		"GssssssssG",
		"GGGGGGGGGG",
		"...GssG...",
		"..GsllsG..",
		"..Gs..sG..",
		"..GsllsG..",
		"...GssG...",
	],
	CHECKPOINT_OFF: [
		".GGGG.",
		"GxxxxG",
		"GxGGxG",
		"GxGGxG",
		"GxxxxG",
		".GGGG.",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		".GGGG.",
		"GGGGGG",
		"GGGGGG",
	],
	CHECKPOINT_ON: [
		".GGGG.",
		"GeeeeG",
		"GelleG",
		"GelleG",
		"GeeeeG",
		".GGGG.",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		"..ss..",
		".GGGG.",
		"GGGGGG",
		"GGGGGG",
	],
	SWITCH_OFF: [
		"xxxxxxxx",
		"xssssssx",
		"xsrrsssx",
		"xsrrsssx",
		"xsGGGGsx",
		"xsGGGGsx",
		"xssssssx",
		"xxxxxxxx",
	],
	SWITCH_ON: [
		"xxxxxxxx",
		"xssssssx",
		"xssseesx",
		"xssseesx",
		"xsGGGGsx",
		"xsGGGGsx",
		"xssssssx",
		"xxxxxxxx",
	],

	// ---- climbable tiles (repeated vertically) ----
	LADDER_TILE: [
		"gg..gg",
		"gggggg",
		"gg..gg",
		"gg..gg",
	],
	PIPE_TILE: [
		".GsG.",
		".GsG.",
		"GGsGG",
		".GsG.",
		".GsG.",
		".GsG.",
	],
	FENCE_TILE: [
		"s...s...",
		".s.s.s.s",
		"..s...s.",
		".s.s.s.s",
		"s...s...",
		".s.s.s.s",
		"..s...s.",
		".s.s.s.s",
	],
	FENCE_POST: [
		"GG",
	],
	GATE_SLAT: [
		"ssssssssssss",
		"xxxxxxxxxxxx",
		"gggggggggggg",
	],

	// ---- construction site ----
	POLE_TILE: [
		".GsG.",
		".GsG.",
		".GsG.",
		".GsG.",
	],
	ROPE_TILE: [
		".tt.",
		".tt.",
		"tttt",
		".tt.",
		".tt.",
		".tt.",
	],
	REBAR_TILE: [
		"..q...q.",
		"..q...q.",
		".qq..qq.",
		"..q...q.",
		"..q...q.",
		"Q.q.Q.q.",
		"QqqqQqqq",
	],
	SPARK_BOX_0: [
		"xxxxxxxxxx",
		"xggggggggx",
		"xgyyyyyygx",
		"xgyGGGGygx",
		"xgyGrGGygx",
		"xgyGGGGygx",
		"xgyyyyyygx",
		"xggggggggx",
		"xxxxxxxxxx",
		"..GG..GG..",
	],
	SPARK_BOX_1: [
		"xxxxxxxxxx",
		"xggggggggx",
		"xgyyyyyygx",
		"xgyGGGGygx",
		"xgyGGrGygx",
		"xgyGGGGygx",
		"xgyyyyyygx",
		"xggggggggx",
		"xxxxxxxxxx",
		"..GG..GG..",
	],
	CONE: [
		"...oo...",
		"...oo...",
		"..oooo..",
		"..wwww..",
		"..oooo..",
		".oooooo.",
		".wwwwww.",
		".oooooo.",
		"oooooooo",
		"xxxxxxxx",
	],
	WARNING_SIGN: [
		"....yy....",
		"...yyyy...",
		"..yykkyy..",
		"..yykkyy..",
		".yyykkyyy.",
		".yyyyyyyy.",
		"yyyykkyyyy",
		"yyyyyyyyyy",
		"....GG....",
		"....GG....",
		"....GG....",
		"....GG....",
		"....GG....",
		"....GG....",
		"...GGGG...",
	],
	SANDBAGS: [
		"....tttttttt....",
		"...tNttttttNt...",
		"..tttttttttttt..",
		".ttttNttttttttt.",
		"tNttttttttNttttt",
		"tttttttttttttttt",
		"NNNNNNNNNNNNNNNN",
	],
	PALLET: [
		"nnnnnnnnnnnnnnnnnnnn",
		"tttttttttttttttttttt",
		"nn....nn....nn....nn",
		"nn....nn....nn....nn",
		"tttttttttttttttttttt",
		"NNNNNNNNNNNNNNNNNNNN",
	],
	SPOOL: [
		"...nnnnnn...",
		".nnttttttnn.",
		"nntttNNtttnn",
		"nttNNttNNttn",
		"nttNttttNttn",
		"nttNttttNttn",
		"nttNNttNNttn",
		"nntttNNtttnn",
		".nnttttttnn.",
		"...nnnnnn...",
	],
	PULLEY: [
		"..GGGG..",
		".GssssG.",
		"GssGGssG",
		"GsGkkGsG",
		"GsGkkGsG",
		"GssGGssG",
		".GssssG.",
		"..GGGG..",
	],
	LAMP_RED: [
		"GGGG",
		"GrrG",
		"GrrG",
		"GGGG",
	],
	LAMP_GREEN: [
		"GGGG",
		"GeeG",
		"GeeG",
		"GGGG",
	],

	// ---- mysterio's hideout ----
	DOOR_FRAME: [
		"xxxxxxxxxxxxxx",
		"xssssssssssssx",
		"xsxxxxxxxxxxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxdddddddyxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xsxddddddddxsx",
		"xxxxxxxxxxxxxx",
	],
	CORE: [
		"..xxxxxx..",
		".xGeeeeGx.",
		"xGeelleeGx",
		"xeellllee.",
		"xeellllee.",
		"xGeelleeGx",
		".xGeeeeGx.",
		"..xxxxxx..",
		"...GGGG...",
		"..GGGGGG..",
	],
	DRONE_0: [
		"...GGGG...",
		"..GllllG..",
		".GlccccclG",
		".GlcPPcclG",
		".GlccccclG",
		"..GllllG..",
		".PPPPPPPP.",
		"PpppppppPp",
		".P......P.",
	],
	DRONE_1: [
		"...GGGG...",
		"..GllllG..",
		".GlccccclG",
		".GlccPPclG",
		".GlccccclG",
		"..GllllG..",
		".PPPPPPPP.",
		"PpppppppPp",
		"..P....P..",
	],
	PANEL_LIGHT: [
		"eeeeee",
		"elllle",
		"eeeeee",
	],

	// ---- world 3: trapped dock worker (sitting, legs pinned, waving for help) and freed (waving, two frames) ----
	WORKER_TRAPPED: [
		"...........kkkkk....",
		"..kk......kyyywyk...",
		".kthk....kyyyyyyyk..",
		".kthk...kkYYYYYYYkk.",
		"..kohk....ktttttk...",
		"...kohk...ktktktk...",
		"....kook..kttttk....",
		".....kookkkookkk....",
		"......koyoooyoook...",
		"......kooyooyooook..",
		"......kooyyyyyoook..",
		".kkkkkkzzzzzzzzzk...",
		"kNzzzzzzzzzzzzzzk...",
		"kNzzzzzzzzzzzzzk....",
		".kkkkkkkkkkkkkk.....",
	],
	WORKER_WAVE_0: [
		"...........kk...",
		"......kkkkkthk..",
		".....kyyywykhk..",
		"....kyyyyyyykk..",
		"...kkYYYYYYYkkk.",
		".....ktttttkthk.",
		".....ktktktkthk.",
		".....kttttkkohk.",
		"....kkkookkkok..",
		"...koyoooyoook..",
		"..kooyooyook....",
		"..kohyyyyyok....",
		"..kthooooook....",
		"..kthzzzzzzk....",
		"...kkzzzzzzk....",
		"....kzzkkzzk....",
		"....kzzkkzzk....",
		"....kzzkkzzk....",
		"...kNNNkkNNNk...",
		"...kNNNkkNNNk...",
	],
	// ---- world 3: harbour props ----
	BOLLARD: [
		"..kkkkkk..",
		".kxsssxxk.",
		"kxxxxxxxxk",
		"kGGGGGGGGk",
		".kkxxxxkk.",
		"..kxsxxk..",
		"..kxsxxk..",
		"..kxsxxk..",
		"..kxsxxk..",
		".kkxxxxkk.",
		"kGGGGGGGGk",
		"kkkkkkkkkk",
	],
	LIFEBUOY: [
		"...kkkk...",
		"..kwwrrk..",
		".kwk..kwk.",
		".krk..krk.",
		".krk..kwk.",
		".kwk..krk.",
		"..krrwwk..",
		"...kkkk...",
		"....kk....",
		"....nn....",
		"....nn....",
		"....nn....",
		"....nn....",
		"....nn....",
		"...kNNk...",
		"..kkkkkk..",
	],
	ROPE_COIL: [
		"..kkkkkk..",
		".kttmttmk.",
		"kmtkkkktmk",
		"ktmk..kmtk",
		"kmtkkkktmk",
		".kttmttmk.",
		"..kkkkkk..",
	],
	// ---- world 3 boss: sandman's giant fist (knuckles down) and his ground wave (rolling right) ----
	SAND_FIST: [
		"......kkkkkkkk......",
		".....kaaaaauaak.....",
		".....kaaaaaaaak.....",
		".....kaaAaaaaak.....",
		".....kaaaaaaAak.....",
		"...kkkaaaaaaaakkk...",
		"..kaauaaaaaaaaaaak..",
		".kaauaaaaaaaaaaaaak.",
		"kkauaaaaaaaaaaaaaaak",
		"kaaaaaaaaaaaaaaaaaak",
		"kaaaAaaaAaaaAaaaAaak",
		"kaaaAaaaAaaaAaaaAaak",
		"kaaaAaaaAaaaAaaaAaak",
		"kAaaaAaaaAaaaAaaaAak",
		".kAaaAAaaAAaaAAaaAk.",
		"..kkkkkkkkkkkkkkkk..",
	],
	SAND_WAVE: [
		"......kkkk..",
		"....kkuuuak.",
		"...kuaaaaaak",
		"..kuaaAAaakk",
		".kuaaAaakk..",
		".kaaAaaak...",
		"kaaAaaaak...",
		"kaaaAaaaak..",
		"kAaaaAaaaak.",
		"kaAaaaaAaaak",
		"kkkkkkkkkkkk",
	],
	WORKER_WAVE_1: [
		".........kk.....",
		"......kkkthkk...",
		".....kyyywthk...",
		"....kyyyyyykk...",
		"...kkYYYYYYYkkk.",
		".....ktttttkthk.",
		".....ktktktkthk.",
		".....kttttkkohk.",
		"....kkkookkkok..",
		"...koyoooyoook..",
		"..kooyooyook....",
		"..kohyyyyyok....",
		"..kthooooook....",
		"..kthzzzzzzk....",
		"...kkzzzzzzk....",
		"....kzzkkzzk....",
		"....kzzkkzzk....",
		"....kzzkkzzk....",
		"...kNNNkkNNNk...",
		"...kNNNkkNNNk...",
	],

	// ---- oscorp tower ----
	HELIPAD: [
		"kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk",
		"kydddddddddddddddyddddydddddddddddddddyk",
		"kydddddddddddddddyyyyyydddddddddddddddyk",
		"kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
	],
	PLANT: [
		"...e.e....",
		".e.eEe.e..",
		"..eEeEe.e.",
		".eEeEeEe..",
		"..eEeEeEe.",
		"...eEeE...",
		"....EE....",
		"..nnnnnn..",
		"..nmmmmn..",
		"...nmmn...",
		"...nnnn...",
	],
	DESK: [
		"..........kkkk......",
		"..........kzck......",
		"..........kkkk......",
		"...........kk.......",
		"nnnnnnnnnnnnnnnnnnnn",
		"nmmmmmmmmmmmmmmmmmmn",
		"nm.nnnnnn.........mn",
		"nm.nmmmmn.........mn",
		"nm.nnnnnn.........mn",
		"nm.nmmmmn.........mn",
		"nm.nnnnnn.........mn",
		"nn................nn",
	],

	// ---- research labs ----
	SPECIMEN_TANK: [
		"..xxxxxxxx..",
		".xssssssssx.",
		".xggggggggx.",
		".kleeeeeeek.",
		".kleeeweeek.",
		".kleeeeeeek.",
		".kleeEEeeek.",
		".kleEEEEeek.",
		".kleeEEeeek.",
		".kleEEEEeek.",
		".klEeEEeEek.",
		".kleeEeEeek.",
		".kleEeeEeek.",
		".klweeeeeek.",
		".kleeeeeeek.",
		".kleeeeweek.",
		".kleeeeeeek.",
		".xggggggggx.",
		"xxxxxxxxxxxx",
		"xgGgGgGgGgGx",
		"xxxxxxxxxxxx",
	],
	CONSOLE: [
		"..kkkkkkkkkk..",
		"..kzzzzzzzzk..",
		"..kzczzcccck..",
		"..kzzzzzzzzk..",
		"..kzcczzczzk..",
		"..kzzzzzzzzk..",
		"..kkkkkkkkkk..",
		"......kk......",
		"xxxxxxxxxxxxxx",
		"xssssssssssssx",
		"xgkgkgrgkgegkx",
		"xggggggggggggx",
		"xggggggggggggx",
		"xxxxxxxxxxxxxx",
	],
	SERVER_RACK: [
		"kkkkkkkkkk",
		"kddddddddk",
		"kdeGGGGcdk",
		"kddddddddk",
		"kdcGGGGedk",
		"kddddddddk",
		"kdeGGGGedk",
		"kddddddddk",
		"kdcGGGGcdk",
		"kddddddddk",
		"kdeGGGGcdk",
		"kddddddddk",
		"kdcGGGGedk",
		"kddddddddk",
		"kdeGGGGedk",
		"kddddddddk",
		"kdcGGGGcdk",
		"kddddddddk",
		"kdGGGGGGdk",
		"kddddddddk",
		"kkkkkkkkkk",
		"k.k....k.k",
	],
	LAB_BENCH: [
		"..........w.....b...",
		"...l.....kwk...kbk..",
		"..klk....kek..kcck..",
		"..kek...keeek.kcck..",
		"..kek...keeek.kcck..",
		"ssssssssssssssssssss",
		"xggggggggggggggggggx",
		"x.x..............x.x",
		"x.x..............x.x",
		"x.x..............x.x",
		"x.xxxxxxxxxxxxxxxx.x",
		"x.x..............x.x",
	],

	// ---- industrial district ----
	STEAM_VENT: [
		"xxxxxxxxxxxx",
		"xkgkgkgkgkgx",
		"xxxxxxxxxxxx",
	],
	BARREL: [
		".kkkkkkk.",
		"kYyyyyyYk",
		"kGGGGGGGk",
		"kYyyyyyYk",
		"kYyykyyYk",
		"kYykekyYk",
		"kYkeeekYk",
		"kYyyyyyYk",
		"kGGGGGGGk",
		"kYyyyyyYk",
		".kkkkkkk.",
	],
	GAS_TANK: [
		"..kk..",
		".kssk.",
		"..kk..",
		".kEEk.",
		"kEeeEk",
		"kEewEk",
		"kEeeEk",
		"kEeeEk",
		"kEeeEk",
		"kEeeEk",
		"kEeeEk",
		"kEeeEk",
		"kEeeEk",
		"kEeeEk",
		"kEEEEk",
		".kkkk.",
	],
};

var PixelArt = {
	cache: {},
	scale: 5, // canvas px per art px in the cache (same as the PNG sprites)

	// offscreen canvas of a sprite (rendered once)
	sprite: function(name) {
		if (this.cache[name]) return this.cache[name];
		var rows = PIXEL_SPRITES[name];
		if (!rows) return null;

		var cols = rows[0].length;
		var canvas = document.createElement("canvas");
		canvas.width = cols * this.scale;
		canvas.height = rows.length * this.scale;
		var ctx = canvas.getContext("2d");
		for (var r = 0; r < rows.length; r++) {
			for (var c = 0; c < cols; c++) {
				var color = PIXEL_PALETTE[rows[r].charAt(c)];
				if (!color) continue;
				ctx.fillStyle = color;
				ctx.fillRect(c * this.scale, r * this.scale, this.scale, this.scale);
			}
		}
		this.cache[name] = { canvas: canvas, cols: cols, rows: rows.length, width: cols * PIXEL, height: rows.length * PIXEL };
		return this.cache[name];
	},

	width: function(name) { var s = this.sprite(name); return s ? s.width : 0; },
	height: function(name) { var s = this.sprite(name); return s ? s.height : 0; },

	// draws a sprite with its top-left corner at screen x / y (world pixels, already camera relative)
	draw: function(ctx, name, x, y, flip) {
		var s = this.sprite(name);
		if (!s) return;
		if (flip) {
			ctx.save();
			ctx.scale(-1, 1);
			ctx.drawImage(s.canvas, -Math.round(x) - s.width, Math.round(y), s.width, s.height);
			ctx.restore();
		} else {
			ctx.drawImage(s.canvas, Math.round(x), Math.round(y), s.width, s.height);
		}
	},

	// repeats a tile vertically from y down to y + height
	drawColumn: function(ctx, name, x, y, height) {
		var s = this.sprite(name);
		if (!s) return;
		var drawn = 0;
		while (drawn < height) {
			var chunk = Math.min(s.height, height - drawn);
			var sourceH = chunk / s.height * s.canvas.height;
			ctx.drawImage(s.canvas, 0, 0, s.canvas.width, sourceH, Math.round(x), Math.round(y + drawn), s.width, chunk);
			drawn += chunk;
		}
	},

	// repeats a tile horizontally from x to x + width
	drawRow: function(ctx, name, x, y, width) {
		var s = this.sprite(name);
		if (!s) return;
		var drawn = 0;
		while (drawn < width) {
			var chunk = Math.min(s.width, width - drawn);
			var sourceW = chunk / s.width * s.canvas.width;
			ctx.drawImage(s.canvas, 0, 0, sourceW, s.canvas.height, Math.round(x + drawn), Math.round(y), chunk, s.height);
			drawn += chunk;
		}
	},

	// a pixel-aligned filled rectangle (snaps to the art grid)
	rect: function(ctx, color, x, y, w, h) {
		ctx.fillStyle = color;
		ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
	},
};

/* ------------------------------------------------------------------
 * Backdrops / themes
 *
 * Every theme paints a sky plus parallax layers behind the rooftops and
 * adds a few live elements (clouds, birds, waves, snow, a train, ...).
 * Static layers are pre-rendered once into tiling offscreen canvases.
 * ------------------------------------------------------------------ */

var THEMES = {
	SITE:   { label: "DUSK SITE",       colors: ["#5a2d6e", "#ff9a3c"] },   // campaign only (not in the endless chooser)
	HIDEOUT:{ label: "FOGGY DOCKS",     colors: ["#0b1a1c", "#2e6b63"] },   // campaign only
	INDUSTRIAL:{ label: "INDUSTRIAL DISTRICT", colors: ["#2a1a2a", "#b8562e"] }, // campaign only (world 2)
	LAB:    { label: "RESEARCH LABS",    colors: ["#0a1a2e", "#2fb3b8"] },   // campaign only (world 2)
	TOWER:  { label: "OSCORP TOWER",     colors: ["#140c2a", "#6a4aa8"] },   // campaign only (world 2)
	HARBOR: { label: "HARBOUR NIGHT",    colors: ["#081428", "#1f5f7a"] },   // campaign only (world 3)
	SEWER:  { label: "FLOODED SEWERS",   colors: ["#0b100d", "#2f5a44"] },   // campaign only (world 3)
	STATION:{ label: "PUMP STATION",     colors: ["#0c0f14", "#b8762e"] },   // campaign only (world 3)
	CITY:   { label: "CITY NIGHT",      colors: ["#0d1b3d", "#1b3a8a"] },
	DESERT: { label: "DESERT MOUNTAINS", colors: ["#ff9a3c", "#8a4b2a"] },
	BRIDGE: { label: "BRIDGE & TRAIN",   colors: ["#5a2d6e", "#e0683a"] },
	BEACH:  { label: "SUNNY BEACH",      colors: ["#49b6ff", "#ffd36b"] },
	SNOW:   { label: "SNOW PEAKS",       colors: ["#0b1230", "#cfe6ff"] },
};
var THEME_ORDER = ["CITY", "DESERT", "BRIDGE", "BEACH", "SNOW"];
var DEFAULT_THEME = "CITY";

function Backdrop(game, theme) {
	this.game = game;
	this.ctx = game.ctx;
	this.width = game.canvas.width;
	this.height = game.canvas.height;
	this.theme = THEMES[theme] ? theme : DEFAULT_THEME;
	this.layers = [];      // { canvas, speed } tiling layers, drawn back to front
	this.clouds = [];
	this.birds = [];
	this.flakes = [];
	this.stars = [];
	this.train = null;
	this.seed = 0.37;

	this.build();
}

Backdrop.prototype.random = function() {
	// small deterministic generator so a theme always looks the same
	this.seed = (this.seed * 9301 + 49297) % 233280;
	return this.seed / 233280;
}

Backdrop.prototype.makeLayer = function(width, speed, painter) {
	var canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = this.height;
	painter.call(this, canvas.getContext("2d"), width, this.height);
	this.layers.push({ canvas: canvas, speed: speed });
}

Backdrop.prototype.build = function() {
	var h = this.height;
	var i;

	switch (this.theme) {
		case "DESERT":
			this.sky = ["#ffb347", "#ff8a3c", "#ffd27a"];
			this.sun = { x: 560, y: 70, r: 34, color: "#fff1b0", glow: "rgba(255, 220, 120, 0.35)" };
			this.makeLayer(1200, 0.08, function(ctx, w) { this.paintMountains(ctx, w, h * 0.36, h, "#8a4b5a", 5, 90); });
			this.makeLayer(1000, 0.16, function(ctx, w) { this.paintMountains(ctx, w, h * 0.5, h, "#a85a3c", 7, 60); });
			this.makeLayer(900, 0.3, function(ctx, w) { this.paintDunes(ctx, w, h * 0.66, h, "#d98a4a"); this.paintCacti(ctx, w, h * 0.66, "#5a3a2a"); });
			this.addClouds(4, "rgba(255, 240, 220, 0.75)");
			this.addBirds(3);
			break;

		case "BRIDGE":
			this.sky = ["#3a1d5a", "#8a3d6e", "#e0683a"];
			this.sun = { x: 520, y: 120, r: 40, color: "#ffb36b", glow: "rgba(255, 150, 90, 0.3)" };
			this.makeLayer(1400, 0.07, function(ctx, w) { this.paintSkyline(ctx, w, h * 0.52, "#2a1440", 0.6); });
			this.makeLayer(1000, 0.2, function(ctx, w) { this.paintWater(ctx, w, h * 0.62, h, "#23306b"); });
			this.makeLayer(1200, 0.35, function(ctx, w) { this.paintBridge(ctx, w, h); });
			this.train = { x: -400, speed: 2.6, cars: 5, y: h * 0.615, timer: 0 };
			this.addClouds(3, "rgba(255, 200, 180, 0.45)");
			break;

		case "BEACH":
			this.sky = ["#49b6ff", "#8fd3ff", "#e8f7ff"];
			this.sun = { x: 600, y: 60, r: 30, color: "#fff8c0", glow: "rgba(255, 250, 200, 0.45)" };
			this.makeLayer(1200, 0.08, function(ctx, w) { this.paintMountains(ctx, w, h * 0.5, h * 0.62, "#6fb3a8", 4, 40); });
			this.makeLayer(1000, 0.18, function(ctx, w) { this.paintWater(ctx, w, h * 0.6, h, "#1d8fd1"); });
			this.makeLayer(900, 0.32, function(ctx, w) { this.paintSand(ctx, w, h * 0.8, h, "#f1d9a2"); this.paintPalms(ctx, w, h * 0.8, "#2f5a3a"); });
			this.addClouds(5, "rgba(255, 255, 255, 0.9)");
			this.addBirds(4);
			break;

		case "SNOW":
			this.sky = ["#0b1230", "#1c2b5e", "#4a6aa8"];
			this.sun = { x: 120, y: 70, r: 26, color: "#eef4ff", glow: "rgba(200, 220, 255, 0.25)" };
			this.addStars(60);
			this.makeLayer(1200, 0.08, function(ctx, w) { this.paintMountains(ctx, w, h * 0.3, h, "#2f4475", 5, 110, "#dfe9ff"); });
			this.makeLayer(1000, 0.16, function(ctx, w) { this.paintMountains(ctx, w, h * 0.48, h, "#3e5a94", 7, 70, "#f2f7ff"); });
			this.makeLayer(900, 0.3, function(ctx, w) { this.paintPines(ctx, w, h * 0.72, h, "#1a2a4a", "#c9daf5"); });
			for (i = 0; i < 70; i++) {
				this.flakes.push({ x: this.random() * this.width, y: this.random() * this.height, r: 1 + this.random() * 2, s: 0.4 + this.random() * 0.8, drift: this.random() * 6.28 });
			}
			break;

		case "SITE":
			// construction site at dusk: warm sky, far skyline, crane silhouettes
			this.sky = ["#2b1a4e", "#8a3d6e", "#ff9a3c"];
			this.sun = { x: 600, y: 150, r: 36, color: "#ffd27a", glow: "rgba(255, 170, 90, 0.3)" };
			this.addStars(20);
			this.makeLayer(1400, 0.06, function(ctx, w) { this.paintSkyline(ctx, w, h * 0.58, "#2a1440", 0.8); });
			this.makeLayer(1300, 0.14, function(ctx, w) { this.paintCranes(ctx, w, h * 0.62, h, "#1b1020"); });
			this.addClouds(3, "rgba(255, 200, 170, 0.4)");
			this.addBirds(3);
			break;

		case "HIDEOUT":
			// foggy docks at night, green tinted (mysterio's smoke): far warehouses, drifting fog banks, a searchlight
			this.sky = ["#060c10", "#0f2a2c", "#1f5a52"];
			this.sun = { x: 160, y: 70, r: 22, color: "#d8f0e6", glow: "rgba(120, 200, 170, 0.2)" };
			this.addStars(25);
			this.makeLayer(1400, 0.06, function(ctx, w) { this.paintSkyline(ctx, w, h * 0.6, "#0a1416", 0.5); });
			this.makeLayer(1100, 0.15, function(ctx, w) { this.paintWarehouses(ctx, w, h * 0.66, h, "#0d1b1d"); });
			this.addClouds(6, "rgba(120, 200, 170, 0.16)");
			for (i = 0; i < this.clouds.length; i++) { this.clouds[i].y = h * 0.45 + this.random() * h * 0.3; this.clouds[i].w = 220 + this.random() * 200; this.clouds[i].speed = 0.1 + this.random() * 0.15; }
			this.searchlight = { angle: 0 };
			break;

		case "INDUSTRIAL":
			// oscorp's industrial district at night: smoggy sky lit orange by the furnaces, a far skyline, factory
			// halls, tanks and smokestacks whose smoke drifts away
			this.sky = ["#140f1c", "#3f2438", "#b8562e"];
			this.sun = { x: 150, y: 75, r: 18, color: "#f0d8b0", glow: "rgba(240, 180, 120, 0.16)" };
			this.addStars(12);
			this.makeLayer(1400, 0.05, function(ctx, w) { this.paintSkyline(ctx, w, h * 0.6, "#2a1a2a", 0.6); });
			this.stacks = [];
			this.stackLayer = this.layers.length;
			this.makeLayer(1300, 0.13, function(ctx, w) { this.paintFactories(ctx, w, h * 0.68, h, "#150f16"); });
			this.addClouds(4, "rgba(90, 70, 80, 0.3)");
			break;

		case "TOWER":
			// high above midtown at night: the city's lights drop away below while spiderman climbs (the layers
			// also move with the vertical camera, see verticalParallax)
			this.sky = ["#0a0618", "#241a4a", "#5a3a7a"];
			this.sun = { x: 560, y: 60, r: 22, color: "#f4ecff", glow: "rgba(210, 190, 255, 0.2)" };
			this.addStars(70);
			this.makeLayer(1400, 0.04, function(ctx, w) { this.paintSkyline(ctx, w, h * 0.7, "#1a1236", 0.9); });
			this.makeLayer(1200, 0.1, function(ctx, w) { this.paintTowers(ctx, w, h * 0.8, h, "#120c26"); });
			this.addClouds(3, "rgba(150, 130, 200, 0.16)");
			this.verticalParallax = [0.06, 0.14];     // per layer: screen px the layer sinks per world px climbed
			break;

		case "LAB":
			// seen through oscorp's glass atrium: a clear night over midtown, glass towers with cyan lit windows
			this.sky = ["#050b18", "#0c2238", "#1d4e66"];
			this.sun = { x: 590, y: 70, r: 20, color: "#e8f4ff", glow: "rgba(180, 220, 255, 0.18)" };
			this.addStars(40);
			this.makeLayer(1400, 0.05, function(ctx, w) { this.paintSkyline(ctx, w, h * 0.62, "#0b1a2c", 0.8); });
			this.makeLayer(1200, 0.12, function(ctx, w) { this.paintTowers(ctx, w, h * 0.72, h, "#0e2236"); });
			this.addClouds(2, "rgba(120, 170, 210, 0.18)");
			break;

		case "HARBOR":
			// the harbour at night: the city across the water, a lighthouse on the far point, container ships
			// and ship-to-shore cranes with blinking lights at the far quay, seagulls, shimmering water
			this.sky = ["#050b1a", "#0f2440", "#24506a"];
			this.sun = { x: 520, y: 62, r: 20, color: "#f2f4e6", glow: "rgba(220, 230, 200, 0.2)" };
			this.addStars(45);
			this.makeLayer(1400, 0.04, function(ctx, w) { this.paintHarborCity(ctx, w, h * 0.6, "#0d182b"); });
			this.lighthouse = { x: 1050, layer: this.layers.length - 1 };
			this.makeLayer(1000, 0.08, function(ctx, w) { this.paintHarborWater(ctx, w, h * 0.6, h); });
			this.craneLights = [];
			this.harborLayer = this.layers.length;
			this.makeLayer(1300, 0.15, function(ctx, w) { this.paintHarbor(ctx, w, h * 0.67, "#0a1220"); });
			this.addClouds(3, "rgba(120, 160, 200, 0.14)");
			this.addBirds(3);
			break;

		case "SEWER":
			// under the city: a dark brick vault, tunnel mouths with a faint green glow deep inside, pipes along the
			// walls, light falling through the street grates, drips
			this.sky = ["#07090a", "#0e1611", "#16241b"];
			this.makeLayer(1200, 0.05, function(ctx, w) { this.paintSewerArches(ctx, w, h); });
			this.makeLayer(1000, 0.12, function(ctx, w) { this.paintSewerPipes(ctx, w, h); });
			this.drips = [];
			for (i = 0; i < 14; i++) this.drips.push({ x: this.random() * this.width, y: this.random() * this.height, speed: 1.5 + this.random() * 2, phase: this.random() * 200 });
			this.grateLights = [];
			for (i = 0; i < 3; i++) this.grateLights.push({ x: 150 + i * 260 + this.random() * 80, w: 26 + this.random() * 20 });
			break;

		case "STATION":
			// the underground pump station: a concrete hall, giant penstock pipes, impeller wheels that turn, sodium
			// lamps with an orange glow, gantries and chains, blinking panel lights
			this.sky = ["#0b0e13", "#161b22", "#232a33"];
			this.impellers = [];
			this.impellerLayer = this.layers.length;
			this.makeLayer(1300, 0.05, function(ctx, w) { this.paintStationHall(ctx, w, h); });
			this.lampLayer = this.layers.length;
			this.stationLamps = [];
			this.makeLayer(1000, 0.12, function(ctx, w) { this.paintStationGantry(ctx, w, h); });
			break;

		case "CITY":
		default:
			this.sky = null; // the original city image is the sky
			this.addStars(30);
			this.addClouds(3, "rgba(20, 30, 70, 0.55)");
			this.addBirds(2);
			this.chopper = { x: -100, y: 60, speed: 1.4 };
			break;
	}
}

/* ---------- painters for the static layers ---------- */

Backdrop.prototype.paintMountains = function(ctx, w, top, bottom, color, peaks, jag, snowColor) {
	var step = w / peaks;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, bottom);
	var points = [];
	for (var i = 0; i <= peaks; i++) {
		var px = i * step;
		var py = top + (i % 2 === 0 ? this.random() * jag : -this.random() * jag * 0.4) - (i % 2 === 0 ? 0 : jag * 0.3);
		if (i === peaks) py = points[0].y; // seamless tiling
		points.push({ x: px, y: py });
		ctx.lineTo(px, py);
	}
	ctx.lineTo(w, bottom);
	ctx.closePath();
	ctx.fill();

	if (snowColor) {
		ctx.fillStyle = snowColor;
		for (var p = 1; p < points.length - 1; p += 2) {
			var pk = points[p];
			ctx.beginPath();
			ctx.moveTo(pk.x, pk.y);
			ctx.lineTo(pk.x - step * 0.28, pk.y + jag * 0.7);
			ctx.lineTo(pk.x - step * 0.1, pk.y + jag * 0.55);
			ctx.lineTo(pk.x + step * 0.08, pk.y + jag * 0.75);
			ctx.lineTo(pk.x + step * 0.28, pk.y + jag * 0.6);
			ctx.closePath();
			ctx.fill();
		}
	}
}

Backdrop.prototype.paintDunes = function(ctx, w, top, bottom, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, bottom);
	for (var x = 0; x <= w; x += 10) {
		ctx.lineTo(x, top + Math.sin(x / w * Math.PI * 4) * 14 + Math.sin(x / w * Math.PI * 10) * 5);
	}
	ctx.lineTo(w, bottom);
	ctx.closePath();
	ctx.fill();
}

Backdrop.prototype.paintCacti = function(ctx, w, ground, color) {
	ctx.fillStyle = color;
	for (var i = 0; i < 6; i++) {
		var x = this.random() * w;
		var hgt = 18 + this.random() * 22;
		ctx.fillRect(x, ground - hgt, 6, hgt);
		ctx.fillRect(x - 6, ground - hgt * 0.6, 6, 4);
		ctx.fillRect(x - 6, ground - hgt * 0.6 - 10, 4, 12);
		ctx.fillRect(x + 6, ground - hgt * 0.45, 6, 4);
		ctx.fillRect(x + 8, ground - hgt * 0.45 - 8, 4, 10);
	}
}

Backdrop.prototype.paintSkyline = function(ctx, w, ground, color, density) {
	ctx.fillStyle = color;
	var x = 0;
	while (x < w) {
		var bw = 20 + this.random() * 40;
		var bh = 40 + this.random() * 120 * density;
		ctx.fillRect(x, ground - bh, bw, bh + 200);
		x += bw + 4 + this.random() * 10;
	}
}

// low warehouses with saw-tooth roofs, a few lit windows
Backdrop.prototype.paintWarehouses = function(ctx, w, ground, bottom, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, ground, w, bottom - ground);
	var x = 0;
	while (x < w) {
		var bw = 120 + this.random() * 120;
		var bh = 40 + this.random() * 40;
		ctx.fillStyle = color;
		ctx.fillRect(x, ground - bh, bw, bh);
		for (var t = 0; t < bw; t += 30) {
			ctx.beginPath(); ctx.moveTo(x + t, ground - bh); ctx.lineTo(x + t + 18, ground - bh - 14); ctx.lineTo(x + t + 30, ground - bh); ctx.closePath(); ctx.fill();
		}
		ctx.fillStyle = "rgba(120, 220, 170, 0.35)";
		for (var win = 8; win < bw - 10; win += 34) if (this.random() > 0.5) ctx.fillRect(x + win, ground - bh + 14, 10, 7);
		x += bw + 20 + this.random() * 40;
	}
}

// glass office / lab towers with a grid of cyan and white lit windows
Backdrop.prototype.paintTowers = function(ctx, w, ground, bottom, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, ground, w, bottom - ground);
	var x = 5;
	while (x < w - 40) {
		var bw = 50 + this.random() * 60;
		var bh = 90 + this.random() * 120;
		if (x + bw > w - 5) bw = w - 5 - x;
		ctx.fillStyle = color;
		ctx.fillRect(x, ground - bh, bw, bh);
		ctx.fillRect(x + bw / 2 - 1, ground - bh - 14, 2, 14);      // antenna
		for (var wy = ground - bh + 8; wy < ground - 6; wy += 9) {
			for (var wx = x + 5; wx < x + bw - 6; wx += 8) {
				var r = this.random();
				if (r < 0.45) continue;
				ctx.fillStyle = r < 0.8 ? "rgba(90, 210, 230, 0.45)" : "rgba(230, 245, 255, 0.6)";
				ctx.fillRect(wx, wy, 4, 4);
			}
		}
		x += bw + 8 + this.random() * 25;
	}
}

// factory halls with sawtooth roofs, round tanks and smokestacks (their tops are remembered in this.stacks so
// draw() can let smoke rise from them)
Backdrop.prototype.paintFactories = function(ctx, w, ground, bottom, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, ground, w, bottom - ground);
	var x = 10;
	while (x < w - 60) {
		var kind = this.random();
		if (kind < 0.5) {
			// hall with a sawtooth roof and a row of lit windows
			var bw = 140 + this.random() * 120;
			var bh = 45 + this.random() * 35;
			if (x + bw > w - 10) bw = w - 10 - x;
			ctx.fillStyle = color;
			ctx.fillRect(x, ground - bh, bw, bh);
			for (var t = 0; t + 26 <= bw; t += 26) {
				ctx.beginPath(); ctx.moveTo(x + t, ground - bh); ctx.lineTo(x + t, ground - bh - 16); ctx.lineTo(x + t + 26, ground - bh); ctx.closePath(); ctx.fill();
			}
			ctx.fillStyle = "rgba(255, 160, 60, 0.45)";
			for (var win = 8; win < bw - 12; win += 22) if (this.random() > 0.35) ctx.fillRect(x + win, ground - bh + 12, 10, 6);
			x += bw + 10 + this.random() * 30;
		} else if (kind < 0.75) {
			// storage tanks
			var tw = 36 + this.random() * 20;
			var th = 40 + this.random() * 25;
			ctx.fillStyle = color;
			ctx.fillRect(x, ground - th, tw, th);
			ctx.beginPath(); ctx.ellipse(x + tw / 2, ground - th, tw / 2, 7, 0, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
			ctx.fillRect(x + 5, ground - th + 4, 4, th - 6);
			x += tw + 14;
		} else {
			// a pair of smokestacks with a red warning band
			for (var k = 0; k < 2; k++) {
				var sh = 110 + this.random() * 60;
				var sx = x + k * 22;
				ctx.fillStyle = color;
				ctx.fillRect(sx, ground - sh, 12, sh);
				ctx.fillRect(sx - 2, ground - sh, 16, 5);
				ctx.fillStyle = "rgba(200, 40, 40, 0.55)";
				ctx.fillRect(sx, ground - sh + 12, 12, 4);
				this.stacks.push({ x: sx + 6, y: ground - sh, phase: this.random() * 100 });
			}
			x += 60 + this.random() * 30;
		}
	}
}

// tower cranes and half built frames on the horizon
Backdrop.prototype.paintCranes = function(ctx, w, ground, bottom, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, ground, w, bottom - ground);
	for (var i = 0; i < 3; i++) {
		var x = 80 + i * (w / 3) + this.random() * 60;
		var hgt = 120 + this.random() * 60;
		ctx.fillRect(x, ground - hgt, 8, hgt);                 // mast
		ctx.fillRect(x - 60, ground - hgt, 150, 4);             // jib
		ctx.fillRect(x - 60, ground - hgt, 3, 30);
		ctx.fillRect(x + 70, ground - hgt + 4, 2, 40 + this.random() * 30);   // hook cable
		ctx.fillRect(x + 64, ground - hgt + 44, 14, 6);
		ctx.fillRect(x - 4, ground - hgt - 10, 16, 10);         // cab
	}
	// skeleton buildings
	for (var b = 0; b < 4; b++) {
		var bx = this.random() * w;
		var bw = 60 + this.random() * 50;
		var bh = 50 + this.random() * 70;
		for (var f = 0; f < bh; f += 14) ctx.fillRect(bx, ground - bh + f, bw, 3);
		for (var c = 0; c <= bw; c += bw / 3) ctx.fillRect(bx + c, ground - bh, 3, bh);
	}
}

// the city across the harbour: low, far away, a few taller towers, dim warm windows (the cranes and ships in front of
// it should stand out)
Backdrop.prototype.paintHarborCity = function(ctx, w, ground, color) {
	var x = 0;
	while (x < w) {
		var bw = 24 + this.random() * 46;
		var bh = 25 + this.random() * 55 + (this.random() < 0.15 ? 50 : 0);
		ctx.fillStyle = color;
		ctx.fillRect(Math.round(x), Math.round(ground - bh), Math.round(bw), Math.round(bh + 6));
		for (var wy = ground - bh + 6; wy < ground - 4; wy += 8) {
			for (var wx = x + 4; wx < x + bw - 5; wx += 7) {
				if (this.random() < 0.72) continue;
				ctx.fillStyle = this.random() < 0.8 ? "rgba(255, 214, 150, 0.32)" : "rgba(170, 220, 255, 0.3)";
				ctx.fillRect(Math.round(wx), Math.round(wy), 3, 3);
			}
		}
		x += bw + 2 + this.random() * 8;
	}
}

// receding sewer tunnels: brick walls with arched tunnel mouths, each a darker hole with a faint glow far inside
Backdrop.prototype.paintSewerArches = function(ctx, w, h) {
	ctx.fillStyle = "#15100f";
	ctx.fillRect(0, 0, w, h);
	for (var by = 0; by < h; by += 12) {
		ctx.fillStyle = "#0f0b0a";
		ctx.fillRect(0, by, w, 2);
		for (var bx = (by / 12) % 2 === 0 ? 0 : 16; bx < w; bx += 32) ctx.fillRect(bx, by, 2, 12);
	}
	var x = 60;
	while (x < w - 160) {
		var aw = 120 + this.random() * 60, ah = h * (0.42 + this.random() * 0.12), base = h * 0.78;
		var cx = x + aw / 2;
		// the arch ring
		ctx.fillStyle = "#2a1f1c";
		ctx.beginPath(); ctx.moveTo(x - 8, base); ctx.lineTo(x - 8, base - ah + aw / 2); ctx.arc(cx, base - ah + aw / 2, aw / 2 + 8, Math.PI, 0); ctx.lineTo(x + aw + 8, base); ctx.closePath(); ctx.fill();
		// the hole, getting darker inward, a green glow at the far end
		ctx.fillStyle = "#050706";
		ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - ah + aw / 2); ctx.arc(cx, base - ah + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(x + aw, base); ctx.closePath(); ctx.fill();
		var glow = ctx.createRadialGradient(cx, base - ah * 0.35, 2, cx, base - ah * 0.35, aw * 0.45);
		glow.addColorStop(0, "rgba(120, 200, 140, 0.22)");
		glow.addColorStop(1, "rgba(120, 200, 140, 0)");
		ctx.fillStyle = glow;
		ctx.fillRect(x, base - ah, aw, ah);
		ctx.fillStyle = "rgba(60, 110, 80, 0.5)";                   // the channel floor inside
		ctx.fillRect(x + 6, base - 6, aw - 12, 6);
		x += aw + 90 + this.random() * 80;
	}
}

// pipes along the sewer walls: two long runs with flanges and brackets, risers, valve wheels, rust streaks
Backdrop.prototype.paintSewerPipes = function(ctx, w, h) {
	var runs = [h * 0.22, h * 0.5];
	for (var r = 0; r < runs.length; r++) {
		var py = runs[r], ph = r === 0 ? 10 : 14;
		ctx.fillStyle = "#1c2420";
		ctx.fillRect(0, py, w, ph);
		ctx.fillStyle = "#2c3a33";
		ctx.fillRect(0, py + 2, w, 3);
		for (var fx = 30 + r * 50; fx < w; fx += 140) {
			ctx.fillStyle = "#141a17";
			ctx.fillRect(fx, py - 3, 6, ph + 6);
			ctx.fillRect(fx + 60, py + ph, 3, 18);
			ctx.fillStyle = "rgba(120, 70, 40, 0.35)";
			ctx.fillRect(fx + 2, py + ph, 2, 10 + this.random() * 20);
		}
	}
	for (var k = 0; k < 5; k++) {
		var vx = 80 + k * (w / 5) + this.random() * 60;
		ctx.fillStyle = "#1a221e";
		ctx.fillRect(vx, runs[0], 8, runs[1] - runs[0]);
		ctx.fillStyle = "#3a1c1a";
		ctx.fillRect(vx - 6, runs[0] + 30, 20, 4);
		ctx.fillRect(vx + 2, runs[0] + 24, 4, 16);
	}
}

// the pump hall's back wall: concrete panels, giant penstock pipes with flanges, round impeller housings (their wheels
// are drawn turning by draw(), positions in this.impellers), a band of hazard paint
Backdrop.prototype.paintStationHall = function(ctx, w, h) {
	ctx.fillStyle = "#1c2128";
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = "#171b21";
	for (var py = 30; py < h; py += 70) ctx.fillRect(0, py, w, 3);
	for (var px = 0; px < w; px += 110) ctx.fillRect(px, 0, 3, h);
	var x = 40;
	while (x < w - 120) {
		if (this.random() < 0.55) {
			// a penstock: a huge pipe coming down the wall, bending out at the bottom
			var pw = 34 + this.random() * 16;
			ctx.fillStyle = "#2a313a";
			ctx.fillRect(x, 0, pw, h * 0.78);
			ctx.fillStyle = "#343d47";
			ctx.fillRect(x + 4, 0, 6, h * 0.78);
			ctx.fillStyle = "#20262d";
			for (var fy = 40 + this.random() * 30; fy < h * 0.75; fy += 90) ctx.fillRect(x - 4, fy, pw + 8, 7);
			x += pw + 70 + this.random() * 60;
		} else {
			// an impeller housing
			var r = 34 + this.random() * 18, cy = h * (0.38 + this.random() * 0.2);
			ctx.fillStyle = "#2a313a";
			ctx.beginPath(); ctx.arc(x + r, cy, r + 8, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = "#111418";
			ctx.beginPath(); ctx.arc(x + r, cy, r, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = "#2a313a";
			ctx.fillRect(x + r - 6, cy + r, 12, h * 0.78 - cy - r);
			this.impellers.push({ x: x + r, y: cy, r: r - 4, speed: 0.02 + this.random() * 0.03 });
			x += r * 2 + 80 + this.random() * 60;
		}
	}
	for (var sx = 0; sx < w; sx += 24) {
		ctx.fillStyle = (sx / 24) % 2 === 0 ? "rgba(200, 160, 40, 0.35)" : "rgba(20, 20, 20, 0.35)";
		ctx.fillRect(sx, h * 0.8, 12, 6);
	}
}

// the mid ground: a gantry girder with hanging chains and sodium lamps (their glow is drawn by draw())
Backdrop.prototype.paintStationGantry = function(ctx, w, h) {
	var gy = h * 0.12;
	ctx.fillStyle = "#14181d";
	ctx.fillRect(0, gy, w, 10);
	ctx.fillRect(0, gy + 26, w, 4);
	for (var gx = 0; gx < w; gx += 26) {
		ctx.beginPath(); ctx.moveTo(gx, gy + 10); ctx.lineTo(gx + 13, gy + 26); ctx.lineTo(gx + 16, gy + 26); ctx.lineTo(gx + 3, gy + 10); ctx.fill();
	}
	for (var i = 0; i < 5; i++) {
		var lx = 80 + i * (w / 5) + this.random() * 60;
		var len = 40 + this.random() * 50;
		ctx.fillRect(lx, gy + 30, 2, len);
		ctx.fillRect(lx - 9, gy + 30 + len, 20, 7);
		this.stationLamps.push({ x: lx + 1, y: gy + 37 + len });
		var cx2 = lx + w / 10 + this.random() * 40, clen = 60 + this.random() * 80;
		for (var c = 0; c < clen; c += 6) ctx.fillRect(cx2 + (c / 6) % 2, gy + 30 + c, 3, 4);
		ctx.fillRect(cx2 - 4, gy + 30 + clen, 11, 8);
	}
}

// dark harbour water with the far city's lights reflected as short streaks
Backdrop.prototype.paintHarborWater = function(ctx, w, top, bottom) {
	var gradient = ctx.createLinearGradient(0, top, 0, bottom);
	gradient.addColorStop(0, "#123047");
	gradient.addColorStop(1, "#07111f");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, top, w, bottom - top);
	for (var i = 0; i < 90; i++) {
		var rx = this.random() * w, ry = top + 4 + this.random() * (bottom - top) * 0.5;
		ctx.fillStyle = this.random() < 0.7 ? "rgba(255, 210, 130, 0.22)" : "rgba(150, 220, 255, 0.2)";
		ctx.fillRect(Math.round(rx), Math.round(ry), 6 + Math.round(this.random() * 14), 1);
	}
}

// the far quay: container ships (hull, stacked containers, bridge tower) and ship-to-shore gantry cranes whose booms
// reach over the water. Light positions are remembered in this.craneLights so draw() can blink them
Backdrop.prototype.paintHarbor = function(ctx, w, ground, color) {
	var boxes = ["#3a2436", "#1f3a4e", "#2c3c26", "#4a2c22", "#2a2a48", "#4a4222"];
	ctx.fillStyle = color;
	ctx.fillRect(0, ground, w, 6);                               // the far quay wall
	var x = 20;
	while (x < w - 120) {
		if (this.random() < 0.55) {
			var sw = Math.min(240 + this.random() * 120, w - 20 - x);
			var hullTop = ground - 20;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(x, hullTop - 6); ctx.lineTo(x + sw, hullTop); ctx.lineTo(x + sw - 12, ground + 4); ctx.lineTo(x + 16, ground + 4);
			ctx.closePath();
			ctx.fill();
			for (var cx = x + 34; cx < x + sw - 64; cx += 14) {
				var stack = 1 + Math.floor(this.random() * 4);
				for (var k = 0; k < stack; k++) {
					ctx.fillStyle = boxes[Math.floor(this.random() * boxes.length)];
					ctx.fillRect(cx, hullTop - (k + 1) * 8, 13, 7);
				}
			}
			var bx = x + sw - 56;
			ctx.fillStyle = color;
			ctx.fillRect(bx, hullTop - 42, 24, 42);
			ctx.fillRect(bx - 4, hullTop - 46, 32, 5);
			ctx.fillRect(bx + 11, hullTop - 60, 2, 14);
			ctx.fillStyle = "rgba(255, 220, 140, 0.55)";
			for (var wy = hullTop - 38; wy < hullTop - 8; wy += 9) for (var wx = bx + 3; wx < bx + 21; wx += 6) if (this.random() > 0.35) ctx.fillRect(wx, wy, 3, 3);
			this.craneLights.push({ x: bx + 12, y: hullTop - 61, color: "#f4f4f4", phase: this.random() * 100 });
			x += sw + 30 + this.random() * 50;
		} else {
			var cw = 56, ch = 115 + this.random() * 35, top = ground - ch;
			ctx.fillStyle = color;
			ctx.fillRect(x, top, 5, ch);                                 // legs
			ctx.fillRect(x + cw, top, 5, ch);
			ctx.fillRect(x, top + ch * 0.5, cw + 5, 4);                  // portal beam
			ctx.fillRect(x - 90, top, cw + 5 + 130, 6);                  // boom (over the water on the left) + back reach
			ctx.fillRect(x + 4, top - 16, cw - 4, 16);                   // machinery house
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x + cw / 2, top - 40); ctx.lineTo(x - 90, top + 2);  // stays to the apex
			ctx.moveTo(x + cw / 2, top - 40); ctx.lineTo(x + cw + 40, top + 2);
			ctx.moveTo(x, top + 6); ctx.lineTo(x + cw, top + ch * 0.5);     // leg braces
			ctx.moveTo(x + cw, top + 6); ctx.lineTo(x, top + ch * 0.5);
			ctx.stroke();
			ctx.fillRect(x + cw / 2 - 2, top - 42, 5, 42);               // apex
			ctx.fillRect(x - 52, top + 6, 1, 26 + this.random() * 20);   // trolley cable
			ctx.fillRect(x - 58, top + 6, 12, 5);
			this.craneLights.push({ x: x - 90, y: top - 2, color: "#ff4040", phase: this.random() * 100 });
			this.craneLights.push({ x: x + cw / 2, y: top - 44, color: "#ff4040", phase: this.random() * 100 });
			x += cw + 150 + this.random() * 90;
		}
	}
}

Backdrop.prototype.paintWater = function(ctx, w, top, bottom, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, top, w, bottom - top);
}

Backdrop.prototype.paintBridge = function(ctx, w, h) {
	var deckY = h * 0.64;
	var towerW = 16;
	var towers = [w * 0.25, w * 0.75];
	ctx.fillStyle = "#b0402a";
	ctx.fillRect(0, deckY, w, 8);
	ctx.fillStyle = "#7a2a1e";
	ctx.fillRect(0, deckY + 8, w, 3);
	for (var t = 0; t < towers.length; t++) {
		var tx = towers[t];
		ctx.fillStyle = "#b0402a";
		ctx.fillRect(tx - towerW / 2, deckY - 110, towerW, 110 + 60);
		ctx.fillRect(tx - towerW, deckY - 60, towerW * 2, 6);
		ctx.fillRect(tx - towerW, deckY - 100, towerW * 2, 6);
		// cables
		ctx.strokeStyle = "#d86a4e";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(tx, deckY - 108);
		ctx.quadraticCurveTo(tx + w * 0.25, deckY - 20, tx + w * 0.5, deckY - 108);
		ctx.moveTo(tx, deckY - 108);
		ctx.quadraticCurveTo(tx - w * 0.25, deckY - 20, tx - w * 0.5, deckY - 108);
		ctx.stroke();
		ctx.lineWidth = 1;
		for (var c = -5; c <= 5; c++) {
			var cx = tx + c * (w * 0.05);
			var cy = deckY - 108 + Math.pow(Math.abs(c) / 5, 2) * 0 + (1 - Math.pow(1 - Math.abs(c) / 5, 2)) * 88;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(cx, deckY);
			ctx.stroke();
		}
	}
	// pillars in the water
	ctx.fillStyle = "#5a2a22";
	for (var p = 0; p < 6; p++) {
		ctx.fillRect(p * (w / 6) + 30, deckY + 10, 10, h - deckY);
	}
}

Backdrop.prototype.paintSand = function(ctx, w, top, bottom, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, top, w, bottom - top);
	ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
	ctx.fillRect(0, top, w, 3);
}

Backdrop.prototype.paintPalms = function(ctx, w, ground, color) {
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	for (var i = 0; i < 5; i++) {
		var x = 60 + this.random() * (w - 120);
		var hgt = 40 + this.random() * 30;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(x, ground);
		ctx.quadraticCurveTo(x + 10, ground - hgt / 2, x + 16, ground - hgt);
		ctx.stroke();
		for (var l = 0; l < 6; l++) {
			var a = -Math.PI / 2 + (l - 2.5) * 0.5;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x + 16, ground - hgt);
			ctx.quadraticCurveTo(x + 16 + Math.cos(a) * 14, ground - hgt + Math.sin(a) * 14 - 4, x + 16 + Math.cos(a) * 26, ground - hgt + Math.sin(a) * 26 + 6);
			ctx.stroke();
		}
	}
}

Backdrop.prototype.paintPines = function(ctx, w, ground, bottom, color, snow) {
	ctx.fillStyle = color;
	ctx.fillRect(0, ground, w, bottom - ground);
	for (var i = 0; i < 18; i++) {
		var x = this.random() * w;
		var hgt = 26 + this.random() * 34;
		for (var t = 0; t < 3; t++) {
			var ty = ground - hgt + t * (hgt / 3);
			var tw = 10 + t * 6;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(x, ty);
			ctx.lineTo(x - tw, ty + hgt / 3 + 4);
			ctx.lineTo(x + tw, ty + hgt / 3 + 4);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = snow;
			ctx.fillRect(x - tw * 0.5, ty + hgt / 3 + 1, tw, 2);
		}
	}
}

/* ---------- live elements ---------- */

Backdrop.prototype.addClouds = function(count, color) {
	for (var i = 0; i < count; i++) {
		this.clouds.push({
			x: this.random() * this.width,
			y: 20 + this.random() * 120,
			w: 60 + this.random() * 80,
			speed: 0.15 + this.random() * 0.25,
			color: color,
		});
	}
}

Backdrop.prototype.addBirds = function(count) {
	for (var i = 0; i < count; i++) {
		this.birds.push({ x: this.random() * this.width, y: 40 + this.random() * 100, speed: 0.6 + this.random() * 0.6, phase: this.random() * 6.28 });
	}
}

Backdrop.prototype.addStars = function(count) {
	for (var i = 0; i < count; i++) {
		this.stars.push({ x: this.random() * this.width, y: this.random() * this.height * 0.45, phase: this.random() * 6.28, r: 0.6 + this.random() * 1.2 });
	}
}

Backdrop.prototype.drawCloud = function(ctx, x, y, w, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, w * 0.18, 0, Math.PI * 2);
	ctx.arc(x + w * 0.25, y - w * 0.08, w * 0.24, 0, Math.PI * 2);
	ctx.arc(x + w * 0.5, y, w * 0.2, 0, Math.PI * 2);
	ctx.arc(x + w * 0.25, y + w * 0.06, w * 0.2, 0, Math.PI * 2);
	ctx.fill();
}

/* ---------- per frame ---------- */

Backdrop.prototype.draw = function(cameraX, frame) {
	var ctx = this.ctx;
	var w = this.width;
	var h = this.height;
	var i;

	// sky
	if (this.sky) {
		var gradient = ctx.createLinearGradient(0, 0, 0, h);
		gradient.addColorStop(0, this.sky[0]);
		gradient.addColorStop(0.55, this.sky[1]);
		gradient.addColorStop(1, this.sky[2]);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, w, h);
	} else {
		// original city image, with its gentle parallax.
		// integer tile width / positions: fractional ones left a blended, shimmering seam column
		var background = this.game.resources.BACKGROUND;
		var tileWidth = Math.ceil(h * background.width / background.height);
		var x = Math.round((cameraX / 5 * -1) % tileWidth);
		ctx.drawImage(background, x, 0, tileWidth, h);
		ctx.drawImage(background, x + tileWidth, 0, tileWidth, h);
	}

	// stars twinkle
	for (i = 0; i < this.stars.length; i++) {
		var star = this.stars[i];
		var twinkle = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.04 + star.phase));
		ctx.fillStyle = "rgba(255, 255, 255, " + (twinkle * 0.9) + ")";
		ctx.fillRect(star.x, star.y, star.r, star.r);
	}

	// sun / moon
	if (this.sun) {
		ctx.fillStyle = this.sun.glow;
		ctx.beginPath();
		ctx.arc(this.sun.x, this.sun.y, this.sun.r * 1.8, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = this.sun.color;
		ctx.beginPath();
		ctx.arc(this.sun.x, this.sun.y, this.sun.r, 0, Math.PI * 2);
		ctx.fill();
	}

	// far clouds behind the layers
	for (i = 0; i < this.clouds.length; i++) {
		var cloud = this.clouds[i];
		cloud.x -= cloud.speed;
		var cx = cloud.x - cameraX * 0.05;
		cx = ((cx % (w + 160)) + (w + 160)) % (w + 160) - 120;
		this.drawCloud(ctx, cx, cloud.y, cloud.w, cloud.color);
	}

	// tiling parallax layers. Themes with verticalParallax sink their layers as the camera climbs above the
	// start (never above their painted position, so nothing opens up under them)
	// (a stage can also start "high up" with design.skylineSink: e.g. the tower rooftop boss arena)
	var climbed = this.verticalParallax && this.game.level ? Math.max(0, this.game.level.cameraMaxY - this.game.cameraY) + (this.game.level.design.skylineSink || 0) : 0;
	for (i = 0; i < this.layers.length; i++) {
		var layer = this.layers[i];
		var lw = layer.canvas.width;
		var offset = Math.round(((-cameraX * layer.speed) % lw + lw) % lw);
		var sink = climbed ? Math.round(climbed * (this.verticalParallax[i] || 0) * this.game.zoom) : 0;
		for (var lx = offset - lw; lx < w; lx += lw) {
			ctx.drawImage(layer.canvas, lx, sink);
		}
	}

	// smoke rising from the smokestacks (industrial), moving with their layer
	if (this.stacks && this.stacks.length) {
		var stackLayer = this.layers[this.stackLayer];
		var slw = stackLayer.canvas.width;
		var soff = Math.round(((-cameraX * stackLayer.speed) % slw + slw) % slw);
		for (var sl = soff - slw; sl < w; sl += slw) {
			for (i = 0; i < this.stacks.length; i++) {
				var stack = this.stacks[i];
				var sxs = sl + stack.x;
				if (sxs < -80 || sxs > w + 20) continue;
				for (var puff = 0; puff < 6; puff++) {
					var age = (frame * 0.4 + puff * 17 + stack.phase) % 100;
					var size = 6 + age * 0.2;
					ctx.fillStyle = "rgba(120, 100, 110, " + (0.4 * (1 - age / 100)) + ")";
					ctx.fillRect(Math.round(sxs + age * 0.45 - size / 2), Math.round(stack.y - 4 - age * 1.1 - size / 2), Math.round(size), Math.round(size));
				}
			}
		}
	}

	// pump station: turning impeller wheels, sodium lamp glow, blinking panel lights
	if (this.impellers) {
		var iLayer = this.layers[this.impellerLayer];
		var ilw = iLayer.canvas.width;
		var ioff = Math.round(((-cameraX * iLayer.speed) % ilw + ilw) % ilw);
		for (var il = ioff - ilw; il < w; il += ilw) {
			for (i = 0; i < this.impellers.length; i++) {
				var imp = this.impellers[i];
				var ix = il + imp.x;
				if (ix < -imp.r - 5 || ix > w + imp.r + 5) continue;
				ctx.strokeStyle = "#3a434e";
				ctx.lineWidth = 5;
				ctx.beginPath();
				for (var bl = 0; bl < 5; bl++) {
					var ba = frame * imp.speed + bl * Math.PI * 2 / 5;
					ctx.moveTo(ix, imp.y);
					ctx.lineTo(ix + Math.cos(ba) * imp.r, imp.y + Math.sin(ba) * imp.r);
				}
				ctx.stroke();
				ctx.fillStyle = "#4a5562";
				ctx.fillRect(Math.round(ix) - 5, Math.round(imp.y) - 5, 10, 10);
				ctx.fillStyle = Math.floor(frame / 25 + i) % 3 === 0 ? "#8ee27a" : "#2f5a2e";
				ctx.fillRect(Math.round(ix + imp.r + 12), Math.round(imp.y - 3), 4, 4);
			}
		}
		var lLayer = this.layers[this.lampLayer];
		var llw = lLayer.canvas.width;
		var loff = Math.round(((-cameraX * lLayer.speed) % llw + llw) % llw);
		for (var ll = loff - llw; ll < w; ll += llw) {
			for (i = 0; i < this.stationLamps.length; i++) {
				var lamp2 = this.stationLamps[i];
				var lx2 = ll + lamp2.x;
				if (lx2 < -80 || lx2 > w + 80) continue;
				var glow2 = ctx.createRadialGradient(lx2, lamp2.y, 2, lx2, lamp2.y, 70);
				glow2.addColorStop(0, "rgba(255, 170, 70, 0.35)");
				glow2.addColorStop(1, "rgba(255, 170, 70, 0)");
				ctx.fillStyle = glow2;
				ctx.fillRect(lx2 - 70, lamp2.y - 70, 140, 140);
				ctx.fillStyle = "#ffcf7a";
				ctx.fillRect(Math.round(lx2) - 4, Math.round(lamp2.y), 8, 3);
			}
		}
	}

	// sewer: light falling through street grates above, drips
	if (this.grateLights) {
		for (i = 0; i < this.grateLights.length; i++) {
			var gl = this.grateLights[i];
			var glx = ((gl.x - cameraX * 0.12) % (w + 200) + (w + 200)) % (w + 200) - 100;
			ctx.save();
			ctx.globalAlpha = 0.06 + 0.02 * Math.sin(frame * 0.02 + i);
			ctx.fillStyle = "#d8f0c8";
			ctx.beginPath();
			ctx.moveTo(glx, 0); ctx.lineTo(glx + gl.w, 0); ctx.lineTo(glx + gl.w * 2.2, h * 0.85); ctx.lineTo(glx + gl.w * 0.6, h * 0.85);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
			ctx.fillStyle = "#0a0c0b";
			for (var gb = 0; gb < gl.w; gb += 6) ctx.fillRect(glx + gb, 0, 2, 6);
		}
	}
	if (this.drips) {
		for (i = 0; i < this.drips.length; i++) {
			var d = this.drips[i];
			var dy = (frame * d.speed + d.phase) % (h + 40) - 20;
			var dx = ((d.x - cameraX * 0.12) % w + w) % w;
			ctx.fillStyle = "rgba(170, 220, 190, 0.5)";
			ctx.fillRect(Math.round(dx), Math.round(dy), 2, 5);
		}
	}

	// harbour: blinking crane / mast lights (moving with their layer), the lighthouse on the far point and its
	// sweeping beam, a slow shimmer on the water
	if (this.craneLights && this.craneLights.length) {
		var hLayer = this.layers[this.harborLayer];
		var hlw = hLayer.canvas.width;
		var hoff = Math.round(((-cameraX * hLayer.speed) % hlw + hlw) % hlw);
		for (var hl = hoff - hlw; hl < w; hl += hlw) {
			for (i = 0; i < this.craneLights.length; i++) {
				var light = this.craneLights[i];
				var lxs = hl + light.x;
				if (lxs < -5 || lxs > w + 5 || (frame + light.phase) % 90 > 45) continue;
				ctx.fillStyle = light.color;
				ctx.fillRect(Math.round(lxs) - 1, Math.round(light.y) - 1, 3, 3);
			}
		}
	}
	if (this.lighthouse) {
		var lhLayer = this.layers[this.lighthouse.layer];
		var lhw = lhLayer.canvas.width;
		var lhx = Math.round(((this.lighthouse.x - cameraX * lhLayer.speed) % lhw + lhw) % lhw);
		if (lhx > w + 40) lhx -= lhw;
		var lhy = h * 0.6;
		ctx.fillStyle = "#0c1628";
		ctx.fillRect(lhx - 4, lhy - 42, 9, 42);
		ctx.fillRect(lhx - 6, lhy - 46, 13, 4);
		ctx.fillStyle = "#d8d2b8";
		for (var band = 0; band < 3; band++) ctx.fillRect(lhx - 4, lhy - 36 + band * 12, 9, 4);
		var lamp = Math.sin(frame * 0.02);
		ctx.fillStyle = "rgba(255, 240, 180, " + (0.5 + 0.5 * Math.abs(lamp)) + ")";
		ctx.fillRect(lhx - 2, lhy - 52, 5, 6);
		ctx.save();
		ctx.globalAlpha = 0.1 * Math.abs(lamp);
		ctx.fillStyle = "#fff4c8";
		ctx.beginPath();
		ctx.moveTo(lhx, lhy - 49);
		ctx.lineTo(lhx + lamp * 260, lhy - 49 - 18);
		ctx.lineTo(lhx + lamp * 260, lhy - 49 + 18);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	if (this.theme === "HARBOR") {
		ctx.fillStyle = "rgba(180, 220, 255, 0.16)";
		for (var sh = 0; sh < 22; sh++) {
			var shx = ((sh * 97 + frame * (0.2 + (sh % 3) * 0.1) - cameraX * 0.08) % (w + 40) + (w + 40)) % (w + 40) - 20;
			var shy = h * 0.63 + (sh % 6) * 9 + Math.sin(frame * 0.03 + sh) * 1.5;
			ctx.fillRect(Math.round(shx), Math.round(shy), 10 + (sh % 4) * 4, 1);
		}
	}

	// sweeping searchlight (hideout)
	if (this.searchlight) {
		var sl = this.searchlight;
		sl.angle = Math.sin(frame * 0.006) * 0.5;
		ctx.save();
		ctx.globalAlpha = 0.12;
		ctx.fillStyle = "#c8ffe8";
		ctx.beginPath();
		ctx.moveTo(w * 0.8, h * 0.66);
		ctx.lineTo(w * 0.8 + Math.sin(sl.angle - 0.08) * h, h * 0.66 - Math.cos(sl.angle - 0.08) * h);
		ctx.lineTo(w * 0.8 + Math.sin(sl.angle + 0.08) * h, h * 0.66 - Math.cos(sl.angle + 0.08) * h);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	// waves on the water (beach)
	if (this.theme === "BEACH") {
		ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
		ctx.lineWidth = 2;
		for (var row = 0; row < 3; row++) {
			var wy = h * 0.64 + row * 16;
			ctx.beginPath();
			for (var wx = 0; wx <= w; wx += 8) {
				ctx.lineTo(wx, wy + Math.sin((wx + frame * (1.2 + row * 0.4) + row * 40) / 22) * 2.5);
			}
			ctx.stroke();
		}
	}

	// train crossing the bridge
	if (this.train) {
		var train = this.train;
		train.x += train.speed;
		if (train.x > w + 100 + train.cars * 46) {
			train.timer++;
			if (train.timer > 240) { train.x = -train.cars * 46 - 60; train.timer = 0; train.speed = 2 + Math.random() * 1.5; }
		}
		for (var c = 0; c < train.cars; c++) {
			var carX = train.x - c * 46;
			ctx.fillStyle = c === 0 ? "#2b2b35" : "#3f4a6b";
			ctx.fillRect(carX, train.y - 18, 42, 18);
			ctx.fillStyle = "#ffe08a";
			for (var win = 0; win < 4; win++) ctx.fillRect(carX + 4 + win * 10, train.y - 14, 6, 6);
		}
	}

	// birds
	for (i = 0; i < this.birds.length; i++) {
		var bird = this.birds[i];
		bird.x -= bird.speed;
		var bx = ((bird.x % (w + 60)) + (w + 60)) % (w + 60) - 30;
		var by = bird.y + Math.sin(frame * 0.03 + bird.phase) * 8;
		var flap = Math.sin(frame * 0.25 + bird.phase) * 4;
		ctx.strokeStyle = this.theme === "CITY" || this.theme === "SNOW" || this.theme === "HARBOR" ? "rgba(220, 230, 255, 0.7)" : "rgba(40, 30, 40, 0.75)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(bx - 6, by + flap);
		ctx.lineTo(bx, by);
		ctx.lineTo(bx + 6, by + flap);
		ctx.stroke();
	}

	// helicopter with a blinking light (city)
	if (this.chopper) {
		var ch = this.chopper;
		ch.x += ch.speed;
		if (ch.x > w + 120) ch.x = -160 - Math.random() * 400;
		ctx.fillStyle = "#1a1f2e";
		ctx.fillRect(ch.x, ch.y, 30, 10);
		ctx.fillRect(ch.x - 18, ch.y + 3, 20, 3);
		ctx.fillRect(ch.x + 8, ch.y - 4, 14, 2);
		ctx.fillStyle = Math.floor(frame / 12) % 2 === 0 ? "#ff4040" : "#402020";
		ctx.fillRect(ch.x + 14, ch.y - 7, 3, 3);
		ctx.strokeStyle = "rgba(200, 210, 230, 0.5)";
		ctx.beginPath();
		ctx.moveTo(ch.x + 15 - 18 * Math.abs(Math.cos(frame * 0.6)), ch.y - 4);
		ctx.lineTo(ch.x + 15 + 18 * Math.abs(Math.cos(frame * 0.6)), ch.y - 4);
		ctx.stroke();
	}

	// snow
	for (i = 0; i < this.flakes.length; i++) {
		var flake = this.flakes[i];
		flake.y += flake.s;
		flake.x += Math.sin(frame * 0.02 + flake.drift) * 0.3;
		if (flake.y > h) { flake.y = -4; flake.x = Math.random() * w; }
		var fx = ((flake.x - cameraX * 0.1) % w + w) % w;
		ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
		ctx.fillRect(fx, flake.y, flake.r, flake.r);
	}
}

function SpidermanGame(opts) {
	var options = {
		canvas: "canvas",
		score: 0,
		muted: false,
		soundEffects: true,
		fitToWindow: false,
	};

	opts = opts || {};

	for (var option in options) {
		if (opts.hasOwnProperty(option)) {
			options[option] = opts[option];
		}

		this[option] = options[option];
	}

	// how many frames have passed
	this.frame = 0;
	this.resources = {};

	this.cameraX = 0;
	this.cameraY = 0; // vertical scroll (campaign stages with several heights; always 0 in the endless run)
	this.farthestCameraX = 0;
	this.score = this.score || 0;
	this.bestScore = parseInt(readStorage(STORAGE_KEYS.BEST_SCORE), 10) || 0;

	this.state = STATE.LOADING;
	this.gameoverReason = null;

	// ENDLESS or CAMPAIGN (see MODE); the campaign plays fixed levels from SpidermanGame.campaign
	this.mode = MODE.ENDLESS;
	this.level = null;          // the CampaignLevel being played (campaign only)
	this.levelFrames = 0;       // frames played in the current stage (timer)
	this.introFrames = 0;       // stage title card countdown
	this.lastUnlockedId = null; // stage unlocked by the last clear (for the results screen)

	// world view: the canvas is 711x400, but the world can be drawn zoomed out (campaign).
	// viewWidth / viewHeight are the world pixels that fit on the canvas; game logic uses these, never canvas.width/height
	this.zoom = 1;
	this.viewWidth = 711;
	this.viewHeight = 400;

	// campaign progress: { levels: { "1-1": { completed, bestScore, bestTime } } }, kept in localStorage
	this.campaignProgress = this.loadCampaignProgress();
	this.campaignWorldIndex = 0; // the world shown in the level select (see getDefaultCampaignWorldIndex)

	// animated camera for the main menu backdrop
	this.menuCameraX = 0;

	this.scene = {
		spiderman: null,
		projectiles: [],
		roofs: [],
		enemies: [],
		pickups: [],
		effects: [],
	}; // object that contains information about the next scene

	this.resetRunStats();

	this.sfx = new SoundFX(this);

	// selected backdrop theme (remembered between visits)
	var savedTheme = readStorage(STORAGE_KEYS.THEME);
	this.themeName = THEMES[savedTheme] ? savedTheme : DEFAULT_THEME;
	this.backdrop = null; // created once the images are loaded

	// visual feedback timers (frames)
	this.hitFlash = 0;
	this.shake = 0;
	this.scorePulse = 0;
	this.coinPulse = 0;

	// restore sound / music preferences from a previous visit
	var settings = {};
	try {
		settings = JSON.parse(readStorage(STORAGE_KEYS.SETTINGS) || "{}") || {};
	} catch (e) {}
	if (!opts.hasOwnProperty("muted") && typeof settings.music === "boolean") this.muted = !settings.music;
	if (!opts.hasOwnProperty("soundEffects") && typeof settings.sound === "boolean") this.soundEffects = settings.sound;
	// developer mode: every campaign stage (also future ones) is unlocked in the level select
	this.devMode = settings.dev === true;
}

SpidermanGame.prototype.paused             = false;
SpidermanGame.prototype.gameIsOver         = false;
SpidermanGame.prototype.initialized        = false;
SpidermanGame.prototype.soundEffects       = true;
SpidermanGame.prototype.escapeKey          = false;
SpidermanGame.prototype.muted              = false;
SpidermanGame.prototype.slowmotion         = false;
SpidermanGame.prototype.musicStarted       = false;

SpidermanGame.prototype.load = function() {
	if (this.initialized) return false;
	this.initialized = true;

	var self = this;

	this.canvas = document.querySelector(this.canvas);
	if (!this.canvas) {
		this.canvas = document.createElement("canvas");
		document.body.appendChild(this.canvas);
	}
	this.ctx = this.canvas.getContext("2d");
	this.canvas.height = 400;
	this.canvas.width = 711;
	this.setZoom(1);

	// wrap the canvas so that menu overlays can be positioned exactly on top of it
	var wrapper = document.createElement("div");
	wrapper.className = "spiderman-game-wrapper";
	this.canvas.parentNode.insertBefore(wrapper, this.canvas);
	wrapper.appendChild(this.canvas);
	this.wrapper = wrapper;

	// phones / tablets: on-screen touch buttons (shown while playing). A mouse-first device switches to touch mode
	// on its first touch
	this.touchMode = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
	this.fullscreenSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
	this.buildTouchControls();
	document.addEventListener("touchstart", function() {
		if (self.touchMode) return;
		self.touchMode = true;
		self.fitWrapperToWindow();
		self.syncTouchControls();
		self.syncMusicHint();
	}, { capture: true, passive: true });

	if (this.fitToWindow) {
		wrapper.classList.add("is-fitted");
		this.fitWrapperToWindow();
		var refit = function() { self.fitWrapperToWindow(); self.syncFullscreenButtons(); };
		window.addEventListener("resize", refit);
		window.addEventListener("orientationchange", function() { setTimeout(refit, 150); });
		document.addEventListener("fullscreenchange", refit);
		document.addEventListener("webkitfullscreenchange", refit);
	}

	this.buildMenus();

	var spiderman = new SpiderMan(this);
	this.spiderman = spiderman;

	// browsers only allow sound after the first interaction with the page: the music is tried right away when
	// the game has loaded, and started on the very first press / click / tap anywhere if that was blocked
	var firstGesture = function() { self.unlockAudio(); };
	["pointerdown", "mousedown", "touchstart", "keydown"].forEach(function(type) {
		document.addEventListener(type, firstGesture, { capture: true, passive: true });
	});
	for (var m = 0; m < AUDIO_LOOP.length; m++) {
		AUDIO_RESOURCES[AUDIO_LOOP[m]].addEventListener("playing", function() { self.musicStarted = true; self.syncMusicHint(); });
	}

	document.addEventListener("keydown", function(e) {
		var keyCode = e.keyCode || e.which;

		if (self.state === STATE.LOADING) return;

		// any key press counts as a user gesture, so music can start if the browser blocked autoplay
		self.unlockAudio();

		// F toggles full screen in every state
		if (keyCode == KEY.F) {
			if (!e.repeat) self.toggleFullscreen();
			e.preventDefault();
			return;
		}

		// fire this on the FIRST keydown callback (ignore auto repeat)
		if (keyCode == KEY.ESC) {
			if (!self.escapeKey) {
				self.escapeKey = true;
				self.handleEscape();
			}
			e.preventDefault();
			return;
		}

		if (self.state === STATE.PLAYING) {
			if (GAME_KEYS.indexOf(keyCode) > -1) e.preventDefault();
			self.spiderman.keydown(keyCode);
			return;
		}

		// in every menu the keyboard navigates the buttons
		if (self.handleMenuKey(keyCode)) e.preventDefault();
	});

	// HUD pause button: works like ESC
	this.canvas.addEventListener("click", function(e) {
		if (self.state !== STATE.PLAYING) return;
		if (self.isInsidePauseButton(self.eventToCanvas(e))) {
			self.unlockAudio();
			self.pause();
		}
	});
	this.canvas.addEventListener("mousemove", function(e) {
		var inside = self.state === STATE.PLAYING && self.isInsidePauseButton(self.eventToCanvas(e));
		self.pauseButtonHover = inside;
		self.canvas.style.cursor = inside ? "pointer" : "default";
	});
	this.canvas.addEventListener("touchstart", function(e) {
		if (self.state !== STATE.PLAYING) return;
		if (self.isInsidePauseButton(self.eventToCanvas(e))) {
			e.preventDefault();
			self.unlockAudio();
			self.pause();
		}
	}, { passive: false });

	document.addEventListener("keyup", function(e) {
		var keyCode = e.keyCode || e.which;

		if (keyCode == KEY.ESC) {
			self.escapeKey = false;
		}

		// always forward key ups, so no key stays "stuck" after pausing
		self.spiderman.keyup(keyCode);
	});

	for (var i = 0; i < AUDIO_LOOP.length; i++) {
		var soundName = AUDIO_LOOP[i];
		var sound = AUDIO_RESOURCES[soundName];
		sound.setAttribute("data-name", soundName);
		sound.ontimeupdate = function() {
			if (this.currentTime >= this.duration) {
				var current = AUDIO_LOOP.indexOf(this.getAttribute("data-name"));
				var next = (current + 1) % (AUDIO_LOOP.length);

				self.currentTrack = AUDIO_LOOP[next];
				self.playSound(AUDIO_LOOP[next], false, 0);
			}
		}
	}

	// to show that canvas is here, but is being loaded
	this.canvas.style.backgroundColor = "black";
	this.ctx.font = "30px Helvetica";
	this.ctx.textAlign = "center";
	this.ctx.fillStyle = "white";
	this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);

	return new Promise(function(resolve, reject) {
		var reourcesArray = [];

		for (var resource in RESOURCES) {
			reourcesArray.push({
				name: resource,
				source: RESOURCES_FOLDER_PATH + RESOURCES[resource],
			});
		}

		var index = 0;

		function loadNext() {
			if (!reourcesArray[index]) {
				// apply saved audio preferences
				if (self.muted) self.mute(); else self.unmute();
				self.syncAudioButtons();

				// everything is loaded: show the main menu instead of jumping straight into the game
				self.setTheme(self.themeName);
				self.showMainMenu();
				self.startMusic();

				return resolve();
			}

			var resource = reourcesArray[index];
			var img = new Image();

			img.onload = function() {
				index++;
				self.resources[resource.name] = img;
				loadNext();
			}
			img.src = resource.source;
		}

		loadNext();
	});
}

// zoom < 1 draws the world smaller so more of it is visible; the HUD and menus are never zoomed
SpidermanGame.prototype.setZoom = function(zoom) {
	this.zoom = zoom > 0 ? zoom : 1;
	this.viewWidth = this.canvas.width / this.zoom;
	this.viewHeight = this.canvas.height / this.zoom;
}

SpidermanGame.prototype.isCampaign = function() {
	return this.mode === MODE.CAMPAIGN;
}

SpidermanGame.prototype.setTheme = function(name) {
	if (!THEMES[name]) name = DEFAULT_THEME;
	this.themeName = name;
	this.backdrop = new Backdrop(this, name);
	writeStorage(STORAGE_KEYS.THEME, name);
	this.syncThemeButtons();
}

SpidermanGame.prototype.syncThemeButtons = function() {
	if (!this.wrapper) return;
	var buttons = this.wrapper.querySelectorAll('[data-action="theme"]');
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].classList[buttons[i].getAttribute("data-theme") === this.themeName ? "add" : "remove"]("is-current");
	}
}

// scales the wrapper (canvas + overlays) so the game fills the window, keeping the aspect ratio
SpidermanGame.prototype.fitWrapperToWindow = function() {
	if (!this.fitToWindow || !this.wrapper) return;

	var W = window.innerWidth, H = window.innerHeight;
	var cw = this.canvas.width, ch = this.canvas.height;
	var scale = Math.min(W / cw, H / ch);
	// touch device held upright: the game goes to the top and the touch buttons get the space below it
	var portrait = this.touchMode && H > W;
	if (portrait) scale = Math.min(W / cw, Math.max(0.1, (H - TOUCH.PORTRAIT_CONTROLS) / ch));
	// touch device held sideways: keep some room at both sides for the buttons (the game gets a bit smaller on
	// narrow phones, wide phones have that room anyway)
	else if (this.touchMode) scale = Math.min(scale, Math.max(0.1, (W - 2 * Math.min(TOUCH.LANDSCAPE_SIDE, W * 0.12)) / cw));
	scale = Math.max(0.1, scale);

	var visualTop = portrait ? TOUCH.PORTRAIT_TOP : (H - ch * scale) / 2;
	this.wrapper.style.width = cw + "px";
	this.wrapper.style.height = ch + "px";
	this.wrapper.style.left = Math.round((W - cw) / 2) + "px";
	// the wrapper scales around its center: shift its box so the scaled game starts at visualTop
	this.wrapper.style.top = Math.round(visualTop - (ch - ch * scale) / 2) + "px";
	this.wrapper.style.transform = "scale(" + scale + ")";
	this.viewScale = scale;
	this.layoutTouchControls(portrait, visualTop + ch * scale);
}

SpidermanGame.prototype.isTouchDevice = function() {
	return !!this.touchMode;
}

// the on-screen buttons: a layer fixed to the screen (not scaled with the game, so they keep a finger friendly
// size). Left: a d-pad (left / right move, up climbs / uses doors / jumps, down climbs down / slides). Right: JUMP
// (also shoots the web to a swing hook in the air and lets go), WEB, SLIDE, and RESCUE (E) in stages with
// trapped workers. Every finger is tracked on its own,
// so a direction can be held while jumping or shooting, and sliding a finger from one button to another works.
// The buttons press the same keys as the keyboard.
SpidermanGame.prototype.buildTouchControls = function() {
	var self = this;
	var layer = document.createElement("div");
	layer.className = "spiderman-touch";
	layer.style.display = "none";
	layer.innerHTML =
		'<div class="spiderman-touch-pad">' +
			'<div class="spiderman-touch-btn is-up" data-key="' + KEY.ARROW_UP + '" data-name="up"><span class="spiderman-touch-arrow is-up"></span></div>' +
			'<div class="spiderman-touch-btn is-left" data-key="' + KEY.ARROW_LEFT + '" data-name="left"><span class="spiderman-touch-arrow is-left"></span></div>' +
			'<div class="spiderman-touch-btn is-right" data-key="' + KEY.ARROW_RIGHT + '" data-name="right"><span class="spiderman-touch-arrow is-right"></span></div>' +
			'<div class="spiderman-touch-btn is-down" data-key="' + KEY.ARROW_DOWN + '" data-name="down"><span class="spiderman-touch-arrow is-down"></span></div>' +
		'</div>' +
		'<div class="spiderman-touch-actions">' +
			'<div class="spiderman-touch-btn is-jump" data-key="' + KEY.SPACEBAR + '" data-name="jump">JUMP<small>SWING</small></div>' +
			'<div class="spiderman-touch-btn is-web" data-key="' + KEY.X + '" data-name="web">WEB</div>' +
			'<div class="spiderman-touch-btn is-slide" data-key="' + KEY.ARROW_DOWN + '" data-name="slide">SLIDE</div>' +
			// only in stages with trapped workers (see syncTouchControls); lights up when one is within reach
			'<div class="spiderman-touch-btn is-rescue" data-key="' + KEY.E + '" data-name="rescue">RESCUE</div>' +
		'</div>';
	document.body.appendChild(layer);
	this.touchLayer = layer;

	var hint = document.createElement("div");
	hint.className = "spiderman-touch-rotate";
	hint.style.display = "none";
	hint.innerHTML = "TURN YOUR PHONE SIDEWAYS FOR A BIGGER VIEW";
	document.body.appendChild(hint);
	this.rotateHint = hint;

	this.touchKeys = {};      // keyCode -> how many buttons hold it (down is on two buttons)
	this.touchPressed = [];   // buttons held right now

	var update = function(e) {
		e.preventDefault();
		self.touchMode = true;
		self.unlockAudio();
		// every button under a finger that is still on the screen
		var now = [];
		for (var i = 0; i < e.touches.length; i++) {
			var el = document.elementFromPoint(e.touches[i].clientX, e.touches[i].clientY);
			var button = el && el.closest ? el.closest(".spiderman-touch-btn") : null;
			if (button && now.indexOf(button) < 0) now.push(button);
		}
		self.setTouchButtons(now);
	};
	["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function(type) {
		layer.addEventListener(type, update, { passive: false });
	});
	// a mouse on a touch screen laptop (and tests) can use the buttons too
	layer.addEventListener("mousedown", function(e) {
		var button = e.target.closest ? e.target.closest(".spiderman-touch-btn") : null;
		if (!button) return;
		e.preventDefault();
		self.setTouchButtons([button]);
		var up = function() { self.setTouchButtons([]); document.removeEventListener("mouseup", up); };
		document.addEventListener("mouseup", up);
	});
}

// presses the keys of newly touched buttons and releases the ones no finger is on anymore
// keys of buttons that are still held, pressed again if something released them (a door, unpausing): like a
// held keyboard key, without a new "tap" (so it never jumps again by itself)
SpidermanGame.prototype.refreshTouchKeys = function() {
	if (!this.touchPressed || !this.touchPressed.length || !this.spiderman) return;
	for (var code in this.touchKeys) {
		code = +code;
		if (this.touchKeys[code] > 0 && !this.spiderman.keyIsDown(code)) this.spiderman.keydowns.push(code);
	}
}

SpidermanGame.prototype.setTouchButtons = function(buttons) {
	var i, code;
	var old = this.touchPressed || [];
	for (i = 0; i < old.length; i++) {
		if (buttons.indexOf(old[i]) > -1) continue;
		old[i].classList.remove("is-pressed");
		code = +old[i].getAttribute("data-key");
		this.touchKeys[code] = Math.max(0, (this.touchKeys[code] || 0) - 1);
		if (!this.touchKeys[code] && this.spiderman) this.spiderman.keyup(code);
	}
	for (i = 0; i < buttons.length; i++) {
		if (old.indexOf(buttons[i]) > -1) continue;
		buttons[i].classList.add("is-pressed");
		code = +buttons[i].getAttribute("data-key");
		this.touchKeys[code] = (this.touchKeys[code] || 0) + 1;
		if (this.touchKeys[code] === 1 && this.spiderman && this.state === STATE.PLAYING) this.spiderman.keydown(code);
	}
	this.touchPressed = buttons.slice();
}

// touch buttons only while playing on a touch device (menus are tapped directly)
SpidermanGame.prototype.syncTouchControls = function() {
	if (!this.touchLayer) return;
	var show = this.touchMode && this.state === STATE.PLAYING;
	if (!show && this.touchPressed && this.touchPressed.length) this.setTouchButtons([]);
	this.touchLayer.style.display = show ? "" : "none";
	this.touchLayer.classList[this.touchMode && window.innerHeight > window.innerWidth ? "add" : "remove"]("is-portrait");
	// the RESCUE button only exists in stages with trapped workers
	var rescueStage = !!(show && this.isCampaign() && this.level && (this.level.rescues.length || this.level.controls.length));
	this.touchLayer.classList[rescueStage ? "add" : "remove"]("has-rescue");
	this.syncRescueButton();
	if (this.rotateHint) this.rotateHint.style.display = this.touchMode && window.innerHeight > window.innerWidth ? "" : "none";
}

// the RESCUE button glows while a trapped worker is within reach (the DOM is only touched when that changes)
SpidermanGame.prototype.syncRescueButton = function() {
	if (!this.touchLayer) return;
	var level = this.state === STATE.PLAYING && this.isCampaign() ? this.level : null;
	var ready = !!(level && (level.rescueInReach || level.controlInReach));
	// the label says what E does right now: RESCUE a worker, LOWER / RAISE the water; otherwise RESCUE (stages with only
	// workers) or USE
	var label = "RESCUE";
	if (level && level.rescueInReach) label = "RESCUE";
	else if (level && level.controlInReach) label = level.controlAction(level.controlInReach);
	else if (level && level.controls.length) label = "USE";
	if (ready === this.rescueButtonReady && label === this.rescueButtonLabel) return;
	this.rescueButtonReady = ready;
	this.rescueButtonLabel = label;
	var button = this.touchLayer.querySelector(".is-rescue");
	if (!button) return;
	button.classList[ready ? "add" : "remove"]("is-ready");
	button.textContent = label;
}

// portrait: the buttons go in the space under the game (belowY = bottom of the game in css px)
SpidermanGame.prototype.layoutTouchControls = function(portrait, belowY) {
	if (!this.touchLayer) return;
	// the layer is anchored to the bottom of the screen; in portrait the hint goes right under the game
	if (this.rotateHint) this.rotateHint.style.top = portrait ? Math.round(belowY + 8) + "px" : "";
	this.syncTouchControls();
}

SpidermanGame.prototype.isFullscreen = function() {
	return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

SpidermanGame.prototype.toggleFullscreen = function() {
	var self = this;
	var root = document.documentElement;
	var result;

	try {
		if (this.isFullscreen()) {
			result = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
		} else {
			if (!root.requestFullscreen && !root.webkitRequestFullscreen) return false;
			result = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
			// phones: full screen is best in landscape (only allowed while in full screen; ignored elsewhere)
			if (this.touchMode && result && typeof result.then === "function" && screen.orientation && screen.orientation.lock) {
				result.then(function() { try { screen.orientation.lock("landscape").then(null, function() {}); } catch (e) {} }, function() {});
			}
		}
	} catch (e) {
		return false;
	}

	// some browsers reject (e.g. not allowed without a gesture): never let it surface as an error
	if (result && typeof result.then === "function") {
		result.then(function() { self.syncFullscreenButtons(); }, function() {});
	}
	return true;
}

SpidermanGame.prototype.syncFullscreenButtons = function() {
	if (!this.wrapper) return;
	var buttons = this.wrapper.querySelectorAll('[data-action="toggle-fullscreen"]');
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].innerHTML = this.isFullscreen() ? "WINDOWED" : "FULLSCREEN";
		// browsers without element full screen (iPhone Safari): no button that does nothing
		buttons[i].style.display = this.fullscreenSupported ? "" : "none";
	}
}

/* ------------------------------------------------------------------
 * Menus (DOM overlays on top of the canvas)
 * ------------------------------------------------------------------ */

SpidermanGame.prototype.buildMenus = function() {
	var self = this;
	var imagesPath = RESOURCES_FOLDER_PATH + "images/";

	function create(html) {
		var holder = document.createElement("div");
		holder.innerHTML = html;
		var element = holder.firstChild;
		self.wrapper.appendChild(element);
		return element;
	}

	function key(label) {
		return '<span class="spiderman-game-key">' + label + '</span>';
	}

	var themeButtons = "";
	for (var t = 0; t < THEME_ORDER.length; t++) {
		var themeName = THEME_ORDER[t];
		var theme = THEMES[themeName];
		themeButtons +=
			'<div class="spiderman-game-menu-button spiderman-game-theme-button" data-action="theme" data-theme="' + themeName + '">' +
				'<span class="spiderman-game-theme-swatch" style="background: linear-gradient(135deg, ' + theme.colors[0] + ', ' + theme.colors[1] + ')"></span>' +
				theme.label +
			'</div>';
	}

	// controls: a compact two column grid (keyboard), plus what the on-screen buttons do (shown on touch devices)
	function control(keys, what) {
		return '<div class="spiderman-game-control"><span class="spiderman-game-control-keys">' + keys + '</span><span class="spiderman-game-control-what">' + what + '</span></div>';
	}
	var controlsTable =
		'<div class="spiderman-game-controls spiderman-game-keyboard-help">' +
			control(key("&larr;") + key("&rarr;"), "MOVE") +
			control(key("&uarr;") + key("SPACE"), "JUMP") +
			control(key("&darr;"), "SLIDE (SHORT DASH)") +
			control(key("X"), "SHOOT WEB") +
			control(key("&uarr;") + key("&darr;"), "CLIMB LADDERS, POLES, LATTICES (SPACE JUMPS OFF)") +
			control(key("SPACE"), "IN THE AIR NEAR A HOOK: WEB SWING (AGAIN: LET GO)") +
			control(key("&uarr;"), "IN FRONT OF A DOOR: GO THROUGH") +
			control(key("E"), "NEXT TO A TRAPPED WORKER: RESCUE - AT A PUMP / VALVE: USE IT") +
			control(key("ESC"), "PAUSE / RESUME") +
			control(key("F"), "FULLSCREEN") +
		'</div>' +
		'<div class="spiderman-game-touch-help">' +
			'<div class="spiderman-game-touch-help-title">TOUCH SCREEN</div>' +
			'<div class="spiderman-game-controls">' +
				control('<span class="spiderman-game-touch-chip">&#9664; &#9654;</span>', "MOVE") +
				control('<span class="spiderman-game-touch-chip">&#9650;</span>', "CLIMB / DOOR / JUMP") +
				control('<span class="spiderman-game-touch-chip">&#9660;</span>', "CLIMB DOWN / SLIDE") +
				control('<span class="spiderman-game-touch-chip">JUMP</span>', "JUMP, WEB SWING, LET GO") +
				control('<span class="spiderman-game-touch-chip">WEB</span>', "SHOOT WEB") +
				control('<span class="spiderman-game-touch-chip">RESCUE</span>', "FREE A TRAPPED WORKER, WORK A PUMP") +
				control('<span class="spiderman-game-touch-chip">II</span>', "PAUSE (TOP OF THE SCREEN)") +
			'</div>' +
		'</div>';

	// ---- main menu ----
	this.mainMenu = create(
		'<div class="spiderman-game-overlay spiderman-game-main-menu">' +
			'<div class="spiderman-game-main-menu-inner spiderman-game-main-menu-home">' +
				'<img class="spiderman-game-logo" src="' + imagesPath + 'spider-head.png" alt="">' +
				'<div class="spiderman-game-title">SPIDER-MAN</div>' +
				'<div class="spiderman-game-subtitle">ROOFTOP RUN</div>' +
				'<div class="spiderman-game-menu-list">' +
					'<div class="spiderman-game-menu-button" data-action="endless">ENDLESS RUN</div>' +
					'<div class="spiderman-game-menu-button" data-action="campaign">CAMPAIGN<span class="spiderman-game-badge spiderman-game-campaign-badge">0/4</span></div>' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="controls">CONTROLS</div>' +
					'<div class="spiderman-game-menu-button is-secondary spiderman-game-dev-button" data-action="toggle-dev">DEV MODE: OFF</div>' +
					'<div class="spiderman-game-toggle-row">' +
						'<div class="spiderman-game-menu-button is-secondary" data-action="toggle-sound">SOUND: ON</div>' +
						'<div class="spiderman-game-menu-button is-secondary" data-action="toggle-music">MUSIC: ON</div>' +
						'<div class="spiderman-game-menu-button is-secondary" data-action="toggle-fullscreen">FULLSCREEN</div>' +
					'</div>' +
				'</div>' +
				'<div class="spiderman-game-menu-hint">UP / DOWN TO SELECT - ENTER TO CONFIRM</div>' +
				'<div class="spiderman-game-music-hint" style="display:none"></div>' +
				'<div class="spiderman-game-best-score">BEST RUN: <span class="spiderman-game-best-score-value">0</span></div>' +
			'</div>' +

			'<div class="spiderman-game-panel is-wide spiderman-game-theme-panel" style="display:none">' +
				'<div class="spiderman-game-panel-title is-blue">CHOOSE A THEME</div>' +
				'<p class="spiderman-game-panel-text">Pick the scenery for your run.</p>' +
				'<div class="spiderman-game-menu-list spiderman-game-theme-list">' + themeButtons + '</div>' +
				'<div class="spiderman-game-menu-list">' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="back">BACK</div>' +
				'</div>' +
			'</div>' +

			'<div class="spiderman-game-panel is-wide spiderman-game-campaign-panel" style="display:none">' +
				'<div class="spiderman-game-panel-title">CAMPAIGN</div>' +
				'<div class="spiderman-game-world-tabs" data-grid="worlds"></div>' +
				'<div class="spiderman-game-world-title"></div>' +
				'<div class="spiderman-game-level-grid" data-grid="1"></div>' +
				'<p class="spiderman-game-panel-text spiderman-game-campaign-note"></p>' +
				'<div class="spiderman-game-menu-list spiderman-game-toggle-row">' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="reset-progress">RESET PROGRESS</div>' +
					'<div class="spiderman-game-menu-button" data-action="back">BACK</div>' +
				'</div>' +
			'</div>' +

			'<div class="spiderman-game-panel is-wide spiderman-game-controls-panel" style="display:none">' +
				'<div class="spiderman-game-panel-title is-blue">CONTROLS</div>' +
				controlsTable +
				'<p class="spiderman-game-panel-text spiderman-game-controls-note">Every web shot uses web fluid: pick up canisters to refill.</p>' +
				'<div class="spiderman-game-menu-list">' +
					'<div class="spiderman-game-menu-button" data-action="back">BACK</div>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

	// ---- pause menu ----
	this.pauseMenu = create(
		'<div class="spiderman-game-overlay spiderman-game-overlay-dim spiderman-game-pause-menu">' +
			'<div class="spiderman-game-panel">' +
				'<div class="spiderman-game-panel-title">PAUSED</div>' +
				'<div class="spiderman-game-score-line"><span class="spiderman-game-stage-label"></span>SCORE: <span class="spiderman-game-score">0</span></div>' +
				'<div class="spiderman-game-menu-list">' +
					'<div class="spiderman-game-menu-button" data-action="resume">RESUME</div>' +
					'<div class="spiderman-game-menu-button spiderman-game-retry-button" data-action="retry">RETRY RUN</div>' +
					'<div class="spiderman-game-menu-button is-secondary spiderman-game-campaign-only" data-action="level-select">LEVEL SELECT</div>' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="main-menu">MAIN MENU</div>' +
					'<div class="spiderman-game-toggle-row">' +
						'<div class="spiderman-game-menu-button is-secondary" data-action="toggle-sound">SOUND: ON</div>' +
						'<div class="spiderman-game-menu-button is-secondary" data-action="toggle-music">MUSIC: ON</div>' +
						'<div class="spiderman-game-menu-button is-secondary" data-action="toggle-fullscreen">FULLSCREEN</div>' +
					'</div>' +
				'</div>' +
				'<div class="spiderman-game-menu-hint">ESC TO RESUME</div>' +
			'</div>' +
		'</div>'
	);

	// ---- game over menu ----
	this.gameoverMenu = create(
		'<div class="spiderman-game-overlay spiderman-game-overlay-dim spiderman-game-gameover-menu">' +
			'<div class="spiderman-game-panel">' +
				'<div class="spiderman-game-panel-title">GAME OVER</div>' +
				'<div class="spiderman-game-stage-line spiderman-game-campaign-only"></div>' +
				'<p class="spiderman-game-panel-text spiderman-game-gameover-reason"></p>' +
				'<div class="spiderman-game-score-line">FINAL SCORE: <span class="spiderman-game-score">0</span></div>' +
				'<table class="spiderman-game-results">' +
					'<tr class="spiderman-game-endless-only"><td>DISTANCE</td><td class="spiderman-game-result-distance">0 M</td><td class="spiderman-game-result-distance-points">0</td></tr>' +
					'<tr><td>COINS</td><td class="spiderman-game-result-coins">0</td><td class="spiderman-game-result-coin-points">0</td></tr>' +
					'<tr><td>ENEMIES</td><td class="spiderman-game-result-enemies">0</td><td class="spiderman-game-result-enemy-points">0</td></tr>' +
				'</table>' +
				'<div class="spiderman-game-new-best">NEW BEST RUN!</div>' +
				'<div class="spiderman-game-best-line spiderman-game-endless-only">BEST: <span class="spiderman-game-best">0</span></div>' +
				'<div class="spiderman-game-menu-list">' +
					'<div class="spiderman-game-menu-button spiderman-game-checkpoint-button" data-action="retry-checkpoint">RETRY FROM CHECKPOINT</div>' +
					'<div class="spiderman-game-menu-button spiderman-game-retry-button" data-action="retry">RETRY</div>' +
					'<div class="spiderman-game-menu-button is-secondary spiderman-game-campaign-only" data-action="level-select">LEVEL SELECT</div>' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="main-menu">MAIN MENU</div>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

	// ---- stage clear (campaign) ----
	this.completeMenu = create(
		'<div class="spiderman-game-overlay spiderman-game-overlay-dim spiderman-game-complete-menu">' +
			'<div class="spiderman-game-panel">' +
				'<div class="spiderman-game-panel-title is-gold">STAGE CLEAR!</div>' +
				'<div class="spiderman-game-stage-line"></div>' +
				'<div class="spiderman-game-score-line">SCORE: <span class="spiderman-game-score">0</span></div>' +
				'<div class="spiderman-game-complete-stats">' +
					'<span>TIME <strong class="spiderman-game-result-time">0:00</strong></span>' +
					'<span>COINS <strong class="spiderman-game-result-coins">0</strong></span>' +
					'<span>ENEMIES <strong class="spiderman-game-result-enemies">0</strong></span>' +
					'<span class="spiderman-game-rescue-stat" style="display:none">RESCUED <strong class="spiderman-game-result-rescued">0</strong></span>' +
				'</div>' +
				'<div class="spiderman-game-new-best">NEW STAGE BEST!</div>' +
				'<div class="spiderman-game-unlock-line"></div>' +
				'<div class="spiderman-game-menu-list">' +
					'<div class="spiderman-game-menu-button spiderman-game-next-button" data-action="next-level">NEXT STAGE</div>' +
					'<div class="spiderman-game-menu-button" data-action="retry">REPLAY STAGE</div>' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="level-select">LEVEL SELECT</div>' +
					'<div class="spiderman-game-menu-button is-secondary" data-action="main-menu">MAIN MENU</div>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

	this.mainMenuHome = this.mainMenu.querySelector(".spiderman-game-main-menu-home");
	this.themePanel = this.mainMenu.querySelector(".spiderman-game-theme-panel");
	this.campaignPanel = this.mainMenu.querySelector(".spiderman-game-campaign-panel");
	this.controlsPanel = this.mainMenu.querySelector(".spiderman-game-controls-panel");
	this.levelGrid = this.campaignPanel.querySelector(".spiderman-game-level-grid");
	this.worldTabs = this.campaignPanel.querySelector(".spiderman-game-world-tabs");

	this.buildLevelGrid();
	this.syncFullscreenButtons();   // hidden right away where the browser has no full screen (iPhone Safari)

	// one click handler for every menu button
	var buttons = this.wrapper.querySelectorAll(".spiderman-game-menu-button");
	for (var i = 0; i < buttons.length; i++) this.wireMenuButton(buttons[i]);
}

SpidermanGame.prototype.wireMenuButton = function(button) {
	var self = this;
	if (button.getAttribute("data-wired")) return;
	button.setAttribute("data-wired", "1");

	button.addEventListener("click", function(e) {
		e.preventDefault();
		self.unlockAudio();
		if (this.classList.contains("is-locked")) {
			self.sfx.play("DENY");
		} else {
			self.sfx.play("MENU_SELECT");
		}
		self.handleMenuAction(this.getAttribute("data-action"), this);
	});
	// moving the mouse over a button moves the keyboard selection too
	button.addEventListener("mousemove", function() {
		if (!this.classList.contains("is-selected")) self.selectMenuButton(this);
	});
}

// the world tabs (only with more than one world) and one tile per stage of the world shown in the level
// select (campaignWorldIndex); the state of every tile is refreshed by syncLevelGrid()
SpidermanGame.prototype.buildLevelGrid = function() {
	var worlds = this.getCampaignWorlds();
	if (this.campaignWorldIndex >= worlds.length) this.campaignWorldIndex = 0;
	var world = this.getCampaignWorld();
	var html = "";
	var t;

	var tabsHtml = "";
	if (worlds.length > 1) {
		for (var w = 0; w < worlds.length; w++) {
			tabsHtml += '<div class="spiderman-game-menu-button is-secondary spiderman-game-world-tab" data-action="world" data-world="' + w + '">WORLD ' + worlds[w].id + '</div>';
		}
	}
	this.worldTabs.innerHTML = tabsHtml;
	this.worldTabs.style.display = tabsHtml ? "" : "none";
	var tabs = this.worldTabs.querySelectorAll(".spiderman-game-menu-button");
	for (t = 0; t < tabs.length; t++) this.wireMenuButton(tabs[t]);

	if (world) {
		this.campaignPanel.querySelector(".spiderman-game-world-title").innerHTML = world.name + (world.subtitle ? '<span>' + world.subtitle + '</span>' : "");
		for (var i = 0; i < world.levels.length; i++) {
			var level = world.levels[i];
			html +=
				'<div class="spiderman-game-menu-button spiderman-game-level-tile' + (level.boss ? " is-boss" : "") + '" data-action="level" data-level="' + level.id + '">' +
					'<span class="spiderman-game-level-number">' + (level.label || level.id) + '</span>' +
					'<span class="spiderman-game-level-name">' + level.name + '</span>' +
					'<span class="spiderman-game-level-status"></span>' +
				'</div>';
		}
	} else {
		this.campaignPanel.querySelector(".spiderman-game-world-title").innerHTML = "NO WORLDS LOADED";
	}

	this.levelGrid.innerHTML = html;
	var tiles = this.levelGrid.querySelectorAll(".spiderman-game-menu-button");
	for (t = 0; t < tiles.length; t++) this.wireMenuButton(tiles[t]);
}

// locked / playable / cleared state of every tile and world tab, the progress badge and the note text
SpidermanGame.prototype.syncLevelGrid = function(note) {
	var worldIndex = this.campaignWorldIndex || 0;
	var world = this.getCampaignWorld();
	var tiles = this.levelGrid.querySelectorAll(".spiderman-game-level-tile");
	var cleared = 0;
	var i;

	for (i = 0; i < tiles.length; i++) {
		var tile = tiles[i];
		var id = tile.getAttribute("data-level");
		var level = this.getCampaignLevel(id);
		var unlocked = this.isLevelUnlocked(id);
		var completed = this.isLevelCompleted(id);
		var status = tile.querySelector(".spiderman-game-level-status");

		if (completed) cleared++;
		tile.classList[unlocked ? "remove" : "add"]("is-locked");
		tile.classList[completed ? "add" : "remove"]("is-cleared");
		tile.classList[unlocked && !completed ? "add" : "remove"]("is-next");

		if (!unlocked) {
			status.innerHTML = "LOCKED";
		} else if (completed) {
			var best = this.getLevelProgress(id);
			status.innerHTML = "CLEARED" + (best && best.bestScore ? " - " + best.bestScore : "");
		} else if (level && !level.design) {
			status.innerHTML = "SOON";
		} else {
			// "DEV" = only open because of dev mode
			status.innerHTML = this.isLevelUnlocked(id, true) ? "PLAY" : "DEV";
		}
	}

	// world tabs: current one highlighted, locked / cleared worlds marked
	var tabs = this.worldTabs.querySelectorAll(".spiderman-game-world-tab");
	for (i = 0; i < tabs.length; i++) {
		var index = parseInt(tabs[i].getAttribute("data-world"), 10);
		tabs[i].classList[index === worldIndex ? "add" : "remove"]("is-current");
		tabs[i].classList[this.isWorldUnlocked(index) ? "remove" : "add"]("is-world-locked");
		tabs[i].classList[this.isWorldCleared(index) ? "add" : "remove"]("is-world-cleared");
	}

	// main menu badge: cleared stages of the whole campaign
	var all = this.getAllCampaignLevels();
	var clearedAll = 0;
	for (i = 0; i < all.length; i++) if (this.isLevelCompleted(all[i].id)) clearedAll++;
	var badge = this.mainMenu.querySelector(".spiderman-game-campaign-badge");
	if (badge) badge.innerHTML = clearedAll + "/" + all.length;

	var total = world ? world.levels.length : 0;
	var noteElement = this.campaignPanel.querySelector(".spiderman-game-campaign-note");
	if (note === undefined) {
		var nextWorld = this.getCampaignWorlds()[worldIndex + 1];
		var previousWorld = this.getCampaignWorlds()[worldIndex - 1];
		if (!world) note = "Load campaign-levels.js to add worlds.";
		else if (this.devMode) note = "DEV MODE: every stage is open for testing (progress still saves normally).";
		else if (!this.isWorldUnlocked(worldIndex)) note = "Defeat the World " + (previousWorld ? previousWorld.id : "?") + " boss to unlock World " + world.id + ".";
		else if (cleared >= total && nextWorld) note = "World " + world.id + " cleared! " + nextWorld.name + " is open.";
		else if (cleared >= total) note = "World " + world.id + " cleared! More worlds are on the way.";
		else note = "Clear a stage to unlock the next one. Progress is saved.";
	}
	noteElement.innerHTML = note;
	this.resetConfirm = false;
}

// shows another world in the level select (tab clicked / chosen with the keyboard); keeps the tab selected
SpidermanGame.prototype.selectCampaignWorld = function(index) {
	var worlds = this.getCampaignWorlds();
	if (index < 0 || index >= worlds.length) return;
	this.campaignWorldIndex = index;
	this.buildLevelGrid();
	this.syncLevelGrid();
	if (this.openPanel === this.campaignPanel) {
		var buttons = this.campaignPanel.querySelectorAll(".spiderman-game-menu-button");
		var tabIndex = 0;
		for (var i = 0; i < buttons.length; i++) {
			if (buttons[i].getAttribute("data-world") === String(index)) { tabIndex = i; break; }
		}
		this.setActiveMenu(this.campaignPanel, tabIndex);
	}
}

SpidermanGame.prototype.handleMenuAction = function(action, button) {
	switch (action) {
		case "endless":
			// pick the scenery first, the run starts from the theme panel
			this.showMainMenuPanel(this.themePanel);
			this.syncThemeButtons();
			break;
		case "theme":
			this.setTheme(button.getAttribute("data-theme"));
			this.startEndlessRun();
			break;
		case "campaign":
			this.showMainMenuPanel(this.campaignPanel);
			break;
		case "level":
			this.selectCampaignLevel(button.getAttribute("data-level"));
			break;
		case "world":
			this.selectCampaignWorld(parseInt(button.getAttribute("data-world"), 10));
			break;
		case "level-select":
			this.showMainMenu();
			this.showMainMenuPanel(this.campaignPanel);
			break;
		case "next-level":
			var next = this.level ? this.getNextCampaignLevel(this.level.id) : null;
			if (next && next.design) this.startCampaignLevel(next.id);
			break;
		case "reset-progress":
			if (!this.resetConfirm) {
				this.resetConfirm = true;
				this.campaignPanel.querySelector(".spiderman-game-campaign-note").innerHTML = "Erase all campaign progress? Press RESET PROGRESS again to confirm.";
			} else {
				this.resetCampaignProgress();
				// back to the first world (every later world is locked again)
				this.campaignWorldIndex = 0;
				this.buildLevelGrid();
				var firstLevel = this.getAllCampaignLevels()[0];
				this.syncLevelGrid("Progress erased. Only stage " + (firstLevel ? firstLevel.id : "1-1") + " is open again.");
				this.setActiveMenu(this.campaignPanel, this.campaignPanel.querySelectorAll(".spiderman-game-world-tab").length);
			}
			break;
		case "controls":
			this.showMainMenuPanel(this.controlsPanel);
			break;
		case "back":
			this.showMainMenuPanel(null);
			break;
		case "resume":
			this.unpause();
			break;
		case "retry":
			this.restart();
			break;
		case "retry-checkpoint":
			if (this.isCampaign() && this.level && this.levelCheckpoint) this.startCampaignLevel(this.level.id, this.levelCheckpoint);
			else this.restart();
			break;
		case "main-menu":
			this.showMainMenu();
			break;
		case "toggle-sound":
			this.setSoundEffects(!this.soundEffects);
			break;
		case "toggle-music":
			if (this.muted) this.unmute(); else this.mute();
			break;
		case "toggle-dev":
			this.setDevMode(!this.devMode);
			break;
		case "toggle-fullscreen":
			this.toggleFullscreen();
			break;
	}
}

// sets which list of buttons the keyboard currently controls
SpidermanGame.prototype.setActiveMenu = function(container, selectedIndex) {
	var buttons = [];
	if (container) {
		var all = container.querySelectorAll(".spiderman-game-menu-button");
		for (var i = 0; i < all.length; i++) buttons.push(all[i]);
	}

	this.activeMenu = {
		container: container,
		buttons: buttons,
		index: 0,
	};

	this.selectMenuIndex(selectedIndex || 0);
}

SpidermanGame.prototype.selectMenuIndex = function(index) {
	var menu = this.activeMenu;
	if (!menu || !menu.buttons.length) return;

	index = (index + menu.buttons.length) % menu.buttons.length;
	menu.index = index;

	for (var i = 0; i < menu.buttons.length; i++) {
		if (i === index) {
			menu.buttons[i].classList.add("is-selected");
		} else {
			menu.buttons[i].classList.remove("is-selected");
		}
	}
}

SpidermanGame.prototype.selectMenuButton = function(button) {
	var menu = this.activeMenu;
	if (!menu) return;
	var index = menu.buttons.indexOf(button);
	if (index > -1) this.selectMenuIndex(index);
}

// returns true when the key was handled by the menu
SpidermanGame.prototype.handleMenuKey = function(keyCode) {
	var menu = this.activeMenu;
	if (!menu || !menu.buttons.length) return false;

	if (keyCode == KEY.ARROW_UP || keyCode == KEY.W) {
		this.selectMenuIndex(menu.index - 1);
		this.sfx.play("MENU_MOVE");
		return true;
	}
	if (keyCode == KEY.ARROW_DOWN || keyCode == KEY.S) {
		this.selectMenuIndex(menu.index + 1);
		this.sfx.play("MENU_MOVE");
		return true;
	}
	if (keyCode == KEY.ENTER || keyCode == KEY.SPACEBAR) {
		var button = menu.buttons[menu.index];
		this.sfx.play(button.classList.contains("is-locked") ? "DENY" : "MENU_SELECT");
		this.handleMenuAction(button.getAttribute("data-action"), button);
		return true;
	}
	if (keyCode == KEY.ARROW_LEFT || keyCode == KEY.ARROW_RIGHT || keyCode == KEY.A || keyCode == KEY.D) {
		// left / right walk through the level tiles (they sit in a row); elsewhere they're only swallowed
		// so the page never scrolls
		var current = menu.buttons[menu.index];
		if (current && current.parentNode && current.parentNode.getAttribute("data-grid")) {
			this.selectMenuIndex(menu.index + (keyCode == KEY.ARROW_LEFT || keyCode == KEY.A ? -1 : 1));
			this.sfx.play("MENU_MOVE");
		}
		return true;
	}

	return false;
}

SpidermanGame.prototype.handleEscape = function() {
	if (this.state === STATE.PLAYING) {
		this.pause();
	} else if (this.state === STATE.PAUSED) {
		this.unpause();
	} else if (this.state === STATE.MENU && this.openPanel) {
		this.showMainMenuPanel(null);
	}
}

SpidermanGame.prototype.hideOverlays = function() {
	this.mainMenu.classList.remove("is-visible");
	this.pauseMenu.classList.remove("is-visible");
	this.gameoverMenu.classList.remove("is-visible");
	this.completeMenu.classList.remove("is-visible");
	this.setActiveMenu(null);
	this.syncTouchControls();
}

// shows / hides the ".spiderman-game-campaign-only" and ".spiderman-game-endless-only" parts of an overlay
SpidermanGame.prototype.syncModeElements = function(overlay) {
	var campaign = this.isCampaign();
	var campaignOnly = overlay.querySelectorAll(".spiderman-game-campaign-only");
	var endlessOnly = overlay.querySelectorAll(".spiderman-game-endless-only");
	var i;
	for (i = 0; i < campaignOnly.length; i++) campaignOnly[i].style.display = campaign ? "" : "none";
	for (i = 0; i < endlessOnly.length; i++) endlessOnly[i].style.display = campaign ? "none" : "";

	var retry = overlay.querySelector(".spiderman-game-retry-button");
	if (retry) retry.innerHTML = campaign ? "RESTART STAGE" : (overlay === this.pauseMenu ? "RETRY RUN" : "RETRY");

	// "retry from checkpoint" only when a checkpoint of this stage was reached
	var checkpointButton = overlay.querySelector(".spiderman-game-checkpoint-button");
	if (checkpointButton) {
		var hasCheckpoint = campaign && this.level && this.levelCheckpoint && this.levelCheckpoint.levelId === this.level.id;
		checkpointButton.style.display = hasCheckpoint ? "" : "none";
		if (retry) retry.classList[hasCheckpoint ? "add" : "remove"]("is-secondary");
	}

	var stageLine = overlay.querySelector(".spiderman-game-stage-line");
	if (stageLine && this.level) stageLine.innerHTML = "STAGE " + this.level.id + " - " + this.level.name;
}

SpidermanGame.prototype.showMainMenu = function() {
	this.state = STATE.MENU;
	this.paused = false;
	this.gameIsOver = false;
	this.spiderman.releaseAllKeys();
	if (this.backdrop && this.backdrop.theme !== this.themeName) this.backdrop = new Backdrop(this, this.themeName);

	this.hideOverlays();
	this.mainMenu.querySelector(".spiderman-game-best-score-value").innerHTML = this.bestScore;
	this.syncLevelGrid(); // campaign progress badge
	this.mainMenu.classList.add("is-visible");
	this.showMainMenuPanel(null);
	this.syncMusicHint();
	this.syncTouchControls();

	this.renderMenuScene();
}

// panel: null for the home list, or one of the sub panels (campaign / controls)
SpidermanGame.prototype.showMainMenuPanel = function(panel) {
	this.openPanel = panel || null;

	this.mainMenuHome.style.display = panel ? "none" : "block";
	this.themePanel.style.display = panel === this.themePanel ? "block" : "none";
	this.campaignPanel.style.display = panel === this.campaignPanel ? "block" : "none";
	this.controlsPanel.style.display = panel === this.controlsPanel ? "block" : "none";
	this.controlsPanel.classList[this.touchMode ? "add" : "remove"]("is-touch");

	// in the theme panel the currently selected theme is pre-selected
	var selected = 0;
	if (panel === this.themePanel) selected = Math.max(0, THEME_ORDER.indexOf(this.themeName));
	if (panel === this.campaignPanel) {
		// opens on the world of the stage just played (or the latest unlocked world) with the next stage to
		// play pre-selected. The world tabs come first in the button list, so tile i is button tabs + i
		this.campaignWorldIndex = this.getDefaultCampaignWorldIndex();
		this.buildLevelGrid();
		this.syncLevelGrid();
		var tabCount = this.campaignPanel.querySelectorAll(".spiderman-game-world-tab").length;
		selected = tabCount;
		var world = this.getCampaignWorld();
		if (world) {
			for (var i = 0; i < world.levels.length; i++) {
				var id = world.levels[i].id;
				if (this.isLevelUnlocked(id) && !this.isLevelCompleted(id)) { selected = tabCount + i; break; }
				if (this.isLevelUnlocked(id)) selected = tabCount + i;
			}
		}
	}
	this.setActiveMenu(panel || this.mainMenuHome, selected);
}

SpidermanGame.prototype.showPauseMenu = function() {
	this.syncModeElements(this.pauseMenu);
	this.pauseMenu.querySelector(".spiderman-game-score").innerHTML = this.score;
	this.pauseMenu.querySelector(".spiderman-game-stage-label").innerHTML = this.isCampaign() && this.level ? "STAGE " + this.level.id + " - " : "";
	this.pauseMenu.classList.add("is-visible");
	this.setActiveMenu(this.pauseMenu, 0);
}

// campaign: stage cleared screen. Saves the progress (stage completed, best score / time) and unlocks the next stage
SpidermanGame.prototype.showCompleteMenu = function() {
	var menu = this.completeMenu;
	var level = this.level;
	var time = this.levelFrames / 60;
	var previous = this.getLevelProgress(level.id);
	var isNewBest = !previous || !previous.completed || this.score > (previous.bestScore || 0);

	var nextBefore = this.getNextCampaignLevel(level.id);
	// the real unlock state (also in dev mode, where every stage is open anyway)
	var wasNextUnlocked = nextBefore ? this.isLevelUnlocked(nextBefore.id, true) : false;

	this.saveLevelProgress(level.id, { completed: true, score: this.score, time: time });

	this.lastUnlockedId = nextBefore && !wasNextUnlocked ? nextBefore.id : null;

	var worldIndex = this.getWorldIndexOfLevel(level.id);
	var world = this.getCampaignWorld(worldIndex);
	var worldId = world ? world.id : 1;
	// after a world's last stage the next stage is the first stage of the next world
	var nextWorld = nextBefore ? this.getWorldOfLevel(nextBefore.id) : null;
	var opensNextWorld = !!(nextWorld && nextWorld !== world);

	this.syncModeElements(menu);
	var isBossStage = !!(level.definition && level.definition.boss);
	var title = menu.querySelector(".spiderman-game-panel-title");
	title.innerHTML = isBossStage ? "WORLD " + worldId + " CLEARED!" : "STAGE CLEAR!";
	title.classList[isBossStage ? "add" : "remove"]("is-world-clear");
	if (isBossStage) menu.querySelector(".spiderman-game-stage-line").innerHTML = "BOSS DEFEATED - " + level.name;
	menu.querySelector(".spiderman-game-score").innerHTML = this.score;
	menu.querySelector(".spiderman-game-result-time").innerHTML = this.formatTime(time);
	menu.querySelector(".spiderman-game-result-coins").innerHTML = this.coins + "/" + level.totalCoins;
	menu.querySelector(".spiderman-game-result-enemies").innerHTML = this.kills + "/" + level.totalEnemies;
	// stages with trapped workers: how many were saved (always all of them, the exit needs it)
	var rescueStat = menu.querySelector(".spiderman-game-rescue-stat");
	rescueStat.style.display = level.rescues.length ? "" : "none";
	menu.querySelector(".spiderman-game-result-rescued").innerHTML = level.rescuedCount() + "/" + level.rescues.length;
	menu.querySelector(".spiderman-game-new-best").classList[isNewBest && this.score > 0 ? "add" : "remove"]("is-visible");

	var unlockLine = menu.querySelector(".spiderman-game-unlock-line");
	var nextButton = menu.querySelector(".spiderman-game-next-button");
	var clearedText = (world && world.clearedText) || "EVERY STAGE OF WORLD " + worldId + " IS YOURS";
	nextButton.innerHTML = opensNextWorld ? "NEXT WORLD" : "NEXT STAGE";
	if (!nextBefore) {
		unlockLine.innerHTML = isBossStage ? clearedText : "WORLD " + worldId + " COMPLETE!";
		nextButton.style.display = "none";
	} else if (opensNextWorld) {
		if (this.lastUnlockedId) unlockLine.innerHTML = nextWorld.name + " UNLOCKED!" + (nextBefore.design ? "" : " - COMING IN THE NEXT UPDATE");
		else unlockLine.innerHTML = isBossStage ? clearedText : "";
		nextButton.style.display = nextBefore.design ? "" : "none";
	} else if (nextBefore.design) {
		unlockLine.innerHTML = this.lastUnlockedId ? "STAGE " + nextBefore.id + " UNLOCKED!" : "";
		nextButton.style.display = "";
	} else {
		unlockLine.innerHTML = "STAGE " + nextBefore.id + " UNLOCKED - COMING IN THE NEXT UPDATE";
		nextButton.style.display = "none";
	}
	unlockLine.style.display = unlockLine.innerHTML ? "" : "none";

	menu.classList.add("is-visible");
	this.setActiveMenu(menu, 0);
}

SpidermanGame.prototype.formatTime = function(seconds) {
	seconds = Math.max(0, Math.floor(seconds));
	var minutes = Math.floor(seconds / 60);
	var rest = seconds % 60;
	return minutes + ":" + (rest < 10 ? "0" : "") + rest;
}

SpidermanGame.prototype.showGameoverMenu = function() {
	var menu = this.gameoverMenu;
	// the best run only counts for the endless run
	var isNewBest = !this.isCampaign() && this.score > this.bestScore;

	if (isNewBest) {
		this.bestScore = this.score;
		writeStorage(STORAGE_KEYS.BEST_SCORE, String(this.bestScore));
	}

	this.syncModeElements(menu);
	menu.querySelector(".spiderman-game-score").innerHTML = this.score;
	menu.querySelector(".spiderman-game-best").innerHTML = this.bestScore;
	menu.querySelector(".spiderman-game-result-distance").innerHTML = this.distanceInMeters() + " M";
	menu.querySelector(".spiderman-game-result-distance-points").innerHTML = "+" + this.scoreBreakdown.distance;
	menu.querySelector(".spiderman-game-result-coins").innerHTML = this.coins;
	menu.querySelector(".spiderman-game-result-coin-points").innerHTML = "+" + this.scoreBreakdown.coins;
	menu.querySelector(".spiderman-game-result-enemies").innerHTML = this.kills;
	menu.querySelector(".spiderman-game-result-enemy-points").innerHTML = "+" + this.scoreBreakdown.enemies;
	if (isNewBest && this.score > 0) this.sfx.play("NEW_BEST");
	menu.querySelector(".spiderman-game-gameover-reason").innerHTML = (this.isCampaign() ? CAMPAIGN_GAMEOVER_MESSAGES : GAMEOVER_MESSAGES)[this.gameoverReason] || "";
	menu.querySelector(".spiderman-game-new-best").classList[isNewBest && this.score > 0 ? "add" : "remove"]("is-visible");

	menu.classList.add("is-visible");
	this.setActiveMenu(menu, 0);
}

// draws a calm animated rooftop scene behind the main menu
SpidermanGame.prototype.renderMenuScene = function() {
	if (this.state !== STATE.MENU) return;

	var ctx = this.ctx;
	var canvas = this.canvas;
	var building = this.resources.BUILDING;
	var spiderman = this.resources.STANDING;

	this.menuCameraX += 1.5;
	this.frame++;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	this.drawBackground(this.menuCameraX);

	// a building on the right side, Spider-Man keeps watch from its roof
	var roofWidth = 300;
	var roofHeight = 130;
	var roofX = canvas.width - roofWidth - 10;
	var roofY = canvas.height - roofHeight;
	ctx.drawImage(building, 0, 0, roofWidth, roofHeight, roofX, roofY, roofWidth, roofHeight);
	ctx.drawImage(building, roofWidth, 0, 15, 26, roofX + roofWidth, roofY, 15, 26);

	// gentle idle "breathing" bob
	var bob = Math.round(Math.sin(this.menuCameraX / 25) * 2);
	var scale = 1;
	ctx.drawImage(spiderman, roofX + roofWidth / 2 - spiderman.width * scale / 2, roofY - spiderman.height * scale + bob, spiderman.width * scale, spiderman.height * scale);

	requestAnimFrame(this.renderMenuScene.bind(this));
}

/* ------------------------------------------------------------------
 * Game flow
 * ------------------------------------------------------------------ */

// per run counters that make up the score
SpidermanGame.prototype.resetRunStats = function() {
	this.score = 0;
	this.coins = 0;
	this.kills = 0;
	this.distance = 0;          // farthest world x spiderman reached
	this.distanceScored = 0;    // distance already converted into points
	this.scoreBreakdown = { distance: 0, coins: 0, enemies: 0 };
	this.lastHealthPickupX = -Infinity;
	this.lastWebPickupX = -Infinity;
}

// category: "distance", "coins" or "enemies" (for the game over breakdown)
SpidermanGame.prototype.addScore = function(points, category) {
	points = Math.round(points) || 0;
	this.score += points;
	if (category && this.scoreBreakdown.hasOwnProperty(category)) {
		this.scoreBreakdown[category] += points;
	}
	// distance ticks every 50px, so only "real" events make the score pop
	if (category !== "distance") this.scorePulse = 12;
	return this.score;
}

// called every frame: turns new distance into points (endless run only; a stage is scored by coins and enemies)
SpidermanGame.prototype.updateDistanceScore = function() {
	var spiderman = this.spiderman;
	if (spiderman.x > this.distance) this.distance = spiderman.x;
	if (this.isCampaign()) return;

	var earned = Math.floor(this.distance / SCORING.DISTANCE_STEP);
	if (earned > this.distanceScored) {
		this.addScore(earned - this.distanceScored, "distance");
		this.distanceScored = earned;
	}
}

SpidermanGame.prototype.addFloatingText = function(text, x, y, color, small) {
	this.scene.effects.push(new FloatingText(this, text, x, y, color, small));
}

SpidermanGame.prototype.removeFloatingText = function(effect) {
	var effects = this.scene.effects;
	if (effects.indexOf(effect) > -1) effects.splice(effects.indexOf(effect), 1);
}

SpidermanGame.prototype.addPickup = function(pickup) {
	if (pickup instanceof Pickup) this.scene.pickups.push(pickup);
}

SpidermanGame.prototype.removePickup = function(pickup) {
	var pickups = this.scene.pickups;
	if (pickups.indexOf(pickup) > -1) pickups.splice(pickups.indexOf(pickup), 1);
}

// pickups that were left behind are dropped once they're well out of view (endless run: the world is recycled;
// a campaign stage keeps everything, the player can always walk back)
SpidermanGame.prototype.cleanupPickups = function() {
	if (this.isCampaign()) return;
	var pickups = this.scene.pickups;
	var left = this.cameraX - CAMERA.BACKSCROLL - 50;
	for (var i = pickups.length - 1; i >= 0; i--) {
		if (pickups[i].x + pickups[i].radius < left) pickups[i].remove();
	}
}

SpidermanGame.prototype.drawPickups = function() {
	var pickups = this.scene.pickups.slice();
	for (var i = 0; i < pickups.length; i++) pickups[i].update();

	var effects = this.scene.effects.slice();
	for (var j = 0; j < effects.length; j++) effects[j].update();
}

// empties the scene and counters (shared by the endless run and the campaign)
SpidermanGame.prototype.resetScene = function() {
	this.hideOverlays();

	// reset the scene first: creating a Roof may spawn its thug into scene.enemies
	this.spiderman = new SpiderMan(this);
	this.scene.spiderman = this.spiderman;
	this.scene.projectiles = [];
	this.scene.roofs = [];
	this.scene.enemies = [];
	this.scene.pickups = [];
	this.scene.effects = [];
	this.cameraX = 0;
	this.cameraY = 0;
	this.farthestCameraX = 0;
	this.resetRunStats();
	this.gameoverReason = null;
	this.level = null;
	this.levelFrames = 0;
	this.introFrames = 0;
	this.hitFlash = 0;
	this.shake = 0;
	this.keyPulse = 0;
	this.rescuePulse = 0;
	this.transition = null;
}

// resets everything and starts a fresh run on the rooftops
SpidermanGame.prototype.startEndlessRun = function() {
	this.mode = MODE.ENDLESS;
	this.setZoom(1);
	this.resetScene();

	this.scene.roofs = [new Roof(this, 0)];

	this.paused = false;
	this.gameIsOver = false;
	this.state = STATE.PLAYING;

	this.startLoop();
}

// "retry" from the pause and game over menus: replays the current stage or starts a new run
SpidermanGame.prototype.restart = function() {
	if (this.isCampaign() && this.level) {
		this.startCampaignLevel(this.level.id, null);
	} else {
		this.startEndlessRun();
	}
}

/* ------------------------------------------------------------------
 * Campaign
 *
 * Worlds and their stages are registered with SpidermanGame.campaign.addWorld()
 * (see campaign-levels.js). A stage is unlocked when the stage before it in the
 * whole chain (across worlds) was cleared; the progress lives in localStorage.
 * ------------------------------------------------------------------ */

// Worlds are played in the order they are added. All stages of all worlds form one unlock chain: the stage
// before the first stage of a world is the last stage (the boss) of the previous world, so beating a world's
// boss opens the next world. Stage ids ("1-1", "2-1", ...) must be unique across worlds (progress is keyed by id)
SpidermanGame.campaign = {
	worlds: [],
	addWorld: function(world) {
		if (!world || !world.levels) return;
		for (var i = 0; i < world.levels.length; i++) {
			if (!world.levels[i].design) world.levels[i].design = null;
		}
		SpidermanGame.campaign.worlds.push(world);
	},
};

SpidermanGame.prototype.getCampaignWorlds = function() {
	return SpidermanGame.campaign.worlds;
}

// index: a world index; without it, the world currently shown in the level select
SpidermanGame.prototype.getCampaignWorld = function(index) {
	var worlds = SpidermanGame.campaign.worlds;
	if (index === undefined || index === null) index = this.campaignWorldIndex || 0;
	return worlds[index] || worlds[0] || null;
}

// index of the world that holds the given stage id (-1 when unknown)
SpidermanGame.prototype.getWorldIndexOfLevel = function(id) {
	var worlds = SpidermanGame.campaign.worlds;
	for (var w = 0; w < worlds.length; w++) {
		for (var i = 0; i < worlds[w].levels.length; i++) {
			if (worlds[w].levels[i].id === id) return w;
		}
	}
	return -1;
}

SpidermanGame.prototype.getWorldOfLevel = function(id) {
	var index = this.getWorldIndexOfLevel(id);
	return index > -1 ? SpidermanGame.campaign.worlds[index] : null;
}

// every stage of every world, in play order
SpidermanGame.prototype.getAllCampaignLevels = function() {
	var all = [];
	var worlds = SpidermanGame.campaign.worlds;
	for (var w = 0; w < worlds.length; w++) all = all.concat(worlds[w].levels);
	return all;
}

SpidermanGame.prototype.getCampaignLevel = function(id) {
	var all = this.getAllCampaignLevels();
	for (var i = 0; i < all.length; i++) {
		if (all[i].id === id) return all[i];
	}
	return null;
}

// the stage that has to be cleared before this one (crosses into the previous world for a world's first stage)
SpidermanGame.prototype.getPreviousCampaignLevel = function(id) {
	var all = this.getAllCampaignLevels();
	for (var i = 1; i < all.length; i++) {
		if (all[i].id === id) return all[i - 1];
	}
	return null;
}

// the stage after this one (after a boss: the first stage of the next world)
SpidermanGame.prototype.getNextCampaignLevel = function(id) {
	var all = this.getAllCampaignLevels();
	for (var i = 0; i < all.length - 1; i++) {
		if (all[i].id === id) return all[i + 1];
	}
	return null;
}

// a world is cleared once its last stage (the boss) is cleared
SpidermanGame.prototype.isWorldCleared = function(index) {
	var world = SpidermanGame.campaign.worlds[index];
	if (!world || !world.levels.length) return false;
	return this.isLevelCompleted(world.levels[world.levels.length - 1].id);
}

// a world is open when its first stage is unlocked (ignoreDev: the "real" state, as without dev mode)
SpidermanGame.prototype.isWorldUnlocked = function(index, ignoreDev) {
	var world = SpidermanGame.campaign.worlds[index];
	if (!world || !world.levels.length) return false;
	return this.isLevelUnlocked(world.levels[0].id, ignoreDev);
}

// the world the level select opens on: the world of the stage just played (while it is open), otherwise
// the last world that is really unlocked (dev mode does not count, it would always jump to the last world)
SpidermanGame.prototype.getDefaultCampaignWorldIndex = function() {
	if (this.level) {
		var index = this.getWorldIndexOfLevel(this.level.id);
		if (index > -1 && this.isWorldUnlocked(index)) return index;
	}
	var worlds = SpidermanGame.campaign.worlds;
	for (var w = worlds.length - 1; w > 0; w--) {
		if (this.isWorldUnlocked(w, true)) return w;
	}
	return 0;
}

SpidermanGame.prototype.loadCampaignProgress = function() {
	var progress = null;
	try {
		progress = JSON.parse(readStorage(STORAGE_KEYS.CAMPAIGN) || "null");
	} catch (e) {}
	if (!progress || typeof progress !== "object" || !progress.levels) progress = { levels: {} };
	return progress;
}

SpidermanGame.prototype.saveCampaignProgress = function() {
	writeStorage(STORAGE_KEYS.CAMPAIGN, JSON.stringify(this.campaignProgress));
}

SpidermanGame.prototype.resetCampaignProgress = function() {
	this.campaignProgress = { levels: {} };
	this.saveCampaignProgress();
}

SpidermanGame.prototype.getLevelProgress = function(id) {
	return this.campaignProgress.levels[id] || null;
}

// result: { completed, score, time }
SpidermanGame.prototype.saveLevelProgress = function(id, result) {
	var entry = this.campaignProgress.levels[id] || { completed: false, bestScore: 0, bestTime: null };
	if (result.completed) {
		entry.completed = true;
		entry.bestScore = Math.max(entry.bestScore || 0, result.score || 0);
		if (entry.bestTime === null || entry.bestTime === undefined || result.time < entry.bestTime) entry.bestTime = Math.round(result.time * 10) / 10;
	}
	this.campaignProgress.levels[id] = entry;
	this.saveCampaignProgress();
	return entry;
}

SpidermanGame.prototype.isLevelCompleted = function(id) {
	var entry = this.getLevelProgress(id);
	return !!(entry && entry.completed);
}

// the very first stage (1-1) is always open, every other stage needs the previous one cleared - for the first
// stage of a world that is the boss of the previous world. Dev mode opens everything (ignoreDev: real state)
SpidermanGame.prototype.isLevelUnlocked = function(id, ignoreDev) {
	if (!this.getCampaignLevel(id)) return false;
	if (this.devMode && !ignoreDev) return true;
	var previous = this.getPreviousCampaignLevel(id);
	if (!previous) return true;
	return this.isLevelCompleted(previous.id);
}

// a tile in the level select was chosen
SpidermanGame.prototype.selectCampaignLevel = function(id) {
	var level = this.getCampaignLevel(id);
	if (!level) return false;

	if (!this.isLevelUnlocked(id)) {
		var previous = this.getPreviousCampaignLevel(id);
		var worldIndex = this.getWorldIndexOfLevel(id);
		var world = this.getCampaignWorld(worldIndex);
		if (previous && world && world.levels[0].id === id) {
			// first stage of a later world: the previous world's boss is in the way
			this.syncLevelGrid("World " + world.id + " is locked. Defeat the World " + this.getCampaignWorld(worldIndex - 1).id + " boss (stage " + previous.id + ") first.");
		} else {
			this.syncLevelGrid("Stage " + id + " is locked. Clear stage " + (previous ? previous.id : "?") + " first.");
		}
		return false;
	}
	if (!level.design) {
		this.syncLevelGrid("Stage " + id + " is unlocked but still being built. Check back after the next update!");
		this.sfx.play("DENY");
		return false;
	}

	this.startCampaignLevel(id);
	return true;
}

// builds the fixed level and starts playing it. checkpoint: a snapshot made by CampaignLevel.activateCheckpoint
// to continue from there instead of the start of the stage
SpidermanGame.prototype.startCampaignLevel = function(id, checkpoint) {
	var definition = this.getCampaignLevel(id);
	if (!definition || !definition.design) return false;

	this.mode = MODE.CAMPAIGN;
	this.setZoom(this.canvas.height / (definition.design.viewHeight || CAMPAIGN.VIEW_HEIGHT));
	this.resetScene();
	this.levelCheckpoint = checkpoint && checkpoint.levelId === id ? checkpoint : null;

	if (definition.design.theme && definition.design.theme !== this.themeName) {
		// the stage's own scenery (the player's endless theme choice is left untouched in storage)
		this.backdrop = new Backdrop(this, definition.design.theme);
	} else if (!this.backdrop || this.backdrop.theme !== this.themeName) {
		this.backdrop = new Backdrop(this, this.themeName);
	}

	this.level = new CampaignLevel(this, definition);
	this.level.build();
	if (this.levelCheckpoint) this.level.restore(this.levelCheckpoint);

	// spawn standing on the start platform (or the checkpoint), camera there
	var spiderman = this.spiderman;
	var standing = this.resources.STANDING;
	spiderman.x = this.level.spawn.x;
	spiderman.y = this.level.spawn.y - standing.height * spiderman.scale;
	spiderman.runningDirection = DIRECTION.RIGHT;
	this.cameraX = this.clampCameraX(spiderman.x - this.viewWidth * CAMPAIGN.CAMERA_ANCHOR);
	this.farthestCameraX = this.cameraX;
	this.cameraY = Math.max(this.level.cameraMinY, Math.min(this.level.cameraMaxY, spiderman.y + 30 - this.viewHeight * CAMPAIGN.CAMERA_BOTTOM));

	this.introFrames = this.levelCheckpoint ? 0 : CAMPAIGN.INTRO_FRAMES;
	// a moment of safety after continuing from a checkpoint (enemies may be close)
	if (this.levelCheckpoint) spiderman.invulnerableFrames = 90;
	this.paused = false;
	this.gameIsOver = false;
	this.state = STATE.PLAYING;

	this.startLoop();
	return true;
}

SpidermanGame.prototype.clampCameraX = function(x) {
	var max = this.level ? Math.max(0, this.level.width - this.viewWidth) : Infinity;
	return Math.max(0, Math.min(max, x));
}

// campaign: stepping through a door. Short fade to black, spiderman reappears at the door the entrance leads to
SpidermanGame.prototype.startDoorTransition = function(door) {
	if (!this.level || this.transition) return;
	var target = this.level.doorById(door.to);
	if (!target) return;
	this.transition = { frames: 36, total: 36, target: target, done: false };
	this.spiderman.releaseAllKeys();
	this.sfx.play("DOOR");
	if (door.fake) this.sfx.play("ILLUSION");
}

SpidermanGame.prototype.updateTransition = function() {
	var t = this.transition;
	if (!t) return;
	t.frames--;
	if (!t.done && t.frames <= t.total / 2) {
		// half way (screen black): move him and the camera
		t.done = true;
		var s = this.spiderman;
		s.x = t.target.x - s.bodyWidth() / 2;
		s.y = t.target.y - s.bodyHeight();
		s.velocityX = 0;
		s.velocityY = 0;
		s.momentumX = 0;
		s.invulnerableFrames = Math.max(s.invulnerableFrames, 30);
		this.cameraX = this.clampCameraX(s.x - this.viewWidth * CAMPAIGN.CAMERA_ANCHOR);
		this.cameraY = Math.max(this.level.cameraMinY, Math.min(this.level.cameraMaxY, s.y + 30 - this.viewHeight * CAMPAIGN.CAMERA_BOTTOM));
		this.farthestCameraX = Math.max(this.farthestCameraX, this.cameraX);
	}
	if (t.frames <= 0) this.transition = null;
}

SpidermanGame.prototype.drawTransition = function() {
	var t = this.transition;
	if (!t) return;
	var half = t.total / 2;
	var alpha = t.frames > half ? 1 - (t.frames - half) / half : t.frames / half;
	this.ctx.fillStyle = "rgba(0, 0, 0, " + Math.min(1, alpha) + ")";
	this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
}

// spiderman reached the goal of the current stage
SpidermanGame.prototype.completeLevel = function() {
	if (this.state !== STATE.PLAYING || !this.level) return;

	this.state = STATE.COMPLETE;
	this.spiderman.releaseAllKeys();
	this.sfx.play("LEVEL_CLEAR");
	this.showCompleteMenu();
	this.syncTouchControls();
}

SpidermanGame.prototype.startLoop = function() {
	this.syncTouchControls();
	if (this.loopScheduled) return;
	this.update();
}

SpidermanGame.prototype.setSlowmotion = function(slowmo) {
	if (slowmo) {
		this.slowmotion = true;

		window.requestAnimFrame = function(callback) {
			setTimeout(callback, 1000 / 10);
		}

		for (var audio in AUDIO_RESOURCES) {
			AUDIO_RESOURCES[audio].playbackRate = 0.5;
		}
	} else {
		this.slowmotion = false;

		window.requestAnimFrame = requestAnimationFrame;

		for (var audio in AUDIO_RESOURCES) {
			AUDIO_RESOURCES[audio].playbackRate = 1;
		}
	}
}

/* ------------------------------------------------------------------
 * Audio
 * ------------------------------------------------------------------ */

SpidermanGame.prototype.saveSettings = function() {
	writeStorage(STORAGE_KEYS.SETTINGS, JSON.stringify({
		music: !this.muted,
		sound: !!this.soundEffects,
		dev: !!this.devMode,
	}));
}

// keeps every "SOUND: ON" / "MUSIC: ON" button in sync with the real settings
SpidermanGame.prototype.syncAudioButtons = function() {
	if (!this.wrapper) return;
	this.syncMusicHint();

	var soundButtons = this.wrapper.querySelectorAll('[data-action="toggle-sound"]');
	var musicButtons = this.wrapper.querySelectorAll('[data-action="toggle-music"]');

	for (var i = 0; i < soundButtons.length; i++) {
		soundButtons[i].innerHTML = "SOUND: " + (this.soundEffects ? "ON" : "OFF");
	}
	for (var j = 0; j < musicButtons.length; j++) {
		musicButtons[j].innerHTML = "MUSIC: " + (this.muted ? "OFF" : "ON");
	}
	var devButtons = this.wrapper.querySelectorAll('[data-action="toggle-dev"]');
	for (var d = 0; d < devButtons.length; d++) {
		devButtons[d].innerHTML = "DEV MODE: " + (this.devMode ? "ON" : "OFF");
		devButtons[d].classList[this.devMode ? "add" : "remove"]("is-dev-on");
	}
}

SpidermanGame.prototype.setDevMode = function(enabled) {
	this.devMode = !!enabled;
	this.saveSettings();
	this.syncAudioButtons();
	this.syncLevelGrid();
}

SpidermanGame.prototype.setSoundEffects = function(enabled) {
	this.soundEffects = !!enabled;
	this.saveSettings();
	this.syncAudioButtons();
}

// music only: sound effects are controlled with setSoundEffects()
SpidermanGame.prototype.mute = function() {
	this.muted = true;

	for (var i = 0; i < AUDIO_LOOP.length; i++) {
		AUDIO_RESOURCES[AUDIO_LOOP[i]].volume = 0;
	}

	this.saveSettings();
	this.syncAudioButtons();
}

SpidermanGame.prototype.unmute = function() {
	this.muted = false;

	for (var i = 0; i < AUDIO_LOOP.length; i++) {
		AUDIO_RESOURCES[AUDIO_LOOP[i]].volume = 1;
	}

	this.saveSettings();
	this.syncAudioButtons();
}

SpidermanGame.prototype.startMusic = function() {
	var self = this;
	this.currentTrack = this.currentTrack || AUDIO_LOOP[0];

	var result = this.playSound(this.currentTrack, false);
	if (result && typeof result.then === "function") {
		result.then(function() {
			self.musicStarted = true;
			self.syncMusicHint();
		}, function() {
			// autoplay was blocked, ensureMusic() retries on the first user gesture
			self.musicStarted = false;
			self.syncMusicHint();
		});
	} else {
		this.musicStarted = true;
	}
	this.syncMusicHint();
}

// "click / tap anywhere for music" on the main menu while the browser still blocks the music
SpidermanGame.prototype.syncMusicHint = function() {
	if (!this.mainMenu) return;
	var hint = this.mainMenu.querySelector(".spiderman-game-music-hint");
	if (!hint) return;
	hint.innerHTML = this.isTouchDevice() ? "TAP ANYWHERE TO START THE MUSIC" : "CLICK OR PRESS ANY KEY TO START THE MUSIC";
	hint.style.display = !this.musicStarted && !this.muted && this.state === STATE.MENU ? "" : "none";
}

SpidermanGame.prototype.ensureMusic = function() {
	if (this.musicStarted || this.state === STATE.LOADING) return;
	this.startMusic();
}

// call from any user gesture: starts the music if autoplay blocked it and unlocks the effect synth
SpidermanGame.prototype.unlockAudio = function() {
	if (this.state === STATE.LOADING) return;
	this.sfx.unlock();
	this.ensureMusic();
}

SpidermanGame.prototype.playSound = function(audio, clone, currentTime) {
	audio = audio && audio.play ? audio : AUDIO_RESOURCES[audio];

	if (audio && audio.play) {
		if (clone) {
			audio = audio.cloneNode(true);
		}

		if (currentTime != undefined) {
			audio.currentTime = currentTime;
		}

		var result;
		try {
			result = audio.play();
		} catch (e) {
			return;
		}

		// swallow autoplay rejections so they never show up as uncaught errors
		if (result && typeof result.then === "function") {
			result.then(null, function() {});
		}

		return result;
	}
};

SpidermanGame.prototype.pauseSound = function(audio) {
	if (audio && audio.pause) {
		return audio.pause();
	}

	if (AUDIO_RESOURCES[audio]) {
		AUDIO_RESOURCES[audio].pause();
	}
}

/* ------------------------------------------------------------------
 * Pause / game over
 * ------------------------------------------------------------------ */

SpidermanGame.prototype.pause = function() {
	if (this.state !== STATE.PLAYING) return;

	this.paused = true;
	this.state = STATE.PAUSED;
	this.spiderman.releaseAllKeys();
	this.sfx.play("PAUSE");
	this.showPauseMenu();
	this.syncTouchControls();
};

SpidermanGame.prototype.unpause = function() {
	if (this.state !== STATE.PAUSED) return;

	this.paused = false;
	this.state = STATE.PLAYING;
	this.spiderman.releaseAllKeys();
	this.sfx.play("RESUME");

	this.pauseMenu.classList.remove("is-visible");
	this.setActiveMenu(null);

	this.startLoop();
}

SpidermanGame.prototype.gameover = function(reason) {
	if (this.gameIsOver) return;

	this.gameIsOver = true;
	this.state = STATE.GAMEOVER;
	this.gameoverReason = reason || null;
	this.spiderman.releaseAllKeys();
	this.sfx.play("GAME_OVER");

	this.showGameoverMenu();
	this.syncTouchControls();
}

/* ------------------------------------------------------------------
 * Rendering
 * ------------------------------------------------------------------ */

SpidermanGame.prototype.drawBackground = function(cameraX) {
	if (cameraX === undefined) cameraX = this.cameraX;

	if (this.backdrop) {
		this.backdrop.draw(cameraX * (this.state === STATE.MENU ? 1 : this.zoom), this.frame);
		return;
	}

	var background = this.resources.BACKGROUND;
	var backgroundWidth = background.width;
	var backgroundHeight = background.height;

	var x = cameraX / 5 * -1;
	var y = 0;

	x %= Math.min(background.width, this.canvas.width);

	var ratio = backgroundWidth / backgroundHeight;
	this.ctx.drawImage(background, x, y, this.canvas.height * ratio, this.canvas.height);
	this.ctx.drawImage(background, x + this.canvas.height * ratio, y, this.canvas.height * ratio, this.canvas.height);
}

// 10 world pixels = 1 "meter" for the HUD / results
SpidermanGame.prototype.distanceInMeters = function() {
	return Math.floor(this.distance / 10);
}

// red flash + small screen shake when spiderman takes damage
SpidermanGame.prototype.onSpidermanHit = function() {
	this.hitFlash = 14;
	this.shake = 10;
	this.sfx.play("HURT");
}

// draws only the opaque pixels of a sprite in a flat color (used for hit flashes, no boxes)
// x / y / width / height are canvas coordinates of the (already transformed) sprite rectangle
SpidermanGame.prototype.drawTintedSprite = function(img, x, y, width, height, color, alpha) {
	if (!this.tintCanvas) {
		this.tintCanvas = document.createElement("canvas");
		this.tintCtx = this.tintCanvas.getContext("2d");
	}

	var w = Math.max(1, Math.ceil(width));
	var h = Math.max(1, Math.ceil(height));
	if (this.tintCanvas.width !== w || this.tintCanvas.height !== h) {
		this.tintCanvas.width = w;
		this.tintCanvas.height = h;
	}

	var tctx = this.tintCtx;
	tctx.clearRect(0, 0, w, h);
	tctx.drawImage(img, 0, 0, w, h);
	tctx.globalCompositeOperation = "source-in";
	tctx.fillStyle = color;
	tctx.fillRect(0, 0, w, h);
	tctx.globalCompositeOperation = "source-over";

	this.ctx.save();
	this.ctx.globalAlpha = alpha === undefined ? 1 : alpha;
	this.ctx.drawImage(this.tintCanvas, x, y, width, height);
	this.ctx.restore();
}

SpidermanGame.prototype.drawRoundedRect = function(x, y, width, height, radius) {
	var ctx = this.ctx;
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

SpidermanGame.prototype.drawHudPanel = function(x, y, width, height) {
	var ctx = this.ctx;
	ctx.save();
	ctx.fillStyle = "rgba(4, 6, 18, 0.45)";
	ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
	ctx.lineWidth = 1;
	this.drawRoundedRect(x, y, width, height, 5);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

SpidermanGame.prototype.drawCoinIcon = function(x, y, radius) {
	var ctx = this.ctx;
	ctx.fillStyle = "#b8860b";
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#ffd83d";
	ctx.beginPath();
	ctx.arc(x, y, radius - 1.5, 0, Math.PI * 2);
	ctx.fill();
}

// canvas rectangle of the HUD pause button (next to the coin counter)
SpidermanGame.prototype.pauseButtonRect = function() {
	return { x: this.canvas.width - 130, y: 6, width: 30, height: 30 };
}

// converts a mouse / touch event into canvas coordinates (the wrapper may be scaled)
SpidermanGame.prototype.eventToCanvas = function(e) {
	var rect = this.canvas.getBoundingClientRect();
	var point = e.touches && e.touches[0] ? e.touches[0] : e;
	return {
		x: (point.clientX - rect.left) * this.canvas.width / rect.width,
		y: (point.clientY - rect.top) * this.canvas.height / rect.height,
	};
}

SpidermanGame.prototype.isInsidePauseButton = function(point) {
	var r = this.pauseButtonRect();
	var pad = this.touchMode ? TOUCH.PAUSE_PAD : 0;   // a finger needs a bigger target than a mouse
	return point.x >= r.x - pad && point.x <= r.x + r.width + pad && point.y >= r.y - pad && point.y <= r.y + r.height + pad;
}

// the whole in-game HUD: hearts + web bar (left), score / distance / best (center), coins (right)
SpidermanGame.prototype.drawHud = function() {
	var ctx = this.ctx;
	var spiderman = this.spiderman;
	var canvasWidth = this.canvas.width;
	var font = "SpidermanGamePixelFont, Monospace, Helvetica";

	// ---- left: hearts + web ----
	this.drawHudPanel(6, 6, 176, 52);

	var heartSize = 20;
	for (var i = 0; i < spiderman.maxHealth; i++) {
		var hx = 14 + i * (heartSize + 4);
		var hy = 11;
		ctx.save();
		if (i >= spiderman.health) {
			// empty slot: dim outline of a heart
			ctx.globalAlpha = 0.18;
		} else if (spiderman.health === 1 && Math.floor(this.frame / 20) % 2 === 0) {
			// last heart: blink as a warning
			ctx.globalAlpha = 0.45;
		}
		ctx.drawImage(this.resources.HEART, hx, hy, heartSize, heartSize);
		ctx.restore();
	}

	var webIcon = this.resources.WEB_PROJECTILE;
	var barX = 36, barY = 38, barWidth = 92, barHeight = 9;
	var ratio = spiderman.maxWeb ? spiderman.web / spiderman.maxWeb : 0;
	var barColor = spiderman.web <= 0 ? "#ff4040" : (ratio <= 0.25 ? "#ffa033" : "#7fb2ff");

	ctx.drawImage(webIcon, 14, 34, 16, 16);
	ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
	ctx.fillRect(barX, barY, barWidth, barHeight);
	ctx.fillStyle = barColor;
	ctx.fillRect(barX, barY, Math.round(barWidth * Math.max(0, Math.min(1, ratio))), barHeight);
	ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
	ctx.lineWidth = 1;
	ctx.strokeRect(barX + 0.5, barY + 0.5, barWidth - 1, barHeight - 1);

	ctx.font = "10px " + font;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = spiderman.web <= 0 && Math.floor(this.frame / 15) % 2 === 0 ? "#ff4040" : "white";
	ctx.fillText(spiderman.web <= 0 ? "EMPTY" : spiderman.web + "/" + spiderman.maxWeb, barX + barWidth + 6, barY + barHeight / 2 + 1);

	// ---- center: score, distance, best ----
	this.drawHudPanel(canvasWidth / 2 - 90, 6, 180, 52);

	var pulse = this.scorePulse > 0 ? 1 + (this.scorePulse / 12) * 0.35 : 1;
	ctx.save();
	ctx.translate(canvasWidth / 2, 22);
	ctx.scale(pulse, pulse);
	ctx.fillStyle = this.scorePulse > 0 ? "#ffd83d" : "white";
	ctx.font = "20px " + font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(this.score, 0, 0);
	ctx.restore();

	ctx.fillStyle = "#9aa3c7";
	ctx.font = "9px " + font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	if (this.isCampaign() && this.level) {
		// stage id + timer, and a thin progress bar toward the goal flag
		ctx.fillText("STAGE " + this.level.id + "   -   " + this.formatTime(this.levelFrames / 60), canvasWidth / 2, 46);
		var progress = this.level.progress(spiderman.x);
		var pbX = canvasWidth / 2 - 70, pbY = 54, pbW = 140, pbH = 3;
		ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
		ctx.fillRect(pbX, pbY, pbW, pbH);
		ctx.fillStyle = "#ffd83d";
		ctx.fillRect(pbX, pbY, Math.round(pbW * progress), pbH);
		ctx.fillStyle = "#e3201b";
		ctx.fillRect(pbX + pbW - 1, pbY - 2, 2, pbH + 4);
	} else {
		var bestLabel = this.score > this.bestScore && this.bestScore > 0 ? "NEW BEST" : "BEST " + this.bestScore;
		ctx.fillText(this.distanceInMeters() + " M   -   " + bestLabel, canvasWidth / 2, 46);
	}

	// ---- pause button (click / tap, same as ESC) ----
	var pauseButton = this.pauseButtonRect();
	this.drawHudPanel(pauseButton.x, pauseButton.y, pauseButton.width, pauseButton.height);
	ctx.fillStyle = this.pauseButtonHover ? "#ffd83d" : "white";
	ctx.fillRect(pauseButton.x + 9, pauseButton.y + 8, 4, 14);
	ctx.fillRect(pauseButton.x + 17, pauseButton.y + 8, 4, 14);

	// ---- right: coins ----
	this.drawHudPanel(canvasWidth - 96, 6, 90, 30);
	var coinScale = this.coinPulse > 0 ? 1 + (this.coinPulse / 10) * 0.3 : 1;
	ctx.save();
	ctx.translate(canvasWidth - 78, 21);
	ctx.scale(coinScale, coinScale);
	this.drawCoinIcon(0, 0, 7);
	ctx.restore();
	ctx.fillStyle = "#ffd83d";
	ctx.font = "13px " + font;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillText("x " + this.coins, canvasWidth - 64, 22);

	// ---- campaign: boss health bar ----
	if (this.isCampaign() && this.level && this.level.boss) {
		var boss = this.level.boss;
		var bw = 300, bh = 10, bx = canvasWidth / 2 - bw / 2, by = this.canvas.height - 22;
		this.drawHudPanel(bx - 8, by - 14, bw + 16, 34);
		ctx.fillStyle = boss.labelColor || "#e4b8ff";
		ctx.font = "9px " + font;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(boss.bossName || "MYSTERIO", bx, by - 6);
		ctx.textAlign = "right";
		ctx.fillStyle = "#9aa3c7";
		ctx.fillText(boss.health + "/" + boss.maxHealth + (boss.phase === 2 ? (boss.bossName ? "  FURIOUS" : "  FAST") : ""), bx + bw, by - 6);
		// (bosses with a state worth telling, e.g. sandman soaked: a line in the middle of the bar's label row)
		var bossStatus = boss.statusText ? boss.statusText() : "";
		if (bossStatus) {
			ctx.textAlign = "center";
			ctx.fillStyle = Math.floor(this.frame / 12) % 2 === 0 ? (boss.statusColor || "#7fd0ff") : "#ffffff";
			ctx.fillText(bossStatus, bx + bw / 2, by - 6);
		}
		ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
		ctx.fillRect(bx, by + 2, bw, bh);
		var ratio = boss.healthRatio();
		var lowAt = boss.phase2At ? boss.phase2At() : BOSS.MYSTERIO.PHASE2_AT;
		ctx.fillStyle = boss.hurtPulse > 0 ? "#ffffff" : (ratio <= lowAt ? (boss.barColorLow || "#ff5fa2") : (boss.barColor || "#a64dff"));
		ctx.fillRect(bx, by + 2, Math.round(bw * ratio), bh);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
		ctx.strokeRect(bx + 0.5, by + 2.5, bw - 1, bh - 1);
	}

	// ---- campaign: key items (keycard, cores, ...) under the coins ----
	if (this.isCampaign() && this.level) {
		var items = this.level.keyItems();
		if (items.length) {
			var ownedCount = 0;
			this.drawHudPanel(canvasWidth - 96, 40, 90, 22);
			var keyScale = this.keyPulse > 0 ? 1 + (this.keyPulse / 40) * 0.4 : 1;
			for (var k = 0; k < items.length; k++) {
				var item = items[k];
				if (item.owned) ownedCount++;
				var sp = PixelArt.sprite(item.sprite);
				var iw = 16, ih = Math.round(16 * sp.rows / sp.cols);
				ctx.save();
				ctx.globalAlpha = item.owned ? 1 : 0.25;
				ctx.translate(canvasWidth - 80 + k * 20, 51);
				if (item.owned) ctx.scale(keyScale, keyScale);
				ctx.drawImage(sp.canvas, -iw / 2, -ih / 2, iw, ih);
				ctx.restore();
			}
			ctx.fillStyle = ownedCount ? "#ffd83d" : "#9aa3c7";
			ctx.font = "9px " + font;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			var keyText = items.length > 1 ? items[0].label + " " + ownedCount + "/" + items.length : (ownedCount ? items[0].label : "NO " + items[0].label.split(" ")[0]);
			ctx.fillText(keyText, canvasWidth - 90 + items.length * 20, 52);
			if (this.keyPulse > 0) this.keyPulse--;
		}
	}

	// ---- campaign: rescued workers counter (stages with trapped workers), under the coins / key items ----
	if (this.isCampaign() && this.level && this.level.rescues.length) {
		this.drawRescueCounter(this.level.keyItems().length ? 66 : 40);
	}

	if (this.scorePulse > 0) this.scorePulse--;
	if (this.coinPulse > 0) this.coinPulse--;
}

// "RESCUED 1/2" panel (right aligned like the coins): a worker icon, grey while nobody is saved yet, yellow while
// some are, green once everybody is safe (= the exit is open). Pops a little when a worker is rescued
SpidermanGame.prototype.drawRescueCounter = function(y) {
	var ctx = this.ctx;
	var level = this.level;
	var font = "SpidermanGamePixelFont, Monospace, Helvetica";
	var saved = level.rescuedCount(), total = level.rescues.length;
	var text = "RESCUED " + saved + "/" + total;

	ctx.save();
	ctx.font = "10px " + font;
	var width = Math.ceil(ctx.measureText(text).width) + 34;
	var x = this.canvas.width - 6 - width;
	this.drawHudPanel(x, y, width, 22);

	var icon = PixelArt.sprite("WORKER_WAVE_0");
	var ih = 17, iw = Math.round(ih * icon.cols / icon.rows);
	var pop = this.rescuePulse > 0 ? 1 + (this.rescuePulse / 30) * 0.35 : 1;
	ctx.translate(x + 14, y + 11);
	ctx.scale(pop, pop);
	ctx.drawImage(icon.canvas, -iw / 2, -ih / 2, iw, ih);
	ctx.restore();

	ctx.save();
	ctx.font = "10px " + font;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = saved >= total ? "#8ee27a" : (saved > 0 ? "#ffd83d" : "#c3c9e0");
	ctx.fillText(text, x + 26, y + 12);
	ctx.restore();
	if (this.rescuePulse > 0) this.rescuePulse--;
}

// "STAGE 1-1 / ROOKIE ROOFTOPS" card for the first couple of seconds of a stage (fades out, never blocks play)
SpidermanGame.prototype.drawStageIntro = function() {
	if (this.introFrames <= 0 || !this.level) return;

	var ctx = this.ctx;
	var w = this.canvas.width;
	var alpha = Math.min(1, this.introFrames / 30);
	var slide = Math.max(0, 1 - (CAMPAIGN.INTRO_FRAMES - this.introFrames) / 12); // quick slide-in from the left
	var y = 150;

	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.translate(-slide * w * 0.3, 0);
	ctx.fillStyle = "rgba(4, 6, 18, 0.7)";
	ctx.fillRect(0, y - 34, w, 76);
	ctx.fillStyle = "#e3201b";
	ctx.fillRect(0, y - 34, w, 3);
	ctx.fillRect(0, y + 39, w, 3);

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#ffd83d";
	ctx.font = "24px SpidermanGameTitleFont, SpidermanGamePixelFont, Impact, Helvetica";
	ctx.fillText("STAGE " + this.level.id, w / 2, y - 8);
	ctx.fillStyle = "white";
	ctx.font = "12px SpidermanGamePixelFont, Monospace, Helvetica";
	ctx.fillText(this.level.name, w / 2, y + 22);
	ctx.restore();

	this.introFrames--;
}

SpidermanGame.prototype.drawRoofs = function() {
	var roofs = this.scene.roofs;

	// draw from a snapshot: removing a roof while looping over the live array shifted the next
	// roof into the current index and skipped it for one frame (a one-frame hole at the left edge)
	var snapshot = roofs.slice();
	for (var i = 0; i < snapshot.length; i++) {
		if (snapshot[i].motion) snapshot[i].move();
		snapshot[i].update();
	}

	// a campaign stage is a fixed world: nothing is recycled or generated
	if (this.isCampaign()) return;

	// drop the roofs that are behind the area the camera can still scroll back to
	for (var j = roofs.length - 1; j >= 0; j--) {
		if (roofs[j].isBehindCamera()) roofs[j].remove();
	}

	// keep generating roofs until the world is filled a bit beyond the right edge of the screen
	var lastRoof = roofs[roofs.length - 1];
	while (lastRoof && lastRoof.x + lastRoof.fullWidth < this.cameraX + this.viewWidth + 100) {
		var x = lastRoof.x + lastRoof.fullWidth + Math.round(Math.random() * 50) + 100;
		var roof = new Roof(this, x);
		this.addRoof(roof);
		roof.update();
		lastRoof = roof;
	}
}

SpidermanGame.prototype.drawEnemies = function() {
	// snapshot for the same reason as drawRoofs: an enemy removing itself must not hide the next one for a frame
	var enemies = this.scene.enemies.slice();

	for (var i = 0; i < enemies.length; i++) {
		enemies[i].update();
	}
}

SpidermanGame.prototype.update = function() {
	this.loopScheduled = false;

	if (this.state !== STATE.PLAYING) return;
	if (this.paused) return;
	if (this.gameIsOver) return;

	if (this.touchMode) this.refreshTouchKeys();

	// draw the scene
	var scene = this.scene;
	var spiderman = scene.spiderman;
	var projectiles = scene.projectiles;

	// clear the canvas for re drawing
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	// the backdrop always covers the whole canvas and is never shaken, so a shake can't expose bare canvas
	this.drawBackground();

	// the world is drawn in world pixels under a zoom transform (campaign: zoomed out); the HUD is drawn after
	// the restore, so it always keeps its size
	this.ctx.save();
	this.ctx.scale(this.zoom, this.zoom);
	// vertical camera: world y is drawn as is, shifted by the (integer) camera offset
	this.ctx.translate(0, -Math.round(this.cameraY));

	// small screen shake (world only) after taking damage
	if (this.shake > 0) {
		var strength = this.shake / 10 * 3 / this.zoom;
		this.ctx.translate(Math.round((Math.random() * 2 - 1) * strength), Math.round((Math.random() * 2 - 1) * strength));
		this.shake--;
	}

	if (this.level) this.level.drawBackground();
	this.drawRoofs();
	if (this.level) this.level.draw();
	this.drawPickups();
	this.cleanupPickups();
	this.drawEnemies();

	// update over a copy: a projectile may remove itself while updating
	var activeProjectiles = projectiles.slice();
	for (var i = 0; i < activeProjectiles.length; i++) {
		activeProjectiles[i].update();
	}

	this.cleanupProjectiles();

	spiderman.update();
	this.updateDistanceScore();
	// harbour stages: the water in front of everything (no-op elsewhere)
	if (this.level) this.level.drawForeground();

	this.ctx.restore(); // end of the shaken, zoomed world

	// red flash when hit
	if (this.hitFlash > 0) {
		this.ctx.fillStyle = "rgba(255, 30, 30, " + (this.hitFlash / 14 * 0.3) + ")";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.hitFlash--;
	}

	this.drawHud();
	if (this.isCampaign()) {
		this.updateTransition();
		this.drawTransition();
		this.drawStageIntro();
		this.levelFrames++;
	}
	this.frame++;

	// campaign: touching the goal flag clears the stage (checked after the frame is drawn so the
	// results screen sits on a complete scene, like the game over screen)
	// (stages with trapped workers: only once every worker is rescued, see CampaignLevel.exitOpen)
	if (this.state === STATE.PLAYING && this.level && ((this.level.goal && this.level.goal.touchesSpiderman() && this.level.exitOpen()) || this.level.bossDefeated)) {
		this.completeLevel();
	}

	var hitCandidates = projectiles.slice();
	for (var i = 0; i < hitCandidates.length; i++) {
		var projectile = hitCandidates[i];
		var x = projectile.x;
		var y = projectile.y;

		var character = this.isCharacterAtPoint(x, y, projectile);
		if (character) {
			// a character in its safe time (spiderman right after a hit) lets projectiles pass through
			if (typeof character.canBeHit === "function" && !character.canBeHit()) continue;

			projectile.handleHitWithCharacter(character);
			character.handleHitWithProjectile(projectile);
		}
	}

	// spiderman.update() may have ended the run: don't schedule another frame in that case
	if (this.state !== STATE.PLAYING) return;

	this.loopScheduled = true;
	requestAnimFrame(this.update.bind(this));
}

// removes every projectile (knives, webs, ...) that left the useful screen area,
// so nothing keeps flying / living forever outside of the view
SpidermanGame.prototype.cleanupProjectiles = function() {
	var projectiles = this.scene.projectiles;
	var margin = COMBAT.PROJECTILE_CLEANUP_MARGIN;
	var left = this.cameraX - margin;
	var right = this.cameraX + this.viewWidth + margin;
	var top = this.cameraY - margin;
	var bottom = this.cameraY + this.viewHeight + margin;

	var obstacles = this.getObstacles();

	for (var i = projectiles.length - 1; i >= 0; i--) {
		var projectile = projectiles[i];
		if (projectile.x < left || projectile.x > right || projectile.y < top || projectile.y > bottom) {
			projectile.remove();
			continue;
		}

		// knives, webs and bombs don't fly through crates / AC units
		for (var j = 0; j < obstacles.length; j++) {
			var box = obstacles[j];
			if (projectile.x >= box.left() && projectile.x <= box.right() && projectile.y >= box.top() && projectile.y <= box.bottom()) {
				projectile.remove();
				break;
			}
		}
	}
}

SpidermanGame.prototype.addProjectile = function(projectile) {
	if (projectile instanceof Projectile) {
		this.scene.projectiles.push(projectile);
	}
}

SpidermanGame.prototype.removeProjectile = function(projectile) {
	var projectiles = this.scene.projectiles;
	if (projectiles.indexOf(projectile) > -1) {
		projectiles.splice(projectiles.indexOf(projectile), 1);
	}
}

SpidermanGame.prototype.addEnemy = function(enemy) {
	// regular enemies, and bosses / boss copies (anything that can update itself and be hit)
	if (enemy instanceof Enemy || (enemy && typeof enemy.update === "function" && typeof enemy.handleHitWithProjectile === "function")) {
		this.scene.enemies.push(enemy);
	}
}

SpidermanGame.prototype.removeEnemy = function(enemy) {
	var enemies = this.scene.enemies;
	if (enemies.indexOf(enemy) > -1) {
		enemies.splice(enemies.indexOf(enemy), 1);
	}
}

// every solid rooftop prop currently in the world (+ closed gates of a campaign stage)
SpidermanGame.prototype.getObstacles = function() {
	var result = [];
	var roofs = this.scene.roofs;
	for (var i = 0; i < roofs.length; i++) {
		var solid = roofs[i].obstacles();
		for (var j = 0; j < solid.length; j++) result.push(solid[j]);
	}
	if (this.level) {
		var extra = this.level.obstacles();
		for (var k = 0; k < extra.length; k++) result.push(extra[k]);
	}
	return result;
}

SpidermanGame.prototype.addRoof = function(roof) {
	if (roof instanceof Roof) {
		this.scene.roofs.push(roof);
	}
}

SpidermanGame.prototype.removeRoof = function(roof) {
	var roofs = this.scene.roofs;
	if (roofs.indexOf(roof) > -1) {
		roofs.splice(roofs.indexOf(roof), 1);
	}
}

// checks if the given world point is inside a roof / platform.
// opts (optional, for one-way ledges): { velocityY, previousFeetY } of the character: a one-way ledge only
// counts when the character is falling onto it from above; without opts one-way ledges are ignored
SpidermanGame.prototype.isRoofAtPoint = function(x, y, opts) {
	var best = false;
	for (var i = 0; i < this.scene.roofs.length; i++) {
		var roof = this.scene.roofs[i];

		if (!roof.isSolid()) continue;
		if (roof.x > x || roof.x + roof.fullWidth < x || y < roof.y) continue;

		if (roof.oneWay) {
			// thin platforms: landing when the feet crossed the top during this frame (a fast fall may already
			// have carried them below the slab, so the thickness is not used here)
			// (a moving platform is compared with where its top was before it moved this frame)
			if (!opts || opts.velocityY < 0 || opts.previousFeetY > roof.y - (roof.deltaY || 0) + 2) continue;
		} else if (y > roof.bottom()) {
			continue;
		}
		// platforms may overlap (a building standing on a street): the highest one wins; at equal height a
		// moving platform wins over the ground it is resting on, so it carries whoever stands on it
		// (a conveyor belt laid into a floor wins over that floor the same way)
		if (!best || roof.y < best.y || (roof.y === best.y && (roof.motion || roof.conveyor) && !(best.motion || best.conveyor))) best = roof;
	}

	return best;
}

// the roof whose underside the head point is bumping into (only floating blocks can be below the character)
SpidermanGame.prototype.isCeilingAtPoint = function(x, y, feetY) {
	for (var i = 0; i < this.scene.roofs.length; i++) {
		var roof = this.scene.roofs[i];
		if (roof.oneWay || !roof.isSolid()) continue;
		if (roof.x > x || roof.x + roof.fullWidth < x) continue;
		if (y > roof.y && y < roof.bottom() && feetY > roof.bottom()) return roof;
	}
	return false;
}

// optional projectile: characters of the projectile's own team (and its owner) are ignored
SpidermanGame.prototype.isCharacterAtPoint = function(x, y, projectile) {
	// enemies + spiderman
	var characters = this.scene.enemies.concat(this.spiderman);
	x -= this.cameraX;

	for (var i = 0; i < characters.length; i++) {
		var character = characters[i];
		var stateImg = character.stateImg || {};

		if (projectile) {
			if (character === projectile.owner) continue;
			if (projectile.team && character.team === projectile.team) continue;
		}

		var left = character.x - this.cameraX;
		var top = character.y;
		var right = left + stateImg.width * character.scale;
		var bottom = top + stateImg.height * character.scale;

		// characters can provide a custom hit box (e.g. Spider-Man ducking while sliding)
		if (typeof character.getHitbox === "function") {
			var hitbox = character.getHitbox();
			left = hitbox.left - this.cameraX;
			top = hitbox.top;
			right = hitbox.right - this.cameraX;
			bottom = hitbox.bottom;
		}

		var isCharacter =
			   left   <= x // check left bound
			&& top    <= y // top bound
			&& right  >= x // right bound
			&& bottom >= y; // bottom bound

		if (isCharacter) return character;
	}

	return false;
}


function SpiderMan(game) {
	this.game = game;
	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.name = "SPIDER_MAN";
	this.team = "SPIDERMAN";
	this.x = 0;
	this.y = 0;
	this.states = ["STANDING"];
	this.scale = 0.5;
	this.baseScale = 0.5;
	// enemies may look at spiderman before his first update, so start with a valid sprite
	this.stateImg = game.resources.STANDING || null;

	this.slideFrames = 0;
	this.slideCooldown = 0;
	this.slideArmed = true;
	this.keydowns = [];
	// keys tapped since the last frame (so a very quick tap between two frames is not lost)
	this.tapped = [];
	this.health = 5;
	this.maxHealth = 5;

	this.maxWeb = COMBAT.MAX_WEB;
	this.web = this.maxWeb;

	// frames left during which spiderman cannot be damaged again
	this.invulnerableFrames = 0;

	this.velocityX = 0;
	this.velocityY = 0;

	// how many frames have passed
	this.frame = 0;

	this.runningFrames = ["RUNNING_RIGHT_STEP", "RUNNING_CHANGE_STEP", "RUNNING_LEFT_STEP", "RUNNING_CHANGE_STEP"];
	this.runningShootingFrames = ["SHOOT_RIGHT-STEP", "SHOOT_CHANGE_STEP", "SHOOT_LEFT-STEP", "SHOOT_CHANGE_STEP"];
	this.runningFrame = 0;

	this.gravityForce = 0.7;

	this.runningDirection = 0;
	this.runningSpeed = 5;

	// sliding: tap the down arrow while on a roof for a short dash (see SLIDE)
	this.slideSpeed = SLIDE.SPEED;
	this.onGround = false;

	this.shootingFrame = 0;
	// frames left until the next web shot is allowed
	this.shootCooldown = 0;
	this.wasDamagedOnPreviousFrame = false;

	// campaign movement: the climbable surface he is on, the active web swing, and timers that stop him from
	// grabbing / attaching again right after letting go
	this.climbing = null;
	this.swinging = null;
	this.grabGrace = 0;
	this.swingGrace = 0;
	this.momentumX = 0;
	this.beltX = 0;          // how far a conveyor belt pushed him this frame
	this.airBeltX = 0;       // belt speed he took with him into the air (kept until he lands)
	this.climbStepFrames = 0;
	this.climbMoving = false;
}

SpiderMan.prototype.keyIsDown = function(keyCode) {
	return this.keydowns.indexOf(keyCode) > -1;
}

// true if the key is held right now, or was tapped since the last frame
SpiderMan.prototype.keyIsDownOrTapped = function(keyCode) {
	return this.keyIsDown(keyCode) || this.tapped.indexOf(keyCode) > -1;
}

SpiderMan.prototype.hasState = function(state) {
	return this.states.indexOf(state) > -1;
}

SpiderMan.prototype.hasStates = function(states) {
	states = states.split(" ");
	var hasStates = true;
	for (var i = 0; i < states.length; i++) {
		hasState = hasState && this.hasState(states[i]);
	}
	return hasStates;
}

SpiderMan.prototype.addState = function(state) {
	if (this.hasState(state) === false) this.states.push(state);
}

SpiderMan.prototype.removeState = function(state) {
	if (state instanceof Array) {
		for (var i = 0; i < state.length; i++) {
			this.removeState(state[i]);
		}
	}

	if (this.hasState(state)) this.states.splice(this.states.indexOf(state), 1);
}

SpiderMan.prototype.handleHitWithProjectile = function(projectile) {
	if (projectile.name == "WEB") return;
	if (!this.canBeHit()) return;

	this.health = Math.max(0, this.health - projectile.damage);
	this.wasDamagedOnPreviousFrame = true;
	this.invulnerableFrames = COMBAT.INVULNERABLE_FRAMES;
	this.hurtTintFrames = 8;
	this.game.onSpidermanHit();
}

// campaign hazards (sparking boxes, rebar): damage plus a little knock-back so he is never stuck inside one
SpiderMan.prototype.hitByHazard = function(hazardCenterX) {
	if (!this.canBeHit()) return false;
	this.airBeltX = 0;
	this.handleHitWithProjectile({ name: "HAZARD", damage: 1 });
	if (this.climbing) this.stopClimb(CLIMB.GRACE);
	if (this.swinging) this.releaseSwing(false);
	this.velocityY = -7;
	this.onGround = false;
	this.groundRoof = null;
	this.removeState("JUMP");
	this.momentumX = this.centerX() < hazardCenterX ? -4 : 4;
	return true;
}

// false while spiderman is in his short safe time after a hit: projectiles pass through him
SpiderMan.prototype.canBeHit = function() {
	return this.invulnerableFrames <= 0;
}

SpiderMan.prototype.isInvulnerable = function() {
	return !this.canBeHit();
}

// gives web fluid back (used by pickups), never above maxWeb
SpiderMan.prototype.addWeb = function(amount) {
	this.web = Math.min(this.maxWeb, Math.max(0, this.web + (amount || 0)));
	return this.web;
}

SpiderMan.prototype.canShoot = function() {
	return this.web > 0 && this.shootCooldown <= 0;
}

// returns the image to draw in position of spiderman
SpiderMan.prototype.stateImage = function() {
	var state = "STANDING";

	if (this.hasState("JUMP")) {
		state = "JUMP";

		if (this.velocityY == 0) {
			this.velocityY = -15;
			this.game.sfx.play("JUMP");
		}
	}

	if (this.velocityY >= 0) this.removeState("JUMP");

	if (this.hasState("SLIDE")) {
		// sliding keeps spiderman low and dashes him in the direction he is facing
		state = "SLIDE";
		this.runningDirection = this.runningDirection || DIRECTION.RIGHT;
		this.velocityX = this.runningDirection * this.slideSpeed;

		var slideImage = this.game.resources[state] || this.game.resources["STANDING"];
		this.stateImg = slideImage;
		return slideImage;
	}

	if (this.hasState("RUNNING")) {
		state = this.runningFrames[this.runningFrame];

		// if user is shooting while running
		if (this.hasState("SHOOT")) state = this.runningShootingFrames[this.runningFrame];

		// every 10th frame update the image
		if (this.frame % 10 === 0) {
			this.runningFrame++;
			this.runningFrame %= this.runningFrames.length - 1;
		}

		this.velocityX = this.runningDirection * this.runningSpeed;
	} else {
		this.velocityX = 0;
	}

	if (this.hasState("SHOOT")) {
		if (!this.hasState("RUNNING")) state = "SHOOT";
		// one shot per cooldown, no matter if X is held or tapped
		if (this.canShoot()) {
			this.shoot(this.game.resources.SHOOT);
		}
		this.shootingFrame++;
	}

	var image = this.game.resources[state] || this.game.resources["STANDING"];
	this.stateImg = image; // so that stateImage is accessible

	return image;
}

SpiderMan.prototype.keydown = function(keyCode) {
	if (!this.keyIsDown(keyCode)) {
		this.keydowns.push(keyCode);
		this.tapped.push(keyCode);
	}
}

SpiderMan.prototype.keyup = function(keyCode) {
	this.runningFrame = 0;

	if (keyCode == KEY.ARROW_RIGHT || keyCode == KEY.ARROW_LEFT) {
		this.removeState("RUNNING");
	}

	if (keyCode == KEY.X) {
		this.removeState("SHOOT");
		// reset the shootingFrame so if user presses X rapidly, it shoots rapidly
		// but if user holds X, it shoots every 20 frame
		this.shootingFrame = 0;
	}

	while (this.keydowns.indexOf(keyCode) > -1) {
		this.keydowns.splice(this.keydowns.indexOf(keyCode), 1);
	}
}

// forget every held key (used when pausing / leaving the game so nothing stays pressed)
SpiderMan.prototype.releaseAllKeys = function() {
	this.keydowns = [];
	this.tapped = [];
	this.removeState(["RUNNING", "SHOOT", "SLIDE"]);
	this.runningFrame = 0;
	this.shootingFrame = 0;
}

// world coordinates of the area that can be hit by projectiles
SpiderMan.prototype.getHitbox = function() {
	var img = this.stateImg || this.game.resources["STANDING"];
	var width = img.width * this.scale;
	var height = img.height * this.scale;
	var top = this.y;

	return {
		left: this.x,
		top: top,
		right: this.x + width,
		bottom: this.y + height,
	};
}

// the width used for collisions: always the standing sprite's, so the changing widths of the
// running frames never push spiderman back and forth against walls
SpiderMan.prototype.bodyWidth = function() {
	return this.game.resources.STANDING.width * this.scale;
}

// solid rooftop props: land on top of them, or get blocked by their sides
SpiderMan.prototype.resolveObstacles = function(img) {
	var obstacles = this.game.getObstacles();
	var width = this.bodyWidth();
	var height = img.height * this.scale;

	for (var i = 0; i < obstacles.length; i++) {
		var box = obstacles[i];
		var left = this.x;
		var right = this.x + width;
		var top = this.y;
		var bottom = this.y + height;

		if (right <= box.left() || left >= box.right() || bottom <= box.top() || top >= box.bottom()) continue;

		// where were the feet before this frame's vertical move?
		var previousBottom = bottom - this.velocityY;
		// the direction he really moved (own speed + conveyor belt), see update()
		var moveX = this.velocityX + (this.beltX || 0);

		if (this.velocityY >= 0 && previousBottom <= box.top() + 1) {
			// coming from above: stand on the box
			this.y = box.top() - height;
			this.velocityY = 0;
			this.onGround = true;
			this.removeState("FALL");
		} else if (moveX > 0) {
			this.x = box.left() - width;
			this.velocityX = 0;
		} else if (moveX < 0) {
			this.x = box.right();
			this.velocityX = 0;
		} else {
			// standing inside (e.g. sprite grew): push to the nearest side
			var pushLeft = right - box.left();
			var pushRight = box.right() - left;
			this.x += pushLeft < pushRight ? -pushLeft : pushRight;
		}
	}
}

// health only comes back through pickups (no passive regeneration), never above maxHealth
SpiderMan.prototype.addHealth = function(amount) {
	this.health = Math.min(this.maxHealth, Math.max(0, this.health + (amount || 0)));
	return this.health;
}

SpiderMan.prototype.shoot = function(img) {
	if (!this.canShoot()) return;

	var direction = this.runningDirection || 1;
	var web = new Projectile(this.game);

	web.name = "WEB";
	web.team = "SPIDERMAN";
	web.owner = this;
	web.damage = 2;
	web.range = COMBAT.WEB_RANGE;
	web.traveled = 0;

	web.x = this.x + img.width * this.scale + 1;
	if (this.runningDirection == DIRECTION.LEFT) {
		web.x = this.x - 1; // left hand will be the X position of the spiderman
	}
	web.y = this.y + img.height * this.scale / 2;

	web.update = function() {
		var x = this.x - this.game.cameraX;
		var y = this.y;

		if (direction == DIRECTION.LEFT) {
			// if spiderman is turned to left,
			// move web by 20pixels since X coordinates start from LEFT to right
			x -= 20;
		}

		this.ctx.drawImage(this.game.resources["WEB_PROJECTILE"], Math.round(x), Math.round(y - 10), 20, 20);

		this.x += direction * COMBAT.WEB_SPEED;
		this.traveled += COMBAT.WEB_SPEED;

		// the web has a fixed reach in world space: it does not matter where the camera is
		if (this.traveled >= this.range || this.x <= 0) this.remove();
	}

	web.handleHitWithCharacter = function(character) {
		// somtimes projectile is being hit by the spiderman ON launch
		// the best way is probably to launch it better but for now, i'll just make sure
		// it doesn't get destroyed on launch
		if (character.name != "SPIDER_MAN") return this.remove();
	}

	web.spiderman = this;

	this.game.addProjectile(web);
	if (this.game.soundEffects == true) {
		this.game.playSound("SHOOT", true, 0);
	}

	this.web--;
	this.shootCooldown = COMBAT.SHOOT_COOLDOWN;
}

// the HUD (hearts, web bar, score, coins) is drawn by SpidermanGame.prototype.drawHud
SpiderMan.prototype.drawHealthbar = function() {}
SpiderMan.prototype.drawWebbar = function() {}

// function that gets called with global update function
SpiderMan.prototype.update = function() {
	var game = this.game;
	var level = game.level;
	// UP held since a climb ended is "used up": it must be released before it counts as a jump again
	if (!this.keyIsDown(KEY.ARROW_UP)) this.upLatched = false;
	var wantsJump  = (this.keyIsDownOrTapped(KEY.ARROW_UP) && !this.upLatched) || this.keyIsDownOrTapped(KEY.SPACEBAR);
	// a fresh press this frame (not a held key): used for web swings so holding SPACE never chains actions
	var pressedJump = this.tapped.indexOf(KEY.SPACEBAR) > -1 || this.tapped.indexOf(KEY.ARROW_UP) > -1;
	var pressedSpace = this.tapped.indexOf(KEY.SPACEBAR) > -1; // UP grabs surfaces, so only SPACE jumps off them
	var pressedUpTap = this.tapped.indexOf(KEY.ARROW_UP) > -1;
	var pressedUse = this.tapped.indexOf(KEY.E) > -1;      // a fresh press of E (touch: RESCUE / USE), never a held key
	var wantsSlide = this.keyIsDownOrTapped(KEY.ARROW_DOWN);
	var wantsShoot = this.keyIsDownOrTapped(KEY.X);
	var upHeld = this.keyIsDown(KEY.ARROW_UP);
	var downHeld = this.keyIsDown(KEY.ARROW_DOWN);
	var leftHeld = this.keyIsDown(KEY.ARROW_LEFT);
	var rightHeld = this.keyIsDown(KEY.ARROW_RIGHT);
	this.tapped = [];
	this.beltX = 0;

	if (this.grabGrace > 0) this.grabGrace--;
	if (this.swingGrace > 0) this.swingGrace--;

	// the run ends here, but the frame is still drawn so the game over menu sits on a complete scene
	// (running out of web only means spiderman cannot shoot until he finds more)
	var deathY = level ? level.deathY : game.viewHeight;
	if (this.y >= deathY) {
		game.gameover(level && level.waterY !== null ? "WATER" : "FELL");
	} else if (!this.health) {
		game.gameover("HEALTH");
	}

	// ---- campaign: walking through a door (UP in front of it) ----
	if (game.transition) {
		// frozen while the screen fades; still drawn
		this.draw(this.stateImg || game.resources.STANDING);
		this.finishFrame();
		return;
	}
	// ---- campaign: free a trapped worker next to him, or use a pump / valve (E / the RESCUE button) ----
	if (level && pressedUse && !this.swinging) level.interact(this);

	var pressedUp = pressedUpTap || (upHeld && !this.upLatched && this.onGround && this.frame % 10 === 0);
	if (level && pressedUp && this.onGround && !this.climbing && !this.swinging) {
		var door = level.findDoor(this);
		if (door) {
			game.startDoorTransition(door);
			this.upLatched = true;
			this.draw(this.stateImg || game.resources.STANDING);
			this.finishFrame();
			return;
		}
	}

	// ---- campaign: grab a ladder / pipe / fence ----
	if (level && !this.climbing && !this.swinging && this.grabGrace <= 0 && (upHeld || downHeld)) {
		var surface = level.findClimbable(this, downHeld && !upHeld);
		if (surface) this.startClimb(surface, downHeld && !upHeld);
	}

	if (this.climbing) {
		// updateClimb returns false when it handed the frame over to a normal update() (he let go)
		if (this.updateClimb(upHeld, downHeld, leftHeld, rightHeld, pressedSpace)) this.finishFrame();
		return;
	}

	// sliding is a short, fixed dash: press down once while on a roof; holding does not repeat it
	if (!this.keyIsDown(KEY.ARROW_DOWN)) this.slideArmed = true;
	if (this.slideCooldown > 0) this.slideCooldown--;

	// (no sliding while wading through water)
	if (wantsSlide && this.slideArmed && this.onGround && !this.hasState("JUMP") && !this.hasState("SLIDE") && this.slideCooldown <= 0 && !this.swinging && !this.wading) {
		this.addState("SLIDE");
		this.slideFrames = SLIDE.DURATION;
		this.slideArmed = false;
		game.sfx.play("SLIDE");
	}

	if (this.hasState("SLIDE")) {
		this.slideFrames--;
		// the dash ends after its duration, or as soon as spiderman leaves the roof
		if (this.slideFrames <= 0 || !this.onGround) {
			this.removeState("SLIDE");
			this.slideCooldown = SLIDE.COOLDOWN;
		}
	}

	// spiderman is drawn smaller (lower) while sliding
	this.scale = this.hasState("SLIDE") ? SLIDE.SCALE : this.baseScale;

	var wasAirborne = !this.onGround;

	// ---- campaign: shoot a web to an anchor (SPACE / UP pressed in the air) or let go of it ----
	if (level && !this.swinging && wasAirborne && pressedJump && this.swingGrace <= 0) {
		var anchor = level.findAnchor(this);
		if (anchor) this.startSwing(anchor);
	} else if (this.swinging && (pressedJump || downHeld)) {
		this.releaseSwing(!downHeld);
	}

	if (!this.swinging) {
		if (wantsJump && !this.hasState("FALL") && !this.hasState("SLIDE")) {
			this.addState("JUMP");
		}
	} else {
		this.removeState("JUMP");
	}
	if (rightHeld) {
		this.addState("RUNNING");
		this.runningDirection = DIRECTION.RIGHT;
	}
	if (leftHeld) {
		this.addState("RUNNING");
		this.runningDirection = DIRECTION.LEFT;
	}
	if (wantsShoot && !this.hasState("SLIDE") && !this.swinging) {
		// a dry click when trying to shoot with an empty web tank (once per press)
		if (this.web <= 0 && !this.hasState("SHOOT")) game.sfx.play("EMPTY");
		this.addState("SHOOT");
	} else {
		this.removeState("SHOOT");
	}

	// sewer water: wading is slower (stages without pools keep the normal speed)
	if (level && level.pools.length) this.runningSpeed = this.wading ? 5 * POOLS.WADE_SPEED : 5;
	var img = this.stateImage();
	if (this.swinging) img = this.stateImg = game.resources.JUMP;

	// sprites have different heights (e.g. slide is shorter than standing):
	// keep the feet anchored on the roof when the sprite changes so spiderman never floats / flickers
	var drawHeight = img.height * this.scale;
	if (this.previousHeight !== undefined && this.previousHeight !== drawHeight && this.onGround) {
		this.y += this.previousHeight - drawHeight;
	}
	this.previousHeight = drawHeight;

	var wasOnGround = this.onGround;
	var fallSpeed = this.velocityY;

	// standing on a moving platform: move with it (before his own motion, so he stays on it)
	var carriedY = 0;
	if (this.onGround && this.groundRoof && this.groundRoof.motion) {
		this.x += this.groundRoof.deltaX;
		this.y += this.groundRoof.deltaY;
		carriedY = this.groundRoof.deltaY;
	}
	// standing on a conveyor belt: the belt pushes him (walking adds his own speed on top, so walking against a
	// slower belt still makes progress). Jumping or walking off a belt keeps the belt's speed until he lands, like
	// stepping off a moving walkway: jumps along a belt go farther, jumps against it are shorter, and a belt that
	// runs faster than he can run cannot be beaten by hopping either
	this.beltX = 0;
	if (this.onGround) {
		if (this.groundRoof && this.groundRoof.conveyor && !this.swinging) {
			this.beltX = this.groundRoof.beltSpeed();
			this.x += this.beltX;
		}
		this.airBeltX = this.beltX;
	} else if (this.airBeltX && !this.swinging) {
		this.beltX = this.airBeltX;
		this.x += this.beltX;
	}

	if (this.swinging) {
		// the pendulum moves him; the velocities are kept so collisions and the release work
		this.updateSwing(leftHeld, rightHeld, img);
	} else {
		// momentum after letting go of a web: carried through the air, air control on top of it
		if (this.momentumX) {
			if (this.onGround) {
				this.momentumX = 0;
			} else {
				var run = this.velocityX;
				if (run * this.momentumX > 0) {
					this.velocityX = (this.momentumX > 0 ? 1 : -1) * Math.max(Math.abs(this.momentumX), Math.abs(run));
				} else if (run * this.momentumX < 0) {
					this.momentumX *= 0.85;
					this.velocityX = run + this.momentumX;
				} else {
					this.velocityX = this.momentumX;
				}
				this.momentumX *= 0.99;
				if (Math.abs(this.momentumX) < 0.3) this.momentumX = 0;
			}
		}

		this.velocityY += this.gravityForce;

		this.y += this.velocityY;
		this.x += this.velocityX;
	}

	// endless run: the world behind the farthest point is only kept for CAMERA.BACKSCROLL pixels.
	// campaign: the stage has fixed bounds
	var minCameraX = game.isCampaign() ? 0 : Math.max(0, game.farthestCameraX - CAMERA.BACKSCROLL);
	var minX = minCameraX;
	var maxX = level ? level.width - this.bodyWidth() : Infinity;
	if (this.x < minX) {
		this.x = minX; // dont allow going further left than the kept world / the stage start
		if (this.velocityX < 0) this.velocityX = 0;
	}
	if (this.x > maxX) {
		this.x = maxX;
		if (this.velocityX > 0) this.velocityX = 0;
	}

	var feetY = this.y + img.height * this.scale + 1;
	// where the feet were before this frame's motion (own velocity + the platform that carried him)
	var fromAbove = { velocityY: this.velocityY, previousFeetY: feetY - this.velocityY - carriedY };

	// what is under / around each foot at the new position (walls are resolved below, in the same frame, so a
	// blocked spiderman never oscillates in and out of a wall)
	var roofLeft = game.isRoofAtPoint(this.x, feetY, fromAbove);
	var roofRight = game.isRoofAtPoint(this.x + this.bodyWidth(), feetY, fromAbove);

	// check if spiderman is standing on the ground (roof). A probe that is deep inside a platform (its top is
	// above spiderman's head) is a wall: walls win over landings, whichever foot found them, so he can never
	// walk into a building while the other foot still stands on the street
	this.onGround = false;
	var self = this;
	function isWall(roof) { return roof && !roof.oneWay && roof.y + self.velocityY <= self.y; }
	var wall = isWall(roofLeft) ? roofLeft : (isWall(roofRight) ? roofRight : null);
	var landing = roofLeft && !isWall(roofLeft) ? roofLeft : (roofRight && !isWall(roofRight) ? roofRight : null);

	// the direction he really moved this frame (his own speed + a conveyor belt): a belt can push him into a wall
	// while he stands still or walks the other way, and he must be pushed out on the side he came from
	var moveX = this.velocityX + this.beltX;
	if (wall) {
		// push him out of the wall precisely (the old "step back" could leave him inside a thin building)
		if (moveX > 0) this.x = Math.min(this.x, wall.x - this.bodyWidth() - 0.01);
		else if (moveX < 0) this.x = Math.max(this.x, wall.x + wall.fullWidth + 0.01);
		else {
			var pushLeft = this.x + this.bodyWidth() - wall.x;
			var pushRight = wall.x + wall.fullWidth - this.x;
			if (pushLeft < pushRight && pushLeft > 0) this.x -= pushLeft + 0.01; else if (pushRight > 0) this.x += pushRight + 0.01;
		}
		this.velocityX = 0;
		if (!this.onGround) this.airBeltX = 0;
		if (this.swinging) this.releaseSwing(false);

		// the other foot may still be on a platform (street next to a building): stay on it
		if (landing) {
			this.y = landing.y - img.height * this.scale;
			this.velocityY = 0;
			this.onGround = true;
			this.removeState("FALL");
			this.momentumX = 0;
		}
	} else if (landing) {
		this.y = landing.y - img.height * this.scale;
		this.velocityY = 0;
		this.onGround = true;
		this.removeState("FALL");
		if (this.swinging) this.releaseSwing(false);
		this.momentumX = 0;
	}
	this.groundRoof = this.onGround ? landing : null;

	// head bumping into the underside of a floating block (underpass ceilings)
	if (this.velocityY < 0 || this.swinging) {
		var ceiling = game.isCeilingAtPoint(this.x + this.bodyWidth() / 2, this.y, this.y + img.height * this.scale);
		if (ceiling) {
			this.y = ceiling.bottom();
			// a tiny downward speed: "velocityY == 0" is what lets a held jump key fire again, and that would
			// pin him to the ceiling
			if (this.velocityY < 0) this.velocityY = 0.5;
			this.removeState("JUMP");
			if (this.swinging) this.releaseSwing(false);
			game.sfx.play("BUMP");
		}
	}

	this.resolveObstacles(img);

	this.updateCamera();

	// landing thud after a real fall
	if (this.onGround && !wasOnGround && fallSpeed > 6) {
		game.sfx.play("LAND");
	}

	this.draw(img);
	this.finishFrame();
}

// camera: follows to the right, and scrolls back when walking left (until the kept world ends).
// done AFTER every collision so a blocked spiderman never makes the camera jitter
SpiderMan.prototype.updateCamera = function() {
	var game = this.game;
	var level = game.level;
	var minCameraX = game.isCampaign() ? 0 : Math.max(0, game.farthestCameraX - CAMERA.BACKSCROLL);
	var leftEdge = CAMERA.LEFT_EDGE;
	var backEdge = CAMERA.LEFT_EDGE - CAMERA.BACK_DEADZONE;
	if (game.isCampaign()) {
		// the zoomed out stage shows more of the world, so spiderman sits a bit further into the screen
		leftEdge = game.viewWidth * CAMPAIGN.CAMERA_ANCHOR;
		backEdge = leftEdge - CAMPAIGN.CAMERA_DEADZONE;
	}
	if (this.x - game.cameraX > leftEdge) {
		game.cameraX = this.x - leftEdge;
	} else if (this.x - game.cameraX < backEdge) {
		// small dead zone: tiny push-backs (walls, sprite size changes) never move the camera
		game.cameraX = Math.max(minCameraX, this.x - backEdge);
	}
	if (game.isCampaign()) game.cameraX = game.clampCameraX(game.cameraX);
	if (game.cameraX > game.farthestCameraX) game.farthestCameraX = game.cameraX;

	// vertical camera (campaign): keep spiderman inside a vertical band of the view, ease toward it
	if (level) {
		var viewH = game.viewHeight;
		var centerY = this.y + this.bodyHeight() / 2;
		var upper = viewH * CAMPAIGN.CAMERA_TOP;
		var lower = viewH * CAMPAIGN.CAMERA_BOTTOM;
		var target = game.cameraY;
		if (centerY - game.cameraY < upper) target = centerY - upper;
		else if (centerY - game.cameraY > lower) target = centerY - lower;
		target = Math.max(level.cameraMinY, Math.min(level.cameraMaxY, target));
		var dy = target - game.cameraY;
		game.cameraY += Math.abs(dy) > 200 ? dy : dy * CAMPAIGN.CAMERA_EASE;
		if (Math.abs(target - game.cameraY) < 0.5) game.cameraY = target;
	} else {
		game.cameraY = 0;
	}
}

SpiderMan.prototype.bodyHeight = function() {
	var img = this.stateImg || this.game.resources.STANDING;
	return img.height * this.scale;
}

SpiderMan.prototype.centerX = function() {
	return this.x + this.bodyWidth() / 2;
}

// timers / counters that tick every frame no matter what spiderman is doing
SpiderMan.prototype.finishFrame = function() {
	this.wasDamagedOnPreviousFrame = false;
	if (this.invulnerableFrames > 0) this.invulnerableFrames--;
	if (this.shootCooldown > 0) this.shootCooldown--;
	this.frame++;
}

/* ---------- climbing ---------- */

// fromTop: grabbed with DOWN while standing at the top of the surface
SpiderMan.prototype.startClimb = function(surface, fromTop) {
	this.airBeltX = 0;
	this.climbing = surface;
	this.swinging = null;
	this.momentumX = 0;
	this.velocityX = 0;
	this.velocityY = 0;
	this.onGround = false;
	this.groundRoof = null;
	this.removeState(["JUMP", "SLIDE", "SHOOT", "RUNNING"]);
	this.scale = this.baseScale;
	this.stateImg = this.game.resources.JUMP;
	this.previousHeight = this.bodyHeight();
	this.climbStepFrames = 0;
	this.slideArmed = false;
	this.runningFrame = 0;

	// center on thin surfaces (ladders, pipes); on wide ones (fences) keep the x
	if (surface.width < this.bodyWidth() + 4) {
		this.x = surface.x + surface.width / 2 - this.bodyWidth() / 2;
	}
	if (fromTop) this.y = surface.top + 8 - this.bodyHeight();

	// which side the wall is on (for the crawl pose): a solid platform right next to the surface wins,
	// otherwise the way he faces
	this.climbSide = surface.facing || null;
	if (!this.climbSide) {
		var roofs = this.game.scene.roofs;
		var midY = (surface.top + surface.bottom) / 2;
		for (var i = 0; i < roofs.length; i++) {
			var r = roofs[i];
			if (r.oneWay || r.y > midY || r.bottom() < midY) continue;
			if (Math.abs(r.x - (surface.x + surface.width)) <= 45) { this.climbSide = DIRECTION.RIGHT; break; }
			if (Math.abs(r.x + r.fullWidth - surface.x) <= 45) { this.climbSide = DIRECTION.LEFT; break; }
		}
		if (!this.climbSide) this.climbSide = this.runningDirection || DIRECTION.RIGHT;
	}
	this.runningDirection = this.climbSide;
	this.game.sfx.play("CLIMB_GRAB");
}

SpiderMan.prototype.updateClimb = function(upHeld, downHeld, leftHeld, rightHeld, pressedJump) {
	var surface = this.climbing;
	var game = this.game;
	var height = this.bodyHeight();
	var moving = false;

	if (pressedJump) {
		// jump away from the surface; a held direction pushes him that way
		this.stopClimb(CLIMB.GRACE);
		this.velocityY = CLIMB.JUMP_OFF_VY;
		if (leftHeld || rightHeld) {
			this.runningDirection = leftHeld ? DIRECTION.LEFT : DIRECTION.RIGHT;
			this.momentumX = this.runningDirection * CLIMB.JUMP_OFF_VX;
		}
		game.sfx.play("JUMP");
		// continue with a normal physics frame so he leaves right away
		this.update();
		return false;
	}

	if (upHeld) {
		this.y -= CLIMB.SPEED;
		moving = true;
		if (this.y + height <= surface.top) {
			// climbed past the top: a small hop gets him onto whatever is up there (or over a fence)
			this.y = surface.top - height;
			this.stopClimb(CLIMB.GRACE);
			this.velocityY = CLIMB.TOP_HOP_VY;
			if (leftHeld || rightHeld) {
				this.runningDirection = leftHeld ? DIRECTION.LEFT : DIRECTION.RIGHT;
				this.momentumX = this.runningDirection * 2.5;
			}
			this.update();
			return false;
		}
	} else if (downHeld) {
		this.y += CLIMB.SPEED;
		moving = true;
		if (this.y + height >= surface.bottom) {
			// reached the bottom: let go and stand / fall
			this.y = surface.bottom - height;
			this.stopClimb(6);
			this.velocityY = 0;
			this.update();
			return false;
		}
	}

	// wide surfaces (fences) allow moving sideways
	if (surface.width >= this.bodyWidth() + 4) {
		if (leftHeld) { this.x = Math.max(surface.x, this.x - CLIMB.SPEED); moving = true; this.runningDirection = DIRECTION.LEFT; }
		if (rightHeld) { this.x = Math.min(surface.x + surface.width - this.bodyWidth(), this.x + CLIMB.SPEED); moving = true; this.runningDirection = DIRECTION.RIGHT; }
	}

	if (moving) {
		this.climbStepFrames++;
		if (this.climbStepFrames % CLIMB.STEP_SOUND_EVERY === 0) game.sfx.play("CLIMB_STEP");
	}

	if (moving) this.climbRestPhase = Math.floor(this.climbStepFrames / 7) % 2;
	this.climbMoving = moving;
	this.stateImg = game.resources.JUMP;
	this.updateCamera();
	this.draw(this.stateImg);
	return true;
}

SpiderMan.prototype.stopClimb = function(grace) {
	this.climbing = null;
	this.grabGrace = grace || 0;
	this.climbMoving = false;
	this.upLatched = true;
}

/* ---------- web swing ---------- */

SpiderMan.prototype.handX = function() { return this.x + this.bodyWidth() / 2; }
SpiderMan.prototype.handY = function() { return this.y + 6; }

SpiderMan.prototype.startSwing = function(anchor) {
	this.airBeltX = 0;
	var dx = this.handX() - anchor.x;
	var dy = this.handY() - anchor.y;
	var length = Math.max(SWING.MIN_LENGTH, Math.min(SWING.MAX_LENGTH, Math.sqrt(dx * dx + dy * dy)));
	var angle = Math.atan2(dx, dy); // 0 = hanging straight down, positive = to the right of the anchor

	// angular speed from his current velocity (tangential component)
	var omega = (this.velocityX * Math.cos(angle) - this.velocityY * Math.sin(angle)) / length;

	// the swing always starts toward the side he faces (no backward wobble), and gets at least the energy
	// to reach SWING.MIN_ANGLE on the far side so a designed gap is always crossed
	var direction = this.runningDirection || DIRECTION.RIGHT;
	if (omega * direction < 0) omega = 0;
	var needed = 2 * this.gravityForce * (Math.cos(angle) - Math.cos(SWING.MIN_ANGLE)) / length;
	var minOmega = needed > 0 ? Math.sqrt(needed) : 0;
	if (Math.abs(omega) < minOmega) omega = direction * minOmega;

	this.swinging = { anchor: anchor, length: length, angle: angle, omega: omega };
	this.momentumX = 0;
	this.removeState(["JUMP", "SLIDE", "SHOOT"]);
	this.game.sfx.play("WEB_ATTACH");
	anchor.flash = 10;
}

SpiderMan.prototype.updateSwing = function(leftHeld, rightHeld, img) {
	var swing = this.swinging;
	var g = this.gravityForce;

	// pendulum step (+ a little pumping when holding a direction)
	swing.omega += -(g / swing.length) * Math.sin(swing.angle);
	if (leftHeld) swing.omega -= SWING.PUMP;
	if (rightHeld) swing.omega += SWING.PUMP;
	swing.angle += swing.omega;
	if (swing.angle > SWING.MAX_ANGLE) { swing.angle = SWING.MAX_ANGLE; swing.omega = 0; }
	if (swing.angle < -SWING.MAX_ANGLE) { swing.angle = -SWING.MAX_ANGLE; swing.omega = 0; }

	var handX = swing.anchor.x + swing.length * Math.sin(swing.angle);
	var handY = swing.anchor.y + swing.length * Math.cos(swing.angle);
	var newX = handX - this.bodyWidth() / 2;
	var newY = handY - 6;

	this.velocityX = newX - this.x;
	this.velocityY = newY - this.y;
	this.x = newX;
	this.y = newY;
	this.runningDirection = this.velocityX > 0.2 ? DIRECTION.RIGHT : (this.velocityX < -0.2 ? DIRECTION.LEFT : this.runningDirection);
}

// boost: true when letting go on purpose (SPACE), false when dropping / colliding
SpiderMan.prototype.releaseSwing = function(boost) {
	if (!this.swinging) return;
	var swing = this.swinging;
	var speed = swing.length * swing.omega;
	var vx = speed * Math.cos(swing.angle);
	var vy = -speed * Math.sin(swing.angle);
	var max = SWING.MAX_RELEASE_SPEED;
	vx = Math.max(-max, Math.min(max, vx));
	vy = Math.max(-max, Math.min(max, vy));

	this.swinging = null;
	this.swingGrace = SWING.GRACE;
	this.momentumX = boost ? vx : vx * 0.5;
	this.velocityX = this.momentumX;
	this.velocityY = boost ? vy + SWING.RELEASE_BOOST_VY : Math.max(0, vy);
	if (boost) this.game.sfx.play("SWING_RELEASE");
}

/* ---------- drawing ---------- */

SpiderMan.prototype.draw = function(img) {
	var ctx = this.ctx;
	var x = Math.round(this.x - this.game.cameraX);
	var y = Math.round(this.y);
	var width = img.width * this.scale;
	var height = img.height * this.scale;

	ctx.save();

	// web line to the anchor while swinging (drawn under the sprite)
	if (this.swinging) {
		var anchor = this.swinging.anchor;
		ctx.strokeStyle = "rgba(244, 244, 244, 0.9)";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(Math.round(anchor.x - this.game.cameraX), Math.round(anchor.y));
		ctx.lineTo(Math.round(this.handX() - this.game.cameraX), Math.round(this.handY()));
		ctx.stroke();
	}

	// soft pulse while in the safe time after a hit (no hard on/off flicker)
	if (this.isInvulnerable() && this.invulnerableFrames < 100000) {
		ctx.globalAlpha = 0.62 + 0.38 * Math.sin(this.frame * 0.45);
	}

	// climbing: the reaching (jump) pose, mirrored every step so the bent leg and the arms alternate sides
	// like a real climb, with a small bob and a lean into the wall
	if (this.climbing) {
		var side = this.climbSide || this.runningDirection || DIRECTION.RIGHT;
		var step = Math.floor(this.climbStepFrames / 7);
		var phase = this.climbMoving ? step % 2 : (this.climbRestPhase || 0);
		var cx = Math.round(this.x + this.bodyWidth() / 2 - this.game.cameraX);
		var cy = Math.round(this.y + height);
		ctx.translate(cx, cy);
		ctx.rotate(side * 0.1);                       // lean toward the wall
		if (phase) ctx.scale(-1, 1);                  // alternate the pose
		var bob = this.climbMoving ? (step % 2 ? -3 : 0) : 0;
		ctx.drawImage(img, -width / 2, -height + bob, width, height);
		if (this.hurtTintFrames > 0) {
			this.hurtTintFrames--;
			this.game.drawTintedSprite(img, -width / 2, -height + bob, width, height, "#ff2020", 0.55);
		}
		ctx.restore();
		return;
	}

	var offsetY = 0;
	if (this.swinging) {
		ctx.translate(Math.round(this.handX() - this.game.cameraX), Math.round(this.handY()));
		ctx.rotate(-this.swinging.angle * 0.5);
		ctx.translate(-Math.round(this.handX() - this.game.cameraX), -Math.round(this.handY()));
	}

	// if the spiderman is running to the left, flip him
	if (this.runningDirection == DIRECTION.LEFT) {
		ctx.scale(-1, 1);
		x *= -1;
		x -= width;
	}

	ctx.drawImage(img, x, y + offsetY, width, height);

	// red tint on the sprite itself for a few frames after being hit
	if (this.hurtTintFrames > 0) {
		this.hurtTintFrames--;
		this.game.drawTintedSprite(img, x, y + offsetY, width, height, "#ff2020", 0.55);
	}
	ctx.restore();
}

function Projectile(game) {
	this.x = 0;
	this.y = 0;

	this.damage = 0;
	this.name = "UNKNOWN";
	// "SPIDERMAN" or "ENEMY": a projectile never hits characters of its own team
	this.team = null;
	this.owner = null;

	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.game = game;
}

Projectile.prototype.update = function() {
}

Projectile.prototype.remove = function() {
	this.game.removeProjectile(this);
}

Projectile.prototype.handleHitWithCharacter = function() {
	this.remove();
}

/* ------------------------------------------------------------------
 * Pickups: coins (score), hearts (health) and web canisters (web fluid)
 * ------------------------------------------------------------------ */

function Pickup(game, opts) {
	opts = opts || {};

	this.game = game;
	this.canvas = game.canvas;
	this.ctx = game.ctx;

	this.type = opts.type || "COIN";
	// world coordinates of the center
	this.x = opts.x || 0;
	this.y = opts.y || 0;
	this.radius = PICKUPS[this.type].RADIUS;
	this.collected = false;

	// random phase so pickups don't all bob in sync
	this.phase = Math.random() * Math.PI * 2;
	this.frame = 0;
}

Pickup.prototype.remove = function() {
	this.game.removePickup(this);
}

// true if the pickup overlaps spiderman's hit box
Pickup.prototype.touchesSpiderman = function() {
	var hitbox = this.game.spiderman.getHitbox();

	// the keycard is an objective, not a coin: grabbed when passing through its column (also mid-jump)
	if (this.type === "KEY") {
		return this.x + 18 > hitbox.left && this.x - 18 < hitbox.right
			&& this.y + 30 > hitbox.top && this.y - 140 < hitbox.bottom;
	}

	return this.x + this.radius > hitbox.left && this.x - this.radius < hitbox.right
		&& this.y + this.radius > hitbox.top && this.y - this.radius < hitbox.bottom;
}

// applies the pickup; returns false when it could not be used (e.g. health already full)
Pickup.prototype.collect = function() {
	var spiderman = this.game.spiderman;
	var game = this.game;

	if (this.type === "COIN") {
		game.coins++;
		game.coinPulse = 10;
		game.sfx.play("COIN");
		game.addScore(SCORING.COIN, "coins");
		game.addFloatingText("+" + SCORING.COIN, this.x, this.y - this.radius, "#ffd83d");
	} else if (this.type === "HEALTH") {
		if (spiderman.health >= spiderman.maxHealth) {
			game.addFloatingText("FULL", this.x, this.y - this.radius, "#ff8080", true);
			game.sfx.play("DENY");
			return false;
		}
		spiderman.addHealth(PICKUPS.HEALTH.AMOUNT);
		game.sfx.play("PICKUP");
		game.addFloatingText("+" + PICKUPS.HEALTH.AMOUNT + " HP", this.x, this.y - this.radius, "#ff5a5a");
	} else if (this.type === "WEB") {
		if (spiderman.web >= spiderman.maxWeb) {
			game.addFloatingText("FULL", this.x, this.y - this.radius, "#9ec3ff", true);
			game.sfx.play("DENY");
			return false;
		}
		spiderman.addWeb(PICKUPS.WEB.AMOUNT);
		game.sfx.play("PICKUP");
		game.addFloatingText("+" + PICKUPS.WEB.AMOUNT + " WEB", this.x, this.y - this.radius, "#7fb2ff");
	} else if (this.type === "KEY") {
		if (game.level) game.level.keys[this.keyId || "KEY"] = true;
		game.sfx.play("KEY");
		game.addFloatingText((this.label || "KEYCARD") + "!", this.x, this.y - this.radius, "#ffd83d");
		game.keyPulse = 40;
	}

	this.collected = true;
	if (game.level && this.levelId !== undefined) game.level.collected[this.levelId] = true;
	this.remove();
	return true;
}

Pickup.prototype.update = function() {
	var ctx = this.ctx;
	var t = this.frame + this.phase * 60;
	var bob = Math.sin(t * 0.08) * 3;
	var x = this.x - this.game.cameraX;
	var y = this.y + bob;

	if (this.type === "COIN") {
		// spinning coin: three pixel frames (wide, narrow, edge)
		var spin = Math.floor(t / 7) % 4;
		var frame = spin === 3 ? 1 : spin;
		var name = "COIN_" + frame;
		PixelArt.draw(ctx, name, x - PixelArt.width(name) / 2, y - PixelArt.height(name) / 2);
	} else if (this.type === "KEY") {
		// the key item glints
		var keySprite = this.sprite || "KEYCARD";
		PixelArt.draw(ctx, keySprite, x - PixelArt.width(keySprite) / 2, y - PixelArt.height(keySprite) / 2);
		if (Math.floor(t / 10) % 6 === 0) PixelArt.rect(ctx, "#f4f4f4", x + 5, y - 7.5, 2.5, 2.5);
	} else {
		var isHealth = this.type === "HEALTH";
		var sprite = isHealth ? "HEART" : "WEB_CAN";
		// small pulse ring behind the icon so it reads as a pickup
		var pulse = Math.floor(t / 12) % 2 === 0;
		if (pulse) {
			PixelArt.rect(ctx, isHealth ? "rgba(255, 90, 90, 0.25)" : "rgba(127, 178, 255, 0.25)", x - 15, y - 15, 30, 30);
		}
		PixelArt.draw(ctx, sprite, x - PixelArt.width(sprite) / 2, y - PixelArt.height(sprite) / 2);
	}

	if (this.touchCooldown > 0) {
		this.touchCooldown--;
	} else if (!this.collected && this.touchesSpiderman()) {
		if (this.collect()) return;

		// pickup could not be used (full): keep it but don't spam the "FULL" text every frame
		this.touchCooldown = 60;
	}

	this.frame++;
}

/* ------------------------------------------------------------------
 * Floating score / pickup texts (small feedback that drifts upward)
 * ------------------------------------------------------------------ */

function FloatingText(game, text, x, y, color, small) {
	this.game = game;
	this.ctx = game.ctx;
	this.text = text;
	this.x = x;
	this.y = y;
	this.color = color || "white";
	this.small = !!small;
	this.life = 45;
	this.maxLife = 45;
}

FloatingText.prototype.update = function() {
	var ctx = this.ctx;
	var alpha = Math.max(0, this.life / this.maxLife);

	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.fillStyle = this.color;
	ctx.font = (this.small ? "9px" : "12px") + " SpidermanGamePixelFont, Monospace, Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillText(this.text, this.x - this.game.cameraX, this.y);
	ctx.restore();

	this.y -= 0.7;
	this.life--;

	if (this.life <= 0) this.game.removeFloatingText(this);
}

/* ------------------------------------------------------------------
 * Rooftop props: decoration (water tanks, chimneys, antennas, ...)
 * and solid obstacles (crates, AC units) that block the way and can
 * be jumped on. Everything is drawn with canvas primitives.
 * ------------------------------------------------------------------ */

// every prop is a pixel sprite (see PIXEL_SPRITES); sizes come from the sprite. "sprite" = the sprite to draw,
// "stack" = draw it this many times on top of each other, "solid" = blocks / can be stood on
var PROP_TYPES = {
	WATER_TANK: { sprite: "WATER_TANK", solid: false },
	CHIMNEY:    { sprite: "CHIMNEY", solid: false },
	ANTENNA:    { sprite: "ANTENNA", solid: false },
	VENT:       { sprite: "VENT", solid: false },
	DOOR:       { sprite: "DOOR", solid: false },
	BILLBOARD:  { sprite: "BILLBOARD", solid: false },
	CRATE:      { sprite: "CRATE", solid: true },
	CRATE_STACK:{ sprite: "CRATE", stack: 2, solid: true },
	AC_UNIT:    { sprite: "AC_UNIT", solid: true },
	// street
	DUMPSTER:   { sprite: "DUMPSTER", solid: true },
	FENCE_LOW:  { sprite: "FENCE_LOW", solid: true },
	BARRIER:    { sprite: "BARRIER", solid: true },
	HYDRANT:    { sprite: "HYDRANT", solid: false },
	LAMP_POST:  { sprite: "LAMP_POST", solid: false },
	TRASH_CAN:  { sprite: "TRASH_CAN", solid: false },
	MAILBOX:    { sprite: "MAILBOX", solid: false },
	BENCH:      { sprite: "BENCH", solid: false },
	STREET_SIGN:{ sprite: "STREET_SIGN", solid: false },
	// construction site
	CONE:       { sprite: "CONE", solid: false },
	WARNING_SIGN:{ sprite: "WARNING_SIGN", solid: false },
	SANDBAGS:   { sprite: "SANDBAGS", solid: true },
	PALLET:     { sprite: "PALLET", solid: true },
	SPOOL:      { sprite: "SPOOL", solid: true },
	// industrial district
	BARREL:     { sprite: "BARREL", solid: true },      // 27.5 px: a low obstacle to jump, not cover (webs and knives fly over it)
	GAS_TANK:   { sprite: "GAS_TANK", solid: false },
	// research labs (decoration)
	SPECIMEN_TANK:{ sprite: "SPECIMEN_TANK", solid: false },
	CONSOLE:    { sprite: "CONSOLE", solid: false },
	SERVER_RACK:{ sprite: "SERVER_RACK", solid: false },
	LAB_BENCH:  { sprite: "LAB_BENCH", solid: false },
	// oscorp tower (decoration)
	PLANT:      { sprite: "PLANT", solid: false },
	DESK:       { sprite: "DESK", solid: false },
	HELIPAD:    { sprite: "HELIPAD", solid: false },
	// harbour (decoration)
	BOLLARD:    { sprite: "BOLLARD", solid: false },
	LIFEBUOY:   { sprite: "LIFEBUOY", solid: false },
	ROPE_COIL:  { sprite: "ROPE_COIL", solid: false },
};

for (var propName in PROP_TYPES) {
	var propDef = PROP_TYPES[propName];
	propDef.width = PIXEL_SPRITES[propDef.sprite][0].length * PIXEL;
	propDef.height = PIXEL_SPRITES[propDef.sprite].length * PIXEL * (propDef.stack || 1);
}

var PROPS = {
	DECOR_MIN: 1,
	DECOR_MAX: 3,
	OBSTACLE_CHANCE: 0.5,        // chance that a roof has solid obstacles at all
	OBSTACLE_MAX: 2,
	EDGE_MARGIN: 70,             // keep props away from the roof edges (landing / take off zones)
	ENEMY_CLEARANCE: 90,         // and away from the enemy's spot
	SPACING: 60,                 // minimum distance between two props
};

function RoofProp(game, roof, type, x) {
	var def = PROP_TYPES[type];

	this.game = game;
	this.ctx = game.ctx;
	this.roof = roof;
	this.type = type;
	this.width = def.width;
	this.height = def.height;
	this.solid = def.solid;

	// world coordinates: x is the left edge, the prop stands on the roof top
	this.x = x;
	this.y = roof.y - this.height;
	this.seed = Math.random();
}

RoofProp.prototype.left = function() { return this.x; }
RoofProp.prototype.right = function() { return this.x + this.width; }
RoofProp.prototype.top = function() { return this.y; }
RoofProp.prototype.bottom = function() { return this.y + this.height; }

RoofProp.prototype.draw = function(frame) {
	var ctx = this.ctx;
	var def = PROP_TYPES[this.type];
	var x = this.x - this.game.cameraX;
	var y = this.y;
	var stack = def.stack || 1;
	var spriteHeight = PixelArt.height(def.sprite);

	for (var i = 0; i < stack; i++) {
		PixelArt.draw(ctx, def.sprite, x, y + i * spriteHeight);
	}

	// little animations on top of the static sprites
	switch (this.type) {
		case "CHIMNEY":
			// lazy smoke puffs
			ctx.save();
			ctx.fillStyle = "rgba(200, 200, 210, 0.35)";
			for (var k = 0; k < 3; k++) {
				var t = (frame / 40 + k * 0.33 + this.seed) % 1;
				var size = 2.5 + Math.floor(t * 3) * 2.5;
				PixelArt.rect(ctx, "rgba(200, 200, 210, 0.35)", x + this.width / 2 - size / 2 + Math.round(Math.sin((t + k) * 6) * 2) * 2.5, y - 5 - t * 26, size, size);
			}
			ctx.restore();
			break;
		case "SPECIMEN_TANK":
			// bubbles rising through the green liquid, a faint glow around the glass
			ctx.save();
			ctx.globalAlpha = 0.12 + (Math.floor(frame / 20) % 2) * 0.04;
			ctx.fillStyle = "#7dffb0";
			ctx.fillRect(Math.round(x - 5), Math.round(y + 5), Math.round(this.width + 10), Math.round(this.height - 15));
			ctx.restore();
			for (var bb = 0; bb < 3; bb++) {
				var bt = (frame / 70 + bb * 0.37 + this.seed) % 1;
				PixelArt.rect(ctx, "#e8f7ff", x + 7.5 + ((bb * 5 + Math.floor(bt * 4)) % 4) * 2.5 + bb * 2.5, y + 40 - bt * 30, 2.5, 2.5);
			}
			break;
		case "CONSOLE":
			// scrolling lines on the screen
			var line = Math.floor(frame / 12) % 4;
			PixelArt.rect(ctx, "#49b6ff", x + 7.5 + (line % 2) * 5, y + 5 + line * 2.5, 10, 2.5);
			break;
		case "SERVER_RACK":
			// blinking drive lights
			for (var led = 0; led < 8; led++) {
				if ((Math.floor(frame / 9) + led * 3 + Math.floor(this.seed * 10)) % 4 === 0) PixelArt.rect(ctx, "#ffd83d", x + 17.5, y + 5 + led * 5, 2.5, 2.5);
			}
			break;
		case "AC_UNIT":
			// spinning fan: a rotating pixel bar over the grille
			var fx = x + 12.5, fy = y + 15;
			var phase = Math.floor(frame / 4) % 4;
			if (phase === 0 || phase === 2) PixelArt.rect(ctx, "#2a2a33", fx - 7.5, fy - 1.25, 15, 2.5);
			else PixelArt.rect(ctx, "#2a2a33", fx - 1.25, fy - 7.5, 2.5, 15);
			break;
		case "LAMP_POST":
			// warm glow under the lamp head
			ctx.save();
			ctx.globalAlpha = 0.08 + (Math.floor(frame / 30) % 2) * 0.02;
			ctx.fillStyle = "#ffd83d";
			ctx.fillRect(Math.round(x - 20), Math.round(y + 10), 55, 60);
			ctx.restore();
			break;
		case "ANTENNA":
			// blinking tip
			if (Math.floor(frame / 20) % 2 === 0) PixelArt.rect(ctx, "#e3201b", x + 7.5, y, 2.5, 2.5);
			break;
	}
}

// the building image: the roof top texture is ROOF_TILE_WIDTH wide, followed by a 15 px right edge cap
var ROOF_TILE_WIDTH = 829;

// opts (campaign stages): { width, height, fixed: true } gives a roof with exactly these sizes and nothing on it;
// { width, top, bottom, style, oneWay } places a platform at explicit world heights:
//   style "BUILDING" (brick building, default), "STREET" (sidewalk + road), "LEDGE" (thin concrete slab),
//   "BLOCK" (floating brick block, e.g. the ceiling of an underpass); oneWay = can be jumped through from below.
// Without opts (endless run) the roof is random and populates itself with an enemy, props and pickups
function Roof(game, x, opts) {
	opts = opts || {};

	this.game = game;
	this.canvas = game.canvas;
	this.ctx = game.ctx;

	this.width = opts.width || Math.round(Math.random() * (this.game.resources.BUILDING.width - 200)) + 200;
	this.fixed = !!opts.fixed;
	this.style = opts.style || "BUILDING";
	this.oneWay = !!opts.oneWay;
	this.storefront = !!opts.storefront; // draw the shop front of the building image at the bottom (stands on a street)

	if (opts.top !== undefined) {
		this.y = opts.top;
		this.height = (opts.bottom !== undefined ? opts.bottom : this.game.viewHeight) - opts.top;
	} else {
		this.height = opts.height || Math.round(Math.random() * 50) + 100;
		this.y = this.game.viewHeight - this.height;
	}
	// the right end cap of the roof top only exists on buildings (streets / ledges are flat)
	this.capWidth = this.style === "BUILDING" || this.style === "BLOCK" ? 15 : 0;
	this.fullWidth = this.width + this.capWidth;

	this.x = x || 0;
	this.tag = opts.tag || null;
	this.label = opts.label || null;   // ship hulls: the name painted on the side
	this.frameTo = opts.frameTo; // scaffolds / slabs: draw their posts down to this y
	this.color = opts.color || null;

	// mysterio's tricks: a phantom platform looks solid but has no collision (it shimmers now and then);
	// a crumbling platform shakes and drops away shortly after someone stands on it, then comes back
	this.phantom = !!opts.phantom;
	this.crumble = !!opts.crumble;

	// hanging cargo (harbour): hangs from a crane until its marked rope is cut with a web, then drops to drop.to
	// and becomes a normal platform. { id, to, pulleyY, state: "HANGING" | "FALLING" | "DOWN", speed }
	this.drop = opts.drop || null;
	this.crumbleState = "SOLID"; // SOLID -> SHAKING -> GONE -> SOLID
	this.crumbleFrames = 0;

	// moving platforms (lifts, crane girders): { axis: "x" | "y", from, to, speed, wait }
	// A platform with a powerId only moves once the stage powers it (all switches wired to that id are on)
	this.motion = opts.motion || null;
	this.powerId = opts.powerId || null;
	this.powered = !opts.powerId;
	this.deltaX = 0;
	this.deltaY = 0;
	if (this.motion) {
		this.motion.direction = this.motion.direction || 1;
		this.motion.waitFrames = 0;
		this.motion.wait = this.motion.wait !== undefined ? this.motion.wait : 50;
		if (this.motion.axis === "y") this.y = this.motion.from; else if (this.motion.axis === "x") this.x = this.motion.from;
	}

	// conveyor belts (campaign): whoever stands on the belt is moved by beltSpeed() world px per frame (+ right,
	// - left). With a powerId the belt runs at "speed" until the stage powers that id, then at "poweredSpeed"
	// (a switch can start, stop or reverse it)
	this.conveyor = opts.conveyor ? { speed: opts.conveyor.speed || 0, poweredSpeed: opts.conveyor.poweredSpeed, scroll: 0 } : null;

	this.enemy = null;   // first enemy on this roof (props / pickups keep clear of it)
	this.enemies = [];
	this.pickups = [];
	this.props = [];

	if (this.fixed) return;

	var roofs = this.game.scene.roofs;
	var previousRoof = roofs[roofs.length - 1] || null;

	this.spawnEnemy();
	this.spawnProps();
	this.spawnPickups(previousRoof);
}

// places an enemy ("THUG" / "VENOM" / "GOBLIN") standing on this roof, centered on world x
Roof.prototype.addEnemy = function(type, centerX, opts) {
	opts = opts || {};
	opts.roof = this;
	opts.x = centerX;

	var enemy;
	if (type === "VENOM") {
		enemy = new Venom(this.game, opts);
	} else if (type === "GOBLIN") {
		enemy = new Goblin(this.game, opts);
	} else {
		enemy = new Enemy(this.game, opts);
	}

	enemy.x = centerX - enemy.stateImg.width * enemy.scale / 2;
	enemy.y = this.y - 1 - enemy.stateImg.height * enemy.scale;
	enemy.placeOnRoof(this);

	if (type === "GOBLIN") {
		// glide around the requested spot instead of the roof center
		enemy.anchorX = centerX - enemy.width() / 2;
		var room = Math.min(enemy.anchorX - this.x, this.x + this.width - enemy.width() - enemy.anchorX);
		enemy.patrolRange = Math.max(20, Math.min(enemy.patrolRange, room));
		// campaign stages may keep a goblin's patrol small (opts.range), e.g. away from a checkpoint
		if (opts.range) enemy.patrolRange = Math.max(20, Math.min(enemy.patrolRange, opts.range));
		enemy.x = enemy.anchorX;
	}

	this.game.addEnemy(enemy);
	this.enemies.push(enemy);
	if (!this.enemy) this.enemy = enemy;
	return enemy;
}

// a prop (see PROP_TYPES) standing on the roof with its left edge at world x
Roof.prototype.addProp = function(type, x) {
	if (!PROP_TYPES[type]) return null;
	var prop = new RoofProp(this.game, this, type, x);
	this.props.push(prop);
	return prop;
}

// a pickup ("COIN" / "HEALTH" / "WEB") centered at world x / y
Roof.prototype.addPickup = function(type, x, y) {
	var pickup = new Pickup(this.game, { type: type, x: x, y: y });
	this.game.addPickup(pickup);
	this.pickups.push(pickup);
	return pickup;
}

// decoration and solid obstacles on the roof top
Roof.prototype.spawnProps = function() {
	var self = this;
	var enemyX = this.enemy ? this.enemy.centerX() : null;
	var isVenomRoof = this.enemy && this.enemy.name === "VENOM";
	var minX = this.x + PROPS.EDGE_MARGIN;
	var maxX = this.x + this.width - PROPS.EDGE_MARGIN;

	function fits(x, width) {
		if (x < minX || x + width > maxX) return false;
		if (enemyX !== null && x + width > enemyX - PROPS.ENEMY_CLEARANCE && x < enemyX + PROPS.ENEMY_CLEARANCE) return false;
		for (var i = 0; i < self.props.length; i++) {
			var other = self.props[i];
			if (x < other.right() + PROPS.SPACING && x + width > other.left() - PROPS.SPACING) return false;
		}
		return true;
	}

	function place(type) {
		var width = PROP_TYPES[type].width;
		for (var attempt = 0; attempt < 8; attempt++) {
			var x = Math.round(minX + Math.random() * Math.max(0, maxX - minX - width));
			if (fits(x, width)) {
				var prop = new RoofProp(self.game, self, type, x);
				self.props.push(prop);
				return prop;
			}
		}
		return null;
	}

	var decorTypes = ["WATER_TANK", "CHIMNEY", "ANTENNA", "VENT", "DOOR", "BILLBOARD"];
	var obstacleTypes = ["CRATE", "CRATE_STACK", "AC_UNIT"];

	// solid obstacles (not on the first roof, not where venom runs around)
	if (this.x > 0 && !isVenomRoof && Math.random() < PROPS.OBSTACLE_CHANCE) {
		var count = 1 + Math.floor(Math.random() * PROPS.OBSTACLE_MAX);
		for (var o = 0; o < count; o++) {
			place(obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]);
		}
	}

	var decorCount = PROPS.DECOR_MIN + Math.floor(Math.random() * (PROPS.DECOR_MAX - PROPS.DECOR_MIN + 1));
	for (var d = 0; d < decorCount; d++) {
		place(decorTypes[Math.floor(Math.random() * decorTypes.length)]);
	}
}

Roof.prototype.bottom = function() {
	return this.y + this.height;
}

// true while the platform can be stood on / blocks (phantoms never do, crumbled ones are gone)
Roof.prototype.isSolid = function() {
	if (this.phantom) return false;
	if (this.drop && this.drop.state !== "DOWN") return false;   // swinging on its rope: nothing to stand on
	if (this.crumble && this.crumbleState === "GONE") return false;
	return true;
}

// crumbling platforms: called every frame; "stood" = spiderman is standing on it right now
Roof.prototype.updateCrumble = function(stood) {
	if (!this.crumble) return;
	if (this.crumbleState === "SOLID") {
		if (stood) { this.crumbleState = "SHAKING"; this.crumbleFrames = 22; this.game.sfx.play("CRUMBLE"); }
	} else if (this.crumbleState === "SHAKING") {
		this.crumbleFrames--;
		if (this.crumbleFrames <= 0) { this.crumbleState = "GONE"; this.crumbleFrames = 170; }
	} else if (this.crumbleState === "GONE") {
		this.crumbleFrames--;
		if (this.crumbleFrames <= 0) this.crumbleState = "SOLID";
	}
}

// moving platforms: one step along the track, remembering how far it moved so riders can follow
Roof.prototype.move = function() {
	this.deltaX = 0;
	this.deltaY = 0;
	var m = this.motion;
	if (!m || !this.powered) return;

	// a raft floats on its pool's surface (and rests on the pool's floor once it is drained)
	if (m.axis === "float") {
		var pool = this.game.level ? this.game.level.poolById(m.pool) : null;
		if (!pool) return;
		var target = Math.min(pool.level - m.offset, pool.bottom - this.height);
		this.deltaY = target - this.y;
		this.y = target;
		return;
	}

	if (m.waitFrames > 0) { m.waitFrames--; return; }

	var low = Math.min(m.from, m.to), high = Math.max(m.from, m.to);
	var current = m.axis === "y" ? this.y : this.x;
	var next = current + m.direction * m.speed;
	if (next >= high) { next = high; m.direction = -1; m.waitFrames = m.wait; }
	if (next <= low) { next = low; m.direction = 1; m.waitFrames = m.wait; }

	if (m.axis === "y") { this.deltaY = next - this.y; this.y = next; }
	else { this.deltaX = next - this.x; this.x = next; }
}

// conveyor belts: how far the belt moves whoever stands on it this frame (0 for every other platform)
Roof.prototype.beltSpeed = function() {
	var belt = this.conveyor;
	if (!belt) return 0;
	if (this.powerId && this.powered && belt.poweredSpeed !== undefined) return belt.poweredSpeed;
	return belt.speed;
}

Roof.prototype.obstacles = function() {
	var solid = [];
	for (var i = 0; i < this.props.length; i++) if (this.props[i].solid) solid.push(this.props[i]);
	return solid;
}

// places coins / hearts / web canisters on (and in front of) this roof
Roof.prototype.spawnPickups = function(previousRoof) {
	var game = this.game;
	var isFirstRoof = this.x <= 0;
	var enemyX = this.enemy ? this.enemy.centerX() : null;
	var self = this;

	function add(type, x, y) {
		var pickup = new Pickup(game, { type: type, x: x, y: y });
		game.addPickup(pickup);
		self.pickups.push(pickup);
		return pickup;
	}

	var obstacles = this.obstacles();

	// a spot is free when it's not right where the enemy stands or inside a solid obstacle
	function isClear(x) {
		if (enemyX !== null && Math.abs(x - enemyX) < PICKUPS.ENEMY_CLEARANCE) return false;
		for (var i = 0; i < obstacles.length; i++) {
			if (x > obstacles[i].left() - 16 && x < obstacles[i].right() + 16) return false;
		}
		return true;
	}

	// ---- coins: a row on the roof (the first roof always gets one, to show what they are) ----
	if (isFirstRoof || Math.random() < PICKUPS.COIN_ROW_CHANCE) {
		var count = PICKUPS.COIN_ROW_MIN + Math.floor(Math.random() * (PICKUPS.COIN_ROW_MAX - PICKUPS.COIN_ROW_MIN + 1));
		var rowWidth = (count - 1) * PICKUPS.COIN_SPACING;
		var high = !isFirstRoof && Math.random() < PICKUPS.COIN_HIGH_ROW_CHANCE;
		var y = this.y - (high ? 125 : 30);

		var minStart = this.x + 40;
		var maxStart = this.x + this.width - 40 - rowWidth;
		var start;
		if (enemyX !== null && !high) {
			// keep ground rows on the side the player arrives from, away from the enemy
			maxStart = Math.min(maxStart, enemyX - PICKUPS.ENEMY_CLEARANCE - rowWidth);
			start = minStart + Math.random() * Math.max(0, maxStart - minStart);
		} else {
			start = minStart + Math.random() * Math.max(0, maxStart - minStart);
		}

		if (maxStart >= minStart) {
			for (var i = 0; i < count; i++) {
				var coinX = Math.round(start + i * PICKUPS.COIN_SPACING);
				// ground coins skip the spots taken by obstacles; high rows float above them anyway
				if (high || isClear(coinX)) add("COIN", coinX, y);
			}
		}
	}

	// ---- coins arcing over the gap in front of this roof ----
	if (previousRoof && Math.random() < PICKUPS.COIN_GAP_ARC_CHANCE) {
		var gapStart = previousRoof.x + previousRoof.fullWidth;
		var gapEnd = this.x;
		var gap = gapEnd - gapStart;
		if (gap > 60) {
			var baseY = Math.min(previousRoof.y, this.y) - 75;
			add("COIN", Math.round(gapStart + gap * 0.25), baseY);
			add("COIN", Math.round(gapStart + gap * 0.5), baseY - 22);
			add("COIN", Math.round(gapStart + gap * 0.75), baseY);
		}
	}

	if (isFirstRoof) return;

	// ---- health / web: at most one per roof, spaced out along the run ----
	var spotA = this.x + this.width * 0.25;
	var spotB = this.x + this.width * 0.75;
	var spot = isClear(spotB) ? spotB : (isClear(spotA) ? spotA : null);
	if (spot === null) return;

	var healthAllowed = this.x - game.lastHealthPickupX >= PICKUPS.HEALTH_MIN_DISTANCE;
	var webAllowed = this.x - game.lastWebPickupX >= PICKUPS.WEB_MIN_DISTANCE;

	if (healthAllowed && Math.random() < PICKUPS.HEALTH_CHANCE) {
		add("HEALTH", Math.round(spot), this.y - 32);
		game.lastHealthPickupX = this.x;
	} else if (webAllowed && Math.random() < PICKUPS.WEB_CHANCE) {
		add("WEB", Math.round(spot), this.y - 32);
		game.lastWebPickupX = this.x;
	}
}

// decides if and which enemy lives on this roof, based on how far the player has travelled
Roof.prototype.spawnEnemy = function() {
	var roofs = this.game.scene.roofs;
	var previousRoof = roofs[roofs.length - 1] || null;

	// the very first roof is always a safe starting spot
	if (this.x <= 0) return;

	var distance = this.x;
	var chance = SPAWN.BASE_CHANCE + Math.min(SPAWN.MAX_CHANCE - SPAWN.BASE_CHANCE, distance / SPAWN.CHANCE_RAMP_DISTANCE * 0.1);
	// keep breathing room: a roof right after an occupied roof is less likely to be occupied
	if (previousRoof && previousRoof.enemy) chance -= SPAWN.CONSECUTIVE_PENALTY;

	if (Math.random() >= chance) return;

	var type = this.pickEnemyType(distance);
	var roofCenter = this.x + this.width / 2;

	if (type === "GOBLIN") {
		// the goblin patrols the whole roof (addEnemy narrows the patrol around a spot)
		var goblin = this.addEnemy(type, roofCenter);
		goblin.placeOnRoof(this);
		return;
	}
	this.addEnemy(type, roofCenter);
}

// weighted pick: thugs from the start, venom and goblin join the run as the player gets farther
Roof.prototype.pickEnemyType = function(distance) {
	var weights = {
		THUG: SPAWN.THUG_WEIGHT,
		VENOM: 0,
		GOBLIN: 0,
	};

	if (distance >= SPAWN.VENOM_DISTANCE && this.width >= SPAWN.VENOM_MIN_ROOF_WIDTH) {
		weights.VENOM = Math.min(SPAWN.VENOM_MAX_WEIGHT, SPAWN.VENOM_START_WEIGHT + (distance - SPAWN.VENOM_DISTANCE) / SPAWN.WEIGHT_RAMP_DISTANCE);
	}
	if (distance >= SPAWN.GOBLIN_DISTANCE) {
		weights.GOBLIN = Math.min(SPAWN.GOBLIN_MAX_WEIGHT, SPAWN.GOBLIN_START_WEIGHT + (distance - SPAWN.GOBLIN_DISTANCE) / SPAWN.WEIGHT_RAMP_DISTANCE);
	}

	var total = weights.THUG + weights.VENOM + weights.GOBLIN;
	var roll = Math.random() * total;

	if (roll < weights.VENOM) return "VENOM";
	if (roll < weights.VENOM + weights.GOBLIN) return "GOBLIN";
	return "THUG";
}

Roof.prototype.update = function() {
	var renderX = Math.round(this.x - this.game.cameraX);
	var viewWidth = this.game.viewWidth;

	// nothing to draw when the whole roof is outside the view (campaign stages keep every roof alive)
	if (renderX + this.fullWidth < 0 || renderX > viewWidth) return;

	if (this.crumble) {
		this.updateCrumble(this.game.spiderman.onGround && this.game.spiderman.groundRoof === this);
		if (this.crumbleState === "GONE") {
			// a few falling bits right after it gave way
			if (this.crumbleFrames > 150) {
				var drop = (170 - this.crumbleFrames) * 4;
				for (var bx = 10; bx < this.fullWidth; bx += 35) PixelArt.rect(this.ctx, "#5f666d", renderX + bx, this.y + drop + (bx % 3) * 6, 10, 5);
			}
			return;
		}
		if (this.crumbleState === "SHAKING") renderX += (this.crumbleFrames % 2 === 0 ? 2 : -2);
	}

	switch (this.style) {
		case "STREET": this.drawStreet(renderX); break;
		case "DIRT": this.drawDirt(renderX); break;
		case "LEDGE": this.drawLedge(renderX); break;
		case "SCAFFOLD": this.drawScaffold(renderX); break;
		case "SLAB": this.drawSlab(renderX); break;
		case "BEAM": this.drawBeam(renderX); break;
		case "CONCRETE": this.drawConcrete(renderX); break;
		case "LIFT": this.drawLift(renderX); break;
		case "GIRDER": this.drawGirder(renderX); break;
		case "CONTAINER": this.drawContainer(renderX); break;
		case "FLOOR": this.drawFloor(renderX); break;
		case "PANEL": this.drawPanel(renderX); break;
		case "CONVEYOR": this.drawConveyor(renderX); break;
		case "PIPELINE": this.drawPipeline(renderX); break;
		case "FACTORY": this.drawFactory(renderX); break;
		case "LABFLOOR": this.drawLabFloor(renderX); break;
		case "GLASS": this.drawGlass(renderX); break;
		case "HOVER": this.drawHover(renderX); break;
		case "GONDOLA": this.drawGondola(renderX); break;
		case "ELEVATOR": this.drawElevator(renderX); break;
		case "QUAY": this.drawQuay(renderX); break;
		case "PIER": this.drawPier(renderX); break;
		case "HULL": this.drawHull(renderX); break;
		case "DECK": this.drawDeck(renderX); break;
		case "CABIN": this.drawCabin(renderX); break;
		case "PALLET": this.drawPallet(renderX); break;
		case "BRICK": this.drawBrick(renderX); break;
		case "GRATE": this.drawGrate(renderX); break;
		case "RAFT": this.drawRaft(renderX); break;
		case "STATION": this.drawStation(renderX); break;
		case "SAND": this.drawSand(renderX); break;
		case "MACHINE": this.drawMachine(renderX); break;
		default: this.drawBuilding(renderX); break;
	}

	// a phantom platform gives itself away with a short burst of green static every couple of seconds
	if (this.phantom) {
		var t = (this.game.frame + Math.round(this.x)) % 150;
		if (t < 14) {
			var ctx = this.ctx;
			ctx.save();
			ctx.globalAlpha = 0.35;
			for (var sy = 0; sy < this.height; sy += 10) {
				if ((Math.floor(sy / 10) + t) % 3 === 0) PixelArt.rect(ctx, "#7dffb0", renderX, this.y + sy, this.fullWidth, 5);
			}
			ctx.restore();
		}
	}

	for (var p = 0; p < this.props.length; p++) {
		var prop = this.props[p];
		var propX = prop.x - this.game.cameraX;
		if (propX + prop.width >= 0 && propX <= viewWidth) prop.draw(this.game.frame);
	}
}

// the building image, tiled horizontally (and vertically for tall buildings: ledge + top floor, repeated
// window floors, and the shop front at the bottom when the building stands on a street)
var BUILDING_TOP_BAND = 170;     // source rows 0..170: roof ledge + arched top floor
var BUILDING_MID_BAND = 300;     // source rows 170..470: two floors of big windows (repeatable)
var BUILDING_SHOP_BAND = 203;    // source rows 470..673: shop front

Roof.prototype.drawBuilding = function(renderX) {
	var ctx = this.ctx;
	var roof = this.game.resources.BUILDING;
	var y = Math.round(this.y);
	var height = Math.round(this.height);

	// a passage through a floating block: dark back wall down to the street behind it
	if (this.style === "BLOCK" && this.game.level) {
		var floorY = this.game.level.floorY;
		if (floorY > y + height) {
			PixelArt.rect(ctx, "#15151c", renderX, y + height, this.fullWidth, floorY - (y + height));
			for (var wy = y + height + 10; wy < floorY - 5; wy += 20) {
				for (var wx = ((wy / 20) % 2) * 20; wx < this.fullWidth - 10; wx += 40) PixelArt.rect(ctx, "#1f1f28", renderX + wx, wy, 20, 7.5);
			}
		}
	}

	// vertical bands: [sourceY, sourceHeight, destY]
	var bands = [];
	var ledge = 26; // roof ledge strip at the top of the image
	if (height <= roof.height && !this.storefront) {
		bands.push([0, height, 0]);
	} else if (this.storefront && height < ledge + BUILDING_SHOP_BAND) {
		// short shop: the roof ledge, then the bottom part of the shop front
		bands.push([0, ledge, 0]);
		bands.push([roof.height - (height - ledge), height - ledge, ledge]);
	} else {
		var shop = this.storefront ? BUILDING_SHOP_BAND : 0;
		var top = Math.min(BUILDING_TOP_BAND, height - shop);
		bands.push([0, top, 0]);
		var filled = top;
		var middle = height - shop;
		while (filled < middle) {
			var chunk = Math.min(BUILDING_MID_BAND, middle - filled);
			bands.push([BUILDING_TOP_BAND, chunk, filled]);
			filled += chunk;
		}
		if (shop > 0) bands.push([roof.height - shop, shop, height - shop]);
	}

	// the texture is tiled horizontally so roofs wider than the image still look right (later tiles skip
	// the image's dark left border so no seam shows up in the middle of a roof)
	for (var b = 0; b < bands.length; b++) {
		var band = bands[b];
		var dx = 0;
		while (dx < this.width) {
			var sourceX = dx === 0 ? 0 : 20;
			var chunk = Math.min(ROOF_TILE_WIDTH - sourceX, this.width - dx);
			ctx.drawImage(roof, sourceX, band[0], chunk, band[1], renderX + dx, y + band[2], chunk, band[1]);
			dx += chunk;
		}
	}
	// right end cap of the roof top ledge (a strip of the ledge band)
	ctx.drawImage(roof, Math.min(this.width, ROOF_TILE_WIDTH - 15), 0, 15, 26, renderX + this.width, y, 15, 26);

	// a floating block shows its dark underside
	if (this.style === "BLOCK") {
		PixelArt.rect(ctx, "#2a2a33", renderX, y + height - 8, this.fullWidth, 8);
		PixelArt.rect(ctx, "#1b1b22", renderX, y + height - 3, this.fullWidth, 3);
	}
}

// sidewalk on top, curb, asphalt with a dashed lane line
Roof.prototype.drawStreet = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);

	PixelArt.rect(ctx, "#2a2a33", renderX, y, w, h);                 // asphalt
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 20);                // sidewalk
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 5);                 // sidewalk top highlight
	PixelArt.rect(ctx, "#5f666d", renderX, y + 20, w, 5);            // curb
	// slabs
	for (var sx = 0; sx < w; sx += 60) PixelArt.rect(ctx, "#5f666d", renderX + sx, y + 5, 2.5, 15);
	// lane line
	for (var lx = 20; lx < w - 20; lx += 80) PixelArt.rect(ctx, "#b8860b", renderX + lx, y + 70, 40, 5);
	// dark left / right edges with hazard stripes (a pit or another segment starts there)
	PixelArt.rect(ctx, "#1b1b22", renderX, y + 20, 2.5, h - 20);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y + 20, 2.5, h - 20);
	for (var side = 0; side < 2; side++) {
		var sx = side === 0 ? renderX + 2.5 : renderX + w - 12.5;
		// no stripes where a building / block covers the end of the segment
		var edgeX = side === 0 ? this.x : this.x + w;
		var covered = false;
		var roofs = this.game.scene.roofs;
		for (var r = 0; r < roofs.length; r++) {
			var other = roofs[r];
			if (other === this || other.style === "STREET" || other.oneWay) continue;
			if (other.x <= edgeX + 2 && other.x + other.fullWidth >= edgeX - 2 && other.y < this.y && other.bottom() > this.y) { covered = true; break; }
		}
		if (covered) continue;
		for (var stripe = 0; stripe < 8; stripe++) {
			PixelArt.rect(ctx, stripe % 2 === 0 ? "#ffd83d" : "#1b1b22", sx, y + 25 + stripe * 7.5, 10, 7.5);
		}
	}
}

// construction site ground: packed dirt with gravel
Roof.prototype.drawDirt = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, "#3b2a25", renderX, y, w, h);
	PixelArt.rect(ctx, "#6d4a3a", renderX, y, w, 12.5);
	PixelArt.rect(ctx, "#8a5f4b", renderX, y, w, 5);
	for (var gx = 10; gx < w - 10; gx += 45) {
		PixelArt.rect(ctx, "#8d949b", renderX + gx, y + 5, 5, 2.5);
		PixelArt.rect(ctx, "#4e4a52", renderX + gx + 20, y + 20 + ((gx / 45) % 3) * 15, 7.5, 5);
	}
	PixelArt.rect(ctx, "#1b1b22", renderX, y + 12.5, 2.5, h - 12.5);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y + 12.5, 2.5, h - 12.5);
}

// wooden planks on a steel tube frame (one-way)
Roof.prototype.drawScaffold = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var frameTo = this.frameTo !== undefined ? this.frameTo : (this.game.level ? this.game.level.floorY : y + 100);
	// posts + diagonal braces
	for (var px = 0; px < w; px += 120) {
		var postX = Math.min(px, w - 5);
		PixelArt.rect(ctx, "#8d949b", renderX + postX, y, 5, frameTo - y);
		PixelArt.rect(ctx, "#5f666d", renderX + postX + 2.5, y, 2.5, frameTo - y);
	}
	PixelArt.rect(ctx, "#8d949b", renderX + w - 5, y, 5, frameTo - y);
	PixelArt.rect(ctx, "#8d949b", renderX, y + 40, w, 2.5);
	// planks
	for (var plank = 0; plank < w; plank += 30) {
		var pw = Math.min(30, w - plank);
		PixelArt.rect(ctx, "#c9a36b", renderX + plank, y, pw - 2.5, 10);
		PixelArt.rect(ctx, "#8a5f4b", renderX + plank, y + 7.5, pw - 2.5, 2.5);
	}
	PixelArt.rect(ctx, "#3b2a25", renderX, y + 10, w, 2.5);
	// railing
	for (var rx = 10; rx < w - 5; rx += 60) PixelArt.rect(ctx, "#8d949b", renderX + rx, y - 27.5, 2.5, 27.5);
	PixelArt.rect(ctx, "#b7bec5", renderX, y - 30, w, 2.5);
}

// unfinished concrete floor (one-way) with columns down to frameTo
Roof.prototype.drawSlab = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var frameTo = this.frameTo !== undefined ? this.frameTo : (this.game.level ? this.game.level.floorY : y + 100);
	for (var cx = 30; cx < w - 20; cx += 160) {
		PixelArt.rect(ctx, "#5f666d", renderX + cx, y + h, 20, frameTo - y - h);
		PixelArt.rect(ctx, "#8d949b", renderX + cx + 5, y + h, 5, frameTo - y - h);
	}
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, h);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 5);
	PixelArt.rect(ctx, "#4e4a52", renderX, y + h - 5, w, 5);
	// rebar stubs at the edge
	PixelArt.rect(ctx, "#7a3b30", renderX + w - 5, y - 15, 2.5, 15);
	PixelArt.rect(ctx, "#7a3b30", renderX + 2.5, y - 15, 2.5, 15);
}

// steel I-beam walkway (one-way)
Roof.prototype.drawBeam = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, "#5f666d", renderX, y, w, h);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 5);
	PixelArt.rect(ctx, "#8d949b", renderX, y + h / 2 - 2.5, w, 5);
	PixelArt.rect(ctx, "#2a2a33", renderX, y + h - 2.5, w, 2.5);
	for (var rx = 15; rx < w; rx += 40) PixelArt.rect(ctx, "#4e4a52", renderX + rx, y + 5, 5, h - 7.5);
}

// solid concrete block (foundations, stair cores)
Roof.prototype.drawConcrete = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, h);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 5);
	PixelArt.rect(ctx, "#5f666d", renderX, y + h - 5, w, 5);
	for (var fy = y + 60; fy < y + h - 20; fy += 60) PixelArt.rect(ctx, "#5f666d", renderX, fy, w, 5);
	for (var wx = 25; wx < w - 40; wx += 90) {
		for (var wy = y + 15; wy < y + h - 40; wy += 60) PixelArt.rect(ctx, "#2a2a33", renderX + wx, wy, 40, 35);
	}
	PixelArt.rect(ctx, "#4e4a52", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#4e4a52", renderX + w - 2.5, y, 2.5, h);
}

// construction lift: steel floor with a railing, hanging on a cable from a pulley at the top of its track
Roof.prototype.drawLift = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var top = this.motion ? Math.min(this.motion.from, this.motion.to) - 50 : y - 200;
	var bottom = this.motion ? Math.max(this.motion.from, this.motion.to) + h : y + h;
	// rails of the track
	PixelArt.rect(ctx, "#4e4a52", renderX - 7.5, top, 5, bottom - top);
	PixelArt.rect(ctx, "#4e4a52", renderX + w + 2.5, top, 5, bottom - top);
	// cable + pulley
	PixelArt.rect(ctx, "#b7bec5", renderX + w / 2 - 1.25, top + 10, 2.5, y - top - 10);
	PixelArt.draw(ctx, "PULLEY", renderX + w / 2 - 10, top - 5);
	// floor + railing
	PixelArt.rect(ctx, "#5f666d", renderX, y, w, h);
	PixelArt.rect(ctx, "#ffd83d", renderX, y, w, 5);
	for (var sx = 0; sx < w; sx += 20) PixelArt.rect(ctx, sx % 40 === 0 ? "#1b1b22" : "#ffd83d", renderX + sx, y, Math.min(10, w - sx), 5);
	PixelArt.rect(ctx, "#2a2a33", renderX, y + h - 2.5, w, 2.5);
	for (var rx = 5; rx < w - 5; rx += 40) PixelArt.rect(ctx, "#8d949b", renderX + rx, y - 25, 2.5, 25);
	PixelArt.rect(ctx, "#b7bec5", renderX, y - 27.5, w, 2.5);
	// power lamps (one per switch wired to this lift)
	if (this.powerId && this.game.level) this.game.level.drawPowerLamps(this.powerId, renderX + w / 2, y - 45);
}

// crane girder: yellow beam with hazard stripes, hanging on cables
Roof.prototype.drawGirder = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var cableTop = y - 140;
	PixelArt.rect(ctx, "#b7bec5", renderX + 15, cableTop, 2.5, y - cableTop);
	PixelArt.rect(ctx, "#b7bec5", renderX + w - 17.5, cableTop, 2.5, y - cableTop);
	PixelArt.rect(ctx, "#5f666d", renderX + 5, cableTop - 10, w - 10, 10);
	PixelArt.rect(ctx, "#ffd83d", renderX, y, w, h);
	for (var sx = 0; sx < w; sx += 30) PixelArt.rect(ctx, "#1b1b22", renderX + sx, y + 5, Math.min(15, w - sx), h - 10);
	PixelArt.rect(ctx, "#b8860b", renderX, y + h - 5, w, 5);
	PixelArt.rect(ctx, "#ffd83d", renderX, y, w, 2.5);
}

// shipping container (solid block), corrugated, in this.color
Roof.prototype.drawContainer = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var base = this.color || "#1b5e8a";
	PixelArt.rect(ctx, base, renderX, y, w, h);
	PixelArt.rect(ctx, "rgba(0, 0, 0, 0.25)", renderX, y + h - 10, w, 10);
	PixelArt.rect(ctx, "rgba(255, 255, 255, 0.18)", renderX, y, w, 5);
	for (var cx = 10; cx < w - 10; cx += 20) PixelArt.rect(ctx, "rgba(0, 0, 0, 0.22)", renderX + cx, y + 10, 5, h - 25);
	PixelArt.rect(ctx, "#2a2a33", renderX, y, 5, h);
	PixelArt.rect(ctx, "#2a2a33", renderX + w - 5, y, 5, h);
	// door end + label
	PixelArt.rect(ctx, "rgba(0, 0, 0, 0.3)", renderX + w - 45, y + 15, 30, h - 35);
	PixelArt.rect(ctx, "#f4f4f4", renderX + 15, y + 15, 30, 7.5);
}

// indoor metal floor
Roof.prototype.drawFloor = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, "#2a2a33", renderX, y, w, h);
	PixelArt.rect(ctx, "#5f666d", renderX, y, w, 12.5);
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 2.5);
	for (var px = 0; px < w; px += 50) {
		PixelArt.rect(ctx, "#4e4a52", renderX + px, y + 2.5, 2.5, 10);
		PixelArt.rect(ctx, "#ffd83d", renderX + px + 10, y + 5, 5, 2.5);
	}
	PixelArt.rect(ctx, "#1b1b22", renderX, y + 12.5, w, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + 12.5, 2.5, h - 12.5);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y + 12.5, 2.5, h - 12.5);
}

// indoor wall panel block (solid): dark steel panels with rivets
Roof.prototype.drawPanel = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, this.color || "#3a3f4f", renderX, y, w, h);
	for (var py = 0; py < h; py += 50) PixelArt.rect(ctx, "#262a36", renderX, y + py, w, 2.5);
	for (var px = 0; px < w; px += 70) PixelArt.rect(ctx, "#262a36", renderX + px, y, 2.5, h);
	for (var ry = 10; ry < h - 5; ry += 50) for (var rx = 10; rx < w - 5; rx += 70) PixelArt.rect(ctx, "#5f666d", renderX + rx, y + ry, 2.5, 2.5);
	PixelArt.rect(ctx, "#5f666d", renderX, y, w, 5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + h - 2.5, w, 2.5);
}

// thin concrete slab (balcony / fire escape landing / awning)
Roof.prototype.drawLedge = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, "#5f666d", renderX, y, w, h);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 5);
	PixelArt.rect(ctx, "#2a2a33", renderX, y + h - 3, w, 3);
	// railing on the back
	for (var rx = 5; rx < w - 5; rx += 15) PixelArt.rect(ctx, "#4e4a52", renderX + rx, y - 20, 2.5, 20);
	PixelArt.rect(ctx, "#8d949b", renderX, y - 22, w, 2.5);
}

// conveyor belt (solid): steel side frame with direction arrows, a rubber belt whose ridges scroll with the
// belt speed, rollers at both ends and legs down to frameTo when it stands above the floor
Roof.prototype.drawConveyor = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var speed = this.beltSpeed();
	var belt = this.conveyor || { scroll: 0 };
	belt.scroll = ((belt.scroll + speed) % 20 + 20) % 20;

	// legs (raised belts)
	var frameTo = this.frameTo !== undefined ? this.frameTo : y + h;
	if (frameTo > y + h) {
		for (var lx = 20; lx < w - 10; lx += 140) {
			PixelArt.rect(ctx, "#2a2a33", renderX + lx, y + h, 10, frameTo - y - h);
			PixelArt.rect(ctx, "#5f666d", renderX + lx + 2.5, y + h, 2.5, frameTo - y - h);
		}
		PixelArt.rect(ctx, "#2a2a33", renderX + w - 30, y + h, 10, frameTo - y - h);
	}

	// a belt on a housing (solid down to the floor): dark machine body with a hazard stripe under the belt
	if (h > 20) {
		PixelArt.rect(ctx, "#2f3340", renderX, y + 20, w, h - 20);
		for (var hx = 0; hx < w; hx += 20) PixelArt.rect(ctx, (hx / 20) % 2 === 0 ? "#ffd83d" : "#1b1b22", renderX + hx, y + 20, Math.min(10, w - hx), 5);
		for (var px = 40; px < w - 20; px += 80) PixelArt.rect(ctx, "#262a36", renderX + px, y + 30, 2.5, h - 35);
		h = 20;
	}
	// side frame
	PixelArt.rect(ctx, "#4e4a52", renderX, y, w, h);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + h - 2.5, w, 2.5);
	// belt surface with moving ridges
	PixelArt.rect(ctx, "#2a2a33", renderX, y, w, 7.5);
	for (var sx = -20; sx < w + 20; sx += 20) {
		var rx = sx + belt.scroll;
		if (rx < 2.5 || rx > w - 7.5) continue;
		PixelArt.rect(ctx, "#5f666d", renderX + rx, y + 2.5, 5, 2.5);
	}
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 2.5);

	// direction arrows on the side frame (yellow = running, gray = stopped)
	var lit = Math.floor(this.game.frame / 12) % 3;
	for (var ax = 30, n = 0; ax < w - 30; ax += 60, n++) {
		var color = speed === 0 ? "#5f666d" : (n % 3 === lit ? "#ffd83d" : "#b8860b");
		var cx = renderX + ax, cy = y + 10;
		if (speed >= 0) {
			PixelArt.rect(ctx, color, cx, cy, 2.5, 2.5);
			PixelArt.rect(ctx, color, cx + 2.5, cy + 2.5, 2.5, 2.5);
			PixelArt.rect(ctx, color, cx, cy + 5, 2.5, 2.5);
		} else {
			PixelArt.rect(ctx, color, cx + 2.5, cy, 2.5, 2.5);
			PixelArt.rect(ctx, color, cx, cy + 2.5, 2.5, 2.5);
			PixelArt.rect(ctx, color, cx + 2.5, cy + 5, 2.5, 2.5);
		}
	}

	// rollers
	var spin = Math.floor(belt.scroll / 5) % 2 === 0;
	for (var side = 0; side < 2; side++) {
		var ex = side === 0 ? renderX - 5 : renderX + w - 7.5;
		PixelArt.rect(ctx, "#1b1b22", ex, y - 2.5, 12.5, h + 2.5);
		PixelArt.rect(ctx, "#8d949b", ex + 2.5, y, 7.5, h - 2.5);
		PixelArt.rect(ctx, "#4e4a52", ex + 5, spin ? y + 2.5 : y + h - 7.5, 2.5, 2.5);
	}
}

// lab floor (solid): white tiles with a teal edge on top of a dark structural body
Roof.prototype.drawLabFloor = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, this.color || "#3a4650", renderX, y, w, h);
	for (var sx = 0; sx < w; sx += 80) PixelArt.rect(ctx, "#2f3a43", renderX + sx, y + 15, 2.5, h - 15);
	PixelArt.rect(ctx, "#e3ebef", renderX, y, w, 12.5);
	for (var tx = 0; tx < w; tx += 30) PixelArt.rect(ctx, "#b9c7cf", renderX + tx, y + 2.5, 2.5, 10);
	PixelArt.rect(ctx, "#2fb3b8", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + 12.5, w, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y, 2.5, h);
}

// glass walkway (one-way): steel frame, translucent cyan panes and a glass railing
Roof.prototype.drawGlass = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	PixelArt.rect(ctx, "rgba(150, 225, 255, 0.18)", renderX, y - 27.5, w, 25);
	PixelArt.rect(ctx, "#b7bec5", renderX, y - 30, w, 2.5);
	for (var px = 0; px < w; px += 50) PixelArt.rect(ctx, "#8d949b", renderX + px, y - 27.5, 2.5, 27.5);
	PixelArt.rect(ctx, "rgba(120, 210, 255, 0.45)", renderX, y, w, h);
	for (var gx = 10; gx < w - 10; gx += 40) PixelArt.rect(ctx, "rgba(255, 255, 255, 0.5)", renderX + gx, y + 2.5, 10, 2.5);
	PixelArt.rect(ctx, "#d7e3ea", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#5f666d", renderX, y + h - 2.5, w, 2.5);
	PixelArt.rect(ctx, "#5f666d", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#5f666d", renderX + w - 2.5, y, 2.5, h);
}

// window washer gondola (moving up and down): a cradle with railings hanging on two cables from a crane jib at the
// top of its track
Roof.prototype.drawGondola = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var top = this.motion ? Math.min(this.motion.from, this.motion.to) - 120 : y - 200;
	// jib + cables
	PixelArt.rect(ctx, "#5f666d", renderX - 20, top - 10, w + 40, 10);
	PixelArt.rect(ctx, "#ffd83d", renderX - 20, top - 10, w + 40, 2.5);
	PixelArt.rect(ctx, "#b7bec5", renderX + 10, top, 2.5, y - 30 - top);
	PixelArt.rect(ctx, "#b7bec5", renderX + w - 12.5, top, 2.5, y - 30 - top);
	// cradle: floor, railing, a bucket
	PixelArt.rect(ctx, "#8d949b", renderX, y - 30, w, 2.5);
	for (var px = 0; px <= w - 2.5; px += 30) PixelArt.rect(ctx, "#8d949b", renderX + px, y - 30, 2.5, 30);
	PixelArt.rect(ctx, "#8d949b", renderX + w - 2.5, y - 30, 2.5, 30);
	PixelArt.rect(ctx, "#3c4356", renderX, y, w, h);
	PixelArt.rect(ctx, "#ffd83d", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + h - 2.5, w, 2.5);
	PixelArt.rect(ctx, "#2b9aa0", renderX + w - 25, y - 12.5, 12.5, 12.5);
	// power lamps when it needs switches
	if (this.powerId && this.game.level) this.game.level.drawPowerLamps(this.powerId, renderX + w / 2, y - 45);
}

// glass elevator cabin (moving up and down) in a shaft with rails; power lamps when it needs switches
Roof.prototype.drawElevator = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var top = this.motion ? Math.min(this.motion.from, this.motion.to) - 20 : y - 200;
	var bottom = this.motion ? Math.max(this.motion.from, this.motion.to) + h : y + h;
	PixelArt.rect(ctx, "#4e5668", renderX - 7.5, top, 5, bottom - top);
	PixelArt.rect(ctx, "#4e5668", renderX + w + 2.5, top, 5, bottom - top);
	// cabin: roof, glass walls, floor
	var cabin = 110;
	PixelArt.rect(ctx, "rgba(150, 200, 255, 0.16)", renderX, y - cabin, w, cabin);
	PixelArt.rect(ctx, "#8d949b", renderX, y - cabin, w, 7.5);
	PixelArt.rect(ctx, "#8d949b", renderX, y - cabin, 2.5, cabin);
	PixelArt.rect(ctx, "#8d949b", renderX + w - 2.5, y - cabin, 2.5, cabin);
	PixelArt.rect(ctx, "rgba(255, 255, 255, 0.35)", renderX + 10, y - cabin + 15, 5, 40);
	PixelArt.rect(ctx, "#3c4356", renderX, y, w, h);
	PixelArt.rect(ctx, this.powered ? "#3fd0ff" : "#5f666d", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + h - 2.5, w, 2.5);
	if (this.powerId && this.game.level) this.game.level.drawPowerLamps(this.powerId, renderX + w / 2, y - cabin - 20);
}

// anti-grav hover platform (moving): dark body, cyan light strip, pulsing thruster glow underneath
Roof.prototype.drawHover = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var pulse = Math.floor(this.game.frame / 6) % 2;
	PixelArt.rect(ctx, pulse ? "rgba(80, 220, 255, 0.28)" : "rgba(80, 220, 255, 0.18)", renderX + 10, y + h, w - 20, 20);
	PixelArt.rect(ctx, "rgba(80, 220, 255, 0.12)", renderX + 20, y + h + 20, w - 40, 15);
	PixelArt.rect(ctx, "#2a2f3a", renderX, y, w, h);
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#3fd0ff", renderX + 5, y + h - 5, w - 10, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + h - 2.5, w, 2.5);
}

// factory hall / shed (solid): corrugated metal siding in this.color, a roof trim, a row of high windows
// (some lit by the furnaces) and a darker base
Roof.prototype.drawFactory = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var base = this.color || "#5a5f6a";
	PixelArt.rect(ctx, base, renderX, y, w, h);
	// corrugation
	for (var rx = 5; rx < w - 2.5; rx += 10) PixelArt.rect(ctx, "rgba(0, 0, 0, 0.22)", renderX + rx, y + 10, 2.5, h - 10);
	// roof trim
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 7.5);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y + 7.5, w, 2.5);
	// high windows (lit or dark, fixed per position so they never flicker)
	if (h > 60) {
		for (var wx = 25; wx < w - 45; wx += 70) {
			var lit = Math.floor((this.x + wx) / 70) % 3 !== 0;
			PixelArt.rect(ctx, "#1b1b22", renderX + wx - 2.5, y + 22.5, 35, 15);
			PixelArt.rect(ctx, lit ? "#ff9a3c" : "#2a2a33", renderX + wx, y + 25, 30, 10);
			if (lit) PixelArt.rect(ctx, "#ffd27a", renderX + wx, y + 25, 30, 2.5);
		}
	}
	// base + edges
	PixelArt.rect(ctx, "rgba(0, 0, 0, 0.3)", renderX, y + h - 25, w, 25);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y, 2.5, h);
}

// big horizontal pipe to walk on (one-way) with flanges, resting on brackets down to frameTo
Roof.prototype.drawPipeline = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y);
	var w = Math.round(this.fullWidth);
	var h = Math.round(this.height);
	var base = this.color || "#4f7a6e";
	var frameTo = this.frameTo;
	if (frameTo !== undefined && frameTo > y + h) {
		for (var bx = 40; bx < w - 20; bx += 200) {
			PixelArt.rect(ctx, "#2a2a33", renderX + bx, y + h, 7.5, frameTo - y - h);
			PixelArt.rect(ctx, "#4e4a52", renderX + bx - 7.5, y + h - 2.5, 22.5, 5);
		}
	}
	PixelArt.rect(ctx, "#1b1b22", renderX, y, w, h);
	PixelArt.rect(ctx, base, renderX, y + 2.5, w, h - 5);
	PixelArt.rect(ctx, "rgba(255, 255, 255, 0.28)", renderX, y + 2.5, w, 5);
	PixelArt.rect(ctx, "rgba(0, 0, 0, 0.3)", renderX, y + h - 10, w, 7.5);
	// flanges with bolts
	for (var fx = 50; fx < w - 20; fx += 100) {
		PixelArt.rect(ctx, "#1b1b22", renderX + fx - 2.5, y - 2.5, 12.5, h + 5);
		PixelArt.rect(ctx, "#8d949b", renderX + fx, y, 7.5, h);
		PixelArt.rect(ctx, "#4e4a52", renderX + fx + 2.5, y + 5, 2.5, 2.5);
		PixelArt.rect(ctx, "#4e4a52", renderX + fx + 2.5, y + h - 7.5, 2.5, 2.5);
	}
	// end caps
	PixelArt.rect(ctx, "#5f666d", renderX, y, 5, h);
	PixelArt.rect(ctx, "#5f666d", renderX + w - 5, y, 5, h);
}

// true once the roof is behind the area the camera can still scroll back to
/* ---------- harbour (world 3) ---------- */

// the surface of the harbour water in this stage (null anywhere else)
Roof.prototype.waterLine = function() {
	var level = this.game.level;
	return level && level.waterY !== null ? level.waterY : null;
}

// concrete quay: a slab with a dashed yellow safety line, block wall with black tyre fenders, algae at the waterline
Roof.prototype.drawQuay = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	var sx, by;
	PixelArt.rect(ctx, "#3c4250", renderX, y, w, h);
	for (by = y + 20; by < y + h; by += 30) {
		PixelArt.rect(ctx, "#2f3440", renderX, by, w, 2.5);
		for (sx = ((by - y) / 30) % 2 === 0 ? 40 : 0; sx < w; sx += 80) PixelArt.rect(ctx, "#2f3440", renderX + sx, by, 2.5, 30);
	}
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 15);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#5f666d", renderX, y + 15, w, 5);
	for (sx = 12.5; sx < w - 20; sx += 35) PixelArt.rect(ctx, "#ffd83d", renderX + sx, y + 7.5, 20, 2.5);
	// tyre fenders on the face
	for (sx = 60; sx < w - 40; sx += 180) {
		PixelArt.rect(ctx, "#1b1b22", renderX + sx, y + 25, 22.5, 22.5);
		PixelArt.rect(ctx, "#3c4250", renderX + sx + 7.5, y + 32.5, 7.5, 7.5);
		PixelArt.rect(ctx, "#1b1b22", renderX + sx + 10, y + 20, 2.5, 5);
	}
	var water = this.waterLine();
	if (water !== null) PixelArt.rect(ctx, "#2c5a40", renderX, water - 7.5, w, 7.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y, 2.5, h);
}

// wooden pier: a plank deck on a beam, with pilings (and cross braces) going down into the water
Roof.prototype.drawPier = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth);
	var deep = 230, px;
	for (px = 10; px < w - 5; px += 75) {
		PixelArt.rect(ctx, "#1b1b22", renderX + px - 2.5, y + 15, 17.5, deep);
		PixelArt.rect(ctx, "#4a3426", renderX + px, y + 15, 12.5, deep);
		PixelArt.rect(ctx, "#6d4a3a", renderX + px, y + 15, 2.5, deep);
		if (px + 75 < w - 5) {
			pixelLine(ctx, "#3b2a25", renderX + px + 12.5, y + 25, renderX + px + 75, y + 95);
			pixelLine(ctx, "#3b2a25", renderX + px + 75, y + 25, renderX + px + 12.5, y + 95);
		}
	}
	PixelArt.rect(ctx, "#1b1b22", renderX, y, w, 22.5);
	PixelArt.rect(ctx, "#8a5f4b", renderX, y, w, 12.5);
	PixelArt.rect(ctx, "#c9a36b", renderX, y, w, 2.5);
	for (px = 25; px < w; px += 25) PixelArt.rect(ctx, "#6d4a3a", renderX + px, y + 2.5, 2.5, 10);
	PixelArt.rect(ctx, "#3b2a25", renderX, y + 12.5, w, 7.5);
}

// cargo ship hull: navy with a white band and portholes, red below the waterline, the ship's name, an anchor at the bow
Roof.prototype.drawHull = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	var px;
	// the deck railing (not on the hold's floor, which is inside the ship)
	if (y < this.game.level.floorY) this.drawRailing(renderX);
	PixelArt.rect(ctx, this.color || "#22304f", renderX, y, w, h);
	for (px = 40; px < w; px += 40) PixelArt.rect(ctx, "rgba(0, 0, 0, 0.18)", renderX + px, y + 30, 2.5, h - 30);
	var water = this.waterLine();
	if (water !== null && water - 12.5 < y + h) PixelArt.rect(ctx, "#7a2024", renderX, water - 12.5, w, y + h - water + 12.5);
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 7.5);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#e8f7ff", renderX, y + 22.5, w, 5);
	for (px = 25; px < w - 20; px += 55) {
		PixelArt.rect(ctx, "#1b1b22", renderX + px, y + 42.5, 12.5, 12.5);
		PixelArt.rect(ctx, (Math.floor(this.x + px) / 55) % 3 < 1 ? "#ffd83d" : "#3f5a8a", renderX + px + 2.5, y + 45, 7.5, 7.5);
	}
	if (this.label) {
		ctx.save();
		ctx.font = "11px SpidermanGamePixelFont, Monospace, Helvetica";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = "#e8f7ff";
		ctx.fillText(this.label, renderX + 55, y + 75);
		ctx.restore();
		// hawse pipe + anchor at the bow (the hull with the name is the bow)
		PixelArt.rect(ctx, "#1b1b22", renderX + 17.5, y + 65, 15, 15);
		PixelArt.rect(ctx, "#b7bec5", renderX + 22.5, y + 80, 5, 22.5);
		PixelArt.rect(ctx, "#b7bec5", renderX + 12.5, y + 97.5, 25, 5);
		PixelArt.rect(ctx, "#b7bec5", renderX + 12.5, y + 92.5, 5, 5);
		PixelArt.rect(ctx, "#b7bec5", renderX + 32.5, y + 92.5, 5, 5);
	}
	PixelArt.rect(ctx, "#1b1b22", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y, 2.5, h);
}

// a ship's railing along the top of a hull / deck (decoration: thin posts and a rail above the walking surface)
Roof.prototype.drawRailing = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth);
	PixelArt.rect(ctx, "rgba(215, 220, 240, 0.55)", renderX, y - 22.5, w, 2.5);
	PixelArt.rect(ctx, "rgba(215, 220, 240, 0.35)", renderX, y - 12.5, w, 2.5);
	for (var px = 0; px < w; px += 25) PixelArt.rect(ctx, "rgba(215, 220, 240, 0.55)", renderX + px, y - 22.5, 2.5, 22.5);
}

// thin steel deck over the cargo hold (20 px): grey plates on top, dark beams underneath
Roof.prototype.drawDeck = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	this.drawRailing(renderX);
	PixelArt.rect(ctx, "#2a2a33", renderX, y, w, h);
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 7.5);
	PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 2.5);
	for (var px = 30; px < w; px += 60) PixelArt.rect(ctx, "#4e4a52", renderX + px, y + 7.5, 7.5, h - 7.5);
}

// the ship's white superstructure: a red band and a row of bridge windows
Roof.prototype.drawCabin = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, w, h);
	PixelArt.rect(ctx, "#d7dcf0", renderX + 2.5, y + 2.5, w - 5, h - 2.5);
	PixelArt.rect(ctx, "#8d949b", renderX, y, w, 5);
	PixelArt.rect(ctx, "#e3201b", renderX + 2.5, y + 10, w - 5, 5);
	for (var px = 12.5; px < w - 20; px += 27.5) {
		PixelArt.rect(ctx, "#1b3a8a", renderX + px, y + 25, 17.5, 15);
		if ((px / 27.5) % 2 < 1) PixelArt.rect(ctx, "rgba(255, 216, 61, 0.7)", renderX + px + 2.5, y + 27.5, 12.5, 10);
	}
}

// a cargo pallet: wooden crates tied together on a pallet (hangs from a crane until its rope is cut)
Roof.prototype.drawPallet = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	var cs = PixelArt.width("CRATE");
	PixelArt.rect(ctx, "#1b1b22", renderX, y, w, h);
	for (var cy = y + h - 10 - cs; cy >= y - 1; cy -= cs) {
		for (var cx = 0; cx + cs <= w + 1; cx += cs) PixelArt.draw(ctx, "CRATE", renderX + cx, cy);
	}
	PixelArt.rect(ctx, "#8a5f4b", renderX, y + h - 10, w, 10);
	for (var sx = 5; sx < w; sx += 20) PixelArt.rect(ctx, "#3b2a25", renderX + sx, y + h - 5, 10, 5);
	// cargo straps
	PixelArt.rect(ctx, "#e3201b", renderX + w * 0.3, y, 2.5, h - 10);
	PixelArt.rect(ctx, "#e3201b", renderX + w * 0.7, y, 2.5, h - 10);
}

/* ---------- sewer (world 3) ---------- */

// sewer masonry (floors, walls, ceilings): dark bricks, a concrete cap with slime on walkable tops
Roof.prototype.drawBrick = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	var left = Math.max(renderX, -20), right = Math.min(renderX + w, this.game.viewWidth + 20);
	if (right <= left) return;
	PixelArt.rect(ctx, "#2e2220", left, y, right - left, h);
	var top = Math.max(y, Math.floor((this.game.cameraY - 20 - y) / 15) * 15 + y);
	var bottom = Math.min(y + h, this.game.cameraY + this.game.viewHeight + 20);
	for (var by = top; by < bottom; by += 15) {
		var row = Math.round((by - y) / 15);
		PixelArt.rect(ctx, "#231a18", left, by, right - left, 2.5);
		var start = renderX + (row % 2 === 0 ? 0 : 20);
		for (var bx = start + Math.max(0, Math.floor((left - start) / 40)) * 40; bx < right; bx += 40) {
			PixelArt.rect(ctx, "#231a18", bx, by, 2.5, 15);
			if ((row * 7 + Math.round(bx - renderX) / 40) % 5 === 0) PixelArt.rect(ctx, "#3b2c28", bx + 5, by + 5, 27.5, 7.5);
		}
	}
	PixelArt.rect(ctx, "#5f666d", left, y, right - left, 7.5);
	PixelArt.rect(ctx, "#8d949b", left, y, right - left, 2.5);
	PixelArt.rect(ctx, "#3f5a2e", left, y + 7.5, right - left, 2.5);
	for (var sx = Math.ceil((left - renderX) / 55) * 55; renderX + sx < right; sx += 55) PixelArt.rect(ctx, "#3f5a2e", renderX + sx + 10, y + 10, 5, 5 + (sx % 3) * 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, 2.5, h);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, y, 2.5, h);
}

// a metal grate walkway (one-way): a steel frame with a lattice you can see through
Roof.prototype.drawGrate = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, w, 12.5);
	PixelArt.rect(ctx, "#5f666d", renderX, y, w, 2.5);
	PixelArt.rect(ctx, "#5f666d", renderX, y + 10, w, 2.5);
	for (var gx = 0; gx < w - 5; gx += 10) PixelArt.rect(ctx, "#4e4a52", renderX + gx + 2.5, y + 2.5, 5, 7.5);
	// hangers up into the dark
	for (var hx = 20; hx < w; hx += 120) PixelArt.rect(ctx, "#4e4a52", renderX + hx, y - 60, 2.5, 60);
}

// a raft: planks lashed on two barrels, floating on its pool
Roof.prototype.drawRaft = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth);
	PixelArt.rect(ctx, "#1b1b22", renderX + 7.5, y + 10, 35, 22.5);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 42.5, y + 10, 35, 22.5);
	PixelArt.rect(ctx, "#3f6fa0", renderX + 10, y + 12.5, 30, 17.5);
	PixelArt.rect(ctx, "#3f6fa0", renderX + w - 40, y + 12.5, 30, 17.5);
	PixelArt.rect(ctx, "#b7bec5", renderX + 10, y + 17.5, 30, 2.5);
	PixelArt.rect(ctx, "#b7bec5", renderX + w - 40, y + 17.5, 30, 2.5);
	PixelArt.rect(ctx, "#1b1b22", renderX, y, w, 12.5);
	PixelArt.rect(ctx, "#8a5f4b", renderX, y, w, 10);
	PixelArt.rect(ctx, "#c9a36b", renderX, y, w, 2.5);
	for (var px = 20; px < w; px += 20) PixelArt.rect(ctx, "#6d4a3a", renderX + px, y + 2.5, 2.5, 7.5);
	PixelArt.rect(ctx, "#ffd83d", renderX + 5, y + 2.5, 5, 5);
}

/* ---------- pump station (world 3) ---------- */

// station concrete: poured slabs with a yellow / black hazard edge on walkable tops, panel seams, stains
Roof.prototype.drawStation = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	var left = Math.max(renderX, -20), right = Math.min(renderX + w, this.game.viewWidth + 20);
	if (right <= left) return;
	var top = Math.max(y, this.game.cameraY - 20), bottom = Math.min(y + h, this.game.cameraY + this.game.viewHeight + 20);
	if (bottom <= top) return;
	PixelArt.rect(ctx, "#4a4f57", left, top, right - left, bottom - top);
	for (var py = y + 40 + Math.max(0, Math.floor((top - y - 40) / 80)) * 80; py < bottom; py += 80) PixelArt.rect(ctx, "#3a3e45", left, py, right - left, 2.5);
	for (var px = Math.ceil((left - renderX) / 120) * 120; renderX + px < right; px += 120) {
		PixelArt.rect(ctx, "#3a3e45", renderX + px, top, 2.5, bottom - top);
		PixelArt.rect(ctx, "rgba(40, 30, 20, 0.25)", renderX + px + 10, y + 20, 5, Math.min(60, h - 20));
	}
	if (y >= top) {
		PixelArt.rect(ctx, "#8d949b", left, y, right - left, 5);
		for (var sx = Math.floor((left - renderX) / 20) * 20; renderX + sx < right; sx += 20) {
			PixelArt.rect(ctx, (sx / 20) % 2 === 0 ? "#ffd83d" : "#1b1b22", renderX + sx, y + 5, 10, 5);
			PixelArt.rect(ctx, (sx / 20) % 2 === 0 ? "#1b1b22" : "#ffd83d", renderX + sx + 10, y + 5, 10, 5);
		}
	}
	PixelArt.rect(ctx, "#1b1b22", renderX, top, 2.5, bottom - top);
	PixelArt.rect(ctx, "#1b1b22", renderX + w - 2.5, top, 2.5, bottom - top);
}

// the dry dock floor under sandman: concrete buried in drifting sand (dunes along the top, grains)
Roof.prototype.drawSand = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	PixelArt.rect(ctx, "#4a4f57", renderX, y, w, h);
	PixelArt.rect(ctx, "#c9a36b", renderX, y, w, 20);
	for (var dx = 0; dx < w; dx += 60) {
		var dune = 5 + ((dx / 60) % 3) * 2.5;
		PixelArt.rect(ctx, "#d9b97a", renderX + dx + 10, y - dune, 40, dune);
		PixelArt.rect(ctx, "#e6cf9a", renderX + dx + 20, y - dune, 20, 2.5);
		PixelArt.rect(ctx, "#a8844e", renderX + dx + 30, y + 7.5, 5, 2.5);
	}
	PixelArt.rect(ctx, "#a8844e", renderX, y + 17.5, w, 2.5);
	for (var gx = 15; gx < w; gx += 45) PixelArt.rect(ctx, "#c9a36b", renderX + gx, y + 30 + (gx % 4) * 5, 5, 2.5);
}

// pump machinery: a riveted steel housing with a gauge, a flywheel that turns, warning plates
Roof.prototype.drawMachine = function(renderX) {
	var ctx = this.ctx;
	var y = Math.round(this.y), w = Math.round(this.fullWidth), h = Math.round(this.height);
	var top = Math.max(y, this.game.cameraY - 20), bottom = Math.min(y + h, this.game.cameraY + this.game.viewHeight + 20);
	if (bottom <= top) return;
	PixelArt.rect(ctx, "#1b1b22", renderX, top, w, bottom - top);
	PixelArt.rect(ctx, "#2f5f6a", renderX + 2.5, top, w - 5, bottom - top);
	PixelArt.rect(ctx, "#3f7a86", renderX + 2.5, top, 7.5, bottom - top);
	for (var ry = y + 20 + Math.max(0, Math.floor((top - y - 20) / 40)) * 40; ry < bottom; ry += 40) {
		PixelArt.rect(ctx, "#1f4048", renderX + 2.5, ry, w - 5, 2.5);
		for (var rx = 10; rx < w - 8; rx += 25) PixelArt.rect(ctx, "#8d949b", renderX + rx, ry - 5, 2.5, 2.5);
	}
	if (y >= top - 5) {
		PixelArt.rect(ctx, "#8d949b", renderX, y, w, 5);
		PixelArt.rect(ctx, "#b7bec5", renderX, y, w, 2.5);
		// the flywheel (turning) and a gauge near the top
		var cx = renderX + w / 2, cy = y + 45;
		if (w >= 80 && h >= 90) {
			var a = (this.game.frame * 0.08) % (Math.PI * 2);
			PixelArt.rect(ctx, "#1b1b22", cx - 20, cy - 20, 40, 40);
			PixelArt.rect(ctx, "#5f666d", cx - 17.5, cy - 17.5, 35, 35);
			for (var k = 0; k < 4; k++) {
				var ang = a + k * Math.PI / 2;
				pixelLine(ctx, "#b7bec5", cx, cy, cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15);
			}
			PixelArt.rect(ctx, "#ffd83d", cx - 2.5, cy - 2.5, 5, 5);
			PixelArt.rect(ctx, "#1b1b22", renderX + w - 27.5, y + 12.5, 17.5, 12.5);
			PixelArt.rect(ctx, "#e8f7ff", renderX + w - 25, y + 15, 12.5, 7.5);
			PixelArt.rect(ctx, "#e3201b", renderX + w - 20 + Math.round(Math.sin(this.game.frame * 0.05) * 2) * 2.5, y + 15, 2.5, 7.5);
		}
		for (var sx = 5; sx < w - 20; sx += 40) PixelArt.rect(ctx, "#ffd83d", renderX + sx + 5, y + h - 25 > bottom ? bottom - 25 : y + Math.min(h - 25, 100), 15, 5);
	}
}

// a line of art pixels (2.5 px grid) from x1 / y1 to x2 / y2 (ropes, braces, slings)
function pixelLine(ctx, color, x1, y1, x2, y2) {
	var dx = x2 - x1, dy = y2 - y1;
	var steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / PIXEL));
	ctx.fillStyle = color;
	for (var i = 0; i <= steps; i++) {
		var px = Math.round((x1 + dx * i / steps) / PIXEL) * PIXEL, py = Math.round((y1 + dy * i / steps) / PIXEL) * PIXEL;
		ctx.fillRect(px, py, PIXEL, PIXEL);
	}
}

Roof.prototype.isBehindCamera = function() {
	return this.x + this.fullWidth - this.game.cameraX <= -CAMERA.BACKSCROLL - 50;
}

// removes the roof together with everything that lives on it
Roof.prototype.remove = function() {
	this.game.removeRoof(this);
	for (var e = 0; e < this.enemies.length; e++) this.game.removeEnemy(this.enemies[e]);
	for (var i = 0; i < this.pickups.length; i++) this.game.removePickup(this.pickups[i]);
}

/* ------------------------------------------------------------------
 * Enemies
 *
 * Enemy  - the basic thug: stands on his roof and throws knives (ranged)
 * Venom  - close range bruiser: lots of health, chases spiderman on his roof and bites
 * Goblin - airborne: glides back and forth above his roof and lobs pumpkin bombs
 * ------------------------------------------------------------------ */

function Enemy(game, opts) {
	opts = opts || {};

	this.game = game;
	this.canvas = game.canvas;
	this.ctx = game.ctx;

	this.health = opts.health || ENEMIES.THUG.HEALTH;
	this.maxHealth = opts.maxHealth || this.health;
	this.name = opts.name || "THUG";
	this.team = "ENEMY";
	this.x = opts.x || this.canvas.width - 50;
	this.y = opts.y || 0;
	this.roof = opts.roof || null;
	// just to control the scaling of an image
	this.scale = opts.scale || 0.5;
	this.stateImg = this.game.resources[this.name];

	// points awarded when defeated
	this.score = opts.score || ENEMIES.THUG.SCORE;

	// which way the sprite file looks, and which way the enemy currently looks
	this.imageFacing = DIRECTION.RIGHT;
	this.facing = DIRECTION.LEFT;

	// frames between two attacks
	this.attackInterval = opts.attackInterval || 100;

	// procedural animation (the sprites are single frames): squash / stretch, lean and hop
	this.anim = { scaleX: 1, scaleY: 1, rotation: 0, offsetY: 0 };
	this.recoil = 0;

	this.wasDamagedOnPreviousFrame = false;
	this.hitFlashFrames = 0;
	this.frame = 0;
};

// thug: breathes, winds up before a throw and recoils after it
Enemy.prototype.animate = function() {
	var breath = Math.sin(this.frame * 0.12);
	var anim = this.anim;
	anim.scaleY = 1 + breath * 0.025;
	anim.scaleX = 1 - breath * 0.02;
	anim.offsetY = 0;
	anim.rotation = 0;

	var untilThrow = this.attackInterval - (this.frame % this.attackInterval);
	if (this.canEngage() && untilThrow <= 14) {
		// wind up: lean back (away from the throw direction)
		anim.rotation = -0.22 * (1 - untilThrow / 14);
	}
	if (this.recoil > 0) {
		// follow through: lunge forward, settle back
		anim.rotation = 0.28 * (this.recoil / 10);
		anim.scaleX = 1.08;
		this.recoil--;
	}
}

Enemy.prototype.width = function() {
	return this.stateImg.width * this.scale;
}

Enemy.prototype.height = function() {
	return this.stateImg.height * this.scale;
}

Enemy.prototype.centerX = function() {
	return this.x + this.width() / 2;
}

Enemy.prototype.centerY = function() {
	return this.y + this.height() / 2;
}

// hook for subclasses that need to know their roof (e.g. to patrol over it)
Enemy.prototype.placeOnRoof = function(roof) {
	this.roof = roof;
}

Enemy.prototype.isInScreen = function() {
	var screenX = this.x - this.game.cameraX;
	return screenX + this.width() >= 0 && screenX <= this.game.viewWidth;
}

// true when the enemy should act on spiderman: visible, and (campaign) close enough
Enemy.prototype.canEngage = function() {
	if (!this.isInScreen()) return false;
	if (!this.game.isCampaign()) return true;
	var hitbox = this.game.spiderman.getHitbox();
	if (Math.abs((hitbox.top + hitbox.bottom) / 2 - this.centerY()) > CAMPAIGN.ENEMY_ENGAGE_HEIGHT) return false;
	return Math.abs((hitbox.left + hitbox.right) / 2 - this.centerX()) <= CAMPAIGN.ENEMY_ENGAGE_RANGE;
}

Enemy.prototype.faceSpiderman = function() {
	var hitbox = this.game.spiderman.getHitbox();
	this.facing = (hitbox.left + hitbox.right) / 2 > this.centerX() ? DIRECTION.RIGHT : DIRECTION.LEFT;
}

// true if this enemy's body overlaps spiderman's hit box
Enemy.prototype.touchesSpiderman = function() {
	var spiderman = this.game.spiderman;
	var hitbox = spiderman.getHitbox();

	var left = this.x;
	var right = this.x + this.width();
	var top = this.y;
	var bottom = this.y + this.height();

	return left < hitbox.right && right > hitbox.left && top < hitbox.bottom && bottom > hitbox.top;
}

// thug attack: throws a knife in the direction he is facing
Enemy.prototype.shoot = function() {
	var self = this;
	var knife = this.game.resources.KNIFE;
	var direction = this.facing === DIRECTION.RIGHT ? 1 : -1;
	var knifeWidth = knife.width * this.scale / 2;
	var knifeHeight = knife.height * this.scale / 2;

	var projectile = new Projectile(this.game);
	projectile.name = "KNIFE";
	projectile.team = "ENEMY";
	projectile.owner = this;
	projectile.damage = 1;
	projectile.direction = direction;

	// projectile.x is the knife's TIP. It starts at the thug's body edge (it moves 10px before the
	// first hit check), so spiderman standing in his face / overlapping him is hit too
	projectile.x = direction < 0 ? this.x : this.x + this.width();
	// so knifes height is divided by 4 because, 2 is for center, and another 2 is for 0.5 scale
	projectile.y = this.y + (this.stateImg.height * this.scale / 2) - (knife.height * this.scale / 4);
	projectile.update = function() {
		var ctx = this.ctx;
		var screenX = Math.round(this.x - this.game.cameraX);
		var screenY = Math.round(this.y);

		if (direction < 0) {
			ctx.drawImage(knife, screenX, screenY, knifeWidth, knifeHeight);
		} else {
			// flying right: mirror the image so the blade leads, tip at x
			ctx.save();
			ctx.scale(-1, 1);
			ctx.drawImage(knife, -screenX, screenY, knifeWidth, knifeHeight);
			ctx.restore();
		}

		this.x += 10 * direction;
	}

	this.game.addProjectile(projectile);
}

// default behaviour: stand still, keep facing spiderman, throw a knife every attackInterval frames while visible
Enemy.prototype.behave = function() {
	if (this.isInScreen()) this.faceSpiderman();

	if (this.frame % this.attackInterval === 0 && this.canEngage()) {
		this.shoot();
		this.recoil = 10;
	}
}

Enemy.prototype.drawHealthbar = function() {
	var healthbar = {
		height: 5,
		width: 100,
		style: "red",
		borderWidth: 2,
		borderStyle: "black"
	};

	var x = this.x - this.game.cameraX;
	x -= healthbar.width / 2; // to center the healthbar with the X of the character
	x += this.stateImg.width * this.scale / 2; // to center the healthbar with the X of characters center

	var y      = this.y - (healthbar.height + healthbar.borderWidth * 2) - 5;
	var width  = healthbar.width * this.health / this.maxHealth; // get the width for current health
	var height = healthbar.height;

	var borderX      = x - healthbar.borderWidth;
	var borderY      = y - healthbar.borderWidth;
	var borderWidth  = healthbar.width + healthbar.borderWidth * 2;
	var borderHeight = healthbar.height + healthbar.borderWidth * 2;

	this.ctx.fillStyle = healthbar.borderStyle;
	this.ctx.fillRect(borderX, borderY, borderWidth, borderHeight);

	this.ctx.fillStyle = healthbar.style;
	this.ctx.fillRect(x, y, width, height);
}

Enemy.prototype.draw = function() {
	var img = this.stateImg;
	var ctx = this.ctx;
	var x = this.x - this.game.cameraX;
	var y = this.y;
	var width = img.width * this.scale;
	var height = img.height * this.scale;
	var anim = this.anim;
	var flip = this.facing !== this.imageFacing ? -1 : 1;

	this.drawHealthbar();

	// transforms are applied around the feet so squash / lean / hop look natural;
	// rotation is expressed "toward the facing direction"
	ctx.save();
	ctx.translate(Math.round(x + width / 2), Math.round(y + height + anim.offsetY));
	ctx.rotate(anim.rotation * (this.facing === DIRECTION.RIGHT ? 1 : -1));
	ctx.scale(anim.scaleX * flip, anim.scaleY);
	ctx.drawImage(img, -width / 2, -height, width, height);

	// short white / red flash on the sprite pixels only (no box) after a web hit
	if (this.hitFlashFrames > 0) {
		this.hitFlashFrames--;
		this.wasDamagedOnPreviousFrame = false;
		var color = this.hitFlashFrames % 2 === 0 ? "#ffffff" : "#ff3030";
		this.game.drawTintedSprite(img, -width / 2, -height, width, height, color, 0.75);
	}
	ctx.restore();
}

Enemy.prototype.update = function() {
	this.stateImg = this.game.resources[this.name];

	if (this.health <= 0) {
		return this.remove();
	}

	this.behave();
	this.animate();
	this.draw();

	this.frame++;
}

Enemy.prototype.remove = function() {
	this.game.kills++;
	if (this.game.level && this.levelId !== undefined) this.game.level.killed[this.levelId] = true;
	this.game.addScore(this.score, "enemies");
	this.game.addFloatingText("+" + this.score, this.centerX(), this.y, "white");
	this.game.scene.effects.push(new Burst(this.game, this.centerX(), this.centerY(), "#ffffff", 12));
	this.game.sfx.play("ENEMY_DEFEAT");
	this.game.removeEnemy(this);
}

Enemy.prototype.handleHitWithProjectile = function(projectile) {
	if (projectile.name == "WEB") {
		this.health -= projectile.damage;
		this.wasDamagedOnPreviousFrame = true;
		this.hitFlashFrames = 6;
		if (this.health > 0) this.game.sfx.play("ENEMY_HIT");
	}
}

/* ---------------- Venom: close range chaser ---------------- */

function Venom(game, opts) {
	opts = opts || {};
	opts.name = "VENOM";
	opts.health = opts.health || ENEMIES.VENOM.HEALTH;
	opts.score = opts.score || ENEMIES.VENOM.SCORE;
	opts.scale = opts.scale || ENEMIES.VENOM.SCALE;

	Enemy.call(this, game, opts);

	this.speed = ENEMIES.VENOM.SPEED;
	this.detectRange = ENEMIES.VENOM.DETECT_RANGE;
	this.biteDamage = ENEMIES.VENOM.BITE_DAMAGE;
	this.chasing = false;
}

Venom.prototype = Object.create(Enemy.prototype);
Venom.prototype.constructor = Venom;

// venom: heavy breathing when idle, bounding run with a forward lean when chasing
Venom.prototype.animate = function() {
	var anim = this.anim;
	if (this.chasing) {
		var hop = Math.abs(Math.sin(this.frame * 0.3));
		anim.offsetY = -hop * 6;
		anim.scaleY = 1 + hop * 0.06;
		anim.scaleX = 1.05 - hop * 0.05;
		anim.rotation = 0.14;
	} else {
		var breath = Math.sin(this.frame * 0.07);
		anim.offsetY = 0;
		anim.scaleY = 1 + breath * 0.04;
		anim.scaleX = 1 - breath * 0.03;
		anim.rotation = 0;
	}
}

Venom.prototype.behave = function() {
	var spiderman = this.game.spiderman;
	var hitbox = spiderman.getHitbox();
	var spidermanCenter = (hitbox.left + hitbox.right) / 2;
	var dx = spidermanCenter - this.centerX();

	this.chasing = Math.abs(dx) <= this.detectRange && this.canEngage();

	if (this.chasing) {
		this.faceSpiderman();

		// run toward spiderman, but never off the own roof
		var step = Math.min(Math.abs(dx), this.speed) * (dx > 0 ? 1 : -1);
		this.x += step;

		if (this.roof) {
			var minX = this.roof.x;
			var maxX = this.roof.x + this.roof.width - this.width();
			if (this.x < minX) this.x = minX;
			if (this.x > maxX) this.x = maxX;
		}

		// bite on contact (spiderman's safe time prevents repeated damage)
		if (this.touchesSpiderman()) {
			spiderman.handleHitWithProjectile({ name: "VENOM_BITE", damage: this.biteDamage });
		}
	}
}

/* ---------------- Green Goblin: airborne glider ---------------- */

function Goblin(game, opts) {
	opts = opts || {};
	opts.name = "GOBLIN";
	opts.health = opts.health || ENEMIES.GOBLIN.HEALTH;
	opts.score = opts.score || ENEMIES.GOBLIN.SCORE;
	opts.scale = opts.scale || ENEMIES.GOBLIN.SCALE;
	opts.attackInterval = opts.attackInterval || ENEMIES.GOBLIN.ATTACK_INTERVAL;

	Enemy.call(this, game, opts);

	// the goblin sprite looks to the left
	this.imageFacing = DIRECTION.LEFT;
	this.facing = DIRECTION.LEFT;

	this.anchorX = this.x;
	this.patrolRange = 80;
	this.hoverY = this.y;
	this.bobAmplitude = ENEMIES.GOBLIN.BOB_AMPLITUDE;
	this.patrolSpeed = ENEMIES.GOBLIN.PATROL_SPEED;
	this.bobSpeed = ENEMIES.GOBLIN.BOB_SPEED;
	// random phase so two goblins never move in sync
	this.phase = Math.random() * Math.PI * 2;
	this.previousX = this.x;
}

Goblin.prototype = Object.create(Enemy.prototype);
Goblin.prototype.constructor = Goblin;

// goblin: banks into his turns on the glider, squashes a little at the bottom of each bob
Goblin.prototype.animate = function() {
	var anim = this.anim;
	var vx = this.x - this.previousX;
	var bank = Math.max(-0.3, Math.min(0.3, vx * 0.12));
	// bank is "toward the facing direction": moving the way he looks = lean forward
	anim.rotation = this.facing === DIRECTION.RIGHT ? bank : -bank;
	anim.scaleY = 1 + Math.sin(this.frame * this.bobSpeed) * 0.04;
	anim.scaleX = 1;
	anim.offsetY = 0;
	if (this.recoil > 0) {
		anim.scaleY = 0.92;
		anim.scaleX = 1.06;
		this.recoil--;
	}
}

Goblin.prototype.placeOnRoof = function(roof) {
	this.roof = roof;
	this.anchorX = roof.x + roof.width / 2 - this.width() / 2;
	this.patrolRange = Math.max(40, roof.width / 2 - this.width() / 2 - 10);
	// glide above the roof: the lowest point of the bob is still reachable from the ground
	this.hoverY = roof.y - ENEMIES.GOBLIN.HOVER_HEIGHT - this.height();
	this.x = this.anchorX;
	this.y = this.hoverY;
}

Goblin.prototype.behave = function() {
	var t = this.frame + this.phase * 60;

	this.previousX = this.x;
	this.x = this.anchorX + Math.sin(t * this.patrolSpeed) * this.patrolRange;
	this.y = this.hoverY + Math.sin(t * this.bobSpeed) * this.bobAmplitude;

	// look where he flies, unless spiderman is close: then keep an eye on him
	var spiderman = this.game.spiderman;
	if (Math.abs(spiderman.x - this.x) <= ENEMIES.GOBLIN.AIM_RANGE) {
		this.faceSpiderman();
	} else if (this.x !== this.previousX) {
		this.facing = this.x > this.previousX ? DIRECTION.RIGHT : DIRECTION.LEFT;
	}

	if (this.frame % this.attackInterval === 0 && this.canEngage() && Math.abs(spiderman.x - this.x) <= ENEMIES.GOBLIN.AIM_RANGE) {
		this.shoot();
		this.recoil = 8;
	}
}

// lobs a pumpkin bomb on an arc toward spiderman's current position
Goblin.prototype.shoot = function() {
	var spiderman = this.game.spiderman;
	var gravity = ENEMIES.GOBLIN.BOMB_GRAVITY;
	var speed = ENEMIES.GOBLIN.BOMB_SPEED;

	var bomb = new Projectile(this.game);
	bomb.name = "PUMPKIN_BOMB";
	bomb.team = "ENEMY";
	bomb.owner = this;
	bomb.damage = 1;
	bomb.radius = 7;

	// start just under the glider so the bomb never touches the goblin himself
	bomb.x = this.centerX();
	bomb.y = this.y + this.height() + bomb.radius + 2;

	var target = spiderman.getHitbox();
	var targetX = (target.left + target.right) / 2;
	var targetY = (target.top + target.bottom) / 2;
	var dx = targetX - bomb.x;
	var dy = targetY - bomb.y;
	var time = Math.max(12, Math.sqrt(dx * dx + dy * dy) / speed);

	// ballistic aim: pick velocities so the arc reaches the target after "time" frames
	bomb.velocityX = dx / time;
	bomb.velocityY = dy / time - 0.5 * gravity * time;

	bomb.update = function() {
		var x = this.x - this.game.cameraX;
		var y = this.y;
		var ctx = this.ctx;

		// pumpkin: orange body, green stem, dark grin
		ctx.save();
		ctx.fillStyle = "#ff8a1f";
		ctx.beginPath();
		ctx.arc(x, y, this.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#3fa534";
		ctx.fillRect(x - 1.5, y - this.radius - 4, 3, 5);
		ctx.fillStyle = "#2a1200";
		ctx.fillRect(x - 4, y + 1, 8, 2);
		ctx.fillRect(x - 4, y - 3, 2, 2);
		ctx.fillRect(x + 2, y - 3, 2, 2);
		ctx.restore();

		this.velocityY += gravity;
		this.x += this.velocityX;
		this.y += this.velocityY;

		// bombs explode on the rooftops instead of flying through them
		if (this.velocityY > 0 && this.game.isRoofAtPoint(this.x, this.y + this.radius, { velocityY: this.velocityY, previousFeetY: this.y + this.radius - this.velocityY })) this.remove();
	}

	this.game.addProjectile(bomb);
}

/* ------------------------------------------------------------------
 * Boss: Mysterio
 *
 * Fought in his projection chamber (stage 1-4). Two simple phases:
 *   1. He floats between spots at three heights (ground / ledge / catwalk
 *      level, so webs can reach him), throws green orbs, spawns flickering
 *      copies that also shoot (only the real one takes damage; a copy pops
 *      with one web), and now and then dives at Spider-Man (telegraphed by
 *      a wind-up shake). After every 3 hits he vanishes in smoke and
 *      reappears somewhere else with fresh copies.
 *   2. Below 40 % health: faster, attacks more often, one more copy.
 * ------------------------------------------------------------------ */

var BOSS = {
	MYSTERIO: {
		HEALTH: 30,            // 15 web hits
		SCALE: 0.25,           // 301 px sprite -> 75 px
		SPEED: 2.4,            // hover speed toward the next spot (phase 2: x1.45)
		ATTACK_INTERVAL: 110,  // frames between attacks (phase 2: 70)
		ORB_SPEED: 3.4,
		ORB_DAMAGE: 1,
		COPIES: 2,             // copies per illusion volley (phase 2: 3)
		COPY_ORB_INTERVAL: 190, // frames between a copy's shots
		HITS_PER_TELEPORT: 3,
		PHASE2_AT: 0.4,
		DIVE_WINDUP: 32,
		DIVE_FRAMES: 22,
		SCORE: 300,
		COPY_SCORE: 5,
	},
	// the green goblin (stage 2-4, the oscorp tower rooftop): glides between spots at the three heights of the
	// arena, throws pumpkin bombs (they land, burn a fuse with a danger ring, then explode) and swoops across the
	// roof at spiderman's height (a blinking lane shows it first; his glider stalls after it: a window to hit him).
	// One extra phase below PHASE2_AT: faster, shorter pauses, three bombs a volley, a faster swoop
	GOBLIN: {
		HEALTH: 40,            // 20 web hits
		SCALE: 1.25,           // 71 px sprite -> 89 px
		SPEED: 2.6,            // glide speed between spots (phase 2: x1.35)
		ATTACK_INTERVAL: 120,  // frames between attacks (phase 2: 85)
		BOMBS: 2,              // per volley (phase 2: 3)
		BOMB_SPEED: 6,
		BOMB_GRAVITY: 0.14,
		FUSE: 45,              // frames a landed bomb burns before it explodes (its danger ring blinks)
		BLAST: 62,             // explosion radius
		SWOOP_WINDUP: 55,      // frames the lane is shown before he swoops (phase 2: 45)
		SWOOP_SPEED: 9,        // (phase 2: 11)
		STALL: 75,             // frames his glider sputters after a swoop (phase 2: 55)
		PHASE2_AT: 0.4,
		REFILL_BELOW: 12,      // a web canister drops when the tank runs this low (and none is lying around)
		SCORE: 400,
	},
	// sandman (stage 3-4): a giant who walks the sand floor. Webs do nothing to dry sand; water from the arena's
	// valves soaks him (mud) for SOAK frames, and only then webs hurt him. He slams a giant sand fist where spiderman
	// stands (a red zone + a growing shadow first) and sends ground waves along the floor (red arrows first; jump
	// them). One extra phase below PHASE2_AT: faster, shorter (still visible) wind-ups, a second fist follows the first
	// (aimed where spiderman is when the first slams), waves both ways
	SANDMAN: {
		HEALTH: 48,            // 24 web hits (only while he is soaked)
		SCALE: 0.55,           // 289 px sprite -> 159 px: a giant next to spiderman (60)
		SPEED: 1.1,            // walking speed (phase 2: x1.45)
		KEEP_DISTANCE: 150,    // he walks up to this far from spiderman (center to center)
		MIN_X: 330,            // his center stays between the two side ledges (a gap to them: room to dodge a fist up there)
		MAX_X: 630,
		ATTACK_INTERVAL: 80,   // frames between attacks (phase 2: 60)
		FIST_WINDUP: 56,       // frames the fist's zone is shown before it slams (phase 2: 42)
		FIST_WIDTH: 110,       // the fist's impact zone
		FIST_DROP: 10,         // frames the fist takes to come down
		WAVE_WINDUP: 46,       // frames he crouches (arrows on the floor) before the wave (phase 2: 34)
		WAVE_SPEED: 5,         // (phase 2: 6.2)
		WAVE_HEIGHT: 42,       // low enough to jump
		WAVE_WIDTH: 44,
		SOAK: 210,             // frames he stays soaked (vulnerable) after the water hits him
		SPRAY: 80,             // frames a valve's water falls
		VALVE_COOLDOWN: 540,   // frames before a valve can be opened again
		PHASE2_AT: 0.4,
		REFILL_BELOW: 12,
		SCORE: 500,
	},
};

function Mysterio(game, level, opts) {
	opts = opts || {};
	var cfg = BOSS.MYSTERIO;

	this.game = game;
	this.level = level;
	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.name = "MYSTERIO";
	this.team = "ENEMY";
	this.isBoss = true;
	this.stateImg = game.resources.MYSTERIO;
	this.scale = opts.scale || cfg.SCALE;
	this.maxHealth = opts.health || cfg.HEALTH;
	this.health = this.maxHealth;

	// hover spots (centers) at three heights: a player on the floor / the side ledges / the catwalk can hit them
	this.spots = opts.spots || [];
	this.x = opts.x - this.width() / 2;
	this.y = opts.y - this.height() / 2;
	this.facing = DIRECTION.LEFT;
	this.imageFacing = DIRECTION.LEFT;

	this.state = "ENTER";     // ENTER -> HOVER -> (VOLLEY | DIVE | TELEPORT)* -> DEFEATED
	this.stateFrames = 0;
	this.frame = 0;
	this.target = null;
	this.attackTimer = 80;
	this.hitsSinceTeleport = 0;
	this.hitFlashFrames = 0;
	this.hurtPulse = 0;
	this.alpha = 0;
	this.copies = [];
	this.dive = null;
	this.defeatedFrames = 0;
	this.phase = 1;
}

Mysterio.prototype.width = function() { return this.stateImg.width * this.scale; }
Mysterio.prototype.height = function() { return this.stateImg.height * this.scale; }
Mysterio.prototype.centerX = function() { return this.x + this.width() / 2; }
Mysterio.prototype.centerY = function() { return this.y + this.height() / 2; }

Mysterio.prototype.getHitbox = function() {
	return { left: this.x + 8, top: this.y + 6, right: this.x + this.width() - 8, bottom: this.y + this.height() - 4 };
}

// only solid while actually in the arena (not during the entrance smoke, a teleport or the defeat)
Mysterio.prototype.canBeHit = function() {
	return this.state !== "ENTER" && this.state !== "TELEPORT" && this.state !== "DEFEATED";
}

Mysterio.prototype.healthRatio = function() { return Math.max(0, this.health / this.maxHealth); }

Mysterio.prototype.speed = function() { return BOSS.MYSTERIO.SPEED * (this.phase === 2 ? 1.3 : 1); }
Mysterio.prototype.attackInterval = function() { return this.phase === 2 ? 85 : BOSS.MYSTERIO.ATTACK_INTERVAL; }

Mysterio.prototype.handleHitWithProjectile = function(projectile) {
	if (projectile.name !== "WEB" || !this.canBeHit()) return;
	this.health -= projectile.damage;
	this.hitFlashFrames = 8;
	this.hurtPulse = 14;
	this.hitsSinceTeleport++;
	this.game.sfx.play("ENEMY_HIT");
	this.game.addFloatingText("HIT", this.centerX(), this.y - 6, "#e4b8ff", true);

	if (this.health <= 0) {
		this.health = 0;
		this.startDefeat();
		return;
	}
	if (this.phase === 1 && this.healthRatio() <= BOSS.MYSTERIO.PHASE2_AT) {
		this.phase = 2;
		this.game.addFloatingText("MYSTERIO IS GETTING FASTER!", this.centerX(), this.y - 30, "#7dffb0");
		this.game.sfx.play("ILLUSION");
		// a heart for the second round
		var hx = Math.max(120, Math.min(this.level.width - 120, this.game.spiderman.centerX() + 100));
		this.game.addPickup(new Pickup(this.game, { type: "HEALTH", x: hx, y: this.level.floorY - 32 }));
	}
	if (this.hitsSinceTeleport >= BOSS.MYSTERIO.HITS_PER_TELEPORT && this.state === "HOVER") {
		this.setState("TELEPORT");
	}
}

Mysterio.prototype.setState = function(state) {
	this.state = state;
	this.stateFrames = 0;
}

Mysterio.prototype.pickSpot = function(avoidCurrent) {
	if (!this.spots.length) return { x: this.centerX(), y: this.centerY() };
	var choices = [];
	for (var i = 0; i < this.spots.length; i++) {
		var s = this.spots[i];
		if (avoidCurrent && Math.abs(s.x - this.centerX()) < 60 && Math.abs(s.y - this.centerY()) < 60) continue;
		choices.push(s);
	}
	if (!choices.length) choices = this.spots;
	return choices[Math.floor(Math.random() * choices.length)];
}

Mysterio.prototype.faceSpiderman = function() {
	this.facing = this.game.spiderman.centerX() > this.centerX() ? DIRECTION.RIGHT : DIRECTION.LEFT;
}

Mysterio.prototype.spawnCopies = function() {
	var count = BOSS.MYSTERIO.COPIES + (this.phase === 2 ? 1 : 0);
	this.clearCopies();
	var used = [];
	for (var i = 0; i < count; i++) {
		var spot = this.pickSpot(true);
		var tries = 0;
		while (used.indexOf(spot) > -1 && tries < 8) { spot = this.pickSpot(true); tries++; }
		used.push(spot);
		var copy = new MysterioCopy(this.game, this, spot.x, spot.y, i);
		this.copies.push(copy);
		this.game.addEnemy(copy);
	}
}

Mysterio.prototype.clearCopies = function() {
	// vanish() removes a copy from this.copies, so work on a snapshot
	var copies = this.copies.slice();
	for (var i = 0; i < copies.length; i++) copies[i].vanish(false);
	this.copies = [];
}

Mysterio.prototype.removeCopy = function(copy) {
	var i = this.copies.indexOf(copy);
	if (i > -1) this.copies.splice(i, 1);
}

// a green orb flying straight at spiderman's current position
Mysterio.prototype.shootOrb = function(fromX, fromY, speed) {
	var game = this.game;
	var target = game.spiderman.getHitbox();
	var tx = (target.left + target.right) / 2, ty = (target.top + target.bottom) / 2;
	var dx = tx - fromX, dy = ty - fromY;
	var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));

	var orb = new Projectile(game);
	orb.name = "ORB";
	orb.team = "ENEMY";
	orb.owner = this;
	orb.damage = BOSS.MYSTERIO.ORB_DAMAGE;
	orb.x = fromX;
	orb.y = fromY;
	orb.vx = dx / len * speed;
	orb.vy = dy / len * speed;
	orb.life = 150;
	orb.update = function() {
		var ctx = this.ctx;
		var sx = this.x - this.game.cameraX;
		var t = this.life % 8 < 4;
		PixelArt.rect(ctx, "#1f5a24", sx - 7.5, this.y - 7.5, 15, 15);
		PixelArt.rect(ctx, t ? "#7dffb0" : "#3fa534", sx - 5, this.y - 5, 10, 10);
		PixelArt.rect(ctx, "#e8f7ff", sx - 2.5, this.y - 2.5, 2.5, 2.5);
		this.x += this.vx;
		this.y += this.vy;
		this.life--;
		if (this.life <= 0 || this.game.isRoofAtPoint(this.x, this.y)) this.remove();
	};
	game.addProjectile(orb);
}

// a web canister on the floor every time he teleports (never more than two lying around): the fight can't run dry
Mysterio.prototype.dropWeb = function() {
	var game = this.game;
	var lying = 0;
	for (var i = 0; i < game.scene.pickups.length; i++) if (game.scene.pickups[i].type === "WEB") lying++;
	if (lying >= 2) return;
	var floorY = this.level.floorY;
	var x = 200 + Math.random() * (this.level.width - 400);
	var pickup = new Pickup(game, { type: "WEB", x: x, y: floorY - 32 });
	game.addPickup(pickup);
	game.addFloatingText("WEB FLUID", x, floorY - 60, "#7fb2ff", true);
}

Mysterio.prototype.startDefeat = function() {
	this.setState("DEFEATED");
	this.clearCopies();
	this.dive = null;
	this.game.sfx.play("ENEMY_DEFEAT");
	this.game.addScore(BOSS.MYSTERIO.SCORE, "enemies");
	this.game.kills++;
	this.game.addFloatingText("+" + BOSS.MYSTERIO.SCORE, this.centerX(), this.y - 10, "white");
	// his orbs fade with him
	var projectiles = this.game.scene.projectiles.slice();
	for (var i = 0; i < projectiles.length; i++) if (projectiles[i].name === "ORB") projectiles[i].remove();
}

Mysterio.prototype.update = function() {
	var game = this.game;
	var cfg = BOSS.MYSTERIO;
	this.frame++;
	this.stateFrames++;
	if (this.hurtPulse > 0) this.hurtPulse--;

	// never an unwinnable fight: with an empty web tank and nothing to pick up, a canister lands near spiderman
	if (this.state !== "DEFEATED" && this.state !== "ENTER" && game.spiderman.web <= 0) {
		this.dryFrames = (this.dryFrames || 0) + 1;
		if (this.dryFrames > 60) {
			var lying = 0;
			for (var pi = 0; pi < game.scene.pickups.length; pi++) if (game.scene.pickups[pi].type === "WEB") lying++;
			if (lying === 0) {
				var sx = Math.max(120, Math.min(this.level.width - 120, game.spiderman.centerX() + (game.spiderman.centerX() < this.level.width / 2 ? 120 : -120)));
				var can = new Pickup(game, { type: "WEB", x: sx, y: this.level.floorY - 32 });
				game.addPickup(can);
				game.addFloatingText("WEB FLUID", sx, this.level.floorY - 60, "#7fb2ff", true);
			}
			this.dryFrames = 0;
		}
	} else {
		this.dryFrames = 0;
	}

	switch (this.state) {
		case "ENTER":
			// smoke and a slow fade in, then the fight starts
			this.alpha = Math.min(1, this.stateFrames / 50);
			if (this.stateFrames === 1) game.sfx.play("ILLUSION");
			if (this.stateFrames === 20) game.addFloatingText("WELCOME TO MY SHOW, SPIDER-MAN!", this.centerX(), this.y - 30, "#7dffb0");
			if (this.stateFrames > 70) { this.setState("HOVER"); this.target = this.pickSpot(true); this.attackTimer = 60; }
			break;

		case "HOVER":
			this.alpha = 1;
			this.faceSpiderman();
			this.moveToward(this.target, this.speed());
			if (this.reached(this.target)) this.target = this.pickSpot(true);
			this.attackTimer--;
			if (this.attackTimer <= 0) {
				// alternate: a volley of orbs with copies, then a dive
				if (this.lastAttack === "VOLLEY" && Math.random() < 0.7) this.setState("DIVE"); else this.setState("VOLLEY");
				this.lastAttack = this.state;
				this.attackTimer = this.attackInterval();
			}
			break;

		case "VOLLEY":
			this.alpha = 1;
			this.faceSpiderman();
			if (this.stateFrames === 1) { this.spawnCopies(); game.sfx.play("ILLUSION"); }
			// two orbs from the real one over the volley (three in phase 2)
			if (this.stateFrames === 20 || this.stateFrames === 55 || (this.phase === 2 && this.stateFrames === 75)) {
				this.shootOrb(this.centerX(), this.centerY(), cfg.ORB_SPEED * (this.phase === 2 ? 1.1 : 1));
				game.sfx.play("EMPTY");
			}
			if (this.stateFrames > 85) { this.setState("HOVER"); this.target = this.pickSpot(true); }
			break;

		case "DIVE":
			this.alpha = 1;
			if (this.stateFrames === 1) {
				// the dive goes to where spiderman stands NOW; a marker shows it during the wind-up, so moving
				// away while he shakes always works
				var hb0 = game.spiderman.getHitbox();
				this.diveTarget = { x: (hb0.left + hb0.right) / 2, y: hb0.bottom };
				game.sfx.play("DENY");
			}
			if (this.stateFrames <= cfg.DIVE_WINDUP) {
				// wind-up: shakes and rises a little (the tell)
				this.faceSpiderman();
				this.y -= 0.6;
			} else if (this.stateFrames === cfg.DIVE_WINDUP + 1) {
				this.dive = { fromX: this.x, fromY: this.y, toX: this.diveTarget.x - this.width() / 2, toY: this.diveTarget.y - this.height() + 6, frames: cfg.DIVE_FRAMES * (this.phase === 2 ? 0.85 : 1), t: 0 };
				game.sfx.play("SWING_RELEASE");
			} else if (this.dive) {
				this.dive.t++;
				var f = Math.min(1, this.dive.t / this.dive.frames);
				var ease = f * f;
				this.x = this.dive.fromX + (this.dive.toX - this.dive.fromX) * ease;
				this.y = this.dive.fromY + (this.dive.toY - this.dive.fromY) * ease;
				if (this.touchesSpiderman() && game.spiderman.canBeHit()) {
					game.spiderman.handleHitWithProjectile({ name: "MYSTERIO_DIVE", damage: 1 });
				}
				if (f >= 1 && this.dive.t > this.dive.frames + 18) {
					this.dive = null;
					this.diveTarget = null;
					this.setState("HOVER");
					this.target = this.pickSpot(true);
				}
			}
			break;

		case "TELEPORT":
			// vanish in smoke, reappear at another spot with fresh copies
			if (this.stateFrames === 1) { game.sfx.play("ILLUSION"); this.clearCopies(); }
			this.alpha = Math.max(0, 1 - this.stateFrames / 18);
			if (this.stateFrames === 20) {
				var spot = this.pickSpot(true);
				this.x = spot.x - this.width() / 2;
				this.y = spot.y - this.height() / 2;
				this.hitsSinceTeleport = 0;
				this.dropWeb();
			}
			if (this.stateFrames > 20) this.alpha = Math.min(1, (this.stateFrames - 20) / 15);
			if (this.stateFrames > 38) { this.setState("VOLLEY"); }
			break;

		case "DEFEATED":
			this.alpha = Math.max(0, 1 - this.stateFrames / 90) * (Math.floor(this.stateFrames / 3) % 2 === 0 ? 1 : 0.4);
			if (this.stateFrames % 12 === 0 && this.stateFrames < 80) {
				game.scene.effects.push(new Burst(game, this.centerX() + (Math.random() - 0.5) * 50, this.centerY() + (Math.random() - 0.5) * 50, "#7dffb0", 10));
			}
			if (this.stateFrames === 30) game.addFloatingText("NO... MY SHOW...", this.centerX(), this.y - 30, "#7dffb0");
			if (this.stateFrames > 100) {
				this.level.bossDefeated = true;
				game.removeEnemy(this);
			}
			break;
	}

	this.draw();
}

Mysterio.prototype.moveToward = function(target, speed) {
	if (!target) return;
	var dx = target.x - this.centerX();
	var dy = target.y - this.centerY();
	var len = Math.sqrt(dx * dx + dy * dy);
	if (len < speed) { this.x += dx; this.y += dy; return; }
	this.x += dx / len * speed;
	this.y += dy / len * speed;
}

Mysterio.prototype.reached = function(target) {
	return target && Math.abs(target.x - this.centerX()) < 4 && Math.abs(target.y - this.centerY()) < 4;
}

Mysterio.prototype.touchesSpiderman = function() {
	var hb = this.game.spiderman.getHitbox();
	var me = this.getHitbox();
	return me.left < hb.right && me.right > hb.left && me.top < hb.bottom && me.bottom > hb.top;
}

Mysterio.prototype.draw = function() {
	var ctx = this.ctx;
	var img = this.stateImg;
	var w = this.width(), h = this.height();

	// dive marker on the floor during the wind-up
	if (this.state === "DIVE" && this.diveTarget && this.stateFrames <= BOSS.MYSTERIO.DIVE_WINDUP) {
		var mx = this.diveTarget.x - this.game.cameraX, my = this.diveTarget.y;
		var blink = Math.floor(this.stateFrames / 4) % 2 === 0;
		PixelArt.rect(ctx, blink ? "#ff5fa2" : "#a64dff", mx - 20, my - 5, 40, 5);
		PixelArt.rect(ctx, blink ? "#ff5fa2" : "#a64dff", mx - 2.5, my - 25, 5, 25);
		PixelArt.rect(ctx, blink ? "#ff5fa2" : "#a64dff", mx - 12.5, my - 17.5, 25, 5);
	}
	var x = Math.round(this.x - this.game.cameraX);
	var bob = this.state === "DIVE" && this.stateFrames <= BOSS.MYSTERIO.DIVE_WINDUP ? (this.stateFrames % 2 === 0 ? 3 : -3) : Math.sin(this.frame * 0.06) * 3;
	var y = Math.round(this.y + bob);
	var flip = this.facing !== this.imageFacing;

	ctx.save();
	ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
	// smoke ring while fading in / out
	if (this.alpha < 1) {
		ctx.globalAlpha = (1 - this.alpha) * 0.6;
		PixelArt.rect(ctx, "#3fa534", x - 10, y + h / 2 - 10, w + 20, 20);
		PixelArt.rect(ctx, "#7dffb0", x, y + h / 2 - 5, w, 10);
		ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
	}
	if (flip) { ctx.scale(-1, 1); x = -x - w; }
	ctx.drawImage(img, x, y, w, h);
	if (this.hitFlashFrames > 0) {
		this.hitFlashFrames--;
		this.game.drawTintedSprite(img, x, y, w, h, this.hitFlashFrames % 2 === 0 ? "#ffffff" : "#ff3030", 0.7);
	}
	ctx.restore();
}

/* ------------------------------------------------------------------
 * Boss: the Green Goblin
 *
 * Fought on the oscorp tower rooftop (stage 2-4). He glides between
 * spots at the floor / ledge / catwalk heights (so webs can reach him)
 * and attacks in turns:
 *   - BOMBS: pumpkin bombs thrown in an arc at where spiderman stands.
 *     A landed bomb burns its fuse (a blinking danger ring) and then
 *     explodes: step out of the ring. A bomb hit in the air hurts too.
 *   - SWOOP: he rises to one side and laughs while a blinking lane shows
 *     the height he will fly across (spiderman's height at that moment):
 *     jump over him or get to another height. After the swoop his glider
 *     stalls low at the far side for a moment - the best time to hit him.
 * Below 40 % health he gets faster and more aggressive (one phase only).
 * Web canisters keep coming when the tank runs low; a heart drops once
 * when phase 2 starts.
 * ------------------------------------------------------------------ */

function GoblinBoss(game, level, opts) {
	opts = opts || {};
	var cfg = BOSS.GOBLIN;
	this.game = game;
	this.level = level;
	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.name = "GREEN_GOBLIN";
	this.bossName = "GREEN GOBLIN";
	this.barColor = "#3fa534";
	this.barColorLow = "#ff8a1f";
	this.labelColor = "#8ee27a";
	this.team = "ENEMY";
	this.isBoss = true;
	this.stateImg = game.resources.GOBLIN;
	this.scale = opts.scale || cfg.SCALE;
	this.maxHealth = opts.health || cfg.HEALTH;
	this.health = this.maxHealth;
	this.spots = opts.spots || [];
	this.high = opts.high || [];          // spots above the arena (out of reach) for throwing and swoop wind-ups
	this.imageFacing = DIRECTION.LEFT;
	this.facing = DIRECTION.LEFT;
	// he flies in from the right
	this.x = level.width + 40;
	this.y = (opts.y || 200) - this.height() / 2;
	this.enterTo = { x: opts.x || level.width / 2, y: opts.y || 200 };
	this.state = "ENTER";     // ENTER -> HOVER -> (BOMBS | SWOOP -> STALL)* -> DEFEATED
	this.stateFrames = 0;
	this.frame = 0;
	this.target = null;
	this.attackTimer = 70;
	this.lastAttack = null;
	this.phase = 1;
	this.hitFlashFrames = 0;
	this.hurtPulse = 0;
	this.alpha = 1;
	this.vx = 0;
	this.swoop = null;
	this.refillTimer = 0;
}

GoblinBoss.prototype.width = function() { return this.stateImg.width * this.scale; }
GoblinBoss.prototype.height = function() { return this.stateImg.height * this.scale; }
GoblinBoss.prototype.centerX = function() { return this.x + this.width() / 2; }
GoblinBoss.prototype.centerY = function() { return this.y + this.height() / 2; }
GoblinBoss.prototype.getHitbox = function() {
	return { left: this.x + 10, top: this.y + 8, right: this.x + this.width() - 10, bottom: this.y + this.height() - 6 };
}
GoblinBoss.prototype.canBeHit = function() { return this.state !== "ENTER" && this.state !== "DEFEATED"; }
GoblinBoss.prototype.healthRatio = function() { return Math.max(0, this.health / this.maxHealth); }
GoblinBoss.prototype.phase2At = function() { return BOSS.GOBLIN.PHASE2_AT; }
GoblinBoss.prototype.speed = function() { return BOSS.GOBLIN.SPEED * (this.phase === 2 ? 1.35 : 1); }
GoblinBoss.prototype.attackInterval = function() { return this.phase === 2 ? 85 : BOSS.GOBLIN.ATTACK_INTERVAL; }
GoblinBoss.prototype.setState = function(state) { this.state = state; this.stateFrames = 0; }
GoblinBoss.prototype.faceSpiderman = function() { this.facing = this.game.spiderman.centerX() > this.centerX() ? DIRECTION.RIGHT : DIRECTION.LEFT; }
GoblinBoss.prototype.moveToward = Mysterio.prototype.moveToward;
GoblinBoss.prototype.reached = Mysterio.prototype.reached;
GoblinBoss.prototype.touchesSpiderman = Mysterio.prototype.touchesSpiderman;

GoblinBoss.prototype.pickSpot = function(list) {
	list = list && list.length ? list : this.spots;
	if (!list.length) return { x: this.centerX(), y: this.centerY() };
	var choices = [];
	for (var i = 0; i < list.length; i++) {
		if (Math.abs(list[i].x - this.centerX()) < 80 && Math.abs(list[i].y - this.centerY()) < 60) continue;
		choices.push(list[i]);
	}
	if (!choices.length) choices = list;
	return choices[Math.floor(Math.random() * choices.length)];
}

GoblinBoss.prototype.handleHitWithProjectile = function(projectile) {
	if (projectile.name !== "WEB" || !this.canBeHit()) return;
	var game = this.game;
	this.health -= projectile.damage;
	this.hitFlashFrames = 8;
	this.hurtPulse = 14;
	game.sfx.play("ENEMY_HIT");
	game.addFloatingText("HIT", this.centerX(), this.y - 6, this.labelColor, true);
	if (this.health <= 0) {
		this.health = 0;
		this.startDefeat();
		return;
	}
	if (this.phase === 1 && this.healthRatio() <= BOSS.GOBLIN.PHASE2_AT) {
		this.phase = 2;
		game.addFloatingText("THE GOBLIN IS FURIOUS!", this.centerX(), this.y - 30, "#ff8a1f");
		game.sfx.play("GATE_LOCKED");
		// one heart for the last round, on the floor near spiderman
		var hx = Math.max(120, Math.min(this.level.width - 120, game.spiderman.centerX() + (game.spiderman.centerX() < this.level.width / 2 ? 140 : -140)));
		game.addPickup(new Pickup(game, { type: "HEALTH", x: hx, y: this.level.floorY - 32 }));
		game.addFloatingText("HEART", hx, this.level.floorY - 60, "#ff8080", true);
	}
}

// a pumpkin bomb lobbed on an arc at (tx, ty). It lands, burns its fuse (danger ring) and explodes
GoblinBoss.prototype.throwBomb = function(tx, ty) {
	var game = this.game;
	var cfg = BOSS.GOBLIN;
	var bomb = new Projectile(game);
	bomb.name = "PUMPKIN_BOMB";
	bomb.team = "ENEMY";
	bomb.owner = this;
	bomb.damage = 1;
	bomb.radius = 9;
	bomb.boss = this;
	bomb.x = this.centerX() + (this.facing === DIRECTION.RIGHT ? 20 : -20);
	bomb.y = this.y + this.height() * 0.55;
	var dx = tx - bomb.x, dy = ty - bomb.y;
	var time = Math.max(26, Math.sqrt(dx * dx + dy * dy) / cfg.BOMB_SPEED);
	bomb.velocityX = dx / time;
	bomb.velocityY = dy / time - 0.5 * cfg.BOMB_GRAVITY * time;
	bomb.fuse = -1;            // -1 while flying, then counts down on the ground
	bomb.landAtOrBelow = ty - 20;   // it falls through ledges above its target (hiding under one is no shelter)
	bomb.explode = function() {
		if (this.exploded) return;
		this.exploded = true;
		var g = this.game, s = g.spiderman, hb = s.getHitbox();
		var cx = Math.max(hb.left, Math.min(this.x, hb.right)), cy = Math.max(hb.top, Math.min(this.y, hb.bottom));
		if ((cx - this.x) * (cx - this.x) + (cy - this.y) * (cy - this.y) <= cfg.BLAST * cfg.BLAST && s.canBeHit()) s.hitByHazard(this.x);
		g.scene.effects.push(new Burst(g, this.x, this.y - 10, "#ff8a1f", 14));
		g.scene.effects.push(new Burst(g, this.x, this.y - 10, "#ffd83d", 8));
		g.sfx.play("BOMB");
		g.shake = Math.max(g.shake || 0, 6);
		this.remove();
	};
	// touching a bomb (flying or lit) sets it off right there
	bomb.handleHitWithCharacter = function(character) {
		if (character.name === "SPIDER_MAN") this.explode();
	};
	bomb.update = function() {
		var ctx = this.ctx;
		var x = this.x - this.game.cameraX, y = this.y;
		if (this.fuse < 0) {
			this.velocityY += cfg.BOMB_GRAVITY;
			this.x += this.velocityX;
			this.y += this.velocityY;
			var land = this.velocityY > 0 ? this.game.isRoofAtPoint(this.x, this.y + this.radius, { velocityY: this.velocityY, previousFeetY: this.y + this.radius - this.velocityY }) : null;
			if (land && land.oneWay && land.y < this.landAtOrBelow) land = null;
			if (land) { this.y = land.y - this.radius; this.fuse = cfg.FUSE; this.game.sfx.play("LAND"); }
			else if (this.y > this.boss.level.floorY + 200) { this.remove(); return; }
		} else {
			// lit: the danger ring blinks faster and faster
			this.fuse--;
			var blink = Math.floor(this.fuse / Math.max(2, Math.floor(this.fuse / 6))) % 2 === 0;
			ctx.save();
			ctx.globalAlpha = 0.22 + (blink ? 0.25 : 0);
			ctx.fillStyle = "#ff3030";
			ctx.beginPath(); ctx.arc(x, y + this.radius, cfg.BLAST, Math.PI, 0); ctx.fill();
			ctx.globalAlpha = blink ? 0.9 : 0.5;
			ctx.strokeStyle = "#ffd83d";
			ctx.lineWidth = 2;
			ctx.beginPath(); ctx.arc(x, y + this.radius, cfg.BLAST, Math.PI, 0); ctx.stroke();
			ctx.restore();
			if (this.fuse <= 0) { this.explode(); return; }
		}
		// the pumpkin: orange body, dark grin, green stem, a spark on the fuse once lit
		ctx.save();
		ctx.fillStyle = "#ff8a1f";
		ctx.beginPath(); ctx.arc(x, y, this.radius, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = "#c45a00";
		ctx.fillRect(x - 1, y - this.radius, 2, this.radius * 2);
		ctx.fillStyle = "#2a1200";
		ctx.fillRect(x - 5, y + 2, 10, 2);
		ctx.fillRect(x - 5, y - 4, 3, 3);
		ctx.fillRect(x + 2, y - 4, 3, 3);
		ctx.fillStyle = "#3fa534";
		ctx.fillRect(x - 1.5, y - this.radius - 5, 3, 6);
		if (this.fuse >= 0 && this.fuse % 6 < 3) { ctx.fillStyle = "#fff2a8"; ctx.fillRect(x + 2, y - this.radius - 8, 4, 4); }
		ctx.restore();
	};
	game.addProjectile(bomb);
	game.sfx.play("JUMP");
}

// the lane of a swoop: the height spiderman stands at when the wind-up starts (his last ground if airborne)
GoblinBoss.prototype.swoopLaneY = function() {
	var s = this.game.spiderman;
	var feet = s.onGround ? s.y + s.bodyHeight() : (this.lastGroundFeet || this.level.floorY);
	return feet - 42;
}

GoblinBoss.prototype.dropWeb = function(nearX) {
	var game = this.game;
	var level = this.level;
	var x = Math.max(120, Math.min(level.width - 120, nearX));
	var pickup = new Pickup(game, { type: "WEB", x: x, y: level.floorY - 32 });
	game.addPickup(pickup);
	game.addFloatingText("WEB FLUID", x, level.floorY - 60, "#7fb2ff", true);
}

GoblinBoss.prototype.startDefeat = function() {
	this.setState("DEFEATED");
	this.swoop = null;
	var game = this.game;
	game.sfx.play("ENEMY_DEFEAT");
	game.addScore(BOSS.GOBLIN.SCORE, "enemies");
	game.kills++;
	game.addFloatingText("+" + BOSS.GOBLIN.SCORE, this.centerX(), this.y - 10, "white");
	// his bombs fizzle out with him
	var projectiles = game.scene.projectiles.slice();
	for (var i = 0; i < projectiles.length; i++) if (projectiles[i].name === "PUMPKIN_BOMB") projectiles[i].remove();
}

GoblinBoss.prototype.update = function() {
	var game = this.game;
	var cfg = BOSS.GOBLIN;
	var s = game.spiderman;
	this.frame++;
	this.stateFrames++;
	if (this.hurtPulse > 0) this.hurtPulse--;
	if (s.onGround) this.lastGroundFeet = s.y + s.bodyHeight();
	var px = this.x;

	// web refills: a canister whenever the tank runs low and none is lying around (right next to him when it is empty)
	if (this.state !== "DEFEATED" && this.state !== "ENTER") {
		var lying = 0;
		for (var pi = 0; pi < game.scene.pickups.length; pi++) if (game.scene.pickups[pi].type === "WEB") lying++;
		if (s.web <= cfg.REFILL_BELOW && lying === 0) {
			this.refillTimer++;
			if (this.refillTimer > (s.web <= 0 ? 40 : 150)) {
				this.dropWeb(s.centerX() + (s.centerX() < this.level.width / 2 ? 130 : -130));
				this.refillTimer = 0;
			}
		} else {
			this.refillTimer = 0;
		}
	}

	switch (this.state) {
		case "ENTER":
			// swoops in from the right with a laugh, then the fight starts
			this.facing = DIRECTION.LEFT;
			this.moveToward(this.enterTo, 6);
			if (this.stateFrames === 10) game.addFloatingText("HA HA HA! WELCOME TO THE TOP, SPIDER-MAN!", this.enterTo.x, this.enterTo.y - 70, "#8ee27a");
			if (this.stateFrames === 10) game.sfx.play("ILLUSION");
			if (this.reached(this.enterTo) && this.stateFrames > 80) { this.setState("HOVER"); this.target = this.pickSpot(); }
			break;

		case "HOVER":
			this.faceSpiderman();
			this.moveToward(this.target, this.speed());
			if (this.reached(this.target)) this.target = this.pickSpot();
			if (--this.attackTimer <= 0) {
				var next = this.lastAttack === "BOMBS" && Math.random() < 0.65 ? "SWOOP" : (this.lastAttack === "SWOOP" ? "BOMBS" : (Math.random() < 0.5 ? "BOMBS" : "SWOOP"));
				this.lastAttack = next;
				this.setState(next);
				this.attackTimer = this.attackInterval();
				if (next === "BOMBS") this.target = this.pickSpot(this.high);
			}
			break;

		case "BOMBS":
			// climbs to a throwing spot, then lobs a volley at where spiderman is
			this.faceSpiderman();
			this.moveToward(this.target, this.speed() * 1.3);
			var count = cfg.BOMBS + (this.phase === 2 ? 1 : 0);
			var first = 40, gap = 22;
			if (this.stateFrames === first - 14) game.addFloatingText("CATCH!", this.centerX(), this.y - 14, "#ff8a1f", true);
			for (var b = 0; b < count; b++) {
				if (this.stateFrames === first + b * gap) {
					var hb = s.getHitbox();
					var spread = count === 3 ? (b - 1) * 90 : (b === 0 ? 0 : (s.centerX() < this.centerX() ? -90 : 90));
					var tx = Math.max(40, Math.min(this.level.width - 40, (hb.left + hb.right) / 2 + spread));
					this.throwBomb(tx, hb.bottom - 10);
					this.recoil = 8;
				}
			}
			if (this.stateFrames > first + count * gap + 20) { this.setState("HOVER"); this.target = this.pickSpot(); }
			break;

		case "SWOOP":
			var windup = this.phase === 2 ? cfg.SWOOP_WINDUP - 10 : cfg.SWOOP_WINDUP;
			if (this.stateFrames === 1) {
				// start on the side farther from spiderman, at his height; the lane blinks meanwhile
				var fromLeft = s.centerX() > this.level.width / 2;
				this.swoop = { laneY: this.swoopLaneY(), dir: fromLeft ? 1 : -1, startX: fromLeft ? 80 : this.level.width - 80 };
				game.addFloatingText("HE HE HE!", this.centerX(), this.y - 20, "#8ee27a");
				game.sfx.play("DENY");
			}
			var sw = this.swoop;
			if (!sw) { this.setState("HOVER"); break; }
			// the wind-up lasts at least "windup" frames AND until he is at the start of the lane (so the rush always
			// comes from the far side, never out of the middle of the roof)
			if (!sw.rushing) {
				this.facing = sw.dir > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
				var startSpot = { x: sw.startX, y: sw.laneY - 40 };
				this.moveToward(startSpot, 9);
				if ((this.stateFrames > windup && this.reached(startSpot)) || this.stateFrames > windup + 40) {
					sw.rushing = true;
					this.x = sw.startX - this.width() / 2;
					this.y = sw.laneY - 40 - this.height() / 2;
					game.sfx.play("SWING_RELEASE");
				}
			} else {
				// a quick dip into the lane, then straight across
				var targetCY = sw.laneY;
				this.y += (targetCY - this.centerY()) * 0.35;
				this.x += sw.dir * (this.phase === 2 ? cfg.SWOOP_SPEED + 2 : cfg.SWOOP_SPEED);
				if (this.touchesSpiderman() && s.canBeHit()) s.hitByHazard(this.centerX() - sw.dir * 30);
				var endX = sw.dir > 0 ? this.level.width - 80 : 80;
				if ((sw.dir > 0 && this.centerX() >= endX) || (sw.dir < 0 && this.centerX() <= endX)) {
					this.setState("STALL");
					// (centered over the roof: he is at its edge now)
					game.addFloatingText("HIS GLIDER STALLS - HIT HIM!", this.level.width / 2, this.y - 30, "#ffd83d", true);
				}
			}
			break;

		case "STALL":
			// the glider sputters: he hangs in the lane at the far side, sinking and smoking a little
			var stall = this.phase === 2 ? cfg.STALL - 20 : cfg.STALL;
			this.faceSpiderman();
			this.y += Math.sin(this.stateFrames * 0.3) * 0.8;
			if (this.stateFrames % 10 === 0) game.scene.effects.push(new Burst(game, this.centerX() - 10, this.y + this.height() - 10, "#8d949b", 3));
			if (this.stateFrames > stall) { this.swoop = null; this.setState("HOVER"); this.target = this.pickSpot(); }
			break;

		case "DEFEATED":
			// spins off his glider and drops out of sight
			this.y += Math.min(8, this.stateFrames * 0.15);
			this.x += this.facing === DIRECTION.LEFT ? 1.5 : -1.5;
			this.alpha = Math.max(0, 1 - this.stateFrames / 110);
			if (this.stateFrames % 10 === 0 && this.stateFrames < 90) {
				game.scene.effects.push(new Burst(game, this.centerX() + (Math.random() - 0.5) * 50, this.centerY() + (Math.random() - 0.5) * 40, this.stateFrames % 20 === 0 ? "#3fa534" : "#ff8a1f", 10));
			}
			if (this.stateFrames === 25) game.addFloatingText("THIS ISN'T OVER, PARKER!", this.centerX(), this.y - 30, "#8ee27a");
			if (this.stateFrames > 110) {
				this.level.bossDefeated = true;
				game.removeEnemy(this);
			}
			break;
	}
	this.vx = this.x - px;
	if (this.recoil > 0) this.recoil--;
	this.draw();
}

GoblinBoss.prototype.draw = function() {
	var ctx = this.ctx;
	var img = this.stateImg;
	var w = this.width(), h = this.height();
	var cam = this.game.cameraX;
	var cfg = BOSS.GOBLIN;

	// swoop wind-up: a blinking lane of arrows across the roof at the height he will fly
	if (this.state === "SWOOP" && this.swoop && !this.swoop.rushing) {
		var on = Math.floor(this.stateFrames / 5) % 2 === 0;
		var ly = this.swoop.laneY;
		ctx.save();
		ctx.globalAlpha = on ? 0.9 : 0.45;
		for (var ax = 40; ax < this.level.width - 40; ax += 70) {
			var sx = ax - cam, dir = this.swoop.dir;
			PixelArt.rect(ctx, "#ff3030", sx, ly - 1.25, 30, 2.5);
			PixelArt.rect(ctx, "#ff3030", sx + (dir > 0 ? 30 : -5), ly - 6.25, 5, 12.5);
		}
		PixelArt.rect(ctx, "rgba(255, 48, 48, 0.12)", 40 - cam, ly - 40, this.level.width - 80, 80);
		ctx.restore();
	}

	var x = Math.round(this.x - cam);
	var shake = this.state === "SWOOP" && this.swoop && !this.swoop.rushing ? (this.stateFrames % 2 === 0 ? 2 : -2) : 0;
	var bob = this.state === "HOVER" || this.state === "BOMBS" ? Math.sin(this.frame * 0.07) * 4 : 0;
	var y = Math.round(this.y + bob);
	// banking with his speed, a throwing recoil, a tumble when defeated
	var tilt = Math.max(-0.35, Math.min(0.35, this.vx * 0.04));
	if (this.state === "DEFEATED") tilt = this.stateFrames * 0.12;
	ctx.save();
	ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
	ctx.translate(x + w / 2 + shake, y + h / 2 - (this.recoil || 0) * 0.5);
	ctx.rotate(tilt);
	if (this.facing !== this.imageFacing) ctx.scale(-1, 1);
	ctx.drawImage(img, -w / 2, -h / 2, w, h);
	if (this.hitFlashFrames > 0) {
		this.hitFlashFrames--;
		this.game.drawTintedSprite(img, -w / 2, -h / 2, w, h, this.hitFlashFrames % 2 === 0 ? "#ffffff" : "#ff3030", 0.7);
	}
	ctx.restore();
	// a sputtering glider: sparks under him
	if (this.state === "STALL" && this.frame % 6 < 3) PixelArt.rect(ctx, "#ffd83d", x + w / 2 - 10, y + h - 5, 5, 5);
}

/* ---------- sandman (stage 3-4): a giant of sand. Only water makes him vulnerable ---------- */

function Sandman(game, level, opts) {
	opts = opts || {};
	var cfg = BOSS.SANDMAN;
	this.game = game;
	this.level = level;
	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.name = "SANDMAN";
	this.bossName = "SANDMAN";
	this.barColor = "#e6cf5c";
	this.barColorLow = "#ff8a1f";
	this.labelColor = "#f6eeb0";
	this.statusColor = "#7fd0ff";
	this.team = "ENEMY";
	this.isBoss = true;
	this.stateImg = game.resources.SANDMAN;
	this.scale = opts.scale || cfg.SCALE;
	this.maxHealth = opts.health || cfg.HEALTH;
	this.health = this.maxHealth;
	this.floorY = opts.y !== undefined ? opts.y : level.floorY;   // the sand floor he walks on
	this.x = (opts.x !== undefined ? opts.x : level.width / 2) - this.width() / 2;
	this.y = this.floorY - this.height();
	this.state = "ENTER";     // ENTER -> WALK -> (FIST | WAVE) -> RECOVER -> WALK ... ; SOAKED -> DRY -> WALK ; DEFEATED
	this.stateFrames = 0;
	this.frame = 0;
	this.phase = 1;
	this.attackTimer = 90;
	this.lastAttack = null;
	this.soakFrames = 0;
	this.fists = [];          // { x, surface, state: WARN | DROP | REST | CRUMBLE, t, windup }
	this.waves = [];          // { x, dir, speed }
	this.waveDirs = [];
	this.noEffectCooldown = 0;
	this.refillTimer = 0;
	this.hitFlashFrames = 0;
	this.hurtPulse = 0;
	this.rise = 0;            // how much of him is out of the sand (entering)
	this.melt = 0;            // how far he has melted into a mud pile (defeated)
}

Sandman.prototype.width = function() { return this.stateImg.width * this.scale; }
Sandman.prototype.height = function() { return this.stateImg.height * this.scale; }
Sandman.prototype.centerX = function() { return this.x + this.width() / 2; }
Sandman.prototype.centerY = function() { return this.y + this.height() / 2; }
Sandman.prototype.getHitbox = function() {
	var w = this.width(), h = this.height();
	var top = this.y + h * 0.05 + h * (1 - this.rise) + h * this.melt;
	return { left: this.x + w * 0.12, top: Math.min(top, this.floorY - 2), right: this.x + w * 0.88, bottom: this.floorY };
}
// webs collide with him except while he rises / melts; they only hurt while he is soaked
Sandman.prototype.canBeHit = function() { return this.state !== "ENTER" && this.state !== "DEFEATED"; }
Sandman.prototype.isSoaked = function() { return this.soakFrames > 0; }
Sandman.prototype.healthRatio = function() { return Math.max(0, this.health / this.maxHealth); }
Sandman.prototype.phase2At = function() { return BOSS.SANDMAN.PHASE2_AT; }
Sandman.prototype.speed = function() { return BOSS.SANDMAN.SPEED * (this.phase === 2 ? 1.45 : 1); }
Sandman.prototype.attackInterval = function() { return this.phase === 2 ? 60 : BOSS.SANDMAN.ATTACK_INTERVAL; }
Sandman.prototype.fistWindup = function() { return this.phase === 2 ? 42 : BOSS.SANDMAN.FIST_WINDUP; }
Sandman.prototype.waveWindup = function() { return this.phase === 2 ? 34 : BOSS.SANDMAN.WAVE_WINDUP; }
Sandman.prototype.waveSpeed = function() { return this.phase === 2 ? 6.2 : BOSS.SANDMAN.WAVE_SPEED; }
Sandman.prototype.setState = function(state) { this.state = state; this.stateFrames = 0; }
Sandman.prototype.touchesSpiderman = Mysterio.prototype.touchesSpiderman;
Sandman.prototype.statusText = function() {
	if (this.isSoaked()) return "SOAKED - HIT HIM!";
	if (this.state === "WALK" || this.state === "RECOVER") return "DRY SAND";      // (short: the bar's row also holds the health)
	return "";
}

Sandman.prototype.handleHitWithProjectile = function(projectile) {
	if (projectile.name !== "WEB" || !this.canBeHit()) return;
	var game = this.game;
	if (!this.isSoaked()) {
		// dry sand: the web just puffs through it
		game.scene.effects.push(new Burst(game, projectile.x, projectile.y, "#e6cf5c", 8));
		if (this.noEffectCooldown <= 0) {
			this.noEffectCooldown = 70;
			game.sfx.play("SAND_PUFF");
			game.addFloatingText("NO EFFECT - SOAK HIM FIRST!", this.centerX(), this.y - 10, "#f6eeb0", true);
		}
		return;
	}
	this.health -= projectile.damage;
	this.hitFlashFrames = 8;
	this.hurtPulse = 14;
	game.sfx.play("ENEMY_HIT");
	game.addFloatingText("HIT", this.centerX(), this.y - 6, "#7fd0ff", true);
	game.scene.effects.push(new Burst(game, projectile.x, projectile.y, "#6a5a3a", 8));
	if (this.health <= 0) {
		this.health = 0;
		this.startDefeat();
		return;
	}
	if (this.phase === 1 && this.healthRatio() <= BOSS.SANDMAN.PHASE2_AT) {
		this.phase = 2;
		game.addFloatingText("SANDMAN IS FURIOUS!", this.centerX(), this.y - 30, "#ff8a1f");
		game.sfx.play("RUMBLE");
		// one heart for the last round, near spiderman
		var hx = Math.max(60, Math.min(this.level.width - 60, game.spiderman.centerX() + (game.spiderman.centerX() < this.level.width / 2 ? 120 : -120)));
		game.addPickup(new Pickup(game, { type: "HEALTH", x: hx, y: this.floorY - 32 }));
		game.addFloatingText("HEART", hx, this.floorY - 60, "#ff8080", true);
	}
}

// the water got him: soft wet sand for SOAK frames (no attacks, no contact damage, webs hurt). His pending fists
// crumble. A soak is not refreshed while it lasts
Sandman.prototype.soak = function() {
	if (this.state === "ENTER" || this.state === "DEFEATED" || this.isSoaked()) return false;
	var game = this.game;
	this.soakFrames = BOSS.SANDMAN.SOAK;
	for (var i = this.fists.length - 1; i >= 0; i--) if (this.fists[i].state === "WARN") this.fists.splice(i, 1);
	this.waveDirs = [];
	this.setState("SOAKED");
	game.sfx.play("SPLASH");
	game.addFloatingText("SOAKED! WEB HIM NOW!", this.centerX(), this.y - 24, "#7fd0ff");
	return true;
}

Sandman.prototype.dropWeb = function(nearX) {
	var game = this.game;
	var x = Math.max(60, Math.min(this.level.width - 60, nearX));
	game.addPickup(new Pickup(game, { type: "WEB", x: x, y: this.floorY - 32 }));
	game.addFloatingText("WEB FLUID", x, this.floorY - 60, "#7fb2ff", true);
}

Sandman.prototype.startDefeat = function() {
	this.setState("DEFEATED");
	this.fists = [];
	this.waves = [];
	this.soakFrames = 0;
	var game = this.game;
	game.sfx.play("ENEMY_DEFEAT");
	game.addScore(BOSS.SANDMAN.SCORE, "enemies");
	game.kills++;
	game.addFloatingText("+" + BOSS.SANDMAN.SCORE, this.centerX(), this.y - 10, "white");
}

// the surface spiderman is on (or would land on) at x: where a fist aimed at him comes down
Sandman.prototype.surfaceUnder = function(x, feet) {
	var best = this.floorY;
	var roofs = this.game.scene.roofs;
	for (var i = 0; i < roofs.length; i++) {
		var r = roofs[i];
		if (!r.isSolid() || x < r.x || x > r.x + r.fullWidth) continue;
		if (r.y >= feet - 4 && r.y < best) best = r.y;
	}
	return best;
}

Sandman.prototype.startFists = function() {
	var game = this.game;
	var s = game.spiderman;
	var cfg = BOSS.SANDMAN;
	var feet = s.y + s.bodyHeight();
	var half = cfg.FIST_WIDTH / 2;
	var tx = Math.max(half + 20, Math.min(this.level.width - half - 20, s.centerX()));
	this.fists.push({ x: tx, surface: this.surfaceUnder(tx, feet), state: "WARN", t: 0, windup: this.fistWindup(), follow: this.phase === 2 });
	game.sfx.play("RUMBLE");
	game.addFloatingText("SAND FIST!", this.centerX(), this.y - 16, "#ff8a1f", true);
}

Sandman.prototype.updateFists = function() {
	var game = this.game;
	var s = game.spiderman;
	var cfg = BOSS.SANDMAN;
	for (var i = this.fists.length - 1; i >= 0; i--) {
		var f = this.fists[i];
		f.t++;
		if (f.state === "WARN" && f.t >= f.windup) {
			f.state = "DROP"; f.t = 0;
			// furious: a second fist follows, aimed at where spiderman is now (its own, shorter warning)
			if (f.follow) {
				var half = cfg.FIST_WIDTH / 2, fx = Math.max(half + 20, Math.min(this.level.width - half - 20, s.centerX()));
				this.fists.push({ x: fx, surface: this.surfaceUnder(fx, s.y + s.bodyHeight()), state: "WARN", t: 0, windup: 32, follow: false });
				game.sfx.play("RUMBLE");
			}
		}
		else if (f.state === "DROP" && f.t >= cfg.FIST_DROP) {
			f.state = "REST"; f.t = 0;
			// the slam: a heart for anyone in its zone
			var hb = s.getHitbox();
			if (hb.right > f.x - cfg.FIST_WIDTH / 2 && hb.left < f.x + cfg.FIST_WIDTH / 2 && hb.bottom > f.surface - 120 && hb.top < f.surface && s.canBeHit()) s.hitByHazard(f.x);
			game.scene.effects.push(new Burst(game, f.x - 30, f.surface - 6, "#e6cf5c", 12));
			game.scene.effects.push(new Burst(game, f.x + 30, f.surface - 6, "#b59a3a", 12));
			game.shake = Math.max(game.shake || 0, 9);
			game.sfx.play("CARGO_DROP");
		} else if (f.state === "REST" && f.t >= 24) { f.state = "CRUMBLE"; f.t = 0; }
		else if (f.state === "CRUMBLE" && f.t >= 18) this.fists.splice(i, 1);
	}
}

Sandman.prototype.startWave = function() {
	var s = this.game.spiderman;
	this.waveDirs = this.phase === 2 ? [-1, 1] : [s.centerX() < this.centerX() ? -1 : 1];
	this.game.sfx.play("RUMBLE");
	this.game.addFloatingText("GROUND WAVE - JUMP!", this.centerX(), this.y - 16, "#ff8a1f", true);
}

Sandman.prototype.releaseWaves = function() {
	for (var i = 0; i < this.waveDirs.length; i++) {
		var dir = this.waveDirs[i];
		this.waves.push({ x: this.centerX() + dir * this.width() * 0.38, dir: dir, speed: this.waveSpeed() });
	}
	this.waveDirs = [];
	this.game.sfx.play("SAND_WAVE");
	this.game.shake = Math.max(this.game.shake || 0, 6);
}

Sandman.prototype.updateWaves = function() {
	var game = this.game;
	var s = game.spiderman;
	var cfg = BOSS.SANDMAN;
	for (var i = this.waves.length - 1; i >= 0; i--) {
		var w = this.waves[i];
		w.x += w.dir * w.speed;
		if (w.x < 25 || w.x > this.level.width - 25) {
			game.scene.effects.push(new Burst(game, w.x, this.floorY - 10, "#e6cf5c", 8));
			this.waves.splice(i, 1);
			continue;
		}
		// (a forgiving hit area: 6 px inside the drawn wave on every side)
		var hb = s.getHitbox();
		if (hb.right > w.x - cfg.WAVE_WIDTH / 2 + 6 && hb.left < w.x + cfg.WAVE_WIDTH / 2 - 6 && hb.bottom > this.floorY - cfg.WAVE_HEIGHT + 6 && hb.top < this.floorY && s.canBeHit()) {
			s.hitByHazard(w.x - w.dir * 40);
		}
	}
}

Sandman.prototype.update = function() {
	var game = this.game;
	var cfg = BOSS.SANDMAN;
	var s = game.spiderman;
	this.frame++;
	this.stateFrames++;
	if (this.hurtPulse > 0) this.hurtPulse--;
	if (this.noEffectCooldown > 0) this.noEffectCooldown--;

	if (this.state !== "DEFEATED" && this.state !== "ENTER") {
		// web refills: a canister whenever the tank runs low and none is lying around (soon when it is empty)
		var lying = 0;
		for (var pi = 0; pi < game.scene.pickups.length; pi++) if (game.scene.pickups[pi].type === "WEB") lying++;
		if (s.web <= cfg.REFILL_BELOW && lying === 0) {
			if (++this.refillTimer > (s.web <= 0 ? 40 : 150)) {
				this.dropWeb(s.centerX() + (s.centerX() < this.level.width / 2 ? 110 : -110));
				this.refillTimer = 0;
			}
		} else {
			this.refillTimer = 0;
		}
		// the water: standing in a valve's stream soaks him
		var sprays = this.level.activeSprays();
		var me = this.getHitbox();
		for (var si = 0; si < sprays.length; si++) {
			var sp = sprays[si];
			if (me.right > sp.left && me.left < sp.right && me.top < sp.bottom && me.bottom > sp.top) { this.soak(); break; }
		}
		// touching dry sand hurts
		if (!this.isSoaked() && this.state !== "DRY" && this.touchesSpiderman() && s.canBeHit()) s.hitByHazard(this.centerX());
	}
	this.updateFists();
	this.updateWaves();

	switch (this.state) {
		case "ENTER":
			// rises out of the sand in the middle of the dock
			this.rise = Math.min(1, this.stateFrames / 90);
			if (this.stateFrames % 6 === 0 && this.rise < 1) game.scene.effects.push(new Burst(game, this.centerX() + (Math.random() - 0.5) * 80, this.floorY - 4, "#e6cf5c", 5));
			if (this.stateFrames === 1) game.sfx.play("RUMBLE");
			if (this.stateFrames === 30) game.addFloatingText("YOU CAN'T HURT SAND, SPIDER-MAN!", this.centerX(), this.floorY - this.height() - 30, "#f6eeb0");
			if (this.stateFrames > 110) { this.rise = 1; this.setState("WALK"); }
			break;

		case "WALK":
			// walks after spiderman (stops at KEEP_DISTANCE), staying between the ledges
			var dx = s.centerX() - this.centerX();
			if (Math.abs(dx) > cfg.KEEP_DISTANCE) this.x += (dx > 0 ? 1 : -1) * Math.min(this.speed(), Math.abs(dx) - cfg.KEEP_DISTANCE);
			this.x = Math.max(cfg.MIN_X, Math.min(cfg.MAX_X, this.centerX())) - this.width() / 2;
			if (--this.attackTimer <= 0) {
				// up on a ledge a wave cannot reach him: the fist. On the floor: mostly waves, never three of a kind
				var high = (s.onGround ? s.y + s.bodyHeight() : this.floorY) < this.floorY - 20;
				var next = high ? "FIST" : (this.lastAttack === "WAVE" ? (Math.random() < 0.7 ? "FIST" : "WAVE") : (Math.random() < 0.6 ? "WAVE" : "FIST"));
				if (next === this.lastAttack && this.lastAttack2 === next && !high) next = next === "FIST" ? "WAVE" : "FIST";
				this.lastAttack2 = this.lastAttack;
				this.lastAttack = next;
				this.setState(next);
				if (next === "FIST") this.startFists(); else this.startWave();
			}
			break;

		case "FIST":
			// raises his arm while the zone blinks; the fist itself comes down on its own (updateFists)
			if (this.stateFrames >= this.fistWindup() + 6) { this.setState("RECOVER"); }
			break;

		case "WAVE":
			if (this.stateFrames >= this.waveWindup()) { this.releaseWaves(); this.setState("RECOVER"); }
			break;

		case "RECOVER":
			if (this.stateFrames >= 30) { this.attackTimer = this.attackInterval(); this.setState("WALK"); }
			break;

		case "SOAKED":
			// sagging wet sand, dripping: stands still until he dries
			if (--this.soakFrames <= 0) { this.soakFrames = 0; this.setState("DRY"); game.addFloatingText("HE'S DRYING OUT!", this.centerX(), this.y - 20, "#f6eeb0", true); }
			break;

		case "DRY":
			// shakes the water off (not hurting, not vulnerable), then back to the fight
			if (this.stateFrames % 8 === 0) game.scene.effects.push(new Burst(game, this.centerX() + (Math.random() - 0.5) * 90, this.y + this.height() * 0.5, "#e6cf5c", 4));
			if (this.stateFrames >= 36) { this.attackTimer = Math.min(this.attackTimer, 50); this.setState("WALK"); }
			break;

		case "DEFEATED":
			// melts into a pile of wet sand
			this.melt = Math.min(0.85, this.stateFrames / 130);
			if (this.stateFrames % 9 === 0 && this.stateFrames < 120) game.scene.effects.push(new Burst(game, this.centerX() + (Math.random() - 0.5) * 90, this.floorY - 20, this.stateFrames % 18 === 0 ? "#6a5a3a" : "#7fd0ff", 8));
			if (this.stateFrames === 20) game.addFloatingText("NO... NOT THE WATER...", this.centerX(), this.floorY - this.height() - 20, "#f6eeb0");
			if (this.stateFrames > 140) {
				this.level.bossDefeated = true;
				game.removeEnemy(this);
			}
			break;
	}
	this.draw();
}

Sandman.prototype.draw = function() {
	var game = this.game;
	var ctx = this.ctx;
	var cam = game.cameraX;
	var cfg = BOSS.SANDMAN;
	var img = this.stateImg;
	var w = this.width(), h = this.height();
	var f = this.frame;
	var i;

	// ---- the warnings (under everything) ----
	for (i = 0; i < this.fists.length; i++) {
		var fw = this.fists[i];
		if (fw.state !== "WARN") continue;
		var p = fw.t / fw.windup;
		var blink = Math.floor(fw.t / Math.max(3, 8 - Math.floor(p * 6))) % 2 === 0;
		var zx = fw.x - cfg.FIST_WIDTH / 2 - cam;
		ctx.save();
		ctx.globalAlpha = blink ? 0.45 : 0.22;
		PixelArt.rect(ctx, "#ff3030", zx, fw.surface - 130, cfg.FIST_WIDTH, 130);
		ctx.globalAlpha = 0.35 + p * 0.45;
		ctx.fillStyle = "#1b1b22";
		ctx.beginPath(); ctx.ellipse(fw.x - cam, fw.surface - 2, cfg.FIST_WIDTH * (0.25 + p * 0.3), 6 + p * 4, 0, 0, Math.PI * 2); ctx.fill();
		ctx.restore();
		PixelArt.rect(ctx, blink ? "#ffd83d" : "#ff3030", zx, fw.surface - 132.5, cfg.FIST_WIDTH, 2.5);
		// a down arrow over the zone
		var ay = fw.surface - 175 + Math.sin(fw.t * 0.3) * 4;
		PixelArt.rect(ctx, "#ff3030", fw.x - cam - 5, ay, 10, 20);
		PixelArt.rect(ctx, "#ff3030", fw.x - cam - 12.5, ay + 17.5, 25, 5);
		PixelArt.rect(ctx, "#ff3030", fw.x - cam - 7.5, ay + 22.5, 15, 5);
	}
	if (this.state === "WAVE" && this.waveDirs.length) {
		// the lane the wave will roll along: a red band on the floor with big blinking arrows, sand swirling at his feet
		var on = Math.floor(this.stateFrames / 5) % 2 === 0;
		ctx.save();
		for (var d = 0; d < this.waveDirs.length; d++) {
			var dir = this.waveDirs[d];
			var from = this.centerX() + dir * 70, to = dir > 0 ? this.level.width - 25 : 25;
			ctx.globalAlpha = on ? 0.3 : 0.15;
			PixelArt.rect(ctx, "#ff3030", Math.min(from, to) - cam, this.floorY - cfg.WAVE_HEIGHT, Math.abs(to - from), cfg.WAVE_HEIGHT);
			ctx.globalAlpha = on ? 1 : 0.5;
			for (var ax = from + dir * 20; dir > 0 ? ax < to - 20 : ax > to + 20; ax += dir * 80) {
				var sx = ax - cam;
				PixelArt.rect(ctx, "#ff3030", sx - 20, this.floorY - 25, 40, 7.5);
				PixelArt.rect(ctx, "#ffd83d", sx + (dir > 0 ? 20 : -27.5), this.floorY - 32.5, 7.5, 22.5);
				PixelArt.rect(ctx, "#ffd83d", sx + (dir > 0 ? 27.5 : -32.5), this.floorY - 27.5, 5, 12.5);
			}
		}
		ctx.restore();
		if (this.stateFrames % 4 === 0) game.scene.effects.push(new Burst(game, this.centerX() + (Math.random() - 0.5) * this.width(), this.floorY - 6, "#e6cf5c", 4));
	}

	// ---- sandman ----
	var x = Math.round(this.x - cam);
	var bob = this.state === "WALK" ? Math.round(Math.sin(f * 0.12) * 2) : 0;
	var squash = this.state === "WAVE" ? 0.9 : (this.isSoaked() ? 0.93 : 1);
	var stretchX = this.state === "WAVE" ? 1.06 : (this.isSoaked() ? 1.04 : 1);
	var shake = (this.state === "WAVE" || this.state === "DRY") && f % 2 === 0 ? 2 : 0;
	var visible = Math.max(0.02, this.rise * (1 - this.melt));        // the part of him above the sand
	var dw = w * stretchX, dh = h * squash;
	var sh = img.height * visible;
	var drawH = dh * visible;
	var dx = x + (w - dw) / 2 + shake, dy = this.floorY - drawH + bob;
	ctx.save();
	ctx.drawImage(img, 0, 0, img.width, sh, dx, dy, dw, drawH);
	if (this.isSoaked() || this.state === "DEFEATED") game.drawTintedSprite(img, dx, dy, dw, drawH, "#2f4f6a", 0.45);
	if (this.hitFlashFrames > 0) {
		this.hitFlashFrames--;
		game.drawTintedSprite(img, dx, dy, dw, drawH, this.hitFlashFrames % 2 === 0 ? "#ffffff" : "#7fd0ff", 0.6);
	}
	ctx.restore();
	// the sand pile he rises from / melts into
	if (this.rise < 1 || this.melt > 0) {
		var pile = this.melt > 0 ? 30 + this.melt * 30 : 40 * (1 - this.rise) + 20;
		ctx.fillStyle = this.melt > 0 ? "#6a5a3a" : "#c9a36b";
		ctx.beginPath(); ctx.ellipse(x + w / 2, this.floorY, w * 0.55, pile * 0.5, 0, Math.PI, 0); ctx.fill();
	}
	// sand trickling from his arms (dry) / drips (soaked)
	if (this.state !== "ENTER" && this.state !== "DEFEATED") {
		for (i = 0; i < 4; i++) {
			var side = i % 2 === 0 ? 0.12 : 0.88;
			var t = ((f * (this.isSoaked() ? 1.5 : 0.9) + i * 23) % 40) / 40;
			PixelArt.rect(ctx, this.isSoaked() ? "#7fd0ff" : "#e6cf5c", x + w * side + (i > 1 ? 5 : -5), this.y + h * 0.62 + t * h * 0.38, 2.5, this.isSoaked() ? 5 : 2.5);
		}
	}
	// the fist rising over him during the wind-up
	if (this.state === "FIST") {
		var up = Math.min(1, this.stateFrames / this.fistWindup());
		var fs = PixelArt.sprite("SAND_FIST");
		var fw2 = 70, fh2 = fw2 * fs.rows / fs.cols;
		var fx = x + w * 0.78 - fw2 / 2, fy = this.y - 20 - up * 50;
		PixelArt.rect(ctx, "#b59a3a", x + w * 0.78 - 10, fy + fh2 - 10, 20, this.y + h * 0.45 - fy - fh2 + 10);
		ctx.save(); ctx.scale(1, -1); ctx.drawImage(fs.canvas, fx, -fy - fh2, fw2, fh2); ctx.restore();
	}

	// ---- the fists coming down and the waves ----
	var fist = PixelArt.sprite("SAND_FIST");
	var FW = cfg.FIST_WIDTH + 10, FH = FW * fist.rows / fist.cols;
	for (i = 0; i < this.fists.length; i++) {
		var fi = this.fists[i];
		if (fi.state === "WARN") continue;
		var top = game.cameraY + 60;
		var bottomY = fi.surface - FH;
		var fy2 = fi.state === "DROP" ? top + (bottomY - top) * Math.min(1, fi.t / cfg.FIST_DROP) : bottomY;
		ctx.save();
		if (fi.state === "CRUMBLE") ctx.globalAlpha = 1 - fi.t / 18;
		ctx.drawImage(fist.canvas, Math.round(fi.x - FW / 2 - cam), Math.round(fy2 + (fi.state === "CRUMBLE" ? fi.t * 2 : 0)), FW, FH);
		// the arm of sand it hangs on
		if (fi.state !== "CRUMBLE") PixelArt.rect(ctx, "rgba(181, 154, 58, 0.8)", fi.x - 20 - cam, top - 40, 40, fy2 - top + 45);
		ctx.restore();
	}
	var wave = PixelArt.sprite("SAND_WAVE");
	var WW = cfg.WAVE_WIDTH + 8, WH = cfg.WAVE_HEIGHT + 4;
	for (i = 0; i < this.waves.length; i++) {
		var wv = this.waves[i];
		var wx = Math.round(wv.x - cam);
		ctx.save();
		if (wv.dir < 0) { ctx.translate(wx, 0); ctx.scale(-1, 1); ctx.translate(-wx, 0); }
		ctx.drawImage(wave.canvas, wx - WW / 2, this.floorY - WH, WW, WH);
		ctx.restore();
		if (f % 3 === 0) PixelArt.rect(ctx, "#e6cf5c", wx - wv.dir * 26, this.floorY - 7.5 - (f % 9), 5, 5);
	}
}

/* ---------- a copy: looks like him, flickers, shoots, pops with one web, cannot hurt on contact ---------- */

function MysterioCopy(game, boss, centerX, centerY, index) {
	this.game = game;
	this.boss = boss;
	this.ctx = game.ctx;
	this.name = "MYSTERIO_COPY";
	this.team = "ENEMY";
	this.stateImg = game.resources.MYSTERIO;
	this.scale = boss.scale;
	this.health = 1;
	this.x = centerX - this.width() / 2;
	this.y = centerY - this.height() / 2;
	this.facing = DIRECTION.LEFT;
	this.frame = 0;
	this.alpha = 0;
	this.shotTimer = 70 + index * 30;
	this.gone = false;
}

MysterioCopy.prototype.width = function() { return this.stateImg.width * this.scale; }
MysterioCopy.prototype.height = function() { return this.stateImg.height * this.scale; }
MysterioCopy.prototype.centerX = function() { return this.x + this.width() / 2; }
MysterioCopy.prototype.centerY = function() { return this.y + this.height() / 2; }
MysterioCopy.prototype.getHitbox = function() { return { left: this.x + 8, top: this.y + 6, right: this.x + this.width() - 8, bottom: this.y + this.height() - 4 }; }
MysterioCopy.prototype.canBeHit = function() { return !this.gone && this.alpha > 0.5; }

MysterioCopy.prototype.handleHitWithProjectile = function(projectile) {
	if (projectile.name !== "WEB" || this.gone) return;
	this.vanish(true);
}

// popped: true when webbed by the player (a little score), false when the boss dismisses it
MysterioCopy.prototype.vanish = function(popped) {
	if (this.gone) return;
	this.gone = true;
	if (popped) {
		this.game.addScore(BOSS.MYSTERIO.COPY_SCORE, "enemies");
		this.game.addFloatingText("FAKE!", this.centerX(), this.y, "#7dffb0", true);
		this.game.sfx.play("ILLUSION");
	}
	this.game.scene.effects.push(new Burst(this.game, this.centerX(), this.centerY(), "#7dffb0", 8));
	this.game.removeEnemy(this);
	this.boss.removeCopy(this);
}

MysterioCopy.prototype.update = function() {
	this.frame++;
	this.alpha = Math.min(1, this.frame / 20);
	this.facing = this.game.spiderman.centerX() > this.centerX() ? DIRECTION.RIGHT : DIRECTION.LEFT;
	this.y += Math.sin(this.frame * 0.08) * 0.4;

	this.shotTimer--;
	if (this.shotTimer <= 0 && this.boss.state !== "DEFEATED") {
		this.boss.shootOrb(this.centerX(), this.centerY(), BOSS.MYSTERIO.ORB_SPEED * 0.85);
		this.shotTimer = BOSS.MYSTERIO.COPY_ORB_INTERVAL;
	}
	this.draw();
}

MysterioCopy.prototype.draw = function() {
	var ctx = this.ctx;
	var img = this.stateImg;
	var w = this.width(), h = this.height();
	var x = Math.round(this.x - this.game.cameraX);
	var y = Math.round(this.y);
	// the tell: copies flicker and carry scan lines
	var flicker = Math.floor(this.frame / 5) % 9 === 0 ? 0.3 : 0.8;
	ctx.save();
	ctx.globalAlpha = this.alpha * flicker;
	if (this.facing !== DIRECTION.LEFT) { ctx.scale(-1, 1); x = -x - w; }
	ctx.drawImage(img, x, y, w, h);
	ctx.globalAlpha = this.alpha * 0.35;
	for (var ly = 0; ly < h; ly += 7.5) PixelArt.rect(ctx, "#7dffb0", x, y + ly + (this.frame % 8 < 4 ? 2.5 : 0), w, 2.5);
	ctx.restore();
}

/* ------------------------------------------------------------------
 * Campaign stages
 *
 * A stage is described by a plain data object in world pixels (campaign-levels.js builds it with a small
 * helper so the numbers stay readable). All y values are world y (smaller = higher); "surface" = the y of
 * the platform top something stands on:
 *
 *   design: {
 *     theme: "CITY",
 *     floorY: 540,                                    // street level
 *     spawn: { x: 60, y: 540 },
 *     platforms:   [{ x, width, top, bottom, style, oneWay, storefront }],   // see Roof
 *     climbables:  [{ type: "LADDER" | "PIPE" | "FENCE", x, top, bottom, width }],
 *     anchors:     [{ x, y }],                                               // web swing points
 *     enemies:     [{ type, x, y }],                                         // y = surface
 *     props:       [{ type, x, y }],                                         // y = surface, see PROP_TYPES
 *     coins:       [{ x, y, count, spacing }],                               // y = coin center
 *     arcs:        [{ x1, x2, y, height }],                                  // three coins on an arc
 *     pickups:     [{ type: "HEALTH" | "WEB", x, y }],
 *     hints:       [{ x, y, text }],
 *     checkpoints: [{ x, y }],                                               // y = surface
 *     objects:     [{ type: "KEY", x, y, id }, { type: "GATE", x, top, bottom, id, opens: "KEY" | "SWITCH" },
 *                   { type: "SWITCH", x, y, gate },
 *                   { type: "RESCUE", x, y, id }],                         // trapped worker (y = surface), see RESCUE
 *     goal: { x, y },                                                        // y = surface
 *   }
 *
 * Physics never change with the zoom: spiderman jumps ~153 px high and ~215 px far at full speed.
 * ------------------------------------------------------------------ */

var CLIMBABLE_TYPES = {
	LATTICE:{ width: 120, tile: null },     // wide steel maintenance lattice on a facade (crawl up and sideways)
	LADDER: { width: 15, tile: "LADDER_TILE" },
	PIPE:   { width: 12.5, tile: "PIPE_TILE" },
	FENCE:  { width: 20, tile: "FENCE_TILE" },
	POLE:   { width: 12.5, tile: "POLE_TILE" },
	ROPE:   { width: 10, tile: "ROPE_TILE" },
};

function CampaignLevel(game, definition) {
	this.game = game;
	this.definition = definition;
	this.id = definition.id;
	this.name = definition.name;
	this.design = definition.design;

	this.roofs = [];
	this.hints = [];
	this.climbables = [];
	this.anchors = [];
	this.gates = [];
	this.switches = [];
	this.checkpoints = [];
	this.hazards = [];
	this.lasers = [];      // security lasers (see LASER)
	this.doors = [];
	this.holograms = [];
	this.rooms = [];
	this.rescues = [];         // trapped workers (see RESCUE)
	this.knots = [];           // harbour: marked ropes a web can cut (see HARBOR)
	this.drops = [];           // harbour: platforms hanging from a crane until their rope is cut
	this.cranes = [];          // harbour: dockside cranes (decoration the ropes / cargo hang from)
	this.waterY = null;        // harbour: the water surface (falling in = "WATER" game over)
	this.pools = [];           // sewer: bodies of water with a level a control moves (see POOLS)
	this.controls = [];        // sewer: pumps / valves (used with E)
	this.controlInReach = null;
	this.poolPowers = [];      // sewer / pump station: { pool, state, power } - power "power" once the pool settles at state
	this.safeSpots = [];       // sewer: the last POOLS.SAFE_BACK spots of dry / shallow ground (where "TOO DEEP" puts him)
	this.inWater = false;
	this.rescueInReach = null; // the trapped worker spiderman can free right now (prompt / touch button)
	this.exitWarned = 0;       // frames until the "exit locked" message may show again
	this.pickups = [];
	this.enemies = [];
	this.goal = null;
	this.boss = null;          // the stage boss (Mysterio / the Green Goblin), if any
	this.bossDefeated = false;
	this.frame = 0;         // frames since the stage was built (timed objects like steam vents run on it)
	this.powered = {};      // power id -> true once every switch wired to it is on
	this.powerWarned = {};  // power id -> frames until the "no power" hint may show again

	this.width = 0;
	this.floorY = this.design.floorY !== undefined ? this.design.floorY : game.viewHeight;
	this.deathY = this.floorY + 110;
	this.cameraMinY = 0;
	this.cameraMaxY = 0;
	this.spawn = { x: 60, y: this.floorY };
	this.totalCoins = 0;
	this.totalEnemies = 0;

	// progress inside the stage (part of a checkpoint snapshot)
	this.keys = {};
	this.rescued = {};    // worker id -> true
	this.cut = {};        // marked rope id -> true (its cargo is down)
	this.collected = {};  // pickup levelId -> true
	this.killed = {};     // enemy levelId -> true
	this.checkpoint = null; // last activated checkpoint snapshot
}

// creates every platform, enemy, pickup, prop and object of the stage in the game scene
CampaignLevel.prototype.build = function() {
	var game = this.game;
	var design = this.design;
	var i, j;
	var minTop = this.floorY;
	var maxRight = 0;

	var platforms = design.platforms || [];
	for (i = 0; i < platforms.length; i++) {
		var data = platforms[i];
		var roof = new Roof(game, data.x, {
			width: data.width,
			top: data.top,
			bottom: data.bottom !== undefined ? data.bottom : (data.style === "LEDGE" ? data.top + 12 : this.floorY + 140),
			style: data.style || "BUILDING",
			oneWay: !!data.oneWay,
			storefront: data.storefront !== undefined ? !!data.storefront : (data.style === "BUILDING" || !data.style) && (data.bottom === undefined || data.bottom >= this.floorY),
			fixed: true,
			tag: data.tag,
			frameTo: data.frameTo,
			motion: data.motion ? { axis: data.motion.axis, from: data.motion.from, to: data.motion.to, speed: data.motion.speed, wait: data.motion.wait, pool: data.motion.pool, offset: data.motion.offset } : null,
			powerId: data.powerId,
			color: data.color,
			phantom: !!data.phantom,
			crumble: !!data.crumble,
			conveyor: data.conveyor ? { speed: data.conveyor.speed, poweredSpeed: data.conveyor.poweredSpeed } : null,
			label: data.label,
			drop: data.drop ? { id: data.drop.id, to: data.drop.to, pulleyY: data.drop.pulleyY, state: "HANGING", speed: 0 } : null,
		});
		game.addRoof(roof);
		this.roofs.push(roof);
		if (roof.drop) this.drops.push(roof);
		minTop = Math.min(minTop, roof.y);
		maxRight = Math.max(maxRight, roof.x + roof.fullWidth);
	}

	var enemies = design.enemies || [];
	for (i = 0; i < enemies.length; i++) {
		var e = enemies[i];
		var eroof = this.platformAt(e.x, e.y);
		if (!eroof) continue;
		// a fresh copy per enemy: addEnemy (and the enemy constructors) write into their opts. (Explicitly reset:
		// a "var" inside the loop keeps its value from the previous enemy)
		var enemyOpts = undefined;
		if (e.opts) { enemyOpts = {}; for (var ok in e.opts) enemyOpts[ok] = e.opts[ok]; }
		var enemy = eroof.addEnemy(e.type || "THUG", e.x, enemyOpts);
		enemy.levelId = i;
		this.enemies.push(enemy);
		this.totalEnemies++;
		minTop = Math.min(minTop, enemy.y - 60);
	}

	var props = design.props || [];
	for (i = 0; i < props.length; i++) {
		var pr = props[i];
		var proof = this.platformAt(pr.x, pr.y);
		if (proof) proof.addProp(pr.type, pr.x);
	}

	var pickupId = 0;
	var self = this;
	function addPickup(type, x, y, extra) {
		var pickup = new Pickup(game, { type: type, x: x, y: y });
		pickup.levelId = pickupId++;
		if (extra) for (var key in extra) pickup[key] = extra[key];
		game.addPickup(pickup);
		self.pickups.push(pickup);
		minTop = Math.min(minTop, y - 40);
		if (type === "COIN") self.totalCoins++;
		return pickup;
	}

	var coins = design.coins || [];
	for (i = 0; i < coins.length; i++) {
		var row = coins[i];
		var count = row.count || 1;
		var spacing = row.spacing || PICKUPS.COIN_SPACING;
		for (j = 0; j < count; j++) addPickup("COIN", row.x + j * spacing, row.y);
	}
	var arcs = design.arcs || [];
	for (i = 0; i < arcs.length; i++) {
		var arc = arcs[i];
		var span = arc.x2 - arc.x1;
		var n = arc.count || 3;
		for (j = 0; j < n; j++) {
			var f = (j + 1) / (n + 1);
			addPickup("COIN", Math.round(arc.x1 + span * f), Math.round(arc.y - Math.sin(f * Math.PI) * (arc.height || 40)));
		}
	}
	var pickups = design.pickups || [];
	for (i = 0; i < pickups.length; i++) addPickup(pickups[i].type, pickups[i].x, pickups[i].y);

	var climbables = design.climbables || [];
	for (i = 0; i < climbables.length; i++) {
		var c = climbables[i];
		var ctype = CLIMBABLE_TYPES[c.type] || CLIMBABLE_TYPES.LADDER;
		this.climbables.push({
			type: c.type || "LADDER",
			x: c.x,
			width: c.width || ctype.width,
			top: c.top,
			bottom: c.bottom,
			facing: c.facing || null,
		});
		minTop = Math.min(minTop, c.top);
	}

	var anchors = design.anchors || [];
	for (i = 0; i < anchors.length; i++) {
		this.anchors.push({ x: anchors[i].x, y: anchors[i].y, flash: 0 });
		minTop = Math.min(minTop, anchors[i].y - 40);
	}

	var hints = design.hints || [];
	for (i = 0; i < hints.length; i++) this.hints.push({ x: hints[i].x, y: hints[i].y, text: hints[i].text });

	var checkpoints = design.checkpoints || [];
	for (i = 0; i < checkpoints.length; i++) {
		this.checkpoints.push({ index: i, x: checkpoints[i].x, y: checkpoints[i].y, active: false });
	}

	var objects = design.objects || [];
	for (i = 0; i < objects.length; i++) {
		var o = objects[i];
		if (o.type === "KEY") {
			addPickup("KEY", o.x, o.y, { keyId: o.id || "KEY", sprite: o.sprite || "KEYCARD", label: o.label || "KEYCARD" });
		} else if (o.type === "GATE") {
			this.gates.push({
				id: o.id, x: o.x, width: o.width || 30, top: o.top, bottom: o.bottom,
				opens: o.opens || "KEY", keyIds: o.keyIds || [o.keyId || "KEY"],
				state: "CLOSED", progress: 0, warned: 0,
			});
			minTop = Math.min(minTop, o.top);
		} else if (o.type === "SWITCH") {
			this.switches.push({ x: o.x, y: o.y, gate: o.gate, on: false });
		} else if (o.type === "HAZARD") {
			var hazard = { kind: o.kind || "SPARK", x: o.x, y: o.y, width: o.width || (o.kind === "REBAR" ? 40 : (o.kind === "DRONE" ? 25 : 25)), height: o.kind === "REBAR" ? 17.5 : 25 };
			if (o.kind === "STEAM") {
				// timed steam vent: idle, a short warning hiss, then a blast that hurts anyone in the column above it
				hazard.width = STEAM.WIDTH;
				hazard.height = o.height || STEAM.HEIGHT;
				hazard.period = o.period || STEAM.PERIOD;
				hazard.offset = o.offset || 0;
			}
			if (o.motion) {
				hazard.motion = { axis: o.motion.axis, from: o.motion.from, to: o.motion.to, speed: o.motion.speed || 1.5, direction: 1 };
				if (o.motion.axis === "x") hazard.x = o.motion.from; else hazard.y = o.motion.from;
			}
			this.hazards.push(hazard);
			minTop = Math.min(minTop, hazard.y - 60);
		} else if (o.type === "LASER") {
			// vertical (x, from y1 down to y2) or horizontal (from x1 to x2 at y) beam
			var laser = { vertical: o.vertical !== false, x: o.x, y1: o.y1, y2: o.y2, x1: o.x1, x2: o.x2, y: o.y,
				period: o.period !== undefined ? o.period : LASER.PERIOD, on: o.on || LASER.ON, warn: o.warn || LASER.WARN,
				offset: o.offset || 0, powerId: o.powerId || null, post: o.post, warned: 0 };
			this.lasers.push(laser);
			minTop = Math.min(minTop, (laser.vertical ? laser.y1 : laser.y) - 60);
		} else if (o.type === "DOOR") {
			this.doors.push({ id: o.id, x: o.x, y: o.y, to: o.to, fake: !!o.fake, label: o.label || "" });
			minTop = Math.min(minTop, o.y - 100);
		} else if (o.type === "HOLOGRAM") {
			this.holograms.push({ x: o.x, y: o.y, scale: o.scale || 0.25, text: o.text || "" });
			minTop = Math.min(minTop, o.y - 100);
		} else if (o.type === "KNOT") {
			// a marked rope tied off on a bollard; the knot (web target) is 30 px above the surface
			this.knots.push({ id: o.id, x: o.x, surface: o.y, y: o.y - 30, cut: false, snap: 0 });
		} else if (o.type === "POOL") {
			var startHigh = o.start !== "LOW";
			this.pools.push({ id: o.id, x: o.x, width: o.width, bottom: o.bottom, high: o.high, low: o.low,
				state: startHigh ? "HIGH" : "LOW", level: startHigh ? o.high : o.low, moving: false, speed: o.speed || POOLS.SPEED });
			minTop = Math.min(minTop, o.high - 40);
		} else if (o.type === "CONTROL") {
			this.controls.push({ id: o.id, x: o.x, y: o.y, pools: o.pools || [], kind: o.kind || "PUMP", label: o.label || (o.kind === "VALVE" ? "VALVE" : "PUMP"), pulled: 0,
				requires: o.requires || null, warned: 0,
				// HYDRANT (the sandman arena): a valve that opens a water pipe over spray { x, top, bottom, width }
				spray: o.spray || null, sprayFrames: 0, cooldown: 0 });
		} else if (o.type === "POOLPOWER") {
			// power "power" once pool "pool" has settled at "state" (e.g. a door that opens when a hall is drained)
			this.poolPowers.push({ pool: o.pool, state: o.state || "LOW", power: o.power, label: o.label || null });
		} else if (o.type === "CRANE") {
			this.cranes.push({ x: o.x, top: o.top, base: o.base, span: o.span || 90, boomFrom: o.boomFrom, boomTo: o.boomTo });
		} else if (o.type === "RESCUE") {
			// a trapped worker standing on the surface y; freed with E (see RESCUE)
			this.rescues.push({ id: o.id || "W" + (this.rescues.length + 1), x: o.x, y: o.y, rescued: false, freeFrames: 0, thanks: 0 });
			minTop = Math.min(minTop, o.y - 100);
		}
	}

	var rooms = design.rooms || [];
	for (i = 0; i < rooms.length; i++) {
		this.rooms.push({ x: rooms[i].x, y: rooms[i].y, width: rooms[i].width, height: rooms[i].height, style: rooms[i].style || null });
		minTop = Math.min(minTop, rooms[i].y - 40);
	}

	if (design.boss) {
		// a boss stage ends when the boss is defeated, there is no flag
		this.boss = design.boss.type === "GOBLIN" ? new GoblinBoss(game, this, design.boss)
			: design.boss.type === "SANDMAN" ? new Sandman(game, this, design.boss)
			: new Mysterio(game, this, design.boss);
		game.addEnemy(this.boss);
		this.totalEnemies++;
		minTop = Math.min(minTop, design.boss.y - 200);
	} else if (design.goal) {
		var groof = this.platformAt(design.goal.x, design.goal.y);
		this.goal = new LevelGoal(game, design.goal.x, groof || { y: design.goal.y });
	} else if (this.roofs.length) {
		var last = this.roofs[this.roofs.length - 1];
		this.goal = new LevelGoal(game, last.x + last.width - 60, last);
	}

	this.width = Math.max(design.width || 0, maxRight + (design.endPadding !== undefined ? design.endPadding : 40));
	this.width = Math.max(this.width, game.viewWidth);

	var spawn = design.spawn || {};
	this.spawn.x = spawn.x !== undefined ? spawn.x : 60;
	this.spawn.y = spawn.y !== undefined ? spawn.y : this.floorY;

	this.deathY = design.deathY !== undefined ? design.deathY : this.floorY + 110;
	this.waterY = design.water ? design.water.y : null;
	this.settleRafts();
	this.cameraMaxY = design.cameraMaxY !== undefined ? design.cameraMaxY : this.floorY + 140 - game.viewHeight;
	this.cameraMinY = design.cameraMinY !== undefined ? design.cameraMinY : Math.min(this.cameraMaxY, minTop - 240);
}

// the platform whose top is at "y" under world x
CampaignLevel.prototype.platformAt = function(x, y) {
	var best = null;
	for (var i = 0; i < this.roofs.length; i++) {
		var roof = this.roofs[i];
		if (x < roof.x || x > roof.x + roof.width) continue;
		if (Math.abs(roof.y - y) <= 1) return roof;
		if (y === undefined && (!best || roof.y < best.y)) best = roof;
	}
	return best;
}

/* ---------- checkpoints ---------- */

// everything needed to continue from a checkpoint after dying
CampaignLevel.prototype.snapshot = function(checkpoint) {
	var game = this.game;
	var copy = function(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; };
	var openGates = [];
	for (var i = 0; i < this.gates.length; i++) if (this.gates[i].state !== "CLOSED") openGates.push(this.gates[i].id);
	var onSwitches = [];
	for (var j = 0; j < this.switches.length; j++) if (this.switches[j].on) onSwitches.push(j);
	var powered = [];
	for (var pid in this.powered) if (this.powered[pid]) powered.push(pid);

	return {
		levelId: this.id,
		checkpointIndex: checkpoint.index,
		x: checkpoint.x,
		y: checkpoint.y,
		score: game.score,
		scoreBreakdown: copy(game.scoreBreakdown),
		coins: game.coins,
		kills: game.kills,
		web: Math.max(15, game.spiderman.web),
		levelFrames: game.levelFrames,
		keys: copy(this.keys),
		rescued: copy(this.rescued),
		cut: copy(this.cut),
		pools: this.poolStates(),
		collected: copy(this.collected),
		killed: copy(this.killed),
		openGates: openGates,
		onSwitches: onSwitches,
		powered: powered,
	};
}

// applies a snapshot to a freshly built stage
CampaignLevel.prototype.restore = function(snapshot) {
	var game = this.game;
	var i;

	this.keys = snapshot.keys || {};
	this.collected = snapshot.collected || {};
	this.killed = snapshot.killed || {};
	// workers freed before the checkpoint stay free (already standing, no animation); later ones are trapped again.
	// A copy: freeing a worker after the retry must not change the checkpoint itself
	this.rescued = {};
	for (var rid in (snapshot.rescued || {})) if (snapshot.rescued[rid]) this.rescued[rid] = true;
	// water levels as they were at the checkpoint (set at once, rafts follow)
	var poolStates = snapshot.pools || {};
	for (i = 0; i < this.pools.length; i++) {
		var sp = this.pools[i];
		if (!poolStates[sp.id]) continue;
		sp.state = poolStates[sp.id];
		sp.level = sp.state === "HIGH" ? sp.high : sp.low;
		sp.moving = false;
	}
	this.settleRafts();
	this.checkPoolPowers(true);
	// ropes cut before the checkpoint stay cut, their cargo already down (a copy, like the rescues)
	this.cut = {};
	for (var kid in (snapshot.cut || {})) if (snapshot.cut[kid]) this.cutRope(kid, true);
	for (i = 0; i < this.rescues.length; i++) {
		if (!this.rescued[this.rescues[i].id]) continue;
		this.rescues[i].rescued = true;
		this.rescues[i].freeFrames = RESCUE.FREE_FRAMES;
	}

	for (i = this.pickups.length - 1; i >= 0; i--) {
		if (this.collected[this.pickups[i].levelId]) {
			this.pickups[i].collected = true;
			game.removePickup(this.pickups[i]);
		}
	}
	for (i = 0; i < this.enemies.length; i++) {
		if (this.killed[this.enemies[i].levelId]) game.removeEnemy(this.enemies[i]);
	}
	for (i = 0; i < this.gates.length; i++) {
		if (snapshot.openGates.indexOf(this.gates[i].id) > -1) { this.gates[i].state = "OPEN"; this.gates[i].progress = 1; }
	}
	for (i = 0; i < this.switches.length; i++) {
		if (snapshot.onSwitches.indexOf(i) > -1) this.switches[i].on = true;
	}
	var poweredIds = snapshot.powered || [];
	for (i = 0; i < poweredIds.length; i++) this.setPowered(poweredIds[i], true);
	for (i = 0; i < this.checkpoints.length; i++) {
		this.checkpoints[i].active = this.checkpoints[i].index <= snapshot.checkpointIndex;
	}

	game.score = snapshot.score;
	game.scoreBreakdown = snapshot.scoreBreakdown;
	game.coins = snapshot.coins;
	game.kills = snapshot.kills;
	game.levelFrames = snapshot.levelFrames;
	game.spiderman.web = snapshot.web;

	this.spawn.x = snapshot.x;
	this.spawn.y = snapshot.y;
	this.checkpoint = snapshot;
}

CampaignLevel.prototype.activateCheckpoint = function(checkpoint) {
	var game = this.game;
	checkpoint.active = true;
	// earlier checkpoints are implicitly passed
	for (var i = 0; i < this.checkpoints.length; i++) if (this.checkpoints[i].index < checkpoint.index) this.checkpoints[i].active = true;
	this.checkpoint = this.snapshot(checkpoint);
	game.levelCheckpoint = this.checkpoint;
	game.sfx.play("CHECKPOINT");
	game.addFloatingText("CHECKPOINT", checkpoint.x, checkpoint.y - 80, "#8ee27a");
}

// quiet re-save at an already active checkpoint
CampaignLevel.prototype.refreshCheckpoint = function(checkpoint) {
	this.checkpoint = this.snapshot(checkpoint);
	this.game.levelCheckpoint = this.checkpoint;
	this.game.addFloatingText("SAVED", checkpoint.x, checkpoint.y - 80, "#8ee27a", true);
}

/* ---------- queries used by spiderman ---------- */

// the climbable surface spiderman can grab right now (fromTop: with DOWN while standing at its top)
CampaignLevel.prototype.findClimbable = function(spiderman, fromTop) {
	var cx = spiderman.centerX();
	var top = spiderman.y;
	var feet = spiderman.y + spiderman.bodyHeight();

	for (var i = 0; i < this.climbables.length; i++) {
		var c = this.climbables[i];
		if (cx < c.x - CLIMB.GRAB_SLACK || cx > c.x + c.width + CLIMB.GRAB_SLACK) continue;
		if (fromTop) {
			if (spiderman.onGround && Math.abs(feet - c.top) <= 8) return c;
		} else if (top < c.bottom - 4 && feet > c.top + 4) {
			return c;
		}
	}
	return null;
}

// the closest anchor spiderman can shoot a web to from where he is
CampaignLevel.prototype.findAnchor = function(spiderman) {
	var hx = spiderman.handX();
	var hy = spiderman.handY();
	var best = null;
	var bestDistance = Infinity;

	for (var i = 0; i < this.anchors.length; i++) {
		var a = this.anchors[i];
		if (Math.abs(a.x - hx) > SWING.RANGE_X) continue;
		if (hy - a.y < SWING.MIN_ABOVE) continue;
		var d = Math.sqrt((a.x - hx) * (a.x - hx) + (a.y - hy) * (a.y - hy));
		if (d > SWING.MAX_LENGTH || d >= bestDistance) continue;
		best = a;
		bestDistance = d;
	}
	return best;
}

/* ---------- harbour: marked ropes, dropping cargo, water (see HARBOR) ---------- */

// cuts the marked rope "id": its cargo starts to fall (quiet: restoring a checkpoint - it is simply down already)
CampaignLevel.prototype.cutRope = function(id, quiet) {
	if (this.cut[id]) return false;
	var game = this.game;
	this.cut[id] = true;
	var i;
	for (i = 0; i < this.knots.length; i++) {
		var k = this.knots[i];
		if (k.id !== id) continue;
		k.cut = true;
		if (quiet) continue;
		k.snap = 30;
		game.sfx.play("ROPE_SNAP");
		game.scene.effects.push(new Burst(game, k.x, k.y, "#c9a36b", 10));
		game.addFloatingText("ROPE CUT!", k.x, k.y - 30, "#ffd83d");
	}
	for (i = 0; i < this.drops.length; i++) {
		var d = this.drops[i];
		if (d.drop.id !== id || d.drop.state !== "HANGING") continue;
		if (quiet) { d.drop.state = "DOWN"; d.y = d.drop.to; }
		else { d.drop.state = "FALLING"; d.drop.speed = 0; }
	}
	return true;
}

// splash particles (+ sound) on the water surface at world x
CampaignLevel.prototype.splash = function(x, big) {
	var game = this.game;
	if (this.waterY === null) return;
	game.scene.effects.push(new Burst(game, x, this.waterY, "#cfe6ff", big ? 18 : 12));
	game.scene.effects.push(new Burst(game, x, this.waterY + 4, "#7fb2ff", big ? 12 : 8));
	game.sfx.play("SPLASH");
}

CampaignLevel.prototype.updateHarbor = function() {
	var game = this.game;
	var spiderman = game.spiderman;
	var i, j;

	// a web shot that reaches a marked knot cuts the rope
	for (i = 0; i < this.knots.length; i++) {
		var k = this.knots[i];
		if (k.snap > 0) k.snap--;
		if (k.cut) continue;
		var projectiles = game.scene.projectiles;
		for (j = 0; j < projectiles.length; j++) {
			var p = projectiles[j];
			if (p.name !== "WEB" || p.team !== "SPIDERMAN") continue;
			if (Math.abs(p.x - k.x) <= HARBOR.KNOT_HIT_X && Math.abs(p.y - k.y) <= HARBOR.KNOT_HIT_Y) {
				p.remove();
				this.cutRope(k.id);
				break;
			}
		}
	}

	// falling cargo: speeds up until it lands, then it is a normal platform
	for (i = 0; i < this.drops.length; i++) {
		var d = this.drops[i];
		var dr = d.drop;
		if (dr.state !== "FALLING") continue;
		dr.speed = Math.min(HARBOR.DROP_MAX_SPEED, dr.speed + HARBOR.DROP_GRAVITY);
		d.y = Math.min(dr.to, d.y + dr.speed);
		// standing under it: one heart and a knock-back away from its middle (the usual hazard hit; he is pushed
		// out of it once it is down)
		var shb = spiderman.getHitbox();
		if (shb.right > d.x && shb.left < d.x + d.fullWidth && shb.top < d.bottom() && shb.bottom > d.y + 5) spiderman.hitByHazard(d.x + d.width / 2);
		if (d.y >= dr.to) {
			dr.state = "DOWN";
			game.sfx.play("CARGO_DROP");
			game.shake = Math.max(game.shake, 10);
			game.scene.effects.push(new Burst(game, d.x + 15, d.y, "#8d949b", 10));
			game.scene.effects.push(new Burst(game, d.x + d.width - 15, d.y, "#8d949b", 10));
			if (this.waterY !== null && d.bottom() > this.waterY) this.splash(d.x + d.width / 2, true);
			game.addFloatingText("PATH OPEN!", d.x + d.width / 2, d.y - 20, "#8ee27a");
		}
	}

	// spiderman hitting the water: a splash (the fall itself ends the run a moment later, see deathY)
	if (this.waterY !== null) {
		var feet = spiderman.y + spiderman.bodyHeight();
		if (feet > this.waterY + 4 && !this.inWater) {
			this.inWater = true;
			this.splash(spiderman.centerX(), false);
		} else if (feet < this.waterY - 10) {
			this.inWater = false;
		}
	}
}

/* ---------- sewer water: pools, pumps / valves, rafts (see POOLS) ---------- */

CampaignLevel.prototype.poolById = function(id) {
	for (var i = 0; i < this.pools.length; i++) if (this.pools[i].id === id) return this.pools[i];
	return null;
}

// { id: "HIGH" | "LOW" } for a checkpoint
CampaignLevel.prototype.poolStates = function() {
	var states = {};
	for (var i = 0; i < this.pools.length; i++) states[this.pools[i].id] = this.pools[i].state;
	return states;
}

// rafts jump to their pool's current level (after a checkpoint restore)
CampaignLevel.prototype.settleRafts = function() {
	for (var i = 0; i < this.roofs.length; i++) {
		var r = this.roofs[i];
		if (!r.motion || r.motion.axis !== "float") continue;
		r.move();
		r.deltaY = 0;
	}
}

// the water surface at world x (the highest one if pools overlap), or null where there is no water
CampaignLevel.prototype.waterSurfaceAt = function(x) {
	var surface = null;
	for (var i = 0; i < this.pools.length; i++) {
		var p = this.pools[i];
		if (x < p.x || x > p.x + p.width || p.level >= p.bottom) continue;
		if (surface === null || p.level < surface) surface = p.level;
	}
	return surface;
}

// how far the water reaches over a pair of feet at x (<= 0: dry)
CampaignLevel.prototype.waterDepthAt = function(x, feet) {
	var surface = this.waterSurfaceAt(x);
	return surface === null ? -1 : feet - surface;
}

// the pump / valve spider-man can use right now, or null
CampaignLevel.prototype.findControl = function(spiderman) {
	var cx = spiderman.centerX(), feet = spiderman.y + spiderman.bodyHeight();
	for (var i = 0; i < this.controls.length; i++) {
		var c = this.controls[i];
		if (Math.abs(cx - c.x) <= POOLS.REACH_X && Math.abs(feet - c.y) <= POOLS.REACH_Y) return c;
	}
	return null;
}

// is a control usable (a control with "requires" needs that power id)
CampaignLevel.prototype.controlPowered = function(c) {
	return !c.requires || !!this.powered[c.requires];
}

// what using a control does next ("LOWER" / "RAISE" the water of its first pool, "NO POWER")
CampaignLevel.prototype.controlAction = function(c) {
	if (!this.controlPowered(c)) return "NO POWER";
	if (c.kind === "HYDRANT") return c.cooldown > 0 ? "WAIT" : "VALVE";
	if (c.pools.length > 1) return "TRANSFER";    // (moves water from one pool to the other)
	var pool = this.poolById(c.pools[0]);
	return pool && pool.state === "HIGH" ? "LOWER" : "RAISE";
}

// a pump / valve is used: every pool wired to it switches between its HIGH and LOW level (the water then moves there)
CampaignLevel.prototype.useControl = function(c) {
	var game = this.game;
	if (!this.controlPowered(c)) {
		game.sfx.play("GATE_LOCKED");
		game.addFloatingText("NO POWER", c.x, c.y - 80, "#ff8080");
		return false;
	}
	if (c.kind === "HYDRANT") return this.openHydrant(c);
	var action = this.controlAction(c);
	c.pulled = 30;
	for (var i = 0; i < c.pools.length; i++) {
		var pool = this.poolById(c.pools[i]);
		if (!pool) continue;
		pool.state = pool.state === "HIGH" ? "LOW" : "HIGH";
		pool.moving = true;
	}
	game.sfx.play("PUMP");
	game.addFloatingText(action === "LOWER" ? "DRAINING..." : (action === "TRANSFER" ? "TRANSFERRING..." : "FLOODING..."), c.x, c.y - 80, "#7fd0ff");
	this.controlInReach = null;
	game.syncRescueButton();
	return true;
}

// a hydrant valve: water pours from its pipe for SANDMAN.SPRAY frames (soaking sandman if he stands in it), then the
// valve needs VALVE_COOLDOWN frames before it works again (its gauge fills up meanwhile)
CampaignLevel.prototype.openHydrant = function(c) {
	var game = this.game;
	if (c.cooldown > 0) {
		game.sfx.play("GATE_LOCKED");
		game.addFloatingText("RECHARGING", c.x, c.y - 80, "#ff8080", true);
		return false;
	}
	c.sprayFrames = BOSS.SANDMAN.SPRAY;
	c.cooldown = BOSS.SANDMAN.VALVE_COOLDOWN;
	c.pulled = 30;
	game.sfx.play("WATER_SPRAY");
	game.addFloatingText("WATER!", c.spray.x, c.spray.top + 40, "#7fd0ff");
	this.controlInReach = null;
	game.syncRescueButton();
	return true;
}

// the water column of every hydrant spraying right now: [{ left, right, top, bottom }]
CampaignLevel.prototype.activeSprays = function() {
	var out = [];
	for (var i = 0; i < this.controls.length; i++) {
		var c = this.controls[i];
		if (c.kind !== "HYDRANT" || c.sprayFrames <= 0) continue;
		out.push({ left: c.spray.x - c.spray.width / 2, right: c.spray.x + c.spray.width / 2, top: c.spray.top, bottom: c.spray.bottom });
	}
	return out;
}

// E (touch: the RESCUE / USE button): a trapped worker in reach first, otherwise a pump / valve
CampaignLevel.prototype.interact = function(spiderman) {
	var worker = this.findRescue(spiderman);
	if (worker) return this.rescueWorker(worker);
	var control = this.findControl(spiderman);
	if (control) return this.useControl(control);
	return false;
}

// "TOO DEEP!": a heart, a splash, and back to the last dry / shallow ground (the checkpoint or the start if that spot
// is under deep water by now). The last heart ends the run ("THE FLOOD SWEPT YOU AWAY")
CampaignLevel.prototype.tooDeep = function() {
	var game = this.game;
	var s = game.spiderman;
	var cx = s.centerX();
	var surface = this.waterSurfaceAt(cx);
	this.splashAt(cx, surface !== null ? surface : s.y + s.bodyHeight());
	game.addFloatingText("TOO DEEP!", cx, s.y - 20, "#7fd0ff");
	if (s.canBeHit()) {
		if (s.health <= 1) { s.health = 0; game.gameover("FLOOD"); return; }
		s.handleHitWithProjectile({ name: "WATER", damage: 1 });
	}
	// the oldest remembered spot that is still safe (the water may have risen since)
	var spot = null;
	for (var k = 0; k < this.safeSpots.length; k++) {
		var sp = this.safeSpots[k];
		if (this.waterDepthAt(sp.x + s.bodyWidth() / 2, sp.feet) <= POOLS.DEEP) { spot = sp; break; }
	}
	this.safeSpots = [];
	if (!spot) {
		spot = this.safeFallback();
	}
	if (s.climbing) s.stopClimb(0);
	if (s.swinging) s.swinging = null;
	s.releaseAllKeys();
	s.x = spot.x;
	s.y = spot.feet - s.bodyHeight() - 0.5;
	s.velocityX = 0;
	s.velocityY = 0;
	s.momentumX = 0;
	s.airBeltX = 0;
	s.onGround = false;
	s.groundRoof = null;
	s.wading = false;
}

// pool watchers: a pool that has settled at its watched state powers its id (gates open, lifts run). quiet: restoring a
// checkpoint (no text / sound)
CampaignLevel.prototype.checkPoolPowers = function(quiet) {
	for (var i = 0; i < this.poolPowers.length; i++) {
		var w = this.poolPowers[i];
		if (this.powered[w.power]) continue;
		var pool = this.poolById(w.pool);
		if (!pool || pool.state !== w.state || pool.moving || pool.level !== (pool.state === "HIGH" ? pool.high : pool.low)) continue;
		this.setPowered(w.power, quiet);
		if (!quiet && w.label) this.game.addFloatingText(w.label, this.game.spiderman.centerX(), this.game.spiderman.y - 40, "#8ee27a");
	}
}

// where "TOO DEEP" puts him when none of his recent spots is safe any more: the latest checkpoint that is not under
// deep water now (walking back through them), else the start
CampaignLevel.prototype.safeFallback = function() {
	var w = this.game.spiderman.bodyWidth() / 2;
	var latest = this.checkpoint ? this.checkpoint.checkpointIndex : -1;
	for (var i = latest; i >= 0; i--) {
		var cp = this.checkpoints[i];
		if (cp && this.waterDepthAt(cp.x + w, cp.y) <= POOLS.DEEP) return { x: cp.x, feet: cp.y };
	}
	return { x: this.spawn.x, feet: this.spawn.y };
}

// a small splash on a water surface (sewer pools)
CampaignLevel.prototype.splashAt = function(x, y) {
	var game = this.game;
	game.scene.effects.push(new Burst(game, x, y, "#b8e0c8", 10));
	game.scene.effects.push(new Burst(game, x, y + 4, "#5f8f6a", 6));
	game.sfx.play("SPLASH");
}

CampaignLevel.prototype.updatePools = function() {
	var game = this.game;
	var s = game.spiderman;
	var i;
	for (i = 0; i < this.pools.length; i++) {
		var p = this.pools[i];
		var target = p.state === "HIGH" ? p.high : p.low;
		if (p.level === target) { p.moving = false; continue; }
		p.level = p.level < target ? Math.min(target, p.level + p.speed) : Math.max(target, p.level - p.speed);
		p.moving = p.level !== target;
	}
	for (i = 0; i < this.controls.length; i++) {
		var ctl = this.controls[i];
		if (ctl.pulled > 0) ctl.pulled--;
		if (ctl.sprayFrames > 0) ctl.sprayFrames--;
		if (ctl.cooldown > 0) ctl.cooldown--;
	}
	this.controlInReach = this.findControl(s);
	this.checkPoolPowers(false);

	if (game.transition) return;
	// (climbing uses the taller jump sprite without moving him: measure with his standing height, or grabbing a ladder
	// in shallow water would look 15 px deeper than it is)
	var feet = s.y + (s.climbing ? game.resources.STANDING.height * s.baseScale : s.bodyHeight());
	var cx = s.centerX();
	var depth = this.waterDepthAt(cx, feet);
	// stepping / falling into water makes a splash
	if (depth > 0 && !s.wasInPool && s.velocityY > 3) this.splashAt(cx, feet - depth);
	s.wasInPool = depth > 0;
	if (depth > POOLS.DEEP) { this.tooDeep(); return; }
	s.wading = depth > 0;
	// remember where he stood on firm, dry or shallow ground (never on a raft or a lift: they move)
	if (s.onGround && !s.climbing && s.groundRoof && !s.groundRoof.motion) {
		this.safeSpots.push({ x: s.x, feet: feet });
		if (this.safeSpots.length > POOLS.SAFE_BACK) this.safeSpots.shift();
	}
}

/* ---------- trapped workers (see RESCUE) ---------- */

// the trapped worker spiderman is close enough to free (the closest one), or null
CampaignLevel.prototype.findRescue = function(spiderman) {
	var cx = spiderman.centerX();
	var feet = spiderman.y + spiderman.bodyHeight();
	var best = null;
	for (var i = 0; i < this.rescues.length; i++) {
		var r = this.rescues[i];
		if (r.rescued) continue;
		var dx = Math.abs(cx - r.x);
		if (dx > RESCUE.REACH_X || feet < r.y - RESCUE.REACH_ABOVE || feet > r.y + RESCUE.REACH_BELOW) continue;
		if (!best || dx < Math.abs(cx - best.x)) best = r;
	}
	return best;
}

CampaignLevel.prototype.rescuedCount = function() {
	var count = 0;
	for (var i = 0; i < this.rescues.length; i++) if (this.rescues[i].rescued) count++;
	return count;
}

// the exit flag only clears the stage once every trapped worker is safe (always open in stages without workers)
CampaignLevel.prototype.exitOpen = function() {
	return this.rescuedCount() >= this.rescues.length;
}

CampaignLevel.prototype.rescueWorker = function(r) {
	if (!r || r.rescued) return false;
	var game = this.game;
	r.rescued = true;
	r.freeFrames = 0;
	r.thanks = 150;
	this.rescued[r.id] = true;
	this.rescueInReach = null;
	game.rescuePulse = 30;
	game.sfx.play("RESCUE");
	game.scene.effects.push(new Burst(game, r.x, r.y - 18, "#c9a36b", 12));
	game.scene.effects.push(new Burst(game, r.x, r.y - 24, "#8ee27a", 8));
	var saved = this.rescuedCount(), total = this.rescues.length;
	game.addFloatingText("WORKER RESCUED! " + saved + "/" + total, r.x, r.y - 80, "#8ee27a");
	if (saved >= total && this.goal) game.addFloatingText("EVERYONE IS SAFE - EXIT OPEN!", r.x, r.y - 100, "#ffd83d", true);
	game.syncRescueButton();
	return true;
}

// closed gates block like crates; so does an active laser grid (it cannot be crossed at the cost of a heart)
CampaignLevel.prototype.obstacles = function() {
	var result = [];
	for (var i = 0; i < this.gates.length; i++) {
		var gate = this.gates[i];
		if (gate.state === "OPEN" || (gate.state === "OPENING" && gate.progress > 0.45)) continue;
		result.push(new GateBox(gate));
	}
	for (var j = 0; j < this.lasers.length; j++) {
		var l = this.lasers[j];
		if (l.powerId && !this.powered[l.powerId]) result.push(new LaserBox(this.laserRect(l)));
	}
	return result;
}

function LaserBox(rect) { this.rect = rect; }
LaserBox.prototype.left = function() { return this.rect.left; }
LaserBox.prototype.right = function() { return this.rect.right; }
LaserBox.prototype.top = function() { return this.rect.top; }
LaserBox.prototype.bottom = function() { return this.rect.bottom; }

function GateBox(gate) { this.gate = gate; }
GateBox.prototype.left = function() { return this.gate.x; }
GateBox.prototype.right = function() { return this.gate.x + this.gate.width; }
GateBox.prototype.top = function() { return this.gate.top; }
GateBox.prototype.bottom = function() { return this.gate.bottom; }

// 0..1, how far spiderman is between the spawn point and the goal
CampaignLevel.prototype.progress = function(x) {
	if (this.boss) return 1 - this.boss.healthRatio();
	if (!this.goal) return 0;
	var start = this.design.spawn ? this.design.spawn.x : 0;
	var span = this.goal.x - start;
	if (span <= 0) return 1;
	return Math.max(0, Math.min(1, (x - start) / span));
}

/* ---------- per frame logic of the stage objects ---------- */

// display name of a key item ("KEYCARD", "CORE", ...)
CampaignLevel.prototype.keyLabel = function(keyId) {
	for (var i = 0; i < this.pickups.length; i++) {
		if (this.pickups[i].type === "KEY" && this.pickups[i].keyId === keyId) return this.pickups[i].label || "KEY";
	}
	return "KEY";
}

// every distinct key item of the stage with whether it is owned (for the HUD)
CampaignLevel.prototype.keyItems = function() {
	var items = [], seen = {};
	for (var i = 0; i < this.pickups.length; i++) {
		var p = this.pickups[i];
		if (p.type !== "KEY" || seen[p.keyId]) continue;
		seen[p.keyId] = true;
		items.push({ id: p.keyId, sprite: p.sprite || "KEYCARD", label: p.label || "KEYCARD", owned: !!this.keys[p.keyId] });
	}
	return items;
}

// the door spiderman is standing in front of
CampaignLevel.prototype.findDoor = function(spiderman) {
	var cx = spiderman.centerX();
	var feet = spiderman.y + spiderman.bodyHeight();
	for (var i = 0; i < this.doors.length; i++) {
		var d = this.doors[i];
		if (Math.abs(cx - d.x) <= 22 && Math.abs(feet - d.y) <= 10) return d;
	}
	return null;
}

CampaignLevel.prototype.doorById = function(id) {
	for (var i = 0; i < this.doors.length; i++) if (this.doors[i].id === id) return this.doors[i];
	return null;
}

CampaignLevel.prototype.drawDoor = function(d, frame) {
	var ctx = this.game.ctx;
	var x = d.x - this.game.cameraX;
	var w = PixelArt.width("DOOR_FRAME"), h = PixelArt.height("DOOR_FRAME");
	PixelArt.draw(ctx, "DOOR_FRAME", x - w / 2, d.y - h);
	// lamp: real doors glow a steady green, fake ones flicker (mysterio's tell)
	var lit = d.fake ? (Math.floor(frame / 6) % 3 !== 0 && Math.floor(frame / 37) % 2 === 0) : true;
	PixelArt.draw(ctx, lit ? "LAMP_GREEN" : "LAMP_RED", x - 5, d.y - h - 12.5);
	if (d.label) {
		ctx.save();
		ctx.font = "9px SpidermanGamePixelFont, Monospace, Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = "#9aa3c7";
		ctx.fillText(d.label, Math.round(x), Math.round(d.y - h - 16));
		ctx.restore();
	}
	// prompt when standing in front of it
	var s = this.game.spiderman;
	if (s.onGround && Math.abs(s.centerX() - d.x) <= 22 && Math.abs(s.y + s.bodyHeight() - d.y) <= 10 && Math.floor(frame / 20) % 2 === 0) {
		PixelArt.rect(ctx, "#ffd83d", x - 2.5, d.y - h - 30, 5, 7.5);
		PixelArt.rect(ctx, "#ffd83d", x - 7.5, d.y - h - 25, 15, 2.5);
	}
}

// a flickering mysterio: decoration only
CampaignLevel.prototype.drawHologram = function(hg, frame) {
	var game = this.game;
	var ctx = game.ctx;
	var img = game.resources.MYSTERIO;
	if (!img) return;
	var x = hg.x - game.cameraX;
	var w = img.width * hg.scale, h = img.height * hg.scale;
	var flicker = Math.floor(frame / 4) % 7 === 0 ? 0.25 : 0.7;
	ctx.save();
	ctx.globalAlpha = flicker + 0.1 * Math.sin(frame * 0.2);
	ctx.drawImage(img, Math.round(x - w / 2), Math.round(hg.y - h + Math.sin(frame * 0.05) * 4), w, h);
	ctx.globalAlpha = 0.35;
	for (var ly = 0; ly < h; ly += 7.5) PixelArt.rect(ctx, "#7dffb0", x - w / 2, hg.y - h + ly + (frame % 8 < 4 ? 2.5 : 0), w, 2.5);
	ctx.restore();
	if (hg.text) {
		ctx.save();
		ctx.font = "11px SpidermanGamePixelFont, Monospace, Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = "#7dffb0";
		ctx.globalAlpha = 0.8;
		ctx.fillText(hg.text, Math.round(x), Math.round(hg.y - h - 8 + Math.sin(frame * 0.05) * 4));
		ctx.restore();
	}
}

// switches wired to a target id (a gate id or a lift's powerId)
CampaignLevel.prototype.switchCount = function(id) {
	var n = 0;
	for (var i = 0; i < this.switches.length; i++) if (this.switches[i].gate === id) n++;
	return n;
}

CampaignLevel.prototype.switchesOn = function(id) {
	var n = 0;
	for (var i = 0; i < this.switches.length; i++) if (this.switches[i].gate === id && this.switches[i].on) n++;
	return n;
}

// every switch of the target is on: open the gates and start the lifts with that id
CampaignLevel.prototype.setPowered = function(id, quiet) {
	var i;
	this.powered[id] = true;
	for (i = 0; i < this.gates.length; i++) if (this.gates[i].id === id) this.openGate(this.gates[i]);
	// a laser grid wired to this id shuts down for good
	var firstLaser = null;
	for (i = 0; i < this.lasers.length; i++) if (this.lasers[i].powerId === id) { firstLaser = firstLaser || this.lasers[i]; }
	if (firstLaser && !quiet) {
		this.game.sfx.play("LASER_OFF");
		var lc = this.laserCenter(firstLaser);
		this.game.addFloatingText("LASER GRID OFFLINE", lc.x, lc.top - 20, "#8ee27a");
	}
	for (i = 0; i < this.roofs.length; i++) {
		var roof = this.roofs[i];
		if (roof.powerId === id && !roof.powered) {
			var before = roof.beltSpeed();
			roof.powered = true;
			if (quiet) continue;
			var label = roof.style === "ELEVATOR" ? "ELEVATOR POWERED" : "LIFT POWERED";
			if (roof.conveyor) {
				var after = roof.beltSpeed();
				label = after === 0 ? "BELT STOPPED" : (before === 0 ? "BELT ON" : (before * after < 0 ? "BELT REVERSED" : "BELT SPEED CHANGED"));
			}
			this.game.addFloatingText(label, roof.x + roof.width / 2, roof.y - 60, "#8ee27a");
		}
	}
}

// red / green lamps showing which switches of a target are on
CampaignLevel.prototype.drawPowerLamps = function(id, centerX, y) {
	var ctx = this.game.ctx;
	var total = this.switchCount(id);
	var on = this.switchesOn(id);
	var width = total * 15;
	PixelArt.rect(ctx, "#2a2a33", centerX - width / 2 - 2.5, y - 2.5, width + 5, 15);
	for (var i = 0; i < total; i++) {
		PixelArt.draw(ctx, i < on ? "LAMP_GREEN" : "LAMP_RED", centerX - width / 2 + i * 15 + 2.5, y);
	}
}

// where a laser is: { state: "OFF" | "WARN" | "ON", t: frames into that state, left: frames until it changes,
// offline: a grid that was switched off, grid: always on until powered }
CampaignLevel.prototype.laserState = function(l) {
	if (l.powerId) return this.powered[l.powerId] ? { state: "OFF", t: 0, offline: true, grid: true } : { state: "ON", t: this.frame, grid: true };
	if (!l.period) return { state: "ON", t: this.frame };
	var cycle = ((this.frame + l.offset) % l.period + l.period) % l.period;
	var onAt = l.period - l.on, warnAt = onAt - l.warn;
	if (cycle >= onAt) return { state: "ON", t: cycle - onAt, left: l.period - cycle };
	if (cycle >= warnAt) return { state: "WARN", t: cycle - warnAt, left: onAt - cycle };
	return { state: "OFF", t: cycle, left: warnAt - cycle };
}

// the deadly rectangle of a beam (while it is on)
CampaignLevel.prototype.laserRect = function(l) {
	if (l.vertical) return { left: l.x - LASER.HALF, right: l.x + LASER.HALF, top: l.y1, bottom: l.y2 };
	return { left: l.x1, right: l.x2, top: l.y - LASER.HALF, bottom: l.y + LASER.HALF };
}

CampaignLevel.prototype.laserCenter = function(l) {
	var r = this.laserRect(l);
	return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, top: l.vertical ? l.y1 : l.y };
}

// per frame: hits, warning beeps, the grid's "override n/2" hint
CampaignLevel.prototype.updateLasers = function() {
	var game = this.game;
	var spiderman = game.spiderman;
	var hitbox = spiderman.getHitbox();
	var myY = (hitbox.top + hitbox.bottom) / 2;
	var gridHinted = {};
	for (var i = 0; i < this.lasers.length; i++) {
		var l = this.lasers[i];
		var st = this.laserState(l);
		var c = this.laserCenter(l);
		var near = Math.abs(c.x - spiderman.centerX()) < LASER.SOUND_RANGE && Math.abs(c.y - myY) < 300;
		if (near && !st.grid) {
			// beeps during the warning (faster toward the end), a zap when it fires
			if (st.state === "WARN" && (st.t === 0 || st.t === Math.floor(l.warn / 2) || st.t === l.warn - 12)) game.sfx.play("LASER_WARN");
			if (st.state === "ON" && st.t === 0) game.sfx.play("LASER_ON");
		}
		if (l.warned > 0) l.warned--;
		if (st.grid && !st.offline && l.warned <= 0 && !gridHinted[l.powerId] && Math.abs(c.x - spiderman.centerX()) < 140 && Math.abs(c.y - myY) < 200) {
			gridHinted[l.powerId] = true;
			for (var j = 0; j < this.lasers.length; j++) if (this.lasers[j].powerId === l.powerId) this.lasers[j].warned = 150;
			game.sfx.play("GATE_LOCKED");
			game.addFloatingText("LASER GRID - OVERRIDE " + this.switchesOn(l.powerId) + "/" + this.switchCount(l.powerId), c.x, c.top - 45, "#ff8080");
		}
		if (st.state !== "ON") continue;
		var r = this.laserRect(l);
		// a grid is solid (see obstacles), so touching its side counts
		var reach = st.grid ? 3 : 0;
		if (hitbox.right > r.left - reach && hitbox.left < r.right + reach && hitbox.bottom > r.top && hitbox.top < r.bottom) {
			// vertical beam: knocked away from it; horizontal beam: knocked back the way he came
			spiderman.hitByHazard(l.vertical ? l.x : spiderman.centerX() + (spiderman.runningDirection === DIRECTION.LEFT ? -1 : 1));
		}
	}
}

// emitters with a status lamp (green = off, blinking yellow = about to fire, red = firing, gray = offline), the
// warning line that fills toward the far emitter, and the beam
CampaignLevel.prototype.drawLaser = function(l, frame) {
	var ctx = this.game.ctx;
	var camX = this.game.cameraX;
	var st = this.laserState(l);
	var lamp = st.offline ? "#5f666d" : (st.state === "ON" ? "#ff3030" : (st.state === "WARN" ? (Math.floor(st.t / Math.max(2, 8 - Math.floor(st.t / 8))) % 2 === 0 ? "#ffd83d" : "#5a4a10") : "#3fa534"));
	var i;
	if (l.vertical) {
		var x = l.x - camX;
		var top = l.y1, bottom = l.y2, len = bottom - top;
		// beam / warning first, emitters on top
		if (st.state === "ON") {
			var flick = frame % 6 < 3 ? 0.3 : 0.22;
			PixelArt.rect(ctx, "rgba(255, 40, 40, " + flick + ")", x - 7.5, top, 15, len);
			PixelArt.rect(ctx, "#ff3b3b", x - 2.5, top, 5, len);
			PixelArt.rect(ctx, "#ffd6d6", x - 1.25, top, 2.5, len);
		} else if (st.state === "WARN") {
			var filled = len * (st.t + 1) / l.warn;
			for (var dy = 0; dy < len; dy += 10) PixelArt.rect(ctx, dy < filled ? "rgba(255, 80, 60, 0.85)" : "rgba(255, 216, 61, 0.35)", x - 1.25, top + dy, 2.5, 5);
		}
		// emitters: ceiling and floor, each with a status lamp (a halo while it warns)
		if (st.state === "WARN") {
			PixelArt.rect(ctx, "rgba(255, 216, 61, 0.35)", x - 12.5, top + 2.5, 25, 15);
			PixelArt.rect(ctx, "rgba(255, 216, 61, 0.35)", x - 12.5, bottom - 17.5, 25, 15);
		}
		PixelArt.rect(ctx, "#1b1b22", x - 12.5, top - 2.5, 25, 15);
		PixelArt.rect(ctx, "#8d949b", x - 10, top, 20, 7.5);
		PixelArt.rect(ctx, lamp, x - 5, top + 7.5, 10, 5);
		PixelArt.rect(ctx, "#1b1b22", x - 12.5, bottom - 12.5, 25, 12.5);
		PixelArt.rect(ctx, "#8d949b", x - 10, bottom - 7.5, 20, 7.5);
		PixelArt.rect(ctx, lamp, x - 5, bottom - 12.5, 10, 5);
		if (l.powerId) this.drawPowerLamps(l.powerId, x, top - 20);
	} else {
		var x1 = l.x1 - camX, x2 = l.x2 - camX, y = l.y, w = x2 - x1;
		if (st.state === "ON") {
			var fl = frame % 6 < 3 ? 0.3 : 0.22;
			PixelArt.rect(ctx, "rgba(255, 40, 40, " + fl + ")", x1, y - 7.5, w, 15);
			PixelArt.rect(ctx, "#ff3b3b", x1, y - 2.5, w, 5);
			PixelArt.rect(ctx, "#ffd6d6", x1, y - 1.25, w, 2.5);
		} else if (st.state === "WARN") {
			var fillW = w * (st.t + 1) / l.warn;
			for (var dx = 0; dx < w; dx += 10) PixelArt.rect(ctx, dx < fillW ? "rgba(255, 80, 60, 0.85)" : "rgba(255, 216, 61, 0.35)", x1 + dx, y - 1.25, 5, 2.5);
		}
		// emitters on posts down to the floor (opts.post = the floor y)
		if (l.post !== undefined && l.post > y + 10) {
			PixelArt.rect(ctx, "#4e4a52", x1 - 10, y + 10, 7.5, l.post - y - 10);
			PixelArt.rect(ctx, "#4e4a52", x2 + 2.5, y + 10, 7.5, l.post - y - 10);
		}
		if (st.state === "WARN") {
			PixelArt.rect(ctx, "rgba(255, 216, 61, 0.35)", x1 - 17.5, y - 12.5, 20, 25);
			PixelArt.rect(ctx, "rgba(255, 216, 61, 0.35)", x2 - 2.5, y - 12.5, 20, 25);
		}
		PixelArt.rect(ctx, "#1b1b22", x1 - 15, y - 10, 15, 20);
		PixelArt.rect(ctx, "#8d949b", x1 - 12.5, y - 7.5, 7.5, 15);
		PixelArt.rect(ctx, lamp, x1 - 5, y - 5, 5, 10);
		PixelArt.rect(ctx, "#1b1b22", x2, y - 10, 15, 20);
		PixelArt.rect(ctx, "#8d949b", x2 + 5, y - 7.5, 7.5, 15);
		PixelArt.rect(ctx, lamp, x2, y - 5, 5, 10);
	}
	if (st.offline && Math.floor(frame / 40) % 2 === 0) {
		var oc = this.laserCenter(l);
		PixelArt.rect(ctx, "rgba(142, 226, 122, 0.5)", oc.x - camX - 1.25, oc.top + 15, 2.5, 2.5);
	}
}

// where a steam vent is in its cycle: { state: "IDLE" | "WARN" | "BLAST", t: frames into that state }
CampaignLevel.prototype.steamPhase = function(hz) {
	var cycle = ((this.frame + hz.offset) % hz.period + hz.period) % hz.period;
	var blastAt = hz.period - STEAM.BLAST;
	var warnAt = blastAt - STEAM.WARN;
	if (cycle >= blastAt) return { state: "BLAST", t: cycle - blastAt };
	if (cycle >= warnAt) return { state: "WARN", t: cycle - warnAt };
	return { state: "IDLE", t: cycle };
}

// steam vent: a grate in the floor; warning puffs, then a tall column of pixel clouds
CampaignLevel.prototype.drawSteam = function(hz, frame) {
	var ctx = this.game.ctx;
	var x = hz.x - this.game.cameraX;
	var phase = this.steamPhase(hz);
	PixelArt.draw(ctx, "STEAM_VENT", x, hz.y - PixelArt.height("STEAM_VENT"));
	var cx = x + hz.width / 2;
	var i, py, size, jitter;
	if (phase.state === "WARN") {
		// a few small puffs and a blinking warning light
		for (i = 0; i < 3; i++) {
			py = ((phase.t * 1.5 + i * 12) % 36);
			PixelArt.rect(ctx, "rgba(230, 236, 240, " + (0.55 - py / 80) + ")", cx - 5 + (i - 1) * 7.5, hz.y - 10 - py, 7.5, 7.5);
		}
		if (Math.floor(phase.t / 5) % 2 === 0) PixelArt.rect(ctx, "#ff8a1f", cx - 2.5, hz.y - PixelArt.height("STEAM_VENT") - 5, 5, 5);
	} else if (phase.state === "BLAST") {
		// the column grows fast, holds, then thins out
		var grow = Math.min(1, phase.t / 8);
		var fade = phase.t > STEAM.BLAST - 12 ? (STEAM.BLAST - phase.t) / 12 : 1;
		var top = hz.y - hz.height * grow;
		ctx.save();
		ctx.globalAlpha = 0.85 * fade;
		for (py = hz.y - 10; py > top; py -= 12.5) {
			var f = (hz.y - py) / hz.height;
			size = 15 + f * 15;
			jitter = Math.sin(frame * 0.5 + py * 0.3) * 5;
			PixelArt.rect(ctx, "#e6ecf0", cx - size / 2 + jitter, py - 12.5, size, 12.5);
			PixelArt.rect(ctx, "#b7c3cc", cx - size / 2 + jitter, py - 2.5, size, 2.5);
		}
		ctx.restore();
	}
}

CampaignLevel.prototype.drawHazard = function(hz, frame) {
	var ctx = this.game.ctx;
	var x = hz.x - this.game.cameraX;
	if (hz.kind === "STEAM") {
		this.drawSteam(hz, frame);
		return;
	}
	if (hz.kind === "DRONE") {
		var dn = Math.floor(frame / 10) % 2 === 0 ? "DRONE_0" : "DRONE_1";
		PixelArt.draw(ctx, dn, x, hz.y - 25 + Math.sin(frame * 0.1 + hz.x) * 2);
		if (frame % 30 < 4) PixelArt.rect(ctx, "rgba(125, 255, 176, 0.6)", x + 7.5, hz.y - 12, 10, 2.5);
		return;
	}
	if (hz.kind === "REBAR") {
		PixelArt.drawRow(ctx, "REBAR_TILE", x, hz.y - 17.5, hz.width);
	} else {
		var name = Math.floor(frame / 8) % 2 === 0 ? "SPARK_BOX_0" : "SPARK_BOX_1";
		PixelArt.draw(ctx, name, x, hz.y - 25);
		// sparks
		if (frame % 5 < 3) {
			var sx = x + 5 + ((frame * 7) % 15), sy = hz.y - 30 - ((frame * 3) % 12);
			PixelArt.rect(ctx, "#ffd83d", sx, sy, 2.5, 2.5);
			PixelArt.rect(ctx, "#f4f4f4", sx + 5, sy - 5, 2.5, 2.5);
		}
	}
}

CampaignLevel.prototype.openGate = function(gate) {
	if (gate.state !== "CLOSED") return;
	gate.state = "OPENING";
	gate.progress = 0;
	this.game.sfx.play("GATE_OPEN");
	this.game.addFloatingText("OPEN!", gate.x + gate.width / 2, gate.top - 10, "#8ee27a");
}

CampaignLevel.prototype.updateObjects = function() {
	var game = this.game;
	var spiderman = game.spiderman;
	var hitbox = spiderman.getHitbox();
	var i;

	// gates
	for (i = 0; i < this.gates.length; i++) {
		var gate = this.gates[i];
		if (gate.warned > 0) gate.warned--;
		if (gate.state === "OPENING") {
			gate.progress = Math.min(1, gate.progress + 1 / 50);
			if (gate.progress >= 1) gate.state = "OPEN";
		} else if (gate.state === "CLOSED" && gate.opens === "SWITCH" && this.switchCount(gate.id) > 1) {
			// a door wired to several switches says how many are still missing (its lamps show it too)
			var nearDoor = Math.abs(spiderman.centerX() - (gate.x + gate.width / 2)) < 90 && hitbox.bottom > gate.top && hitbox.top < gate.bottom;
			if (nearDoor && gate.warned <= 0) {
				gate.warned = 120;
				game.sfx.play("GATE_LOCKED");
				game.addFloatingText("LOCKED - POWER " + this.switchesOn(gate.id) + "/" + this.switchCount(gate.id), gate.x + gate.width / 2, gate.top - 40, "#ff8080");
			}
		} else if (gate.state === "CLOSED" && gate.opens === "KEY") {
			var near = Math.abs(spiderman.centerX() - (gate.x + gate.width / 2)) < 90 && hitbox.bottom > gate.top && hitbox.top < gate.bottom;
			if (near) {
				var owned = 0;
				for (var k = 0; k < gate.keyIds.length; k++) if (this.keys[gate.keyIds[k]]) owned++;
				if (owned >= gate.keyIds.length) {
					this.openGate(gate);
				} else if (gate.warned <= 0) {
					gate.warned = 100;
					game.sfx.play("GATE_LOCKED");
					var what = gate.keyIds.length > 1 ? "NEEDS " + gate.keyIds.length + " " + this.keyLabel(gate.keyIds[0]) + "S - " + owned + "/" + gate.keyIds.length : "NEEDS A " + this.keyLabel(gate.keyIds[0]);
					game.addFloatingText("LOCKED - " + what, gate.x + gate.width / 2, gate.top - 10, "#ff8080");
				}
			}
		}
	}

	// moving hazards (drones) patrol between two points
	for (i = 0; i < this.hazards.length; i++) {
		var mh = this.hazards[i];
		if (!mh.motion) continue;
		var mm = mh.motion;
		var cur = mm.axis === "y" ? mh.y : mh.x;
		var nxt = cur + mm.direction * mm.speed;
		if (nxt >= Math.max(mm.from, mm.to)) { nxt = Math.max(mm.from, mm.to); mm.direction = -1; }
		if (nxt <= Math.min(mm.from, mm.to)) { nxt = Math.min(mm.from, mm.to); mm.direction = 1; }
		if (mm.axis === "y") mh.y = nxt; else mh.x = nxt;
	}

	// switches: walk into the lever
	for (i = 0; i < this.switches.length; i++) {
		var sw = this.switches[i];
		if (sw.on) continue;
		// the lever is "hit" when passing through its column, also when jumping over it
		var swW = PixelArt.width("SWITCH_OFF");
		if (hitbox.right > sw.x - swW / 2 && hitbox.left < sw.x + swW / 2 && hitbox.bottom > sw.y - 220 && hitbox.top < sw.y) {
			sw.on = true;
			game.sfx.play("SWITCH");
			var total = this.switchCount(sw.gate), on = this.switchesOn(sw.gate);
			game.addFloatingText(total > 1 ? "POWER " + on + "/" + total : "SWITCH ON", sw.x, sw.y - PixelArt.height("SWITCH_OFF") - 8, "#8ee27a");
			if (on >= total) this.setPowered(sw.gate);
		}
	}

	// hazards: damage + knock-back on touch (steam vents only while they blast)
	this.frame++;
	for (i = 0; i < this.hazards.length; i++) {
		var hz = this.hazards[i];
		if (hz.kind === "STEAM") {
			var phase = this.steamPhase(hz);
			if (phase.state === "BLAST" && phase.t === 0 && Math.abs(hz.x - game.cameraX - game.viewWidth / 2) < game.viewWidth * 0.7) game.sfx.play("STEAM");
			if (phase.state !== "BLAST") continue;
		}
		if (hitbox.right > hz.x + 3 && hitbox.left < hz.x + hz.width - 3 && hitbox.bottom > hz.y - hz.height + 3 && hitbox.top < hz.y) {
			spiderman.hitByHazard(hz.x + hz.width / 2);
		}
	}

	// security lasers
	this.updateLasers();

	// unpowered lifts tell the player what is missing when he steps near them
	for (i = 0; i < this.roofs.length; i++) {
		var lift = this.roofs[i];
		if (!lift.powerId || lift.powered || !lift.motion) continue;
		if (this.powerWarned[lift.powerId] > 0) { this.powerWarned[lift.powerId]--; continue; }
		if (Math.abs(spiderman.centerX() - (lift.x + lift.width / 2)) < 120 && Math.abs(spiderman.y + spiderman.bodyHeight() - lift.y) < 140) {
			this.powerWarned[lift.powerId] = 150;
			game.sfx.play("GATE_LOCKED");
			game.addFloatingText("NO POWER - SWITCHES " + this.switchesOn(lift.powerId) + "/" + this.switchCount(lift.powerId), lift.x + lift.width / 2, lift.y - 60, "#ff8080");
		}
	}

	// harbour: marked ropes, falling cargo, splashes
	if (this.knots.length || this.drops.length || this.waterY !== null) this.updateHarbor();
	// sewer: water levels, wading, too deep
	if (this.pools.length || this.controls.length) this.updatePools();

	// trapped workers: who can be freed right now (prompt + touch button), freeing animation, and the exit flag that
	// stays shut until every worker is safe
	if (this.rescues.length) {
		this.rescueInReach = this.findRescue(spiderman);
		for (i = 0; i < this.rescues.length; i++) {
			var rw = this.rescues[i];
			if (rw.rescued && rw.freeFrames < RESCUE.FREE_FRAMES) rw.freeFrames++;
			if (rw.thanks > 0) rw.thanks--;
		}
		if (this.exitWarned > 0) this.exitWarned--;
		if (this.goal && !this.exitOpen() && this.exitWarned <= 0 && this.goal.touchesSpiderman()) {
			this.exitWarned = RESCUE.EXIT_WARN_EVERY;
			game.sfx.play("GATE_LOCKED");
			game.addFloatingText("EXIT LOCKED - RESCUE THE WORKERS " + this.rescuedCount() + "/" + this.rescues.length, this.goal.x, this.goal.y - this.goal.height - 30, "#ff8080");
		}
		game.syncRescueButton();
	} else if (this.controls.length) {
		game.syncRescueButton();
	}

	// checkpoints. Re-entering the latest checkpoint saves again, so backtracking for an item and coming back
	// keeps that item on the next retry (progress only ever accumulates, so a fresh snapshot is always safe)
	for (i = 0; i < this.checkpoints.length; i++) {
		var cp = this.checkpoints[i];
		// passing the post counts even mid-jump (tall trigger column)
		var inside = hitbox.right > cp.x - 12 && hitbox.left < cp.x + 12 && hitbox.bottom > cp.y - 220 && hitbox.top < cp.y + 10;
		if (inside && !cp.inside) {
			if (!cp.active) this.activateCheckpoint(cp);
			else if (this.checkpoint && cp.index >= this.checkpoint.checkpointIndex) this.refreshCheckpoint(cp);
		}
		cp.inside = inside;
	}
}

/* ---------- drawing ---------- */

// underground band: shows as a dark pit wherever the street has a hole
CampaignLevel.prototype.drawBackground = function() {
	var game = this.game;
	var ctx = game.ctx;
	var left = game.cameraX - 10;
	var width = game.viewWidth + 20;

	// indoor rooms: dark wall panels with a few lights, drawn behind everything. Rooms that start below the street
	// line (basements) are drawn after the dark underground band, so it does not cover them
	var r, room;
	for (r = 0; r < this.rooms.length; r++) {
		room = this.rooms[r];
		if (room.y >= this.floorY || room.x + room.width < left || room.x > left + width) continue;
		this.drawRoom(room);
	}

	if (this.waterY !== null) {
		this.drawWater(left, width);
	} else {
		PixelArt.rect(ctx, "#101016", left - game.cameraX, this.floorY, width, 400);
	}
	for (r = 0; r < this.rooms.length; r++) {
		room = this.rooms[r];
		if (room.y < this.floorY || room.x + room.width < left || room.x > left + width) continue;
		this.drawRoom(room);
	}
	for (var pi = 0; pi < this.pools.length; pi++) {
		var pool = this.pools[pi];
		if (pool.x + pool.width < left || pool.x > left + width) continue;
		this.drawPoolBack(pool);
	}
	if (this.waterY !== null) {
		for (var c = 0; c < this.cranes.length; c++) {
			var crane = this.cranes[c];
			if (Math.max(crane.x + crane.span, crane.boomTo) + 40 < left || Math.min(crane.x, crane.boomFrom) - 40 > left + width) continue;
			this.drawCrane(crane);
		}
		return;
	}
	// rubble line
	for (var rx = Math.floor(left / 40) * 40; rx < left + width; rx += 40) {
		PixelArt.rect(ctx, "#1b1b22", rx - game.cameraX, this.floorY + 90 + ((rx / 40) % 3) * 5, 15, 5);
	}
}

// harbour water behind the platforms: deep blue getting darker, a bright rippling surface line
CampaignLevel.prototype.drawWater = function(left, width) {
	var game = this.game;
	var ctx = game.ctx;
	var top = this.waterY;
	var x = left - game.cameraX;
	var gradient = ctx.createLinearGradient(0, top, 0, top + 260);
	gradient.addColorStop(0, "#14405e");
	gradient.addColorStop(1, "#061424");
	ctx.fillStyle = gradient;
	ctx.fillRect(Math.round(x), Math.round(top), Math.round(width), 420);
	var f = game.frame;
	for (var wx = Math.floor(left / 30) * 30; wx < left + width; wx += 30) {
		var bob = Math.round(Math.sin(f * 0.05 + wx * 0.07) * 1.5) * PIXEL;
		PixelArt.rect(ctx, "rgba(190, 225, 255, 0.45)", wx - game.cameraX, top + bob, 15, 2.5);
		if ((wx / 30) % 4 === 0) PixelArt.rect(ctx, "rgba(255, 220, 140, 0.2)", wx - game.cameraX + ((f / 3 + wx) % 20), top + 25 + (wx % 3) * 15, 12.5, 2.5);
	}
}

// the water in front of everything: tints whatever is below the surface (quay walls, pilings, hulls, dropped cargo,
// and spider-man if he falls in). Drawn after spider-man, inside the zoomed world. Stages without water: nothing
CampaignLevel.prototype.drawForeground = function() {
	if (this.pools.length) this.drawPoolsFront();
	if (this.waterY === null) return;
	var game = this.game;
	var ctx = game.ctx;
	var top = this.waterY + 5;
	var bottom = game.cameraY + game.viewHeight + 20;
	if (bottom <= top) return;
	var left = game.cameraX - 10, width = game.viewWidth + 20;
	ctx.fillStyle = "rgba(12, 44, 72, 0.62)";
	ctx.fillRect(Math.round(left - game.cameraX), Math.round(top), Math.round(width), Math.round(bottom - top));
	var f = game.frame;
	for (var wx = Math.floor(left / 20) * 20; wx < left + width; wx += 20) {
		var bob = Math.round(Math.sin(f * 0.06 + wx * 0.05) * 1.5) * PIXEL;
		PixelArt.rect(ctx, "rgba(160, 210, 245, 0.5)", wx - game.cameraX, top - 2.5 + bob, 12.5, 2.5);
	}
}

// a sewer pool behind the platforms: murky green water, darker with depth, foam on the surface while it moves
CampaignLevel.prototype.drawPoolBack = function(p) {
	if (p.level >= p.bottom) return;
	var game = this.game;
	var ctx = game.ctx;
	var x = p.x - game.cameraX, top = Math.round(p.level), h = p.bottom - p.level;
	var gradient = ctx.createLinearGradient(0, top, 0, p.bottom);
	gradient.addColorStop(0, "#2f5a44");
	gradient.addColorStop(1, "#0f2219");
	ctx.fillStyle = gradient;
	ctx.fillRect(Math.round(x), top, Math.round(p.width), Math.round(h));
}

// the same pools in front of everything: a see-through layer (legs of a wading spider-man, walls under water), the
// rippling surface, rings around his legs while he wades, bubbles while a pump moves the water
CampaignLevel.prototype.drawPoolsFront = function() {
	var game = this.game;
	var ctx = game.ctx;
	var s = game.spiderman;
	var f = game.frame;
	var left = game.cameraX - 20, right = game.cameraX + game.viewWidth + 20;
	for (var i = 0; i < this.pools.length; i++) {
		var p = this.pools[i];
		if (p.level >= p.bottom || p.x + p.width < left || p.x > right) continue;
		var x1 = Math.max(p.x, left), x2 = Math.min(p.x + p.width, right);
		ctx.fillStyle = "rgba(40, 90, 62, 0.5)";
		ctx.fillRect(Math.round(x1 - game.cameraX), Math.round(p.level + 3), Math.round(x2 - x1), Math.round(p.bottom - p.level - 3));
		for (var wx = Math.floor(x1 / 20) * 20; wx < x2 - 5; wx += 20) {
			if (wx < p.x) continue;
			var bob = Math.round(Math.sin(f * 0.07 + wx * 0.09) * 1) * PIXEL;
			PixelArt.rect(ctx, "rgba(190, 235, 205, 0.55)", wx - game.cameraX, p.level + bob, 12.5, 2.5);
			if (p.moving && (wx / 20 + Math.floor(f / 6)) % 3 === 0) PixelArt.rect(ctx, "rgba(230, 250, 235, 0.7)", wx - game.cameraX + 5, p.level - 5 - (f % 12) / 3, 5, 5);
		}
		// rings around his legs while he wades
		var scx = s.centerX();
		if (s.wading && scx >= p.x && scx <= p.x + p.width) {
			var ring = (f % 24) / 24;
			var rw = 30 + ring * 30;
			ctx.save();
			ctx.globalAlpha = 0.7 * (1 - ring);
			PixelArt.rect(ctx, "#d8f5e2", scx - game.cameraX - rw / 2, p.level - 2.5, rw, 2.5);
			ctx.restore();
		}
	}
}

// a pump cabinet (gauge + lever) or a wheel valve on a riser pipe; with the "[E] LOWER / RAISE WATER" prompt in reach
CampaignLevel.prototype.drawControl = function(c, frame) {
	if (c.kind === "HYDRANT") return this.drawHydrant(c, frame);
	var game = this.game;
	var ctx = game.ctx;
	var x = c.x - game.cameraX, y = c.y;
	var pool = this.poolById(c.pools[0]);
	var high = pool && pool.state === "HIGH";
	if (c.kind === "VALVE") {
		PixelArt.rect(ctx, "#1b1b22", x - 7.5, y - 200, 15, 190);
		PixelArt.rect(ctx, "#5f666d", x - 5, y - 200, 10, 190);
		PixelArt.rect(ctx, "#8d949b", x - 5, y - 200, 2.5, 190);
		PixelArt.rect(ctx, "#1b1b22", x - 10, y - 12.5, 20, 12.5);
		// the wheel (spins while the water moves)
		var turning = pool && pool.moving ? Math.floor(frame / 4) % 2 : 0;
		PixelArt.rect(ctx, "#1b1b22", x - 15, y - 50, 30, 30);
		PixelArt.rect(ctx, "#e3201b", x - 12.5, y - 47.5, 25, 25);
		PixelArt.rect(ctx, "#1b1b22", x - 7.5, y - 42.5, 15, 15);
		PixelArt.rect(ctx, "#e3201b", turning ? x - 12.5 : x - 2.5, turning ? y - 37.5 : y - 47.5, turning ? 25 : 5, turning ? 5 : 25);
		PixelArt.rect(ctx, "#ffd83d", x - 2.5, y - 37.5, 5, 5);
	} else {
		PixelArt.rect(ctx, "#1b1b22", x - 17.5, y - 50, 35, 50);
		PixelArt.rect(ctx, "#4e6a8a", x - 15, y - 47.5, 30, 47.5);
		PixelArt.rect(ctx, "#8d949b", x - 15, y - 47.5, 30, 5);
		// gauge: how full the pool is
		PixelArt.rect(ctx, "#1b1b22", x - 10, y - 37.5, 10, 27.5);
		var fill = pool ? Math.max(0, Math.min(1, (pool.bottom - pool.level) / Math.max(1, pool.bottom - pool.high))) : 0;
		PixelArt.rect(ctx, "#49b6ff", x - 7.5, y - 12.5 - 22.5 * fill, 5, 22.5 * fill);
		// the lever (up: pumping off / water high, down: pumping / water low); moving while just thrown
		var down = !high;
		PixelArt.rect(ctx, "#1b1b22", x + 2.5, y - 30, 7.5, 10);
		PixelArt.rect(ctx, "#b7bec5", x + 5, down ? y - 25 : y - 45, 2.5, 20);
		PixelArt.rect(ctx, "#e3201b", x + 2.5, down ? y - 10 : y - 50, 7.5, 7.5);
		PixelArt.rect(ctx, (pool && pool.moving && Math.floor(frame / 8) % 2) ? "#8ee27a" : "#3f5a2e", x + 7.5, y - 42.5, 5, 5);
	}
	ctx.save();
	ctx.font = "9px SpidermanGamePixelFont, Monospace, Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillStyle = "#9aa3c7";
	ctx.fillText(c.label, Math.round(x), Math.round(y - (c.kind === "VALVE" ? 56 : 56)));
	ctx.restore();
	if (c.requires) {
		// power lamp: red until its breaker is on
		var on = this.controlPowered(c);
		PixelArt.rect(ctx, "#1b1b22", x + 12.5, y - 62.5, 10, 10);
		PixelArt.rect(ctx, on ? "#3fa534" : (Math.floor(frame / 20) % 2 ? "#e3201b" : "#7a0c12"), x + 15, y - 60, 5, 5);
	}
	if (this.controlInReach === c) {
		var action = this.controlPowered(c) ? this.controlAction(c) + " WATER" : "NO POWER";
		this.drawBubble(game.touchMode ? action : "E  " + action, x, y - 72, Math.floor(frame / 15) % 2 === 0 ? "#8ee27a" : "#ffd83d");
	}
}

// a hydrant valve (sandman arena): the wheel on a riser pipe that runs up and across to its nozzle over the floor, a
// gauge that fills while it recharges, and the water pouring from the nozzle while it sprays
CampaignLevel.prototype.drawHydrant = function(c, frame) {
	var game = this.game;
	var ctx = game.ctx;
	var cam = game.cameraX;
	var x = c.x - cam, y = c.y, sp = c.spray;
	var nx = sp.x - cam, pipeY = sp.top - 30;
	// the pipe: up from the valve, across, down to the nozzle
	PixelArt.rect(ctx, "#1b1b22", x - 7.5, pipeY - 7.5, 15, y - pipeY);
	PixelArt.rect(ctx, "#1b1b22", Math.min(x, nx) - 7.5, pipeY - 7.5, Math.abs(nx - x) + 15, 15);
	PixelArt.rect(ctx, "#3f6fa0", x - 5, pipeY - 5, 10, y - pipeY - 5);
	PixelArt.rect(ctx, "#3f6fa0", Math.min(x, nx) - 5, pipeY - 5, Math.abs(nx - x) + 10, 10);
	PixelArt.rect(ctx, "#7fb2ff", Math.min(x, nx) - 5, pipeY - 5, Math.abs(nx - x) + 10, 2.5);
	// the nozzle
	PixelArt.rect(ctx, "#1b1b22", nx - 22.5, pipeY, 45, 30);
	PixelArt.rect(ctx, "#5f666d", nx - 20, pipeY + 2.5, 40, 25);
	PixelArt.rect(ctx, "#8d949b", nx - 20, pipeY + 2.5, 40, 5);
	for (var hx = -15; hx <= 15; hx += 10) PixelArt.rect(ctx, "#1b1b22", nx + hx - 2.5, pipeY + 22.5, 5, 5);
	// the water
	if (c.sprayFrames > 0) {
		var fade = Math.min(1, c.sprayFrames / 12, (BOSS.SANDMAN.SPRAY - c.sprayFrames + 1) / 6);
		ctx.save();
		ctx.globalAlpha = 0.55 * fade;
		PixelArt.rect(ctx, "#7fd0ff", nx - sp.width / 2, sp.top, sp.width, sp.bottom - sp.top);
		ctx.globalAlpha = 0.9 * fade;
		for (var sx = -sp.width / 2 + 5; sx < sp.width / 2 - 5; sx += 15) {
			for (var sy = sp.top + ((frame * 9 + sx * 7) % 60); sy < sp.bottom; sy += 60) PixelArt.rect(ctx, "#e8f7ff", nx + sx, sy, 2.5, 20);
		}
		ctx.restore();
		if (frame % 4 === 0) game.scene.effects.push(new Burst(game, sp.x + (Math.random() - 0.5) * sp.width, sp.bottom - 4, "#cfe6ff", 3));
	}
	// the valve wheel and the recharge gauge
	var ready = c.cooldown <= 0;
	var turning = c.sprayFrames > 0 ? Math.floor(frame / 4) % 2 : 0;
	PixelArt.rect(ctx, "#1b1b22", x - 15, y - 50, 30, 30);
	PixelArt.rect(ctx, ready ? "#e3201b" : "#7a0c12", x - 12.5, y - 47.5, 25, 25);
	PixelArt.rect(ctx, "#1b1b22", x - 7.5, y - 42.5, 15, 15);
	PixelArt.rect(ctx, ready ? "#e3201b" : "#7a0c12", turning ? x - 12.5 : x - 2.5, turning ? y - 37.5 : y - 47.5, turning ? 25 : 5, turning ? 5 : 25);
	PixelArt.rect(ctx, "#1b1b22", x + 17.5, y - 50, 10, 40);
	var fill = ready ? 1 : 1 - c.cooldown / BOSS.SANDMAN.VALVE_COOLDOWN;
	PixelArt.rect(ctx, ready ? "#8ee27a" : "#49b6ff", x + 20, y - 12.5 - 35 * fill, 5, 35 * fill);
	PixelArt.rect(ctx, "#1b1b22", x - 10, y - 12.5, 20, 12.5);
	if (this.controlInReach === c) {
		this.drawBubble(ready ? (game.touchMode ? "OPEN VALVE" : "E  OPEN VALVE") : "RECHARGING", x, y - 70, ready ? (Math.floor(frame / 15) % 2 === 0 ? "#8ee27a" : "#ffd83d") : "#ff8080");
	}
}

// a dockside crane (decoration): two lattice legs on the quay, a boom over the water with a pulley at its end, the
// machinery house on top and blinking warning lights
CampaignLevel.prototype.drawCrane = function(c) {
	var game = this.game;
	var ctx = game.ctx;
	var cam = game.cameraX;
	var orange = "#e07a1f", dark = "#a4520f", k = "#1b1b22";
	var legW = 15, x1 = c.x - cam, x2 = c.x + c.span - cam, top = c.top, base = c.base;
	var by, i;
	for (i = 0; i < 2; i++) {
		var lx = i === 0 ? x1 : x2;
		PixelArt.rect(ctx, k, lx - 2.5, top, legW + 5, base - top);
		PixelArt.rect(ctx, orange, lx, top, legW, base - top);
		PixelArt.rect(ctx, dark, lx + legW - 5, top, 5, base - top);
		PixelArt.rect(ctx, k, lx - 7.5, base - 10, legW + 15, 10);          // bogie on the rail
		PixelArt.rect(ctx, "#5f666d", lx - 5, base - 7.5, legW + 10, 5);
	}
	// portal beams + braces between the legs
	for (by = top + 70; by < base - 60; by += 110) {
		PixelArt.rect(ctx, k, x1 + legW, by - 2.5, x2 - x1 - legW, 12.5);
		PixelArt.rect(ctx, orange, x1 + legW, by, x2 - x1 - legW, 7.5);
		pixelLine(ctx, dark, x1 + legW, by + 10, x2, by + 100);
		pixelLine(ctx, dark, x2, by + 10, x1 + legW, by + 100);
	}
	// boom: a lattice truss (top / bottom chords + zig-zag)
	var bx1 = c.boomFrom - cam, bx2 = c.boomTo - cam, bh = 22.5;
	PixelArt.rect(ctx, k, bx1, top - 2.5, bx2 - bx1, bh + 5);
	PixelArt.rect(ctx, orange, bx1, top, bx2 - bx1, 5);
	PixelArt.rect(ctx, orange, bx1, top + bh - 5, bx2 - bx1, 5);
	PixelArt.rect(ctx, "rgba(10, 14, 30, 0.55)", bx1, top + 5, bx2 - bx1, bh - 10);
	for (var zx = bx1; zx < bx2 - 20; zx += 25) {
		pixelLine(ctx, orange, zx, top + 5, zx + 12.5, top + bh - 7.5);
		pixelLine(ctx, orange, zx + 12.5, top + bh - 7.5, zx + 25, top + 5);
	}
	// machinery house and cab
	PixelArt.rect(ctx, k, x1 - 12.5, top - 42.5, c.span + legW + 25, 42.5);
	PixelArt.rect(ctx, "#d7dcf0", x1 - 10, top - 40, c.span + legW + 20, 37.5);
	PixelArt.rect(ctx, "#e3201b", x1 - 10, top - 30, c.span + legW + 20, 5);
	PixelArt.rect(ctx, k, x1 - 30, top + bh, 32.5, 27.5);
	PixelArt.rect(ctx, "rgba(255, 216, 61, 0.75)", x1 - 25, top + bh + 5, 22.5, 12.5);
	// pulley at the boom's end
	PixelArt.rect(ctx, k, bx2 - 17.5, top + bh - 2.5, 17.5, 12.5);
	PixelArt.rect(ctx, "#8d949b", bx2 - 12.5, top + bh, 7.5, 7.5);
	// warning lights
	if (Math.floor(game.frame / 30) % 2 === 0) {
		PixelArt.rect(ctx, "#ff4040", bx2 - 5, top - 7.5, 5, 5);
		PixelArt.rect(ctx, "#ff4040", x1 + c.span / 2, top - 50, 5, 5);
	}
}

// one room background. Styles: default (dark steel panels), "LAB" (clean light walls with a teal band and ceiling
// lights), "SERVER" (dark blue with blinking rack lights), "VAULT" (steel with hazard stripes)
CampaignLevel.prototype.drawRoom = function(room) {
	var game = this.game;
	var ctx = game.ctx;
	var rx = room.x - game.cameraX;
	var px, py, lx;
	if (room.style === "LAB") {
		PixelArt.rect(ctx, "#c3cfd6", rx, room.y, room.width, room.height);
		for (py = room.y + 60; py < room.y + room.height; py += 120) PixelArt.rect(ctx, "#b0bec6", rx, py, room.width, 2.5);
		for (px = 0; px < room.width; px += 120) PixelArt.rect(ctx, "#b0bec6", rx + px, room.y, 2.5, room.height);
		// teal band + skirting along the bottom
		PixelArt.rect(ctx, "#2b9aa0", rx, room.y + room.height - 95, room.width, 10);
		PixelArt.rect(ctx, "#8a9aa4", rx, room.y + room.height - 25, room.width, 25);
		// ceiling lights with a soft glow
		for (lx = 50; lx < room.width - 40; lx += 200) {
			PixelArt.rect(ctx, "rgba(255, 255, 255, 0.35)", rx + lx - 10, room.y + 12.5, 60, 30);
			PixelArt.rect(ctx, "#f4f4f4", rx + lx, room.y + 5, 40, 5);
		}
	} else if (room.style === "OFFICE") {
		// tower floor: dark walls with a row of tall windows (real openings: the night backdrop shows through)
		var wallC = "#2b3040", trimC = "#3c4356";
		var winTop = room.y + 30, winH = room.height - 75, pitch = 170, winW = 110;
		PixelArt.rect(ctx, wallC, rx, room.y, room.width, 30);
		PixelArt.rect(ctx, wallC, rx, winTop + winH, room.width, room.y + room.height - winTop - winH);
		var wx = 0;
		for (px = 30; px + winW <= room.width - 20; px += pitch) {
			PixelArt.rect(ctx, wallC, rx + wx, winTop, px - wx, winH);
			// glass tint, frame and a mullion cross
			PixelArt.rect(ctx, "rgba(140, 170, 255, 0.08)", rx + px, winTop, winW, winH);
			PixelArt.rect(ctx, trimC, rx + px - 2.5, winTop - 2.5, winW + 5, 5);
			PixelArt.rect(ctx, trimC, rx + px - 2.5, winTop + winH - 2.5, winW + 5, 5);
			PixelArt.rect(ctx, trimC, rx + px + winW / 2 - 1.25, winTop, 2.5, winH);
			PixelArt.rect(ctx, trimC, rx + px, winTop + winH * 0.45, winW, 2.5);
			wx = px + winW;
		}
		PixelArt.rect(ctx, wallC, rx + wx, winTop, room.width - wx, winH);
		// ceiling light strip + skirting
		for (lx = 60; lx < room.width - 60; lx += 240) PixelArt.rect(ctx, "#e8e0ff", rx + lx, room.y + 5, 50, 5);
		PixelArt.rect(ctx, "#1f2330", rx, room.y + room.height - 15, room.width, 15);
	} else if (room.style === "ATRIUM") {
		// a glass facade: the night backdrop shows through, steel mullions and a faint cyan tint
		PixelArt.rect(ctx, "rgba(120, 200, 230, 0.06)", rx, room.y, room.width, room.height);
		for (px = 0; px <= room.width; px += 150) PixelArt.rect(ctx, "rgba(170, 190, 205, 0.45)", rx + px, room.y, 5, room.height);
		for (py = room.y; py < room.y + room.height; py += 160) PixelArt.rect(ctx, "rgba(170, 190, 205, 0.35)", rx, py, room.width, 2.5);
	} else if (room.style === "SERVER") {
		PixelArt.rect(ctx, "#0f1a2b", rx, room.y, room.width, room.height);
		for (px = 0; px < room.width; px += 60) PixelArt.rect(ctx, "#0a1220", rx + px, room.y, 5, room.height);
		var f = Math.floor(game.frame / 10);
		for (px = 20; px < room.width - 10; px += 60) {
			for (py = room.y + 20; py < room.y + room.height - 20; py += 15) {
				var on = ((px * 7 + py * 13 + f * ((px / 60) % 3 + 1)) % 5) < 2;
				PixelArt.rect(ctx, on ? ((px + py) % 3 === 0 ? "#3fd0ff" : "#3fa534") : "#1b2a40", rx + px, py, 5, 2.5);
			}
		}
	} else if (room.style === "PUMPROOM") {
		// the sewer's pump / maintenance room: old green and white tiles, a caged lamp
		PixelArt.rect(ctx, "#9fb5a4", rx, room.y, room.width, room.height);
		for (py = room.y; py < room.y + room.height; py += 20) PixelArt.rect(ctx, "#7f9684", rx, py, room.width, 2.5);
		for (px = 0; px < room.width; px += 20) PixelArt.rect(ctx, "#7f9684", rx + px, room.y, 2.5, room.height);
		PixelArt.rect(ctx, "#3f6a4e", rx, room.y + room.height * 0.55, room.width, 15);
		PixelArt.rect(ctx, "rgba(20, 30, 20, 0.35)", rx, room.y + room.height * 0.55 + 15, room.width, room.height * 0.45 - 15);
		for (lx = 80; lx < room.width - 40; lx += 240) {
			PixelArt.rect(ctx, "rgba(255, 230, 150, 0.18)", rx + lx - 40, room.y + 10, 90, room.height - 10);
			PixelArt.rect(ctx, "#1b1b22", rx + lx, room.y, 10, 12.5);
			PixelArt.rect(ctx, "#ffd83d", rx + lx + 2.5, room.y + 5, 5, 5);
		}
	} else if (room.style === "HOLD") {
		// a ship's cargo hold: rusty plates, ribs, a couple of caged lamps with a warm glow
		PixelArt.rect(ctx, "#241a18", rx, room.y, room.width, room.height);
		for (px = 0; px < room.width; px += 60) {
			PixelArt.rect(ctx, "#33241f", rx + px, room.y, 10, room.height);
			PixelArt.rect(ctx, "#4a3426", rx + px, room.y, 2.5, room.height);
		}
		PixelArt.rect(ctx, "#33241f", rx, room.y + room.height * 0.45, room.width, 7.5);
		for (lx = 90; lx < room.width - 40; lx += 260) {
			PixelArt.rect(ctx, "rgba(255, 200, 110, 0.12)", rx + lx - 35, room.y + 10, 80, room.height - 10);
			PixelArt.rect(ctx, "#1b1b22", rx + lx, room.y, 10, 12.5);
			PixelArt.rect(ctx, "#ffd83d", rx + lx + 2.5, room.y + 5, 5, 5);
		}
	} else if (room.style === "VAULT") {
		PixelArt.rect(ctx, "#2c323d", rx, room.y, room.width, room.height);
		for (py = room.y; py < room.y + room.height; py += 50) PixelArt.rect(ctx, "#232831", rx, py, room.width, 2.5);
		for (px = 0; px < room.width; px += 40) PixelArt.rect(ctx, (px / 40) % 2 === 0 ? "#ffd83d" : "#1b1b22", rx + px, room.y + room.height - 15, 20, 10);
	} else {
		PixelArt.rect(ctx, "#1c1f2b", rx, room.y, room.width, room.height);
		for (py = room.y; py < room.y + room.height; py += 60) PixelArt.rect(ctx, "#161822", rx, py, room.width, 2.5);
		for (px = 0; px < room.width; px += 90) PixelArt.rect(ctx, "#161822", rx + px, room.y, 2.5, room.height);
		for (lx = 60; lx < room.width - 30; lx += 240) PixelArt.draw(ctx, "PANEL_LIGHT", rx + lx, room.y + 12);
	}
}

CampaignLevel.prototype.drawClimbable = function(c) {
	var ctx = this.game.ctx;
	var x = c.x - this.game.cameraX;
	var height = c.bottom - c.top;
	var def = CLIMBABLE_TYPES[c.type] || CLIMBABLE_TYPES.LADDER;

	if (c.type === "LATTICE") {
		// steel lattice: side rails, horizontal rungs every 20 px, diagonal braces between them
		PixelArt.rect(ctx, "rgba(20, 24, 36, 0.35)", x, c.top, c.width, height);
		for (var ly = 10; ly < height; ly += 20) PixelArt.rect(ctx, "#6d7a90", x, c.top + ly, c.width, 2.5);
		for (var lx2 = 0; lx2 < c.width; lx2 += 40) {
			for (var dy2 = 0; dy2 < height - 20; dy2 += 40) {
				PixelArt.rect(ctx, "#4e5668", x + lx2 + 10, c.top + dy2 + 15, 2.5, 5);
				PixelArt.rect(ctx, "#4e5668", x + lx2 + 20, c.top + dy2 + 25, 2.5, 5);
			}
		}
		PixelArt.rect(ctx, "#8d949b", x, c.top, 5, height);
		PixelArt.rect(ctx, "#8d949b", x + c.width - 5, c.top, 5, height);
		PixelArt.rect(ctx, "#b7bec5", x, c.top, c.width, 5);
		return;
	}
	if (c.type === "FENCE") {
		for (var fx = 0; fx < c.width; fx += 20) {
			PixelArt.drawColumn(ctx, "FENCE_TILE", x + fx, c.top + 5, height - 5);
		}
		PixelArt.drawColumn(ctx, "FENCE_POST", x - 2.5, c.top, height);
		PixelArt.drawColumn(ctx, "FENCE_POST", x + c.width - 2.5, c.top, height);
		PixelArt.rect(ctx, "#b7bec5", x - 2.5, c.top, c.width + 5, 5);
	} else {
		PixelArt.drawColumn(ctx, def.tile, x, c.top, height);
		if (c.type === "PIPE") {
			// the pipe bends into the wall at the top
			PixelArt.rect(ctx, "#4e4a52", x, c.top - 5, c.width, 5);
		}
	}
}

// keeping things out from under the top HUD panels (drawing only): the off-screen hook marker (see drawAnchor)
// and stage hints (see CampaignLevel.draw)
var HUD_CLEARANCE = {
	HUD_HEIGHT: 64,   // canvas px covered by the top HUD panels
	RANGE_X: 500,     // only for hooks roughly in front of / above spider-man ...
	RANGE_Y: 420,     // ... and not absurdly high above his hands
	HINT_PUSH: 90,    // stage hints hidden up to this far behind the HUD are moved just below it
};

// small up arrow with a hook under it, drawn at screen x / world y (inside the zoomed world)
CampaignLevel.prototype.drawHookMarker = function(x, y) {
	var ctx = this.game.ctx;
	PixelArt.rect(ctx, "rgba(20, 24, 40, 0.75)", x - 15, y - 2.5, 30, 42.5);
	PixelArt.rect(ctx, "#7fb2ff", x - 2.5, y, 5, 5);
	PixelArt.rect(ctx, "#7fb2ff", x - 7.5, y + 5, 15, 5);
	PixelArt.rect(ctx, "#7fb2ff", x - 2.5, y + 10, 5, 7.5);
	PixelArt.draw(ctx, "ANCHOR", x - 12.5, y + 17.5);
}

CampaignLevel.prototype.drawAnchor = function(a, frame) {
	var game = this.game;
	var ctx = game.ctx;
	var spiderman = game.spiderman;
	var x = a.x - game.cameraX;
	if (x < -60 || x > game.viewWidth + 60) return;

	// drawing only: a hook just above the screen (or behind the top HUD panels) gets a blinking marker
	// right under the HUD so the player knows a swing point is up there
	var hudBottom = game.cameraY + HUD_CLEARANCE.HUD_HEIGHT / game.zoom;
	if (a.y < hudBottom && x > 0 && x < game.viewWidth && Math.abs(a.x - spiderman.x) <= HUD_CLEARANCE.RANGE_X &&
		spiderman.handY() - a.y <= HUD_CLEARANCE.RANGE_Y && Math.floor(frame / 15) % 2 === 0) {
		this.drawHookMarker(x, hudBottom + 6);
	}

	PixelArt.draw(ctx, "ANCHOR", x - 12.5, a.y - 13.75);

	if (a.flash > 0) {
		a.flash--;
		PixelArt.rect(ctx, "rgba(244, 244, 244, 0.8)", x - 10, a.y - 10, 20, 20);
		return;
	}

	// web glow: soft when nearby, bright (and pulsing) when a web can be shot right now
	var dx = Math.abs(a.x - spiderman.handX());
	var dy = spiderman.handY() - a.y;
	if (dx > SWING.RANGE_X + 80 || dy < -40) return;
	var ready = !spiderman.onGround && !spiderman.swinging && !spiderman.climbing && dx <= SWING.RANGE_X && dy >= SWING.MIN_ABOVE && Math.sqrt(dx * dx + dy * dy) <= SWING.MAX_LENGTH;
	var pulse = Math.floor(frame / 8) % 2 === 0;
	var color = ready ? (pulse ? "#f4f4f4" : "#7fb2ff") : "rgba(127, 178, 255, 0.45)";
	// pixel ring around the hook
	PixelArt.rect(ctx, color, x - 7.5, a.y - 10, 15, 2.5);
	PixelArt.rect(ctx, color, x - 7.5, a.y + 7.5, 15, 2.5);
	PixelArt.rect(ctx, color, x - 10, a.y - 7.5, 2.5, 15);
	PixelArt.rect(ctx, color, x + 7.5, a.y - 7.5, 2.5, 15);
}

CampaignLevel.prototype.drawGate = function(gate) {
	var ctx = this.game.ctx;
	var x = gate.x - this.game.cameraX;
	var height = gate.bottom - gate.top;
	var slatHeight = Math.round((height - 15) * (1 - gate.progress));

	// frame: posts + shutter housing
	PixelArt.rect(ctx, "#2a2a33", x - 5, gate.top - 5, gate.width + 10, height + 5);
	PixelArt.rect(ctx, "#4e4a52", x - 2.5, gate.top - 2.5, gate.width + 5, height + 2.5);
	PixelArt.rect(ctx, "#1b1b22", x, gate.top + 15, gate.width, height - 15);
	if (slatHeight > 0) PixelArt.drawColumn(ctx, "GATE_SLAT", x, gate.top + 15, slatHeight);
	PixelArt.rect(ctx, "#5f666d", x - 5, gate.top - 5, gate.width + 10, 20);
	PixelArt.rect(ctx, "#8d949b", x - 2.5, gate.top - 2.5, gate.width + 5, 12.5);
	// lock light
	PixelArt.rect(ctx, gate.state === "CLOSED" ? "#e3201b" : "#3fa534", x + gate.width / 2 - 2.5, gate.top + 2.5, 5, 5);
	// a door wired to several switches: one lamp per switch above it
	if (gate.opens === "SWITCH" && this.switchCount(gate.id) > 1) this.drawPowerLamps(gate.id, x + gate.width / 2, gate.top - 22.5);
}

CampaignLevel.prototype.drawSwitch = function(sw) {
	var ctx = this.game.ctx;
	var name = sw.on ? "SWITCH_ON" : "SWITCH_OFF";
	PixelArt.draw(ctx, name, sw.x - this.game.cameraX - PixelArt.width(name) / 2, sw.y - PixelArt.height(name));
}

// small speech bubble with dark text (screen x / world y of its bottom center, inside the zoomed world)
CampaignLevel.prototype.drawBubble = function(text, x, y, color) {
	var game = this.game;
	var ctx = game.ctx;
	ctx.save();
	ctx.font = "10px SpidermanGamePixelFont, Monospace, Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	var w = Math.round(ctx.measureText(text).width + 14), h = 18;
	var left = Math.round(x - w / 2), top = Math.round(y - h);
	ctx.fillStyle = "#1b1b22";
	game.drawRoundedRect(left - 2, top - 2, w + 4, h + 4, 6);
	ctx.fill();
	ctx.fillStyle = color || "#f4f4f4";
	game.drawRoundedRect(left, top, w, h, 5);
	ctx.fill();
	PixelArt.rect(ctx, "#1b1b22", x - 5, y + 1, 10, 5);   // the tail
	PixelArt.rect(ctx, color || "#f4f4f4", x - 2.5, y - 1, 5, 4.5);
	ctx.fillStyle = "#1b1b22";
	ctx.fillText(text, Math.round(x), Math.round(top + h / 2 + 1));
	ctx.restore();
}

// a trapped worker: sitting with his legs pinned under a fallen steel beam, waving and calling for HELP!. In reach: a
// blinking "[E] RESCUE" prompt ("RESCUE" on touch screens). Freed: the beam lifts off and fades, he stands up and
// waves ("THANKS!" for a moment)
CampaignLevel.prototype.drawRescue = function(r, frame) {
	var game = this.game;
	var ctx = game.ctx;
	var x = r.x - game.cameraX;
	var y = r.y;

	// the broken concrete the beam came down with (left of him) and a bit of rubble on the right
	PixelArt.rect(ctx, "#1b1b22", x - 55, y - 10, 20, 10);
	PixelArt.rect(ctx, "#8d949b", x - 52.5, y - 7.5, 15, 7.5);
	PixelArt.rect(ctx, "#b7bec5", x - 52.5, y - 7.5, 15, 2.5);
	PixelArt.rect(ctx, "#5f666d", x + 20, y - 5, 10, 5);
	PixelArt.rect(ctx, "#4e4a52", x + 27.5, y - 2.5, 7.5, 2.5);

	var lift = r.rescued ? Math.min(1, r.freeFrames / RESCUE.FREE_FRAMES) : 0;
	var standing = r.rescued && r.freeFrames >= 10;
	if (standing) {
		var pose = Math.floor(frame / 12) % 2 === 0 ? "WORKER_WAVE_0" : "WORKER_WAVE_1";
		PixelArt.draw(ctx, pose, x - PixelArt.width(pose) / 2 - 5, y - PixelArt.height(pose));
	} else {
		// sitting with his legs stretched out to the left under the beam; struggles a little now and then
		var wriggle = !r.rescued && Math.floor(frame / 25) % 4 === 0 ? -2.5 : 0;
		PixelArt.draw(ctx, "WORKER_TRAPPED", x - PixelArt.width("WORKER_TRAPPED") / 2, y - PixelArt.height("WORKER_TRAPPED") + wriggle);
	}

	// the steel beam across his legs (from the broken concrete): lifted off and faded out once he is freed
	if (lift < 1) {
		ctx.save();
		ctx.globalAlpha = 1 - lift;
		var by = y - 12.5 - lift * 55, bx = x - 50 - lift * 10;
		PixelArt.rect(ctx, "#1b1b22", bx - 2.5, by - 2.5, 52.5, 12.5);
		PixelArt.rect(ctx, "#9c5043", bx, by, 47.5, 7.5);
		PixelArt.rect(ctx, "#c46a52", bx, by, 47.5, 2.5);
		PixelArt.rect(ctx, "#7a3b30", bx, by + 5, 47.5, 2.5);
		for (var rv = 5; rv < 47.5; rv += 12.5) PixelArt.rect(ctx, "#ffd83d", bx + rv, by + 2.5, 2.5, 2.5);
		ctx.restore();
	}

	var headY = y - 40;
	if (!r.rescued) {
		if (this.rescueInReach === r) {
			// what to press, right above him
			var label = game.touchMode ? "RESCUE" : "E  RESCUE";
			var pulse = Math.floor(frame / 15) % 2 === 0;
			this.drawBubble(label, x, headY - 12 + (pulse ? 0 : -2), pulse ? "#8ee27a" : "#ffd83d");
			if (!game.touchMode) {
				// the E drawn as a little key cap inside the bubble
				ctx.save();
				ctx.font = "10px SpidermanGamePixelFont, Monospace, Helvetica";
				var tw = ctx.measureText(label).width;
				var kx = Math.round(x - tw / 2 - 3), ky = Math.round(headY - 12 + (pulse ? 0 : -2) - 16);
				ctx.strokeStyle = "#1b1b22";
				ctx.lineWidth = 1.5;
				ctx.strokeRect(kx, ky, 13, 14);
				ctx.restore();
			}
		} else if (Math.floor(frame / 40) % 3 !== 0) {
			this.drawBubble("HELP!", x + Math.sin(frame * 0.2) * 1.5, headY - 10);
		}
	} else if (r.thanks > 0 && standing) {
		this.drawBubble("THANKS!", x - 5, y - 62, "#f4f4f4");
	}
}

// the cable a hanging cargo hangs on (pulley -> cargo), with a spreader bar (container) or slings (pallet). Once the
// rope is cut only a short end dangles from the pulley
CampaignLevel.prototype.drawCargoCable = function(d, frame) {
	var game = this.game;
	var ctx = game.ctx;
	var cx = d.x + d.width / 2 - game.cameraX;
	if (cx < -300 || cx > game.viewWidth + 300) return;
	var py = d.drop.pulleyY;
	if (d.drop.state === "HANGING") {
		var hookY = d.style === "PALLET" ? d.y - 40 : d.y - 12.5;
		PixelArt.rect(ctx, "#1b1b22", cx - 2.5, py, 5, hookY - py);
		PixelArt.rect(ctx, "#b7bec5", cx - 1.25, py, 2.5, hookY - py);
		PixelArt.rect(ctx, "#1b1b22", cx - 7.5, hookY - 5, 15, 10);   // hook block
		PixelArt.rect(ctx, "#ffd83d", cx - 5, hookY - 2.5, 10, 5);
		if (d.style === "PALLET") {
			pixelLine(ctx, "#d7dcf0", cx, hookY, d.x - game.cameraX + 5, d.y);
			pixelLine(ctx, "#d7dcf0", cx, hookY, d.x + d.width - game.cameraX - 7.5, d.y);
		} else {
			PixelArt.rect(ctx, "#1b1b22", d.x - game.cameraX + 10, d.y - 12.5, d.width - 20, 10);
			PixelArt.rect(ctx, "#ffd83d", d.x - game.cameraX + 12.5, d.y - 10, d.width - 25, 5);
		}
	} else {
		var sway = Math.round(Math.sin(frame * 0.08) * 2) * PIXEL;
		pixelLine(ctx, "#b7bec5", cx, py, cx + sway, py + 40);
	}
}

// a marked rope: tied off on a bollard, running up to the crane's pulley. The knot blinks with a red / white target
// ring until a web cuts it; then the loose end flops on the bollard
CampaignLevel.prototype.drawKnot = function(k, frame) {
	var game = this.game;
	var ctx = game.ctx;
	var x = k.x - game.cameraX;
	var bw = PixelArt.width("BOLLARD"), bh = PixelArt.height("BOLLARD");
	var cargo = null;
	for (var i = 0; i < this.drops.length; i++) if (this.drops[i].drop.id === k.id) cargo = this.drops[i];
	if (!k.cut && cargo) {
		var px = cargo.x + cargo.width / 2 - game.cameraX, py = cargo.drop.pulleyY + 5;
		pixelLine(ctx, "#1b1b22", x + 2.5, k.y - 2.5, px + 2.5, py);
		pixelLine(ctx, "#c9a36b", x, k.y - 2.5, px, py);
	}
	PixelArt.draw(ctx, "BOLLARD", x - bw / 2, k.surface - bh);
	// rope turns around the bollard's head
	PixelArt.rect(ctx, "#c9a36b", x - 10, k.y + 2.5, 20, 2.5);
	PixelArt.rect(ctx, "#8a5f4b", x - 7.5, k.y + 5, 15, 2.5);
	if (k.cut) {
		if (k.snap > 0 || Math.floor(frame / 40) % 2 === 0) pixelLine(ctx, "#c9a36b", x + 7.5, k.y, x + 20 + (k.snap % 6), k.y + 10);
		return;
	}
	PixelArt.rect(ctx, "#c9a36b", x - 5, k.y - 5, 10, 7.5);             // the knot
	var on = Math.floor(frame / 12) % 2 === 0;
	var ring = on ? "#e3201b" : "#f4f4f4", inner = on ? "#f4f4f4" : "#e3201b";
	PixelArt.rect(ctx, ring, x - 15, k.y - 15, 30, 2.5);
	PixelArt.rect(ctx, ring, x - 15, k.y + 12.5, 30, 2.5);
	PixelArt.rect(ctx, ring, x - 15, k.y - 15, 2.5, 30);
	PixelArt.rect(ctx, ring, x + 12.5, k.y - 15, 2.5, 30);
	PixelArt.rect(ctx, inner, x - 10, k.y - 10, 20, 2.5);
	PixelArt.rect(ctx, inner, x - 10, k.y + 7.5, 20, 2.5);
	PixelArt.rect(ctx, inner, x - 10, k.y - 10, 2.5, 20);
	PixelArt.rect(ctx, inner, x + 7.5, k.y - 10, 2.5, 20);
}

CampaignLevel.prototype.drawCheckpoint = function(cp, frame) {
	var ctx = this.game.ctx;
	var name = cp.active ? "CHECKPOINT_ON" : "CHECKPOINT_OFF";
	var x = cp.x - this.game.cameraX;
	PixelArt.draw(ctx, name, x - PixelArt.width(name) / 2, cp.y - PixelArt.height(name));
	if (cp.active && Math.floor(frame / 20) % 2 === 0) {
		PixelArt.rect(ctx, "rgba(63, 165, 52, 0.35)", x - 12.5, cp.y - 75, 25, 20);
	}
}

// hints, climbables, anchors, objects and the goal flag (inside the zoomed world, before pickups and enemies)
CampaignLevel.prototype.draw = function() {
	var game = this.game;
	var ctx = game.ctx;
	var frame = game.frame;
	var i;

	this.updateObjects();

	var left = game.cameraX - 300;
	var right = game.cameraX + game.viewWidth + 300;

	for (i = 0; i < this.climbables.length; i++) {
		var c = this.climbables[i];
		if (c.x + c.width < left || c.x > right) continue;
		this.drawClimbable(c);
	}
	for (i = 0; i < this.gates.length; i++) {
		if (this.gates[i].x < left || this.gates[i].x > right) continue;
		this.drawGate(this.gates[i]);
	}
	for (i = 0; i < this.switches.length; i++) {
		if (this.switches[i].x < left || this.switches[i].x > right) continue;
		this.drawSwitch(this.switches[i]);
	}
	for (i = 0; i < this.checkpoints.length; i++) {
		if (this.checkpoints[i].x < left || this.checkpoints[i].x > right) continue;
		this.drawCheckpoint(this.checkpoints[i], frame);
	}
	for (i = 0; i < this.doors.length; i++) {
		if (this.doors[i].x < left || this.doors[i].x > right) continue;
		this.drawDoor(this.doors[i], frame);
	}
	for (i = 0; i < this.rescues.length; i++) {
		if (this.rescues[i].x < left || this.rescues[i].x > right) continue;
		this.drawRescue(this.rescues[i], frame);
	}
	for (i = 0; i < this.drops.length; i++) this.drawCargoCable(this.drops[i], frame);
	for (i = 0; i < this.controls.length; i++) {
		if (this.controls[i].x < left || this.controls[i].x > right) continue;
		this.drawControl(this.controls[i], frame);
	}
	for (i = 0; i < this.knots.length; i++) {
		if (this.knots[i].x < left - 400 || this.knots[i].x > right + 400) continue;
		this.drawKnot(this.knots[i], frame);
	}
	for (i = 0; i < this.holograms.length; i++) {
		if (this.holograms[i].x < left || this.holograms[i].x > right) continue;
		this.drawHologram(this.holograms[i], frame);
	}
	for (i = 0; i < this.hazards.length; i++) {
		if (this.hazards[i].x < left || this.hazards[i].x > right) continue;
		this.drawHazard(this.hazards[i], frame);
	}
	for (i = 0; i < this.lasers.length; i++) {
		var lz = this.lasers[i];
		var lx1 = lz.vertical ? lz.x : lz.x1, lx2 = lz.vertical ? lz.x : lz.x2;
		if (lx2 < left || lx1 > right) continue;
		this.drawLaser(lz, frame);
	}
	for (i = 0; i < this.anchors.length; i++) this.drawAnchor(this.anchors[i], frame);

	var movedHints = [];
	for (i = 0; i < this.hints.length; i++) {
		var hint = this.hints[i];
		if (hint.x < left || hint.x > right) continue;
		var hx = hint.x - game.cameraX;
		var hy = hint.y + Math.sin(frame * 0.05 + i) * 2;
		var hintText = game.touchMode ? touchHintText(hint.text) : hint.text;

		ctx.save();
		ctx.font = "11px SpidermanGamePixelFont, Monospace, Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		var textWidth = ctx.measureText(hintText).width + 16;
		// a hint just under the top HUD panels (the vertical camera can put it there) is drawn right below them instead
		// (two of them there are stacked instead of drawn over each other)
		var hudBottom = game.cameraY + HUD_CLEARANCE.HUD_HEIGHT / game.zoom;
		if (hy - 10 < hudBottom + 4 && hy > hudBottom - HUD_CLEARANCE.HINT_PUSH) {
			hy = hudBottom + 14;
			for (var m = 0; m < movedHints.length; m++) {
				var o = movedHints[m];
				if (Math.abs(o.x - hx) < (o.width + textWidth) / 2 + 4 && Math.abs(o.y - hy) < 22) { hy = o.y + 22; m = -1; }
			}
			movedHints.push({ x: hx, y: hy, width: textWidth });
		}
		ctx.fillStyle = "rgba(4, 6, 18, 0.6)";
		game.drawRoundedRect(Math.round(hx - textWidth / 2), Math.round(hy - 10), Math.round(textWidth), 20, 4);
		ctx.fill();
		ctx.fillStyle = "#ffd83d";
		ctx.fillText(hintText, Math.round(hx), Math.round(hy));
		ctx.restore();
	}

	if (this.goal) this.goal.draw(frame);
}

// stage hints name keyboard keys; on a touch device they name the on-screen buttons instead
var TOUCH_HINT_WORDS = [
	[/ARROWS = MOVE/g, "ARROW BUTTONS = MOVE"],
	[/SPACE = JUMP/g, "JUMP BUTTON = JUMP"],
	[/X = SHOOT WEB/g, "WEB BUTTON = SHOOT WEB"],
	[/THEN SPACE NEAR THE HOOK/g, "THEN JUMP AGAIN NEAR THE HOOK"],
	[/SPACE IN THE AIR NEAR THE HOOK/g, "JUMP IN THE AIR NEAR THE HOOK"],
	[/\(DOWN\)/g, "(SLIDE BUTTON)"],
	[/\(UP\)/g, "(UP BUTTON)"],
	[/PRESS E/g, "TAP RESCUE"],
	[/\(E\)/g, "(USE BUTTON)"],
	[/\(X\)/g, "(WEB BUTTON)"],
];
function touchHintText(text) {
	for (var i = 0; i < TOUCH_HINT_WORDS.length; i++) text = text.replace(TOUCH_HINT_WORDS[i][0], TOUCH_HINT_WORDS[i][1]);
	return text;
}

/* ---------- level builder: readable helpers that produce a stage design ---------- */

// var L = new SpidermanGame.LevelBuilder({ floorY: 540 }); L.street(0, 800); L.building(900, 300, 160); ... L.build()
// Every helper takes world pixels; "y" arguments are the surface something stands on
function LevelBuilder(opts) {
	opts = opts || {};
	this.floorY = opts.floorY !== undefined ? opts.floorY : 540;
	this.design = {
		theme: opts.theme || "CITY",
		floorY: this.floorY,
		spawn: { x: 60, y: this.floorY },
		platforms: [], climbables: [], anchors: [], enemies: [], props: [], coins: [], arcs: [],
		pickups: [], hints: [], checkpoints: [], objects: [], goal: null,
	};
}

LevelBuilder.prototype.spawn = function(x, y) { this.design.spawn = { x: x, y: y !== undefined ? y : this.floorY }; return this; }
// street segment; top defaults to the floor (a lower top makes a sunken yard / alley)
LevelBuilder.prototype.street = function(x, width, top) {
	if (top === undefined) top = this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 140, style: "STREET" });
	return top;
}
// a building standing on the street (or on opts.bottom); returns the roof top y. A building on the street
// reaches 12 px into the sidewalk so its walls block walking into it
LevelBuilder.prototype.building = function(x, width, height, opts) {
	opts = opts || {};
	var bottom = opts.bottom !== undefined ? opts.bottom : this.floorY;
	var top = opts.top !== undefined ? opts.top : bottom - height;
	var onStreet = bottom === this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: onStreet ? bottom + 12 : bottom, style: "BUILDING", storefront: opts.storefront !== undefined ? opts.storefront : onStreet });
	return top;
}
// a floating block (e.g. the ceiling of an underpass)
LevelBuilder.prototype.block = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "BLOCK" });
	return top;
}
// thin one-way ledge (balcony / fire escape landing)
LevelBuilder.prototype.ledge = function(x, width, top) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 12, style: "LEDGE", oneWay: true });
	return top;
}
LevelBuilder.prototype.ladder = function(x, top, bottom) { this.design.climbables.push({ type: "LADDER", x: x, top: top, bottom: bottom }); return this; }
LevelBuilder.prototype.pipe = function(x, top, bottom) { this.design.climbables.push({ type: "PIPE", x: x, top: top, bottom: bottom }); return this; }
LevelBuilder.prototype.fence = function(x, top, bottom, width) { this.design.climbables.push({ type: "FENCE", x: x, top: top, bottom: bottom, width: width || 20 }); return this; }
LevelBuilder.prototype.anchor = function(x, y) { this.design.anchors.push({ x: x, y: y }); return this; }
LevelBuilder.prototype.enemy = function(type, x, y, opts) { this.design.enemies.push({ type: type, x: x, y: y, opts: opts }); return this; }
LevelBuilder.prototype.thug = function(x, y) { return this.enemy("THUG", x, y); }
LevelBuilder.prototype.venom = function(x, y) { return this.enemy("VENOM", x, y); }
// range (optional): how far the goblin may glide to either side of x (default: most of his platform)
LevelBuilder.prototype.goblin = function(x, y, range) { return this.enemy("GOBLIN", x, y, range ? { range: range } : undefined); }
LevelBuilder.prototype.prop = function(type, x, y) { this.design.props.push({ type: type, x: x, y: y }); return this; }
// a row of coins; y = surface they float over (30 px above it)
LevelBuilder.prototype.coins = function(x, y, count, above, spacing) {
	this.design.coins.push({ x: x, y: y - (above !== undefined ? above : 30), count: count || 1, spacing: spacing });
	return this;
}
LevelBuilder.prototype.arc = function(x1, x2, y, height, count) { this.design.arcs.push({ x1: x1, x2: x2, y: y, height: height, count: count }); return this; }
LevelBuilder.prototype.health = function(x, y) { this.design.pickups.push({ type: "HEALTH", x: x, y: y - 32 }); return this; }
LevelBuilder.prototype.web = function(x, y) { this.design.pickups.push({ type: "WEB", x: x, y: y - 32 }); return this; }
LevelBuilder.prototype.hint = function(x, y, text) { this.design.hints.push({ x: x, y: y, text: text }); return this; }
LevelBuilder.prototype.checkpoint = function(x, y) { this.design.checkpoints.push({ x: x, y: y }); return this; }
LevelBuilder.prototype.key = function(x, y, id) { this.design.objects.push({ type: "KEY", x: x, y: y - 30, id: id || "KEY" }); return this; }
LevelBuilder.prototype.gate = function(x, top, bottom, id, opens) { this.design.objects.push({ type: "GATE", x: x, top: top, bottom: bottom, id: id, opens: opens || "KEY" }); return this; }
LevelBuilder.prototype.lever = function(x, y, gateId) { this.design.objects.push({ type: "SWITCH", x: x, y: y, gate: gateId }); return this; }
LevelBuilder.prototype.goal = function(x, y) { this.design.goal = { x: x, y: y }; return this; }
// ---- construction site helpers ----
LevelBuilder.prototype.dirt = function(x, width, top) {
	if (top === undefined) top = this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 140, style: "DIRT" });
	return top;
}
LevelBuilder.prototype.scaffold = function(x, width, top, frameTo) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 12, style: "SCAFFOLD", oneWay: true, frameTo: frameTo });
	return top;
}
LevelBuilder.prototype.slab = function(x, width, top, frameTo) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 15, style: "SLAB", oneWay: true, frameTo: frameTo });
	return top;
}
LevelBuilder.prototype.beam = function(x, width, top) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 12, style: "BEAM", oneWay: true });
	return top;
}
LevelBuilder.prototype.concrete = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom !== undefined ? bottom : this.floorY + 12, style: "CONCRETE" });
	return top;
}
// vertical lift between two heights (one-way floor); powerId: only moves once powered
LevelBuilder.prototype.lift = function(x, width, from, to, speed, powerId, tag) {
	this.design.platforms.push({ x: x, width: width, top: from, bottom: from + 15, style: "LIFT", oneWay: true, tag: tag, powerId: powerId, motion: { axis: "y", from: from, to: to, speed: speed || 1.5, wait: 60 } });
	return this;
}
// crane girder moving sideways at height y
LevelBuilder.prototype.girder = function(width, y, from, to, speed, tag) {
	this.design.platforms.push({ x: from, width: width, top: y, bottom: y + 15, style: "GIRDER", oneWay: true, tag: tag, motion: { axis: "x", from: from, to: to, speed: speed || 1.5, wait: 40 } });
	return this;
}
LevelBuilder.prototype.pole = function(x, top, bottom) { this.design.climbables.push({ type: "POLE", x: x, top: top, bottom: bottom }); return this; }
LevelBuilder.prototype.rope = function(x, top, bottom) { this.design.climbables.push({ type: "ROPE", x: x, top: top, bottom: bottom }); return this; }
// hazard standing on a surface: "SPARK" (electrical box, 25 px) or "REBAR" (spikes, width)
LevelBuilder.prototype.hazard = function(kind, x, y, width) { this.design.objects.push({ type: "HAZARD", kind: kind, x: x, y: y, width: width }); return this; }

// ---- mysterio's hideout helpers ----
LevelBuilder.prototype.container = function(x, width, top, color, opts) {
	opts = opts || {};
	this.design.platforms.push({ x: x, width: width, top: top, bottom: opts.bottom !== undefined ? opts.bottom : this.floorY + 12, style: "CONTAINER", color: color, phantom: !!opts.phantom });
	return top;
}
LevelBuilder.prototype.floor = function(x, width, top) {
	if (top === undefined) top = this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 140, style: "FLOOR" });
	return top;
}
LevelBuilder.prototype.panel = function(x, width, top, bottom, opts) {
	opts = opts || {};
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "PANEL", color: opts.color, phantom: !!opts.phantom });
	return top;
}
// thin indoor catwalk / plank that may be fake (phantom) or give way (crumble)
LevelBuilder.prototype.catwalk = function(x, width, top, opts) {
	opts = opts || {};
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 12, style: "BEAM", oneWay: true, phantom: !!opts.phantom, crumble: !!opts.crumble });
	return top;
}
// style (optional): "LAB", "SERVER" or "VAULT" (see CampaignLevel.drawRoom); default dark steel panels
LevelBuilder.prototype.room = function(x, y, width, height, style) { this.design.rooms = this.design.rooms || []; this.design.rooms.push({ x: x, y: y, width: width, height: height, style: style }); return this; }
LevelBuilder.prototype.door = function(id, x, y, to, opts) { opts = opts || {}; this.design.objects.push({ type: "DOOR", id: id, x: x, y: y, to: to, fake: !!opts.fake, label: opts.label }); return this; }
LevelBuilder.prototype.hologram = function(x, y, text, scale) { this.design.objects.push({ type: "HOLOGRAM", x: x, y: y, text: text, scale: scale }); return this; }
LevelBuilder.prototype.drone = function(axis, from, to, fixed, speed) {
	var o = { type: "HAZARD", kind: "DRONE", motion: { axis: axis, from: from, to: to, speed: speed || 1.5 } };
	if (axis === "x") { o.x = from; o.y = fixed; } else { o.x = fixed; o.y = from; }
	this.design.objects.push(o);
	return this;
}
// a key item with its own look (sprite from PIXEL_SPRITES) and name
LevelBuilder.prototype.item = function(id, x, y, sprite, label) { this.design.objects.push({ type: "KEY", x: x, y: y - 30, id: id, sprite: sprite, label: label }); return this; }
// a gate that needs several key items
LevelBuilder.prototype.itemGate = function(x, top, bottom, id, keyIds) { this.design.objects.push({ type: "GATE", x: x, top: top, bottom: bottom, id: id, opens: "KEY", keyIds: keyIds }); return this; }

// ---- industrial district helpers ----
// conveyor belt (solid, 20 px thick) whose top is at y; speed in px per frame (+ right, - left). opts:
// { powerId, poweredSpeed } a switch changes the belt speed / direction once every switch with that id is on;
// { frameTo } legs down to this y (default: the floor; a belt laid into the floor has top = floorY and no legs)
LevelBuilder.prototype.conveyor = function(x, width, top, speed, opts) {
	opts = opts || {};
	this.design.platforms.push({
		x: x, width: width, top: top, bottom: opts.bottom !== undefined ? opts.bottom : top + 20, style: "CONVEYOR",
		frameTo: opts.frameTo !== undefined ? opts.frameTo : this.floorY, powerId: opts.powerId,
		conveyor: { speed: speed, poweredSpeed: opts.poweredSpeed },
	});
	return top;
}
// big pipe to walk on (one-way, can be jumped up through), with brackets down to frameTo (optional)
LevelBuilder.prototype.pipeline = function(x, width, top, frameTo, color) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 25, style: "PIPELINE", oneWay: true, frameTo: frameTo, color: color });
	return top;
}
// factory hall / shed (solid) whose roof is at top, standing on the floor (or opts.bottom); opts.color
LevelBuilder.prototype.factory = function(x, width, top, opts) {
	opts = opts || {};
	this.design.platforms.push({ x: x, width: width, top: top, bottom: opts.bottom !== undefined ? opts.bottom : this.floorY + 12, style: "FACTORY", color: opts.color });
	return top;
}
// timed steam vent standing on the surface y (x = left edge, 30 px wide); offset shifts its cycle (frames)
LevelBuilder.prototype.steam = function(x, y, offset, period, height) {
	this.design.objects.push({ type: "HAZARD", kind: "STEAM", x: x, y: y, offset: offset || 0, period: period, height: height });
	return this;
}

// ---- tower helpers ----
// wide climbable steel lattice on a facade (crawl up and sideways)
LevelBuilder.prototype.lattice = function(x, top, bottom, width) { this.design.climbables.push({ type: "LATTICE", x: x, top: top, bottom: bottom, width: width || 120 }); return this; }
// window washer gondola moving between two heights (a lift with its own look); powerId like lift()
LevelBuilder.prototype.gondola = function(x, width, from, to, speed, powerId, tag) {
	this.design.platforms.push({ x: x, width: width, top: from, bottom: from + 15, style: "GONDOLA", oneWay: true, tag: tag, powerId: powerId, motion: { axis: "y", from: from, to: to, speed: speed || 1.5, wait: 70 } });
	return this;
}

// glass elevator between two heights (a lift with its own look); powerId like lift()
LevelBuilder.prototype.elevator = function(x, width, from, to, speed, powerId, tag) {
	this.design.platforms.push({ x: x, width: width, top: from, bottom: from + 15, style: "ELEVATOR", oneWay: true, tag: tag, powerId: powerId, motion: { axis: "y", from: from, to: to, speed: speed || 1.5, wait: 80 } });
	return this;
}

// ---- research lab helpers ----
// lab floor (solid): white tiles on a structural body down to bottom (default top + 140)
LevelBuilder.prototype.labfloor = function(x, width, top, bottom) {
	if (top === undefined) top = this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom !== undefined ? bottom : top + 140, style: "LABFLOOR" });
	return top;
}
// glass walkway (one-way, can be jumped up through)
LevelBuilder.prototype.glass = function(x, width, top) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 12, style: "GLASS", oneWay: true });
	return top;
}
// anti-grav hover platform moving between from and to (axis "x": sideways at height y; "y": up and down at x = y)
LevelBuilder.prototype.hover = function(width, y, from, to, speed, tag, axis) {
	if (axis === "y") this.design.platforms.push({ x: y, width: width, top: from, bottom: from + 15, style: "HOVER", oneWay: true, tag: tag, motion: { axis: "y", from: from, to: to, speed: speed || 1.5, wait: 50 } });
	else this.design.platforms.push({ x: from, width: width, top: y, bottom: y + 15, style: "HOVER", oneWay: true, tag: tag, motion: { axis: "x", from: from, to: to, speed: speed || 1.5, wait: 40 } });
	return this;
}
// security laser from y1 (ceiling emitter) down to y2 (floor emitter) at x. opts: { period, on, warn, offset } for a
// timed laser (defaults in LASER), { period: 0 } for an always-on beam, { powerId } for a grid that is on until every
// switch wired to that id is on
LevelBuilder.prototype.laser = function(x, y1, y2, opts) {
	opts = opts || {};
	this.design.objects.push({ type: "LASER", vertical: true, x: x, y1: y1, y2: y2, period: opts.period, on: opts.on, warn: opts.warn, offset: opts.offset, powerId: opts.powerId });
	return this;
}
// horizontal security laser from x1 to x2 at height y (same opts as laser; { post: floorY } stands its emitters on
// posts down to that floor)
LevelBuilder.prototype.hlaser = function(x1, x2, y, opts) {
	opts = opts || {};
	this.design.objects.push({ type: "LASER", vertical: false, x1: x1, x2: x2, y: y, period: opts.period, on: opts.on, warn: opts.warn, offset: opts.offset, powerId: opts.powerId, post: opts.post });
	return this;
}

// the stage boss: Mysterio hovering between the given spots ({ x, y } centers)
LevelBuilder.prototype.boss = function(x, y, spots, health) { this.design.boss = { type: "MYSTERIO", x: x, y: y, spots: spots, health: health }; return this; }
// the green goblin: enters toward (x, y), glides between spots ({ x, y } centers at heights spiderman's webs can
// reach) and throws from the high spots (out of reach)
LevelBuilder.prototype.goblinBoss = function(x, y, spots, high, health) { this.design.boss = { type: "GOBLIN", x: x, y: y, spots: spots, high: high, health: health }; return this; }

// ---- world 3 helpers ----
// a trapped worker standing on the surface y (default: the street). Freed with E / the RESCUE button; the stage's
// exit only opens once every worker is rescued. id: optional, unique in the stage (default W1, W2, ...)
LevelBuilder.prototype.rescue = function(x, y, id) { this.design.objects.push({ type: "RESCUE", x: x, y: y !== undefined ? y : this.floorY, id: id }); return this; }

// harbour: the water surface (gaps show water; falling in ends the run with "YOU FELL INTO THE HARBOUR")
LevelBuilder.prototype.water = function(y) { this.design.water = { y: y }; return this; }
// concrete quay (solid), a wooden pier on pilings (solid 20 px deck), a ship's hull / thin deck / superstructure
LevelBuilder.prototype.quay = function(x, width, top) {
	if (top === undefined) top = this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 160, style: "QUAY" });
	return top;
}
LevelBuilder.prototype.pier = function(x, width, top) {
	if (top === undefined) top = this.floorY;
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 20, style: "PIER" });
	return top;
}
LevelBuilder.prototype.hull = function(x, width, top, bottom, opts) {
	opts = opts || {};
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "HULL", color: opts.color, label: opts.name });
	return top;
}
LevelBuilder.prototype.deck = function(x, width, top) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 20, style: "DECK" });
	return top;
}
LevelBuilder.prototype.cabin = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "CABIN" });
	return top;
}
// a dockside crane (decoration): legs at x and x + span standing on base (default the floor), the boom at top from
// boomFrom to boomTo (its pulley is at boomTo)
LevelBuilder.prototype.crane = function(x, top, boomFrom, boomTo, opts) {
	opts = opts || {};
	this.design.objects.push({ type: "CRANE", x: x, top: top, base: opts.base !== undefined ? opts.base : this.floorY, span: opts.span, boomFrom: boomFrom, boomTo: boomTo });
	return this;
}
// cargo hanging from a crane's pulley (pulleyY) at hangTop: not solid until its marked rope ("id", see ropeKnot) is
// cut with a web, then it drops to restTop and is a normal platform. kind: "CONTAINER" (color) or "PALLET" (crates)
LevelBuilder.prototype.hangingCargo = function(id, x, width, hangTop, restTop, opts) {
	opts = opts || {};
	this.design.platforms.push({ x: x, width: width, top: hangTop, bottom: hangTop + (opts.height || 100),
		style: opts.kind === "PALLET" ? "PALLET" : "CONTAINER", color: opts.color, drop: { id: id, to: restTop, pulleyY: opts.pulleyY !== undefined ? opts.pulleyY : hangTop - 150 } });
	return restTop;
}
// the marked rope holding cargo "id", tied off on a bollard standing on the surface y at x. Its knot (30 px above
// the surface: the height a web flies at when shot standing on that surface) is cut by a web
LevelBuilder.prototype.ropeKnot = function(id, x, y) { this.design.objects.push({ type: "KNOT", id: id, x: x, y: y !== undefined ? y : this.floorY }); return this; }

// ---- sewer helpers ----
// brick masonry (solid: floors, walls, ceilings) and a one-way metal grate walkway
LevelBuilder.prototype.brick = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "BRICK" });
	return top;
}
LevelBuilder.prototype.grate = function(x, width, top) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: top + 12, style: "GRATE", oneWay: true });
	return top;
}
// a body of water from x to x + width over the floor at "bottom". Its level is "high" or "low" (start: "HIGH" |
// "LOW", default HIGH); a pump / valve wired to its id switches it (high = low for still water). speed: px per frame the
// level moves (default POOLS.SPEED)
LevelBuilder.prototype.pool = function(id, x, width, bottom, high, low, start, speed) {
	this.design.objects.push({ type: "POOL", id: id, x: x, width: width, bottom: bottom, high: high, low: low !== undefined ? low : high, start: start, speed: speed });
	return this;
}
// a pump cabinet / a wheel valve standing on the surface y at x: E switches every pool in "pools" between HIGH and LOW
// requires (optional): a power id (levers / pool watchers) the control needs before it works ("NO POWER" until then)
LevelBuilder.prototype.pump = function(id, x, y, pools, label, requires) { this.design.objects.push({ type: "CONTROL", kind: "PUMP", id: id, x: x, y: y, pools: pools, label: label, requires: requires }); return this; }
LevelBuilder.prototype.valve = function(id, x, y, pools, label, requires) { this.design.objects.push({ type: "CONTROL", kind: "VALVE", id: id, x: x, y: y, pools: pools, label: label, requires: requires }); return this; }
// power "power" once pool "pool" has settled at "state" ("LOW" / "HIGH"): a gate with that id opens, a lift runs
LevelBuilder.prototype.poolPower = function(pool, state, power, label) { this.design.objects.push({ type: "POOLPOWER", pool: pool, state: state, power: power, label: label }); return this; }
// the sandman arena: a sand covered floor, a hydrant valve standing on the surface y whose pipe pours water over
// spray { x, top, bottom, width }, and the boss himself (x = his center, y = the floor he walks on)
LevelBuilder.prototype.sand = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "SAND" });
	return top;
}
LevelBuilder.prototype.hydrant = function(id, x, y, spray, label) { this.design.objects.push({ type: "CONTROL", kind: "HYDRANT", id: id, x: x, y: y, spray: spray, label: label || "VALVE" }); return this; }
LevelBuilder.prototype.sandmanBoss = function(x, y, health) { this.design.boss = { type: "SANDMAN", x: x, y: y, health: health }; return this; }
// pump station concrete (solid) and pump machinery (solid)
LevelBuilder.prototype.station = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "STATION" });
	return top;
}
LevelBuilder.prototype.machine = function(x, width, top, bottom) {
	this.design.platforms.push({ x: x, width: width, top: top, bottom: bottom, style: "MACHINE" });
	return top;
}
// a raft floating on pool "poolId" (one-way, carries whoever stands on it; rests on the pool floor when drained)
LevelBuilder.prototype.raft = function(x, width, poolId) {
	this.design.platforms.push({ x: x, width: width, top: 0, bottom: 20, style: "RAFT", oneWay: true, motion: { axis: "float", pool: poolId, offset: POOLS.RAFT_OFFSET } });
	return this;
}

LevelBuilder.prototype.set = function(key, value) { this.design[key] = value; return this; }
LevelBuilder.prototype.build = function() { return this.design; }

/* ---------- the goal flag at the end of a stage ---------- */

function LevelGoal(game, x, roof) {
	this.game = game;
	this.ctx = game.ctx;
	this.x = x;            // world x of the pole
	this.y = roof.y;       // roof top
	this.height = 90;
	this.width = CAMPAIGN.GOAL_WIDTH;
}

LevelGoal.prototype.touchesSpiderman = function() {
	var hitbox = this.game.spiderman.getHitbox();
	var left = this.x - this.width / 2;
	var right = this.x + this.width / 2;
	var top = this.y - this.height;
	return hitbox.right > left && hitbox.left < right && hitbox.bottom > top && hitbox.top < this.y;
}

LevelGoal.prototype.draw = function(frame) {
	var ctx = this.ctx;
	var x = Math.round(this.x - this.game.cameraX);
	var y = Math.round(this.y);
	if (x < -100 || x > this.game.viewWidth + 100) return;

	// stages with trapped workers: the exit stays shut (red glow, red flag, "RESCUE n/N") until everyone is safe
	var level = this.game.level;
	var locked = !!(level && level.goal === this && !level.exitOpen());

	ctx.save();

	// glow on the roof
	var pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
	ctx.fillStyle = locked ? "rgba(227, 32, 27, " + (0.15 + pulse * 0.15) + ")" : "rgba(255, 216, 61, " + (0.15 + pulse * 0.15) + ")";
	ctx.beginPath();
	ctx.ellipse(x, y - 2, 34 + pulse * 4, 7, 0, 0, Math.PI * 2);
	ctx.fill();

	// base + pole
	ctx.fillStyle = "#4e4a52";
	ctx.fillRect(x - 8, y - 6, 16, 6);
	ctx.fillStyle = "#d7dcf0";
	ctx.fillRect(x - 2, y - this.height, 4, this.height - 6);
	ctx.fillStyle = "#ffd83d";
	ctx.beginPath();
	ctx.arc(x, y - this.height, 4, 0, Math.PI * 2);
	ctx.fill();

	// waving checkered flag
	var flagW = 34, flagH = 22, cell = flagH / 2;
	var top = y - this.height + 4;
	for (var col = 0; col < 4; col++) {
		var wave = Math.sin(frame * 0.15 + col * 0.9) * 2;
		for (var rowI = 0; rowI < 2; rowI++) {
			ctx.fillStyle = (col + rowI) % 2 === 0 ? (locked ? "#e3201b" : "#f4f4f4") : "#1b1b22";
			ctx.fillRect(Math.round(x + 2 + col * (flagW / 4)), Math.round(top + rowI * cell + wave), Math.ceil(flagW / 4), Math.ceil(cell));
		}
	}

	// "GOAL" label bobbing above the flag
	ctx.font = "11px SpidermanGamePixelFont, Monospace, Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillStyle = locked ? "#ff8080" : "#ffd83d";
	ctx.fillText(locked ? "RESCUE " + level.rescuedCount() + "/" + level.rescues.length : "GOAL", x, y - this.height - 10 + Math.sin(frame * 0.06) * 3);

	ctx.restore();
}

window.SpidermanGame = SpidermanGame;
SpidermanGame.__pixelArt = PixelArt;         // exposed for tooling / tests
SpidermanGame.__pixelSprites = PIXEL_SPRITES;
SpidermanGame.__audio = AUDIO_RESOURCES;     // (tooling / tests: the music tracks)
SpidermanGame.__audioLoop = AUDIO_LOOP;
SpidermanGame.__touchHintText = touchHintText;
SpidermanGame.__boss = BOSS;
SpidermanGame.__rescue = RESCUE;
SpidermanGame.__harbor = HARBOR;
SpidermanGame.__pools = POOLS;               // (tooling / tests: sewer water tuning)             // (tooling / tests: marked ropes / cargo tuning)             // (tooling / tests: trapped worker tuning)
window.CampaignLevel = CampaignLevel;
window.Mysterio      = Mysterio;
window.MysterioCopy  = MysterioCopy;
window.GoblinBoss    = GoblinBoss;
window.Sandman       = Sandman;
SpidermanGame.LevelBuilder = LevelBuilder;
window.LevelGoal     = LevelGoal;
window.Projectile    = Projectile;
window.SpiderMan     = SpiderMan;
window.Enemy         = Enemy;
window.Venom         = Venom;
window.Goblin        = Goblin;
window.Roof          = Roof;
window.Pickup        = Pickup;
window.FloatingText  = FloatingText;
window.Burst         = Burst;
window.SoundFX       = SoundFX;
window.RoofProp      = RoofProp;
window.Backdrop      = Backdrop;

})(window, document);