export type HeadStyle =
  | "tactical"
  | "visor"
  | "heavy"
  | "baldCap"
  | "dreads"
  | "cap"
  | "slick"
  | "gasmask"
  | "beanie"
  | "beret"
  | "bandana";

export type GearFlag =
  | "pauldrons"
  | "shieldPack"
  | "headset"
  | "antenna"
  | "backpack"
  | "radio"
  | "tie"
  | "kneepads"
  | "holster"
  | "coat"
  | "scarf"
  | "ammoBelt";

export interface CharacterLook {
  scale: number;
  torso: [number, number, number];
  vest: [number, number, number];
  armW: number;
  legW: number;
  shoulder: number;
  skin: string;
  pants: string;
  shoes: string;
  hair: string;
  head: HeadStyle;
  gear: GearFlag[];
}

const DEFAULT_LOOK: CharacterLook = {
  scale: 1,
  torso: [0.48, 0.76, 0.28],
  vest: [0.52, 0.5, 0.32],
  armW: 0.18,
  legW: 0.2,
  shoulder: 0.34,
  skin: "#d4a574",
  pants: "#374151",
  shoes: "#111827",
  hair: "#1a1a1a",
  head: "tactical",
  gear: [],
};

export const CHARACTER_LOOKS: Record<string, CharacterLook> = {
  nova7: {
    scale: 0.96,
    torso: [0.40, 0.72, 0.24],
    vest: [0.44, 0.40, 0.28],
    armW: 0.145,
    legW: 0.155,
    shoulder: 0.29,
    skin: "#c9a07a",
    pants: "#0f172a",
    shoes: "#020617",
    hair: "#1e293b",
    head: "visor",
    gear: ["headset", "antenna", "holster"],
  },
  titan: {
    scale: 1.16,
    torso: [0.64, 0.84, 0.42],
    vest: [0.72, 0.60, 0.48],
    armW: 0.25,
    legW: 0.27,
    shoulder: 0.46,
    skin: "#b08968",
    pants: "#1c1917",
    shoes: "#292524",
    hair: "#111111",
    head: "heavy",
    gear: ["pauldrons", "shieldPack", "kneepads"],
  },
  coach: {
    scale: 1.13,
    torso: [0.62, 0.80, 0.38],
    vest: [0.66, 0.46, 0.40],
    armW: 0.23,
    legW: 0.25,
    shoulder: 0.43,
    skin: "#6d4c41",
    pants: "#14532d",
    shoes: "#052e16",
    hair: "#1c1917",
    head: "baldCap",
    gear: ["kneepads"],
  },
  rochelle: {
    scale: 0.91,
    torso: [0.38, 0.68, 0.23],
    vest: [0.42, 0.38, 0.26],
    armW: 0.135,
    legW: 0.145,
    shoulder: 0.27,
    skin: "#5d4037",
    pants: "#3b0764",
    shoes: "#2e1065",
    hair: "#1c1917",
    head: "dreads",
    gear: ["radio", "holster"],
  },
  ellis: {
    scale: 0.95,
    torso: [0.43, 0.70, 0.25],
    vest: [0.46, 0.36, 0.28],
    armW: 0.155,
    legW: 0.165,
    shoulder: 0.30,
    skin: "#e0b894",
    pants: "#44403c",
    shoes: "#78350f",
    hair: "#92400e",
    head: "cap",
    gear: ["backpack", "holster"],
  },
  nick: {
    scale: 1.0,
    torso: [0.45, 0.74, 0.26],
    vest: [0.50, 0.54, 0.30],
    armW: 0.155,
    legW: 0.165,
    shoulder: 0.32,
    skin: "#e8c4a8",
    pants: "#0f172a",
    shoes: "#020617",
    hair: "#0a0a0a",
    head: "slick",
    gear: ["tie", "coat"],
  },
  ct_sas: {
    scale: 1.0,
    torso: [0.48, 0.76, 0.28],
    vest: [0.54, 0.52, 0.34],
    armW: 0.18,
    legW: 0.19,
    shoulder: 0.34,
    skin: "#d4a574",
    pants: "#111827",
    shoes: "#020617",
    hair: "#1a1a1a",
    head: "visor",
    gear: ["headset", "holster"],
  },
  ct_fbi: {
    scale: 1.02,
    torso: [0.50, 0.76, 0.30],
    vest: [0.56, 0.50, 0.34],
    armW: 0.18,
    legW: 0.2,
    shoulder: 0.35,
    skin: "#c9956c",
    pants: "#1e293b",
    shoes: "#0f172a",
    hair: "#1c1917",
    head: "tactical",
    gear: ["radio", "holster"],
  },
  ct_gign: {
    scale: 1.04,
    torso: [0.52, 0.78, 0.32],
    vest: [0.58, 0.54, 0.36],
    armW: 0.19,
    legW: 0.21,
    shoulder: 0.37,
    skin: "#d4a574",
    pants: "#134e4a",
    shoes: "#042f2e",
    hair: "#1a1a1a",
    head: "beret",
    gear: ["pauldrons", "holster"],
  },
  ct_idf: {
    scale: 0.98,
    torso: [0.46, 0.74, 0.27],
    vest: [0.50, 0.46, 0.30],
    armW: 0.17,
    legW: 0.18,
    shoulder: 0.32,
    skin: "#c9956c",
    pants: "#3f3d15",
    shoes: "#1c1917",
    hair: "#292524",
    head: "cap",
    gear: ["radio", "backpack"],
  },
  ct_swat: {
    scale: 1.12,
    torso: [0.58, 0.82, 0.38],
    vest: [0.66, 0.58, 0.44],
    armW: 0.22,
    legW: 0.24,
    shoulder: 0.42,
    skin: "#d4a574",
    pants: "#111827",
    shoes: "#020617",
    hair: "#111",
    head: "heavy",
    gear: ["pauldrons", "kneepads", "ammoBelt"],
  },
  t_phoenix: {
    scale: 1.02,
    torso: [0.50, 0.76, 0.30],
    vest: [0.54, 0.48, 0.34],
    armW: 0.19,
    legW: 0.2,
    shoulder: 0.35,
    skin: "#d4a574",
    pants: "#3f1515",
    shoes: "#1c1917",
    hair: "#1a1a1a",
    head: "gasmask",
    gear: ["ammoBelt", "holster"],
  },
  t_balkan: {
    scale: 1.06,
    torso: [0.54, 0.78, 0.32],
    vest: [0.58, 0.50, 0.36],
    armW: 0.20,
    legW: 0.22,
    shoulder: 0.38,
    skin: "#c9956c",
    pants: "#44403c",
    shoes: "#1c1917",
    hair: "#292524",
    head: "beanie",
    gear: ["scarf", "kneepads"],
  },
  t_prof: {
    scale: 0.99,
    torso: [0.44, 0.74, 0.26],
    vest: [0.48, 0.50, 0.28],
    armW: 0.16,
    legW: 0.17,
    shoulder: 0.31,
    skin: "#d4a574",
    pants: "#1e1b4b",
    shoes: "#0f172a",
    hair: "#0a0a0a",
    head: "slick",
    gear: ["coat", "tie"],
  },
  t_arctic: {
    scale: 0.97,
    torso: [0.46, 0.74, 0.28],
    vest: [0.52, 0.48, 0.32],
    armW: 0.17,
    legW: 0.18,
    shoulder: 0.33,
    skin: "#c9956c",
    pants: "#e2e8f0",
    shoes: "#1e293b",
    hair: "#e2e8f0",
    head: "beanie",
    gear: ["scarf", "backpack"],
  },
  t_elite: {
    scale: 1.04,
    torso: [0.50, 0.78, 0.30],
    vest: [0.56, 0.52, 0.34],
    armW: 0.19,
    legW: 0.2,
    shoulder: 0.36,
    skin: "#d4a574",
    pants: "#1c1917",
    shoes: "#0a0a0a",
    hair: "#111",
    head: "bandana",
    gear: ["ammoBelt", "holster", "headset"],
  },
};

export function getCharacterLook(style?: string | null): CharacterLook {
  if (!style) return DEFAULT_LOOK;
  return CHARACTER_LOOKS[style] ?? DEFAULT_LOOK;
}
