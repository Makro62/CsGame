import { useZombieStore } from "../stores/useZombieStore";

export function DownedOverlay() {
  const player = useZombieStore(s => s.player);
  if (!player.isDowned) return null;
  const canRevive = player.soloRevivesLeft > 0;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      <div className="text-red-500 text-6xl font-bold animate-pulse mb-4">DOWNED</div>
      <div className="text-white text-2xl mb-2">Bleedout: {Math.ceil(player.downedTimer)}s</div>
      {canRevive && (
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-green-500 transition-all" style={{width: `${player.reviveProgress * 100}%`}} />
        </div>
      )}
      <div className="text-gray-300 mt-2 text-sm">
        {canRevive
          ? "Tahan [F] untuk bangkit (1x per wave)"
          : "Bleedout — game over jika timer habis"}
      </div>
    </div>
  );
}
