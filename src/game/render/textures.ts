import * as THREE from 'three';

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createWindowTexture(): THREE.CanvasTexture {
  const texture = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    const glass = ['#5d7a92', '#6f8ca3', '#4d6a80', '#8aa3b5'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = glass[(row * 3 + col * 5) % glass.length];
        ctx.fillRect(col * 32 + 6, row * 32 + 8, 20, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(col * 32 + 6, row * 32 + 8, 20, 3);
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createRoadTexture(): THREE.CanvasTexture {
  const texture = canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#3b3f45';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, 64, 2);
    ctx.fillRect(0, 62, 64, 2);
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 31, 32, 2);
    ctx.fillStyle = 'rgba(244,241,232,0.9)';
    ctx.fillRect(0, 4, 64, 2);
    ctx.fillRect(0, 58, 64, 2);
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createSignTexture(text: string, color: string): THREE.CanvasTexture {
  return canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 488, 104);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 60px Tajawal, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 66, 440);
  });
}

export function createLogoTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 160, (ctx) => {
    ctx.fillStyle = '#d7262e';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 58px Tajawal, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('سويفت', 128, 60);
    ctx.fillText('دروب', 128, 118);
  });
}
