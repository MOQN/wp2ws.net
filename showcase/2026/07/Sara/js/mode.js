(function () {
  "use strict";

  class CameraModeController {
    constructor(options) {
      this.params = options.params;
      this.camera = options.camera;
      this.controls = options.controls;
      this.renderer = options.renderer;
      this.ringRadius = options.ringRadius;
      this.tableWidth = options.tableWidth;
      this.tableY = options.tableY;
      this.getSurfaceHeight = options.getSurfaceHeight;
      this.eyeHeight = options.eyeHeight ?? 58;
      this.moveSpeed = options.moveSpeed ?? 155;
      this.strafeSpeed = options.strafeSpeed ?? 112;
      this.edgeMargin = options.edgeMargin ?? 42;
      this.lookSensitivity = options.lookSensitivity ?? 0.003;
      this.activeMode = null;
      this.freeCameraPosition = null;
      this.freeCameraTarget = null;
      this.playerAngle = 0.12;
      this.playerRadialOffset = 18;
      this.playerCameraLastTime = performance.now();
      this.playerYawOffset = 0;
      this.playerPitch = -0.04;
      this.playerLookDragging = false;
      this.playerPointerX = 0;
      this.playerPointerY = 0;
      this.playerKeys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
      };
      this.tangent = new THREE.Vector3();
      this.inward = new THREE.Vector3();
      this.lookDirection = new THREE.Vector3();
      this.lookTarget = new THREE.Vector3();
      this.upAxis = new THREE.Vector3(0, 1, 0);
    }

    initialize(initialMode = "player") {
      this.freeCameraPosition = this.camera.position.clone();
      this.freeCameraTarget = this.controls.target.clone();
      this.setupPlayerInput();
      this.setMode(initialMode, true);
    }

    setupPlayerInput() {
      const canvas = this.renderer.domElement;
      const updateKey = (event, pressed) => {
        if (this.params.cameraMode !== "player") return;
        const target = event.target;
        const isEditing =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "SELECT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (pressed && isEditing) return;

        const keyMap = {
          KeyW: "forward",
          KeyS: "backward",
          KeyA: "left",
          KeyD: "right",
        };
        const action = keyMap[event.code];
        if (!action) return;
        event.preventDefault();
        this.playerKeys[action] = pressed;
      };

      window.addEventListener("keydown", (event) => updateKey(event, true));
      window.addEventListener("keyup", (event) => updateKey(event, false));
      window.addEventListener("blur", () => this.resetPlayerKeys());

      canvas.addEventListener(
        "wheel",
        (event) => {
          if (this.params.cameraMode !== "player") return;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        { passive: false, capture: true }
      );

      canvas.addEventListener("pointerdown", (event) => {
        if (this.params.cameraMode !== "player" || event.button !== 0) return;
        this.playerLookDragging = true;
        this.playerPointerX = event.clientX;
        this.playerPointerY = event.clientY;
        canvas.setPointerCapture?.(event.pointerId);
        canvas.style.cursor = "grabbing";
        event.preventDefault();
      });

      canvas.addEventListener("pointermove", (event) => {
        if (!this.playerLookDragging || this.params.cameraMode !== "player") {
          return;
        }
        const deltaX = event.clientX - this.playerPointerX;
        const deltaY = event.clientY - this.playerPointerY;
        this.playerPointerX = event.clientX;
        this.playerPointerY = event.clientY;

        this.playerYawOffset -= deltaX * this.lookSensitivity;
        this.playerPitch = THREE.MathUtils.clamp(
          this.playerPitch - deltaY * this.lookSensitivity * 0.8,
          -0.42,
          0.42
        );
      });

      const stopPlayerLook = (event) => {
        if (!this.playerLookDragging) return;
        this.playerLookDragging = false;
        if (event && canvas.hasPointerCapture?.(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        canvas.style.cursor =
          this.params.cameraMode === "player" ? "grab" : "default";
      };
      canvas.addEventListener("pointerup", stopPlayerLook);
      canvas.addEventListener("pointercancel", stopPlayerLook);
    }

    resetPlayerKeys() {
      this.playerKeys.forward = false;
      this.playerKeys.backward = false;
      this.playerKeys.left = false;
      this.playerKeys.right = false;
    }

    setMode(mode, force = false) {
      if (!force && this.activeMode === mode) return;

      if (
        this.activeMode === "free" &&
        this.freeCameraPosition &&
        this.freeCameraTarget
      ) {
        this.freeCameraPosition.copy(this.camera.position);
        this.freeCameraTarget.copy(this.controls.target);
      }

      this.resetPlayerKeys();
      this.activeMode = mode;
      this.playerCameraLastTime = performance.now();

      if (mode === "player") {
        this.controls.enabled = false;
        this.renderer.domElement.style.cursor = "grab";
        this.camera.fov = 70;
        this.camera.near = 0.5;
        this.camera.far = 1100;
        this.camera.updateProjectionMatrix();
        this.updatePlayerCamera(0);
        return;
      }

      this.controls.enabled = true;
      this.playerLookDragging = false;
      this.renderer.domElement.style.cursor = "default";
      this.camera.fov = 75;
      this.camera.near = 0.1;
      this.camera.far = 10000;
      this.camera.position.copy(this.freeCameraPosition);
      this.controls.target.copy(this.freeCameraTarget);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }

    update() {
      if (this.activeMode !== this.params.cameraMode) {
        this.setMode(this.params.cameraMode);
      }

      if (this.params.cameraMode === "free") {
        this.controls.update();
        return;
      }

      const now = performance.now();
      const deltaSeconds = Math.min(
        (now - this.playerCameraLastTime) / 1000,
        0.05
      );
      this.playerCameraLastTime = now;
      this.updatePlayerCamera(deltaSeconds);
    }

    updatePlayerCamera(deltaSeconds) {
      const radiusBeforeStrafe = this.ringRadius + this.playerRadialOffset;
      const forwardInput =
        (this.playerKeys.forward ? 1 : 0) -
        (this.playerKeys.backward ? 1 : 0);
      const strafeInput =
        (this.playerKeys.left ? 1 : 0) -
        (this.playerKeys.right ? 1 : 0);

      this.playerAngle +=
        (forwardInput * this.moveSpeed * deltaSeconds) /
        Math.max(1, radiusBeforeStrafe);
      this.playerAngle =
        THREE.MathUtils.euclideanModulo(
          this.playerAngle + Math.PI,
          Math.PI * 2
        ) - Math.PI;

      const radialLimit = this.tableWidth / 2 - this.edgeMargin;
      this.playerRadialOffset = THREE.MathUtils.clamp(
        this.playerRadialOffset +
          strafeInput * this.strafeSpeed * deltaSeconds,
        -radialLimit,
        radialLimit
      );

      const radius = this.ringRadius + this.playerRadialOffset;
      const surfaceOffset = this.getSurfaceHeight(
        this.playerAngle,
        this.playerRadialOffset
      );
      const eyeY = this.tableY + surfaceOffset + this.eyeHeight;
      this.camera.position.set(
        Math.cos(this.playerAngle) * radius,
        eyeY,
        Math.sin(this.playerAngle) * radius
      );

      this.tangent.set(
        -Math.sin(this.playerAngle),
        0,
        Math.cos(this.playerAngle)
      );
      this.inward.set(
        -Math.cos(this.playerAngle),
        0,
        -Math.sin(this.playerAngle)
      );
      this.lookDirection
        .copy(this.tangent)
        .multiplyScalar(0.92)
        .addScaledVector(this.inward, 0.38)
        .normalize()
        .applyAxisAngle(this.upAxis, this.playerYawOffset);

      const horizontalLook = Math.cos(this.playerPitch);
      this.lookDirection.multiplyScalar(horizontalLook);
      this.lookDirection.y = Math.sin(this.playerPitch);
      this.lookDirection.normalize();

      this.lookTarget
        .copy(this.camera.position)
        .addScaledVector(this.lookDirection, 270);
      this.camera.up.copy(this.upAxis);
      this.camera.lookAt(this.lookTarget);
    }
  }

  window.CameraModeController = CameraModeController;
})();
