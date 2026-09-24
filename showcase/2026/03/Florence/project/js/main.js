// Stage 1: repetition + gradual transformation + continuity.
const params = {
  fps: 0,
  count: 110,
  spread: 1.0,
  spacing: 1.0,
  curvature: 1.15,
  speed: 0.18,
};

// Keep these modest: at most 220 lines x 192 points.
const LINE_SEGMENTS = 192;
const RING_RADIUS = 240;
const TUBE_RADIUS = 95;
const WAVE_HEIGHT = 45;

let flowLines = [];
let sculpture;
let flowMaterial;
let motionTime = 0;
let previousTime;

function setupThree() {
  scene.background = new THREE.Color(0x000000);
  sculpture = new THREE.Group();
  sculpture.rotation.x = -0.45;
  scene.add(sculpture);

  // All lines share one material. Dispose it only when the whole system closes.
  flowMaterial = new THREE.LineBasicMaterial({
    color: 0xe8e8e8,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  // Preserve the starter's Tweakpane style and folder organization.
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
  regenerateStructure();
}

function regenerateStructure() {
  for (const flowLine of flowLines) flowLine.dispose();
  flowLines = [];

  // Even phase steps form one complete cycle; the last blends back into the first.
  for (let i = 0; i < params.count; i++) {
    const phase = (i / params.count) * Math.PI * 2;
    const flowLine = new FlowLine(phase, params.spread, params.spacing, params.curvature);
    flowLine.update(motionTime);
    flowLines.push(flowLine);
    sculpture.add(flowLine.line);
  }
}

function updateThree() {
  // Seconds, not frame count: movement is consistent on different displays.
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  motionTime += delta * params.speed;
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
      // A closed path around a ring; a second cycle curls through its cross-section.
      // Every term is periodic, so both the path and its tangent meet smoothly.
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

    this.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.line = new THREE.LineLoop(this.geometry, flowMaterial);
    this.line.position.copy(this.position);
    this.line.rotation.copy(this.rotation);
  }

  update(elapsed) {
    // Transform existing geometry only; no new points or buffers per frame.
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
}
