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

    fcc-bct-cell/
    |-- index.html    FCC and alternative BCT cell explanation and controls
    |-- style.css     Site-matched responsive viewer layout
    |-- app.js        Three.js cells, lattice points, camera views, and PNG export

    crystal-voids/
    |-- index.html    Shared tetrahedral, octahedral, and cube-centre void explorer
    |-- style.css     Site-matched sections, controls, and responsive layout
    |-- app.js        Three.js coordination cages and adjustable inner-atom radius
    |-- three.min.js  Local Three.js runtime for direct-file and hosted use
