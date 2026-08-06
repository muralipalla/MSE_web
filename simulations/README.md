# Simulations

Add each browser simulation as an independent HTML file or small self-contained
folder, then link it from the Interactive Lab section of index.html.

## Available simulation

`uniaxial-tension/` contains a standalone illustrative tensile-test lab with:

- a model universal testing machine and five representative material presets;
- ASTM-proportioned E8/E8M and D638 specimens plus a C1273-inspired ceramic specimen;
- selectable displacement rate, 0.01×–10× playback controls, time-scaled deformation, and live engineering stress-strain plotting;
- manual measurement recording plus a fixed calculation CSV containing elastic points, UTS, and fracture; and
- a four-question numerical check covering Young's modulus, UTS, resilience, and toughness.

Open `uniaxial-tension/index.html` directly or through the home page. It uses no
external runtime dependencies and can be published as ordinary static files.
