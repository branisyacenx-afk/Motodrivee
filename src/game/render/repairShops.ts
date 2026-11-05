import * as THREE from 'three';
import type { Vec2 } from '@/game/types';

/** Compact roadside mechanic garages, visually distinct from petrol stations. */
export function buildRepairShops(points: readonly Vec2[]): THREE.Group {
  const root = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#d7dce0', roughness: 0.9 });
  const blue = new THREE.MeshStandardMaterial({ color: '#176b9b', roughness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: '#303943', roughness: 0.75 });
  const glass = new THREE.MeshStandardMaterial({ color: '#8ec8df', metalness: 0.1, roughness: 0.25 });
  for (const point of points) {
    const shop = new THREE.Group(); shop.position.set(point.x, 0, point.z);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 15), dark); floor.position.y = 0.15; floor.receiveShadow = true; shop.add(floor);
    const building = new THREE.Mesh(new THREE.BoxGeometry(15, 6, 10), wall); building.position.set(0, 3, -1.8); building.castShadow = true; building.receiveShadow = true; shop.add(building);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.45, 10.6), blue); roof.position.set(0, 6.15, -1.8); shop.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.8, 0.18), dark); door.position.set(0, 2.05, 3.28); shop.add(door);
    const window = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.7, 0.2), glass); window.position.set(-4.6, 3.8, 3.3); shop.add(window);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.8, 0.5), blue); lintel.position.set(0, 5.1, 3.35); shop.add(lintel);
    const lift = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 0.35), blue); lift.position.set(2.8, 1.05, 0.2); shop.add(lift);
    const bike = new THREE.Group(); bike.position.set(5.2, 0.5, 3.1);
    for (const x of [-0.8, 0.8]) { const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.12, 8, 16), dark); wheel.position.set(x, 0.5, 0); wheel.rotation.y = Math.PI / 2; bike.add(wheel); }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.25), blue); frame.position.y = 1.1; bike.add(frame); shop.add(bike);
    root.add(shop);
  }
  return root;
}
