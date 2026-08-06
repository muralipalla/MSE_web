import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Crystal structures",
  description: "A starter lesson on unit cells, coordination, and atomic packing.",
};

export default function CrystalStructuresLesson() {
  return (
    <main id="main-content" className="page-shell">
      <section className="page-hero">
        <p className="eyebrow"><span aria-hidden="true" />Structure + microstructure · Foundation</p>
        <h1 className="page-title">Crystal structures</h1>
        <p className="page-lead">
          Learn how a repeating unit cell describes a crystal and why coordination,
          packing, and slip geometry influence material behavior.
        </p>
      </section>

      <div className="lesson-layout">
        <article className="lesson-article">
          <h2>The repeating idea</h2>
          <p>
            A crystalline material has long-range atomic order. Instead of drawing
            every atom, we describe the smallest repeating geometric block—the unit
            cell—and translate it through space to construct the lattice.
          </p>
          <div className="concept-box">
            <strong>Structure is more than a picture.</strong>
            The position and neighborhood of atoms influence density, available slip
            systems, diffusion pathways, and anisotropy.
          </div>

          <h2>Three cubic structures</h2>
          <h3>Simple cubic (SC)</h3>
          <p>
            Atoms occupy the eight corners. Each corner contributes one eighth of an
            atom, so the cell contains one atom in total. The coordination number is 6.
          </p>
          <h3>Body-centred cubic (BCC)</h3>
          <p>
            A complete atom sits at the cell centre in addition to the corners. The
            cell contains two atoms, with coordination number 8.
          </p>
          <h3>Face-centred cubic (FCC)</h3>
          <p>
            Atoms occupy corners and face centres. Accounting for shared atoms gives
            four atoms per cell and a coordination number of 12.
          </p>

          <div className="formula-card">
            <span className="formula">APF = volume occupied by atoms ÷ unit-cell volume</span>
            <span>Atomic packing factor compares how efficiently ideal hard spheres fill a unit cell.</span>
          </div>

          <h2>Why the geometry matters</h2>
          <p>
            FCC metals have densely packed planes and several easy slip systems,
            which contributes to their characteristic ductility. BCC metals also
            have multiple slip systems, but no truly close-packed plane; temperature
            can therefore have a stronger effect on dislocation motion.
          </p>
          <h2>Check your understanding</h2>
          <p>
            Use the lattice explorer to compare structures, then create a short quiz
            containing only crystal-structure questions.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/visualizations#lattice-explorer">Open lattice explorer</Link>
            <Link className="button button-secondary" href="/quizzes">Practice this topic</Link>
          </div>
        </article>

        <aside className="lesson-aside" aria-label="Lesson details">
          <section className="aside-card">
            <h2>Learning outcomes</h2>
            <ul>
              <li>Distinguish lattice and unit cell.</li>
              <li>Count atoms in SC, BCC, and FCC cells.</li>
              <li>Relate coordination and packing to behavior.</li>
            </ul>
          </section>
          <section className="aside-card">
            <h2>Lesson map</h2>
            <p>Estimated time: 20 minutes</p>
            <p>Prerequisite: atomic bonding</p>
            <p>Next: crystal directions and planes</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
