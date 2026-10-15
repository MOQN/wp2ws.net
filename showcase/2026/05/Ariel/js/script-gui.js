let params = {
  fps: 0,
  particleNumber: 20000,
  breathing: 0.2,
  intensity: 0.3,
  bloom: 0.85,
  size: 1.3,
  calmColor: "#3a5b9e",
  petalColor: "#ff7eb6",
  centerColor: "#fff3c4",
  antherColor: "#ff6a1a",
  pointSize: 3
};


let pane;


function setupGUI() {
  pane = new Pane();
  pane.addBinding(params, "fps", {
    label: "FPS",
    readonly: true,
  });
  pane.addBinding(params, "fps", {
    label: "FPS Graph",
    readonly: true,
    view: "graph",
    min: 0,
    max: 120,
  });
  pane.addBlade({ view: "separator" });


  const breathFolder = pane.addFolder({ title: "Breath" });
  breathFolder.addBinding(params, "breathing", {
    label: "Breathing",
    min: 0,
    max: 1,
  });
  breathFolder.addBinding(params, "intensity", {
    label: "Intensity",
    min: 0,
    max: 1,
  });


  const formFolder = pane.addFolder({ title: "Form" });
  formFolder.addBinding(params, "bloom", {
    label: "Bloom",
    min: 0,
    max: 1,
  });
  formFolder.addBinding(params, "size", {
    label: "Size",
    min: 0.4,
    max: 1.8,
  });


  const colorFolder = pane.addFolder({ title: "Color" });
  colorFolder.addBinding(params, "calmColor", { label: "Still" });
  colorFolder.addBinding(params, "petalColor", { label: "Moving · Petal" });
  colorFolder.addBinding(params, "centerColor", { label: "Moving · Center" });
  colorFolder.addBinding(params, "antherColor", { label: "Moving · Anther" });


  const systemFolder = pane.addFolder({ title: "System" });
  systemFolder.addBinding(params, "particleNumber", {
    label: "Draw Count",
    min: 0,
    max: MAX_PARTICLE_NUMBER,
    step: 1,
  });
  systemFolder.addBinding(params, "pointSize", {
    label: "Point Size",
    min: 0.5,
    max: 5,
  });
}


function updateGUI() {
  pane.refresh();
}
