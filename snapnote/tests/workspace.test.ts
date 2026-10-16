import test from "node:test";
import assert from "node:assert/strict";
import {
  addClip,
  freshWorkspace,
  mergeWorkspace,
  searchClips,
  validateWorkspace,
} from "../src/workspace.ts";
import { createBackup, readBackup } from "../src/backup.ts";

test("exact clipboard whitespace and markup stay literal; duplicate identity preserves organization", () => {
  const text = "  <b>not markup</b>\n  code\n";
  let w = addClip(freshWorkspace(), { type: "text", data: text });
  w.clips[0] = { ...w.clips[0], favorite: true, tags: ["keep"], folderId: "f" };
  const before = w.clips[0];
  w = addClip(w, { type: "text", data: text });
  assert.equal(w.clips.length, 1);
  assert.equal(w.clips[0].data, text);
  assert.equal(w.clips[0].id, before.id);
  assert.equal(w.clips[0].favorite, true);
  assert.deepEqual(w.clips[0].tags, ["keep"]);
  w = addClip(w, { type: "text", data: text.trim() });
  assert.equal(w.clips.length, 2);
});
test("retention preserves favorites, snippets, and organized content", () => {
  let w = freshWorkspace();
  w.settings.historyLimit = 20;
  for (let i = 0; i < 35; i++) {
    w = addClip(w, { type: "text", data: `clip ${i}` });
    if (i < 4)
      w.clips[0] = {
        ...w.clips[0],
        favorite: i === 0,
        snippet: i === 1,
        folderId: i === 2 ? "folder" : "",
        sessionId: i === 3 ? "session" : "",
      };
  }
  assert.equal(w.clips.length, 24);
  assert.ok(
    [0, 1, 2, 3].every((i) => w.clips.some((c) => c.data === `clip ${i}`)),
  );
});
test("search covers all query terms across title, content, tags, and OCR", () => {
  let w = addClip(freshWorkspace(), { type: "text", data: "Project schedule" });
  w.clips[0] = { ...w.clips[0], tags: ["meeting"], ocr: "WOLF" };
  assert.equal(searchClips(w.clips, "meeting wolf schedule").length, 1);
  assert.equal(searchClips(w.clips, "missing").length, 0);
});
test("invalid imports and executable image formats are rejected without mutating current data", () => {
  const w = freshWorkspace();
  const original = JSON.stringify(w);
  assert.throws(() => validateWorkspace({ ...w, notes: [{ id: "bad" }] }));
  assert.throws(() =>
    validateWorkspace({ ...w, settings: { ...w.settings, historyLimit: -1 } }),
  );
  assert.equal(
    addClip(w, { type: "image", data: "data:image/svg+xml;base64,AAAA" }),
    w,
  );
  assert.equal(JSON.stringify(w), original);
});
test("merge preserves both conflicting notes and remaps colliding group IDs", () => {
  const current = freshWorkspace();
  current.folders = [{ id: "same", name: "Current" }];
  const incoming = addClip(freshWorkspace(), {
    type: "text",
    data: "Imported content",
  });
  incoming.notes[0] = {
    ...current.notes[0],
    content: "<p>A different note</p>",
  };
  incoming.folders = [{ id: "same", name: "Incoming" }];
  incoming.clips[0].folderId = "same";
  const merged = mergeWorkspace(current, incoming);
  assert.equal(merged.notes.length, 2);
  assert.notEqual(merged.notes[0].id, merged.notes[1].id);
  assert.equal(merged.folders.length, 2);
  assert.notEqual(merged.clips[0].folderId, "same");
  assert.equal(current.clips.length, 0);
});
test("encrypted backup round-trip, wrong password, and tampering", async () => {
  const w = addClip(freshWorkspace(), { type: "text", data: "a private note" });
  const backup = await createBackup(w, "correct horse battery staple");
  assert.ok(!backup.includes("a private note"));
  assert.deepEqual(await readBackup(backup, "correct horse battery staple"), w);
  await assert.rejects(
    readBackup(backup, "incorrect password"),
    /Unable to unlock/,
  );
  const modified = JSON.parse(backup);
  modified.data = modified.data.slice(0, -8) + "AAAAAAA=";
  await assert.rejects(
    readBackup(JSON.stringify(modified), "correct horse battery staple"),
    /Unable to unlock/,
  );
  await assert.rejects(createBackup(w, "short"), /10 characters/);
});
test("plain backup is validated and preserves every entity", async () => {
  const w = freshWorkspace();
  assert.deepEqual(await readBackup(await createBackup(w, ""), ""), w);
  await assert.rejects(readBackup("{ broken", ""), /valid JSON/);
});

test("an import that exceeds workspace capacity leaves the current workspace unchanged", () => {
  const current = freshWorkspace();
  current.notes = Array.from({ length: 2000 }, (_, i) => ({
    id: `note-${i}`,
    title: `Note ${i}`,
    content: `<p>Keep ${i}</p>`,
  }));
  current.activeNoteId = current.notes[0].id;
  const incoming = freshWorkspace();
  const before = JSON.stringify(current);
  assert.throws(() => mergeWorkspace(current, incoming), /capacity/);
  assert.equal(JSON.stringify(current), before);
  assert.doesNotThrow(() => validateWorkspace(current));
});
