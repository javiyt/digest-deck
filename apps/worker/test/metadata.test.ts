import { describe, expect, it } from "vitest";
import { extractMetadata } from "../src/metadata";

describe("extractMetadata", () => {
  it("prefers NewsArticle JSON-LD and resolves relative canonical and image", () => {
    const html = `
      <link rel="canonical" href="/canonical">
      <meta property="og:title" content="OG title">
      <script type="application/ld+json">
      {"@type":"NewsArticle","headline":"JSON title","description":"JSON description","image":{"url":"/img.jpg"},"publisher":{"name":"Daily"},"author":[{"name":"Ada"},{"name":"Grace"}],"datePublished":"2026-08-07T09:00:00Z"}
      </script>`;
    const article = extractMetadata({ requestedUrl: "https://site.test/a", finalUrl: "https://site.test/a", html });
    expect(article.title).toBe("JSON title");
    expect(article.description).toBe("JSON description");
    expect(article.image).toBe("https://site.test/img.jpg");
    expect(article.canonicalUrl).toBe("https://site.test/canonical");
    expect(article.author).toBe("Ada, Grace");
  });

  it("falls back through OpenGraph, Twitter, h1 and title", () => {
    expect(
      extractMetadata({
        requestedUrl: "https://site.test/a",
        finalUrl: "https://site.test/a",
        html: `<meta property="og:title" content="OG"><meta name="description" content="Meta desc"><meta property="og:site_name" content="Site">`
      })
    ).toMatchObject({ title: "OG", description: "Meta desc", siteName: "Site" });
    expect(
      extractMetadata({ requestedUrl: "https://site.test/b", finalUrl: "https://site.test/b", html: "<h1>Heading</h1>" }).title
    ).toBe("Heading");
    expect(
      extractMetadata({ requestedUrl: "https://site.test/c", finalUrl: "https://site.test/c", html: "<title>Document title</title>" }).title
    ).toBe("Document title");
  });

  it("ignores malformed JSON-LD and still creates minimum metadata", () => {
    const article = extractMetadata({
      requestedUrl: "https://site.test/a",
      finalUrl: "https://site.test/a",
      html: `<script type="application/ld+json">{bad</script><p>This paragraph is long enough to become a reasonable fallback excerpt for the card.</p>`
    });
    expect(article.title).toBe("https://site.test/a");
    expect(article.description).toContain("reasonable fallback");
  });
});
