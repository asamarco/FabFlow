import { useRef } from "react";
import { Boxes, FilePlus2, FileJson, ImageDown, Layers, Presentation } from "lucide-react";
import { useFabStore } from "@/lib/fab/store";
import { download, downloadPng, exportPptx, storyboardSvg } from "@/lib/fab/export";
import { recompute } from "@/lib/fab/stack";
import type { ProcessFlow } from "@/lib/fab/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

export function Toolbar() {
  const flow = useFabStore((s) => s.flow);
  const viewMode = useFabStore((s) => s.viewMode);
  const setViewMode = useFabStore((s) => s.setViewMode);
  const setFlowName = useFabStore((s) => s.setFlowName);
  const newFlow = useFabStore((s) => s.newFlow);
  const loadFlow = useFabStore((s) => s.loadFlow);
  const fileRef = useRef<HTMLInputElement>(null);

  const slug = flow.name.replace(/\s+/g, "_") || "process_flow";

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2 pr-2">
        <Boxes className="size-5 text-primary" />
        <span className="font-mono text-sm font-semibold tracking-tight">FabFlow</span>
      </div>

      <Input
        value={flow.name}
        onChange={(e) => setFlowName(e.target.value)}
        className="h-8 w-64"
        aria-label="Flow name"
      />

      <Button variant="outline" size="sm" onClick={() => newFlow()}>
        <FilePlus2 className="size-4" /> New
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const parsed = JSON.parse(await file.text()) as ProcessFlow;
            loadFlow(recompute(parsed));
            toast.success("Flow loaded");
          } catch {
            toast.error("That file is not a valid flow JSON");
          }
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        <FileJson className="size-4" /> Load JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => download(`${slug}.json`, JSON.stringify(flow, null, 2), "application/json")}
      >
        <FileJson className="size-4" /> Save JSON
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as "iso" | "cross")}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="cross" aria-label="2D cross-section">
            <Layers className="size-4" /> 2D
          </ToggleGroupItem>
          <ToggleGroupItem value="iso" aria-label="3D isometric">
            <Boxes className="size-4" /> 3D
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => download(`${slug}_storyboard.svg`, storyboardSvg(flow, viewMode))}
        >
          <ImageDown className="size-4" /> SVG
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await downloadPng(`${slug}_storyboard.png`, storyboardSvg(flow, viewMode));
            } catch {
              toast.error("PNG export failed");
            }
          }}
        >
          <ImageDown className="size-4" /> PNG
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            try {
              await exportPptx(flow, viewMode);
            } catch {
              toast.error("PowerPoint export failed");
            }
          }}
        >
          <Presentation className="size-4" /> PPTX
        </Button>
      </div>
    </header>
  );
}
