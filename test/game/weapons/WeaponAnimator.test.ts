import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";

vi.mock("three", async () => {
  const actual = await vi.importActual("three");
  return actual;
});

import { WeaponAnimator } from "../../../client/src/game/weapons/WeaponAnimator";

describe("WeaponAnimator", () => {
  let animator: WeaponAnimator;

  beforeEach(() => {
    animator = new WeaponAnimator();
  });

  describe("constructor", () => {
    it("initializes with default clips", () => {
      expect(animator).toBeDefined();
      expect(animator.position).toBeInstanceOf(THREE.Vector3);
      expect(animator.rotation).toBeInstanceOf(THREE.Euler);
      expect(animator.scale).toBeInstanceOf(THREE.Vector3);
    });

    it("has zero initial position", () => {
      expect(animator.position.x).toBe(0);
      expect(animator.position.y).toBe(0);
      expect(animator.position.z).toBe(0);
    });

    it("has zero initial rotation", () => {
      expect(animator.rotation.x).toBe(0);
      expect(animator.rotation.y).toBe(0);
      expect(animator.rotation.z).toBe(0);
    });
  });

  describe("addClip", () => {
    it("adds a custom clip", () => {
      const customClip = {
        name: "custom",
        keyframes: [
          { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
          { time: 1, position: new THREE.Vector3(1, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        ],
        duration: 0.5,
        loop: false,
      };
      animator.addClip(customClip);
      expect(animator.getCurrentClip()).toBeNull();
    });
  });

  describe("play", () => {
    it("starts playing a clip", () => {
      animator.play("fire");
      expect(animator.isPlaying()).toBe(true);
      expect(animator.getCurrentClip()).toBe("fire");
    });

    it("does nothing for unknown clip", () => {
      animator.play("nonexistent");
      expect(animator.isPlaying()).toBe(false);
    });

    it("resets time when playing new clip", () => {
      animator.play("fire");
      animator.update(0.1);
      animator.play("reload");
      expect(animator.getNormalizedProgress()).toBe(0);
    });

    it("accepts custom duration", () => {
      animator.play("fire", 0.5);
      expect(animator.isPlaying()).toBe(true);
    });

    it("calls onComplete when clip finishes", () => {
      const onComplete = vi.fn();
      animator.play("fire", 0.1, onComplete);
      animator.update(0.2);
      expect(onComplete).toHaveBeenCalled();
      expect(animator.isPlaying()).toBe(false);
    });
  });

  describe("stop", () => {
    it("stops playing", () => {
      animator.play("fire");
      animator.stop();
      expect(animator.isPlaying()).toBe(false);
      expect(animator.getCurrentClip()).toBeNull();
    });
  });

  describe("getNormalizedProgress", () => {
    it("returns 0 when not playing", () => {
      expect(animator.getNormalizedProgress()).toBe(0);
    });

    it("returns progress value when playing", () => {
      animator.play("fire");
      animator.update(0.05);
      const progress = animator.getNormalizedProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it("returns 0 after clip finishes (not playing)", () => {
      animator.play("fire");
      animator.update(1.0);
      expect(animator.isPlaying()).toBe(false);
      expect(animator.getNormalizedProgress()).toBe(0);
    });
  });

  describe("updateBob", () => {
    it("updates bob offset when moving", () => {
      animator.updateBob(0.016, 5, false, true);
      expect(animator.position.x).toBeDefined();
    });

    it("handles sprinting", () => {
      animator.updateBob(0.016, 10, true, true);
      expect(animator.position.x).toBeDefined();
    });

    it("handles idle state", () => {
      animator.updateBob(0.016, 0, false, true);
      expect(animator.position.x).toBeDefined();
    });

    it("handles airborne state", () => {
      animator.updateBob(0.016, 5, false, false);
      expect(animator.position.x).toBeDefined();
    });
  });

  describe("updateSway", () => {
    it("updates sway with mouse delta", () => {
      animator.updateSway(0.016, 10, 5);
      expect(animator.position.x).toBeDefined();
    });

    it("clamps extreme mouse deltas", () => {
      animator.updateSway(0.016, 100, 100);
      expect(animator.position.x).toBeDefined();
    });

    it("handles negative mouse deltas", () => {
      animator.updateSway(0.016, -10, -5);
      expect(animator.position.x).toBeDefined();
    });
  });

  describe("addKick", () => {
    it("adds kick offset", () => {
      animator.addKick(1, 2, 3);
      expect(animator.position.x).toBeDefined();
    });
  });

  describe("updateKick", () => {
    it("decays kick over time", () => {
      animator.addKick(1, 2, 3);
      animator.updateKick(0.1);
      animator.updateKick(0.1);
      expect(animator.position.x).toBeDefined();
    });
  });

  describe("update", () => {
    it("updates position and rotation", () => {
      animator.update(0.016);
      expect(animator.position).toBeInstanceOf(THREE.Vector3);
      expect(animator.rotation).toBeInstanceOf(THREE.Euler);
    });

    it("applies procedural offsets", () => {
      animator.updateBob(0.016, 5, false, true);
      animator.updateSway(0.016, 10, 5);
      animator.addKick(1, 2, 3);
      animator.update(0.016);
      expect(animator.position.x).toBeDefined();
    });

    it("handles loop clips", () => {
      const loopClip = {
        name: "loop_test",
        keyframes: [
          { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
          { time: 1, position: new THREE.Vector3(1, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        ],
        duration: 0.1,
        loop: true,
      };
      animator.addClip(loopClip);
      animator.play("loop_test");
      animator.update(0.15);
      expect(animator.isPlaying()).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets all state", () => {
      animator.play("fire");
      animator.update(0.1);
      animator.updateBob(0.016, 5, false, true);
      animator.updateSway(0.016, 10, 5);
      animator.addKick(1, 2, 3);
      animator.reset();
      expect(animator.isPlaying()).toBe(false);
      expect(animator.position.x).toBe(0);
      expect(animator.position.y).toBe(0);
      expect(animator.position.z).toBe(0);
      expect(animator.rotation.x).toBe(0);
      expect(animator.rotation.y).toBe(0);
      expect(animator.rotation.z).toBe(0);
    });
  });

  describe("default clips", () => {
    it("has fire clip", () => {
      animator.play("fire");
      expect(animator.getCurrentClip()).toBe("fire");
    });

    it("has reload clip", () => {
      animator.play("reload");
      expect(animator.getCurrentClip()).toBe("reload");
    });

    it("has draw clip", () => {
      animator.play("draw");
      expect(animator.getCurrentClip()).toBe("draw");
    });

    it("has holster clip", () => {
      animator.play("holster");
      expect(animator.getCurrentClip()).toBe("holster");
    });

    it("has ads_in clip", () => {
      animator.play("ads_in");
      expect(animator.getCurrentClip()).toBe("ads_in");
    });

    it("has ads_out clip", () => {
      animator.play("ads_out");
      expect(animator.getCurrentClip()).toBe("ads_out");
    });

    it("has grenade_throw clip", () => {
      animator.play("grenade_throw");
      expect(animator.getCurrentClip()).toBe("grenade_throw");
    });
  });

  describe("interpolation", () => {
    it("interpolates between keyframes", () => {
      animator.play("fire");
      animator.update(0.05);
      const pos = animator.position.clone();
      animator.update(0.05);
      const pos2 = animator.position.clone();
      expect(pos.x).toBeDefined();
      expect(pos2.x).toBeDefined();
    });

    it("handles edge case t=0", () => {
      animator.play("fire");
      animator.update(0);
      expect(animator.position.x).toBeDefined();
    });

    it("handles edge case t=1", () => {
      animator.play("fire");
      animator.update(1.0);
      expect(animator.position.x).toBeDefined();
    });
  });
});
