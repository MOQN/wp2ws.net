const axesHelper = new THREE.AxesHelper(1000)

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
// const MAX_PARTICLE_NUMBER = 1000;
// let MAX_PARTICLE_NUMBER = params.maxNumber;
let MAX_PARTICLE_NUMBER = 2000 + params.Intensity * 100;
let MAX_INPARTICLE_NUMBER = 600 - params.Intensity * 30;
// let SPIN_SPEED = params.spinSpeed;
let WALL_THICKNESS = 200 + params.Intensity * 20;

let particles = [];
let inParticles = [];
let pointCloud;
let inPointCloud;

let STAR_MAX_SCALE = 300 + params.Intensity * 50;

let stars = [];
let starScale = 0.01;
let starPointClouds = [];
let starTexture;


let groundMirror, ceilingMirror;
let RESOLUTION_SCALE = 0.95 - params.Intensity * 0.07;


function setupThree() {
  // scene.add(axesHelper);
  scene.background = new THREE.Color('#011128');
  // scene.background = new THREE.Color('#030972');
  // scene.background = new THREE.Color('#0b19fc');

  // Error: THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.
  /*
  // for (let i = 0; i < MAX_PARTICLE_NUMBER * 9 / 10; i++) {
  if (particles.length < MAX_PARTICLE_NUMBER) {
    let p = new Particle(frame, 0);
    let xRan = random(0, 1);
    // let yRan = random(0, 1);
    let zRan = random(0, 1);

    if (xRan < 0.5) {
      p.pos.x = random(-WORLD_HALF, -WORLD_HALF + 150);
    } else {
      p.pos.x = random(WORLD_HALF - 150, WORLD_HALF);
    }

    p.pos.y = random(-WORLD_SIZE * 3 / 4, WORLD_SIZE * 3 / 4);

    if (zRan < 0.5) {
      p.pos.z = random(-WORLD_HALF, -WORLD_HALF + 150);
    } else {
      p.pos.z = random(WORLD_HALF - 150, WORLD_HALF);
    }

    let xzDis = (p.pos.x ** 2 + p.pos.z ** 2) ** 0.5
    p.xzDis = xzDis;
    particles.push(p);
  }
  // }
  for (let i = 0; i < MAX_INPARTICLE_NUMBER * 9 / 10; i++) {
    let p = new InParticle(frame);
    p.pos.x = random(-WORLD_HALF, WORLD_HALF);
    p.pos.y = random(-WORLD_SIZE * 3 / 4, WORLD_SIZE * 3 / 4);
    p.pos.z = random(-WORLD_HALF, WORLD_HALF);
    inParticles.push(p);
  }
  */

  ///// MIRROR /////
  groundMirror = getCircleMirror();
  scene.add(groundMirror);
  groundMirror.position.y = -WORLD_SIZE * 3 / 4 + 300;
  groundMirror.rotateX(-Math.PI / 2);
  groundMirror.scale.set(3, 3)

  ceilingMirror = getCircleMirror();
  scene.add(ceilingMirror);
  ceilingMirror.position.y = WORLD_SIZE * 3 / 4 - 300;
  ceilingMirror.rotateX(Math.PI / 2);
  ceilingMirror.scale.set(3, 3)



  ///// PARTICLES /////

  // for (let i = 0; i < 1; i++) {
  let star = new Star();
  star.pos.x = 0;
  star.pos.y = 0;
  star.pos.z = 0;
  stars.push(star);
  // star.geometry.scale.needsUpdate = true;
  // }

  pointCloud = getPoints();
  scene.add(pointCloud);
  inPointCloud = getInPoints();
  scene.add(inPointCloud);
  let starPointCloud = getStarPoints(starScale, STAR_MAX_SCALE); // 此处在setup里加入parameter，update里无法更新
  starPointClouds.push(starPointCloud);
  scene.add(starPointCloud);
}


function updateThree() {

  // starPointCloud = getStarPoints(starScale, STAR_MAX_SCALE); // 此处在setup里加入parameter，update里无法更新
  // scene.add(starPointCloud);

  RESOLUTION_SCALE = 0.95 - params.Intensity * 0.07;
  updateReflectionSize();

  ///// PARTICLES /////
  // generate particles
  if (particles.length < MAX_PARTICLE_NUMBER) {
    let p = new Particle(frame, 0);
    let xRan = random(0, 1);
    // let yRan = random(0, 1);
    let zRan = random(0, 1);

    if (xRan < 0.5) {
      p.pos.x = random(-WORLD_HALF - WALL_THICKNESS, -WORLD_HALF + WALL_THICKNESS);
    } else {
      p.pos.x = random(WORLD_HALF - WALL_THICKNESS, WORLD_HALF + WALL_THICKNESS);
    }

    p.pos.y = random(-WORLD_SIZE * 3 / 4, WORLD_SIZE * 3 / 4);

    if (zRan < 0.5) {
      p.pos.z = random(-WORLD_HALF - WALL_THICKNESS, -WORLD_HALF + WALL_THICKNESS);
    } else {
      p.pos.z = random(WORLD_HALF - WALL_THICKNESS, WORLD_HALF + WALL_THICKNESS);
    }

    let xzDis = (p.pos.x ** 2 + p.pos.z ** 2) ** 0.5
    p.xzDis = xzDis
    particles.push(p);
  }
  if (inParticles.length < MAX_INPARTICLE_NUMBER) {
    let p = new InParticle(frame, 0);
    let xRan = random(0, 1);
    let zRan = random(0, 1);

    if (xRan < 0.5) {
      p.pos.x = random(-WORLD_HALF, -WORLD_HALF + 100) / 1.2;
    } else {
      p.pos.x = random(WORLD_HALF - 100, WORLD_HALF) / 1.2;
    }

    p.pos.y = random(-WORLD_SIZE / 1.8, WORLD_SIZE / 1.8) / 1.2;

    if (zRan < 0.5) {
      p.pos.z = random(-WORLD_HALF, -WORLD_HALF + 100) / 1.2;
    } else {
      p.pos.z = random(WORLD_HALF - 100, WORLD_HALF) / 1.2;
    }

    let xzDis = (p.pos.x ** 2 + p.pos.z ** 2) ** 0.5
    p.xzDis = xzDis
    inParticles.push(p);
  }
  if (stars.length < 1) {
    let star = new Star();
    star.pos.x = 0;
    star.pos.y = 0;
    star.pos.z = 0;
    stars.push(star);
  }


  // update particles

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];

    let xzDis = p.xzDis;
    push();
    p.setPosition(0, p.pos.y, 0);
    p.setVelocity(sin((frame + p.frame) / (50 - params.Intensity * 2.5)) * xzDis, 0, cos((frame + p.frame) / (50 - params.Intensity * 2.5)) * xzDis);
    pop();

    p.updatePosition();
    p.updateLifespan();

  }

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    if (p.isDone) {
      scene.remove(p);
      if (p.geometry) {
        p.geometry.dispose();
      }
      if (p.material) {
        p.material.dispose();
      }
      particles.splice(i, 1);
    }
  }

  for (let i = 0; i < inParticles.length; i++) {
    let p = inParticles[i];

    let xzDis = p.xzDis * sin((abs(p.pos.y) - WORLD_SIZE / 1.2) / (WORLD_SIZE / 1.2)) ** 6 * 1.2;

    push();
    p.setPosition(0, p.pos.y, 0);
    p.setVelocity(sin((frame + p.frame) / (30 + params.Intensity * 2)) * xzDis, 0, cos((frame + p.frame) / (30 + params.Intensity * 2)) * xzDis);
    pop();

    p.updatePosition();
    p.updateLifespan();

  }

  for (let i = inParticles.length - 1; i >= 0; i--) {
    let p = inParticles[i];

    if (p.isDone) {
      scene.remove(p);
      if (p.geometry) {
        p.geometry.dispose();
      }
      if (p.material) {
        p.material.dispose();
      }
      inParticles.splice(i, 1);
    }
  }



  starScale = abs(sin(frame / (100 - params.Intensity * 7.2)));
  STAR_MAX_SCALE = 300 + params.Intensity * 50;

  if (stars.length > 0) {

    let starPointCloud = getStarPoints(starScale, STAR_MAX_SCALE);
    starPointClouds.push(starPointCloud)
    scene.add(starPointCloud);

    let star = new Star();
    stars.push(star);
    star.pos.x = 0;
    star.pos.y = 0;
    star.pos.z = 0;

    if (stars.length > 1) {
      stars.splice(0, 1);
    }

    if (starPointClouds.length > 2) {
      scene.remove(starPointClouds[0]);
      if (starPointClouds[0].geometry) {
        starPointClouds[0].geometry.dispose();
      }
      if (starPointClouds[0].material) {
        starPointClouds[0].material.dispose();
      }
      starPointClouds.splice(0, 1);
    }
  }




  // update point cloud
  let positionArray = pointCloud.geometry.attributes.position.array;
  let colorArray = pointCloud.geometry.attributes.color.array;
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    let ptIndex = i * 3;


    positionArray[ptIndex + 0] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;


    colorArray[ptIndex + 0] = 1.5 * p.lifespan; // R
    colorArray[ptIndex + 1] = 0.6 * p.lifespan; // G
    colorArray[ptIndex + 2] = 0.2 * p.lifespan; // B
  }
  //pointCloud.geometry.drawRange.count = params.particleNumber;
  pointCloud.geometry.setDrawRange(0, MAX_PARTICLE_NUMBER);
  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;

  let inPositionArray = inPointCloud.geometry.attributes.position.array;
  let inColorArray = inPointCloud.geometry.attributes.color.array;
  for (let i = 0; i < inParticles.length; i++) {
    let p = inParticles[i];
    let ptIndex = i * 3;


    inPositionArray[ptIndex + 0] = p.pos.x;
    inPositionArray[ptIndex + 1] = p.pos.y;
    inPositionArray[ptIndex + 2] = p.pos.z;


    inColorArray[ptIndex + 0] = 1.5 * p.lifespan; // R
    inColorArray[ptIndex + 1] = 0.6 * p.lifespan; // G
    inColorArray[ptIndex + 2] = 0.2 * p.lifespan; // B
  }
  //inPointCloud.geometry.drawRange.count = params.particleNumber;
  inPointCloud.geometry.setDrawRange(0, MAX_INPARTICLE_NUMBER);
  inPointCloud.geometry.attributes.position.needsUpdate = true;
  inPointCloud.geometry.attributes.color.needsUpdate = true;


  for (let j = 0; j < starPointClouds.length; j++) {
    for (let i = 0; i < stars.length; i++) {
      let p = stars[i];
      let ptIndex = i * 3;


      let starPositionArray = starPointClouds[j].geometry.attributes.position.array;
      let starColorArray = starPointClouds[j].geometry.attributes.color.array;
      starPositionArray[ptIndex + 0] = p.pos.x;
      starPositionArray[ptIndex + 1] = p.pos.y;
      starPositionArray[ptIndex + 2] = p.pos.z;


      starColorArray[ptIndex + 0] = 1.5 * p.lifespan; // R
      starColorArray[ptIndex + 1] = 0.6 * p.lifespan; // G
      starColorArray[ptIndex + 2] = 0.2 * p.lifespan; // B
    }
    //starPointClouds[j].geometry.drawRange.count = params.particleNumber;
    starPointClouds[j].geometry.setDrawRange(0, 5);
    starPointClouds[j].geometry.attributes.position.needsUpdate = true;
    starPointClouds[j].geometry.attributes.color.needsUpdate = true;
    starPointClouds[j].material.size.needsUpdate = true;
  }

}


function getStarPoints(starScale, maxScale) {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);


  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));


  if (!starTexture) {
    starTexture = new THREE.TextureLoader().load("assets/particle_texture.PNG");
  }


  const material = new THREE.PointsMaterial({
    color: "#5afcff",
    vertexColors: true,
    size: starScale * maxScale,
    map: starTexture,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });


  const points = new THREE.Points(geometry, material);


  return points;
}

function updateReflectionSize() {
  // we use ceil() here to ensure the render target size is an integer and greater than zero!
  const width = ceil(window.innerWidth * RESOLUTION_SCALE);
  const height = ceil(window.innerHeight * RESOLUTION_SCALE);
  groundMirror.getRenderTarget().setSize(width, height);
  ceilingMirror.getRenderTarget().setSize(width, height);
  params.reflectionSize = `${width} x ${height}`;
}




function getInPoints() {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);


  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));


  // const texture = new THREE.TextureLoader().load("assets/particle_texture_2.PNG");


  const material = new THREE.PointsMaterial({
    color: "#5495d6",
    vertexColors: true,
    opacity: 0.6,
    size: 12,
    // map: texture,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });


  const points = new THREE.Points(geometry, material);


  return points;
}

function getPoints() {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);


  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));


  const texture = new THREE.TextureLoader().load("assets/particle_texture_2.PNG");


  const material = new THREE.PointsMaterial({
    // color: "#bf3636",
    // color: "#ff0000",
    color: "#631722",
    vertexColors: true,
    size: 30,
    map: texture,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });


  const points = new THREE.Points(geometry, material);


  return points;
}

// code from https://github.com/MOQN/IMA-Web-Page-To-Web-Space/blob/main/06_adding_realism/19_Reflector_resolution/js/main.js
function getCircleMirror() {
  let geometry = new THREE.CircleGeometry(400, 640);

  // Import Reflector from the Three.js addons before using it.
  // See index.html for the import setup!
  let reflector = new Reflector(geometry, {
    clipBias: 0.003,
    textureWidth: 1,
    textureHeight: 1,
    color: 0x777777
  });

  return reflector;
}