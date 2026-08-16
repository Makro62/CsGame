// ============================================================================
// Zombie Mode Leaderboard (localStorage based)
// ============================================================================

export interface LeaderboardEntry {
  name: string;
  wave: number;
  kills: number;
  score: number;
  date: string;
}

const STORAGE_KEY = "zombie_leaderboard";
const MAX_ENTRIES = 10;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function addToLeaderboard(entry: Omit<LeaderboardEntry, "date">): LeaderboardEntry[] {
  const board = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    date: new Date().toISOString(),
  };

  board.push(newEntry);
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, MAX_ENTRIES);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearLeaderboard(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function calculateScore(wave: number, kills: number, headshots: number): number {
  const waveScore = wave * 1000;
  const killScore = kills * 10;
  const headshotBonus = headshots * 25;
  return waveScore + killScore + headshotBonus;
}
