const quizData = Object.freeze({
  referenceFerriteAreaPercent: 15,
  ferriteAreaTolerance: 5,
  ferriteDensity: 7.87,
  cementiteDensity: 7.68,
  ferriteCarbon: 0.022,
  eutectoidCarbon: 0.76,
  cementiteCarbon: 6.67,
  compositionTolerance: 0.01
});

const elements = {
  form: document.querySelector("#composition-quiz-form"),
  question: document.querySelector("#composition-question"),
  ferriteInput: document.querySelector("#ferrite-answer"),
  input: document.querySelector("#composition-answer"),
  status: document.querySelector("#composition-status"),
  clear: document.querySelector("#clear-composition"),
  solutionToggle: document.querySelector("#solution-toggle"),
  solution: document.querySelector("#worked-solution")
};

const cementiteFractionInPearlite = (
  (quizData.eutectoidCarbon - quizData.ferriteCarbon)
  / (quizData.cementiteCarbon - quizData.ferriteCarbon)
);
const ferriteFractionInPearlite = 1 - cementiteFractionInPearlite;
const pearliteDensity = 1 / (
  ferriteFractionInPearlite / quizData.ferriteDensity
  + cementiteFractionInPearlite / quizData.cementiteDensity
);

function compositionForFerriteVolumeFraction(volumeFraction) {
  const proeutectoidFerriteMassFraction = (
    volumeFraction * quizData.ferriteDensity
    / (
      volumeFraction * quizData.ferriteDensity
      + (1 - volumeFraction) * pearliteDensity
    )
  );
  const targetComposition = (
    quizData.eutectoidCarbon
    - proeutectoidFerriteMassFraction * (quizData.eutectoidCarbon - quizData.ferriteCarbon)
  );
  return { proeutectoidFerriteMassFraction, targetComposition };
}

elements.form.addEventListener("submit", checkAnswer);
elements.ferriteInput.addEventListener("input", resetAnswerState);
elements.input.addEventListener("input", resetAnswerState);
elements.clear.addEventListener("click", clearAnswer);
elements.solutionToggle.addEventListener("click", toggleSolution);

function checkAnswer(event) {
  event.preventDefault();
  const rawFerriteValue = elements.ferriteInput.value.trim();
  if (elements.ferriteInput.validity.badInput) {
    setFeedback("Enter a numerical ferrite area percentage.", "incorrect", [elements.ferriteInput]);
    return;
  }
  if (!rawFerriteValue) {
    setFeedback("Estimate the proeutectoid-ferrite area percentage from the image before checking.", "incorrect", [elements.ferriteInput]);
    elements.ferriteInput.focus();
    return;
  }

  const ferriteAreaPercent = Number(rawFerriteValue);
  if (!Number.isFinite(ferriteAreaPercent) || ferriteAreaPercent < 0 || ferriteAreaPercent > 100) {
    setFeedback("Enter a ferrite area percentage from 0 to 100.", "incorrect", [elements.ferriteInput]);
    return;
  }
  if (ferriteAreaPercent > 0 && ferriteAreaPercent < 1) {
    setFeedback("Enter ferrite area as a percentage, not a decimal fraction; multiply a decimal fraction by 100.", "incorrect", [elements.ferriteInput]);
    return;
  }
  if (Math.abs(ferriteAreaPercent - quizData.referenceFerriteAreaPercent) > quizData.ferriteAreaTolerance) {
    setFeedback("Recheck the ferrite estimate. Count only the pale-blue, unlamellated regions between pearlite colonies; exclude the pale lamellae inside pearlite.", "incorrect", [elements.ferriteInput]);
    return;
  }

  const rawValue = elements.input.value.trim();
  if (elements.input.validity.badInput) {
    setFeedback("Enter a numerical composition in wt% C.", "incorrect", [elements.input]);
    return;
  }
  if (!rawValue) {
    setFeedback("Now calculate the carbon composition using your ferrite estimate and enter it in wt% C.", "incorrect", [elements.input]);
    elements.input.focus();
    return;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    setFeedback("Enter a numerical composition in wt% C.", "incorrect", [elements.input]);
    return;
  }

  if (value >= 10) {
    setFeedback("Use wt% C for the composition. Hypoeutectoid steel contains less than 0.760 wt% C; check the position of your decimal point.", "incorrect", [elements.input]);
    return;
  }

  if (value < 0 || value > 2.14) {
    setFeedback("Enter a steel composition from 0 to 2.14 wt% C.", "incorrect", [elements.input]);
    return;
  }

  if (value > 0 && value < 0.01) {
    setFeedback("Enter the composition in wt% C, not as a decimal mass fraction; multiply a decimal mass fraction by 100.", "incorrect", [elements.input]);
    return;
  }

  const { proeutectoidFerriteMassFraction, targetComposition } = compositionForFerriteVolumeFraction(ferriteAreaPercent / 100);
  const isCorrect = Math.abs(value - targetComposition) <= quizData.compositionTolerance + Number.EPSILON;
  if (isCorrect) {
    setFeedback(`Correct. Your estimate of ${ferriteAreaPercent} area% proeutectoid ferrite gives a mass fraction of ${proeutectoidFerriteMassFraction.toFixed(3)} and a composition of ${targetComposition.toFixed(3)} wt% C (approximately ${targetComposition.toFixed(2)} wt% C).`, "correct");
    return;
  }

  if (value >= quizData.eutectoidCarbon) {
    setFeedback("This must be hypoeutectoid steel, so the composition is below 0.760 wt% C. Check the direction of the lever arm.", "incorrect", [elements.input]);
  } else if (value > targetComposition) {
    setFeedback(`Your composition is high for your estimate of ${ferriteAreaPercent} area% ferrite. Convert your ferrite volume fraction to mass fraction, then subtract its lever-rule contribution from 0.760 wt% C.`, "incorrect", [elements.input]);
  } else {
    setFeedback(`Your composition is low for your estimate of ${ferriteAreaPercent} area% ferrite. Use your proeutectoid-ferrite fraction in the inverse lever rule; the remaining fraction is pearlite.`, "incorrect", [elements.input]);
  }
}

function setFeedback(message, state, invalidInputs = []) {
  const isCorrect = state === "correct";
  elements.question.classList.toggle("is-correct", isCorrect);
  elements.question.classList.toggle("is-incorrect", !isCorrect);
  elements.status.className = `answer-status is-${state}`;
  elements.status.textContent = message;
  for (const input of [elements.ferriteInput, elements.input]) {
    if (invalidInputs.includes(input)) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }
}

function resetAnswerState() {
  elements.question.classList.remove("is-correct", "is-incorrect");
  elements.status.className = "answer-status";
  elements.status.textContent = "";
  elements.ferriteInput.removeAttribute("aria-invalid");
  elements.input.removeAttribute("aria-invalid");
}

function clearAnswer() {
  elements.form.reset();
  resetAnswerState();
  elements.solution.hidden = true;
  elements.solutionToggle.setAttribute("aria-expanded", "false");
  elements.solutionToggle.textContent = "Show worked solution";
  elements.ferriteInput.focus();
}

function toggleSolution() {
  const expanded = elements.solutionToggle.getAttribute("aria-expanded") === "true";
  elements.solutionToggle.setAttribute("aria-expanded", String(!expanded));
  elements.solutionToggle.textContent = expanded ? "Show worked solution" : "Hide worked solution";
  elements.solution.hidden = expanded;
}

const close = (actual, expected, tolerance = 1e-9) => Math.abs(actual - expected) <= tolerance;
console.assert(close(cementiteFractionInPearlite, 0.11101083, 1e-7), "Pearlite cementite-fraction regression failed.");
console.assert(close(pearliteDensity, 7.848445, 1e-6), "Pearlite-density regression failed.");
const referenceAnswer = compositionForFerriteVolumeFraction(quizData.referenceFerriteAreaPercent / 100);
console.assert(close(referenceAnswer.proeutectoidFerriteMassFraction, 0.150350, 1e-6), "Volume-to-mass conversion regression failed.");
console.assert(close(referenceAnswer.targetComposition, 0.649042, 1e-6), "Inverse lever-rule regression failed.");
console.assert(close(compositionForFerriteVolumeFraction(0).targetComposition, quizData.eutectoidCarbon), "Zero-ferrite endpoint regression failed.");
console.assert(close(compositionForFerriteVolumeFraction(1).targetComposition, quizData.ferriteCarbon), "All-ferrite endpoint regression failed.");
