import * as THREE from 'three';
import type { Vec2 } from '@/game/types';

/** Small, readable roadside petrol stations with a canopy, pumps and a lit sign. */
export function buildFuelStations(points: readonly Vec2[]): THREE.Group {
  const root = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: '#aeb6bc', roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: '#d93632', roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: '#f4f0e7', roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: '#303943', roughness: 0.65, metalness: 0.25 });
  const green = new THREE.MeshStandardMaterial({ color: '#16845a', emissive: '#0a3b27', emissiveIntensity: 0.25 });
  for (const point of points) {
    const station = new THREE.Group();
    station.position.set(point.x, 0, point.z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 15), concrete);
    base.position.y = 0.15; base.receiveShadow = true; station.add(base);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(15, 0.55, 8), red);
    canopy.position.set(0, 5.1, 0); canopy.castShadow = true; station.add(canopy);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.18, 8.5), white);
    roof.position.set(0, 5.48, 0); station.add(roof);
    for (const x of [-6.4, 6.4]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5, 0.45), white);
      pillar.position.set(x, 2.5, 0); pillar.castShadow = true; station.add(pillar);
    }
    for (const z of [-2.1, 2.1]) {
      const pump = new THREE.Group(); pump.position.set(0, 0, z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.8, 0.8), white); body.position.y = 1.05; body.castShadow = true; pump.add(body);
      const display = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.35, 0.06), dark); display.position.set(0, 1.48, 0.43); pump.add(display);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 0.84), green); stripe.position.y = 1.82; pump.add(stripe);
      const hose = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 12, Math.PI), dark); hose.position.set(0.63, 0.98, 0.05); hose.rotation.z = Math.PI / 2; pump.add(hose);
      station.add(pump);
    }
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.2, 0.35), dark); signPost.position.set(-8, 2.1, -5.5); station.add(signPost);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.25), green); sign.position.set(-8, 4.1, -5.5); station.add(sign);
    const label = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.08), white); label.position.set(-8, 4.25, -5.34); station.add(label);
    root.add(station);
  }
  return root;
}
