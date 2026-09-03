/**
 * Lighting + weather look for the procedural 5v5 map.
 */
import { createRng, pick } from "@cs-game/shared/proceduralRng";

export type WeatherType = "clear" | "rain" | "fog" | "dust" | "snow";
export type TimeOfDay = "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter" | "apocalyptic";

export interface MapVariantState {
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  season: Season;
  seed: number;
}

export function getDefaultVariant(seed: number): MapVariantState {
  const rng = createRng(seed);
  return {
    weather: pick(["clear", "clear", "clear", "rain", "fog", "dust"] as const, rng),
    timeOfDay: pick(["morning", "noon", "afternoon", "dusk", "night"] as const, rng),
    season: pick(["spring", "summer", "summer", "autumn", "winter", "apocalyptic"] as const, rng),
    seed,
  };
}

export function getWeatherAmbientColor(weather: WeatherType): string {
  switch (weather) {
    case "clear": return "#dbeafe";
    case "rain": return "#64748b";
    case "fog": return "#9ca3af";
    case "dust": return "#d4a574";
    case "snow": return "#e2e8f0";
  }
}

export function getWeatherFogColor(weather: WeatherType): string {
  switch (weather) {
    case "clear": return "#0e1520";
    case "rain": return "#1e293b";
    case "fog": return "#475569";
    case "dust": return "#92400e";
    case "snow": return "#cbd5e1";
  }
}

export function getWeatherFogNear(weather: WeatherType): number {
  switch (weather) {
    case "clear": return 48;
    case "rain": return 30;
    case "fog": return 10;
    case "dust": return 20;
    case "snow": return 25;
  }
}

export function getWeatherFogFar(weather: WeatherType): number {
  switch (weather) {
    case "clear": return 110;
    case "rain": return 70;
    case "fog": return 35;
    case "dust": return 55;
    case "snow": return 60;
  }
}

export function getTimeColors(time: TimeOfDay): {
  ambient: string;
  directional: string;
  directionalIntensity: number;
  ambientIntensity: number;
  fogColor: string;
} {
  switch (time) {
    case "dawn":
      return { ambient: "#fde68a", directional: "#fb923c", directionalIntensity: 0.7, ambientIntensity: 0.4, fogColor: "#1e1510" };
    case "morning":
      return { ambient: "#dbeafe", directional: "#fef3c7", directionalIntensity: 1.0, ambientIntensity: 0.55, fogColor: "#0e1520" };
    case "noon":
      return { ambient: "#ffffff", directional: "#ffffff", directionalIntensity: 1.3, ambientIntensity: 0.65, fogColor: "#0e1520" };
    case "afternoon":
      return { ambient: "#fef3c7", directional: "#fbbf24", directionalIntensity: 1.0, ambientIntensity: 0.5, fogColor: "#1a1510" };
    case "dusk":
      return { ambient: "#7c2d12", directional: "#dc2626", directionalIntensity: 0.6, ambientIntensity: 0.35, fogColor: "#1a0e0a" };
    case "night":
      return { ambient: "#1e293b", directional: "#6366f1", directionalIntensity: 0.3, ambientIntensity: 0.15, fogColor: "#020617" };
  }
}

export interface LightingConfig {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

export function computeLighting(variant: MapVariantState): LightingConfig {
  const time = getTimeColors(variant.timeOfDay);
  return {
    ambientColor: blendColors(time.ambient, getWeatherAmbientColor(variant.weather), 0.3),
    ambientIntensity: time.ambientIntensity,
    directionalColor: time.directional,
    directionalIntensity: time.directionalIntensity,
    fogColor: blendColors(time.fogColor, getWeatherFogColor(variant.weather), 0.4),
    fogNear: getWeatherFogNear(variant.weather),
    fogFar: getWeatherFogFar(variant.weather),
  };
}

export interface WeatherParticleConfig {
  type: "rain" | "snow" | "dust" | "embers" | "none";
  count: number;
  speed: number;
  size: number;
  color: string;
  opacity: number;
  windX: number;
  windZ: number;
}

export function getWeatherParticles(weather: WeatherType, season: Season): WeatherParticleConfig {
  switch (weather) {
    case "rain":
      return { type: "rain", count: 800, speed: 12, size: 0.03, color: "#94a3b8", opacity: 0.4, windX: 2, windZ: 0 };
    case "snow":
      return { type: "snow", count: 400, speed: 2, size: 0.08, color: "#e2e8f0", opacity: 0.7, windX: 1, windZ: 0.5 };
    case "dust":
      return { type: "dust", count: 200, speed: 1.5, size: 0.12, color: "#d4a574", opacity: 0.25, windX: 3, windZ: 1 };
    case "fog":
      return { type: "dust", count: 100, speed: 0.5, size: 2, color: "#9ca3af", opacity: 0.1, windX: 0.5, windZ: 0.2 };
    case "clear":
      if (season === "autumn") {
        return { type: "embers", count: 50, speed: 1, size: 0.06, color: "#ea580c", opacity: 0.6, windX: 2, windZ: 1 };
      }
      return { type: "none", count: 0, speed: 0, size: 0, color: "#ffffff", opacity: 0, windX: 0, windZ: 0 };
  }
}

function blendColors(c1: string, c2: string, ratio: number): string {
  const hex = (c: string) => {
    let h = c.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };
  const a = hex(c1);
  const b = hex(c2);
  const r = Math.round(a.r * (1 - ratio) + b.r * ratio);
  const g = Math.round(a.g * (1 - ratio) + b.g * ratio);
  const bl = Math.round(a.b * (1 - ratio) + b.b * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
