// One particle per petal.
import * as THREE from 'three';
export class Particle {
  constructor(id, home, normal, random, ambient = false) {
    this.id = id;
    this.home = home.clone();
    this.normal = normal.clone();
    this.pos = home.clone();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    this.target = home.clone();
    this.mass = 0.85 + random() * 0.5;
    this.seed = random();
    this.phase = random() * Math.PI * 2;
    this.length = 0.28 + random() ** 1.8 * 0.52;
    if (this.seed > 0.91) this.length *= 1.75;
    this.width = this.length * (0.48 + random() * 0.25);
    this.roll = (random() - 0.5) * 2.1;
    this.tilt = (random() - 0.5) * 1.0;
    this.curl = 0.35 + random() * 0.55;
    this.tone = 0.74 + random() * 0.26;
    this.attached = !ambient;
    this.ambient = ambient;
    this.isDone = false;
    this.hitTime = -100;
    this.detachTime = ambient ? -12 * random() : -100;
    this.damage = 0;
    this.hitStrength = 0;
    this.hitDirection = normal.clone();
    this.scarOffset = new THREE.Vector3();
    this.scarWeight = 0;
    this.fracture = 0;
    this.fractureTarget = 0;
    this.splitOffset = new THREE.Vector3();
    this.splitTurn = 0;
    this.splitTurnTarget = 0;
    this.elasticTilt = 0;
    this.elasticVelocity = 0;
    this.detachPose = null;
    this.detachRoot = new THREE.Vector3();
    const fold = Math.sin(normal.x * 1.9 + normal.y * 0.8 + normal.z * 1.2);
    const bow = Math.cos(normal.y * 2.3 - normal.z * 1.1 + 0.7);
    this.peelOffset = new THREE.Vector3(
      normal.x * (0.24 + 0.18 * fold) - normal.y * bow * 0.16,
      normal.y * 0.22 + normal.x * bow * 0.13,
      fold * 0.48 + normal.z * 0.2,
    );
    this.peelTurn = fold * 0.12 + bow * 0.08;
    this.recoveryEffort = 0;
    this.recoverySlip = 0;
    this.contactPressure = 0;
    this.contactGlow = 0;
    this.contactBend = 0;
    this.contactT = 0.53;
    this.contactU = 0;
    this.contactWeight = 0;
    this.impulse = new THREE.Vector3();
    this.impulseTime = -100;
    this.detachOrigin = home.clone();
    this.ambientEscape = ambient ? Math.max(0, home.length() - 2.4) : 0;
    this.escapeDistance = this.ambientEscape;
    this.ionization = THREE.MathUtils.smoothstep(this.escapeDistance, 0.28, 2.25);
    this.lifespan = 1;
    this.axisU = new THREE.Vector3();
    this.axisV = new THREE.Vector3();
    const up = Math.abs(normal.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    this.axisU.crossVectors(up, normal).normalize();
    this.axisV.crossVectors(normal, this.axisU).normalize();
    if (ambient) {
      this.length *= 0.8;
      this.width *= 0.8;
      this.vel.set(0.02 * Math.sin(this.phase), -0.018, 0.006);
    }
  }

  applyForce(force) {
    this.acc.addScaledVector(force, 1 / this.mass);
  }

  // Acceleration changes velocity; velocity changes position.
  updatePosition(dt) {
    this.vel.addScaledVector(this.acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    this.acc.set(0, 0, 0);
  }

  // Attached petals pull toward home. Loose petals drift away.
  update(dt, time, breath, visualTime = time, instability = 0, gather = 0, strain = 0) {
    if (this.isDone) return;
    const sinceHit = time - this.hitTime;
    this.splitTurn += (this.splitTurnTarget - this.splitTurn) * (1 - Math.exp(-dt * 8));
    if (this.attached) {
      this.fracture += (this.fractureTarget - this.fracture) * (1 - Math.exp(-dt * 3.6));
      const ripple =
        0.012 * Math.sin(visualTime * 0.57 + this.phase) +
        0.006 * Math.sin(visualTime * 0.92 + this.home.y * 1.8);
      this.target.copy(this.home).multiplyScalar(breath + ripple);
      this.target.y += 0.045 * Math.sin(visualTime * 0.36);
      this.target.addScaledVector(this.scarOffset, THREE.MathUtils.smoothstep(sinceHit, 1, 8));
      this.target.addScaledVector(this.splitOffset, this.fracture * (0.7 + strain * 2.3));
      const separation =
        THREE.MathUtils.smoothstep(strain, 0.24, 0.94) *
        Math.min(1, this.fracture * 1.4 + this.damage * 0.45);
      this.target.addScaledVector(this.peelOffset, separation);
      this.target.x -= this.home.y * this.peelTurn * separation;
      this.target.y += this.home.x * this.peelTurn * separation;
      const uneven = Math.sin(visualTime * 1.17 + this.home.y * 2 + this.home.x * 0.8);
      this.target.addScaledVector(
        this.normal,
        instability * (0.14 + this.scarWeight * 0.2 + this.fracture * 0.18) * uneven,
      );
      this.target.x += instability * 0.13 * Math.sin(visualTime * 0.81 + this.home.z * 2);
      this.target.addScaledVector(this.normal, -0.06 * this.contactPressure);
      const t = sinceHit - this.seed * 0.28;
      const smooth = THREE.MathUtils.smoothstep;
      const firstPull = smooth(t, 0.95, 1.55) * (1 - smooth(t, 3.5, 3.6));
      const hold = smooth(t, 2.35, 2.75) * (1 - smooth(t, 3.5, 3.6));
      const slip = smooth(t, 3.58, 3.64) * (1 - smooth(t, 3.82, 4.1));
      const resistance = smooth(t, 6.4, 6.8) * (1 - smooth(t, 7.3, 8.0));
      const secondPull = smooth(t, 4.15, 7.5) * (1 - resistance * 0.68);
      const affected = this.hitStrength > 0 && sinceHit < 16;
      const stiffness =
        (affected ? 0.055 + 12.8 * firstPull + 10 * hold + 2.2 * secondPull * (1 - strain * 0.55) : 1.88) +
        this.contactPressure * 14 +
        gather * 3;
      const damping =
        (affected ? 0.55 + firstPull * 5.2 + hold * 3.2 + 2.65 * secondPull + resistance * 1.3 : 2.25) +
        this.contactPressure * 3 +
        gather * 5;
      this.recoveryEffort = affected ? Math.max(firstPull, secondPull) * this.hitStrength : 0;
      this.recoverySlip = affected ? slip * this.hitStrength : 0;
      this.acc
        .copy(this.target)
        .sub(this.pos)
        .multiplyScalar(stiffness * (1 - instability * 0.3));
      this.acc.addScaledVector(this.vel, -damping);
      this.acc.addScaledVector(
        this.hitDirection,
        this.recoverySlip * (20 + strain * 6) + (affected ? resistance * this.hitStrength * 1.65 : 0),
      );
    } else {
      const age = time - this.detachTime;
      const settling = THREE.MathUtils.smoothstep(age, 1.2, 7);
      this.acc.set(
        0.015 * Math.sin(time * 0.48 + this.phase),
        -0.012 + 0.006 * Math.sin(time * 0.62 + this.phase),
        0.008 * Math.cos(time * 0.37 + this.phase),
      );
      this.acc.addScaledVector(this.vel, -(0.16 + 0.7 * settling));
      this.lifespan = (1 - THREE.MathUtils.smoothstep(age, 30, 58)) * (1 - gather * 0.92);
      if (this.lifespan <= 0 || this.pos.lengthSq() > 180) this.isDone = true;
    }
    const impulseAge = time - this.impulseTime;
    if (impulseAge >= 0 && impulseAge < 0.18 + dt) {
      const delivered =
        THREE.MathUtils.smoothstep(impulseAge, 0, 0.18) -
        THREE.MathUtils.smoothstep(impulseAge - dt, 0, 0.18);
      this.vel.addScaledVector(this.impulse, delivered);
      this.elasticVelocity -= delivered * this.impulse.dot(this.normal) * 1.7;
    }
    this.elasticVelocity += (-23 * this.elasticTilt - 4.8 * this.elasticVelocity) * dt;
    this.elasticTilt += this.elasticVelocity * dt;
    this.updatePosition(dt);
    if (!this.attached) {
      this.escapeDistance = Math.max(
        this.escapeDistance,
        this.pos.distanceTo(this.detachOrigin) + this.ambientEscape,
      );
      this.ionization = THREE.MathUtils.smoothstep(this.escapeDistance, 0.28, 2.25);
    }
  }
}
