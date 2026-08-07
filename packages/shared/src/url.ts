const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid"
]);

export function normalizeUrl(input: string): string {
  const url = new URL(input.trim());
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
    .sort(([aKey, aValue], [bKey, bValue]) => `${aKey}=${aValue}`.localeCompare(`${bKey}=${bValue}`));

  url.search = "";
  for (const [key, value] of kept) {
    url.searchParams.append(key, value);
  }

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function parseUrlLines(input: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const line of input.split(/\r?\n/)) {
    const value = line.trim();
    if (!value) continue;
    try {
      const normalized = normalizeUrl(value);
      const protocol = new URL(normalized).protocol;
      if (protocol !== "https:" && protocol !== "http:") {
        invalid.push(value);
        continue;
      }
      if (!seen.has(normalized)) {
        valid.push(value);
        seen.add(normalized);
      }
    } catch {
      invalid.push(value);
    }
  }

  return { valid, invalid };
}

export function sameArticleUrl(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}
