import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

export default function CropImageModal({ open, onClose, imageUrl, shape = "banner", onConfirm }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  useEffect(() => {
    if (open) { setScale(1); setOffset({ x: 0, y: 0 }); }
  }, [open, imageUrl]);

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

  const handleConfirm = () => {
    onConfirm({ imageUrl, scale, offsetX: offset.x, offsetY: offset.y });
    onClose();
  };

  const isCircle = shape === "circle";
  const containerStyle = isCircle
    ? { width: 200, height: 200, borderRadius: "50%" }
    : { width: "100%", height: 160 };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-space text-sm">
            {isCircle ? "Ajustar foto de perfil" : "Ajustar banner"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          Arraste para reposicionar. Use os botões para ajustar o zoom.
        </p>

        {/* Preview crop area */}
        <div className="flex justify-center">
          <div
            ref={containerRef}
            style={containerStyle}
            className="overflow-hidden bg-secondary relative cursor-grab active:cursor-grabbing select-none mx-auto"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="crop preview"
                draggable={false}
                style={{
                  position: "absolute",
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: "center center",
                  maxWidth: "none",
                  width: "100%",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setScale((s) => Math.min(3, s + 0.1))}
          >
            <ZoomIn className="w-3.5 h-3.5" />
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