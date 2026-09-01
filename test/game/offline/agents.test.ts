import { describe, it, expect } from "vitest";
import { CT_AGENTS, T_AGENTS, getAgentsForTeam, getAgent } from "@src/game/offline/agents";

describe("agents", () => {
  describe("CT_AGENTS", () => {
    it("has 5 CT agents", () => {
      expect(CT_AGENTS).toHaveLength(5);
    });

    it("all have team CT", () => {
      for (const a of CT_AGENTS) {
        expect(a.team).toBe("CT");
      }
    });

    it("all have unique ids", () => {
      const ids = CT_AGENTS.map(a => a.id);
      expect(new Set(ids).size).toBe(5);
    });

    it("all have required fields", () => {
      for (const a of CT_AGENTS) {
        expect(a.name).toBeTruthy();
        expect(a.role).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.armorColor).toMatch(/^#/);
        expect(a.accentColor).toMatch(/^#/);
      }
    });
  });

  describe("T_AGENTS", () => {
    it("has 5 T agents", () => {
      expect(T_AGENTS).toHaveLength(5);
    });

    it("all have team T", () => {
      for (const a of T_AGENTS) {
        expect(a.team).toBe("T");
      }
    });

    it("all have unique ids", () => {
      const ids = T_AGENTS.map(a => a.id);
      expect(new Set(ids).size).toBe(5);
    });

    it("all have required fields", () => {
      for (const a of T_AGENTS) {
        expect(a.name).toBeTruthy();
        expect(a.role).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.armorColor).toMatch(/^#/);
        expect(a.accentColor).toMatch(/^#/);
      }
    });
  });

  describe("getAgentsForTeam", () => {
    it("returns CT agents for CT", () => {
      const agents = getAgentsForTeam("CT");
      expect(agents).toHaveLength(5);
      for (const a of agents) {
        expect(a.team).toBe("CT");
      }
    });

    it("returns T agents for T", () => {
      const agents = getAgentsForTeam("T");
      expect(agents).toHaveLength(5);
      for (const a of agents) {
        expect(a.team).toBe("T");
      }
    });
  });

  describe("getAgent", () => {
    it("returns correct agent by id", () => {
      expect(getAgent("ct_sas").name).toBe("SAS");
      expect(getAgent("t_phoenix").name).toBe("Phoenix");
      expect(getAgent("ct_fbi").name).toBe("FBI");
      expect(getAgent("t_balkan").name).toBe("Balkan");
    });

    it("falls back to first CT agent for unknown id", () => {
      const agent = getAgent("nonexistent");
      expect(agent.id).toBe("ct_sas");
    });

    it("falls back to first CT agent for empty string", () => {
      const agent = getAgent("");
      expect(agent.id).toBe("ct_sas");
    });
  });

  describe("CT and T agent IDs don't overlap", () => {
    it("no shared ids between teams", () => {
      const ctIds = CT_AGENTS.map(a => a.id);
      const tIds = T_AGENTS.map(a => a.id);
      const overlap = ctIds.filter(id => tIds.includes(id));
      expect(overlap).toEqual([]);
    });
  });
});