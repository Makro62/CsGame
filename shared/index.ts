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
  A: { x: 0, y: 0, z: -20, radius: 8 },
  B: { x: 0, y: 0, z: 20, radius: 8 },
} as const

export const BUY_ZONE = {
  T: { x: -25, y: 0, z: 0, radius: 10 },
  CT: { x: 25, y: 0, z: 0, radius: 10 },
} as const

// ─── Map Colliders (AABB) ───────────────────────────────────────
// Single source of truth shared by server (movement/LOS/wallbang) and
// client (grenade bounce). Mirrors the visuals in ContainerYard.tsx.
// material: "wood" = wallbangable (-50% dmg), "metal" = bulletproof.
export type ObstacleMaterial = 'wood' | 'metal'

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

export const MAP_OBSTACLES = [
  // T spawn
  {
    id: 'red_base',
    material: 'metal',
    minX: -27,
    maxX: -23,
    minY: 0,
    maxY: 2.4,
    minZ: -12,
    maxZ: -4,
  },
  {
    id: 't_cover_1',
    material: 'wood',
    minX: -20.6,
    maxX: -19.4,
    minY: 0,
    maxY: 1.2,
    minZ: -3.6,
    maxZ: -2.4,
  },
  {
    id: 't_cover_2',
    material: 'wood',
    minX: -20.6,
    maxX: -19.4,
    minY: 0,
    maxY: 1.2,
    minZ: 2.4,
    maxZ: 3.6,
  },
  // Mid
  {
    id: 'mid_box',
    material: 'wood',
    minX: -2,
    maxX: 2,
    minY: 0,
    maxY: 2.4,
    minZ: -3,
    maxZ: 3,
  },
  {
    id: 'barrel_1',
    material: 'metal',
    minX: -8.4,
    maxX: -7.6,
    minY: 0,
    maxY: 1.5,
    minZ: -3.4,
    maxZ: -2.6,
  },
  {
    id: 'barrel_2',
    material: 'metal',
    minX: -8.4,
    maxX: -7.6,
    minY: 0,
    maxY: 1.5,
    minZ: 2.6,
    maxZ: 3.4,
  },
  // Site A
  {
    id: 'a_container_1',
    material: 'metal',
    minX: -13,
    maxX: -7,
    minY: 0,
    maxY: 2.4,
    minZ: -14,
    maxZ: -10,
  },
  {
    id: 'a_container_2',
    material: 'metal',
    minX: -16,
    maxX: -12,
    minY: 0,
    maxY: 2.4,
    minZ: -18,
    maxZ: -12,
  },
  {
    id: 'a_corner_box',
    material: 'wood',
    minX: -3.6,
    maxX: -2.4,
    minY: 0,
    maxY: 1.2,
    minZ: -18.6,
    maxZ: -17.4,
  },
  {
    id: 'a_barrel',
    material: 'metal',
    minX: -7.4,
    maxX: -6.6,
    minY: 0,
    maxY: 1.5,
    minZ: -18.4,
    maxZ: -17.6,
  },
  // Site B
  {
    id: 'b_stack_1',
    material: 'metal',
    minX: 6,
    maxX: 10,
    minY: 0,
    maxY: 2.4,
    minZ: 9,
    maxZ: 15,
  },
  {
    id: 'b_stack_2',
    material: 'metal',
    minX: 6,
    maxX: 10,
    minY: 2.4,
    maxY: 4.8,
    minZ: 9,
    maxZ: 15,
  },
  {
    id: 'b_top_box',
    material: 'wood',
    minX: 4.4,
    maxX: 5.6,
    minY: 3.4,
    maxY: 4.6,
    minZ: 11.4,
    maxZ: 12.6,
  },
  // CT spawn
  {
    id: 'ct_base',
    material: 'metal',
    minX: 23,
    maxX: 27,
    minY: 0,
    maxY: 2.4,
    minZ: -12,
    maxZ: -4,
  },
  {
    id: 'ct_cover_1',
    material: 'wood',
    minX: 19.4,
    maxX: 20.6,
    minY: 0,
    maxY: 1.2,
    minZ: -3.6,
    maxZ: -2.4,
  },
  {
    id: 'ct_cover_2',
    material: 'wood',
    minX: 19.4,
    maxX: 20.6,
    minY: 0,
    maxY: 1.2,
    minZ: 2.4,
    maxZ: 3.6,
  },
  // Perimeter walls (beyond player clamp; block bullets/grenades)
  {
    id: 'wall_north',
    material: 'metal',
    minX: -34,
    maxX: 34,
    minY: 0,
    maxY: 7.2,
    minZ: 19.5,
    maxZ: 23.5,
  },
  {
    id: 'wall_south',
    material: 'metal',
    minX: -34,
    maxX: 34,
    minY: 0,
    maxY: 7.2,
    minZ: -23.5,
    maxZ: -19.5,
  },
  {
    id: 'wall_west',
    material: 'metal',
    minX: -33.5,
    maxX: -29.5,
    minY: 0,
    maxY: 7.2,
    minZ: -22,
    maxZ: 22,
  },
  {
    id: 'wall_east',
    material: 'metal',
    minX: 29.5,
    maxX: 33.5,
    minY: 0,
    maxY: 7.2,
    minZ: -22,
    maxZ: 22,
  },
  // Decorative props
  {
    id: 'dec_crate_1',
    material: 'wood',
    minX: -4.4,
    maxX: -3.6,
    minY: 0,
    maxY: 0.6,
    minZ: 5.6,
    maxZ: 6.4,
  },
  {
    id: 'dec_crate_2',
    material: 'wood',
    minX: 2.5,
    maxX: 3.5,
    minY: 0,
    maxY: 0.6,
    minZ: -6.3,
    maxZ: -5.7,
  },
  {
    id: 'dec_bollard_1',
    material: 'metal',
    minX: 11.75,
    maxX: 12.25,
    minY: 0,
    maxY: 0.9,
    minZ: -2.25,
    maxZ: -1.75,
  },
  {
    id: 'dec_bollard_2',
    material: 'metal',
    minX: 13.75,
    maxX: 14.25,
    minY: 0,
    maxY: 0.9,
    minZ: 1.75,
    maxZ: 2.25,
  },
  {
    id: 'dec_panel',
    material: 'metal',
    minX: -7.25,
    maxX: -4.75,
    minY: 0,
    maxY: 0.5,
    minZ: -10.8,
    maxZ: -9.2,
  },
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
