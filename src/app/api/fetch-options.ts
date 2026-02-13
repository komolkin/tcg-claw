/**
 * Shared fetch options for Pokemon TCG API proxy routes.
 * Adds timeout so we don't hang when the external API is slow.
 */

const FETCH_TIMEOUT_MS = 60_000;

export function getExternalFetchOptions(init?: {
  revalidate?: number;
}): RequestInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (apiKey) (headers as Record<string, string>)["X-Api-Key"] = apiKey;
  return {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next:
      init?.revalidate != null ? { revalidate: init.revalidate } : undefined,
  };
}

export async function parseJsonOrError(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(text || res.statusText || "Invalid response");
  }
  try {
    return await res.json();
  } catch {
    throw new Error("Invalid JSON from API");
  }
}
