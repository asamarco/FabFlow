import { CATEGORY_MAP, CUSTOM_ICONS } from "@/lib/fab/categories";
import type { CustomIconName, ProcessCategory } from "@/lib/fab/types";
import { cn } from "@/lib/utils";

export function CategoryIcon({
  category,
  customIcon,
  className,
  size = 28,
}: {
  category: ProcessCategory;
  customIcon?: CustomIconName | undefined;
  className?: string;
  size?: number;
}) {
  const meta = CATEGORY_MAP[category];
  const Icon = category === "custom" ? CUSTOM_ICONS[customIcon ?? "Wrench"] : meta.icon;
  return <Icon size={size} className={cn("shrink-0", className)} aria-label={meta.label} />;
}
