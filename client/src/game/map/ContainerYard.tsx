import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import { StaticBox, StaticCylinder, FloorZone } from "./MapHelpers";
import { BOMB_SITES, BUY_ZONE, MAP_BOUNDARY } from "@cs-game/shared";

// ============================================================================
// Color Palette & Textures
// ============================================================================
const COLORS = {
  ground: "#1a2332",
  red: "#b91c1c",
  blue: "#1d4ed8",
  yellow: "#eab308",
  orange: "#ea580c",
  green: "#15803d",
  wood: "#78350f",
  iron: "#334155",
  concrete: "#475569",
  metal: "#1e293b",
  ramp: "#64748b",
  tunnel: "#0f172a",
} as const;

// ─── Detailed Industrial Shipping Container Component ───

interface ContainerProps {
  position: [number, number, number];
  size?: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  label?: string;
}

function ShippingContainer({
  position,
  size = [6.0, 2.6, 2.4],
  color,
  rotation = [0, 0, 0],
  label,
}: ContainerProps) {
  const [w, h, d] = size;
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <group>
        {/* Main Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={color}
            roughness={0.5}
            metalness={0.65}
          />
        </mesh>

        {/* Edge Metal Frame & Corner Castings */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[w + 0.04, h + 0.04, d + 0.04]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.7}
            metalness={0.8}
            wireframe
          />
        </mesh>

        {/* Top/Bottom Outer Ridge Rails */}
        <mesh position={[0, h / 2 + 0.02, 0]}>
          <boxGeometry args={[w + 0.06, 0.05, d + 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <mesh position={[0, -h / 2 - 0.02, 0]}>
          <boxGeometry args={[w + 0.06, 0.05, d + 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>

        {/* End Door Bars */}
        <mesh position={[w / 2 + 0.02, 0, 0]}>
          <boxGeometry args={[0.04, h * 0.85, d * 0.8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>

        {/* Tactical Stencil Text */}
        {label && (
          <Html position={[0, 0, d / 2 + 0.06]} center rotation={[0, 0, 0]} transform>
            <div
              style={{
                fontFamily: "'Impact', 'Chakra Petch', sans-serif",
                fontSize: "20px",
                fontWeight: 900,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "3px",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {label}
            </div>
          </Html>
        )}
      </group>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} />
    </RigidBody>
  );
}

// ============================================================================
// Mid Lane (Center Peeking Hub)
// ============================================================================

function MidLane() {
  return (
    <group name="mid_lane">
      {/* Mid Center Wallbangable Stack */}
      <StaticBox position={[0, 0.6, 0]} size={[1.4, 1.2, 1.4]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[0, 1.6, 0]} size={[1.1, 0.8, 1.1]} color={COLORS.wood} materialType="wood" />

      {/* Mid Yellow Landmark Container */}
      <ShippingContainer
        position={[-2.5, 1.3, 3.5]}
        size={[5.0, 2.6, 2.4]}
        color={COLORS.yellow}
        label="CS-LOGISTICS // 04"
      />

      {/* T-Mid Barrel Cover */}
      <StaticCylinder position={[-15, 0.75, -2]} radius={0.4} height={1.5} color={COLORS.iron} materialType="iron" />
      <StaticCylinder position={[-15, 0.75, 2]} radius={0.4} height={1.5} color={COLORS.iron} materialType="iron" />
      <StaticCylinder position={[-14.2, 0.75, 0]} radius={0.4} height={1.5} color={COLORS.iron} materialType="iron" />

      {/* CT Sniper Nest Platform */}
      <ShippingContainer
        position={[15, 1.3, -3.5]}
        size={[4.0, 2.6, 2.2]}
        color={COLORS.metal}
        label="CT SEC-01"
      />
      <ShippingContainer
        position={[15, 1.3, 3.5]}
        size={[4.0, 2.6, 2.2]}
        color={COLORS.metal}
        label="CT SEC-02"
      />
    </group>
  );
}

// ============================================================================
// Site A (North, z ≈ -15)
// ============================================================================

function SiteA() {
  return (
    <group name="site_a">
      {/* Site A Core Red Container */}
      <ShippingContainer
        position={[15, 1.3, -15]}
        size={[6.2, 2.6, 2.4]}
        color={COLORS.red}
        label="SITE A // MAERSK"
      />

      {/* A-Main Choke Point Container */}
      <ShippingContainer
        position={[-5, 1.3, -15]}
        size={[2.4, 2.6, 6.0]}
        color={COLORS.metal}
        label="A-ENTRY"
      />

      {/* A-Site Cover Stack */}
      <ShippingContainer
        position={[4, 1.3, -13.5]}
        size={[3.6, 2.6, 2.0]}
        color={COLORS.orange}
        label="HAZMAT A"
      />
      <StaticBox position={[-0.5, 0.6, -16.5]} size={[1.6, 1.2, 1.6]} color={COLORS.wood} materialType="wood" />

      {/* A Connector Cover */}
      <ShippingContainer
        position={[0, 1.3, -8]}
        size={[2.6, 2.6, 2.6]}
        color={COLORS.green}
        label="A-MID"
      />
      <StaticBox position={[2.6, 0.6, -8]} size={[2.0, 1.2, 1.2]} color={COLORS.wood} materialType="wood" />

      {/* A Ninja Corner Boxes */}
      <StaticBox position={[10, 0.6, -18]} size={[1.3, 1.2, 1.3]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[10, 1.8, -18]} size={[1.1, 1.2, 1.1]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[5, 0.6, -5.5]} size={[1.3, 1.2, 1.3]} color={COLORS.wood} materialType="wood" />

      {/* Site A Holographic Marker Beacon */}
      <group position={[BOMB_SITES.A.x, 0.1, BOMB_SITES.A.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5, 2.8, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.65} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.5, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// Site B (South, z ≈ +15)
// ============================================================================

function SiteB() {
  return (
    <group name="site_b">
      {/* Site B Core Blue Container */}
      <ShippingContainer
        position={[12, 1.3, 15]}
        size={[6.2, 2.6, 2.4]}
        color={COLORS.blue}
        label="SITE B // PACIFIC"
      />

      {/* B-Ramp Steps for High Ground Access */}
      <StaticBox position={[6.5, 0.45, 15]} size={[2.0, 0.9, 2.4]} color={COLORS.ramp} materialType="metal" />
      <StaticBox position={[8.5, 1.3, 15]} size={[2.0, 1.8, 2.4]} color={COLORS.ramp} materialType="metal" />

      {/* B-High Ground Stack Container */}
      <ShippingContainer
        position={[13.8, 3.8, 15]}
        size={[3.0, 2.4, 2.4]}
        color={COLORS.blue}
        label="B-SNIPER"
      />

      {/* B Plant Cover Iron Barrels */}
      <StaticCylinder position={[16, 0.75, 12]} radius={0.4} height={1.5} color={COLORS.iron} materialType="iron" />
      <StaticCylinder position={[16.8, 0.75, 12]} radius={0.4} height={1.5} color={COLORS.iron} materialType="iron" />

      {/* B-Tunnel */}
      <StaticBox position={[-5, 1.3, 12.5]} size={[10.0, 2.6, 0.5]} color={COLORS.tunnel} materialType="metal" />
      <StaticBox position={[-5, 1.3, 17.5]} size={[10.0, 2.6, 0.5]} color={COLORS.tunnel} materialType="metal" />
      <StaticBox position={[-5, 2.6, 15]} size={[10.0, 0.3, 5.0]} color={COLORS.tunnel} materialType="metal" />

      {/* Site B Holographic Marker Beacon */}
      <group position={[BOMB_SITES.B.x, 0.1, BOMB_SITES.B.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5, 2.8, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.65} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.5, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// T-Spawn Area (West Base)
// ============================================================================

function TSpawnArea() {
  return (
    <group name="t_spawn">
      <ShippingContainer
        position={[-25, 1.3, -5]}
        size={[3.6, 2.6, 2.2]}
        color={COLORS.red}
        label="T-BASE NORTH"
      />
      <ShippingContainer
        position={[-25, 1.3, 5]}
        size={[3.6, 2.6, 2.2]}
        color={COLORS.red}
        label="T-BASE SOUTH"
      />
      <StaticBox position={[-21, 0.6, 0]} size={[1.6, 1.2, 1.6]} color={COLORS.wood} materialType="wood" />
    </group>
  );
}

// ============================================================================
// CT-Spawn Area (East Base)
// ============================================================================

function CTSpawnArea() {
  return (
    <group name="ct_spawn">
      <ShippingContainer
        position={[25, 1.3, -5]}
        size={[3.6, 2.6, 2.2]}
        color={COLORS.blue}
        label="CT-ARMORY NORTH"
      />
      <ShippingContainer
        position={[25, 1.3, 5]}
        size={[3.6, 2.6, 2.2]}
        color={COLORS.blue}
        label="CT-ARMORY SOUTH"
      />
      <StaticBox position={[21, 0.6, 0]} size={[1.6, 1.2, 1.6]} color={COLORS.wood} materialType="wood" />
    </group>
  );
}

// ============================================================================
// Perimeter Boundary Walls
// ============================================================================

function PerimeterWalls() {
  const wallHeight = 8.0;
  const { minX, maxX, minZ, maxZ } = MAP_BOUNDARY;

  return (
    <group name="perimeter_walls">
      <StaticBox
        position={[0, wallHeight / 2, minZ - 1.25]}
        size={[maxX - minX + 4, wallHeight, 0.8]}
        color={COLORS.concrete}
        materialType="concrete"
      />
      <StaticBox
        position={[0, wallHeight / 2, maxZ + 1.25]}
        size={[maxX - minX + 4, wallHeight, 0.8]}
        color={COLORS.concrete}
        materialType="concrete"
      />
      <StaticBox
        position={[minX - 1.25, wallHeight / 2, 0]}
        size={[0.8, wallHeight, maxZ - minZ + 4]}
        color={COLORS.concrete}
        materialType="concrete"
      />
      <StaticBox
        position={[maxX + 1.25, wallHeight / 2, 0]}
        size={[0.8, wallHeight, maxZ - minZ + 4]}
        color={COLORS.concrete}
        materialType="concrete"
      />
    </group>
  );
}

// ============================================================================
// Floor Zones, Ground Markings & Stencils
// ============================================================================

function FloorZones() {
  const siteASize = BOMB_SITES.A.radius * 2;
  const siteBSize = BOMB_SITES.B.radius * 2;
  return (
    <group name="floor_zones">
      {/* T & CT Buy Zones */}
      <FloorZone
        position={[BUY_ZONE.T.x, 0.02, BUY_ZONE.T.z]}
        size={[BUY_ZONE.T.radius * 1.5, BUY_ZONE.T.radius * 1.8]}
        color={COLORS.red}
        opacity={0.18}
      />
      <FloorZone
        position={[BUY_ZONE.CT.x, 0.02, BUY_ZONE.CT.z]}
        size={[BUY_ZONE.CT.radius * 1.5, BUY_ZONE.CT.radius * 1.8]}
        color={COLORS.blue}
        opacity={0.18}
      />

      {/* Bombsite Zones */}
      <FloorZone
        position={[BOMB_SITES.A.x, 0.02, BOMB_SITES.A.z]}
        size={[siteASize, siteASize]}
        color="#dc2626"
        opacity={0.3}
      />
      <FloorZone
        position={[BOMB_SITES.B.x, 0.02, BOMB_SITES.B.z]}
        size={[siteBSize, siteBSize]}
        color="#2563eb"
        opacity={0.3}
      />

      {/* Bombsite Large 3D Holograms */}
      <Html position={[BOMB_SITES.A.x, 0.06, BOMB_SITES.A.z]} center rotation={[-Math.PI / 2, 0, 0]}>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "rgba(239, 68, 68, 0.75)",
            fontFamily: "'Impact', sans-serif",
            letterSpacing: "6px",
            textShadow: "0 0 20px rgba(239, 68, 68, 0.8)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          A
        </div>
      </Html>

      <Html position={[BOMB_SITES.B.x, 0.06, BOMB_SITES.B.z]} center rotation={[-Math.PI / 2, 0, 0]}>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "rgba(59, 130, 246, 0.75)",
            fontFamily: "'Impact', sans-serif",
            letterSpacing: "6px",
            textShadow: "0 0 20px rgba(59, 130, 246, 0.8)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          B
        </div>
      </Html>

      {/* Lane Asphalt Markings */}
      <FloorZone position={[0, 0.01, -10]} size={[58, 0.35]} color="#ffffff" opacity={0.12} />
      <FloorZone position={[0, 0.01, 10]} size={[58, 0.35]} color="#ffffff" opacity={0.12} />
    </group>
  );
}

// ============================================================================
// Asphalt Ground
// ============================================================================

function Ground() {
  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <planeGeometry args={[64, 44]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.9} metalness={0.1} />
      </mesh>
      <CuboidCollider args={[32, 1.0, 22]} />
    </RigidBody>
  );
}

// ============================================================================
// Main ContainerYard Export
// ============================================================================

export function ContainerYard() {
  return (
    <group name="container_yard_map">
      {/* Industrial Sun & Fill Lights */}
      <ambientLight intensity={0.6} color="#dbeafe" />
      <directionalLight
        castShadow
        position={[25, 40, 20]}
        intensity={1.3}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        color="#fffbeb"
      />
      <directionalLight position={[-20, 25, -20]} intensity={0.4} color="#93c5fd" />

      <Ground />
      <MidLane />
      <SiteA />
      <SiteB />
      <TSpawnArea />
      <CTSpawnArea />
      <PerimeterWalls />
      <FloorZones />
    </group>
  );
}

export default ContainerYard;
