/**
 * ProgressStore — In-memory player progress tracking
 * TODO: [Roadmap Feature] Diintegrasikan ke GameRoom saat fitur Ranked Match & Profile Persistence diaktifkan
 * For production, replace with SQLite/Redis persistence
 */

export interface PlayerRecord {
  id: string
  nickname: string
  skillRating: number
  rankTier: string
  totalPlaytime: number
  totalMatches: number
  wins: number
  losses: number
  kills: number
  deaths: number
  headshots: number
  kdr: number
  winRate: number
  weapons: WeaponStats[]
  createdAt: number
  lastLogin: number
}

export interface WeaponStats {
  weapon: string
  kills: number
  shotsFired: number
  shotsHit: number
  headshots: number
  totalDamage: number
}

export interface MatchRecord {
  matchId: string
  gameMode: string
  result: "win" | "loss" | "draw"
  team: string
  kills: number
  deaths: number
  headshots: number
  damageDealt: number
  duration: number
}

export interface LeaderboardEntry {
  playerId: string
  nickname: string
  gameMode: string
  wins: number
  losses: number
  kills: number
  deaths: number
  kdr: number
  winRate: number
  score: number
}

export class ProgressStore {
  private players: Map<string, PlayerRecord> = new Map()
  private matchHistory: Map<string, MatchRecord[]> = new Map()
  private leaderboard: Map<string, LeaderboardEntry[]> = new Map()

  savePlayer(playerId: string, nickname: string) {
    const existing = this.players.get(playerId)
    if (existing) {
      existing.lastLogin = Date.now()
      return
    }

    this.players.set(playerId, {
      id: playerId,
      nickname,
      skillRating: 1000,
      rankTier: "unranked",
      totalPlaytime: 0,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      headshots: 0,
      kdr: 0,
      winRate: 0,
      weapons: [],
      createdAt: Date.now(),
      lastLogin: Date.now(),
    })
  }

  saveMatchResult(playerId: string, match: MatchRecord) {
    const player = this.players.get(playerId)
    if (!player) return

    // Update player stats
    player.totalMatches++
    player.kills += match.kills
    player.deaths += match.deaths
    player.headshots += match.headshots
    player.kdr = player.deaths > 0 ? player.kills / player.deaths : player.kills

    if (match.result === "win") {
      player.wins++
    } else if (match.result === "loss") {
      player.losses++
    }
    player.winRate =
      player.totalMatches > 0 ? (player.wins / player.totalMatches) * 100 : 0

    // Store match history
    if (!this.matchHistory.has(playerId)) {
      this.matchHistory.set(playerId, [])
    }
    this.matchHistory.get(playerId)!.push(match)

    // Update leaderboard
    this.updateLeaderboard(playerId, player.nickname, match)
  }

  saveTrainingSession(
    playerId: string,
    session: {
      mode: string
      difficulty: number
      duration: number
      shotsFired: number
      shotsHit: number
      accuracy: number
      avgReactionTime: number
      recoilScore: number
    }
  ) {
    // Training sessions don't affect ranking, just stats
    const player = this.players.get(playerId)
    if (player) {
      player.totalPlaytime += session.duration
    }
  }

  updateWeaponStats(
    playerId: string,
    weapon: string,
    stats: Partial<WeaponStats>
  ) {
    const player = this.players.get(playerId)
    if (!player) return

    const existing = player.weapons.find((w) => w.weapon === weapon)
    if (existing) {
      existing.kills += stats.kills || 0
      existing.shotsFired += stats.shotsFired || 0
      existing.shotsHit += stats.shotsHit || 0
      existing.headshots += stats.headshots || 0
      existing.totalDamage += stats.totalDamage || 0
    } else {
      player.weapons.push({
        weapon,
        kills: stats.kills || 0,
        shotsFired: stats.shotsFired || 0,
        shotsHit: stats.shotsHit || 0,
        headshots: stats.headshots || 0,
        totalDamage: stats.totalDamage || 0,
      })
    }
  }

  getPlayerStats(playerId: string): PlayerRecord | null {
    return this.players.get(playerId) || null
  }

  getLeaderboard(gameMode: string, limit: number = 50): LeaderboardEntry[] {
    const entries = this.leaderboard.get(gameMode) || []
    return entries.slice(0, limit)
  }

  getMatchHistory(playerId: string, limit: number = 20): MatchRecord[] {
    return (this.matchHistory.get(playerId) || []).slice(-limit)
  }

  private updateLeaderboard(
    playerId: string,
    nickname: string,
    match: MatchRecord
  ) {
    const mode = match.gameMode
    if (!this.leaderboard.has(mode)) {
      this.leaderboard.set(mode, [])
    }
    const entries = this.leaderboard.get(mode)!
    const existing = entries.find((e) => e.playerId === playerId)

    if (existing) {
      existing.wins += match.result === "win" ? 1 : 0
      existing.losses += match.result === "loss" ? 1 : 0
      existing.kills += match.kills
      existing.deaths += match.deaths
      existing.kdr =
        existing.deaths > 0 ? existing.kills / existing.deaths : existing.kills
      const totalGames = existing.wins + existing.losses
      existing.winRate =
        totalGames > 0 ? (existing.wins / totalGames) * 100 : 0
      existing.score = existing.wins * 100 + existing.kills * 10
    } else {
      entries.push({
        playerId,
        nickname,
        gameMode: mode,
        wins: match.result === "win" ? 1 : 0,
        losses: match.result === "loss" ? 1 : 0,
        kills: match.kills,
        deaths: match.deaths,
        kdr: match.deaths > 0 ? match.kills / match.deaths : match.kills,
        winRate: match.result === "win" ? 100 : 0,
        score: (match.result === "win" ? 100 : 0) + match.kills * 10,
      })
    }

    // Sort by score
    entries.sort((a, b) => b.score - a.score)
  }
}
