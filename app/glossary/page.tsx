import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Key terms used throughout the MSE Learning Lab.",
};

const terms = [
  ["Anisotropy", "Dependence of a material property on the direction in which it is measured."],
  ["Atomic packing factor", "The fraction of a unit-cell volume occupied by idealized atoms."],
  ["Coordination number", "The number of nearest-neighbour atoms surrounding a selected atom."],
  ["Crystal lattice", "A periodic array of points that describes translational symmetry in a crystal."],
  ["Diffusion coefficient", "A proportionality constant describing the rate of species transport by diffusion."],
  ["Dislocation", "A line defect in a crystal associated with local lattice distortion and plastic deformation."],
  ["Elastic modulus", "The slope of the linear elastic portion of a stress–strain curve."],
  ["Grain", "A region of a polycrystalline material with a common crystallographic orientation."],
  ["Microstructure", "The arrangement of phases, grains, defects, and features visible over microscopic length scales."],
  ["Phase", "A physically and chemically distinct region of a material with uniform structure and properties."],
  ["Toughness", "The energy per unit volume a material absorbs before fracture."],
  ["Unit cell", "A repeating volume that captures the symmetry and arrangement of a crystal structure."],
];

export default function GlossaryPage() {
  return (
    <main id="main-content" className="page-shell">
      <section className="page-hero">
        <p className="eyebrow"><span aria-hidden="true" />Reference</p>
        <h1 className="page-title">Materials glossary</h1>
        <p className="page-lead">A shared vocabulary for lessons, interactives, simulations, and feedback.</p>
      </section>
      <dl className="glossary-grid">
        {terms.map(([term, definition]) => (
          <div className="glossary-entry" key={term}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
