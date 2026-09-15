# Adding GUI, 3D Objects in three.js, and Dynamic Arrays
<h1>Week 03 | Sep 15 & 17, 2026</h1>

## Project Brief

* [Project A: Generative 3D Structures](https://docs.google.com/document/d/1iIf2PtISlHDUDD7KN-96ZE0oEV7wipjn0_S575VxN90/edit?usp=sharing)

## Concepts and Activities

### Assignment Review

- <a href="/showcase/2026/02/index.html" target="wp2ws-showcase" rel="noopener noreferrer">Week 02</a>


### Lecture

* Supportive JS Libraries
  * tweakpane [https://tweakpane.github.io/docs/](https://tweakpane.github.io/docs/)
    * [stats.js](https://github.com/mrdoob/stats.js/) to monitor frame Rate  
    * [dat.gui.js](https://github.com/dataarts/dat.gui) to add graphical user interfaces.  
* Use useful links on the three.js website  
  * [Documentation](https://threejs.org/docs/#manual/en/introduction/Useful-links)  
  * [three.js manual](https://threejs.org/manual/)  
  * [three.js examples by Stemkoskis](http://stemkoski.github.io/Three.js/index.html)  
* Class / Objects in p5.js  
* Let's use a similar pattern in [three.js](http://three.js) as well\!  
* Tip: Object Organization  
  * `return this;`   in a method of a class  
* Dynamic Arrays  
  * Manipulating Objects in three.js  
    * visible  
    * scene.remove( obj );

### Exercises

* Live-Coding with the concepts and techniques listed above.  
* [Tweakpane](https://tweakpane.github.io/docs/)
  * [Tweakpane: Basic](https://editor.p5js.org/MOQN/sketches/_SKJ0MVdm)
  * [Tweakpane: Controlling Objects](https://editor.p5js.org/MOQN/sketches/Ac7PcEVAz)

### Bonus

* Bounding Volume Hierarchy (BVH)  
  * optimizes the collision detection and intersection processes, which can significantly improve performance, especially with high-polygon geometries.  
  * [https://github.com/gkjohnson/three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg)  
  * other: Constructive Solid Geometry (CSG)
* [dat.gui.js](https://github.com/dataarts/dat.gui)   
  * [dat.gui \- Introduction](https://editor.p5js.org/MOQN/sketches/UPNUHyLaR)  
  * [dat.gui \- Updating Values in Object](https://editor.p5js.org/MOQN/sketches/DpvmK0swY)  
  * [dat.gui \- Sending Reference to Object](https://editor.p5js.org/MOQN/sketches/H7O7V6y5x)

## Assignment

### Main Project A Stage 1: Structure Building

?> Due **Sep 21, 2026**

* [Project A: Generative 3D Structures](https://docs.google.com/document/d/1OH-SeNXuankDISuhR9uCAHy4ICLW5XCMwxEQlZJjT3E/edit?tab=t.8eb2bd2wy07t)

### Case Study

?> Due **Sep 21, 2026**

* [Case Study. Generative Arts in 3D](https://docs.google.com/presentation/d/1tZxHerfIHBe1Cy1WFiUKhamNLcG6RoAfd2UOMV6ko98/edit?usp=sharing)

### Readings

* [three.js manual](https://threejs.org/manual/)  
  * [Primitives](https://threejs.org/manual/en/primitives.html)  
  * [Materials](https://threejs.org/manual/en/materials.html)  
  * [Scenegraph](https://threejs.org/manual/en/scenegraph.html)  
* Learn Three.js \- Fourth Edition ([Direct Link](http://proxy.library.nyu.edu/login?url=https://learning.oreilly.com/library/view/-/9781803233871/?orpq&email=%5Eu), [Link to NYU Library](https://search.library.nyu.edu/discovery/fulldisplay?docid=alma99100442754307871&context=L&vid=01NYU_INST:NYU&lang=en&search_scope=CI_NYU_CONSORTIA&adaptor=Local%20Search%20Engine&tab=Unified_Slot&query=any%2Ccontains%2CLearn%20Three.js&sortby=rank&mode=basic))  
  * [Part 2: Working with the Three.js Core Components](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_Part2.xhtml#_idTextAnchor055)  
    * [W4. Working with Three.js Materials](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_04.xhtml#_idTextAnchor057)  
    * [5\. Learning to Work with Geometries](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_05.xhtml#_idTextAnchor082)  
    * (Optional) [6\. Exploring Advanced Geometries](https://learning-oreilly-com.proxy.library.nyu.edu/library/view/learn-three-js/9781803233871/B18726_06.xhtml#_idTextAnchor102)  
* The Nature of Code (optional)  
  * [Chapter 2\. Forces](https://natureofcode.com/book/chapter-2-forces/)  
  * [Chapter 3\. Oscillation](https://natureofcode.com/book/chapter-3-oscillation/)  
  * [Chapter 1\. Vectors](https://natureofcode.com/book/chapter-1-vectors/)