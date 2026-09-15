import {
  Atom,
  Box,
  BrushCleaning,
  Cable,
  CirclePlus,
  Cpu,
  Droplet,
  Flame,
  Layers,
  Microscope,
  Pencil,
  RotateCw,
  Ruler,
  Scissors,
  Search,
  ShowerHead,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CustomIconName, ProcessCategory, ProcessStep } from "./types";

export type CategoryMeta = {
  id: ProcessCategory;
  label: string;
  icon: LucideIcon;
  hint: string;
};

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "deposition",
    label: "Deposition",
    icon: CirclePlus,
    hint: "PVD, CVD, ALD, evaporation, sputtering",
  },
  {
    id: "plasmaProcess",
    label: "Plasma process",
    icon: Atom,
    hint: "RIE, DRIE, plasma ashing, dry etch",
  },
  {
    id: "lithography",
    label: "Lithography",
    icon: Pencil,
    hint: "Exposure, development, mask alignment",
  },
  {
    id: "wetProcess",
    label: "Wet process",
    icon: Droplet,
    hint: "Wet etch, cleaning, lift-off, rinse",
  },
  {
    id: "spinCoating",
    label: "Spin coating",
    icon: RotateCw,
    hint: "Resist / polymer spin coat",
  },
  {
    id: "heating",
    label: "Heating",
    icon: Flame,
    hint: "Oxidation, annealing, soft / hard bake",
  },
  {
    id: "doping",
    label: "Doping",
    icon: ShowerHead,
    hint: "Implantation, diffusion",
  },
  {
    id: "inspection",
    label: "Inspection",
    icon: Search,
    hint: "Optical / SEM inspection checkpoint",
  },
  {
    id: "measurement",
    label: "Measurement",
    icon: Ruler,
    hint: "Profilometry, ellipsometry, electrical",
  },
  {
    id: "dicing",
    label: "Dicing",
    icon: Scissors,
    hint: "Wafer sawing, cleaving, singulation",
  },
  {
    id: "wireBonding",
    label: "Wire bonding",
    icon: Cable,
    hint: "Packaging, interconnect",
  },
  {
    id: "polishing",
    label: "Polishing",
    icon: BrushCleaning,
    hint: "CMP, lapping, surface planarization",
  },
  {
    id: "custom",
    label: "Custom",
    icon: Wrench,
    hint: "Anything that does not fit the fixed list",
  },
];

export const CATEGORY_MAP: Record<ProcessCategory, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<ProcessCategory, CategoryMeta>;

export const CUSTOM_ICONS: Record<CustomIconName, LucideIcon> = {
  Wrench,
  Sparkles,
  Box,
  Cpu,
  Layers,
  Zap,
  Microscope,
};

export const CUSTOM_ICON_OPTIONS = Object.keys(CUSTOM_ICONS) as CustomIconName[];

export function stepLabel(step: Pick<ProcessStep, "category" | "customName">) {
  return step.category === "custom" && step.customName?.trim()
    ? step.customName.trim()
    : CATEGORY_MAP[step.category].label;
}

export function stepIcon(step: Pick<ProcessStep, "category" | "customIcon">): LucideIcon {
  return step.category === "custom"
    ? CUSTOM_ICONS[step.customIcon ?? "Wrench"]
    : CATEGORY_MAP[step.category].icon;
}
