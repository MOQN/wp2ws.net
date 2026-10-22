# The Butterfly Affect — Project B

A dreamscape where feelings take visual form. Feelings are endless, like a night sky with no edges,
yet each one can be as small as a butterfly. Emotions flow like a river of light, and drift away
as butterflies to somewhere unknown. When a feeling becomes too strong, the dream glitches.

## Objects
| object | what it is | what happens |
|---|---|---|
| sky dome | a painted night sky (`assets/sky/night_sky.jpg`, made by `tools/make_sky.py`) | slowly turns |
| mirror | the ground is a dark mirror (Reflector) | the stronger the feeling, the blurrier the reflection |
| glass crystals ×7 | big clear glass crystals standing on the mirror (simplified models) | they turn slowly |
| River | one main river and 7 branches of silk light (video texture) | the light flows, the surface swells |
| HangingStrand ×16 | threads with small crystals and a crystal at the end | they sway, the crystals turn |
| Butterfly | a butterfly model (body + 2 wings) | born from a hanging crystal, flies to the far light and fades away |
| glitch | when a feeling is too strong | the world shakes, the river tears, the reflection breaks into pixels, colors flash |

## GUI
- **Tweakpane — ENVIRONMENT / MIRROR / RIVER**: camera (fixed / free), autoRotate, rotateSpeed, sky brightness, fog, thread sway, sky; mirror, clarity, clarity now; river, speed, brightness, tint, reflect on crystals
- **dat.gui — EMOTION**: intensity (+ auto), charge speed, glitch chance, butterfly size, release a butterfly, trigger glitch

## Structure (class examples)
- `index.html`, `css/style.css`, `js/script-three.js`, `js/script-p5.js` — the class template
- `js/main.js` — params, setupThree, updateThree, helper functions, classes `River`, `HangingStrand`, `Butterfly`
- `assets/` — `test_2k.hdr` (class examples), `silk.mp4`, `sky/night_sky.jpg`, `models/` (butterfly + 4 crystals, each in a normal, `_small` and `_glass` version)
- `tools/` — `make_sky.py` (the sky image), `glass_models/` (simplifying the crystal models without gaps)
- `archive/` — earlier versions, for the process documentation

## Credits
- Silk video texture (`assets/silk.mp4`): cropped and converted from the GIF *Song of Silk and Stars* on Behance — add the artist's name and link
- HDR: course examples
- Butterfly & crystal models: simplified and split for this project
