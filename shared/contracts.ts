/**
 * Shared Contracts
 * Based on patterns from TOSIOS
 *
 * Type definitions for client-server communication.
 * Ensures type safety across the network boundary.
 */

// ─── Input Types ────────────────────────────────────────────────
export interface InputState {
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

// ─── Server Response Types ──────────────────────────────────────
export interface ServerSnapshot {
  seq: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  health: number
  armor: number
  weapon: string
  grounded: boolean
  timestamp: number
}

export interface ServerEvent {
  type: 'hit' | 'kill' | 'death' | 'buy' | 'round_start' | 'round_end' | 'bomb_plant' | 'bomb_defuse' | 'bomb_explode'
  data: Record<string, any>
  timestamp: number
}

// ─── Game State Types ───────────────────────────────────────────
export interface PlayerState {
  id: string
  nickname: string
  team: 'ct' | 't' | 'spectator'
  x: number
  y: number
  z: number
  rotationY: number
  health: number
  armor: number
  weapon: string
  alive: boolean
  money: number
  kills: number
  deaths: number
  assists: number
}

export interface GameState {
  mode: 'deathmatch' | 'demolition' | 'hostage'
  round: number
  maxRounds: number
  timeLeft: number
  phase: 'warmup' | 'live' | 'freeze' | 'ended'
  ctScore: number
  tScore: number
  bombPlanted: boolean
  bombSite: 'A' | 'B' | null
  players: Map<string, PlayerState>
}

export interface RoundState {
  number: number
  timeLeft: number
  phase: 'buy' | 'active' | 'end'
  winner: 'ct' | 't' | null
  winReason: 'elimination' | 'bomb' | 'time' | null
}

// ─── Weapon Types ───────────────────────────────────────────────
export interface WeaponState {
  id: string
  type: 'primary' | 'secondary' | 'knife' | 'grenade'
  ammo: number
  reserve: number
  clipSize: number
  firing: boolean
  reloading: boolean
}

// ─── Network Protocol ───────────────────────────────────────────
export type MessageType =
  | 'input'
  | 'snapshot'
  | 'event'
  | 'player_join'
  | 'player_leave'
  | 'game_state'
  | 'round_state'
  | 'buy_weapon'
  | 'chat'
  | 'ping'

export interface NetworkMessage {
  type: MessageType
  data: any
  timestamp: number
}

// ─── Constants ──────────────────────────────────────────────────
export const TICK_RATE = 20 // Server tick rate in Hz
export const MAX_PLAYERS = 10
export const ROUND_TIME = 115 // seconds
export const FREEZE_TIME = 15 // seconds
export const BUY_TIME = 20 // seconds
export const BOMB_TIMER = 40 // seconds

export const WEAPON_STATS = {
  deagle: { damage: 63, fireRate: 260, reloadTime: 2200, clipSize: 7, price: 700 },
  ak47: { damage: 36, fireRate: 100, reloadTime: 2400, clipSize: 30, price: 2700 },
  m4a4: { damage: 33, fireRate: 90, reloadTime: 3100, clipSize: 30, price: 3100 },
  awp: { damage: 115, fireRate: 1500, reloadTime: 3700, clipSize: 5, price: 4750 },
  usp: { damage: 35, fireRate: 170, reloadTime: 2200, clipSize: 12, price: 200 },
  glock: { damage: 30, fireRate: 150, reloadTime: 2200, clipSize: 20, price: 200 },
  knife: { damage: 40, fireRate: 400, reloadTime: 0, clipSize: Infinity, price: 0 },
  grenade: { damage: 98, fireRate: 0, reloadTime: 0, clipSize: 1, price: 300 },
} as const

// ─── Helper Types ───────────────────────────────────────────────
export type Team = 'ct' | 't' | 'spectator'
export type GameMode = 'deathmatch' | 'demolition' | 'hostage'
export type WeaponKey = keyof typeof WEAPON_STATS
