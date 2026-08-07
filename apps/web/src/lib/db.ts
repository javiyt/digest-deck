import Dexie, { type Table } from "dexie";
import { createEmptyNewsletter, isNewsletterEmpty, type Newsletter } from "@digest-deck/shared";
import { nanoid } from "nanoid";

export interface UiPreference {
  key: string;
  value: string;
}

export class DigestDeckDatabase extends Dexie {
  newsletters!: Table<Newsletter, string>;
  preferences!: Table<UiPreference, string>;

  constructor(name = "digestDeck") {
    super(name);
    this.version(1).stores({
      newsletters: "id, updatedAt, archivedAt",
      preferences: "key"
    });
  }
}

export const db = new DigestDeckDatabase();

const ACTIVE_KEY = "activeNewsletterId";

export async function getActiveNewsletter(database = db): Promise<Newsletter> {
  const preference = await database.preferences.get(ACTIVE_KEY);
  if (preference) {
    const existing = await database.newsletters.get(preference.value);
    if (existing) return existing;
  }
  const active = await database.newsletters.filter((newsletter) => newsletter.isActive).first();
  if (active) {
    await database.preferences.put({ key: ACTIVE_KEY, value: active.id });
    return active;
  }
  const fresh = createEmptyNewsletter(nanoid());
  await database.transaction("rw", database.newsletters, database.preferences, async () => {
    await database.newsletters.put(fresh);
    await database.preferences.put({ key: ACTIVE_KEY, value: fresh.id });
  });
  return fresh;
}

export async function saveNewsletter(newsletter: Newsletter, database = db): Promise<Newsletter> {
  const updated = { ...newsletter, updatedAt: new Date().toISOString() };
  await database.newsletters.put(updated);
  return updated;
}

export async function createNewNewsletter(current: Newsletter, database = db): Promise<Newsletter> {
  const fresh = createEmptyNewsletter(nanoid());
  const now = new Date().toISOString();
  await database.transaction("rw", database.newsletters, database.preferences, async () => {
    if (!isNewsletterEmpty(current)) {
      await database.newsletters.put({ ...current, isActive: false, archivedAt: now, updatedAt: now });
    } else {
      await database.newsletters.delete(current.id);
    }
    await database.newsletters.put(fresh);
    await database.preferences.put({ key: ACTIVE_KEY, value: fresh.id });
  });
  return fresh;
}

export async function deleteCurrentNewsletter(current: Newsletter, database = db): Promise<Newsletter> {
  const fresh = createEmptyNewsletter(nanoid());
  await database.transaction("rw", database.newsletters, database.preferences, async () => {
    await database.newsletters.delete(current.id);
    await database.newsletters.put(fresh);
    await database.preferences.put({ key: ACTIVE_KEY, value: fresh.id });
  });
  return fresh;
}

export async function listArchivedNewsletters(database = db): Promise<Newsletter[]> {
  const archived = await database.newsletters.filter((newsletter) => !newsletter.isActive).toArray();
  return archived.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function openNewsletterAsActive(id: string, database = db): Promise<Newsletter> {
  const selected = await database.newsletters.get(id);
  if (!selected) throw new Error("Newsletter no encontrada.");
  await database.transaction("rw", database.newsletters, database.preferences, async () => {
    const active = await database.newsletters.filter((newsletter) => newsletter.isActive).toArray();
    await Promise.all(active.map((item) => database.newsletters.put({ ...item, isActive: false, archivedAt: new Date().toISOString() })));
    const opened = { ...selected, isActive: true, archivedAt: undefined, updatedAt: new Date().toISOString() };
    await database.newsletters.put(opened);
    await database.preferences.put({ key: ACTIVE_KEY, value: opened.id });
  });
  return (await database.newsletters.get(id)) as Newsletter;
}

export async function duplicateNewsletter(id: string, database = db): Promise<Newsletter> {
  const source = await database.newsletters.get(id);
  if (!source) throw new Error("Newsletter no encontrada.");
  const now = new Date().toISOString();
  const copy: Newsletter = {
    ...source,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    archivedAt: undefined,
    isActive: true,
    articles: source.articles.map((article) => ({ ...article, id: nanoid() }))
  };
  await database.transaction("rw", database.newsletters, database.preferences, async () => {
    const active = await database.newsletters.filter((newsletter) => newsletter.isActive).toArray();
    await Promise.all(active.map((item) => database.newsletters.put({ ...item, isActive: false, archivedAt: now })));
    await database.newsletters.put(copy);
    await database.preferences.put({ key: ACTIVE_KEY, value: copy.id });
  });
  return copy;
}
