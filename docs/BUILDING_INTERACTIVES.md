# Building visualizations and simulations

An interactive belongs in the site only when manipulating a variable reveals an
important relationship more clearly than prose or a static figure.

## Project locations

- React components: `components/interactives/`
- visualization metadata: `content/visualizations/`
- simulation metadata: `content/simulations/`
- 3D assets: `public/models/`
- datasets: `public/datasets/`

## Required interface elements

1. A question or learning goal above the interactive.
2. Clearly labelled controls with units and visible current values.
3. A reset-to-defaults action.
4. A legend that does not rely on color alone.
5. A short explanation of the current result.
6. A data table or equivalent non-visual result.
7. Model assumptions, parameter ranges, and limitations.
8. Keyboard operation, visible focus, and reduced-motion support.

## Numerical model guidance

- Keep scientific calculations separate from rendering.
- Add unit tests for known limiting cases and reference values.
- Clamp or reject invalid parameters rather than silently extrapolating.
- Display an appropriate number of significant figures.
- Name the model used and explain simplifying assumptions.
- Mark educational approximations clearly; do not present them as design data.

## 3D workflow

Use optimized GLB/GLTF assets in `public/models/`. Preserve a text description and
2D fallback, label axes and crystallographic directions, provide camera reset,
and keep pointer-only gestures optional. Test performance on an ordinary laptop
and a narrow mobile viewport before publication.
