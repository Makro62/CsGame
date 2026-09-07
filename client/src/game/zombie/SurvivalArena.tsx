import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { SURVIVAL_BARRICADES, getSurvivalObstacles } from "./survivalLayout";
import { BarricadeWindow } from "./interactives/BarricadeWindow";
import { useZombieStore } from "../../stores/useZombieStore";

const WALL_H = 3.2;
const CRATE_H = 1.15;
const BARREL_H = 1.0;

function makeYardTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  // Industrial concrete slab
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 0, 128, 128);

  // Subtle concrete texture noise
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const shade = Math.random() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)";
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 2, 2);
  }

  // Grid / expansion joints
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  // Subtle inner highlight
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, 124, 124);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 4;
  return tex;
}

function FlickeringNeonLight({ position, color = "#a0e8ff" }: { position: [number, number, number]; color?: string }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lightRef.current) {
        lightRef.current.intensity = Math.random() > 0.08 ? 1.6 : 0.4;
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <group position={position}>
      <pointLight ref={lightRef} color={color} distance={14} intensity={1.5} />
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function Catwalk() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 3, -10]}>
        <boxGeometry args={[12, 0.2, 3]} />
        <meshStandardMaterial color="#2a3441" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 1.5, -6]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[1.2, 3, 0.2]} />
        <meshStandardMaterial color="#3a4556" metalness={0.5} />
      </mesh>
    </group>
  );
}

function makeLabTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 128, 128);

  // Hexagonal / grid tech panel pattern
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 64, 64);
  ctx.strokeRect(64, 0, 64, 64);
  ctx.strokeRect(0, 64, 64, 64);
  ctx.strokeRect(64, 64, 64, 64);

  // Cyan circuit trace dots
  ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
  ctx.fillRect(30, 30, 4, 4);
  ctx.fillRect(94, 30, 4, 4);
  ctx.fillRect(30, 94, 4, 4);
  ctx.fillRect(94, 94, 4, 4);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 4;
  return tex;
}

function makeTarmacTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.2)";
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.anisotropy = 4;
  return tex;
}

function BlastGate({
  z,
  isOpen,
  gateNumber: _gateNumber,
  targetName: _targetName,
}: {
  z: number;
  isOpen: boolean;
  gateNumber?: number;
  targetName?: string;
}) {
  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const beaconLightRef = useRef<THREE.PointLight>(null);

  useEffect(() => {
    let raf = 0;
    const animate = () => {
      if (leftDoorRef.current && rightDoorRef.current) {
        const targetLeft = isOpen ? -6.2 : -2.2;
        const targetRight = isOpen ? 6.2 : 2.2;
        leftDoorRef.current.position.x = THREE.MathUtils.lerp(leftDoorRef.current.position.x, targetLeft, 0.08);
        rightDoorRef.current.position.x = THREE.MathUtils.lerp(rightDoorRef.current.position.x, targetRight, 0.08);
      }
      if (beaconLightRef.current) {
        beaconLightRef.current.intensity = isOpen
          ? 2.5 + Math.sin(Date.now() * 0.005) * 0.8
          : 2.2 + Math.sin(Date.now() * 0.008) * 1.2;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  return (
    <group position={[0, 0, z]}>
      {/* Heavy Gate Structural Frame */}
      {/* Left Pillar */}
      <mesh position={[-5.0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 5.0, 1.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Right Pillar */}
      <mesh position={[5.0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 5.0, 1.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top Archway Beam */}
      <mesh position={[0, 4.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.4, 1.2, 1.6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* LED Gate Sign */}
      <mesh position={[0, 4.8, 0.82]}>
        <boxGeometry args={[7.2, 0.6, 0.05]} />
        <meshStandardMaterial
          color={isOpen ? "#22c55e" : "#ef4444"}
          emissive={isOpen ? "#22c55e" : "#ef4444"}
          emissiveIntensity={2}
        />
      </mesh>

      {/* Gate Status Beacon */}
      <pointLight
        ref={beaconLightRef}
        position={[0, 5.8, 0]}
        color={isOpen ? "#4ade80" : "#ef4444"}
        distance={22}
        intensity={2.5}
      />
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.6, 12]} />
        <meshStandardMaterial
          color={isOpen ? "#4ade80" : "#ef4444"}
          emissive={isOpen ? "#4ade80" : "#ef4444"}
          emissiveIntensity={3}
        />
      </mesh>

      {/* Sliding Door Panels */}
      <mesh ref={leftDoorRef} position={[-2.2, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 4.4, 0.5]} />
        <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh ref={rightDoorRef} position={[2.2, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 4.4, 0.5]} />
        <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Security Laser Grid / Forcefield when closed */}
      {!isOpen && (
        <mesh position={[0, 2.2, 0.1]}>
          <planeGeometry args={[8.4, 4.2]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floor Guide Light Strip */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.4, 0.8]} />
        <meshBasicMaterial color={isOpen ? "#4ade80" : "#f59e0b"} transparent opacity={0.65} />
      </mesh>

      {/* Perimeter Wall Extension on left and right */}
      <mesh position={[-14, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[16.6, 4.4, 0.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[14, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[16.6, 4.4, 0.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
}

function BioLabProps() {
  return (
    <group>
      {/* Specimen Containment Tubes with glowing cyan fluid */}
      {([-10, 10] as const).map((x, i) => (
        <group key={`tube-${i}`} position={[x, 0, -22]}>
          {/* Glass Cylinder */}
          <mesh position={[0, 2.2, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 4.2, 16]} />
            <meshStandardMaterial color="#0284c7" transparent opacity={0.55} roughness={0.1} metalness={0.8} />
          </mesh>
          {/* Glowing Inner Core */}
          <mesh position={[0, 2.2, 0]}>
            <capsuleGeometry args={[0.5, 1.8, 8, 16]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.5} />
          </mesh>
          {/* Base & Top Cap */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.6, 0.4, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          <mesh position={[0, 4.3, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.5, 0.4, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          <pointLight position={[0, 2.2, 0]} color="#38bdf8" distance={12} intensity={2.2} />
        </group>
      ))}

      {/* Mainframe Server Racks */}
      <mesh position={[-6, 1.8, -28]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 3.6, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[6, 1.8, -28]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 3.6, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Toxic / Chem Waste Puddle Decals */}
      <mesh position={[0, 0.02, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 2.8, 16]} />
        <meshBasicMaterial color="#84cc16" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-4, 0.02, -32]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 2.2, 16]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function HelipadProps() {
  return (
    <group position={[0, 0, -60]}>
      {/* Outer Helipad Yellow Ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.8, 9.4, 36]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
      {/* Inner White Ring */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.8, 6.2, 36]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      {/* Big "H" Symbol in Center */}
      {/* Left Vertical Bar */}
      <mesh position={[-1.8, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 6.4]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      {/* Right Vertical Bar */}
      <mesh position={[1.8, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 6.4]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.7, 0.9]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>

      {/* 8 Perimeter Runway Strobe Beacons */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const px = Math.cos(angle) * 10;
        const pz = Math.sin(angle) * 10;
        return (
          <group key={`flare-${i}`} position={[px, 0, pz]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.16, 8, 8]} />
              <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={3} />
            </mesh>
          </group>
        );
      })}

      {/* Powerful Helipad Floodlights */}
      <pointLight position={[0, 9, 0]} color="#fef08a" distance={35} intensity={2.8} />

      {/* Sandbag Fortification Barriers */}
      <mesh position={[-12, 0.8, -8]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 1.6, 1.4]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[12, 0.8, -8]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 1.6, 1.4]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function SurvivalArena() {
  const yard = useMemo(() => makeYardTexture(), []);
  const labTex = useMemo(() => makeLabTexture(), []);
  const tarmacTex = useMemo(() => makeTarmacTexture(), []);

  const unlockedDoors = useZombieStore((s) => s.unlockedDoors);
  const gate1Open = useZombieStore((s) => s.gate1Open);
  const gate2Open = useZombieStore((s) => s.gate2Open);

  const obstacles = useMemo(
    () => getSurvivalObstacles(unlockedDoors, gate1Open, gate2Open),
    [unlockedDoors, gate1Open, gate2Open]
  );
  const wave = useZombieStore((s) => s.currentWave);
  const isHorde = wave > 0 && wave % 5 === 0;

  return (
    <group>
      {/* Master Background Outer Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -28]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[90, 130]} />
        <meshStandardMaterial color="#0f172a" roughness={0.95} />
      </mesh>

      {/* ── SECTOR 1 FLOOR (Courtyard, Z: -6 to 22) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[44, 28]} />
        <meshStandardMaterial map={yard} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* ── SECTOR 2 FLOOR (Bio-Tech Lab, Z: -42 to -6) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -24]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[44, 36]} />
        <meshStandardMaterial map={labTex} roughness={0.5} metalness={0.4} />
      </mesh>

      {/* ── SECTOR 3 FLOOR (Helipad Evacuation, Z: -78 to -42) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -60]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[44, 36]} />
        <meshStandardMaterial map={tarmacTex} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* ── BLAST GATE 1 (Courtyard -> Bio-Tech Lab at Z = -6) ── */}
      <BlastGate
        z={-6}
        isOpen={gate1Open}
        gateNumber={1}
        targetName="SEKTOR 2: LAB BIO-TECH"
      />

      {/* ── BLAST GATE 2 (Bio-Tech Lab -> Helipad at Z = -42) ── */}
      <BlastGate
        z={-42}
        isOpen={gate2Open}
        gateNumber={2}
        targetName="SEKTOR 3: HELIPAD EVAKUASI"
      />

      {/* Sector Environmental Props */}
      <BioLabProps />
      <HelipadProps />

      {/* Dynamic Obstacles (Walls, Crates, Barrels) */}
      {obstacles.map((obs, i) => {
        const w = obs.maxX - obs.minX;
        const d = obs.maxZ - obs.minZ;
        const cx = (obs.minX + obs.maxX) / 2;
        const cz = (obs.minZ + obs.maxZ) / 2;
        if (obs.kind === "barrel") {
          return (
            <mesh key={i} position={[cx, BARREL_H / 2, cz]} castShadow receiveShadow>
              <cylinderGeometry args={[w * 0.48, w * 0.52, BARREL_H, 12]} />
              <meshStandardMaterial color="#9a3412" roughness={0.4} metalness={0.35} />
            </mesh>
          );
        }
        const h = obs.kind === "crate" ? CRATE_H : WALL_H;
        const color = obs.kind === "crate" ? "#78350f" : "#334155";
        return (
          <mesh key={i} position={[cx, h / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={color}
              roughness={obs.kind === "crate" ? 0.75 : 0.5}
              metalness={obs.kind === "crate" ? 0.05 : 0.25}
            />
          </mesh>
        );
      })}


      {SURVIVAL_BARRICADES.map((b) => (
        <BarricadeWindow
          key={b.id}
          windowId={b.id}
          position={[b.x, 1.2, b.z]}
          rotation={[0, Math.abs(b.x) > Math.abs(b.z) ? Math.PI / 2 : 0, 0]}
          w={b.w}
          h={b.h}
        />
      ))}

      <Catwalk />

      {/* Atmospheric Lights per Sector */}
      {/* Sector 1 Courtyard Lights */}
      <FlickeringNeonLight position={[-10, 3, 8]} color={isHorde ? "#ff0000" : "#38bdf8"} />
      <FlickeringNeonLight position={[10, 3, 8]} color={isHorde ? "#ff0000" : "#f59e0b"} />
      <pointLight position={[0, 8, 8]} intensity={isHorde ? 1.8 : 2.5} distance={38} color={isHorde ? "#ef4444" : "#f1f5f9"} />
      <pointLight position={[0, 4.5, 18]} intensity={1.2} distance={20} color="#bae6fd" />

      {/* Sector 2 Lab Lights */}
      <pointLight position={[0, 7, -24]} intensity={2.2} distance={35} color="#38bdf8" />
      <FlickeringNeonLight position={[-8, 3.5, -24]} color="#06b6d4" />
      <FlickeringNeonLight position={[8, 3.5, -24]} color="#10b981" />

      {/* Sector 3 Helipad Lights */}
      <pointLight position={[0, 8, -60]} intensity={2.6} distance={38} color="#fef08a" />
      <FlickeringNeonLight position={[-12, 4, -60]} color="#f59e0b" />
      <FlickeringNeonLight position={[12, 4, -60]} color="#ef4444" />
    </group>
  );
}
