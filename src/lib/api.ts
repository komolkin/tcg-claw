import type {
  Card,
  CardSearchResponse,
  Set,
  SetListResponse,
  RaritiesResponse,
  TypesResponse,
  Slab,
  SlabListResponse,
} from "./types";

/** Base URL for API requests. Use origin in browser so fetches always hit the same host. */
function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : getBaseUrl() + path;
  const res = await fetch(url);
  const contentType = res.headers.get("content-type") ?? "";
  let data: unknown;
  try {
    data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    throw new Error("Invalid response from server. Try again.");
  }
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: string }).error)
        : typeof data === "string"
          ? data
          : "Request failed";
    throw new Error(message || "Request failed");
  }
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid response from server. Try again.");
  }
  return data as T;
}

export interface SearchCardsParams {
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  /** Comma-separated fields to return; smaller payload = faster load. */
  select?: string;
}

export function buildSearchQuery(params: {
  name?: string;
  type?: string;
  setId?: string;
  rarity?: string;
}): string {
  const parts: string[] = [];
  if (params.name?.trim()) {
    const name = params.name.trim().replace(/"/g, '\\"');
    parts.push(`name:${name}*`);
  }
  if (params.type) parts.push(`types:${params.type}`);
  if (params.setId) parts.push(`set.id:${params.setId}`);
  if (params.rarity)
    parts.push(`rarity:"${params.rarity.replace(/"/g, '\\"')}"`);
  return parts.join(" ");
}

/** Fields for list view – includes tcgplayer for preview prices. */
export const LIST_SELECT = "id,name,images,set,number,rarity,tcgplayer";

export async function searchCards(
  params: SearchCardsParams & {
    name?: string;
    type?: string;
    setId?: string;
    rarity?: string;
  },
): Promise<CardSearchResponse> {
  const {
    name,
    type,
    setId,
    rarity,
    page = 1,
    pageSize = 20,
    orderBy,
    select,
  } = params;
  const q = buildSearchQuery({ name, type, setId, rarity });
  const searchParams = new URLSearchParams();
  if (q) searchParams.set("q", q);
  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));
  if (orderBy) searchParams.set("orderBy", orderBy);
  if (select) searchParams.set("select", select);
  const url = `/api/cards?${searchParams.toString()}`;
  return fetchJson<CardSearchResponse>(url);
}

export async function getCard(id: string): Promise<{ data: Card }> {
  const url = `/api/cards/${encodeURIComponent(id)}`;
  return fetchJson<{ data: Card }>(url);
}

export async function getSets(): Promise<SetListResponse> {
  const url = `/api/sets?pageSize=500&orderBy=-releaseDate`;
  return fetchJson<SetListResponse>(url);
}

export async function getTypes(): Promise<TypesResponse> {
  const url = `/api/types`;
  return fetchJson<TypesResponse>(url);
}

export async function getRarities(): Promise<RaritiesResponse> {
  const url = `/api/rarities`;
  return fetchJson<RaritiesResponse>(url);
}

/** Get best available TCGplayer market price for a card (for sorting). */
export function getCardMarketPrice(card: Card): number {
  const prices = card.tcgplayer?.prices;
  if (!prices) return 0;
  const variants = [
    prices.holofoil,
    prices.reverseHolofoil,
    prices.normal,
    prices["1stEditionHolofoil"],
    prices["1stEditionNormal"],
  ];
  for (const v of variants) {
    const value = v?.market ?? v?.mid ?? v?.low;
    if (value != null && value > 0) return value;
  }
  return 0;
}

/* ───────────────────── Slab Cash API ───────────────────── */

/** Fetch big-hitter slabs for the configured machine (used by claw roulette). */
export async function fetchBigHitters(): Promise<Slab[]> {
  const res = await fetchJson<SlabListResponse>("/api/slabs/big-hitters");
  return res.slabs ?? [];
}

/** Fetch all slabs for the configured machine (used by catalogue). */
export async function fetchMachineSlabs(): Promise<Slab[]> {
  const res = await fetchJson<SlabListResponse>("/api/slabs/machine");
  return res.slabs ?? [];
}

/** USDC uses 6 decimal places. */
const USDC_DECIMALS = 1_000_000;

/**
 * Convert a Slab into a Card-compatible object so existing UI components
 * (CardGrid, CardThumbnail, CardDetailModal, roulette strip) work unchanged.
 */
export function slabToCard(slab: Slab): Card {
  const rarity = slab.machines?.[0]?.rarity ?? "Common";
  const value = (parseFloat(slab.value) || 0) / USDC_DECIMALS;
  const attrs = slab.attributes as Record<string, string> | null | undefined;

  const smallImg = slab.imageUrl ?? slab.imageUrls?.[0] ?? "";
  const largeImg = slab.imageUrls?.[0] ?? smallImg;
  const backImg = slab.imageUrls?.[1] ?? undefined;

  const cardName = attrs?.["Card Name"] ?? slab.description ?? `Slab #${slab.tokenId}`;
  const grade = attrs?.["The Grade"] ?? "";
  const gradingCo = attrs?.["Grading Company"] ?? "";
  const gradeLabel = grade && gradingCo ? `${gradingCo} ${grade}` : grade || gradingCo;

  return {
    id: slab.id,
    name: cardName,
    supertype: gradeLabel || "Slab",
    number: slab.tokenId,
    rarity,
    flavorText: slab.description,
    images: { small: smallImg, large: largeImg, back: backImg },
    set: {
      id: "slab",
      name: attrs?.["Set"] ?? "Slab Cash",
      series: "Slab",
      printedTotal: 0,
      total: 0,
      releaseDate: attrs?.["Year"] ?? "",
      updatedAt: "",
    },
    tcgplayer: {
      url: "",
      updatedAt: "",
      prices: {
        normal: { market: value },
      },
    },
  };
}

/**
 * Fire-and-forget: pre-warm the Next.js image cache for the given URLs.
 * Runs in the background so subsequent image loads are instant.
 */
export function warmImageCache(imageUrls: string[]): void {
  if (imageUrls.length === 0) return;
  fetch("/api/slabs/warm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: imageUrls }),
  }).catch(() => {});
}

export type { Card, Set, Slab };
