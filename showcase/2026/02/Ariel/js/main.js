let clusters = [];
let bars = [];

function setupThree() {
  renderer.setClearColor("#000000");

  ambiLight = new THREE.AmbientLight("#AAAAAA");
  scene.add(ambiLight);

  // each cluster's 5 sphere x-positions, written out directly — no offset math
  const clusterPositions = [
    [-1160, -910, -660, -390, -130],
    [160, 410, 660, 930, 1190]
  ];
  const clusterMirrors = [-1, 1]; // the two clusters spin as mirror images of each other


  for (let c = 0; c < clusterPositions.length; c++) {
    clusters.push(new Cluster(clusterPositions[c], clusterMirrors[c]));
  }

  buildBars(clusterPositions);
}

function updateThree() {
  let angle = frame * 0.03;

  for (let c = 0; c < clusters.length; c++) {
    clusters[c].update(angle);
  }


  for (let i = 0; i < bars.length; i++) {
    bars[i].rotation.x += 0.02;
  }
}


class Cluster {
  constructor(positions, mirror) {
    const jitter = 0.85 + Math.random() * 0.3; // slight per-cluster randomness

    // sphereA: metallic, mid grey
    const sphereA = getMetalSphere("#808080");
    scene.add(sphereA);
    sphereA.position.x = positions[0];
    sphereA.scale.set(100, 100, 100);

    // sphereB: hollow / wireframe
    const sphereB = getHollowSphere("#CCCCCC");
    scene.add(sphereB);
    sphereB.position.x = positions[1];
    sphereB.scale.set(50, 50, 50);

    // sphereC: metallic, dark grey — the center of this cluster
    const sphereC = getMetalSphere("#4D4D4D");
    scene.add(sphereC);
    sphereC.position.x = positions[2];
    sphereC.scale.set(130, 130, 130);

    // sphereD: hollow / wireframe
    const sphereD = getHollowSphere("#4D4D4D");
    scene.add(sphereD);
    sphereD.position.x = positions[3];
    sphereD.scale.set(70, 70, 70);

    // sphereE: metallic, light grey
    const sphereE = getMetalSphere("#E6E6E6");
    scene.add(sphereE);
    sphereE.position.x = positions[4];
    sphereE.scale.set(110, 110, 110);

    // one orbiting light for sphereA
    const lightA = getPointLight("#FFFFFF");
    scene.add(lightA);
    const lightAMesh = getBasicSphere();
    lightA.add(lightAMesh);
    lightAMesh.scale.set(6, 6, 6);
    const lightARadius = 180 * jitter;

    // one orbiting light for sphereE
    const lightE = getPointLight("#FFFFFF");
    scene.add(lightE);
    const lightEMesh = getBasicSphere();
    lightE.add(lightEMesh);
    lightEMesh.scale.set(6, 6, 6);
    const lightERadius = 200 * jitter;

    // three tilted rings of light for sphereC
    const lightC1 = getPointLight("#FFFFFF");
    scene.add(lightC1);
    const lightC1Mesh = getBasicSphere();
    lightC1.add(lightC1Mesh);
    lightC1Mesh.scale.set(6, 6, 6);

    const lightC2 = getPointLight("#FFFFFF");
    scene.add(lightC2);
    const lightC2Mesh = getBasicSphere();
    lightC2.add(lightC2Mesh);
    lightC2Mesh.scale.set(6, 6, 6);

    const lightC3 = getPointLight("#FFFFFF");
    scene.add(lightC3);
    const lightC3Mesh = getBasicSphere();
    lightC3.add(lightC3Mesh);
    lightC3Mesh.scale.set(6, 6, 6);

    const orbitR = 230 * jitter;
    const tiltTop = (Math.PI / 3) * jitter;
    const tiltBot = -tiltTop;

    // bundle everything onto the instance in one place, instead of
    // writing "this." in front of every single sphere and light above
    Object.assign(this, {
      sphereA, sphereB, sphereC, sphereD, sphereE,
      lightA, lightE, lightARadius, lightERadius,
      lightC1, lightC2, lightC3,
      orbitR, tiltTop, tiltBot, mirror
    });
  }

  update(angle) {
    // pull everything back out into plain local names for this method
    const { sphereA, sphereB, sphereC, sphereD, sphereE,
      lightA, lightE, lightARadius, lightERadius,
      lightC1, lightC2, lightC3,
      orbitR, tiltTop, tiltBot, mirror } = this;

    const a = angle * mirror;
    const aRev = -a;

    // sphereA / sphereE: one orbiting light each
    lightA.position.set(sphereA.position.x + cos(a) * lightARadius, -20, sin(a) * lightARadius);
    lightE.position.set(sphereE.position.x + cos(aRev) * lightERadius, -20, sin(aRev) * lightERadius);

    // sphereC: three tilted rings of light — top, middle (reversed), bottom
    lightC2.position.set(sphereC.position.x + cos(aRev) * orbitR, 0, sin(aRev) * orbitR);
    lightC1.position.set(sphereC.position.x + cos(a) * orbitR, -sin(a) * orbitR * sin(tiltTop), sin(a) * orbitR * cos(tiltTop));
    lightC3.position.set(sphereC.position.x + cos(a) * orbitR, -sin(a) * orbitR * sin(tiltBot), sin(a) * orbitR * cos(tiltBot));

    sphereA.rotation.x += 0.02 * mirror;
    sphereA.rotation.y += 0.01 * mirror;

    sphereB.rotation.x += 0.01 * mirror;
    sphereB.rotation.y += 0.02 * mirror;

    sphereC.rotation.x += 0.01 * mirror;
    sphereC.rotation.y += 0.03 * mirror;

    sphereD.rotation.x += 0.01 * mirror;
    sphereD.rotation.y += 0.04 * mirror;

    sphereE.rotation.x += 0.03 * mirror;
    sphereE.rotation.y += 0.02 * mirror;
  }
}


function buildBars(clusterPositions) {
  const radii = [100, 50, 130, 70, 110]; // sphereA..sphereE, same for every cluster
  const barPositions = [];

  const firstCluster = clusterPositions[0];
  const lastCluster = clusterPositions[clusterPositions.length - 1];
  const leftEdge = firstCluster[0] - radii[0];
  const rightEdge = lastCluster[4] + radii[4];

  // a short trailing row to the left of the leftmost cluster
  for (let i = 3; i >= 1; i--) {
    barPositions.push(leftEdge - i * 90);
  }

  for (let c = 0; c < clusterPositions.length; c++) {
    const p = clusterPositions[c];

    barPositions.push((p[0] + radii[0] + p[1] - radii[1]) / 2); // between sphereA and sphereB
    barPositions.push((p[1] + radii[1] + p[2] - radii[2]) / 2); // between sphereB and sphereC
    barPositions.push((p[2] + radii[2] + p[3] - radii[3]) / 2); // between sphereC and sphereD
    barPositions.push((p[3] + radii[3] + p[4] - radii[4]) / 2); // between sphereD and sphereE

    if (c < clusterPositions.length - 1) {
      const nextP = clusterPositions[c + 1];
      const gapCenter = ((p[4] + radii[4]) + (nextP[0] - radii[0])) / 2;
      barPositions.push(gapCenter); // connects this cluster to the next one
    }
  }


  for (let i = 1; i <= 3; i++) {
    barPositions.push(rightEdge + i * 90);
  }

  const minLength = 4;
  const maxLength = 15;
  const minWidth = 40;
  const maxWidth = 100; // the smallest sphere's diameter (sphereB, radius 50)
  const twistStep = Math.PI / 4;

  for (let i = 0; i < barPositions.length; i++) {
    const length = minLength + Math.random() * (maxLength - minLength);
    const width1 = minWidth + Math.random() * (maxWidth - minWidth);
    const width2 = minWidth + Math.random() * (maxWidth - minWidth);

    const bar = getBar(getRandomGreyWhite());
    scene.add(bar);
    bar.position.set(barPositions[i], 0, 0);
    bar.scale.set(length, width1, width2);
    bar.rotation.x = i * twistStep;

    bars.push(bar);
  }
}

// a solid sphere with a soft metallic sheen
function getMetalSphere(color) {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.2
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

// hollow / wireframe, no filled surface
function getHollowSphere(color) {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getBasicSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff"
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPointLight(color) {
  const light = new THREE.PointLight(color, 3, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
  return light;
}

// a thin, nearly-transparent rectangular bar
function getBar(color) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0.25
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

// a random shade between light grey and gray-white
function getRandomGreyWhite() {
  const c = Math.floor(200 + Math.random() * 55); // 200-255
  const hex = c.toString(16).padStart(2, "0");
  return "#" + hex + hex + hex;
}
