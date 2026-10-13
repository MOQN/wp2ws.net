let params = {
  fps: 0,
  rotationSpeed: 0, 
  frustumColor: "#777777",
  lightSpeed: 0.3, 
  colorLightEnabled: true,
colorLightColor: "#4488ff",
colorLightIntensity: 30,
colorLightSpeed: 0.2
};

let frustums = [];
let light; 
let colorLight;



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

light.position.set(700, 0, -600);
light.castShadow = false; 
light.shadow.mapSize.set(1024, 1024);


light.shadow.camera.near = 1;
light.shadow.camera.far = 3000;


light.shadow.bias = -0.0001;
scene.add(light);

 colorLight = new THREE.PointLight(
  params.colorLightColor,
  params.colorLightIntensity,
  0,
  0.1
);

colorLight.position.set(-700, 0, -600);
scene.add(colorLight);

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
  const seconds = time * 0.001;


  for (let frustum of frustums) {
    frustum.update(seconds);
  }

  // light moves around z-axis in a circle
  const angle = seconds * params.lightSpeed;
  const radius = 700;

  light.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    -600
  );

  // color light moves around z-axis in a circle, opposite direction
const colorAngle =
  Math.PI - seconds * params.colorLightSpeed;

colorLight.position.set(
  Math.cos(colorAngle) * 700,
  Math.sin(colorAngle) * 700,
  -600
);


colorLight.visible = params.colorLightEnabled;
colorLight.color.set(params.colorLightColor);
colorLight.intensity = params.colorLightIntensity;
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

pane.addBinding(params, "lightSpeed", {
  label: "Light Speed",
  min: 0,
  max: 1,
  step: 0.01
});
pane.addBlade({ view: "separator" });

pane.addBinding(params, "colorLightEnabled", {
  label: "Color Light"
});

pane.addBinding(params, "colorLightColor", {
  label: "Light Color"
});

pane.addBinding(params, "colorLightIntensity", {
  label: "Color Intensity",
  min: 0,
  max: 100,
  step: 1
});

pane.addBinding(params, "colorLightSpeed", {
  label: "Color Speed",
  min: 0,
  max: 1,
  step: 0.01
});
}