import * as THREE from 'three';
import type { Vec2 } from '@/game/types';

const box = new THREE.BoxGeometry(1, 1, 1);

function addPart(group: THREE.Group, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): void {
  const mesh = new THREE.Mesh(box, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function patrolCar(point: Vec2): THREE.Group {
  const car = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f1f4f7', roughness: 0.65 });
  const navy = new THREE.MeshStandardMaterial({ color: '#173b66', roughness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: '#82b8d0', roughness: 0.25, metalness: 0.12 });
  const tire = new THREE.MeshStandardMaterial({ color: '#17191d', roughness: 0.95 });
  const red = new THREE.MeshBasicMaterial({ color: '#ff3030', toneMapped: false });
  const blue = new THREE.MeshBasicMaterial({ color: '#268bff', toneMapped: false });

  addPart(car, white, 0, 0.75, 0, 2.25, 0.72, 4.5);
  addPart(car, navy, 0, 1.05, -0.35, 2.28, 0.32, 2.25);
  addPart(car, glass, 0, 1.38, -0.25, 1.72, 0.62, 1.9);
  addPart(car, navy, 0, 0.78, 2.28, 2.28, 0.34, 0.16);
  addPart(car, navy, 0, 0.78, -2.28, 2.28, 0.34, 0.16);
  for (const x of [-1.08, 1.08]) {
    for (const z of [-1.45, 1.45]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.24, 12), tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      car.add(wheel);
    }
  }
  addPart(car, navy, 0, 1.78, 0.15, 1.35, 0.14, 0.28);
  addPart(car, red, -0.38, 1.9, 0.15, 0.48, 0.18, 0.22);
  addPart(car, blue, 0.38, 1.9, 0.15, 0.48, 0.18, 0.22);

  // Simple blue-and-white roadside patrol sign.
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), navy);
  signPost.position.set(4.2, 1.7, -1.5);
  car.add(signPost);
  addPart(car, navy, 4.2, 3.0, -1.5, 1.9, 1.15, 0.18);
  addPart(car, white, 4.2, 3.0, -1.38, 1.55, 0.72, 0.08);

  car.position.set(point.x, 0, point.z);
  car.rotation.y = Math.PI / 2;
  return car;
}

export function buildPolicePatrols(zones: readonly Vec2[]): THREE.Group {
  const group = new THREE.Group();
  zones.forEach((point) => group.add(patrolCar(point)));
  return group;
}
