let params = { 
  fps: 0, 
  number: 7, 
  segments: 6, 
  radius: 200, 
  rotationSpeed: 0.005 
}; 
 
let units = []; 

let previousNumber = -1; 
let previousSegments = -1; 
 
function setupThree() { 
  scene.background = new THREE.Color(0xffffff); 
  pane.addBinding(params, "number", {min: 1, max: 20, step: 1}); 
  pane.addBinding(params, "segments", {min: 1, max: 12, step: 1}); 
  pane.addBinding(params, "radius", {min: 100, max: 1000, step: 10}); 
  pane.addBinding(params, "rotationSpeed", {min: 0, max: 0.05, step: 0.001}); 
} 
 
function updateThree() { 
  if (params.number !== previousNumber || params.segments !== previousSegments ) { 
    for (let i = units.length - 1; i >= 0; i--) { 
      scene.remove(units[i].mesh); 
    } 
    units = []; 
    for (let segment = 0; segment < params.segments; segment++) { 
      for (let i = 0; i < params.number; i++) { 
        const unit = new Unit(); 
        unit.segmentIndex = segment; 
        unit.unitIndex = i; 
        units.push(unit); 
      } 
    } 
    previousNumber = params.number; 
    previousSegments = params.segments; 
  } 
 
  for (let i = 0; i < units.length; i++) { 
    const unit = units[i]; 
    unit.setPosition(); 
    unit.rotate(); 
    unit.update(); 
  } 
} 
 
function getBox() { 
  const geometry = new THREE.BoxGeometry(1, 1, 1); 
  const material = new THREE.MeshBasicMaterial(); 
  const mesh = new THREE.Mesh(geometry, material); 
  return mesh; 
} 
 
function getSphere() { 
  const geometry = new THREE.SphereGeometry(1, 32, 16); 
  const material = new THREE.MeshBasicMaterial(); 
  const mesh = new THREE.Mesh(geometry, material); 
  return mesh; 
} 
 
function getCylinder() { 
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 32); 
  const material = new THREE.MeshBasicMaterial(); 
  const mesh = new THREE.Mesh( geometry, material ); 
  return mesh; 
} 
 
function getTriangularPrism() { 
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 3); 
  const material = new THREE.MeshBasicMaterial(); 
  const mesh = new THREE.Mesh( geometry, material ); 
  return mesh; 
} 
 
function getUnit() { 
  const group = new THREE.Group(); 
  const bottomColor = new THREE.Color("#e13884"); 
  const topColor = new THREE.Color("#b8eaff"); 
  const totalHeight = 650; 
 
  const material = 
    new THREE.MeshBasicMaterial({ 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.6, 
      side: THREE.DoubleSide, 
    }); 
 
  const bottomSphere = getSphere(); 
  bottomSphere.material = material; 
  bottomSphere.scale.set(30, 30, 30); 
  group.add(bottomSphere); 
 
  const square1 = getBox(); 
  square1.material = material; 
  square1.geometry.rotateZ(Math.PI / 4); 
  square1.scale.set(100, 130, 10); 
  square1.position.y = 120; 
  group.add(square1); 
 
  const square2 = getBox(); 
  square2.material = material; 
  square2.geometry.rotateZ(Math.PI / 4); 
  square2.scale.set(100, 130, 10); 
  square2.position.y = 120; 
  square2.rotation.y = Math.PI / 3; 
  group.add(square2); 
 
  const square3 = getBox(); 
  square3.material = material; 
  square3.geometry.rotateZ(Math.PI / 4); 
  square3.scale.set(100, 130, 10); 
  square3.position.y = 120; 
  square3.rotation.y = Math.PI * 2 / 3; 
  group.add(square3); 
 
  const circle1 = getCylinder(); 
  circle1.material = material; 
  circle1.geometry.rotateX(Math.PI / 2); 
  circle1.scale.set(80, 80, 8); 
  circle1.position.y = 260; 
  circle1.rotation.y = Math.PI / 6; 
  group.add(circle1); 
 
  const circle2 = getCylinder(); 
  circle2.material = material; 
  circle2.geometry.rotateX(Math.PI / 2); 
  circle2.scale.set(80, 80, 8); 
  circle2.position.y = 260; 
  circle2.rotation.y = Math.PI / 2; 
  group.add(circle2); 
 
  const circle3 = getCylinder(); 
  circle3.material = material; 
  circle3.geometry.rotateX(Math.PI / 2); 
  circle3.scale.set(80, 80, 8); 
  circle3.position.y = 260; 
  circle3.rotation.y = Math.PI * 5 / 6; 
  group.add(circle3); 
 
  const triangle1 = getTriangularPrism(); 
  triangle1.material = material; 
  triangle1.geometry.rotateX(Math.PI * 1.5); 
  triangle1.scale.set(90, 245, 10); 
  triangle1.position.y = 400; 
  triangle1.rotation.y = 0; 
  group.add(triangle1); 
 
  const triangle2 = getTriangularPrism(); 
  triangle2.material = material; 
  triangle2.geometry.rotateX(Math.PI * 1.5); 
  triangle2.scale.set(90, 245, 10); 
  triangle2.position.y = 400; 
  triangle2.rotation.y = Math.PI / 3; 
  group.add(triangle2); 
 
  const triangle3 = getTriangularPrism(); 
  triangle3.material = material; 
  triangle3.geometry.rotateX(Math.PI * 1.5); 
  triangle3.scale.set(90, 245, 10); 
  triangle3.position.y = 400; 
  triangle3.rotation.y = Math.PI * 2 / 3; 
  group.add(triangle3); 
 
  const topSphere = getSphere(); 
  topSphere.material = material; 
  topSphere.scale.set(20, 20, 20); 
  topSphere.position.y = 640; 
  group.add(topSphere); 

  /***/
  group.updateMatrixWorld(true); 
  group.traverse(function(mesh) { 
    if (mesh.isMesh) { 
      const positions = mesh.geometry.attributes.position; 
      const colors = new THREE.Float32BufferAttribute( new Float32Array( positions.count * 3 ), 3 ); 
      const vertex = new THREE.Vector3(); 
      const tempColor = new THREE.Color(); 
      for ( let i = 0; i < positions.count; i++ ) { 
        vertex.set(positions.getX(i), positions.getY(i), positions.getZ(i) 
        ); 
        vertex.applyMatrix4(mesh.matrixWorld); 
        const percentage = THREE.MathUtils.clamp(vertex.y / totalHeight, 0, 1 ); 
        tempColor.copy(bottomColor) .lerp(topColor, percentage); 
        colors.setXYZ( i, tempColor.r, tempColor.g, tempColor.b ); 
      } 
      mesh.geometry.setAttribute("color", colors); 
    } 
  }); 
  /***/

  return group; 
} 
 
class Unit {
  constructor() {
    this.mesh = getUnit();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.direction = new THREE.Vector3();
    this.spin = 0;
  }
  setPosition() {
    let percentage;
    if (params.number === 1) {
      percentage = 0.5;
    } else {
      percentage = this.unitIndex / (params.number - 1);}
    const arcAngle = percentage * Math.PI; 
    const segmentAngle = (this.segmentIndex / params.segments) * Math.PI * 2; 
    const circleRadius = Math.sin(arcAngle) * params.radius; 
    const x = Math.cos(segmentAngle) * circleRadius; 
    const y = Math.sin(segmentAngle) * circleRadius; 
    const z = Math.cos(arcAngle) * params.radius; 
    this.pos.set(x, y, z); 
    this.setDirection(x, y, z); 
  }
  setDirection(x, y, z) {
    this.direction.set(x, y, z).normalize();
  }
  rotate() {
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.direction);
    this.spin += params.rotationSpeed
    this.mesh.rotateY(this.spin);
  }
  update() {
    const wave = (Math.sin(this.pos.x * 0.01 - time * 0.0015) + Math.sin(this.pos.y * 0.01 - time * 0.0015) + Math.cos(this.pos.z * 0.01 - time * 0.0015)) / 3;
    this.mesh.scale.y = 1 + wave * 0.25
  }
}