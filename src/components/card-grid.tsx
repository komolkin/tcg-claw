"use client";

import type { Card } from "@/lib/types";
import { CardThumbnail } from "@/components/card-thumbnail";

interface CardGridProps {
  cards: Card[];
  loading?: boolean;
  onCardClick: (card: Card) => void;
}

export function CardGrid({ cards, loading, onCardClick }: CardGridProps) {
  if (loading) return null;

  return (
    <div className="mx-auto grid max-w-[1246px] grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
