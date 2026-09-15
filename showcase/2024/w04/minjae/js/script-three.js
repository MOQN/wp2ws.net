console.log("three.js Version: " + THREE.REVISION);
let gui;

let ui = {
  number: "", // initialize it as a string, just for the look :D
  boatx: 0,
  boaty: 0,
  boatz: 0,
  degreex: 50,
  degreey: 20,
  degreez: 10,
};
let scene, camera, renderer, container;
let controls;
let time, frame = 0;

function initThree() {
  scene = new THREE.Scene();
  gui = new dat.GUI();
  gui.add(ui, "degreex", 0, 360).onChange(updateBox);
  gui.add(ui, "degreey", 0, 360).onChange(updateBox);
  gui.add(ui, "degreez", 0, 360).onChange(updateBox);
  gui.add(ui, "boatx", -100, 100).onChange(updateBox);
  gui.add(ui, "boaty", -100, 100).onChange(updateBox);
  gui.add(ui, "boatz", -100, 100).onChange(updateBox)

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

  setupThree(); // *** 

  renderer.setAnimationLoop(animate);
}

function animate() {
  time = performance.now();
  frame++;

  updateThree(); // ***

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

