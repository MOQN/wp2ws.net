console.log("three.js Version: " + THREE.REVISION);

let container, pane;
let scene, camera, renderer;
let controls;
let time, frame = 0;
const fps = { value: 0, last: performance.now() };

function initThree() {
  scene = new THREE.Scene();

  const fov = 75;
  const aspectRatio = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
  camera.position.z = 1000;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  container = document.getElementById("container-three");
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  pane = new Pane();

  setupThree(); 

  renderer.setAnimationLoop(animate);
}

function animate() {
  time = performance.now();
  frame++;

  let delta = time - fps.last;
  if (delta > 0) {
    fps.value = 1000 / delta;
  }
  fps.last = time;

  params.fps = Number(fps.value.toFixed(1));
  params.frame = frame;
  params.time = Number((time / 1000).toFixed(2));

  updateThree(); 

  pane.refresh();

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});