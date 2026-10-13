let params = {
  fps: 0,
  near: 2500,
  far: 5000,
  FOG_BREATHE: false,
  FOG_COLOR: "inverse",
  fogHue: 190,
  background_color: "White",
  WORLD_SIZE: 2000,
  GRID_SIZE: 500,
  breatheSpeed: 0.015,
  breatheRandomLevel: 1,
};
let WORLD_HALF = params.WORLD_SIZE / 2;

let cubes = [];
let fogPhase = 0;

function setupThree() {
  scene.background = new THREE.Color(params.background_color);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const initFogColor = getInverseColor(params.background_color);
  scene.fog = new THREE.Fog(initFogColor, params.near, params.far);

  setupGUI();
  createCubes();
}

function updateThree() {
  for (let c of cubes) {
    c.update();
  }
  updateFogBreathe();
}

function updateFogBreathe() {
  // if (!scene.fog) return;
  if (params.FOG_BREATHE) {
    fogPhase += params.breatheSpeed / 2;
    if (fogPhase > Math.PI * 2) {
      fogPhase = 0;
    }

    let f = Math.sin(fogPhase * 5 / 8) * 1.2;
    let g = 1.2;
    let e = Math.sin(fogPhase - Math.PI) * 1.7;
    let t;

    if (fogPhase < Math.PI * 4 / 5) {
      t = Math.min(f, g);
    } else if (fogPhase < Math.PI * 3 / 2) {
      t = Math.max(g, e);
    } else {
      t = e;
    }

    let breatheFactor = map(t, 0, 1.7, 0.5, 1);

    scene.fog.near = params.near * breatheFactor;
    scene.fog.far = params.far * breatheFactor;
  } else {
    scene.fog.near = params.near;
    scene.fog.far = params.far;
  }
}

function getInverseColor(hexColor) {
  if (hexColor === "#ffffff") {
    return "#000000";
  } else {
    return "#ffffff";
  }
}

function updateFogColor() {
  // if (!scene.fog) return;
  if (params.FOG_COLOR === "inverse") {
    const inverseColor = getInverseColor(params.background_color);
    scene.fog.color.set(inverseColor);
  } else {
    scene.fog.color.setHSL(params.fogHue / 360, 1.0, 0.6);
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn(`FullScreen Failed: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function toggleGUI() {
  pane.hidden = !pane.hidden;
}

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.key === "h" || e.key === "H") {
    toggleGUI();
  }
  if (e.key === "f" || e.key === "F") {
    toggleFullscreen();
  }
});