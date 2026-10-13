console.log("three.js Version: " + THREE.REVISION);

let scene, camera, renderer, container;

function initThree() {
  scene = new THREE.Scene();

  const fov = 45;
  const aspectRatio = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 100;
  camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
  camera.position.set(5, 4, 6);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  container = document.getElementById("container-three");
  container.appendChild(renderer.domElement);

  setupThree();

  renderer.setAnimationLoop(animate);
}

function animate() {
  updateThree();
  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
