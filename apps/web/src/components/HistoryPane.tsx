import type { JSX } from "react";
import type { Newsletter } from "@digest-deck/shared";
import { CopyPlus, Eye, Trash2 } from "lucide-react";

interface Props {
  newsletters: Newsletter[];
  onOpen: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function HistoryPane({ newsletters, onOpen, onDuplicate, onDelete }: Props): JSX.Element {
  if (newsletters.length === 0) {
    return <div className="p-4 text-sm text-slate-500">No previous newsletters.</div>;
  }
  return (
    <div className="space-y-2 p-4">
      {newsletters.map((newsletter) => (
        <div key={newsletter.id} className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{newsletter.subject || newsletter.title || "Untitled"}</p>
              <p className="text-xs text-slate-500">
                {new Date(newsletter.updatedAt).toLocaleString()} · {newsletter.articles.length} articles
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button className="h-8 w-8 rounded border border-slate-300" type="button" title="Open" onClick={() => void onOpen(newsletter.id)}>
                <Eye className="mx-auto" size={15} />
              </button>
              <button className="h-8 w-8 rounded border border-slate-300" type="button" title="Duplicate" onClick={() => void onDuplicate(newsletter.id)}>
                <CopyPlus className="mx-auto" size={15} />
              </button>
              <button className="h-8 w-8 rounded border border-red-200 text-red-700" type="button" title="Delete" onClick={() => void onDelete(newsletter.id)}>
                <Trash2 className="mx-auto" size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
