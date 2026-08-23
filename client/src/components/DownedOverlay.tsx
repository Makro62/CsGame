import { useZombieStore } from "../stores/useZombieStore";

export function DownedOverlay() {
  const player = useZombieStore(s => s.player);
  if (!player.isDowned) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      <div className="text-red-500 text-6xl font-bold animate-pulse mb-4">DOWNED</div>
      <div className="text-white text-2xl mb-2">Revive in: {Math.ceil(player.downedTimer)}s</div>
      {player.reviveProgress > 0 && (
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all" style={{width: `${player.reviveProgress*100}%`}} />
        </div>
      )}
      <div className="text-gray-300 mt-4 text-sm">Hold [F] to revive yourself (costs 500 points)</div>
    </div>
  );
}
