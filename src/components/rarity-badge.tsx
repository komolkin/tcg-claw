import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RARITY_COLORS: Record<string, string> = {
  Common:      "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  Uncommon:    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Rare:        "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "Rare Holo": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

interface RarityBadgeProps {
  rarity: string;
  className?: string;
}

export function RarityBadge({ rarity, className }: RarityBadgeProps) {
  const colorClass = RARITY_COLORS[rarity] ?? RARITY_COLORS.Common;
  return (
    <Badge
      variant="secondary"
      className={cn("w-fit border-0", colorClass, className)}
    >
      {rarity}
    </Badge>
  );
}
