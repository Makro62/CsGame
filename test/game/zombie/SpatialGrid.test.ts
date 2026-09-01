import { describe, it, expect, beforeEach } from "vitest";
import { SpatialGrid } from "@src/game/zombie/SpatialGrid";

let grid: SpatialGrid;

beforeEach(() => {
  grid = new SpatialGrid(10);
});

describe("SpatialGrid", () => {
  it("insert and query finds nearby entities", () => {
    grid.insert("a", 5, 5);
    grid.insert("b", 6, 6);
    grid.insert("c", 50, 50);
    const near = grid.query(5, 5, 5);
    expect(near.has("a")).toBe(true);
    expect(near.has("b")).toBe(true);
    expect(near.has("c")).toBe(false);
  });

  it("clear removes all entities", () => {
    grid.insert("a", 5, 5);
    grid.clear();
    const result = grid.query(5, 5, 10);
    expect(result.size).toBe(0);
  });

  it("handles negative coordinates", () => {
    grid.insert("a", -10, -20);
    const result = grid.query(-10, -20, 5);
    expect(result.has("a")).toBe(true);
  });

  it("handles zero radius", () => {
    grid.insert("a", 5, 5);
    grid.insert("b", 15, 15); // different cell with cellSize=10
    const result = grid.query(5, 5, 0);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(false);
  });

  it("queryArr returns array form of query", () => {
    grid.insert("a", 5, 5);
    grid.insert("b", 50, 50);
    const arr = grid.queryArr(5, 5, 5);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toContain("a");
    expect(arr).not.toContain("b");
  });

  it("queryArr reuses array on dirty flag", () => {
    grid.insert("a", 5, 5);
    const arr1 = grid.queryArr(5, 5, 10);
    expect(arr1).toContain("a");
    // Insert new entity without clearing — query again
    grid.insert("b", 6, 6);
    const arr2 = grid.queryArr(5, 5, 10);
    // Since _queryDirty is set to true after query(), it should rebuild
    expect(arr2).toContain("b");
  });

  it("handles overlapping cells across boundaries", () => {
    grid.insert("a", 9, 9);
    grid.insert("b", 11, 11);
    // Both should be in adjacent cells
    const result = grid.query(10, 10, 5);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
  });

  it("query with large radius covers many cells", () => {
    for (let i = 0; i < 20; i++) {
      grid.insert(`e${i}`, i * 10, 0);
    }
    const result = grid.query(100, 0, 100);
    expect(result.size).toBeGreaterThan(0);
  });

  it("handles very small cell size", () => {
    const smallGrid = new SpatialGrid(0.1);
    smallGrid.insert("a", 0.05, 0.05);
    const result = smallGrid.query(0.05, 0.05, 0.5);
    expect(result.has("a")).toBe(true);
  });

  it("deduplicates same entity in same cell", () => {
    grid.insert("a", 5, 5);
    grid.insert("a", 5, 5);
    const result = grid.query(5, 5, 10);
    // Set prevents duplicates
    let count = 0;
    result.forEach(() => count++);
    expect(count).toBe(1);
  });
});