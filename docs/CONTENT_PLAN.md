# Materials Science & Engineering content plan

This project uses one curriculum taxonomy for lessons, visualizations,
simulations, and questions:

```text
Domain → Topic → Learning outcome → Resource
                                  ├─ Lesson
                                  ├─ Visualization
                                  ├─ Simulation
                                  └─ Question
```

Stable IDs are the links between resources. Titles and URLs can change; IDs
should not.

## Recommended publishing sequence

### Phase 1 — Foundation release

Build the ten-topic `Introduction to Materials Science` path:

1. Materials paradigm
2. Atomic structure and bonding
3. Crystal structures
4. Defects and microstructure
5. Diffusion
6. Phase diagrams
7. Mechanical properties
8. Strengthening
9. Failure
10. Materials selection

For every topic, publish:

- one concept-first lesson;
- three to six measurable learning outcomes;
- at least one worked example and one misconception note;
- one useful visualization or simulation;
- 12–20 reviewed questions spread across the outcomes;
- a five-question topic preset;
- glossary terms and prerequisite links.

The first release should prioritize depth and consistency across these ten topics
instead of shallow coverage of the entire discipline.

### Phase 2 — Materials classes

Add metals and alloys, ceramics and glasses, polymers, composites, electronic
materials, and biomaterials. Reuse foundation topics rather than duplicating
explanations of bonding, structure, diffusion, and mechanics.

### Phase 3 — Processing and transformation

Add solidification, casting, forming, powder processing, sintering, heat
treatment, polymer processing, composite manufacture, and additive manufacturing.
Connect every process to the structures it changes and the properties affected.

### Phase 4 — Characterization and design

Add microscopy, diffraction, spectroscopy, mechanical testing, Ashby selection,
lifecycle analysis, recycling, and sustainable materials design.

## Content workflow for one new topic

1. Add the topic to `content/taxonomy/topics.json` with a stable ID, domain,
   prerequisites, level, and status.
2. Add three to six measurable outcomes to
   `content/taxonomy/outcomes.json`. Start outcome statements with an observable
   verb such as calculate, compare, interpret, or evaluate.
3. Copy the lesson pattern in `content/lessons/` and write the explanation,
   worked example, misconception, summary, and links to related resources.
4. Design one interactive only when it improves understanding. Record its topic
   and outcome IDs in `content/visualizations/` or `content/simulations/`.
5. Write 12–20 questions using `docs/AUTHORING_QUESTIONS.md`. Include meaningful
   explanations, not just the correct answer.
6. Add the topic to one or more learning paths or quiz presets.
7. Validate JSON, unique IDs, links, quiz pool size, units, and parameter ranges.
8. Complete technical, instructional, accessibility, and copyright review using
   `docs/REVIEW_CHECKLIST.md`.
9. Change content from `draft` to `reviewed`, then to `published` only after the
   named review is complete.

## Suggested production cadence

A practical two-week topic cycle is:

- Days 1–2: outcomes, outline, references, and worked examples;
- Days 3–5: lesson draft and technical review;
- Days 6–8: visualization or simulation;
- Days 9–10: question-bank authoring;
- Days 11–12: accessibility, unit, and interaction testing;
- Days 13–14: revisions, publication, and learner feedback capture.

Parallelize by role: a subject author owns scientific accuracy, an instructional
reviewer checks sequence and feedback, and a developer implements interactives.

## Question-bank targets

Start with 12–20 questions per foundation topic, then grow toward 30 as learner
data exposes gaps. A healthy topic pool contains:

- 35% foundation recall and interpretation;
- 45% intermediate application and analysis;
- 20% advanced transfer or multi-step reasoning;
- multiple question types, with stable option IDs;
- coverage of every published learning outcome;
- explanations for correct and incorrect reasoning;
- numeric tolerance and accepted units where needed.

Quiz generation should maximize outcome coverage, honor requested difficulty,
avoid duplicates, and use a reproducible seed. Client-side quizzes are suitable
for formative self-learning, not secure examinations.

## Interactive roadmap

### First release

- 2D cubic lattice and point-defect explorer
- stress–strain comparison graph
- one-dimensional diffusion profile simulator

### Next release

- 3D unit-cell and Miller-index viewer using GLB/GLTF assets
- lever-rule phase-diagram lab
- virtual tensile test
- slip-system and strengthening explorer

### Later release

- TTT/CCT heat-treatment simulator
- crack growth, fatigue, and creep labs
- interactive Ashby property charts
- XRD peak identification and microscopy scale explorer

Each interactive must state assumptions, units, valid parameter ranges, and model
limits. It must also provide keyboard controls and a text or table alternative to
the visual result.

## Definition of done

A topic is complete when a learner can:

1. find the lesson from the curriculum map;
2. understand the stated outcomes and prerequisites;
3. study a worked example and misconception;
4. manipulate a relevant visual model;
5. build a focused quiz from the topic;
6. receive a worked explanation and link back to the lesson;
7. use the complete flow with keyboard navigation and at 200% zoom.
