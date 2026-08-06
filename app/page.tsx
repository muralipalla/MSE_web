import Link from "next/link";

export const dynamic = "force-static";

const portals = [
  {
    number: "01",
    title: "Teaching content",
    text: "Concept-first lessons, worked examples, and prerequisite-aware learning paths.",
    href: "/learn",
    link: "Browse lessons",
    tone: "portal-lavender",
    motif: "AB",
  },
  {
    number: "02",
    title: "2D + 3D visualizations",
    text: "Inspect lattices, stress–strain curves, phase maps, and material structures.",
    href: "/visualizations",
    link: "Open visualizations",
    tone: "portal-blue",
    motif: "3D",
  },
  {
    number: "03",
    title: "Interactive simulations",
    text: "Change real parameters and observe diffusion, mechanics, and transformations.",
    href: "/simulations",
    link: "Run simulations",
    tone: "portal-coral",
    motif: "Δt",
  },
  {
    number: "04",
    title: "Quizzes + question bank",
    text: "Choose topics, difficulty, and length to create focused formative practice.",
    href: "/quizzes",
    link: "Build a quiz",
    tone: "portal-ink",
    motif: "Q?",
  },
];

const journey = [
  {
    index: "A",
    title: "See the structure",
    text: "Start with atoms, bonds, unit cells, defects, and microstructure.",
  },
  {
    index: "B",
    title: "Change the process",
    text: "Vary temperature, time, composition, deformation, and manufacturing route.",
  },
  {
    index: "C",
    title: "Explain the properties",
    text: "Connect microscopic mechanisms to mechanical, thermal, electrical, and optical response.",
  },
  {
    index: "D",
    title: "Design for performance",
    text: "Select materials against engineering constraints, trade-offs, and sustainability goals.",
  },
];

const upcoming = [
  {
    tag: "Visualization",
    title: "Crystal lattice explorer",
    text: "Compare SC, BCC, and FCC arrangements, then introduce vacancies and substitutions.",
    href: "/visualizations#lattice-explorer",
  },
  {
    tag: "Interactive graph",
    title: "Stress–strain studio",
    text: "Compare elastic response, yield behavior, ductility, and toughness across materials.",
    href: "/visualizations#stress-strain",
  },
  {
    tag: "Simulation",
    title: "Diffusion profile lab",
    text: "Explore how temperature and time reshape a concentration profile.",
    href: "/simulations#diffusion",
  },
];

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero-wrap" aria-labelledby="hero-title">
        <div className="background-blob blob-one" aria-hidden="true" />
        <div className="background-blob blob-two" aria-hidden="true" />
        <div className="background-blob blob-three" aria-hidden="true" />
        <div className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true" />
              Materials Science &amp; Engineering
            </p>
            <h1 id="hero-title">
              Learn why materials <em>behave.</em>
            </h1>
            <p className="hero-lead">
              Move from atomic structure to engineering performance with visual
              lessons, interactive models, simulations, and practice that adapts
              to the topics you choose.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/paths/introduction-to-mse">
                Start with the foundations
                <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button-secondary" href="/visualizations">
                Explore the lab
              </Link>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>4 modes</dt>
                <dd>Learn, see, simulate, practise</dd>
              </div>
              <div>
                <dt>Topic-led</dt>
                <dd>Resources share one curriculum map</dd>
              </div>
            </dl>
          </div>

          <div className="hero-model" aria-label="Stylized crystal lattice illustration">
            <div className="model-grid" aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => (
                <span className={`lattice-atom atom-${index + 1}`} key={index} />
              ))}
            </div>
            <div className="model-note model-note-top">
              <span className="note-kicker">Structure</span>
              <strong>FCC unit cell</strong>
              <span>12 nearest neighbours</span>
            </div>
            <div className="model-note model-note-bottom">
              <span className="property-dot" aria-hidden="true" />
              <span>
                <strong>Property link</strong>
                Close packing supports ductility
              </span>
            </div>
            <div className="axis-label axis-x" aria-hidden="true">x</div>
            <div className="axis-label axis-y" aria-hidden="true">y</div>
          </div>
        </div>
      </section>

      <section className="section-shell portal-section" aria-labelledby="portal-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Four ways to learn</p>
            <h2 id="portal-title">A complete learning workbench.</h2>
          </div>
          <p>
            Each topic connects explanation, exploration, experimentation, and
            assessment—so learners can move naturally between them.
          </p>
        </div>
        <div className="portal-grid">
          {portals.map((portal) => (
            <Link className={`portal-card ${portal.tone}`} href={portal.href} key={portal.title}>
              <div className="portal-topline">
                <span>{portal.number}</span>
                <span className="portal-motif" aria-hidden="true">{portal.motif}</span>
              </div>
              <div>
                <h3>{portal.title}</h3>
                <p>{portal.text}</p>
                <span className="portal-link">
                  {portal.link}
                  <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell journey-section" aria-labelledby="journey-title">
        <div className="journey-intro">
          <p className="section-kicker">The materials paradigm</p>
          <h2 id="journey-title">From atom to application.</h2>
          <p>
            The site is organized around the central idea of materials science:
            processing changes structure, structure controls properties, and
            properties determine performance.
          </p>
          <Link className="text-link" href="/learn">
            View the curriculum map <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ol className="journey-list">
          {journey.map((item) => (
            <li key={item.index}>
              <span className="journey-index">{item.index}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lab-section" aria-labelledby="lab-title">
        <div className="section-shell">
          <div className="lab-heading">
            <div>
              <p className="section-kicker section-kicker-light">On the lab bench</p>
              <h2 id="lab-title">Learn by changing the variables.</h2>
            </div>
            <p>
              Every interactive includes assumptions, units, parameter ranges,
              and a non-visual summary of the result.
            </p>
          </div>
          <div className="lab-card-grid">
            {upcoming.map((item, index) => (
              <Link href={item.href} className="lab-card" key={item.title}>
                <div className={`lab-preview preview-${index + 1}`} aria-hidden="true">
                  <span className="preview-line line-one" />
                  <span className="preview-line line-two" />
                  <span className="preview-line line-three" />
                  <span className="preview-point point-one" />
                  <span className="preview-point point-two" />
                  <span className="preview-point point-three" />
                </div>
                <span className="lab-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="lab-link">Open interactive <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell practice-callout" aria-labelledby="practice-title">
        <div className="practice-copy">
          <p className="section-kicker section-kicker-light">Build your own practice set</p>
          <h2 id="practice-title">Choose the topics. Set the challenge. Learn from every answer.</h2>
          <p>
            The question bank connects every item to a topic and learning
            outcome. Create a reproducible quiz, get immediate feedback, and
            return to the lesson behind each explanation.
          </p>
          <div className="hero-actions">
            <Link className="button button-on-dark" href="/quizzes">Build a quiz</Link>
            <Link className="button button-ghost-light" href="/question-bank">Browse the bank</Link>
          </div>
        </div>
        <div className="quiz-preview" aria-label="Quiz builder preview">
          <div className="quiz-preview-head">
            <span>Practice set</span>
            <strong>8 questions</strong>
          </div>
          <p>What would you like to practise?</p>
          <div className="preview-chips">
            <span>Crystal structures</span>
            <span className="chip-selected">Diffusion</span>
            <span>Phase diagrams</span>
            <span className="chip-selected">Mechanical properties</span>
          </div>
          <div className="preview-meter">
            <span style={{ width: "64%" }} />
          </div>
          <div className="preview-summary">
            <span>Foundation → Intermediate</span>
            <span>~10 minutes</span>
          </div>
        </div>
      </section>
    </main>
  );
}
