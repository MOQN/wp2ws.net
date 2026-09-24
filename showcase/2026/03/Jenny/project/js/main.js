let params = {
  fps: 0,
  // controlled by GUI
  rotationSpeed: 0.3,
  frustumColor: "#777777"
};


let frustums = [];


// fixed structure settings
const CONFIG = {

  // how many frustum objects
  count: 10,

  // size of the front opening
  frontSize: 500,

  // size of the back opening
  backSize: 300,

  // distance between front and back opening
  depth: 300,

  // 0.5 = adjacent objects overlap by half their depth
  overlapRatio: 0.5,

  // initial rotation difference between objects
  // PI / 12 = 15 degrees
  phaseStep: Math.PI / 12,
};



function setupThree() {

  setupGUI();
  scene.background = new THREE.Color(0x111111);

const ambientLight =
    new THREE.AmbientLight(
      0xffffff,
      0.15
    );

  scene.add(ambientLight);

  light = new THREE.PointLight(0xffffff, 100, 0, 0.1);

  light.position.set(
    0,
    100,
    600
  );

  scene.add(light);
 
  const spacing =
    CONFIG.depth *
    (1 - CONFIG.overlapRatio);

  for (let i = 0; i < CONFIG.count; i++) {
    // each object moves farther along -z
    const centerZ = -i * spacing;
    // each object starts with a different rotation
    const initialAngle = i * CONFIG.phaseStep;
    const frustum =
      new FrustumUnit(
        centerZ,
        CONFIG.frontSize,
        CONFIG.backSize,
        CONFIG.depth,
        initialAngle
      );

    frustums.push(frustum);
  }


  camera.position.set(
    0,
    0,
    900
  );
  // look into the tunnel
  camera.lookAt(
    0,
    0,
    -500
  );

  // OrbitControls target
  controls.target.set(
    0,
    0,
    -500
  );
  controls.update();
}



function updateThree() {

  // 'time' comes from script-three.js
  // it is in milliseconds
  const seconds = time * 0.001;
  // update every object
  for (let frustum of frustums) {
    frustum.update(seconds);
  }
}



function setupGUI() {

  pane.addBinding(
    params,
    "rotationSpeed",
    {
      label: "Rotation Speed",
      min: 0,
      max: 2,
      step: 0.01,
    }
  );


  pane.addBlade({
    view: "separator"
  });

  pane.addBinding(params, "frustumColor", {
  label: "Frustum Color"
});
}