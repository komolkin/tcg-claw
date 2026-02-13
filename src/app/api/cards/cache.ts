/**
 * Server-side cache for Base Set cards.
 *
 * - Loads instantly from static JSON seed (102 cards, no prices).
 * - Optionally refreshes from the Pokemon TCG API in the background
 *   to get tcgplayer prices.  If the API is down, static data is used.
 */

import type { Card, SetRef, TcgPlayer } from "@/lib/types";
import seedCards from "@/data/base-set-cards.json";
import priceMap from "@/data/base-set-prices";

const API_BASE = "https://api.pokemontcg.io/v2";
const REFRESH_TIMEOUT_MS = 30_000;

/** Static Base Set info added to every seed card (missing from GitHub data). */
const BASE_SET: SetRef = {
  id: "base1",
  name: "Base Set",
  series: "Base",
  printedTotal: 102,
  total: 102,
  releaseDate: "1999/01/09",
  updatedAt: "2022/10/10 15:12:00",
  images: {
    symbol: "https://images.pokemontcg.io/base1/symbol.png",
    logo: "https://images.pokemontcg.io/base1/logo.png",
  },
};

/** Build a tcgplayer price object from our static price data. */
function buildTcgPlayer(name: string): TcgPlayer | undefined {
  const entry = priceMap[name.toLowerCase()];
  if (!entry) return undefined;
  const priceObj = { market: entry.market };
  return {
    url: "",
    updatedAt: "2026/02/13",
    prices: entry.variant === "holofoil"
      ? { holofoil: priceObj }
      : { normal: priceObj },
  };
}

/** Enrich seed cards with the `set` field and static prices. */
function enrichSeedCards(): Card[] {
  return (seedCards as unknown as Card[]).map((c) => ({
    ...c,
    set: (c as unknown as Record<string, unknown>).set
      ? (c.set as SetRef)
      : BASE_SET,
    tcgplayer: buildTcgPlayer(c.name as string),
  }));
}

let cards: Card[] = enrichSeedCards();
let hasApiData = false;

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (apiKey) (headers as Record<string, string>)["X-Api-Key"] = apiKey;
  return headers;
}

/** Try to refresh from the live API (for prices). Fire-and-forget. */
function refreshFromApi() {
  if (hasApiData) return; // Already refreshed.
  const url = `${API_BASE}/cards?q=set.id:base1&pageSize=250`;
  fetch(url, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  })
    .then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        cards = data.data as Card[];
        hasApiData = true;
        console.log(
          `[cards cache] Refreshed ${cards.length} cards from API (with prices)`,
        );
      }
    })
    .catch(() => {
      console.log("[cards cache] API refresh failed, using static data");
    });
}

// Kick off background refresh on server start.
refreshFromApi();

export function getBaseSetCards(): Card[] {
  return cards;
}

/**
 * Filter and paginate cached cards.  All logic runs in-memory.
 */
export function queryCards(
  allCards: Card[],
  opts: {
    name?: string;
    type?: string;
    rarity?: string;
    page: number;
    pageSize: number;
    select?: string;
  },
) {
  let filtered = allCards;

  if (opts.name) {
    const lower = opts.name.toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(lower));
  }
  if (opts.type) {
    const t = opts.type;
    filtered = filtered.filter((c) => c.types?.includes(t));
  }
  if (opts.rarity) {
    const r = opts.rarity;
    filtered = filtered.filter((c) => c.rarity === r);
  }

  const totalCount = filtered.length;
  const start = (opts.page - 1) * opts.pageSize;
  const paged = filtered.slice(start, start + opts.pageSize);

  const data = opts.select ? selectFields(paged, opts.select) : paged;

  return {
    data,
    page: opts.page,
    pageSize: opts.pageSize,
    count: data.length,
    totalCount,
  };
}

function selectFields(cards: Card[], select: string): Card[] {
  const fields = new Set(select.split(",").map((f) => f.trim()));
  return cards.map((card) => {
    const picked: Record<string, unknown> = {};
    for (const key of fields) {
      if (key in card) {
        picked[key] = (card as unknown as Record<string, unknown>)[key];
      }
    }
    return picked as unknown as Card;
  });
}
