# Virtual Self: Navigation
<h1>Week 09 | Nov 3 & 5, 2026</h1>

## Concepts and Activities

### Lecture

* Controls
  * [OrbitControls](https://threejs.org/docs/examples/en/controls/OrbitControls.html)
    * [TrackballControls](https://threejs.org/docs/?q=TrackballControls#examples/en/controls/TrackballControls)
    * [ArcballControls](https://threejs.org/docs/#examples/en/controls/ArcballControls)
  * [MapControls](https://threejs.org/examples/?q=controls#misc_controls_map)
  * [DragControls](https://threejs.org/docs/examples/en/controls/DragControls.html)
  * [TransformControls](https://threejs.org/docs/pages/TransformControls.html)
  * [FlyControls](https://threejs.org/docs/examples/en/controls/FlyControls.html)
  * [FirstPersonControls](https://threejs.org/docs/pages/FirstPersonControls.html)
  * [PointerLockControls](https://threejs.org/docs/examples/en/controls/PointerLockControls.html)
* Camera
  * [lookAt()](https://threejs.org/docs/index.html?q=object#api/en/core/Object3D.lookAt)
  * LookAtVector with Quaternion
* Character Manual Control
  * WASD for movement
  * Mouse for looking around
  * Space to jump
  * Third-person view
    * Camera follows behind the character

#### Quaternion Methods

* Applying a Quaternion to a Vector
  * **`vector.applyQuaternion(quaternion)`**
    * Rotates a `Vector3` in place.
    * For a character with local forward direction `(0, 0, -1)`, apply its orientation to find which way it faces. If the character has a rotated parent, use its world quaternion.
    * Apply the same rotation to a third-person camera offset so the camera stays behind the character as it turns.
* Useful Quaternion Methods in Three.js
  * **`quaternion.setFromAxisAngle(axis, angle)`**
    * Sets a rotation about a unit axis. The angle is in radians.
    * Example: turn a character 90° around the Y axis.
  * **`quaternion.setFromUnitVectors(from, to)`**
    * Finds the rotation that turns one unit direction into another.
    * Example: align an arrow's local forward direction with its normalized movement direction.
  * **`quaternion.setFromEuler(euler)`**
    * Converts an Euler rotation, such as `mesh.rotation`, into a quaternion.
    * Example: apply that rotation to a movement vector or camera offset.
  * **`quaternion.copy(source)`**
    * Copies an orientation into an existing quaternion.
    * Example: give a first-person camera the same orientation as its character when both use the same coordinate space.
  * **`quaternion.slerpQuaternions(start, end, t)`**
    * Sets an orientation between two saved poses using spherical interpolation.
    * Example: use a slider from `0` to `1` to move between the two poses.
  * **`quaternion.slerp(target, t)`**
    * Moves a fraction of the remaining rotation from the current orientation toward a target.
    * Example: use `t = 0.05` each frame to turn quickly at first and then ease toward the target.
  * **`quaternion.rotateTowards(target, step)`**
    * Turns toward a target by up to `step` radians without overshooting.
    * Example: turn a camera by up to 1° per frame until it reaches the target.
  * **`quaternion.angleTo(other)`**
    * Measures the angle between two orientations in radians.
    * Example: check how far a character still needs to turn.
  * **`quaternion.multiply(other)`** and **`quaternion.premultiply(other)`**
    * Combine rotations in place. `q.multiply(r)` sets `q` to `q × r`; `q.premultiply(r)` sets it to `r × q`.
    * Order matters: turning about Y and then tilting about X can give a different result from tilting first.
  * **`quaternion.invert()`**
    * Reverses a unit quaternion's rotation in place.
    * Example: invert a copy of a character's world orientation and apply it to a world-space direction to get the direction in the character's local space.
  * **`quaternion.identity()`**
    * Resets the quaternion to its unrotated orientation.

#### Bonus

* About Quaternions
  * [eater.net/quaternions](https://eater.net/quaternions)
  * [Quaternions and 3D rotation, explained interactively](https://www.youtube.com/watch?v=zjMuIxRvygQ)
  * [How quaternions produce 3D rotation | Animated Math](https://www.youtube.com/watch?v=jTgdKoQv738)

## Assignment

### Conceptual Development & Presentation

* [Conceptual Development: Virtual Self and Other](https://docs.google.com/document/d/1OH-SeNXuankDISuhR9uCAHy4ICLW5XCMwxEQlZJjT3E/edit?tab=t.qy3o6w46f023)

?> Blog Post Due **Nov 9, 2026**

?> Be prepared for **presentations** in class on **Nov 10, 2026**

### Mini Project

* [W09 - Virtual Self: Exploring Interaction and Navigation](https://docs.google.com/document/d/1OH-SeNXuankDISuhR9uCAHy4ICLW5XCMwxEQlZJjT3E/edit?tab=t.lx4nk7qsdwcn)

?> Due **Nov 9, 2026**

## Readings

* Learn Three.js - Fourth Edition ([Direct Link](http://proxy.library.nyu.edu/login?url=https://learning.oreilly.com/library/view/-/9781803233871/?orpq&email=%5Eu), [Link to NYU Library](https://search.library.nyu.edu/discovery/fulldisplay?docid=alma99100442754307871&context=L&vid=01NYU_INST:NYU&lang=en&search_scope=CI_NYU_CONSORTIA&adaptor=Local%20Search%20Engine&tab=Unified_Slot&query=any%2Ccontains%2CLearn%20Three.js&sortby=rank&mode=basic))
  * Animation and Moving the Camera
  * Basic animations
  * Working with the camera
  * FlyControls
  * FirstPersonControls
  * OrbitControls
* Additional References for three.js
  * [Useful Links in three.js](https://threejs.org/docs/#manual/en/introduction/Useful-links)
  * [three.js examples by Stemkoskis](http://stemkoski.github.io/Three.js/index.html)
