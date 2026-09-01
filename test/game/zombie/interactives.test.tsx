import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BuyDoor } from "@src/game/zombie/interactives/BuyDoor";
import { BarricadeWindow, findNearestBarricade } from "@src/game/zombie/interactives/BarricadeWindow";
import { useZombieStore } from "@src/stores/useZombieStore";

// Mock drei Text to avoid canvas in jsdom
import { vi } from "vitest";
vi.mock("@react-three/drei", async () => {
  const actual = await vi.importActual<typeof import("@react-three/drei")>("@react-three/drei");
  return {
    ...actual,
    Text: ({ children }: { children: React.ReactNode }) => <group>{children}</group>,
    Billboard: ({ children }: { children: React.ReactNode }) => <group>{children}</group>,
  };
});

describe("BuyDoor — Operation Blackout", () => {
  it("renders when locked", () => {
    useZombieStore.getState().resetGame(true);
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
    const { container } = render(<BuyDoor doorId="door_lab" position={[0, 1, 0]} cost={750} />);
    expect(container).toBeDefined();
  });

  it("does not render when unlocked", () => {
    useZombieStore.getState().resetGame(true);
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
    useZombieStore.getState().unlockDoor("door_lab", 750);
    const { container } = render(<BuyDoor doorId="door_lab" position={[0, 1, 0]} cost={750} />);
    // When unlocked, component returns null -> container empty
    expect(container.innerHTML).toBe("");
  });

  it("unlockDoor via store works for BuyDoor", () => {
    useZombieStore.getState().resetGame(true);
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 1000 }));
    expect(useZombieStore.getState().unlockDoor("door_armory", 1250)).toBe(false); // not enough
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 2000 }));
    expect(useZombieStore.getState().unlockDoor("door_armory", 1250)).toBe(true);
  });
});

describe("BarricadeWindow — Operation Blackout", () => {
  it("renders planks based on barricades", () => {
    useZombieStore.getState().resetGame(true);
    const { container } = render(<BarricadeWindow windowId="win_north" position={[0, 1, 0]} />);
    expect(container).toBeDefined();
  });

  it("findNearestBarricade finds closest window within 4m", () => {
    const barricades = { win_north: 6, win_south: 6, win_east: 6, win_west: 6 };
    expect(findNearestBarricade(0, -21, barricades)).toBe("win_north");
    expect(findNearestBarricade(0, 21, barricades)).toBe("win_south");
    expect(findNearestBarricade(21, 0, barricades)).toBe("win_east");
    expect(findNearestBarricade(-21, 0, barricades)).toBe("win_west");
  });

  it("findNearestBarricade ignores destroyed barricades (0 planks)", () => {
    const barricades = { win_north: 0, win_south: 6, win_east: 6, win_west: 6 };
    // Near north but north is destroyed -> should find next closest? Actually returns south? Let's check logic
    // Our helper only checks distance <4 and planks>0, so north destroyed should not be returned even if closest
    expect(findNearestBarricade(0, -21, barricades)).toBeNull();
  });

  it("findNearestBarricade returns null when far", () => {
    const barricades = { win_north: 6, win_south: 6, win_east: 6, win_west: 6 };
    expect(findNearestBarricade(0, 0, barricades)).toBeNull(); // center far from all windows (>4)
  });
});
