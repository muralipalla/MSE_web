import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teaching content",
  description: "Browse the Materials Science & Engineering curriculum by domain and topic.",
};

const domains = [
  { number: "Domain 01", title: "Foundations", text: "The materials paradigm, atomic bonding, units, and scientific tools." },
  { number: "Domain 02", title: "Structure + microstructure", text: "Crystal structures, defects, grains, phases, and structure measurement." },
  { number: "Domain 03", title: "Thermodynamics + kinetics", text: "Free energy, diffusion, phase diagrams, transformations, and heat treatment." },
  { number: "Domain 04", title: "Properties + performance", text: "Mechanical, thermal, electrical, optical, magnetic, and degradation behavior." },
  { number: "Domain 05", title: "Materials classes", text: "Metals, ceramics, polymers, composites, electronic and biomaterials." },
  { number: "Domain 06", title: "Processing + characterization", text: "Manufacturing routes, microscopy, diffraction, spectroscopy, and testing." },
  { number: "Domain 07", title: "Design + sustainability", text: "Selection, trade-offs, lifecycle thinking, circularity, and responsible design." },
];

const foundationTopics = [
  ["01", "Materials paradigm", "Connect processing, structure, properties, and performance.", "Ready"],
  ["02", "Atomic structure + bonding", "Relate bond type and energy to material behavior.", "Next"],
  ["03", "Crystal structures", "Compare unit cells, packing, directions, and planes.", "Ready"],
  ["04", "Defects + microstructure", "Recognize vacancies, dislocations, grains, and interfaces.", "Next"],
  ["05", "Diffusion", "Use Fick’s laws and Arrhenius behavior to explain mass transport.", "Ready"],
  ["06", "Phase diagrams", "Read equilibrium phases, compositions, and phase fractions.", "Next"],
  ["07", "Mechanical properties", "Interpret elastic, plastic, fracture, fatigue, and creep response.", "Ready"],
  ["08", "Strengthening", "Explain how microstructure hinders dislocation motion.", "Next"],
  ["09", "Failure", "Connect flaws, loading history, and environment to failure modes.", "Next"],
  ["10", "Materials selection", "Use property charts and constraints to compare candidates.", "Next"],
];

export default function LearnPage() {
  return (
    <main id="main-content" className="page-shell">
      <section className="page-hero">
        <p className="eyebrow"><span aria-hidden="true" />Teaching content</p>
        <h1 className="page-title">Build the ideas in the right order.</h1>
        <p className="page-lead">
          Lessons are organized by stable topics and measurable learning outcomes.
          Every topic can connect to a visualization, simulation, worked example,
          and targeted practice set.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/paths/introduction-to-mse">Follow the foundation path</Link>
          <Link className="button button-secondary" href="/learn/crystal-structures">Open a sample lesson</Link>
        </div>
      </section>

      <section className="content-section" aria-labelledby="domains-title">
        <h2 id="domains-title">Curriculum domains</h2>
        <p className="section-intro">
          The taxonomy is shared across lessons and assessments, making it easy to
          find every resource connected to one concept.
        </p>
        <div className="card-grid">
          {domains.map((domain) => (
            <article className="content-card" key={domain.title}>
              <span className="card-number">{domain.number}</span>
              <h3>{domain.title}</h3>
              <p>{domain.text}</p>
              <span className="card-link">Explore topics →</span>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" aria-labelledby="path-preview-title">
        <h2 id="path-preview-title">Foundation sequence</h2>
        <p className="section-intro">
          Begin with the materials paradigm, then move through structure,
          transport, equilibrium, mechanics, and selection.
        </p>
        <ol className="topic-list">
          {foundationTopics.map(([number, title, text, status]) => (
            <li key={number}>
              <span className="topic-index">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <span className={`topic-status ${status === "Next" ? "planned" : ""}`}>
                {status === "Ready" ? "Starter content ready" : "Planned next"}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
