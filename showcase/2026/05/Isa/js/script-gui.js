let params = {
  fps: 0,
  drawCount: 45000,
  size: 6,
  speed: 1,
  order: 1,
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

  pane.addBinding(params, "drawCount", {
    label: "Draw Count",
    min: 0,
    max: MAX_PARTICLE_NUMBER,
    step: 1,
  });
  pane.addBinding(params, "size", { label: "Mark Size", min: 1, max: 20 });
  pane.addBinding(params, "speed", { label: "Time Speed", min: 0, max: 4 });
  pane.addBinding(params, "order", {
    label: "Order",
    readonly: true,
    view: "graph",
    min: 0,
    max: 1,
  });
  pane.addButton({ title: "Disrupt now" }).on("click", () => disrupt());
}

function updateGUI() {
  pane.refresh();
}
