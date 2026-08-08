import {
  EV_PER_ANGSTROM_CUBED_TO_GPA,
  EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2,
  calculateBondModel,
  calculateShearModel
} from "../../js/atomic-bond-model.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const tensileDefaults = {
  epsilon: 1,
  sigma: 1,
  m: 12,
  n: 6,
  openingRatio: 0
};

const shearDefaults = {
  shearModulusGPa: 80,
  burgersNm: 0.25,
  planeSpacingNm: 0.25,
  displacementRatio: 0
};

const elements = {
  energyScale: document.querySelector("#energy-scale"),
  energyScaleValue: document.querySelector("#energy-scale-value"),
  lengthScale: document.querySelector("#length-scale"),
  lengthScaleValue: document.querySelector("#length-scale-value"),
  repulsiveExponent: document.querySelector("#repulsive-exponent"),
  repulsiveExponentValue: document.querySelector("#repulsive-exponent-value"),
  attractiveExponent: document.querySelector("#attractive-exponent"),
  attractiveExponentValue: document.querySelector("#attractive-exponent-value"),
  separation: document.querySelector("#separation"),
  separationValue: document.querySelector("#separation-value"),
  releaseTensile: document.querySelector("#release-tensile"),
  resetTensile: document.querySelector("#reset-tensile"),
  tensileStage: document.querySelector("#tensile-stage"),
  tensileStageDescription: document.querySelector("#tensile-stage-description"),
  leftAtomGroup: document.querySelector("#left-atom-group"),
  rightAtomGroup: document.querySelector("#right-atom-group"),
  tensileBonds: document.querySelector("#tensile-bonds"),
  leftTractionArrow: document.querySelector("#left-traction-arrow"),
  rightTractionArrow: document.querySelector("#right-traction-arrow"),
  separationBracket: document.querySelector("#separation-bracket"),
  separationLeftTick: document.querySelector("#separation-left-tick"),
  separationRightTick: document.querySelector("#separation-right-tick"),
  tensileDistanceLabel: document.querySelector("#tensile-distance-label"),
  tensileGauge: document.querySelector("#tensile-gauge"),
  tensileGaugeFill: document.querySelector("#tensile-gauge-fill"),
  tensileGaugeNeedle: document.querySelector("#tensile-gauge-needle"),
  tensileGaugeValue: document.querySelector("#tensile-gauge-value"),
  tensileGaugeRatio: document.querySelector("#tensile-gauge-ratio"),
  tensileScaleMax: document.querySelector("#tensile-scale-max"),
  tensileScale75: document.querySelector("#tensile-scale-75"),
  tensileScale50: document.querySelector("#tensile-scale-50"),
  tensileScale25: document.querySelector("#tensile-scale-25"),
  tensileScaleZero: document.querySelector("#tensile-scale-zero"),
  selectedActualSpacing: document.querySelector("#selected-actual-spacing"),
  selectedSeparationEnergy: document.querySelector("#selected-separation-energy"),
  selectedForce: document.querySelector("#selected-force"),
  selectedTraction: document.querySelector("#selected-traction"),
  selectedRegion: document.querySelector("#selected-region"),
  tensileChartWrap: document.querySelector("#tensile-chart-wrap"),
  tensileChart: document.querySelector("#tensile-chart"),
  tensileChartSummary: document.querySelector("#tensile-chart-live-summary"),
  tensileMotionStatus: document.querySelector("#tensile-motion-status"),
  shearModulus: document.querySelector("#shear-modulus"),
  shearModulusValue: document.querySelector("#shear-modulus-value"),
  burgersVector: document.querySelector("#burgers-vector"),
  burgersVectorValue: document.querySelector("#burgers-vector-value"),
  planeSpacing: document.querySelector("#plane-spacing"),
  planeSpacingValue: document.querySelector("#plane-spacing-value"),
  shearDisplacement: document.querySelector("#shear-displacement"),
  shearDisplacementValue: document.querySelector("#shear-displacement-value"),
  releaseShear: document.querySelector("#release-shear"),
  resetShear: document.querySelector("#reset-shear"),
  shearStage: document.querySelector("#shear-stage"),
  shearStageDescription: document.querySelector("#shear-stage-description"),
  upperAtomGroup: document.querySelector("#upper-atom-group"),
  lowerAtomGroup: document.querySelector("#lower-atom-group"),
  upperShearArrow: document.querySelector("#upper-shear-arrow"),
  lowerShearArrow: document.querySelector(".shear-arrows line:nth-of-type(2)"),
  shearDisplacementLabel: document.querySelector("#shear-displacement-label"),
  shearRegistryLabel: document.querySelector("#shear-registry-label"),
  shearGauge: document.querySelector("#shear-gauge"),
  shearGaugeFill: document.querySelector("#shear-gauge-fill"),
  shearGaugeNeedle: document.querySelector("#shear-gauge-needle"),
  shearGaugeValue: document.querySelector("#shear-gauge-value"),
  shearGaugeRatio: document.querySelector("#shear-gauge-ratio"),
  shearScaleMax: document.querySelector("#shear-scale-max"),
  shearScaleHalf: document.querySelector("#shear-scale-half"),
  shearScaleZero: document.querySelector("#shear-scale-zero"),
  shearScaleNegativeHalf: document.querySelector("#shear-scale-negative-half"),
  shearScaleMin: document.querySelector("#shear-scale-min"),
  selectedShearTraction: document.querySelector("#selected-shear-traction"),
  selectedShearEnergy: document.querySelector("#selected-shear-energy"),
  shearMaximumResult: document.querySelector("#shear-maximum-result"),
  selectedRegistry: document.querySelector("#selected-registry"),
  shearChartWrap: document.querySelector("#shear-chart-wrap"),
  shearChart: document.querySelector("#shear-chart"),
  shearChartSummary: document.querySelector("#shear-chart-live-summary"),
  shearMotionStatus: document.querySelector("#shear-motion-status")
};

const results = {
  equilibrium: document.querySelector("#equilibrium-result"),
  forceLocation: document.querySelector("#force-location-result"),
  strength: document.querySelector("#strength-result"),
  stiffness: document.querySelector("#stiffness-result"),
  bondDensity: document.querySelector("#bond-density-result"),
  modulus: document.querySelector("#modulus-result"),
  modulusSi: document.querySelector("#modulus-si-result"),
  cohesive: document.querySelector("#cohesive-result"),
  cohesiveSi: document.querySelector("#cohesive-si-result"),
  cohesiveSiTable: document.querySelector("#cohesive-si-table-result"),
  separationWork: document.querySelector("#separation-work-result"),
  separationWorkSi: document.querySelector("#separation-work-si-result"),
  surface: document.querySelector("#surface-result"),
  surfaceSi: document.querySelector("#surface-si-result")
};

let tensileModel;
let shearModel;
let tensileChartGeometry;
let shearChartGeometry;
let resizeFrame = 0;
let tensileReturnFrame = 0;
let shearReturnFrame = 0;
let tensileReturning = false;
let shearReturning = false;
let shearReturnTarget = 0;
let tensileReturnToken = 0;
let shearReturnToken = 0;
let tensileLastChartFrame = 0;
let shearLastChartFrame = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

buildTensileAtoms();
buildShearAtoms();
bindControls();
updateTensile();
updateShear();

function bindControls() {
  [
    elements.energyScale,
    elements.lengthScale,
    elements.repulsiveExponent,
    elements.attractiveExponent
  ].forEach((control) => control.addEventListener("input", () => {
    cancelTensileReturn();
    updateTensile();
  }));

  elements.separation.addEventListener("pointerdown", cancelTensileReturn);
  elements.separation.addEventListener("keydown", cancelTensileReturn);
  elements.separation.addEventListener("input", () => {
    cancelTensileReturn();
    updateTensile();
    elements.tensileMotionStatus.textContent = "The selected opening is being held. Select Release tensile load to remove the holding force.";
  });
  elements.releaseTensile.addEventListener("click", releaseTensile);
  elements.resetTensile.addEventListener("click", resetTensile);
  elements.tensileChart.addEventListener("pointerdown", (event) => {
    cancelTensileReturn();
    selectTensileFromChart(event);
    elements.tensileMotionStatus.textContent = "The graph-selected opening is being held. Select Release tensile load to relax toward equilibrium.";
  });

  [elements.shearModulus, elements.burgersVector, elements.planeSpacing]
    .forEach((control) => control.addEventListener("input", () => {
      cancelShearReturn();
      updateShear();
    }));

  elements.shearDisplacement.addEventListener("pointerdown", cancelShearReturn);
  elements.shearDisplacement.addEventListener("keydown", cancelShearReturn);
  elements.shearDisplacement.addEventListener("input", () => {
    cancelShearReturn();
    updateShear();
    elements.shearMotionStatus.textContent = "The selected displacement is being held. Select Release shear load to relax to the nearest energy minimum.";
  });
  elements.releaseShear.addEventListener("click", releaseShear);
  elements.resetShear.addEventListener("click", resetShear);
  elements.shearChart.addEventListener("pointerdown", (event) => {
    cancelShearReturn();
    selectShearFromChart(event);
    elements.shearMotionStatus.textContent = "The graph-selected displacement is being held. Select Release shear load to relax to the nearest energy minimum.";
  });

  const schedule = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      renderTensileChart();
      renderShearChart();
    });
  };

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(elements.tensileChartWrap);
    observer.observe(elements.shearChartWrap);
  } else {
    window.addEventListener("resize", schedule);
  }

  const finishForReducedMotion = () => {
    if (!reducedMotion.matches) return;
    if (tensileReturning) finishTensileReturn(true);
    if (shearReturning) finishShearReturn(true);
  };
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", finishForReducedMotion);
  } else {
    reducedMotion.addListener(finishForReducedMotion);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (tensileReturning) finishTensileReturn(false);
    if (shearReturning) finishShearReturn(false);
  });
}

function resetTensile() {
  cancelTensileReturn();
  elements.energyScale.value = String(tensileDefaults.epsilon);
  elements.lengthScale.value = String(tensileDefaults.sigma);
  elements.repulsiveExponent.value = String(tensileDefaults.m);
  elements.attractiveExponent.value = String(tensileDefaults.n);
  elements.separation.value = String(tensileDefaults.openingRatio);
  updateTensile();
  elements.tensileMotionStatus.textContent = "Equilibrium energy minimum: δ = 0. Move the slider to hold an opening, then release the load.";
}

function resetShear() {
  cancelShearReturn();
  elements.shearModulus.value = String(shearDefaults.shearModulusGPa);
  elements.burgersVector.value = String(shearDefaults.burgersNm);
  elements.planeSpacing.value = String(shearDefaults.planeSpacingNm);
  elements.shearDisplacement.value = String(shearDefaults.displacementRatio);
  updateShear();
  elements.shearMotionStatus.textContent = "Stable energy minimum: u/b = 0. Move the slider to hold a displacement, then release the load.";
}

function releaseTensile() {
  if (tensileReturning || !tensileModel) return;
  const opening = tensileOpening();
  const tolerance = 1e-9 * tensileModel.sigma;

  if (opening <= tolerance) {
    elements.separation.value = "0";
    updateTensile();
    elements.tensileMotionStatus.textContent = "Already at equilibrium: δ = 0.";
    return;
  }

  startTensileReturn();
}

function startTensileReturn() {
  cancelTensileReturn();
  const initialRatio = Number(elements.separation.value);

  if (reducedMotion.matches) {
    elements.separation.value = "0";
    updateTensile();
    elements.tensileMotionStatus.textContent = "Returned to equilibrium without animation because reduced motion is enabled.";
    return;
  }

  tensileReturning = true;
  const token = ++tensileReturnToken;
  const duration = 720;
  let startTime;
  tensileLastChartFrame = 0;
  elements.tensileMotionStatus.textContent = "Applied load removed. The atoms are returning gradually; inward arrows show the internal restoring traction.";

  const animate = (timestamp) => {
    if (!tensileReturning || token !== tensileReturnToken) return;
    if (startTime === undefined) startTime = timestamp;
    const progress = clamp((timestamp - startTime) / duration, 0, 1);
    const remainingRatio = initialRatio * Math.pow(1 - progress, 3);
    elements.separation.value = remainingRatio.toFixed(4);
    updateTensile(false);
    if (timestamp - tensileLastChartFrame >= 70) {
      renderTensileChart();
      tensileLastChartFrame = timestamp;
    }
    if (progress < 1) {
      tensileReturnFrame = requestAnimationFrame(animate);
    } else {
      finishTensileReturn(false);
    }
  };

  tensileReturnFrame = requestAnimationFrame(animate);
}

function finishTensileReturn(reduced = false) {
  cancelAnimationFrame(tensileReturnFrame);
  tensileReturnFrame = 0;
  tensileReturnToken += 1;
  tensileReturning = false;
  elements.separation.value = "0";
  updateTensile();
  elements.tensileMotionStatus.textContent = reduced
    ? "Returned to equilibrium without animation because reduced motion is enabled."
    : "Elastic recovery complete: δ = 0 and the planes are back at equilibrium.";
}

function cancelTensileReturn() {
  cancelAnimationFrame(tensileReturnFrame);
  tensileReturnFrame = 0;
  tensileReturnToken += 1;
  tensileReturning = false;
}

function releaseShear() {
  if (shearReturning || !shearModel) return;
  const displacement = shearModel.displacementRatio;
  const tolerance = 1e-9;

  if (displacement <= tolerance || 1 - displacement <= tolerance) {
    updateShear();
    elements.shearMotionStatus.textContent = `Already at an equivalent stable energy minimum: u/b = ${displacement < 0.5 ? "0" : "1"}.`;
    return;
  }

  if (Math.abs(displacement - 0.5) <= tolerance) {
    elements.shearMotionStatus.textContent = "u/b = 0.5 is the unstable energy maximum and is equally distant from both minima. Move slightly to either side, then release the load.";
    return;
  }

  startShearReturn(displacement < 0.5 ? 0 : 1);
}

function startShearReturn(target) {
  cancelShearReturn();
  const initialRatio = Number(elements.shearDisplacement.value);
  shearReturnTarget = target;

  if (reducedMotion.matches) {
    elements.shearDisplacement.value = String(target);
    updateShear();
    elements.shearMotionStatus.textContent = `Relaxed to the nearest stable registry, u/b = ${target}, without animation because reduced motion is enabled.`;
    return;
  }

  shearReturning = true;
  const token = ++shearReturnToken;
  const duration = 720;
  let startTime;
  shearLastChartFrame = 0;
  elements.shearMotionStatus.textContent = `Applied shear removed. The crystal is relaxing toward the nearest energy minimum at u/b = ${target}; the arrows show the restoring traction.`;

  const animate = (timestamp) => {
    if (!shearReturning || token !== shearReturnToken) return;
    if (startTime === undefined) startTime = timestamp;
    const progress = clamp((timestamp - startTime) / duration, 0, 1);
    const relaxedRatio = target + (initialRatio - target) * Math.pow(1 - progress, 3);
    elements.shearDisplacement.value = relaxedRatio.toFixed(4);
    updateShear(false);
    if (timestamp - shearLastChartFrame >= 70) {
      renderShearChart();
      shearLastChartFrame = timestamp;
    }
    if (progress < 1) {
      shearReturnFrame = requestAnimationFrame(animate);
    } else {
      finishShearReturn(false);
    }
  };

  shearReturnFrame = requestAnimationFrame(animate);
}

function finishShearReturn(reduced = false) {
  cancelAnimationFrame(shearReturnFrame);
  shearReturnFrame = 0;
  shearReturnToken += 1;
  shearReturning = false;
  elements.shearDisplacement.value = String(shearReturnTarget);
  updateShear();
  elements.shearMotionStatus.textContent = reduced
    ? `Relaxed to the nearest stable registry, u/b = ${shearReturnTarget}, without animation because reduced motion is enabled.`
    : `Shear relaxation complete: the crystal reached the nearest energy minimum at u/b = ${shearReturnTarget}.`;
}

function cancelShearReturn() {
  cancelAnimationFrame(shearReturnFrame);
  shearReturnFrame = 0;
  shearReturnToken += 1;
  shearReturning = false;
}

function updateTensile(renderChart = true) {
  const epsilon = Number(elements.energyScale.value);
  const sigma = Number(elements.lengthScale.value);
  const m = Number(elements.repulsiveExponent.value);
  const n = Number(elements.attractiveExponent.value);
  const provisional = calculateBondModel({ epsilon, sigma, m, n, separationRatio: 1.2 });
  const equilibriumRatio = provisional.x0 / sigma;
  const maximumOpeningRatio = 2 - equilibriumRatio;
  elements.separation.min = "0";
  elements.separation.max = maximumOpeningRatio.toFixed(4);
  const openingRatio = clamp(Number(elements.separation.value), 0, maximumOpeningRatio);
  elements.separation.value = openingRatio.toFixed(4);

  tensileModel = calculateBondModel({
    epsilon,
    sigma,
    m,
    n,
    separationRatio: equilibriumRatio + openingRatio
  });

  updateTensileControls();
  updateTensileStage();
  updateTensileGauge();
  updateTensileReadings();
  updateTensileResults();
  if (renderChart) renderTensileChart();
}

function updateShear(renderChart = true) {
  shearModel = calculateShearModel({
    shearModulusGPa: Number(elements.shearModulus.value),
    burgersNm: Number(elements.burgersVector.value),
    planeSpacingNm: Number(elements.planeSpacing.value),
    displacementRatio: Number(elements.shearDisplacement.value)
  });

  updateShearControls();
  updateShearStage();
  updateShearGauge();
  updateShearReadings();
  if (renderChart) renderShearChart();
}

function updateTensileControls() {
  const opening = tensileOpening();
  elements.energyScaleValue.textContent = `${tensileModel.epsilon.toFixed(2)} eV`;
  elements.lengthScaleValue.textContent = `${tensileModel.sigma.toFixed(2)} Å`;
  elements.repulsiveExponentValue.textContent = String(tensileModel.m);
  elements.attractiveExponentValue.textContent = String(tensileModel.n);
  elements.separationValue.textContent = `${opening.toFixed(3)} Å`;
  elements.separation.setAttribute(
    "aria-valuetext",
    `Opening displacement ${opening.toFixed(3)} angstroms; actual spacing ${tensileModel.selectedX.toFixed(3)} angstroms; ${tensileRegion().toLowerCase()}`
  );
}

function updateShearControls() {
  elements.shearModulusValue.textContent = `${shearModel.shearModulusGPa.toFixed(0)} GPa`;
  elements.burgersVectorValue.textContent = `${shearModel.burgersNm.toFixed(3)} nm`;
  elements.planeSpacingValue.textContent = `${shearModel.planeSpacingNm.toFixed(3)} nm`;
  elements.shearDisplacementValue.textContent = shearModel.displacementRatio.toFixed(3);
  elements.shearDisplacement.setAttribute(
    "aria-valuetext",
    `${shearModel.displacementRatio.toFixed(3)} of one lattice translation, ${shearRegistry().toLowerCase()}`
  );
}

function buildTensileAtoms() {
  for (let row = 0; row < 4; row += 1) {
    const bond = svgElement("line", { class: "interfacial-bond", "data-row": row });
    elements.tensileBonds.append(bond);
    for (let column = 0; column < 3; column += 1) {
      elements.leftAtomGroup.append(svgElement("circle", {
        class: "stage-atom left",
        r: 21,
        "data-row": row,
        "data-column": column
      }));
      elements.rightAtomGroup.append(svgElement("circle", {
        class: "stage-atom right",
        r: 21,
        "data-row": row,
        "data-column": column
      }));
    }
  }
}

function updateTensileStage() {
  const opening = tensileOpening();
  const maximumOpening = 2 * tensileModel.sigma - tensileModel.x0;
  const fraction = clamp(opening / maximumOpening, 0, 1);
  const gap = 58 + 174 * fraction;
  const leftInterface = 340 - gap / 2;
  const rightInterface = 340 + gap / 2;
  const rows = [70, 125, 180, 235];

  elements.leftAtomGroup.querySelectorAll("circle").forEach((atom) => {
    const row = Number(atom.dataset.row);
    const column = Number(atom.dataset.column);
    atom.setAttribute("cx", String(leftInterface - (2 - column) * 48));
    atom.setAttribute("cy", String(rows[row]));
  });

  elements.rightAtomGroup.querySelectorAll("circle").forEach((atom) => {
    const row = Number(atom.dataset.row);
    const column = Number(atom.dataset.column);
    atom.setAttribute("cx", String(rightInterface + column * 48));
    atom.setAttribute("cy", String(rows[row]));
  });

  const bondVisibility = clamp(1 - fraction * 0.86, 0.14, 1);
  elements.tensileBonds.querySelectorAll("line").forEach((bond) => {
    const row = Number(bond.dataset.row);
    bond.setAttribute("x1", String(leftInterface + 18));
    bond.setAttribute("x2", String(rightInterface - 18));
    bond.setAttribute("y1", String(rows[row]));
    bond.setAttribute("y2", String(rows[row]));
    bond.style.opacity = String(bondVisibility);
  });

  const tractionRatio = clamp(tensileModel.selectedTraction / tensileModel.cohesiveStrength, 0, 1);
  const arrowLength = 12 + tractionRatio * 52;
  const leftOuter = leftInterface - 96;
  const rightOuter = rightInterface + 96;
  if (tensileReturning) {
    elements.leftTractionArrow.setAttribute("x1", String(leftOuter - 10 - arrowLength));
    elements.leftTractionArrow.setAttribute("x2", String(leftOuter - 10));
    elements.rightTractionArrow.setAttribute("x1", String(rightOuter + 10 + arrowLength));
    elements.rightTractionArrow.setAttribute("x2", String(rightOuter + 10));
  } else {
    elements.leftTractionArrow.setAttribute("x1", String(leftOuter - 10));
    elements.leftTractionArrow.setAttribute("x2", String(leftOuter - 10 - arrowLength));
    elements.rightTractionArrow.setAttribute("x1", String(rightOuter + 10));
    elements.rightTractionArrow.setAttribute("x2", String(rightOuter + 10 + arrowLength));
  }
  elements.leftTractionArrow.style.opacity = String(tractionRatio);
  elements.rightTractionArrow.style.opacity = String(tractionRatio);

  elements.separationBracket.setAttribute("x1", String(leftInterface));
  elements.separationBracket.setAttribute("x2", String(rightInterface));
  elements.separationLeftTick.setAttribute("x1", String(leftInterface));
  elements.separationLeftTick.setAttribute("x2", String(leftInterface));
  elements.separationRightTick.setAttribute("x1", String(rightInterface));
  elements.separationRightTick.setAttribute("x2", String(rightInterface));
  elements.tensileDistanceLabel.textContent = `δ = ${opening.toFixed(3)} Å`;

  const region = tensileRegion();
  const arrowDescription = tensileReturning
    ? "The inward arrows show the internal restoring traction after the applied load is removed."
    : "The outward arrows show the external holding traction.";
  elements.tensileStageDescription.textContent = `The opening displacement is ${opening.toFixed(3)} angstroms and the actual plane spacing is ${tensileModel.selectedX.toFixed(3)} angstroms. ${arrowDescription} The cohesive response is ${region.toLowerCase()}.`;
}

function updateTensileGauge() {
  const currentTraction = Math.abs(tensileModel.selectedTraction) < 1e-12
    ? 0
    : tensileModel.selectedTraction;
  const ratio = clamp(currentTraction / tensileModel.cohesiveStrength, 0, 1);
  const percent = ratio * 100;
  const tractionGPa = currentTraction * EV_PER_ANGSTROM_CUBED_TO_GPA;
  const maximumGPa = tensileModel.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA;
  elements.tensileGaugeFill.style.height = `${percent}%`;
  elements.tensileGaugeNeedle.style.bottom = `${percent}%`;
  elements.tensileGaugeValue.textContent = `${tractionGPa.toFixed(1)} GPa`;
  elements.tensileGaugeRatio.innerHTML = `Peak &sigma;<sub>max</sub> = ${maximumGPa.toFixed(1)} GPa`;
  elements.tensileScaleMax.textContent = formatGaugeTick(maximumGPa);
  elements.tensileScale75.textContent = formatGaugeTick(0.75 * maximumGPa);
  elements.tensileScale50.textContent = formatGaugeTick(0.5 * maximumGPa);
  elements.tensileScale25.textContent = formatGaugeTick(0.25 * maximumGPa);
  elements.tensileScaleZero.textContent = "0";
  const forceMeaning = tensileReturning
    ? "The scale shows the cohesive resistance while the arrows show its inward restoring direction."
    : "The arrows show the external holding direction.";
  elements.tensileGauge.setAttribute(
    "aria-label",
    `Cohesive traction is ${tractionGPa.toFixed(1)} gigapascals on a scale from zero to ${maximumGPa.toFixed(1)} gigapascals. ${forceMeaning} ${tensileRegion()}.`
  );
}

function updateTensileReadings() {
  const opening = tensileOpening();
  const peakOpening = tensilePeakOpening();
  const energyJm2 = tensileModel.selectedSeparationEnergy * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2;
  const tractionGPa = tensileModel.selectedTraction * EV_PER_ANGSTROM_CUBED_TO_GPA;
  const region = tensileRegion();
  elements.selectedActualSpacing.textContent = `${tensileModel.selectedX.toFixed(3)} Å`;
  elements.selectedSeparationEnergy.innerHTML = `${energyJm2.toFixed(2)} J/m<sup>2</sup>`;
  elements.selectedForce.textContent = `${formatSigned(tensileModel.selectedForce, 3)} eV/Å`;
  elements.selectedTraction.textContent = `${formatSigned(tractionGPa, 1)} GPa`;
  elements.selectedRegion.textContent = region;
  elements.tensileChartSummary.textContent = `Zero opening corresponds to the equilibrium spacing ${tensileModel.x0.toFixed(3)} angstroms. Cohesive traction reaches ${(
    tensileModel.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA
  ).toFixed(1)} gigapascals at opening ${peakOpening.toFixed(3)} angstroms. The selected opening is ${opening.toFixed(3)} angstroms and is ${region.toLowerCase()}.`;
}

function updateTensileResults() {
  results.equilibrium.textContent = `${tensileModel.x0.toFixed(3)} Å`;
  results.forceLocation.textContent = `${tensileModel.xm.toFixed(3)} Å`;
  results.strength.textContent = `${tensileModel.fmax.toFixed(3)} eV/Å`;
  results.cohesiveSi.textContent = `${(
    tensileModel.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA
  ).toFixed(1)} GPa`;
  results.stiffness.innerHTML = `${tensileModel.stiffness.toFixed(3)} eV/Å<sup>2</sup>`;
  results.bondDensity.innerHTML = `${tensileModel.bondDensity.toFixed(4)} Å<sup>−2</sup>`;
  results.modulus.innerHTML = `${tensileModel.modulus.toFixed(3)} eV/Å<sup>3</sup>`;
  results.modulusSi.textContent = `${(
    tensileModel.modulus * EV_PER_ANGSTROM_CUBED_TO_GPA
  ).toFixed(0)} GPa`;
  results.cohesive.innerHTML = `${tensileModel.cohesiveStrength.toFixed(3)} eV/Å<sup>3</sup>`;
  results.cohesiveSiTable.textContent = `${(
    tensileModel.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA
  ).toFixed(1)} GPa`;
  results.separationWork.innerHTML = `${tensileModel.separationWork.toFixed(4)} eV/Å<sup>2</sup>`;
  results.separationWorkSi.innerHTML = `${(
    tensileModel.separationWork * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2
  ).toFixed(2)} J/m<sup>2</sup>`;
  results.surface.innerHTML = `${tensileModel.surfaceEnergy.toFixed(4)} eV/Å<sup>2</sup>`;
  results.surfaceSi.innerHTML = `${(
    tensileModel.surfaceEnergy * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2
  ).toFixed(2)} J/m<sup>2</sup>`;
}

function tensileRegion() {
  const tolerance = 0.006 * tensileModel.sigma;
  if (Math.abs(tensileModel.selectedX - tensileModel.x0) <= tolerance) return "At equilibrium";
  if (Math.abs(tensileModel.selectedX - tensileModel.xm) <= tolerance) return "At peak strength";
  if (tensileModel.selectedX < tensileModel.xm) return "Traction rising";
  if (tensileModel.selectedTraction / tensileModel.cohesiveStrength < 0.12) return "Nearly separated";
  return "Bond softening";
}

function buildShearAtoms() {
  for (let index = -2; index <= 9; index += 1) {
    elements.lowerAtomGroup.append(
      svgElement("circle", { class: "stage-atom lower lower-interface", r: 20, cx: 66 + index * 68, cy: 185 }),
      svgElement("circle", { class: "stage-atom lower", r: 20, cx: 100 + index * 68, cy: 244 })
    );
    elements.upperAtomGroup.append(
      svgElement("circle", { class: "stage-atom upper upper-interface", r: 20, "data-base-x": 100 + index * 68, cy: 126 }),
      svgElement("circle", { class: "stage-atom upper", r: 20, "data-base-x": 66 + index * 68, cy: 67 })
    );
  }
}

function updateShearStage() {
  const shift = shearModel.displacementRatio * 68;
  elements.upperAtomGroup.querySelectorAll("circle").forEach((atom) => {
    const base = Number(atom.dataset.baseX);
    atom.setAttribute("cx", String(base + shift));
  });

  const registry = shearRegistry();
  elements.shearDisplacementLabel.textContent = `u/b = ${shearModel.displacementRatio.toFixed(3)}`;
  elements.shearRegistryLabel.textContent = registry;
  const relaxationDescription = shearReturning
    ? `The applied shear has been removed and the upper half is relaxing toward u/b = ${shearReturnTarget}.`
    : "The selected displacement is held by the external shear traction.";
  elements.shearStageDescription.textContent = `The upper half of one continuous triangular lattice is displaced by ${shearModel.displacementRatio.toFixed(3)} of one lattice translation relative to the lower half. ${relaxationDescription} ${registry}.`;

  const positive = shearModel.tractionGPa >= 0;
  const holdingDirection = positive ? 1 : -1;
  const upperDirection = shearReturning ? -holdingDirection : holdingDirection;
  const tractionRatio = Math.abs(shearModel.tractionGPa / shearModel.tauMaxGPa);
  const arrowHalfLength = 12 + 46 * tractionRatio;
  setArrowDirection(elements.upperShearArrow, upperDirection, 340, arrowHalfLength);
  setArrowDirection(elements.lowerShearArrow, -upperDirection, 160, arrowHalfLength);
  elements.upperShearArrow.style.opacity = String(tractionRatio);
  elements.lowerShearArrow.style.opacity = String(tractionRatio);
}

function updateShearGauge() {
  const currentTraction = Math.abs(shearModel.tractionGPa) < 1e-10 ? 0 : shearModel.tractionGPa;
  const ratio = clamp(currentTraction / shearModel.tauMaxGPa, -1, 1);
  const magnitude = Math.abs(ratio) * 50;
  const needleTop = 50 - ratio * 50;
  elements.shearGaugeFill.style.height = `${magnitude}%`;
  elements.shearGaugeFill.style.top = ratio >= 0 ? `${50 - magnitude}%` : "50%";
  elements.shearGaugeFill.style.background = ratio >= 0 ? "var(--lavender)" : "var(--blue)";
  elements.shearGaugeNeedle.style.top = `${needleTop}%`;
  elements.shearGaugeValue.textContent = `${formatSigned(currentTraction, 2)} GPa`;
  elements.shearGaugeRatio.innerHTML = `Peak |&tau;<sub>th</sub>| = ${shearModel.tauMaxGPa.toFixed(2)} GPa`;
  elements.shearScaleMax.textContent = formatGaugeTick(shearModel.tauMaxGPa, true);
  elements.shearScaleHalf.textContent = formatGaugeTick(0.5 * shearModel.tauMaxGPa, true);
  elements.shearScaleZero.textContent = "0";
  elements.shearScaleNegativeHalf.textContent = formatGaugeTick(-0.5 * shearModel.tauMaxGPa, true);
  elements.shearScaleMin.textContent = formatGaugeTick(-shearModel.tauMaxGPa, true);
  const forceMeaning = shearReturning
    ? "The scale shows the periodic shear resistance while the arrows show its restoring direction."
    : "The arrows show the external holding direction.";
  elements.shearGauge.setAttribute(
    "aria-label",
    `Holding shear traction is ${formatSpokenSigned(currentTraction, 2)} gigapascals on a scale from negative ${shearModel.tauMaxGPa.toFixed(2)} to positive ${shearModel.tauMaxGPa.toFixed(2)} gigapascals. ${forceMeaning} ${shearRegistry()}.`
  );
}

function updateShearReadings() {
  const registry = shearRegistry();
  elements.selectedShearTraction.textContent = `${formatSigned(shearModel.tractionGPa, 2)} GPa`;
  elements.selectedShearEnergy.innerHTML = `${shearModel.energyJm2.toFixed(3)} J/m<sup>2</sup>`;
  elements.shearMaximumResult.textContent = `${shearModel.tauMaxGPa.toFixed(2)} GPa`;
  elements.selectedRegistry.textContent = registry;
  elements.shearChartSummary.textContent = `The theoretical shear strength is ${shearModel.tauMaxGPa.toFixed(2)} gigapascals at one quarter translation. The energy barrier is ${shearModel.unstableFaultEnergyJm2.toFixed(3)} joules per square metre at one half translation. The selected displacement is ${shearModel.displacementRatio.toFixed(3)} and is described as ${registry.toLowerCase()}.`;
}

function shearRegistry() {
  const q = shearModel.displacementRatio;
  if (q <= 0.012 || q >= 0.988) return "Equivalent stable registry";
  if (Math.abs(q - 0.25) <= 0.012) return "Maximum positive traction";
  if (Math.abs(q - 0.5) <= 0.012) return "Unstable on-top barrier";
  if (Math.abs(q - 0.75) <= 0.012) return "Maximum negative traction";
  if (q < 0.5) return "Climbing toward the barrier";
  return "Descending toward equivalent registry";
}

function renderTensileChart() {
  if (!tensileModel) return;
  const layout = chartLayout(elements.tensileChartWrap, elements.tensileChart);
  const { width, height, compact, margin, innerWidth, innerHeight } = layout;
  const openingMin = 0;
  const openingMax = 2 * tensileModel.sigma - tensileModel.x0;
  const energyMax = tensileModel.separationWork * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2 * 1.08;
  const stressMax = tensileModel.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA * 1.16;
  const xScale = linearScale(openingMin, openingMax, margin.left, margin.left + innerWidth);
  const energyScale = linearScale(0, energyMax, margin.top + innerHeight, margin.top);
  const stressScale = linearScale(0, stressMax, margin.top + innerHeight, margin.top);
  tensileChartGeometry = { width, margin, innerWidth, openingMin, openingMax };

  clearSvg(elements.tensileChart, width, height);
  elements.tensileChart.append(
    svgElement("title", { id: "tensile-chart-title" }, "Energy of separation and cohesive traction"),
    svgElement("desc", { id: "tensile-chart-description" }, elements.tensileChartSummary.textContent)
  );

  const defs = svgElement("defs");
  const clip = svgElement("clipPath", { id: "tensile-chart-clip" });
  clip.append(svgElement("rect", { x: margin.left, y: margin.top, width: innerWidth, height: innerHeight }));
  const gradient = svgElement("linearGradient", { id: "tensile-energy-gradient", x1: "0", y1: "0", x2: "0", y2: "1" });
  gradient.append(
    svgElement("stop", { offset: "0", "stop-color": "#386694", "stop-opacity": "0.55" }),
    svgElement("stop", { offset: "1", "stop-color": "#386694", "stop-opacity": "0.03" })
  );
  defs.append(clip, gradient);
  elements.tensileChart.append(defs);

  drawChartScaffold({
    svg: elements.tensileChart,
    layout,
    xTicks: linearTicks(openingMin, openingMax, compact ? 4 : 6),
    leftTicks: linearTicks(0, energyMax, 5),
    rightTicks: linearTicks(0, stressMax, 5),
    xScale,
    leftScale: energyScale,
    rightScale: stressScale,
    xLabel: "Opening displacement δ = x − x₀ (Å)",
    leftLabel: "Separation energy W (J/m²)",
    rightLabel: "Cohesive traction σ (GPa)"
  });

  const samples = 320;
  const energyPoints = [];
  const stressPoints = [];
  for (let index = 0; index <= samples; index += 1) {
    const opening = openingMin + (index / samples) * (openingMax - openingMin);
    const x = tensileModel.x0 + opening;
    const energy = tensileModel.bondDensity * (tensileModel.potential(x) + tensileModel.epsilon) * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2;
    const stress = tensileModel.bondDensity * tensileModel.holdingForce(x) * EV_PER_ANGSTROM_CUBED_TO_GPA;
    energyPoints.push([xScale(opening), energyScale(clamp(energy, 0, energyMax))]);
    stressPoints.push([xScale(opening), stressScale(clamp(stress, 0, stressMax))]);
  }

  const plot = svgElement("g", { "clip-path": "url(#tensile-chart-clip)" });
  const area = pointsToAreaPath(energyPoints, energyScale(0));
  plot.append(
    svgElement("path", { class: "energy-area", d: area, fill: "url(#tensile-energy-gradient)" }),
    svgElement("path", { class: "energy-path", d: pointsToPath(energyPoints) }),
    svgElement("path", { class: "force-path", d: pointsToPath(stressPoints) })
  );

  const equilibriumX = xScale(0);
  const maximumX = xScale(tensilePeakOpening());
  const selectedX = xScale(tensileOpening());
  plot.append(
    svgElement("line", { class: "equilibrium-guide", x1: equilibriumX, y1: margin.top, x2: equilibriumX, y2: margin.top + innerHeight }),
    svgElement("line", { class: "maximum-guide", x1: maximumX, y1: margin.top, x2: maximumX, y2: margin.top + innerHeight }),
    svgElement("line", { class: "selection-guide", x1: selectedX, y1: margin.top, x2: selectedX, y2: margin.top + innerHeight })
  );

  const selectedEnergyJm2 = tensileModel.selectedSeparationEnergy * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2;
  const selectedStressGPa = tensileModel.selectedTraction * EV_PER_ANGSTROM_CUBED_TO_GPA;
  plot.append(
    svgElement("circle", { class: "energy-marker", cx: selectedX, cy: energyScale(selectedEnergyJm2), r: 5.5 }),
    svgElement("circle", { class: "force-marker", cx: selectedX, cy: stressScale(selectedStressGPa), r: 5.5 })
  );
  elements.tensileChart.append(plot);
  elements.tensileChart.append(
    svgElement("text", { class: "marker-label", x: equilibriumX + 5, y: margin.top + 15, "text-anchor": "start" }, "δ = 0"),
    svgElement("text", { class: "marker-label", x: maximumX + 5, y: margin.top + 31, "text-anchor": "start" }, `peak δₘ ${tensilePeakOpening().toFixed(2)}`)
  );
}

function renderShearChart() {
  if (!shearModel) return;
  const layout = chartLayout(elements.shearChartWrap, elements.shearChart);
  const { width, height, compact, margin, innerWidth, innerHeight } = layout;
  const xScale = linearScale(0, 1, margin.left, margin.left + innerWidth);
  const energyMax = shearModel.unstableFaultEnergyJm2 * 1.12;
  const tractionMax = shearModel.tauMaxGPa * 1.18;
  const energyScale = linearScale(0, energyMax, margin.top + innerHeight, margin.top);
  const tractionScale = linearScale(-tractionMax, tractionMax, margin.top + innerHeight, margin.top);
  shearChartGeometry = { width, margin, innerWidth };

  clearSvg(elements.shearChart, width, height);
  elements.shearChart.append(
    svgElement("title", { id: "shear-chart-title" }, "Periodic shear energy and holding traction"),
    svgElement("desc", { id: "shear-chart-description" }, elements.shearChartSummary.textContent)
  );

  const defs = svgElement("defs");
  const clip = svgElement("clipPath", { id: "shear-chart-clip" });
  clip.append(svgElement("rect", { x: margin.left, y: margin.top, width: innerWidth, height: innerHeight }));
  const gradient = svgElement("linearGradient", { id: "shear-energy-gradient", x1: "0", y1: "0", x2: "0", y2: "1" });
  gradient.append(
    svgElement("stop", { offset: "0", "stop-color": "#6757a8", "stop-opacity": "0.52" }),
    svgElement("stop", { offset: "1", "stop-color": "#6757a8", "stop-opacity": "0.03" })
  );
  defs.append(clip, gradient);
  elements.shearChart.append(defs);

  drawChartScaffold({
    svg: elements.shearChart,
    layout,
    xTicks: [0, 0.25, 0.5, 0.75, 1],
    leftTicks: linearTicks(0, energyMax, 5),
    rightTicks: linearTicks(-tractionMax, tractionMax, 5),
    xScale,
    leftScale: energyScale,
    rightScale: tractionScale,
    xLabel: "Normalized plane displacement u/b",
    leftLabel: "Shear energy Γ (J/m²)",
    rightLabel: "Holding traction τ (GPa)",
    zeroY: tractionScale(0)
  });

  const energyPoints = [];
  const tractionPoints = [];
  for (let index = 0; index <= 320; index += 1) {
    const q = index / 320;
    const sample = calculateShearModel({
      shearModulusGPa: shearModel.shearModulusGPa,
      burgersNm: shearModel.burgersNm,
      planeSpacingNm: shearModel.planeSpacingNm,
      displacementRatio: q
    });
    energyPoints.push([xScale(q), energyScale(sample.energyJm2)]);
    tractionPoints.push([xScale(q), tractionScale(sample.tractionGPa)]);
  }

  const plot = svgElement("g", { "clip-path": "url(#shear-chart-clip)" });
  plot.append(
    svgElement("path", { class: "shear-energy-area", d: pointsToAreaPath(energyPoints, energyScale(0)), fill: "url(#shear-energy-gradient)" }),
    svgElement("path", { class: "shear-energy-path", d: pointsToPath(energyPoints) }),
    svgElement("path", { class: "shear-force-path", d: pointsToPath(tractionPoints) })
  );

  [0.25, 0.5, 0.75].forEach((q) => {
    plot.append(svgElement("line", {
      class: q === 0.5 ? "barrier-guide" : "maximum-guide",
      x1: xScale(q),
      y1: margin.top,
      x2: xScale(q),
      y2: margin.top + innerHeight
    }));
  });
  const selectedX = xScale(shearModel.displacementRatio);
  plot.append(
    svgElement("line", { class: "selection-guide", x1: selectedX, y1: margin.top, x2: selectedX, y2: margin.top + innerHeight }),
    svgElement("circle", { class: "shear-energy-marker", cx: selectedX, cy: energyScale(shearModel.energyJm2), r: 5.5 }),
    svgElement("circle", { class: "shear-force-marker", cx: selectedX, cy: tractionScale(shearModel.tractionGPa), r: 5.5 })
  );
  elements.shearChart.append(plot);
  elements.shearChart.append(
    svgElement("text", { class: "marker-label", x: xScale(0.25), y: margin.top + 15, "text-anchor": "middle" }, compact ? "+τ" : "peak +τ"),
    svgElement("text", { class: "marker-label", x: xScale(0.5), y: margin.top + 31, "text-anchor": "middle" }, compact ? "barrier" : "energy barrier"),
    svgElement("text", { class: "marker-label", x: xScale(0.75), y: margin.top + 15, "text-anchor": "middle" }, compact ? "−τ" : "peak −τ")
  );
}

function chartLayout(container, svg) {
  const width = Math.max(320, Math.round(container.clientWidth || 720));
  const compact = width < 560;
  const height = compact ? 370 : 420;
  const margin = { top: 42, right: compact ? 58 : 72, bottom: 62, left: compact ? 58 : 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.height = `${height}px`;
  return { width, height, compact, margin, innerWidth, innerHeight };
}

function drawChartScaffold({
  svg,
  layout,
  xTicks,
  leftTicks,
  rightTicks,
  xScale,
  leftScale,
  rightScale,
  xLabel,
  leftLabel,
  rightLabel,
  zeroY
}) {
  const { width, height, margin, innerWidth, innerHeight } = layout;
  svg.append(svgElement("rect", {
    class: "plot-frame",
    x: margin.left,
    y: margin.top,
    width: innerWidth,
    height: innerHeight
  }));

  xTicks.forEach((tick) => {
    const x = xScale(tick);
    svg.append(
      svgElement("line", { class: "chart-grid", x1: x, y1: margin.top, x2: x, y2: margin.top + innerHeight }),
      svgElement("text", { class: "tick-label", x, y: margin.top + innerHeight + 21, "text-anchor": "middle" }, formatAxisNumber(tick))
    );
  });

  leftTicks.forEach((tick) => {
    const y = leftScale(tick);
    svg.append(
      svgElement("line", { class: "chart-grid", x1: margin.left, y1: y, x2: margin.left + innerWidth, y2: y }),
      svgElement("text", { class: "tick-label", x: margin.left - 8, y: y + 4, "text-anchor": "end" }, formatAxisNumber(tick))
    );
  });

  rightTicks.forEach((tick) => {
    const y = rightScale(tick);
    svg.append(svgElement("text", {
      class: "tick-label",
      x: margin.left + innerWidth + 8,
      y: y + 4,
      "text-anchor": "start"
    }, formatAxisNumber(tick)));
  });

  if (Number.isFinite(zeroY)) {
    svg.append(svgElement("line", {
      class: "zero-line",
      x1: margin.left,
      y1: zeroY,
      x2: margin.left + innerWidth,
      y2: zeroY
    }));
  }

  svg.append(
    svgElement("line", { class: "axis-line", x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + innerHeight }),
    svgElement("line", { class: "axis-line", x1: margin.left + innerWidth, y1: margin.top, x2: margin.left + innerWidth, y2: margin.top + innerHeight }),
    svgElement("line", { class: "axis-line", x1: margin.left, y1: margin.top + innerHeight, x2: margin.left + innerWidth, y2: margin.top + innerHeight }),
    svgElement("text", { class: "axis-label", x: margin.left + innerWidth / 2, y: height - 14, "text-anchor": "middle" }, xLabel),
    svgElement("text", { class: "axis-label", x: 16, y: margin.top + innerHeight / 2, transform: `rotate(-90 16 ${margin.top + innerHeight / 2})`, "text-anchor": "middle" }, leftLabel),
    svgElement("text", { class: "axis-label", x: width - 15, y: margin.top + innerHeight / 2, transform: `rotate(90 ${width - 15} ${margin.top + innerHeight / 2})`, "text-anchor": "middle" }, rightLabel)
  );
}

function selectTensileFromChart(event) {
  if (!tensileChartGeometry) return;
  const fraction = pointerFraction(event, elements.tensileChart, tensileChartGeometry);
  if (fraction === null) return;
  const opening = tensileChartGeometry.openingMin
    + fraction * (tensileChartGeometry.openingMax - tensileChartGeometry.openingMin);
  elements.separation.value = (opening / tensileModel.sigma).toFixed(4);
  updateTensile();
}

function selectShearFromChart(event) {
  if (!shearChartGeometry) return;
  const fraction = pointerFraction(event, elements.shearChart, shearChartGeometry);
  if (fraction === null) return;
  elements.shearDisplacement.value = clamp(fraction, 0, 1).toFixed(3);
  updateShear();
}

function pointerFraction(event, svg, geometry) {
  const bounds = svg.getBoundingClientRect();
  const pointerX = ((event.clientX - bounds.left) / bounds.width) * geometry.width;
  const start = geometry.margin.left;
  const end = start + geometry.innerWidth;
  if (pointerX < start || pointerX > end) return null;
  return (pointerX - start) / geometry.innerWidth;
}

function setArrowDirection(line, direction, centre, halfLength) {
  line.setAttribute("x1", String(centre - direction * halfLength));
  line.setAttribute("x2", String(centre + direction * halfLength));
}

function clearSvg(svg, width, height) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
}

function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  return (value) => rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function linearTicks(minimum, maximum, count) {
  return Array.from({ length: count }, (_, index) => minimum + (index / (count - 1)) * (maximum - minimum));
}

function pointsToPath(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

function pointsToAreaPath(points, baseline) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${pointsToPath(points)} L${last[0].toFixed(2)},${baseline.toFixed(2)} L${first[0].toFixed(2)},${baseline.toFixed(2)} Z`;
}

function svgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([attribute, value]) => element.setAttribute(attribute, String(value)));
  if (text) element.textContent = text;
  return element;
}

function formatAxisNumber(value) {
  const absolute = Math.abs(value);
  if (absolute >= 100) return value.toFixed(0);
  if (absolute >= 10) return value.toFixed(1);
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatSigned(value, digits) {
  const threshold = 0.5 * Math.pow(10, -digits);
  if (Math.abs(value) < threshold) return (0).toFixed(digits);
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
}

function formatSpokenSigned(value, digits) {
  const threshold = 0.5 * Math.pow(10, -digits);
  if (Math.abs(value) < threshold) return "zero";
  return `${value > 0 ? "positive" : "negative"} ${Math.abs(value).toFixed(digits)}`;
}

function formatGaugeTick(value, signed = false) {
  if (Math.abs(value) < 1e-10) return "0";
  const digits = Math.abs(value) >= 100 ? 1 : 2;
  return signed ? formatSigned(value, digits) : value.toFixed(digits);
}

function tensileOpening() {
  return Math.max(0, tensileModel.selectedX - tensileModel.x0);
}

function tensilePeakOpening() {
  return tensileModel.xm - tensileModel.x0;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
