import { NextResponse } from "next/server";
import { getBaseSetCards } from "../cards/cache";

/**
 * GET /api/rarities
 * Returns unique rarities from the cached Base Set cards.
 * No external API call needed.
 */
export async function GET() {
  try {
    const cards = getBaseSetCards();
    const raritiesSet = new Set<string>();
    for (const card of cards) {
      if (card.rarity) raritiesSet.add(card.rarity);
    }
    const data = Array.from(raritiesSet).sort();
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Rarities API error:", err);
    return NextResponse.json(
      { error: "Failed to get rarities" },
      { status: 500 },
    );
  }
}
