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
  isBot: boolean
  botDifficulty: number
  hasJuggernog: boolean
  hasSpeedCola: boolean
  hasDoubleTap: boolean
  hasQuickRevive: boolean
  selfReviveUsed: boolean
  hasPackAPunch: boolean
  isUsingMysteryBox: boolean
  isDowned: boolean
  downedTimer: number
  downedBy: string
  isReviving: boolean
  reviveProgress: number
  reviveTargetId: string

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
    this.ammo = 14
    this.reserveAmmo = 70
    this.primaryAmmo = 0
    this.primaryReserveAmmo = 0
    this.secondaryAmmo = 14
    this.secondaryReserveAmmo = 70
    this.isPlanting = false
    this.isDefusing = false
    this.plantProgress = 0
    this.defuseProgress = 0
    this.reconnectExpiresAt = 0
    this.isBot = false
    this.botDifficulty = 0
    this.hasJuggernog = false
    this.hasSpeedCola = false
    this.hasDoubleTap = false
    this.hasQuickRevive = false
    this.selfReviveUsed = false
    this.hasPackAPunch = false
    this.isUsingMysteryBox = false
    this.isDowned = false
    this.downedTimer = 0
    this.downedBy = ''
    this.isReviving = false
    this.reviveProgress = 0
    this.reviveTargetId = ''
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
  isBot: 'boolean',
  botDifficulty: 'number',
  hasJuggernog: 'boolean',
  hasSpeedCola: 'boolean',
  hasDoubleTap: 'boolean',
  hasQuickRevive: 'boolean',
  selfReviveUsed: 'boolean',
  hasPackAPunch: 'boolean',
  isUsingMysteryBox: 'boolean',
  isDowned: 'boolean',
  downedTimer: 'number',
  downedBy: 'string',
  isReviving: 'boolean',
  reviveProgress: 'number',
  reviveTargetId: 'string',
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

// ─── Zombie State ───────────────────────────────────────────────
export type ZombieType = 'walker' | 'runner' | 'tank' | 'spitter' | 'boss'

export class ZombieState extends Schema {
  id: string
  type: ZombieType
  x: number
  y: number
  z: number
  hp: number
  maxHp: number
  speed: number
  rotationY: number
  targetId: string
  isDead: boolean
  isAttacking: boolean
  attackCooldown: number

  constructor() {
    super()
    this.id = ''
    this.type = 'walker'
    this.x = 0
    this.y = 0
    this.z = 0
    this.hp = 100
    this.maxHp = 100
    this.speed = 2.5
    this.rotationY = 0
    this.targetId = ''
    this.isDead = false
    this.isAttacking = false
    this.attackCooldown = 0
  }
}

defineTypes(ZombieState, {
  id: 'string',
  type: 'string',
  x: 'number',
  y: 'number',
  z: 'number',
  hp: 'number',
  maxHp: 'number',
  speed: 'number',
  rotationY: 'number',
  targetId: 'string',
  isDead: 'boolean',
  isAttacking: 'boolean',
  attackCooldown: 'number',
})

// ─── Barricade State ───────────────────────────────────────────
export class BarricadeState extends Schema {
  id: string
  x: number
  y: number
  z: number
  rotationY: number
  boards: number
  maxBoards: number
  hp: number

  constructor() {
    super()
    this.id = ''
    this.x = 0
    this.y = 0
    this.z = 0
    this.rotationY = 0
    this.boards = 6
    this.maxBoards = 6
    this.hp = 100
  }
}

defineTypes(BarricadeState, {
  id: 'string',
  x: 'number',
  y: 'number',
  z: 'number',
  rotationY: 'number',
  boards: 'number',
  maxBoards: 'number',
  hp: 'number',
})

// ─── PowerUp State ──────────────────────────────────────────────
export class PowerUpState extends Schema {
  id: string
  type: PowerUpType
  x: number
  y: number
  z: number
  timeLeft: number

  constructor() {
    super()
    this.id = ''
    this.type = 'max_ammo'
    this.x = 0
    this.y = 0
    this.z = 0
    this.timeLeft = 0
  }
}

defineTypes(PowerUpState, {
  id: 'string',
  type: 'string',
  x: 'number',
  y: 'number',
  z: 'number',
  timeLeft: 'number',
})

export type WaveState = 'waiting' | 'spawning' | 'active' | 'wave_clear' | 'inter_wave'

export type RoundPhase = 'buy' | 'active' | 'roundEnd' | 'matchEnd' | 'waiting'

export class GameState extends Schema {
  phase: RoundPhase
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
  // Zombie survival fields
  zombies: MapSchema<ZombieState>
  currentWave: number
  zombiesRemaining: number
  waveState: WaveState
  interWaveTimer: number
  points: MapSchema<number>
  powerUps: MapSchema<PowerUpState>
  activePowerUp: string
  powerUpTimer: number
  mysteryBoxWeapon: string
  mysteryBoxActive: boolean
  unlockedAreas: MapSchema<number>
  barricades: MapSchema<BarricadeState>
  extractionActive: boolean
  extractionTimer: number
  extractionAvailable: boolean
  evacSuccess: boolean

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
    // Zombie survival
    this.zombies = new MapSchema<ZombieState>()
    this.currentWave = 0
    this.zombiesRemaining = 0
    this.waveState = 'waiting'
    this.interWaveTimer = 0
    this.points = new MapSchema<number>()
    this.powerUps = new MapSchema<PowerUpState>()
    this.activePowerUp = ""
    this.powerUpTimer = 0
    this.mysteryBoxWeapon = ""
    this.mysteryBoxActive = false
    this.unlockedAreas = new MapSchema<number>()
    this.barricades = new MapSchema<BarricadeState>()
    this.extractionActive = false
    this.extractionTimer = 0
    this.extractionAvailable = false
    this.evacSuccess = false
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
  // Zombie survival
  zombies: { map: ZombieState },
  currentWave: 'number',
  zombiesRemaining: 'number',
  waveState: 'string',
  interWaveTimer: 'number',
  points: { map: 'number' },
  powerUps: { map: PowerUpState },
  activePowerUp: 'string',
  powerUpTimer: 'number',
  mysteryBoxWeapon: 'string',
  mysteryBoxActive: 'boolean',
  unlockedAreas: { map: 'number' },
  barricades: { map: BarricadeState },
  extractionActive: 'boolean',
  extractionTimer: 'number',
  extractionAvailable: 'boolean',
  evacSuccess: 'boolean',
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

export type BuyFailReason =
  | 'not_buy_phase'
  | 'outside_buy_zone'
  | 'too_fast'
  | 'unknown_item'
  | 'wrong_team'
  | 'no_money'
  | 'already_owned'
  | 'max_grenades'

export interface BuyFailedMessage {
  item: string
  reason: BuyFailReason
}

export interface MeleeInput {
  direction: { x: number; y: number; z: number }
  timestamp: number
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
    mag: 14,
    reload: 2.2,
    price: 700,
    team: 'both',
    reserveAmmo: 70,
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
    price: 500,
    team: 'both',
    reserveAmmo: 0,
  },
  // Grenades
  he: {
    dmg: 85,
    headshot: 85,
    fireRate: 1,
    mag: 1,
    reload: 0,
    price: 300,
    team: 'both',
    reserveAmmo: 1,
  },
  smoke: {
    dmg: 0,
    headshot: 0,
    fireRate: 1,
    mag: 1,
    reload: 0,
    price: 300,
    team: 'both',
    reserveAmmo: 1,
  },
  flash: {
    dmg: 0,
    headshot: 0,
    fireRate: 1,
    mag: 1,
    reload: 0,
    price: 200,
    team: 'both',
    reserveAmmo: 2,
  },
} as const

export type WeaponId = keyof typeof WEAPONS

export const PRIMARY_WEAPONS = ['ak47', 'm4a1', 'awp', 'mp5'] as const
export const SECONDARY_WEAPONS = ['deagle', 'glock', 'tec9', 'autopistol'] as const
export const MELEE_WEAPONS = ['knife', 'combatknife'] as const
export const GRENADE_WEAPONS = ['he', 'smoke', 'flash'] as const

export function isPrimaryWeapon(id: string): boolean {
  return (PRIMARY_WEAPONS as readonly string[]).includes(id)
}

export function isSecondaryWeapon(id: string): boolean {
  return (SECONDARY_WEAPONS as readonly string[]).includes(id)
}

export function isMeleeWeapon(id: string): boolean {
  return (MELEE_WEAPONS as readonly string[]).includes(id)
}

export function isGrenadeWeapon(id: string): boolean {
  return (GRENADE_WEAPONS as readonly string[]).includes(id)
}

/** Knife stats: melee only reaches arm's length and rewards flanking. */
export const MELEE = {
  range: 1.7,
  /** Minimum dot(view, toTarget) so the swing only lands in front of you */
  frontDot: 0.4,
  /** Damage multiplier when the victim is facing away */
  backstabMultiplier: 2.5,
} as const

/** Free pistol handed out at the start of every round, per team. */
export const DEFAULT_PISTOL = {
  T: 'glock',
  CT: 'autopistol',
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

// ─── v3.0 3-Lane Container Yard Layout ──────────────────────────
export const MAP_OBSTACLES = [
  // ═══ MID LANE ═══
  // Mid Box Center — wallbangable cover in open field
  box('mid_box', 'wood', 0, 0.6, 0, 1.2, 1.2, 1.2),

  // Mid Yellow Landmark Container — AWP peeking cover with counter angle
  box('mid_yellow_container', 'metal', -2.5, 1.2, 3.5, 4.0, 2.4, 2.0),

  // T-Mid Barrels — solid iron cover for T peeking mid
  { id: 'mid_barrel_1', material: 'metal', minX: -15.35, maxX: -14.65, minY: 0, maxY: 1.5, minZ: -2.35, maxZ: -1.65 },
  { id: 'mid_barrel_2', material: 'metal', minX: -15.35, maxX: -14.65, minY: 0, maxY: 1.5, minZ: 1.65, maxZ: 2.35 },

  // CT Sniper Window — two solid blocks with 3m gap for CT sniper
  box('mid_sniper_nest_L', 'metal', 15, 0.6, -2.5, 2.4, 1.2, 1.2),
  box('mid_sniper_nest_R', 'metal', 15, 0.6, 2.5, 2.4, 1.2, 1.2),

  // ═══ SITE A (NORTH, z ≈ -15) ═══
  // Site A Core — main container, bombsite beside it
  box('site_a_core', 'metal', 15, 1.2, -15, 6.0, 2.4, 2.4),

  // A-Main Choke — forces T into narrow entry
  box('a_main_choke', 'metal', -5, 1.2, -15, 2.4, 2.4, 6.0),

  // Site A Corridor Cover — breaks long sightlines in A approach
  box('site_a_corridor_box1', 'metal', 4, 1.2, -13.5, 3.0, 2.4, 1.5),
  box('site_a_corridor_stack', 'wood', -0.5, 0.6, -16.5, 1.5, 1.2, 1.5),

  // L-Choke A ↔ Mid
  box('a_mid_choke_1', 'metal', 0, 1.2, -8, 2.4, 2.4, 2.4),
  box('a_mid_choke_2', 'wood', 2.4, 0.6, -8, 2.4, 1.2, 1.2),

  // A Ninja Corner — stacked wood boxes
  { id: 'a_ninja_box_1', material: 'wood', minX: 9.4, maxX: 10.6, minY: 0, maxY: 1.2, minZ: -18.6, maxZ: -17.4 },
  { id: 'a_ninja_box_2', material: 'wood', minX: 9.4, maxX: 10.6, minY: 1.2, maxY: 2.4, minZ: -18.6, maxZ: -17.4 },

  // A-Connector wood cover
  box('a_connector_box', 'wood', 5, 0.6, -5.5, 1.2, 1.2, 1.2),

  // ═══ SITE B (SOUTH, z ≈ +15) ═══
  // B-Stack Bottom — main container pillar
  box('site_b_bottom', 'metal', 12, 1.2, 15, 6.0, 2.4, 2.4),

  // B-Ramp — stepped solid physics matching visual ramp
  box('site_b_ramp_1', 'metal', 6.5, 0.4, 15, 1.8, 0.8, 2.4),
  box('site_b_ramp_2', 'metal', 8.3, 1.2, 15, 1.8, 1.6, 2.4),

  // B-Stack Top — elevated container for high ground
  box('site_b_top', 'metal', 13.8, 3.6, 15, 2.4, 2.4, 2.4),

  // B-Pillar Cover — iron cylinder for plant cover
  { id: 'site_b_plant_cover', material: 'metal', minX: 15.65, maxX: 16.35, minY: 0, maxY: 1.5, minZ: 11.65, maxZ: 12.35 },

  // B-Tunnels
  box('b_tunnel_wall_1', 'metal', -5, 1.2, 12.5, 10.0, 2.4, 0.5),
  box('b_tunnel_wall_2', 'metal', -5, 1.2, 17.5, 10.0, 2.4, 0.5),
  box('b_tunnel_roof', 'metal', -5, 2.4, 15, 10.0, 0.3, 5.0),

  // ═══ SPAWN LANDMARKS ═══
  // T-Spawn Red Base
  box('t_spawn_container_1', 'metal', -25, 1.2, -5, 3.0, 2.4, 2.0),
  box('t_spawn_container_2', 'metal', -25, 1.2, 5, 3.0, 2.4, 2.0),

  // CT-Spawn Blue Base
  box('ct_spawn_container_1', 'metal', 25, 1.2, -5, 3.0, 2.4, 2.0),
  box('ct_spawn_container_2', 'metal', 25, 1.2, 5, 3.0, 2.4, 2.0),

  // ═══ WALLS (Perimeter Map) ═══
  { id: 'wall_north', material: 'concrete', minX: -30, maxX: 30, minY: 0, maxY: 7.2, minZ: -20.5, maxZ: -20 },
  { id: 'wall_south', material: 'concrete', minX: -30, maxX: 30, minY: 0, maxY: 7.2, minZ: 20, maxZ: 20.5 },
  { id: 'wall_west', material: 'concrete', minX: -30.5, maxX: -30, minY: 0, maxY: 7.2, minZ: -20, maxZ: 20 },
  { id: 'wall_east', material: 'concrete', minX: 30, maxX: 30.5, minY: 0, maxY: 7.2, minZ: -20, maxZ: 20 },

  // ═══ GRID-ALIGNED DECORATIVE PROPS ═══
  box('dec_crate_1', 'wood', -4, 0.3, 6, 1.2, 0.6, 1.2),
  box('dec_crate_2', 'wood', 3, 0.3, -6, 1.2, 0.6, 1.2),
  box('dec_crate_a_approach', 'wood', 8, 0.3, -12, 1.2, 0.6, 1.2),
  box('dec_crate_b_ramp', 'wood', 4, 0.3, 13.5, 1.2, 0.6, 1.2),
  box('dec_bollard_1', 'metal', 12, 0.45, -2, 0.5, 0.9, 0.5),
  box('dec_bollard_2', 'metal', 14, 0.45, 2, 0.5, 0.9, 0.5),
] as const satisfies readonly MapObstacle[]

export const MAP_BOUNDARY = {
  minX: -29,
  maxX: 29,
  minZ: -19,
  maxZ: 19,
} as const

// ─── Callout Labels (strategic spot names) ───────────────────────
export interface MapCallout {
  id: string
  label: string
  x: number
  z: number
}

export const MAP_CALLOUTS: readonly MapCallout[] = [
  // Mid lane
  { id: 'mid', label: 'MID', x: 0, z: 0 },
  { id: 't_mid', label: 'T MID', x: -15, z: 0 },
  { id: 'ct_sniper', label: 'CT SNIPER', x: 15, z: 0 },
  // Site A
  { id: 'site_a', label: 'SITE A', x: 15, z: -15 },
  { id: 'a_main', label: 'A MAIN', x: -5, z: -15 },
  { id: 'a_connector', label: 'A CONNECTOR', x: 2, z: -8 },
  { id: 'a_ninja', label: 'A NINJA', x: 10, z: -18 },
  // Site B
  { id: 'site_b', label: 'SITE B', x: 12, z: 15 },
  { id: 'b_tunnel', label: 'B TUNNEL', x: -5, z: 15 },
  { id: 'b_ramp', label: 'B RAMP', x: 8, z: 15 },
  // Spawns
  { id: 't_spawn', label: 'T BASE', x: -25, z: 0 },
  { id: 'ct_spawn', label: 'CT BASE', x: 25, z: 0 },
]

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
  wallBounceDamping: 0.45, // wall collision restitution
  groundMinY: 0.15, // ground floor plane
  collisionOffset: 0.01, // push-out distance from obstacles
  cooldownMs: 600,
  maxThrowSpeed: 25, // anti-cheat clamp
  startPosOffset: 0.5, // spawn distance from camera
} as const

// ─── Zombie Survival Constants ──────────────────────────────────
export type PowerUpType = "max_ammo" | "nuke" | "insta_kill" | "double_points" | "carpenter" | "fire_sale";

export const POWER_UPS: Record<PowerUpType, { duration: number; description: string }> = {
  max_ammo: { duration: 0, description: "Full ammo for all players" },
  nuke: { duration: 0, description: "Kill all zombies on screen" },
  insta_kill: { duration: 30, description: "One-hit kills for 30s" },
  double_points: { duration: 30, description: "2x points for 30s" },
  carpenter: { duration: 0, description: "Repair all barricades" },
  fire_sale: { duration: 30, description: "Mystery box costs 10 points" },
};

export const POWER_UP_DROP_CHANCE = 0.15; // 15% chance per kill

// ─── Mystery Box ────────────────────────────────────────────────
export const MYSTERY_BOX = {
  price: 950,
  fireSalePrice: 10,
  spinDuration: 4, // seconds
  weapons: [
    "ak47", "m4a1", "mp5", "awp",
    "deagle", "glock", "tec9", "autopistol",
  ] as const,
  // Weighted probabilities (higher = more common)
  weights: {
    ak47: 20,
    m4a1: 20,
    mp5: 25,
    awp: 5,
    deagle: 15,
    glock: 20,
    tec9: 10,
    autopistol: 10,
  },
} as const;

// ─── Pack-a-Punch ──────────────────────────────────────────────
export const PACK_A_PUNCH = {
  price: 5000,
  upgradeMultiplier: 1.5, // 1.5x damage
  extraAmmoMultiplier: 1.5,
  allowedWeapons: ["ak47", "m4a1", "mp5", "awp", "deagle"] as const,
} as const;

// ─── Zombie Shop ───────────────────────────────────────────────
// Single source of truth for the armory UI and the server economy, so a price
// can never disagree between what the player sees and what they are charged.
export type ZombiePerkId = "juggernog" | "speedcola" | "doubletap" | "quickrevive";

export const ZOMBIE_SHOP = {
  weaponPrices: {
    mp5: 800,
    ak47: 1200,
    m4a1: 1400,
    awp: 2500,
    glock: 200,
    tec9: 500,
    autopistol: 500,
    deagle: 400,
  } as Record<string, number>,
  ammoPrice: 500,
  armorPrice: 750,
  /** Reserve ammo is capped at magazine size × this, so it cannot be hoarded. */
  reserveCap: 5,
  perks: {
    juggernog: { price: 2500, field: "hasJuggernog", hp: 200 },
    speedcola: { price: 3000, field: "hasSpeedCola" },
    doubletap: { price: 2000, field: "hasDoubleTap" },
    quickrevive: { price: 1500, field: "hasQuickRevive" },
  } as Record<ZombiePerkId, { price: number; field: string; hp?: number }>,
};

export type ZombieBuyFailReason =
  | "no_money"
  | "already_owned"
  | "unknown_item"
  | "unavailable"
  | "too_far"
  | "locked"
  | "full";

export interface ZombieBuyFailedMessage {
  item: string;
  reason: ZombieBuyFailReason;
}

/** Interaction radius the server enforces for box, Pack-a-Punch and areas. */
export const ZOMBIE_INTERACT_RANGE = 6;
export const MYSTERY_BOX_POS = { x: 0, z: 5 } as const;
export const PACK_A_PUNCH_POS = { x: 0, z: 0 } as const;

// ─── Zombie Difficulty ─────────────────────────────────────────
export type ZombieDifficulty = "casual" | "normal" | "hardcore" | "nightmare";

export const ZOMBIE_DIFFICULTIES: Record<
  ZombieDifficulty,
  {
    zombieHp: number;
    zombieSpeed: number;
    zombieDamage: number;
    points: number;
    soloRevives: number;
  }
> = {
  casual: { zombieHp: 0.8, zombieSpeed: 1.0, zombieDamage: 0.8, points: 1.25, soloRevives: 5 },
  normal: { zombieHp: 1.0, zombieSpeed: 1.0, zombieDamage: 1.0, points: 1.0, soloRevives: 3 },
  hardcore: { zombieHp: 1.15, zombieSpeed: 1.2, zombieDamage: 1.3, points: 1.0, soloRevives: 1 },
  nightmare: { zombieHp: 1.35, zombieSpeed: 1.3, zombieDamage: 1.5, points: 1.1, soloRevives: 0 },
};

export function isZombieDifficulty(value: unknown): value is ZombieDifficulty {
  return typeof value === "string" && value in ZOMBIE_DIFFICULTIES;
}

// ─── Map Progression (Unlockable Areas) ────────────────────────
export interface MapArea {
  id: string;
  name: string;
  price: number;
  x: number;
  z: number;
  radius: number;
  requires?: string;
}

export const ZOMBIE_MAP_AREAS: MapArea[] = [
  { id: "spawn", name: "Safe House", price: 0, x: 0, z: -40, radius: 15 },
  { id: "east_wing", name: "East Wing", price: 750, x: 20, z: -20, radius: 12, requires: "spawn" },
  { id: "west_wing", name: "West Wing", price: 750, x: -20, z: -20, radius: 12, requires: "spawn" },
  { id: "armory", name: "Armory", price: 1000, x: 0, z: 0, radius: 10, requires: "east_wing" },
  { id: "helipad", name: "Helipad", price: 1250, x: 0, z: 30, radius: 15, requires: "west_wing" },
  { id: "tower", name: "Watch Tower", price: 1500, x: 25, z: 25, radius: 8, requires: "armory" },
  { id: "bunker", name: "Underground Bunker", price: 2000, x: -25, z: 25, radius: 10, requires: "helipad" },
];

export const ZOMBIE_TYPES: Record<ZombieType, { hp: number; speed: number; damage: number; color: number }> = {
  walker:  { hp: 100, speed: 2.5, damage: 15, color: 0x4a6741 },
  runner:  { hp: 60,  speed: 5.0, damage: 10, color: 0x8b4513 },
  tank:    { hp: 400, speed: 1.5, damage: 30, color: 0x2c2c2c },
  spitter: { hp: 80,  speed: 2.0, damage: 5,  color: 0x9acd32 },
  boss:    { hp: 5000, speed: 3.0, damage: 50, color: 0x8b0000 },
}

export const WAVE_CONFIG = {
  baseZombieCount: 6,
  zombiesPerWave: 4,
  interWaveTime: 20,      // seconds between waves (wave 1)
  interWaveMinTime: 12,   // minimum inter-wave time
  spawnDuration: 10,      // seconds to spawn all zombies in a wave
  hpMultiplierPerWave: 0.15,
  speedBonusPerWave: 0.03,
  // Spawn points (4 corners of arena)
  spawnPoints: [
    { x: -55, z: -55 },
    { x: 55, z: -55 },
    { x: -55, z: 55 },
    { x: 55, z: 55 },
  ],
  // Active spawn points per wave range
  activeSpawns: [
    { maxWave: 2, count: 1 },
    { maxWave: 5, count: 2 },
    { maxWave: 8, count: 3 },
    { maxWave: Infinity, count: 4 },
  ],
  // Special zombie type unlock waves
  specialUnlock: {
    runner: 3,
    tank: 5,
    spitter: 7,
    boss: 10,
  },
  // Special spawn chances (cumulative per wave)
  specialChances: {
    runner: 0.40,
    tank: 0.25,
    spitter: 0.15,
    boss: 0.05,
  },
}

export const ZOMBIE_POINTS = {
  walker: 50,
  runner: 75,
  tank: 150,
  spitter: 100,
  boss: 500,
  headshotBonus: 25,
  knifeBonus: 100,
  assistDamage: 10,
  reviveAlly: 250,
  barricadeRepair: 10,
  waveClearBase: 500,
  waveClearPerWave: 100,
}

export const ZOMBIE_MAP_BOUNDARY = {
  minX: -60,
  maxX: 60,
  minZ: -60,
  maxZ: 60,
} as const;

export const ZOMBIE_SPAWN = {
  player: { x: 0, y: 0, z: -30 },
  safeHouse: { x: 0, y: 0, z: -40, radius: 15 },
  helipad: { x: 0, y: 0, z: 50, radius: 12 },
  spawnPoints: [
    { x: 15, z: -20 },
    { x: -15, z: -20 },
    { x: 22, z: -10 },
    { x: -22, z: -10 },
    { x: 0, z: 0 },
    { x: 18, z: 15 },
    { x: -18, z: 15 },
    { x: 0, z: 30 },
  ],
}

export const BARRICADE_CONFIG = {
  maxBoards: 6,
  repairTimePerBoard: 0.5,
  pointsPerRepair: 10,
  hitsPerBoard: 2,
  locations: [
    { id: 'barricade_1', x: -15, y: 0, z: -20, rot: 0.3 },
    { id: 'barricade_2', x: 15, y: 0, z: -20, rot: -0.2 },
    { id: 'barricade_3', x: -8, y: 0, z: 0, rot: 0.5 },
    { id: 'barricade_4', x: 10, y: 0, z: 10, rot: -0.4 },
    { id: 'barricade_5', x: -20, y: 0, z: 20, rot: 0.1 },
    { id: 'barricade_6', x: 25, y: 0, z: -5, rot: -0.3 },
  ],
} as const;

export const EXTRACTION_CONFIG = {
  unlockWave: 10,
  manualCost: 5000,
  manualMinWave: 5,
  duration: 30, // seconds
  helipadRadius: 12,
  helipadPos: { x: 0, y: 0, z: 50 },
  spawnMultiplier: 3.0,
  bonusPoints: 5000,
} as const;

export const PAP_WEAPON_VARIANTS: Record<string, { name: string; damageBonus: number; effect: string; color: string }> = {
  ak47: { name: "AK-117 Inferno", damageBonus: 1.5, effect: "fire_dot", color: "#ff4500" },
  m4a1: { name: "M4A4 Hellfire", damageBonus: 1.5, effect: "explosive", color: "#ff8c00" },
  awp: { name: "AWP Thunderbolt", damageBonus: 1.5, effect: "chain_lightning", color: "#00bfff" },
  mp5: { name: "MP5-K Venom", damageBonus: 1.5, effect: "poison_dot", color: "#32cd32" },
  deagle: { name: "Deagle Apocalypse", damageBonus: 1.5, effect: "pierce", color: "#9932cc" },
};

export interface NavNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
}

export const NAVMESH_NODES: NavNode[] = [
  // Safe House
  { id: "sh_inside", x: 0, z: -40, neighbors: ["sh_east", "sh_west"] },
  { id: "sh_east", x: 15, z: -35, neighbors: ["sh_inside", "courtyard_s", "barricade_1"] },
  { id: "sh_west", x: -15, z: -35, neighbors: ["sh_inside", "courtyard_s", "barricade_2"] },

  // Courtyard & Wings
  { id: "courtyard_s", x: 0, z: -20, neighbors: ["sh_east", "sh_west", "courtyard_c", "barricade_3"] },
  { id: "courtyard_c", x: 0, z: 0, neighbors: ["courtyard_s", "courtyard_n", "east_wing", "west_wing", "mystery_box"] },
  { id: "courtyard_n", x: 0, z: 20, neighbors: ["courtyard_c", "helipad_s", "barricade_4", "barricade_5"] },
  { id: "mystery_box", x: 0, z: 5, neighbors: ["courtyard_c"] },

  { id: "east_wing", x: 20, z: -10, neighbors: ["courtyard_c", "tower"] },
  { id: "west_wing", x: -20, z: -10, neighbors: ["courtyard_c", "bunker"] },
  { id: "tower", x: 25, z: 20, neighbors: ["east_wing", "courtyard_n"] },
  { id: "bunker", x: -25, z: 20, neighbors: ["west_wing", "courtyard_n"] },

  // Helipad
  { id: "helipad_s", x: 0, z: 35, neighbors: ["courtyard_n", "helipad_c"] },
  { id: "helipad_c", x: 0, z: 50, neighbors: ["helipad_s"] },

  // Barricades
  { id: "barricade_1", x: -15, z: -20, neighbors: ["sh_west", "courtyard_s"] },
  { id: "barricade_2", x: 15, z: -20, neighbors: ["sh_east", "courtyard_s"] },
  { id: "barricade_3", x: -8, z: 0, neighbors: ["courtyard_s", "courtyard_c"] },
  { id: "barricade_4", x: 10, z: 10, neighbors: ["courtyard_n", "tower"] },
  { id: "barricade_5", x: -20, z: 20, neighbors: ["courtyard_n", "bunker"] },
  { id: "barricade_6", x: 25, z: -5, neighbors: ["east_wing", "sh_east"] },
];

