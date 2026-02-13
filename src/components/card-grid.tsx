"use client";

import type { Card } from "@/lib/types";
import { CardThumbnail } from "@/components/card-thumbnail";
import { Skeleton } from "@/components/ui/skeleton";

interface CardGridProps {
  cards: Card[];
  loading?: boolean;
  onCardClick: (card: Card) => void;
}

function ThumbnailSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border bg-card shadow-sm">
      <Skeleton className="aspect-3/4 w-full rounded-t-lg" />
      <div className="flex flex-col gap-1 p-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export function CardGrid({ cards, loading, onCardClick }: CardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ThumbnailSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <CardThumbnail
          key={card.id}
          card={card}
          onClick={() => onCardClick(card)}
        />
      ))}
    </div>
  );
}
