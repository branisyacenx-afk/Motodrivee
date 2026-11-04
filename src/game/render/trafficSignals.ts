import * as THREE from 'three';
import { CITY } from '@/game/config';
import { trafficSignalState } from '@/game/sim/traffic';

const RED = new THREE.Color('#e53935');
const AMBER = new THREE.Color('#ffb300');
const GREEN = new THREE.Color('#35e36b');
const OFF = new THREE.Color('#202629');

export class TrafficSignals {
  readonly group = new THREE.Group();
  private readonly lenses: THREE.InstancedMesh;
  private phaseKey = -1;

  constructor() {
    const count = CITY.cols * CITY.rows;
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.09, 0.13, 4.4, 6),
      new THREE.MeshStandardMaterial({ color: '#59636a', metalness: 0.65, roughness: 0.45 }),
      count,
    );
    const housings = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.62, 1.65, 0.48),
      new THREE.MeshStandardMaterial({ color: '#202a30', roughness: 0.7 }),
      count * 2,
    );
    this.lenses = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 1.6,
        roughness: 0.35,
      }),
      count * 6,
    );

    const dummy = new THREE.Object3D();
    let poleIndex = 0;
    let headIndex = 0;
    for (let i = 0; i < CITY.cols; i++) {
      for (let j = 0; j < CITY.rows; j++) {
        const x = i * CITY.pitch;
        const z = j * CITY.pitch;
        const cornerX = x + CITY.roadWidth / 2 + 3.1;
        const cornerZ = z + CITY.roadWidth / 2 + 3.1;

        dummy.position.set(cornerX, 2.2, cornerZ);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        poles.setMatrixAt(poleIndex++, dummy.matrix);

        for (const axis of ['x', 'z'] as const) {
          const offset = axis === 'x' ? -0.55 : 0.55;
          dummy.position.set(cornerX, 4.35, cornerZ + offset);
          dummy.rotation.set(0, axis === 'x' ? Math.PI / 2 : 0, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          housings.setMatrixAt(headIndex++, dummy.matrix);

          for (let light = 0; light < 3; light++) {
            dummy.position.set(
              cornerX + (axis === 'x' ? 0.34 : 0),
              4.85 - light * 0.48,
              cornerZ + offset + (axis === 'z' ? 0.34 : 0),
            );
            dummy.updateMatrix();
            this.lenses.setMatrixAt((i * CITY.rows + j) * 6 + (axis === 'x' ? 0 : 3) + light, dummy.matrix);
            this.lenses.setColorAt((i * CITY.rows + j) * 6 + (axis === 'x' ? 0 : 3) + light, OFF);
          }
        }
      }
    }

    poles.instanceMatrix.needsUpdate = true;
    housings.instanceMatrix.needsUpdate = true;
    this.lenses.instanceMatrix.needsUpdate = true;
    this.group.add(poles, housings, this.lenses);
    this.update(0);
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }

  update(time: number): void {
    const phaseKey = Math.floor(time / (CITY.lightHalfCycle / 2));
    if (phaseKey === this.phaseKey) return;
    this.phaseKey = phaseKey;
    let index = 0;
    for (let i = 0; i < CITY.cols; i++) {
      for (let j = 0; j < CITY.rows; j++) {
        for (const axis of ['x', 'z'] as const) {
          const state = trafficSignalState(axis, i, j, time);
          const colors = state === 'green'
            ? [OFF, OFF, GREEN]
            : state === 'amber'
              ? [OFF, AMBER, OFF]
              : [RED, OFF, OFF];
          for (const color of colors) this.lenses.setColorAt(index++, color);
        }
      }
    }
    if (this.lenses.instanceColor) this.lenses.instanceColor.needsUpdate = true;
  }
}
