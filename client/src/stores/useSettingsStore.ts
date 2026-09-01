import { create } from "zustand";
import { PHYSICS } from "@cs-game/shared";
import {
  parseStoredFloat,
  parseStoredInt,
  parseCrosshairStyle,
  clampNumber,
  type CrosshairStyle,
} from "../lib/numericGuards";

const SENS_MIN = 0.1;
const SENS_MAX = 5;
const SLIDE_MIN = 0;
const SLIDE_MAX = 10;
const VOL_MIN = 0;
const VOL_MAX = 100;
const CROSSHAIR_SIZE_MIN = 1;
const CROSSHAIR_SIZE_MAX = 5;

interface SettingsState {
  sensitivity: number;
  slideControl: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  crosshairColor: string;
  crosshairSize: number;
  crosshairStyle: CrosshairStyle;
  setSensitivity: (value: number) => void;
  setSlideControl: (value: number) => void;
  setMasterVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setCrosshairColor: (color: string) => void;
  setCrosshairSize: (size: number) => void;
  setCrosshairStyle: (style: CrosshairStyle) => void;
}

function getStorage(key: string, fallback: string): string {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      // localStorage may fail in private browsing mode or sandboxed environments
    }
  }
  return fallback;
}

function setStorage(key: string, value: string): void {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage may fail in private browsing mode or quota exceeded
    }
  }
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  sensitivity: parseStoredFloat(getStorage("sensitivity", "1.2"), 1.2, SENS_MIN, SENS_MAX),
  slideControl: parseStoredInt(getStorage("slideControl", `${PHYSICS.slideControlDefault}`), PHYSICS.slideControlDefault, SLIDE_MIN, SLIDE_MAX),
  masterVolume: parseStoredInt(getStorage("masterVolume", "80"), 80, VOL_MIN, VOL_MAX),
  sfxVolume: parseStoredInt(getStorage("sfxVolume", "80"), 80, VOL_MIN, VOL_MAX),
  musicVolume: parseStoredInt(getStorage("musicVolume", "60"), 60, VOL_MIN, VOL_MAX),
  crosshairColor: getStorage("crosshairColor", "#ffffff"),
  crosshairSize: parseStoredInt(getStorage("crosshairSize", "1"), 1, CROSSHAIR_SIZE_MIN, CROSSHAIR_SIZE_MAX),
  crosshairStyle: parseCrosshairStyle(getStorage("crosshairStyle", "dynamic")),

  setSensitivity: (value: number) => {
    const next = clampNumber(value, SENS_MIN, SENS_MAX);
    setStorage("sensitivity", next.toString());
    set({ sensitivity: next });
  },

  setSlideControl: (value: number) => {
    const next = clampNumber(value, SLIDE_MIN, SLIDE_MAX);
    setStorage("slideControl", next.toString());
    set({ slideControl: next });
  },

  setMasterVolume: (value: number) => {
    const next = clampNumber(value, VOL_MIN, VOL_MAX);
    setStorage("masterVolume", next.toString());
    set({ masterVolume: next });
  },

  setSfxVolume: (value: number) => {
    const next = clampNumber(value, VOL_MIN, VOL_MAX);
    setStorage("sfxVolume", next.toString());
    set({ sfxVolume: next });
  },

  setMusicVolume: (value: number) => {
    const next = clampNumber(value, VOL_MIN, VOL_MAX);
    setStorage("musicVolume", next.toString());
    set({ musicVolume: next });
  },

  setCrosshairColor: (color: string) => {
    setStorage("crosshairColor", color);
    set({ crosshairColor: color });
  },

  setCrosshairSize: (size: number) => {
    const next = clampNumber(size, CROSSHAIR_SIZE_MIN, CROSSHAIR_SIZE_MAX);
    setStorage("crosshairSize", next.toString());
    set({ crosshairSize: next });
  },

  setCrosshairStyle: (style: CrosshairStyle) => {
    const next = parseCrosshairStyle(style);
    setStorage("crosshairStyle", next);
    set({ crosshairStyle: next });
  },
}));
