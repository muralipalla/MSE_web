# Visualizations

Add each 2D or 3D visualization as an independent HTML file. If a visualization
needs several files, give it a folder containing index.html, style.css, and
app.js.

Current module:

    lattice-structure/
    |-- index.html    Page and controls
    |-- style.css     Module-only layout
    |-- app.js        Canvas drawing and interaction

    miller-indices/
    |-- index.html    Cubic unit cell and index controls
    |-- style.css     Module-only layout
    |-- app.js        Three.js directions and planes

    dislocations/
    |-- index.html    Edge and screw dislocation controls
    |-- style.css     Module-only responsive layout
    |-- app.js        Three.js atomic models and Burgers circuits

The dislocation viewer is also embedded in `teaching/crystal-defects/` so the
line-defect model appears in the core lesson while the standalone URL remains usable.

    edge-dislocation-motion-preview/
    |-- index.html    Atomic edge/screw glide and synchronized Peierls plot
    |-- style.css     Standalone and embedded responsive layouts
    |-- app.js        Three.js atomic model, controls, and graph synchronization

    dislocation-line-dynamics-preview/
    |-- index.html    ParaDiS network and Frank-Read playback interface
    |-- style.css     Standalone and embedded responsive layouts
    |-- app.js        Three.js continuous-line renderer and playback controls
    |-- data/         Prepared ParaDiS and PyDiS visualization data
    |-- tools/        Reproducible data-preparation script

Both previews are integrated as separate sections of the Work in Progress
`teaching/dislocations/` module. `embed-frame.js` lets each same-origin iframe
report its content height to the teaching page while the standalone URLs remain usable.

    fcc-bct-cell/
    |-- index.html    FCC and alternative BCT cell explanation and controls
    |-- style.css     Site-matched responsive viewer layout
    |-- app.js        Three.js cells, lattice points, camera views, and PNG export

    crystal-voids/
    |-- index.html    Shared tetrahedral, octahedral, and cube-centre void explorer
    |-- style.css     Site-matched sections, controls, and responsive layout
    |-- app.js        Three.js coordination cages and adjustable inner-atom radius
    |-- three.min.js  Local Three.js runtime for direct-file and hosted use
