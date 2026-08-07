import { describe, expect, it } from "vitest";
import { validateExternalUrl, validateRedirectUrl } from "../src/security";

describe("validateExternalUrl", () => {
  it("accepts normalized https public URLs", () => {
    expect(validateExternalUrl("https://Example.com/a/?utm_source=x#frag")).toEqual({
      ok: true,
      url: "https://example.com/a"
    });
  });

  it("rejects unsupported schemes, credentials and private targets", () => {
    expect(validateExternalUrl("http://example.com").ok).toBe(false);
    expect(validateExternalUrl("https://user:pass@example.com").ok).toBe(false);
    expect(validateExternalUrl("https://localhost/a").ok).toBe(false);
    expect(validateExternalUrl("https://127.0.0.1/a").ok).toBe(false);
    expect(validateExternalUrl("https://192.168.1.10/a").ok).toBe(false);
    expect(validateExternalUrl("file:///etc/passwd").ok).toBe(false);
  });

  it("validates redirects with the same policy", () => {
    expect(() => validateRedirectUrl("https://10.0.0.1/a")).toThrow();
  });
});
