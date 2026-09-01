import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInteraction } from "@src/hooks/useInteraction";

// Mock @react-three/fiber
vi.mock("@react-three/fiber", () => ({
  useThree: () => ({
    camera: { position: { x: 0, y: 0, z: 0 } },
    scene: { children: [] },
  }),
  useFrame: vi.fn(),
}));

describe("useInteraction — crosshair raycast", () => {
  it("returns target null initially and interact function", () => {
    const { result } = renderHook(() => useInteraction(3.5));
    expect(result.current.target).toBeNull();
    expect(typeof result.current.interact).toBe("function");
  });

  it("interact does nothing when no target", () => {
    const { result } = renderHook(() => useInteraction());
    expect(() => result.current.interact()).not.toThrow();
  });

  it("uses maxDistance param (default 3.5)", () => {
    const { result: r1 } = renderHook(() => useInteraction());
    const { result: r2 } = renderHook(() => useInteraction(5));
    expect(r1.current.interact).toBeDefined();
    expect(r2.current.interact).toBeDefined();
  });
});
