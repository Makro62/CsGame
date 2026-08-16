import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useZombieStore } from "../../stores/useZombieStore";
import { BARRICADE_CONFIG } from "@cs-game/shared";

function SingleBarricade({
  x,
  y,
  z,
  rot,
  boards,
}: {
  x: number;
  y: number;
  z: number;
  rot: number;
  boards: number;
}) {
  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8b5a2b",
        roughness: 0.9,
        metalness: 0.05,
      }),
    []
  );

  const postMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5c3a1e",
        roughness: 0.95,
        metalness: 0.0,
      }),
    []
  );

  // 6 planks vertically stacked
  const plankHeights = [0.2, 0.45, 0.7, 0.95, 1.2, 1.45];

  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* Vertical Side Posts */}
      <mesh position={[-1.3, 0.8, 0]} material={postMat}>
        <boxGeometry args={[0.18, 1.6, 0.18]} />
      </mesh>
      <mesh position={[1.3, 0.8, 0]} material={postMat}>
        <boxGeometry args={[0.18, 1.6, 0.18]} />
      </mesh>

      {/* Horizontal Planks (rendered based on active board count) */}
      {plankHeights.slice(0, boards).map((py, i) => (
        <mesh key={i} position={[0, py, (i % 2 === 0 ? 0.04 : -0.04)]} material={woodMat}>
          <boxGeometry args={[2.8, 0.18, 0.08]} />
        </mesh>
      ))}

      {/* Boards UI label if damaged */}
      {boards < 6 && (
        <Html position={[0, 1.9, 0]} center distanceFactor={20}>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.75)",
              border: boards === 0 ? "1px solid #ef4444" : "1px solid #f59e0b",
              borderRadius: "4px",
              padding: "2px 6px",
              color: boards === 0 ? "#ef4444" : "#fbbf24",
              fontSize: "11px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {boards === 0 ? "BROKEN (0/6)" : `Boards: ${boards}/6`}
          </div>
        </Html>
      )}
    </group>
  );
}

export function InteractiveBarricades() {
  const barricades = useZombieStore((s) => s.barricades);

  // Build lookup map or fallback to defaults
  const barricadeMap = useMemo(() => {
    const map = new Map<string, number>();
    barricades.forEach((b) => map.set(b.id, b.boards));
    return map;
  }, [barricades]);

  return (
    <group>
      {BARRICADE_CONFIG.locations.map((loc) => {
        const boards = barricadeMap.get(loc.id) ?? 6;
        return (
          <SingleBarricade
            key={loc.id}
            x={loc.x}
            y={loc.y}
            z={loc.z}
            rot={loc.rot}
            boards={boards}
          />
        );
      })}
    </group>
  );
}
