"use client";

import { useMemo, useState } from "react";
import styles from "./LatticeExplorer.module.css";

type LatticeType = "sc" | "bcc" | "fcc";
type DefectType = "none" | "vacancy" | "substitutional" | "interstitial";

type Atom = {
  x: number;
  y: number;
  site: "corner" | "body" | "face";
};

const latticeOptions: Record<
  LatticeType,
  { name: string; coordination: string; packing: string; atoms: Atom[] }
> = {
  sc: {
    name: "Simple cubic",
    coordination: "6",
    packing: "52%",
    atoms: [
      { x: 13, y: 13, site: "corner" },
      { x: 87, y: 13, site: "corner" },
      { x: 13, y: 87, site: "corner" },
      { x: 87, y: 87, site: "corner" },
    ],
  },
  bcc: {
    name: "Body-centred cubic",
    coordination: "8",
    packing: "68%",
    atoms: [
      { x: 13, y: 13, site: "corner" },
      { x: 87, y: 13, site: "corner" },
      { x: 13, y: 87, site: "corner" },
      { x: 87, y: 87, site: "corner" },
      { x: 50, y: 50, site: "body" },
    ],
  },
  fcc: {
    name: "Face-centred cubic",
    coordination: "12",
    packing: "74%",
    atoms: [
      { x: 13, y: 13, site: "corner" },
      { x: 87, y: 13, site: "corner" },
      { x: 13, y: 87, site: "corner" },
      { x: 87, y: 87, site: "corner" },
      { x: 50, y: 13, site: "face" },
      { x: 87, y: 50, site: "face" },
      { x: 50, y: 87, site: "face" },
      { x: 13, y: 50, site: "face" },
    ],
  },
};

const defectLabels: Record<DefectType, string> = {
  none: "Perfect lattice",
  vacancy: "Vacancy",
  substitutional: "Substitutional atom",
  interstitial: "Interstitial atom",
};

export default function LatticeExplorer() {
  const [lattice, setLattice] = useState<LatticeType>("bcc");
  const [defect, setDefect] = useState<DefectType>("none");
  const selected = latticeOptions[lattice];

  const visibleAtoms = useMemo(
    () => (defect === "vacancy" ? selected.atoms.filter((_, index) => index !== 1) : selected.atoms),
    [defect, selected],
  );

  const reset = () => {
    setLattice("bcc");
    setDefect("none");
  };

  return (
    <section className={styles.card} aria-labelledby="lattice-title">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>2D structure explorer</p>
          <h2 id="lattice-title">Crystal lattice and point defects</h2>
          <p className={styles.intro}>
            Compare projected unit cells, then introduce one idealized point defect to see how a local site changes.
          </p>
        </div>
        <button className={styles.resetButton} type="button" onClick={reset}>
          Reset defaults
        </button>
      </div>

      <div className={styles.controls} aria-label="Lattice controls">
        <label>
          <span>Lattice type</span>
          <select value={lattice} onChange={(event) => setLattice(event.target.value as LatticeType)}>
            <option value="sc">Simple cubic (SC)</option>
            <option value="bcc">Body-centred cubic (BCC)</option>
            <option value="fcc">Face-centred cubic (FCC)</option>
          </select>
        </label>

        <fieldset>
          <legend>Point defect</legend>
          <div className={styles.segmentedControl}>
            {(Object.keys(defectLabels) as DefectType[]).map((option) => (
              <label key={option} className={defect === option ? styles.selectedSegment : undefined}>
                <input
                  type="radio"
                  name="point-defect"
                  value={option}
                  checked={defect === option}
                  onChange={() => setDefect(option)}
                />
                <span>{defectLabels[option]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.workspace}>
        <div className={styles.diagramPanel}>
          <div
            className={styles.latticeStage}
            role="img"
            aria-label={`${selected.name} projected unit cell with ${defectLabels[defect].toLowerCase()}.`}
          >
            <span className={styles.cellEdge} aria-hidden="true" />
            {visibleAtoms.map((atom, index) => {
              const isSubstitution = defect === "substitutional" && index === visibleAtoms.length - 1;
              return (
                <span
                  aria-hidden="true"
                  className={`${styles.atom} ${styles[atom.site]} ${isSubstitution ? styles.substitution : ""}`}
                  key={`${atom.x}-${atom.y}-${atom.site}`}
                  style={{ left: `${atom.x}%`, top: `${atom.y}%` }}
                />
              );
            })}
            {defect === "vacancy" && (
              <span className={styles.vacancy} aria-hidden="true" style={{ left: "87%", top: "13%" }} />
            )}
            {defect === "interstitial" && (
              <span className={styles.interstitial} aria-hidden="true" style={{ left: "68%", top: "64%" }} />
            )}
          </div>

          <ul className={styles.legend} aria-label="Diagram legend">
            <li><span className={styles.legendHost} aria-hidden="true" /> Host atom</li>
            <li><span className={styles.legendSpecial} aria-hidden="true" /> Defect atom</li>
            <li><span className={styles.legendVacancy} aria-hidden="true" /> Vacant site</li>
          </ul>
        </div>

        <aside className={styles.readout} aria-live="polite">
          <p className={styles.readoutLabel}>Current model</p>
          <h3>{selected.name}</h3>
          <dl>
            <div>
              <dt>Coordination number</dt>
              <dd>{selected.coordination}</dd>
            </div>
            <div>
              <dt>Ideal packing fraction</dt>
              <dd>{selected.packing}</dd>
            </div>
            <div>
              <dt>Local condition</dt>
              <dd>{defectLabels[defect]}</dd>
            </div>
          </dl>
          <p className={styles.note}>
            This is a teaching projection, not an atomistically scaled 3D model. Corner and face atoms are shared by
            neighbouring cells in the full crystal.
          </p>
        </aside>
      </div>
    </section>
  );
}
