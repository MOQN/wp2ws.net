(function () {
  "use strict";

  class LightingModeController {
    constructor(options) {
      this.params = options.params;
      this.scene = options.scene;
      this.renderer = options.renderer;
      this.stageLightRigs = options.stageLightRigs;
      this.ambient = options.ambient;
      this.frontWash = options.frontWash;
      this.regularEdgeLights = options.regularEdgeLights;
      this.tableY = options.tableY;
      this.chairLightRadius = options.chairLightRadius;
      this.chairBaseY = options.chairBaseY;
      this.getPuppetMaterials = options.getPuppetMaterials;

      this.activeAtmosphere = null;
      this.stageLightCycleStartTime = performance.now();
      this.lastStageLightSpread = Number.NaN;
      this.lastStageLightMode = null;
      this.lastActiveLightIndex = -1;
      this.lastPuppetMaterialCount = -1;
      this.lightSpreadBinding = null;
      this.lightModeBinding = null;
      this.horrorLights = [];
      this.horrorVisuals = [];
      this.horrorRedCore = null;
      this.horrorStartTime = performance.now();
    }

    initialize(initialAtmosphere = "golden") {
      this.createHorrorLighting();
      this.setAtmosphere(initialAtmosphere, true);
    }

    attachGUI(lightSpreadBinding, lightModeBinding) {
      this.lightSpreadBinding = lightSpreadBinding;
      this.lightModeBinding = lightModeBinding;
      this.updateGUIVisibility();
    }

    restartGoldenCycle() {
      this.stageLightCycleStartTime = performance.now();
      this.lastActiveLightIndex = -1;
    }

    setAtmosphere(mode, force = false) {
      if (!force && this.activeAtmosphere === mode) return;

      this.params.lightingAtmosphere = mode;
      this.activeAtmosphere = mode;
      const isHorror = mode === "horror";

      this.frontWash.visible = !isHorror;
      for (const light of this.regularEdgeLights) light.visible = !isHorror;
      for (const light of this.horrorLights) light.visible = isHorror;
      for (const visual of this.horrorVisuals) visual.visible = isHorror;

      if (isHorror) {
        this.scene.background.setHex(0x02030b);
        if (this.scene.fog?.isFogExp2) this.scene.fog.color.setHex(0x11132d);
        this.renderer.toneMappingExposure = 1.08;
        this.ambient.color.setHex(0x526bc1);
        this.ambient.groundColor.setHex(0x030208);
        this.ambient.intensity = 1.18;
        this.hideGoldenBeams();
      } else {
        this.scene.background.setHex(0x08040d);
        if (this.scene.fog?.isFogExp2) this.scene.fog.color.setHex(0x30163d);
        this.renderer.toneMappingExposure = 1.12;
        this.ambient.color.setHex(0x8b7b92);
        this.ambient.groundColor.setHex(0x090305);
        this.ambient.intensity = 0.68;
        this.lastStageLightSpread = Number.NaN;
        this.lastStageLightMode = null;
        this.lastActiveLightIndex = -1;
      }

      this.lastPuppetMaterialCount = -1;
      this.updatePuppetStrings();
      this.updateGUIVisibility();
    }

    update() {
      if (this.activeAtmosphere !== this.params.lightingAtmosphere) {
        this.setAtmosphere(this.params.lightingAtmosphere);
      }

      this.updatePuppetStrings();
      if (this.activeAtmosphere === "horror") {
        this.updateHorrorLighting();
      } else {
        this.updateGoldenLighting();
      }
    }

    updateGUIVisibility() {
      const hideGoldenControls = this.activeAtmosphere === "horror";
      if (this.lightSpreadBinding) {
        this.lightSpreadBinding.hidden = hideGoldenControls;
      }
      if (this.lightModeBinding) {
        this.lightModeBinding.hidden = hideGoldenControls;
      }
    }

    updatePuppetStrings() {
      const materials = this.getPuppetMaterials?.() ?? [];
      if (materials.length === this.lastPuppetMaterialCount) return;

      const isHorror = this.activeAtmosphere === "horror";
      for (const material of materials) {
        material.color.setHex(isHorror ? 0xff214f : 0xb81731);
        material.opacity = isHorror ? 0.96 : 0.72;
      }
      this.lastPuppetMaterialCount = materials.length;
    }

    hideGoldenBeams() {
      for (const rig of this.stageLightRigs) {
        rig.light.visible = false;
        for (const beam of rig.beams) beam.visible = false;
        rig.pool.visible = false;
      }
    }

    updateGoldenLighting() {
      const spreadChanged =
        this.lastStageLightSpread !== this.params.lightSpread;
      const cycleSeconds = 1.6;
      const activeLightIndex = this.params.lightMode === "single"
        ? Math.floor(
          (performance.now() - this.stageLightCycleStartTime) /
          1000 /
          cycleSeconds
        ) % Math.max(this.stageLightRigs.length, 1)
        : -1;
      const visibilityChanged =
        this.lastStageLightMode !== this.params.lightMode ||
        this.lastActiveLightIndex !== activeLightIndex;

      if (!spreadChanged && !visibilityChanged) return;

      const targetRadius = spreadChanged
        ? THREE.MathUtils.lerp(
          215,
          this.chairLightRadius,
          this.params.lightSpread
        )
        : 0;
      const targetY = spreadChanged
        ? THREE.MathUtils.lerp(
          this.tableY + 16,
          this.tableY + 70,
          this.params.lightSpread
        )
        : 0;

      for (let index = 0; index < this.stageLightRigs.length; index++) {
        const rig = this.stageLightRigs[index];
        if (spreadChanged) {
          rig.target.set(
            Math.cos(rig.angle) * targetRadius,
            targetY,
            Math.sin(rig.angle) * targetRadius
          );
          rig.direction.subVectors(rig.start, rig.target);
          const distance = rig.direction.length();
          rig.beamRotation.setFromUnitVectors(
            rig.upAxis,
            rig.direction.normalize()
          );
          rig.beamCentre
            .copy(rig.start)
            .add(rig.target)
            .multiplyScalar(0.5);

          rig.light.target.position.copy(rig.target);
          rig.light.angle = THREE.MathUtils.lerp(
            Math.PI * 0.19,
            Math.PI * 0.27,
            this.params.lightSpread
          );

          for (const beam of rig.beams) {
            beam.position.copy(rig.beamCentre);
            beam.quaternion.copy(rig.beamRotation);
            beam.scale.y = distance / rig.baseDistance;
          }

          rig.pool.position.copy(rig.target);
          rig.pool.position.y = THREE.MathUtils.lerp(
            this.tableY + 4,
            this.chairBaseY + 4,
            this.params.lightSpread
          );
        }

        if (visibilityChanged) {
          const isActive =
            this.params.lightMode === "all" ||
            (this.params.lightMode === "single" &&
              index === activeLightIndex);
          rig.light.visible = isActive;
          for (const beam of rig.beams) beam.visible = isActive;
          rig.pool.visible = isActive;
        }
      }

      this.lastStageLightSpread = this.params.lightSpread;
      this.lastStageLightMode = this.params.lightMode;
      this.lastActiveLightIndex = activeLightIndex;
    }

    createHorrorLighting() {
      const horrorSpotConfigs = [
        {
          color: 0x5877d8,
          intensity: 82000,
          start: [0, 760, -80],
          target: [0, this.tableY + 10, 0],
          angle: Math.PI * 0.24,
          radius: 185,
        },
        {
          color: 0x374d9c,
          intensity: 64000,
          start: [-720, 360, -560],
          target: [-170, this.tableY + 65, 20],
          angle: Math.PI * 0.18,
          radius: 135,
        },
        {
          color: 0x7b4fc4,
          intensity: 60000,
          start: [720, 330, -520],
          target: [170, this.tableY + 55, 10],
          angle: Math.PI * 0.18,
          radius: 135,
        },
        {
          color: 0xd01849,
          intensity: 78000,
          start: [0, 610, 210],
          target: [0, this.tableY + 18, 0],
          angle: Math.PI * 0.12,
          radius: 82,
        },
      ];

      for (const config of horrorSpotConfigs) {
        const start = new THREE.Vector3(...config.start);
        const targetPosition = new THREE.Vector3(...config.target);
        const light = new THREE.SpotLight(
          config.color,
          config.intensity,
          1900,
          config.angle,
          0.9,
          1.5
        );
        light.position.copy(start);
        light.target.position.copy(targetPosition);
        light.castShadow = false;
        light.visible = false;
        this.scene.add(light, light.target);
        this.horrorLights.push(light);

        const beams = this.createHorrorBeam(
          start,
          targetPosition,
          config.color,
          config.radius
        );
        this.horrorVisuals.push(...beams);
      }

      this.horrorRedCore = new THREE.PointLight(
        0xc21448,
        46000,
        620,
        2
      );
      this.horrorRedCore.position.set(0, this.tableY + 20, 0);
      this.horrorRedCore.visible = false;
      this.scene.add(this.horrorRedCore);
      this.horrorLights.push(this.horrorRedCore);

      const cyanEdge = new THREE.PointLight(0x70d4ff, 26000, 1400, 2);
      cyanEdge.position.set(0, 260, 760);
      cyanEdge.visible = false;
      this.scene.add(cyanEdge);
      this.horrorLights.push(cyanEdge);

      const clockGlow = new THREE.Mesh(
        new THREE.CircleGeometry(185, 48),
        new THREE.MeshBasicMaterial({
          color: 0x9f082f,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        })
      );
      clockGlow.rotation.x = -Math.PI / 2;
      clockGlow.position.set(0, this.tableY + 19, 0);
      clockGlow.visible = false;
      clockGlow.renderOrder = 2;
      this.scene.add(clockGlow);
      this.horrorVisuals.push(clockGlow);
    }

    createHorrorBeam(start, target, color, radius) {
      const direction = new THREE.Vector3().subVectors(start, target);
      const distance = direction.length();
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      );
      const centre = new THREE.Vector3()
        .copy(start)
        .add(target)
        .multiplyScalar(0.5);
      const layers = [
        { scale: 1, opacity: 0.022 },
        { scale: 0.58, opacity: 0.038 },
      ];
      const meshes = [];

      for (const layer of layers) {
        const mesh = new THREE.Mesh(
          new THREE.ConeGeometry(
            radius * layer.scale,
            distance,
            24,
            1,
            true
          ),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: layer.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          })
        );
        mesh.position.copy(centre);
        mesh.quaternion.copy(rotation);
        mesh.visible = false;
        mesh.renderOrder = 1;
        this.scene.add(mesh);
        meshes.push(mesh);
      }
      return meshes;
    }

    updateHorrorLighting() {
      const elapsed = (performance.now() - this.horrorStartTime) / 1000;
      const pulse = 0.9 + Math.sin(elapsed * 1.35) * 0.1;
      this.horrorRedCore.intensity = 46000 * pulse;
    }
  }

  window.LightingModeController = LightingModeController;
})();
