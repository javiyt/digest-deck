import { useState, type JSX } from "react";
import { parseUrlLines, type UrlProcessStatus } from "@digest-deck/shared";
import { Link, Loader2 } from "lucide-react";

interface Props {
  statuses: UrlProcessStatus[];
  onSubmit: (urls: string[]) => Promise<void>;
}

export function UrlImporter({ statuses, onSubmit }: Props): JSX.Element {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    const parsed = parseUrlLines(value);
    if (parsed.valid.length === 0) return;
    setBusy(true);
    try {
      await onSubmit(parsed.valid);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-b border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Link size={16} />
        Add links
      </div>
      <textarea
        className="mt-3 min-h-28 w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 text-sm outline-none focus:border-teal-700 focus:bg-white"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://example.com/article-1&#10;https://example.org/news/article-2"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Empty lines and non-URL entries are ignored.</p>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
          Add articles
        </button>
      </div>
      {statuses.length > 0 ? (
        <div className="mt-3 space-y-1 text-xs">
          {statuses.map((status) => (
            <div key={`${status.input}-${status.status}`} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-2 py-1">
              <span className="truncate">{status.input}</span>
              <span
                className={
                  status.status === "success"
                    ? "text-teal-700"
                    : status.status === "error" || status.status === "invalid"
                      ? "text-red-700"
                      : "text-amber-700"
                }
              >
                {status.message ?? status.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
