"use client";

import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getCardMarketPrice } from "@/lib/api";
import { RarityBadge } from "@/components/rarity-badge";

interface CardThumbnailProps {
  card: Card;
  onClick: () => void;
  className?: string;
}

function formatPrice(card: Card): string | null {
  const price = getCardMarketPrice(card);
  if (price <= 0) return null;
  return `$${price.toFixed(2)}`;
}

export function CardThumbnail({
  card,
  onClick,
  className,
}: CardThumbnailProps) {
  const price = formatPrice(card);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col rounded-lg border bg-card text-left shadow-sm transition hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-t-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.images.small}
          alt={card.name}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-col gap-1 p-2">
        <span className="truncate text-sm font-medium">{card.name}</span>
        <div className="flex items-center justify-between gap-1">
          {card.rarity && <RarityBadge rarity={card.rarity} className="text-xs" />}
          {price && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              {price}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
