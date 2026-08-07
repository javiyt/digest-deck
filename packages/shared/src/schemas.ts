import { z } from "zod";

export const extractedArticleSchema = z.object({
  requestedUrl: z.string().url(),
  canonicalUrl: z.string().url(),
  normalizedUrl: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  image: z.string().url().optional(),
  siteName: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional()
});

export const extractErrorSchema = z.object({
  requestedUrl: z.string(),
  code: z.enum(["invalid_url", "blocked_url", "timeout", "fetch_failed", "too_large", "worker_error"]),
  message: z.string()
});

export const extractRequestSchema = z.object({
  urls: z.array(z.string()).min(1).max(10)
});

export const extractResponseSchema = z.object({
  articles: z.array(extractedArticleSchema),
  errors: z.array(extractErrorSchema)
});

export const newsletterArticleSchema = z.object({
  id: z.string(),
  requestedUrl: z.string().url(),
  canonicalUrl: z.string().url(),
  normalizedUrl: z.string().url(),
  title: z.string(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  source: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
  original: extractedArticleSchema
});

export const newsletterSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().optional(),
  isActive: z.boolean(),
  subject: z.string(),
  title: z.string(),
  intro: z.string().optional(),
  articles: z.array(newsletterArticleSchema)
});
