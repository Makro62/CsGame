export class SpatialGrid {
  private cells = new Map<number, Set<string>>();
  private _queryResult = new Set<string>();
  private _queryResultArr: string[] = [];
  private _queryDirty = true;

  constructor(private cellSize: number) {}

  private key(x: number, z: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return (cx << 16) | (cz & 0xffff);
  }

  insert(id: string, x: number, z: number) {
    const k = this.key(x, z);
    let cell = this.cells.get(k);
    if (!cell) { cell = new Set(); this.cells.set(k, cell); }
    cell.add(id);
  }

  /** Returns reusable Set — cleared on next query(). Do NOT cache across frames. */
  query(x: number, z: number, radius: number): Set<string> {
    this._queryResult.clear();
    const r = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cell = this.cells.get(((cx + dx) << 16) | ((cz + dz) & 0xffff));
        if (cell) cell.forEach(id => this._queryResult.add(id));
      }
    }
    this._queryDirty = true;
    return this._queryResult;
  }

  /** Returns reusable array from last query(). No allocation after first call. */
  queryArr(x: number, z: number, radius: number): string[] {
    this.query(x, z, radius);
    if (this._queryDirty) {
      this._queryResultArr = Array.from(this._queryResult);
      this._queryDirty = false;
    }
    return this._queryResultArr;
  }

  clear() { this.cells.clear(); }
}
