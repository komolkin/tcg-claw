import { NextResponse } from "next/server";

/**
 * GET /api/sets
 * Returns only the Base Set for now (all data is static).
 */
export async function GET() {
  return NextResponse.json({
    data: [
      {
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
      },
    ],
  });
}
