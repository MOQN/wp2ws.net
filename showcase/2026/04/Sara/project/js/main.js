const PI = Math.PI;
const TWO_PI = Math.PI * 2;
const sin = Math.sin;
const cos = Math.cos;

let params = {
  fps: 0,
  frame: 0,
  time: 0,
  amp: 35,
};

let flowers = [];

let mainLight;
let accentLight;
let ambient;

function setupThree() {
  renderer.setClearColor(0x000000);
  renderer.shadowMap.enabled = false;

  // main white light
  mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
  mainLight.position.set(300, 250, 400);
  scene.add(mainLight);

  // accent light
  accentLight = new THREE.DirectionalLight(0x39ff14, 4);
  accentLight.position.set(-300, 150, 200);
  scene.add(accentLight);

  // ambient light
  ambient = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(ambient);

  // flower
  let tFlower = new FlowerSphere()
    .setPosition(1, 1, 1)
    .setScale(3, 3, 3)
    .setRadius(120)
    .setPetals(6)
    .setWaveAmp(params.amp)
    .setRotationSpeed(0.001);

  flowers.push(tFlower);

  // INFO
  const infoFolder = pane.addFolder({
    title: "Info",
  });

  infoFolder.addBinding(params, "fps", {
    label: "FPS",
    readonly: true,
  });

  infoFolder.addBinding(params, "fps", {
    label: "FPS Graph",
    readonly: true,
    view: "graph",
    min: 0,
    max: 120,
  });

  infoFolder.addBinding(params, "frame", {
    label: "Frame",
    readonly: true,
  });

  infoFolder.addBinding(params, "time", {
    label: "Time (s)",
    readonly: true,
  });

  // SHAPE
  const shapeFolder = pane.addFolder({
    title: "Shape",
  });

  shapeFolder
    .addBinding(params, "amp", {
      min: 0,
      max: 100,
      step: 1,
      label: "Wave Amp",
    })
    .on("change", (ev) => {
      tFlower.setWaveAmp(ev.value);
    });
}

function updateThree() {
  for (let f of flowers) {
    f.updateRotation();
  }

  let interval = 2000;
  let currentTime = performance.now();

  // ==========================
  // MODE SWITCH
  // ==========================

  let mode = Math.floor(currentTime / interval) % 2;

  if (mode === 0) {
    // black background + green light
    renderer.setClearColor(0x000000);

    mainLight.color.setHex(0xffffff);
    mainLight.intensity = 1;

    accentLight.color.setHex(0x39ff14);
    accentLight.intensity = 5;

    ambient.color.setHex(0xffffff);
    ambient.intensity = 0.1;
  } else {
    // green background + white light
    renderer.setClearColor(0x00ff00);

    mainLight.color.setHex(0xffffff);
    mainLight.intensity = 1.2;

    accentLight.color.setHex(0xffffff);
    accentLight.intensity = 0.35;

    ambient.color.setHex(0xffffff);
    ambient.intensity = 0.05;
  }

  // ==========================
  // SCALE PULSE
  // ==========================

  let timeSinceSwitch =
    currentTime % interval;

  let baseScale = 3;
  let pulseAmount = 0.25;
  let pulseDuration = 300;

  let pulse = 0;

  if (timeSinceSwitch < pulseDuration) {
    pulse = Math.exp(
      -timeSinceSwitch / 100
    );
  }

  let currentScale =
    baseScale *
    (1 + pulse * pulseAmount);

  flowers[0].scale.set(
    currentScale,
    currentScale,
    currentScale
  );

  // ==========================
  // INFO
  // ==========================

  params.fps = Number(frameRate().toFixed(1));
  params.frame = frame;
  params.time = Number(time.toFixed(2));
}

class FlowerSphere {
  constructor() {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.pos = this.group.position;
    this.rot = this.group.rotation;
    this.scale = this.group.scale;
    this.rotationSpeed = 0.001;

    this.thetaSteps = 32;
    this.phiSteps = 100;
    this.baseRadius = 120;
    this.petals = 6;
    this.waveAmp = 35;

    this.tubeRadius = 1.5;
    this.tubes = [];

    this.createShape();
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setScale(x, y, z) {
    this.scale.set(x, y, z);
    return this;
  }

  setRadius(radius) {
    this.baseRadius = radius;
    this.updateShape();
    return this;
  }

  setPetals(petals) {
    this.petals = petals;
    this.updateShape();
    return this;
  }

  setWaveAmp(amp) {
    this.waveAmp = amp;
    this.updateShape();
    return this;
  }

  setRotationSpeed(speed) {
    this.rotationSpeed = speed;
    return this;
  }

  createShape() {
    for (let i = 1; i < this.thetaSteps; i++) {
      let theta = (i / this.thetaSteps) * PI;
      let points = [];

      for (let j = 0; j < this.phiSteps; j++) {
        let phi = (j / this.phiSteps) * TWO_PI;

        let r =
          this.baseRadius +
          sin(this.petals * theta) *
          cos(this.petals * phi) *
          this.waveAmp;

        let x = r * sin(theta) * cos(phi);
        let y = r * cos(theta);
        let z = r * sin(theta) * sin(phi);

        points.push(new THREE.Vector3(x, y, z));
      }

      let curve = new THREE.CatmullRomCurve3(
        points,
        true
      );

      let geometry = new THREE.TubeGeometry(
        curve,
        this.phiSteps,
        this.tubeRadius,
        6,
        true
      );

      let material = new THREE.MeshPhysicalMaterial({
        color: 0xd8d8d8,
        metalness: 1.0,
        roughness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        side: THREE.FrontSide,
      });

      let tube = new THREE.Mesh(
        geometry,
        material
      );

      tube.castShadow = false;
      tube.receiveShadow = false;

      this.group.add(tube);
      this.tubes.push(tube);
    }
  }

  updateShape() {
    for (let i = 0; i < this.tubes.length; i++) {
      let thetaIndex = i + 1;
      let theta =
        (thetaIndex / this.thetaSteps) * PI;

      let points = [];

      for (let j = 0; j < this.phiSteps; j++) {
        let phi =
          (j / this.phiSteps) * TWO_PI;

        let r =
          this.baseRadius +
          sin(this.petals * theta) *
          cos(this.petals * phi) *
          this.waveAmp;

        let x =
          r *
          sin(theta) *
          cos(phi);

        let y =
          r *
          cos(theta);

        let z =
          r *
          sin(theta) *
          sin(phi);

        points.push(
          new THREE.Vector3(
            x,
            y,
            z
          )
        );
      }

      let curve =
        new THREE.CatmullRomCurve3(
          points,
          true
        );

      let newGeometry =
        new THREE.TubeGeometry(
          curve,
          this.phiSteps,
          this.tubeRadius,
          6,
          true
        );

      this.tubes[i].geometry.dispose();
      this.tubes[i].geometry = newGeometry;
    }
  }

  updateRotation() {
    this.rot.y += this.rotationSpeed;
    this.rot.x += this.rotationSpeed * 0.3;
  }
}