/**
 * Octree Collision Detection
 * Based on patterns from FPS Octree and three-mesh-bvh
 *
 * Replaces brute-force AABB with O(log n) spatial queries.
 * Used for raycasting, proximity queries, and broadphase collision.
 */

import * as THREE from 'three'

// ─── AABB (Axis-Aligned Bounding Box) ───────────────────────────
export class AABB {
  public min: THREE.Vector3
  public max: THREE.Vector3

  constructor(min?: THREE.Vector3, max?: THREE.Vector3) {
    this.min = min?.clone() ?? new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    this.max = max?.clone() ?? new THREE.Vector3(Infinity, Infinity, Infinity)
  }

  center(): THREE.Vector3 {
    return new THREE.Vector3().addVectors(this.min, this.max).multiplyScalar(0.5)
  }

  size(): THREE.Vector3 {
    return new THREE.Vector3().subVectors(this.max, this.min)
  }

  containsAABB(aabb: AABB): boolean {
    return (
      aabb.min.x >= this.min.x &&
      aabb.max.x <= this.max.x &&
      aabb.min.y >= this.min.y &&
      aabb.max.y <= this.max.y &&
      aabb.min.z >= this.min.z &&
      aabb.max.z <= this.max.z
    )
  }

  intersectsAABB(other: AABB): boolean {
    return (
      this.min.x <= other.max.x &&
      this.max.x >= other.min.x &&
      this.min.y <= other.max.y &&
      this.max.y >= other.min.y &&
      this.min.z <= other.max.z &&
      this.max.z >= other.min.z
    )
  }

  // Expand to include another AABB
  expand(other: AABB) {
    this.min.min(other.min)
    this.max.max(other.max)
  }

  // Check ray intersection
  intersectRay(ray: THREE.Ray): { hit: boolean; distance: number; point: THREE.Vector3 } | null {
    let tmin = -Infinity
    let tmax = Infinity

    const invDir = new THREE.Vector3(1 / ray.direction.x, 1 / ray.direction.y, 1 / ray.direction.z)

    for (const axis of ['x', 'y', 'z'] as const) {
      const t1 = (this.min[axis] - ray.origin[axis]) * invDir[axis]
      const t2 = (this.max[axis] - ray.origin[axis]) * invDir[axis]

      const tNear = Math.min(t1, t2)
      const tFar = Math.max(t1, t2)

      tmin = Math.max(tmin, tNear)
      tmax = Math.min(tmax, tFar)

      if (tmin > tmax) return null
    }

    if (tmax < 0) return null

    const distance = tmin >= 0 ? tmin : tmax
    const point = ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance))

    return { hit: true, distance, point }
  }

  // Create from vertices
  static fromVertices(vertices: THREE.Vector3[]): AABB {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

    for (const v of vertices) {
      min.min(v)
      max.max(v)
    }

    return new AABB(min, max)
  }

  // Create from center and half-extents
  static fromCenterHalf(center: THREE.Vector3, half: THREE.Vector3): AABB {
    return new AABB(
      new THREE.Vector3().subVectors(center, half),
      new THREE.Vector3().addVectors(center, half)
    )
  }
}

// ─── Octree Node ────────────────────────────────────────────────
const MAX_OBJECTS = 8
const MAX_DEPTH = 8

interface OctreeObject {
  aabb: AABB
  data: any
}

class OctreeNode {
  public bounds: AABB
  public objects: OctreeObject[] = []
  public children: OctreeNode[] = []
  public depth: number

  constructor(bounds: AABB, depth: number = 0) {
    this.bounds = bounds
    this.depth = depth
  }

  subdivide() {
    const center = this.bounds.center()
    const size = this.bounds.size()
    const halfSize = size.clone().multiplyScalar(0.5)

    // 8 octants
    const offsets = [
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, -1, -1),
      new THREE.Vector3(-1, 1, -1),
      new THREE.Vector3(1, 1, -1),
      new THREE.Vector3(-1, -1, 1),
      new THREE.Vector3(1, -1, 1),
      new THREE.Vector3(-1, 1, 1),
      new THREE.Vector3(1, 1, 1),
    ]

    this.children = offsets.map(offset => {
      const childCenter = center.clone().add(
        new THREE.Vector3().multiplyVectors(offset, halfSize).multiplyScalar(0.5)
      )
      return new OctreeNode(AABB.fromCenterHalf(childCenter, halfSize), this.depth + 1)
    })
  }
}

// ─── Octree ─────────────────────────────────────────────────────
export class Octree {
  private root: OctreeNode
  private totalObjects: number = 0

  constructor(bounds: AABB) {
    this.root = new OctreeNode(bounds)
  }

  insert(aabb: AABB, data: any) {
    this._insert(this.root, { aabb, data })
    this.totalObjects++
  }

  private _insert(node: OctreeNode, obj: OctreeObject) {
    // If this node has children, try to fit in one
    if (node.children.length > 0) {
      const childIndex = this._getBestChild(node, obj.aabb)
      if (childIndex !== -1) {
        this._insert(node.children[childIndex], obj)
        return
      }
    }

    // Add to this node
    node.objects.push(obj)

    // Subdivide if needed
    if (node.objects.length > MAX_OBJECTS && node.depth < MAX_DEPTH) {
      if (node.children.length === 0) {
        node.subdivide()
      }

      // Try to push objects to children
      const remaining: OctreeObject[] = []
      for (const obj of node.objects) {
        const childIndex = this._getBestChild(node, obj.aabb)
        if (childIndex !== -1) {
          this._insert(node.children[childIndex], obj)
        } else {
          remaining.push(obj)
        }
      }
      node.objects = remaining
    }
  }

  private _getBestChild(node: OctreeNode, aabb: AABB): number {
    if (node.children.length === 0) return -1

    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i].bounds.containsAABB(aabb)) {
        return i
      }
    }
    return -1
  }

  // Query all objects intersecting a ray
  queryRay(ray: THREE.Ray, maxDistance: number = Infinity): { aabb: AABB; data: any; distance: number; point: THREE.Vector3 }[] {
    const results: { aabb: AABB; data: any; distance: number; point: THREE.Vector3 }[] = []
    this._queryRay(this.root, ray, maxDistance, results)
    return results.sort((a, b) => a.distance - b.distance)
  }

  private _queryRay(
    node: OctreeNode,
    ray: THREE.Ray,
    maxDistance: number,
    results: { aabb: AABB; data: any; distance: number; point: THREE.Vector3 }[]
  ) {
    // Test node bounds
    const nodeHit = node.bounds.intersectRay(ray)
    if (!nodeHit || nodeHit.distance > maxDistance) return

    // Test objects in this node
    for (const obj of node.objects) {
      const hit = obj.aabb.intersectRay(ray)
      if (hit && hit.distance <= maxDistance) {
        results.push({ aabb: obj.aabb, data: obj.data, distance: hit.distance, point: hit.point })
      }
    }

    // Recurse into children
    for (const child of node.children) {
      this._queryRay(child, ray, maxDistance, results)
    }
  }

  // Query all objects within a sphere
  querySphere(center: THREE.Vector3, radius: number): { aabb: AABB; data: any; distance: number }[] {
    const results: { aabb: AABB; data: any; distance: number }[] = []
    const sphere = new THREE.Sphere(center, radius)
    this._querySphere(this.root, sphere, results)
    return results.sort((a, b) => a.distance - b.distance)
  }

  private _querySphere(
    node: OctreeNode,
    sphere: THREE.Sphere,
    results: { aabb: AABB; data: any; distance: number }[]
  ) {
    // Quick AABB-sphere intersection test
    const closest = new THREE.Vector3(
      THREE.MathUtils.clamp(sphere.center.x, node.bounds.min.x, node.bounds.max.x),
      THREE.MathUtils.clamp(sphere.center.y, node.bounds.min.y, node.bounds.max.y),
      THREE.MathUtils.clamp(sphere.center.z, node.bounds.min.z, node.bounds.max.z)
    )
    const distSq = sphere.center.distanceToSquared(closest)

    if (distSq > sphere.radius * sphere.radius) return

    // Test objects in this node
    for (const obj of node.objects) {
      const objCenter = obj.aabb.center()
      const dist = sphere.center.distanceTo(objCenter)
      if (dist <= sphere.radius) {
        results.push({ aabb: obj.aabb, data: obj.data, distance: dist })
      }
    }

    // Recurse into children
    for (const child of node.children) {
      this._querySphere(child, sphere, results)
    }
  }

  // Query all objects within an AABB
  queryAABB(queryBounds: AABB): { aabb: AABB; data: any }[] {
    const results: { aabb: AABB; data: any }[] = []
    this._queryAABB(this.root, queryBounds, results)
    return results
  }

  private _queryAABB(
    node: OctreeNode,
    queryBounds: AABB,
    results: { aabb: AABB; data: any }[]
  ) {
    if (!node.bounds.intersectsAABB(queryBounds)) return

    for (const obj of node.objects) {
      if (obj.aabb.intersectsAABB(queryBounds)) {
        results.push({ aabb: obj.aabb, data: obj.data })
      }
    }

    for (const child of node.children) {
      this._queryAABB(child, queryBounds, results)
    }
  }

  // Clear the octree
  clear() {
    this.root.objects = []
    this.root.children = []
    this.totalObjects = 0
  }

  // Get stats
  stats() {
    return {
      totalObjects: this.totalObjects,
      rootObjects: this.root.objects.length,
      rootChildren: this.root.children.length,
    }
  }
}

// ─── Map Collision Helper ───────────────────────────────────────
export interface MapObstacle {
  id: string
  material: 'wood' | 'metal'
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/**
 * Build an octree from map obstacles for efficient collision queries.
 */
export function buildMapOctree(obstacles: readonly MapObstacle[]): Octree {
  // Calculate bounds from all obstacles
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

  for (const obs of obstacles) {
    min.min(new THREE.Vector3(obs.minX, obs.minY, obs.minZ))
    max.max(new THREE.Vector3(obs.maxX, obs.maxY, obs.maxZ))
  }

  // Expand bounds slightly
  min.multiplyScalar(1.1)
  max.multiplyScalar(1.1)

  const octree = new Octree(new AABB(min, max))

  for (const obs of obstacles) {
    const aabb = new AABB(
      new THREE.Vector3(obs.minX, obs.minY, obs.minZ),
      new THREE.Vector3(obs.maxX, obs.maxY, obs.maxZ)
    )
    octree.insert(aabb, obs)
  }

  return octree
}

/**
 * Enhanced raycast using octree (replaces brute-force MAP_OBSTACLES loop).
 * Returns first hit obstacle with distance and hit point.
 */
export function raycastMap(
  octree: Octree,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance: number = 1000
): { obstacle: MapObstacle; distance: number; point: THREE.Vector3 } | null {
  const ray = new THREE.Ray(origin.clone(), direction.clone().normalize())
  const results = octree.queryRay(ray, maxDistance)

  if (results.length === 0) return null

  const first = results[0]
  return {
    obstacle: first.data as MapObstacle,
    distance: first.distance,
    point: first.point,
  }
}
