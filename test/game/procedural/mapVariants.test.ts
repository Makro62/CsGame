import { describe, it, expect } from "vitest";
import {
  getWeatherAmbientColor,
  getWeatherFogNear,
  getWeatherFogFar,
  getTimeColors,
  getWeatherParticles,
  getDefaultVariant,
  computeLighting,
  type WeatherType,
  type TimeOfDay,
} from "@src/game/effects/MapVariants";

describe("MapVariants", () => {
  it("getDefaultVariant is deterministic", () => {
    expect(getDefaultVariant(42)).toEqual(getDefaultVariant(42));
  });

  it("computeLighting returns intensities and fog range", () => {
    const lighting = computeLighting(getDefaultVariant(7));
    expect(lighting.ambientIntensity).toBeGreaterThan(0);
    expect(lighting.fogNear).toBeLessThan(lighting.fogFar);
  });

  it("weather helpers cover all types", () => {
    const types: WeatherType[] = ["clear", "rain", "fog", "dust", "snow"];
    for (const t of types) {
      expect(getWeatherAmbientColor(t)).toMatch(/^#[0-9a-f]{6}$/);
      expect(getWeatherFogNear(t)).toBeLessThan(getWeatherFogFar(t));
    }
  });

  it("time colors exist for each time of day", () => {
    const times: TimeOfDay[] = ["dawn", "morning", "noon", "afternoon", "dusk", "night"];
    for (const t of times) {
      const colors = getTimeColors(t);
      expect(colors.directionalIntensity).toBeGreaterThan(0);
    }
    expect(getTimeColors("night").directionalIntensity).toBeLessThan(getTimeColors("noon").directionalIntensity);
  });

  it("weather particles match weather type", () => {
    expect(getWeatherParticles("rain", "summer").type).toBe("rain");
    expect(getWeatherParticles("snow", "winter").type).toBe("snow");
    expect(getWeatherParticles("clear", "summer").type).toBe("none");
    expect(getWeatherParticles("clear", "autumn").type).toBe("embers");
  });
});
