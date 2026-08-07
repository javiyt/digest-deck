import { normalizeUrl } from "@digest-deck/shared";

export const MAX_URLS_PER_REQUEST = 10;
export const MAX_HTML_BYTES = 1_000_000;

const PRIVATE_V4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

function isIpv4(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  if (isIpv4(host) && PRIVATE_V4_RANGES.some((range) => range.test(host))) return true;
  return false;
}

export function validateExternalUrl(input: string): { ok: true; url: string } | { ok: false; message: string } {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, message: "Invalid URL." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, message: "Only HTTPS URLs are accepted." };
  }
  if (url.username || url.password) {
    return { ok: false, message: "URLs with embedded credentials are not accepted." };
  }
  if (isPrivateHostname(url.hostname)) {
    return { ok: false, message: "URL blocked by SSRF policy." };
  }

  return { ok: true, url: normalizeUrl(url.toString()) };
}

export function validateRedirectUrl(input: string): string {
  const validation = validateExternalUrl(input);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  return validation.url;
}
