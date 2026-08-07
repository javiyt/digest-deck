import { describe, expect, it } from "vitest";
import { extractRequestSchema, extractResponseSchema, newsletterSchema } from "../src/schemas";

describe("shared schemas", () => {
  it("validates extractor contracts", () => {
    expect(extractRequestSchema.safeParse({ urls: ["https://example.com"] }).success).toBe(true);
    expect(extractRequestSchema.safeParse({ urls: [] }).success).toBe(false);
    expect(
      extractResponseSchema.safeParse({
        articles: [
          {
            requestedUrl: "https://example.com/a",
            canonicalUrl: "https://example.com/a",
            normalizedUrl: "https://example.com/a",
            title: "Title"
          }
        ],
        errors: []
      }).success
    ).toBe(true);
  });

  it("validates newsletter contract", () => {
    expect(
      newsletterSchema.safeParse({
        id: "n1",
        createdAt: "2026-08-07T10:00:00Z",
        updatedAt: "2026-08-07T10:00:00Z",
        isActive: true,
        subject: "",
        title: "Title",
        articles: []
      }).success
    ).toBe(true);
  });
});
