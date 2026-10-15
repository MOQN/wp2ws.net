const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 10000;


let particles = [];
let pointCloud;


function setupThree() {
 for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
   let p = new Particle();
   p.pos.x = random(-WORLD_HALF, WORLD_HALF);
   p.pos.y = random(-WORLD_HALF, WORLD_HALF);
   p.pos.z = random(-WORLD_HALF, WORLD_HALF);
   particles.push(p);
 }


 pointCloud = getPoints();
 scene.add(pointCloud);
}


function updateThree() {
 // generate particles
 if (particles.length < MAX_PARTICLE_NUMBER) {
   let p = new Particle();
   p.pos.x = random(-WORLD_HALF, WORLD_HALF);
   p.pos.y = random(-WORLD_HALF, WORLD_HALF);
   p.pos.z = random(-WORLD_HALF, WORLD_HALF);
   particles.push(p);
 }


 // update particles
 for (let i = 0; i < particles.length; i++) {
   let p = particles[i];
   p.flow();
   p.updatePosition();
   p.updateLifespan();


   // remove particles if it's done


   if (p.isDone) {
     particles.splice(i, 1);
     i--;
   }
 }
 // learn about arrry method: filter();




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
 pointCloud.geometry.setDrawRange(0, params.particleNumber);
 pointCloud.geometry.attributes.position.needsUpdate = true;
 pointCloud.geometry.attributes.color.needsUpdate = true;
}


function getPoints() {
 const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
 const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);


 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
 geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));


 const texture = new THREE.TextureLoader().load("assets/particle_texture.jpg");


 const material = new THREE.PointsMaterial({
   color: 0xFFFFFF,
   vertexColors: true,
   size: 5,
   map: texture,
   depthTest: false,
   blending: THREE.AdditiveBlending,
 });


 const points = new THREE.Points(geometry, material);


 return points;
}
