import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { useAimStore } from "@src/stores/useAimStore";

beforeEach(() => {
  useAimStore.setState({
    origin: new THREE.Vector3(0, 0.35, -30),
    direction: new THREE.Vector3(0, 0, 1),
    yaw: 0,
    pos: new THREE.Vector3(0, 0, -30),
    cursorNdc: { x: 0, y: 0 },
  });
});

describe("useAimStore", () => {
  it("setAim clones vectors (original not mutated)", () => {
    const origin = new THREE.Vector3(1, 2, 3);
    const dir = new THREE.Vector3(0, 0, 1);
    const pos = new THREE.Vector3(4, 5, 6);
    useAimStore.getState().setAim(origin, dir, 0.5, pos);
    origin.set(99, 99, 99);
    expect(useAimStore.getState().origin.x).toBe(1);
  });

  it("setAim ignores null/undefined input (previously crash)", () => {
    const before = useAimStore.getState().origin.clone();
    // @ts-expect-error testing runtime guard
    useAimStore.getState().setAim(null, new THREE.Vector3(), 0, new THREE.Vector3());
    expect(useAimStore.getState().origin.equals(before)).toBe(true);
  });

  it("setAim ignores NaN yaw (previously NaN poisoning)", () => {
    const before = useAimStore.getState().yaw;
    useAimStore.getState().setAim(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), NaN, new THREE.Vector3());
    expect(useAimStore.getState().yaw).toBe(before);
  });

  it("setAim ignores Infinity yaw", () => {
    const before = useAimStore.getState().yaw;
    useAimStore.getState().setAim(new THREE.Vector3(), new THREE.Vector3(), Infinity, new THREE.Vector3());
    expect(useAimStore.getState().yaw).toBe(before);
  });

  it("setCursorNdc sets valid values", () => {
    useAimStore.getState().setCursorNdc(0.5, -0.5);
    expect(useAimStore.getState().cursorNdc).toEqual({ x: 0.5, y: -0.5 });
  });

  it("setCursorNdc ignores NaN (previously NaN poisoning)", () => {
    useAimStore.getState().setCursorNdc(0.5, 0.5);
    useAimStore.getState().setCursorNdc(NaN, 0);
    expect(useAimStore.getState().cursorNdc).toEqual({ x: 0.5, y: 0.5 });
  });

  it("setCursorNdc ignores Infinity", () => {
    useAimStore.getState().setCursorNdc(0, 0);
    useAimStore.getState().setCursorNdc(Infinity, 0);
    expect(useAimStore.getState().cursorNdc).toEqual({ x: 0, y: 0 });
  });

  it("initial state has expected defaults", () => {
    const s = useAimStore.getState();
    expect(s.origin.y).toBeCloseTo(0.35);
    expect(s.direction.z).toBe(1);
    expect(s.yaw).toBe(0);
  });
});
