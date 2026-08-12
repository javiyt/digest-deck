import { describe, expect, it, vi } from "vitest";
import { extractUrls } from "../lib/extractorClient";

describe("extractUrls", () => {
  it("filters duplicates and invalid URLs while keeping successful partial results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string) as { urls: string[] };
        return Promise.resolve(new Response(
          JSON.stringify({
            articles: [
              {
                requestedUrl: body.urls[0],
                canonicalUrl: "https://example.com/new",
                normalizedUrl: "https://example.com/new",
                title: "New"
              }
            ],
            errors: []
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        ));
      })
    );

    const result = await extractUrls(
      ["https://example.com/existing?utm_source=x", "not-a-url", "https://example.com/new"],
      new Set(["https://example.com/existing"])
    );

    expect(result.articles).toHaveLength(1);
    expect(result.duplicates).toEqual(["https://example.com/existing?utm_source=x"]);
    expect(result.invalid).toEqual(["not-a-url"]);
  });

  it("turns worker failures into per-url errors", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("nope", { status: 500 }))));
    const result = await extractUrls(["https://example.com/a"], new Set());
    expect(result.errors[0]).toMatchObject({ requestedUrl: "https://example.com/a", code: "worker_error" });
  });

  it("handles thrown non-error values and deduplicates returned canonical URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce("offline")
        .mockResolvedValueOnce(new Response(
          JSON.stringify({
            articles: [
              {
                requestedUrl: "https://example.com/b",
                canonicalUrl: "https://example.com/existing?utm_medium=email",
                normalizedUrl: "https://example.com/existing",
                title: "Duplicate"
              }
            ],
            errors: []
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        ))
    );

    const result = await extractUrls(["https://example.com/a", "https://example.com/b"], new Set(["https://example.com/existing"]));

    expect(result.articles).toHaveLength(0);
    expect(result.duplicates).toEqual(["https://example.com/b"]);
    expect(result.errors[0]).toMatchObject({
      requestedUrl: "https://example.com/a",
      code: "worker_error",
      message: "Error del Worker."
    });
  });
});
