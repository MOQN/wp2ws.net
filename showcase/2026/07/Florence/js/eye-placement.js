import * as THREE from 'three';

export const EYE_CLEARANCE = 0.8;
export function collectEyeObstacles(world) {
  const boxes = [];
  const matrix = new THREE.Matrix4();
  for (const distance of [1.05, 1.6]) {
    world.setStairDistance(distance);
    world.architecture.updateMatrixWorld(true);
    let index = 0;
    world.architecture.traverse(mesh => {
      if (!mesh.isMesh || mesh.userData.walkProxy) return;
      mesh.geometry.computeBoundingBox();
      const count = mesh.isInstancedMesh ? mesh.count : 1;
      for (let i = 0; i < count; i++) {
        if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld); }
        else matrix.copy(mesh.matrixWorld);
        const box = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
        if (boxes[index]) boxes[index].union(box); else boxes[index] = box;
        index++;
      }
    });
  }
  world.setStairDistance(1.27);
  world.architecture.updateMatrixWorld(true);

  for (const tv of world.layers.tvMounts) boxes.push(new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(...tv.position), new THREE.Vector3(1,2,1).multiplyScalar(tv.size * 2)));
  return boxes;
}

export function createSafeEyeballPlacement(preferred, radius, boxes, occupied = []) {
  const origin = new THREE.Vector3(...preferred);
  const sphere = new THREE.Sphere(origin.clone(), radius + EYE_CLEARANCE);
  const clear = p => {
    sphere.center.copy(p);
    return boxes.every(box => !box.intersectsSphere(sphere)) &&
      occupied.every(other => p.distanceTo(other.center) > radius + other.radius + EYE_CLEARANCE);
  };
  if (clear(origin)) return origin;
  // Search outward in deterministic shells, favoring the authored region.
  for (let shell = 2; shell <= 130; shell += 2) {
    for (let i = 0; i < 80; i++) {
      const y = 1 - 2 * (i + 0.5) / 80;
      const angle = i * 2.399963229728653;
      const r = Math.sqrt(1-y*y);
      const p = origin.clone().addScaledVector(new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r),shell);
      if (clear(p)) return p;
    }
  }
  throw new Error('No safe eye placement found; reduce eye size or adjust its preferred position.');
}

export function arrangeEyeLayout(eyes, boxes, size = 1) {
  const camera = new THREE.PerspectiveCamera(46, 1.5, 0.1, 2000);
  camera.position.set(18,14,26);camera.lookAt(-1,2.5,-1);camera.updateMatrixWorld();
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const tan=Math.tan(THREE.MathUtils.degToRad(23));
  const slots=[[-0.85,0.68,62],[-0.85,-0.28,64],[-0.22,0.05,72],[0.4,-0.75,72],[-0.3,-0.9,86],[-0.1,0.92,94]];
  const ordered=[...eyes.filter(e=>e.giant),...eyes.filter(e=>!e.giant)];
  const occupied=[],screens=[];
  for(const eye of ordered) {
    const slot=eye.giant?[1.13,0.95,125]:slots[eyes.filter(e=>!e.giant).indexOf(eye)];
    const radius=eye.object.userData.boundRadius*size*(eye.giant?1:2.2)+0.1;
    let position,depth=Math.max(slot[2],radius/(tan*(eye.giant?0.85:0.30))),screen;
    for(let attempt=0;attempt<500;attempt++,depth+=4) {
      position=camera.position.clone().addScaledVector(forward,depth)
        .addScaledVector(right,slot[0]*depth*tan*1.5).addScaledVector(up,slot[1]*depth*tan);
      const sphere=new THREE.Sphere(position,radius+EYE_CLEARANCE);
  
      const bounds=(coordinate,fovTan)=>{
        const center=coordinate*depth*fovTan,denom=depth*depth-radius*radius;
        const reach=radius*Math.sqrt(depth*depth+center*center-radius*radius);
        return {mid:center*depth/denom/fovTan,half:reach/denom/fovTan};
      };
      const horizontal=bounds(slot[0],tan*1.5),vertical=bounds(slot[1],tan);
      screen={x:horizontal.mid,y:vertical.mid,rx:horizontal.half,ry:vertical.half};
      const separate=screens.every(s=>Math.abs(screen.x-s.x)>screen.rx+s.rx+0.04 || Math.abs(screen.y-s.y)>screen.ry+s.ry+0.04);
      if(separate&&boxes.every(b=>!b.intersectsSphere(sphere))&&occupied.every(s=>position.distanceTo(s.center)>radius+s.radius+EYE_CLEARANCE))break;
      if(attempt===499)throw new Error('Eye layout could not find a clear position');
    }
    eye.object.position.copy(position);eye.object.userData.clearanceRadius=radius;
    eye.object.lookAt(0,-6,0);eye.base.copy(eye.object.quaternion);
    occupied.push({center:position.clone(),radius});screens.push(screen);
  }
  return screens;
}
