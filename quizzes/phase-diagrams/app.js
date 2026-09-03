const quizData = Object.freeze({
  proeutectoidFerriteVolumeFraction: 0.49,
  ferriteDensity: 7.87,
  cementiteDensity: 7.68,
  ferriteCarbon: 0.022,
  eutectoidCarbon: 0.76,
  cementiteCarbon: 6.67,
  tolerance: 0.03
});

const elements = {
  form: document.querySelector("#composition-quiz-form"),
  question: document.querySelector("#composition-question"),
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
const proeutectoidFerriteMassFraction = (
  quizData.proeutectoidFerriteVolumeFraction * quizData.ferriteDensity
  / (
    quizData.proeutectoidFerriteVolumeFraction * quizData.ferriteDensity
    + (1 - quizData.proeutectoidFerriteVolumeFraction) * pearliteDensity
  )
);
const targetComposition = (
  quizData.eutectoidCarbon
  - proeutectoidFerriteMassFraction * (quizData.eutectoidCarbon - quizData.ferriteCarbon)
);

elements.form.addEventListener("submit", checkAnswer);
elements.input.addEventListener("input", resetAnswerState);
elements.clear.addEventListener("click", clearAnswer);
elements.solutionToggle.addEventListener("click", toggleSolution);

function checkAnswer(event) {
  event.preventDefault();
  const rawValue = elements.input.value.trim();
  if (!rawValue) {
    setFeedback("Enter an estimated carbon composition before checking.", "incorrect");
    elements.input.focus();
    return;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    setFeedback("Enter a numerical composition in wt% C.", "incorrect");
    return;
  }

  if (value >= 10) {
    setFeedback("Use the phase-diagram percentage form: enter about 0.40 wt% C, not 40.", "incorrect");
    return;
  }

  if (value < 0 || value > 2.14) {
    setFeedback("Enter a steel composition from 0 to 2.14 wt% C.", "incorrect");
    return;
  }

  if (value > 0 && value < 0.01) {
    setFeedback("Enter the value in wt% C: use about 0.40 rather than the decimal mass fraction 0.004.", "incorrect");
    return;
  }

  const isCorrect = Math.abs(value - targetComposition) <= quizData.tolerance;
  if (isCorrect) {
    setFeedback(`Correct. The converted proeutectoid-ferrite mass fraction is about 0.491, giving ${targetComposition.toFixed(3)} wt% C, or approximately 0.40 wt% C.`, "correct");
    return;
  }

  if (value >= quizData.eutectoidCarbon) {
    setFeedback("This must be hypoeutectoid steel, so the composition is below 0.760 wt% C. Check the direction of the lever arm.", "incorrect");
  } else if (value > targetComposition) {
    setFeedback("Your estimate is high. A large proeutectoid-ferrite fraction places the alloy farther to the ferrite-rich side of the eutectoid composition.", "incorrect");
  } else {
    setFeedback("Your estimate is low. Convert the 49.0 vol% ferrite to mass fraction before subtracting its lever arm from 0.760 wt% C.", "incorrect");
  }
}

function setFeedback(message, state) {
  const isCorrect = state === "correct";
  elements.question.classList.toggle("is-correct", isCorrect);
  elements.question.classList.toggle("is-incorrect", !isCorrect);
  elements.status.className = `answer-status is-${state}`;
  elements.status.textContent = message;
  if (isCorrect) elements.input.removeAttribute("aria-invalid");
  else elements.input.setAttribute("aria-invalid", "true");
}

function resetAnswerState() {
  elements.question.classList.remove("is-correct", "is-incorrect");
  elements.status.className = "answer-status";
  elements.status.textContent = "";
  elements.input.removeAttribute("aria-invalid");
}

function clearAnswer() {
  elements.form.reset();
  resetAnswerState();
  elements.solution.hidden = true;
  elements.solutionToggle.setAttribute("aria-expanded", "false");
  elements.solutionToggle.textContent = "Show worked solution";
  elements.input.focus();
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
console.assert(close(proeutectoidFerriteMassFraction, 0.490685, 1e-6), "Volume-to-mass conversion regression failed.");
console.assert(close(targetComposition, 0.397874, 1e-6), "Inverse lever-rule regression failed.");
