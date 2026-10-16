import { useEffect, useRef, useState } from "react";
import { Crop, Pencil, RotateCcw, Save, X } from "lucide-react";

export default function ImageTools({
  src,
  onSave,
  onClose,
}: {
  src: string;
  onSave: (data: string) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const base = useRef<ImageData | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"draw" | "crop">("draw");
  const [color, setColor] = useState("#ef4444");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled || !canvas.current) return;
      const scale = Math.min(1, 4096 / Math.max(img.width, img.height));
      const c = canvas.current;
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      base.current = ctx.getImageData(0, 0, c.width, c.height);
      setReady(true);
    };
    img.onerror = () => setError("This image could not be opened.");
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          e.currentTarget.width,
          ((e.clientX - rect.left) * e.currentTarget.width) / rect.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          e.currentTarget.height,
          ((e.clientY - rect.top) * e.currentTarget.height) / rect.height,
        ),
      ),
    };
  };
  const crop = () => {
    const c = canvas.current,
      rect = cropRect;
    if (!c || !rect || rect.width < 2 || rect.height < 2) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const image = ctx.getImageData(
      Math.floor(rect.x),
      Math.floor(rect.y),
      Math.floor(rect.width),
      Math.floor(rect.height),
    );
    c.width = image.width;
    c.height = image.height;
    ctx.putImageData(image, 0, 0);
    setCropRect(null);
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal image-tools"
        role="dialog"
        aria-modal="true"
        aria-label="Edit image"
      >
        <div className="modal-heading">
          <div>
            <h2>Edit image</h2>
            <p>Save creates a new clip and keeps the original.</p>
          </div>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close image editor"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="image-tools-bar">
          <button
            className={mode === "draw" ? "button primary" : "button"}
            onClick={() => {
              setMode("draw");
              setCropRect(null);
            }}
          >
            <Pencil size={15} /> Draw
          </button>
          <button
            className={mode === "crop" ? "button primary" : "button"}
            onClick={() => setMode("crop")}
          >
            <Crop size={15} /> Crop
          </button>
          <input
            type="color"
            aria-label="Annotation color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          {cropRect && (
            <button className="button" onClick={crop}>
              Apply crop
            </button>
          )}
          <button
            className="button"
            onClick={() => {
              const c = canvas.current;
              if (c && base.current) {
                c.width = base.current.width;
                c.height = base.current.height;
                c.getContext("2d")?.putImageData(base.current, 0, 0);
                setCropRect(null);
              }
            }}
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>
        <div className="canvas-wrap">
          <div className="canvas-stage">
            <canvas
              ref={canvas}
              aria-label="Image canvas: drag to draw or select a crop"
              onPointerDown={(e) => {
                if (!ready) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                start.current = point(e);
                last.current = start.current;
                if (mode === "crop") setCropRect(null);
              }}
              onPointerMove={(e) => {
                if (!start.current) return;
                const p = point(e),
                  ctx = e.currentTarget.getContext("2d");
                if (mode === "draw" && ctx && last.current) {
                  ctx.beginPath();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = Math.max(3, e.currentTarget.width / 200);
                  ctx.lineCap = "round";
                  ctx.moveTo(last.current.x, last.current.y);
                  ctx.lineTo(p.x, p.y);
                  ctx.stroke();
                  last.current = p;
                } else
                  setCropRect({
                    x: Math.min(start.current.x, p.x),
                    y: Math.min(start.current.y, p.y),
                    width: Math.abs(p.x - start.current.x),
                    height: Math.abs(p.y - start.current.y),
                  });
              }}
              onPointerUp={() => {
                start.current = null;
                last.current = null;
              }}
              onPointerCancel={() => {
                start.current = null;
                last.current = null;
              }}
            />
            {cropRect && canvas.current && (
              <div
                className="crop-selection"
                style={{
                  left: `${(cropRect.x / canvas.current.width) * 100}%`,
                  top: `${(cropRect.y / canvas.current.height) * 100}%`,
                  width: `${(cropRect.width / canvas.current.width) * 100}%`,
                  height: `${(cropRect.height / canvas.current.height) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        <p className="muted">
          Images larger than 4096 pixels are resized for editing. Drag on the
          image to {mode === "draw" ? "annotate" : "select a crop"}.
        </p>
        <button
          disabled={!ready}
          className="button primary"
          onClick={() => {
            const data = canvas.current?.toDataURL("image/png");
            if (data && data.length > 12_000_000)
              setError(
                "The edited image exceeds the 8 MB limit. Crop it to a smaller size.",
              );
            else if (data) onSave(data);
          }}
        >
          <Save size={16} /> Save as new clip
        </button>
      </section>
    </div>
  );
}
