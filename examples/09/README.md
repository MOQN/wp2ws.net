# Week 09: Interaction & ML Models

Raycasting for interaction and integrating ML models with Three.js.

## Examples - Raycaster

1. [Raycaster Mouse Over](01.md)
2. [Raycaster Mouse Click](02.md)
3. [Dynamic Arrays Interaction](03.md)
4. [Raycaster Arrow Helper](04.md)
5. [Raycaster Create on Plane](12.md)
6. [Raycaster Drag on Plane](13.md)

## Examples - ML Models

5. [Mesh Bodypose MoveNet](05.md)
6. [Lines Bodypose MoveNet](06.md)
7. [Lines Bodypose BlazePose](07.md)
8. [Mesh Translate Quaternion](08.md)
9. [Mesh Bodypose BlazePose](09.md)
10. [Character Controls MoveNet](10.md)
11. [Points MediaPipe Selfie Segmentation](11.md)

## Resources

- [Raycaster GitHub Repository (08a)](https://github.com/MOQN/IMA-Web-Page-To-Web-Space/tree/main/08a_interaction_raycaster)
- [ML Models GitHub Repository (08b)](https://github.com/MOQN/IMA-Web-Page-To-Web-Space/tree/main/08b_Interaction_w_MLmodels)

## Camera and model loading

MoveNet, BlazePose, and Selfie Segmentation require camera permission and HTTPS (or localhost). With p5.js 2.x, ml5 models load with `await ml5.bodyPose()` inside `async setup()`. Allow time for the initial model download.

The course repository uses `08a_interaction_raycaster`, `08b_Interaction_w_MLmodels`, and `09a_navigation`. This site keeps its existing example URLs for saved links.
