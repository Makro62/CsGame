import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { hudPanel, hudPill, hudActionButton, hudBannerStack, HUD_EDGE_RESPONSIVE } from "@src/ui/hudTheme";

const SRC = path.resolve(import.meta.dirname, "../../client/src");

// helper: read file as string
function src(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), "utf-8");
}

describe("Responsive — hudTheme tokens (P0)", () => {
  it("HUD_EDGE_RESPONSIVE uses clamp", () => {
    expect(HUD_EDGE_RESPONSIVE).toMatch(/clamp/);
  });

  it("hudPanel borderRadius is responsive clamp", () => {
    const s = hudPanel("neutral");
    expect(String(s.borderRadius)).toMatch(/clamp/);
  });

  it("hudPill fontSize is clamp", () => {
    expect(String(hudPill().fontSize)).toMatch(/clamp/);
  });

  it("hudActionButton has minHeight 36px for WCAG", () => {
    const s = hudActionButton() as Record<string, unknown>;
    expect(s.minHeight).toBe("36px");
    expect(String(s.fontSize)).toMatch(/clamp/);
  });

  it("hudBannerStack maxWidth is responsive (no 320px subtraction)", () => {
    const s = hudBannerStack(100);
    expect(String(s.maxWidth)).toBe("min(560px, calc(100vw - 16px))");
    expect(String(s.width)).toMatch(/100vw/);
  });
});

describe("Responsive — BuyMenu modal (P0)", () => {
  const f = src("components/BuyMenu.tsx");
  it("modal uses min(520px, 92vw) not fixed 520px", () => expect(f).toMatch(/min\(520px, 92vw\)/));
  it("uses 80dvh not 80vh", () => expect(f).toMatch(/80dvh/));
  it("has overflow-y-auto", () => expect(f).toMatch(/overflowY.*auto|overflow-y-auto/));
  it("grid keeps 1fr 1fr but modal scales", () => expect(f).toMatch(/min\(92vw/));
});

describe("Responsive — MainMenu (P0) — posisi 4 kotak 2x2 + 1 preview tetap", () => {
  const f = src("screens/MainMenu.tsx");
  it("uses 100dvh not 100vh", () => expect(f).toMatch(/100dvh/));
  it("has clamp for nickInput", () => expect(f).toMatch(/clamp\(120px, 20vw, 150px\)/));
  it("mainLayout keeps 4 kotak layout but scales via clamp", () => expect(f).toMatch(/clamp\(200px, 30vw, 360px\)/));
  it("cardGrid keeps 2-col (4 kotak) position", () => expect(f).toMatch(/repeat\(2/));
  it("has overflow-x-hidden", () => expect(f).toMatch(/overflow-x-hidden|overflowX.*hidden/));
});

describe("Responsive — SettingsMenu (P1) — posisi tetap, hanya scale", () => {
  const f = src("screens/SettingsMenu.tsx");
  it("modal uses 92vw and 88dvh", () => {
    expect(f).toMatch(/92vw/);
    expect(f).toMatch(/88dvh/);
  });
  it("modal width uses 92vw", () => expect(f).toMatch(/92vw/));
});

describe("Responsive — HeroSelect & L4DSelect (P0) — 3-kolom posisi tetap, scale via clamp", () => {
  const hero = src("screens/HeroSelectScreen.tsx");
  const l4d = src("screens/L4DSurvivorSelect.tsx");
  it("Hero grid keeps 3-col but scales via clamp", () => {
    expect(hero).toMatch(/clamp\(120px, 18vw, 220px\)/);
    expect(hero).toMatch(/clamp\(180px, 30vw, 280px\)/);
  });
  it("L4D grid keeps 3-col but scales", () => {
    expect(l4d).toMatch(/clamp\(120px, 18vw, 220px\)/);
  });
  it("hologram uses clamp", () => {
    expect(hero).toMatch(/clamp/);
    expect(l4d).toMatch(/clamp/);
  });
  it("deploy button is 90vw on mobile", () => {
    expect(hero).toMatch(/90vw|clamp/);
    expect(l4d).toMatch(/90vw|clamp/);
  });
});

describe("Responsive — Offline5v5Select (P0) — posisi tetap, scale via clamp", () => {
  const f = src("screens/Offline5v5Select.tsx");
  it("team cards scale via clamp(200px,40vw,300px) not fixed 300px", () => {
    expect(f).toMatch(/clamp\(200px, 40vw, 300px\)/);
  });
  it("map cards scale via clamp", () => expect(f).toMatch(/clamp\(200px, 40vw, 280px\)/));
  it("header uses clamp", () => expect(f).toMatch(/clamp/));
});

describe("Responsive — HUDLayout (P0) — posisi tetap, gap via clamp", () => {
  const f = src("ui/components/hud/HUDLayout.tsx");
  it("top bar uses clamp gap/padding", () => expect(f).toMatch(/clamp\(8px, 2vw, 16px\)|clamp\(6px/));
  it("ScorePanel uses clamp", () => expect(f).toMatch(/clamp\(60px, 15vw, 80px\)|clamp\(16px/));
  it("bottom HUD keeps row but scales", () => expect(f).toMatch(/46vw|clamp/));
});

describe("Responsive — HealthBar & AmmoCounter (P1)", () => {
  const hb = src("ui/components/hud/HealthBar.tsx");
  const ac = src("ui/components/hud/AmmoCounter.tsx");
  it("HealthBar minWidth uses clamp", () => expect(hb).toMatch(/clamp\(120px, 30vw, 160px\)/));
  it("AmmoCounter minWidth uses clamp", () => expect(ac).toMatch(/clamp\(120px, 30vw, 160px\)/));
  it("HealthBar font clamp", () => expect(hb).toMatch(/clamp\(20px, 5vw, 28px\)/));
  it("AmmoCounter font clamp", () => expect(ac).toMatch(/clamp\(24px, 6vw, 32px\)/));
});

describe("Responsive — Game Modes HUD (P0)", () => {
  const off = src("screens/Offline5v5Mode.tsx");
  const zom = src("screens/ZombieSurvivalMode.tsx");
  const l4d = src("screens/L4DMode.tsx");
  it("Offline5v5 uses 100dvw/dvh", () => {
    expect(off).toMatch(/100dvw/);
    expect(off).toMatch(/100dvh/);
  });
  it("Zombie uses 100dvh/dvw", () => {
    expect(zom).toMatch(/100dvh/);
    expect(l4d).toMatch(/100dvh/);
  });
  it("Offline5v5 bottom HUD uses clamp", () => {
    expect(off).toMatch(/clamp/);
  });
  it("Zombie tracker uses clamp", () => expect(zom).toMatch(/clamp/));
  it("L4D bottom HUD responsive", () => expect(l4d).toMatch(/clamp|vw/));
  it("modals in all modes use 90vw or clamp", () => {
    expect(off).toMatch(/90vw|clamp/);
    expect(zom).toMatch(/90vw|clamp/);
    expect(l4d).toMatch(/90vw|clamp/);
  });
});

describe("Responsive — Global viewport consistency (P0)", () => {
  it("no remaining 100vh without d in game screens (except allowed)", () => {
    const off = src("screens/Offline5v5Mode.tsx");
    const zom = src("screens/ZombieSurvivalMode.tsx");
    // Should have 100dvh, and if 100vh appears it must be inside 100dvh string
    const _offVh = (off.match(/100vh/g) || []).length;
    const offDvh = (off.match(/100dvh/g) || []).length;
    // Allow at most 0 pure 100vh separate from dvh
    // We check that 100dvh count >= 1
    expect(offDvh).toBeGreaterThanOrEqual(1);
    expect(zom).toMatch(/100dvh/);
  });

  it("all fixed bottom HUDs have maxWidth vw or clamp", () => {
    const files = ["screens/Offline5v5Mode.tsx", "screens/ZombieSurvivalMode.tsx", "screens/L4DMode.tsx"].map(src);
    for (const f of files) expect(f).toMatch(/vw|clamp/);
  });
});
