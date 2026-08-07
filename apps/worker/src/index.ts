import {
  extractRequestSchema,
  extractResponseSchema,
  type ExtractError,
  type ExtractResponse
} from "@digest-deck/shared";
import { extractMetadata } from "./metadata";
import { MAX_HTML_BYTES, MAX_URLS_PER_REQUEST, validateExternalUrl, validateRedirectUrl } from "./security";

export interface Env {
  ALLOWED_ORIGIN?: string;
}

const LOCAL_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const configured = env.ALLOWED_ORIGIN;
  const allowed = configured === origin || LOCAL_ORIGINS.has(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : configured ?? "http://localhost:5173",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(request: Request, env: Env, payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env)
    }
  });
}

async function fetchTextWithLimit(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 10_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "DigestDeck metadata extractor/0.1",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    const finalUrl = validateRedirectUrl(response.url);
    if (!response.ok) {
      throw new Error(`The page responded with ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("The URL did not return HTML.");
    }
    const reader = response.body?.getReader();
    if (!reader) return { html: await response.text(), finalUrl };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) {
        throw new Error("HTML demasiado grande.");
      }
      chunks.push(value);
    }
    return { html: new TextDecoder().decode(concat(chunks, size)), finalUrl };
  } finally {
    clearTimeout(timeout);
  }
}

function concat(chunks: Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function extractOne(requestedUrl: string) {
  const validation = validateExternalUrl(requestedUrl);
  if (!validation.ok) {
    return {
      error: { requestedUrl, code: "blocked_url" as const, message: validation.message }
    };
  }
  try {
    const { html, finalUrl } = await fetchTextWithLimit(validation.url);
    return { article: extractMetadata({ requestedUrl, finalUrl, html }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo extraer metadata.";
    const code: ExtractError["code"] = message.toLowerCase().includes("timeout") ? "timeout" : "fetch_failed";
    return { error: { requestedUrl, code, message } };
  }
}

async function handleExtract(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, env, { articles: [], errors: [{ requestedUrl: "", code: "worker_error", message: "Invalid JSON." }] }, 400);
  }

  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success || parsed.data.urls.length > MAX_URLS_PER_REQUEST) {
    return jsonResponse(request, env, { articles: [], errors: [{ requestedUrl: "", code: "worker_error", message: "Invalid payload." }] }, 400);
  }

  const settled = await Promise.all(parsed.data.urls.map(extractOne));
  const response: ExtractResponse = {
    articles: settled.flatMap((item) => (item.article ? [item.article] : [])),
    errors: settled.flatMap((item) => (item.error ? [item.error] : []))
  };
  return jsonResponse(request, env, extractResponseSchema.parse(response));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (url.pathname === "/api/extract" && request.method === "POST") {
      return handleExtract(request, env);
    }
    return jsonResponse(request, env, { error: "Not found" }, 404);
  }
};
