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

    // The radar is a local navigation view, not a shrunken copy of the
    // entire 40x40 city. Showing the whole city made each 16m road only ~1px
    // wide on phones, so the result looked like a checkerboard.
    const VIEW_RADIUS = 220;
    const centerX = state.x;
    const centerZ = state.z;
    const view = {
      minX: centerX - VIEW_RADIUS,
      maxX: centerX + VIEW_RADIUS,
      minZ: centerZ - VIEW_RADIUS,
      maxZ: centerZ + VIEW_RADIUS,
    };
    const scale = SIZE / (VIEW_RADIUS * 2);
    const toX = (x: number) => (x - view.minX) * scale;
    const toY = (z: number) => SIZE - (z - view.minZ) * scale;
    const intersects = (rect: Rect) =>
      rect.maxX >= view.minX && rect.minX <= view.maxX &&
      rect.maxZ >= view.minZ && rect.minZ <= view.maxZ;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#dfe7df';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // City blocks and green spaces are drawn first, clipped to the local view.
    ctx.fillStyle = '#b9b5aa';
    for (const block of layout.blocks) {
      if (intersects(block)) drawRect(ctx, block, toX, toY);
    }
    ctx.fillStyle = '#78a96b';
    for (const zone of layout.zones) {
      if (intersects(zone.rect)) drawRect(ctx, zone.rect, toX, toY);
    }

    // Draw properly scaled asphalt bands. At this zoom, roads are wide enough
    // to distinguish from blocks and intersections remain visibly connected.
    const roadHalfPixels = Math.max(5, (CITY.roadWidth * scale) / 2);
    ctx.fillStyle = '#59636b';
    const firstCol = Math.floor(view.minX / CITY.pitch) - 1;
    const lastCol = Math.ceil(view.maxX / CITY.pitch) + 1;
    const firstRow = Math.floor(view.minZ / CITY.pitch) - 1;
    const lastRow = Math.ceil(view.maxZ / CITY.pitch) + 1;
    for (let j = firstRow; j <= lastRow; j++) {
      const py = toY(j * CITY.pitch);
      ctx.fillRect(0, py - roadHalfPixels, SIZE, roadHalfPixels * 2);
    }
    for (let i = firstCol; i <= lastCol; i++) {
      const px = toX(i * CITY.pitch);
      ctx.fillRect(px - roadHalfPixels, 0, roadHalfPixels * 2, SIZE);
    }

    // Center dashes make direction and connected streets easy to read.
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 238, 218, 0.95)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    for (let j = firstRow; j <= lastRow; j++) {
      const py = toY(j * CITY.pitch);
      ctx.moveTo(0, py);
      ctx.lineTo(SIZE, py);
    }
    for (let i = firstCol; i <= lastCol; i++) {
      const px = toX(i * CITY.pitch);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, SIZE);
    }
    ctx.stroke();
    ctx.restore();

    // Sidewalk/building block edges give the radar a recognizable city layout.
    ctx.strokeStyle = 'rgba(75, 82, 76, 0.55)';
    ctx.lineWidth = 1;
    for (const block of layout.blocks) {
      if (!intersects(block)) continue;
      const left = toX(block.minX);
      const top = toY(block.maxZ);
      const width = (block.maxX - block.minX) * scale;
      const height = (block.maxZ - block.minZ) * scale;
      ctx.strokeRect(left, top, width, height);
    }

    if (state.target) {
      const tx = toX(state.target.x);
      const ty = toY(state.target.z);
      if (tx >= 0 && tx <= SIZE && ty >= 0 && ty <= SIZE) {
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
    }

    // Rider stays centered so nearby roads scroll around the bike naturally.
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(state.heading);
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fillStyle = '#1f6fb2';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
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
