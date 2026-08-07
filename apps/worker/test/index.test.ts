import { describe, expect, it, vi } from "vitest";
import { extractResponseSchema } from "@digest-deck/shared";
import worker from "../src/index";

describe("worker handler", () => {
  it("extracts metadata and returns CORS headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        const response = new Response("<title>Remote title</title>", { headers: { "content-type": "text/html" } });
        Object.defineProperty(response, "url", { value: "https://example.com/a" });
        return Promise.resolve(response);
      })
    );
    const request = new Request("https://worker.test/api/extract", {
      method: "POST",
      headers: { Origin: "http://localhost:5173", "Content-Type": "application/json" },
      body: JSON.stringify({ urls: ["https://example.com/a"] })
    });
    const response = await worker.fetch(request, { ALLOWED_ORIGIN: "https://user.github.io" });
    const rawBody: unknown = await response.json();
    const body = extractResponseSchema.parse(rawBody);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    expect(body.articles[0]?.title).toBe("Remote title");
    expect(body.errors).toHaveLength(0);
  });

  it("supports invalid payloads, options and not found", async () => {
    const options = await worker.fetch(new Request("https://worker.test/api/extract", { method: "OPTIONS" }), {});
    expect(options.status).toBe(204);
    const invalid = await worker.fetch(new Request("https://worker.test/api/extract", { method: "POST", body: "{bad" }), {});
    expect(invalid.status).toBe(400);
    const missing = await worker.fetch(new Request("https://worker.test/nope"), {});
    expect(missing.status).toBe(404);
  });
});
