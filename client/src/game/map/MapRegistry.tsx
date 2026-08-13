import { ComponentType } from "react";
import { ContainerYard } from "./ContainerYard";
import { Dust } from "./Dust";

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
    id: "dust",
    name: "Dust",
    component: Dust,
    description: "Open desert map with long sight lines",
  },
];

export function getMapById(id: string): MapInfo {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}
