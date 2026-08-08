import type { HTMLAttributes, JSX } from "react";
import type { NewsletterArticle } from "@digest-deck/shared";
import { clearBrokenImage } from "../lib/image";
import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Trash2, X } from "lucide-react";

interface Props {
  article: NewsletterArticle;
  index: number;
  total: number;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  onChange: (article: NewsletterArticle) => void;
  onDelete: () => void;
  onRestore: () => void;
  onMove: (direction: -1 | 1) => void;
}

function field<K extends keyof NewsletterArticle>(article: NewsletterArticle, key: K, value: string): NewsletterArticle {
  return { ...article, [key]: value || undefined };
}

export function ArticleCard({ article, index, total, dragHandleProps, onChange, onDelete, onRestore, onMove }: Props): JSX.Element {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <button
          type="button"
          className="h-9 w-9 shrink-0 rounded border border-slate-200 text-slate-500"
          aria-label="Drag article"
          title="Drag article"
          {...dragHandleProps}
        >
          <GripVertical className="mx-auto" size={18} />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          {article.image ? (
            <img
              src={article.image}
              alt=""
              className="h-36 w-full rounded-md object-cover"
              onError={clearBrokenImage}
            />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">No image</div>
          )}
          <input
            className="w-full rounded border border-slate-300 px-2 py-2 text-lg font-semibold"
            value={article.title}
            onChange={(event) => onChange(field(article, "title", event.target.value))}
            aria-label="Title"
          />
          <textarea
            className="min-h-20 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={article.description ?? ""}
            onChange={(event) => onChange(field(article, "description", event.target.value))}
            aria-label="Description"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded border border-slate-300 px-2 py-2 text-sm" value={article.source ?? ""} onChange={(event) => onChange(field(article, "source", event.target.value))} placeholder="Source" />
            <input className="rounded border border-slate-300 px-2 py-2 text-sm" value={article.author ?? ""} onChange={(event) => onChange(field(article, "author", event.target.value))} placeholder="Author" />
            <input className="rounded border border-slate-300 px-2 py-2 text-sm" value={article.publishedAt ?? ""} onChange={(event) => onChange(field(article, "publishedAt", event.target.value))} placeholder="Date" />
            <input className="rounded border border-slate-300 px-2 py-2 text-sm" value={article.image ?? ""} onChange={(event) => onChange(field(article, "image", event.target.value))} placeholder="Image URL" />
          </div>
          <input
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={article.canonicalUrl}
            onChange={(event) => onChange(field(article, "canonicalUrl", event.target.value))}
            aria-label="Link"
          />
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" type="button" onClick={onRestore}>
              <RotateCcw size={14} /> Restore original
            </button>
            <button className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" type="button" onClick={() => onMove(-1)} disabled={index === 0}>
              <ArrowUp size={14} /> Move up
            </button>
            <button className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" type="button" onClick={() => onMove(1)} disabled={index === total - 1}>
              <ArrowDown size={14} /> Move down
            </button>
            <button className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700" type="button" onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </button>
            {article.image ? (
              <button className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" type="button" onClick={() => onChange({ ...article, image: undefined })}>
                <X size={14} /> Remove image
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
