import { CITY } from '@/game/config';
import { roadX, roadZ } from '@/game/city/layout';
import type { Vec2 } from '@/game/types';

interface RoadSnap {
  point: Vec2;
  i: number;
  j: number;
}

function gridIndex(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(value / CITY.pitch)));
}

function snapToRoad(p: Vec2): RoadSnap {
  const i = gridIndex(p.x, CITY.cols - 1);
  const j = gridIndex(p.z, CITY.rows - 1);
  const onHorizontal = Math.abs(p.z - roadZ(j)) <= Math.abs(p.x - roadX(i));
  const point = onHorizontal ? { x: p.x, z: roadZ(j) } : { x: roadX(i), z: p.z };
  return { point, i, j };
}

function corner(i: number, j: number): Vec2 {
  return { x: roadX(i), z: roadZ(j) };
}

function appendUnique(points: Vec2[], next: Vec2): void {
  const last = points[points.length - 1];
  if (last && Math.abs(last.x - next.x) < 0.01 && Math.abs(last.z - next.z) < 0.01) return;
  points.push(next);
}

export function buildRoadRoute(from: Vec2, to: Vec2): Vec2[] {
  const start = snapToRoad(from);
  const end = snapToRoad(to);
  const points: Vec2[] = [];
  appendUnique(points, from);
  appendUnique(points, start.point);
  appendUnique(points, corner(start.i, start.j));
  appendUnique(points, corner(end.i, start.j));
  appendUnique(points, corner(end.i, end.j));
  appendUnique(points, end.point);
  return points;
}
