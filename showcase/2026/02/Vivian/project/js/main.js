const RUBIK_COLORS = {
  right: 0xffa39a,
  left: 0xffd4a0,
  top: 0xa8daf0,
  bottom: 0xfff0b8,
  front: 0xfffcf7,
  back: 0xaee8c8,
  inner: 0x1f1f1f,
};

class RubiksCube {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.cubelets = [];
    this.spacing = 1.1;
    this.cubeletSize = 1;
    this.roundness = 0.06;

    this.isAnimating = false;
    this.pendingMoves = [];
    this.moveTimer = 0;
    this.moveInterval = 2.8;

    this.idleRotationSpeed = 0.1;

    this._createCubelets();
    scene.add(this.group);
  }

  _createCubelets() {
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          this._addCubelet(x, y, z);
        }
      }
    }
  }

  _addCubelet(gx, gy, gz) {
    const materials = [
      this._faceMaterial(gx === 1 ? RUBIK_COLORS.right : RUBIK_COLORS.inner),
      this._faceMaterial(gx === -1 ? RUBIK_COLORS.left : RUBIK_COLORS.inner),
      this._faceMaterial(gy === 1 ? RUBIK_COLORS.top : RUBIK_COLORS.inner),
      this._faceMaterial(gy === -1 ? RUBIK_COLORS.bottom : RUBIK_COLORS.inner),
      this._faceMaterial(gz === 1 ? RUBIK_COLORS.front : RUBIK_COLORS.inner),
      this._faceMaterial(gz === -1 ? RUBIK_COLORS.back : RUBIK_COLORS.inner),
    ];

    const geometry = new RoundedBoxGeometry(
      this.cubeletSize,
      this.cubeletSize,
      this.cubeletSize,
      3,
      this.roundness
    );

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(gx * this.spacing, gy * this.spacing, gz * this.spacing);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.group.add(mesh);
    this.cubelets.push({ mesh, gx, gy, gz });
  }

  _faceMaterial(color) {
    const isSticker = color !== RUBIK_COLORS.inner;
    return new THREE.MeshStandardMaterial({
      color,
      emissive: isSticker ? color : 0x000000,
      emissiveIntensity: isSticker ? 0.14 : 0,
      roughness: isSticker ? 0.42 : 0.9,
      metalness: 0.0,
    });
  }

  _getLayerCubelets(axis, index) {
    return this.cubelets.filter((c) => {
      if (axis === "x") return c.gx === index;
      if (axis === "y") return c.gy === index;
      if (axis === "z") return c.gz === index;
      return false;
    });
  }

  _rotateGrid(c, axis, dir) {
    const { gx, gy, gz } = c;
    if (axis === "x") {
      if (dir > 0) { c.gy = -gz; c.gz = gy; }
      else { c.gy = gz; c.gz = -gy; }
    } else if (axis === "y") {
      if (dir > 0) { c.gx = gz; c.gz = -gx; }
      else { c.gx = -gz; c.gz = gx; }
    } else if (axis === "z") {
      if (dir > 0) { c.gx = -gy; c.gy = gx; }
      else { c.gx = gy; c.gy = -gx; }
    }
  }

  rotateLayer(axis, layerIndex, direction = 1, duration = 0.55) {
    if (this.isAnimating) {
      this.pendingMoves.push({ axis, layerIndex, direction, duration });
      return;
    }

    const layer = this._getLayerCubelets(axis, layerIndex);
    if (layer.length === 0) return;

    const pivot = new THREE.Group();
    this.group.add(pivot);

    layer.forEach((c) => pivot.attach(c.mesh));

    this.isAnimating = true;
    this._anim = {
      pivot,
      axis,
      direction,
      layer,
      duration,
      elapsed: 0,
      target: (Math.PI / 2) * direction,
    };
  }

  _finishRotation() {
    const { pivot, axis, direction, layer } = this._anim;
    pivot.rotation[axis] = this._anim.target;

    layer.forEach((c) => {
      this.group.attach(c.mesh);
      this._rotateGrid(c, axis, direction);
    });

    this.group.remove(pivot);
    this.isAnimating = false;
    this._anim = null;

    if (this.pendingMoves.length > 0) {
      const next = this.pendingMoves.shift();
      this.rotateLayer(next.axis, next.layerIndex, next.direction, next.duration);
    }
  }

  _updateRotation(delta) {
    if (!this.isAnimating || !this._anim) return;

    this._anim.elapsed += delta;
    const t = Math.min(this._anim.elapsed / this._anim.duration, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this._anim.pivot.rotation[this._anim.axis] = this._anim.target * eased;

    if (t >= 1) this._finishRotation();
  }

  _queueRandomMove() {
    const axes = ["x", "y", "z"];
    const axis = axes[Math.floor(Math.random() * axes.length)];
    const layerIndex = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const direction = Math.random() > 0.5 ? 1 : -1;
    this.rotateLayer(axis, layerIndex, direction);
  }

  update(elapsed, delta) {
    this._updateRotation(delta);

    this.moveTimer += delta;
    if (!this.isAnimating && this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this._queueRandomMove();
    }

    this.group.rotation.y = elapsed * this.idleRotationSpeed;
    this.group.rotation.x = Math.sin(elapsed * 0.12) * 0.15;
  }
}

let rubiksCube;
let controls;
let clock;
let keyLight;
let fillLight;

function setupThree() {
  clock = new THREE.Clock();

  scene.background = new THREE.Color(0x141414);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xfff8f2, 0x2c2c2c, 0.5);
  scene.add(hemi);

  keyLight = new THREE.DirectionalLight(0xfff5ec, 0.75);
  keyLight.position.set(5, 8, 4);
  scene.add(keyLight);

  fillLight = new THREE.DirectionalLight(0xeaf0ff, 0.4);
  fillLight.position.set(-5, 3, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
  rimLight.position.set(0, -3, 6);
  scene.add(rimLight);

  rubiksCube = new RubiksCube(scene);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4;
  controls.maxDistance = 14;
  controls.target.set(0, 0, 0);
}

function updateThree() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  const angle = elapsed * 0.22;
  keyLight.position.set(
    Math.cos(angle) * 6,
    5.5 + Math.sin(elapsed * 0.18) * 1.2,
    Math.sin(angle) * 6
  );
  fillLight.position.set(
    Math.cos(angle + Math.PI) * 5,
    2.5,
    Math.sin(angle + Math.PI) * 5
  );

  rubiksCube.update(elapsed, delta);
  controls.update();
}
