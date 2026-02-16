import { NextResponse } from "next/server";
import type { Slab } from "@/lib/types";

const SLAB_API_BASE = "https://api.slab.cash";
const FETCH_TIMEOUT_MS = 30_000;
const PAGE_LIMIT = 200;

interface SlabPage {
  slabs: Slab[];
  hasMore: boolean;
  nextCursor?: string | null;
}

/**
 * Fetches all unpulled slabs for the configured machine (paginated).
 * Falls back to the big-hitters endpoint first; if it errors,
 * uses the unpulled endpoint which returns the same pool of cards.
 */
async function fetchAllSlabs(
  machineId: string,
  apiKey: string,
): Promise<Slab[]> {
  const headers = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };

  // Try big-hitters first
  try {
    const bhUrl = `${SLAB_API_BASE}/machines/${encodeURIComponent(machineId)}/slabs/big-hitters`;
    const bhRes = await fetch(bhUrl, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (bhRes.ok) {
      const data = (await bhRes.json()) as SlabPage;
      if (data.slabs?.length > 0) return data.slabs;
    }
  } catch {
    // big-hitters unavailable — fall through to unpulled
  }

  // Fallback: paginate through unpulled slabs
  const all: Slab[] = [];
  let cursor: string | null | undefined = undefined;

  do {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);

    const url = `${SLAB_API_BASE}/machines/${encodeURIComponent(machineId)}/slabs/unpulled?${params}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Slab API returned ${res.status}: ${text}`);
    }

    const page = (await res.json()) as SlabPage;
    all.push(...(page.slabs ?? []));
    cursor = page.hasMore ? page.nextCursor : null;
  } while (cursor);

  return all;
}

export async function GET() {
  const machineId = process.env.SLAB_MACHINE_ID;
  const apiKey = process.env.SLAB_API_KEY;

  if (!machineId) {
    return NextResponse.json(
      { error: "SLAB_MACHINE_ID is not configured" },
      { status: 500 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "SLAB_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const slabs = await fetchAllSlabs(machineId, apiKey);
    return NextResponse.json(
      { slabs },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("[slabs/big-hitters] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch slabs from upstream API" },
      { status: 502 },
    );
  }
}
