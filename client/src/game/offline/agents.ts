// ============================================================================
// 5v5 Agent Definitions
// ============================================================================

export interface AgentDefinition {
  id: string;
  name: string;
  team: "T" | "CT";
  role: string;
  description: string;
  armorColor: string;
  accentColor: string;
  helmetColor: string;
  skinTone: string;
  vestColor: string;
}

export const CT_AGENTS: AgentDefinition[] = [
  {
    id: "ct_sas",
    name: "SAS",
    team: "CT",
    role: "Operative",
    description: "Pasukan khusus Inggris. Ahli dalam pertempuran jarak dekat dan CQB.",
    armorColor: "#1e3a5f",
    accentColor: "#3b82f6",
    helmetColor: "#111827",
    skinTone: "#d4a574",
    vestColor: "#0f172a",
  },
  {
    id: "ct_fbi",
    name: "FBI",
    team: "CT",
    role: "Enforcer",
    description: "Agen federal berpengalaman. Spesialis penembak jitu dan pengamanan area.",
    armorColor: "#1e293b",
    accentColor: "#60a5fa",
    helmetColor: "#1e293b",
    skinTone: "#c9956c",
    vestColor: "#1e293b",
  },
  {
    id: "ct_gign",
    name: "GIGN",
    team: "CT",
    role: "Breacher",
    description: "Pasukan operasi khusus Prancis. Master dalam entry dan hostage rescue.",
    armorColor: "#1e3a3a",
    accentColor: "#22d3ee",
    helmetColor: "#134e4a",
    skinTone: "#d4a574",
    vestColor: "#134e4a",
  },
  {
    id: "ct_idf",
    name: "IDF",
    team: "CT",
    role: "Medic",
    description: "Tentara pertahanan. Dapat memulihkan HP tim dalam pertempuran.",
    armorColor: "#3a3a1e",
    accentColor: "#facc15",
    helmetColor: "#3f3d15",
    skinTone: "#c9956c",
    vestColor: "#3f3d15",
  },
  {
    id: "ct_swat",
    name: "SWAT",
    team: "CT",
    role: "Tank",
    description: "Tim penegakan hukum bersenjata. Pelindung tim dengan armor tebal.",
    armorColor: "#1a1a2e",
    accentColor: "#818cf8",
    helmetColor: "#111827",
    skinTone: "#d4a574",
    vestColor: "#111827",
  },
];

export const T_AGENTS: AgentDefinition[] = [
  {
    id: "t_phoenix",
    name: "Phoenix",
    team: "T",
    role: "Entry",
    description: "Penyerang utama yang agresif. Selalu yang pertama masuk ke area musuh.",
    armorColor: "#5a1e1e",
    accentColor: "#ef4444",
    helmetColor: "#3f1515",
    skinTone: "#d4a574",
    vestColor: "#3f1515",
  },
  {
    id: "t_balkan",
    name: "Balkan",
    team: "T",
    role: "Support",
    description: "Pejuang berpengalaman dari Balkan. Ahli dalam pertahanan dan menahan posisi.",
    armorColor: "#4a3a1e",
    accentColor: "#f97316",
    helmetColor: "#3d2e15",
    skinTone: "#c9956c",
    vestColor: "#3d2e15",
  },
  {
    id: "t_prof",
    name: "Professional",
    team: "T",
    role: "Sniper",
    description: "Penembak jitu profesional. Akurasi tinggi dan kemampuan headshot.",
    armorColor: "#2d1e4a",
    accentColor: "#a855f7",
    helmetColor: "#231538",
    skinTone: "#d4a574",
    vestColor: "#231538",
  },
  {
    id: "t_arctic",
    name: "Arctic",
    team: "T",
    role: "Flanker",
    description: "Spesialis operasi dingin. Cepat dan sulit dideteksi musuh.",
    armorColor: "#1e3a4a",
    accentColor: "#22d3ee",
    helmetColor: "#152d38",
    skinTone: "#c9956c",
    vestColor: "#152d38",
  },
  {
    id: "t_elite",
    name: "Elite Crew",
    team: "T",
    role: "Leader",
    description: "Tim elit berpengalaman. Pemimpin yang meningkatkan kemampuan seluruh tim.",
    armorColor: "#4a1e3a",
    accentColor: "#ec4899",
    helmetColor: "#38152d",
    skinTone: "#d4a574",
    vestColor: "#38152d",
  },
];

export function getAgentsForTeam(team: "T" | "CT"): AgentDefinition[] {
  return team === "T" ? T_AGENTS : CT_AGENTS;
}

export function getAgent(id: string): AgentDefinition {
  return [...CT_AGENTS, ...T_AGENTS].find(a => a.id === id) ?? CT_AGENTS[0];
}
