import { NextRequest, NextResponse } from "next/server";
import { getBaseSetCards } from "../cache";

/**
 * GET /api/cards/:id
 * Returns a single card from the in-memory Base Set cache.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const allCards = await getBaseSetCards();
    const card = allCards.find((c) => c.id === id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return NextResponse.json({ data: card });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load card";
    console.error("Card API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
