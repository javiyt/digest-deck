import { afterEach, describe, expect, it, vi } from "vitest";
import { copyRichNewsletter, copyText } from "../lib/clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clipboard helpers", () => {
  it("copies html and plain text when ClipboardItem is available", async () => {
    const write = vi.fn(() => Promise.resolve());
    class ClipboardItemMock {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal("window", { ClipboardItem: ClipboardItemMock });
    vi.stubGlobal("ClipboardItem", ClipboardItemMock);
    vi.stubGlobal("navigator", { clipboard: { write, writeText: vi.fn() } });
    await copyRichNewsletter({ html: "<b>Hi</b>", plainText: "Hi" });
    expect(write).toHaveBeenCalledOnce();
  });

  it("falls back to text and copies subjects", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyRichNewsletter({ html: "<b>Hi</b>", plainText: "Hi" });
    await copyText("Subject");
    expect(writeText).toHaveBeenNthCalledWith(1, "Hi");
    expect(writeText).toHaveBeenNthCalledWith(2, "Subject");
  });
});
