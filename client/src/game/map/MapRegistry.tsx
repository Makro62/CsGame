import { ComponentType } from "react";
import { ContainerYard } from "./ContainerYard";
import { RavenPoint } from "./RavenPoint";

export interface MapInfo {
  id: string;
  name: string;
  component: ComponentType;
  description: string;
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
];

export function getMapById(id: string): MapInfo {
  if (id === "dust") id = "ravenpoint";
  return MAPS.find((m) => m.id === id) || MAPS[0];
}
