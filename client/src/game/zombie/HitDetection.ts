import * as THREE from "three";
import { ZombieState, ZombieType } from "../../stores/useZombieStore";

const HITBOX: Record<ZombieType, {head: {y:number; r:number}; body: {y:number; r:number}}> = {
  walker:   {head:{y:1.5,r:0.25}, body:{y:0.8,r:0.4}},
  runner:   {head:{y:1.3,r:0.22}, body:{y:0.7,r:0.35}},
  tank:     {head:{y:1.8,r:0.35}, body:{y:1.0,r:0.6}},
  spitter:  {head:{y:1.5,r:0.25}, body:{y:0.8,r:0.4}},
  exploder: {head:{y:1.4,r:0.28}, body:{y:0.75,r:0.45}},
  boss:     {head:{y:2.2,r:0.4},  body:{y:1.2,r:0.7}},
};

export interface HitResult { zombieId: string; isHeadshot: boolean; damage: number; point: THREE.Vector3; }

export function raycastZombies(origin: THREE.Vector3, direction: THREE.Vector3, maxDist: number,
  zombies: ZombieState[], obstacles: Array<{minX:number;maxX:number;minZ:number;maxZ:number}>): HitResult | null {
  const ray = new THREE.Ray(origin, direction.normalize());
  let best: HitResult | null = null, bestDist = Infinity;
  for (const z of zombies) {
    if (z.isDead) continue;
    const hb = HITBOX[z.type];
    const headC = new THREE.Vector3(z.x, z.y + hb.head.y, z.z);
    const bodyC = new THREE.Vector3(z.x, z.y + hb.body.y, z.z);
    const headHit = ray.intersectSphere(new THREE.Sphere(headC, hb.head.r), new THREE.Vector3());
    const bodyHit = ray.intersectSphere(new THREE.Sphere(bodyC, hb.body.r), new THREE.Vector3());
    let pt: THREE.Vector3 | null = null, hs = false, d = Infinity;
    if (headHit) { pt = headHit; hs = true; d = origin.distanceTo(headHit); }
    else if (bodyHit) { pt = bodyHit; hs = false; d = origin.distanceTo(bodyHit); }
    if (pt && d < maxDist && d < bestDist) {
      let blocked = false;
      for (const obs of obstacles) {
        const box = new THREE.Box3(new THREE.Vector3(obs.minX,-1,obs.minZ), new THREE.Vector3(obs.maxX,3,obs.maxZ));
        const hit = new THREE.Vector3();
        if (ray.intersectBox(box, hit) && origin.distanceTo(hit) < d) { blocked = true; break; }
      }
      if (!blocked) { bestDist = d; best = { zombieId: z.id, isHeadshot: hs, damage: 0, point: pt }; }
    }
  }
  return best;
}
