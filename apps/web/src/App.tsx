import { useEffect, useMemo, useState } from "react";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  articleFromExtraction,
  normalizeUrl,
  restoreArticleOriginal,
  type Newsletter,
  type NewsletterArticle,
  type UrlProcessStatus
} from "@digest-deck/shared";
import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import {
  createNewNewsletter,
  db,
  deleteCurrentNewsletter,
  duplicateNewsletter,
  getActiveNewsletter,
  listArchivedNewsletters,
  openNewsletterAsActive,
  saveNewsletter
} from "./lib/db";
import { extractUrls } from "./lib/extractorClient";
import { UrlImporter } from "./components/UrlImporter";
import { SortableArticle } from "./components/SortableArticle";
import { PreviewPane } from "./components/PreviewPane";
import { HistoryPane } from "./components/HistoryPane";

type View = "editor" | "preview" | "history";

function moveArticle(articles: NewsletterArticle[], id: string, direction: -1 | 1): NewsletterArticle[] {
  const index = articles.findIndex((article) => article.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= articles.length) return articles;
  return arrayMove(articles, index, next);
}

export default function App(): JSX.Element {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [history, setHistory] = useState<Newsletter[]>([]);
  const [statuses, setStatuses] = useState<UrlProcessStatus[]>([]);
  const [feedback, setFeedback] = useState("");
  const [view, setView] = useState<View>("editor");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function refreshHistory(): Promise<void> {
    setHistory(await listArchivedNewsletters());
  }

  useEffect(() => {
    void getActiveNewsletter().then((active) => {
      setNewsletter(active);
      void refreshHistory();
    });
  }, []);

  async function persist(next: Newsletter): Promise<void> {
    const saved = await saveNewsletter(next);
    setNewsletter(saved);
  }

  function patch(partial: Partial<Newsletter>): void {
    if (!newsletter) return;
    void persist({ ...newsletter, ...partial });
  }

  async function addUrls(urls: string[]): Promise<void> {
    if (!newsletter) return;
    setStatuses(urls.map((input) => ({ input, status: "processing", message: "Processing..." })));
    const existing = new Set(newsletter.articles.map((article) => article.normalizedUrl));
    const result = await extractUrls(urls, existing);
    const articles = result.articles.map((article) => articleFromExtraction(nanoid(), article));
    const next = { ...newsletter, articles: [...newsletter.articles, ...articles] };
    await persist(next);
    setStatuses([
      ...articles.map((article) => ({ input: article.requestedUrl, status: "success" as const, message: "Added" })),
      ...result.duplicates.map((input) => ({ input, status: "duplicate" as const, message: "This article is already in the newsletter." })),
      ...result.invalid.map((input) => ({ input, status: "invalid" as const, message: "Invalid URL" })),
      ...result.errors.map((error) => ({ input: error.requestedUrl, status: "error" as const, message: error.message }))
    ]);
    setFeedback(articles.length > 0 ? "Articles added." : "No new articles were added.");
  }

  function updateArticle(article: NewsletterArticle): void {
    if (!newsletter) return;
    const normalizedUrl = normalizeUrl(article.canonicalUrl);
    void persist({
      ...newsletter,
      articles: newsletter.articles.map((item) => (item.id === article.id ? { ...article, normalizedUrl } : item))
    });
  }

  function handleDragEnd(event: DragEndEvent): void {
    if (!newsletter || !event.over || event.active.id === event.over.id) return;
    const oldIndex = newsletter.articles.findIndex((article) => article.id === event.active.id);
    const newIndex = newsletter.articles.findIndex((article) => article.id === event.over?.id);
    void persist({ ...newsletter, articles: arrayMove(newsletter.articles, oldIndex, newIndex) });
  }

  async function startNew(): Promise<void> {
    if (!newsletter) return;
    if (!window.confirm("Start a new newsletter?")) return;
    const fresh = await createNewNewsletter(newsletter);
    setNewsletter(fresh);
    await refreshHistory();
  }

  async function deleteDraft(): Promise<void> {
    if (!newsletter || !window.confirm("Delete the current newsletter?")) return;
    setNewsletter(await deleteCurrentNewsletter(newsletter));
    await refreshHistory();
  }

  async function deleteArchived(id: string): Promise<void> {
    if (!window.confirm("Delete archived newsletter?")) return;
    await db.newsletters.delete(id);
    await refreshHistory();
  }

  const ids = useMemo(() => newsletter?.articles.map((article) => article.id) ?? [], [newsletter]);

  if (!newsletter) {
    return <div className="p-8 text-sm text-slate-600">Loading DigestDeck...</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-xl font-bold">DigestDeck</h1>
          <p className="text-xs text-slate-500">Local editor for newsletters prepared from links</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => void startNew()}>
            <Plus size={16} /> + New newsletter
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700" type="button" onClick={() => void deleteDraft()}>
            <Trash2 size={16} /> Delete current newsletter
          </button>
        </div>
      </header>

      {feedback ? <div className="border-b border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-900">{feedback}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,42vw)]">
        <main className="min-h-0 overflow-auto">
          <section className="border-b border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Email subject
                <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" value={newsletter.subject} onChange={(event) => patch({ subject: event.target.value })} />
              </label>
              <label className="text-sm font-semibold">
                Title
                <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" value={newsletter.title} onChange={(event) => patch({ title: event.target.value })} />
              </label>
            </div>
            <label className="mt-3 block text-sm font-semibold">
              Introduction
              <textarea className="mt-1 min-h-20 w-full rounded border border-slate-300 px-3 py-2 font-normal" value={newsletter.intro ?? ""} onChange={(event) => patch({ intro: event.target.value })} />
            </label>
            <div className="mt-3 flex gap-1 lg:hidden">
              {(["editor", "preview", "history"] as View[]).map((item) => (
                <button key={item} className={`rounded px-3 py-2 text-sm ${view === item ? "bg-slate-900 text-white" : "bg-slate-100"}`} type="button" onClick={() => setView(item)}>
                  {item}
                </button>
              ))}
            </div>
          </section>
          {(view === "editor" || window.innerWidth >= 1024) && <UrlImporter statuses={statuses} onSubmit={addUrls} />}
          {(view === "history" || window.innerWidth >= 1024) && <HistoryPane newsletters={history} onOpen={async (id) => { setNewsletter(await openNewsletterAsActive(id)); await refreshHistory(); }} onDuplicate={async (id) => { setNewsletter(await duplicateNewsletter(id)); await refreshHistory(); }} onDelete={deleteArchived} />}
          {(view === "editor" || window.innerWidth >= 1024) ? (
            <section className="space-y-3 p-4">
              {newsletter.articles.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Paste links to start the newsletter.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {newsletter.articles.map((article, index) => (
                        <SortableArticle
                          key={article.id}
                          article={article}
                          index={index}
                          total={newsletter.articles.length}
                          onChange={updateArticle}
                          onDelete={() => void persist({ ...newsletter, articles: newsletter.articles.filter((item) => item.id !== article.id) })}
                          onRestore={() => updateArticle(restoreArticleOriginal(article))}
                          onMove={(direction) => void persist({ ...newsletter, articles: moveArticle(newsletter.articles, article.id, direction) })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          ) : null}
        </main>
        {(view === "preview" || window.innerWidth >= 1024) && <PreviewPane newsletter={newsletter} onFeedback={setFeedback} />}
      </div>
    </div>
  );
}
