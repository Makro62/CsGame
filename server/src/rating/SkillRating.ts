/**
 * Skill Rating System (ELO-like)
 * Based on patterns from competitive FPS games
 */

export interface RatingResult {
  newRating: number
  ratingChange: number
  performanceBonus: number
}

export interface MatchStats {
  totalMatches: number
  kills: number
  deaths: number
  headshots: number
  shotsHit: number
  isMVP: boolean
  result: "win" | "loss" | "draw"
}

type RankTier = "unranked" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master"

export class SkillRatingSystem {
  private readonly K_FACTOR_BASE = 32
  private readonly K_FACTOR_NEWBIE = 64
  private readonly RATING_FLOOR = 0
  private readonly RATING_CEILING = 3000

  calculateRatingChange(
    playerRating: number,
    opponentRating: number,
    result: "win" | "loss" | "draw",
    playerStats: MatchStats,
    matchDuration: number
  ): RatingResult {
    const expectedScore = this.expectedOutcome(playerRating, opponentRating)
    const actualScore = result === "win" ? 1 : result === "draw" ? 0.5 : 0
    const kFactor =
      playerStats.totalMatches < 10 ? this.K_FACTOR_NEWBIE : this.K_FACTOR_BASE
    const performanceBonus = this.calculatePerformanceBonus(playerStats, matchDuration)
    const ratingChange = Math.round(
      kFactor * (actualScore - expectedScore) + performanceBonus
    )
    const newRating = Math.max(
      this.RATING_FLOOR,
      Math.min(this.RATING_CEILING, playerRating + ratingChange)
    )
    return { newRating, ratingChange, performanceBonus }
  }

  private expectedOutcome(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  }

  private calculatePerformanceBonus(stats: MatchStats, duration: number): number {
    let bonus = 0
    const kdr = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills
    if (kdr >= 3) bonus += 5
    else if (kdr >= 2) bonus += 3
    const hsRate =
      stats.shotsHit > 0 ? stats.headshots / stats.shotsHit : 0
    if (hsRate >= 0.5) bonus += 3
    else if (hsRate >= 0.3) bonus += 1
    if (stats.isMVP) bonus += 5
    if (duration < 600 && stats.result === "win") bonus += 2
    return bonus
  }

  getRankTier(rating: number): RankTier {
    if (rating >= 2500) return "master"
    if (rating >= 2200) return "diamond"
    if (rating >= 1900) return "platinum"
    if (rating >= 1600) return "gold"
    if (rating >= 1300) return "silver"
    if (rating >= 1000) return "bronze"
    return "unranked"
  }

  getRankColor(tier: RankTier): string {
    const colors: Record<RankTier, string> = {
      unranked: "#6b7280",
      bronze: "#cd7f32",
      silver: "#c0c0c0",
      gold: "#ffd700",
      platinum: "#00d4ff",
      diamond: "#b9f2ff",
      master: "#ff6b35",
    }
    return colors[tier]
  }
}
