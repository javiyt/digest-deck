import type { Newsletter, NewsletterArticle } from "./types";

export interface RenderedNewsletter {
  html: string;
  plainText: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("\n", " ");
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function metaLine(article: NewsletterArticle): string {
  return [article.source, formatDate(article.publishedAt), article.author].filter(Boolean).join(" · ");
}

function renderArticle(article: NewsletterArticle): string {
  const url = escapeAttr(article.canonicalUrl);
  const image = article.image
    ? `<a href="${url}" style="text-decoration:none;"><img src="${escapeAttr(article.image)}" alt="" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:6px;margin:0 0 14px 0;" /></a>`
    : "";
  const meta = metaLine(article);
  return `
    <tr>
      <td style="padding:22px 0;border-top:1px solid #e5e7eb;">
        ${image}
        <a href="${url}" style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.25;font-weight:700;color:#111827;text-decoration:none;">${escapeHtml(article.title || article.canonicalUrl)}</a>
        ${meta ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;margin-top:8px;">${escapeHtml(meta)}</div>` : ""}
        ${article.description ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin:10px 0 0 0;">${escapeHtml(article.description)}</p>` : ""}
        <p style="margin:12px 0 0 0;"><a href="${url}" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;color:#0f766e;text-decoration:none;font-weight:700;">Read article &rarr;</a></p>
      </td>
    </tr>`;
}

export function renderNewsletterEmail(newsletter: Newsletter): RenderedNewsletter {
  const title = newsletter.title.trim() || "Newsletter";
  const intro = newsletter.intro?.trim();
  const articleRows = newsletter.articles.map(renderArticle).join("");
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border-collapse:collapse;">
            <tr>
              <td style="padding:28px 28px 4px 28px;">
                <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:1.15;color:#111827;margin:0;">${escapeHtml(title)}</h1>
                ${intro ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;margin:14px 0 0 0;">${escapeHtml(intro)}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 22px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  ${articleRows}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const plainText = [
    title,
    intro,
    ...newsletter.articles.flatMap((article) => [
      article.title || article.canonicalUrl,
      metaLine(article),
      article.description,
      article.canonicalUrl
    ])
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, plainText };
}
