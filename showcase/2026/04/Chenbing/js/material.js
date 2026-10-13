let cubeMaterial

const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 0.95,
    opacity: 1.0,
    transparent: true,

    roughness: 0.35,
    metalness: 0.0,

    ior: 1.5,
    thickness: 1.2,

    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
});

const clearGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#ffffff',
  transmission: 1.0,
  opacity: 1.0,
  transparent: true,

  roughness: 0.0,
  metalness: 0.0,

  ior: 1.5,
  thickness: 0.5,

  clearcoat: 1.0,
  clearcoatRoughness: 0.0,
});

const laserMaterial = new THREE.MeshPhysicalMaterial({
  color: '#000000',
  roughness: 0.1,
  metalness: 0.1,

  iridescence: 1.0, // laser strength
  iridescenceIOR: 1.3, // laser color 
  iridescenceThicknessRange: [100, 400], // laser thickness

  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
});
