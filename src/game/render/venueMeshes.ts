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

  // Ten compact shopfront details, instanced once per category to keep draw calls low.
  const shopDefs = [
    { geometry: new THREE.BoxGeometry(0.18, 2.6, 0.18), material: new THREE.MeshStandardMaterial({ color: '#4b5157', roughness: 0.75 }) },
    { geometry: new THREE.BoxGeometry(0.18, 2.6, 0.18), material: new THREE.MeshStandardMaterial({ color: '#4b5157', roughness: 0.75 }) },
    { geometry: new THREE.BoxGeometry(3.6, 1.15, 0.12), material: new THREE.MeshStandardMaterial({ color: '#263746', roughness: 0.8 }) },
    { geometry: new THREE.BoxGeometry(3.8, 0.16, 0.8), material: new THREE.MeshStandardMaterial({ color: '#e4d5b8', roughness: 0.82 }) },
    { geometry: new THREE.BoxGeometry(0.12, 0.12, 0.12), material: new THREE.MeshStandardMaterial({ color: '#f4d58a', emissive: '#d99c42', emissiveIntensity: 0.3 }) },
    { geometry: new THREE.BoxGeometry(1.1, 0.9, 0.7), material: new THREE.MeshStandardMaterial({ color: '#426d55', roughness: 0.9 }) },
    { geometry: new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8), material: new THREE.MeshStandardMaterial({ color: '#34765c', roughness: 0.9 }) },
    { geometry: new THREE.BoxGeometry(1.3, 0.12, 0.12), material: new THREE.MeshStandardMaterial({ color: '#c7b18f', roughness: 0.86 }) },
    { geometry: new THREE.BoxGeometry(0.65, 0.12, 0.65), material: new THREE.MeshStandardMaterial({ color: '#b88b58', roughness: 0.9 }) },
    { geometry: new THREE.BoxGeometry(5.4, 0.035, 2.8), material: new THREE.MeshStandardMaterial({ color: '#9a6d4a', roughness: 0.95 }) },
  ];
  const shopBatches = shopDefs.map((def) => new THREE.InstancedMesh(def.geometry, def.material, venues.length));
  const shopDummy = new THREE.Object3D();
  const setShop = (batch: number, venue: Venue, localX: number, y: number, localZ: number, sx = 1, sy = 1, sz = 1) => {
    const angle = Math.atan2(venue.normal.x, venue.normal.z);
    shopDummy.position.set(
      venue.x + localX * Math.cos(angle) + localZ * Math.sin(angle),
      y,
      venue.z - localX * Math.sin(angle) + localZ * Math.cos(angle),
    );
    shopDummy.rotation.set(0, angle, 0);
    shopDummy.scale.set(sx, sy, sz);
    shopDummy.updateMatrix();
    shopBatches[batch].setMatrixAt(indexForVenue, shopDummy.matrix);
  };
  let indexForVenue = 0;


  for (const [index, venue] of venues.entries()) {
    const indexForVenue = index;
    // 1–2. Side framing posts, 3. menu board, 4. trim, 5. warm lamps,
    // 6. planter, 7. waste bin, 8. foot rail, 9. display stand, 10. entrance mat.
    setShop(0, venue, -2.85, 1.3, 0.05);
    setShop(1, venue, 2.85, 1.3, 0.05);
    setShop(2, venue, 0, 3.35, 0.08);
    setShop(3, venue, 0, 5.25, 0.1);
    setShop(4, venue, -2.2, 5.15, 0.28, 0.7, 0.7, 0.7);
    setShop(5, venue, 3.9, 0.45, 1.0);
    setShop(6, venue, -3.8, 0.38, 1.1);
    setShop(7, venue, 0, 0.18, 1.72);
    setShop(8, venue, 2.1, 0.9, 1.5);
    setShop(9, venue, 0, 0.04, 2.7);

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

  for (const mesh of [...shopBatches, counterFronts, counterTops]) {
    mesh.count = venues.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(...shopBatches);

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
