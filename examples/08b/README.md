# 08b Interaction — ML Models

## Examples

1. [Mesh Bodypose MoveNet](01.md)
2. [Lines Bodypose MoveNet](02.md)
3. [Lines Bodypose BlazePose](03.md)
4. [Mesh Translate Quaternion](04.md)
5. [Mesh Bodypose BlazePose](05.md)
6. [Character Controls MoveNet](06.md)
7. [Points MediaPipe Selfie Segmentation](07.md)

## Resources

- [GitHub Repository](https://github.com/MOQN/IMA-Web-Page-To-Web-Space/tree/main/08b_Interaction_w_MLmodels)

MoveNet, BlazePose, and Selfie Segmentation require camera permission and HTTPS (or localhost). ml5 models load with `await` inside `async setup()` for p5.js 2.x. Allow time for the initial model download.
