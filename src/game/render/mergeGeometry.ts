import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function mergeNonIndexed(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(geometries.map((geometry) => geometry.toNonIndexed()));
}
