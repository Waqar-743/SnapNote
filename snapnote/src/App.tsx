import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import logoDark from "./assets/logo-dark.png";
import logoWhite from "./assets/logo-white.png";
import {
  ClipboardList,
  Search,
  Star,
  Image as ImageIcon,
  FileText,
  Braces,
  Folder,
  Layers,
  Plus,
  Copy,
  Pause,
  Play,
  Settings,
  X,
  Moon,
  Sun,
  ArrowUpRight,
  Pin,
  ScanText,
  Pencil,
  Trash2,
  ShieldCheck,
  Download,
  Upload,
  Check,
  Keyboard,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  addClip,
  id,
  mergeWorkspace,
  protectedClip,
  searchClips,
  type Clip,
  type ClipboardPayload,
  type Workspace,
} from "./workspace";
import {
  download,
  enableWorkspaceEncryption,
  encryptedWorkspace,
  loadWorkspace,
  lockWorkspace,
  saveWorkspace,
  unlockWorkspace,
} from "./storage";
import { createBackup, readBackup } from "./backup";
const NotesWorkspace = lazy(() => import("./components/NotesWorkspace"));
const ImageTools = lazy(() => import("./components/ImageTools"));
const native = isTauri();
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
type View =
  | "all"
  | "favorites"
  | "text"
  | "image"
  | "notes"
  | "snippets"
  | `folder:${string}`
  | `session:${string}`;

function PinnedImage() {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void invoke<string>("pinned_image")
      .then(setSrc)
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <div className="pinned-image">
      {src ? (
        <img src={src} alt="Pinned clipboard image" />
      ) : (
        <p role="alert">{error || "Opening image…"}</p>
      )}
    </div>
  );
}

function DesktopWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState("");
  const [locked, setLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultConfirmation, setVaultConfirmation] = useState("");
  const locking = useRef(false);
  const [saveState, setSaveState] = useState("Opening workspace…");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [list, setList] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(200);
  useEffect(() => setVisibleLimit(200), [view, deferredQuery]);
  const [sidebar, setSidebar] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [quick, setQuick] = useState(true);
  const [floating, setFloating] = useState(false);
  const [editingImage, setEditingImage] = useState<Clip | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [capture, setCapture] = useState<{
    nonce: string;
    payload: ClipboardPayload;
  } | null>(null);
  const latest = useRef(workspace);
  latest.current = workspace;
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const quickBounds = useRef<{ width: number; height: number } | null>(null);
  const mutate = useCallback(
    (fn: (w: Workspace) => Workspace) => setWorkspace((w) => (w ? fn(w) : w)),
    [],
  );
  const add = useCallback(
    (payload: ClipboardPayload) => mutate((w) => addClip(w, payload)),
    [mutate],
  );

  useEffect(() => {
    let disposed = false;
    void loadWorkspace()
      .then((w) => {
        if (!disposed) setWorkspace(w);
      })
      .catch((e) => {
        if (!disposed) {
          if (message(e) === "WORKSPACE_LOCKED") setLocked(true);
          else setLoadError(message(e));
        }
      });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!workspace) return;
    let current = true;
    setSaveState("Saving…");
    void saveWorkspace(workspace)
      .then(() => {
        if (current) setSaveState("Saved on this device");
      })
      .catch((e) => {
        if (current) {
          setSaveState("Save failed · export a backup");
          setError(message(e));
        }
      });
    document.documentElement.classList.toggle(
      "dark",
      workspace.settings.theme === "dark",
    );
    return () => {
      current = false;
    };
  }, [workspace]);
  useEffect(() => {
    if (!workspace || !native) return;
    void invoke("configure_capture", {
      enabled: workspace.settings.capture,
    }).catch((e) => setError(message(e)));
  }, [workspace?.settings.capture]);

  const toggleQuick = useCallback(
    async (enabled: boolean) => {
      try {
        if (native) {
          const win = getCurrentWindow();
          if (enabled) {
            const size = await win.innerSize();
            const scale = await win.scaleFactor();
            if (!quickBounds.current)
              quickBounds.current = {
                width: size.width / scale,
                height: size.height / scale,
              };
            await win.setSize(new LogicalSize(560, 640));
          } else {
            const saved = quickBounds.current;
            quickBounds.current = null;
            // A fresh launch already lives in the small quick window; widen to
            // the standard workspace instead of restoring a quick-sized bound.
            const wasQuickish =
              !saved || saved.width <= 600 || saved.height <= 680;
            await win.setSize(
              new LogicalSize(
                wasQuickish ? 1180 : saved.width,
                wasQuickish ? 800 : saved.height,
              ),
            );
          }
          await invoke("set_floating", { enabled: enabled || floating });
          await invoke("set_quick_access", { enabled });
        }
        setQuick(enabled);
        if (enabled) {
          setView("all");
          setSidebar(false);
          setSelectedId(null);
        }
        window.setTimeout(() => searchRef.current?.focus(), 50);
      } catch (e) {
        setError(message(e));
      }
    },
    [floating],
  );
  const quickHandler = useRef(toggleQuick);
  quickHandler.current = toggleQuick;
  useEffect(() => {
    if (!native) return;
    let disposed = false;
    const disposers: UnlistenFn[] = [];
    const keep = (dispose: UnlistenFn) => {
      if (disposed) dispose();
      else disposers.push(dispose);
    };
    void listen<ClipboardPayload>("clipboard-history", (event) => {
      if (!locking.current && latest.current?.settings.capture)
        add(event.payload);
    })
      .then(keep)
      .catch((e) => setError(message(e)));
    void listen<ClipboardPayload>("clipboard-captured", (event) => {
      if (locking.current || !latest.current) return;
      add(event.payload);
      setCapture({ nonce: id(), payload: event.payload });
      setView("notes");
    })
      .then(keep)
      .catch((e) => setError(message(e)));
    void listen("quick-access", () => {
      void quickHandler.current(true);
    })
      .then(keep)
      .catch((e) => setError(message(e)));
    void listen<string>("clipboard-warning", (event) => {
      if (latest.current) setError(event.payload);
    })
      .then(keep)
      .catch((e) => setError(message(e)));
    void invoke<string[]>("native_status")
      .then((warnings) => {
        if (warnings.length) setError(warnings.join("\n"));
      })
      .catch((e) => setError(message(e)));
    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();
        try {
          if (latest.current) await saveWorkspace(latest.current);
          await invoke("finish_close");
        } catch (e) {
          setError(`Could not save before closing: ${message(e)}`);
        }
      })
      .then(keep)
      .catch((e) => setError(message(e)));
    return () => {
      disposed = true;
      disposers.forEach((dispose) => dispose());
    };
  }, [add]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (editingImage) setEditingImage(null);
        else if (settings) setSettings(false);
        else if (help) setHelp(false);
        else if (sidebar) setSidebar(false);
        else if (selectedId) setSelectedId(null);
      }
      if (e.key === "Tab" && (settings || help || editingImage)) {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal [href], .modal button:not([disabled]), .modal input, .modal select, .modal textarea",
          ),
        );
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [settings, help, editingImage, sidebar, selectedId, toggleQuick]);

  const run = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (e) {
      setError(message(e));
    }
  };
  const copyPayload = async (payload: ClipboardPayload) => {
    if (!native)
      throw new Error("Copying the system clipboard requires the desktop app.");
    await invoke("write_clipboard", { payload });
    setNotice("Copied. Paste it into any app.");
  };
  const copyClip = (clip: Clip) =>
    run(async () => {
      let data = clip.data;
      if (clip.snippet && clip.type === "text") {
        const variables = [
          ...new Set(
            [...data.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) =>
              m[1].trim(),
            ),
          ),
        ];
        for (const variable of variables) {
          const value = window.prompt(`Template value for ${variable}`);
          if (value === null) return;
          data = data.replace(
            /\{\{\s*([^{}]+?)\s*\}\}/g,
            (match, key: string) => (key.trim() === variable ? value : match),
          );
        }
      }
      await copyPayload({ type: clip.type, data });
    });
  const patchClip = (clip: Clip, patch: Partial<Clip>) =>
    mutate((w) => ({
      ...w,
      clips: w.clips.map((c) => (c.id === clip.id ? { ...c, ...patch } : c)),
    }));
  const deleteClip = (clip: Clip) => {
    if (!window.confirm("Delete this clip?")) return;
    mutate((w) => ({ ...w, clips: w.clips.filter((c) => c.id !== clip.id) }));
    setSelectedId((current) => (current === clip.id ? null : current));
    setChecked((ids) => ids.filter((x) => x !== clip.id));
    setNotice(clip.type === "image" ? "Image clip deleted." : "Clip deleted.");
  };
  const navigate = (next: View) => {
    setView(next);
    setSelectedId(null);
    setChecked([]);
    setQuery("");
    setSidebar(false);
  };
  const createGroup = (
    type: "folders" | "sessions",
    clipIds: string[] = [],
  ) => {
    const name = window.prompt(
      type === "folders" ? "Folder name" : "Session name",
    );
    if (!name?.trim()) return;
    const group = { id: id(), name: name.trim().slice(0, 100) };
    mutate((w) => ({
      ...w,
      [type]: [...w[type], group],
      clips: w.clips.map((c) =>
        clipIds.includes(c.id)
          ? { ...c, [type === "folders" ? "folderId" : "sessionId"]: group.id }
          : c,
      ),
    }));
    navigate(`${type === "folders" ? "folder" : "session"}:${group.id}`);
  };
  const exportBackup = () =>
    run(async () => {
      if (!workspace) return;
      setBackupBusy(true);
      try {
        const data = await createBackup(workspace, password);
        if (native) {
          const path = await invoke<string>("export_backup", { data });
          setNotice(`Backup saved: ${path}`);
        } else {
          download(
            `SnapNote-backup-${new Date().toISOString().slice(0, 10)}.json`,
            data,
          );
          setNotice("Backup downloaded.");
        }
      } finally {
        setBackupBusy(false);
      }
    });
  const selected = workspace?.clips.find((c) => c.id === selectedId);
  const groups = view.startsWith("folder:")
    ? workspace?.folders
    : workspace?.sessions;
  const collectionType = view.startsWith("folder:")
    ? "folders"
    : view.startsWith("session:")
      ? "sessions"
      : null;
  const collection = collectionType
    ? groups?.find((g) => g.id === view.split(":")[1])
    : null;
  const title =
    (
      {
        all: "Clipboard",
        favorites: "Favorites",
        text: "Text clips",
        image: "Images",
        notes: "Notes",
        snippets: "Snippets",
      } as Record<string, string>
    )[view] ??
    groups?.find((g) => g.id === view.split(":")[1])?.name ??
    "Collection";
  const clips = searchClips(workspace?.clips ?? [], deferredQuery).filter(
    (c) =>
      view === "favorites"
        ? c.favorite
        : view === "text" || view === "image"
          ? c.type === view
          : view === "snippets"
            ? c.snippet
            : view.startsWith("folder:")
              ? c.folderId === view.slice(7)
              : view.startsWith("session:")
                ? c.sessionId === view.slice(8)
                : true,
  );
  const checkedClips = (workspace?.clips ?? []).filter((c) =>
    checked.includes(c.id),
  );
  if (!workspace && locked)
    return (
      <form
        className="loading-screen"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const loaded = await unlockWorkspace(unlockPassword);
            setWorkspace(loaded);
            setLocked(false);
            setUnlockPassword("");
            locking.current = false;
          });
        }}
      >
        <ShieldCheck size={34} />
        <h1>Your workspace is locked</h1>
        <p>Enter your password to open your local notes and clips.</p>
        <input
          autoFocus
          type="password"
          className="unlock-input"
          autoComplete="current-password"
          aria-label="Workspace password"
          value={unlockPassword}
          onChange={(e) => setUnlockPassword(e.target.value)}
        />
        <button type="submit" className="button primary">
          Unlock workspace
        </button>
        {error && <p role="alert">{error}</p>}
        <small className="muted">
          This password cannot be recovered. Keep an encrypted backup.
        </small>
      </form>
    );
  if (!workspace)
    return (
      <div className="loading-screen">
        <ClipboardList size={34} />
        <h1>SnapNote</h1>
        <p role={loadError ? "alert" : "status"}>
          {loadError || "Opening your workspace…"}
        </p>
        {loadError && (
          <>
            <button
              className="button"
              onClick={() =>
                download(
                  "SnapNote-original-notes.json",
                  JSON.stringify({
                    tabs: localStorage.getItem("snapnote-tabs"),
                    activeTab: localStorage.getItem("snapnote-active-tab"),
                    theme: localStorage.getItem("snapnote-theme"),
                  }),
                )
              }
            >
              Export original data
            </button>
            <button className="button" onClick={() => location.reload()}>
              Try again
            </button>
          </>
        )}
      </div>
    );

  return (
    <div className={`workspace-shell ${quick ? "quick-mode" : ""}`}>
      <div
        className={`drawer-backdrop ${sidebar ? "open" : ""}`}
        aria-hidden="true"
        onClick={() => setSidebar(false)}
      />
      <aside
        className={`sidebar ${sidebar ? "open" : ""}`}
        aria-label="Collections"
        inert={!sidebar}
      >
        <div className="drawer-heading">
          <div className="brand">
            <img
              className="brand-logo"
              src={workspace.settings.theme === "dark" ? logoWhite : logoDark}
              alt="SnapNote"
              width={34}
              height={37}
            />
            <div>
              SnapNote<small>Your visual workspace.</small>
            </div>
          </div>
          <button
            className="icon-button"
            aria-label="Close collections"
            onClick={() => setSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label group-heading">
          FOLDERS
          <button
            className="icon-button small"
            aria-label="New folder"
            onClick={() => createGroup("folders")}
          >
            <Plus size={14} />
          </button>
        </div>
        <nav aria-label="Folders">
          {workspace.folders.map((g) => (
            <button
              key={g.id}
              className={`nav-item ${view === `folder:${g.id}` ? "selected" : ""}`}
              onClick={() => navigate(`folder:${g.id}`)}
            >
              <Folder size={16} />
              <span>{g.name}</span>
              <small>
                {workspace.clips.filter((c) => c.folderId === g.id).length}
              </small>
            </button>
          ))}
          {!workspace.folders.length && (
            <p className="sidebar-hint">Keep a project’s clips together.</p>
          )}
        </nav>
        <div className="workspace-label group-heading">
          SESSIONS
          <button
            className="icon-button small"
            aria-label="New session"
            onClick={() => createGroup("sessions")}
          >
            <Plus size={14} />
          </button>
        </div>
        <nav aria-label="Sessions">
          {workspace.sessions.map((g) => (
            <button
              key={g.id}
              className={`nav-item ${view === `session:${g.id}` ? "selected" : ""}`}
              onClick={() => navigate(`session:${g.id}`)}
            >
              <Layers size={16} />
              <span>{g.name}</span>
              <small>
                {workspace.clips.filter((c) => c.sessionId === g.id).length}
              </small>
            </button>
          ))}
          {!workspace.sessions.length && (
            <p className="sidebar-hint">Group a moment of research.</p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="capture-card">
            <span
              className={`status-dot ${workspace.settings.capture ? "live" : ""}`}
            />
            <div>
              <strong>
                {workspace.settings.capture
                  ? "Clipboard capture on"
                  : "Capture is paused"}
              </strong>
              <small>
                {workspace.settings.capture
                  ? "Text & images, saved locally"
                  : "Ready when you are"}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label={
                workspace.settings.capture ? "Pause capture" : "Enable capture"
              }
              disabled={!native}
              onClick={() =>
                mutate((w) => ({
                  ...w,
                  settings: { ...w.settings, capture: !w.settings.capture },
                }))
              }
            >
              {workspace.settings.capture ? (
                <Pause size={15} />
              ) : (
                <Play size={15} />
              )}
            </button>
          </div>
          <button className="nav-item" onClick={() => setSettings(true)}>
            <Settings size={17} />
            <span>Settings & privacy</span>
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="app-header">
          <div className="launchpad">
            <img
              className="brand-logo"
              src={workspace.settings.theme === "dark" ? logoWhite : logoDark}
              alt="SnapNote"
              width={34}
              height={37}
            />
            <span className="launchpad-title">SnapNote</span>
            <span className="rail-divider" aria-hidden="true" />
            {(
              [
                ["all", "Clipboard", ClipboardList],
                ["favorites", "Favorites", Star],
                ["text", "Text clips", FileText],
                ["image", "Images", ImageIcon],
                ["notes", "Notes", Pencil],
                ["snippets", "Snippets", Braces],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                className={`rail-button ${view === key ? "selected" : ""}`}
                aria-label={label}
                aria-pressed={view === key}
                title={label}
                onClick={() => navigate(key)}
              >
                <Icon size={17} />
              </button>
            ))}
            <button
              className={`rail-button ${sidebar ? "selected" : ""}`}
              aria-label="Folders and sessions"
              aria-expanded={sidebar}
              title="Folders & sessions"
              onClick={() => setSidebar(!sidebar)}
            >
              <Folder size={17} />
            </button>
          </div>
          <div className="header-actions">
            <span className="local-badge">
              <ShieldCheck size={14} />
              {native ? "On this device" : "Browser preview"}
            </span>
            <button
              className="icon-button"
              aria-label="Keyboard shortcuts"
              onClick={() => setHelp(true)}
            >
              <Keyboard size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() =>
                mutate((w) => ({
                  ...w,
                  settings: {
                    ...w.settings,
                    theme: w.settings.theme === "dark" ? "light" : "dark",
                  },
                }))
              }
            >
              {workspace.settings.theme === "dark" ? (
                <Sun size={17} />
              ) : (
                <Moon size={17} />
              )}
            </button>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR IDEAS, WITHIN REACH</div>
            <div className="title-row">
              <h1>{quick ? "Quick access" : title}</h1>
              {collection && collectionType && (
                <>
                  <button
                    className="icon-button"
                    aria-label="Rename collection"
                    onClick={() => {
                      const name = window.prompt(
                        "Collection name",
                        collection.name,
                      );
                      if (!name?.trim()) return;
                      mutate((w) => ({
                        ...w,
                        [collectionType]: w[collectionType].map((g) =>
                          g.id === collection.id
                            ? { ...g, name: name.trim().slice(0, 100) }
                            : g,
                        ),
                      }));
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Remove collection"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Remove this collection? Its clips will stay in your library.",
                        )
                      )
                        return;
                      const field =
                        collectionType === "folders" ? "folderId" : "sessionId";
                      mutate((w) => ({
                        ...w,
                        [collectionType]: w[collectionType].filter(
                          (g) => g.id !== collection.id,
                        ),
                        clips: w.clips.map((c) =>
                          c[field] === collection.id
                            ? { ...c, [field]: "" }
                            : c,
                        ),
                      }));
                      navigate("all");
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
            <p>
              {view === "notes"
                ? "Think a little further. Your original notes live here."
                : view === "snippets"
                  ? "Useful words, ready to reuse. Add {{variables}} for templates."
                  : "Everything you copy. Ready for what’s next."}
            </p>
          </div>
          <div className="heading-actions">
            {quick ? (
              <button
                className="button"
                onClick={() => void toggleQuick(false)}
              >
                Open workspace <ArrowUpRight size={15} />
              </button>
            ) : (
              <button className="button" onClick={() => void toggleQuick(true)}>
                <Keyboard size={15} /> Quick access <kbd>Alt X</kbd>
              </button>
            )}
            <button
              className="button primary"
              disabled={!native}
              onClick={() =>
                void run(async () => {
                  const payload =
                    await invoke<ClipboardPayload>("read_clipboard");
                  add(payload);
                  setNotice("Clipboard saved.");
                })
              }
            >
              <Plus size={17} /> Capture now
            </button>
          </div>
        </div>
        {error && !settings && !help && !editingImage && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && !settings && !help && !editingImage && (
          <div className="notice-banner" role="status">
            <Check size={16} />
            <span>{notice}</span>
          </div>
        )}
        {view === "notes" ? (
          <Suspense
            fallback={<p className="empty-description">Opening editor…</p>}
          >
            <NotesWorkspace
              notes={workspace.notes}
              activeId={workspace.activeNoteId}
              onNotesChange={(notes) => mutate((w) => ({ ...w, notes }))}
              onSelect={(activeNoteId) => {
                setCapture(null);
                mutate((w) => ({ ...w, activeNoteId }));
              }}
              capture={capture}
              onCaptureConsumed={() => setCapture(null)}
              onClip={(payload) => {
                add(payload);
                setNotice("Saved to your clipboard library.");
              }}
            />
          </Suspense>
        ) : (
          <>
            <div className="library-toolbar">
              <label className="search-field">
                <Search size={18} />
                <input
                  ref={searchRef}
                  aria-label="Search clips"
                  placeholder="Search clips, tags, or text in images…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>Ctrl K</kbd>
                {query && (
                  <button
                    className="icon-button small"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <span className="result-count">
                {clips.length} {clips.length === 1 ? "clip" : "clips"}
              </span>
              <div className="view-switch">
                <button
                  className={`icon-button ${!list ? "active" : ""}`}
                  aria-label="Grid view"
                  aria-pressed={!list}
                  onClick={() => setList(false)}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  className={`icon-button ${list ? "active" : ""}`}
                  aria-label="List view"
                  aria-pressed={list}
                  onClick={() => setList(true)}
                >
                  <List size={17} />
                </button>
              </div>
            </div>
            {checked.length > 0 && (
              <div className="selection-bar">
                <strong>{checked.length} selected</strong>
                <button
                  className="text-button"
                  disabled={checkedClips.some((c) => c.type !== "text")}
                  onClick={() =>
                    void run(async () =>
                      copyPayload({
                        type: "text",
                        data: checkedClips.map((c) => c.data).join("\n\n"),
                      }),
                    )
                  }
                >
                  <Copy size={14} /> Copy text together
                </button>
                <button
                  className="text-button"
                  onClick={() => createGroup("sessions", checked)}
                >
                  <Layers size={14} /> Group in session
                </button>
                <button className="text-button" onClick={() => setChecked([])}>
                  Clear selection
                </button>
              </div>
            )}
            <div className={`library-body ${selected ? "with-details" : ""}`}>
              <div className="clip-scroll">
                {clips.length > 0 ? (
                  <div className={`clip-grid ${list ? "list-view" : ""}`}>
                    {clips.slice(0, visibleLimit).map((clip) => (
                      <article
                        key={clip.id}
                        className={`clip-card ${selectedId === clip.id ? "chosen" : ""}`}
                      >
                        <div className="clip-meta">
                          <span className={`type-badge ${clip.type}`}>
                            {clip.type === "image" ? (
                              <ImageIcon size={13} />
                            ) : (
                              <FileText size={13} />
                            )}
                            {clip.snippet
                              ? "Snippet"
                              : clip.type === "image"
                                ? "Image"
                                : /^https?:\/\//.test(clip.data)
                                  ? "Link"
                                  : "Text"}
                          </span>
                          <div>
                            <input
                              type="checkbox"
                              aria-label={`Select ${clip.title}`}
                              checked={checked.includes(clip.id)}
                              onChange={(e) =>
                                setChecked((ids) =>
                                  e.target.checked
                                    ? [...ids, clip.id]
                                    : ids.filter((x) => x !== clip.id),
                                )
                              }
                            />
                            <button
                              className={`icon-button small ${clip.favorite ? "favorite" : ""}`}
                              aria-label={
                                clip.favorite
                                  ? "Remove favorite"
                                  : "Add favorite"
                              }
                              aria-pressed={clip.favorite}
                              onClick={() =>
                                patchClip(clip, { favorite: !clip.favorite })
                              }
                            >
                              <Star
                                size={15}
                                fill={clip.favorite ? "currentColor" : "none"}
                              />
                            </button>
                          </div>
                        </div>
                        <button
                          className="clip-preview"
                          onClick={() => setSelectedId(clip.id)}
                          aria-label={`Open ${clip.title}`}
                        >
                          {clip.type === "image" ? (
                            <img
                              src={clip.data}
                              alt={clip.title}
                              loading="lazy"
                            />
                          ) : (
                            <pre>{clip.data.slice(0, 650)}</pre>
                          )}
                        </button>
                        <div className="clip-card-footer">
                          <button
                            className="clip-title"
                            onClick={() => setSelectedId(clip.id)}
                          >
                            {clip.title}
                          </button>
                          <button
                            className="icon-button"
                            title="Copy clip"
                            aria-label={`Copy ${clip.title}`}
                            onClick={() => void copyClip(clip)}
                          >
                            <Copy size={15} />
                          </button>
                          {clip.type === "image" && (
                            <button
                              className="icon-button danger"
                              title="Delete image clip"
                              aria-label={`Delete image clip: ${clip.title}`}
                              onClick={() => deleteClip(clip)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <div className="clip-bottom">
                          <span>
                            {new Date(clip.updatedAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                          <span>
                            {clip.tags
                              .slice(0, 2)
                              .map((t) => `#${t}`)
                              .join(" ")}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <ClipboardList size={32} />
                    </span>
                    <h2>
                      {query
                        ? "No clips found"
                        : "A clear space for your next idea"}
                    </h2>
                    <p>
                      {query
                        ? "Try a different word, title, or tag."
                        : "Copy text or an image, then capture it here. Enable automatic capture to keep a local history while you work."}
                    </p>
                    {!query && (
                      <button
                        className="button primary"
                        disabled={!native}
                        onClick={() =>
                          mutate((w) => ({
                            ...w,
                            settings: { ...w.settings, capture: true },
                          }))
                        }
                      >
                        <Play size={15} />
                        {workspace.settings.capture
                          ? "Capture is enabled"
                          : "Enable automatic capture"}
                      </button>
                    )}
                    <small>
                      Private by default. No account. No cloud upload.
                    </small>
                  </div>
                )}
                {clips.length > visibleLimit && (
                  <p className="muted pagination-hint">
                    <button
                      className="button"
                      onClick={() => setVisibleLimit((limit) => limit + 200)}
                    >
                      Load more clips ({clips.length - visibleLimit} remaining)
                    </button>
                  </p>
                )}
              </div>
              {selected && (
                <aside className="detail-pane" aria-label="Clip details">
                  <div className="detail-heading">
                    <strong>Clip details</strong>
                    <button
                      className="icon-button"
                      aria-label="Close details"
                      onClick={() => setSelectedId(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <label className="field-label">
                    TITLE
                    <input
                      value={selected.title}
                      onChange={(e) =>
                        patchClip(selected, { title: e.target.value })
                      }
                    />
                  </label>
                  {selected.type === "image" ? (
                    <img
                      className="detail-image"
                      src={selected.data}
                      alt={selected.title}
                    />
                  ) : (
                    <textarea
                      className="detail-text"
                      aria-label="Clip text"
                      value={selected.data}
                      onChange={(e) =>
                        patchClip(selected, { data: e.target.value })
                      }
                    />
                  )}
                  <button
                    className="button primary full"
                    onClick={() => void copyClip(selected)}
                  >
                    <Copy size={15} /> Copy{" "}
                    {selected.snippet ? "template" : "clip"}
                  </button>
                  {selected.type === "image" && (
                    <div className="image-action-grid">
                      <button
                        className="button"
                        disabled={ocrBusy}
                        onClick={() =>
                          void run(async () => {
                            setOcrBusy(true);
                            const clipId = selected.id;
                            try {
                              const ocr = await invoke<string>(
                                "extract_text_from_image",
                                { base64Data: selected.data },
                              );
                              mutate((w) => ({
                                ...w,
                                clips: w.clips.map((c) =>
                                  c.id === clipId ? { ...c, ocr } : c,
                                ),
                              }));
                              setNotice(
                                ocr
                                  ? "Text extracted and searchable."
                                  : "No text detected in this image.",
                              );
                            } finally {
                              setOcrBusy(false);
                            }
                          })
                        }
                      >
                        <ScanText size={14} />
                        {ocrBusy ? "Reading…" : "Extract text"}
                      </button>
                      <button
                        className="button"
                        onClick={() => setEditingImage(selected)}
                      >
                        <Pencil size={14} /> Edit image
                      </button>
                      <button
                        className="button"
                        onClick={() =>
                          void run(async () => {
                            await invoke("pin_image", { data: selected.data });
                            setNotice("Image pinned above other windows.");
                          })
                        }
                      >
                        <Pin size={14} /> Pin to screen
                      </button>
                    </div>
                  )}
                  {selected.ocr && (
                    <label className="field-label">
                      EXTRACTED TEXT
                      <textarea
                        aria-label="Extracted text"
                        value={selected.ocr}
                        onChange={(e) =>
                          patchClip(selected, { ocr: e.target.value })
                        }
                      />
                      <button
                        className="text-button"
                        onClick={() =>
                          void run(async () =>
                            copyPayload({ type: "text", data: selected.ocr }),
                          )
                        }
                      >
                        <Copy size={13} /> Copy extracted text
                      </button>
                    </label>
                  )}
                  <label className="field-label">
                    FOLDER
                    <select
                      value={selected.folderId}
                      onChange={(e) =>
                        patchClip(selected, { folderId: e.target.value })
                      }
                    >
                      <option value="">No folder</option>
                      {workspace.folders.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    SESSION
                    <select
                      value={selected.sessionId}
                      onChange={(e) =>
                        patchClip(selected, { sessionId: e.target.value })
                      }
                    >
                      <option value="">No session</option>
                      {workspace.sessions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    TAGS
                    <input
                      key={selected.id}
                      defaultValue={selected.tags.join(", ")}
                      placeholder="work, research, useful"
                      onBlur={(e) =>
                        patchClip(selected, {
                          tags: [
                            ...new Set(
                              e.target.value
                                .split(",")
                                .map((t) => t.trim().slice(0, 100))
                                .filter(Boolean),
                            ),
                          ].slice(0, 20),
                        })
                      }
                    />
                    <small>Separate tags with commas.</small>
                  </label>
                  {selected.type === "text" && (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={selected.snippet}
                        onChange={(e) =>
                          patchClip(selected, { snippet: e.target.checked })
                        }
                      />{" "}
                      Save as reusable snippet
                    </label>
                  )}
                  <button
                    className="text-button danger"
                    onClick={() => deleteClip(selected)}
                  >
                    <Trash2 size={14} /> Delete clip
                  </button>
                </aside>
              )}
            </div>
          </>
        )}
        <footer className="status-bar">
          <span>
            <span
              className={`status-dot ${workspace.settings.capture ? "live" : ""}`}
            />
            {workspace.settings.capture
              ? "Capturing clipboard"
              : "Capture paused"}
            <button onClick={() => setSettings(true)}>Privacy controls</button>
          </span>
          <span>{saveState}</span>
        </footer>
      </div>
      {(settings || help) && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              settings ? "Settings and privacy" : "Keyboard shortcuts"
            }
          >
            <div className="modal-heading">
              <div>
                <h2>
                  {settings
                    ? "Make space, your way."
                    : "A few useful shortcuts"}
                </h2>
                <p>
                  {settings
                    ? "Local by default. You decide what stays."
                    : "Keep your hands where your ideas happen."}
                </p>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => {
                  setSettings(false);
                  setHelp(false);
                }}
              >
                <X size={20} />
              </button>
            </div>
            {error && (
              <p className="dialog-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="dialog-notice" role="status">
                {notice}
              </p>
            )}
            {help ? (
              <div className="shortcut-list">
                {[
                  ["Alt + X", "Show / hide quick access"],
                  ["Ctrl + Alt + C", "Capture into the active note"],
                  ["Ctrl + Alt + O", "Show SnapNote"],
                  ["Ctrl + K", "Search clips"],
                  ["Ctrl + B / I / U", "Format note text"],
                  ["Ctrl + Shift + X", "Strikethrough"],
                  ["Ctrl + Shift + H", "Highlight"],
                  ["Ctrl + Z", "Undo in notes"],
                  ["Ctrl + Shift + Z", "Redo in notes"],
                  ["Escape", "Close current panel"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <kbd>{key}</kbd>
                  </div>
                ))}
                <p className="muted">
                  On macOS, use Command in place of Ctrl. Global shortcuts can
                  be reserved by another app; conflicts appear in the workspace.
                </p>
              </div>
            ) : (
              <>
                <div className="settings-section">
                  <h3>Clipboard & privacy</h3>
                  <label className="setting-row">
                    <span>
                      <strong>Automatic clipboard history</strong>
                      <small>
                        Capture supported text and images while SnapNote runs.
                        Pause before copying sensitive content.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!native}
                      checked={workspace.settings.capture}
                      onChange={(e) =>
                        mutate((w) => ({
                          ...w,
                          settings: {
                            ...w.settings,
                            capture: e.target.checked,
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="setting-row">
                    <span>
                      <strong>History limit</strong>
                      <small>
                        Favorites, snippets, and grouped clips are retained.
                      </small>
                    </span>
                    <select
                      aria-label="History limit"
                      value={workspace.settings.historyLimit}
                      onChange={(e) =>
                        mutate((w) => ({
                          ...w,
                          settings: {
                            ...w.settings,
                            historyLimit: Number(e.target.value),
                          },
                        }))
                      }
                    >
                      {[50, 100, 200, 500, 1000, 2000].map((n) => (
                        <option key={n} value={n}>
                          {n} clips
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="setting-row">
                    <span>
                      <strong>Float above other apps</strong>
                      <small>Keep the workspace within reach.</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={floating}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        void run(async () => {
                          await invoke("set_floating", {
                            enabled: enabled || quick,
                          });
                          setFloating(enabled);
                        });
                      }}
                    />
                  </label>
                  <div className="privacy-note">
                    <ShieldCheck size={18} />
                    <p>
                      Workspace data stays in this app’s local device profile.
                      There is no sync connection or telemetry.{" "}
                      {encryptedWorkspace
                        ? "Your live workspace is password encrypted on disk. Lock it to stop capture and hide its contents."
                        : "Enable password encryption below to protect local notes and clips at rest."}{" "}
                      Exported backups can be separately password encrypted.
                    </p>
                  </div>
                </div>
                <div className="settings-section">
                  <h3>
                    {encryptedWorkspace
                      ? "Encrypted workspace"
                      : "Protect local storage"}
                  </h3>
                  {encryptedWorkspace ? (
                    <button
                      className="button"
                      onClick={() =>
                        void run(async () => {
                          locking.current = true;
                          try {
                            if (native) {
                              await invoke("configure_capture", {
                                enabled: false,
                              });
                              await invoke("close_pinned_images");
                            }
                            await saveWorkspace(latest.current!);
                            await lockWorkspace();
                            setWorkspace(null);
                            setLocked(true);
                            setSettings(false);
                            setSelectedId(null);
                            setChecked([]);
                            setCapture(null);
                            setEditingImage(null);
                            setError("");
                            setPassword("");
                          } catch (e) {
                            locking.current = false;
                            if (native)
                              await invoke("configure_capture", {
                                enabled: Boolean(
                                  latest.current?.settings.capture,
                                ),
                              });
                            throw e;
                          }
                        })
                      }
                    >
                      <ShieldCheck size={15} /> Lock workspace now
                    </button>
                  ) : (
                    <>
                      <p className="muted">
                        Encrypt notes, clips, images, and organization with
                        AES-256-GCM. You’ll need the password each time you open
                        SnapNote. The password cannot be recovered. After
                        encryption succeeds, preserved plaintext copies from the
                        old app are removed.
                      </p>
                      <label className="field-label">
                        NEW WORKSPACE PASSWORD
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={vaultPassword}
                          onChange={(e) => setVaultPassword(e.target.value)}
                          placeholder="At least 10 characters"
                        />
                      </label>
                      <label className="field-label">
                        CONFIRM WORKSPACE PASSWORD
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={vaultConfirmation}
                          onChange={(e) => setVaultConfirmation(e.target.value)}
                          placeholder="Repeat the workspace password"
                        />
                      </label>
                      <button
                        className="button"
                        disabled={backupBusy}
                        onClick={() =>
                          void run(async () => {
                            if (vaultPassword !== vaultConfirmation)
                              throw new Error(
                                "The workspace passwords do not match.",
                              );
                            if (
                              !window.confirm(
                                "Encrypt this workspace and remove the old plaintext note copies after saving? Keep the password and a backup; there is no password recovery.",
                              )
                            )
                              return;
                            setBackupBusy(true);
                            try {
                              await enableWorkspaceEncryption(
                                latest.current!,
                                vaultPassword,
                              );
                              setVaultPassword("");
                              setVaultConfirmation("");
                              setNotice(
                                "Your local workspace is now password encrypted.",
                              );
                            } finally {
                              setBackupBusy(false);
                            }
                          })
                        }
                      >
                        <ShieldCheck size={15} />
                        {backupBusy
                          ? "Encrypting…"
                          : "Enable workspace encryption"}
                      </button>
                    </>
                  )}
                </div>
                <div className="settings-section">
                  <h3>Backup & recovery</h3>
                  <p className="muted">
                    Export notes, clips, images, folders, and sessions. Import
                    merges content without replacing existing notes. Keep a
                    backup before clearing data.
                  </p>
                  <label className="field-label">
                    BACKUP PASSWORD (OPTIONAL)
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="10+ characters to encrypt; blank for plain JSON"
                    />
                  </label>
                  <div className="settings-buttons">
                    <button
                      className="button"
                      disabled={backupBusy}
                      onClick={() => void exportBackup()}
                    >
                      <Download size={15} />
                      {backupBusy ? "Preparing…" : "Export backup"}
                    </button>
                    <button
                      className="button"
                      disabled={backupBusy}
                      onClick={() => importRef.current?.click()}
                    >
                      <Upload size={15} /> Import backup
                    </button>
                  </div>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void run(async () => {
                        if (file.size > 200_000_000)
                          throw new Error(
                            "Choose a backup smaller than 200 MB.",
                          );
                        setBackupBusy(true);
                        try {
                          const incoming = await readBackup(
                            await file.text(),
                            password,
                          );
                          // Validate the merged result inside this error boundary, before
                          // scheduling a React update or writing any imported data.
                          const merged = mergeWorkspace(
                            latest.current!,
                            incoming,
                          );
                          setWorkspace(merged);
                          setNotice(
                            "Backup merged. Existing notes were preserved.",
                          );
                        } finally {
                          setBackupBusy(false);
                        }
                      });
                    }}
                  />
                </div>
                <div className="settings-section">
                  <h3>Clear recent history</h3>
                  <p className="muted">
                    Removes unorganized clips. Favorites, snippets, grouped
                    clips, notes, and the original legacy note records are kept.
                  </p>
                  <button
                    className="button danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Clear recent history? Favorites, snippets, grouped clips and notes will be kept.",
                        )
                      ) {
                        mutate((w) => ({
                          ...w,
                          clips: w.clips.filter(protectedClip),
                        }));
                        setChecked([]);
                        setSelectedId(null);
                        setNotice("Recent history cleared.");
                      }
                    }}
                  >
                    <Trash2 size={15} /> Clear recent history
                  </button>
                </div>
                <div className="settings-section">
                  <h3>Window & tray</h3>
                  <p className="muted">
                    SnapNote opens as a small quick-access window; use the icons
                    in the header or "Open workspace" to spread out. Closing the
                    window keeps SnapNote running in the system tray so Alt+X
                    always works. Choose "Quit SnapNote" in the tray menu to
                    exit completely.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {editingImage && (
        <Suspense
          fallback={<div className="modal-backdrop">Opening image editor…</div>}
        >
          <ImageTools
            src={editingImage.data}
            onClose={() => setEditingImage(null)}
            onSave={(data) => {
              if (data.length > 12_000_000) {
                setError(
                  "The edited image exceeds the 8 MB limit. Crop it to a smaller size.",
                );
                return;
              }
              add({ type: "image", data });
              setEditingImage(null);
              setNotice("Edited image saved as a new clip.");
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return new URLSearchParams(location.search).has("pin") ? (
    <PinnedImage />
  ) : (
    <DesktopWorkspace />
  );
}
