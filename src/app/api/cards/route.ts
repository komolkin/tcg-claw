import { NextRequest, NextResponse } from "next/server";
import { getBaseSetCards, queryCards } from "./cache";

/**
 * GET /api/cards
 * Serves Base Set cards from an in-memory cache.
 * Filters (name, type, rarity), pagination, and field selection
 * are all handled server-side from the cached data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse the Lucene-like `q` param into individual filters.
  // Regex matches key:value or key:"value with spaces" tokens.
  const q = searchParams.get("q") ?? "";
  let name: string | undefined;
  let type: string | undefined;
  let rarity: string | undefined;
  const tokenRegex = /(\w[\w.]*):("([^"]*)"|(\S*))/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(q)) !== null) {
    const key = match[1];
    const value = (match[3] ?? match[4] ?? "").replace(/\*/g, "");
    if (key === "name") name = value;
    else if (key === "types") type = value;
    else if (key === "rarity") rarity = value;
    // set.id is always base1 for now, no need to parse
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    250,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20),
  );
  const select = searchParams.get("select") ?? undefined;

  try {
    const allCards = await getBaseSetCards();
    const result = queryCards(allCards, {
      name,
      type,
      rarity,
      page,
      pageSize,
      select,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "The card service is slow. Please try again in a moment."
        : err instanceof Error
          ? err.message
          : "Failed to load cards";
    console.error("Cards API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
