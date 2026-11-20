import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const native = isTauri();
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [data-no-drag]';

type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

const RESIZE_HANDLES: ReadonlyArray<{
  direction: ResizeDirection;
  className: string;
}> = [
  { direction: "North", className: "resize-n" },
  { direction: "South", className: "resize-s" },
  { direction: "East", className: "resize-e" },
  { direction: "West", className: "resize-w" },
  { direction: "NorthWest", className: "resize-nw" },
  { direction: "NorthEast", className: "resize-ne" },
  { direction: "SouthWest", className: "resize-sw" },
  { direction: "SouthEast", className: "resize-se" },
];

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function useWindowChrome(onError?: (message: string) => void) {
  const [maximized, setMaximized] = useState(false);
  const lastDragClick = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const errorHandler = useRef(onError);
  errorHandler.current = onError;

  const reportError = useCallback((error: unknown) => {
    errorHandler.current?.(formatError(error));
  }, []);

  const syncMaximized = useCallback(async () => {
    if (!native) return;
    try {
      setMaximized(await getCurrentWindow().isMaximized());
    } catch {
      // Ignore transient query failures during window teardown.
    }
  }, []);

  useEffect(() => {
    if (!native) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void syncMaximized();
    void getCurrentWindow()
      .onResized(() => {
        if (!disposed) void syncMaximized();
      })
      .then((dispose) => {
        if (disposed) dispose();
        else unlisten = dispose;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [syncMaximized]);

  const minimize = useCallback(() => {
    if (!native) return;
    void getCurrentWindow().minimize().catch(reportError);
  }, [reportError]);

  const toggleMaximize = useCallback(() => {
    if (!native) {
      setMaximized((current) => !current);
      return;
    }
    const win = getCurrentWindow();
    void win
      .toggleMaximize()
      .then(() => win.isMaximized())
      .then(setMaximized)
      .catch(reportError);
  }, [reportError]);

  const closeWindow = useCallback(() => {
    if (!native) return;
    void getCurrentWindow().close().catch(reportError);
  }, [reportError]);

  const handleTitleBarMouseDown = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return;

      event.preventDefault();

      const now = Date.now();
      const previous = lastDragClick.current;
      const isDoubleClick =
        event.detail === 2 ||
        (previous !== null &&
          now - previous.time <= 420 &&
          Math.hypot(event.screenX - previous.x, event.screenY - previous.y) <=
            6);

      if (isDoubleClick) {
        lastDragClick.current = null;
        toggleMaximize();
        return;
      }

      lastDragClick.current = {
        time: now,
        x: event.screenX,
        y: event.screenY,
      };
      if (!native) return;
      void getCurrentWindow().startDragging().catch(reportError);
    },
    [reportError, toggleMaximize],
  );

  return {
    maximized,
    setMaximized,
    minimize,
    toggleMaximize,
    closeWindow,
    handleTitleBarMouseDown,
  };
}

function MinimizeGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path
        d="M1 5.5h9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="8"
        height="8"
        rx="1.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function RestoreGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <rect
        x="1.5"
        y="3"
        width="6.5"
        height="6.5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M3.2 3V2.2a1 1 0 0 1 1-1h4.6a1 1 0 0 1 1 1v4.6a1 1 0 0 1-1 1H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path
        d="M2 2l7 7M9 2l-7 7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WindowControls({
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: {
  maximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="window-controls"
      role="group"
      aria-label="Window controls"
      data-no-drag
    >
      <button
        type="button"
        className="window-control"
        aria-label="Minimize window"
        title="Minimize"
        onClick={onMinimize}
      >
        <MinimizeGlyph />
      </button>
      <button
        type="button"
        className="window-control"
        aria-label={maximized ? "Restore window" : "Maximize window"}
        title={maximized ? "Restore" : "Maximize"}
        onClick={onToggleMaximize}
      >
        {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
      </button>
      <button
        type="button"
        className="window-control window-control-close"
        aria-label="Close window"
        title="Close"
        onClick={onClose}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

export function WindowResizeHandles({ maximized }: { maximized: boolean }) {
  if (!native || maximized) return null;

  return (
    <>
      {RESIZE_HANDLES.map(({ direction, className }) => (
        <div
          key={direction}
          className={`window-resize-handle ${className}`}
          aria-hidden="true"
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            void getCurrentWindow()
              .startResizeDragging(direction)
              .catch(() => {});
          }}
        />
      ))}
    </>
  );
}
