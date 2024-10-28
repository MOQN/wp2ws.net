let scene, camera, renderer, controls;
let spheres = [];
let squareOutlines = [];
let clock;

function initThree() {
  scene = new THREE.Scene();
  clock = new THREE.Clock(); 
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container-three").appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);

  addBrightWhiteSphere(1.5, 0, 2, 0);   // Circle 1 (top)
  addBrightWhiteSphere(1, 0, -0.5, 0);   // Circle 2 (middle)
  addBrightWhiteSphere(0.5, 0, -3, 0); // Circle 3 (bottom)

  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  addRotatingSquareOutline(3, outlineMaterial, 0, 2, 0);  // Rotating square for Circle 1
  addRotatingSquareOutline(2.5, outlineMaterial, 0, -0.5, 0); // Rotating square for Circle 2
  addRotatingSquareOutline(2, outlineMaterial, 0, -3, 0);   // Rotating square for Circle 3

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);

  animate();
}

function addRotatingSquareOutline(size, material, x, y, z) {
  const squareGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size));
  const rotatingSquare = new THREE.LineSegments(squareGeometry, material);
  rotatingSquare.position.set(x, y, z);
  rotatingSquare.position.y += (size / 2) + 0.5;  
  scene.add(rotatingSquare);
  squareOutlines.push(rotatingSquare);
}

function addBrightWhiteSphere(radius, x, y, z) {
  const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2,  
    shininess: 100,        
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(x, y, z);
  scene.add(sphere);
  spheres.push(sphere);
}
function animate() {
  requestAnimationFrame(animate);

  squareOutlines.forEach((outline) => {
    outline.rotation.x += 0.01;
    outline.rotation.y += 0.01; 
  });

  // Pulsate 
  const elapsedTime = clock.getElapsedTime();
  spheres.forEach((sphere, index) => {
    const scale = 1 + 0.1 * Math.sin(elapsedTime * 2 + index); 
    sphere.scale.set(scale, scale, scale); 
    sphere.rotation.y += 0.01;
  });

  controls.update();

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

initThree();
