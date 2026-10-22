console.log("three.js Version: " + THREE.REVISION);

let container, pane;
let scene, camera, renderer;
let controls;
let time, frame = 0;
const fps = { value: 0, last: 0 };

function initThree() {
  scene = new THREE.Scene();

  const fov = 54;
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
    readonly: true,
    label: "fps",
    interval: 400,
  });

  setupThree(); // *** 

  renderer.setAnimationLoop(animate);
}

function animate() {
  time = performance.now();
  frame++;
  if (fps.last > 0) {
    fps.value = 1000 / (time - fps.last);
    params.fps = Math.round(fps.value);
  }
  fps.last = time;


  updateThree(); // ***

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});