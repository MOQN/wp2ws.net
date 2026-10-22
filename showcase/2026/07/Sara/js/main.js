let params = {
  fps: 0,
  cameraMode: "player",
  waveHeight: 0,
  waveDensity: 0.009,
  waveSpeed: 0.004,
  animate: true,
  checkerX: 30,
  checkerZ: 8,
  wireframe: false,
  fogDensity: 0.0016,
  lightingAtmosphere: "golden",
  lightSpread: 0,
  lightMode: "all",
  cardVortexRadius: 285,
};

let floatingModels = [];

const RING_RADIUS = 520;
const TABLE_WIDTH = 270;
const TABLE_LENGTH = Math.PI * 2 * RING_RADIUS;
const TABLE_Y = -160;
const CHAIR_RADIUS_NEAR = 720;
const CHAIR_RADIUS_FAR = 760;
const CHAIR_LIGHT_RADIUS = (CHAIR_RADIUS_NEAR + CHAIR_RADIUS_FAR) / 2;
const CHAIR_BASE_Y = TABLE_Y - 250;
const MARBLE_PLATFORM_RADIUS = 1050;
const OUTER_CLOCK_INNER_RADIUS = 1090;
const OUTER_CLOCK_OUTER_RADIUS = 1500;
const OUTER_CLOCK_NUMBER_RADIUS = 1320;
const VORTEX_MAX_RADIUS = RING_RADIUS + TABLE_WIDTH / 2 - 70;
const PUPPET_CEILING_Y = 760;
const FLOATING_MODEL_CONFIGS = [
  {
    name: "Teacup",
    url: "assets/tea%20cup%20new.glb",
    targetSize: 132,
    angle: 0.18,
    side: -1,
    edgeGap: 46,
    height: 105,
    rotation: { x: -0.16, y: -0.36, z: 0.18 },
    float: { height: 26, speed: 0.020, phase: 0.0, swayX: 0.045, swayZ: 0.07 },
  },
  {
    name: "Saucer",
    url: "assets/tea%20sauce.glb",
    targetSize: 158,
    angle: 0.88,
    side: 1,
    edgeGap: 38,
    height: 180,
    rotation: { x: 0.52, y: 0.26, z: -0.38 },
    float: { height: 34, speed: 0.017, phase: 1.7, swayX: 0.05, swayZ: 0.04 },
  },
  {
    name: "Mushroom Teapot",
    url: "assets/mushroom_teapot/scene.gltf",
    targetSize: 156,
    angle: 1.66,
    side: -1,
    edgeGap: 74,
    height: 138,
    rotation: { x: 0.05, y: 0.82, z: -0.11 },
    float: { height: 30, speed: 0.015, phase: 3.0, swayX: 0.04, swayZ: 0.06 },
  },
  {
    name: "Phonograph",
    url: "assets/phonograph_record_player/scene.gltf",
    targetSize: 195,
    angle: 2.52,
    side: 1,
    edgeGap: 58,
    height: 225,
    rotation: { x: -0.04, y: -0.64, z: 0.06 },
    float: { height: 22, speed: 0.011, phase: 5.0, swayX: 0.028, swayZ: 0.035 },
  },
  {
    name: "Mad Hat",
    url: "assets/mad+hat.glb",
    targetSize: 176,
    angle: 3.18,
    side: -1,
    edgeGap: 54,
    height: 155,
    rotation: { x: -0.08, y: 0.35, z: 0.11 },
    float: { height: 36, speed: 0.013, phase: 0.8, swayX: 0.035, swayZ: 0.055 },
  },
  {
    name: "Old Key",
    url: "assets/old-key/source/key_final.gltf",
    targetSize: 162,
    angle: 4.00,
    side: 1,
    edgeGap: 44,
    height: 255,
    rotation: { x: 0.92, y: -0.16, z: 0.34 },
    float: { height: 28, speed: 0.016, phase: 2.4, swayX: 0.065, swayZ: 0.04 },
  },
  {
    name: "Pocket Watch",
    url: "assets/antique_brass_pocket_watch/scene.gltf",
    targetSize: 166,
    angle: 4.76,
    side: -1,
    edgeGap: 66,
    height: 118,
    rotation: { x: 0.16, y: 0.42, z: -0.15 },
    float: { height: 32, speed: 0.014, phase: 4.1, swayX: 0.04, swayZ: 0.06 },
  },
  {
    name: "Dessert Stand",
    url: "assets/ornate+dessert+stand+3d+model.glb",
    targetSize: 202,
    angle: 5.60,
    side: 1,
    edgeGap: 62,
    height: 198,
    rotation: { x: -0.03, y: -0.32, z: 0.05 },
    float: { height: 24, speed: 0.012, phase: 5.7, swayX: 0.028, swayZ: 0.035 },
  },
];

const SEGMENTS_X = 192;
const SEGMENTS_Z = 24;

let tableGroup;
let tableSurface;
let tableGeometry;
let tableMaterial;
let checkerTexture;
let originalPositions;
let currentWaveHeight = 0;
let lastRenderedWaveHeight = Number.NaN;
let lastAnimateState = params.animate;
let secondHandPivot;
let clockStartTime = performance.now();
let tickingListener;
let tickingSound;
let tickingAudioReady = false;
let tickingStartPending = false;
let fogChairMaterials = [];
let stageLightRigs = [];
let cardVortex = [];
let cardVortexStartTime = performance.now();
let outerClockGear;
let decorativeGears = [];
let gearMotionStartTime = performance.now();
let cameraModeController;
let lightingModeController;

function setupThree() {
  setupRendererAndCamera();
  setupLights();
  createTable();
  createOuterFloorAndClock();
  createClock();
  setupClockAudio();
  createCardVortex();
  createProceduralChairs();
  loadFloatingModels();
  setupTableGUI();
}

function updateThree() {
  currentWaveHeight = THREE.MathUtils.lerp(currentWaveHeight, params.waveHeight, 0.055);
  updateTableSurface();
  cameraModeController.update();
  updateClock();
  updateOuterGears();
  updateCardVortex();
  lightingModeController.update();
  updateFog();
  updateFloatingModels();
}

function setupClockAudio() {
  tickingListener = new THREE.AudioListener();
  camera.add(tickingListener);
  tickingSound = new THREE.Audio(tickingListener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(
    "assets/new clock ticking.mp3",
    (buffer) => {
      tickingSound.setBuffer(buffer);
      tickingSound.setLoop(true);
      tickingSound.setVolume(0.42);
      tickingAudioReady = true;
      startClockTicking();
    },
    undefined,
    (error) => {
      console.warn("Clock ticking audio could not be loaded.", error);
    }
  );

  window.addEventListener("pointerdown", startClockTicking, true);
  window.addEventListener("keydown", startClockTicking, true);
}

function startClockTicking() {
  if (
    !tickingAudioReady ||
    !tickingSound ||
    tickingSound.isPlaying ||
    tickingStartPending
  ) return;

  tickingStartPending = true;
  const beginPlayback = () => {
    try {
      if (!tickingSound.isPlaying) tickingSound.play();
    } finally {
      tickingStartPending = false;
    }

    if (tickingSound.isPlaying) {
      window.removeEventListener("pointerdown", startClockTicking, true);
      window.removeEventListener("keydown", startClockTicking, true);
    }
  };

  if (tickingSound.context.state === "suspended") {
    tickingSound.context.resume().then(beginPlayback).catch(() => {
      tickingStartPending = false;
    });
  } else {
    beginPlayback();
  }
}

function setupRendererAndCamera() {
  scene.background = new THREE.Color(0x08040d);
  scene.fog = new THREE.FogExp2(0x30163d, params.fogDensity);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = false;

  camera.position.set(820, 440, 930);
  controls.target.set(0, TABLE_Y + 35, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 480;
  controls.maxDistance = 2400;
  controls.update();

  cameraModeController = new window.CameraModeController({
    params,
    camera,
    controls,
    renderer,
    ringRadius: RING_RADIUS,
    tableWidth: TABLE_WIDTH,
    tableY: TABLE_Y,
    getSurfaceHeight: (angle, radialOffset) =>
      tableGeometry
        ? getTableHeight(angle * RING_RADIUS, radialOffset)
        : 0,
  });
  cameraModeController.initialize(params.cameraMode);
}

function setupLights() {
  const ambient = new THREE.HemisphereLight(0x8b7b92, 0x090305, 0.68);
  scene.add(ambient);
  const regularEdgeLights = [];

  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + 0.1;
    const color = i % 2 === 0 ? 0xffc66f : 0xffdda0;
    const start = new THREE.Vector3(
      Math.cos(angle) * 760,
      650,
      Math.sin(angle) * 760
    );
    const target = new THREE.Vector3(
      Math.cos(angle) * 215,
      TABLE_Y + 16,
      Math.sin(angle) * 215
    );
    const light = new THREE.SpotLight(
      color,
      56000,
      1750,
      Math.PI * 0.19,
      0.72,
      1.4
    );
    light.position.copy(start);
    light.target.position.copy(target);
    light.castShadow = false;
    scene.add(light, light.target);
    const visibleBeam = createVisibleLightBeam(start, target, color);
    stageLightRigs.push({
      angle,
      start,
      target,
      direction: new THREE.Vector3(),
      beamRotation: new THREE.Quaternion(),
      beamCentre: new THREE.Vector3(),
      upAxis: new THREE.Vector3(0, 1, 0),
      light,
      beams: visibleBeam.beams,
      pool: visibleBeam.pool,
      baseDistance: visibleBeam.baseDistance,
    });
  }

  const frontWash = new THREE.SpotLight(
    0xffd7b2,
    36000,
    1900,
    Math.PI * 0.34,
    0.88,
    1.4
  );
  frontWash.position.set(120, 560, 980);
  frontWash.target.position.set(0, TABLE_Y + 55, 0);
  frontWash.castShadow = false;
  scene.add(frontWash, frontWash.target);

  for (const angle of [0.6, 2.7, 4.8]) {
    const redEdgeLight = new THREE.PointLight(0x8e1234, 15000, 640, 2);
    redEdgeLight.position.set(
      Math.cos(angle) * (RING_RADIUS + TABLE_WIDTH / 2),
      TABLE_Y + 24,
      Math.sin(angle) * (RING_RADIUS + TABLE_WIDTH / 2)
    );
    scene.add(redEdgeLight);
    regularEdgeLights.push(redEdgeLight);
  }

  lightingModeController = new window.LightingModeController({
    params,
    scene,
    renderer,
    stageLightRigs,
    ambient,
    frontWash,
    regularEdgeLights,
    tableY: TABLE_Y,
    chairLightRadius: CHAIR_LIGHT_RADIUS,
    chairBaseY: CHAIR_BASE_Y,
    getPuppetMaterials: () =>
      floatingModels
        .map((item) => item.puppet?.lines?.material)
        .filter(Boolean),
  });
  lightingModeController.initialize(params.lightingAtmosphere);
}

function createVisibleLightBeam(start, target, color) {
  const direction = new THREE.Vector3().subVectors(start, target);
  const distance = direction.length();
  const beamRotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  const beamCentre = new THREE.Vector3().copy(start).add(target).multiplyScalar(0.5);

  // Nested shells fake a soft volumetric falloff without post-processing.
  const beamLayers = [
    { radius: 185, opacity: 0.012 },
    { radius: 138, opacity: 0.020 },
    { radius: 92, opacity: 0.032 },
  ];
  const beams = [];

  for (const layer of beamLayers) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(layer.radius, distance, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    );
    beam.position.copy(beamCentre);
    beam.quaternion.copy(beamRotation);
    beam.renderOrder = 1;
    beam.userData.baseOpacity = layer.opacity;
    scene.add(beam);
    beams.push(beam);
  }

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(150, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(target);
  pool.position.y = TABLE_Y + 4;
  pool.renderOrder = 2;
  pool.userData.baseOpacity = 0.075;
  scene.add(pool);

  return { beams, pool, baseDistance: distance };
}

function createTable() {
  tableGroup = new THREE.Group();
  tableGroup.position.y = TABLE_Y;
  scene.add(tableGroup);

  tableGeometry = new THREE.PlaneGeometry(
    TABLE_LENGTH,
    TABLE_WIDTH,
    SEGMENTS_X,
    SEGMENTS_Z
  );
  tableGeometry.rotateX(-Math.PI / 2);

  originalPositions = Float32Array.from(tableGeometry.attributes.position.array);
  bendTableIntoRing(false);
  tableGeometry.computeVertexNormals();
  checkerTexture = createCheckerTexture();

  tableMaterial = new THREE.MeshStandardMaterial({
    map: checkerTexture,
    color: 0xffffff,
    roughness: 0,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  tableSurface = new THREE.Mesh(tableGeometry, tableMaterial);
  tableSurface.castShadow = false;
  tableSurface.receiveShadow = false;
  tableSurface.frustumCulled = false;
  tableGroup.add(tableSurface);
  createTableFrame();
}

function createCheckerTexture() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const size = 256;
  const half = size / 2;

  canvas.width = size;
  canvas.height = size;
  context.fillStyle = "#eee8df";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#121013";
  context.fillRect(0, 0, half, half);
  context.fillRect(half, half, half, half);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(params.checkerX / 2, params.checkerZ / 2);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createTableFrame() {
  const outerRadius = RING_RADIUS + TABLE_WIDTH / 2;
  const innerRadius = RING_RADIUS - TABLE_WIDTH / 2;
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x35151f,
    roughness: 0.58,
    metalness: 0.1,
  });

  const underside = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius - 18, outerRadius + 18, 192, 1),
    frameMaterial
  );
  underside.rotation.x = -Math.PI / 2;
  underside.position.y = -26;
  tableGroup.add(underside);

  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius + 18, outerRadius + 18, 52, 192, 1, true),
    frameMaterial
  );
  outerWall.position.y = -26;
  tableGroup.add(outerWall);

  const innerWallMaterial = frameMaterial.clone();
  innerWallMaterial.side = THREE.BackSide;
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(innerRadius - 18, innerRadius - 18, 52, 192, 1, true),
    innerWallMaterial
  );
  innerWall.position.y = -26;
  tableGroup.add(innerWall);

  for (const radius of [innerRadius, outerRadius]) {
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 13, 8, 192),
      frameMaterial
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 2;
    tableGroup.add(rail);
  }
}

function createOuterFloorAndClock() {
  const floorTopY = CHAIR_BASE_Y;
  const marbleMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8d2cd,
    roughness: 0.52,
    metalness: 0.03,
  });
  const marbleSideMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f7882,
    roughness: 0.52,
    metalness: 0.04,
  });

  const marblePlatform = new THREE.Mesh(
    new THREE.CylinderGeometry(
      MARBLE_PLATFORM_RADIUS,
      MARBLE_PLATFORM_RADIUS,
      28,
      160,
      1,
      false
    ),
    [marbleSideMaterial, marbleMaterial, marbleSideMaterial]
  );
  marblePlatform.position.y = floorTopY - 14;
  marblePlatform.receiveShadow = false;
  scene.add(marblePlatform);

  const outerClockMaterial = new THREE.MeshStandardMaterial({
    color: 0x100d14,
    roughness: 0.48,
    metalness: 0.08,
  });
  const whiteClockMaterial = new THREE.MeshBasicMaterial({
    color: 0xf5f1e8,
    toneMapped: false,
  });
  const gearMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f3545,
    roughness: 0.42,
    metalness: 0.62,
  });

  outerClockGear = new THREE.Group();
  scene.add(outerClockGear);

  const outerClockFace = new THREE.Mesh(
    new THREE.RingGeometry(
      OUTER_CLOCK_INNER_RADIUS,
      OUTER_CLOCK_OUTER_RADIUS,
      192,
      1
    ),
    outerClockMaterial
  );
  outerClockFace.rotation.x = -Math.PI / 2;
  outerClockFace.position.y = floorTopY + 2;
  outerClockGear.add(outerClockFace);

  for (const radius of [OUTER_CLOCK_INNER_RADIUS, OUTER_CLOCK_OUTER_RADIUS]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 7, 8, 192),
      whiteClockMaterial
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = floorTopY + 7;
    outerClockGear.add(rim);
  }

  const outerGearBody = new THREE.Mesh(
    createGearGeometry(
      OUTER_CLOCK_OUTER_RADIUS,
      48,
      78,
      16,
      OUTER_CLOCK_OUTER_RADIUS - 105
    ),
    gearMaterial
  );
  outerGearBody.position.y = floorTopY + 2;
  outerClockGear.add(outerGearBody);

  const outerHandMaterial = new THREE.MeshStandardMaterial({
    color: 0x09080b,
    roughness: 0.38,
    metalness: 0.18,
  });
  const outerMinuteLength = OUTER_CLOCK_NUMBER_RADIUS - 120;
  const outerMinuteHand = new THREE.Mesh(
    new THREE.BoxGeometry(17, 7, outerMinuteLength),
    outerHandMaterial
  );
  outerMinuteHand.position.set(0, floorTopY + 12, -outerMinuteLength / 2);
  outerClockGear.add(outerMinuteHand);

  const outerHourLength = OUTER_CLOCK_INNER_RADIUS * 0.78;
  const outerHourHand = new THREE.Mesh(
    new THREE.BoxGeometry(25, 8, outerHourLength),
    outerHandMaterial
  );
  outerHourHand.position.set(0, floorTopY + 13, outerHourLength / 2);
  outerClockGear.add(outerHourHand);

  const outerClockPin = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 10, 32),
    outerHandMaterial
  );
  outerClockPin.position.y = floorTopY + 15;
  outerClockGear.add(outerClockPin);

  const romanNumerals = [
    "XII", "I", "II", "III", "IV", "V",
    "VI", "VII", "VIII", "IX", "X", "XI",
  ];
  const numeralGeometry = new THREE.PlaneGeometry(165, 94);
  for (let i = 0; i < romanNumerals.length; i++) {
    const angle = i * Math.PI / 6;
    const numeralMaterial = new THREE.MeshBasicMaterial({
      map: createRomanNumeralTexture(romanNumerals[i]),
      transparent: true,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const numeral = new THREE.Mesh(numeralGeometry, numeralMaterial);
    numeral.position.set(
      Math.sin(angle) * OUTER_CLOCK_NUMBER_RADIUS,
      floorTopY + 9,
      -Math.cos(angle) * OUTER_CLOCK_NUMBER_RADIUS
    );
    numeral.rotation.set(-Math.PI / 2, 0, 0);
    const isQuarterHour = i % 3 === 0;
    numeral.scale.setScalar(isQuarterHour ? 1.38 : 1);
    numeral.renderOrder = 2;
    outerClockGear.add(numeral);
  }

  createDecorativeGears(floorTopY, gearMaterial);
}

function createGearGeometry(
  rootRadius,
  toothCount,
  toothHeight,
  thickness,
  holeRadius
) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / toothCount;
  const toothProfile = [
    [0, rootRadius],
    [0.2, rootRadius],
    [0.28, rootRadius + toothHeight],
    [0.72, rootRadius + toothHeight],
    [0.8, rootRadius],
    [1, rootRadius],
  ];

  for (let tooth = 0; tooth < toothCount; tooth++) {
    for (let point = 0; point < toothProfile.length; point++) {
      const angle = -(tooth + toothProfile[point][0]) * step;
      const radius = toothProfile[point][1];
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (tooth === 0 && point === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createDecorativeGears(floorTopY, baseMaterial) {
  const gearConfigs = [
    { radius: 900, teeth: 44, x: -1650, z: -950, y: -22, speed: 0.052, phase: 0.2, color: 0x704958 },
    { radius: 650, teeth: 34, x: -2200, z: 180, y: -40, speed: -0.074, phase: 1.1, color: 0x493544 },
    { radius: 1050, teeth: 52, x: -1500, z: 1300, y: -30, speed: 0.045, phase: 2.4, color: 0x654052 },
    { radius: 980, teeth: 48, x: 1600, z: -760, y: -26, speed: -0.050, phase: 0.7, color: 0x513644 },
    { radius: 760, teeth: 40, x: 2000, z: 900, y: -44, speed: 0.064, phase: 1.8, color: 0x754b55 },
  ];

  for (const config of gearConfigs) {
    const material = baseMaterial.clone();
    material.color.setHex(config.color);
    const gear = createDecorativeGear(
      config.radius,
      config.teeth,
      material
    );
    gear.position.set(
      config.x,
      floorTopY + config.y,
      config.z
    );
    gear.userData.speed = config.speed;
    gear.userData.phase = config.phase;
    decorativeGears.push(gear);
    scene.add(gear);
  }
}

function createDecorativeGear(radius, toothCount, material) {
  const gear = new THREE.Group();
  const body = new THREE.Mesh(
    createGearGeometry(
      radius,
      toothCount,
      Math.max(48, radius * 0.115),
      16,
      radius * 0.56
    ),
    material
  );
  body.position.y = 4;
  gear.add(body);

  const spokeWidth = Math.max(16, radius * 0.075);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(spokeWidth, 8, radius * 1.42),
      material
    );
    spoke.position.y = 5;
    spoke.rotation.y = i * Math.PI / 3;
    gear.add(spoke);
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.15, radius * 0.15, 13, 28),
    material
  );
  hub.position.y = 7;
  gear.add(hub);

  return gear;
}

function updateOuterGears() {
  const elapsedSeconds = (performance.now() - gearMotionStartTime) / 1000;
  if (outerClockGear) {
    outerClockGear.rotation.y = -elapsedSeconds * 0.045;
  }

  for (const gear of decorativeGears) {
    gear.rotation.y =
      gear.userData.phase + elapsedSeconds * gear.userData.speed;
  }
}

function createRomanNumeralTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f7f3ea";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "72px Georgia, 'Times New Roman', serif";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createClock() {
  const clockGroup = new THREE.Group();
  clockGroup.position.y = TABLE_Y;
  scene.add(clockGroup);

  const clockRadius = RING_RADIUS - TABLE_WIDTH / 2 - 48;
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xb98232,
    metalness: 0.9,
    roughness: 0.22,
  });
  const darkGoldMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f471d,
    metalness: 0.78,
    roughness: 0.3,
  });
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8dfce,
    metalness: 0.03,
    roughness: 0.72,
  });

  const clockCase = new THREE.Mesh(
    new THREE.CylinderGeometry(clockRadius, clockRadius, 22, 128),
    darkGoldMaterial
  );
  clockCase.position.y = -12;
  clockGroup.add(clockCase);

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(clockRadius - 18, 128),
    faceMaterial
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.5;
  clockGroup.add(face);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(clockRadius - 10, 10, 12, 128),
    goldMaterial
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 6;
  clockGroup.add(rim);

  const markerGeometry = new THREE.BoxGeometry(8, 4, 30);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a2818,
    metalness: 0.58,
    roughness: 0.32,
  });
  const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, 12);
  const markerRadius = clockRadius - 58;
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    dummy.position.set(
      Math.sin(angle) * markerRadius,
      5,
      -Math.cos(angle) * markerRadius
    );
    dummy.rotation.set(0, angle, 0);
    const major = i % 3 === 0 ? 1.45 : 1;
    dummy.scale.set(major, 1, major);
    dummy.updateMatrix();
    markers.setMatrixAt(i, dummy.matrix);
  }
  markers.instanceMatrix.needsUpdate = true;
  clockGroup.add(markers);

  const handMaterial = new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 0.18,
    roughness: 0.24,
  });

  const hourHand = new THREE.Mesh(
    new THREE.BoxGeometry(18, 7, 150),
    handMaterial
  );
  hourHand.position.set(0, 12, 75);
  clockGroup.add(hourHand);

  const minuteHand = new THREE.Mesh(
    new THREE.BoxGeometry(12, 6, 220),
    handMaterial
  );
  minuteHand.position.set(0, 15, -110);
  clockGroup.add(minuteHand);

  secondHandPivot = new THREE.Group();
  secondHandPivot.position.y = 19;
  clockGroup.add(secondHandPivot);

  const secondMaterial = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const secondHand = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3, 246),
    secondMaterial
  );
  secondHand.position.z = -104;
  secondHandPivot.add(secondHand);

  const secondTail = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3, 70),
    secondMaterial
  );
  secondTail.position.z = 35;
  secondHandPivot.add(secondTail);

  const centrePin = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 15, 13, 32),
    goldMaterial
  );
  centrePin.position.y = 23;
  clockGroup.add(centrePin);
}

function updateClock() {
  if (!secondHandPivot) return;
  const elapsedSeconds = (performance.now() - clockStartTime) / 1000;
  secondHandPivot.rotation.y = -elapsedSeconds * Math.PI / 30;
}

function createCardVortex() {
  const cardGeometry = new THREE.PlaneGeometry(64, 92, 1, 1);
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♠", "♥", "♦", "♣"];
  const faceTextures = [];

  for (let i = 0; i < 12; i++) {
    faceTextures.push(
      createPlayingCardTexture(ranks[(i * 3) % ranks.length], suits[i % suits.length])
    );
  }
  const backTexture = createPlayingCardTexture("", "", true);

  for (let i = 0; i < 28; i++) {
    const texture = i % 5 === 0 ? backTexture : faceTextures[i % faceTextures.length];
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.72,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      emissive: 0x2b1714,
      emissiveIntensity: 0.18,
    });
    const card = new THREE.Mesh(cardGeometry, material);
    card.name = `Vortex Card ${i + 1}`;
    card.renderOrder = 3;
    scene.add(card);

    cardVortex.push({
      mesh: card,
      material,
      offset: i / 28,
      phase: i * 1.731,
      radialJitter: Math.sin(i * 4.19) * 14,
    });
  }

  const cardGlow = new THREE.PointLight(0xffc98a, 7200, 680, 2);
  cardGlow.position.set(0, TABLE_Y + 430, 0);
  scene.add(cardGlow);
}

function createPlayingCardTexture(rank, suit, isBack = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 368;
  const context = canvas.getContext("2d");

  context.fillStyle = "#efe7d7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#a88758";
  context.lineWidth = 9;
  context.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);

  if (isBack) {
    context.fillStyle = "#761c35";
    context.fillRect(22, 22, canvas.width - 44, canvas.height - 44);
    context.strokeStyle = "#e0b775";
    context.lineWidth = 4;
    context.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);
    context.globalAlpha = 0.62;
    context.lineWidth = 2;
    for (let x = -canvas.height; x < canvas.width + canvas.height; x += 28) {
      context.beginPath();
      context.moveTo(x, 28);
      context.lineTo(x + canvas.height - 56, canvas.height - 28);
      context.stroke();
      context.beginPath();
      context.moveTo(x, canvas.height - 28);
      context.lineTo(x + canvas.height - 56, 28);
      context.stroke();
    }
    context.globalAlpha = 1;
  } else {
    const isRed = suit === "♥" || suit === "♦";
    context.fillStyle = isRed ? "#a8142d" : "#17131a";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 47px Georgia, serif";
    context.fillText(rank, 44, 47);
    context.font = "43px Georgia, serif";
    context.fillText(suit, 44, 91);
    context.save();
    context.translate(canvas.width, canvas.height);
    context.rotate(Math.PI);
    context.font = "bold 47px Georgia, serif";
    context.fillText(rank, 44, 47);
    context.font = "43px Georgia, serif";
    context.fillText(suit, 44, 91);
    context.restore();
    context.font = "154px Georgia, serif";
    context.fillText(suit, canvas.width / 2, canvas.height / 2 + 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function updateCardVortex() {
  if (cardVortex.length === 0) return;

  const elapsed = (performance.now() - cardVortexStartTime) / 1000;
  const travelSpeed = 0.045;
  const totalTurns = Math.PI * 2 * 2.65;
  const baseHeight = TABLE_Y + 275;
  const heightRange = 430;
  const minimumRadius = 42;

  for (const cardState of cardVortex) {
    const progress = (cardState.offset + elapsed * travelSpeed) % 1;
    const angle = progress * totalTurns + elapsed * 0.48;
    const radius =
      minimumRadius +
      Math.pow(progress, 0.76) * (params.cardVortexRadius - minimumRadius) +
      cardState.radialJitter * Math.sin(progress * Math.PI);
    const flutter = Math.sin(elapsed * 1.7 + cardState.phase);

    cardState.mesh.position.set(
      Math.cos(angle) * radius,
      baseHeight + progress * heightRange + flutter * 9,
      Math.sin(angle) * radius
    );
    cardState.mesh.rotation.set(
      -0.24 + flutter * 0.34,
      -angle + Math.PI / 2 +
        Math.sin(elapsed * 0.95 + cardState.phase * 0.7) * 0.34,
      Math.sin(elapsed * 1.55 + cardState.phase) * 0.58
    );

    const scale = THREE.MathUtils.lerp(0.7, 1.16, progress);
    cardState.mesh.scale.setScalar(scale);

    const fadeIn = THREE.MathUtils.smoothstep(progress, 0.015, 0.11);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, 0.93, 0.995);
    cardState.material.opacity = fadeIn * fadeOut * 0.98;
  }
}

function createProceduralChairs() {
  const chairPrototype = createChairPrototype();

  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + 0.1;
    const radius = i % 2 === 0 ? CHAIR_RADIUS_NEAR : CHAIR_RADIUS_FAR;
    const chair = chairPrototype.clone(true);

    chair.name = `Fog Chair ${i + 1}`;
    chair.position.set(
      Math.cos(angle) * radius,
      CHAIR_BASE_Y + (i % 3) * 8,
      Math.sin(angle) * radius
    );
    chair.rotation.set(0, -angle - Math.PI / 2, 0);
    chair.up.set(0, 1, 0);
    scene.add(chair);
  }
}

function createChairPrototype() {
  const chair = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x765023,
    metalness: 0.72,
    roughness: 0.34,
    emissive: 0x1b1006,
    emissiveIntensity: 0.28,
  });
  const velvetMaterial = new THREE.MeshStandardMaterial({
    color: 0x35133f,
    roughness: 0.88,
    metalness: 0.02,
    emissive: 0x13071a,
    emissiveIntensity: 0.16,
  });
  const seatMaterial = new THREE.MeshStandardMaterial({
    color: 0x551b3c,
    roughness: 0.82,
    metalness: 0.03,
    emissive: 0x180712,
    emissiveIntensity: 0.22,
  });
  for (const material of [frameMaterial, velvetMaterial, seatMaterial]) {
    material.transparent = true;
    material.depthWrite = false;
    fogChairMaterials.push(material);
  }

  const addPart = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    chair.add(mesh);
    return mesh;
  };

  addPart(new THREE.BoxGeometry(108, 15, 92), frameMaterial, 0, 110, 0);
  addPart(new THREE.BoxGeometry(92, 12, 76), seatMaterial, 0, 122, 4);

  const legGeometry = new THREE.CylinderGeometry(4.5, 7, 108, 8);
  for (const x of [-43, 43]) {
    for (const z of [-34, 34]) {
      const leg = addPart(legGeometry, frameMaterial, x, 54, z);
      leg.rotation.z = x < 0 ? 0.055 : -0.055;
      leg.rotation.x = z < 0 ? -0.035 : 0.035;
    }
  }

  const backShape = new THREE.Shape();
  backShape.moveTo(-38, 0);
  backShape.bezierCurveTo(-50, 35, -49, 78, -31, 108);
  backShape.bezierCurveTo(-18, 129, -8, 139, 0, 150);
  backShape.bezierCurveTo(8, 139, 18, 129, 31, 108);
  backShape.bezierCurveTo(49, 78, 50, 35, 38, 0);
  backShape.lineTo(-38, 0);

  const backGeometry = new THREE.ExtrudeGeometry(backShape, {
    depth: 13,
    bevelEnabled: true,
    bevelSize: 3,
    bevelThickness: 3,
    bevelSegments: 2,
    curveSegments: 8,
  });
  addPart(backGeometry, velvetMaterial, 0, 128, -51);

  const postGeometry = new THREE.CylinderGeometry(5, 6.5, 178, 10);
  addPart(postGeometry, frameMaterial, -49, 205, -43);
  addPart(postGeometry, frameMaterial, 49, 205, -43);
  addPart(new THREE.BoxGeometry(104, 10, 11), frameMaterial, 0, 282, -43);

  const finialGeometry = new THREE.SphereGeometry(9, 12, 8);
  addPart(finialGeometry, frameMaterial, -49, 296, -43);
  addPart(finialGeometry, frameMaterial, 49, 296, -43);
  addPart(new THREE.SphereGeometry(11, 12, 8), frameMaterial, 0, 302, -43);

  const armGeometry = new THREE.BoxGeometry(9, 9, 76);
  addPart(armGeometry, frameMaterial, -58, 162, 7);
  addPart(armGeometry, frameMaterial, 58, 162, 7);
  const armSupportGeometry = new THREE.CylinderGeometry(4, 5, 49, 8);
  addPart(armSupportGeometry, frameMaterial, -58, 139, 26);
  addPart(armSupportGeometry, frameMaterial, 58, 139, 26);

  chair.scale.setScalar(1.7);
  return chair;
}

function updateFog() {
  if (!scene.fog || !scene.fog.isFogExp2) return;
  const atmosphereScale = params.lightingAtmosphere === "horror" ? 0.55 : 1;
  scene.fog.density = params.fogDensity * atmosphereScale;

  const fogAmount = THREE.MathUtils.clamp(
    (params.fogDensity - 0.0001) / 0.0008,
    0,
    1
  );
  const chairOpacity = THREE.MathUtils.lerp(1.0, 0.24, fogAmount);
  for (const material of fogChairMaterials) {
    material.opacity = chairOpacity;
    material.depthWrite = chairOpacity > 0.85;
  }
}

function setupTableGUI() {
  const cameraFolder = pane.addFolder({
    title: "Camera",
    expanded: true,
  });
  cameraFolder.addBinding(params, "cameraMode", {
    label: "View Mode",
    options: {
      "Player Mode": "player",
      "Free Mode": "free",
    },
  }).on("change", (event) => {
    cameraModeController.setMode(event.value);
  });

  const tableFolder = pane.addFolder({ title: "Checker Stage", expanded: true });
  tableFolder.addBinding(params, "waveHeight", {
    label: "Wave Height",
    min: 0,
    max: 15,
    step: 1,
  });

  tableFolder.addBinding(params, "waveSpeed", {
    label: "Wave Speed",
    min: 0,
    max: 0.02,
    step: 0.0005,
  });
  tableFolder.addBinding(params, "animate", { label: "Animate" });
  tableFolder.addBinding(params, "wireframe", { label: "Wireframe" })
    .on("change", (event) => {
      tableMaterial.wireframe = event.value;
    });

  const cardFolder = pane.addFolder({
    title: "Card Vortex",
    expanded: true,
  });
  cardFolder.addBinding(params, "cardVortexRadius", {
    label: "Vortex Radius",
    min: 120,
    max: VORTEX_MAX_RADIUS,
    step: 5,
  });

  const lightFolder = pane.addFolder({
    title: "Stage Lights",
    expanded: true,
  });
  lightFolder.addBinding(params, "lightingAtmosphere", {
    label: "Atmosphere",
    options: {
      "Golden Ritual": "golden",
      "Horror Mode": "horror",
    },
  }).on("change", (event) => {
    lightingModeController.setAtmosphere(event.value);
  });
  const lightSpreadBinding = lightFolder.addBinding(params, "lightSpread", {
    label: "Light Spread",
    min: 0,
    max: 1,
    step: 0.01,
  });
  const lightModeBinding = lightFolder.addBinding(params, "lightMode", {
    label: "Light Mode",
    options: {
      "All Beams": "all",
      "Single Loop": "single",
      "No Beams": "none",
    },
  }).on("change", () => {
    lightingModeController.restartGoldenCycle();
  });
  lightingModeController.attachGUI(lightSpreadBinding, lightModeBinding);

  const fogFolder = pane.addFolder({
    title: "Purple Fog",
    expanded: true,
  });
  fogFolder.addBinding(params, "fogDensity", {
    label: "Fog Density",
    min: 0.0001,
    max: 0.002,
    step: 0.00005,
  });
}

function getEdgeFade(x, z) {
  const v = THREE.MathUtils.clamp(z / TABLE_WIDTH + 0.5, 0, 1);
  const distanceToEdge = Math.min(v, 1 - v);
  return THREE.MathUtils.smoothstep(distanceToEdge, 0.055, 0.18);
}

function getTableHeight(x, z) {
  const movingPhase = params.animate ? frame * params.waveSpeed : 0;
  const angle = x / RING_RADIUS;
  const broadWave = Math.sin(angle * 4 + movingPhase) * 0.64;
  const crossingWave = Math.sin(angle * 7 - movingPhase * 1.35 + z * 0.024) * 0.36;
  return (broadWave + crossingWave) * currentWaveHeight * getEdgeFade(x, z);
}

function bendTableIntoRing(includeWave) {
  const positions = tableGeometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    const stripX = originalPositions[i];
    const stripZ = originalPositions[i + 2];
    const angle = stripX / RING_RADIUS;
    const radius = RING_RADIUS + stripZ;
    const height = includeWave ? getTableHeight(stripX, stripZ) : 0;

    positions[i] = Math.cos(angle) * radius;
    positions[i + 1] = height;
    positions[i + 2] = Math.sin(angle) * radius;
  }

  tableGeometry.attributes.position.needsUpdate = true;
}

function updateTableSurface() {
  const heightChanged =
    !Number.isFinite(lastRenderedWaveHeight) ||
    Math.abs(currentWaveHeight - lastRenderedWaveHeight) > 0.01;
  const animateChanged = lastAnimateState !== params.animate;
  const surfaceIsMoving = params.animate && currentWaveHeight > 0.01;

  if (!surfaceIsMoving && !heightChanged && !animateChanged) return;
  if (surfaceIsMoving && frame % 2 !== 0) return;

  bendTableIntoRing(true);
  lastRenderedWaveHeight = currentWaveHeight;
  lastAnimateState = params.animate;

  if (!surfaceIsMoving || frame % 6 === 0) {
    tableGeometry.computeVertexNormals();
  }
}

async function loadFloatingModels() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();

  for (const config of FLOATING_MODEL_CONFIGS) {
    loader.load(
      config.url,
      function (gltf) {
        addFloatingModel(gltf.scene, config);
        console.log(`${config.name} loaded successfully.`);
      },
      undefined,
      function (error) {
        console.error(`Could not load ${config.name}:`, error);
      }
    );
  }
}

function addFloatingModel(model, config) {
  const originalBox = new THREE.Box3().setFromObject(model);
  const originalSize = originalBox.getSize(new THREE.Vector3());
  const largestDimension = Math.max(originalSize.x, originalSize.y, originalSize.z);

  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    console.error(`${config.name} has invalid dimensions.`);
    return;
  }

  model.scale.setScalar(config.targetSize / largestDimension);
  const scaledBox = new THREE.Box3().setFromObject(model);
  const modelSize = scaledBox.getSize(new THREE.Vector3());
  const modelCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(modelCenter);

  model.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  const group = new THREE.Group();
  const radius = RING_RADIUS + config.side * (TABLE_WIDTH / 2 + config.edgeGap);
  const basePosition = new THREE.Vector3(
    Math.cos(config.angle) * radius,
    TABLE_Y + config.height,
    Math.sin(config.angle) * radius
  );
  const baseRotation = new THREE.Euler(
    config.rotation.x,
    -config.angle + Math.PI / 2 + config.rotation.y,
    config.rotation.z
  );

  group.position.copy(basePosition);
  group.rotation.copy(baseRotation);
  group.add(model);
  scene.add(group);

  const puppet = createPuppetLines(modelSize);
  scene.add(puppet.lines);

  floatingModels.push({ group, config, basePosition, baseRotation, puppet });
}

function createPuppetLines(modelSize) {
  const halfWidth = Math.max(18, modelSize.x * 0.24);
  const halfDepth = Math.max(12, modelSize.z * 0.18);
  const topY = Math.max(12, modelSize.y * 0.38);
  const localAnchors = [
    new THREE.Vector3(-halfWidth, topY, halfDepth * 0.35),
    new THREE.Vector3(halfWidth, topY, -halfDepth * 0.35),
    new THREE.Vector3(0, topY * 0.72, halfDepth),
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(18), 3)
  );
  const material = new THREE.LineBasicMaterial({
    color: 0xb81731,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  return { lines, localAnchors };
}

function updatePuppetLines(item) {
  const positionArray = item.puppet.lines.geometry.attributes.position.array;
  const worldAnchor = new THREE.Vector3();
  const topAnchor = new THREE.Vector3();

  for (let i = 0; i < item.puppet.localAnchors.length; i++) {
    worldAnchor
      .copy(item.puppet.localAnchors[i])
      .applyQuaternion(item.group.quaternion)
      .add(item.group.position);

    topAnchor.set(
      item.basePosition.x + item.puppet.localAnchors[i].x * 0.45,
      PUPPET_CEILING_Y,
      item.basePosition.z + item.puppet.localAnchors[i].z * 0.45
    );

    const vertex = i * 6;
    positionArray[vertex] = topAnchor.x;
    positionArray[vertex + 1] = topAnchor.y;
    positionArray[vertex + 2] = topAnchor.z;
    positionArray[vertex + 3] = worldAnchor.x;
    positionArray[vertex + 4] = worldAnchor.y;
    positionArray[vertex + 5] = worldAnchor.z;
  }

  item.puppet.lines.geometry.attributes.position.needsUpdate = true;
}

function updateFloatingModels() {
  for (const item of floatingModels) {
    const { group, config, basePosition, baseRotation } = item;
    const motion = config.float;
    const wave = frame * motion.speed + motion.phase;

    group.position.copy(basePosition);
    group.position.y += Math.sin(wave) * motion.height;
    group.rotation.x = baseRotation.x + Math.sin(wave * 0.57) * motion.swayX;
    group.rotation.y = baseRotation.y + Math.sin(wave * 0.33) * 0.018;
    group.rotation.z = baseRotation.z + Math.cos(wave * 0.73) * motion.swayZ;
    updatePuppetLines(item);
  }
}
