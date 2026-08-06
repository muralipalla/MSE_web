import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Introduction to MSE learning path",
  description: "A ten-topic foundation path through Materials Science & Engineering.",
};

const steps = [
  ["Materials paradigm", "Connect processing, structure, properties, and performance.", "25 min"],
  ["Atomic bonding", "Relate bond energy and type to engineering properties.", "35 min"],
  ["Crystal structures", "Compare unit cells, packing, directions, and planes.", "45 min"],
  ["Defects + microstructure", "See how imperfections change real materials.", "40 min"],
  ["Diffusion", "Predict how atoms move through solids.", "50 min"],
  ["Phase diagrams", "Read phases, compositions, and equilibrium fractions.", "60 min"],
  ["Mechanical properties", "Interpret elastic, plastic, and failure response.", "55 min"],
  ["Strengthening", "Connect obstacles to dislocation motion and strength.", "40 min"],
  ["Failure", "Recognize fracture, fatigue, and creep mechanisms.", "45 min"],
  ["Materials selection", "Turn requirements into defensible material choices.", "50 min"],
];

export default function FoundationPathPage() {
  return (
    <main id="main-content" className="page-shell">
      <section className="page-hero">
        <p className="eyebrow"><span aria-hidden="true" />Learning path · 10 topics</p>
        <h1 className="page-title">Introduction to Materials Science</h1>
        <p className="page-lead">
          A guided foundation that connects atomic-scale structure to real
          engineering choices. Complete a lesson, try the linked interactive,
          and use a short quiz before moving on.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/learn/crystal-structures">Open the first available lesson</Link>
          <Link className="button button-secondary" href="/quizzes">Create a baseline quiz</Link>
        </div>
      </section>
      <ol className="path-list">
        {steps.map(([title, text, time], index) => (
          <li className="path-step" key={title}>
            <span className="path-step-number">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
            <span className="path-step-meta">{time} · lesson + practice</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
