import mitt from 'mitt'

export type GameEvents = {
  nadeThrown: { id: string; type: string; throwerId: string; x: number; y: number; z: number; vx: number; vy: number; vz: number }
  nadeDetonated: { id: string; type: string; x: number; y: number; z: number }
  flashbang: { x: number; y: number; z: number; throwerId: string }
  radioCommand: { sessionId: string; command: string; nickname: string }
  playerReconnected: { sessionId: string; nickname: string }
  botShoot: { botId: string; isHeadshot: boolean; damage: number }
  targetDamaged: { id: string; damage: number; isHeadshot: boolean; isDead: boolean; newHp: number }
}

export const gameEvents = mitt<GameEvents>()
