import { Schema, MapSchema, defineTypes } from '@colyseus/schema'

// ─── Player State ───────────────────────────────────────────────
// NOTE: @colyseus/schema 2.0.37 fails to encode fields declared as JS
// class fields (e.g. `x: number = 0`). All fields must be initialized
// in the constructor instead.
export class PlayerState extends Schema {
  x: number
  y: number
  z: number
  rotationY: number
  hp: number
  isDead: boolean
  team: string
  nickname: string
  money: number
  kills: number
  deaths: number
  lastProcessedSeq: number
  hasBomb: boolean
  isReloading: boolean
  isSprinting: boolean
  isCrouching: boolean
  isSliding: boolean
  isAirborne: boolean
  isReady: boolean
  currentWeapon: string
  primaryWeapon: string
  secondaryWeapon: string
  knifeSlot: string
  armor: number
  hasHelmet: boolean
  hasDefuseKit: boolean
  grenadeHE: number
  grenadeSmoke: number
  grenadeFlash: number
  ammo: number
  reserveAmmo: number
  primaryAmmo: number
  primaryReserveAmmo: number
  secondaryAmmo: number
  secondaryReserveAmmo: number
  isPlanting: boolean
  isDefusing: boolean
  plantProgress: number
  defuseProgress: number
  reconnectExpiresAt: number
  isBot: number
  botDifficulty: number

  constructor() {
    super()
    this.x = 0
    this.y = 0
    this.z = 0
    this.rotationY = 0
    this.hp = 100
    this.isDead = false
    this.team = ''
    this.nickname = ''
    this.money = 800
    this.kills = 0
    this.deaths = 0
    this.lastProcessedSeq = 0
    this.hasBomb = false
    this.isReloading = false
    this.isSprinting = false
    this.isCrouching = false
    this.isSliding = false
    this.isAirborne = false
    this.isReady = false
    this.currentWeapon = 'deagle'
    this.primaryWeapon = ''
    this.secondaryWeapon = 'deagle'
    this.knifeSlot = 'knife'
    this.armor = 0
    this.hasHelmet = false
    this.hasDefuseKit = false
    this.grenadeHE = 0
    this.grenadeSmoke = 0
    this.grenadeFlash = 0
    this.ammo = 7
    this.reserveAmmo = 42
    this.primaryAmmo = 0
    this.primaryReserveAmmo = 0
    this.secondaryAmmo = 7
    this.secondaryReserveAmmo = 42
    this.isPlanting = false
    this.isDefusing = false
    this.plantProgress = 0
    this.defuseProgress = 0
    this.reconnectExpiresAt = 0
    this.isBot = 0
    this.botDifficulty = 0
  }
}

defineTypes(PlayerState, {
  x: 'number',
  y: 'number',
  z: 'number',
  rotationY: 'number',
  hp: 'number',
  isDead: 'boolean',
  team: 'string',
  nickname: 'string',
  money: 'number',
  kills: 'number',
  deaths: 'number',
  lastProcessedSeq: 'number',
  hasBomb: 'boolean',
  isReloading: 'boolean',
  isSprinting: 'boolean',
  isCrouching: 'boolean',
  isSliding: 'boolean',
  isAirborne: 'boolean',
  currentWeapon: 'string',
  primaryWeapon: 'string',
  secondaryWeapon: 'string',
  knifeSlot: 'string',
  armor: 'number',
  hasHelmet: 'boolean',
  hasDefuseKit: 'boolean',
  grenadeHE: 'number',
  grenadeSmoke: 'number',
  grenadeFlash: 'number',
  ammo: 'number',
  reserveAmmo: 'number',
  primaryAmmo: 'number',
  primaryReserveAmmo: 'number',
  secondaryAmmo: 'number',
  secondaryReserveAmmo: 'number',
  isPlanting: 'boolean',
  isDefusing: 'boolean',
  plantProgress: 'number',
  defuseProgress: 'number',
  isReady: 'boolean',
  reconnectExpiresAt: 'number',
  isBot: 'number',
  botDifficulty: 'number',
})

// ─── Game State ─────────────────────────────────────────────────
export class SmokeState extends Schema {
  x: number
  z: number
  timeLeft: number

  constructor() {
    super()
    this.x = 0
    this.z = 0
    this.timeLeft = 15
  }
}

defineTypes(SmokeState, {
  x: 'number',
  z: 'number',
  timeLeft: 'number',
})

export class GameState extends Schema {
  phase: string
  roundTimeLeft: number
  teamRedScore: number
  teamBlueScore: number
  roundNumber: number
  bombPlanted: boolean
  bombTimeLeft: number
  bombSite: string
  players: MapSchema<PlayerState>
  maxRounds: number
  winScore: number
  buyPhaseTimeLeft: number
  roundEndTimer: number
  isHalfTime: boolean
  isOvertime: boolean
  isSuddenDeath: boolean
  lossStreakT: number
  lossStreakCT: number
  readyCount: number
  gameMode: string
  playerScores: MapSchema<number>
  smokes: MapSchema<SmokeState>
  kothZoneX: number
  kothZoneZ: number
  kothZoneRadius: number
  kothCapturingTeam: string
  kothCaptureProgress: number
  kothScoreT: number
  kothScoreCT: number

  constructor() {
    super()
    this.phase = 'waiting'
    this.roundTimeLeft = 0
    this.teamRedScore = 0
    this.teamBlueScore = 0
    this.roundNumber = 1
    this.bombPlanted = false
    this.bombTimeLeft = 0
    this.bombSite = ''
    this.players = new MapSchema<PlayerState>()
    this.maxRounds = 15
    this.winScore = 8
    this.buyPhaseTimeLeft = 0
    this.roundEndTimer = 0
    this.isHalfTime = false
    this.isOvertime = false
    this.isSuddenDeath = false
    this.lossStreakT = 0
    this.lossStreakCT = 0
    this.readyCount = 0
    this.gameMode = 'bomb_defusal'
    this.playerScores = new MapSchema<number>()
    // Smoke grenades (authoritative, synced to late joiners)
    this.smokes = new MapSchema<SmokeState>()
    // KOTH zone position
    this.kothZoneX = 0
    this.kothZoneZ = 0
    this.kothZoneRadius = 8
    this.kothCapturingTeam = ''
    this.kothCaptureProgress = 0
    this.kothScoreT = 0
    this.kothScoreCT = 0
  }
}

defineTypes(GameState, {
  phase: 'string',
  roundTimeLeft: 'number',
  teamRedScore: 'number',
  teamBlueScore: 'number',
  roundNumber: 'number',
  bombPlanted: 'boolean',
  bombTimeLeft: 'number',
  bombSite: 'string',
  players: { map: PlayerState },
  maxRounds: 'number',
  winScore: 'number',
  buyPhaseTimeLeft: 'number',
  roundEndTimer: 'number',
  isHalfTime: 'boolean',
  isOvertime: 'boolean',
  isSuddenDeath: 'boolean',
  lossStreakT: 'number',
  lossStreakCT: 'number',
  readyCount: 'number',
  gameMode: 'string',
  playerScores: { map: 'number' },
  smokes: { map: SmokeState },
  kothZoneX: 'number',
  kothZoneZ: 'number',
  kothZoneRadius: 'number',
  kothCapturingTeam: 'string',
  kothCaptureProgress: 'number',
  kothScoreT: 'number',
  kothScoreCT: 'number',
})

// ─── Interfaces ─────────────────────────────────────────────────
export interface ClientInput {
  seq: number
  timestamp: number
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  sprint: boolean
  crouch: boolean
  rotationY: number
}

export interface Snapshot {
  x: number
  y: number
  z: number
  rotationY: number
  lastProcessedSeq: number
}

export interface ShootInput {
  origin: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  timestamp: number
  seq: number
  // One-way latency in ms (measured client RTT/2) used for server rewind
  latency?: number
}

export interface ThrowGrenadeInput {
  type: 'he' | 'smoke' | 'flash'
  origin: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
}

export interface BuyRequest {
  item: string
}

export interface BombPlantRequest {
  site: 'A' | 'B'
}

export interface BombDefuseRequest {
  kit: boolean
}

// ─── Constants ──────────────────────────────────────────────────
export const PHYSICS = {
  walkSpeed: 5.0,
  sprintSpeed: 7.5,
  crouchSpeed: 2.5,
  jumpVelocity: 5.0,
  gravity: 9.81,
  strafeMultiplier: 1.20,
  slideBoost: 1.45,
  slideDuration: 0.6,
  maxVelocity: 12.0,
  maxStrafeTurnDeg: 30,
  friction: { walk: 5, sprint: 3, slide: 0.5, air: 0 },
  airControl: 0.75,
  moonJumpMult: 1.4,
  shortHopMult: 0.6,
  inputWindowMs: 100,
  slideControlDefault: 6,
  // Perfect Jump Boost
  perfectJumpWindow: 100,       // ms timing window after landing
  perfectJumpBoost: 1.3,        // 30% higher jump on perfect timing
  // Double Jump
  doubleJumpEnabled: true,
  doubleJumpBoost: 0.7,         // 70% of normal jump height
  // Wall Jump
  wallJumpEnabled: true,
  wallJumpBoost: 6.0,           // vertical velocity
  wallJumpHorizontal: 5.0,      // push away from wall
  wallJumpCooldown: 500,        // ms between wall jumps
  wallJumpRayDist: 0.6,         // raycast distance to detect wall
  // Jump Stamina
  jumpStaminaMax: 3,            // max jumps (regular + double + wall combined)
  jumpStaminaRegen: 1.0,        // regen per second while grounded
} as const

export const SERVER = {
  tickRate: 30,
  maxDelta: 1.15,
  reconcileLerpThreshold: 0.3,
  reconcileSnapThreshold: 0.5,
  reconnectTTL: 60,
  maxVelocity: 12,
} as const

export const GUN_GAME_WEAPONS = [
  'glock',
  'tec9',
  'deagle',
  'mp5',
  'ak47',
  'm4a1',
  'awp',
  'combatknife',
] as const

export const ROUND = {
  buyPhaseDuration: 15,
  activePhaseDuration: 115,
  roundEndDuration: 4,
  maxRounds: 15,
  winScore: 8,
  overtimeWinScore: 9,
  overtimeMaxRounds: 18,
  suddenDeathRound: 18,
  plantDuration: 3,
  bombTimer: 40,
  defuseDuration: 10,
  defuseKitDuration: 5,
  respawnDelay: 3000,
  readySkipThreshold: 8,
} as const

export const ECONOMY = {
  startMoney: 800,
  maxMoney: 16000,
  roundWinBonus: 3250,
  lossBonus1: 1400,
  lossBonus2: 1900,
  killRifle: 300,
  killAWP: 100,
  killSMG: 600,
  killPistol: 300,
  plantBonus: 300,
  defuseBonus: 300,
} as const

export const WEAPONS = {
  // Primary Rifles
  ak47: {
    dmg: 35,
    headshot: 100,
    fireRate: 10,
    mag: 30,
    reload: 2.4,
    price: 2700,
    team: 'T',
    reserveAmmo: 90,
  },
  m4a1: {
    dmg: 31,
    headshot: 92,
    fireRate: 11,
    mag: 25,
    reload: 3.1,
    price: 3100,
    team: 'CT',
    reserveAmmo: 75,
  },
  awp: {
    dmg: 115,
    headshot: 115,
    fireRate: 1 / 1.2,
    mag: 5,
    reload: 3.7,
    price: 4750,
    team: 'both',
    reserveAmmo: 30,
  },
  mp5: {
    dmg: 24,
    headshot: 72,
    fireRate: 10.5,
    mag: 30,
    reload: 2.1,
    price: 1500,
    team: 'both',
    reserveAmmo: 120,
  },
  // Pistols
  deagle: {
    dmg: 53,
    headshot: 100,
    fireRate: 1 / 0.3,
    mag: 7,
    reload: 2.2,
    price: 700,
    team: 'both',
    reserveAmmo: 35,
  },
  glock: {
    dmg: 22,
    headshot: 78,
    fireRate: 8,
    mag: 20,
    reload: 1.8,
    price: 200,
    team: 'both',
    reserveAmmo: 120,
  },
  tec9: {
    dmg: 18,
    headshot: 65,
    fireRate: 12,
    mag: 18,
    reload: 1.6,
    price: 500,
    team: 'T',
    reserveAmmo: 90,
  },
  autopistol: {
    dmg: 20,
    headshot: 70,
    fireRate: 9,
    mag: 15,
    reload: 1.5,
    price: 500,
    team: 'CT',
    reserveAmmo: 90,
  },
  // Melee
  knife: {
    dmg: 50,
    headshot: 100,
    fireRate: 2,
    mag: 1,
    reload: 0,
    price: 0,
    team: 'both',
    reserveAmmo: 0,
  },
  combatknife: {
    dmg: 55,
    headshot: 100,
    fireRate: 2.5,
    mag: 1,
    reload: 0,
    price: 0,
    team: 'both',
    reserveAmmo: 0,
  },
} as const

export const GEAR = {
  kevlar: { price: 650, armor: 100 },
  helmet: { price: 1000, armor: 100, helmet: true },
  defuseKit: { price: 400, team: 'CT' },
  grenadeHE: { price: 300 },
  grenadeSmoke: { price: 300 },
  grenadeFlash: { price: 200 },
} as const

export const SPAWN = {
  T: { x: -25, y: 0, z: 0 },
  CT: { x: 25, y: 0, z: 0 },
} as const

export const BOMB_SITES = {
  A: { x: 15, y: 0, z: -15, radius: 6 },
  B: { x: 12, y: 0, z: 15, radius: 6 },
} as const

export const BUY_ZONE = {
  T: { x: -25, y: 0, z: 0, radius: 10 },
  CT: { x: 25, y: 0, z: 0, radius: 10 },
} as const

// ─── Map Colliders (AABB) ───────────────────────────────────────
// Single source of truth shared by server (movement/LOS/wallbang) and
// client (grenade bounce). Mirrors the visuals in ContainerYard.tsx.
// material: "wood" = wallbangable (-50% dmg), "metal" = bulletproof, "concrete" = solid wall.
export type ObstacleMaterial = 'wood' | 'metal' | 'concrete'

export interface MapObstacle {
  id: string
  material: ObstacleMaterial
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

// Helper: center + size → AABB
function box(id: string, material: ObstacleMaterial, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): MapObstacle {
  return {
    id,
    material,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: cy - sy / 2,
    maxY: cy + sy / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
  }
}

// ─── v2.2 3-Lane Layout ──────────────────────────────────────────
export const MAP_OBSTACLES = [
  // ═══ MID LANE ═══
  // Mid Box Center — wallbangable cover in open field
  box('mid_box', 'wood', 0, 0.6, 0, 1.2, 1.2, 1.2),

  // T-Mid Barrels — solid iron cover for T peeking mid
  { id: 'mid_barrel_1', material: 'metal', minX: -15.35, maxX: -14.65, minY: 0, maxY: 1.5, minZ: -2.35, maxZ: -1.65 },
  { id: 'mid_barrel_2', material: 'metal', minX: -15.35, maxX: -14.65, minY: 0, maxY: 1.5, minZ: 1.65, maxZ: 2.35 },

  // CT Sniper Window — two solid blocks with 3m gap for CT sniper
  box('mid_sniper_nest_L', 'metal', 15, 0.6, -2.5, 2.4, 1.2, 1.2),
  box('mid_sniper_nest_R', 'metal', 15, 0.6, 2.5, 2.4, 1.2, 1.2),

  // ═══ SITE A (NORTH) ═══
  // Site A Core — main container, bombsite planted beside it
  box('site_a_core', 'metal', 15, 1.2, -15, 6.0, 2.4, 2.4),

  // A-Main Choke — forces T into narrow entry, grenade bait
  box('a_main_choke', 'metal', -5, 1.2, -15, 2.4, 2.4, 6.0),

  // A Ninja Corner — stacked wood boxes for ninja defuse / hold angle
  { id: 'a_ninja_box_1', material: 'wood', minX: 9.4, maxX: 10.6, minY: 0, maxY: 1.2, minZ: -18.6, maxZ: -17.4 },
  { id: 'a_ninja_box_2', material: 'wood', minX: 9.4, maxX: 10.6, minY: 1.2, maxY: 2.4, minZ: -18.6, maxZ: -17.4 },

  // A-Connector — small wood cover for mid→A rotation
  box('a_connector_box', 'wood', 5, 0.6, -8, 1.2, 1.2, 1.2),

  // ═══ SITE B (SOUTH) ═══
  // B-Stack Bottom — main container pillar
  box('site_b_bottom', 'metal', 12, 1.2, 15, 6.0, 2.4, 2.4),

  // B-Ramp — sloped surface (approximated as tilted box for physics)
  { id: 'site_b_ramp', material: 'metal', minX: 5.6, maxX: 10.4, minY: 0, maxY: 2.4, minZ: 13.8, maxZ: 16.2 },

  // B-Stack Top — elevated container for high ground
  box('site_b_top', 'metal', 13.8, 3.6, 15, 2.4, 2.4, 2.4),

  // B-Pillar Cover — iron cylinder for plant cover
  { id: 'site_b_plant_cover', material: 'metal', minX: 15.65, maxX: 16.35, minY: 0, maxY: 1.5, minZ: 11.65, maxZ: 12.35 },

  // B-Tunnels — walls forming the tunnel corridor
  box('b_tunnel_wall_1', 'metal', -5, 1.2, 12.5, 10.0, 2.4, 0.5),
  box('b_tunnel_wall_2', 'metal', -5, 1.2, 17.5, 10.0, 2.4, 0.5),
  // B-Tunnel roof (blocks overhead grenades)
  box('b_tunnel_roof', 'metal', -5, 2.4, 15, 10.0, 0.3, 5.0),

  // ═══ WALLS (Perimeter Map) ═══
  { id: 'wall_north', material: 'concrete', minX: -30, maxX: 30, minY: 0, maxY: 7.2, minZ: -20.5, maxZ: -20 },
  { id: 'wall_south', material: 'concrete', minX: -30, maxX: 30, minY: 0, maxY: 7.2, minZ: 20, maxZ: 20.5 },
  { id: 'wall_west', material: 'concrete', minX: -30.5, maxX: -30, minY: 0, maxY: 7.2, minZ: -20, maxZ: 20 },
  { id: 'wall_east', material: 'concrete', minX: 30, maxX: 30.5, minY: 0, maxY: 7.2, minZ: -20, maxZ: 20 },

  // ═══ DECORATIVE PROPS ═══
  { id: 'dec_crate_1', material: 'wood', minX: -4.4, maxX: -3.6, minY: 0, maxY: 0.6, minZ: 5.6, maxZ: 6.4 },
  { id: 'dec_crate_2', material: 'wood', minX: 2.5, maxX: 3.5, minY: 0, maxY: 0.6, minZ: -6.3, maxZ: -5.7 },
  { id: 'dec_bollard_1', material: 'metal', minX: 11.75, maxX: 12.25, minY: 0, maxY: 0.9, minZ: -2.25, maxZ: -1.75 },
  { id: 'dec_bollard_2', material: 'metal', minX: 13.75, maxX: 14.25, minY: 0, maxY: 0.9, minZ: 1.75, maxZ: 2.25 },
  { id: 'dec_panel', material: 'metal', minX: -7.25, maxX: -4.75, minY: 0, maxY: 0.5, minZ: -10.8, maxZ: -9.2 },
] as const satisfies readonly MapObstacle[]

export const MAP_BOUNDARY = {
  minX: -29,
  maxX: 29,
  minZ: -19,
  maxZ: 19,
} as const

// ─── Grenades ───────────────────────────────────────────────────
export const GRENADE = {
  fuse: 2, // seconds until detonation
  heRadius: 4,
  heMaxDmg: 80,
  smokeRadius: 4,
  smokeDuration: 15,
  flashMaxDist: 15,
  throwSpeed: 18,
  throwUpSpeed: 3,
  bounce: 0.4, // vertical restitution on ground
  bounceXZ: 0.6, // horizontal dampening on ground
  cooldownMs: 600,
  maxThrowSpeed: 25, // anti-cheat clamp
  startPosOffset: 0.5, // spawn distance from camera
} as const
