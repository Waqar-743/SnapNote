import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { addClip } from "../src/workspace.ts";
import {
  enableWorkspaceEncryption,
  loadWorkspace,
  lockWorkspace,
  saveWorkspace,
  unlockWorkspace,
} from "../src/storage.ts";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});

test("legacy migration, transactional edits, relaunch, encrypted storage, and lock recovery", async () => {
  const legacy = [
    {
      id: "old-note",
      title: "Original note",
      content: "<p>Keep my formatting <strong>please</strong></p>",
    },
  ];
  values.set("snapnote-tabs", JSON.stringify(legacy));
  values.set("snapnote-active-tab", "old-note");
  values.set("snapnote-theme", "dark");
  let w = await loadWorkspace();
  assert.deepEqual(w.notes, legacy);
  assert.equal(w.settings.theme, "dark");
  assert.ok(values.has("snapnote-tabs"));
  w = addClip(w, { type: "text", data: "A private clipboard value" });
  await saveWorkspace(w);
  assert.deepEqual(await loadWorkspace(), w);
  await enableWorkspaceEncryption(w, "this is my workspace password");
  assert.equal(values.has("snapnote-tabs"), false);
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("snapnote-workspace");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const stored = await new Promise<unknown[]>((resolve, reject) => {
    const r = database.transaction("clips").objectStore("clips").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  assert.ok(!JSON.stringify(stored).includes("A private clipboard value"));
  await lockWorkspace();
  await assert.rejects(loadWorkspace(), /WORKSPACE_LOCKED/);
  await assert.rejects(unlockWorkspace("wrong password"), /Could not unlock/);
  assert.deepEqual(await unlockWorkspace("this is my workspace password"), w);
  w = {
    ...w,
    clips: w.clips.map((c) => ({ ...c, title: "Changed after unlock" })),
  };
  await saveWorkspace(w);
  await lockWorkspace();
  assert.deepEqual(await unlockWorkspace("this is my workspace password"), w);
  database.close();
});
