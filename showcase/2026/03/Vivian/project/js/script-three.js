console.log("three.js Version: " + THREE.REVISION);

let container, pane;
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

  //After researching different Three.js rendering settings 
  // and asking AI for guidance, I added antialiasing to THREE.WebGLRenderer, 
  // setPixelRatio(), and setClearColor() 
  // to support the visual direction of my project. 
  // I kept the rest of the setup as close to Sample 01 as possible, 
  // only adjusting values to fit my project.

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);

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

  pane.refresh();

  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
