import * as THREE from 'three';
import { WORLD_SETTINGS } from './world-layers.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collectEyeObstacles, createSafeEyeballPlacement, arrangeEyeLayout } from './eye-placement.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

// Edit these control points to change the architectural currents. Speed is
// complete circuits per second; paired fish share a path with different phases.
export function createFishCurrents() {
  const paths = [
    // Through the existing pink upper-left arch (center -7.55, 5.7, -5.55).
    [[-7.55,5.7,-9],[-7.55,5.7,-5.55],[-7.55,5.7,-2.5],[-11,5.3,-0.5],[-13,5.5,-6],[-11,5.7,-10]],
    // Through the mint right-hand arch, then between the two stair levels.
    [[6.8,1.55,-6],[6.8,1.55,-2.95],[6.8,1.55,0.2],[10.7,2.2,2],[12,2.8,-3],[10,2,-7]],
    // A larger foreground fish rises beside the new wide approach stair.
    [[-10,-3,14],[-10,0.8,8],[-10,1.7,5],[-13,2,3],[-15,1,8],[-14,-2,14]],
    // Tiny fish follow the distant gallery rather than the central silhouette.
    [[-18,3.1,-27],[-18,3.1,-24.3],[-18,3.1,-21],[-15,3,-20],[-13,4,-24],[-15,4,-28]]
  ];
  paths[3].forEach(point => { point[2] *= WORLD_SETTINGS.backgroundDepth; });
  const curves = paths.map(points => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), true, 'centripetal'));
  const fishSpecs = [
    { size: 1.45, route: 0, phase: 0, speed: 0.018 },
    { size: 1.0, route: 0, phase: 0.16, speed: 0.018 },
    { size: 1.25, route: 1, phase: 0.1, speed: 0.016 },
    { size: 0.85, route: 1, phase: 0.28, speed: 0.016 },
    { size: 2.7, route: 2, phase: 0.05, speed: 0.012 },
    { size: 0.65, route: 3, phase: 0.3, speed: 0.015 }
  ];
  return fishSpecs.map(spec => ({ ...spec, curve: curves[spec.route] }));
}

export const SCHOOL_SETTINGS = { countPerSchool: 7, sizeMultiplier: 1.35, speedMultiplier: 0.75 };
export function createFishSchool() {
  const currents = createFishCurrents();
  const curves = [currents[0].curve, currents[2].curve, currents[4].curve, currents[5].curve];
  // Two additional currents under the world follow the descending galleries.
  for (const points of [
    [[-12,-8,10],[-4,-7,10],[6,-9,6],[10,-12,-6],[0,-12,-7],[-13,-10,0]],
    [[-17,-20,-17],[-8,-19,-12],[5,-21,-18],[8,-24,-29],[-6,-25,-36],[-20,-22,-30]]
  ]) curves.push(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),true,'centripetal'));
  const fish = [];
  curves.forEach((curve, school) => {
    for(let i=0;i<SCHOOL_SETTINGS.countPerSchool;i++) {
      // Most are the 522-triangle animated koi; heavier assets appear sparingly.
      const kind = i === 2 ? 'fish02' : i === 5 ? 'fish03' : i === 0 ? 'fish' : 'fish01';
      const size = [1.6,1.5,3.4,1.8,2.5,2.2][school] * (0.85+(i%3)*0.12) * SCHOOL_SETTINGS.sizeMultiplier;
      fish.push({kind,curve,size,phase:(0.07*i+school*0.11)%1,
        speed:(0.012+school*0.0007)*SCHOOL_SETTINGS.speedMultiplier,
        offset:new THREE.Vector3(0,(i%3-1)*0.2,0)});
    }
  });
  return fish;
}

export const RED_EYE_SETTINGS = { size: 100, position: [5, 15, -100], target: [0, -6, 0] };

// Models are loaded once and instanced with shared geometry/textures. Skeleton
// cloning gives each fish its own bones, so their animation phases can differ.
export async function loadProps(scene, world, onStatus) {
  const obstacles = collectEyeObstacles(world);
  const occupied = [];
  const loader = new GLTFLoader();
  const definitions = [
    ['eye', 'blue_eyeball_free.glb'],
    ['redEye', 'red_vile_hatred_eyeball_-_blender_file.glb'],
    ['fish', 'golden_fish.glb'],
    ['fish01', 'fish_01.glb'],
    ['fish02', 'fish_02.glb'],
    ['fish03', 'fish_03.glb'],
    ['tv', 'old_television.glb']
  ];
  const results = await Promise.allSettled(definitions.map(async ([kind, file]) => {
    const gltf = await loader.loadAsync(`./assets/${file}`);
    onStatus(file);
    return { kind, gltf };
  }));
  const models = {};
  const failed = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') models[result.value.kind] = result.value.gltf;
    else failed.push(definitions[i][1]);
  });
  const props = new THREE.Group();
  props.name = 'Floating witnesses';
  scene.add(props);
  const mixers = [];
  const placed = [];

  function place(kind, size, position, rotation, phase) {
    if (!models[kind]) return null;
    const model = clone(models[kind].scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3());
    // A tight vertex radius avoids treating a round eye like a box diagonal.
    let radius = extent.length() / 2;
    if (kind === 'eye' || kind === 'redEye') {
      radius = 0;
      const vertex = new THREE.Vector3();
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
          radius = Math.max(radius, vertex.distanceTo(center));
        }
      });
    }
    // Keep original mesh, textures, and relative transforms intact. Normalize
    // with parent groups, since source GLBs use very different units/origins.
    const centered = new THREE.Group();
    model.position.sub(center);
    centered.add(model);
    centered.scale.setScalar(size / Math.max(extent.x, extent.y, extent.z));
    const object = new THREE.Group();
    object.name = `${kind} ${placed.filter(p => p.kind === kind).length + 1}`;
    object.add(centered);
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    model.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = !kind.startsWith('fish');
      child.receiveShadow = true;
    });
    // Align each model's longest horizontal axis with the path tangent (+Z).
    if (kind.startsWith('fish')) centered.rotation.y = extent.x > extent.z ? -Math.PI / 2 : 0;
    if(kind==='eye') model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const copy=material=>{const m=material.clone();m.fog=false;return m;};
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);
    });
    if(kind==='eye' || kind==='redEye') object.visible=false;
    props.add(object);
    object.userData.boundRadius = radius * size / Math.max(extent.x, extent.y, extent.z);
    object.userData.height = extent.y * size / Math.max(extent.x, extent.y, extent.z);

    if (kind.startsWith('fish') && models[kind].animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(models[kind].animations[0]).play();
      mixer.setTime(phase);
      mixer.fishObject=object;
      mixers.push(mixer);
    }
    placed.push({ kind, object, size });
    return object;
  }

  // One partly screened observer and two tiny, distant discoveries. The GUI
  // still scales/turns all eyes relative to their own base size and gaze.
  const eyes = [];
  function positionEye(object, spec, bloodOnly, phase) {
    // Reserve space for maximum GUI scale + full blood enlargement + bobbing.
    const radius = object.userData.boundRadius * 1.5 * BLOOD_EYE_SCALE + 0.05;
    const position = createSafeEyeballPlacement(spec.position, radius, obstacles, occupied);
    object.position.copy(position);
    occupied.push({ center: position.clone(), radius });
    object.userData.clearanceRadius = radius;
    object.lookAt(...spec.target);
    // Eye positions remain fixed after composition-aware placement.
    eyes.push({object,base:object.quaternion.clone(),bloodOnly});
  }
  for (const [i, spec] of world.layers.eyePlacements.entries()) {
    const object = place('eye', spec.size, spec.position, null, i * 1.7);
    if (!object) continue;
    positionEye(object, spec, false, i * 1.7);
  }

  // Three additional observers reuse the loaded eye geometry and textures.
  // Start hidden, including when assets finish loading during a mode transition.
  for (const [i, spec] of BLOOD_EYES.entries()) {
    const object = place('eye', spec.size, spec.position, null, i * 2.1);
    if (!object) continue;
    positionEye(object, spec, true, i * 2.1);
    object.visible = false;
    object.scale.setScalar(0.001);

  }

  // This giant is already authored at monumental scale: do not multiply it
  // again by BLOOD_EYE_SCALE. Reserve its maximum slider size before placement.
  const red = place('redEye', RED_EYE_SETTINGS.size, RED_EYE_SETTINGS.position, null, 0);
  if (red) {
    const radius = red.userData.boundRadius * 1.5 + 0.1;
    red.position.copy(createSafeEyeballPlacement(RED_EYE_SETTINGS.position,radius,obstacles,occupied));
    red.lookAt(...RED_EYE_SETTINGS.target);
    red.userData.clearanceRadius=radius;
    const fadeMaterials=[];
    red.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const prepare = material => {
        const copy=material.clone();
        fadeMaterials.push({material:copy,opacity:copy.opacity});
        copy.transparent=true;copy.opacity=0;copy.depthWrite=false;
        // Distant fog should not erase the upper-sky silhouette.
        copy.fog=false;
        return copy;
      };
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(prepare):prepare(mesh.material);
      mesh.castShadow=false;
    });
    red.visible=false;
    eyes.push({object:red,base:red.quaternion.clone(),bloodOnly:true,giant:true,fadeMaterials});
  }
  let layoutSize = null;
  function updateEyeLayout(size) {
    if(layoutSize===size)return;
    arrangeEyeLayout(eyes,obstacles,size);
    layoutSize=size;
  }
  updateEyeLayout(1);
  const swimmers = [];
  const originalFish = createFishSchool();
  // Hidden reserve copies use the original paths and scale, not the removed
  // wandering-fish generator. They only appear when the count is increased.
  const fishPool = [...originalFish, ...originalFish.map(spec=>({...spec,phase:(spec.phase+0.48)%1}))];
  for (const spec of fishPool) {
    const curve = spec.curve;
    const object = place(spec.kind, spec.size, curve.getPointAt(spec.phase).toArray(), null, spec.phase * 6);
    if (object) swimmers.push({ object, curve, phase: spec.phase, speed: spec.speed, offset: spec.offset });
  }

  // No TV bobbing: these props now sit on ledges or hang from real supports.
  for (const spec of world.layers.tvMounts) {
    const object = place('tv', spec.size, spec.position, [0, spec.yaw, 0], 0);
    if (object) object.position.y += (spec.anchor === 'bottom' ? 1 : -1) * object.userData.height / 2;
  }
  swimmers.forEach((fish,i)=>{fish.object.visible=i<42;});
  return { props, mixers, placed, failed, eyes, swimmers, updateEyeLayout };
}

export const BLOOD_EYES = [
  { size: 4.2, position: [-26, -8, 16], target: [2, 1, 8] },
  { size: 3.5, position: [24, -17, 4], target: [10, 4, 18] },
  { size: 4.6, position: [0, 25, -52], target: [0, 1, 4] }
];
export const BLOOD_EYE_SCALE = 2.2;

export function setEyeAppearance(assets, scale, angle, bloodBlend = 0, giantBlend = bloodBlend) {
  for (const [i, eye] of assets.eyes.entries()) {
    const reveal = eye.giant ? giantBlend : bloodBlend;
    if(eye.giant) for(const item of eye.fadeMaterials) item.material.opacity=item.opacity*reveal;
    eye.object.visible = reveal > 0.001;
    eye.object.scale.setScalar(Math.max(0.001, scale * (eye.giant ? 0.92 + 0.08 * reveal : (1 + (BLOOD_EYE_SCALE - 1) * bloodBlend) * reveal)));
    const yaw = THREE.MathUtils.degToRad(angle * (i === 0 || eye.giant ? 1 : -0.65));
    eye.object.quaternion.copy(eye.base).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  }
}

export function setFishCount(assets, count) {
  const limit=Math.max(0,Math.min(84,Math.round(count)));
  assets.swimmers.forEach((fish,i)=>{fish.object.visible=i<limit;});
}

export function updateSwimmers(assets, time) {
  for (const fish of assets.swimmers) {
    if(!fish.object.visible)continue;
    if (fish.curve) {
      const progress = (time * fish.speed + fish.phase) % 1;
      fish.object.position.copy(fish.curve.getPointAt(progress));
      if (fish.offset) fish.object.position.add(fish.offset);
      const direction = fish.curve.getTangentAt(progress);
      fish.object.lookAt(fish.object.position.clone().add(direction));
    } else {
      // Compatibility for simple independent swimmer tests / future variants.
      const t = time * fish.speed + fish.phase;
      fish.object.position.x = fish.origin.x + Math.sin(t) * fish.span;
      fish.object.position.z = fish.origin.z + Math.cos(t) * 1.2;
      const direction = new THREE.Vector3(Math.cos(t) * fish.span, 0, -Math.sin(t) * 1.2);
      fish.object.lookAt(fish.object.position.clone().add(direction));
    }
  }
}
