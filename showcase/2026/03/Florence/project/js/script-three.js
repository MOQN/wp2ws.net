let container, pane;
let scene, camera, renderer;
let controls;
let time, frame = 0;
const fps = { value: 0, last: 0 };

function initThree() {
  console.log("three.js Version: " + THREE.REVISION);
  scene = new THREE.Scene();

  const fov = 75;
  const aspectRatio = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
  camera.position.z = 1000;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  container = document.getElementById("container-three");
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);


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

  setupThree(); // *** 

  renderer.setAnimationLoop(animate);
}

function animate() {
  frame++;
  time = performance.now();

  fps.value = 1000 / (time - fps.last);
  fps.last = time;
  params.fps = Number(fps.value.toFixed(2));

  updateThree(); // ***

  pane.refresh();

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
// Release shared and per-line resources when leaving the page (except browser cache).
window.addEventListener("pagehide", function (event) {
  if (event.persisted || !renderer) return;
  renderer.setAnimationLoop(null);
  disposeStructure();
  controls.dispose();
  pane.dispose();
  renderer.dispose();
});
