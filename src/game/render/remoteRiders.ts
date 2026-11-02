import * as THREE from 'three';
import { createLabelTexture } from '@/game/render/labels';
import type { ActorAssets, BikeModel } from '@/game/render/vehicleMeshes';
import type { RemoteRider } from '@/lib/sharedCity';

const SMOOTHING = 8;
const NAME_Y = 3.9;

interface RemoteView {
  rig: BikeModel;
  label: THREE.Sprite;
  labelMap: THREE.CanvasTexture;
  x: number;
  z: number;
  heading: number;
  targetX: number;
  targetZ: number;
  targetHeading: number;
}

export interface RemoteRiders {
  update(riders: readonly RemoteRider[], dt: number): void;
  dispose(): void;
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createRemoteRiders(scene: THREE.Scene, actors: ActorAssets): RemoteRiders {
  const views = new Map<string, RemoteView>();

  const spawn = (rider: RemoteRider): RemoteView => {
    const rig = actors.bike(rider.paintHex);
    rig.group.rotation.order = 'YXZ';
    const labelMap = createLabelTexture(rider.name);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelMap, transparent: true, depthWrite: false }));
    label.scale.set(9, 2.25, 1);
    label.position.y = NAME_Y;
    rig.group.add(label);
    scene.add(rig.group);
    return {
      rig,
      label,
      labelMap,
      x: rider.x,
      z: rider.z,
      heading: rider.heading,
      targetX: rider.x,
      targetZ: rider.z,
      targetHeading: rider.heading,
    };
  };

  const release = (view: RemoteView) => {
    scene.remove(view.rig.group);
    view.rig.group.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    view.labelMap.dispose();
    view.label.material.dispose();
  };

  return {
    update(riders, dt) {
      const alpha = 1 - Math.exp(-SMOOTHING * dt);
      const active = new Set<string>();
      for (const rider of riders) {
        active.add(rider.id);
        let view = views.get(rider.id);
        if (!view) {
          view = spawn(rider);
          views.set(rider.id, view);
        }
        view.targetX = rider.x;
        view.targetZ = rider.z;
        view.targetHeading = rider.heading;
        view.x += (view.targetX - view.x) * alpha;
        view.z += (view.targetZ - view.z) * alpha;
        view.heading += wrapAngle(view.targetHeading - view.heading) * alpha;
        view.rig.group.position.set(view.x, 0, view.z);
        view.rig.group.rotation.y = view.heading;
      }
      for (const [id, view] of views) {
        if (active.has(id)) continue;
        release(view);
        views.delete(id);
      }
    },
    dispose() {
      for (const view of views.values()) release(view);
      views.clear();
    },
  };
}
