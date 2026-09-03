/** Shared third-person weapon category, arm poses, and attachment offsets. */

export type ThirdPersonWeaponCategory = "rifle" | "pistol" | "knife";

export interface ArmPose {
  right: [number, number, number];
  left: [number, number, number];
  /** Extra right-arm X kick when firing (recoil). */
  fireKick: number;
}

export interface WeaponAttach {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  muzzleZ: number;
}

export interface TacticalElbowPose {
  right: [number, number, number];
  left: [number, number, number];
}

const RIFLE_POSE: ArmPose = {
  right: [-1.02, 0.14, 0.24],
  left: [-0.78, -0.26, -0.16],
  fireKick: 0.14,
};

const PISTOL_POSE: ArmPose = {
  right: [-1.18, 0.06, 0.1],
  left: [0.18, 0, 0.06],
  fireKick: 0.22,
};

const KNIFE_POSE: ArmPose = {
  right: [-0.62, 0.2, 0.32],
  left: [0.22, -0.04, 0.08],
  fireKick: 0.35,
};

export const THIRD_PERSON_ARM_POSES: Record<ThirdPersonWeaponCategory, ArmPose> = {
  rifle: RIFLE_POSE,
  pistol: PISTOL_POSE,
  knife: KNIFE_POSE,
};

/** Elbow bend for TacticalBotModel (shoulder + elbow chain). */
export const TACTICAL_ELBOW_POSES: Record<ThirdPersonWeaponCategory, TacticalElbowPose> = {
  rifle: { right: [-1.05, 0, 0.08], left: [-0.95, 0, -0.06] },
  pistol: { right: [-1.15, 0, 0], left: [-0.2, 0, 0] },
  knife: { right: [-0.55, 0, 0], left: [-0.15, 0, 0] },
};

export const BLOCKY_WEAPON_ATTACH: Record<ThirdPersonWeaponCategory, WeaponAttach> = {
  rifle: {
    position: [0.05, -0.6, -0.1],
    rotation: [0.12, -0.04, 0.02],
    scale: 1,
    muzzleZ: -0.38,
  },
  pistol: {
    position: [0.03, -0.56, -0.02],
    rotation: [0.18, 0, 0.04],
    scale: 1,
    muzzleZ: -0.16,
  },
  knife: {
    position: [0.08, -0.52, 0.04],
    rotation: [0.42, 0.12, 0.28],
    scale: 1,
    muzzleZ: 0,
  },
};

export const TACTICAL_WEAPON_ATTACH: Record<ThirdPersonWeaponCategory, WeaponAttach> = {
  rifle: { position: [0.02, -0.28, 0.04], rotation: [0, 0, 0], scale: 1, muzzleZ: 0.48 },
  pistol: { position: [0.02, -0.28, 0.04], rotation: [0, 0, 0], scale: 1, muzzleZ: 0.14 },
  knife: { position: [0.02, -0.28, 0.04], rotation: [0, 0, 0], scale: 1, muzzleZ: 0 },
};

export function weaponCategoryFromType(type: string): ThirdPersonWeaponCategory {
  if (type === "knife" || type === "pistol") return type;
  return "rifle";
}

export function weaponCategoryFromId(weaponId: string | null | undefined): ThirdPersonWeaponCategory {
  if (!weaponId) return "rifle";
  const w = weaponId.toLowerCase();
  if (w.includes("knife") || w.includes("combatknife")) return "knife";
  if (w.includes("deagle") || w.includes("glock") || w.includes("tec9") || w.includes("autopistol")) {
    return "pistol";
  }
  if (w.includes("he") || w.includes("smoke") || w.includes("flash") || w.includes("grenade")) {
    return "pistol";
  }
  return "rifle";
}
