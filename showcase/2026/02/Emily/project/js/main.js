let cubes1 = [];
let cubes2 = [];
let cubes3 = [];
let cubes4 = [];
let cubes5 = [];
let cubes6 = [];
let cubes7 = [];



function setupThree() {
  // Light Setting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xff0000, 5);
  directionalLight.position.set(-800, 100, 500);
  scene.add(directionalLight);

  // Add cubes
  const count = 20;
  const startY = 475; 
  const distY = 50;

  for (let i = 0; i < count; i++) {
    const currentY = startY - i * distY;

    const cube1 = getBox();
    cube1.position.set(-400, currentY, 20);
    cube1.scale.set(100, 25, 40); 
    cube1.rotation.x = i * 0.1;               
    cube1.rotation.y = i * 0.1;
    scene.add(cube1);
    cubes1.push(cube1);

    const cube2 = getBox();
    cube2.position.set(-280, currentY, -20);
    cube2.scale.set(100, 30, 40);
    cube2.rotation.x = i * 0.15;                                
    cube2.rotation.y = i * 0.15;
    scene.add(cube2);
    cubes2.push(cube2);   
   
    const cube3 = getBox();
    cube3.position.set(-140, currentY, 20);
    cube3.scale.set(120, 35, 50);                 
    cube3.rotation.x = i * 0.2;
    cube3.rotation.y = i * 0.2;
    scene.add(cube3);
    cubes3.push(cube3);   
   
    const cube4 = getBox();
    cube4.position.set(0, currentY, -20);
    cube4.scale.set(110, 40, 40);                 
    cube4.rotation.x = i * 0.25;
    cube4.rotation.y = i * 0.25;
    scene.add(cube4);
    cubes4.push(cube4);   
   
    const cube5 = getBox();
    cube5.position.set(140, currentY, 20);
    cube5.scale.set(120, 35, 60);                 
    cube5.rotation.x = i * -0.2;
    cube5.rotation.y = i * -0.2;
    scene.add(cube5);
    cubes5.push(cube5);   
   
    const cube6 = getBox();
    cube6.position.set(280, currentY, -20);
    cube6.scale.set(100, 30, 50);                 
    cube6.rotation.x = i * -0.15;
    cube6.rotation.y = i * -0.15;
    scene.add(cube6);
    cubes6.push(cube6); 
   
    const cube7 = getBox();
    cube7.position.set(400, currentY, 20);
    cube7.scale.set(100, 25, 50);                 
    cube7.rotation.x = i * -0.1;
    cube7.rotation.y = i * -0.1;
    scene.add(cube7);
    cubes7.push(cube7);
  }
}

function updateThree() {
  for (const cube of cubes1) {
    cube.rotation.y += 0.01;
  } 
  for (const cube of cubes2) {
    cube.rotation.y += 0.015;
  } 
  for (const cube of cubes3) {
    cube.rotation.y += 0.015;
  } 
  for (const cube of cubes4) {
    cube.rotation.y += 0.02;
  } 
  for (const cube of cubes5) {
    cube.rotation.y += 0.015;
  } 
  for (const cube of cubes6) {
    cube.rotation.y += 0.015;
  } 
  for (const cube of cubes7) {
    cube.rotation.y += 0.01;
  }
}

function getBox() {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.2,
  metalness: 0.1,
  transparent: true,
  opacity: 0.8
});
  const mesh = new THREE.Mesh(boxGeometry, whiteMaterial);
  return mesh;
}