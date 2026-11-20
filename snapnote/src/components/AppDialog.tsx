import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  FolderPlus,
  Info,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

export type DialogIcon = "folder" | "edit" | "delete" | "warning" | "info";

export interface PromptOptions {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  icon?: DialogIcon;
}

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  icon?: DialogIcon;
}

export interface AlertOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  icon?: DialogIcon;
}

type PendingDialog =
  | {
      kind: "prompt";
      options: PromptOptions;
      resolve: (value: string | null) => void;
    }
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (confirmed: boolean) => void;
    }
  | {
      kind: "alert";
      options: AlertOptions;
      resolve: () => void;
    };

function renderIcon(icon?: DialogIcon): ReactNode {
  switch (icon) {
    case "folder":
      return <FolderPlus size={18} />;
    case "edit":
      return <Pencil size={18} />;
    case "delete":
      return <Trash2 size={18} />;
    case "warning":
      return <AlertTriangle size={18} />;
    default:
      return <Info size={18} />;
  }
}

export function useAppDialog() {
  const [dialog, setDialog] = useState<PendingDialog | null>(null);
  const [inputValue, setInputValue] = useState("");
  const pendingRef = useRef<PendingDialog | null>(null);
  pendingRef.current = dialog;

  const dismissCurrent = useCallback(() => {
    const active = pendingRef.current;
    if (!active) return;
    setDialog(null);
    if (active.kind === "prompt") active.resolve(null);
    else if (active.kind === "confirm") active.resolve(false);
    else active.resolve();
  }, []);

  const prompt = useCallback(
    (options: PromptOptions) => {
      if (pendingRef.current) dismissCurrent();
      setInputValue(options.defaultValue ?? "");
      return new Promise<string | null>((resolve) => {
        setDialog({ kind: "prompt", options, resolve });
      });
    },
    [dismissCurrent],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) => {
      if (pendingRef.current) dismissCurrent();
      return new Promise<boolean>((resolve) => {
        setDialog({ kind: "confirm", options, resolve });
      });
    },
    [dismissCurrent],
  );

  const alert = useCallback(
    (options: AlertOptions) => {
      if (pendingRef.current) dismissCurrent();
      return new Promise<void>((resolve) => {
        setDialog({ kind: "alert", options, resolve });
      });
    },
    [dismissCurrent],
  );

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismissCurrent();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [dialog, dismissCurrent]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const active = pendingRef.current;
    if (!active) return;
    setDialog(null);
    if (active.kind === "prompt") active.resolve(inputValue);
    else if (active.kind === "confirm") active.resolve(true);
    else active.resolve();
  };

  const dialogNode = dialog ? (
    <div
      className="app-dialog-backdrop"
      onClick={dismissCurrent}
      role="presentation"
    >
      <form
        className="app-dialog"
        role={dialog.kind === "prompt" ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="app-dialog-header">
          <div className="app-dialog-title-group">
            <span
              className={`app-dialog-icon ${
                dialog.kind !== "prompt" && dialog.options.tone === "danger"
                  ? "danger"
                  : ""
              }`}
              aria-hidden="true"
            >
              {renderIcon(dialog.options.icon)}
            </span>
            <div>
              <h2 id="app-dialog-title">{dialog.options.title}</h2>
              {dialog.options.description && (
                <p className="app-dialog-description">
                  {dialog.options.description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={dismissCurrent}
          >
            <X size={17} />
          </button>
        </div>

        {dialog.kind === "prompt" && (
          <label className="app-dialog-field">
            {dialog.options.label && (
              <span className="app-dialog-label">{dialog.options.label}</span>
            )}
            <input
              autoFocus
              data-dialog-input
              type="text"
              value={inputValue}
              maxLength={dialog.options.maxLength ?? 100}
              placeholder={dialog.options.placeholder}
              onChange={(event) => setInputValue(event.target.value)}
            />
          </label>
        )}

        <div className="app-dialog-actions">
          {dialog.kind !== "alert" && (
            <button
              type="button"
              data-dialog-cancel
              className="button"
              onClick={dismissCurrent}
            >
              {dialog.options.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            type="submit"
            data-dialog-confirm
            autoFocus={dialog.kind !== "prompt"}
            className={`button ${
              dialog.kind !== "prompt" && dialog.options.tone === "danger"
                ? "danger-solid"
                : "primary"
            }`}
          >
            {dialog.options.confirmLabel ??
              (dialog.kind === "prompt"
                ? "Save"
                : dialog.kind === "confirm"
                  ? "Confirm"
                  : "OK")}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return {
    isOpen: dialog !== null,
    prompt,
    confirm,
    alert,
    dialogNode,
  };
}
