# Quizzes

Independent quiz modules:

    atomic-bonding/
    |-- index.html   Numerical and conceptual ideal-strength questions
    |-- style.css    Quiz-specific layout and answer states
    |-- app.js       Answer checking using the shared bond model

    diffusion/
    |-- index.html   Numerical and conceptual Fick's-law questions
    |-- style.css    Responsive diffusion-quiz layout and answer states
    |-- app.js       Numerical checking, feedback, and score handling

    miller-indices/
    |-- index.html   Miller, Miller-Bravais, and planar-density questions
    |-- style.css    Responsive quiz and shared-viewer layout
    |-- app.js       Answer checking and interactive Three.js crystal figures

    phase-diagrams/
    |-- index.html   Image-based hypoeutectoid steel composition question
    |-- style.css    Responsive micrograph, reference-table, and answer layout
    |-- app.js       Density conversion and inverse lever-rule checking

    crystal-structure-tutorial/
    |-- index.html   Ten numerical crystal-structure and XRD problems
    |-- style.css    Responsive problem cards, progress, and gated download
    |-- app.js       Numerical/text checking and PDF-unlock logic
    |-- Crystal_Structure_Tutorial.pdf   Worked solutions unlocked at completion

Reusable question banks can later be stored as JSON files under
`assets/data/question_banks/`.
