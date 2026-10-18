import { describe, it, expect } from "vitest";
import {
  CT_AGENTS,
  T_AGENTS,
  getAgentsForTeam,
  getAgent,
} from "../../../client/src/game/offline/agents";

describe("agents", () => {
  it("CT_AGENTS has 5 agents", () => {
    expect(CT_AGENTS).toHaveLength(5);
  });

  it("T_AGENTS has 5 agents", () => {
    expect(T_AGENTS).toHaveLength(5);
  });

  describe("getAgentsForTeam", () => {
    it("returns CT agents", () => {
      expect(getAgentsForTeam("CT")).toBe(CT_AGENTS);
    });

    it("returns T agents", () => {
      expect(getAgentsForTeam("T")).toBe(T_AGENTS);
    });
  });

  describe("getAgent", () => {
    it("returns agent by id", () => {
      const agent = getAgent("ct_sas");
      expect(agent.id).toBe("ct_sas");
      expect(agent.team).toBe("CT");
    });

    it("returns default for unknown id", () => {
      const agent = getAgent("unknown");
      expect(agent.id).toBe(CT_AGENTS[0].id);
    });
  });

  it("all agents have required fields", () => {
    const all = [...CT_AGENTS, ...T_AGENTS];
    for (const a of all) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.team).toMatch(/^(T|CT)$/);
      expect(a.role).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.armorColor).toBeTruthy();
      expect(a.accentColor).toBeTruthy();
    }
  });
});
