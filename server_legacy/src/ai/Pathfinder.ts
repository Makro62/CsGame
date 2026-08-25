import { NAVMESH_NODES, NavNode } from '@cs-game/shared';

interface AStarNode {
  id: string;
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class Pathfinder {
  private nodes: Map<string, NavNode> = new Map();

  constructor(customNodes: NavNode[] = NAVMESH_NODES) {
    customNodes.forEach((node) => {
      this.nodes.set(node.id, node);
    });
  }

  findNearestNode(x: number, z: number): NavNode {
    let nearest: NavNode | null = null;
    let minDist = Infinity;

    this.nodes.forEach((node) => {
      const dist = (node.x - x) ** 2 + (node.z - z) ** 2;
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    });

    return nearest ?? NAVMESH_NODES[0];
  }

  findPath(startX: number, startZ: number, targetX: number, targetZ: number): { x: number; z: number }[] {
    const directDistSq = (targetX - startX) ** 2 + (targetZ - startZ) ** 2;
    // If very close, just go direct
    if (directDistSq < 16) {
      return [{ x: targetX, z: targetZ }];
    }

    const startNode = this.findNearestNode(startX, startZ);
    const endNode = this.findNearestNode(targetX, targetZ);

    if (startNode.id === endNode.id) {
      return [{ x: targetX, z: targetZ }];
    }

    const openSet: Map<string, AStarNode> = new Map();
    const closedSet: Set<string> = new Set();

    const startAStar: AStarNode = {
      id: startNode.id,
      x: startNode.x,
      z: startNode.z,
      g: 0,
      h: this.heuristic(startNode.x, startNode.z, targetX, targetZ),
      f: this.heuristic(startNode.x, startNode.z, targetX, targetZ),
      parent: null,
    };

    openSet.set(startNode.id, startAStar);

    while (openSet.size > 0) {
      // Find node with lowest f in openSet
      let current: AStarNode | null = null;
      openSet.forEach((node) => {
        if (!current || node.f < current.f) {
          current = node;
        }
      });

      if (!current) break;

      const currNode: AStarNode = current;

      if (currNode.id === endNode.id) {
        // Reconstruct path
        const path: { x: number; z: number }[] = [];
        let curr: AStarNode | null = currNode;
        while (curr) {
          path.unshift({ x: curr.x, z: curr.z });
          curr = curr.parent;
        }
        path.push({ x: targetX, z: targetZ });
        return path;
      }

      openSet.delete(currNode.id);
      closedSet.add(currNode.id);

      const navNode = this.nodes.get(currNode.id);
      if (!navNode) continue;

      for (const neighborId of navNode.neighbors) {
        if (closedSet.has(neighborId)) continue;

        const neighborNav = this.nodes.get(neighborId);
        if (!neighborNav) continue;

        const tentativeG = currNode.g + Math.sqrt((neighborNav.x - currNode.x) ** 2 + (neighborNav.z - currNode.z) ** 2);
        const existingNeighbor = openSet.get(neighborId);

        if (!existingNeighbor || tentativeG < existingNeighbor.g) {
          const h = this.heuristic(neighborNav.x, neighborNav.z, targetX, targetZ);
          const neighborAStar: AStarNode = {
            id: neighborId,
            x: neighborNav.x,
            z: neighborNav.z,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: currNode,
          };
          openSet.set(neighborId, neighborAStar);
        }
      }
    }

    // Fallback: direct to target
    return [{ x: targetX, z: targetZ }];
  }

  private heuristic(x1: number, z1: number, x2: number, z2: number): number {
    return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2);
  }
}
