class FrustumUnit {
  constructor(centerZ, frontSize, backSize, depth, initialAngle) {
    // basic properties
    this.centerZ = centerZ;
    this.frontSize = frontSize;
    this.backSize = backSize;
    this.depth = depth;

    // each object starts from a different rotation angle
    this.initialAngle = initialAngle;

    // group contains both surface geometry and warped lines
    this.group = new THREE.Group();

    // move the whole object along z-axis
    this.group.position.set(0, 0, this.centerZ);

    // create the four slanted surfaces
    this.mesh = this.createGeometry();

    // add geometry into the group
    this.group.add(this.mesh);

    // create warped grid lines
    this.createWarpedGrid();

    // initial rotation around local z-axis
    this.group.rotation.z = this.initialAngle;

    // add whole object to scene
    scene.add(this.group);
  }


  createGeometry() {
    const frontHalf = this.frontSize / 2;
    const backHalf = this.backSize / 2;

    // geometry centered around local z = 0
    const frontZ = this.depth / 2;
    const backZ = -this.depth / 2;

    // FRONT OPENING CORNERS
    const frontTL = new THREE.Vector3(
      -frontHalf,
      frontHalf,
      frontZ
    );
    const frontTR = new THREE.Vector3(
      frontHalf,
      frontHalf,
      frontZ
    );
    const frontBL = new THREE.Vector3(
      -frontHalf,
      -frontHalf,
      frontZ
    );
    const frontBR = new THREE.Vector3(
      frontHalf,
      -frontHalf,
      frontZ
    );

    // BACK OPENING CORNERS
    const backTL = new THREE.Vector3(
      -backHalf,
      backHalf,
      backZ
    );
    const backTR = new THREE.Vector3(
      backHalf,
      backHalf,
      backZ
    );
    const backBL = new THREE.Vector3(
      -backHalf,
      -backHalf,
      backZ
    );
    const backBR = new THREE.Vector3(
      backHalf,
      -backHalf,
      backZ
    );

    // save face corners
    // order: A, B, C, D
    this.topFace = [
      frontTL,
      frontTR,
      backTR,
      backTL
    ];

    this.bottomFace = [
      frontBL,
      frontBR,
      backBR,
      backBL
    ];

    this.leftFace = [
      frontTL,
      frontBL,
      backBL,
      backTL
    ];

    this.rightFace = [
      frontTR,
      frontBR,
      backBR,
      backTR
    ];

    // SURFACE VERTICES
    const vertices = new Float32Array([
      // TOP
      frontTL.x, frontTL.y, frontTL.z,
      frontTR.x, frontTR.y, frontTR.z,
      backTR.x, backTR.y, backTR.z,

      frontTL.x, frontTL.y, frontTL.z,
      backTR.x, backTR.y, backTR.z,
      backTL.x, backTL.y, backTL.z,

      // BOTTOM
      frontBL.x, frontBL.y, frontBL.z,
      backBL.x, backBL.y, backBL.z,
      backBR.x, backBR.y, backBR.z,

      frontBL.x, frontBL.y, frontBL.z,
      backBR.x, backBR.y, backBR.z,
      frontBR.x, frontBR.y, frontBR.z,

      // LEFT
      frontTL.x, frontTL.y, frontTL.z,
      backTL.x, backTL.y, backTL.z,
      backBL.x, backBL.y, backBL.z,

      frontTL.x, frontTL.y, frontTL.z,
      backBL.x, backBL.y, backBL.z,
      frontBL.x, frontBL.y, frontBL.z,

      // RIGHT
      frontTR.x, frontTR.y, frontTR.z,
      frontBR.x, frontBR.y, frontBR.z,
      backBR.x, backBR.y, backBR.z,

      frontTR.x, frontTR.y, frontTR.z,
      backBR.x, backBR.y, backBR.z,
      backTR.x, backTR.y, backTR.z,
    ]);

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );

    geometry.computeVertexNormals();


    this.material = new THREE.MeshStandardMaterial({
      color: params.frustumColor,
      roughness: 0.25,
      metalness: 0.7,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(
      geometry,
      this.material
    );

    return mesh;
  }


  // CREATE ALL GRID LINES
  createWarpedGrid() {
    this.createFaceGrid(this.topFace);
    this.createFaceGrid(this.bottomFace);
    this.createFaceGrid(this.leftFace);
    this.createFaceGrid(this.rightFace);
  }


  // CREATE GRID FOR ONE FACE
  createFaceGrid(face) {
    const lineCount = 10;
    const segments = 30;
    const distortion = 0.05;

    const A = face[0];
    const B = face[1];
    const C = face[2];
    const D = face[3];

    // LINES FROM FRONT TO BACK
    for (let i = 0; i < lineCount; i++) {
      const baseHorizontal = i / (lineCount - 1);
      const points = [];

      for (let j = 0; j <= segments; j++) {
        const depthProgress = j / segments;
        const distortedHorizontal =
          baseHorizontal +
          Math.sin(depthProgress * 10 + i * 0.5) * distortion;

        const point = this.getPointOnFace(
          A,
          B,
          C,
          D,
          distortedHorizontal,
          depthProgress
        );

        points.push(point);
      }

      const geometry =
        new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 5
      });

      const line = new THREE.Line(
        geometry,
        material
      );

      this.group.add(line);
    }

    // LINES FROM LEFT TO RIGHT
    for (let i = 0; i < lineCount; i++) {
      const baseDepth = i / (lineCount - 1);
      const points = [];

      for (let j = 0; j <= segments; j++) {
        const horizontalPosition = j / segments;
        const distortedDepth =
          baseDepth +
          Math.sin(horizontalPosition * 10 + i * 0.5) * distortion;

        const point = this.getPointOnFace(
          A,
          B,
          C,
          D,
          horizontalPosition,
          distortedDepth
        );

        points.push(point);
      }

      const geometry =
        new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        linewidth: 5,
        color: 0x000000
      });

      const line = new THREE.Line(
        geometry,
        material
      );

      this.group.add(line);
    }
  }


  // GET ONE POINT ON A FACE
  getPointOnFace(
    A,
    B,
    C,
    D,
    horizontalPosition,
    depthProgress
  ) {
    const frontPoint =
      new THREE.Vector3().lerpVectors(
        A,
        B,
        horizontalPosition
      );

    const backPoint =
      new THREE.Vector3().lerpVectors(
        D,
        C,
        horizontalPosition
      );

    const point =
      new THREE.Vector3().lerpVectors(
        frontPoint,
        backPoint,
        depthProgress
      );

    return point;
  }


  update(seconds) {
    // the whole frustum rotates
    this.group.rotation.z =
      this.initialAngle + seconds * params.rotationSpeed;
    this.material.color.set(params.frustumColor);
  }
}