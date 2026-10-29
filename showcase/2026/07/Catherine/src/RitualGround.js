import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

export class RitualGround {
  constructor(scene, renderer) {
    this.renderer = renderer;
    this.geometry = new THREE.PlaneGeometry(1200, 1200);
    this.reflector = new Reflector(this.geometry, {
      clipBias: 0.003,
      textureWidth: this._textureWidth(),
      textureHeight: this._textureHeight(),
      color: 0x52090d,
      multisample: 0,
    });
    this.reflector.name = 'BlackMirrorGround';
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.position.y = -0.012;

    const material = this.reflector.material;
    Object.assign(material.uniforms, THREE.UniformsUtils.clone(THREE.UniformsLib.fog));
    material.vertexShader = material.vertexShader
      .replace(
        '#include <logdepthbuf_pars_vertex>',
        '#include <logdepthbuf_pars_vertex>\n#include <fog_pars_vertex>',
      )
      .replace(
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n'
          + 'gl_Position = projectionMatrix * mvPosition;\n'
          + '#include <fog_vertex>',
      );
    material.fragmentShader = material.fragmentShader
      .replace(
        '#include <logdepthbuf_pars_fragment>',
        '#include <logdepthbuf_pars_fragment>\n#include <fog_pars_fragment>',
      )
      .replace(
        '#include <tonemapping_fragment>',
        `#ifdef USE_FOG
          #ifdef FOG_EXP2
            float groundFogFactor = 1.0 - exp(
              -fogDensity * fogDensity * vFogDepth * vFogDepth
            );
          #else
            float groundFogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor.a *= 1.0 - smoothstep(0.08, 0.92, groundFogFactor);
        #endif
        #include <tonemapping_fragment>`,
      );
    material.fog = true;
    material.transparent = true;
    material.needsUpdate = true;
    scene.add(this.reflector);
  }

  _textureWidth() {
    return Math.min(1024, Math.max(256,
      Math.round(window.innerWidth * this.renderer.getPixelRatio() * 0.5)));
  }

  _textureHeight() {
    return Math.min(1024, Math.max(256,
      Math.round(window.innerHeight * this.renderer.getPixelRatio() * 0.5)));
  }

  resize() {
    this.reflector.getRenderTarget().setSize(
      this._textureWidth(),
      this._textureHeight(),
    );
  }

  dispose() {
    this.reflector.removeFromParent();
    this.reflector.getRenderTarget().dispose();
    this.geometry.dispose();
    this.reflector.material.dispose();
  }
}
