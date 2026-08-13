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

export const useSettingsStore = create<SettingsState>()((set) => ({
  sensitivity: parseFloat(localStorage.getItem("sensitivity") || "1.2"),
  slideControl: parseInt(localStorage.getItem("slideControl") || `${PHYSICS.slideControlDefault}`, 10),
  masterVolume: parseInt(localStorage.getItem("masterVolume") || "80", 10),
  sfxVolume: parseInt(localStorage.getItem("sfxVolume") || "80", 10),
  musicVolume: parseInt(localStorage.getItem("musicVolume") || "60", 10),
  crosshairColor: localStorage.getItem("crosshairColor") || "#ffffff",
  crosshairSize: parseInt(localStorage.getItem("crosshairSize") || "1", 10),
  crosshairStyle: (localStorage.getItem("crosshairStyle") as 'dot' | 'cross' | 'dynamic') || "dynamic",

  setSensitivity: (value: number) => {
    localStorage.setItem("sensitivity", value.toString());
    set({ sensitivity: value });
  },

  setSlideControl: (value: number) => {
    localStorage.setItem("slideControl", value.toString());
    set({ slideControl: value });
  },

  setMasterVolume: (value: number) => {
    localStorage.setItem("masterVolume", value.toString());
    set({ masterVolume: value });
  },

  setSfxVolume: (value: number) => {
    localStorage.setItem("sfxVolume", value.toString());
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
