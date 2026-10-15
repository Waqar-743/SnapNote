import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import Highlight from "@tiptap/extension-highlight";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
  ScanSearch,
  Plus,
  X,
  Copy,
} from "lucide-react";
import { id, plainText, type Note, type ClipboardPayload } from "../workspace";

// The original TipTap image view and extension factory are retained here.
const readFileAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image data."));
    reader.readAsDataURL(file);
  });

const readUrlAsDataUrl = async (src: string) => {
  const response = await fetch(src);
  const blob = await response.blob();
  return readFileAsDataUrl(blob);
};

const OCRImageNode = (props: NodeViewProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleExtract = async () => {
    const currentSrc = String(props.node.attrs.src ?? "");
    if (!currentSrc || isExtracting) return;

    try {
      setIsExtracting(true);
      setError("");
      const base64Data = currentSrc.startsWith("data:image")
        ? currentSrc
        : await readUrlAsDataUrl(currentSrc);
      const extracted = await invoke<string>("extract_text_from_image", {
        base64Data,
      });
      const position =
        typeof props.getPos === "function" ? props.getPos() : null;

      if (typeof position === "number") {
        props.editor
          .chain()
          .focus()
          .insertContentAt(position + props.node.nodeSize, {
            type: "paragraph",
            content: [
              { type: "text", text: extracted || "(No text detected)" },
            ],
          })
          .run();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <NodeViewWrapper className="image-node-block">
      <img
        src={String(props.node.attrs.src ?? "")}
        alt="Pasted"
        className="note-image"
      />
      <button type="button" onClick={handleExtract} className="ocr-button">
        <ScanSearch size={14} />
        {isExtracting ? "Extracting..." : "Extract Text"}
      </button>
      {error && (
        <p role="alert" className="image-error">
          {error}
        </p>
      )}
    </NodeViewWrapper>
  );
};

const OCRImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(OCRImageNode);
  },
});

/* ── Reusable editor extensions factory ─────────────── */
const makeExtensions = () => [
  StarterKit.configure({
    horizontalRule: { HTMLAttributes: { class: "editor-hr" } },
    link: { openOnClick: false, autolink: false },
  }),
  OCRImage.configure({ allowBase64: true }),
  Highlight.configure({ multicolor: false }),
  Placeholder.configure({ placeholder: "Start typing your note…" }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

export function insertPayload(editor: Editor, payload: ClipboardPayload) {
  if (payload.type === "image")
    return editor.chain().focus("end").setImage({ src: payload.data }).run();
  else {
    const content = payload.data
      .split("\n")
      .flatMap((line, index) => [
        ...(index ? [{ type: "hardBreak" }] : []),
        ...(line ? [{ type: "text", text: line }] : []),
      ]);
    return editor
      .chain()
      .focus("end")
      .insertContent({ type: "paragraph", content })
      .run();
  }
}

function NoteEditor({
  note,
  onChange,
  capture,
  onClip,
  onCaptureConsumed,
}: {
  note: Note;
  onChange: (html: string) => void;
  capture: { nonce: string; payload: ClipboardPayload } | null;
  onClip: (payload: ClipboardPayload) => void;
  onCaptureConsumed: () => void;
}) {
  const consumed = useRef<string | null>(null);
  const editor = useEditor({
    extensions: makeExtensions(),
    content: note.content,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: "tiptap-editor note-content" },
      handlePaste: (_view, event) => {
        const image = Array.from(event.clipboardData?.items ?? [])
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        const html = event.clipboardData?.getData("text/html") ?? "";
        const pastedDocument = html
          ? new DOMParser().parseFromString(html, "text/html")
          : null;
        const imageOnlyHtml = Boolean(
          pastedDocument?.querySelector("img") &&
          !pastedDocument.body.textContent?.trim(),
        );
        if (!image && !(imageOnlyHtml && isTauri())) return false;
        event.preventDefault();
        if (image && image.size > 8_000_000) {
          window.alert("Choose an image smaller than 8 MB.");
          return true;
        }
        // WebKit may supply image-only HTML with a webkit-fake-url rather than a File.
        // Resolve that clipboard bitmap natively before it becomes a transient note URL.
        const imageData = image
          ? readFileAsDataUrl(image)
          : invoke<ClipboardPayload>("read_clipboard").then((payload) => {
              if (payload.type !== "image")
                throw new Error(
                  "Copy the image again before pasting it into the note.",
                );
              return payload.data;
            });
        void imageData
          .then((data) => {
            if (editor && !editor.isDestroyed)
              editor.chain().focus().setImage({ src: data }).run();
          })
          .catch((error) =>
            window.alert(
              error instanceof Error ? error.message : String(error),
            ),
          );
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => {
    if (!editor || !capture) return;
    let active = true;
    const deliver = () => {
      if (
        !active ||
        !editor.isInitialized ||
        editor.isDestroyed ||
        consumed.current === capture.nonce
      )
        return;
      if (insertPayload(editor, capture.payload)) {
        consumed.current = capture.nonce;
        onCaptureConsumed();
      }
    };
    // TipTap sets isInitialized immediately after its create event.
    const created = () => queueMicrotask(deliver);
    editor.on("create", created);
    queueMicrotask(deliver);
    return () => {
      active = false;
      editor.off("create", created);
    };
  }, [editor, capture, onCaptureConsumed]);
  if (!editor) return null;
  const tools = [
    {
      label: "Bold",
      icon: Bold,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: UnderlineIcon,
      active: editor.isActive("underline"),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: editor.isActive("strike"),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Highlight",
      icon: Highlighter,
      active: editor.isActive("highlight"),
      run: () => editor.chain().focus().toggleHighlight().run(),
    },
    ...([1, 2, 3] as const).map((level, i) => ({
      label: `Heading ${level}`,
      icon: [Heading1, Heading2, Heading3][i],
      active: editor.isActive("heading", { level }),
      run: () => editor.chain().focus().toggleHeading({ level }).run(),
    })),
    {
      label: "Bullet list",
      icon: List,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Ordered list",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Task list",
      icon: ListTodo,
      active: editor.isActive("taskList"),
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "Blockquote",
      icon: Quote,
      active: editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Inline code",
      icon: Code,
      active: editor.isActive("code"),
      run: () => editor.chain().focus().toggleCode().run(),
    },
    {
      label: "Code block",
      icon: Code,
      active: editor.isActive("codeBlock"),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Horizontal rule",
      icon: Minus,
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      label: "Undo",
      icon: Undo2,
      run: () => editor.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      icon: Redo2,
      run: () => editor.chain().focus().redo().run(),
    },
  ];
  return (
    <>
      <div className="note-toolbar" role="toolbar" aria-label="Note formatting">
        {tools.map((t) => (
          <button
            key={t.label}
            className={`icon-button ${t.active ? "active" : ""}`}
            title={t.label}
            aria-label={t.label}
            aria-pressed={Boolean(t.active)}
            onClick={t.run}
          >
            <t.icon size={16} />
          </button>
        ))}
        <button
          className="text-button"
          disabled={!editor.getText().length}
          onClick={() =>
            onClip({
              type: "text",
              data: editor.getText({ blockSeparator: "\n" }),
            })
          }
        >
          <Copy size={14} /> Save text as clip
        </button>
      </div>
      <div className="note-paper">
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

export default function NotesWorkspace({
  notes,
  activeId,
  onNotesChange,
  onSelect,
  capture,
  onClip,
  onCaptureConsumed,
}: {
  notes: Note[];
  activeId: string;
  onNotesChange: (notes: Note[]) => void;
  onSelect: (id: string) => void;
  capture: { nonce: string; payload: ClipboardPayload } | null;
  onClip: (payload: ClipboardPayload) => void;
  onCaptureConsumed: () => void;
}) {
  const active = notes.find((n) => n.id === activeId) ?? notes[0];
  const [renaming, setRenaming] = useState<string | null>(null);
  const [noteQuery, setNoteQuery] = useState("");
  const filteredNotes = notes.filter((n) =>
    `${n.title} ${plainText(n.content)}`
      .toLocaleLowerCase()
      .includes(noteQuery.toLocaleLowerCase()),
  );
  const add = () => {
    const note = { id: id(), title: "Untitled", content: "" };
    onNotesChange([...notes, note]);
    onSelect(note.id);
  };
  const close = (note: Note) => {
    if (notes.length === 1) return;
    if (
      note.content &&
      !window.confirm(
        `Close and delete “${note.title}”? Export a backup first if you need this note.`,
      )
    )
      return;
    const next = notes.filter((n) => n.id !== note.id);
    onNotesChange(next);
    if (note.id === activeId) onSelect(next[0].id);
  };
  return (
    <section className="notes-workspace">
      <label className="note-search">
        <span>Find a note</span>
        <input
          aria-label="Search notes"
          placeholder="Search titles and note text…"
          value={noteQuery}
          onChange={(e) => setNoteQuery(e.target.value)}
        />
        <small>{filteredNotes.length} notes</small>
      </label>
      <div className="note-tabs" role="tablist" aria-label="Notes">
        {filteredNotes.map((note) => (
          <div
            className={`note-tab ${note.id === active.id ? "active" : ""}`}
            key={note.id}
          >
            {renaming === note.id ? (
              <input
                autoFocus
                aria-label="Note name"
                defaultValue={note.title}
                onBlur={(e) => {
                  onNotesChange(
                    notes.map((n) =>
                      n.id === note.id
                        ? { ...n, title: e.target.value.trim() || "Untitled" }
                        : n,
                    ),
                  );
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button
                role="tab"
                aria-selected={note.id === active.id}
                onClick={() => onSelect(note.id)}
                onDoubleClick={() => setRenaming(note.id)}
              >
                {note.title}
              </button>
            )}
            <button
              className="icon-button small"
              title="Rename note"
              aria-label={`Rename ${note.title}`}
              onClick={() => setRenaming(note.id)}
            >
              ✎
            </button>
            {notes.length > 1 && (
              <button
                className="icon-button small"
                aria-label={`Close ${note.title}`}
                onClick={() => close(note)}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          className="icon-button"
          title="New note"
          aria-label="New note"
          onClick={add}
        >
          <Plus size={17} />
        </button>
      </div>
      <NoteEditor
        key={active.id}
        note={active}
        onChange={(content) =>
          onNotesChange(
            notes.map((n) => (n.id === active.id ? { ...n, content } : n)),
          )
        }
        capture={capture}
        onClip={onClip}
        onCaptureConsumed={onCaptureConsumed}
      />
    </section>
  );
}
