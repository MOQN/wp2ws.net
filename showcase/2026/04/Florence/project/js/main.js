const params = {
  fps: 0,
  count: 110,
  spread: 1.0,
  spacing: 1.0,
  curvature: 1.15,
  speed: 0.18,
  lightIntensity: 3.2,
  lightDistance: 850,
  lightSpeed: 0.09,
  shadowSoftness: 1.5,
  lightColor: "#ffffff",
  objectColor: "#b8b8b8",
};

const LINE_SEGMENTS = 192;
const RING_RADIUS = 240;
const TUBE_RADIUS = 95;
const WAVE_HEIGHT = 45;
const WIRE_RADIUS = 0.8;
const FILL_INTENSITY = 0.012;
let flowLines = [];
let sculpture;
let flowMaterial;
let motionTime = 0;
let previousTime;
let mainLight, fillLight, shadowWall;
let lightPhase = 0.65;

function setupThree() {
  scene.background = new THREE.Color(0x000000);
  sculpture = new THREE.Group();
  sculpture.rotation.x = -0.45;
  scene.add(sculpture);
  flowMaterial = new THREE.MeshPhongMaterial({
    color: params.objectColor,
    specular: 0x555555,
    shininess: 70,
  });
  setupLighting();

  const folderNumber = pane.addFolder({ title: "NUMBER", expanded: true });
  folderNumber.addBinding(params, "count", {
    label: "Count", min: 20, max: 220, step: 1,
  }).on("change", regenerateStructure);

  const folderGeneration = pane.addFolder({ title: "GENERATION", expanded: true });
  folderGeneration.addBinding(params, "spread", {
    label: "Spread", min: 0.55, max: 1.65, step: 0.01,
  }).on("change", regenerateStructure);
  folderGeneration.addBinding(params, "spacing", {
    label: "Spacing", min: 0.3, max: 1.7, step: 0.01,
  }).on("change", regenerateStructure);
  folderGeneration.addBinding(params, "curvature", {
    label: "Curvature", min: 0, max: 2, step: 0.01,
  }).on("change", regenerateStructure);

  const folderControl = pane.addFolder({ title: "CONTROL", expanded: true });
  folderControl.addBinding(params, "speed", {
    label: "Speed", min: 0, max: 0.6, step: 0.01,
  });
  const folderLight = pane.addFolder({ title: "LIGHT", expanded: true });
  folderLight.addBinding(params, "lightIntensity", {
    label: "Light Intensity", min: 0, max: 8, step: 0.1,
  }).on("change", () => { mainLight.intensity = params.lightIntensity; });
  folderLight.addBinding(params, "lightDistance", {
    label: "Light Distance", min: 700, max: 1200, step: 10,
  }).on("change", updateLightPosition);
  folderLight.addBinding(params, "lightSpeed", {
    label: "Light Speed", min: 0, max: 0.25, step: 0.005,
  });
  folderLight.addBinding(params, "shadowSoftness", {
    label: "Shadow Softness", min: 0, max: 4, step: 0.1,
  }).on("change", () => { mainLight.shadow.radius = params.shadowSoftness; });
  folderLight.addBinding(params, "lightColor", {
    label: "Light Color", view: "color",
  }).on("change", () => { mainLight.color.set(params.lightColor); });

  const folderAppearance = pane.addFolder({ title: "APPEARANCE", expanded: true });
  folderAppearance.addBinding(params, "objectColor", {
    label: "Object Color", view: "color",
  }).on("change", () => {
    flowMaterial.color.set(params.objectColor);
  });
  regenerateStructure();
}

function setupLighting() {
  mainLight = new THREE.SpotLight(params.lightColor, params.lightIntensity);
 
  mainLight.decay = 0;
  mainLight.angle = 0.5;
  mainLight.penumbra = 0.8;
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  mainLight.shadow.camera.near = 10;
  mainLight.shadow.camera.far = 4000;
  mainLight.shadow.bias = -0.00005;
  mainLight.shadow.normalBias = 0.12;
  mainLight.shadow.radius = params.shadowSoftness;
  scene.add(mainLight, mainLight.target);

  fillLight = new THREE.AmbientLight(0xffffff, FILL_INTENSITY);
  scene.add(fillLight);

  shadowWall = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshPhongMaterial({ color: 0x181818, specular: 0x000000 })
  );
  shadowWall.position.z = -650;
  shadowWall.receiveShadow = true;
  scene.add(shadowWall);
  updateLightPosition();
}

function updateLightPosition() {
  const distance = params.lightDistance;

  mainLight.position.set(
    Math.cos(lightPhase) * distance,
    180 + Math.sin(lightPhase) * distance * 0.45,
    650 + Math.sin(lightPhase) * distance * 0.18
  );
}

function regenerateStructure() {
  for (const flowLine of flowLines) flowLine.dispose();
  flowLines = [];
  for (let i = 0; i < params.count; i++) {
    const phase = (i / params.count) * Math.PI * 2;
    const flowLine = new FlowLine(phase, params.spread, params.spacing, params.curvature);
    flowLine.update(motionTime);
    flowLines.push(flowLine);
    sculpture.add(flowLine.line);
  }
}

function updateThree() {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  motionTime += delta * params.speed;

  lightPhase = (lightPhase + delta * params.lightSpeed) % (Math.PI * 2);
  updateLightPosition();
  sculpture.rotation.z = motionTime * 0.12;
  sculpture.rotation.y = Math.sin(motionTime * 0.15) * 0.14;
  for (const flowLine of flowLines) flowLine.update(motionTime);
}

class FlowLine {
  constructor(phase, spread, spacing, curvature) {
    this.phase = phase;
    this.spacing = spacing;
    this.curvature = curvature * (1 + 0.1 * Math.sin(phase));
    this.position = new THREE.Vector3(
      12 * spread * Math.cos(phase),
      12 * spread * Math.sin(phase),
      8 * this.curvature * Math.sin(phase * 2)
    );
    this.rotation = new THREE.Euler(0, 0, phase);

    const points = [];
    for (let j = 0; j < LINE_SEGMENTS; j++) {
      const t = (j / LINE_SEGMENTS) * Math.PI * 2;
      const curl = t * 2 + phase;
      const tube = TUBE_RADIUS * spacing;
      const radius = RING_RADIUS * spread + tube * Math.cos(curl);
      const angle = t + 0.22 * this.curvature * Math.sin(curl);
      const height = tube * (0.25 + 0.75 * this.curvature) * Math.sin(curl)
        + WAVE_HEIGHT * this.curvature * Math.sin(t * 3 + phase);
      points.push(new THREE.Vector3(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        height
      ));
    }

    const path = new THREE.CatmullRomCurve3(points, true);
    this.geometry = new THREE.TubeGeometry(path, LINE_SEGMENTS, WIRE_RADIUS, 4, true);
    this.line = new THREE.Mesh(this.geometry, flowMaterial);
    this.line.castShadow = true;
    this.line.receiveShadow = true;
    this.line.position.copy(this.position);
    this.line.rotation.copy(this.rotation);
  }

  update(elapsed) {
    this.line.position.z = this.position.z
      + 3 * (Math.sin(elapsed * 0.35 + this.phase) - Math.sin(this.phase));
    this.line.rotation.z = this.rotation.z
      + 0.012 * (Math.sin(elapsed * 0.25 + this.phase) - Math.sin(this.phase));
  }

  dispose() {
    this.line.removeFromParent();
    this.geometry.dispose();
  }
}

function disposeStructure() {
  for (const flowLine of flowLines) flowLine.dispose();
  flowLines = [];
  if (sculpture) sculpture.removeFromParent();
  if (flowMaterial) flowMaterial.dispose();
  if (shadowWall) {
    shadowWall.removeFromParent();
    shadowWall.geometry.dispose();
    shadowWall.material.dispose();
  }
  if (mainLight) {
    mainLight.removeFromParent();
    mainLight.target.removeFromParent();
    mainLight.shadow.dispose();
  }
  if (fillLight) fillLight.removeFromParent();
}
