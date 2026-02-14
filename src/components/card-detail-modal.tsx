"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/types";
import { getCard } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RarityBadge } from "@/components/rarity-badge";

interface CardDetailModalProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CardImage({ card }: { card: Card }) {
  const [loaded, setLoaded] = useState(false);
  const src = card.images.large || card.images.small;

  // Reset loaded state when the card changes.
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className="flex justify-center">
      <div className="relative aspect-3/4 w-full max-w-[240px]">
        {!loaded && <Skeleton className="absolute inset-0 rounded-lg" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={card.name}
          className={`absolute inset-0 h-full w-full rounded-lg object-contain shadow-md transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

function getTcgPlayerUrl(card: Card): string {
  if (card.tcgplayer?.url) return card.tcgplayer.url;
  const query = encodeURIComponent(card.name);
  return `https://www.tcgplayer.com/search/pokemon/base-set?q=${query}`;
}

function PriceDisplay({ card }: { card: Card }) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  const variant =
    prices.holofoil ?? prices.normal ?? prices.reverseHolofoil ?? null;
  const market = variant?.market ?? variant?.mid;
  if (market == null) return null;
  const url = getTcgPlayerUrl(card);
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">TCGplayer market: </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      >
        ${market.toFixed(2)}
      </a>
    </p>
  );
}

function hasFullDetails(card: Card): boolean {
  return !!(card.attacks?.length || card.abilities?.length || card.tcgplayer);
}

export function CardDetailModal({
  card,
  open,
  onOpenChange,
}: CardDetailModalProps) {
  const [fullCard, setFullCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !card) {
      setFullCard(null);
      return;
    }
    if (hasFullDetails(card)) {
      setFullCard(card);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFullCard(card);
    getCard(card.id)
      .then((res) => {
        if (!cancelled) {
          setFullCard(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setFullCard(card);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, card?.id]);

  if (!card) return null;
  const displayCard: Card = fullCard ?? card;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-xs gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{displayCard.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-5rem)]">
          <div className="grid gap-6 p-6 sm:grid-cols-[1fr,1fr]">
            <CardImage card={displayCard} />
            <div className="flex flex-col gap-4 text-sm">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {displayCard.supertype && (
                      <Badge variant="secondary">{displayCard.supertype}</Badge>
                    )}
                    {displayCard.subtypes?.map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                    {displayCard.types?.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                  <h3 className="text-lg font-semibold">{displayCard.name}</h3>
                  {(displayCard.hp ?? displayCard.number) && (
                    <div className="flex gap-4">
                      {displayCard.hp && (
                        <span>
                          <span className="text-muted-foreground">HP </span>
                          <span className="font-medium">{displayCard.hp}</span>
                        </span>
                      )}
                      <span>
                        <span className="text-muted-foreground">No. </span>
                        <span className="font-medium">
                          {displayCard.number}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {displayCard.set.total}
                        </span>
                      </span>
                    </div>
                  )}
                  {displayCard.rarity && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Rarity: </span>
                      <RarityBadge rarity={displayCard.rarity} />
                    </div>
                  )}
                  {displayCard.artist && (
                    <p>
                      <span className="text-muted-foreground">Artist: </span>
                      {displayCard.artist}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Set: </span>
                    {displayCard.set.name}
                  </p>
                  <PriceDisplay card={displayCard} />
                  {displayCard.abilities &&
                    displayCard.abilities.length > 0 && (
                      <div>
                        <h4 className="mb-1 font-semibold">Abilities</h4>
                        <ul className="space-y-2">
                          {displayCard.abilities.map((a) => (
                            <li key={a.name}>
                              <span className="font-medium">{a.name}</span>
                              {a.text && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  — {a.text}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {displayCard.attacks && displayCard.attacks.length > 0 && (
                    <div>
                      <h4 className="mb-1 font-semibold">Attacks</h4>
                      <ul className="space-y-2">
                        {displayCard.attacks.map((a) => (
                          <li
                            key={a.name}
                            className="flex flex-wrap items-baseline gap-2"
                          >
                            <span className="font-medium">{a.name}</span>
                            {a.cost && a.cost.length > 0 && (
                              <span className="text-muted-foreground">
                                [{a.cost.join(", ")}]
                              </span>
                            )}
                            {a.damage && (
                              <span className="font-medium">{a.damage}</span>
                            )}
                            {a.text && (
                              <span className="block text-muted-foreground">
                                {a.text}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(displayCard.weaknesses?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="mb-1 font-semibold">Weakness</h4>
                      <ul className="flex flex-wrap gap-2">
                        {displayCard.weaknesses!.map((w) => (
                          <li key={w.type}>
                            <Badge variant="destructive">
                              {w.type} {w.value}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(displayCard.resistances?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="mb-1 font-semibold">Resistance</h4>
                      <ul className="flex flex-wrap gap-2">
                        {displayCard.resistances!.map((r) => (
                          <li key={r.type}>
                            <Badge variant="secondary">
                              {r.type} {r.value}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {displayCard.retreatCost &&
                    displayCard.retreatCost.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">Retreat: </span>
                        [{displayCard.retreatCost.join(", ")}]
                      </p>
                    )}
                  {displayCard.flavorText && (
                    <p className="italic text-muted-foreground">
                      {displayCard.flavorText}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
