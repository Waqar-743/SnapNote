import {
  freshWorkspace,
  validNotes,
  validateWorkspace,
  type Workspace,
} from "./workspace";
import { decode, decryptRecord, encode, encryptRecord, keyFor } from "./backup";

const DB_NAME = "snapnote-workspace";
let database: Promise<IDBDatabase> | undefined;
let saved: Workspace | undefined;
let writeQueue: Promise<void> = Promise.resolve();
let vaultKey: CryptoKey | null = null;
export let encryptedWorkspace = false;
function db() {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        for (const name of ["metadata", "clips", "notes"])
          request.result.createObjectStore(name);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () =>
        reject(new Error("Close other SnapNote windows and try again."));
    });
  return database;
}
const requestValue = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
export async function loadWorkspace(): Promise<Workspace> {
  const database = await db();
  const tx = database.transaction(["metadata", "clips", "notes"], "readonly");
  let [meta, clips, notes, vault] = await Promise.all([
    requestValue(tx.objectStore("metadata").get("workspace")),
    requestValue(tx.objectStore("clips").getAll()),
    requestValue(tx.objectStore("notes").getAll()),
    requestValue(tx.objectStore("metadata").get("vault")),
  ]);
  encryptedWorkspace = Boolean(vault);
  if (vault) {
    if (vault.version !== 1)
      throw new Error(
        "This workspace uses an unsupported encryption format. Keep its data and update SnapNote.",
      );
    if (!vaultKey) throw new Error("WORKSPACE_LOCKED");
    try {
      meta = await decryptRecord(meta, vaultKey);
      clips = await Promise.all(clips.map((c) => decryptRecord(c, vaultKey!)));
      notes = await Promise.all(notes.map((n) => decryptRecord(n, vaultKey!)));
    } catch {
      throw new Error("Could not unlock the workspace. Check your password.");
    }
  }
  if (meta) {
    const orderedNotes = meta.noteOrder.map((key: string) =>
      notes.find((n) => n.id === key),
    );
    const { noteOrder: _noteOrder, ...metadata } = meta;
    const workspace = validateWorkspace({
      ...metadata,
      clips: clips.sort((a, b) => b.updatedAt - a.updatedAt),
      notes: orderedNotes,
    });
    saved = workspace;
    return workspace;
  }
  const workspace = freshWorkspace();
  const legacy = localStorage.getItem("snapnote-tabs");
  if (legacy) {
    let notes: unknown;
    try {
      notes = JSON.parse(legacy);
    } catch {
      throw new Error(
        "Your original notes could not be read. Export the original data before resetting storage.",
      );
    }
    if (!validNotes(notes))
      throw new Error(
        "Your original notes have an unexpected format. They have been preserved for recovery.",
      );
    workspace.notes = notes;
    workspace.activeNoteId =
      notes.find((n) => n.id === localStorage.getItem("snapnote-active-tab"))
        ?.id ?? notes[0].id;
  }
  workspace.settings.theme =
    localStorage.getItem("snapnote-theme") === "dark" ? "dark" : "light";
  await saveWorkspace(workspace);
  return workspace;
}
export function saveWorkspace(workspace: Workspace): Promise<void> {
  const write = async () => {
    const database = await db();
    if (encryptedWorkspace && !vaultKey)
      throw new Error("Unlock your workspace before saving.");
    const { clips, notes, ...meta } = workspace;
    const metadata = { ...meta, noteOrder: notes.map((n) => n.id) };
    const prepared = new Map<string, unknown>();
    // Encrypt only changed entities before opening the short atomic transaction.
    for (const name of ["clips", "notes"] as const) {
      const previous = new Map(
        (saved?.[name] ?? []).map((item) => [item.id, item]),
      );
      for (const item of workspace[name])
        if (previous.get(item.id) !== item)
          prepared.set(
            `${name}:${item.id}`,
            vaultKey ? await encryptRecord(item, vaultKey) : item,
          );
    }
    const storedMeta = vaultKey
      ? await encryptRecord(metadata, vaultKey)
      : metadata;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(
        ["metadata", "clips", "notes"],
        "readwrite",
      );
      tx.objectStore("metadata").put(storedMeta, "workspace");
      for (const name of ["clips", "notes"] as const) {
        const next = workspace[name];
        const previous = new Map(
          (saved?.[name] ?? []).map((item) => [item.id, item]),
        );
        const nextIds = new Set(next.map((item) => item.id));
        for (const item of next)
          if (previous.get(item.id) !== item)
            tx.objectStore(name).put(
              prepared.get(`${name}:${item.id}`),
              item.id,
            );
        for (const key of previous.keys())
          if (!nextIds.has(key)) tx.objectStore(name).delete(key);
      }
      tx.oncomplete = () => {
        saved = workspace;
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("Local storage failed."));
      tx.onabort = () =>
        reject(
          tx.error ??
            new Error(
              "Local storage is full or unavailable. Export a backup and free disk space.",
            ),
        );
    });
  };
  const next = writeQueue.catch(() => {}).then(write);
  writeQueue = next;
  return next;
}
export async function unlockWorkspace(password: string) {
  const database = await db();
  const vault = await requestValue(
    database.transaction("metadata").objectStore("metadata").get("vault"),
  );
  if (!vault || vault.version !== 1 || typeof vault.salt !== "string")
    throw new Error("The encrypted workspace header is unavailable.");
  vaultKey = await keyFor(password, decode(vault.salt));
  try {
    return await loadWorkspace();
  } catch (error) {
    vaultKey = null;
    throw error;
  }
}
export async function lockWorkspace() {
  await writeQueue;
  vaultKey = null;
  saved = undefined;
}
export function enableWorkspaceEncryption(
  workspace: Workspace,
  password: string,
) {
  const enable = async () => {
    if (password.length < 10)
      throw new Error("Use at least 10 characters for the workspace password.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await keyFor(password, salt);
    const { notes, clips, ...meta } = workspace;
    const storedMeta = await encryptRecord(
      { ...meta, noteOrder: notes.map((n) => n.id) },
      key,
    );
    const storedNotes = await Promise.all(
      notes.map((n) => encryptRecord(n, key)),
    );
    const storedClips = await Promise.all(
      clips.map((c) => encryptRecord(c, key)),
    );
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(
        ["metadata", "clips", "notes"],
        "readwrite",
      );
      tx.objectStore("metadata").clear();
      tx.objectStore("clips").clear();
      tx.objectStore("notes").clear();
      tx.objectStore("metadata").put(
        { version: 1, salt: encode(salt) },
        "vault",
      );
      tx.objectStore("metadata").put(storedMeta, "workspace");
      notes.forEach((note, i) =>
        tx.objectStore("notes").put(storedNotes[i], note.id),
      );
      clips.forEach((clip, i) =>
        tx.objectStore("clips").put(storedClips[i], clip.id),
      );
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          tx.error ??
            new Error(
              "Could not encrypt local storage. Your previous data is intact.",
            ),
        );
    });
    vaultKey = key;
    encryptedWorkspace = true;
    saved = workspace;
    // The UI explicitly asks to remove preserved plaintext legacy copies when enabling encryption.
    localStorage.removeItem("snapnote-tabs");
    localStorage.removeItem("snapnote-active-tab");
    localStorage.removeItem("snapnote-theme");
  };
  const next = writeQueue.catch(() => {}).then(enable);
  writeQueue = next;
  return next;
}
export function download(
  filename: string,
  data: string,
  mime = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
