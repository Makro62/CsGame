import { SURVIVAL_OBSTACLES } from "./survivalLayout";

const WALL_H = 3.2;
const CRATE_H = 1.15;

function aabbMesh(obs: (typeof SURVIVAL_OBSTACLES)[number], key: number) {
  const w = obs.maxX - obs.minX;
  const d = obs.maxZ - obs.minZ;
  const h = obs.kind === "crate" ? CRATE_H : WALL_H;
  const cx = (obs.minX + obs.maxX) / 2;
  const cz = (obs.minZ + obs.maxZ) / 2;
  const color = obs.kind === "crate" ? "#8a5a28" : "#4a5560";
  return (
    <mesh key={key} position={[cx, h / 2, cz]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={obs.kind === "crate" ? 0.85 : 0.7} metalness={obs.kind === "crate" ? 0.05 : 0.25} />
    </mesh>
  );
}

export function SurvivalArena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1c2418" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[54, 54]} />
        <meshStandardMaterial color="#2a3324" roughness={0.88} />
      </mesh>
      {/* Center plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[8.4, 8.4]} />
        <meshStandardMaterial color="#3a3328" roughness={0.8} />
      </mesh>
      {SURVIVAL_OBSTACLES.map((obs, i) => aabbMesh(obs, i))}
      <pointLight position={[0, 8, 0]} intensity={1.4} distance={28} color="#c8b090" />
      <pointLight position={[-16, 6, -16]} intensity={0.9} distance={18} color="#88aa77" />
      <pointLight position={[16, 6, -16]} intensity={0.9} distance={18} color="#88aa77" />
      <pointLight position={[-16, 6, 16]} intensity={0.9} distance={18} color="#aa8866" />
      <pointLight position={[16, 6, 16]} intensity={0.9} distance={18} color="#aa8866" />
    </group>
  );
}
