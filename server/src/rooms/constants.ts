// Server-side magic numbers extracted for clarity and consistency

// Shooting validation
export const MAX_ORIGIN_DISTANCE_SQ = 9; // 3 * 3
export const FIRE_RATE_TOLERANCE = 0.85; // tolerance multiplier for fire rate
export const SPAWN_PROTECTION_MS = 1500; // invulnerability after spawn

// Hit detection
export const HEAD_HEIGHT_THRESHOLD = 0.45; // y-position below which is torso/limbs
export const PERP_DISTANCE_THRESHOLD_SQ = 0.36; // 0.6 * 0.6

// Damage
export const MAX_HP = 100;
export const ARMOR_VALUE = 100;
export const ARMOR_DAMAGE_MULTIPLIER = 0.65; // damage multiplier when armored

// Chat/radio
export const CHAT_COOLDOWN_MS = 500;
export const RADIO_COOLDOWN_MS = 2000;
export const MAX_CHAT_LENGTH = 120;
export const MAX_NICKNAME_LENGTH = 20;

// Vote
export const VOTE_TIMEOUT_MS = 30000;
export const VOTE_KICK_EXIT_CODE = 4000;

// KOTH
export const KOTH_CAPTURE_RATE_PER_PLAYER = 10; // seconds to capture with 1 player
export const KOTH_DECAY_RATE = 15; // seconds to decay
export const KOTH_MAX_PROGRESS = 100;

// Grenade physics
export const GRENADE_BOUNCE_DAMPING = 0.45;
export const GRENADE_GROUND_MIN_Y = 0.15;
export const GRENADE_OFFSET = 0.01;

// Spawn
export const MIN_SPAWN_DISTANCE_SQ = 100; // 10 * 10

// Round reset
export const ROUND_RESET_DELAY_MS = 5000;

// Weapon ranges
export const AWP_MAX_RANGE = 100;
export const DEFAULT_MAX_RANGE = 60;
