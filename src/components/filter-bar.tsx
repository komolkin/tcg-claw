"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  setId: "",
  rarity: "",
  sortOrder: "priceDesc",
};

const SLAB_RARITIES = ["Common", "Uncommon", "Rare", "Mythic", "Legendary"];

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const update = (patch: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const isDefault =
    filters.name === DEFAULT_FILTERS.name &&
    filters.rarity === DEFAULT_FILTERS.rarity &&
    filters.sortOrder === DEFAULT_FILTERS.sortOrder;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Input
        placeholder="Search by name..."
        value={filters.name}
        onChange={(e) => update({ name: e.target.value })}
        className="max-w-[220px]"
      />
      <Select
        value={filters.rarity || "all"}
        onValueChange={(v) => update({ rarity: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Rarity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All rarities</SelectItem>
          {SLAB_RARITIES.map((r) => (
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
          <SelectItem value="priceDesc">Value: high to low</SelectItem>
          <SelectItem value="priceAsc">Value: low to high</SelectItem>
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
