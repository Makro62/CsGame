import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  WPN,
  makeKarambitBladeGeometry,
  ThirdPersonAk47,
  ThirdPersonM4,
  ThirdPersonAwp,
  ThirdPersonDeagle,
  ThirdPersonGlock,
  ThirdPersonTec9,
  ThirdPersonPistol,
  ThirdPersonSmg,
  ThirdPersonKarambit,
  ThirdPersonArcCaster,
  MuzzleFlash,
  SharedThirdPersonWeaponMesh,
} from "../../../client/src/game/weapons/weaponGeometries";

describe("weaponGeometries", () => {
  describe("WPN color palette", () => {
    it("contains all required weapon palette tokens with valid hex colors", () => {
      const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
      expect(WPN.steelDark.color).toMatch(hexPattern);
      expect(WPN.steelMid.color).toMatch(hexPattern);
      expect(WPN.steelLight.color).toMatch(hexPattern);
      expect(WPN.polymer.color).toMatch(hexPattern);
      expect(WPN.polymerTan.color).toMatch(hexPattern);
      expect(WPN.wood.color).toMatch(hexPattern);
      expect(WPN.blade.color).toMatch(hexPattern);
      expect(WPN.bladeTactical.color).toMatch(hexPattern);
      expect(WPN.grip.color).toMatch(hexPattern);
      expect(WPN.gripTactical.color).toMatch(hexPattern);
      expect(WPN.ring.color).toMatch(hexPattern);
      expect(WPN.ringTactical.color).toMatch(hexPattern);
    });
  });

  describe("makeKarambitBladeGeometry", () => {
    it("creates a valid ExtrudeGeometry with thickness parameter", () => {
      const geom = makeKarambitBladeGeometry(0.015);
      expect(geom).toBeInstanceOf(THREE.ExtrudeGeometry);
      expect(geom.parameters.options.depth).toBe(0.015);
      geom.computeBoundingBox();
      expect(geom.boundingBox).toBeDefined();
      expect(geom.boundingBox!.max.x).toBeGreaterThan(geom.boundingBox!.min.x);
      expect(geom.boundingBox!.max.z).toBeGreaterThan(geom.boundingBox!.min.z);
    });
  });

  describe("individual weapon 3D mesh components", () => {
    it("renders ThirdPersonAk47 element", () => {
      const el = ThirdPersonAk47();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders ThirdPersonM4 element", () => {
      const el = ThirdPersonM4();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders ThirdPersonAwp element", () => {
      const el = ThirdPersonAwp();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders ThirdPersonDeagle element", () => {
      const el = ThirdPersonDeagle();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders ThirdPersonGlock element", () => {
      const el = ThirdPersonGlock();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders ThirdPersonTec9 element", () => {
      const el = ThirdPersonTec9();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders ThirdPersonPistol fallback element", () => {
      const elLight = ThirdPersonPistol({ heavy: false });
      const elHeavy = ThirdPersonPistol({ heavy: true });
      expect(elLight).toBeDefined();
      expect(elHeavy).toBeDefined();
    });

    it("renders ThirdPersonSmg element", () => {
      const el = ThirdPersonSmg();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("creates ThirdPersonKarambit React element", () => {
      const el = <ThirdPersonKarambit flip={false} tactical={true} scale={1} />;
      expect(el).toBeDefined();
      expect(el.type).toBe(ThirdPersonKarambit);
      expect(el.props.tactical).toBe(true);
    });

    it("renders ThirdPersonArcCaster element", () => {
      const el = ThirdPersonArcCaster();
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders MuzzleFlash with custom parameters", () => {
      const el = MuzzleFlash({ z: 0.5, scale: 1.2 });
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
      expect(el.props.position[2]).toBe(0.5);
    });
  });

  describe("SharedThirdPersonWeaponMesh", () => {
    const csWeaponList = [
      "ak47",
      "m4a1",
      "awp",
      "mp5",
      "deagle",
      "glock",
      "tec9",
      "autopistol",
      "knife",
      "combatknife",
      "arccaster",
      "unknown_gun",
      null,
      undefined,
    ];

    it.each(csWeaponList)("renders successfully for weapon: %s", (weapon) => {
      const el = SharedThirdPersonWeaponMesh({
        weapon,
        isFiring: false,
        scale: 1,
      });
      expect(el).toBeDefined();
      expect(el.type).toBe("group");
    });

    it("renders muzzle flash when isFiring is true", () => {
      const el = SharedThirdPersonWeaponMesh({
        weapon: "ak47",
        isFiring: true,
        muzzleZ: 0.48,
        scale: 1,
      });
      expect(el).toBeDefined();
      expect(el.props.children).toBeDefined();
    });
  });
});
