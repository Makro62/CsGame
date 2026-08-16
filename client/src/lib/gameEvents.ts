import mitt from 'mitt'
import type { BuyFailReason } from '@cs-game/shared'

export type GameEvents = {
  nadeThrown: { id: string; type: string; throwerId: string; x: number; y: number; z: number; vx: number; vy: number; vz: number }
  nadeDetonated: { id: string; type: string; x: number; y: number; z: number }
  flashbang: { x: number; y: number; z: number; throwerId: string }
  radioCommand: { sessionId: string; command: string; nickname: string }
  playerReconnected: { sessionId: string; nickname: string }
  botShoot: { botId: string; isHeadshot: boolean; damage: number }
  targetDamaged: { id: string; damage: number; isHeadshot: boolean; isDead: boolean; newHp: number }
  bulletImpact: { x: number; y: number; z: number; nx: number; ny: number; nz: number; distance: number }
  /** `akimboSide` is 1 for the right hand, -1 for the left one. */
  weaponFired: { weapon: string; akimboSide: 1 | -1 }
  buyResult: { item: string; ok: boolean; reason?: BuyFailReason }
  ffVoteStarted: { initiatorId: string; initiatorName: string; team: string }
  forfeitAccepted: { surrenderedTeam: string; winner: string }
}

export const gameEvents = mitt<GameEvents>()
