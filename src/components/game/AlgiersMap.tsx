import { useEffect, useRef } from 'react';
import { ALGIERS_DISTRICTS, CITY } from '@/game/config';
import type { HudSnapshot, Layout } from '@/game/types';
import { buildRoadRoute } from '@/game/city/route';
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

    // Draw city blocks, parks and their boundaries as distinct map features.
    ctx.fillStyle = '#bcb8ad';
    layout.blocks.forEach((block) => {
      ctx.fillRect(x(block.minX), y(block.maxZ), (block.maxX - block.minX) * scale, (block.maxZ - block.minZ) * scale);
    });
    ctx.strokeStyle = 'rgba(74, 78, 73, 0.42)';
    ctx.lineWidth = 1;
    layout.blocks.forEach((block) => {
      ctx.strokeRect(x(block.minX), y(block.maxZ), (block.maxX - block.minX) * scale, (block.maxZ - block.minZ) * scale);
    });
    ctx.fillStyle = '#8fba83';
    layout.zones.forEach((zone) => {
      ctx.fillRect(x(zone.rect.minX), y(zone.rect.maxZ), (zone.rect.maxX - zone.rect.minX) * scale, (zone.rect.maxZ - zone.rect.minZ) * scale);
      ctx.strokeStyle = 'rgba(53, 111, 66, 0.7)';
      ctx.strokeRect(x(zone.rect.minX), y(zone.rect.maxZ), (zone.rect.maxX - zone.rect.minX) * scale, (zone.rect.maxZ - zone.rect.minZ) * scale);
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

    // Fuel stations and repair shops are visible as service pins on the full map.
    const drawServicePin = (point: { x: number; z: number }, color: string, symbol: string) => {
      const px = x(point.x), py = y(point.z);
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, px, py + 0.5);
      ctx.restore();
    };
    layout.fuelStations.forEach((point) => drawServicePin(point, '#159b69', 'F'));
    layout.repairShops.forEach((point) => drawServicePin(point, '#1677b8', 'R'));

    // Police monitoring zones are shown as translucent blue circles on the full map.
    layout.policeZones.forEach((zone) => {
      const px = x(zone.x), py = y(zone.z);
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.13)';
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    if (state.target) {
      const tx = x(state.target.x), ty = y(state.target.z);
      const bx = x(state.x), by = y(state.z);
      const roadPoints = buildRoadRoute({ x: state.x, z: state.z }, state.target);
      ctx.save();
      // Follow the connected street grid rather than drawing a straight
      // diagonal or arbitrary L across building blocks.
      ctx.strokeStyle = 'rgba(48, 38, 8, 0.78)';
      ctx.lineWidth = 11;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      roadPoints.forEach((point, index) => {
        if (index === 0) ctx.moveTo(x(point.x), y(point.z));
        else ctx.lineTo(x(point.x), y(point.z));
      });
      ctx.stroke();
      ctx.strokeStyle = '#ffc928';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      roadPoints.forEach((point, index) => {
        if (index === 0) ctx.moveTo(x(point.x), y(point.z));
        else ctx.lineTo(x(point.x), y(point.z));
      });
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
        ctx.fillStyle = '#ffe17a';
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

    // Keep venue pins visible while preventing nearby labels from stacking
    // over one another. Pins remain even when a dense area has no label space.
    const placedLabels: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    layout.venues.forEach((venue) => {
      const vx = x(venue.x), vy = y(venue.z);
      if (vx < PAD || vx > SIZE - PAD || vy < PAD || vy > SIZE - PAD) return;
      ctx.beginPath();
      ctx.arc(vx, vy, 6, 0, Math.PI * 2);
      ctx.fillStyle = venue.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      const label = venue.name.length > 18 ? venue.name.slice(0, 17) + '…' : venue.name;
      ctx.save();
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const labelWidth = ctx.measureText(label).width;
      const boxWidth = labelWidth + 7;
      const boxHeight = 14;
      const candidates = [
        { left: vx + 9, top: vy - 7 },
        { left: vx - boxWidth - 9, top: vy - 7 },
        { left: vx - boxWidth / 2, top: vy - 22 },
        { left: vx - boxWidth / 2, top: vy + 9 },
      ];
      const placement = candidates.find(({ left, top }) => {
        const right = left + boxWidth;
        const bottom = top + boxHeight;
        const inside = left >= PAD && top >= PAD && right <= SIZE - PAD && bottom <= SIZE - PAD;
        const overlaps = placedLabels.some((placed) =>
          left < placed.right + 4 && right + 4 > placed.left &&
          top < placed.bottom + 3 && bottom + 3 > placed.top
        );
        return inside && !overlaps;
      });

      if (placement) {
        const rect = {
          left: placement.left,
          top: placement.top,
          right: placement.left + boxWidth,
          bottom: placement.top + boxHeight,
        };
        placedLabels.push(rect);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.roundRect(rect.left, rect.top, boxWidth, boxHeight, 4);
        ctx.fill();
        ctx.fillStyle = '#24332c';
        ctx.fillText(label, rect.left + 3, rect.top + boxHeight / 2);
      }
      ctx.restore();
    });

    // Subtle north indicator helps orient the full-screen map.
    ctx.save();
    ctx.translate(SIZE - 38, PAD + 22);
    ctx.fillStyle = '#344b43';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -10);
    ctx.beginPath();
    ctx.moveTo(0, -3); ctx.lineTo(8, 13); ctx.lineTo(0, 9); ctx.lineTo(-8, 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

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
          <p className="text-xs text-slate-300">خريطة عالم اللعبة · المسار الأصفر والوجهة الحمراء</p>
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
            <p className="mt-1 text-sm text-slate-300">{state.target ? 'اتبع المسار الأصفر حتى العلامة الحمراء' : 'لا يوجد طلب نشط حالياً'}</p>
          </div>
          {ALGIERS_DISTRICTS.map((district, i) => (
            <div key={district} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
              <span className="mr-2 text-sky-300">{String(i + 1).padStart(2, '0')}</span>{district}
            </div>
          ))}
        </aside>
      </div>
      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-xs font-bold text-slate-200">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-sky-500" /> دراجتك</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-red-500" /> الوجهة</span>\n        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-dashed border-blue-500 bg-blue-500/20" /> مناطق مراقبة الشرطة</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-orange-700" /> مطاعم ونقاط تسليم</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#8fba83]" /> حدائق ومساحات خضراء</span>\n        <span className="flex items-center gap-2"><i className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white">F</i> محطة وقود</span>\n        <span className="flex items-center gap-2"><i className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-700 text-[9px] text-white">R</i> ورشة إصلاح</span>
      </footer>
    </div>
  );
}
