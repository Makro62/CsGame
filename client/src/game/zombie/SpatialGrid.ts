export class SpatialGrid {
  private cells = new Map<string, Set<string>>();
  constructor(private cellSize: number) {}
  private key(x: number, z: number) { return `${Math.floor(x/this.cellSize)},${Math.floor(z/this.cellSize)}`; }
  insert(id: string, x: number, z: number) {
    const k = this.key(x, z);
    if (!this.cells.has(k)) this.cells.set(k, new Set());
    this.cells.get(k)!.add(id);
  }
  query(x: number, z: number, radius: number): Set<string> {
    const result = new Set<string>();
    const r = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize), cz = Math.floor(z / this.cellSize);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const cell = this.cells.get(`${cx+dx},${cz+dz}`);
      if (cell) cell.forEach(id => result.add(id));
    }
    return result;
  }
  clear() { this.cells.clear(); }
}
