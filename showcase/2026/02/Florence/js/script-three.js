console.log(
  "three.js Version: "
  + THREE.REVISION
);


let scene;

let camera;

let renderer;

let container;

let controls;

let time;

let frame = 0;



function initThree() {

  console.log("initThree started");


  // SCENE
  scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color(
      0x000000
    );


  // CAMERA
  const fov = 60;

  const aspectRatio =
    window.innerWidth /
    window.innerHeight;

  const near = 0.1;

  const far = 10000;


  camera =
    new THREE.PerspectiveCamera(
      fov,
      aspectRatio,
      near,
      far
    );


  camera.position.set(
    0,
    100,
    1200
  );


  // RENDERER
  renderer =
    new THREE.WebGLRenderer({
      antialias: true
    });


  renderer.setPixelRatio(
    window.devicePixelRatio
  );


  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );


  container =
    document.getElementById(
      "container-three"
    );


  container.appendChild(
    renderer.domElement
  );


  // CONTROLS
  controls =
    new OrbitControls(
      camera,
      renderer.domElement
    );


  controls.target.set(
    0,
    100,
    0
  );


  controls.update();


  // your sculpture
  setupThree();


  renderer.setAnimationLoop(
    animate
  );


  console.log(
    "Three.js running"
  );

}



function animate() {

  time =
    performance.now();

  frame++;


  updateThree();


  controls.update();


  renderer.render(
    scene,
    camera
  );

}



window.addEventListener(
  "resize",
  function () {

    camera.aspect =
      window.innerWidth /
      window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

  }
);