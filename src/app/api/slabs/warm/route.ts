import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/slabs/warm
 *
 * Accepts a JSON body { urls: string[] } and pre-warms the Next.js image
 * optimization cache by fetching each URL through /_next/image. This runs
 * concurrently with a concurrency cap so we don't overwhelm the server.
 *
 * The client calls this in the background after the slab list loads, so
 * images are already cached by the time the user scrolls to them.
 */

const CONCURRENCY = 4;
const WARM_TIMEOUT_MS = 10_000;

async function warmOne(origin: string, src: string): Promise<void> {
  const params = new URLSearchParams({
    url: src,
    w: "256",
    q: "50",
  });
  try {
    await fetch(`${origin}/_next/image?${params}`, {
      signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
    });
  } catch {
    // Swallow — warming is best-effort
  }
}

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  let body: { urls?: string[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urls = body.urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ warmed: 0 });
  }

  // Cap to a reasonable number
  const batch = urls.slice(0, 50);

  // Process in parallel with a concurrency limit
  let idx = 0;
  const run = async () => {
    while (idx < batch.length) {
      const current = idx++;
      await warmOne(origin, batch[current]);
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, batch.length) }, run);
  await Promise.all(workers);

  return NextResponse.json({ warmed: batch.length });
}
