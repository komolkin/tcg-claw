"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { searchCards, getCardMarketPrice, LIST_SELECT } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { FilterBar, DEFAULT_FILTERS, type FilterState } from "@/components/filter-bar";
import { CardGrid } from "@/components/card-grid";
import { CardDetailModal } from "@/components/card-detail-modal";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;
const PRICE_SORT_PAGE_SIZE = 250;

function getQueryKey(debouncedName: string, filters: FilterState): string {
  return JSON.stringify({
    name: debouncedName,
    type: filters.type,
    setId: filters.setId,
    rarity: filters.rarity,
    sortOrder: filters.sortOrder,
  });
}

type PageCache = Map<number, { data: Card[]; totalCount: number }>;

export function CardCatalogue() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const debouncedName = useDebounce(filters.name, 400);
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const cacheRef = useRef<Map<string, PageCache>>(new Map());

  const queryKey = useMemo(
    () => getQueryKey(debouncedName, filters),
    [
      debouncedName,
      filters.type,
      filters.setId,
      filters.rarity,
      filters.sortOrder,
    ],
  );

  const fetchCards = useCallback(async () => {
    const cache = cacheRef.current.get(queryKey);
    if (cache) {
      const first = cache.values().next().value;
      if (first) {
        setCards(
          Array.from(cache.entries())
            .sort(([a], [b]) => a - b)
            .flatMap(([, v]) => v.data),
        );
        setTotalCount(first.totalCount);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await searchCards({
        name: debouncedName || undefined,
        type: filters.type || undefined,
        setId: filters.setId || undefined,
        rarity: filters.rarity || undefined,
        page: 1,
        pageSize: PRICE_SORT_PAGE_SIZE,
        select: LIST_SELECT,
      });
      const sorted = [...res.data].sort((a, b) => {
        const pa = getCardMarketPrice(a);
        const pb = getCardMarketPrice(b);
        return filters.sortOrder === "priceDesc" ? pb - pa : pa - pb;
      });
      setCards(sorted);
      setTotalCount(sorted.length);
      const pageCache: PageCache = new Map();
      for (let p = 1; p <= Math.ceil(sorted.length / PAGE_SIZE); p++) {
        const start = (p - 1) * PAGE_SIZE;
        pageCache.set(p, {
          data: sorted.slice(start, start + PAGE_SIZE),
          totalCount: sorted.length,
        });
      }
      cacheRef.current.set(queryKey, pageCache);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
      setCards([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedName,
    filters.type,
    filters.setId,
    filters.rarity,
    filters.sortOrder,
    queryKey,
  ]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedName,
    filters.type,
    filters.setId,
    filters.rarity,
    filters.sortOrder,
  ]);

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setModalOpen(true);
  };

  const displayCards = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return cards.slice(start, start + PAGE_SIZE);
  }, [cards, page]);

  return (
    <div className="flex flex-col gap-6">
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {error}
        </div>
      )}
      <CardGrid
        cards={displayCards}
        loading={loading}
        onCardClick={handleCardClick}
      />
      {!loading && cards.length === 0 && !error && (
        <p className="text-muted-foreground text-center text-sm">
          No cards match your filters. Try adjusting the search or filters.
        </p>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
      />
      <CardDetailModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
