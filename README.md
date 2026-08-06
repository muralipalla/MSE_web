# MSE Learning Lab

An accessible Materials Science & Engineering learning website with four connected
modes: teaching content, 2D/3D visualizations, interactive simulations, and
topic-built formative quizzes.

The project is a Vinext/React site prepared for OpenAI Sites hosting. Content uses
a shared taxonomy so a lesson, interactive, question, and learning path can point
to the same topic and learning outcomes.

## Run locally

Requirements: Node.js 22.13 or newer.

```powershell
cd D:\Github\MSE_web
npm install
npm run dev
```

Open the local URL printed by the development server.

## Validate and build

```powershell
npm run lint
npm test
```

`npm test` creates a production build, verifies rendered pages, and checks the
starter content taxonomy.

## Project map

```text
app/
  learn/                  Teaching pages and sample lesson
  visualizations/         2D/3D exploration pages
  simulations/            Interactive model pages
  quizzes/                Topic-selected quiz builder
  question-bank/          Searchable question catalog
  paths/                  Ordered learning paths
  glossary/               Shared terminology
components/
  layout/                 Header and footer
  interactives/           Client-side visualizations and simulations
  quiz/                   Quiz builder and question-bank interface
content/
  taxonomy/               Domains, topics, outcomes, and glossary
  lessons/                MDX lesson source
  visualizations/         Visualization metadata
  simulations/            Simulation metadata
  questions/              Modular question banks
  quiz-presets/            Curated quiz configurations
features/quiz/             Quiz types, selection, seeding, and scoring
schemas/                   JSON schemas for content validation
docs/                      Authoring and review guidance
public/models/             Future GLB/GLTF teaching models
public/datasets/           Source datasets for interactives
tests/                     Rendering, content, and engine tests
```

## Add a topic

1. Create a stable topic record in `content/taxonomy/topics.json`.
2. Add three to six measurable learning outcomes.
3. Write a lesson in `content/lessons/<domain>/`.
4. Add an interactive only when manipulation improves understanding.
5. Add 12–20 reviewed questions mapped to the outcomes.
6. Add the topic to a learning path or quiz preset.
7. Run validation, accessibility review, and technical review before publishing.

The full production sequence is in `docs/CONTENT_PLAN.md`. Detailed conventions
are in the other authoring guides under `docs/`.

## Deployment

The project includes `.openai/hosting.json` and is ready for a separate Sites
deployment step. Deployment is intentionally not performed by local setup alone.
Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin when publishing so social
sharing metadata resolves to the deployed domain.

## Assessment note

The included quiz system is designed for self-learning. Client-side questions and
answers can be inspected and should not be treated as a secure examination system.
