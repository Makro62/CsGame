import * as THREE from "three";
import type { CharacterLook, GearFlag, HeadStyle } from "./characterLooks";

function has(gear: GearFlag[], flag: GearFlag) {
  return gear.includes(flag);
}

function UniqueHead({
  style, accent, skin, hair, helmetTex, faceTex, opacity,
}: {
  style: HeadStyle;
  accent: string;
  skin: string;
  hair: string;
  helmetTex: THREE.Texture;
  faceTex: THREE.Texture;
  opacity: number;
}) {
  if (style === "visor") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.42, 0.36, 0.42]} />
          <meshStandardMaterial color="#0b1220" metalness={0.45} roughness={0.35} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.0, 0.22]}>
          <boxGeometry args={[0.38, 0.12, 0.04]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} metalness={0.6} roughness={0.15} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.12, 0.18]} castShadow>
          <boxGeometry args={[0.28, 0.14, 0.08]} />
          <meshStandardMaterial color={skin} opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "heavy") {
    return (
      <group>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.50, 0.46, 0.50]} />
          <meshStandardMaterial color="#1c1917" metalness={0.55} roughness={0.4} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.02, 0.26]}>
          <boxGeometry args={[0.22, 0.18, 0.04]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.85} metalness={0.7} roughness={0.12} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.08, 0.26]}>
          <boxGeometry args={[0.34, 0.05, 0.03]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[0.38, 0.12, 0.38]} />
          <meshStandardMaterial color="#292524" metalness={0.5} roughness={0.45} opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "baldCap") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.38, 0.38]} />
          <meshStandardMaterial color={skin} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.16, -0.02]} castShadow>
          <boxGeometry args={[0.42, 0.10, 0.42]} />
          <meshStandardMaterial color={hair} roughness={0.55} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.14, 0.22]} castShadow>
          <boxGeometry args={[0.44, 0.04, 0.10]} />
          <meshStandardMaterial color={hair} roughness={0.55} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.16, 0.12]} castShadow>
          <boxGeometry args={[0.14, 0.08, 0.08]} />
          <meshStandardMaterial color="#3f2a1a" roughness={0.8} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.13, 0.02, 0.19]}>
          <boxGeometry args={[0.08, 0.06, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.13, 0.02, 0.19]}>
          <boxGeometry args={[0.08, 0.06, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.08]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "dreads") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color={skin} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.18, -0.02]} castShadow>
          <boxGeometry args={[0.40, 0.12, 0.40]} />
          <meshStandardMaterial color={hair} roughness={0.85} opacity={opacity} transparent />
        </mesh>
        {[-0.12, -0.04, 0.04, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.02, -0.22]} castShadow>
            <boxGeometry args={[0.06, 0.34, 0.06]} />
            <meshStandardMaterial color={hair} roughness={0.9} opacity={opacity} transparent />
          </mesh>
        ))}
        <mesh position={[0.12, 0.02, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.12, 0.02, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "cap") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color={skin} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.16, -0.02]} castShadow>
          <boxGeometry args={[0.40, 0.10, 0.40]} />
          <meshStandardMaterial color={accent} roughness={0.5} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.12, 0.24]} castShadow>
          <boxGeometry args={[0.36, 0.03, 0.14]} />
          <meshStandardMaterial color={accent} roughness={0.5} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.22, 0.04]}>
          <boxGeometry args={[0.18, 0.04, 0.08]} />
          <meshStandardMaterial color="#0f172a" metalness={0.4} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "slick") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color={skin} roughness={0.65} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.16, -0.02]} castShadow>
          <boxGeometry args={[0.38, 0.10, 0.38]} />
          <meshStandardMaterial color={hair} roughness={0.25} metalness={0.15} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.02, 0.12, 0.14]} castShadow>
          <boxGeometry args={[0.34, 0.08, 0.12]} />
          <meshStandardMaterial color={hair} roughness={0.25} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.11, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.04, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.11, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.04, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "gasmask") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.40, 0.40, 0.40]} />
          <meshStandardMaterial color="#1c1917" roughness={0.55} opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.08, 0.04, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.08, 0.04, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.1, 0.22]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.12, 8]} />
          <meshStandardMaterial color="#292524" metalness={0.4} opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "beanie") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color={skin} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[0.42, 0.16, 0.42]} />
          <meshStandardMaterial color={accent} roughness={0.9} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.28, 0.08, 0.28]} />
          <meshStandardMaterial color={hair} roughness={0.85} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "beret") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color={skin} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.04, 0.2, 0]} rotation={[0, 0, 0.25]} castShadow>
          <boxGeometry args={[0.44, 0.08, 0.44]} />
          <meshStandardMaterial color={accent} roughness={0.8} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  if (style === "bandana") {
    return (
      <group>
        <mesh position={[0, 0.0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color={skin} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.40, 0.08, 0.40]} />
          <meshStandardMaterial color={accent} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.16, 0.02, -0.16]} rotation={[0.3, 0.4, 0]} castShadow>
          <boxGeometry args={[0.08, 0.16, 0.04]} />
          <meshStandardMaterial color={accent} roughness={0.7} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
        <mesh position={[-0.12, 0.0, 0.19]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#fff" opacity={opacity} transparent />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.40, 0.40, 0.40]} />
        <meshStandardMaterial map={helmetTex} opacity={opacity} transparent />
      </mesh>
      <mesh position={[0, -0.02, 0.205]}>
        <boxGeometry args={[0.36, 0.1, 0.01]} />
        <meshStandardMaterial color={accent} metalness={0.7} roughness={0.15} opacity={opacity} transparent />
      </mesh>
      <mesh position={[0, -0.05, 0.211]} castShadow>
        <planeGeometry args={[0.36, 0.28]} />
        <meshStandardMaterial map={faceTex} opacity={opacity} transparent />
      </mesh>
    </group>
  );
}

export function CharacterGear({
  look, accent, armor, opacity, helmetTex, faceTex,
}: {
  look: CharacterLook;
  accent: string;
  armor: string;
  opacity: number;
  helmetTex: THREE.Texture;
  faceTex: THREE.Texture;
}) {
  const { gear } = look;
  return (
    <group>
      <group position={[0, 1.45, 0]}>
        <UniqueHead
          style={look.head}
          accent={accent}
          skin={look.skin}
          hair={look.hair}
          helmetTex={helmetTex}
          faceTex={faceTex}
          opacity={opacity}
        />
      </group>

      {has(gear, "headset") && (
        <group position={[0.22, 1.48, 0]}>
          <mesh>
            <boxGeometry args={[0.06, 0.08, 0.08]} />
            <meshStandardMaterial color="#0f172a" metalness={0.4} opacity={opacity} transparent />
          </mesh>
          <mesh position={[0.02, -0.1, 0.08]} rotation={[0.4, 0, 0.2]}>
            <boxGeometry args={[0.02, 0.08, 0.02]} />
            <meshStandardMaterial color="#111" opacity={opacity} transparent />
          </mesh>
        </group>
      )}

      {has(gear, "antenna") && (
        <mesh position={[-0.12, 1.78, -0.08]}>
          <cylinderGeometry args={[0.012, 0.01, 0.28, 6]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} opacity={opacity} transparent />
        </mesh>
      )}

      {has(gear, "pauldrons") && (
        <group>
          <mesh position={[-look.shoulder - 0.04, 1.18, 0]} castShadow>
            <boxGeometry args={[0.22, 0.16, 0.28]} />
            <meshStandardMaterial color={armor} metalness={0.35} roughness={0.45} opacity={opacity} transparent />
          </mesh>
          <mesh position={[look.shoulder + 0.04, 1.18, 0]} castShadow>
            <boxGeometry args={[0.22, 0.16, 0.28]} />
            <meshStandardMaterial color={armor} metalness={0.35} roughness={0.45} opacity={opacity} transparent />
          </mesh>
        </group>
      )}

      {has(gear, "shieldPack") && (
        <group position={[0, 0.9, -0.28]}>
          <mesh castShadow>
            <boxGeometry args={[0.36, 0.42, 0.14]} />
            <meshStandardMaterial color="#1c1917" metalness={0.5} roughness={0.35} opacity={opacity} transparent />
          </mesh>
          <mesh position={[0, 0.02, -0.08]}>
            <boxGeometry args={[0.22, 0.22, 0.04]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} opacity={opacity} transparent />
          </mesh>
        </group>
      )}

      {has(gear, "backpack") && (
        <mesh position={[0, 0.88, -0.24]} castShadow>
          <boxGeometry args={[0.28, 0.34, 0.14]} />
          <meshStandardMaterial color="#292524" roughness={0.7} opacity={opacity} transparent />
        </mesh>
      )}

      {has(gear, "radio") && (
        <group position={[0.28, 1.05, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.14, 0.06]} />
            <meshStandardMaterial color="#1e293b" metalness={0.3} opacity={opacity} transparent />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.1, 6]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} opacity={opacity} transparent />
          </mesh>
        </group>
      )}

      {has(gear, "tie") && (
        <mesh position={[0, 0.92, 0.16]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.02]} />
          <meshStandardMaterial color={accent} roughness={0.55} opacity={opacity} transparent />
        </mesh>
      )}

      {has(gear, "coat") && (
        <mesh position={[0, 0.62, -0.02]} castShadow>
          <boxGeometry args={[0.56, 0.46, 0.34]} />
          <meshStandardMaterial color="#0f172a" roughness={0.75} opacity={opacity} transparent />
        </mesh>
      )}

      {has(gear, "scarf") && (
        <mesh position={[0, 1.2, 0.04]} castShadow>
          <boxGeometry args={[0.36, 0.1, 0.32]} />
          <meshStandardMaterial color={accent} roughness={0.9} opacity={opacity} transparent />
        </mesh>
      )}

      {has(gear, "holster") && (
        <mesh position={[0.16, 0.52, 0.08]} rotation={[0, 0, -0.4]} castShadow>
          <boxGeometry args={[0.08, 0.16, 0.05]} />
          <meshStandardMaterial color="#1c1917" roughness={0.7} opacity={opacity} transparent />
        </mesh>
      )}

      {has(gear, "kneepads") && (
        <group>
          <mesh position={[-0.11, 0.18, 0.08]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.1]} />
            <meshStandardMaterial color="#292524" metalness={0.2} opacity={opacity} transparent />
          </mesh>
          <mesh position={[0.11, 0.18, 0.08]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.1]} />
            <meshStandardMaterial color="#292524" metalness={0.2} opacity={opacity} transparent />
          </mesh>
        </group>
      )}

      {has(gear, "ammoBelt") && (
        <mesh position={[0, 0.7, 0.18]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[0.42, 0.08, 0.08]} />
          <meshStandardMaterial color="#44403c" roughness={0.65} opacity={opacity} transparent />
        </mesh>
      )}
    </group>
  );
}
