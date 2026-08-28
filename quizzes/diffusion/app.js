const elements = {
  form: document.querySelector("#diffusion-quiz-form"),
  clear: document.querySelector("#clear-quiz"),
  feedback: document.querySelector("#quiz-feedback")
};

const questionSpecs = [
  { id: "q1", type: "radio", target: "negative-x" },
  { id: "q2", type: "number", input: "q2-answer", target: 1.2, tolerance: 0.024 },
  { id: "q3", type: "radio", target: "linear-steady" },
  { id: "q4", type: "number", input: "q4-answer", target: 44.721, tolerance: 0.7 },
  { id: "q5", type: "number", input: "q5-answer", target: 2.4, tolerance: 0.05 },
  { id: "q6", type: "number", input: "q6-answer", target: 92.135, tolerance: 0.5 },
  { id: "q7", type: "number", input: "q7-answer", target: 0.5, tolerance: 0.01 },
  { id: "q8", type: "number", input: "q8-answer", target: 36.906, tolerance: 0.7 }
];

initialiseQuiz();
runScientificAssertions();

function initialiseQuiz() {
  elements.form.addEventListener("submit", checkAnswers);
  elements.clear.addEventListener("click", clearAnswers);

  questionSpecs.forEach((spec) => {
    const question = document.querySelector(`[data-question="${spec.id}"]`);
    const inputs = spec.type === "radio"
      ? question.querySelectorAll(`input[name="${spec.id}"]`)
      : [document.querySelector(`#${spec.input}`)];

    inputs.forEach((input) => {
      input.addEventListener(spec.type === "radio" ? "change" : "input", () => resetQuestion(spec.id));
    });
  });

  document.querySelectorAll(".solution-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.querySelector(`#${button.getAttribute("aria-controls")}`);
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.textContent = expanded ? "Show solution" : "Hide solution";
      panel.hidden = expanded;
    });
  });
}

function checkAnswers(event) {
  event.preventDefault();
  let attempted = 0;
  let correct = 0;

  questionSpecs.forEach((spec) => {
    const question = document.querySelector(`[data-question="${spec.id}"]`);
    const status = document.querySelector(`#${spec.id}-status`);
    let hasAnswer = false;
    let isCorrect = false;

    if (spec.type === "radio") {
      const selected = question.querySelector(`input[name="${spec.id}"]:checked`);
      hasAnswer = Boolean(selected);
      isCorrect = selected?.value === spec.target;
    } else {
      const input = document.querySelector(`#${spec.input}`);
      hasAnswer = input.value.trim() !== "";
      const value = Number(input.value);
      isCorrect = Number.isFinite(value) && Math.abs(value - spec.target) <= spec.tolerance;
      input.toggleAttribute("aria-invalid", hasAnswer && !isCorrect);
    }

    question.classList.remove("is-correct", "is-incorrect");
    status.className = "answer-status";

    if (!hasAnswer) {
      status.textContent = "Not answered";
      return;
    }

    attempted += 1;
    if (isCorrect) {
      correct += 1;
      question.classList.add("is-correct");
      status.textContent = "Correct";
      status.classList.add("is-correct");
    } else {
      question.classList.add("is-incorrect");
      status.textContent = "Check again";
      status.classList.add("is-incorrect");
    }
  });

  if (!attempted) {
    elements.feedback.textContent = "Answer at least one question before checking.";
  } else if (correct === questionSpecs.length) {
    elements.feedback.textContent = `All ${questionSpecs.length} answers are correct. You connected random motion to continuum diffusion.`;
  } else if (correct === attempted) {
    const remaining = questionSpecs.length - attempted;
    elements.feedback.textContent = `${correct} attempted answer${correct === 1 ? " is" : "s are"} correct. Complete the remaining ${remaining} question${remaining === 1 ? "" : "s"} when ready.`;
  } else {
    elements.feedback.textContent = `${correct} of ${attempted} attempted answers are correct. Review the questions marked “Check again.”`;
  }
}

function clearAnswers() {
  elements.form.reset();
  questionSpecs.forEach((spec) => resetQuestion(spec.id, false));

  document.querySelectorAll(".solution-toggle").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Show solution";
    document.querySelector(`#${button.getAttribute("aria-controls")}`).hidden = true;
  });

  elements.feedback.textContent = "Answers and open solutions cleared.";
}

function resetQuestion(id, clearFeedback = true) {
  const question = document.querySelector(`[data-question="${id}"]`);
  question.classList.remove("is-correct", "is-incorrect");
  question.querySelectorAll("input").forEach((input) => input.removeAttribute("aria-invalid"));

  const status = document.querySelector(`#${id}-status`);
  status.textContent = "";
  status.className = "answer-status";
  if (clearFeedback) elements.feedback.textContent = "";
}

function runScientificAssertions() {
  const close = (actual, expected, tolerance = 1e-10) => Math.abs(actual - expected) <= tolerance;
  console.assert(close(1.5e-10 * 8e6, 1.2e-3), "Fick's first-law flux regression failed.");
  console.assert(close(Math.sqrt(4 * 2e-12 * 250) * 1e6, 44.72135955, 1e-7), "2D rms-distance regression failed.");
  console.assert(close((12e-6) ** 2 / (2 * 3e-11), 2.4), "1D diffusion-time regression failed.");
  console.assert(close(0.5 * (1 + 0.84270079295) * 100, 92.13503965, 1e-7), "Step-profile regression failed.");
  console.assert(close((1e-6) ** 2 / (2 * 1e-12), 0.5), "Explicit stability-limit regression failed.");
  console.assert(close(Math.exp((-120000 / 8.314) * (1 / 1000 - 1 / 800)), 36.9058997, 1e-7), "Arrhenius-ratio regression failed.");
}
