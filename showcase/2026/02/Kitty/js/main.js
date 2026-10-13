let base;
let cube1;
let cube2;
let cube3;
let cube4;
let cube5;
let cube6;
let cube7;
let cube8;
let cube9;

let cylinder1;
let cylinder2;
let cylinder3;
let cylinder4;
let cylinder5;
let cylinder6;
let cylinder7;
let cylinder8;
let cylinder9;
let cylinder10;
let cylinder11;
let cylinder12;
let cylinder13;
let cylinder14;
let cylinder15;
let cylinder16;
let cylinder17;
let cylinder18;

let group1;
let group2;
let group3;

function setupThree() {
  scene.background = new THREE.Color("white");

  base = getBox();
  base.scale.set(360, 120, 360);
  base.position.y = -400;
  base.rotation.y = Math.PI/4;
  scene.add(base);

  cylinder1 = getCylinder();
  cylinder1.scale.set(150, 10, 180);
  cylinder1.position.y = -300;
  cylinder1.rotation.z = -Math.PI/2;
  cylinder1.rotation.y = Math.PI/4;
  scene.add(cylinder1);

  cylinder2 = getCylinder();
  cylinder2.scale.set(180, 10, 150);
  cylinder2.position.y = -300;
  cylinder2.rotation.x = Math.PI/2;
  cylinder2.rotation.z = -Math.PI/4;
  scene.add(cylinder2);

  cylinder3 = getCylinder();
  cylinder3.scale.set(120, 10, 120);
  cylinder3.position.y = -50;
  cylinder3.rotation.x = Math.PI/2;
  cylinder3.rotation.y = Math.PI/2;
  scene.add(cylinder3);

  cylinder4 = getCylinder();
  cylinder4.scale.set(50, 10, 50);
  cylinder4.position.x = 15;
  cylinder4.position.y = -15;
  cylinder4.position.z = 100;
  cylinder4.rotation.x = Math.PI * -50 / 180;
  scene.add(cylinder4);

  cylinder5 = getCylinder();
  cylinder5.scale.set(100, 10, 100);
  cylinder5.position.x = -150;
  cylinder5.position.y = -30;
  cylinder5.rotation.z = Math.PI * -40 / 180;
  cylinder5.rotation.x = Math.PI * 20 / 180;
  scene.add(cylinder5);

  cylinder6 = getCylinder();
  cylinder6.scale.set(110, 10, 110);
  cylinder6.position.x = 100;
  cylinder6.position.y = 30;
  cylinder6.rotation.z = Math.PI * 60 / 180;
  scene.add(cylinder6);

  cylinder7 = getCylinder();
  cylinder7.scale.set(110, 10, 110);
  cylinder7.position.x = -70;
  cylinder7.position.y = 40;
  cylinder7.position.z = -15;
  cylinder7.rotation.x = Math.PI * 70 / 180;
  cylinder7.rotation.y = Math.PI * 50 / 180;
  cylinder7.rotation.z = Math.PI * 90 / 180;
  scene.add(cylinder7);

  cylinder8 = getCylinder();
  cylinder8.scale.set(60, 10, 100);
  cylinder8.position.x = -120;
  cylinder8.position.y = 150;
  cylinder8.position.z = -40;
  cylinder8.rotation.x = Math.PI * 100 / 180;
  cylinder8.rotation.y = Math.PI * -20 / 180;
  
  scene.add(cylinder8);

  cylinder9 = getCylinder();
  cylinder9.scale.set(100, 10, 80);
  cylinder9.position.x = 55;
  cylinder9.position.y = 120;
  cylinder9.position.z = -150;
  cylinder9.rotation.z = Math.PI * 45 / 180;
  cylinder9.rotation.x = Math.PI * 60 / 180;
  scene.add(cylinder9);

  cylinder10 = getCylinder();
  cylinder10.scale.set(125, 10, 125);
  cylinder10.position.x = 100;
  cylinder10.position.y = 200;
  cylinder10.position.z = -80;
  cylinder10.rotation.z = Math.PI * 30 / 180;
  scene.add(cylinder10);

  cylinder11 = getCylinder();
  cylinder11.scale.set(100, 10, 100);
  cylinder11.position.x = 30;
  cylinder11.position.y = 195;
  cylinder11.position.z = 15;
  cylinder11.rotation.x = Math.PI * 25 / 180;
  cylinder11.rotation.y = Math.PI * 20 / 180;
  cylinder11.rotation.z = Math.PI * -60 / 180;
  scene.add(cylinder11);

  cylinder12 = getCylinder();
  cylinder12.scale.set(125, 10, 125);
  cylinder12.position.x = 150;
  cylinder12.position.y = 180;
  cylinder12.position.z = -30;
  cylinder12.rotation.x = Math.PI * 25 / 180;
  scene.add(cylinder12);

  cylinder13 = getCylinder();
  cylinder13.scale.set(95, 10, 95);
  cylinder13.position.x = 15;
  cylinder13.position.y = 310;
  cylinder13.position.z = -90;
  cylinder13.rotation.x = Math.PI * -15 / 180;
  cylinder13.rotation.y = Math.PI * 15 / 180;
  cylinder13.rotation.z = Math.PI * 10 / 180;
  scene.add(cylinder13);

  cylinder14 = getCylinder();
  cylinder14.scale.set(95, 10, 60);
  cylinder14.position.x = 200;
  cylinder14.position.y = 320;
  cylinder14.position.z = 20;
  cylinder14.rotation.y = Math.PI * -45 / 180;
  cylinder14.rotation.z = Math.PI * 45 / 180;
  scene.add(cylinder14);

  cylinder15 = getCylinder();
  cylinder15.scale.set(125, 10, 125);
  cylinder15.position.x = 120;
  cylinder15.position.y = 400;
  cylinder15.position.z = -40;
  cylinder15.rotation.z = Math.PI * -30 / 180;
  scene.add(cylinder15);

  cylinder16 = getCylinder();
  cylinder16.scale.set(90, 10, 70);
  cylinder16.position.x = -30;
  cylinder16.position.y = 380;
  cylinder16.position.z = 30;
  cylinder16.rotation.x = Math.PI * -35 / 180;
  cylinder16.rotation.y = Math.PI * -35 / 180;
  cylinder16.rotation.z = Math.PI * -10 / 180;
  scene.add(cylinder16);

  cylinder17 = getCylinder();
  cylinder17.scale.set(75, 10, 59);
  cylinder17.position.x = 215;
  cylinder17.position.y = 445;
  cylinder17.position.z = 55;
  cylinder17.rotation.x = Math.PI * 75 / 180;
  cylinder17.rotation.y = Math.PI * -45 / 180;
  cylinder17.rotation.z = Math.PI * -15 / 180;
  scene.add(cylinder17);

  cylinder18 = getCylinder();
  cylinder18.scale.set(75, 10, 40);
  cylinder18.position.x = 200;
  cylinder18.position.y = 550;
  cylinder18.position.z = 90;
  cylinder18.rotation.x = Math.PI * 20 / 180;
  cylinder18.rotation.y = Math.PI * -45 / 180;
  cylinder18.rotation.z = Math.PI * -40 / 180;
  scene.add(cylinder18);

  cube1 = getBox();
  cube1.scale.set(36, 36, 36);
  cube1.position.x = -51.5;
  cube1.position.y = 29;
  cube1.position.z = -143;
  cube1.rotation.y = Math.PI * 75 / 180;
  cube1.rotation.z = Math.PI * -45 / 180;
  scene.add(cube1);

  cube2 = getBox();
  cube2.scale.set(40, 40, 40);
  cube2.position.x = -110;
  cube2.position.y = 40;
  cube2.position.z = 50;
  cube2.rotation.y = Math.PI * 50 / 180;
  scene.add(cube2);

  cube3 = getBox();
  cube3.scale.set(45, 45, 45);
  cube3.position.x = 20;
  cube3.position.y = 120;
  cube3.position.z = 60;
  cube3.rotation.x = Math.PI * 40 / 180;
  scene.add(cube3);

  cube4 = getBox();
  cube4.scale.set(36, 36, 36);
  cube4.position.x = 175;
  cube4.position.y = 140;
  cube4.position.z = -20;
  cube4.rotation.x = Math.PI * -80 / 180;
  cube4.rotation.y = Math.PI * 60 / 180;
  scene.add(cube4);

  cube5 = getBox();
  cube5.scale.set(45, 45, 45);
  cube5.position.x = 100;
  cube5.position.y = 270;
  cube5.position.z = -165;
  cube5.rotation.y = Math.PI * 50 / 180;
  cube5.rotation.z = Math.PI * -80 / 180;
  scene.add(cube5);

  cube6 = getBox();
  cube6.scale.set(40, 40, 40);
  cube6.position.x = -60;
  cube6.position.y = 280;
  cube6.position.z = 30;
  cube6.rotation.x = Math.PI * 50 / 180;
  cube6.rotation.z = Math.PI * -80 / 180;
  scene.add(cube6);

  cube7 = getBox();
  cube7.scale.set(30, 30, 30);
  cube7.position.y = 480;
  cube7.position.z = 30;
  cube7.rotation.x = Math.PI * -60 / 180;
  cube7.rotation.y = Math.PI * -30 / 180;
  scene.add(cube7);

  cube8 = getBox();
  cube8.scale.set(30, 30, 30);
  cube8.position.x = 275;
  cube8.position.y = 535;
  cube8.rotation.x = Math.PI * 80 / 180;
  cube8.rotation.z = Math.PI * -80 / 180;
  scene.add(cube8);

  group1 = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    let sphere = getSphere();
    let angle = i * Math.PI / 6;
    sphere.scale.set(12, 12, 12);
    sphere.position.x = Math.cos(angle) * 270;
    sphere.position.z = Math.sin(angle) * 270;
    group1.add(sphere);
  } 
  group1.position.y = -50;
  scene.add(group1);

  group2 = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    let sphere = getSphere();
    let angle = i * Math.PI / 4;
    sphere.scale.set(12, 12, 12);
    sphere.position.x = Math.cos(angle) * 200;
    sphere.position.z = Math.sin(angle) * 200;
    group2.add(sphere);
  } 
  group2.position.y = 320;
  group2.position.x = 80;
  scene.add(group2);

  group3 = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    let sphere = getSphere();
    let angle = i * Math.PI / 3;
    sphere.scale.set(12, 12, 12);
    sphere.position.x = Math.cos(angle) * 80;
    sphere.position.z = Math.sin(angle) * 80;
    group3.add(sphere);
  } 
  group3.position.y = 500;
  group3.position.x = 220;
  group3.position.z = 100;
  scene.add(group3);
}

function updateThree() {
  group1.rotation.y += 0.01; 
  group2.rotation.y -= 0.01;
  group3.rotation.y += 0.01;
}

function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial( {
    color: (0x66cccc),
  } );
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial( {
    color: (0xA5EB00),
  } );
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getCylinder() {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 32);
  const material = new THREE.MeshBasicMaterial( {
    color: (0xff0000),
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  } );
  const mesh = new THREE.Mesh( geometry, material );
  return mesh;
}