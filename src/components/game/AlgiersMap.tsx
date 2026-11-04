import { useEffect, useRef } from 'react';
import { ALGIERS_DISTRICTS, CITY } from '@/game/config';
import type { HudSnapshot, Layout } from '@/game/types';
import { X, Navigation } from 'lucide-react';

interface AlgiersMapProps {
  layout: Layout;
  state: HudSnapshot['minimap'];
  onClose: () => void;
}

const SIZE = 720;
const PAD = 28;

export function AlgiersMap({ layout, state, onClose }: AlgiersMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { bounds } = layout;
    const spanX = bounds.maxX - bounds.minX;
    const spanZ = bounds.maxZ - bounds.minZ;
    const scale = Math.min((SIZE - PAD * 2) / spanX, (SIZE - PAD * 2) / spanZ);
    const ox = (SIZE - spanX * scale) / 2;
    const oy = (SIZE - spanZ * scale) / 2;
    const x = (v: number) => ox + (v - bounds.minX) * scale;
    const y = (v: number) => SIZE - oy - (v - bounds.minZ) * scale;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#e7e3d8';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const bandWidth = spanX / ALGIERS_DISTRICTS.length;
    ALGIERS_DISTRICTS.forEach((name, i) => {
      const left = x(bounds.minX + i * bandWidth);
      const right = x(bounds.minX + (i + 1) * bandWidth);
      ctx.fillStyle = i % 2 ? '#e5eadf' : '#e9e2d5';
      ctx.fillRect(left, PAD, right - left, SIZE - PAD * 2);
      ctx.fillStyle = '#344b43';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, (left + right) / 2, 25);
    });

    ctx.fillStyle = '#bcb8ad';
    layout.blocks.forEach((block) => {
      ctx.fillRect(x(block.minX), y(block.maxZ), (block.maxX - block.minX) * scale, (block.maxZ - block.minZ) * scale);
    });
    ctx.fillStyle = '#9dbd8b';
    layout.zones.forEach((zone) => {
      ctx.fillRect(x(zone.rect.minX), y(zone.rect.maxZ), (zone.rect.maxX - zone.rect.minX) * scale, (zone.rect.maxZ - zone.rect.minZ) * scale);
    });

    // High-contrast asphalt bands stay legible on narrow mobile screens.
    ctx.strokeStyle = '#66717a';
    ctx.lineWidth = Math.max(5, CITY.roadWidth * scale);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    for (let i = 0; i < CITY.cols; i++) {
      ctx.moveTo(x(i * CITY.pitch), y(bounds.minZ));
      ctx.lineTo(x(i * CITY.pitch), y(bounds.maxZ));
    }
    for (let j = 0; j < CITY.rows; j++) {
      ctx.moveTo(x(bounds.minX), y(j * CITY.pitch));
      ctx.lineTo(x(bounds.maxX), y(j * CITY.pitch));
    }
    ctx.stroke();

    // Subtle dashed center markings visually connect the road network.
    ctx.save();
    ctx.strokeStyle = 'rgba(247, 239, 213, 0.9)';
    ctx.lineWidth = Math.max(1, CITY.roadWidth * scale * 0.1);
    ctx.setLineDash([Math.max(4, CITY.roadWidth * scale * 0.45), Math.max(3, CITY.roadWidth * scale * 0.3)]);
    ctx.beginPath();
    for (let i = 0; i < CITY.cols; i++) {
      ctx.moveTo(x(i * CITY.pitch), y(bounds.minZ));
      ctx.lineTo(x(i * CITY.pitch), y(bounds.maxZ));
    }
    for (let j = 0; j < CITY.rows; j++) {
      ctx.moveTo(x(bounds.minX), y(j * CITY.pitch));
      ctx.lineTo(x(bounds.maxX), y(j * CITY.pitch));
    }
    ctx.stroke();
    ctx.restore();

    if (state.target) {
      const tx = x(state.target.x), ty = y(state.target.z);
      const bx = x(state.x), by = y(state.z);
      const bendX = tx;
      ctx.save();
      ctx.strokeStyle = '#1687e8';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bendX, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      const segments = Math.max(2, Math.floor(Math.hypot(tx - bx, ty - by) / 42));
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const px = bx + (tx - bx) * t;
        const py = by + (ty - by) * t;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(ty - by, tx - bx));
        ctx.fillStyle = '#0878d1';
        ctx.beginPath();
        ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#e33b42'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    }

    const bx = x(state.x), by = y(state.z);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-state.heading);
    ctx.fillStyle = '#0878d1';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(13, 14); ctx.lineTo(0, 7); ctx.lineTo(-13, 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }, [layout, state]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 p-3 text-white backdrop-blur-md sm:p-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 pb-3">
        <div>
          <h2 className="text-xl font-black">خريطة الجزائر العاصمة</h2>
          <p className="text-xs text-slate-300">خريطة عالم اللعبة · المسار الأزرق والوجهة الحمراء</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق الخريطة" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X /></button>
      </header>
      <div className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-3xl bg-[#e7e3d8]">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className="max-h-full w-full object-contain" aria-label="خريطة طرق وأحياء اللعبة" />
        </div>
        <aside className="grid grid-cols-2 gap-2 md:flex md:flex-col">
          <div className="col-span-2 rounded-2xl bg-white/10 p-3">
            <div className="flex items-center gap-2 font-bold"><Navigation className="h-4 w-4 text-sky-400" /> تتبع الوجهة</div>
            <p className="mt-1 text-sm text-slate-300">{state.target ? 'اتبع الأسهم الزرقاء حتى العلامة الحمراء' : 'لا يوجد طلب نشط حالياً'}</p>
          </div>
          {ALGIERS_DISTRICTS.map((district, i) => (
            <div key={district} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
              <span className="mr-2 text-sky-300">{String(i + 1).padStart(2, '0')}</span>{district}
            </div>
          ))}
        </aside>
      </div>
      <footer className="mx-auto flex w-full max-w-5xl items-center justify-center gap-5 pt-3 text-xs font-bold text-slate-200">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-sky-500" /> دراجتك</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-red-500" /> الوجهة</span>
      </footer>
    </div>
  );
}
