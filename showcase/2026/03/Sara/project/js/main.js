const PI = Math.PI;
const TWO_PI = Math.PI * 2;
const sin = Math.sin;
const cos = Math.cos;

let params = {
  fps: 0,
  frame: 0,
  time: 0,
  x: 0,
  y: 0,
  z: 0,
  amp: 35,
};

let flowers = [];

function setupThree() {
  let tFlower = new FlowerSphere()
    .setPosition(params.x, params.y, params.z)
    .setRadius(120)
    .setPetals(6)
    .setWaveAmp(params.amp)
    .setRotationSpeed(0.001);

  flowers.push(tFlower);

  const infoFolder = pane.addFolder({ title: "Info" });
  infoFolder.addBinding(params, "fps", { label: "FPS", readonly: true });
  infoFolder.addBinding(params, "fps", {
    label: "FPS Graph",
    readonly: true,
    view: "graph",
    min: 0,
    max: 120,
  });
  infoFolder.addBinding(params, "frame", { label: "Frame", readonly: true });
  infoFolder.addBinding(params, "time", { label: "Time (s)", readonly: true });

  const positionFolder = pane.addFolder({ title: "Position" });

  positionFolder
    .addBinding(params, "x", { min: -500, max: 500, step: 1, label: "X Position" })
    .on("change", (ev) => {
      tFlower.setPosition(ev.value, params.y, params.z);
    });

  positionFolder
    .addBinding(params, "y", { min: -500, max: 500, step: 1, label: "Y Position" })
    .on("change", (ev) => {
      tFlower.setPosition(params.x, ev.value, params.z);
    });

  positionFolder
    .addBinding(params, "z", { min: -500, max: 500, step: 1, label: "Z Position" })
    .on("change", (ev) => {
      tFlower.setPosition(params.x, params.y, ev.value);
    });

  const shapeFolder = pane.addFolder({ title: "Shape" });

  shapeFolder
    .addBinding(params, "amp", { min: 0, max: 100, step: 1, label: "Wave Amp" })
    .on("change", (ev) => {
      tFlower.setWaveAmp(ev.value);
    });
}

function updateThree() {
  for (let f of flowers) {
    f.updateRotation();
  }
}

class FlowerSphere {
  constructor() {
    // group
    this.group = new THREE.Group();
    scene.add(this.group);

    // position
    this.pos = this.group.position;

    // rotation
    this.rot = this.group.rotation;
    this.rotationSpeed = 0.001;

    // structure
    this.thetaSteps = 60;
    this.phiSteps = 60;
    this.baseRadius = 120;
    this.petals = 6;
    this.waveAmp = 35;

    // lines
    this.lines = [];

    this.createShape();
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
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
    for (let i = 0; i <= this.thetaSteps; i++) {
      let geometry = new THREE.BufferGeometry();
      let points = [];

      let theta = (i / this.thetaSteps) * PI;

      for (let j = 0; j <= this.phiSteps; j++) {
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

      geometry.setFromPoints(points);

      let color = new THREE.Color();
      color.setHSL(i / this.thetaSteps, 0.8, 0.6);

      let material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
      });

      let line = new THREE.Line(geometry, material);

      this.group.add(line);
      this.lines.push(line);
    }
  }

  updateShape() {
    let lineIndex = 0;

    for (let i = 0; i <= this.thetaSteps; i++) {
      let theta = (i / this.thetaSteps) * PI;
      let line = this.lines[lineIndex];
      let positions = line.geometry.attributes.position.array;
      let index = 0;

      for (let j = 0; j <= this.phiSteps; j++) {
        let phi = (j / this.phiSteps) * TWO_PI;

        let r =
          this.baseRadius +
          sin(this.petals * theta) *
          cos(this.petals * phi) *
          this.waveAmp;

        let x = r * sin(theta) * cos(phi);
        let y = r * cos(theta);
        let z = r * sin(theta) * sin(phi);

        positions[index] = x;
        positions[index + 1] = y;
        positions[index + 2] = z;

        index += 3;
      }

      line.geometry.attributes.position.needsUpdate = true;
      lineIndex++;
    }
  }

  updateRotation() {
    this.rot.y += this.rotationSpeed;
    this.rot.x += this.rotationSpeed * 0.3;
  }
}