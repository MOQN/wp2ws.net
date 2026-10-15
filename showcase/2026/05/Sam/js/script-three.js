let container;
let scene, camera, renderer;
let controls;
let time, frame = 0;
const fps = { value: 0, last: 0 };

function initThree() {
  console.log("three.js Version: " + THREE.REVISION);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101820);

  scene.add(new THREE.HemisphereLight(0xb9dcff, 0x263746, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(300, 800, 500);
  scene.add(sun);

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
  setupGUI();

  renderer.setAnimationLoop(animate);
}

function animate() {
  time = performance.now();
  frame++;
  fps.value = 1000 / (time - fps.last);
  fps.last = time;
  params.fps = fps.value.toFixed(2);

  updateGUI();
  updateThree(); // ***

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
