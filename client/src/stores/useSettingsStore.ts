import { create } from "zustand";
import { PHYSICS } from "@cs-game/shared";

interface SettingsState {
  sensitivity: number;
  slideControl: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  crosshairColor: string;
  crosshairSize: number;
  crosshairStyle: 'dot' | 'cross' | 'dynamic';
  setSensitivity: (value: number) => void;
  setSlideControl: (value: number) => void;
  setMasterVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setCrosshairColor: (color: string) => void;
  setCrosshairSize: (size: number) => void;
  setCrosshairStyle: (style: 'dot' | 'cross' | 'dynamic') => void;
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
  sensitivity: parseFloat(getStorage("sensitivity", "1.2")),
  slideControl: parseInt(getStorage("slideControl", `${PHYSICS.slideControlDefault}`), 10),
  masterVolume: parseInt(getStorage("masterVolume", "80"), 10),
  sfxVolume: parseInt(getStorage("sfxVolume", "80"), 10),
  musicVolume: parseInt(getStorage("musicVolume", "60"), 10),
  crosshairColor: getStorage("crosshairColor", "#ffffff"),
  crosshairSize: parseInt(getStorage("crosshairSize", "1"), 10),
  crosshairStyle: (getStorage("crosshairStyle", "dynamic") as 'dot' | 'cross' | 'dynamic'),

  setSensitivity: (value: number) => {
    setStorage("sensitivity", value.toString());
    set({ sensitivity: value });
  },

  setSlideControl: (value: number) => {
    setStorage("slideControl", value.toString());
    set({ slideControl: value });
  },

  setMasterVolume: (value: number) => {
    setStorage("masterVolume", value.toString());
    set({ masterVolume: value });
  },

  setSfxVolume: (value: number) => {
    setStorage("sfxVolume", value.toString());
    set({ sfxVolume: value });
  },

  setMusicVolume: (value: number) => {
    localStorage.setItem("musicVolume", value.toString());
    set({ musicVolume: value });
  },

  setCrosshairColor: (color: string) => {
    localStorage.setItem("crosshairColor", color);
    set({ crosshairColor: color });
  },

  setCrosshairSize: (size: number) => {
    localStorage.setItem("crosshairSize", size.toString());
    set({ crosshairSize: size });
  },

  setCrosshairStyle: (style: 'dot' | 'cross' | 'dynamic') => {
    localStorage.setItem("crosshairStyle", style);
    set({ crosshairStyle: style });
  },
}));
