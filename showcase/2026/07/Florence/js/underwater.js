import * as THREE from 'three';
export const WATER_SETTINGS = { causticStrength: 0.48, patternScale: 0.055, speed: 0.012 };

export async function createUnderwaterLightEffect(scene, architecture) {
  const ripple = await new THREE.TextureLoader().loadAsync('./assets/water_ripple.png');
  ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;
  const uniforms = { waterTime: {value:0}, waterMap:{value:ripple}, waterStrength:{value:WATER_SETTINGS.causticStrength}, waterTint:{value:new THREE.Color('#c5f5fa')} };
  const materials = new Set();
  architecture.traverse(mesh => { if (mesh.isMesh) for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])) materials.add(material); });
  for(const material of materials) {
    if (!material.isMeshStandardMaterial) continue;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 waterPosition;\nvarying float waterTop;\n'+shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
        vec4 waterWorld = vec4(transformed, 1.0);
        vec3 waterNormal = normal;
        #ifdef USE_INSTANCING
          waterWorld = instanceMatrix * waterWorld;
          waterNormal = mat3(instanceMatrix) * waterNormal;
        #endif
        waterPosition = (modelMatrix * waterWorld).xyz;
        waterTop = max(0.0, normalize(mat3(modelMatrix) * waterNormal).y);
        #include <project_vertex>`);
      shader.fragmentShader = 'uniform sampler2D waterMap;\nuniform float waterTime;\nuniform float waterStrength;\nuniform vec3 waterTint;\nvarying vec3 waterPosition;\nvarying float waterTop;\n'+shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        vec2 waterUV = waterPosition.xz * ${WATER_SETTINGS.patternScale.toFixed(4)};
        waterUV += vec2(waterTime, waterTime * 0.67);
        waterUV += 0.025 * sin(waterUV.yx * 7.0 + waterTime * 3.0);
        float waterLight = texture2D(waterMap, waterUV).r;
        totalEmissiveRadiance += waterTint * smoothstep(0.7, 0.96, waterLight) * waterStrength * waterTop;`);
    };
    material.customProgramCacheKey = () => 'dream-water-v1';
    material.needsUpdate = true;
  }
  return { update(time, blood, intensity) {
    uniforms.waterTime.value = time * WATER_SETTINGS.speed;
    uniforms.waterStrength.value = WATER_SETTINGS.causticStrength * intensity;
    uniforms.waterTint.value.set('#c5f5fa').lerp(new THREE.Color('#ff6369'),blood);
  }};
}
