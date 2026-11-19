# WebXR

## Resources

* [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
* [Three.js VRButton](https://threejs.org/docs/pages/VRButton.html)
* [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html)

## Why WebXR?

* Use a browser to enter a 3D scene and interact with it.
* **VR (`immersive-vr`)** puts you inside a virtual space.
* **AR (`immersive-ar`)** places virtual objects in your physical surroundings.

?> **Before testing.** Use HTTPS or localhost and a browser and device that support the XR mode you want to run.

## WebXR Setup

### 1. Start with a Three.js scene

* Set up your **scene**, **camera**, and **renderer**.
* Check that the scene runs in the browser first.

### 2. Enable VR

* Import **`VRButton`** in your Three.js module.
* Enable **`renderer.xr`** and add the **Enter VR** button after creating the renderer.
* Use **`local-floor`** to place the reference space's origin at floor level.

```javascript
import { VRButton } from "three/addons/webxr/VRButton.js";

// After creating the renderer
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
document.body.append(VRButton.createButton(renderer));
```

### 3. Use the XR animation loop

* Use **`renderer.setAnimationLoop()`** for rendering. If your scene already uses it, keep that loop.

```javascript
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

## Interaction

* **Controller ray:** Point at an object, then use the **`select`** event to interact.
* **Hand tracking:** Use fingertip positions and pinch gestures on supported devices.
* **AR hit testing:** Find a real surface before placing a virtual object.
