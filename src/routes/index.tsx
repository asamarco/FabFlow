import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toolbar } from "@/components/fab/Toolbar";
import { LibraryPanel } from "@/components/fab/LibraryPanel";
import { FlowStrip } from "@/components/fab/FlowStrip";
import { StepInspector } from "@/components/fab/StepInspector";
import { useFabStore } from "@/lib/fab/store";

const TITLE = "FabFlow — Microfabrication Process Flow Designer";
const DESCRIPTION =
  "Build microfabrication process flows step by step and see the wafer layer stack after each deposition, lithography, etch or doping step. Export as SVG, PNG, JSON or PowerPoint.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const hydrate = useFabStore((s) => s.hydrate);
  const hydrated = useFabStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <h1 className="sr-only">Microfabrication process flow designer</h1>
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LibraryPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          {hydrated ? (
            <FlowStrip />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading flow…
            </div>
          )}
        </main>
        <StepInspector />
      </div>
    </div>
  );
}
