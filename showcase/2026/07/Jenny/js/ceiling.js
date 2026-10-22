const CEILING_LAYER = 1;

class CeilingField {
  constructor(sourceMesh, room) {
    this.room = room;
    this.noise = new ImprovedNoise();
    this.geometry = sourceMesh.geometry.clone();
    this.geometry.applyMatrix4(sourceMesh.matrixWorld);
    this.geometry.computeBoundingBox();
    const size = this.geometry.boundingBox.getSize(new THREE.Vector3());
    // The wrist is at -X in this asset: turn the fingers downward.
    this.geometry.scale(2.6 / size.x, 2.6 / size.x, 2.6 / size.x);
    this.geometry.center();
    this.geometry.rotateZ(-Math.PI / 2);
    this.geometry.rotateY(Math.PI / 2);
    this.geometry.computeBoundingBox();
    this.geometry.translate(0, -this.geometry.boundingBox.max.y, 0);
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    this.material = sourceMesh.material.clone();
    this.columns = Math.ceil(room.width / 1.65);
    this.rows = Math.ceil(room.depth / 1.35);
    this.cellWidth = room.width / this.columns;
    this.cellDepth = room.depth / this.rows;
    this.mesh = new THREE.Group();
    this.mesh.layers.set(CEILING_LAYER);
    this.batches = [];
    this.poses = [];
    this.matrices = [];
    for (let row = 0; row < this.rows; row++)
      for (let col = 0; col < this.columns; col++) {
        this.poses.push({
          x: -room.width / 2 + (col + 0.5) * this.cellWidth,
          z: -room.depth / 2 + (row + 0.5) * this.cellDepth,
          yaw: ((row + col) % 2 ? 1 : -1) * 0.075,
          row,
          col,
        });
      }
    this.transform = new THREE.Object3D();
    for (const pose of this.poses) {
      this.transform.position.set(pose.x, room.ceiling + 0.65, pose.z);
      this.transform.rotation.set(0, pose.yaw, 0);
      this.transform.updateMatrix();
      this.matrices.push(this.transform.matrix.clone());
    }
    // Separate small batches let Three.js cull distant, off-screen ceiling sectors.
    for (let row = 0; row < this.rows; row += 3)
      for (let col = 0; col < this.columns; col += 3) {
        const ids = [];
        for (let r = row; r < Math.min(row + 3, this.rows); r++)
          for (let c = col; c < Math.min(col + 3, this.columns); c++)
            ids.push(r * this.columns + c);
        const batch = new THREE.InstancedMesh(
          this.geometry,
          this.material,
          ids.length,
        );
        batch.userData.handIds = ids;
        batch.layers.set(CEILING_LAYER);
        batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        batch.castShadow = false;
        batch.receiveShadow = false;
        ids.forEach((id, i) => batch.setMatrixAt(i, this.matrices[id]));
        batch.instanceMatrix.needsUpdate = true;
        batch.computeBoundingBox();
        batch.computeBoundingSphere();
        // Covers the entire slider range without rebuilding culling bounds each frame.
        batch.boundingBox.min.y -= 0.6;
        batch.boundingBox.max.y += 0.6;
        batch.boundingSphere.radius += 0.6;
        this.mesh.add(batch);
        this.batches.push(batch);
      }
    this.lights = [0x83948b, 0xc7c3af].map((color, i) => {
      const light = new THREE.SpotLight(color, 0, 34, 1.25, 0.65, 2);
      light.position.set(i === 0 ? -4 : 4, 10.5, i === 0 ? -9 : 9);
      light.target.position.set(0, 15.5, i === 0 ? -5 : 5);
      light.layers.set(CEILING_LAYER);
      light.castShadow = false;
      return light;
    });
    this.setBrightness(0.7);
  }

  // Runs in JavaScript: sample noise and move the model instances on the CPU.
  // No vertex displacement or custom GPU program is used for this animation.
  updateNoise(time, amount, scale) {
    for (let id = 0; id < this.poses.length; id++) {
      const pose = this.poses[id];
      const broad = this.noise.noise(
        pose.x * scale + 13.7,
        pose.z * scale + 41.2,
        time,
      );
      const detail = this.noise.noise(
        pose.x * scale * 1.9 + 57.1,
        pose.z * scale * 1.9 + 8.3,
        time * 0.7,
      );
      const offset =
        THREE.MathUtils.clamp((broad * 0.8 + detail * 0.2) * 2, -1, 1) * amount;
      // ±0.6 keeps the wrist embedded in the ceiling throughout its movement.
      this.matrices[id].elements[13] = this.room.ceiling + 0.65 + offset;
    }
    for (const batch of this.batches) {
      batch.userData.handIds.forEach((id, i) =>
        batch.setMatrixAt(i, this.matrices[id]),
      );
      batch.instanceMatrix.needsUpdate = true;
    }
  }

  getMatrixAt(index, target) {
    return target.copy(this.matrices[index]);
  }

  addTo(scene) {
    scene.add(this.mesh);
    for (const light of this.lights) scene.add(light, light.target);
  }

  setBrightness(brightness) {
    this.lights.forEach(
      (light, i) => (light.intensity = (i === 0 ? 950 : 360) * brightness),
    );
  }
}

function createMirrorFloor(room, strength = 0.36) {
  // Reflector is the official Three.js mirror helper. Use its default material.
  const floor = new Reflector(new THREE.PlaneGeometry(room.width, room.depth), {
    color: 0x888888,
    textureWidth: 1024,
    textureHeight: 768,
    clipBias: 0.003,
    multisample: 0,
  });

  // A transparent dark plane dims the mirror using a familiar material property.
  const tint = new THREE.Mesh(
    new THREE.PlaneGeometry(room.width, room.depth),
    new THREE.MeshBasicMaterial({
      color: 0x020305,
      transparent: true,
      opacity: 1 - strength,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  // Local +Z becomes world +Y after the floor rotates to lie horizontally.
  tint.position.z = 0.001;
  floor.add(tint);
  floor.userData.setReflection = (value) => {
    tint.material.opacity = 1 - THREE.MathUtils.clamp(value, 0, 1);
  };

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = room.base;
  const reflect = floor.onBeforeRender;
  floor.onBeforeRender = function (renderer, scene, camera, ...rest) {
    // Reflections always see the array, even while the main view conceals it.
    const reflectedCamera = this.getReflectionCamera(camera);
    reflectedCamera.layers.enable(0);
    reflectedCamera.layers.enable(CEILING_LAYER);
    reflect.call(this, renderer, scene, camera, ...rest);
  };
  return floor;
}
