import type { Metadata } from "next";
import Link from "next/link";
import DiffusionSimulator from "@/components/interactives/DiffusionSimulator";
import styles from "./page.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Interactive simulations",
  description: "Run accessible materials science simulations, beginning with an Arrhenius and Fick-inspired diffusion profile model.",
};

export default function SimulationsPage() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero} aria-labelledby="simulations-heading">
        <div>
          <Link className={styles.backLink} href="/">← Learning lab home</Link>
          <p className={styles.eyebrow}>Change a variable</p>
          <h1 id="simulations-heading">Run the process. Read the result.</h1>
          <p>
            Compact models turn equations into experiments. Adjust conditions, inspect the numerical output and check
            every assumption before deciding what the model can—and cannot—predict.
          </p>
        </div>
        <div className={styles.equationCard} aria-label="Central diffusion relationship">
          <span>Core relationship</span>
          <strong>D = D₀ exp(−Q / RT)</strong>
          <p>Temperature changes diffusivity exponentially; time controls the distance over which atoms redistribute.</p>
        </div>
      </section>

      <div className={styles.simulator}><DiffusionSimulator /></div>

      <section className={styles.nextModels} aria-labelledby="next-simulations-title">
        <div>
          <p className={styles.eyebrow}>Simulation roadmap</p>
          <h2 id="next-simulations-title">Next models to build</h2>
          <p>Each future model will expose its equations, units, assumptions and an accessible data table.</p>
        </div>
        <div className={styles.modelGrid}>
          <article>
            <span>Mechanics</span>
            <h3>Tensile test</h3>
            <p>Apply displacement and watch elastic, plastic and necking regimes develop.</p>
          </article>
          <article>
            <span>Phase transformations</span>
            <h3>Heat-treatment path</h3>
            <p>Trace cooling histories across a TTT diagram and estimate final microconstituents.</p>
          </article>
          <article>
            <span>Thermodynamics</span>
            <h3>Solidification</h3>
            <p>Follow a binary alloy through liquidus, two-phase and solidus regions.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
