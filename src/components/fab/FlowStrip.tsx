import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
} from "lucide-react";
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
  const [dragActive, setDragActive] = useState(false);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  useEffect(() => {
    const clear = () => {
      setDragIndex(null);
      setDragActive(false);
      setOverSlot(null);
    };
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear);
    };
  }, []);

  const clearDrag = () => {
    setDragIndex(null);
    setDragActive(false);
    setOverSlot(null);
  };

  const handleDrop = (slotIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const category = e.dataTransfer.getData("application/x-fab-category") as ProcessCategory;
    if (category) {
      addStep(category, "", undefined, slotIndex);
    } else if (dragIndex !== null) {
      const destination = slotIndex > dragIndex ? slotIndex - 1 : slotIndex;
      if (destination !== dragIndex) moveStep(dragIndex, destination);
    }
    clearDrag();
  };

  const dropZone = (slotIndex: number) => (
    <div
      key={`drop-${slotIndex}`}
      aria-label={`Drop step at position ${slotIndex + 1}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setOverSlot(slotIndex);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = dragIndex === null ? "copy" : "move";
        setOverSlot(slotIndex);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOverSlot((current) => (current === slotIndex ? null : current));
        }
      }}
      onDrop={handleDrop(slotIndex)}
      className={cn(
        "flex min-h-[230px] w-9 shrink-0 items-stretch justify-center rounded-md transition-colors",
        dragActive && "border border-dashed border-primary/50 bg-primary/5",
        overSlot === slotIndex && "border-primary bg-primary/15 ring-2 ring-primary/50",
      )}
    >
      <div
        className={cn(
          "my-3 w-px bg-border transition-all",
          dragActive && "my-2 w-0.5 bg-primary/50",
          overSlot === slotIndex && "w-1 bg-primary",
        )}
      />
      <span className="sr-only">Drop here</span>
    </div>
  );

  return (
    <div
      className="min-h-0 flex-1 overflow-auto p-6"
      onDragEnter={(e) => {
        if (Array.from(e.dataTransfer.types).includes("application/x-fab-category")) {
          setDragActive(true);
        }
      }}
      onDragEnd={clearDrag}
    >
      {flow.steps.length === 0 ? (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
            setOverSlot(0);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop(0)}
          className={cn(
            "flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-border transition-colors",
            dragActive && "border-primary bg-primary/5 ring-2 ring-primary/30",
          )}
        >
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            {dragActive
              ? "Drop here to add the first step"
              : "Pick a process category from the library on the left — or drag its icon here — to add the first step of your flow."}
          </p>
        </div>
      ) : (
        <ol className="flex flex-wrap items-stretch gap-y-4">
          {flow.steps.map((step, i) => {
            const selected = step.id === selectedStepId;
            return (
              <li key={step.id} className="flex items-stretch">
                {dropZone(i)}
                <div
                  onClick={() => selectStep(step.id)}
                  className={cn(
                    "w-[280px] cursor-pointer rounded-lg border bg-card transition-shadow",
                    step.hidden && "opacity-55",
                    selected ? "border-primary shadow-[0_0_0_1px_var(--color-primary)]" : "border-border",
                    dragIndex === i && "opacity-40",
                  )}
                >
                <header className="flex items-center gap-1 border-b border-border px-2 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    draggable
                    className="size-7 shrink-0 cursor-grab active:cursor-grabbing"
                    aria-label={`Drag step ${i + 1} to reorder`}
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("application/x-fab-step", step.id);
                      setDragIndex(i);
                      setDragActive(true);
                    }}
                    onDragEnd={clearDrag}
                  >
                    <GripVertical className="size-4 text-muted-foreground" />
                  </Button>
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
                    aria-label={`Move step ${i + 1} up`}
                    title="Move step up"
                    disabled={i === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(i, i - 1);
                    }}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={`Move step ${i + 1} down`}
                    title="Move step down"
                    disabled={i === flow.steps.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(i, i + 1);
                    }}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
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
                </div>
              </li>
            );
          })}
          <li className="flex items-stretch">{dropZone(flow.steps.length)}</li>
        </ol>
      )}
    </div>
  );
}
