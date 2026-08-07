import { expect, it } from "vitest";
import { articleFromExtraction, createEmptyNewsletter, isNewsletterEmpty, restoreArticleOriginal } from "../src/newsletter";
import type { ExtractedArticle } from "../src/types";

const extracted: ExtractedArticle = {
  requestedUrl: "https://example.com/a",
  canonicalUrl: "https://example.com/a",
  normalizedUrl: "https://example.com/a",
  title: "Original",
  description: "Description",
  image: "https://example.com/image.jpg",
  siteName: "Example",
  author: "Ada",
  publishedAt: "2026-08-07T09:00:00Z"
};

it("creates an empty active newsletter", () => {
  const newsletter = createEmptyNewsletter("n1", new Date("2026-08-07T10:00:00Z"));
  expect(newsletter.isActive).toBe(true);
  expect(newsletter.articles).toHaveLength(0);
  expect(isNewsletterEmpty(newsletter)).toBe(true);
});

it("maps extracted metadata into editable article and restores original fields", () => {
  const article = articleFromExtraction("a1", extracted);
  const changed = { ...article, title: "Changed", image: undefined, source: "Other" };
  expect(restoreArticleOriginal(changed)).toMatchObject({
    title: "Original",
    image: "https://example.com/image.jpg",
    source: "Example"
  });
});
