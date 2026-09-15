import { useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import { useFabStore } from "@/lib/fab/store";
import { CATEGORIES, CUSTOM_ICONS, CUSTOM_ICON_OPTIONS } from "@/lib/fab/categories";
import { stackBefore } from "@/lib/fab/stack";
import type {
  CustomIconName,
  Layer,
  PatternShape,
  ProcessCategory,
  StackTransform,
} from "@/lib/fab/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const NEW_LAYER: Omit<Layer, "id"> = {
  material: "Ti",
  color: "#b8c0cc",
  thickness: 20,
  patterned: false,
  pattern: { kind: "none" },
  isResist: false,
};

export function StepInspector() {
  const flow = useFabStore((s) => s.flow);
  const selectedStepId = useFabStore((s) => s.selectedStepId);
  const updateStep = useFabStore((s) => s.updateStep);
  const savePreset = useFabStore((s) => s.savePreset);
  const setSubstrate = useFabStore((s) => s.setSubstrate);
  const [presetName, setPresetName] = useState("");

  const index = flow.steps.findIndex((s) => s.id === selectedStepId);
  const step = index >= 0 ? flow.steps[index] : undefined;
  const previous = useMemo(() => stackBefore(flow, index < 0 ? 0 : index), [flow, index]);

  if (!step) {
    return (
      <aside className="flex h-full w-80 shrink-0 flex-col gap-4 border-l border-border bg-card p-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Substrate
        </h2>
        <LayerFields
          layer={flow.substrate}
          onChange={(changes) => setSubstrate(changes)}
          allowPattern={false}
        />
        <p className="text-xs text-muted-foreground">
          Select a step in the flow to edit its category, description and stack transform.
        </p>
      </aside>
    );
  }

  const t = step.stackTransform;
  const setTransform = (stackTransform: StackTransform) => updateStep(step.id, { stackTransform });

  const targetId =
    t.kind === "removeLayer" || t.kind === "modifyLayer" || t.kind === "recolorLayer"
      ? t.layerId
      : "";
  const targetLayer = previous.find((l) => l.id === targetId);

  const changeKind = (kind: StackTransform["kind"]) => {
    const first = previous[previous.length - 1];
    switch (kind) {
      case "addLayer":
        return setTransform({ kind: "addLayer", layer: { ...NEW_LAYER } });
      case "removeLayer":
        return setTransform({ kind: "removeLayer", layerId: first?.id ?? "" });
      case "modifyLayer":
        return setTransform({ kind: "modifyLayer", layerId: first?.id ?? "", changes: {} });
      case "recolorLayer":
        return setTransform({
          kind: "recolorLayer",
          layerId: first?.id ?? "",
          color: first?.color ?? "#b8c0cc",
        });
      default:
        return setTransform({ kind: "noChange" });
    }
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card p-4">
      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Step {index + 1}
        </h2>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <Label htmlFor="step-hidden">Hidden from export</Label>
          <p className="text-[11px] text-muted-foreground">
            Keeps the stack effect, omits the step from SVG/PPTX exports.
          </p>
        </div>
        <Switch
          id="step-hidden"
          checked={!!step.hidden}
          onCheckedChange={(hidden) => updateStep(step.id, { hidden })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select
          value={step.category}
          onValueChange={(v) => {
            const category = v as ProcessCategory;
            updateStep(step.id, {
              category,
              ...(category === "custom"
                ? {
                    customName: step.customName ?? "Custom",
                    customIcon: step.customIcon ?? "Wrench",
                  }
                : {}),
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {step.category === "custom" && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-step-name">Output name</Label>
            <Input
              id="custom-step-name"
              value={step.customName ?? ""}
              placeholder="Custom process name"
              onChange={(e) => updateStep(step.id, { customName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Output icon</Label>
            <Select
              value={step.customIcon ?? "Wrench"}
              onValueChange={(customIcon) =>
                updateStep(step.id, { customIcon: customIcon as CustomIconName })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_ICON_OPTIONS.map((name) => {
                  const Icon = CUSTOM_ICONS[name];
                  return (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={step.description}
          placeholder="e.g. 300nm Ti deposition by PVD on BSG"
          onChange={(e) => updateStep(step.id, { description: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Stack transform</Label>
        <Select value={t.kind} onValueChange={(v) => changeKind(v as StackTransform["kind"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="noChange">No change (annotation only)</SelectItem>
            <SelectItem value="addLayer">Add layer</SelectItem>
            <SelectItem value="removeLayer">Remove layer</SelectItem>
            <SelectItem value="modifyLayer">Modify layer (pattern / thickness)</SelectItem>
            <SelectItem value="recolorLayer">Recolor layer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {t.kind !== "noChange" && t.kind !== "addLayer" && (
        <div className="space-y-1.5">
          <Label>Target layer</Label>
          <Select
            value={targetId}
            onValueChange={(layerId) => {
              if (t.kind === "removeLayer") setTransform({ kind: "removeLayer", layerId });
              if (t.kind === "modifyLayer")
                setTransform({ kind: "modifyLayer", layerId, changes: t.changes });
              if (t.kind === "recolorLayer")
                setTransform({ kind: "recolorLayer", layerId, color: t.color });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a layer" />
            </SelectTrigger>
            <SelectContent>
              {[...previous].reverse().map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.material}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {t.kind === "addLayer" && (
        <>
          <div className="space-y-1.5">
            <Label>Position</Label>
            <Select
              value={t.position ?? "top"}
              onValueChange={(position) =>
                setTransform({
                  kind: "addLayer",
                  layer: t.layer,
                  position: position as "top" | "bottom",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">On top of the stack</SelectItem>
                <SelectItem value="bottom">Below the substrate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LayerFields
            layer={{ id: "new", ...t.layer }}
            onChange={(changes) =>
              setTransform({
                kind: "addLayer",
                layer: { ...t.layer, ...changes },
                position: t.position ?? "top",
              })
            }
          />
        </>
      )}

      {t.kind === "modifyLayer" && (
        <LayerFields
          layer={{ ...(targetLayer ?? { ...NEW_LAYER, id: "x" }), ...t.changes } as Layer}
          onChange={(changes) =>
            setTransform({ kind: "modifyLayer", layerId: t.layerId, changes: { ...t.changes, ...changes } })
          }
        />
      )}

      {t.kind === "recolorLayer" && (
        <div className="space-y-1.5">
          <Label>New color</Label>
          <ColorInput value={t.color} onChange={(color) => setTransform({ ...t, color })} />
        </div>
      )}

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        <Label>Save as preset</Label>
        <div className="flex gap-2">
          <Input
            value={presetName}
            placeholder="Preset name"
            onChange={(e) => setPresetName(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const name = presetName.trim() || step.description.trim() || "Untitled preset";
              savePreset(name, step);
              setPresetName("");
              toast.success(`Preset "${name}" saved`);
            }}
          >
            <Bookmark className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
        aria-label="Layer color"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
    </div>
  );
}

function LayerFields({
  layer,
  onChange,
  allowPattern = true,
}: {
  layer: Layer;
  onChange: (changes: Partial<Layer>) => void;
  allowPattern?: boolean;
}) {
  const pattern: PatternShape = layer.pattern ?? { kind: "none" };
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="space-y-1.5">
        <Label>Material</Label>
        <Input value={layer.material} onChange={(e) => onChange({ material: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <ColorInput value={layer.color} onChange={(color) => onChange({ color })} />
      </div>
      <div className="space-y-1.5">
        <Label>Thickness ({layer.thickness})</Label>
        <Slider
          min={1}
          max={200}
          step={1}
          value={[layer.thickness]}
          onValueChange={([v]) => onChange({ thickness: v ?? 1 })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="resist">Photoresist layer</Label>
        <Switch
          id="resist"
          checked={!!layer.isResist}
          onCheckedChange={(isResist) => onChange({ isResist })}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="conformal">Conformal (follows surface)</Label>
          <Switch
            id="conformal"
            checked={layer.conformal !== false}
            onCheckedChange={(conformal) => onChange({ conformal })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Off: the layer is drawn as one flat slab suspended over voids.
        </p>
      </div>

      {layer.conformal !== false && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="planarize">Planarize (flat outer surface)</Label>
            <Switch
              id="planarize"
              checked={!!layer.planarize}
              onCheckedChange={(planarize) => onChange({ planarize })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fills the surface below while ending flat on the outside.
          </p>
        </div>
      )}



      {allowPattern && (
        <>
          <div className="flex items-center justify-between">
            <Label htmlFor="patterned">Patterned</Label>
            <Switch
              id="patterned"
              checked={layer.patterned}
              onCheckedChange={(patterned) =>
                onChange({
                  patterned,
                  pattern: patterned
                    ? pattern.kind === "none"
                      ? { kind: "holes", count: 3, layout: "row" }
                      : pattern
                    : { kind: "none" },
                })
              }
            />
          </div>

          {layer.patterned && (
            <div className="space-y-3">
              <Select
                value={pattern.kind === "none" ? "holes" : pattern.kind}
                onValueChange={(kind) =>
                  onChange({
                    pattern:
                      kind === "holes"
                        ? { kind: "holes", count: 3, layout: "row" }
                        : { kind: "partialCover", coverageFraction: 0.5 },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holes">Openings / holes</SelectItem>
                  <SelectItem value="partialCover">Partial coverage</SelectItem>
                </SelectContent>
              </Select>

              {pattern.kind === "holes" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Openings ({pattern.count})</Label>
                    <Slider
                      min={1}
                      max={9}
                      step={1}
                      value={[pattern.count]}
                      onValueChange={([v]) => onChange({ pattern: { ...pattern, count: v ?? 1 } })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Opening width ({Math.round((pattern.openingWidth ?? 0.5) * 100)}% of pitch)
                    </Label>
                    <Slider
                      min={5}
                      max={95}
                      step={5}
                      value={[(pattern.openingWidth ?? 0.5) * 100]}
                      onValueChange={([v]) =>
                        onChange({ pattern: { ...pattern, openingWidth: (v ?? 50) / 100 } })
                      }
                    />
                  </div>
                  <Select
                    value={pattern.layout}
                    onValueChange={(layout) =>
                      onChange({ pattern: { ...pattern, layout: layout as "grid" | "row" } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="row">Row</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {pattern.kind === "partialCover" && (
                <div className="space-y-1.5">
                  <Label>Coverage ({Math.round(pattern.coverageFraction * 100)}%)</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[pattern.coverageFraction * 100]}
                    onValueChange={([v]) =>
                      onChange({ pattern: { ...pattern, coverageFraction: (v ?? 0) / 100 } })
                    }
                  />
                </div>
              )}

              {pattern.kind !== "none" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pattern-inverted">Invert pattern (negative)</Label>
                    <Switch
                      id="pattern-inverted"
                      checked={!!pattern.inverted}
                      onCheckedChange={(inverted) =>
                        onChange({ pattern: { ...pattern, inverted } })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Exact negative: material stays only where the openings would be.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Etch depth ({Math.round((layer.etchDepth ?? 1) * 100)}%)</Label>
                <Slider
                  min={5}
                  max={100}
                  step={5}
                  value={[(layer.etchDepth ?? 1) * 100]}
                  onValueChange={([v]) => onChange({ etchDepth: (v ?? 100) / 100 })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Fraction of the layer height removed inside the pattern.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="backside">Flip vertically</Label>
                <Switch
                  id="backside"
                  checked={!!layer.backsideEtch}
                  onCheckedChange={(backsideEtch) => onChange({ backsideEtch })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Slope ({layer.undercut ?? 0})</Label>
                <Slider
                  min={-10}
                  max={10}
                  step={1}
                  value={[layer.undercut ?? 0]}
                  onValueChange={([v]) => onChange({ undercut: v ?? 0 })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Positive tapers the sidewalls inward, negative flares them outward.
                </p>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
