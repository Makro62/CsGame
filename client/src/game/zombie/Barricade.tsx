import { useZombieStore } from "../../stores/useZombieStore";

export function Barricade({ id, x, z }: { id: string; x: number; z: number }) {
  const b = useZombieStore(s => s.barricades.find(bar => bar.id === id));
  if (!b) return null;
  const ratio = b.planks / b.maxPlanks;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[2.2, 2.4, 0.2]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      {Array.from({length: b.maxPlanks}).map((_, i) => {
        const row = Math.floor(i/3), col = i%3;
        return (
          <mesh key={i} position={[(col-1)*0.65, 0.5+row*0.7, 0.15]} visible={i < b.planks}>
            <boxGeometry args={[0.6, 0.15, 0.05]} />
            <meshStandardMaterial color={ratio>0.5 ? "#8B6914" : "#5C4033"} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
