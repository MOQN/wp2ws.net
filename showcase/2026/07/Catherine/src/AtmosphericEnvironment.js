import * as THREE from 'three';

const EMOTIONS = ['喜', '怒', '忧', '思', '悲', '恐', '惊'];
const PERIMETER_RADIUS = 140;
const PERIMETER_ANGLES = [0.88, 2.97, 5.06];

function createRandom(seed = 1337) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createFogTexture(random) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 28; index += 1) {
    const x = 28 + random() * 200;
    const y = 45 + random() * 45;
    const radius = 22 + random() * 42;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.08 + random() * 0.11})`);
    gradient.addColorStop(0.45, `rgba(255, 255, 255, ${0.035 + random() * 0.055})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSparkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255, 244, 224, 1)');
  gradient.addColorStop(0.15, 'rgba(255, 92, 48, 0.95)');
  gradient.addColorStop(0.48, 'rgba(190, 10, 10, 0.42)');
  gradient.addColorStop(1, 'rgba(90, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function createRuneTexture(character) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 192, 192);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 112px serif';
  context.shadowColor = '#ff1208';
  context.shadowBlur = 28;
  context.fillStyle = '#ff9a83';
  context.fillText(character, 96, 97);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class AtmosphericEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;
    this.random = createRandom();
    this.root = new THREE.Group();
    this.root.name = 'AtmosphericEnvironment';
    this.textures = [];
    this.materials = [];
    this.geometries = [];
    this.clouds = [];
    this.fogSprites = [];
    this.perimeterFogMaterials = [];
    this.groundMistMaterials = [];
    this.horizonFogSprites = [];
    this.horizonFogMaterials = [];
    this.fogSettings = {
      perimeterVisible: true,
      perimeterOpacity: 1,
      groundVisible: true,
      groundOpacity: 1,
      driftSpeed: 1,
      horizonVisible: true,
      horizonColor: '#8f7376',
      horizonOpacity: 1.11,
      horizonRadius: 292,
      horizonHeight: 108,
      horizonBottom: -8,
      horizonSoftness: 0.71,
      horizonTurbulence: 0.73,
    };

    this._createSkyDome();
    this._createMoon();
    this._createClouds();
    this._createGroundTreatment();
    this._createHorizonFog();
    this._createPerimeterFog();
    this._createGroundMist();
    this._createAshParticles();
    this._createRitualRing();

    scene.add(this.root);
  }

  _trackTexture(texture) {
    this.textures.push(texture);
    return texture;
  }

  _trackMaterial(material) {
    this.materials.push(material);
    return material;
  }

  _trackGeometry(geometry) {
    this.geometries.push(geometry);
    return geometry;
  }

  _createSkyDome() {
    const geometry = this._trackGeometry(new THREE.SphereGeometry(600, 48, 32));
    const material = this._trackMaterial(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uZenith: { value: new THREE.Color(0x2b1015) },
        uHorizon: { value: new THREE.Color(0x6f252d) },
        uGlow: { value: new THREE.Color(0x000000) },
      },
      vertexShader: `
        varying vec3 vLocalPosition;
        void main() {
          vLocalPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uGlow;
        varying vec3 vLocalPosition;
        void main() {
          vec3 direction = normalize(vLocalPosition);
          float heightMix = smoothstep(-0.12, 0.72, direction.y);
          vec3 color = mix(uHorizon, uZenith, heightMix);
          vec3 moonDirection = normalize(vec3(0.0, 0.34, -1.0));
          float glow = pow(max(dot(direction, moonDirection), 0.0), 8.0);
          color += uGlow * glow * 0.42;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }));
    this.sky = new THREE.Mesh(geometry, material);
    this.sky.name = 'CrimsonSkyDome';
    this.sky.renderOrder = -100;
    this.root.add(this.sky);
  }

  _createMoon() {
    const texture = this._trackTexture(new THREE.TextureLoader().load('textures/red-moon.png'));
    texture.colorSpace = THREE.SRGBColorSpace;
    const coreMaterial = this._trackMaterial(new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      fog: false,
    }));

    this.moonCore = new THREE.Sprite(coreMaterial);
    this.moonCore.position.set(-125, 165, -310);
    this.moonCore.scale.set(110, 110, 1);
    this.moonCore.renderOrder = -89;
    this.root.add(this.moonCore);
  }

  _createClouds() {
    const texture = this._trackTexture(createFogTexture(createRandom(721)));
    for (let index = 0; index < 15; index += 1) {
      const material = this._trackMaterial(new THREE.SpriteMaterial({
        map: texture,
        color: index % 3 === 0 ? 0x78434a : 0x43282c,
        transparent: true,
        opacity: 0.16 + this.random() * 0.16,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        fog: false,
      }));
      const sprite = new THREE.Sprite(material);
      const angle = this.random() * Math.PI * 2;
      const radius = 275 + this.random() * 95;
      const width = 90 + this.random() * 130;
      const height = 24 + this.random() * 42;
      sprite.position.set(Math.sin(angle) * radius, 75 + this.random() * 150, Math.cos(angle) * radius);
      sprite.scale.set(width, height, 1);
      sprite.renderOrder = -70;
      sprite.userData = {
        angle,
        radius,
        height: sprite.position.y,
        speed: 0.008 + this.random() * 0.01,
        phase: this.random() * Math.PI * 2,
      };
      this.clouds.push(sprite);
      this.root.add(sprite);
    }
  }

  _createGroundTreatment() {
    const edgeGeometry = this._trackGeometry(new THREE.PlaneGeometry(1200, 1200));
    this.edgeVeilMaterial = this._trackMaterial(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uColor: { value: new THREE.Color(this.fogSettings.horizonColor) },
        uOpacity: { value: Math.min(0.98, this.fogSettings.horizonOpacity * 0.86) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float distanceFromCenter = length((vUv - 0.5) * 2.0);
          float veil = smoothstep(0.46, 0.97, distanceFromCenter);
          gl_FragColor = vec4(uColor, veil * uOpacity);
        }
      `,
    }));
    this.edgeVeil = new THREE.Mesh(edgeGeometry, this.edgeVeilMaterial);
    this.edgeVeil.rotation.x = -Math.PI / 2;
    this.edgeVeil.position.y = 0.006;
    this.edgeVeil.renderOrder = 1;
    this.edgeVeil.visible = false;
    this.root.add(this.edgeVeil);

    const rippleGeometry = this._trackGeometry(new THREE.PlaneGeometry(760, 760));
    this.rippleMaterial = this._trackMaterial(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x7c080c) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 centered = (vUv - 0.5) * 2.0;
          float radius = length(centered);
          float wave = 0.5 + 0.5 * sin(radius * 78.0 - uTime * 0.8);
          wave = pow(wave, 18.0);
          float fade = (1.0 - smoothstep(0.08, 0.96, radius)) * smoothstep(0.01, 0.15, radius);
          gl_FragColor = vec4(uColor, wave * fade * 0.08);
        }
      `,
    }));
    this.ripples = new THREE.Mesh(rippleGeometry, this.rippleMaterial);
    this.ripples.rotation.x = -Math.PI / 2;
    this.ripples.position.y = 0.012;
    this.ripples.renderOrder = 2;
    this.root.add(this.ripples);
  }

  _createPerimeterFog() {
    const texture = this._trackTexture(createFogTexture(createRandom(31415)));
    PERIMETER_ANGLES.forEach((angle, bankIndex) => {
      const centerX = Math.sin(angle) * PERIMETER_RADIUS;
      const centerZ = Math.cos(angle) * PERIMETER_RADIUS;

      for (let index = 0; index < 9; index += 1) {
        const material = this._trackMaterial(new THREE.SpriteMaterial({
          map: texture,
          color: index % 4 === 0 ? 0xffe8e2 : 0xd9c8c8,
          transparent: true,
          opacity: 0.14 + this.random() * 0.15,
          depthWrite: false,
          toneMapped: false,
          fog: true,
        }));
      const sprite = new THREE.Sprite(material);
        this.perimeterFogMaterials.push(material);
        const offsetX = (this.random() - 0.5) * 55;
        const offsetZ = (this.random() - 0.5) * 45;
        const baseY = 3 + this.random() * 24;
        const width = 34 + this.random() * 42;
        const height = 10 + this.random() * 18;
        sprite.position.set(centerX + offsetX, baseY, centerZ + offsetZ);
        sprite.scale.set(width, height, 1);
        sprite.renderOrder = 4;
        sprite.userData = {
          baseX: sprite.position.x,
          baseY,
          baseZ: sprite.position.z,
          phase: this.random() * Math.PI * 2 + bankIndex,
          drift: 0.3 + this.random() * 0.45,
          baseOpacity: material.opacity,
          baseWidth: width,
          baseHeight: height,
        };
        this.fogSprites.push(sprite);
        this.root.add(sprite);
      }
    });
  }

  _createHorizonFog() {
    const texture = this._trackTexture(createFogTexture(createRandom(9041)));
    const random = createRandom(24017);
    this.horizonFog = new THREE.Group();
    this.horizonFog.name = 'LayeredHorizonFogBanks';

    const layers = [
      { count: 38, radiusFactor: 0.9, minHeight: 0.08, maxHeight: 0.32, opacity: 0.22 },
      { count: 46, radiusFactor: 1.0, minHeight: 0.16, maxHeight: 0.52, opacity: 0.16 },
      { count: 30, radiusFactor: 1.08, minHeight: 0.34, maxHeight: 0.72, opacity: 0.09 },
    ];

    layers.forEach((layer, layerIndex) => {
      for (let index = 0; index < layer.count; index += 1) {
        const material = this._trackMaterial(new THREE.SpriteMaterial({
          map: texture,
          color: this.fogSettings.horizonColor,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          depthTest: true,
          toneMapped: false,
          fog: false,
        }));
        const sprite = new THREE.Sprite(material);
        const segment = Math.PI * 2 / layer.count;
        const angle = segment * index + (random() - 0.5) * segment * 0.9;
        const width = 86 + random() * 76 + layerIndex * 12;
        const height = 38 + random() * 42 + layerIndex * 16;
        sprite.renderOrder = -18 + layerIndex;
        sprite.userData = {
          baseAngle: angle,
          radiusFactor: layer.radiusFactor + (random() - 0.5) * 0.08,
          heightFactor: layer.minHeight + random() * (layer.maxHeight - layer.minHeight),
          baseWidth: width,
          baseHeight: height,
          baseOpacity: layer.opacity * (0.72 + random() * 0.5),
          phase: random() * Math.PI * 2,
          drift: (0.0012 + random() * 0.0022) * (random() > 0.5 ? 1 : -1),
          layerIndex,
        };
        this.horizonFogSprites.push(sprite);
        this.horizonFogMaterials.push(material);
        this.horizonFog.add(sprite);
      }
    });

    this.root.add(this.horizonFog);
    this.applyHorizonFogSettings();
  }

  applyHorizonFogSettings() {
    if (!this.horizonFog) return;
    const settings = this.fogSettings;
    this.horizonFog.visible = settings.horizonVisible;
    const radiusScale = settings.horizonRadius / 235;
    const heightScale = settings.horizonHeight / 108;
    const softnessScale = 0.78 + settings.horizonSoftness * 0.58;
    this.horizonFogSprites.forEach((sprite) => {
      const data = sprite.userData;
      const radius = settings.horizonRadius * data.radiusFactor;
      sprite.position.set(
        Math.sin(data.baseAngle) * radius,
        settings.horizonBottom + data.heightFactor * settings.horizonHeight,
        Math.cos(data.baseAngle) * radius,
      );
      sprite.scale.set(
        data.baseWidth * radiusScale * softnessScale,
        data.baseHeight * heightScale * softnessScale,
        1,
      );
      sprite.material.color.set(settings.horizonColor);
      sprite.material.opacity = Math.min(0.82, data.baseOpacity * settings.horizonOpacity);
    });
    this.edgeVeilMaterial.uniforms.uColor.value.set(settings.horizonColor);
    this.edgeVeilMaterial.uniforms.uOpacity.value = Math.min(
      0.52,
      settings.horizonOpacity * 0.42,
    );
  }

  _createGroundMist() {
    const texture = this._trackTexture(createFogTexture(createRandom(1107)));
    for (let index = 0; index < 28; index += 1) {
      const material = this._trackMaterial(new THREE.SpriteMaterial({
        map: texture,
        color: index % 5 === 0 ? 0xb36b68 : 0x694143,
        transparent: true,
        opacity: 0.025 + this.random() * 0.05,
        depthWrite: false,
        toneMapped: false,
        fog: true,
      }));
        const sprite = new THREE.Sprite(material);
      this.groundMistMaterials.push(material);
      const angle = this.random() * Math.PI * 2;
      const radius = 28 + this.random() * 180;
      const baseY = 1.2 + this.random() * 7;
      const width = 25 + this.random() * 54;
      const height = 5 + this.random() * 11;
      sprite.position.set(Math.sin(angle) * radius, baseY, Math.cos(angle) * radius);
      sprite.scale.set(width, height, 1);
      sprite.renderOrder = 3;
      sprite.userData = {
        baseX: sprite.position.x,
        baseY,
        baseZ: sprite.position.z,
        phase: this.random() * Math.PI * 2,
        drift: 0.12 + this.random() * 0.24,
        baseOpacity: material.opacity,
        baseWidth: width,
        baseHeight: height,
      };
      this.fogSprites.push(sprite);
      this.root.add(sprite);
    }
  }

  _createAshParticles() {
    const count = 520;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.ashSpeeds = new Float32Array(count);
    this.ashPhases = new Float32Array(count);
    this.ashRadii = new Float32Array(count);

    const warm = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const radius = 18 + Math.sqrt(this.random()) * 205;
      const angle = this.random() * Math.PI * 2;
      positions[index * 3] = Math.sin(angle) * radius;
      positions[index * 3 + 1] = this.random() * 72;
      positions[index * 3 + 2] = Math.cos(angle) * radius;
      this.ashSpeeds[index] = 1.2 + this.random() * 3.6;
      this.ashPhases[index] = this.random() * Math.PI * 2;
      this.ashRadii[index] = radius;

      if (index % 19 === 0) warm.set(0xffc6a8);
      else if (index % 5 === 0) warm.set(0xff351f);
      else warm.set(0x7c0a09);
      colors[index * 3] = warm.r;
      colors[index * 3 + 1] = warm.g;
      colors[index * 3 + 2] = warm.b;
    }

    const geometry = this._trackGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = this._trackMaterial(new THREE.PointsMaterial({
      map: this._trackTexture(createSparkTexture()),
      size: 0.72,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      alphaTest: 0.02,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: true,
    }));
    this.ash = new THREE.Points(geometry, material);
    this.ash.name = 'RisingAshAndSoulSparks';
    this.root.add(this.ash);
  }

  _createRitualRing() {
    this.ritualRing = new THREE.Group();
    this.ritualRing.name = 'SevenAffectionsRitualRing';
    this.ritualRing.position.y = 62;

    const ringMaterial = this._trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xe11a17,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }));
    [54, 61].forEach((radius, index) => {
      const geometry = this._trackGeometry(new THREE.TorusGeometry(radius, index === 0 ? 0.1 : 0.06, 5, 160));
      const ring = new THREE.Mesh(geometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      this.ritualRing.add(ring);
    });

    EMOTIONS.forEach((emotion, index) => {
      const texture = this._trackTexture(createRuneTexture(emotion));
      const material = this._trackMaterial(new THREE.SpriteMaterial({
        map: texture,
        color: 0xff5a48,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: true,
      }));
      const sprite = new THREE.Sprite(material);
      const angle = index / EMOTIONS.length * Math.PI * 2;
      sprite.position.set(Math.sin(angle) * 58, Math.sin(angle * 2) * 1.5, Math.cos(angle) * 58);
      sprite.scale.set(6.5, 6.5, 1);
      this.ritualRing.add(sprite);
    });

    this.root.add(this.ritualRing);
  }

  update(deltaTime, camera) {
    this.elapsed += deltaTime;
    const time = this.elapsed;
    this.sky.position.copy(camera.position);
    this.rippleMaterial.uniforms.uTime.value = time;
    if (this.horizonFog.visible) {
      const settings = this.fogSettings;
      const radiusScale = settings.horizonRadius / 235;
      const heightScale = settings.horizonHeight / 108;
      const softnessScale = 0.78 + settings.horizonSoftness * 0.58;
      this.horizonFogSprites.forEach((sprite) => {
        const data = sprite.userData;
        const motion = time * this.fogSettings.driftSpeed;
        const angle = data.baseAngle + motion * data.drift;
        const radius = settings.horizonRadius * data.radiusFactor
          + Math.sin(motion * 0.11 + data.phase) * settings.horizonTurbulence * 4;
        const pulse = 1 + Math.sin(motion * 0.16 + data.phase) * 0.07 * settings.horizonTurbulence;
        sprite.position.x = Math.sin(angle) * radius;
        sprite.position.z = Math.cos(angle) * radius;
        sprite.position.y = settings.horizonBottom
          + data.heightFactor * settings.horizonHeight
          + Math.sin(motion * 0.2 + data.phase) * settings.horizonTurbulence * 3.2;
        sprite.scale.set(
          data.baseWidth * radiusScale * softnessScale * pulse,
          data.baseHeight * heightScale * softnessScale / pulse,
          1,
        );
        sprite.material.opacity = Math.min(
          0.82,
          data.baseOpacity * settings.horizonOpacity
            * (0.82 + Math.sin(motion * 0.13 + data.phase) * 0.18),
        );
      });
    }
    this.ritualRing.rotation.y = time * 0.025;
    this.ritualRing.rotation.z = Math.sin(time * 0.08) * 0.012;

    this.clouds.forEach((cloud) => {
      const data = cloud.userData;
      const angle = data.angle + time * data.speed;
      cloud.position.x = Math.sin(angle) * data.radius;
      cloud.position.z = Math.cos(angle) * data.radius;
      cloud.position.y = data.height + Math.sin(time * 0.07 + data.phase) * 4;
    });

    this.fogSprites.forEach((sprite) => {
      const data = sprite.userData;
      const sway = time * data.drift * this.fogSettings.driftSpeed + data.phase;
      sprite.position.x = data.baseX + Math.sin(sway * 0.31) * 4.5;
      sprite.position.z = data.baseZ + Math.cos(sway * 0.27) * 3.5;
      sprite.position.y = data.baseY + Math.sin(sway * 0.44) * 1.2;
      const pulse = 1 + Math.sin(sway * 0.38) * 0.08;
      sprite.scale.set(data.baseWidth * pulse, data.baseHeight / pulse, 1);
      const isPerimeterFog = this.perimeterFogMaterials.includes(sprite.material);
      const opacityMultiplier = isPerimeterFog
        ? this.fogSettings.perimeterOpacity
        : this.fogSettings.groundOpacity;
      sprite.visible = isPerimeterFog
        ? this.fogSettings.perimeterVisible
        : this.fogSettings.groundVisible;
      sprite.material.opacity = data.baseOpacity
        * opacityMultiplier
        * (0.82 + Math.sin(sway * 0.22) * 0.18);
    });

    const positions = this.ash.geometry.attributes.position.array;
    for (let index = 0; index < this.ashSpeeds.length; index += 1) {
      const offset = index * 3;
      positions[offset + 1] += this.ashSpeeds[index] * deltaTime;
      positions[offset] += Math.sin(time * 0.35 + this.ashPhases[index]) * deltaTime * 0.18;
      positions[offset + 2] += Math.cos(time * 0.27 + this.ashPhases[index]) * deltaTime * 0.15;
      if (positions[offset + 1] > 76) {
        const angle = this.ashPhases[index] + time * 0.05;
        positions[offset] = Math.sin(angle) * this.ashRadii[index];
        positions[offset + 1] = this.random() * 2;
        positions[offset + 2] = Math.cos(angle) * this.ashRadii[index];
      }
    }
    this.ash.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.root.removeFromParent();
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
  }
}
