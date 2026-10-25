import { useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Search, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/fab/categories";
import { useFabStore } from "@/lib/fab/store";
import { CategoryIcon } from "./CategoryIcon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LibraryPanel() {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const addStep = useFabStore((s) => s.addStep);
  const presets = useFabStore((s) => s.presets);
  const addPresetStep = useFabStore((s) => s.addPresetStep);
  const deletePreset = useFabStore((s) => s.deletePreset);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CATEGORIES;
    return CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(needle) || c.hint.toLowerCase().includes(needle),
    );
  }, [q]);

  const filteredPresets = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return presets;
    return presets.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle),
    );
  }, [presets, q]);

  return (
    <aside aria-label="Process library" className={cn("flex h-full shrink-0 flex-col border-r border-border bg-card", collapsed ? "w-16" : "w-72")}>
      <div className={cn("flex items-center border-b border-border", collapsed ? "justify-center p-2" : "justify-between px-3 pt-3")}>
        {!collapsed && <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Process library</h2>}
        <Button variant="ghost" size="icon" className="size-8" aria-label={collapsed ? "Expand process library" : "Collapse process library"} title={collapsed ? "Expand process library" : "Collapse process library"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
      {!collapsed && <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            className="pl-8"
          />
        </div>
      </div>}

      <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
        <div className={cn("grid gap-2", collapsed ? "grid-cols-1" : "grid-cols-2")}>
          {(collapsed ? CATEGORIES : filtered).map((c) => (
            <Button
              key={c.id}
              variant="outline"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/x-fab-category", c.id)}
              onClick={() => addStep(c.id)}
              title={`${c.label} — ${c.hint}`}
              aria-label={c.label}
              className={cn("group whitespace-normal text-center hover:border-primary", collapsed ? "size-11 p-2" : "h-auto min-h-20 flex-col gap-2 p-3")}
            >
              <CategoryIcon category={c.id} size={collapsed ? 22 : 30} />
              {!collapsed && <span className="text-[0.7rem] font-medium leading-tight">{c.label}</span>}
            </Button>
          ))}
        </div>

        {!collapsed && <><h2 className="mb-2 mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Presets
        </h2>
        {filteredPresets.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Save a step as a preset to reuse recurring recipes.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredPresets.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
                <CategoryIcon category={p.category} customIcon={p.customIcon} size={20} />
                <button
                  onClick={() => addPresetStep(p)}
                  className="min-w-0 flex-1 text-left text-xs leading-tight hover:text-primary"
                >
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-muted-foreground">{p.description}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => deletePreset(p.id)}
                  aria-label="Delete preset"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}</>}
      </div>

    </aside>
  );
}
