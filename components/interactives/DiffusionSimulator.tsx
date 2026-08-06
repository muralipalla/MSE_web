"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./DiffusionSimulator.module.css";

const GAS_CONSTANT = 8.314;
const PRE_EXPONENTIAL = 1.6e-5;
const ACTIVATION_ENERGY = 148_000;
const INITIAL_CONCENTRATION = 0.2;
const SURFACE_CONCENTRATION = 1.0;
const MAX_DEPTH_MM = 2.5;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function erf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const approximation = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * approximation;
}

function diffusivityAt(temperatureC: number) {
  const temperatureK = temperatureC + 273.15;
  return PRE_EXPONENTIAL * Math.exp(-ACTIVATION_ENERGY / (GAS_CONSTANT * temperatureK));
}

function concentrationAt(depthMm: number, diffusivity: number, timeSeconds: number) {
  if (depthMm === 0) return SURFACE_CONCENTRATION;
  const depthM = depthMm / 1000;
  const argument = depthM / (2 * Math.sqrt(diffusivity * timeSeconds));
  return SURFACE_CONCENTRATION - (SURFACE_CONCENTRATION - INITIAL_CONCENTRATION) * erf(argument);
}

function drawProfile(
  canvas: HTMLCanvasElement,
  diffusivity: number,
  timeSeconds: number,
  temperatureC: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 30, right: 32, bottom: 64, left: 78 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const minConcentration = 0.1;
  const maxConcentration = 1.05;

  const x = (depthMm: number) => margin.left + (depthMm / MAX_DEPTH_MM) * plotWidth;
  const y = (concentration: number) =>
    margin.top + plotHeight - ((concentration - minConcentration) / (maxConcentration - minConcentration)) * plotHeight;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fffdf9";
  context.fillRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.font = "13px system-ui, sans-serif";

  context.textAlign = "center";
  context.textBaseline = "top";
  for (let index = 0; index <= 5; index += 1) {
    const depth = (MAX_DEPTH_MM / 5) * index;
    const xPosition = x(depth);
    context.beginPath();
    context.moveTo(xPosition, margin.top);
    context.lineTo(xPosition, margin.top + plotHeight);
    context.strokeStyle = "rgba(46, 42, 116, 0.10)";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = "#676294";
    context.fillText(depth.toFixed(1), xPosition, margin.top + plotHeight + 12);
  }

  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let index = 0; index <= 5; index += 1) {
    const concentration = minConcentration + ((maxConcentration - minConcentration) / 5) * index;
    const yPosition = y(concentration);
    context.beginPath();
    context.moveTo(margin.left, yPosition);
    context.lineTo(margin.left + plotWidth, yPosition);
    context.strokeStyle = "rgba(46, 42, 116, 0.10)";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = "#676294";
    context.fillText(concentration.toFixed(2), margin.left - 12, yPosition);
  }

  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left, margin.top + plotHeight);
  context.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  context.strokeStyle = "#2e2a74";
  context.lineWidth = 2;
  context.stroke();

  const gradient = context.createLinearGradient(margin.left, 0, margin.left + plotWidth, 0);
  gradient.addColorStop(0, "rgba(201, 59, 31, 0.30)");
  gradient.addColorStop(1, "rgba(201, 59, 31, 0.02)");
  context.beginPath();
  context.moveTo(x(0), y(minConcentration));
  for (let index = 0; index <= 220; index += 1) {
    const depth = (MAX_DEPTH_MM / 220) * index;
    context.lineTo(x(depth), y(concentrationAt(depth, diffusivity, timeSeconds)));
  }
  context.lineTo(x(MAX_DEPTH_MM), y(minConcentration));
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  context.beginPath();
  for (let index = 0; index <= 220; index += 1) {
    const depth = (MAX_DEPTH_MM / 220) * index;
    const pointX = x(depth);
    const pointY = y(concentrationAt(depth, diffusivity, timeSeconds));
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.strokeStyle = "#c93b1f";
  context.lineWidth = 5;
  context.stroke();

  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillStyle = "#2e2a74";
  context.font = "700 13px system-ui, sans-serif";
  context.fillText(`${temperatureC} °C`, width - margin.right, margin.top + 8);

  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.font = "700 14px system-ui, sans-serif";
  context.fillText("Depth below surface (mm)", margin.left + plotWidth / 2, height - 8);

  context.save();
  context.translate(18, margin.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillText("Carbon concentration (wt%)", 0, 0);
  context.restore();
}

export default function DiffusionSimulator() {
  const [temperatureC, setTemperatureC] = useState(900);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const temperatureId = useId();
  const timeId = useId();
  const diffusivity = useMemo(() => diffusivityAt(temperatureC), [temperatureC]);
  const timeSeconds = timeMinutes * 60;
  const characteristicDepthMm = 2 * Math.sqrt(diffusivity * timeSeconds) * 1000;
  const sampleDepths = [0, 0.1, 0.25, 0.5, 1, 2];

  useEffect(() => {
    if (canvasRef.current) drawProfile(canvasRef.current, diffusivity, timeSeconds, temperatureC);
  }, [diffusivity, temperatureC, timeSeconds]);

  const reset = () => {
    setTemperatureC(900);
    setTimeMinutes(60);
  };

  return (
    <section className={styles.card} aria-labelledby="diffusion-title">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Interactive simulation</p>
          <h2 id="diffusion-title">Carbon diffusion profile</h2>
          <p className={styles.intro}>
            Explore how temperature and time change a one-dimensional concentration profile during idealized carburizing.
          </p>
        </div>
        <button className={styles.resetButton} type="button" onClick={reset}>
          Reset defaults
        </button>
      </div>

      <div className={styles.controls} aria-label="Diffusion inputs">
        <div className={styles.controlGroup}>
          <div className={styles.controlHeading}>
            <label htmlFor={temperatureId}>Temperature</label>
            <output htmlFor={temperatureId}>{temperatureC} °C</output>
          </div>
          <input
            id={temperatureId}
            type="range"
            min="700"
            max="1200"
            step="25"
            value={temperatureC}
            onChange={(event) => setTemperatureC(clamp(Number(event.target.value), 700, 1200))}
          />
          <div className={styles.rangeEnds} aria-hidden="true"><span>700 °C</span><span>1200 °C</span></div>
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.controlHeading}>
            <label htmlFor={timeId}>Hold time</label>
            <output htmlFor={timeId}>{timeMinutes} min</output>
          </div>
          <input
            id={timeId}
            type="range"
            min="5"
            max="240"
            step="5"
            value={timeMinutes}
            onChange={(event) => setTimeMinutes(clamp(Number(event.target.value), 5, 240))}
          />
          <div className={styles.rangeEnds} aria-hidden="true"><span>5 min</span><span>240 min</span></div>
        </div>
      </div>

      <div className={styles.summaryGrid} aria-live="polite">
        <div>
          <span>Diffusivity, D</span>
          <strong>{diffusivity.toExponential(2)} m²/s</strong>
        </div>
        <div>
          <span>Characteristic depth, 2√Dt</span>
          <strong>{characteristicDepthMm.toFixed(3)} mm</strong>
        </div>
        <div>
          <span>Profile conditions</span>
          <strong>{temperatureC} °C for {timeMinutes} min</strong>
        </div>
      </div>

      <div className={styles.graphShell}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width="820"
          height="430"
          role="img"
          aria-label={`Predicted carbon concentration versus depth at ${temperatureC} degrees Celsius after ${timeMinutes} minutes. Characteristic diffusion depth ${characteristicDepthMm.toFixed(3)} millimetres.`}
        >
          The canvas shows carbon concentration versus depth. Equivalent values are provided in the table below.
        </canvas>
      </div>

      <div className={styles.lowerGrid}>
        <div className={styles.tableWrap}>
          <table>
            <caption>Predicted profile values</caption>
            <thead>
              <tr><th scope="col">Depth</th><th scope="col">Carbon</th></tr>
            </thead>
            <tbody>
              {sampleDepths.map((depth) => (
                <tr key={depth}>
                  <th scope="row">{depth.toFixed(depth === 0 ? 1 : 2)} mm</th>
                  <td>{concentrationAt(depth, diffusivity, timeSeconds).toFixed(3)} wt%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className={styles.assumptions}>
          <h3>Model assumptions</h3>
          <ul>
            <li>Semi-infinite solid with a constant 1.0 wt% surface concentration.</li>
            <li>Initial concentration is uniform at 0.2 wt% carbon.</li>
            <li>One-dimensional Fickian diffusion with constant D at each temperature.</li>
            <li>Arrhenius constants are illustrative for carbon in austenite; phase changes, trapping and concentration dependence are omitted.</li>
          </ul>
          <p>Use this model to build intuition, not to set heat-treatment specifications.</p>
        </aside>
      </div>
    </section>
  );
}
