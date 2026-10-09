import { create } from "zustand";
import type { Layer, Preset, ProcessCategory, ProcessFlow, ProcessStep, StackTransform, ViewMode } from "./types";
import { emptyFlow, recompute, uid } from "./stack";

const STORAGE_KEY = "microfab.flow.v1";
const PRESET_KEY = "microfab.presets.v1";
const VIEW_KEY = "microfab.view.v1";

type State = {
  flow: ProcessFlow;
  presets: Preset[];
  selectedStepId: string | null;
  viewMode: ViewMode;
  hydrated: boolean;
  past: ProcessFlow[];
  future: ProcessFlow[];
};

type Actions = {
  hydrate: () => void;
  undo: () => void;
  redo: () => void;
  setViewMode: (m: ViewMode) => void;
  setFlowName: (name: string) => void;
  setSubstrate: (changes: Partial<Layer>) => void;
  newFlow: () => void;
  loadFlow: (flow: ProcessFlow) => void;
  addStep: (
    category: ProcessCategory,
    description?: string,
    transform?: StackTransform,
    atIndex?: number,
  ) => void;
  addPresetStep: (preset: Preset) => void;
  updateStep: (id: string, changes: Partial<Omit<ProcessStep, "stackAfter">>) => void;
  duplicateStep: (id: string) => void;
  deleteStep: (id: string) => void;
  moveStep: (from: number, to: number) => void;
  selectStep: (id: string | null) => void;
  savePreset: (name: string, step: ProcessStep) => void;
  deletePreset: (id: string) => void;
};

const persist = (s: State) => {
  if (typeof window === "undefined" || !s.hydrated) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s.flow));
  localStorage.setItem(PRESET_KEY, JSON.stringify(s.presets));
  localStorage.setItem(VIEW_KEY, s.viewMode);
};

export const useFabStore = create<State & Actions>((set, get) => {
  let lastCommit = 0;
  let lastKey = "";
  const HISTORY_LIMIT = 100;
  const commit = (flow: ProcessFlow, extra: Partial<State> = {}, key = "") => {
    const now = Date.now();
    const s = get();
    // Coalesce rapid edits of the same field (sliders, typing) into one undo entry.
    const coalesce = key !== "" && key === lastKey && now - lastCommit < 600;
    lastCommit = now;
    lastKey = key;
    const past = coalesce ? s.past : [...s.past, s.flow].slice(-HISTORY_LIMIT);
    const next = { ...s, flow: recompute(flow), past, future: [], ...extra } as State;
    set(next);
    persist(next);
  };

  return {
    flow: emptyFlow(),
    presets: [],
    selectedStepId: null,
    viewMode: "cross",
    hydrated: false,
    past: [],
    future: [],

    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      lastKey = "";
      const keepSel = prev.steps.some((st) => st.id === s.selectedStepId);
      const next = {
        ...s,
        flow: prev,
        past: s.past.slice(0, -1),
        future: [s.flow, ...s.future],
        selectedStepId: keepSel ? s.selectedStepId : null,
      } as State;
      set(next);
      persist(next);
    },

    redo: () => {
      const s = get();
      const nxt = s.future[0];
      if (!nxt) return;
      lastKey = "";
      const keepSel = nxt.steps.some((st) => st.id === s.selectedStepId);
      const next = {
        ...s,
        flow: nxt,
        past: [...s.past, s.flow],
        future: s.future.slice(1),
        selectedStepId: keepSel ? s.selectedStepId : null,
      } as State;
      set(next);
      persist(next);
    },

    hydrate: () => {
      if (get().hydrated || typeof window === "undefined") return;
      let flow = get().flow;
      let presets = get().presets;
      let viewMode = get().viewMode;
      try {
        const rawFlow = localStorage.getItem(STORAGE_KEY);
        if (rawFlow) flow = recompute(JSON.parse(rawFlow) as ProcessFlow);
        const rawPresets = localStorage.getItem(PRESET_KEY);
        if (rawPresets) presets = JSON.parse(rawPresets) as Preset[];
        const rawView = localStorage.getItem(VIEW_KEY);
        if (rawView === "iso" || rawView === "cross") viewMode = rawView;
      } catch {
        /* ignore corrupt storage */
      }
      set({ flow, presets, viewMode, hydrated: true });
    },

    setViewMode: (viewMode) => {
      set({ viewMode });
      persist(get());
    },

    setFlowName: (name) => commit({ ...get().flow, name }, {}, "name"),

    setSubstrate: (changes) =>
      commit(
        { ...get().flow, substrate: { ...get().flow.substrate, ...changes } },
        {},
        `substrate:${Object.keys(changes).join(",")}`,
      ),

    newFlow: () => commit(emptyFlow(), { selectedStepId: null }),

    loadFlow: (flow) => commit(flow, { selectedStepId: null }),

    addStep: (category, description = "", transform, atIndex) => {
      const step: ProcessStep = {
        id: uid(),
        category,
        description,
        ...(category === "custom" ? { customName: "Custom", customIcon: "Wrench" as const } : {}),
        stackTransform: transform ?? { kind: "noChange" },
        stackAfter: [],
      };
      const steps = [...get().flow.steps];
      const index = atIndex === undefined ? steps.length : Math.max(0, Math.min(atIndex, steps.length));
      steps.splice(index, 0, step);
      commit({ ...get().flow, steps }, { selectedStepId: step.id });
    },

    addPresetStep: (preset) => {
      const step: ProcessStep = {
        id: uid(),
        category: preset.category,
        description: preset.description,
        ...(preset.customName ? { customName: preset.customName } : {}),
        ...(preset.customIcon ? { customIcon: preset.customIcon } : {}),
        stackTransform: JSON.parse(JSON.stringify(preset.stackTransform)) as StackTransform,
        stackAfter: [],
      };
      commit({ ...get().flow, steps: [...get().flow.steps, step] }, { selectedStepId: step.id });
    },

    updateStep: (id, changes) =>
      commit({
        ...get().flow,
        steps: get().flow.steps.map((s) => (s.id === id ? { ...s, ...changes } : s)),
      }, {}, `step:${id}:${Object.keys(changes).join(",")}`),

    duplicateStep: (id) => {
      const steps = get().flow.steps;
      const i = steps.findIndex((s) => s.id === id);
      const src = steps[i];
      if (i < 0 || !src) return;
      const copy: ProcessStep = { ...(JSON.parse(JSON.stringify(src)) as ProcessStep), id: uid() };
      const next = [...steps];
      next.splice(i + 1, 0, copy);
      commit({ ...get().flow, steps: next }, { selectedStepId: copy.id });
    },

    deleteStep: (id) =>
      commit(
        { ...get().flow, steps: get().flow.steps.filter((s) => s.id !== id) },
        { selectedStepId: get().selectedStepId === id ? null : get().selectedStepId },
      ),

    moveStep: (from, to) => {
      const steps = [...get().flow.steps];
      if (from === to || from < 0 || from >= steps.length || to < 0 || to >= steps.length) return;
      const [m] = steps.splice(from, 1);
      if (!m) return;
      steps.splice(to, 0, m);
      commit({ ...get().flow, steps });
    },

    selectStep: (selectedStepId) => set({ selectedStepId }),

    savePreset: (name, step) => {
      const preset: Preset = {
        id: uid(),
        name,
        category: step.category,
        description: step.description,
        ...(step.customName ? { customName: step.customName } : {}),
        ...(step.customIcon ? { customIcon: step.customIcon } : {}),
        stackTransform: JSON.parse(JSON.stringify(step.stackTransform)) as StackTransform,
      };
      const next = { ...get(), presets: [...get().presets, preset] } as State;
      set(next);
      persist(next);
    },

    deletePreset: (id) => {
      const next = { ...get(), presets: get().presets.filter((p) => p.id !== id) } as State;
      set(next);
      persist(next);
    },
  };
});
