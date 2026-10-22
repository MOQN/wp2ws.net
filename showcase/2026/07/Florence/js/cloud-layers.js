import * as THREE from 'three';
export const CLOUD_SETTINGS = { opacity: 0.65, feather: 0.08, blur: 1.5 };

export function extractCloudAlpha(data, width, height) {
  const background = new Uint8Array(width*height);
  const queue = new Int32Array(width*height); let head=0, tail=0;
  const luminance = i => (data[i*4]+data[i*4+1]+data[i*4+2])/3;
  const add = i => {if(!background[i] && luminance(i)>246){background[i]=1;queue[tail++]=i;}};
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
  for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x<width-1)add(i+1);if(y)add(i-width);if(y<height-1)add(i+width);}
  for(let i=0;i<width*height;i++) {
    const lum=luminance(i), x=i%width,y=Math.floor(i/width);
    const edge=Math.min(1,x/(width*CLOUD_SETTINGS.feather),(width-1-x)/(width*CLOUD_SETTINGS.feather),y/(height*CLOUD_SETTINGS.feather),(height-1-y)/(height*CLOUD_SETTINGS.feather));
    const alpha=background[i]?0:Math.max(0.35,Math.min(1,(255-lum)/28));
    data[i*4]=data[i*4+1]=data[i*4+2]=Math.round(224+lum*0.12);
    data[i*4+3]=Math.round(alpha*edge*edge*(3-2*edge)*255);
  }
  return data;
}
export function processCloudTextureAlpha(image) {
  const canvas=document.createElement('canvas');
  canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  extractCloudAlpha(pixels.data,canvas.width,canvas.height);ctx.putImageData(pixels,0,0);
  const soft=document.createElement('canvas');soft.width=canvas.width;soft.height=canvas.height;
  const s=soft.getContext('2d');s.filter=`blur(${CLOUD_SETTINGS.blur}px)`;s.drawImage(canvas,0,0);
  const texture=new THREE.CanvasTexture(soft);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
export async function loadCloudLayers(scene, atmosphere, onStatus) {
  const group=new THREE.Group();group.name='Photographic cloud silhouettes softened into dream layers';scene.add(group);
  atmosphere.cloudMaterials=[];
  const specs=[[-30,14,-48,43],[2,18,-62,52],[35,6,-54,46],[-38,-5,-25,35],
    [-12,-13,0,25],[12,-20,-10,32],[-17,-27,-23,38],[7,-34,-35,48],
    [-30,-22,15,40],[35,-14,6,35],[2,25,35,40],[0,-38,12,55]];
  const failures=[];
  const results=await Promise.allSettled([1,2].map(async(n)=>{
    const file=`cloud_0${n}.jpg`;
    const texture=await new THREE.TextureLoader().loadAsync(`./assets/${file}`);
    const cutout=processCloudTextureAlpha(texture.image);texture.dispose();
    const material=new THREE.SpriteMaterial({map:cutout,transparent:true,opacity:CLOUD_SETTINGS.opacity,depthWrite:false,fog:true,color:'#f3faff'});
    atmosphere.cloudMaterials.push(material);
    specs.filter((_,i)=>i%2===n-1).forEach(([x,y,z,w])=>{
      const cloud=new THREE.Sprite(material);cloud.position.set(x,y,z);cloud.scale.set(w,w*cutout.image.height/cutout.image.width,1);group.add(cloud);
    });
    
    const canvas=atmosphere.sky.material.map.image,ctx=canvas.getContext('2d');
    ctx.save();ctx.globalAlpha=0.6;ctx.filter='blur(3px)';
    for(let i=0;i<5;i++) for(const wrap of [-1024,0,1024])
      ctx.drawImage(cutout.image,wrap+i*230+(n-1)*85-80,150+(i%2)*90,330,150);
    ctx.restore();atmosphere.sky.material.map.needsUpdate=true;
    onStatus(file);
  }));
  results.forEach((result,i)=>{if(result.status==='rejected'){failures.push(`cloud_0${i+1}.jpg`);console.error(result.reason);}});
  return {group,failures};
}
