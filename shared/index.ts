// OFFLINE BUILD v4.1 — plain TS types only (Colyseus Schema removed)

// ─── Player State ───────────────────────────────────────────────
// NOTE: @colyseus/schema 2.0.37 fails to encode fields declared as JS
// class fields (e.g. `x: number = 0`). All fields must be initialized
// in the constructor instead.
export class PlayerState {
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
  dualWield: boolean
  isUsingMysteryBox: boolean
  isDowned: boolean
  downedTimer: number
  downedBy: string
  isReviving: boolean
  reviveProgress: number
  reviveTargetId: string

  constructor() {
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
    this.dualWield = false
    this.isUsingMysteryBox = false
    this.isDowned = false
    this.downedTimer = 0
    this.downedBy = ''
    this.isReviving = false
    this.reviveProgress = 0
    this.reviveTargetId = ''
  }
}


// ─── Game State ─────────────────────────────────────────────────
export class SmokeState {
  x: number
  z: number
  timeLeft: number

  constructor() {
    this.x = 0
    this.z = 0
    this.timeLeft = 15
  }
}


// ─── Zombie State ───────────────────────────────────────────────
export type ZombieType = 'walker' | 'runner' | 'tank' | 'spitter' | 'boss' | 'exploder'

export class ZombieState {
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


// ─── Barricade State ───────────────────────────────────────────
export class BarricadeState {
  id: string
  x: number
  y: number
  z: number
  rotationY: number
  boards: number
  maxBoards: number
  hp: number

  constructor() {
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


// ─── PowerUp State ──────────────────────────────────────────────
export class PowerUpState {
  id: string
  type: PowerUpType
  x: number
  y: number
  z: number
  timeLeft: number

  constructor() {
    this.id = ''
    this.type = 'max_ammo'
    this.x = 0
    this.y = 0
    this.z = 0
    this.timeLeft = 0
  }
}


export type WaveState = 'waiting' | 'buy_phase' | 'spawning' | 'active' | 'wave_clear' | 'inter_wave'

export type RoundPhase = 'buy' | 'active' | 'roundEnd' | 'matchEnd' | 'waiting'

export class GameState {
  phase: RoundPhase
  roundTimeLeft: number
  teamRedScore: number
  teamBlueScore: number
  roundNumber: number
  bombPlanted: boolean
  bombTimeLeft: number
  bombSite: string
  players: Record<string, PlayerState>
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
  playerScores: Record<string, number>
  smokes: Record<string, SmokeState>
  kothZoneX: number
  kothZoneZ: number
  kothZoneRadius: number
  kothCapturingTeam: string
  kothCaptureProgress: number
  kothScoreT: number
  kothScoreCT: number
  // Zombie survival fields
  zombies: Record<string, ZombieState>
  currentWave: number
  zombiesRemaining: number
  waveState: WaveState
  interWaveTimer: number
  points: Record<string, number>
  powerUps: Record<string, PowerUpState>
  activePowerUp: string
  powerUpTimer: number
  mysteryBoxWeapon: string
  mysteryBoxActive: boolean
  unlockedAreas: Record<string, number>
  barricades: Record<string, BarricadeState>
  extractionActive: boolean
  extractionTimer: number
  extractionAvailable: boolean
  evacSuccess: boolean

  constructor() {
    this.phase = 'waiting'
    this.roundTimeLeft = 0
    this.teamRedScore = 0
    this.teamBlueScore = 0
    this.roundNumber = 1
    this.bombPlanted = false
    this.bombTimeLeft = 0
    this.bombSite = ''
    this.players = {}
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
    this.playerScores = {}
    // Smoke grenades (authoritative, synced to late joiners)
    this.smokes = {}
    // KOTH zone position
    this.kothZoneX = 0
    this.kothZoneZ = 0
    this.kothZoneRadius = 8
    this.kothCapturingTeam = ''
    this.kothCaptureProgress = 0
    this.kothScoreT = 0
    this.kothScoreCT = 0
    // Zombie survival
    this.zombies = {}
    this.currentWave = 0
    this.zombiesRemaining = 0
    this.waveState = 'waiting'
    this.interWaveTimer = 0
    this.points = {}
    this.powerUps = {}
    this.activePowerUp = ""
    this.powerUpTimer = 0
    this.mysteryBoxWeapon = ""
    this.mysteryBoxActive = false
    this.unlockedAreas = {}
    this.barricades = {}
    this.extractionActive = false
    this.extractionTimer = 0
    this.extractionAvailable = false
    this.evacSuccess = false
  }
}


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
  slideBoost: 1.35,
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
  // Wonder Weapon (Mystery Box Exclusive)
  arccaster: {
    dmg: 40,
    headshot: 40,
    fireRate: 3.2,
    mag: 12,
    reload: 2.8,
    price: 0,
    team: 'both',
    reserveAmmo: 36,
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
    dualWieldable: true,
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
    dualWieldable: true,
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
    dualWieldable: true,
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
    dualWieldable: true,
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
  A: { x: 15, y: 0, z: -16, radius: 6 },
  B: { x: 15, y: 0, z: 16, radius: 6 },
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

// ─── Container Yard — Industrial Container Yard (5v5 Competitive) ──
// Visuals in ContainerYard.tsx are drawn from this list (center + size).
// Layout: 3 lanes (A Long, Mid, B Long), T spawn (west), CT spawn (east)
export const MAP_OBSTACLES = [
  // ─── Perimeter Walls ───
  box('wall_north', 'concrete', 0, 4, -20, 50, 8, 0.8),
  box('wall_south', 'concrete', 0, 4, 20, 50, 8, 0.8),
  box('wall_west', 'concrete', -25, 4, 0, 0.8, 8, 40),
  box('wall_east', 'concrete', 25, 4, 0, 0.8, 8, 40),

  // ─── T Spawn Area (West) ───
  // Spawn cover walls - provide safety on spawn
  box('t_spawn_wall_n', 'metal', -24.2, 1.3, -8.4, 3.4, 2.6, 4.6),
  box('t_spawn_wall_s', 'metal', -24.2, 1.3, 8.4, 3.4, 2.6, 4.6),
  // Exit peek boxes - first cover when leaving spawn
  box('t_peek_n', 'metal', -20.6, 1.3, -4.6, 1.6, 2.6, 3.2),
  box('t_peek_s', 'metal', -20.6, 1.3, 4.6, 1.6, 2.6, 3.2),

  // ─── CT Spawn Area (East) ───
  box('ct_spawn_wall_n', 'metal', 24.2, 1.3, -8.4, 3.4, 2.6, 4.6),
  box('ct_spawn_wall_s', 'metal', 24.2, 1.3, 8.4, 3.4, 2.6, 4.6),
  box('ct_peek_n', 'metal', 20.6, 1.3, -4.6, 1.6, 2.6, 3.2),
  box('ct_peek_s', 'metal', 20.6, 1.3, 4.6, 1.6, 2.6, 3.2),

  // ─── A Long Divider (North) ───
  // Long wall separating A Long from Mid
  box('a_div_west', 'metal', -12.5, 1.3, -7.5, 15, 2.6, 2.2),
  box('a_div_east', 'metal', 4.5, 1.3, -7.5, 11, 2.6, 2.2),

  // ─── B Long Divider (South) ───
  box('b_div_west', 'metal', -12.5, 1.3, 7.5, 15, 2.6, 2.2),
  box('b_div_east', 'metal', 4.5, 1.3, 7.5, 11, 2.6, 2.2),

  // ─── Mid Area - Staggered Cover ───
  // T side mid cover
  box('mid_t_wall_n', 'metal', -16, 1.05, 4.3, 5.2, 2.1, 1.7),
  box('mid_t_wall_s', 'metal', -11.5, 1.05, -4.3, 4.4, 2.1, 1.7),
  box('mid_t_box', 'wood', -7.2, 0.65, 1.35, 1.9, 1.3, 1.9),
  // Center mid cover
  box('mid_center_n', 'metal', -1.2, 1.05, 3.1, 2.6, 2.1, 2.4),
  box('mid_center_s', 'metal', 0.9, 1.05, 0.85, 2.4, 2.1, 2.1),
  // CT side mid cover
  box('mid_ct_wall_n', 'metal', 12, 1.05, 4.3, 4.4, 2.1, 1.7),
  box('mid_ct_wall_s', 'metal', 16.5, 1.05, -4.3, 5.2, 2.1, 1.7),
  box('mid_ct_box', 'wood', 7.2, 0.65, -1.35, 1.9, 1.3, 1.9),

  // ─── A Long Cover (North Lane) ───
  box('a_long_1', 'metal', -16, 1.05, -12.7, 4.6, 2.1, 1.6),
  box('a_long_2', 'metal', -6, 1.05, -16.7, 3.6, 2.1, 1.5),
  box('a_long_3', 'metal', 4, 1.05, -12.7, 4.2, 2.1, 1.6),
  box('a_ninja', 'wood', 11.2, 0.65, -17.4, 1.6, 1.3, 1.6),

  // ─── Site A Cover ───
  box('site_a_main', 'metal', 20.2, 1.3, -14.8, 2.6, 2.6, 6.2),
  box('site_a_box_1', 'wood', 14, 0.65, -13, 1.2, 1.3, 1.2),
  box('site_a_box_2', 'wood', 16, 0.65, -17, 1.2, 1.3, 1.2),

  // ─── B Long Cover (South Lane) ───
  box('b_long_1', 'metal', -16, 1.05, 12.7, 4.6, 2.1, 1.6),
  box('b_long_2', 'metal', -6, 1.05, 16.7, 3.6, 2.1, 1.5),
  box('b_long_3', 'metal', 4, 1.05, 12.7, 4.2, 2.1, 1.6),
  box('b_box', 'wood', 9.6, 0.65, 17.4, 1.6, 1.3, 1.6),

  // ─── Site B Cover ───
  box('site_b_main', 'metal', 20.2, 1.3, 14.8, 2.6, 2.6, 6.2),
  box('site_b_box_1', 'wood', 14, 0.65, 13, 1.2, 1.3, 1.2),
  box('site_b_box_2', 'wood', 16, 0.65, 17, 1.2, 1.3, 1.2),
] as const satisfies readonly MapObstacle[]

export const MAP_BOUNDARY = {
  minX: -25,
  maxX: 25,
  minZ: -20,
  maxZ: 20,
} as const

// ─── Dust Map Boundary ──────────────────────────────────────────
export const DUST_MAP_BOUNDARY = {
  minX: -28,
  maxX: 28,
  minZ: -20,
  maxZ: 20,
} as const

// ─── Callout Labels (strategic spot names) ───────────────────────
export interface MapCallout {
  id: string
  label: string
  x: number
  z: number
}

export const MAP_CALLOUTS: readonly MapCallout[] = [
  // Mid Area
  { id: 'mid', label: 'MID', x: 0, z: 0 },
  { id: 'mid_boxes', label: 'MID BOXES', x: -1, z: 2 },
  { id: 'mid_pillar', label: 'MID PILLAR', x: 0, z: 0 },

  // T Side
  { id: 't_spawn', label: 'T SPAWN', x: -25, z: 0 },
  { id: 't_mid', label: 'T MID', x: -15, z: 0 },
  { id: 't_peek', label: 'T PEEK', x: -20, z: -4 },

  // CT Side
  { id: 'ct_spawn', label: 'CT SPAWN', x: 25, z: 0 },
  { id: 'ct_rot', label: 'CT ROTATE', x: 18, z: 0 },
  { id: 'ct_peek', label: 'CT PEEK', x: 20, z: -4 },

  // A Site
  { id: 'site_a', label: 'SITE A', x: 15, z: -16 },
  { id: 'a_long', label: 'A LONG', x: -8, z: -15 },
  { id: 'a_connector', label: 'A CONN', x: -3, z: -7.5 },
  { id: 'a_ninja', label: 'A NINJA', x: 11, z: -17 },
  { id: 'a_site_boxes', label: 'A BOXES', x: 15, z: -16 },

  // B Site
  { id: 'site_b', label: 'SITE B', x: 15, z: 16 },
  { id: 'b_long', label: 'B LONG', x: -8, z: 15 },
  { id: 'b_connector', label: 'B CONN', x: -3, z: 7.5 },
  { id: 'b_box', label: 'B BOX', x: 9, z: 17 },
  { id: 'b_site_boxes', label: 'B BOXES', x: 15, z: 16 },

  // Container Areas
  { id: 't_containers', label: 'T CONTAINERS', x: -22, z: 0 },
  { id: 'ct_containers', label: 'CT CONTAINERS', x: 22, z: 0 },
]

// ─── Dust Map Callouts ──────────────────────────────────────────
export const DUST_CALLOUTS: readonly MapCallout[] = [
  { id: 'dust_mid', label: 'MID', x: 0, z: 0 },
  { id: 'dust_t_spawn', label: 'T SPAWN', x: -25, z: 0 },
  { id: 'dust_ct_spawn', label: 'CT SPAWN', x: 25, z: 0 },
  { id: 'dust_site_a', label: 'SITE A', x: 0, z: -18 },
  { id: 'dust_a_platform', label: 'A PLATFORM', x: -5, z: -18 },
  { id: 'dust_a_cover', label: 'A COVER', x: 0, z: -14 },
  { id: 'dust_site_b', label: 'SITE B', x: 0, z: 18 },
  { id: 'dust_b_platform', label: 'B PLATFORM', x: 0, z: 18 },
  { id: 'dust_b_cover', label: 'B COVER', x: 0, z: 14 },
  { id: 'dust_mid_pillar_n', label: 'PILLAR N', x: -5, z: 0 },
  { id: 'dust_mid_pillar_s', label: 'PILLAR S', x: 5, z: 0 },
  { id: 'dust_mid_boxes', label: 'MID BOXES', x: -4, z: 4 },
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
export type PowerUpType = "max_ammo" | "nuke" | "insta_kill" | "double_points" | "speed_cola" | "juggernog";

export const POWER_UPS: Record<PowerUpType, { duration: number; description: string }> = {
  max_ammo: { duration: 0, description: "Full ammo for all players" },
  nuke: { duration: 0, description: "Kill all zombies on screen" },
  insta_kill: { duration: 30, description: "One-hit kills for 30s" },
  double_points: { duration: 30, description: "2x points for 30s" },
  speed_cola: { duration: 30, description: "Faster reload for 30s" },
  juggernog: { duration: 30, description: "50% damage reduction for 30s" },
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
    "arccaster",
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
    arccaster: 4,
  },
} as const;

// ─── Pack-a-Punch ──────────────────────────────────────────────
export const PACK_A_PUNCH = {
  price: 5000,
  upgradeMultiplier: 1.5, // 1.5x damage
  extraAmmoMultiplier: 2.0, // 2x magazine + reserve after upgrade
  allowedWeapons: ["ak47", "m4a1", "mp5", "awp", "deagle", "glock", "tec9", "autopistol", "arccaster"] as const,
  /** After Pack-a-Punch, pistol-class weapons become dual-wield. */
  dualWieldWeapons: ["deagle", "glock", "tec9", "autopistol"] as const,
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

/** Opening bank so wave-1 players can afford an SMG before the first horde. */
export const ZOMBIE_STARTING_POINTS = 1000;

/** Safe House med station: hold F to restore HP to max. */
export const MED_STATION = {
  price: 400,
  channelSec: 2.5,
  x: 0,
  z: -36,
} as const;

/** World wall-buys. Prices come from ZOMBIE_SHOP.weaponPrices. */
export const WALL_BUYS: { weapon: string; x: number; z: number }[] = [
  { weapon: "mp5", x: 8, z: -40 },
  { weapon: "ak47", x: 25, z: -15 },
  { weapon: "awp", x: 25, z: 25 },
];

export const AMMO_CRATE_POSITIONS: { x: number; z: number }[] = [
  { x: -5, z: -33 },
  { x: 5, z: -33 },
  { x: 0, z: -37 },
];

export const PERK_MACHINE_POSITIONS: { perk: ZombiePerkId; x: number; z: number }[] = [
  { perk: "juggernog", x: -8, z: -32 },
  { perk: "speedcola", x: 8, z: -32 },
  { perk: "quickrevive", x: -12, z: -35 },
  { perk: "doubletap", x: 12, z: -35 },
];

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

export const ZOMBIE_TYPES: Record<ZombieType, { hp: number; speed: number; damage: number; color: number; scale: number }> = {
  walker:   { hp: 100, speed: 2.5, damage: 15, color: 0x4a6741, scale: 0.9 },
  runner:   { hp: 60,  speed: 5.0, damage: 10, color: 0x8b4513, scale: 0.75 },
  tank:     { hp: 400, speed: 1.5, damage: 30, color: 0x2c2c2c, scale: 1.3 },
  spitter:  { hp: 80,  speed: 2.0, damage: 12, color: 0x9acd32, scale: 0.85 },
  exploder: { hp: 150, speed: 1.8, damage: 0,  color: 0xc9d94a, scale: 1.1 },
  boss:     { hp: 8000, speed: 2.8, damage: 60, color: 0x8b0000, scale: 2.2 },
}

export const WAVE_CONFIG = {
  baseZombieCount: 10,
  zombiesPerWave: 5,
  interWaveTime: 5,       // seconds between waves (wave clear display)
  interWaveMinTime: 3,    // minimum wave clear time
  spawnDuration: 10,      // seconds to spawn all zombies in a wave
  buyPhaseDuration: 15,   // seconds to buy weapons between waves
  firstWaveDelay: 20,     // seconds before first wave starts (initial buy phase)
  hpMultiplierPerWave: 0.16,
  damageMultiplierPerWave: 0.06,
  speedBonusPerWave: 0.03,
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
    exploder: 4,
    tank: 5,
    spitter: 7,
    boss: 10,
  },
  // Special spawn chances (cumulative per wave)
  specialChances: {
    runner: 0.40,
    exploder: 0.15,
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
  exploder: 80,
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
  helipad: { x: 0, y: 0, z: 30, radius: 12 },
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
    { id: 'b_start', x: 0, y: 0, z: -25, rot: 0 },
    { id: 'b1', x: -5, y: 0, z: -10, rot: 0 },
    { id: 'b2', x: 5, y: 0, z: -10, rot: 0 },
    { id: 'b3', x: -10, y: 0, z: 0, rot: 1.57 },
    { id: 'b4', x: 10, y: 0, z: 0, rot: 1.57 },
    { id: 'b_finish', x: 0, y: 0, z: 25, rot: 0 },
  ],
} as const;

export const EXTRACTION_CONFIG = {
  unlockWave: 10,
  manualCost: 5000,
  manualMinWave: 5,
  duration: 30, // seconds
  helipadRadius: 12,
  helipadPos: { x: 0, y: 0, z: 30 },
  spawnMultiplier: 3.0,
  bonusPoints: 5000,
} as const;

export const PAP_WEAPON_VARIANTS: Record<string, { name: string; damageBonus: number; effect: string; color: string }> = {
  ak47: { name: "AK-117 Inferno", damageBonus: 1.5, effect: "fire_dot", color: "#ff4500" },
  m4a1: { name: "M4A4 Hellfire", damageBonus: 1.5, effect: "explosive", color: "#ff8c00" },
  awp: { name: "AWP Thunderbolt", damageBonus: 1.5, effect: "chain_lightning", color: "#00bfff" },
  mp5: { name: "MP5-K Venom", damageBonus: 1.5, effect: "poison_dot", color: "#32cd32" },
  deagle: { name: "Deagle Apocalypse", damageBonus: 1.5, effect: "pierce", color: "#9932cc" },
  glock: { name: "Glock Radiance", damageBonus: 1.5, effect: "stun", color: "#00ffcc" },
  tec9: { name: "Tec-9 Overload", damageBonus: 1.5, effect: "fire_dot", color: "#ff6347" },
  autopistol: { name: "Auto Pistol Venom", damageBonus: 1.5, effect: "poison_dot", color: "#7cfc00" },
  arccaster: { name: "Arc Caster Overcharge", damageBonus: 1.5, effect: "chain_lightning", color: "#00ffff" },
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
  { id: "helipad_s", x: 0, z: 25, neighbors: ["courtyard_n", "helipad_c"] },
  { id: "helipad_c", x: 0, z: 30, neighbors: ["helipad_s"] },

  // Barricades
  { id: "barricade_1", x: -15, z: -20, neighbors: ["sh_west", "courtyard_s"] },
  { id: "barricade_2", x: 15, z: -20, neighbors: ["sh_east", "courtyard_s"] },
  { id: "barricade_3", x: -8, z: 0, neighbors: ["courtyard_s", "courtyard_c"] },
  { id: "barricade_4", x: 10, z: 10, neighbors: ["courtyard_n", "tower"] },
  { id: "barricade_5", x: -20, z: 20, neighbors: ["courtyard_n", "bunker"] },
  { id: "barricade_6", x: 25, z: -5, neighbors: ["east_wing", "sh_east"] },
];

// ─── Competitive Map NavMesh (Container Yard) ────────────────────
export const NAVMESH_COMPETITIVE: NavNode[] = [
  // T Spawn area
  { id: "t_spawn", x: -25, z: 0, neighbors: ["t_mid_approach", "t_b_upper", "t_b_lower"] },

  // T approach to Mid
  { id: "t_mid_approach", x: -15, z: 0, neighbors: ["t_spawn", "mid_barrels", "t_a_connector"] },

  // Mid Lane
  { id: "mid_barrels", x: -14, z: 0, neighbors: ["t_mid_approach", "mid_box", "mid_sniper_peek"] },
  { id: "mid_box", x: 0, z: 0, neighbors: ["mid_barrels", "mid_sniper_peek", "a_mid_link", "b_mid_link"] },
  { id: "mid_sniper_peek", x: 12, z: 0, neighbors: ["mid_box", "ct_mid_hold"] },

  // CT Mid Hold
  { id: "ct_mid_hold", x: 18, z: 0, neighbors: ["mid_sniper_peek", "ct_spawn"] },

  // CT Spawn area
  { id: "ct_spawn", x: 25, z: 0, neighbors: ["ct_mid_hold", "ct_a_site", "ct_b_site"] },

  // A Site (North, z ≈ -15)
  { id: "a_main_choke", x: -5, z: -15, neighbors: ["t_a_connector", "a_corridor"] },
  { id: "t_a_connector", x: -8, z: -8, neighbors: ["t_mid_approach", "a_main_choke"] },
  { id: "a_corridor", x: 2, z: -13, neighbors: ["a_main_choke", "a_site_plant"] },
  { id: "a_site_plant", x: 15, z: -15, neighbors: ["a_corridor", "a_ninja", "ct_a_site"] },
  { id: "a_ninja", x: 10, z: -18, neighbors: ["a_site_plant"] },
  { id: "ct_a_site", x: 22, z: -15, neighbors: ["a_site_plant", "ct_spawn"] },

  // B Site (South, z ≈ +15)
  { id: "t_b_upper", x: -15, z: 12, neighbors: ["t_spawn", "b_tunnel_entrance"] },
  { id: "t_b_lower", x: -10, z: 18, neighbors: ["t_spawn", "b_tunnel_exit"] },
  { id: "b_tunnel_entrance", x: -8, z: 13, neighbors: ["t_b_upper", "b_tunnel_exit"] },
  { id: "b_tunnel_exit", x: -2, z: 15, neighbors: ["b_tunnel_entrance", "t_b_lower", "b_ramp", "b_mid_link"] },
  { id: "b_ramp", x: 7, z: 15, neighbors: ["b_tunnel_exit", "b_site_plant"] },
  { id: "b_site_plant", x: 15, z: 15, neighbors: ["b_ramp", "ct_b_site"] },
  { id: "ct_b_site", x: 22, z: 15, neighbors: ["b_site_plant", "ct_spawn"] },

  // Mid-to-Lane Links
  { id: "a_mid_link", x: 0, z: -8, neighbors: ["mid_box", "a_main_choke"] },
  { id: "b_mid_link", x: 0, z: 8, neighbors: ["mid_box", "b_tunnel_exit"] },
];

