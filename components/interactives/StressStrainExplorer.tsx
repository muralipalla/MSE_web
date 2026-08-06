"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./StressStrainExplorer.module.css";

type MaterialKey = "steel" | "aluminium" | "pmma";

type Material = {
  name: string;
  modulusGPa: number;
  yieldMPa: number;
  ultimateMPa: number;
  fractureStrain: number;
  behavior: string;
  color: string;
};

const materials: Record<MaterialKey, Material> = {
  steel: {
    name: "Structural steel",
    modulusGPa: 200,
    yieldMPa: 250,
    ultimateMPa: 450,
    fractureStrain: 0.25,
    behavior: "Stiff, ductile and strongly strain-hardening",
    color: "#386694",
  },
  aluminium: {
    name: "Aluminium alloy",
    modulusGPa: 69,
    yieldMPa: 275,
    ultimateMPa: 310,
    fractureStrain: 0.12,
    behavior: "Lower stiffness with moderate ductility",
    color: "#6f60a6",
  },
  pmma: {
    name: "PMMA polymer",
    modulusGPa: 3.1,
    yieldMPa: 65,
    ultimateMPa: 70,
    fractureStrain: 0.055,
    behavior: "Compliant and comparatively low-strength",
    color: "#c93b1f",
  },
};

function stressAt(strain: number, material: Material) {
  const elasticLimit = material.yieldMPa / (material.modulusGPa * 1000);
  const peakStrain = Math.max(elasticLimit * 2.25, material.fractureStrain * 0.64);

  if (strain <= elasticLimit) return material.modulusGPa * 1000 * strain;
  if (strain <= peakStrain) {
    const progress = (strain - elasticLimit) / (peakStrain - elasticLimit);
    return material.yieldMPa + (material.ultimateMPa - material.yieldMPa) * Math.sqrt(progress);
  }

  const progress = (strain - peakStrain) / (material.fractureStrain - peakStrain);
  return material.ultimateMPa * (1 - 0.18 * Math.max(0, progress));
}

function drawGraph(canvas: HTMLCanvasElement, material: Material) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 30, right: 32, bottom: 64, left: 78 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxStrain = material.fractureStrain * 1.12;
  const maxStress = material.ultimateMPa * 1.2;

  const x = (strain: number) => margin.left + (strain / maxStrain) * plotWidth;
  const y = (stress: number) => margin.top + plotHeight - (stress / maxStress) * plotHeight;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fffdf9";
  context.fillRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";

  context.font = "13px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  for (let index = 0; index <= 5; index += 1) {
    const strain = (maxStrain / 5) * index;
    const xPosition = x(strain);
    context.beginPath();
    context.moveTo(xPosition, margin.top);
    context.lineTo(xPosition, margin.top + plotHeight);
    context.strokeStyle = "rgba(46, 42, 116, 0.10)";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = "#676294";
    context.fillText(`${(strain * 100).toFixed(1)}%`, xPosition, margin.top + plotHeight + 12);
  }

  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let index = 0; index <= 5; index += 1) {
    const stress = (maxStress / 5) * index;
    const yPosition = y(stress);
    context.beginPath();
    context.moveTo(margin.left, yPosition);
    context.lineTo(margin.left + plotWidth, yPosition);
    context.strokeStyle = "rgba(46, 42, 116, 0.10)";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = "#676294";
    context.fillText(`${Math.round(stress)}`, margin.left - 12, yPosition);
  }

  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left, margin.top + plotHeight);
  context.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  context.strokeStyle = "#2e2a74";
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  for (let index = 0; index <= 180; index += 1) {
    const strain = (material.fractureStrain / 180) * index;
    const pointX = x(strain);
    const pointY = y(stressAt(strain, material));
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.strokeStyle = material.color;
  context.lineWidth = 5;
  context.stroke();

  const yieldStrain = material.yieldMPa / (material.modulusGPa * 1000);
  context.beginPath();
  context.arc(x(yieldStrain), y(material.yieldMPa), 6, 0, Math.PI * 2);
  context.fillStyle = "#f05030";
  context.fill();
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.stroke();

  context.textAlign = "left";
  context.textBaseline = "bottom";
  context.font = "700 13px system-ui, sans-serif";
  context.fillStyle = "#2e2a74";
  context.fillText("Yield", x(yieldStrain) + 10, y(material.yieldMPa) - 7);

  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.font = "700 14px system-ui, sans-serif";
  context.fillText("Engineering strain", margin.left + plotWidth / 2, height - 8);

  context.save();
  context.translate(18, margin.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillText("Engineering stress (MPa)", 0, 0);
  context.restore();
}

export default function StressStrainExplorer() {
  const [materialKey, setMaterialKey] = useState<MaterialKey>("steel");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectId = useId();
  const material = materials[materialKey];
  const yieldStrain = material.yieldMPa / (material.modulusGPa * 1000);

  useEffect(() => {
    if (canvasRef.current) drawGraph(canvasRef.current, material);
  }, [material]);

  return (
    <section className={styles.card} aria-labelledby="stress-strain-title">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Interactive graph</p>
          <h2 id="stress-strain-title">Stress–strain response</h2>
          <p className={styles.intro}>
            Change the material to compare stiffness, yield strength and ductility on an idealized engineering curve.
          </p>
        </div>
        <button className={styles.resetButton} type="button" onClick={() => setMaterialKey("steel")}>
          Reset defaults
        </button>
      </div>

      <div className={styles.controlBar}>
        <label htmlFor={selectId}>Material model</label>
        <select
          id={selectId}
          value={materialKey}
          onChange={(event) => setMaterialKey(event.target.value as MaterialKey)}
        >
          <option value="steel">Structural steel</option>
          <option value="aluminium">Aluminium alloy</option>
          <option value="pmma">PMMA polymer</option>
        </select>
        <p aria-live="polite">Now showing {material.name}: {material.behavior.toLowerCase()}.</p>
      </div>

      <div className={styles.graphShell}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width="820"
          height="430"
          role="img"
          aria-label={`${material.name} idealized engineering stress-strain curve. Yield strength ${material.yieldMPa} megapascals and fracture strain ${(material.fractureStrain * 100).toFixed(1)} percent.`}
        >
          The canvas shows an engineering stress–strain curve. The same values are provided in the table below.
        </canvas>
        <p className={styles.caption}>
          The orange marker indicates first yield. Curves are representative teaching models, not design allowables.
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <caption>Accessible data summary for {material.name}</caption>
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Value</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Elastic modulus</th>
              <td>{material.modulusGPa} GPa</td>
              <td>Slope in the initial elastic region</td>
            </tr>
            <tr>
              <th scope="row">Yield strength</th>
              <td>{material.yieldMPa} MPa</td>
              <td>Plastic deformation begins near {(yieldStrain * 100).toFixed(3)}% strain</td>
            </tr>
            <tr>
              <th scope="row">Ultimate tensile strength</th>
              <td>{material.ultimateMPa} MPa</td>
              <td>Maximum engineering stress in this model</td>
            </tr>
            <tr>
              <th scope="row">Fracture strain</th>
              <td>{(material.fractureStrain * 100).toFixed(1)}%</td>
              <td>Idealized strain at failure</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
