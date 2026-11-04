import * as THREE from 'three';

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'fog' | 'wind';

export interface EnvironmentState {
  hour: number;
  daylight: number;
  weather: WeatherKind;
  rain: number;
  fog: number;
  wind: number;
}

const DAY_LENGTH_SECONDS = 720;
const WEATHER_STEP_SECONDS = 92;
const WEATHER_SEQUENCE: WeatherKind[] = ['clear', 'cloudy', 'rain', 'wind', 'fog', 'clear'];

function smooth(value: number, edge0: number, edge1: number): number {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export class DynamicEnvironment {
  readonly group = new THREE.Group();
  private readonly sunDisc: THREE.Mesh;
  private readonly moonDisc: THREE.Mesh;
  private readonly moonLight: THREE.DirectionalLight;
  private readonly clouds: THREE.Group;
  private readonly rain: THREE.LineSegments;
  private readonly rainPositions: Float32Array;
  private weatherBlend = 0;
  private currentWeather: WeatherKind = 'clear';
  private previousWeather: WeatherKind = 'clear';
  private lastWeatherStep = -1;

  constructor() {
    this.sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#fff0bd', toneMapped: false }),
    );
    this.moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#dce8ff', toneMapped: false }),
    );
    this.group.add(this.sunDisc, this.moonDisc);

    this.moonLight = new THREE.DirectionalLight('#a9c7ff', 0);
    this.moonLight.castShadow = false;
    this.group.add(this.moonLight, this.moonLight.target);

    this.clouds = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: '#d7e0e8',
      roughness: 1,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      const width = 8 + (i % 3) * 3;
      for (let puff = 0; puff < 4; puff++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMaterial);
        mesh.scale.set(width * (puff === 0 ? 0.72 : 0.42), 1.8 + (puff % 2) * 0.5, 4.5);
        mesh.position.set((puff - 1.5) * width * 0.42, puff % 2 ? 0.8 : 0, 0);
        cloud.add(mesh);
      }
      cloud.position.set(((i % 3) - 1) * 95, 72 + (i % 2) * 12, (Math.floor(i / 3) - 1) * 110);
      this.clouds.add(cloud);
    }
    this.group.add(this.clouds);

    const rainCount = 420;
    this.rainPositions = new Float32Array(rainCount * 2 * 3);
    let seed = 94821;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < rainCount; i++) {
      const x = (random() - 0.5) * 110;
      const y = random() * 52;
      const z = (random() - 0.5) * 110;
      const offset = i * 6;
      this.rainPositions[offset] = x;
      this.rainPositions[offset + 1] = y;
      this.rainPositions[offset + 2] = z;
      this.rainPositions[offset + 3] = x - 0.45;
      this.rainPositions[offset + 4] = y - 2.4;
      this.rainPositions[offset + 5] = z;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rain = new THREE.LineSegments(
      rainGeometry,
      new THREE.LineBasicMaterial({ color: '#c9e4f5', transparent: true, opacity: 0.62, depthWrite: false }),
    );
    this.rain.visible = false;
    this.group.add(this.rain);
  }

  update(elapsed: number, x: number, z: number, dt: number): EnvironmentState {
    const hour = (6 + (elapsed / DAY_LENGTH_SECONDS) * 24) % 24;
    const solarWave = Math.sin(((hour - 6) / 12) * Math.PI);
    const daylight = smooth(solarWave, -0.16, 0.22);
    const solarAngle = ((hour - 6) / 24) * Math.PI * 2;
    const sunX = Math.cos(solarAngle) * 170;
    const sunY = 22 + Math.max(-0.7, solarWave) * 155;
    const sunZ = -65;
    this.sunDisc.position.set(x + sunX, sunY, z + sunZ);
    this.moonDisc.position.set(x - sunX, Math.max(18, 22 - Math.max(-0.7, solarWave) * 145), z - sunZ);
    this.moonLight.position.copy(this.moonDisc.position);
    this.moonLight.target.position.set(x, 0, z);
    this.moonLight.intensity = (1 - daylight) * 0.34;
    this.sunDisc.visible = solarWave > -0.12;
    this.moonDisc.visible = solarWave < 0.12;

    const weatherStep = Math.floor(elapsed / WEATHER_STEP_SECONDS);
    if (weatherStep !== this.lastWeatherStep) {
      this.lastWeatherStep = weatherStep;
      this.previousWeather = this.currentWeather;
      this.currentWeather = WEATHER_SEQUENCE[weatherStep % WEATHER_SEQUENCE.length];
      this.weatherBlend = 0;
    }
    this.weatherBlend = Math.min(1, this.weatherBlend + dt / 18);
    const weather = this.currentWeather;
    const rain = weather === 'rain' ? this.weatherBlend : 0;
    const fog = weather === 'fog' ? this.weatherBlend : weather === 'rain' ? this.weatherBlend * 0.16 : 0;
    const wind = weather === 'wind' ? this.weatherBlend : weather === 'rain' ? this.weatherBlend * 0.25 : 0;

    this.group.position.set(x, 0, z);
    this.clouds.visible = weather !== 'clear';
    this.clouds.children.forEach((cloud, index) => {
      cloud.position.x += (0.5 + wind * 2.4) * dt * (index % 2 ? 1 : -1);
      if (cloud.position.x > 150) cloud.position.x = -150;
      if (cloud.position.x < -150) cloud.position.x = 150;
    });
    this.rain.visible = rain > 0.02;
    const position = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.rainPositions.length; i += 6) {
      let y = this.rainPositions[i + 1] - dt * (34 + rain * 24);
      if (y < 0) y = 45 + (i % 17);
      this.rainPositions[i + 1] = y;
      this.rainPositions[i + 3] = this.rainPositions[i] - 0.45 - wind * 1.8;
      this.rainPositions[i + 4] = y - 2.4;
      this.rainPositions[i + 5] = this.rainPositions[i + 2] - wind * 0.7;
    }
    position.needsUpdate = true;
    this.rain.material.opacity = 0.62 * rain;

    return { hour, daylight, weather, rain, fog, wind };
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.LineSegments)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
}
