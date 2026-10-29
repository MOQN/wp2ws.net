import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const OUTER_MODEL_SCALE = 3;
const CENTRAL_TOWER_BASE_HEIGHT = 19.7;
const PERIMETER_RADIUS = 140;

const STRUCTURES = [
  { name: 'PerimeterPagoda', url: 'models/pagoda.glb', angle: 2.97 },
  { name: 'PerimeterPavilion', url: 'models/pavilion.glb', angle: 5.06 },
];

export class PerimeterStructures {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PerimeterStructures';
    this.disposed = false;
    this.loadedCount = 0;
    this.errorCount = 0;
    this._loadAll();
  }

  async _loadAll() {
    const loader = new GLTFLoader();

    for (const definition of STRUCTURES) {
      if (this.disposed) return;

      try {
        const gltf = await loader.loadAsync(definition.url);
        if (this.disposed) {
          this._disposeObject(gltf.scene);
          return;
        }
        this._placeModel(gltf.scene, definition);
      } catch (error) {
        this.errorCount += 1;
        console.warn(`Unable to load ${definition.name}`, error);
      }
    }
  }

  _placeModel(model, definition) {
    model.name = definition.name;
    model.updateMatrixWorld(true);

    const sourceBounds = new THREE.Box3().setFromObject(model);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const visualScale = (CENTRAL_TOWER_BASE_HEIGHT / sourceSize.y) * OUTER_MODEL_SCALE;
    model.scale.multiplyScalar(visualScale);
    model.updateMatrixWorld(true);

    const scaledBounds = new THREE.Box3().setFromObject(model);
    const angle = definition.angle;
    model.position.set(
      Math.sin(angle) * PERIMETER_RADIUS,
      -scaledBounds.min.y + 0.02,
      Math.cos(angle) * PERIMETER_RADIUS,
    );
    model.rotation.y = angle + Math.PI;

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
    });

    this.group.add(model);
    this.loadedCount += 1;
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
    this._disposeObject(this.group);
  }
}
