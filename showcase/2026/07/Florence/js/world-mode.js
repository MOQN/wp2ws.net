import * as THREE from 'three';
import { setEyeAppearance } from './props.js';

export const MODE_SETTINGS = {
  transitionSeconds: 2.4,
  normal: { fog: '#d1e3e8', near: 34, far: 125, sky: '#ffffff', light: '#ffffff' },
  blood: { fog: '#68202f', near: 16, far: 125, sky: '#b93850', light: '#ff253f' }
};


export function createWorldMode(scene, lights, atmosphere) {
  const originals = lights.map(light => ({ intensity: light.intensity, color: light.color.clone(), ground: light.groundColor?.clone() }));
  const normal = new THREE.Color(MODE_SETTINGS.normal.fog);
  const redFog = new THREE.Color(MODE_SETTINGS.blood.fog);
  const redLight = new THREE.Color(MODE_SETTINGS.blood.light);
  const normalSky = new THREE.Color(MODE_SETTINGS.normal.sky);
  const redSky = new THREE.Color(MODE_SETTINGS.blood.sky);
  scene.fog = new THREE.Fog(normal, MODE_SETTINGS.normal.near, MODE_SETTINGS.normal.far);
  let target = 0, blend = 0, giantBlend = 0, loadedGiant = null, time = 0;
  return {
    setBloodWorldMode(enabled) { target = enabled ? 1 : 0; },
    get blend() { return blend; },
    update(delta, assets, params, reducedMotion = false) {
      if(!reducedMotion)time+=delta;
      const step = delta / MODE_SETTINGS.transitionSeconds;
      blend = reducedMotion ? target : THREE.MathUtils.clamp(target, blend - step, blend + step);
      const giant = assets.eyes.find(eye => eye.giant)?.object;
      if (giant && giant !== loadedGiant) { loadedGiant = giant; giantBlend = 0; }
   
      giantBlend = reducedMotion ? target : THREE.MathUtils.clamp(target, giantBlend-delta/4.5, giantBlend+delta/4.5);
      const giantEase = giantBlend*giantBlend*(3-2*giantBlend);
      const t = blend * blend * (3 - 2 * blend);
      scene.fog.color.copy(normal).lerp(redFog, t);
      scene.fog.near = THREE.MathUtils.lerp(MODE_SETTINGS.normal.near, MODE_SETTINGS.blood.near, t);
      scene.fog.far = THREE.MathUtils.lerp(MODE_SETTINGS.normal.far, MODE_SETTINGS.blood.far, t);
      lights.forEach((light, i) => {
        const pulse=reducedMotion?1:0.96+0.04*Math.sin(time*0.7);
        light.intensity=originals[i].intensity*params.lightIntensity*(1-t*(light.isHemisphereLight?0.48:0.15))*(1-t+t*pulse);
        light.color.copy(originals[i].color).lerp(redLight, t * 0.9);
        if (light.groundColor) light.groundColor.copy(originals[i].ground).lerp(redFog, t);
      });
      atmosphere.sky.material.color.copy(normalSky).lerp(redSky, t).multiplyScalar(Math.pow(params.lightIntensity,0.45));
      atmosphere.mistMaterial.color.copy(normal).lerp(redFog, t);
      for(const material of atmosphere.cloudMaterials || []) material.color.copy(normalSky).lerp(redSky,t);
      
      scene.environmentIntensity = 0.32 * params.lightIntensity * (1 - t * 0.65);
      assets.updateEyeLayout?.(params.eyeSize);
      setEyeAppearance(assets, params.eyeSize, params.eyeAngle, t, giantEase);
     
      const amplitude=params.eyeMotion || 0;
      if(!reducedMotion && amplitude)assets.eyes.forEach((eye,i)=>{
        eye.object.rotateY(THREE.MathUtils.degToRad(Math.sin(time*0.16+i*1.7)*amplitude));
      });
    }
  };
}
