import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  DigestDeckDatabase,
  createNewNewsletter,
  deleteCurrentNewsletter,
  duplicateNewsletter,
  getActiveNewsletter,
  listArchivedNewsletters,
  openNewsletterAsActive,
  saveNewsletter
} from "../lib/db";

describe("DigestDeckDatabase repositories", () => {
  it("creates and restores active newsletter", async () => {
    const database = new DigestDeckDatabase("test-create");
    const first = await getActiveNewsletter(database);
    const saved = await saveNewsletter({ ...first, subject: "Daily" }, database);
    const restored = await getActiveNewsletter(database);
    expect(restored.id).toBe(saved.id);
    expect(restored.subject).toBe("Daily");
    database.close();
  });

  it("archives non-empty current newsletter before creating a new one", async () => {
    const database = new DigestDeckDatabase("test-archive");
    const current = await saveNewsletter({ ...(await getActiveNewsletter(database)), subject: "Filled" }, database);
    const fresh = await createNewNewsletter(current, database);
    const archived = await database.newsletters.filter((newsletter) => !newsletter.isActive).toArray();
    expect(fresh.id).not.toBe(current.id);
    expect(archived).toHaveLength(1);
    expect(archived[0]?.subject).toBe("Filled");
    database.close();
  });

  it("deletes current draft and replaces it with an empty newsletter", async () => {
    const database = new DigestDeckDatabase("test-delete");
    const current = await getActiveNewsletter(database);
    const fresh = await deleteCurrentNewsletter(current, database);
    expect(await database.newsletters.get(current.id)).toBeUndefined();
    expect((await getActiveNewsletter(database)).id).toBe(fresh.id);
    database.close();
  });

  it("replaces an empty draft without archiving it", async () => {
    const database = new DigestDeckDatabase("test-empty-new");
    const current = await getActiveNewsletter(database);
    const fresh = await createNewNewsletter(current, database);
    const archived = await listArchivedNewsletters(database);
    expect(fresh.id).not.toBe(current.id);
    expect(await database.newsletters.get(current.id)).toBeUndefined();
    expect(archived).toHaveLength(0);
    database.close();
  });

  it("opens and duplicates archived newsletters", async () => {
    const database = new DigestDeckDatabase("test-history");
    const current = await saveNewsletter({ ...(await getActiveNewsletter(database)), subject: "Archive me" }, database);
    await createNewNewsletter(current, database);
    const archived = await listArchivedNewsletters(database);
    const opened = await openNewsletterAsActive(archived[0]?.id ?? "", database);
    expect(opened.subject).toBe("Archive me");
    const freshArchive = await createNewNewsletter(opened, database);
    const source = (await listArchivedNewsletters(database))[0];
    const duplicate = await duplicateNewsletter(source?.id ?? "", database);
    expect(duplicate.id).not.toBe(source?.id);
    expect(duplicate.isActive).toBe(true);
    expect(freshArchive.isActive).toBe(true);
    database.close();
  });

  it("rejects unknown newsletter IDs", async () => {
    const database = new DigestDeckDatabase("test-missing");
    await expect(openNewsletterAsActive("missing", database)).rejects.toThrow("Newsletter no encontrada.");
    await expect(duplicateNewsletter("missing", database)).rejects.toThrow("Newsletter no encontrada.");
    database.close();
  });
});
