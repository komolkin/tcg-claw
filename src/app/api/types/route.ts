import { NextResponse } from "next/server";
import { getBaseSetCards } from "../cards/cache";

/**
 * GET /api/types
 * Returns unique types from the cached Base Set cards.
 * No external API call needed.
 */
export async function GET() {
  try {
    const cards = getBaseSetCards();
    const typesSet = new Set<string>();
    for (const card of cards) {
      if (card.types) {
        for (const t of card.types) typesSet.add(t);
      }
    }
    const data = Array.from(typesSet).sort();
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Types API error:", err);
    return NextResponse.json({ error: "Failed to get types" }, { status: 500 });
  }
}
