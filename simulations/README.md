# Simulations

Add each browser simulation as an independent HTML file or small self-contained
folder, then link it from the Interactive Lab section of index.html.

## Available simulations

`uniaxial-tension/` contains a standalone illustrative tensile-test lab with:

- a model universal testing machine and five representative material presets;
- ASTM-proportioned E8/E8M and D638 specimens plus a C1273-inspired ceramic specimen;
- selectable displacement rate, 0.01×–10× playback controls, time-scaled deformation, and live engineering stress-strain plotting;
- manual measurement recording plus a fixed calculation CSV containing elastic points, UTS, and fracture; and
- a four-question numerical check covering Young's modulus, UTS, resilience, and toughness.

Open `uniaxial-tension/index.html` directly or through the home page. It uses no
external runtime dependencies and can be published as ordinary static files.

`hardness-test/` contains a standalone Brinell and Vickers indentation lab with:

- realistic tungsten-carbide ball and 136-degree diamond-pyramid test presets;
- an animated approach, loading, dwell, unloading, and elastic-recovery sequence;
- a focusable microscope with draggable and keyboard-accessible measurement calipers;
- repeat locations, small seeded sample variation, dimension recording, and CSV export; and
- numerical checks for hardness, mean, sample standard deviation, standard uncertainty, and a Student-t 95% repeatability interval.

Open `hardness-test/index.html` directly or through the Hardness test button on
the home page. It uses no external runtime dependencies.
