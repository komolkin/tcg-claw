"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTypes, getRarities } from "@/lib/api";

export type SortOrder = "priceDesc" | "priceAsc";

export interface FilterState {
  name: string;
  type: string;
  setId: string;
  rarity: string;
  sortOrder: SortOrder;
}

export const DEFAULT_FILTERS: FilterState = {
  name: "",
  type: "",
  setId: "base1",
  rarity: "",
  sortOrder: "priceDesc",
};

/** Types that exist in the Base Set. Used as default before API responds. */
const BASE_SET_TYPES = [
  "Colorless",
  "Fighting",
  "Fire",
  "Grass",
  "Lightning",
  "Psychic",
  "Water",
];

/** Rarities that exist in the Base Set. */
const BASE_SET_RARITIES = ["Common", "Uncommon", "Rare", "Rare Holo"];

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [types, setTypes] = useState<string[]>(BASE_SET_TYPES);
  const [rarities, setRarities] = useState<string[]>(BASE_SET_RARITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getTypes(), getRarities()])
      .then(([typesRes, raritiesRes]) => {
        if (cancelled) return;
        const typesData = typesRes.data ?? [];
        const raritiesData = raritiesRes.data ?? [];
        setTypes(typesData.length > 0 ? typesData : BASE_SET_TYPES);
        setRarities(raritiesData.length > 0 ? raritiesData : BASE_SET_RARITIES);
      })
      .catch(() => {
        if (!cancelled) {
          setTypes(BASE_SET_TYPES);
          setRarities(BASE_SET_RARITIES);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const isDefault =
    filters.name === DEFAULT_FILTERS.name &&
    filters.type === DEFAULT_FILTERS.type &&
    filters.rarity === DEFAULT_FILTERS.rarity &&
    filters.sortOrder === DEFAULT_FILTERS.sortOrder;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by name..."
        value={filters.name}
        onChange={(e) => update({ name: e.target.value })}
        className="max-w-[220px]"
      />
      <Select value="base1" disabled>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Set" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="base1">Base Set</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.type || "all"}
        onValueChange={(v) => update({ type: v === "all" ? "" : v })}
        disabled={loading}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {types.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.rarity || "all"}
        onValueChange={(v) => update({ rarity: v === "all" ? "" : v })}
        disabled={loading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Rarity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All rarities</SelectItem>
          {rarities.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.sortOrder}
        onValueChange={(v) => update({ sortOrder: v as SortOrder })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priceDesc">Price: high to low</SelectItem>
          <SelectItem value="priceAsc">Price: low to high</SelectItem>
        </SelectContent>
      </Select>
      {!isDefault && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => onFiltersChange(DEFAULT_FILTERS)}
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}
