import type { RenderedNewsletter } from "@digest-deck/shared";

export async function copyRichNewsletter(rendered: RenderedNewsletter): Promise<void> {
  if ("ClipboardItem" in window && navigator.clipboard.write) {
    const item = new ClipboardItem({
      "text/html": new Blob([rendered.html], { type: "text/html" }),
      "text/plain": new Blob([rendered.plainText], { type: "text/plain" })
    });
    await navigator.clipboard.write([item]);
    return;
  }
  await navigator.clipboard.writeText(rendered.plainText);
}

export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}
