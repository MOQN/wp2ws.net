import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PLATFORM_URL = 'models/stone-platform/stone_circular_platform_3d_model.fbx';
const ANTIQUE_STATUE_URL = 'models/antique-statue.glb';
const MALE_CHARACTER_URL = 'models/male-character.glb';

export class SceneProps {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = 'ImportedSceneProps';
    this.loadedCount = 0;
    this.errorCount = 0;
    this.disposed = false;
    this.motionTime = 0;
    this.floatTime = 0;
    this.eulerDiskSettings = {
      playing: true,
      speed: 0.25,
      wobbleDegrees: 2.5,
      floatAmplitude: 0.35,
      floatSpeed: 0.7,
    };
    this.platformSettings = { visible: true };
    this.precessionQuaternion = new THREE.Quaternion();
    this.wobbleQuaternion = new THREE.Quaternion();
    this.baseQuaternion = new THREE.Quaternion();
    this.baseEuler = new THREE.Euler();
    this.verticalAxis = new THREE.Vector3(0, 1, 0);
    this.wobbleAxis = new THREE.Vector3(1, 0, 0);
    this.statueMixer = null;
    this.statueAnimationCount = 0;
    this.maleCharacterMixer = null;
    this.maleCharacterAnimationCount = 0;

    const platformLayout = [
      { x: 13, y: 6, z: 109, rotationX: 8, rotationY: 0, rotationZ: 0 },
      { x: 111, y: 6, z: -18, rotationX: -8, rotationY: 12, rotationZ: 0 },
      { x: -26, y: 2, z: 123, rotationX: 4, rotationY: -16, rotationZ: 20 },
      { x: -72, y: 2, z: 95, rotationX: -4, rotationY: 18, rotationZ: 0 },
      { x: 59, y: 6, z: -53, rotationX: 12, rotationY: -27, rotationZ: 4 },
      { x: 26, y: 10, z: -89, rotationX: -12, rotationY: 6, rotationZ: 0 },
      { x: 98, y: 4, z: -60, rotationX: 6, rotationY: -28, rotationZ: -9 },
      { x: 85, y: 6, z: 24, rotationX: 4, rotationY: 34, rotationZ: 5 },
      { x: 117, y: 2, z: 53, rotationX: 20, rotationY: -31, rotationZ: -3 },
      { x: -13, y: 6, z: -103, rotationX: -5, rotationY: 14, rotationZ: 8 },
      { x: -85, y: 2, z: 3, rotationX: -23, rotationY: 86, rotationZ: 0 },
      { x: -124, y: 10, z: -25, rotationX: -7, rotationY: 83, rotationZ: 6 },
      { x: -72, y: 4, z: -82, rotationX: 5, rotationY: -72, rotationZ: -4 },
      { x: -59, y: 8, z: 67, rotationX: -11, rotationY: 27, rotationZ: 3 },
      { x: -91, y: 6, z: 46, rotationX: 8, rotationY: -12, rotationZ: -7 },
      { x: 52, y: 6, z: 88, rotationX: -6, rotationY: 51, rotationZ: 4 },
    ];
    this.platforms = platformLayout.map((position, index) => this._createAsset(
      `StoneCircularPlatform${index + 1}`,
      {
        visible: true,
        x: position.x,
        y: position.y,
        z: position.z,
        rotationX: position.rotationX,
        rotationY: position.rotationY,
        rotationZ: position.rotationZ,
        scale: 0.24,
      },
    ));
    this.platform = this.platforms[0];
    this.statue = this._createAsset('AnimatedAntiqueStatue', {
      visible: true,
      x: -123,
      y: 4,
      z: 46,
      rotationX: -16,
      rotationY: 0,
      rotationZ: 0,
      scale: 0.8,
    });
    this.maleCharacter = this._createAsset('MaleCharacter', {
      visible: true,
      x: 5,
      y: 3,
      z: 158,
      rotationX: 0,
      rotationY: -25,
      rotationZ: 0,
      scale: 0.8,
    });

    scene.add(this.root);
    this._loadPlatform();
    this._loadStatue();
    this._loadMaleCharacter();
  }

  _createAsset(name, params) {
    const group = new THREE.Group();
    group.name = name;
    this.root.add(group);
    const asset = { group, params, model: null, loaded: false };
    this.applyTransform(asset);
    return asset;
  }

  applyTransform(asset) {
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

  applyPlatformVisibility() {
    this.platforms.forEach(({ group }) => {
      group.visible = this.platformSettings.visible;
    });
  }

  update(deltaTime) {
    this.floatTime += deltaTime;
    if (this.eulerDiskSettings.playing) {
      this.motionTime += deltaTime * this.eulerDiskSettings.speed;
    }

    this.platforms.forEach(({ group, params }, index) => {
      const floatOffset = Math.sin(
        this.floatTime * this.eulerDiskSettings.floatSpeed + index * 0.8,
      ) * this.eulerDiskSettings.floatAmplitude;
      const wobble = THREE.MathUtils.degToRad(this.eulerDiskSettings.wobbleDegrees)
        * Math.sin(this.motionTime * 2 + index * 0.55);

      group.position.set(params.x, params.y + floatOffset, params.z);
      this.baseEuler.set(
        THREE.MathUtils.degToRad(params.rotationX),
        THREE.MathUtils.degToRad(params.rotationY),
        THREE.MathUtils.degToRad(params.rotationZ),
      );
      this.baseQuaternion.setFromEuler(this.baseEuler);
      this.precessionQuaternion.setFromAxisAngle(this.verticalAxis, this.motionTime);
      this.wobbleQuaternion.setFromAxisAngle(this.wobbleAxis, wobble);
      group.quaternion
        .copy(this.precessionQuaternion)
        .multiply(this.wobbleQuaternion)
        .multiply(this.baseQuaternion);
    });

    if (this.statueMixer) this.statueMixer.update(deltaTime);
    if (this.maleCharacterMixer) this.maleCharacterMixer.update(deltaTime);
  }

  async _loadPlatform() {
    try {
      const loader = new FBXLoader();
      loader.setResourcePath('models/stone-platform/');
      const model = await loader.loadAsync(PLATFORM_URL);
      if (this.disposed) {
        this._disposeObject(model);
        return;
      }
      const platformModels = this.platforms.map((asset, index) => (
        index === 0 ? model : model.clone(true)
      ));
      this.platforms.forEach((asset, index) => {
        this._placeModel(asset, platformModels[index], { mode: 'width', size: 70 });
      });
    } catch (error) {
      this.errorCount += 1;
      console.warn('Unable to load the stone circular platform', error);
    }
  }

  async _loadStatue() {
    try {
      const gltf = await new GLTFLoader().loadAsync(ANTIQUE_STATUE_URL);
      if (this.disposed) {
        this._disposeObject(gltf.scene);
        return;
      }
      this._placeModel(this.statue, gltf.scene, { mode: 'height', size: 10 });
      this.statueAnimationCount = gltf.animations.length;
      if (gltf.animations.length > 0) {
        this.statueMixer = new THREE.AnimationMixer(gltf.scene);
        this.statueMixer.clipAction(gltf.animations[0]).play();
      }
    } catch (error) {
      this.errorCount += 1;
      console.warn('Unable to load the animated antique statue', error);
    }
  }

  async _loadMaleCharacter() {
    try {
      const gltf = await new GLTFLoader().loadAsync(MALE_CHARACTER_URL);
      if (this.disposed) {
        this._disposeObject(gltf.scene);
        return;
      }
      this._placeModel(this.maleCharacter, gltf.scene, { mode: 'height', size: 10 });
      this.maleCharacterAnimationCount = gltf.animations.length;
      if (gltf.animations.length > 0) {
        this.maleCharacterMixer = new THREE.AnimationMixer(gltf.scene);
        this.maleCharacterMixer.clipAction(gltf.animations[0]).play();
      }
    } catch (error) {
      this.errorCount += 1;
      console.warn('Unable to load the male character', error);
    }
  }

  _placeModel(asset, model, normalization) {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const referenceSize = normalization.mode === 'height'
      ? size.y
      : Math.max(size.x, size.z);

    if (!Number.isFinite(referenceSize) || referenceSize <= 0) {
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
        material.needsUpdate = true;
      });
    });

    const normalizedGroup = new THREE.Group();
    normalizedGroup.name = `${asset.group.name}Normalized`;
    normalizedGroup.scale.setScalar(normalization.size / referenceSize);
    normalizedGroup.add(model);
    asset.group.add(normalizedGroup);
    asset.model = model;
    asset.loaded = true;
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
    this.root.removeFromParent();
    this.platforms.forEach((platform) => {
      if (platform.model) this._disposeObject(platform.model);
    });
    if (this.statueMixer) this.statueMixer.stopAllAction();
    if (this.statue.model) this._disposeObject(this.statue.model);
    if (this.maleCharacterMixer) this.maleCharacterMixer.stopAllAction();
    if (this.maleCharacter.model) this._disposeObject(this.maleCharacter.model);
  }
}
