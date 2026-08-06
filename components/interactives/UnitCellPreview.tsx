import styles from "./UnitCellPreview.module.css";

export default function UnitCellPreview() {
  return (
    <article className={styles.card} aria-labelledby="unit-cell-preview-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>3D experience preview</p>
        <h2 id="unit-cell-preview-title">Turn a unit cell in space</h2>
        <p>
          The production 3D explorer will let learners rotate, zoom and isolate lattice sites. This CSS model previews
          the visual language while the WebGL learning module is developed.
        </p>
        <ul>
          <li>Keyboard-controlled camera and labelled lattice sites</li>
          <li>SC, BCC and FCC layers with coordination overlays</li>
          <li>Reduced-motion and static-model alternatives</li>
        </ul>
        <span className={styles.status}>Planned interactive · preview available</span>
      </div>

      <div
        className={styles.scene}
        role="img"
        tabIndex={0}
        aria-label="Slowly rotating translucent cube with a central orange atom, previewing a body-centred cubic unit cell. Motion stops when reduced motion is requested."
      >
        <div className={styles.cube} aria-hidden="true">
          <span className={`${styles.face} ${styles.front}`} />
          <span className={`${styles.face} ${styles.back}`} />
          <span className={`${styles.face} ${styles.right}`} />
          <span className={`${styles.face} ${styles.left}`} />
          <span className={`${styles.face} ${styles.top}`} />
          <span className={`${styles.face} ${styles.bottom}`} />
          <span className={styles.bodyAtom} />
        </div>
        <span className={styles.axisX} aria-hidden="true">x</span>
        <span className={styles.axisY} aria-hidden="true">y</span>
        <span className={styles.axisZ} aria-hidden="true">z</span>
      </div>
    </article>
  );
}
