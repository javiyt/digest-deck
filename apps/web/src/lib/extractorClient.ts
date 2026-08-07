import {
  extractResponseSchema,
  normalizeUrl,
  type ExtractResponse
} from "@digest-deck/shared";

const API_URL = import.meta.env.VITE_EXTRACTOR_API_URL || "http://localhost:8787/api/extract";

export interface ExtractBatchResult extends ExtractResponse {
  duplicates: string[];
  invalid: string[];
}

async function runPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (current !== undefined) {
        results.push(await worker(current));
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export async function extractUrls(urls: string[], existingNormalizedUrls: Set<string>): Promise<ExtractBatchResult> {
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const candidates: string[] = [];

  for (const url of urls) {
    try {
      const normalized = normalizeUrl(url);
      if (existingNormalizedUrls.has(normalized)) {
        duplicates.push(url);
      } else {
        candidates.push(url);
      }
    } catch {
      invalid.push(url);
    }
  }

  const responses = await runPool(candidates, 4, async (url): Promise<ExtractResponse> => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] })
      });
      if (!response.ok) {
        return {
          articles: [],
          errors: [{ requestedUrl: url, code: "worker_error", message: `Worker respondio ${response.status}.` }]
        };
      }
      return extractResponseSchema.parse(await response.json());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error del Worker.";
      return { articles: [], errors: [{ requestedUrl: url, code: "worker_error", message }] };
    }
  });

  const articles = responses.flatMap((response) => response.articles);
  const errors = responses.flatMap((response) => response.errors);
  const seen = new Set(existingNormalizedUrls);
  const deduped = articles.filter((article) => {
    const normalized = article.normalizedUrl || normalizeUrl(article.canonicalUrl);
    if (seen.has(normalized)) {
      duplicates.push(article.requestedUrl);
      return false;
    }
    seen.add(normalized);
    return true;
  });

  return { articles: deduped, errors, duplicates, invalid };
}
