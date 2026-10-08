# PointsMaterial and Dynamic Arrays
<h1>Week 05 | Oct 8, 2026</h1>

## Concepts and Activities

### Lecture

* Next week: Manipulating meshes!
* [PointsMaterial](https://threejs.org/docs/#api/en/materials/PointsMaterial)
  * [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
    * [CPU vs. GPU Demonstration](https://www.youtube.com/watch?v=WmW6SD-EHVY)
    * In the current version: All geometries are BufferGeometries.
      * “BufferGeometry saves its data into buffers: fast memory pools (for lack of better words) to reduce memory cost and CPU cycles.”
    * Deprecated description:
      * ~~“Geometries are easier to work with than BufferGeometries as they store attributes such as vertices, faces, colors and so on directly (rather than in buffers); however, they are generally slower.”~~
  * [How to update things in three.js](https://threejs.org/manual/#how-to-update-things)
    * [needsUpdate](https://threejs.org/docs/?q=needsUpdate#BufferAttribute.needsUpdate)
    * **drawRange()**
    * **drawCount**
    * You may consider using:
      * `geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);`
      * `geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);`
        * This allows the geometry to be updated dynamically on the GPU without needing to re-upload the entire buffer each frame.
      * `positionAttribute.setXYZ(i, x, y, z)`
        * This updates the position of the vertex at index `i` to the new coordinates `(x, y, z)`.
  * [TextureLoader](https://threejs.org/docs/#api/en/loaders/TextureLoader)
    * [Particle textures](https://www.google.com/search?q=particle+texture+&tbm=isch&ved=2ahUKEwiV1ovnxPzuAhWIx54KHWlgAwAQ2-cCegQIABAA&oq=particle+texture+&gs_lcp=CgNpbWcQAzIECAAQQzICCAAyAggAMgIIADICCAAyAggAMgIIADICCAAyAggAMgQIABAeOgYIABAFEB46BAgAEBhQtu8CWNzxAmCA9QJoAHAAeACAAWWIAYQCkgEDMi4xmAEAoAEBqgELZ3dzLXdpei1pbWfAAQE&sclient=img&ei=RCMzYJWkGoiP-wTpwA0&bih=976&biw=960&safe=off&hl=en#imgrc=bBu2PupexZ305M)

### Exercises

* Live-Coding with the concepts and techniques listed above.

## Assignment

### Mini Project

?> Due **Oct 14, 2026**

* [Particles of Becoming: Exploring Motion, Emotion, and Atmosphere through Particle Systems in 3D](https://docs.google.com/document/d/1OH-SeNXuankDISuhR9uCAHy4ICLW5XCMwxEQlZJjT3E/edit?tab=t.hz3p8k6riv50)

### Readings

* Learn Three.js - Fourth Edition ([Direct Link](http://proxy.library.nyu.edu/login?url=https://learning.oreilly.com/library/view/-/9781803233871/?orpq&email=%5Eu), [Link to NYU Library](https://search.library.nyu.edu/discovery/fulldisplay?docid=alma99100442754307871&context=L&vid=01NYU_INST:NYU&lang=en&search_scope=CI_NYU_CONSORTIA&adaptor=Local%20Search%20Engine&tab=Unified_Slot&query=any%2Ccontains%2CLearn%20Three.js&sortby=rank&mode=basic))
  * [Points and Sprites](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor123)
    * [Understanding points and sprites](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor124)
    * [Styling particles using textures](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor125)
    * [Drawing an image on the canvas](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor126)
    * [Using textures to style particles](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor127)
    * [Working with sprite maps](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor128)
    * [Creating THREE.Points from existing geometry](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_07.xhtml#_idTextAnchor129)
* Additional References for three.js
  * [Useful Links in three.js](https://threejs.org/docs/#manual/en/introduction/Useful-links)
  * [three.js examples by Stemkoskis](http://stemkoski.github.io/Three.js/index.html)
