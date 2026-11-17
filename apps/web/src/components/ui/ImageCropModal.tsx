import React from 'react';
import { Button } from '@qvanta/ui';

const VIEWPORT = 288;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  busy?: boolean;
  onCancel: () => void;
  /** Receives the cropped square image as a data URL. */
  onConfirm: (dataUrl: string) => void | Promise<void>;
}

interface Offset {
  x: number;
  y: number;
}

/**
 * Square photo cropper. The user can zoom and drag the image inside the
 * viewport; on save the visible region is redrawn onto a canvas at a fixed
 * output size, so the stored image is already cropped and needs no server-side
 * processing.
 */
const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  file,
  busy = false,
  onCancel,
  onConfirm,
}) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState<Offset>({ x: 0, y: 0 });

  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const dragRef = React.useRef<{ startX: number; startY: number; origin: Offset } | null>(null);

  /** Display pixels per source pixel at the current zoom. */
  const coverScale = natural ? VIEWPORT / Math.min(natural.w, natural.h) : 1;
  const scale = coverScale * zoom;
  const displayW = natural ? natural.w * scale : 0;
  const displayH = natural ? natural.h * scale : 0;

  const clamp = React.useCallback(
    (next: Offset, w: number, h: number): Offset => ({
      x: Math.min(0, Math.max(VIEWPORT - w, next.x)),
      y: Math.min(0, Math.max(VIEWPORT - h, next.y)),
    }),
    []
  );

  // Load the picked file into an object URL and reset the transform.
  React.useEffect(() => {
    if (!open || !file) {
      setImageUrl(null);
      setNatural(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setNatural({ w: naturalWidth, h: naturalHeight });

    const cover = VIEWPORT / Math.min(naturalWidth, naturalHeight);
    const w = naturalWidth * cover;
    const h = naturalHeight * cover;
    setOffset({ x: (VIEWPORT - w) / 2, y: (VIEWPORT - h) / 2 });
  };

  // Re-centre the image whenever the zoom changes so it never escapes the box.
  React.useEffect(() => {
    if (!natural) return;
    setOffset((current) => clamp(current, displayW, displayH));
  }, [zoom, natural, displayW, displayH, clamp]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !natural) return;
    const next = {
      x: drag.origin.x + (event.clientX - drag.startX),
      y: drag.origin.y + (event.clientY - drag.startY),
    };
    setOffset(clamp(next, displayW, displayH));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    const image = imageRef.current;
    if (!image || !natural) return;

    const sourceSize = VIEWPORT / scale;
    const sourceX = -offset.x / scale;
    const sourceY = -offset.y / scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    await onConfirm(canvas.toDataURL('image/jpeg', 0.9));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Adjust your profile photo"
    >
      <div className="w-full max-w-sm rounded-2xl border border-bg-800 bg-bg-900 p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-text-100">Adjust your photo</h2>
        <p className="mt-1 text-xs text-text-500">Drag to reposition · zoom to frame your face.</p>

        <div
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-2xl border border-bg-700 bg-bg-950 select-none"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: natural ? 'grab' : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Selected profile photo"
              draggable={false}
              onLoad={handleImageLoad}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: displayW || undefined,
                height: displayH || undefined,
                left: offset.x,
                top: offset.y,
              }}
            />
          )}
          {/* Circular guide so the crop reads as an avatar. */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
          <div className="pointer-events-none absolute inset-[8%] rounded-full ring-2 ring-white/25" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-text-400">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-bg-700 accent-primary-500"
            aria-label="Zoom"
            disabled={!natural || busy}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleConfirm()} loading={busy} disabled={!natural}>
            Save photo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
