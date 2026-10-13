let controls;


function setupThree() {
  controls = new OrbitControls(camera, renderer.domElement);


  const geometry = new THREE.BoxGeometry(100, 100, 100);


  material = new THREE.MeshBasicMaterial({ color: 0xFFCC80 });
  //head
  const head = new THREE.Mesh(geometry, material);
  head.scale.y = 1.5;
  head.scale.z = 1.5;
  head.scale.x = 1.5;
  scene.add(head);

  //body
  const body = new THREE.Mesh(geometry, material);
  body.scale.y = 0.75;
  body.position.y = -115;
  scene.add(body);

  //tail
  const tail = new THREE.Mesh(geometry, material);
  tail.scale.y = 0.5;
  tail.scale.z = 1.5;
  tail.scale.x = 0.5;
  tail.position.y = -105;
  tail.position.z = -105;
  tail.rotation.x = -0.75;
  scene.add(tail);

  /*
 //legs
     const leg1 = new THREE.Mesh(geometry, material);
     leg1.scale.y = 0.5;
     leg1.scale.z = 0.5;
     leg1.scale.x = 0.5;
     leg1.position.y = -150;
     leg1.position.x = -50;
     scene.add(leg1);
     
     const leg2 = new THREE.Mesh(geometry, material);
     leg2.scale.y = 0.5;
     leg2.scale.z = 0.5;
     leg2.scale.x = 0.5;
     leg2.position.y = -150;
     leg2.position.x = 50;
     scene.add(leg2);
 
 */
  // legs
  const legGeometry = new THREE.BoxGeometry(100, 100, 100);

  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(legGeometry, material);

    leg.scale.x = 0.3;
    leg.scale.y = 0.3;
    leg.scale.z = 0.3;

    const isRightSide = i % 2 === 1;
    const isBack = i >= 2;

    leg.position.x = isRightSide ? 40 : -40;
    leg.position.y = -167;
    leg.position.z = isBack ? 35 : -35;

    scene.add(leg);
  }
  // ears
  const earGeometry = new THREE.ConeGeometry(35, 70, 3);
  const leftEar = new THREE.Mesh(earGeometry, material);
  leftEar.position.set(-50, 100, 30);
  leftEar.rotation.y = 0.75;
  scene.add(leftEar);
  const rightEar = new THREE.Mesh(earGeometry, material);
  rightEar.position.set(50, 100, 30);
  rightEar.rotation.y = 0.75;
  scene.add(rightEar);

  // eyes
  const eyeGeometry = new THREE.SphereGeometry(15, 32, 32);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-40, 0, 75);
  scene.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(40, 0, 75);
  scene.add(rightEye);

  //nose
  const noseGeometry = new THREE.ConeGeometry(12, 18, 3);
  const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, -35, 80);
  nose.rotation.z = 180 * (Math.PI / 180);
  scene.add(nose);

  //eyeLight
  const eyeLightGeometry = new THREE.SphereGeometry(5, 16, 16);
  const eyeLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftEyeLight = new THREE.Mesh(eyeLightGeometry, eyeLightMaterial);
  leftEyeLight.position.set(-35, 5, 88);
  scene.add(leftEyeLight);
  const rightEyeLight = new THREE.Mesh(eyeLightGeometry, eyeLightMaterial);
  rightEyeLight.position.set(45, 5, 88);
  scene.add(rightEyeLight);

}





function updateThree() {
  material.color.setHSL((performance.now() * 0.00015) % 1, 0.9, 0.6);

}


