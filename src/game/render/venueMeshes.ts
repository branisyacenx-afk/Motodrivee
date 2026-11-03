import * as THREE from 'three';
import { createSignTexture } from '@/game/render/textures';
import type { Venue } from '@/game/types';

const SIGN_WIDTH = 5.8;
const SIGN_HEIGHT = 1.5;
const SIGN_Y = 4.6;
const POST_HEIGHT = SIGN_Y + SIGN_HEIGHT / 2;

export function buildVenues(venues: readonly Venue[]): THREE.Group {
  const group = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.6, metalness: 0.4 });
  const postGeometry = new THREE.BoxGeometry(0.22, POST_HEIGHT, 0.22);
  const signGeometry = new THREE.PlaneGeometry(SIGN_WIDTH, SIGN_HEIGHT);
  const awningGeometry = new THREE.BoxGeometry(SIGN_WIDTH + 0.4, 0.14, 1.4);
  // Shared instanced details keep the new counter fronts to one additional draw call.
  const counterFronts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(4.8, 1.05, 0.22),
    new THREE.MeshStandardMaterial({ color: '#8b6848', roughness: 0.88 }),
    venues.length,
  );
  const counterTops = new THREE.InstancedMesh(
    new THREE.BoxGeometry(5.0, 0.12, 0.42),
    new THREE.MeshStandardMaterial({ color: '#d9d0bf', roughness: 0.72 }),
    venues.length,
  );
  const dummy = new THREE.Object3D();

  for (const [index, venue] of venues.entries()) {
    const stall = new THREE.Group();
    stall.position.set(venue.x, 0, venue.z);
    stall.rotation.y = Math.atan2(venue.normal.x, venue.normal.z);

    for (const x of [-SIGN_WIDTH / 2 + 0.4, SIGN_WIDTH / 2 - 0.4]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, POST_HEIGHT / 2, 0);
      post.castShadow = true;
      stall.add(post);
    }

    const texture = createSignTexture(venue.name, venue.color);
    const sign = new THREE.Mesh(
      signGeometry,
      new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: '#ffffff',
        emissiveIntensity: 0.35,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    sign.position.set(0, SIGN_Y, 0);
    stall.add(sign);

    const awning = new THREE.Mesh(awningGeometry, new THREE.MeshStandardMaterial({ color: venue.color, roughness: 0.8 }));
    awning.position.set(0, SIGN_Y - SIGN_HEIGHT / 2 - 0.3, 0.6);
    awning.castShadow = true;
    stall.add(awning);

    // A compact service counter makes each restaurant stall read as a usable shop.
    const counterY = 0.62;
    const counterZ = 1.38;
    dummy.position.set(venue.x, counterY, venue.z);
    dummy.rotation.y = stall.rotation.y;
    dummy.updateMatrix();
    counterFronts.setMatrixAt(index, dummy.matrix);
    dummy.position.set(
      venue.x + Math.sin(stall.rotation.y) * counterZ,
      1.18,
      venue.z + Math.cos(stall.rotation.y) * counterZ,
    );
    dummy.rotation.y = stall.rotation.y;
    dummy.updateMatrix();
    counterTops.setMatrixAt(index, dummy.matrix);

    group.add(stall);
  }

  for (const mesh of [counterFronts, counterTops]) {
    mesh.count = venues.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(counterFronts, counterTops);
  return group;
}
