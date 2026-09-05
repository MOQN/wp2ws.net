let params = {
  color: "#FFF",
};

let cylinders = []; // Array to store multiple twisted cylinders
let mainCylinder; // Declare the main cylinder globally so it can be accessed in updateThree
let rotationSpeed = 0.01; // Initial rotation speed
let accelerating = true; // Flag to control acceleration and deceleration

function createTwistedCylinder(height = 45, twistAmount = Math.PI) {
  const radiusTop = 5; // Smaller top radius for individual twisted cylinders
  const radiusBottom = 5; // Smaller bottom radius for individual twisted cylinders
  const radialSegments = 100; // Number of segments around the cylinder

  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1, true);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false });
  const cylinder = new THREE.Mesh(geometry, material);

  // Apply twist to the cylinder by modifying vertex positions
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const y = geometry.attributes.position.getY(i);
    const angle = (y / height) * twistAmount; // Calculate twist based on height position
    const x = geometry.attributes.position.getX(i) * Math.cos(angle) - geometry.attributes.position.getZ(i) * Math.sin(angle);
    const z = geometry.attributes.position.getX(i) * Math.sin(angle) + geometry.attributes.position.getZ(i) * Math.cos(angle);
    geometry.attributes.position.setX(i, x);
    geometry.attributes.position.setZ(i, z);
  }

  geometry.attributes.position.needsUpdate = true; // Mark position attribute for update
  return cylinder;
}

function setupThree() {
  // Create the main twisted cylinder in the center of the scene
  // mainCylinder = createTwistedCylinder(400, Math.PI * 2); // Larger central cylinder
  // mainCylinder.rotation.z = Math.PI / 2; // Rotate the main cylinder to lie horizontally
  // mainCylinder.position.set(0, 0, 0); // Place the main cylinder at the origin
  // scene.add(mainCylinder);

  // Create multiple smaller twisted cylinders using a for loop
  for (let i = 0; i < 10; i++) {
    let cylinder = createTwistedCylinder(); // Create a smaller twisted cylinder
    cylinder.rotation.z = Math.PI / 2; // Rotate each smaller cylinder to lie horizontally
    cylinder.position.set(
      Math.random() * 800 - 400, // Random x position
      Math.random() * 800 - 400, // Random y position
      Math.random() * 800 - 400  // Random z position
    );
    cylinder.scale.set(
      Math.random() * 2 + 0.5, // Random x scale
      Math.random() * 2 + 0.5, // Random y scale
      Math.random() * 2 + 0.5  // Random z scale
    );
    scene.add(cylinder);
    cylinders.push(cylinder); // Add the twisted cylinder to the array

    // Set up GUI controls for each twisted cylinder's scale
    let folder = gui.addFolder(`Twisted Cylinder ${i + 1}`);
    folder.add(cylinder.scale, "x").min(0.5).max(3).step(0.1).name("Scale X");
    folder.add(cylinder.scale, "y").min(0.5).max(3).step(0.1).name("Scale Y");
    folder.add(cylinder.scale, "z").min(0.5).max(3).step(0.1).name("Scale Z");
  }

  // Global color control affecting all twisted cylinders
  gui.addColor(params, "color").name("Global Color");
}

function updateThree() {
  // Update rotation speed: accelerate first, then decelerate
  if (accelerating) {
    rotationSpeed += 0.0002; // Increase the speed gradually
    if (rotationSpeed > 0.1) accelerating = false; // Start decelerating when speed reaches 0.1
  } else {
    rotationSpeed -= 0.0002; // Decrease the speed gradually
    if (rotationSpeed < 0.01) accelerating = true; // Start accelerating again when speed is slow
  }

  // Rotate each twisted cylinder around a central axis and also rotate the main cylinder
  cylinders.forEach((cylinder) => {
    cylinder.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed); // Rotate around the Y-axis
    cylinder.rotation.x += rotationSpeed; // Spin the cylinder itself around the X-axis
    cylinder.rotation.y += rotationSpeed; // Spin the cylinder itself around the Y-axis
    cylinder.material.color.set(params.color); // Update color
  });

  // Rotate the main cylinder itself along the Y-axis
  // mainCylinder.rotation.y += rotationSpeed; // Make the main cylinder rotate with the smaller ones
}

function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
