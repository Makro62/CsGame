import { ComponentType } from "react";
import { ContainerYard } from "./ContainerYard";
import { RavenPoint } from "./RavenPoint";
import { Procedural5v5Map } from "./Procedural5v5Map";
import { PROCEDURAL_5V5_ID } from "./ProceduralMapRegistry";

export interface MapInfo {
  id: string;
  name: string;
  component: ComponentType;
  description: string;
  isProcedural?: boolean;
}

export const MAPS: MapInfo[] = [
  {
    id: "container_yard",
    name: "Container Yard",
    component: ContainerYard,
    description: "Classic container arena with tight corridors",
  },
  {
    id: "ravenpoint",
    name: "DE_RAVENPOINT",
    component: RavenPoint,
    description: "Bomb defuse 5v5 — T south, CT north, 2 sites, Mid control (80×100m)",
  },
  {
    id: PROCEDURAL_5V5_ID,
    name: "Procedural Arena",
    component: Procedural5v5Map,
    description: "Randomly generated bomb defuse map — every match is different",
    isProcedural: true,
  },
];

export function getMapById(id: string): MapInfo {
  if (id === "dust") id = "ravenpoint";
  return MAPS.find((m) => m.id === id) || MAPS[0];
}
