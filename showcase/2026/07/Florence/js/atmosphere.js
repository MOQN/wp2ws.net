import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export async function loadSky(scene, renderer) {
  const texture = await new EXRLoader().setDataType(THREE.FloatType).loadAsync('./assets/sunflowers_puresky_4k.exr');
  const source = texture.image.data;
  const packed = new Uint16Array(source.length);
  for (let i = 0; i < source.length; i++) {
    packed[i] = THREE.DataUtils.toHalfFloat(Math.min(128, Math.max(0, source[i])));
  }
  texture.image.data = packed;
  texture.type = THREE.HalfFloatType;
  texture.needsUpdate = true;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(texture);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.32;
  scene.environmentRotation.set(-1.1, 0.65, 0);
  pmrem.dispose();
  return { texture, environment };
}

export const DREAM_SETTINGS = {
  cloudOpacity: 0.32,
  driftSpeed: 0.002,
  mistOpacity: 0.18
};

export function createDreamBackground(scene) {

  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#b4cce5');
  gradient.addColorStop(0.45, '#c0d6e9');
  gradient.addColorStop(0.72, '#dce3ef');
  gradient.addColorStop(1, '#e7ddeb');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 30; i++) {
    const x = (i * 197.7) % 1024;
    const y = 120 + ((i * 83.3) % 260);
    for (const offset of [-1024, 0, 1024]) {
      ctx.save(); ctx.translate(x + offset, y); ctx.scale(1, 0.36);
      const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 + (i % 4) * 20);
      cloud.addColorStop(0, `rgba(255,251,255,${DREAM_SETTINGS.cloudOpacity})`);
      cloud.addColorStop(0.45, 'rgba(255,251,255,0.12)');
      cloud.addColorStop(1, 'rgba(255,251,255,0)');
      ctx.fillStyle = cloud; ctx.fillRect(-170, -170, 340, 340); ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.name = 'Soft dream panorama'; sky.renderOrder = -100;
  scene.add(sky);

  const mistCanvas = document.createElement('canvas');
  mistCanvas.width = mistCanvas.height = 128;
  const m = mistCanvas.getContext('2d');
  const feather = m.createRadialGradient(64, 64, 0, 64, 64, 64);
  feather.addColorStop(0, 'rgba(255,255,255,0.9)');
  feather.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  feather.addColorStop(1, 'rgba(255,255,255,0)');
  m.fillStyle = feather; m.fillRect(0, 0, 128, 128);
  const mistMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mistCanvas), color: '#d5deed',
    opacity: DREAM_SETTINGS.mistOpacity, transparent: true, depthWrite: false, fog: false });
  const mist = new THREE.Group(); mist.name = 'Lower dream haze';
  for (const [x, y, z, width] of [[-9,-12,2,30],[7,-18,-12,35],[-13,-23,-26,42],[10,-29,-38,48]]) {
    const sprite = new THREE.Sprite(mistMaterial);
    sprite.position.set(x,y,z); sprite.scale.set(width, width * 0.32, 1); mist.add(sprite);
  }
  scene.add(mist);
  return { sky, mist, mistMaterial };
}

export function updateSky(scene, skyTime, atmosphere, camera) {
  const rotation = 0.65 + skyTime * DREAM_SETTINGS.driftSpeed;
  scene.backgroundRotation.y = rotation;
  atmosphere.sky.position.copy(camera.position);
  atmosphere.sky.rotation.y = rotation;
}
