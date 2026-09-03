import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { MAP_CALLOUTS, RAVENPOINT_CALLOUTS, type MapCallout } from "@cs-game/shared";
import { getProceduralMapData } from "./ProceduralMapRegistry";

// Cache canvas textures per label (zero external assets)
const textureCache = new Map<string, THREE.Texture>();

function makeCalloutTexture(label: string): THREE.Texture {
  const cached = textureCache.get(label);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 6;
    ctx.strokeText(label, 128, 32);
    ctx.fillStyle = "#ffd54a";
    ctx.fillText(label, 128, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set(label, tex);
  return tex;
}

function getCalloutsForMap(mapId: string): readonly MapCallout[] {
  if (mapId === "dust" || mapId === "ravenpoint") return RAVENPOINT_CALLOUTS;
  const proc = getProceduralMapData(mapId);
  if (proc) return proc.callouts;
  return MAP_CALLOUTS;
}

// Callout labels for strategic spots — toggled with V key.
// Off by default in production; useful for learning map callouts.
export function CalloutLabels({ mapId = "container_yard" }: { mapId?: string }) {
  const [visible, setVisible] = useState(false);
  const callouts = getCalloutsForMap(mapId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyV" && !e.repeat) {
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <group>
      {callouts.map((c) => (
        <CalloutSprite key={c.id} label={c.label} x={c.x} z={c.z} />
      ))}
    </group>
  );
}

function CalloutSprite({ label, x, z }: { label: string; x: number; z: number }) {
  const texture = useMemo(() => makeCalloutTexture(label), [label]);
  return (
    <sprite position={[x, 4.2, z]} scale={[2.8, 0.7, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        opacity={0.92}
      />
    </sprite>
  );
}
