import { useMemo, useState } from "react";
import { Copy, Download, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useFabStore } from "@/lib/fab/store";
import { stepLabel } from "@/lib/fab/categories";
import { CategoryIcon } from "./CategoryIcon";
import { WaferRenderer, referenceTotal } from "./WaferRenderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { download, stepSvg } from "@/lib/fab/export";
import type { ProcessCategory } from "@/lib/fab/types";

export function FlowStrip() {
  const flow = useFabStore((s) => s.flow);
  const viewMode = useFabStore((s) => s.viewMode);
  const selectedStepId = useFabStore((s) => s.selectedStepId);
  const selectStep = useFabStore((s) => s.selectStep);
  const duplicateStep = useFabStore((s) => s.duplicateStep);
  const deleteStep = useFabStore((s) => s.deleteStep);
  const updateStep = useFabStore((s) => s.updateStep);
  const moveStep = useFabStore((s) => s.moveStep);
  const addStep = useFabStore((s) => s.addStep);
  const refTotal = useMemo(
    () => referenceTotal([[flow.substrate], ...flow.steps.map((s) => s.stackAfter)]),
    [flow],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const category = e.dataTransfer.getData("application/x-fab-category") as ProcessCategory;
    if (category) {
      addStep(category);
    } else if (dragIndex !== null) {
      moveStep(dragIndex, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div
      className="min-h-0 flex-1 overflow-auto p-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop(flow.steps.length - 1)}
    >
      {flow.steps.length === 0 ? (
        <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            Pick a process category from the library on the left — or drag its icon here — to add the
            first step of your flow.
          </p>
        </div>
      ) : (
        <ol className="flex flex-wrap gap-4">
          {flow.steps.map((step, i) => {
            const selected = step.id === selectedStepId;
            return (
              <li
                key={step.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDragLeave={() => setOverIndex((v) => (v === i ? null : v))}
                onDrop={handleDrop(i)}
                onClick={() => selectStep(step.id)}
                className={cn(
                  "w-[280px] cursor-pointer rounded-lg border bg-card transition-shadow",
                  step.hidden && "opacity-55",
                  selected ? "border-primary shadow-[0_0_0_1px_var(--color-primary)]" : "border-border",
                  overIndex === i && dragIndex !== null && "ring-2 ring-primary/60",
                )}
              >
                <header className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <CategoryIcon category={step.category} customIcon={step.customIcon} size={22} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {stepLabel(step)}
                  </span>
                  {step.hidden && (
                    <span className="rounded border border-border px-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      hidden
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={step.hidden ? "Show step in export" : "Hide step from export"}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStep(step.id, { hidden: !step.hidden });
                    }}
                  >
                    {step.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Export step as SVG"
                    onClick={(e) => {
                      e.stopPropagation();
                      download(`step-${i + 1}.svg`, stepSvg(step, i, viewMode, refTotal));
                    }}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Duplicate step"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateStep(step.id);
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Delete step"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStep(step.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </header>
                <div className="bg-background/40 px-2 pt-2 text-foreground">
                  <WaferRenderer
                    layers={step.stackAfter}
                    refTotal={refTotal}
                    mode={viewMode}
                    labels={viewMode === "cross"}
                    className="h-[150px] w-full"
                  />
                </div>
                <p className="px-3 pb-3 pt-1 text-xs leading-snug text-muted-foreground">
                  {step.description || (
                    <span className="italic">No description yet — select the step to add one.</span>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
