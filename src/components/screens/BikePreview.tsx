import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BikePreviewProps {
  paint: string;
  vehicleId: string;
  vehicleName: string;
}

function connect(scene: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 12), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  scene.add(mesh);
}

export function BikePreview({ paint, vehicleId, vehicleName }: BikePreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(4.4, 2.8, 4.8);
    camera.lookAt(0, 0.85, 0);
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x263044, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 6, 4);
    scene.add(key);
    const bike = new THREE.Group();
    scene.add(bike);
    const body = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.48, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x171d27, metalness: 0.35, roughness: 0.62 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa8b8, metalness: 0.85, roughness: 0.24 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.92 });
    const lamp = new THREE.MeshStandardMaterial({ color: 0xfff0bd, emissive: 0xffc65c, emissiveIntensity: 1.5 });
    const wheelRadius = vehicleId.includes('desert') || vehicleId.includes('rally') ? 0.48 : 0.42;
    for (const z of [-1.02, 1.02]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.105, 12, 32), rubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, wheelRadius + 0.12, z);
      bike.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.19, 16), metal);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(0, wheelRadius + 0.12, z);
      bike.add(hub);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        connect(bike, new THREE.Vector3(0, wheelRadius + 0.12, z), new THREE.Vector3(Math.cos(angle) * wheelRadius * 0.82, wheelRadius + 0.12 + Math.sin(angle) * wheelRadius * 0.82, z), 0.012, metal);
      }
    }
    const rear = new THREE.Vector3(0, 0.58, -1.02);
    const front = new THREE.Vector3(0, 0.58, 1.02);
    const engine = new THREE.Vector3(0, 0.72, -0.12);
    const seat = new THREE.Vector3(0, 1.18, -0.62);
    const steering = new THREE.Vector3(0, 1.32, 0.72);
    connect(bike, rear, engine, 0.055, metal);
    connect(bike, engine, front, 0.055, metal);
    connect(bike, engine, seat, 0.065, dark);
    connect(bike, seat, steering, 0.06, metal);
    connect(bike, front, steering, 0.045, metal);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 16), body);
    tank.scale.set(0.72, 0.72, 1.15);
    tank.position.set(0, 1.22, 0.12);
    bike.add(tank);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.13, 0.78), dark);
    saddle.position.set(0, 1.29, -0.57);
    bike.add(saddle);
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.52), metal);
    engineBlock.position.copy(engine);
    bike.add(engineBlock);
    connect(bike, new THREE.Vector3(-0.36, 1.38, 0.76), new THREE.Vector3(0.36, 1.38, 0.76), 0.035, dark);
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), lamp);
    headlight.scale.set(1, 0.8, 0.65);
    headlight.position.set(0, 1.12, 0.96);
    bike.add(headlight);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.58), body);
    box.position.set(0, 1.48, -1.02);
    bike.add(box);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.85, 48), new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.03;
    scene.add(floor);
    const resize = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let dragging = false;
    let lastX = 0;
    const down = (event: PointerEvent) => { dragging = true; lastX = event.clientX; element.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!dragging) return; bike.rotation.y += (event.clientX - lastX) * 0.012; lastX = event.clientX; };
    const up = () => { dragging = false; };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    let frame = 0;
    const animate = () => { frame = requestAnimationFrame(animate); if (!dragging) bike.rotation.y += 0.0025; renderer.render(scene, camera); };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      renderer.dispose();
      scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } });
      renderer.domElement.remove();
    };
  }, [paint, vehicleId]);
  return <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black ring-1 ring-white/10">
    <div className="flex items-center justify-between px-4 pt-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">معاينة ثلاثية الأبعاد</p><p className="mt-1 font-bold text-white">{vehicleName}</p></div>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">360°</span>
    </div>
    <div ref={host} className="h-64 w-full touch-pan-y cursor-grab active:cursor-grabbing" aria-label="اسحب لتدوير الدراجة ثلاثية الأبعاد" />
    <p className="px-4 pb-3 text-center text-xs text-slate-400">اسحب الدراجة بإصبعك لتدويرها ومشاهدة جميع الجهات</p>
  </section>;
}
