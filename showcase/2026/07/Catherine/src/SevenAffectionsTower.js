import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SIDES = 7;
const FACE_STEP = Math.PI * 2 / SIDES;
const CENTER_MODEL_URL = 'models/mask-tower.glb';
const CENTER_MODEL_SCALE = 10;

export const EMOTIONS = [
  { han: '喜', en: 'JOY' },
  { han: '怒', en: 'ANGER' },
  { han: '忧', en: 'ANXIETY' },
  { han: '思', en: 'CONTEMPLATION' },
  { han: '悲', en: 'SORROW' },
  { han: '恐', en: 'FEAR' },
  { han: '惊', en: 'SHOCK' },
];

export class SevenAffectionsTower {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'TowerOfSevenAffections';

    this.monumentGroup = new THREE.Group();
    this.monumentGroup.name = 'ImportedMaskTower';
    this.monumentGroup.position.set(-19, -60, 81);
    this.group.add(this.monumentGroup);

    this.stoneRadius = 48;
    this.towerCollisionRadius = 40;
    this.stoneCenters = [];
    this.geometries = [];
    this.materials = [];
    this.labelTextures = [];
    this.loadedCount = 0;
    this.errorCount = 0;
    this.disposed = false;
    this.importedModel = null;

    this._createMaterials();
    this._createSteppingStones();
    this._loadCenterTower();
  }

  _createMaterials() {
    this.stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2022,
      metalness: 0.08,
      roughness: 0.92,
    });
    this.materials.push(this.stoneMaterial);
  }

  _trackGeometry(geometry) {
    this.geometries.push(geometry);
    return geometry;
  }

  async _loadCenterTower() {
    try {
      const gltf = await new GLTFLoader().loadAsync(CENTER_MODEL_URL);
      if (this.disposed) {
        this._disposeObject(gltf.scene);
        return;
      }
      this._placeCenterTower(gltf.scene);
      this.loadedCount = 1;
    } catch (error) {
      this.errorCount = 1;
      console.warn('Unable to load the mask tower model', error);
    }
  }

  _placeCenterTower(model) {
    model.name = 'MaskTowerGLB';
    model.updateMatrixWorld(true);

    const sourceBounds = new THREE.Box3().setFromObject(model);
    const center = sourceBounds.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= sourceBounds.min.y;
    model.position.z -= center.z;

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => {
        if (!material) return;
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      });
    });

    this.monumentGroup.scale.setScalar(CENTER_MODEL_SCALE);
    this.monumentGroup.add(model);
    this.monumentGroup.updateMatrixWorld(true);
    this.importedModel = model;

    const scaledBounds = new THREE.Box3().setFromObject(this.monumentGroup);
    const maxX = Math.max(Math.abs(scaledBounds.min.x), Math.abs(scaledBounds.max.x));
    const maxZ = Math.max(Math.abs(scaledBounds.min.z), Math.abs(scaledBounds.max.z));
    const footprintRadius = Math.hypot(maxX, maxZ) + 1.25;
    this.towerCollisionRadius = Math.min(this.stoneRadius - 0.75, footprintRadius);
  }

  _createSteppingStones() {
    const stoneGeometry = this._trackGeometry(new THREE.CylinderGeometry(0.62, 0.72, 0.24, 18));
    const stones = new THREE.InstancedMesh(stoneGeometry, this.stoneMaterial, SIDES);
    stones.name = 'SevenSteppingStones';
    const transform = new THREE.Object3D();

    EMOTIONS.forEach((emotion, index) => {
      const angle = index * FACE_STEP;
      const x = Math.sin(angle) * this.stoneRadius;
      const z = Math.cos(angle) * this.stoneRadius;
      const scale = 0.96 + (index % 3) * 0.035;

      transform.position.set(x, 0.12, z);
      transform.rotation.set(0, angle + index * 0.17, 0);
      transform.scale.set(scale, 1, 1.06 - (index % 2) * 0.04);
      transform.updateMatrix();
      stones.setMatrixAt(index, transform.matrix);

      const label = this._createStoneLabel(emotion);
      label.position.set(x, 0.255, z);
      label.rotation.x = -Math.PI / 2;
      this.group.add(label);

      this.stoneCenters.push({ x, z, emotion });
    });

    stones.instanceMatrix.needsUpdate = true;
    this.group.add(stones);
  }

  _createStoneLabel(emotion) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = '#d9cdb9';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '700 118px serif';
    context.fillText(emotion.han, 128, 126);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.labelTextures.push(texture);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.06,
      depthWrite: false,
      toneMapped: false,
    });
    this.materials.push(material);
    const geometry = this._trackGeometry(new THREE.PlaneGeometry(0.62, 0.62));
    return new THREE.Mesh(geometry, material);
  }

  getActiveEmotion(position) {
    for (const stone of this.stoneCenters) {
      const dx = position.x - stone.x;
      const dz = position.z - stone.z;
      if (dx * dx + dz * dz <= 0.95 * 0.95) return stone.emotion;
    }
    return null;
  }

  constrainPlayer(position) {
    const radius = Math.hypot(position.x, position.z);
    if (radius >= this.towerCollisionRadius) return;

    if (radius < 0.001) {
      position.z = this.towerCollisionRadius;
      return;
    }
    const scale = this.towerCollisionRadius / radius;
    position.x *= scale;
    position.z *= scale;
  }

  _disposeObject(object) {
    const textures = new Set();
    const materials = new Set();
    const geometries = new Set();

    object.traverse((child) => {
      if (!child.isMesh) return;
      if (child.geometry) geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => {
        if (!material) return;
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value?.isTexture) textures.add(value);
        });
      });
    });

    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
  }

  dispose() {
    this.disposed = true;
    this.group.removeFromParent();
    if (this.importedModel) this._disposeObject(this.importedModel);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.labelTextures) texture.dispose();
  }
}
