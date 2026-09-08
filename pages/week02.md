# W02 Introduction to three.js | Sep 8 & 9, 2026

## Slides

* [Introduction to three.js](https://docs.google.com/presentation/d/1_uZrMmzIlgMf9pRyrtA9pgJg4pTsNKa5r-4I-vxkX4A/edit?usp=sharing)

## Concepts and Activities

### Lecture

* WebGL  
  * [CPU vs. GPU Demonstration](https://www.youtube.com/watch?v=WmW6SD-EHVY)  
* Introduction to three.js  
  * Official GitHub Repo: [https://github.com/mrdoob/three.js](https://github.com/mrdoob/three.js)  
  * The latest version: [https://github.com/mrdoob/three.js/releases/tag/r185](https://github.com/mrdoob/three.js/releases/tag/r185)
* p5.js vs. three.js → **p5.js \+ three.js**  
  * Math Functions\!  
  * Modules… 😢  
* Getting Started\!  
  * [https://threejs.org/manual/\#en/installation](https://threejs.org/manual/#en/installation)
    * **Option 2: Import from a CDN**  
  * about [es-module-shims](https://www.npmjs.com/package/es-module-shims)  
  * `console.log(THREE.REVISION);`  
* Setting up the Environment  
  * **container**  HTML element  
  * **scene**  a virtual space  
  * **camera**  your point of view  
  * **renderer**  3D → 2D  
* [window.requestAnimationFrame();](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)  
* Updating Viewport On Resize  
  * `camera.aspect = window.innerWidth / window.innerHeight;`  
  * `camera.updateProjectionMatrix();`  
  * `renderer.setSize(window.innerWidth, window.innerHeight);`  
* Setting up useful environment variables  
  * [performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)  
    * "Unlike other timing data available to JavaScript (for example [Date.now](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now)), the timestamps returned by performance.now() are not limited to one-millisecond resolution. Instead, they represent times as floating-point numbers with up to **microsecond** precision."  
* Creating a 3D object  
  * Mesh \= Geometry \+ Materials  
* Controls  
  * OrbitContorl.js  
* Lights?  
  * if time allows.  
* Supportive JS Libraries (on Thursday)  
  * Tweakpane [https://tweakpane.github.io/docs/](https://tweakpane.github.io/docs/)  
  * Other  
    * [stats.js](https://github.com/mrdoob/stats.js/) to monitor frame Rate  
    * [dat.gui.js](https://github.com/dataarts/dat.gui) to add graphical user interfaces.

### Exercises

* Live-coding with the concepts listed above.  
* Setting up three.js on the computer  
* Creating a scene  
* Generating 3D Objects (meshes)

## Assignment

### Mini Project  Due Oct 7, 2024

* [W03 \- Virtual Minimalist Sculptures: Exploring Abstract and Minimal Geometries in 3D with three.js](https://docs.google.com/document/d/1OH-SeNXuankDISuhR9uCAHy4ICLW5XCMwxEQlZJjT3E/edit?tab=t.3bzq96pvdzl)

### Readings

* [three.js manual](https://threejs.org/manual/)  
  * Basics  
    * [Fundamentals](https://threejs.org/manual/en/fundamentals.html)  
    * [Responsive Design](https://threejs.org/manual/en/responsive.html)  
    * [Prerequisites](https://threejs.org/manual/en/prerequisites.html)  
    * [Setup](https://threejs.org/manual/en/setup.html)  
  * Fundamentals  
    * [Cameras](https://threejs.org/manual/en/cameras.html)  
    * [Primitives](https://threejs.org/manual/en/primitives.html)  
    * [Materials](https://threejs.org/manual/en/materials.html)  
    * [Scenegraph](https://threejs.org/manual/en/scenegraph.html)  
* Learn Three.js \- Fourth Edition ([Direct Link](http://proxy.library.nyu.edu/login?url=https://learning.oreilly.com/library/view/-/9781803233871/?orpq&email=%5Eu), [Link to NYU Library](https://search.library.nyu.edu/discovery/fulldisplay?docid=alma99100442754307871&context=L&vid=01NYU_INST:NYU&lang=en&search_scope=CI_NYU_CONSORTIA&adaptor=Local%20Search%20Engine&tab=Unified_Slot&query=any%2Ccontains%2CLearn%20Three.js&sortby=rank&mode=basic))  
  * [1\. Creating Your First 3D Scene with Three.js](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_01.xhtml#_idTextAnchor015)  
  * [2\. The Basic Components that Make up a Three.js Application](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_02.xhtml#_idTextAnchor029)  
    * [Setting up the scene](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_01.xhtml#_idTextAnchor021)  
    * [Adding the meshes](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_01.xhtml#_idTextAnchor023)  
    * [Adding an animation loop](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_01.xhtml#_idTextAnchor024)  
  * [4\. Working with Three.js Materials](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_04.xhtml#_idTextAnchor057)  
    * [Understanding common material properties](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_04.xhtml#_idTextAnchor058)  
    * [Starting with simple materials](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_04.xhtml#_idTextAnchor062)  
  * [5\. Learning to Work with Geometries](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_05.xhtml#_idTextAnchor082)  
    * [2D geometries](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_05.xhtml#_idTextAnchor083)  
    * [3D geometries](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_05.xhtml#_idTextAnchor088)  
  * (Optional) [3\. Working with Light Sources in Three.js](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_03.xhtml#_idTextAnchor041)  
* The Nature of Code (optional)  
  * [Chapter 2\. Forces](https://natureofcode.com/book/chapter-2-forces/)  
  * [Chapter 3\. Oscillation](https://natureofcode.com/book/chapter-3-oscillation/)  
  * [Chapter 1\. Vectors](https://natureofcode.com/book/chapter-1-vectors/)
