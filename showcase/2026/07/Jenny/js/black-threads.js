const WALK_ROUTE = [
  [0, 13.5],
  [-2.6, 6.075],
  [2.6, 2.025],
  [2.2, 1.65],
  [-2.2, 1.65],
  [-2.6, 0],
  [-2.6, -2.025],
  [2.6, -6.075],
  [0, -12],
];

// Reserve an actual walkable ribbon when distributing the floor sculptures.
function walkwayFootprints(width = 1.4) {
  return WALK_ROUTE.slice(1).map((end, i) => {
    const start = WALK_ROUTE[i],
      dx = end[0] - start[0],
      dz = end[1] - start[1],
      len = Math.hypot(dx, dz),
      r = width / 2;
    const tx = dx / len,
      tz = dz / len,
      nx = -tz * r,
      nz = tx * r;
    const ax = start[0] - tx * r,
      az = start[1] - tz * r,
      bx = end[0] + tx * r,
      bz = end[1] + tz * r;
    const points = [
      { x: ax + nx, z: az + nz },
      { x: ax - nx, z: az - nz },
      { x: bx - nx, z: bz - nz },
      { x: bx + nx, z: bz + nz },
    ];
    return {
      points,
      minX: Math.min(...points.map((p) => p.x)),
      maxX: Math.max(...points.map((p) => p.x)),
      minZ: Math.min(...points.map((p) => p.z)),
      maxZ: Math.max(...points.map((p) => p.z)),
    };
  });
}

function nearFootprint(point, poly, margin = 0.06) {
  let inside = true,
    nearest = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length],
      dx = b.x - a.x,
      dz = b.z - a.z,
      len2 = dx * dx + dz * dz;
    if (dx * (point.z - a.z) - dz * (point.x - a.x) < 0) inside = false;
    if (len2 < 1e-10) continue;
    const t = THREE.MathUtils.clamp(
      ((point.x - a.x) * dx + (point.z - a.z) * dz) / len2,
      0,
      1,
    );
    nearest = Math.min(
      nearest,
      Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz),
    );
  }
  return inside || nearest < margin;
}

function segmentHitsFootprint(a, b, f, margin = 0.06) {
  if (
    Math.max(a.x, b.x) < f.minX - margin ||
    Math.min(a.x, b.x) > f.maxX + margin ||
    Math.max(a.z, b.z) < f.minZ - margin ||
    Math.min(a.z, b.z) > f.maxZ + margin
  )
    return false;
  if (nearFootprint(a, f.points, margin) || nearFootprint(b, f.points, margin))
    return true;
  for (let i = 0; i < f.points.length; i++) {
    const c = f.points[i],
      d = f.points[(i + 1) % f.points.length],
      ux = b.x - a.x,
      uz = b.z - a.z,
      vx = d.x - c.x,
      vz = d.z - c.z,
      den = ux * vz - uz * vx;
    if (Math.abs(den) > 1e-10) {
      const t = ((c.x - a.x) * vz - (c.z - a.z) * vx) / den,
        u = ((c.x - a.x) * uz - (c.z - a.z) * ux) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
    }
    for (const [point, start, end] of [
      [c, a, b],
      [d, a, b],
    ]) {
      const q = closestPoint(point, start, end);
      if (Math.hypot(point.x - q.x, point.z - q.z) < margin) return true;
    }
  }
  return false;
}

function pointAtHeight(line, y) {
  const t = THREE.MathUtils.clamp((y - line.b.y) / (line.a.y - line.b.y), 0, 1);
  return {
    x: THREE.MathUtils.lerp(line.b.x, line.a.x, t),
    z: THREE.MathUtils.lerp(line.b.z, line.a.z, t),
  };
}

function closestPoint(p, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len2 = dx * dx + dz * dz;
  const t =
    len2 > 1e-12
      ? THREE.MathUtils.clamp(
          ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2,
          0,
          1,
        )
      : 0;
  return { x: a.x + dx * t, z: a.z + dz * t };
}

// Sweep the player's circle against the real, slightly inclined fibre capsules.
function sweepCapsule(start, move, a, b, radius) {
  let best = null;
  const consider = (t, nx, nz) => {
    if (t < -1e-7 || t > 1 || move.x * nx + move.z * nz >= -1e-9) return;
    if (!best || t < best.t) best = { t: Math.max(0, t), nx, nz };
  };
  const speed2 = move.x * move.x + move.z * move.z;
  if (speed2 < 1e-14) return null;
  for (const c of [a, b]) {
    const x = start.x - c.x,
      z = start.z - c.z,
      dot = x * move.x + z * move.z,
      disc = dot * dot - speed2 * (x * x + z * z - radius * radius);
    if (disc < 0) continue;
    const t = (-dot - Math.sqrt(disc)) / speed2;
    const nx = start.x + move.x * t - c.x,
      nz = start.z + move.z * t - c.z,
      len = Math.hypot(nx, nz);
    if (len > 1e-9) consider(t, nx / len, nz / len);
  }
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz);
  if (len > 1e-9) {
    const nx = -dz / len,
      nz = dx / len,
      d = (start.x - a.x) * nx + (start.z - a.z) * nz,
      v = move.x * nx + move.z * nz;
    if (Math.abs(v) > 1e-10)
      for (const sign of [-1, 1]) {
        const t = (sign * radius - d) / v,
          along =
            ((start.x + move.x * t - a.x) * dx +
              (start.z + move.z * t - a.z) * dz) /
            len;
        if (along >= 0 && along <= len) consider(t, nx * sign, nz * sign);
      }
  }
  return best;
}

class BlackThreadCurtains {
  constructor(ceiling, room, radius = 0.012, density = 2) {
    this.ceiling = ceiling;
    this.room = room;
    this.radius = radius;
    this.density = density;
    this.lines = [];
    this.material = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.65,
      metalness: 0.08,
    });
    this.geometry = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      ceiling.poses.length * 12,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.transform = new THREE.Object3D();
    this.keepout = null;
    this.cache = null;
    this.sparseWays = walkwayFootprints(0.82);
    this.candidates = this.makeCandidates();
  }

  makeCandidates() {
    const points = this.ceiling.geometry.attributes.position,
      grips = [];
    const order = [
      [1, 1],
      [3, 1],
      [0, 0],
      [2, 2],
      [2, 0],
      [0, 2],
      [0, 1],
      [2, 1],
      [1, 0],
      [3, 2],
      [3, 0],
      [1, 2],
    ];
    for (let k = 0; k < 12; k++) {
      const targetX = (order[k][0] / 3 - 0.5) * 1.2;
      let score = Infinity,
        best = null;
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i),
          y = points.getY(i),
          z = points.getZ(i),
          d = (x - targetX) ** 2 * 2 + (y + 2.05) ** 2 + (z - 0.23) ** 2 * 0.5;
        if (d < score) {
          score = d;
          best = new THREE.Vector3(x, y, z);
        }
      }
      grips.push(best);
    }
    const result = [],
      matrix = new THREE.Matrix4();
    for (let hand = 0; hand < this.ceiling.poses.length; hand++) {
      const pose = this.ceiling.poses[hand];
      this.ceiling.getMatrixAt(hand, matrix);
      for (let rank = 0; rank < 12; rank++) {
        const [col, row] = order[rank],
          a = grips[rank].clone().applyMatrix4(matrix);
        const b = new THREE.Vector3(
          pose.x + (col / 4 - 0.375) * this.ceiling.cellWidth,
          this.room.base + 0.002,
          pose.z + (row / 3 - 1 / 3) * this.ceiling.cellDepth,
        );
        result.push({ a, b, hand, rank, grip: grips[rank].clone() });
      }
    }
    return result;
  }

  isClear(line, avoidRoute = false, keepout = null) {
    for (const obstacle of this.obstacles) {
      const a = pointAtHeight(line, this.room.base + 0.03),
        b = pointAtHeight(line, obstacle.height);
      if (segmentHitsFootprint(a, b, obstacle.footprint, 0.065)) return false;
    }
    const low = pointAtHeight(line, this.room.base + 0.12),
      high = pointAtHeight(line, 3.8);
    if (
      avoidRoute &&
      this.sparseWays.some((f) => segmentHitsFootprint(low, high, f, 0.025))
    )
      return false;
    if (keepout) {
      const q = closestPoint(keepout, low, high);
      if (Math.hypot(q.x - keepout.x, q.z - keepout.z) < 0.5) return false;
    }
    return true;
  }

  safeLine(candidate, keepout = null) {
    const avoidRoute = candidate.rank < 2;
    if (this.isClear(candidate, avoidRoute, keepout)) return candidate;
    // Straight fibres fan slightly outwards to avoid piercing floor sculptures.
    for (let ring = 1; ring <= 30; ring++)
      for (let step = 0; step < 24; step++) {
        const angle = (step / 24) * Math.PI * 2 + (candidate.hand % 7) * 0.09,
          radius = ring * 0.3;
        const b = new THREE.Vector3(
          candidate.b.x + Math.cos(angle) * radius,
          this.room.base + 0.002,
          candidate.b.z + Math.sin(angle) * radius,
        );
        if (
          Math.abs(b.x) > this.room.width / 2 - 0.08 ||
          Math.abs(b.z) > this.room.depth / 2 - 0.08
        )
          continue;
        const line = { ...candidate, b };
        if (this.isClear(line, avoidRoute, keepout)) return line;
      }
    throw new Error(
      "Could not find a thread endpoint. Please randomize the layout.",
    );
  }

  rebuild(floorPoses, position = null) {
    const points = [
      { x: -1.15, z: -1.3 },
      { x: 1.15, z: -1.3 },
      { x: 1.15, z: 1.3 },
      { x: -1.15, z: 1.3 },
    ];
    const chair = { points, minX: -1.15, maxX: 1.15, minZ: -1.3, maxZ: 1.3 };
    this.obstacles = [
      { footprint: chair, height: 4.3 },
      ...floorPoses.map((p) => ({
        footprint: p.footprint,
        height: p.top + 0.05,
      })),
    ];
    this.basePlan = this.candidates.map((line) => this.safeLine(line));
    this.setDensity(this.density, position);
  }

  setDensity(density, position = null) {
    this.density = THREE.MathUtils.clamp(Math.round(density), 1, 12);
    this.keepout = position ? { x: position.x, z: position.z } : this.keepout;
    this.lines = this.basePlan
      .filter((line) => line.rank < this.density)
      .map((line) => (this.keepout ? this.safeLine(line, this.keepout) : line));
    // Keep the rest plan immutable when live endpoints follow the hands.
    this.lines = this.lines.map((line) => ({ ...line, a: line.a.clone() }));
    this.mesh.count = this.lines.length;
    this.cache = null;
    this.updateMatrices();
  }

  followCeiling() {
    const matrix =
      this.followMatrix || (this.followMatrix = new THREE.Matrix4());
    for (const line of this.lines) {
      this.ceiling.getMatrixAt(line.hand, matrix);
      line.a.copy(line.grip).applyMatrix4(matrix);
    }
    this.cache = null;
    this.updateMatrices();
  }

  updateMatrices() {
    const up = new THREE.Vector3(0, 1, 0),
      direction = new THREE.Vector3();
    for (let i = 0; i < this.lines.length; i++) {
      const { a, b } = this.lines[i],
        length = a.distanceTo(b);
      this.transform.position.copy(a).add(b).multiplyScalar(0.5);
      this.transform.quaternion.setFromUnitVectors(
        up,
        direction.subVectors(a, b).normalize(),
      );
      this.transform.scale.set(this.radius, length, this.radius);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(i, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setRadius(radius) {
    this.radius = radius;
    this.updateMatrices();
  }

  colliders(height) {
    if (this.cache && Math.abs(this.cache.height - height) < 0.01)
      return this.cache.capsules;
    const capsules = this.lines.map((line) => ({
        a: pointAtHeight(line, this.room.base + 0.12),
        b: pointAtHeight(line, height + 0.2),
      })),
      grid = new Map();
    capsules.forEach((c, index) => {
      for (
        let x = Math.floor(Math.min(c.a.x, c.b.x) - 0.4);
        x <= Math.floor(Math.max(c.a.x, c.b.x) + 0.4);
        x++
      )
        for (
          let z = Math.floor(Math.min(c.a.z, c.b.z) - 0.4);
          z <= Math.floor(Math.max(c.a.z, c.b.z) + 0.4);
          z++
        ) {
          const key = x + "," + z;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(index);
        }
    });
    this.cache = { height, capsules, grid };
    return capsules;
  }

  nearby(height, start, end) {
    this.colliders(height);
    const ids = new Set();
    for (
      let x = Math.floor(Math.min(start.x, end.x) - 0.4);
      x <= Math.floor(Math.max(start.x, end.x) + 0.4);
      x++
    )
      for (
        let z = Math.floor(Math.min(start.z, end.z) - 0.4);
        z <= Math.floor(Math.max(start.z, end.z) + 0.4);
        z++
      ) {
        for (const index of this.cache.grid.get(x + "," + z) || [])
          ids.add(index);
      }
    return [...ids].map((index) => this.cache.capsules[index]);
  }

  constrain(position, previous, playerRadius = 0.28) {
    const capsules = this.nearby(position.y, previous, position),
      radius = playerRadius + this.radius;
    let p = { x: previous.x, z: previous.z };
    // Recover safely after a regenerated floor layout changes a nearby obstacle.
    for (let pass = 0; pass < 3; pass++)
      for (const { a, b } of capsules) {
        const q = closestPoint(p, a, b),
          dx = p.x - q.x,
          dz = p.z - q.z,
          d = Math.hypot(dx, dz);
        if (d < radius - 1e-6) {
          const nx = d > 1e-8 ? dx / d : 0,
            nz = d > 1e-8 ? dz / d : 1;
          p.x = q.x + nx * (radius + 0.001);
          p.z = q.z + nz * (radius + 0.001);
        }
      }
    let move = { x: position.x - p.x, z: position.z - p.z };
    for (let pass = 0; pass < 5; pass++) {
      let hit = null;
      for (const { a, b } of capsules) {
        const h = sweepCapsule(p, move, a, b, radius);
        if (h && (!hit || h.t < hit.t)) hit = h;
      }
      if (!hit) {
        p.x += move.x;
        p.z += move.z;
        break;
      }
      const t = Math.max(0, hit.t - 1e-5);
      p.x += move.x * t;
      p.z += move.z * t;
      move.x *= 1 - t;
      move.z *= 1 - t;
      const inward = move.x * hit.nx + move.z * hit.nz;
      if (inward < 0) {
        move.x -= hit.nx * inward;
        move.z -= hit.nz * inward;
      }
      if (Math.hypot(move.x, move.z) < 1e-6) break;
    }
    position.x = p.x;
    position.z = p.z;
  }
}
