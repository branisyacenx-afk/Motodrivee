import { useEffect, useRef } from 'react';
import { CITY } from '@/game/config';
import type { HudSnapshot, Layout, Rect } from '@/game/types';

interface MinimapProps {
  layout: Layout;
  state: HudSnapshot['minimap'];
  onOpen: () => void;
  className?: string;
}

const SIZE = 240;
const ROAD_HALF = CITY.roadWidth / 2;

function drawRect(ctx: CanvasRenderingContext2D, rect: Rect, toX: (x: number) => number, toY: (z: number) => number) {
  const x = toX(rect.minX);
  const y = toY(rect.maxZ);
  const w = toX(rect.maxX) - x;
  const h = toY(rect.minZ) - y;
  ctx.fillRect(x, y, w, h);
}

export function Minimap({ layout, state, onOpen, className = '' }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { bounds } = layout;
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
    const scale = SIZE / span;
    const toX = (x: number) => (x - bounds.minX) * scale;
    const toY = (z: number) => SIZE - (z - bounds.minZ) * scale;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#e4e1da';
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = '#c3bfb6';
    for (const block of layout.blocks) drawRect(ctx, block, toX, toY);

    ctx.fillStyle = '#9fc08a';
    for (const zone of layout.zones) drawRect(ctx, zone.rect, toX, toY);

    ctx.fillStyle = '#fbfaf7';
    for (let j = 0; j < CITY.rows; j++) {
      const z = j * CITY.pitch;
      drawRect(ctx, { minX: bounds.minX, maxX: bounds.maxX, minZ: z - ROAD_HALF, maxZ: z + ROAD_HALF }, toX, toY);
    }
    for (let i = 0; i < CITY.cols; i++) {
      const x = i * CITY.pitch;
      drawRect(ctx, { minX: x - ROAD_HALF, maxX: x + ROAD_HALF, minZ: bounds.minZ, maxZ: bounds.maxZ }, toX, toY);
    }

    if (state.target) {
      const tx = toX(state.target.x);
      const ty = toY(state.target.z);
      ctx.beginPath();
      ctx.arc(tx, ty, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(215,38,46,0.22)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#d7262e';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    const bx = toX(state.x);
    const by = toY(state.z);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(state.heading);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fillStyle = '#1f6fb2';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [layout, state]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="فتح الخريطة الكاملة"
      title="اضغط لفتح خريطة المدينة"
      className={`pointer-events-auto block aspect-square overflow-hidden rounded-full border-4 border-white/90 bg-white/90 p-0.5 shadow-2xl ring-1 ring-black/10 backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="block h-full w-full rounded-full"
        aria-hidden="true"
      />
      <span className="sr-only">اضغط لفتح خريطة الجزائر العاصمة والمسار</span>
    </button>
  );
}
