// @ts-nocheck
// Offline stub — renders bots from Offline5v5Store instead of network
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MinecraftCharacter } from "./MinecraftCharacter";
import { useOffline5v5Store } from "../../screens/Offline5v5Store";

export function RemotePlayers() {
  const groupRef = useRef<THREE.Group>(null);
  // Simple snapshot; real rendering is done by individual meshes per bot
  return (
    <group ref={groupRef}>
      <OfflineBots />
    </group>
  );
}

function OfflineBots() {
  const players = useOffline5v5Store(s => s.players);
  // Render each bot as MinecraftCharacter at their position
  const bots = Array.from(players.values()).filter(p => p.id !== "local");
  return (
    <>
      {bots.map(bot => (
        <group key={bot.id} position={[bot.x, 0, bot.z]} rotation={[0, bot.rotationY, 0]}>
          <MinecraftCharacter team={bot.team as "T"|"CT"} isDead={bot.isDead} holdWeapon />
        </group>
      ))}
    </>
  );
}
