import type { ExtractedArticle, Newsletter, NewsletterArticle } from "./types";

export function createEmptyNewsletter(id: string, now = new Date()): Newsletter {
  const iso = now.toISOString();
  return {
    id,
    createdAt: iso,
    updatedAt: iso,
    isActive: true,
    subject: "",
    title: "Today's news",
    intro: "",
    articles: []
  };
}

export function isNewsletterEmpty(newsletter: Newsletter): boolean {
  return (
    newsletter.subject.trim() === "" &&
    newsletter.title.trim() === "Today's news" &&
    (newsletter.intro ?? "").trim() === "" &&
    newsletter.articles.length === 0
  );
}

export function articleFromExtraction(id: string, extracted: ExtractedArticle): NewsletterArticle {
  return {
    id,
    requestedUrl: extracted.requestedUrl,
    canonicalUrl: extracted.canonicalUrl,
    normalizedUrl: extracted.normalizedUrl,
    title: extracted.title,
    description: extracted.description,
    image: extracted.image,
    source: extracted.siteName,
    author: extracted.author,
    publishedAt: extracted.publishedAt,
    original: extracted
  };
}

export function restoreArticleOriginal(article: NewsletterArticle): NewsletterArticle {
  return {
    ...article,
    requestedUrl: article.original.requestedUrl,
    canonicalUrl: article.original.canonicalUrl,
    normalizedUrl: article.original.normalizedUrl,
    title: article.original.title,
    description: article.original.description,
    image: article.original.image,
    source: article.original.siteName,
    author: article.original.author,
    publishedAt: article.original.publishedAt
  };
}
