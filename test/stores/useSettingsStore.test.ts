import { describe, it, expect } from "vitest";
import { useSettingsStore } from "@src/stores/useSettingsStore";

describe("useSettingsStore", () => {
  describe("setSensitivity", () => {
    it("updates sensitivity", () => {
      useSettingsStore.getState().setSensitivity(2.5);
      expect(useSettingsStore.getState().sensitivity).toBe(2.5);
    });
  });

  describe("setSlideControl", () => {
    it("clamps slideControl to 0-10", () => {
      useSettingsStore.getState().setSlideControl(15);
      expect(useSettingsStore.getState().slideControl).toBe(10);
      useSettingsStore.getState().setSlideControl(-4);
      expect(useSettingsStore.getState().slideControl).toBe(0);
    });
  });

  describe("setMasterVolume", () => {
    it("updates masterVolume", () => {
      useSettingsStore.getState().setMasterVolume(90);
      expect(useSettingsStore.getState().masterVolume).toBe(90);
    });
  });

  describe("setSfxVolume", () => {
    it("updates sfxVolume", () => {
      useSettingsStore.getState().setSfxVolume(70);
      expect(useSettingsStore.getState().sfxVolume).toBe(70);
    });
  });

  describe("setMusicVolume", () => {
    it("updates musicVolume", () => {
      useSettingsStore.getState().setMusicVolume(50);
      expect(useSettingsStore.getState().musicVolume).toBe(50);
    });
  });

  describe("setCrosshairColor", () => {
    it("updates crosshairColor", () => {
      useSettingsStore.getState().setCrosshairColor("#ff0000");
      expect(useSettingsStore.getState().crosshairColor).toBe("#ff0000");
    });
  });

  describe("setCrosshairSize", () => {
    it("updates crosshairSize", () => {
      useSettingsStore.getState().setCrosshairSize(3);
      expect(useSettingsStore.getState().crosshairSize).toBe(3);
    });
  });

  describe("setCrosshairStyle", () => {
    it("updates crosshairStyle", () => {
      useSettingsStore.getState().setCrosshairStyle("dot");
      expect(useSettingsStore.getState().crosshairStyle).toBe("dot");
    });

    it("accepts 'cross' style", () => {
      useSettingsStore.getState().setCrosshairStyle("cross");
      expect(useSettingsStore.getState().crosshairStyle).toBe("cross");
    });

    it("accepts 'dynamic' style", () => {
      useSettingsStore.getState().setCrosshairStyle("dynamic");
      expect(useSettingsStore.getState().crosshairStyle).toBe("dynamic");
    });

    it("rejects unknown crosshair style", () => {
      useSettingsStore.getState().setCrosshairStyle("dynamic");
      useSettingsStore.getState().setCrosshairStyle("laser" as "dot");
      expect(useSettingsStore.getState().crosshairStyle).toBe("dynamic");
    });
  });

  describe("clamps", () => {
    it("clamps sensitivity", () => {
      useSettingsStore.getState().setSensitivity(99);
      expect(useSettingsStore.getState().sensitivity).toBe(5);
      useSettingsStore.getState().setSensitivity(NaN);
      expect(useSettingsStore.getState().sensitivity).toBe(0.1);
    });

    it("clamps volumes", () => {
      useSettingsStore.getState().setMasterVolume(140);
      expect(useSettingsStore.getState().masterVolume).toBe(100);
      useSettingsStore.getState().setSfxVolume(-10);
      expect(useSettingsStore.getState().sfxVolume).toBe(0);
    });
  });
});
