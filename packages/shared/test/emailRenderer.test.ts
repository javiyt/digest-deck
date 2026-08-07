import { describe, expect, it } from "vitest";
import { renderNewsletterEmail } from "../src/emailRenderer";
import type { Newsletter } from "../src/types";

const newsletter: Newsletter = {
  id: "n1",
  createdAt: "2026-08-07T10:00:00Z",
  updatedAt: "2026-08-07T10:00:00Z",
  isActive: true,
  subject: "Subject <x>",
  title: "Digest <script>",
  intro: "Intro & context",
  articles: [
    {
      id: "a1",
      requestedUrl: "https://example.com/a",
      canonicalUrl: "https://example.com/a",
      normalizedUrl: "https://example.com/a",
      title: "Title <b>",
      description: "Desc & details",
      image: "https://example.com/image.jpg",
      source: "Example",
      author: "Ada",
      publishedAt: "2026-08-07T09:00:00Z",
      original: {
        requestedUrl: "https://example.com/a",
        canonicalUrl: "https://example.com/a",
        normalizedUrl: "https://example.com/a",
        title: "Title <b>"
      }
    }
  ]
};

describe("renderNewsletterEmail", () => {
  it("uses email-safe table HTML and escapes user controlled values", () => {
    const rendered = renderNewsletterEmail(newsletter);
    expect(rendered.html).toContain("<table");
    expect(rendered.html).toContain("Digest &lt;script&gt;");
    expect(rendered.html).toContain("Title &lt;b&gt;");
    expect(rendered.html).not.toContain("Digest <script>");
    expect(rendered.html).toContain("Read article");
  });

  it("produces plain text fallback in article order", () => {
    expect(renderNewsletterEmail(newsletter).plainText).toContain("Title <b>");
  });
});
