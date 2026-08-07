import { renderNewsletterEmail, type Newsletter } from "@digest-deck/shared";
import { Copy, Mail } from "lucide-react";
import { copyRichNewsletter, copyText } from "../lib/clipboard";

interface Props {
  newsletter: Newsletter;
  onFeedback: (message: string) => void;
}

export function PreviewPane({ newsletter, onFeedback }: Props): JSX.Element {
  const rendered = renderNewsletterEmail(newsletter);

  async function copyNewsletter(): Promise<void> {
    try {
      await copyRichNewsletter(rendered);
      onFeedback("Newsletter copied. You can now paste it into Gmail.");
    } catch {
      onFeedback("Could not copy HTML. Check browser permissions.");
    }
  }

  async function copySubject(): Promise<void> {
    try {
      await copyText(newsletter.subject);
      onFeedback("Subject copied.");
    } catch {
      onFeedback("Could not copy the subject.");
    }
  }

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
            <p className="truncate text-sm font-semibold">{newsletter.subject || "No subject"}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm" type="button" onClick={() => void copySubject()}>
            <Mail size={16} /> Copy subject
          </button>
        </div>
        <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void copyNewsletter()}>
          <Copy size={16} /> Copy for Gmail
        </button>
      </div>
      <div className="email-preview min-h-0 flex-1 overflow-auto p-4">
        <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
      </div>
    </aside>
  );
}
