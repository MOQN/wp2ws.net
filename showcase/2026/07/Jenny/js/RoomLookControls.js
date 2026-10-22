class RoomLookControls {
  constructor(camera, canvas, room) {
    this.room = room;
    this.camera = camera;
    this.canvas = canvas;
    this.yaw = 0;
    this.pitch = 0;
    this.eyeHeight = 3.6;
    this.speed = 4.2;
    this.keys = new Set();
    this.groundSampler = () => 0;
    this.initialGround = true;
    let pointer = null,
      lastX = 0,
      lastY = 0;
    canvas.tabIndex = 0;
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || pointer !== null) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointer) return;
      this.yaw -= (e.clientX - lastX) * 0.003;
      this.pitch -= (e.clientY - lastY) * 0.003;
      lastX = e.clientX;
      lastY = e.clientY;
      this.apply();
    });
    const end = (e) => {
      if (e.pointerId === pointer) {
        pointer = null;
        canvas.style.cursor = "grab";
      }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("lostpointercapture", end);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        camera.fov = THREE.MathUtils.clamp(
          camera.fov + e.deltaY * 0.025,
          40,
          90,
        );
        camera.updateProjectionMatrix();
      },
      { passive: false },
    );
    const keyCode = (e) =>
      e.code ||
      { w: "KeyW", a: "KeyA", s: "KeyS", d: "KeyD" }[
        (e.key || "").toLowerCase()
      ] ||
      e.key;
    canvas.addEventListener("keydown", (e) => {
      const code = keyCode(e);
      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) {
        this.keys.add(code);
        e.preventDefault();
        return;
      }
      const step = 0.06;
      if (e.key === "ArrowLeft") this.yaw += step;
      else if (e.key === "ArrowRight") this.yaw -= step;
      else if (e.key === "ArrowUp") this.pitch += step;
      else if (e.key === "ArrowDown") this.pitch -= step;
      else return;
      e.preventDefault();
      this.apply();
    });
    const keyUp = (e) => this.keys.delete(keyCode(e));
    canvas.addEventListener("keyup", keyUp);
    const stop = () => this.keys.clear();
    canvas.addEventListener("blur", stop);
    canvas.ownerDocument?.defaultView?.addEventListener("keyup", keyUp);
    canvas.ownerDocument?.defaultView?.addEventListener("blur", stop);
  }
  apply() {
    this.pitch = THREE.MathUtils.clamp(
      this.pitch,
      -Math.PI * 0.47,
      Math.PI * 0.47,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
  setGroundSampler(fn) {
    this.groundSampler = fn;
    this.initialGround = true;
  }
  setPose(position, target, eyeHeight = 3.6) {
    this.keys.clear();
    this.camera.position.set(...position);
    this.eyeHeight = eyeHeight;
    const direction = new THREE.Vector3(...target)
      .sub(this.camera.position)
      .normalize();
    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.pitch = Math.asin(direction.y);
    this.camera.fov = 68;
    this.camera.updateProjectionMatrix();
    this.apply();
    this.initialGround = true;
    this.update(0);
  }
  update(dt = 0) {
    dt = Math.max(0, Math.min(dt, 0.1));
    const p = this.camera.position;
    const forward =
      Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
    const strafe =
      Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
    const length = Math.hypot(forward, strafe) || 1;
    p.x +=
      ((strafe * Math.cos(this.yaw) - forward * Math.sin(this.yaw)) / length) *
      this.speed *
      dt;
    p.z +=
      ((-strafe * Math.sin(this.yaw) - forward * Math.cos(this.yaw)) / length) *
      this.speed *
      dt;
    const margin = 0.42;
    p.x = THREE.MathUtils.clamp(
      p.x,
      -this.room.width / 2 + margin,
      this.room.width / 2 - margin,
    );
    p.z = THREE.MathUtils.clamp(
      p.z,
      -this.room.depth / 2 + margin,
      this.room.depth / 2 - margin,
    );
    const ground = this.groundSampler(p.x, p.z),
      target = ground + this.eyeHeight;
    if (this.initialGround) {
      p.y = target;
      this.initialGround = false;
    } else p.y = THREE.MathUtils.lerp(p.y, target, 1 - Math.exp(-18 * dt));
    // Smooth descending terrain; ensure steep rises cannot overtake the viewpoint.
    p.y = Math.max(p.y, ground + this.eyeHeight * 0.8);
    p.y = Math.min(p.y, this.room.ceiling - 0.2);
  }
}
