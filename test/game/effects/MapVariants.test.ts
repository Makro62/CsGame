import { describe, it, expect } from "vitest";
import {
  getDefaultVariant,
  getWeatherAmbientColor,
  getWeatherFogColor,
  getWeatherFogNear,
  getWeatherFogFar,
  getTimeColors,
  computeLighting,
  getWeatherParticles,
} from "../../../client/src/game/effects/MapVariants";

describe("MapVariants", () => {
  describe("getDefaultVariant", () => {
    it("returns deterministic variant for same seed", () => {
      const v1 = getDefaultVariant(42);
      const v2 = getDefaultVariant(42);
      expect(v1.weather).toBe(v2.weather);
      expect(v1.timeOfDay).toBe(v2.timeOfDay);
      expect(v1.season).toBe(v2.season);
    });

    it("includes seed in result", () => {
      const v = getDefaultVariant(42);
      expect(v.seed).toBe(42);
    });
  });

  describe("getWeatherAmbientColor", () => {
    it("returns hex color for all weather types", () => {
      const weathers = ["clear", "rain", "fog", "dust", "snow"] as const;
      for (const w of weathers) {
        const color = getWeatherAmbientColor(w);
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe("getWeatherFogColor", () => {
    it("returns hex color for all weather types", () => {
      const weathers = ["clear", "rain", "fog", "dust", "snow"] as const;
      for (const w of weathers) {
        const color = getWeatherFogColor(w);
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe("getWeatherFogNear", () => {
    it("returns positive number for all weather types", () => {
      const weathers = ["clear", "rain", "fog", "dust", "snow"] as const;
      for (const w of weathers) {
        expect(getWeatherFogNear(w)).toBeGreaterThan(0);
      }
    });
  });

  describe("getWeatherFogFar", () => {
    it("returns positive number for all weather types", () => {
      const weathers = ["clear", "rain", "fog", "dust", "snow"] as const;
      for (const w of weathers) {
        expect(getWeatherFogFar(w)).toBeGreaterThan(0);
      }
    });
  });

  describe("getTimeColors", () => {
    it("returns valid config for all times", () => {
      const times = ["dawn", "morning", "noon", "afternoon", "dusk", "night"] as const;
      for (const t of times) {
        const tc = getTimeColors(t);
        expect(tc.ambient).toMatch(/^#[0-9a-f]{6}$/);
        expect(tc.directional).toMatch(/^#[0-9a-f]{6}$/);
        expect(tc.directionalIntensity).toBeGreaterThan(0);
        expect(tc.ambientIntensity).toBeGreaterThan(0);
      }
    });
  });

  describe("computeLighting", () => {
    it("returns valid lighting config", () => {
      const lighting = computeLighting({
        weather: "clear",
        timeOfDay: "noon",
        season: "summer",
        seed: 42,
      });
      expect(lighting.ambientColor).toBeTruthy();
      expect(lighting.fogNear).toBeGreaterThan(0);
      expect(lighting.fogFar).toBeGreaterThan(lighting.fogNear);
    });
  });

  describe("getWeatherParticles", () => {
    it("returns rain particles for rain weather", () => {
      const p = getWeatherParticles("rain", "spring");
      expect(p.type).toBe("rain");
      expect(p.count).toBeGreaterThan(0);
    });

    it("returns snow particles for snow weather", () => {
      const p = getWeatherParticles("snow", "winter");
      expect(p.type).toBe("snow");
      expect(p.count).toBeGreaterThan(0);
    });

    it("returns embers for clear autumn", () => {
      const p = getWeatherParticles("clear", "autumn");
      expect(p.type).toBe("embers");
    });

    it("returns none for clear non-autumn", () => {
      const p = getWeatherParticles("clear", "summer");
      expect(p.type).toBe("none");
      expect(p.count).toBe(0);
    });

    it("returns dust particles for dust weather", () => {
      const p = getWeatherParticles("dust", "summer");
      expect(p.type).toBe("dust");
      expect(p.count).toBe(200);
      expect(p.speed).toBe(1.5);
      expect(p.size).toBe(0.12);
      expect(p.color).toBe("#d4a574");
      expect(p.opacity).toBe(0.25);
      expect(p.windX).toBe(3);
      expect(p.windZ).toBe(1);
    });

    it("returns fog particles for fog weather", () => {
      const p = getWeatherParticles("fog", "spring");
      expect(p.type).toBe("dust");
      expect(p.count).toBe(100);
      expect(p.speed).toBe(0.5);
      expect(p.size).toBe(2);
      expect(p.color).toBe("#9ca3af");
      expect(p.opacity).toBe(0.1);
      expect(p.windX).toBe(0.5);
      expect(p.windZ).toBe(0.2);
    });
  });
});
