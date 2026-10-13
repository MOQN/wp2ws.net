function setupGUI() {
  // fog
  let f0 = pane.addFolder({ title: "Fog", expanded: true });
  const updateFogDistance = () => {
    scene.fog.near = params.near;
    scene.fog.far = params.far;
  };
  f0.addBinding(params, "FOG_COLOR", {
    view: 'list',
    label: "fog color",
    options: {
      Inverse: "inverse",
      Contrast: "contrast",
    },
  }).on("change", (ev) => {
    hueBinding.hidden = (ev.value !== "contrast");
    updateFogColor();
  });
  const hueBinding = f0.addBinding(params, "fogHue", {
    label: "fog hue",
    min: 0,
    max: 360,
    step: 1,
    hidden: params.FOG_COLOR !== "contrast",
  }).on("change", () => {
    updateFogColor();
  });
  f0.addBinding(params, "near", {
    min: 1,
    max: 5000,
    step: 10,
  }).on("change", updateFogDistance);
  f0.addBinding(params, "far", {
    min: 1,
    max: 5000,
    step: 10,
  }).on("change", updateFogDistance);
  f0.addBinding(params, 'FOG_BREATHE', {
    label: "fog breathe",
  });

  // environment
  const f1 = pane.addFolder({ title: "Environment" });
  f1.addBinding(params, "background_color", {
    view: 'list',
    label: "Background",
    options: {
      White: "#ffffff",
      Black: "#000000",
    },
  }).on("change", () => {
    scene.background.set(params.background_color);
    updateFogColor();
  });
  f1.addBinding(params, "WORLD_SIZE", {
    label: "World Size",
    min: 2000,
    max: 5000,
    step: 200,
  }).on("change", () => {
    WORLD_HALF = params.WORLD_SIZE / 2;
    createCubes();
  });
  f1.addBinding(params, "GRID_SIZE", {
    label: "Grid Size",
    min: 400,
    max: 2000,
    step: 100,
  }).on("change", () => {
    createCubes();
  });

  // update
  const f2 = pane.addFolder({ title: "Update" });
  f2.addBinding(params, "breatheSpeed", {
    label: "Breathe Speed",
    min: 0.005,
    max: 0.1,
    step: 0.005,
  });
  f2.addBinding(params, "breatheRandomLevel", {
    label: "Breathe Randomness",
    min: 0,
    max: 3,
    step: 1,
  });
}