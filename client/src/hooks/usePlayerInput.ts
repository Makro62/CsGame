import { useEffect, useRef } from "react";
import { PHYSICS } from "@cs-game/shared";

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  use: boolean;
  ads: boolean;
  shoot: boolean;
  reload: boolean;
  jumpBuffer: number[];
}

export function usePlayerInput() {
  const keys = useRef<Record<string, boolean>>({});
  const jumpBuffer = useRef<number[]>([]);
  const crouchReleasedAt = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Space") {
        jumpBuffer.current.push(performance.now());
        if (jumpBuffer.current.length > 5) jumpBuffer.current.shift();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        crouchReleasedAt.current = performance.now();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        jumpBuffer.current.push(performance.now());
        if (jumpBuffer.current.length > 5) jumpBuffer.current.shift();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) keys.current["Mouse1"] = true;
      if (e.button === 2) keys.current["Mouse2"] = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) keys.current["Mouse1"] = false;
      if (e.button === 2) keys.current["Mouse2"] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onWheel);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const getInput = (): PlayerInput => {
    const k = keys.current;
    const now = performance.now();

    // Prune old jump buffer entries
    jumpBuffer.current = jumpBuffer.current.filter(
      (t) => now - t <= PHYSICS.inputWindowMs
    );

    return {
      forward: !!k["KeyW"],
      backward: !!k["KeyS"],
      left: !!k["KeyA"],
      right: !!k["KeyD"],
      jump: !!k["Space"],
      sprint: !!k["ShiftLeft"] || !!k["ShiftRight"],
      crouch: !!k["ControlLeft"] || !!k["ControlRight"],
      use: !!k["KeyE"],
      ads: !!k["Mouse2"],
      shoot: !!k["Mouse1"],
      reload: !!k["KeyR"],
      jumpBuffer: [...jumpBuffer.current],
    };
  };

  const pushJumpBuffer = () => {
    jumpBuffer.current.push(performance.now());
    if (jumpBuffer.current.length > 5) jumpBuffer.current.shift();
  };

  const getCrouchReleasedAt = () => crouchReleasedAt.current;

  return { getInput, pushJumpBuffer, getCrouchReleasedAt };
}
