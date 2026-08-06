import type { Metadata } from "next";
import Link from "next/link";
import LatticeExplorer from "@/components/interactives/LatticeExplorer";
import StressStrainExplorer from "@/components/interactives/StressStrainExplorer";
import UnitCellPreview from "@/components/interactives/UnitCellPreview";
import styles from "./page.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Interactive visualizations",
  description: "Explore crystal structures, point defects and stress–strain response with accessible 2D and 3D learning tools.",
};

export default function VisualizationsPage() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero} aria-labelledby="visualizations-heading">
        <div className={styles.heroCopy}>
          <Link className={styles.backLink} href="/">← Learning lab home</Link>
          <p className={styles.eyebrow}>See the science</p>
          <h1 id="visualizations-heading">Make material behaviour visible.</h1>
          <p>
            Move from atomic arrangement to macroscopic response. Each visual pairs a manipulable model with numbers,
            definitions and caveats you can inspect without relying on colour alone.
          </p>
        </div>
        <div className={styles.heroStats} aria-label="Visualization collection summary">
          <div><strong>2</strong><span>working 2D tools</span></div>
          <div><strong>1</strong><span>3D preview</span></div>
          <div><strong>0</strong><span>plug-ins required</span></div>
        </div>
      </section>

      <nav className={styles.jumpNav} aria-label="On this page">
        <span>Jump to</span>
        <a href="#crystal-lattice">Crystal lattice</a>
        <a href="#stress-strain">Stress–strain graph</a>
        <a href="#three-dimensional">3D preview</a>
      </nav>

      <div className={styles.contentStack}>
        <div id="crystal-lattice" className={styles.anchorSection}><LatticeExplorer /></div>
        <div id="stress-strain" className={styles.anchorSection}><StressStrainExplorer /></div>
        <div id="three-dimensional" className={styles.anchorSection}><UnitCellPreview /></div>
      </div>

      <section className={styles.learningPrompt} aria-labelledby="visual-learning-prompt">
        <div>
          <p className={styles.eyebrow}>Try this learning loop</p>
          <h2 id="visual-learning-prompt">Predict. Manipulate. Explain.</h2>
        </div>
        <ol>
          <li>Write down what you expect before changing a control.</li>
          <li>Change one variable and describe what moved—and what stayed fixed.</li>
          <li>Connect the visual result to a structure–processing–properties relationship.</li>
        </ol>
      </section>
    </main>
  );
}
