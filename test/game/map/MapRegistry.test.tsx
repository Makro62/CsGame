import { describe, it, expect } from "vitest";
import { MAPS, getMapById } from "../../../client/src/game/map/MapRegistry";

describe("MapRegistry", () => {
  describe("MAPS", () => {
    it("has at least 2 maps", () => {
      expect(MAPS.length).toBeGreaterThanOrEqual(2);
    });

    it("has container_yard", () => {
      const m = MAPS.find((m) => m.id === "container_yard");
      expect(m).toBeDefined();
      expect(m!.name).toBeTruthy();
      expect(m!.description).toBeTruthy();
    });

    it("has ravenpoint", () => {
      const m = MAPS.find((m) => m.id === "ravenpoint");
      expect(m).toBeDefined();
      expect(m!.name).toBe("DE_RAVENPOINT");
    });

    it("has procedural map", () => {
      const m = MAPS.find((m) => m.isProcedural);
      expect(m).toBeDefined();
      expect(m!.isProcedural).toBe(true);
    });

    it("every map has a component", () => {
      for (const m of MAPS) {
        expect(m.component).toBeDefined();
        expect(typeof m.component).toBe("function");
      }
    });

    it("every map has a unique id", () => {
      const ids = MAPS.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("getMapById", () => {
    it("returns ravenpoint for 'dust'", () => {
      const m = getMapById("dust");
      expect(m.id).toBe("ravenpoint");
    });

    it("returns ravenpoint for 'ravenpoint'", () => {
      const m = getMapById("ravenpoint");
      expect(m.id).toBe("ravenpoint");
    });

    it("returns container_yard for 'container_yard'", () => {
      const m = getMapById("container_yard");
      expect(m.id).toBe("container_yard");
    });

    it("returns first map for unknown id", () => {
      const m = getMapById("unknown_map");
      expect(m.id).toBe(MAPS[0].id);
    });
  });
});
