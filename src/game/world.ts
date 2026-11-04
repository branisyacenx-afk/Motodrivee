import * as THREE from 'three';
import { BASE_BIKE, CITY, SHIFT_SECONDS, type BikeStats, type VehicleId } from '@/game/config';
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
import { buildCity, disposeCity, setCityRain, updateCityChunkVisibility } from '@/game/render/cityMeshes';
import { buildZones } from '@/game/render/zoneMeshes';
import { buildVenues } from '@/game/render/venueMeshes';
import { createDeliveryGuide, type DeliveryGuide } from '@/game/render/deliveryGuide';
import { createRemoteRiders, type RemoteRiders } from '@/game/render/remoteRiders';
import { TrafficSignals } from '@/game/render/trafficSignals';
import { DynamicEnvironment, type EnvironmentState } from '@/game/render/dynamicEnvironment';
import type { SharedCity } from '@/lib/sharedCity';
import { createSoundBoard, type Cue, type SoundBoard } from '@/game/audio';
import type { GameEvent, HudSnapshot, Layout, ShiftSummary, Vec2 } from '@/game/types';
import { formatMoney } from '@/lib/money';

export interface WorldOptions {
  layout: Layout;
  stats: BikeStats;
  paintHex: string;
  vehicleId: VehicleId;
  playerName: string;
  network: SharedCity;
  readInput: () => BikeInput;
}

export interface WorldCallbacks {
  onHud: (hud: HudSnapshot) => void;
  onEvent: (event: GameEvent) => void;
  onDelivery: (pay: number, onTime: boolean) => void;
  onEnd: (summary: ShiftSummary) => void;
  onError?: (message: string) => void;
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
  private readonly cameraTarget = new THREE.Vector3();
  private readonly sun: THREE.DirectionalLight;
  private readonly ambient: THREE.HemisphereLight;
  private readonly duskSkyColor = new THREE.Color('#e9a16f');
  private readonly sunsetLightColor = new THREE.Color('#ffb36b');
  private readonly bike: BikeState;
  private readonly bikeRig: BikeModel;
  private readonly bikeBeam: THREE.SpotLight;
  private readonly interactionRider: PedestrianModel;
  private readonly interactionCustomer: PedestrianModel;
  private readonly handoffPackage: THREE.Mesh;
  private interaction: { kind: 'pickup' | 'dropoff'; left: number; order: ActiveOrder } | null = null;
  private readonly traffic: Traffic;
  private readonly trafficSignals: TrafficSignals;
  private readonly environment: DynamicEnvironment;
  private environmentState: EnvironmentState = { hour: 6, daylight: 0, weather: 'clear', rain: 0, fog: 0, wind: 0 };
  private readonly carMeshes: THREE.Group[] = [];
  private readonly carBrakeLights: THREE.MeshBasicMaterial[] = [];
  private readonly carHeadlights: THREE.MeshBasicMaterial[] = [];
  private readonly pedMeshes: PedestrianModel[] = [];
  private readonly venueStalls: THREE.Object3D[];
  private readonly cityGroup: THREE.Group;
  private readonly generateOffer: (origin: Vec2) => Offer;
  private readonly resizeObserver: ResizeObserver;
  private readonly hitReadyAt: Record<string, number> = {};
  private readonly guide: DeliveryGuide;
  private readonly remoteRiders: RemoteRiders;
  private poseClock = 0;
  private readonly sound: SoundBoard;
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.callbacks.onError?.('فُقد اتصال WebGL بالرسم ثلاثي الأبعاد على الجهاز.');
  };

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
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, false);

    this.scene.background = new THREE.Color('#bfdcec');
    this.scene.fog = new THREE.Fog('#cfe3ee', 260, 980);

    this.ambient = new THREE.HemisphereLight('#e2f1ff', '#8a8072', 1.15);
    this.scene.add(this.ambient);
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
    this.venueStalls = venueGroup.children.slice(0, layout.venues.length);
    this.cityGroup = buildCity(layout);
    this.trafficSignals = new TrafficSignals();
    this.environment = new DynamicEnvironment();
    this.scene.add(this.cityGroup, buildZones(layout.zones), venueGroup, this.trafficSignals.group, this.environment.group);

    this.guide = createDeliveryGuide();
    this.scene.add(this.guide.group);
    this.sound = createSoundBoard();

    const spawnX = roadX(2) + CITY.laneOffset;
    const spawnZ = roadZ(2);
    const assets = createActorAssets();
    this.bike = createBike(spawnX, spawnZ, SPAWN_HEADING);
    this.bikeRig = assets.bike(options.paintHex, options.vehicleId);
    this.bikeRig.group.rotation.order = 'YXZ';
    this.bikeBeam = new THREE.SpotLight('#fff0c2', 0, 92, Math.PI / 6, 0.48, 1.25);
    this.bikeBeam.position.set(0, 1.0, 0.82);
    this.bikeBeam.target.position.set(0, 0.1, 32);
    this.bikeRig.group.add(this.bikeBeam, this.bikeBeam.target);
    this.scene.add(this.bikeRig.group);
    // Reuse the low-poly pedestrian rig for short, readable delivery cut-scenes.
    this.interactionRider = assets.pedestrian('#e8e2d5', '#b9825d');
    this.interactionCustomer = assets.pedestrian('#287a58', '#b9825d');
    this.interactionRider.group.visible = false;
    this.interactionCustomer.group.visible = false;
    this.scene.add(this.interactionRider.group, this.interactionCustomer.group);
    this.handoffPackage = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), new THREE.MeshStandardMaterial({ color: '#d7262e', roughness: 0.75 }));
    this.handoffPackage.visible = false;
    this.handoffPackage.castShadow = true;
    this.scene.add(this.handoffPackage);
    this.remoteRiders = createRemoteRiders(this.scene, assets);

    this.traffic = createTraffic(layout);
    for (const car of this.traffic.cars) {
      const mesh = assets.car(car.color);
      const headlights = mesh.getObjectByName('headlights');
      if (headlights instanceof THREE.Mesh && headlights.material instanceof THREE.MeshBasicMaterial) {
        this.carHeadlights.push(headlights.material);
      } else {
        this.carHeadlights.push(new THREE.MeshBasicMaterial({ color: '#514b3c', toneMapped: false }));
      }
      const brakeLights = mesh.getObjectByName('brake-lights');
      if (brakeLights instanceof THREE.Mesh && brakeLights.material instanceof THREE.MeshBasicMaterial) {
        this.carBrakeLights.push(brakeLights.material);
      } else {
        this.carBrakeLights.push(new THREE.MeshBasicMaterial({ color: '#701b18', toneMapped: false }));
      }
      this.carMeshes.push(mesh);
      this.scene.add(mesh);
    }
    for (const ped of this.traffic.pedestrians) {
      const mesh = assets.pedestrian(ped.shirt, ped.skin, ped.isChild);
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
    this.sound.setPaused(paused);
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
    this.trafficSignals.dispose();
    this.environment.dispose();
    this.carBrakeLights.forEach((material) => material.dispose());
    this.carHeadlights.forEach((material) => material.dispose());
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly loop = (now: number) => {
    this.frameId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    try {
      if (!this.paused && !this.ended) {
        this.step(dt);
        this.syncScene(dt);
      } else {
        // Keep rendering the frozen scene, but do not advance weather,
        // remote-rider interpolation, delivery animations, or other visuals.
        this.syncScene(0);
      }
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      cancelAnimationFrame(this.frameId);
      const message = error instanceof Error ? error.message : 'خطأ غير معروف داخل حلقة رسم اللعبة.';
      this.callbacks.onError?.(`خطأ في محرك الرسم: ${message}`);
    }
  };

  private step(dt: number): void {
    this.time += dt;
    this.shiftLeft = Math.max(0, this.shiftLeft - dt);
    if (this.shiftLeft === 0) {
      this.finishShift();
      return;
    }

    this.lastInput = this.options.readInput();
    if (this.interaction) {
      this.bike.speed = 0;
      this.updateInteraction(dt);
    } else {
      // Rain reduces tire grip, slightly extending braking distance and softening cornering response.
      const roadGrip = Math.max(0.78, 1 - this.environmentState.rain * 0.22);
      stepBikeMotion(this.bike, this.lastInput, this.options.stats, dt, roadGrip);
    }
    this.sound.setEngine(Math.min(1, Math.abs(this.bike.speed) / this.options.stats.maxSpeed));

    const hits = resolveBikeContacts(this.bike, this.options.layout.boxes, this.traffic, this.options.layout.cones);
    for (const hit of hits) this.handleHit(hit);

    updateTraffic(this.traffic, this.time, dt, { x: this.bike.x, z: this.bike.z, heading: this.bike.heading, speed: this.bike.speed });
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
    if (this.interaction) return;
    if (!this.order) {
      if (this.offer) {
        if (offerExpired(this.offer, dt)) {
          this.offer = null;
          this.offerCooldown = 3;
        }
      } else {
        this.offerCooldown -= dt;
        if (this.offerCooldown <= 0) this.offer = this.generateOffer({ x: this.bike.x, z: this.bike.z });
      }
      return;
    }

    const order = this.order;
    const { bike } = this;
    const event = updateActiveOrder(order, bike.x, bike.z, bike.speed, dt);
    if (event.kind === 'picked-up') {
      this.interaction = { kind: 'pickup', left: 2.4, order };
      this.emit({ kind: 'good', text: `نزلت من الموتور واستلمت الطلب من ${order.restaurant}` }, 'pickup');
    } else if (event.kind === 'delivered') {
      this.interaction = { kind: 'dropoff', left: 2.8, order };
      this.emit({ kind: 'info', text: 'الزبون استلم الطلب…' }, 'delivered');
      return;
    }

    if (order.lateSeconds > 0 && !this.lateWarned) {
      this.lateWarned = true;
      this.emit({ kind: 'bad', text: 'راك متأخر، الربح بدا ينقص' });
    }
  }

  private updateInteraction(dt: number): void {
    const interaction = this.interaction;
    if (!interaction) return;
    interaction.left = Math.max(0, interaction.left - dt);
    if (interaction.left > 0) return;
    this.interaction = null;
    this.interactionRider.group.visible = false;
    this.interactionCustomer.group.visible = false;
    this.interactionRider.arms.forEach((arm) => arm.rotation.set(0, 0, 0));
    this.interactionCustomer.arms.forEach((arm) => arm.rotation.set(0, 0, 0));
    this.handoffPackage.visible = false;
    this.bikeRig.deliveryLid.rotation.x = 0;
    if (interaction.kind === 'dropoff') this.completeDelivery(interaction.order);
  }

  private completeDelivery(order: ActiveOrder): void {
    const onTime = order.lateSeconds <= 0;
    const pay = onTime ? order.pay : Math.round(order.pay / 2);
    this.earnings += pay;
    this.callbacks.onDelivery(pay, onTime);
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
      gameHour: Math.floor(this.environmentState.hour),
      gameMinute: Math.floor((this.environmentState.hour % 1) * 60),
      weather: this.environmentState.weather,
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
            pickupDistance: Math.round(Math.hypot(offer.pickup.x - bike.x, offer.pickup.z - bike.z)),
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
    this.trafficSignals.update(this.time);
    this.remoteRiders.update(this.options.network.riders(), dt);
    this.broadcastPose(dt);

    // Dismounting must never hide or despawn the parked motorcycle.
    this.bikeRig.group.visible = true;
    this.bikeRig.group.position.set(bike.x, 0, bike.z);
    this.bikeRig.group.rotation.y = bike.heading;
    const bikeNightFactor = 1 - this.environmentState.daylight;
    this.bikeRig.headlight.color.set('#514b3c').lerp(new THREE.Color('#fff1c4'), bikeNightFactor);
    this.bikeRig.brakeLight.color.set(this.lastInput.brake > 0.05 ? '#ff1717' : '#a31318');
    this.bikeBeam.intensity = bikeNightFactor * 32;
    if (this.interaction) {
      const sideX = Math.cos(bike.heading) * 1.8;
      const sideZ = -Math.sin(bike.heading) * 1.8;
      this.interactionRider.group.visible = true;
      this.interactionRider.group.position.set(bike.x + sideX, 0, bike.z + sideZ);
      this.interactionRider.group.rotation.y = bike.heading + Math.PI;
      this.interactionCustomer.group.visible = this.interaction.kind === 'dropoff';
      if (this.interaction.kind === 'dropoff') {
        const target = this.interaction.order.dropoff;
        this.interactionCustomer.group.position.set(target.x + sideX * 1.8, 0, target.z + sideZ * 1.8);
        this.interactionCustomer.group.rotation.y = bike.heading;
      }
      const progress = this.interaction.kind === 'pickup'
        ? 1 - this.interaction.left / 2.4
        : 1 - this.interaction.left / 2.8;
      const boxX = bike.x - forwardX * 1.0;
      const boxZ = bike.z - forwardZ * 1.0;
      // Animate the parcel from the motorcycle to the rider's hand, then
      // from the rider's hand into the customer's hand during drop-off.
      if (this.interaction.kind === 'pickup') {
        this.interactionRider.arms[1].rotation.x = -0.95 * Math.sin(Math.min(1, progress * 2) * Math.PI);
      } else {
        const giveParcel = THREE.MathUtils.clamp((progress - 0.38) / 0.58, 0, 1);
        this.interactionRider.arms[1].rotation.x = -0.9 * Math.sin(Math.min(1, progress / 0.55) * Math.PI);
        this.interactionCustomer.arms[0].rotation.x = -0.8 * giveParcel;
      }
      this.interactionRider.group.updateMatrixWorld(true);
      this.interactionCustomer.group.updateMatrixWorld(true);
      const riderHand = this.interactionRider.arms[1].localToWorld(new THREE.Vector3(0, -0.58, 0));
      const customerHand = this.interactionCustomer.arms[0].localToWorld(new THREE.Vector3(0, -0.58, 0));
      const bikeBox = new THREE.Vector3(boxX, 1.28, boxZ);
      if (this.interaction.kind === 'pickup') {
        this.handoffPackage.visible = progress < 0.9;
        this.handoffPackage.position.lerpVectors(riderHand, bikeBox, Math.min(1, progress / 0.72));
      } else {
        const takeParcel = THREE.MathUtils.clamp(progress / 0.38, 0, 1);
        const giveParcel = THREE.MathUtils.clamp((progress - 0.38) / 0.58, 0, 1);
        if (progress < 0.38) {
          this.handoffPackage.position.lerpVectors(bikeBox, riderHand, takeParcel);
        } else {
          this.handoffPackage.position.lerpVectors(riderHand, customerHand, giveParcel);
        }
        this.handoffPackage.visible = progress < 0.96;
      }
      this.handoffPackage.position.y += Math.sin(this.time * 7) * 0.018;
      this.bikeRig.deliveryLid.rotation.x = -Math.sin(Math.min(1, progress * 3.2) * Math.PI / 2) * 1.05;
    }
    this.bikeRig.group.rotation.z = -bike.steering * Math.min(1, bike.speed / 14) * 0.12;
    for (const wheel of this.bikeRig.wheels) wheel.rotation.x = bike.wheelSpin;

    // Let the chase camera open up slightly at speed, while keeping the
    // motorcycle framed and readable during quick direction changes.
    const back = 8.5 + bike.speed * 0.075;
    const cameraHeight = 3.6 + Math.min(1.0, bike.speed * 0.025);
    const desired = new THREE.Vector3(bike.x - forwardX * back, cameraHeight, bike.z - forwardZ * back);
    const lookAhead = 6 + Math.min(4, bike.speed * 0.12);
    const sideX = Math.cos(bike.heading);
    const sideZ = -Math.sin(bike.heading);
    const desiredTarget = new THREE.Vector3(
      bike.x + forwardX * lookAhead + sideX * bike.steering * 0.65,
      1.4,
      bike.z + forwardZ * lookAhead + sideZ * bike.steering * 0.65,
    );
    if (snap) {
      this.camera.position.copy(desired);
      this.cameraTarget.copy(desiredTarget);
    } else {
      const followBlend = 1 - Math.exp(-(5.2 + bike.speed * 0.035) * dt);
      this.camera.position.lerp(desired, followBlend);
      this.cameraTarget.lerp(desiredTarget, 1 - Math.exp(-5.5 * dt));
    }
    this.camera.lookAt(this.cameraTarget);
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

    const conditions = this.environment.update(this.time, bike.x, bike.z, dt);
    this.environmentState = conditions;
    setCityRain(this.cityGroup, conditions.rain);
    const night = 1 - conditions.daylight;
    const twilight = 1 - Math.abs(conditions.daylight - 0.5) * 2;
    const sky = new THREE.Color('#86c5e8').lerp(this.duskSkyColor, THREE.MathUtils.clamp(twilight, 0, 1) * 0.72);
    sky.lerp(new THREE.Color('#081426'), night * 0.94);
    const weatherDarken = conditions.weather === 'rain' || conditions.weather === 'fog' ? 0.18 : conditions.weather === 'cloudy' ? 0.1 : 0;
    sky.multiplyScalar(1 - weatherDarken);
    (this.scene.background as THREE.Color).copy(sky);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(sky).lerp(new THREE.Color('#b8c5d0'), conditions.fog * 0.5);
      this.scene.fog.near = 260 - conditions.fog * 210 - conditions.rain * 75;
      this.scene.fog.far = 980 - conditions.fog * 690 - conditions.rain * 260;
    }
    this.sun.color.set('#fff0d4').lerp(this.sunsetLightColor, THREE.MathUtils.clamp(twilight, 0, 1) * 0.8);
    this.sun.intensity = 0.16 + conditions.daylight * 2.35 - conditions.rain * 0.42 - conditions.fog * 0.3;
    this.ambient.intensity = 0.22 + conditions.daylight * 0.96 + night * 0.08;
    const solarAngle = ((conditions.hour - 6) / 24) * Math.PI * 2;
    this.sun.position.set(bike.x + Math.cos(solarAngle) * 100, 18 + conditions.daylight * 140, bike.z - 65);
    this.sun.target.position.set(bike.x, 0, bike.z);
    this.sun.target.updateMatrixWorld();

    this.venueStalls.forEach((stall, index) => {
      const venue = this.options.layout.venues[index];
      stall.visible = isNear(venue.x, venue.z, bike.x, bike.z);
    });

    const nightFactor = 1 - conditions.daylight;
    const headlightBlend = THREE.MathUtils.smoothstep(nightFactor, 0.12, 0.48);
    const nightHeadlightColor = new THREE.Color('#fff4d6');
    this.traffic.cars.forEach((car, index) => {
      const mesh = this.carMeshes[index];
      const x = car.lane.axis === 'x' ? car.pos : car.lane.fixed;
      const z = car.lane.axis === 'x' ? car.lane.fixed : car.pos;
      // Off-screen traffic keeps moving in the simulation, but its Three.js
      // transforms and lamp materials are left untouched until it re-enters range.
      if (!isNear(x, z, bike.x, bike.z)) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = car.lane.axis === 'x' ? (car.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.lane.dir > 0 ? 0 : Math.PI;
      // Headlamps fade in with dusk; emissive meshes avoid extra point-light draw cost.
      this.carHeadlights[index].color.set('#514b3c').lerp(nightHeadlightColor, headlightBlend);
      // Rear lamps brighten only while the AI car is slowing for a queue or signal.
      const braking = car.speed < car.cruise - 0.35;
      this.carBrakeLights[index].color.set(braking ? '#ff1717' : '#a31318');
    });

    this.traffic.pedestrians.forEach((ped, index) => {
      const mesh = this.pedMeshes[index];
      const x = ped.lane.axis === 'x' ? ped.pos : ped.lane.fixed;
      const z = ped.lane.axis === 'x' ? ped.lane.fixed : ped.pos;
      // Pedestrian simulation continues off-screen; skip scene graph and limb
      // updates until the character is close enough to be rendered.
      if (!isNear(x, z, bike.x, bike.z)) {
        mesh.group.visible = false;
        return;
      }
      mesh.group.visible = true;
      const stride = Math.sin(ped.phase);
      const walkAmount = 1 - ped.yieldFactor;
      mesh.group.position.set(x, Math.abs(stride) * 0.035 * walkAmount, z);
      mesh.group.rotation.y = ped.lane.axis === 'x' ? (ped.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : ped.lane.dir > 0 ? 0 : Math.PI;
      // A restrained body counter-sway and vertical bounce make the walk cycle
      // read more naturally without adding meshes, materials, or draw calls.
      mesh.group.rotation.z = Math.cos(ped.phase * 2) * 0.018 * walkAmount;
      const swing = stride * 0.5 * walkAmount;
      mesh.legs[0].rotation.x = swing;
      mesh.legs[1].rotation.x = -swing;
      mesh.arms[0].rotation.x = -swing * 0.8;
      mesh.arms[1].rotation.x = swing * 0.8;
    });
  }
}
