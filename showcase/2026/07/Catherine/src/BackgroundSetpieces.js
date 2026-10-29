import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ASSETS = [
  {
    name: 'Ruin01',
    url: 'models/background/ruin-01.glb',
    type: 'ruin',
    height: 62,
    placements: [
      { position: [-182, -5, -42], rotationY: 22, scale: 1.08 },
      {
        position: [113, -9, 113],
        rotationX: -16,
        rotationY: -34,
        scale: 0.7,
      },
    ],
  },
  {
    name: 'Ruin02',
    url: 'models/background/ruin-02.glb',
    type: 'ruin',
    height: 72,
    placements: [
      { position: [-118, -9, -142], rotationY: 38, scale: 0.9 },
      {
        position: [139, -14, -154],
        rotationY: -28,
        rotationZ: 4,
        scale: 1.07,
      },
    ],
  },
  {
    name: 'Ruin03',
    url: 'models/background/ruin-03.glb',
    type: 'ruin',
    height: 58,
    placements: [
      {
        position: [-238, -6, 54],
        rotationY: 72,
        scale: 1.89,
        visible: false,
      },
      { position: [-1, -7, 157], rotationY: 0, scale: 0.74 },
    ],
  },
  {
    name: 'Ruin04',
    url: 'models/background/ruin-04.glb',
    type: 'ruin',
    height: 54,
    placements: [
      {
        position: [-17, -12, -217],
        rotationX: -12,
        rotationY: 0,
        scale: 1.07,
      },
      { position: [76, -11, -224], rotationY: -18, scale: 0.88 },
    ],
  },
  {
    name: 'TwistedFloweringTree',
    url: 'models/background/twisted-flowering-tree.glb',
    type: 'tree',
    height: 118,
    placements: [
      { position: [-183, 1, -113], rotationY: 18, rotationZ: -3, scale: 0.78 },
      { position: [88, -9, -118], rotationY: -32, rotationZ: 3, scale: 1.11 },
      {
        position: [-226, -4, 43],
        rotationX: 4,
        rotationY: 102,
        rotationZ: -5,
        scale: 1.03,
      },
      {
        position: [243, -14, -166],
        rotationY: -39,
        rotationZ: 16,
        scale: 1.23,
      },
      { position: [-87, -14, -252], rotationY: 164, rotationZ: 2, scale: 1.36 },
    ],
  },
];

export class BackgroundSetpieces {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'BackgroundSetpieces';
    this.ruinsGroup = new THREE.Group();
    this.ruinsGroup.name = 'BackgroundRuins';
    this.treesGroup = new THREE.Group();
    this.treesGroup.name = 'TwistedPlumTrees';
    this.group.add(this.ruinsGroup, this.treesGroup);
    scene.add(this.group);

    this.loadedCount = 0;
    this.instances = [];
    this.instanceCount = 0;
    this.errorCount = 0;
    this.disposed = false;
    this.settings = {
      visible: true,
      ruinsVisible: true,
      treesVisible: true,
      scale: 1,
    };

    this._createInstancePlaceholders();
    this._loadAll();
  }

  _createInstancePlaceholders() {
    ASSETS.forEach((definition) => {
      const destination = definition.type === 'tree' ? this.treesGroup : this.ruinsGroup;
      definition.placements.forEach((placement, index) => {
        const group = new THREE.Group();
        group.name = `${definition.name}_${index + 1}`;
        destination.add(group);

        const asset = {
          definitionName: definition.name,
          title: definition.type === 'tree'
            ? `扭曲梅树 ${index + 1} · Plum Tree ${index + 1}`
            : `残垣 ${definition.name.slice(-2)}-${index + 1} · Ruin`,
          group,
          loaded: false,
          params: {
            visible: placement.visible ?? true,
            x: placement.position[0],
            y: placement.position[1],
            z: placement.position[2],
            rotationX: placement.rotationX ?? 0,
            rotationY: placement.rotationY ?? 0,
            rotationZ: placement.rotationZ ?? 0,
            scale: placement.scale ?? 1,
          },
        };
        this.instances.push(asset);
        this.applyInstanceTransform(asset);
      });
    });
    this.instanceCount = this.instances.length;
  }

  async _loadAll() {
    const loader = new GLTFLoader();
    for (const definition of ASSETS) {
      if (this.disposed) return;
      try {
        const gltf = await loader.loadAsync(definition.url);
        if (this.disposed) {
          this._disposeObject(gltf.scene);
          return;
        }
        this._placeAsset(gltf.scene, definition);
      } catch (error) {
        this.errorCount += 1;
        console.warn(`Unable to load ${definition.name}`, error);
      }
    }
  }

  _placeAsset(model, definition) {
    model.name = `${definition.name}Source`;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    if (!Number.isFinite(size.y) || size.y <= 0) {
      this.errorCount += 1;
      this._disposeObject(model);
      return;
    }

    model.position.set(-center.x, -bounds.min.y, -center.z);
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        material.roughness = Math.max(0.72, material.roughness ?? 0.72);
        material.needsUpdate = true;
      });
    });

    const normalized = new THREE.Group();
    normalized.name = `${definition.name}Normalized`;
    normalized.scale.setScalar(definition.height / size.y);
    normalized.add(model);

    const matchingInstances = this.instances.filter(
      (asset) => asset.definitionName === definition.name,
    );
    matchingInstances.forEach((asset, index) => {
      const visual = index === 0 ? normalized : normalized.clone(true);
      visual.name = `${definition.name}Visual_${index + 1}`;
      asset.group.add(visual);
      asset.loaded = true;
    });

    this.loadedCount += 1;
  }

  applySettings() {
    this.group.visible = this.settings.visible;
    this.group.scale.setScalar(this.settings.scale);
    this.ruinsGroup.visible = this.settings.ruinsVisible;
    this.treesGroup.visible = this.settings.treesVisible;
  }

  applyInstanceTransform(asset) {
    const { params, group } = asset;
    group.visible = params.visible;
    group.position.set(params.x, params.y, params.z);
    group.rotation.set(
      THREE.MathUtils.degToRad(params.rotationX),
      THREE.MathUtils.degToRad(params.rotationY),
      THREE.MathUtils.degToRad(params.rotationZ),
    );
    group.scale.setScalar(params.scale);
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
