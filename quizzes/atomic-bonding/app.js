import {
  EV_PER_ANGSTROM_CUBED_TO_GPA,
  EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2,
  calculateBondModel,
  calculateShearModel
} from "../../js/atomic-bond-model.js";

const bond = calculateBondModel({ epsilon: 1, sigma: 1, m: 12, n: 6, separationRatio: 1.2 });
const shear = calculateShearModel({ shearModulusGPa: 80, burgersNm: 0.25, planeSpacingNm: 0.25, displacementRatio: 0.25 });

const form = document.querySelector("#atomic-quiz-form");
const clearButton = document.querySelector("#clear-quiz");
const feedback = document.querySelector("#quiz-feedback");
const conceptStatus = document.querySelector("#concept-status");

const numericSpecs = [
  { id: "answer-x0", target: bond.x0 },
  { id: "answer-xm", target: bond.xm },
  { id: "answer-fmax", target: bond.fmax },
  { id: "answer-k", target: bond.stiffness },
  { id: "answer-modulus", target: bond.modulus },
  { id: "answer-cohesive", target: bond.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA },
  { id: "answer-surface", target: bond.surfaceEnergy * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2 },
  { id: "answer-shear", target: shear.tauMaxGPa }
].map((spec) => ({
  ...spec,
  input: document.querySelector(`#${spec.id}`),
  status: document.querySelector(`#${spec.id}-status`)
}));

form.addEventListener("submit", checkAnswers);
clearButton.addEventListener("click", clearQuiz);

numericSpecs.forEach(({ input, status }) => {
  input.addEventListener("input", () => {
    resetNumericStatus(input, status);
    feedback.textContent = "";
  });
});

form.querySelectorAll('input[name="real-strength"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    conceptStatus.textContent = "";
    conceptStatus.className = "concept-status";
    feedback.textContent = "";
  });
});

populateSolutions();

function checkAnswers(event) {
  event.preventDefault();
  let attempted = 0;
  let correct = 0;

  numericSpecs.forEach(({ input, status, target }) => {
    resetNumericStatus(input, status);
    if (input.value.trim() === "") return;
    attempted += 1;
    const answer = Number(input.value);
    const tolerance = Math.max(Math.abs(target) * 0.02, 0.002);
    if (Number.isFinite(answer) && Math.abs(answer - target) <= tolerance) {
      correct += 1;
      input.classList.add("is-correct");
      status.textContent = "✓ Correct";
      status.classList.add("is-correct");
    } else {
      input.classList.add("is-incorrect");
      input.setAttribute("aria-invalid", "true");
      status.textContent = "× Check again";
      status.classList.add("is-incorrect");
    }
  });

  const selectedConcept = form.querySelector('input[name="real-strength"]:checked');
  if (selectedConcept) {
    attempted += 1;
    if (selectedConcept.value === "defects") {
      correct += 1;
      conceptStatus.textContent = "✓ Correct — defects provide localized deformation and fracture paths.";
      conceptStatus.className = "concept-status is-correct";
    } else {
      conceptStatus.textContent = "× Check again — compare collective ideal motion with localized defect motion.";
      conceptStatus.className = "concept-status is-incorrect";
    }
  } else {
    conceptStatus.textContent = "Choose one explanation before completing the quiz.";
    conceptStatus.className = "concept-status";
  }

  const total = numericSpecs.length + 1;
  if (attempted === 0) {
    feedback.textContent = "Enter at least one result before checking.";
  } else if (correct === total) {
    feedback.textContent = `All ${total} answers are correct. You connected atomic bonding to ideal tensile and shear strength.`;
  } else if (correct === attempted) {
    feedback.textContent = `All ${attempted} attempted answers are correct. Complete the remaining question${total - attempted === 1 ? "" : "s"} when ready.`;
  } else {
    feedback.textContent = `${correct} of ${attempted} attempted answers are correct. Revisit the entries marked “Check again.”`;
  }
}

function clearQuiz() {
  form.reset();
  numericSpecs.forEach(({ input, status }) => resetNumericStatus(input, status));
  conceptStatus.textContent = "";
  conceptStatus.className = "concept-status";
  feedback.textContent = "Answers cleared.";
}

function resetNumericStatus(input, status) {
  input.classList.remove("is-correct", "is-incorrect");
  input.removeAttribute("aria-invalid");
  status.textContent = "";
  status.className = "answer-status";
}

function populateSolutions() {
  document.querySelector("#solution-x0").textContent = `${bond.x0.toFixed(3)} Å`;
  document.querySelector("#solution-xm").textContent = `${bond.xm.toFixed(3)} Å`;
  document.querySelector("#solution-fmax").textContent = `${bond.fmax.toFixed(3)} eV/Å`;
  document.querySelector("#solution-k").innerHTML = `${bond.stiffness.toFixed(3)} eV/Å<sup>2</sup>`;
  document.querySelector("#solution-modulus").innerHTML = `${bond.modulus.toFixed(3)} eV/Å<sup>3</sup>`;
  document.querySelector("#solution-cohesive").textContent = `${(bond.cohesiveStrength * EV_PER_ANGSTROM_CUBED_TO_GPA).toFixed(1)} GPa`;
  document.querySelector("#solution-surface").innerHTML = `${(bond.surfaceEnergy * EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2).toFixed(2)} J/m<sup>2</sup>`;
  document.querySelector("#solution-shear").textContent = `${shear.tauMaxGPa.toFixed(2)} GPa`;
}
