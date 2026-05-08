import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check, X, RotateCcw } from "lucide-react";

// Banner aspect ratio shown on profile: ~5:1 (wide strip)
// Avatar: 1:1 circle
const BANNER_RATIO = 5; // width / height
const CROP_W_BANNER = 480;
const CROP_H_BANNER = Math.round(CROP_W_BANNER / BANNER_RATIO); // 96px

const CROP_SIZE_CIRCLE = 200;

export default function CropImageModal({ open, onClose, imageUrl, shape = "banner", onConfirm }) {
  const isCircle = shape === "circle";

  // Crop window dimensions
  const cropW = isCircle ? CROP_SIZE_CIRCLE : CROP_W_BANNER;
  const cropH = isCircle ? CROP_SIZE_CIRCLE : CROP_H_BANNER;

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const dragStart = useRef(null);
  const imgRef = useRef(null);

  // Initial scale: fit image so it fills the crop area
  function computeInitialScale(nw, nh) {
    if (!nw || !nh) return 1;
    const scaleW = cropW / nw;
    const scaleH = cropH / nh;
    return Math.max(scaleW, scaleH);
  }

  useEffect(() => {
    if (open) {
      setOffset({ x: 0, y: 0 });
      setScale(1);
      setImgNaturalSize({ w: 0, h: 0 });
    }
  }, [open, imageUrl]);

  function handleImageLoad(e) {
    const nw = e.target.naturalWidth;
    const nh = e.target.naturalHeight;
    setImgNaturalSize({ w: nw, h: nh });
    const s = computeInitialScale(nw, nh);
    setScale(s);
    setOffset({ x: 0, y: 0 });
  }

  // Drag handlers — mouse
  const onMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [dragging]);
  const onMouseUp = () => setDragging(false);

  // Drag handlers — touch
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
  };
  const onTouchMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
  }, [dragging]);

  function handleConfirm() {
    onConfirm({ imageUrl, scale, offsetX: offset.x, offsetY: offset.y });
    onClose();
  }

  function handleReset() {
    const s = computeInitialScale(imgNaturalSize.w, imgNaturalSize.h);
    setScale(s);
    setOffset({ x: 0, y: 0 });
  }

  // Rendered image size (natural * scale)
  const renderedW = imgNaturalSize.w * scale;
  const renderedH = imgNaturalSize.h * scale;

  // Canvas area — give extra space around the crop window so user can drag freely
  const canvasPad = isCircle ? 60 : 40;
  const canvasW = cropW + canvasPad * 2;
  const canvasH = cropH + canvasPad * 2;

  // Image is positioned so its center aligns with the crop window center + offset
  const imgLeft = (canvasW - renderedW) / 2 + offset.x;
  const imgTop = (canvasH - renderedH) / 2 + offset.y;

  // The crop window sits centered in the canvas
  const cropLeft = canvasPad;
  const cropTop = canvasPad;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-space text-sm">
            {isCircle ? "Ajustar foto de perfil" : "Ajustar banner"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          Arraste a imagem para reposicionar dentro da área demarcada. Use o zoom para ajustar.
        </p>

        {/* Editor canvas */}
        <div
          className="relative mx-auto overflow-hidden rounded-lg bg-black/60 select-none cursor-grab active:cursor-grabbing"
          style={{ width: canvasW, height: canvasH, maxWidth: "100%" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
        >
          {/* Full image, free to move */}
          {imageUrl && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt="crop"
              draggable={false}
              onLoad={handleImageLoad}
              style={{
                position: "absolute",
                left: imgLeft,
                top: imgTop,
                width: renderedW || "auto",
                height: renderedH || "auto",
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
                opacity: 0.45, // dim the area outside crop
              }}
            />
          )}

          {/* Crop window — shows full-brightness image clipped to crop area */}
          <div
            style={{
              position: "absolute",
              left: cropLeft,
              top: cropTop,
              width: cropW,
              height: cropH,
              overflow: "hidden",
              borderRadius: isCircle ? "50%" : "8px",
              pointerEvents: "none",
            }}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="crop preview"
                draggable={false}
                style={{
                  position: "absolute",
                  left: imgLeft - cropLeft,
                  top: imgTop - cropTop,
                  width: renderedW || "auto",
                  height: renderedH || "auto",
                  maxWidth: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Crop border overlay */}
          <div
            style={{
              position: "absolute",
              left: cropLeft,
              top: cropTop,
              width: cropW,
              height: cropH,
              borderRadius: isCircle ? "50%" : "8px",
              border: "2px solid hsl(var(--primary))",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
              pointerEvents: "none",
            }}
          />

          {/* Corner label */}
          <div
            style={{ position: "absolute", left: cropLeft + 6, top: cropTop + 6, pointerEvents: "none" }}
            className="text-[10px] font-semibold text-primary/80 bg-black/50 px-1.5 py-0.5 rounded"
          >
            {isCircle ? "Área do avatar" : "Área do banner"}
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setScale(s => Math.max(0.2, +(s - 0.1).toFixed(2)))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setScale(s => Math.min(5, +(s + 0.1).toFixed(2)))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" title="Resetar" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex gap-2">
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