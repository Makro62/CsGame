import { describe, it, expect } from "vitest";
import { SpatialGrid } from "../../../client/src/game/zombie/SpatialGrid";

describe("SpatialGrid", () => {
  it("inserts and queries entities in same cell", () => {
    const grid = new SpatialGrid(5);
    grid.insert("a", 1, 1);
    grid.insert("b", 2, 2);
    const result = grid.query(1, 1, 5);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
  });

  it("does not return entities outside query radius", () => {
    const grid = new SpatialGrid(5);
    grid.insert("a", 0, 0);
    grid.insert("b", 20, 20);
    const result = grid.query(0, 0, 5);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(false);
  });

  it("clear removes all entities", () => {
    const grid = new SpatialGrid(5);
    grid.insert("a", 1, 1);
    grid.clear();
    const result = grid.query(1, 1, 5);
    expect(result.size).toBe(0);
  });

  it("queryArr returns array from query", () => {
    const grid = new SpatialGrid(5);
    grid.insert("a", 1, 1);
    grid.insert("b", 2, 2);
    const arr = grid.queryArr(1, 1, 10);
    expect(arr).toContain("a");
    expect(arr).toContain("b");
  });

  it("handles negative coordinates", () => {
    const grid = new SpatialGrid(5);
    grid.insert("a", -10, -10);
    const result = grid.query(-10, -10, 5);
    expect(result.has("a")).toBe(true);
  });

  it("handles large coordinates", () => {
    const grid = new SpatialGrid(5);
    grid.insert("a", 1000, 1000);
    const result = grid.query(1000, 1000, 5);
    expect(result.has("a")).toBe(true);
  });
});
