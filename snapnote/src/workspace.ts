export type ClipboardPayload = { type: "text" | "image"; data: string };
export type Note = { id: string; title: string; content: string };
export type Group = { id: string; name: string };
export type Clip = ClipboardPayload & {
  id: string;
  title: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  folderId: string;
  sessionId: string;
  ocr: string;
  snippet: boolean;
};
export type Workspace = {
  version: 2;
  clips: Clip[];
  notes: Note[];
  activeNoteId: string;
  folders: Group[];
  sessions: Group[];
  settings: { capture: boolean; historyLimit: number; theme: "light" | "dark" };
};
export const id = () => crypto.randomUUID();
export const MAX_DATA_LENGTH = 12_000_000;
export const imageData = (value: string) =>
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
export const plainText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
};
export function freshWorkspace(): Workspace {
  const note = { id: id(), title: "Untitled", content: "" };
  return {
    version: 2,
    clips: [],
    notes: [note],
    activeNoteId: note.id,
    folders: [],
    sessions: [],
    settings: { capture: false, historyLimit: 200, theme: "light" },
  };
}
export function validNotes(value: unknown): value is Note[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 2000 &&
    value.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        typeof n.title === "string" &&
        typeof n.content === "string" &&
        n.content.length <= MAX_DATA_LENGTH,
    ) &&
    new Set(value.map((n) => n.id)).size === value.length
  );
}
export function validateWorkspace(value: unknown): Workspace {
  const w = value as Workspace;
  const groups = (g: unknown): g is Group[] =>
    Array.isArray(g) &&
    g.length <= 2000 &&
    g.every(
      (x) =>
        x &&
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        x.name.length <= 200,
    ) &&
    new Set(g.map((x) => x.id)).size === g.length;
  if (
    !w ||
    w.version !== 2 ||
    !validNotes(w.notes) ||
    !groups(w.folders) ||
    !groups(w.sessions) ||
    !Array.isArray(w.clips) ||
    w.clips.length > 10000 ||
    !w.clips.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        ["text", "image"].includes(c.type) &&
        typeof c.data === "string" &&
        c.data.length <= MAX_DATA_LENGTH &&
        (c.type !== "image" || imageData(c.data)) &&
        typeof c.title === "string" &&
        typeof c.ocr === "string" &&
        typeof c.favorite === "boolean" &&
        typeof c.snippet === "boolean" &&
        typeof c.folderId === "string" &&
        typeof c.sessionId === "string" &&
        Number.isFinite(c.createdAt) &&
        Number.isFinite(c.updatedAt) &&
        Array.isArray(c.tags) &&
        c.tags.every((t) => typeof t === "string" && t.length <= 100),
    ) ||
    new Set(w.clips.map((c) => c.id)).size !== w.clips.length ||
    !w.notes.some((n) => n.id === w.activeNoteId) ||
    !w.settings ||
    typeof w.settings.capture !== "boolean" ||
    !["light", "dark"].includes(w.settings.theme) ||
    !Number.isInteger(w.settings.historyLimit) ||
    w.settings.historyLimit < 20 ||
    w.settings.historyLimit > 2000
  ) {
    throw new Error(
      "This file is not a valid SnapNote workspace. Your current data has not been changed.",
    );
  }
  return w;
}
export function protectedClip(c: Clip) {
  return c.favorite || c.snippet || Boolean(c.folderId || c.sessionId);
}
export function addClip(w: Workspace, payload: ClipboardPayload): Workspace {
  if (
    !payload.data ||
    payload.data.length > MAX_DATA_LENGTH ||
    (payload.type === "image" && !imageData(payload.data))
  )
    return w;
  const now = Date.now();
  const existing = w.clips.find(
    (c) => c.type === payload.type && c.data === payload.data,
  );
  if (existing)
    return {
      ...w,
      clips: [
        { ...existing, updatedAt: now },
        ...w.clips.filter((c) => c.id !== existing.id),
      ],
    };
  const clip: Clip = {
    ...payload,
    id: id(),
    title:
      payload.type === "text"
        ? payload.data
            .split("\n")
            .find((s) => s.trim())
            ?.slice(0, 100) || "Text clip"
        : "Image clip",
    tags: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
    folderId: "",
    sessionId: "",
    ocr: "",
    snippet: false,
  };
  let count = 0;
  let bytes = 0;
  const clips = [clip, ...w.clips].filter((c) => {
    if (protectedClip(c)) return true;
    count += 1;
    bytes += c.data.length * 2;
    return count <= w.settings.historyLimit && bytes <= 80_000_000;
  });
  return { ...w, clips };
}
export function searchClips(clips: Clip[], query: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return clips.filter((c) => {
    const text = [c.title, c.type === "text" ? c.data : "", c.ocr, ...c.tags]
      .join(" ")
      .toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}
export function mergeWorkspace(
  current: Workspace,
  incoming: Workspace,
): Workspace {
  const groups = (a: Group[], b: Group[]) => {
    const merged = [...a],
      mapping = new Map<string, string>();
    for (const group of b) {
      const match = merged.find((g) => g.name === group.name);
      const next = match ?? {
        ...group,
        id: merged.some((g) => g.id === group.id) ? id() : group.id,
      };
      if (!match) merged.push(next);
      mapping.set(group.id, next.id);
    }
    return { merged, mapping };
  };
  const folders = groups(current.folders, incoming.folders),
    sessions = groups(current.sessions, incoming.sessions);
  // Imports never overwrite notes. Give a conflicting incoming note a fresh identity.
  const notes = [...current.notes];
  for (const note of incoming.notes) {
    if (
      !notes.some((n) => n.title === note.title && n.content === note.content)
    )
      notes.push({ ...note, id: id() });
  }
  const clips = [...current.clips];
  for (const clip of incoming.clips) {
    const existing = clips.find(
      (c) => c.type === clip.type && c.data === clip.data,
    );
    if (existing) {
      const index = clips.findIndex((c) => c.id === existing.id);
      clips[index] = {
        ...clips[index],
        favorite: clips[index].favorite || clip.favorite,
        snippet: clips[index].snippet || clip.snippet,
        tags: [...new Set([...clips[index].tags, ...clip.tags])],
      };
    } else
      clips.push({
        ...clip,
        id: id(),
        folderId: folders.mapping.get(clip.folderId) ?? "",
        sessionId: sessions.mapping.get(clip.sessionId) ?? "",
      });
  }
  return {
    ...current,
    notes,
    clips,
    folders: folders.merged,
    sessions: sessions.merged,
  };
}
