import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check, X, RotateCcw } from "lucide-react";

// Banner: proporção 4:1 (igual ao perfil)
const BANNER_ASPECT = 4; // width / height
const CIRCLE_SIZE = 200;

export default function CropImageModal({ open, onClose, imageUrl, shape = "banner", onConfirm }) {
  const isCircle = shape === "circle";

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [canvasW, setCanvasW] = useState(480);
  const dragStart = useRef(null);
  const wrapperRef = useRef(null);

  // Recalculate canvas width from wrapper
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (wrapperRef.current) {
        setCanvasW(wrapperRef.current.offsetWidth);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [open]);

  // Crop area dimensions
  const cropW = isCircle ? CIRCLE_SIZE : canvasW;
  const cropH = isCircle ? CIRCLE_SIZE : Math.round(canvasW / BANNER_ASPECT);

  // Canvas total height: crop + vertical padding
  const padV = isCircle ? 40 : 24;
  const padH = isCircle ? 40 : 0;
  const canvasH = cropH + padV * 2;

  // Where the crop window sits inside canvas
  const cropLeft = padH;
  const cropTop = padV;

  // Compute scale to fill the crop area with the image
  function fitScale(nw, nh) {
    if (!nw || !nh || !cropW || !cropH) return 1;
    return Math.max(cropW / nw, cropH / nh);
  }

  // Reset when opening or image changes
  useEffect(() => {
    if (open) {
      setOffset({ x: 0, y: 0 });
      setImgNatural({ w: 0, h: 0 });
    }
  }, [open, imageUrl]);

  // Re-fit scale when canvas or image natural size changes
  useEffect(() => {
    if (imgNatural.w && imgNatural.h && cropW && cropH) {
      setScale(fitScale(imgNatural.w, imgNatural.h));
      setOffset({ x: 0, y: 0 });
    }
  }, [imgNatural.w, imgNatural.h, cropW, cropH]);

  function handleImageLoad(e) {
    setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  }

// Image rendered size
const renderedW = imgNatural.w * scale;
const renderedH = imgNatural.h * scale;

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const maxOffsetX = Math.max(0, (renderedW - cropW) / 2);
const maxOffsetY = Math.max(0, (renderedH - cropH) / 2);

function clampOffset(x, y) {
  return {
    x: clamp(x, -maxOffsetX, maxOffsetX),
    y: clamp(y, -maxOffsetY, maxOffsetY),
  };
}

function changeScale(delta) {
  const baseScale = fitScale(imgNatural.w, imgNatural.h);

  setScale((currentScale) => {
    const minScale = baseScale;
    const maxScale = baseScale * 10;

    const nextScale = Math.min(
      maxScale,
      Math.max(minScale, +(currentScale + delta).toFixed(3))
    );

    const nextRenderedW = imgNatural.w * nextScale;
    const nextRenderedH = imgNatural.h * nextScale;

    const nextMaxOffsetX = Math.max(0, (nextRenderedW - cropW) / 2);
    const nextMaxOffsetY = Math.max(0, (nextRenderedH - cropH) / 2);

    setOffset((currentOffset) => ({
      x: clamp(currentOffset.x, -nextMaxOffsetX, nextMaxOffsetX),
      y: clamp(currentOffset.y, -nextMaxOffsetY, nextMaxOffsetY),
    }));

    return nextScale;
  });
}

  // Drag — mouse
  const onMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
  
    const nextX = e.clientX - dragStart.current.x;
    const nextY = e.clientY - dragStart.current.y;
  
    setOffset(clampOffset(nextX, nextY));
  }, [dragging, maxOffsetX, maxOffsetY]);
  const stopDrag = () => setDragging(false);

  // Drag — touch
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
  };
  const onTouchMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
  
    const t = e.touches[0];
    const nextX = t.clientX - dragStart.current.x;
    const nextY = t.clientY - dragStart.current.y;
  
    setOffset(clampOffset(nextX, nextY));
  }, [dragging, maxOffsetX, maxOffsetY]);

  function handleReset() {
    setScale(fitScale(imgNatural.w, imgNatural.h));
    setOffset({ x: 0, y: 0 });
  }

  function handleConfirm() {
    const baseScale = fitScale(imgNatural.w, imgNatural.h);
    const zoom = baseScale > 0 ? +(scale / baseScale).toFixed(3) : 1;
    const offsetXPct = cropW > 0 ? +((offset.x / cropW) * 100).toFixed(2) : 0;
    const offsetYPct = cropH > 0 ? +((offset.y / cropH) * 100).toFixed(2) : 0;
    onConfirm({ version: 2, zoom: Math.max(1, zoom), offsetXPct, offsetYPct, imageUrl });
    onClose();
  }

  // Image position: centered in canvas + user offset
  const imgLeft = (canvasW - renderedW) / 2 + offset.x;
  const imgTop = (canvasH - renderedH) / 2 + offset.y;

  // Clip image inside crop window: offset relative to crop window origin
  const clipImgLeft = imgLeft - cropLeft;
  const clipImgTop = imgTop - cropTop;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-space text-sm">
            {isCircle ? "Ajustar foto de perfil" : "Ajustar banner"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Arraste para reposicionar dentro da área demarcada. Use o zoom para ajustar.
        </p>

        {/* Measure wrapper — full width */}
        <div ref={wrapperRef} className="w-full">
          {/* Editor canvas */}
          <div
            className="relative overflow-hidden rounded-lg bg-black/70 select-none cursor-grab active:cursor-grabbing mx-auto"
            style={{ width: canvasW, height: canvasH }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={stopDrag}
          >
            {/* Dimmed full image (outside crop area) */}
            {imageUrl && renderedW > 0 && (
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: imgLeft,
                  top: imgTop,
                  width: renderedW,
                  height: renderedH,
                  maxWidth: "none",
                  opacity: 0.3,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            )}

            {/* Crop window — full-brightness image clipped */}
            <div
              style={{
                position: "absolute",
                left: cropLeft,
                top: cropTop,
                width: cropW,
                height: cropH,
                overflow: "hidden",
                borderRadius: isCircle ? "50%" : 6,
                pointerEvents: "none",
              }}
            >
              {imageUrl && renderedW > 0 && (
                <img
                  src={imageUrl}
                  alt="crop preview"
                  draggable={false}
                  onLoad={handleImageLoad}
                  style={{
                    position: "absolute",
                    left: clipImgLeft,
                    top: clipImgTop,
                    width: renderedW,
                    height: renderedH,
                    maxWidth: "none",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              )}
            </div>

            {/* Hidden img just to trigger onLoad when renderedW is still 0 */}
            {imageUrl && renderedW === 0 && (
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={handleImageLoad}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
              />
            )}

            {/* Crop border */}
            <div
              style={{
                position: "absolute",
                left: cropLeft,
                top: cropTop,
                width: cropW,
                height: cropH,
                borderRadius: isCircle ? "50%" : 6,
                border: "2px solid hsl(var(--primary))",
                pointerEvents: "none",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
              }}
            />

            {/* Label */}
            <div
              style={{ position: "absolute", left: cropLeft + 8, top: cropTop + 8, pointerEvents: "none" }}
              className="text-[10px] font-semibold text-primary bg-black/60 px-1.5 py-0.5 rounded"
            >
              {isCircle ? "Área do avatar" : "Área do banner"}
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3 mt-1">
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => changeScale(-0.1)}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => changeScale(0.1)}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" title="Resetar" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex gap-2 mt-1">
          <Button variant="outline" className="flex-1 gap-1.5 text-xs h-8" onClick={onClose}>
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button className="flex-1 gap-1.5 text-xs h-8 bg-primary text-primary-foreground" onClick={handleConfirm}>
            <Check className="w-3.5 h-3.5" /> Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}