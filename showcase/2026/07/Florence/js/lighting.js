import * as THREE from 'three';

export function setupLighting(scene) {
  const lights = [];
  function add(light, name, position, target) {
    light.name = name;
    if (position) light.position.set(...position);
    if (target) {
      light.target.position.set(...target);
      scene.add(light.target);
    }
    scene.add(light);
    lights.push(light);
    return light;
  }

  add(new THREE.HemisphereLight('#d8e5ff', '#b86c96', 0.9), 'Sky and rose ambient');

  const key = add(new THREE.DirectionalLight('#fff0d7', 2.8),
    'Warm key — upper left', [-12, 24, 16], [0, 1, 0]);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0002;

  add(new THREE.DirectionalLight('#f3a4d0', 1.15),
    'Rose fill — right front', [16, 9, 10], [0, 2, 0]);

  add(new THREE.DirectionalLight('#b9b2ff', 1.8),
    'Lavender rim — rear', [-8, 14, -18], [0, 4, -2]);

  const eyeLight = new THREE.SpotLight('#fff0d8', 1050, 65, 0.65, 0.85, 2);
  add(eyeLight, 'Eye highlight — above front', [0, 21, 17], [0, 10, -9]);
  add(new THREE.DirectionalLight('#d6f5f4', 1.1), 'Soft submerged skylight', [-4, 32, 5], [0, -12, -5]);
  return lights;
}
