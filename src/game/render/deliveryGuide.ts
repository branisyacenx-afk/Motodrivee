import * as THREE from 'three';
import type { Vec2 } from '@/game/types';
import { createLabelTexture } from '@/game/render/labels';

export type GuideKind = 'pickup' | 'dropoff';

export interface DeliveryGuide {
  group: THREE.Group;
  show(kind: GuideKind, target: Vec2, label: string, route: readonly Vec2[]): void;
  hide(): void;
  update(time: number): void;
}

const COLOR: Record<GuideKind, string> = { pickup: '#f59e0b', dropoff: '#10b981' };
const BEAM_HEIGHT = 26;
const RIBBON_Y = 0.24;
const RIBBON_WIDTH = 2.6;
const CHEVRON_PERIOD = 6;
const FLOW_SPEED = 1.6;
const MAX_ROUTE_POINTS = 32;

function chevronTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(40, 26);
    ctx.lineTo(88, 64);
    ctx.lineTo(40, 102);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

interface MarkerParts {
  group: THREE.Group;
  ring: THREE.Mesh;
  pointer: THREE.Mesh;
  label: THREE.Sprite;
  labelText: string;
}

function createMarker(kind: GuideKind): MarkerParts {
  const color = COLOR[kind];
  const group = new THREE.Group();
  group.visible = false;

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, BEAM_HEIGHT, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  beam.position.y = BEAM_HEIGHT / 2;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 4.2, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;

  const pointer = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 4), new THREE.MeshBasicMaterial({ color }));
  pointer.rotation.x = Math.PI;
  pointer.position.y = 15;

  const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  label.scale.set(14, 3.5, 1);
  label.position.y = 19;

  group.add(beam, ring, pointer, label);
  return { group, ring, pointer, label, labelText: '' };
}

function createRibbon(): { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; texture: THREE.CanvasTexture; geometry: THREE.BufferGeometry } {
  const vertexCount = MAX_ROUTE_POINTS * 2;
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const uvs = new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2);
  uvs.setUsage(THREE.DynamicDrawUsage);
  const indices: number[] = [];
  for (let k = 0; k < MAX_ROUTE_POINTS - 1; k++) {
    const a = k * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geometry.setAttribute('position', positions);
  geometry.setAttribute('uv', uvs);
  geometry.setIndex(indices);
  geometry.setDrawRange(0, 0);

  const texture = chevronTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, material, texture, geometry };
}

function writeRibbon(geometry: THREE.BufferGeometry, route: readonly Vec2[]): void {
  const points = route.slice(0, MAX_ROUTE_POINTS);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
  let distance = 0;

  points.forEach((point, k) => {
    const prev = points[Math.max(0, k - 1)];
    const next = points[Math.min(points.length - 1, k + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const length = Math.hypot(dx, dz) || 1;
    if (k > 0) distance += Math.hypot(point.x - points[k - 1].x, point.z - points[k - 1].z);
    const nx = (-dz / length) * (RIBBON_WIDTH / 2);
    const nz = (dx / length) * (RIBBON_WIDTH / 2);
    const u = distance / CHEVRON_PERIOD;
    positions.setXYZ(k * 2, point.x + nx, RIBBON_Y, point.z + nz);
    positions.setXYZ(k * 2 + 1, point.x - nx, RIBBON_Y, point.z - nz);
    uvs.setXY(k * 2, u, 0);
    uvs.setXY(k * 2 + 1, u, 1);
  });

  positions.needsUpdate = true;
  uvs.needsUpdate = true;
  geometry.setDrawRange(0, Math.max(0, points.length - 1) * 6);
}

export function createDeliveryGuide(): DeliveryGuide {
  const group = new THREE.Group();
  const markers: Record<GuideKind, MarkerParts> = {
    pickup: createMarker('pickup'),
    dropoff: createMarker('dropoff'),
  };
  for (const marker of Object.values(markers)) group.add(marker.group);

  const ribbon = createRibbon();
  group.add(ribbon.mesh);

  let active: GuideKind | null = null;

  return {
    group,
    show(kind, target, label, route) {
      for (const key of Object.keys(markers) as GuideKind[]) markers[key].group.visible = key === kind;
      const marker = markers[kind];
      marker.group.position.set(target.x, 0, target.z);
      if (marker.labelText !== label) {
        const material = marker.label.material;
        material.map?.dispose();
        material.map = createLabelTexture(label);
        material.needsUpdate = true;
        marker.labelText = label;
      }

      writeRibbon(ribbon.geometry, route);
      ribbon.material.color.set(COLOR[kind]);
      ribbon.mesh.visible = route.length > 1;
      active = kind;
    },
    hide() {
      if (active === null) return;
      for (const key of Object.keys(markers) as GuideKind[]) markers[key].group.visible = false;
      ribbon.mesh.visible = false;
      active = null;
    },
    update(time) {
      if (active === null) return;
      const marker = markers[active];
      marker.pointer.position.y = 15 + Math.sin(time * 2.5) * 0.6;
      marker.ring.scale.setScalar(1 + 0.08 * Math.sin(time * 4));
      ribbon.texture.offset.x = -((time * FLOW_SPEED) / CHEVRON_PERIOD) % 1;
    },
  };
}
