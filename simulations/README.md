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

`xrd-experiment/` contains a standalone illustrative powder X-ray diffraction lab with:

- BCC &alpha;-Fe, FCC Cu, HCP Mg, diamond-cubic Si, and a mixed &alpha;-Fe + Cu powder pattern;
- an animated coupled &theta;&ndash;2&theta; diffractometer with adjustable scan range and playback speed;
- live peak plotting, Miller-index labels, phase fingerprints, and calculated Bragg spacings;
- a calculated reference-reflection table with phase and representative intensity information; and
- CSV export for the completed scan.

Open `xrd-experiment/index.html` directly or through the XRD experiment button
on the home page. It uses no external runtime dependencies.

`molecular-dynamics/` contains a standalone two-dimensional Lennard-Jones lab with:

- 100 atoms initialized on a triangular lattice or in a relaxed random configuration;
- a force-shifted Lennard-Jones interaction with adjustable, exactly marked minimum and well depth;
- velocity-Verlet integration, adjustable time step, LJ-scaled density from 0.80 to 1.00, periodic or reflecting boundaries, and Gaussian velocity initialization;
- a 1,200-step weak velocity-rescaling equilibration stage followed by an isolated NVE measurement;
- a canonical-cell particle view that draws each of the 100 atoms once, plus energy-versus-time and temperature-versus-time results with CSV export; and
- compact Python and C examples of one velocity-Verlet step.

Open `molecular-dynamics/index.html` directly or through the Open MD lab button
on the home page. It uses no external runtime dependencies.

`scanning-electron-microscopy/` contains a standalone illustrative SEM signal explorer with:

- a schematic electron column with condenser and objective lenses, scan coils, and a focused primary beam;
- a pear-shaped statistical interaction-volume graphic with finite electron-path animation;
- selectable SE1, SE2, BSE, characteristic/continuum X-ray, Auger, cathodoluminescence, and specimen-current views;
- energy, origin, detector, and information annotations for every signal; and
- a link to the external MyScope virtual SEM experiment for further practice.

Open `scanning-electron-microscopy/index.html` directly or through the SEM
experiment button on the home page. It uses no external runtime dependencies.
