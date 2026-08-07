import { describe, expect, it } from "vitest";
import { normalizeUrl, parseUrlLines, sameArticleUrl } from "../src/url";

describe("normalizeUrl", () => {
  it("removes fragments, tracking params, default ports and irrelevant trailing slash", () => {
    expect(normalizeUrl("https://Example.com:443/news/?b=2&utm_source=x&a=1#comments")).toBe(
      "https://example.com/news?a=1&b=2"
    );
  });

  it("keeps deterministic non-tracking params", () => {
    expect(normalizeUrl("https://example.com/path?z=last&a=first")).toBe("https://example.com/path?a=first&z=last");
  });

  it("detects equal articles after normalization", () => {
    expect(sameArticleUrl("https://example.com/a/?utm_medium=social", "https://EXAMPLE.com/a")).toBe(true);
  });
});

describe("parseUrlLines", () => {
  it("returns valid unique URLs and individual invalid entries", () => {
    const parsed = parseUrlLines(" https://example.com/a \nnot-a-url\n\nftp://example.com/file\nhttps://example.com/a#x");
    expect(parsed.valid).toEqual(["https://example.com/a"]);
    expect(parsed.invalid).toEqual(["not-a-url", "ftp://example.com/file"]);
  });
});
