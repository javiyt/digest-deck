import { normalizeUrl, type ExtractedArticle } from "@digest-deck/shared";

interface MetadataInput {
  requestedUrl: string;
  finalUrl: string;
  html: string;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = pattern.exec(tag);
  const value = match?.[2] ?? match?.[3] ?? match?.[4];
  return value ? decodeEntities(value) : undefined;
}

function metaContent(html: string, key: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = attr(tag, "property")?.toLowerCase();
    const name = attr(tag, "name")?.toLowerCase();
    if (property === key.toLowerCase() || name === key.toLowerCase()) {
      const content = attr(tag, "content");
      if (content) return content;
    }
  }
  return undefined;
}

function linkHref(html: string, rel: string): string | undefined {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const relValue = attr(tag, "rel")?.toLowerCase();
    if (relValue?.split(/\s+/).includes(rel.toLowerCase())) {
      return attr(tag, "href");
    }
  }
  return undefined;
}

function tagText(html: string, tagName: string): string | undefined {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(html);
  if (!match?.[1]) return undefined;
  return decodeEntities(match[1].replace(/<[^>]+>/g, " "));
}

function firstParagraph(html: string): string | undefined {
  const match = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  if (!match?.[1]) return undefined;
  const text = decodeEntities(match[1].replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " "));
  return text.length > 30 ? text.slice(0, 260) : undefined;
}

function resolveUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

function parseJsonLd(html: string): JsonValue[] {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const values: JsonValue[] = [];
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(body) as JsonValue;
      values.push(parsed);
    } catch {
      continue;
    }
  }
  return values;
}

function flattenJsonLd(values: JsonValue[]): Record<string, JsonValue>[] {
  const out: Record<string, JsonValue>[] = [];
  const visit = (value: JsonValue): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      out.push(value);
      const graph = value["@graph"];
      if (Array.isArray(graph)) graph.forEach(visit);
    }
  };
  values.forEach(visit);
  return out;
}

function jsonString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? decodeEntities(value) : undefined;
}

function jsonName(value: JsonValue | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return decodeEntities(value);
  if (Array.isArray(value)) return value.map(jsonName).filter(Boolean).join(", ") || undefined;
  if (typeof value === "object") return jsonString(value.name) ?? jsonString(value.headline);
  return undefined;
}

function jsonImage(value: JsonValue | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = jsonImage(item);
      if (image) return image;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) return jsonString(value.url) ?? jsonString(value.contentUrl);
  return undefined;
}

function findArticleJsonLd(html: string): Record<string, JsonValue> | undefined {
  const nodes = flattenJsonLd(parseJsonLd(html));
  return nodes.find((node) => {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some((item) => typeof item === "string" && /^(NewsArticle|Article|BlogPosting)$/i.test(item));
  });
}

function siteFromHostname(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  return hostname
    .split(".")
    .slice(0, -1)
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function extractMetadata({ requestedUrl, finalUrl, html }: MetadataInput): ExtractedArticle {
  const jsonLd = findArticleJsonLd(html);
  const canonicalUrl = resolveUrl(linkHref(html, "canonical"), finalUrl) ?? finalUrl;
  const title =
    jsonString(jsonLd?.headline) ??
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title") ??
    tagText(html, "h1") ??
    tagText(html, "title") ??
    canonicalUrl;
  const description =
    jsonString(jsonLd?.description) ??
    metaContent(html, "og:description") ??
    metaContent(html, "description") ??
    metaContent(html, "twitter:description") ??
    firstParagraph(html);
  const image = resolveUrl(jsonImage(jsonLd?.image) ?? metaContent(html, "og:image") ?? metaContent(html, "twitter:image"), finalUrl);
  const publisher = jsonLd?.publisher && typeof jsonLd.publisher === "object" && !Array.isArray(jsonLd.publisher) ? jsonLd.publisher : undefined;
  const siteName = metaContent(html, "og:site_name") ?? jsonName(publisher) ?? siteFromHostname(canonicalUrl);
  const author = jsonName(jsonLd?.author) ?? metaContent(html, "author") ?? metaContent(html, "article:author");
  const publishedAt =
    jsonString(jsonLd?.datePublished) ??
    metaContent(html, "article:published_time") ??
    metaContent(html, "date") ??
    metaContent(html, "pubdate");

  return {
    requestedUrl,
    canonicalUrl,
    normalizedUrl: normalizeUrl(canonicalUrl),
    title,
    description,
    image,
    siteName,
    author,
    publishedAt
  };
}
