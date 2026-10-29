import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { RitualGround } from './RitualGround.js';
import { SevenAffectionsTower } from './SevenAffectionsTower.js';
import { PerimeterStructures } from './PerimeterStructures.js';
import { AtmosphericEnvironment } from './AtmosphericEnvironment.js';
import { SceneProps } from './SceneProps.js';
import { BackgroundSetpieces } from './BackgroundSetpieces.js';

const SETTINGS = Object.freeze({
  fov: 56,
  near: 0.05,
  far: 650,
  exposure: 1.18,
});

const CAMERA_PRESETS = Object.freeze([
  {
    position: [-153, 15, 27],
    target: [-92, 11, 78],
  },
  {
    position: [0, 80, 300],
    target: [-18, 40, 50],
  },
  {
    position: [-67, 63, 155],
    target: [-19, 69, 81],
  },
  {
    position: [8, 8, 177],
    target: [5, 7, 158],
  },
  {
    position: [30, 13, 230],
    target: [-19, 42, 81],
  },
  {
    position: [155, 58, 145],
    target: [-19, 55, 81],
  },
  {
    position: [-165, 85, 245],
    target: [-20, 65, 75],
  },
  {
    position: [5, 18, 215],
    target: [0, 15, 145],
  },
  {
    position: [120, 170, 220],
    target: [-20, 25, 65],
  },
  {
    position: [-190, 55, -95],
    target: [-20, 45, 75],
  },
]);

const LIGHTING = Object.freeze({
  ambient: { color: 0x3b080b, intensity: 0.92 },
  hemisphere: { sky: 0xbd0a12, ground: 0x070003, intensity: 3.1 },
  redKey: { color: 0xff2418, intensity: 4.1, position: [-72, 118, 86] },
  warmFront: { color: 0xff9a63, intensity: 5.1, position: [38, 44, 92] },
  cyanRim: { color: 0x72c6c9, intensity: 2.15, position: [-96, 52, -78] },
  rearGlow: {
    color: 0xd4000b,
    intensity: 10000,
    distance: 300,
    decay: 2,
    position: [0, 82, -94],
  },
  entranceGlow: {
    color: 0xff2014,
    intensity: 0,
    distance: 0,
    decay: 2,
    position: [0, 4, 54],
  },
  uplights: {
    color: 0xffbbb8,
    intensity: 10000,
    distance: 163,
    angle: 0.6,
    penumbra: 0.5,
    decay: 1.25,
    targetHeight: 54,
    positions: [
      [-38, -5, 24],
      [114, 71, -136],
      [-27, 76, -250],
    ],
  },
});

export class World {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.fpsElement = document.querySelector('#fps-counter');
    this.fpsFrames = 0;
    this.fpsElapsed = 0;

    this._createScene();
    this._createCamera();
    this._createRenderer();
    this._createLighting();

    this.ground = new RitualGround(this.scene, this.renderer);
    this.atmosphere = new AtmosphericEnvironment(this.scene);
    this.tower = new SevenAffectionsTower();
    this.perimeterTowers = new PerimeterStructures();
    this.scene.add(this.tower.group, this.perimeterTowers.group);
    this.sceneProps = new SceneProps(this.scene);
    this.backgroundSetpieces = new BackgroundSetpieces(this.scene);

    this._createControls();
    this._createInterface();
    this._connectEvents();

  }

  start() {
    this.renderer.setAnimationLoop(() => this._animate());
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080001);
    this.scene.fog = new THREE.FogExp2(0x120001, 0.0034);
  }

  _createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      SETTINGS.fov,
      window.innerWidth / window.innerHeight,
      SETTINGS.near,
      SETTINGS.far,
    );
    this.camera.position.set(0, 75, 205);
  }

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = SETTINGS.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  _createLighting() {
    this.scene.add(new THREE.AmbientLight(
      LIGHTING.ambient.color,
      LIGHTING.ambient.intensity,
    ));
    this.scene.add(new THREE.HemisphereLight(
      LIGHTING.hemisphere.sky,
      LIGHTING.hemisphere.ground,
      LIGHTING.hemisphere.intensity,
    ));

    this._addDirectionalLight(LIGHTING.redKey);
    this._addDirectionalLight(LIGHTING.warmFront);
    this._addDirectionalLight(LIGHTING.cyanRim);
    this._addPointLight(LIGHTING.rearGlow);
    this._addPointLight(LIGHTING.entranceGlow);

    this.uplights = [];
    LIGHTING.uplights.positions.forEach((position) => {
      const light = new THREE.SpotLight(
        LIGHTING.uplights.color,
        LIGHTING.uplights.intensity,
        LIGHTING.uplights.distance,
        LIGHTING.uplights.angle,
        LIGHTING.uplights.penumbra,
        LIGHTING.uplights.decay,
      );
      light.position.set(...position);
      light.target.position.set(0, LIGHTING.uplights.targetHeight, 0);
      this.scene.add(light, light.target);
      this.uplights.push(light);
    });
  }

  _addDirectionalLight(config) {
    const light = new THREE.DirectionalLight(config.color, config.intensity);
    light.position.set(...config.position);
    this.scene.add(light);
  }

  _addPointLight(config) {
    const light = new THREE.PointLight(
      config.color,
      config.intensity,
      config.distance,
      config.decay,
    );
    light.position.set(...config.position);
    this.scene.add(light);
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 45, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.zoomToCursor = true;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.75;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 520;
    this.controls.minPolarAngle = 0.02;
    this.controls.maxPolarAngle = Math.PI - 0.02;
    this.controls.update();
    this.controls.saveState();
    this.cameraTransition = null;
    this.activeCameraPreset = null;
    this.onControlsStart = () => {
      if (!this.cameraTransition) this.activeCameraPreset = null;
    };
    this.controls.addEventListener('start', this.onControlsStart);
  }

  _startCameraPreset(index) {
    const preset = CAMERA_PRESETS[index];
    if (!preset) return;

    this.cameraTransition = {
      elapsed: 0,
      duration: 0.65,
      startPosition: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPosition: new THREE.Vector3(...preset.position),
      endTarget: new THREE.Vector3(...preset.target),
    };
    this.activeCameraPreset = index === 9 ? 0 : index + 1;
    this.controls.enabled = false;
  }

  _updateCameraTransition(deltaTime) {
    if (!this.cameraTransition) return;

    const transition = this.cameraTransition;
    transition.elapsed = Math.min(transition.elapsed + deltaTime, transition.duration);
    const progress = transition.elapsed / transition.duration;
    const eased = progress < 0.5
      ? 4 * progress ** 3
      : 1 - ((-2 * progress + 2) ** 3) / 2;

    this.camera.position.lerpVectors(
      transition.startPosition,
      transition.endPosition,
      eased,
    );
    this.controls.target.lerpVectors(
      transition.startTarget,
      transition.endTarget,
      eased,
    );

    if (progress >= 1) {
      this.cameraTransition = null;
      this.controls.enabled = true;
    }
  }

  _createInterface() {
    this.pane = new Pane({ title: 'Controls' });
    this.pane.element.classList.add('debug-panel');
    this.pane.addBinding(this.sceneProps.platformSettings, 'visible', {
      label: 'Platforms',
    }).on('change', () => this.sceneProps.applyPlatformVisibility());
  }

  _connectEvents() {
    this.onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.ground.resize();
    };
    this.onKeyDown = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) return;

      const presetIndex = {
        Digit1: 0,
        Numpad1: 0,
        Digit2: 1,
        Numpad2: 1,
        Digit3: 2,
        Numpad3: 2,
        Digit4: 3,
        Numpad4: 3,
        Digit5: 4,
        Numpad5: 4,
        Digit6: 5,
        Numpad6: 5,
        Digit7: 6,
        Numpad7: 6,
        Digit8: 7,
        Numpad8: 7,
        Digit9: 8,
        Numpad9: 8,
        Digit0: 9,
        Numpad0: 9,
      }[event.code];
      if (presetIndex !== undefined) this._startCameraPreset(presetIndex);
    };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
  }

  _animate() {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this._updateCameraTransition(deltaTime);
    this.controls.update();
    this.sceneProps.update(deltaTime);
    this.atmosphere.update(deltaTime, this.camera);
    this.renderer.render(this.scene, this.camera);

    this.fpsFrames += 1;
    this.fpsElapsed += deltaTime;
    if (this.fpsElement && this.fpsElapsed >= 0.5) {
      this.fpsElement.textContent = `${Math.round(this.fpsFrames / this.fpsElapsed)} FPS`;
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
    }
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.pane.dispose();
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.dispose();
    this.renderer.setAnimationLoop(null);
    this.ground.dispose();
    this.atmosphere.dispose();
    this.tower.dispose();
    this.perimeterTowers.dispose();
    this.sceneProps.dispose();
    this.backgroundSetpieces.dispose();
    this.renderer.dispose();
  }
}
