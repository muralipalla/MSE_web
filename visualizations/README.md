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

    fcc-bct-cell/
    |-- index.html    FCC and alternative BCT cell explanation and controls
    |-- style.css     Site-matched responsive viewer layout
    |-- app.js        Three.js cells, lattice points, camera views, and PNG export
