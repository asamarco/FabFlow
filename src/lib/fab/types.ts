export type PatternShape =
  | { kind: "none" }
  /** `inverted`: exact negative — material stays only where the openings would be */
  | {
      kind: "holes";
      count: number;
      layout: "grid" | "row";
      inverted?: boolean;
      /** 0.05..0.95 — width of each opening as a fraction of the pitch (default 0.5) */
      openingWidth?: number;
    }
  | { kind: "partialCover"; coverageFraction: number; inverted?: boolean };

export type Layer = {
  id: string;
  material: string;
  color: string;
  thickness: number;
  patterned: boolean;
  pattern?: PatternShape;
  isResist?: boolean;
  /** Sidewall slope: positive tapers inward, negative flares outward */
  undercut?: number;
  /** 0..1 — fraction of the layer height removed by the pattern (1 = through-etch) */
  etchDepth?: number;
  /** Etch proceeds from the bottom of the layer instead of the top */
  backsideEtch?: boolean;
  /** Conformal deposition: follows the surface below, filling voids (default true) */
  conformal?: boolean;
  /** Conformal but with a flat outer surface (planarizing fill) */
  planarize?: boolean;


};

export type ProcessCategory =
  | "deposition"
  | "plasmaProcess"
  | "lithography"
  | "wetProcess"
  | "spinCoating"
  | "heating"
  | "doping"
  | "inspection"
  | "measurement"
  | "dicing"
  | "wireBonding"
  | "polishing"
  | "custom";

export type CustomIconName =
  | "Wrench"
  | "Sparkles"
  | "Box"
  | "Cpu"
  | "Layers"
  | "Zap"
  | "Microscope";

export type StackTransform =
  | { kind: "addLayer"; layer: Omit<Layer, "id">; position?: "top" | "bottom" }
  | { kind: "removeLayer"; layerId: string }
  | { kind: "modifyLayer"; layerId: string; changes: Partial<Layer> }
  | { kind: "recolorLayer"; layerId: string; color: string }
  | { kind: "noChange" };

export type ProcessStep = {
  id: string;
  category: ProcessCategory;
  description: string;
  customName?: string;
  customIcon?: CustomIconName;
  stackTransform: StackTransform;
  stackAfter: Layer[];
  /** Kept in the flow (its stack effect still applies) but omitted from exports */
  hidden?: boolean;
};

export type ProcessFlow = {
  id: string;
  name: string;
  substrate: Layer;
  steps: ProcessStep[];
};

export type Preset = {
  id: string;
  name: string;
  category: ProcessCategory;
  description: string;
  customName?: string;
  customIcon?: CustomIconName;
  stackTransform: StackTransform;
};

export type ViewMode = "iso" | "cross";
