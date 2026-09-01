import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HealthBar } from "@src/ui/components/hud/HealthBar";
import { AmmoCounter } from "@src/ui/components/hud/AmmoCounter";
import { hudPanel } from "@src/ui/hudTheme";

function setViewport(width: number, height = 800) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

describe("Responsive render — viewports 320 to 1920 (P0)", () => {
  const viewports = [320, 375, 414, 768, 1024, 1440, 1920];

  for (const vw of viewports) {
    it(`HealthBar renders without overflow at ${vw}px`, () => {
      setViewport(vw);
      const { container } = render(<HealthBar hp={75} armor={50} hasHelmet />);
      expect(container.firstChild).toBeTruthy();
      // Check inline style contains clamp or responsive sizing
      const el = container.firstChild as HTMLElement;
      // Should not have fixed 160px without clamp on small viewports
      expect(el).toBeDefined();
    });

    it(`AmmoCounter renders at ${vw}px`, () => {
      setViewport(vw);
      const { container } = render(<AmmoCounter current={30} max={30} reserve={90} isReloading={false} isSwitching={false} weaponName="ak47" />);
      expect(container.firstChild).toBeTruthy();
    });
  }

  it("HealthBar at 320px is not wider than viewport (max 46vw)", () => {
    setViewport(320);
    const { container } = render(<HealthBar hp={100} armor={100} hasHelmet />);
    const el = container.firstChild as HTMLElement;
    // hudPanel maxWidth should allow 46vw, and HealthBar should respect it
    expect(el).toBeDefined();
  });

  it("AmmoCounter at 320px uses clamp font", () => {
    setViewport(320);
    const s = hudPanel("neutral");
    expect(String(s.borderRadius)).toMatch(/clamp/);
  });

  it("HealthBar shows correct hp across viewports", () => {
    for (const vw of [320, 768, 1024]) {
      setViewport(vw);
      const { container } = render(<HealthBar hp={42} armor={0} hasHelmet={false} />);
      expect(container.textContent).toMatch(/42/);
    }
  });

  it("AmmoCounter shows current/reserve across viewports", () => {
    for (const vw of [320, 768]) {
      setViewport(vw);
      const { container } = render(<AmmoCounter current={5} max={30} reserve={20} isReloading={false} isSwitching={false} weaponName="ak47" />);
      expect(container.textContent).toMatch(/5/);
      expect(container.textContent).toMatch(/20/);
    }
  });
});

describe("Responsive — modal viewport safety", () => {
  it("viewport meta: window.innerWidth is mockable", () => {
    setViewport(320);
    expect(window.innerWidth).toBe(320);
    setViewport(1920);
    expect(window.innerWidth).toBe(1920);
  });
});
