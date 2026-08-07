export type IsoDateString = string;

export interface ExtractedArticle {
  requestedUrl: string;
  canonicalUrl: string;
  normalizedUrl: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  author?: string;
  publishedAt?: string;
}

export interface ExtractError {
  requestedUrl: string;
  code: "invalid_url" | "blocked_url" | "timeout" | "fetch_failed" | "too_large" | "worker_error";
  message: string;
}

export interface ExtractRequest {
  urls: string[];
}

export interface ExtractResponse {
  articles: ExtractedArticle[];
  errors: ExtractError[];
}

export interface NewsletterArticle {
  id: string;
  requestedUrl: string;
  canonicalUrl: string;
  normalizedUrl: string;
  title: string;
  description?: string;
  image?: string;
  source?: string;
  author?: string;
  publishedAt?: string;
  original: ExtractedArticle;
}

export interface Newsletter {
  id: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  archivedAt?: IsoDateString;
  isActive: boolean;
  subject: string;
  title: string;
  intro?: string;
  articles: NewsletterArticle[];
}

export interface UrlProcessStatus {
  input: string;
  normalizedUrl?: string;
  status: "pending" | "processing" | "success" | "duplicate" | "invalid" | "error";
  message?: string;
}
