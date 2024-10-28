console.log(THREE.REVISION);

let container;
let scene;
let renderer;
let camera;
let controls;

function initThree() {
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
  
    setupThree(); // *** 
  
    renderer.setAnimationLoop(animate);
}

function animate() {
    renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
