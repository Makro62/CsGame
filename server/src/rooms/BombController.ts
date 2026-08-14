import {
  GameState,
  PlayerState,
  ROUND,
  BOMB_SITES,
} from "@cs-game/shared";

export class BombController {
  bombCarrierId: string | null = null;
  droppedBombPos: { x: number; y: number; z: number } | null = null;
  bombTimerId: ReturnType<typeof setTimeout> | null = null;

  processPlanting(
    state: GameState,
    tickRate: number,
    onPlantComplete: (sessionId: string, player: PlayerState) => void
  ): void {
    state.players.forEach((player, id) => {
      if (!player.isPlanting) return;
      player.plantProgress += 1 / tickRate;
      if (player.plantProgress >= ROUND.plantDuration) {
        onPlantComplete(id, player);
      }
    });
  }

  completePlant(
    sessionId: string,
    player: PlayerState,
    state: GameState,
    findNearestBombSite: (player: PlayerState) => string,
    broadcast: (type: string, message: any) => void,
    onPlantBonus: (player: PlayerState) => void
  ): void {
    player.isPlanting = false;
    player.plantProgress = 0;
    player.hasBomb = false;
    this.bombCarrierId = null;
    this.droppedBombPos = null;

    state.bombPlanted = true;
    state.bombTimeLeft = ROUND.bombTimer;
    state.bombSite = findNearestBombSite(player);

    onPlantBonus(player);

    broadcast("bombPlanted", {
      planterId: sessionId,
      site: state.bombSite,
      bombTimeLeft: state.bombTimeLeft,
    });
  }

  cancelPlant(
    sessionId: string,
    player: PlayerState,
    broadcast: (type: string, message: any) => void
  ): void {
    player.isPlanting = false;
    player.plantProgress = 0;
    broadcast("plantCancel", { playerId: sessionId });
  }

  processDefusing(
    state: GameState,
    tickRate: number,
    onDefuseComplete: (sessionId: string, player: PlayerState) => void
  ): void {
    state.players.forEach((player, id) => {
      if (!player.isDefusing) return;
      player.defuseProgress += 1 / tickRate;
      const defuseTime = player.hasDefuseKit ? ROUND.defuseKitDuration : ROUND.defuseDuration;
      if (player.defuseProgress >= defuseTime) {
        onDefuseComplete(id, player);
      }
    });
  }

  completeDefuse(
    sessionId: string,
    player: PlayerState,
    state: GameState,
    onDefuseBonus: (player: PlayerState) => void,
    broadcast: (type: string, message: any) => void,
    endRound: (winner: "T" | "CT") => void
  ): void {
    player.isDefusing = false;
    player.defuseProgress = 0;

    state.bombPlanted = false;
    state.bombTimeLeft = 0;
    state.bombSite = "";

    onDefuseBonus(player);

    broadcast("bombDefused", { defuserId: sessionId });
    endRound("CT");
  }

  cancelDefuse(
    sessionId: string,
    player: PlayerState,
    broadcast: (type: string, message: any) => void
  ): void {
    player.isDefusing = false;
    player.defuseProgress = 0;
    broadcast("defuseCancel", { playerId: sessionId });
  }

  bombExplode(
    state: GameState,
    broadcast: (type: string, message: any) => void,
    endRound: (winner: "T" | "CT") => void
  ): void {
    state.bombPlanted = false;
    state.bombTimeLeft = 0;
    state.bombSite = "";

    broadcast("bombExploded", {});
    endRound("T");
  }

  dropBomb(player: PlayerState): void {
    this.bombCarrierId = null;
    this.droppedBombPos = { x: player.x, y: player.y, z: player.z };
    player.hasBomb = false;
  }

  findNearestBombSite(player: PlayerState): string {
    let nearest = "";
    let minDist = Infinity;
    for (const [name, site] of Object.entries(BOMB_SITES)) {
      const dx = player.x - site.x;
      const dz = player.z - site.z;
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        nearest = name;
      }
    }
    return nearest;
  }

  startBombTimer(
    onExplode: () => void
  ): void {
    if (this.bombTimerId) clearTimeout(this.bombTimerId);
    this.bombTimerId = setTimeout(() => {
      this.bombTimerId = null;
      onExplode();
    }, 40000);
  }

  stopBombTimer(): void {
    if (this.bombTimerId) {
      clearTimeout(this.bombTimerId);
      this.bombTimerId = null;
    }
  }

  clear(): void {
    this.bombCarrierId = null;
    this.droppedBombPos = null;
    this.stopBombTimer();
  }
}
