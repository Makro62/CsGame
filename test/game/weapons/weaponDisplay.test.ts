import { describe, it, expect } from "vitest";
import { weaponDisplay } from "../../../client/src/game/weapons/weaponDisplay";

describe("weaponDisplay", () => {
  it("returns meta + stats for known weapons", () => {
    const ak = weaponDisplay("ak47");
    expect(ak.label).toBe("AK-47 Rifle");
    expect(ak.type).toBe("Assault Rifle");
    expect(ak.slot).toBe("1");
    expect(ak.dmg).toBeGreaterThan(0);
    expect(ak.mag).toBeGreaterThan(0);
    expect(ak.icon).toBe("🎯");
  });

  it("returns correct meta for glock", () => {
    const g = weaponDisplay("glock");
    expect(g.label).toBe("Glock-18");
    expect(g.type).toBe("Pistol");
    expect(g.slot).toBe("2");
  });

  it("returns correct meta for deagle", () => {
    const d = weaponDisplay("deagle");
    expect(d.label).toBe("Desert Eagle .50");
    expect(d.type).toBe("Heavy Pistol");
  });

  it("returns correct meta for knife and combatknife", () => {
    const k = weaponDisplay("knife");
    expect(k.label).toBe("Karambit Ganda");
    expect(k.type).toBe("Melee");
    expect(k.slot).toBe("3");
    expect(k.dmg).toBeGreaterThan(0);

    const ck = weaponDisplay("combatknife");
    expect(ck.label).toBe("Karambit Taktis");
    expect(ck.type).toBe("Melee");
    expect(ck.slot).toBe("3");
    expect(ck.dmg).toBeGreaterThan(0);
  });

  it("returns correct meta for tec9 and autopistol", () => {
    const t = weaponDisplay("tec9");
    expect(t.label).toBe("Tec-9");
    expect(t.type).toBe("Pistol");
    expect(t.slot).toBe("2");
    expect(t.dmg).toBeGreaterThan(0);
    expect(t.mag).toBeGreaterThan(0);

    const u = weaponDisplay("autopistol");
    expect(u.label).toBe("USP-S");
    expect(u.type).toBe("Pistol");
    expect(u.slot).toBe("2");
  });

  it("returns correct meta for m4a1 and mp5", () => {
    const m4 = weaponDisplay("m4a1");
    expect(m4.label).toBe("M4A1-S Silenced");
    expect(m4.type).toBe("Assault Rifle");
    expect(m4.slot).toBe("1");
    expect(m4.dmg).toBeGreaterThan(0);

    const mp5 = weaponDisplay("mp5");
    expect(mp5.label).toBe("MP5-SD Tactical");
    expect(mp5.type).toBe("SMG");
    expect(mp5.slot).toBe("1");
  });

  it("returns correct meta for grenades", () => {
    const he = weaponDisplay("he");
    expect(he.type).toBe("Grenade");
    expect(he.slot).toBe("4");

    const smoke = weaponDisplay("smoke");
    expect(smoke.label).toBe("Smoke Grenade");

    const flash = weaponDisplay("flash");
    expect(flash.label).toBe("Flashbang");
  });

  it("returns correct meta for AWP", () => {
    const awp = weaponDisplay("awp");
    expect(awp.label).toBe("AWP Magnum");
    expect(awp.type).toBe("Sniper Rifle");
  });

  it("returns correct meta for arccaster", () => {
    const arc = weaponDisplay("arccaster");
    expect(arc.label).toBe("Arc Caster");
    expect(arc.type).toBe("Wonder Weapon");
    expect(arc.slot).toBe("1");
  });

  it("returns fallback for null", () => {
    const r = weaponDisplay(null);
    expect(r.label).toBe("—");
    expect(r.type).toBe("Weapon");
    expect(r.icon).toBe("🔫");
    expect(r.dmg).toBe(0);
    expect(r.mag).toBe(0);
  });

  it("returns fallback for undefined", () => {
    const r = weaponDisplay(undefined);
    expect(r.label).toBe("—");
    expect(r.dmg).toBe(0);
  });

  it("returns fallback for unknown weapon", () => {
    const r = weaponDisplay("laser_gun");
    expect(r.label).toBe("LASER_GUN");
    expect(r.type).toBe("Weapon");
    expect(r.dmg).toBe(0);
    expect(r.mag).toBe(0);
  });

  it("returns all weapon meta", () => {
    const weapons = [
      "glock", "deagle", "tec9", "autopistol",
      "mp5", "ak47", "m4a1", "awp",
      "knife", "combatknife", "arccaster",
      "he", "smoke", "flash",
    ];
    for (const id of weapons) {
      const w = weaponDisplay(id);
      expect(w.label).toBeTruthy();
      expect(w.type).toBeTruthy();
      expect(w.slot).toBeTruthy();
    }
  });

  it("every weapon has stats from shared WEAPONS", () => {
    const ids = ["ak47", "m4a1", "awp", "mp5", "deagle", "glock", "tec9", "autopistol", "knife", "combatknife"];
    for (const id of ids) {
      const w = weaponDisplay(id);
      expect(w.dmg).toBeGreaterThan(0);
      expect(w.mag).toBeGreaterThan(0);
    }
  });
});
