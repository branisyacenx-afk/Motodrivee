import * as THREE from 'three';
import { BASE_BIKE, CITY, SHIFT_SECONDS, type BikeStats } from '@/game/config';
import { roadX, roadZ } from '@/game/city/layout';
import { buildRoadRoute } from '@/game/city/route';
import { createTraffic, updateTraffic, type Traffic } from '@/game/sim/traffic';
import { createBike, stepBikeMotion, type BikeInput, type BikeState } from '@/game/sim/bike';
import { resolveBikeContacts, type BikeHit } from '@/game/sim/collisions';
import {
  activateOffer,
  activeTarget,
  createOfferGenerator,
  offerExpired,
  requiredWait,
  updateActiveOrder,
  type ActiveOrder,
  type Offer,
} from '@/game/sim/orders';
import { createActorAssets, type BikeModel, type PedestrianModel } from '@/game/render/vehicleMeshes';
import { buildCity, disposeCity, updateCityChunkVisibility } from '@/game/render/cityMeshes';
import { buildZones } from '@/game/render/zoneMeshes';
import { buildVenues } from '@/game/render/venueMeshes';
import { createDeliveryGuide, type DeliveryGuide } from '@/game/render/deliveryGuide';
import { createRemoteRiders, type RemoteRiders } from '@/game/render/remoteRiders';
import type { SharedCity } from '@/lib/sharedCity';
import { createSoundBoard, type Cue, type SoundBoard } from '@/game/audio';
import type { GameEvent, HudSnapshot, Layout, ShiftSummary } from '@/game/types';
import { formatMoney } from '@/lib/money';

export interface WorldOptions {
  layout: Layout;
  stats: BikeStats;
  paintHex: string;
  playerName: string;
  network: SharedCity;
  readInput: () => BikeInput;
}

export interface WorldCallbacks {
  onHud: (hud: HudSnapshot) => void;
  onEvent: (event: GameEvent) => void;
  onEnd: (summary: ShiftSummary) => void;
}

const HUD_INTERVAL = 0.1;
const POSE_INTERVAL = 0.2;
const CULL_RANGE_SQ = 240 * 240;

function isNear(x: number, z: number, fromX: number, fromZ: number): boolean {
  const dx = x - fromX;
  const dz = z - fromZ;
  return dx * dx + dz * dz < CULL_RANGE_SQ;
}
const HIT_COOLDOWN = 0.4;
const SPAWN_HEADING = 0;

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export class GameWorld {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(56, 1, 0.1, 1500);
  private readonly sun: THREE.DirectionalLight;
  private readonly bike: BikeState;
  private readonly bikeRig: BikeModel;
  private readonly traffic: Traffic;
  private readonly carMeshes: THREE.Group[] = [];
  private readonly pedMeshes: PedestrianModel[] = [];
  private readonly venueStalls: THREE.Object3D[];
  private readonly cityGroup: THREE.Group;
  private readonly generateOffer: () => Offer;
  private readonly resizeObserver: ResizeObserver;
  private readonly hitReadyAt: Record<string, number> = {};
  private readonly guide: DeliveryGuide;
  private readonly remoteRiders: RemoteRiders;
  private poseClock = 0;
  private readonly sound: SoundBoard;

  private offer: Offer | null = null;
  private order: ActiveOrder | null = null;
  private offerCooldown = 2;
  private lateWarned = false;
  private score = 0;
  private earnings = 0;
  private deliveries = 0;
  private lateDeliveries = 0;
  private health: number = BASE_BIKE.health;
  private shiftLeft = SHIFT_SECONDS;
  private time = 0;
  private hudClock = 0;
  private lastFrame = 0;
  private frameId = 0;
  private paused = false;
  private ended = false;
  private lastInput: BikeInput = { throttle: 0, brake: 0, steer: 0 };

  constructor(
    private readonly container: HTMLElement,
    private readonly options: WorldOptions,
    private readonly callbacks: WorldCallbacks,
  ) {
    const { layout } = options;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Touch-first devices have a tighter GPU budget; cap render resolution and
    // shadow-map size to keep the game responsive without changing simulation quality.
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const pixelRatioCap = isTouchDevice ? 1.25 : 1.75;
    const shadowMapSize = isTouchDevice ? 1024 : 2048;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#bfdcec');
    this.scene.fog = new THREE.Fog('#cfe3ee', 260, 980);

    this.scene.add(new THREE.HemisphereLight('#e2f1ff', '#8a8072', 1.15));
    this.sun = new THREE.DirectionalLight('#fff0d4', 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    const shadowCam = this.sun.shadow.camera;
    shadowCam.left = -80;
    shadowCam.right = 80;
    shadowCam.top = 80;
    shadowCam.bottom = -80;
    shadowCam.near = 1;
    shadowCam.far = 420;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    const venueGroup = buildVenues(layout.venues);
    this.venueStalls = [...venueGroup.children];
    this.cityGroup = buildCity(layout);
    this.scene.add(this.cityGroup, buildZones(layout.zones), venueGroup);

    this.guide = createDeliveryGuide();
    this.scene.add(this.guide.group);
    this.sound = createSoundBoard();

    const spawnX = roadX(2) + CITY.laneOffset;
    const spawnZ = roadZ(2);
    const assets = createActorAssets();
    this.bike = createBike(spawnX, spawnZ, SPAWN_HEADING);
    this.bikeRig = assets.bike(options.paintHex);
    this.bikeRig.group.rotation.order = 'YXZ';
    this.scene.add(this.bikeRig.group);
    this.remoteRiders = createRemoteRiders(this.scene, assets);

    this.traffic = createTraffic(layout);
    for (const car of this.traffic.cars) {
      const mesh = assets.car(car.color);
      this.carMeshes.push(mesh);
      this.scene.add(mesh);
    }
    for (const ped of this.traffic.pedestrians) {
      const mesh = assets.pedestrian(ped.shirt, ped.skin);
      this.pedMeshes.push(mesh);
      this.scene.add(mesh.group);
    }
    for (const cone of layout.cones) {
      const mesh = assets.cone();
      mesh.position.set(cone.x, 0, cone.z);
      this.scene.add(mesh);
    }

    this.generateOffer = createOfferGenerator(layout.blocks, layout.venues, Math.floor(Math.random() * 1e9));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.syncScene(0, true);
  }

  start(): void {
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  acceptOffer(): void {
    if (!this.offer || this.order) return;
    this.order = activateOffer(this.offer);
    this.offer = null;
    this.lateWarned = false;
    this.emit({ kind: 'info', text: `قبلت الطلب من ${this.order.restaurant}` }, 'pickup');
  }

  declineOffer(): void {
    if (!this.offer) return;
    this.offer = null;
    this.offerCooldown = 3;
  }

  finishShift(): void {
    if (this.ended) return;
    this.ended = true;
    this.callbacks.onEnd(this.summary());
  }

  setMuted(muted: boolean): void {
    this.sound.setMuted(muted);
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.sound.dispose();
    this.remoteRiders.dispose();
    disposeCity(this.cityGroup);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly loop = (now: number) => {
    this.frameId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (!this.paused && !this.ended) this.step(dt);
    this.syncScene(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private step(dt: number): void {
    this.time += dt;
    this.shiftLeft = Math.max(0, this.shiftLeft - dt);
    if (this.shiftLeft === 0) {
      this.finishShift();
      return;
    }

    this.lastInput = this.options.readInput();
    stepBikeMotion(this.bike, this.lastInput, this.options.stats, dt);
    this.sound.setEngine(Math.min(1, Math.abs(this.bike.speed) / this.options.stats.maxSpeed));

    const hits = resolveBikeContacts(this.bike, this.options.layout.boxes, this.traffic, this.options.layout.cones);
    for (const hit of hits) this.handleHit(hit);

    updateTraffic(this.traffic, this.time, dt);
    this.updateOrders(dt);

    if (this.health <= 0) this.recoverBike();

    this.hudClock += dt;
    if (this.hudClock >= HUD_INTERVAL) {
      this.hudClock = 0;
      this.callbacks.onHud(this.snapshot());
    }
  }

  private handleHit(hit: BikeHit): void {
    const factor = this.options.stats.damageFactor;
    if (hit.kind === 'close-call') {
      this.addScore(5);
      this.emit({ kind: 'good', text: 'مرور قريب! +5' });
      return;
    }
    if (this.time < (this.hitReadyAt[hit.kind] ?? 0)) return;
    this.hitReadyAt[hit.kind] = this.time + HIT_COOLDOWN;

    if (hit.kind === 'wall') {
      this.health = Math.max(0, this.health - hit.impact * 2 * factor);
      this.addScore(-3);
      this.emit({ kind: 'bad', text: 'صدمت حيطة أو عمارة' });
    } else if (hit.kind === 'car') {
      this.health = Math.max(0, this.health - hit.impact * 2.5 * factor);
      this.addScore(-8);
      this.emit({ kind: 'bad', text: 'صدمت طوموبيل' });
    } else if (hit.kind === 'pedestrian') {
      this.health = Math.max(0, this.health - 8 * factor);
      this.addScore(-20);
      this.emit({ kind: 'bad', text: 'صدمت واحد عابر الطريق' });
    } else if (hit.impact > 2) {
      this.addScore(-2);
      this.emit({ kind: 'bad', text: 'طحت حاجز البلاستيك' });
    }
  }

  private updateOrders(dt: number): void {
    if (!this.order) {
      if (this.offer) {
        if (offerExpired(this.offer, dt)) {
          this.offer = null;
          this.offerCooldown = 3;
        }
      } else {
        this.offerCooldown -= dt;
        if (this.offerCooldown <= 0) this.offer = this.generateOffer();
      }
      return;
    }

    const order = this.order;
    const { bike } = this;
    const event = updateActiveOrder(order, bike.x, bike.z, bike.speed, dt);
    if (event.kind === 'picked-up') {
      this.emit({ kind: 'good', text: `خذيت الطلب من ${order.restaurant}` }, 'pickup');
    } else if (event.kind === 'delivered') {
      this.completeDelivery(order);
      return;
    }

    if (order.lateSeconds > 0 && !this.lateWarned) {
      this.lateWarned = true;
      this.emit({ kind: 'bad', text: 'راك متأخر، الربح بدا ينقص' });
    }
  }

  private completeDelivery(order: ActiveOrder): void {
    const onTime = order.lateSeconds <= 0;
    const pay = onTime ? order.pay : Math.round(order.pay / 2);
    this.earnings += pay;
    if (onTime) {
      this.addScore(100 + Math.round(order.timeLeft * 2));
      this.emit({ kind: 'good', text: `وصلت في الوقت! +${formatMoney(pay)}` }, 'delivered');
    } else {
      this.addScore(Math.max(15, 100 - Math.round(order.lateSeconds * 3)));
      this.lateDeliveries++;
      this.emit({ kind: 'bad', text: `وصلت متأخر، +${formatMoney(pay)}` });
    }
    this.deliveries++;
    this.order = null;
    this.offerCooldown = 2.5;
  }

  private recoverBike(): void {
    const { bike } = this;
    const i = Math.min(CITY.cols - 1, Math.max(0, Math.round(bike.x / CITY.pitch)));
    const j = Math.min(CITY.rows - 1, Math.max(0, Math.round(bike.z / CITY.pitch)));
    if (Math.abs(bike.x - roadX(i)) < Math.abs(bike.z - roadZ(j))) {
      bike.x = roadX(i) + CITY.laneOffset;
    } else {
      bike.z = roadZ(j) + CITY.laneOffset;
    }
    bike.speed = 0;
    this.health = 60;
    this.addScore(-30);
    this.emit({ kind: 'bad', text: 'الموتور خرب، رجعناك للطريق' });
  }

  private summary(): ShiftSummary {
    return {
      score: this.score,
      earnings: round2(this.earnings),
      deliveries: this.deliveries,
      lateDeliveries: this.lateDeliveries,
    };
  }

  private addScore(delta: number): void {
    this.score = Math.max(0, this.score + delta);
  }

  private emit(event: GameEvent, cue: Cue = event.kind): void {
    this.callbacks.onEvent(event);
    this.sound.play(cue);
  }

  private snapshot(): HudSnapshot {
    const { bike, order, offer } = this;
    const target = order ? activeTarget(order) : null;
    let turn: HudSnapshot['turn'] = null;
    let targetDistance = 0;

    if (order && target) {
      const dx = target.x - bike.x;
      const dz = target.z - bike.z;
      targetDistance = Math.hypot(dx, dz);
      const delta = normalizeAngle(Math.atan2(dx, dz) - bike.heading);
      const direction = Math.abs(delta) < 0.3 ? 'straight' : Math.abs(delta) > 2.5 ? 'uturn' : delta > 0 ? 'left' : 'right';
      turn = { direction, distance: Math.round(targetDistance), target: order.phase };
    }

    return {
      speedKmh: Math.round(bike.speed * 3.6),
      shiftLeft: Math.ceil(this.shiftLeft),
      score: this.score,
      earnings: round2(this.earnings),
      deliveries: this.deliveries,
      health: Math.round(this.health),
      order:
        order && target
          ? {
              restaurant: order.restaurant,
              phase: order.phase,
              pickupDistrict: order.pickupDistrict,
              dropoffDistrict: order.dropoffDistrict,
              distance: Math.round(targetDistance),
              timeLeft: Math.max(0, Math.ceil(order.timeLeft)),
              timeLimit: order.timeLimit,
              pay: order.pay,
              progress: Math.min(1, order.progress / requiredWait(order.phase)),
            }
          : null,
      offer: offer
        ? {
            restaurant: offer.restaurant,
            pickupDistrict: offer.pickupDistrict,
            dropoffDistrict: offer.dropoffDistrict,
            distance: Math.round(offer.distance),
            pay: offer.pay,
            expiresIn: Math.ceil(offer.expiresIn),
          }
        : null,
      turn,
      minimap: { x: bike.x, z: bike.z, heading: bike.heading, target },
      players: this.options.network.riders().length + 1,
      link: this.options.network.status(),
    };
  }

  private broadcastPose(dt: number): void {
    this.poseClock += dt;
    if (this.poseClock < POSE_INTERVAL) return;
    this.poseClock = 0;
    const { bike } = this;
    this.options.network.send({
      name: this.options.playerName,
      x: round2(bike.x),
      z: round2(bike.z),
      heading: round2(normalizeAngle(bike.heading)),
      paintHex: this.options.paintHex,
    });
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private syncScene(dt: number, snap = false): void {
    const { bike } = this;
    const forwardX = Math.sin(bike.heading);
    const forwardZ = Math.cos(bike.heading);

    updateCityChunkVisibility(this.cityGroup, bike.x, bike.z);
    this.remoteRiders.update(this.options.network.riders(), dt);
    this.broadcastPose(dt);

    this.bikeRig.group.position.set(bike.x, 0, bike.z);
    this.bikeRig.group.rotation.y = bike.heading;
    this.bikeRig.group.rotation.z = -this.lastInput.steer * Math.min(1, bike.speed / 14) * 0.12;
    for (const wheel of this.bikeRig.wheels) wheel.rotation.x = bike.wheelSpin;

    const back = 8.5 + bike.speed * 0.04;
    const desired = new THREE.Vector3(bike.x - forwardX * back, 3.6, bike.z - forwardZ * back);
    if (snap) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(bike.x + forwardX * 6, 1.4, bike.z + forwardZ * 6);
    const fov = 56 + Math.min(12, bike.speed * 0.35);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    const order = this.order;
    if (order) {
      const label = order.phase === 'pickup' ? `مطعم ${order.restaurant}` : `الزبون · ${order.dropoffDistrict}`;
      const target = activeTarget(order);
      this.guide.show(order.phase, target, label, buildRoadRoute({ x: bike.x, z: bike.z }, target));
    } else {
      this.guide.hide();
    }
    this.guide.update(this.time);

    this.sun.position.set(bike.x - 60, 150, bike.z + 45);
    this.sun.target.position.set(bike.x, 0, bike.z);
    this.sun.target.updateMatrixWorld();

    this.venueStalls.forEach((stall, index) => {
      const venue = this.options.layout.venues[index];
      stall.visible = isNear(venue.x, venue.z, bike.x, bike.z);
    });

    this.traffic.cars.forEach((car, index) => {
      const mesh = this.carMeshes[index];
      mesh.position.set(car.lane.axis === 'x' ? car.pos : car.lane.fixed, 0, car.lane.axis === 'x' ? car.lane.fixed : car.pos);
      mesh.rotation.y = car.lane.axis === 'x' ? (car.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.lane.dir > 0 ? 0 : Math.PI;
      mesh.visible = isNear(mesh.position.x, mesh.position.z, bike.x, bike.z);
    });

    this.traffic.pedestrians.forEach((ped, index) => {
      const mesh = this.pedMeshes[index];
      mesh.group.position.set(ped.lane.axis === 'x' ? ped.pos : ped.lane.fixed, 0, ped.lane.axis === 'x' ? ped.lane.fixed : ped.pos);
      mesh.group.rotation.y = ped.lane.axis === 'x' ? (ped.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : ped.lane.dir > 0 ? 0 : Math.PI;
      mesh.group.visible = isNear(mesh.group.position.x, mesh.group.position.z, bike.x, bike.z);
      const swing = Math.sin(ped.phase) * 0.5;
      mesh.legs[0].rotation.x = swing;
      mesh.legs[1].rotation.x = -swing;
      mesh.arms[0].rotation.x = -swing * 0.8;
      mesh.arms[1].rotation.x = swing * 0.8;
    });
  }
}
