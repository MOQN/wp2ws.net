const ROOM_CONFIG = {
  position: { x: 0, y: 900, z: 3000 },
  rotationY: -Math.PI / 2,
  size: { width: 900, height: 600, depth: 1000 },
  wallThickness: 30,
  colors: {
    walls: 0x3b4148,
    floor: 0x555b62,
    windowFrame: 0x000000,
    glass: 0xa6bac7,
  },
  window: {
    width: 760,
    height: 430,
    centerY: 360,
    frameThickness: 24,
    glassOpacity: 0.12,
  },
  eyeHeight: 400, // camera height
  viewTarget: { x: 0, y: 400, z: 0 },
};

const BED_CONFIG = {
  assetPath: "assets/modern%20bed%203d%20model.glb",
  position: { x: -150, y: 0, z: -300 },
  rotationY: Math.PI / 2,
  maxSize: { x: 560, y: 240, z: 420 },
};

const DESK_CONFIG = {
  assetPath: "assets/wooden%20desk%20with%20hutch%203d%20model.glb",
  position: { x: -150, y: 0, z: 315 }, 
  rotationY: 45, 
  maxSize: { x: 460, y: 480, z: 330 },
};

let roomGroup;
let cityWindowMesh;
let cityWindowAnchor;
let bedPlacement;
let bedHoverAnchor;
let deskPlacement;
let deskHoverAnchor;

function createViewRoom() {
  const { position, size, colors, window: windowConfig, wallThickness } = ROOM_CONFIG;
  const { width, height, depth } = size;
  const room = new THREE.Group();
  room.position.set(position.x, position.y, position.z);
  room.rotation.y = ROOM_CONFIG.rotationY;
  roomGroup = room;

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const wallMaterial = new THREE.MeshPhongMaterial({
    color: colors.walls,
    side: THREE.DoubleSide,
  });
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: colors.floor,
    side: THREE.DoubleSide,
  });
  const frameMaterial = new THREE.MeshBasicMaterial({
    color: colors.windowFrame,
    side: THREE.DoubleSide,
  });
  const glassMaterial = new THREE.MeshPhongMaterial({
    color: colors.glass,
    transparent: true,
    opacity: windowConfig.glassOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  addRoomBox(room, boxGeometry, floorMaterial, width, wallThickness, depth, 0, 0, 0);
  addRoomBox(room, boxGeometry, wallMaterial, width, wallThickness, depth, 0, height, 0);
  addRoomBox(room, boxGeometry, wallMaterial, wallThickness, height, depth, width / 2, height / 2, 0);
  addRoomBox(room, boxGeometry, wallMaterial, width, height, wallThickness, 0, height / 2, -depth / 2);
  addRoomBox(room, boxGeometry, wallMaterial, width, height, wallThickness, 0, height / 2, depth / 2);
  addFrontWallWithWindow(room, boxGeometry, wallMaterial, frameMaterial, glassMaterial);
  addBed(room);
  addDesk(room);

  return room;
}

function addBed(room) {
  bedPlacement = new THREE.Group();
  bedPlacement.name = "bed-placement";
  bedPlacement.position.set(
    BED_CONFIG.position.x,
    ROOM_CONFIG.wallThickness / 2 + BED_CONFIG.position.y,
    BED_CONFIG.position.z
  );
  room.add(bedPlacement);
  bedHoverAnchor = new THREE.Object3D();
  bedHoverAnchor.position.y = BED_CONFIG.maxSize.y + 10;
  bedPlacement.add(bedHoverAnchor);

  new GLTFLoader().load(
    BED_CONFIG.assetPath,
    (gltf) => {
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());

      model.position.set(-center.x, -bounds.min.y, -center.z);
      const fitScale = Math.min(
        BED_CONFIG.maxSize.x / size.x,
        BED_CONFIG.maxSize.y / size.y,
        BED_CONFIG.maxSize.z / size.z
      );
      const alignLongSide = new THREE.Group();
      alignLongSide.add(model);
      alignLongSide.rotation.y = BED_CONFIG.rotationY;
      alignLongSide.scale.setScalar(fitScale);
      bedPlacement.add(alignLongSide);
    },
    undefined,
    (error) => console.error("Could not load the bed model:", error)
  );
}

function addDesk(room) {
  deskPlacement = new THREE.Group();
  deskPlacement.name = "desk-placement";
  deskPlacement.position.set(
    DESK_CONFIG.position.x,
    ROOM_CONFIG.wallThickness / 2 + DESK_CONFIG.position.y,
    DESK_CONFIG.position.z
  );
  room.add(deskPlacement);

  deskHoverAnchor = new THREE.Object3D();
  deskPlacement.add(deskHoverAnchor);

  new GLTFLoader().load(
    DESK_CONFIG.assetPath,
    (gltf) => {
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -bounds.min.y, -center.z);

      const fitScale = Math.min(
        DESK_CONFIG.maxSize.x / size.x,
        DESK_CONFIG.maxSize.y / size.y,
        DESK_CONFIG.maxSize.z / size.z
      );
      const orientedModel = new THREE.Group();
      orientedModel.add(model);
      orientedModel.rotation.y = DESK_CONFIG.rotationY;
      orientedModel.scale.setScalar(fitScale);
      deskPlacement.add(orientedModel);
      deskHoverAnchor.position.y = size.y * fitScale + 10;
    },
    undefined,
    (error) => console.error("Could not load the desk model:", error)
  );
}

function addFrontWallWithWindow(room, boxGeometry, wallMaterial, frameMaterial, glassMaterial) {
  const { size, wallThickness, window: windowConfig } = ROOM_CONFIG;
  const { width, height, depth } = size;
  const frontX = -width / 2;
  const openingWidth = Math.min(windowConfig.width, depth - 60);
  const openingHeight = Math.min(windowConfig.height, height - 60);
  const centerY = Math.min(
    height - openingHeight / 2 - wallThickness,
    Math.max(openingHeight / 2 + wallThickness, windowConfig.centerY)
  );
  const windowBottom = centerY - openingHeight / 2;
  const windowTop = centerY + openingHeight / 2;
  const sideSection = (depth - openingWidth) / 2;
  const topSection = height - windowTop;

  addRoomBox(room, boxGeometry, wallMaterial, wallThickness, height, sideSection,
    frontX, height / 2, -(depth - sideSection) / 2);
  addRoomBox(room, boxGeometry, wallMaterial, wallThickness, height, sideSection,
    frontX, height / 2, (depth - sideSection) / 2);
  addRoomBox(room, boxGeometry, wallMaterial, wallThickness, windowBottom, openingWidth,
    frontX, windowBottom / 2, 0);
  addRoomBox(room, boxGeometry, wallMaterial, wallThickness, topSection, openingWidth,
    frontX, windowTop + topSection / 2, 0);

  const frame = Math.min(windowConfig.frameThickness, openingWidth / 6, openingHeight / 6);
  const frameX = frontX + wallThickness / 2 + 4;
  addRoomBox(room, boxGeometry, frameMaterial, 8, openingHeight, frame,
    frameX, centerY, -openingWidth / 2 + frame / 2);
  addRoomBox(room, boxGeometry, frameMaterial, 8, openingHeight, frame,
    frameX, centerY, openingWidth / 2 - frame / 2);
  addRoomBox(room, boxGeometry, frameMaterial, 8, frame, openingWidth,
    frameX, windowBottom + frame / 2, 0);
  addRoomBox(room, boxGeometry, frameMaterial, 8, frame, openingWidth,
    frameX, windowTop - frame / 2, 0);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(openingWidth - frame * 2, openingHeight - frame * 2),
    glassMaterial
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.set(frameX + 4, centerY, 0);
  glass.name = "city-view-window";
  cityWindowMesh = glass;
  room.add(glass);

  cityWindowAnchor = new THREE.Object3D();
  cityWindowAnchor.position.set(frameX + 4, centerY, 0);
  room.add(cityWindowAnchor);
}

function addRoomBox(group, geometry, material, width, height, depth, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  group.add(mesh);
}

function setupRoomView(scene, camera, controls, canvas) {
  const roomCenterX = ROOM_CONFIG.position.x;
  const lateralHalfSpan = ROOM_CONFIG.size.depth / 2 - ROOM_CONFIG.wallThickness - 40;
  const minX = roomCenterX - lateralHalfSpan;
  const maxX = roomCenterX + lateralHalfSpan;
  const roomY = ROOM_CONFIG.position.y + ROOM_CONFIG.eyeHeight;
  const cityCameraPosition = new THREE.Vector3(0, 0, 1000);
  const cityCameraTarget = new THREE.Vector3(0, 0, 0);
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const tooltip = document.createElement("div");
  tooltip.className = "cityview-tooltip";
  tooltip.textContent = "My room has a view of the city. At least there is something nice in this shoebox.";
  tooltip.setAttribute("aria-hidden", "true");
  container.appendChild(tooltip);

  let viewMode = "room";
  let dragging = false;
  let lastPointerX = 0;

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const windowHit = raycaster.intersectObject(cityWindowMesh, false)[0];
    const bedHit = raycaster.intersectObject(bedPlacement, true)[0];
    const deskHit = raycaster.intersectObject(deskPlacement, true)[0];
    const hits = [
      windowHit && { target: "window", distance: windowHit.distance },
      bedHit && { target: "bed", distance: bedHit.distance },
      deskHit && { target: "desk", distance: deskHit.distance },
    ].filter(Boolean);
    hits.sort((a, b) => a.distance - b.distance);
    return hits[0]?.target ?? null;
  }

  function updateTooltip(hoverTarget) {
    if (viewMode !== "room" || !hoverTarget) {
      tooltip.style.display = "none";
      return;
    }
    const isBed = hoverTarget === "bed";
    const isDesk = hoverTarget === "desk";
    tooltip.textContent = isBed
      ? "My bed. Really warm and comfy especially on a rainy day like this."
      : isDesk
        ? "My desk. A lot of work has been done here."
        : "Cityview window. I can see the city skyline from here, and it is a nice view.";
    const bounds = container.getBoundingClientRect();
    const anchor = isBed ? bedHoverAnchor : isDesk ? deskHoverAnchor : cityWindowAnchor;
    const screenPosition = anchor.getWorldPosition(new THREE.Vector3());
    screenPosition.project(camera);
    const anchorX = ((screenPosition.x + 1) / 2) * bounds.width;
    const anchorY = ((1 - screenPosition.y) / 2) * bounds.height;
    tooltip.style.display = "block";
    const margin = 12;
    const gap = 14;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    let left = anchorX + gap;
    if (left + tooltipWidth > bounds.width - margin) left = anchorX - tooltipWidth - gap;
    let top = anchorY + gap;
    if (top + tooltipHeight > bounds.height - margin) top = anchorY - tooltipHeight - gap;
    left = THREE.MathUtils.clamp(left, margin, Math.max(margin, bounds.width - tooltipWidth - margin));
    top = THREE.MathUtils.clamp(top, margin, Math.max(margin, bounds.height - tooltipHeight - margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function setViewMode(mode) {
    viewMode = mode === "city" ? "city" : "room";
    const inRoom = viewMode === "room";
    tooltip.style.display = "none";
    if (inRoom) {
      if (roomGroup.parent !== scene) scene.add(roomGroup);
      camera.position.set(roomCenterX, roomY, ROOM_CONFIG.position.z+200);
      controls.target.set(
        ROOM_CONFIG.viewTarget.x,
        ROOM_CONFIG.viewTarget.y,
        ROOM_CONFIG.viewTarget.z 
      );
      controls.enabled = false;
      canvas.style.cursor = "ew-resize";
    } else {
      if (roomGroup.parent === scene) scene.remove(roomGroup);
      camera.position.copy(cityCameraPosition);
      controls.target.copy(cityCameraTarget);
      controls.enabled = true;
      canvas.style.cursor = "grab";
    }
    controls.update();
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (viewMode !== "room" || event.button !== 0) return;
    dragging = true;
    lastPointerX = event.clientX;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (viewMode !== "room") return;
    if (dragging) {
      const deltaX = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      const previousX = camera.position.x;
      camera.position.x = THREE.MathUtils.clamp(previousX + deltaX * 1.5, minX, maxX);
      controls.target.x += camera.position.x - previousX;
    }
    const hoverTarget = updatePointer(event);
    updateTooltip(hoverTarget);
    canvas.style.cursor = dragging ? "grabbing" : hoverTarget ? "pointer" : "ew-resize";
  });

  const stopDragging = () => {
    dragging = false;
    if (viewMode === "room") canvas.style.cursor = "ew-resize";
  };
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("pointerleave", () => {
    if (!dragging) updateTooltip(false);
  });
  canvas.addEventListener("click", (event) => {
    if (viewMode === "room" && updatePointer(event) === "window") setViewMode("city");
  });

  setViewMode("room");
  return setViewMode;
}
