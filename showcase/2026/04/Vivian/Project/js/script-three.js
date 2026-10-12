console.log("three.js Version: " + THREE.REVISION);

let container, pane, fpsBinding, fpsGraph;
let scene, camera, renderer;
let controls;
let time, frame = 0;
const fps = { value: 0, last: 0 };

function initThree() {
  scene = new THREE.Scene();

  const fov = 55;
  const aspectRatio = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
  camera.position.set(0, 40, -80);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020617, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container = document.getElementById("container-three");
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  pane = new Pane();
  fpsBinding = pane.addBinding(params, "fps", {
    label: "FPS",
    readonly: true,
  });
  fpsGraph = pane.addBinding(params, "fps", {
    label: "FPS Graph",
    readonly: true,
    view: "graph",
    min: 0,
    max: 120,
  });
  pane.addBlade({ view: "separator" });

  setupThree();

  renderer.setAnimationLoop(animate);
}

function animate() {
  time = performance.now();
  frame++;
  fps.value = 1000 / (time - fps.last);
  fps.last = time;
  params.fps = fps.value.toFixed(2);

  updateThree();

  fpsBinding.refresh();
  fpsGraph.refresh();

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
