const form = document.getElementById("crystal-tutorial-form");
const clearButton = document.getElementById("clear-answers");
const feedback = document.getElementById("quiz-feedback");
const correctCount = document.getElementById("correct-count");
const progressFill = document.getElementById("progress-fill");
const attemptSummary = document.getElementById("attempt-summary");
const downloadPanel = document.getElementById("download-panel");
const pdfDownload = document.getElementById("pdf-download");

const numericAnswers = {
  "q1-fraction": { target: 2.91e-5, tolerance: 0.03 },
  "q1-density": { target: 2.47e24, tolerance: 0.03 },
  "q1-volume": { target: 2.47e18, tolerance: 0.03 },
  "q2-diameter": { target: 25.3, tolerance: 0.025 },
  "q2-strength": { target: 217, tolerance: 0.025 },
  "q3-ratio": { target: Math.sqrt(6) / 2 - 1, tolerance: 0.02 },
  "q4-atoms": { target: 8, tolerance: 0.001 },
  "q4-density": { target: 4.997e28, tolerance: 0.025 },
  "q4-radius": { target: 0.1176, tolerance: 0.02 },
  "q4-apf": { target: Math.PI * Math.sqrt(3) / 16, tolerance: 0.02 },
  "q5-angle": { target: 100.89, tolerance: 0.012 },
  "q7-spacing": { target: 0.1476, tolerance: 0.02 },
  "q8-lattice": { target: 2.866, tolerance: 0.015 },
  "q9-lattice": { target: 3.615, tolerance: 0.015 },
  "q10-lattice": { target: 5.431, tolerance: 0.015 }
};

const exactAnswers = {
  "q6-direction": ["11-2", "-1-12"],
  "q8-structure": ["bcc"],
  "q8-sequence": ["110200211220310222321"],
  "q9-structure": ["fcc"],
  "q9-sequence": ["111200220311222400"],
  "q10-structure": ["diamond"],
  "q10-sequence": ["111220311400331422"],
  "q10-missing": ["200"]
};

let attempts = 0;

function normalize(value) {
  return value.toLowerCase().replace(/diamond\s*cubic/g, "diamond").replace(/[^a-z0-9-]/g, "");
}

function checkNumeric(input, spec) {
  if (input.value.trim() === "") return false;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - spec.target) <= Math.max(Math.abs(spec.target) * spec.tolerance, 1e-12);
}

function checkInput(input) {
  if (numericAnswers[input.id]) return checkNumeric(input, numericAnswers[input.id]);
  if (exactAnswers[input.id]) return exactAnswers[input.id].includes(normalize(input.value));
  return false;
}

function lockDownload() {
  downloadPanel.hidden = true;
  pdfDownload.removeAttribute("href");
}

function allAnswersAttempted() {
  return [...form.querySelectorAll("input, select")].every(input => input.value.trim() !== "");
}

function updateDownloadAccess() {
  if (attempts > 0 && allAnswersAttempted()) {
    downloadPanel.hidden = false;
    pdfDownload.href = "Crystal_Structure_Tutorial.pdf";
  } else {
    lockDownload();
  }
}

function updateProgress(correctProblems) {
  correctCount.textContent = String(correctProblems);
  progressFill.style.width = `${correctProblems * 10}%`;
  attemptSummary.textContent = attempts
    ? `Attempt ${attempts}: ${correctProblems} of 10 problems are fully correct.`
    : "Enter your answers, then select “Check all answers.”";
}

function checkAll(event) {
  event.preventDefault();
  attempts += 1;
  let correctProblems = 0;
  let attemptedProblems = 0;
  let firstIncomplete = null;

  document.querySelectorAll(".problem-card").forEach(card => {
    const inputs = [...card.querySelectorAll("input, select")];
    let attempted = true;
    let correct = true;
    inputs.forEach(input => {
      const hasValue = input.value.trim() !== "";
      const answerCorrect = hasValue && checkInput(input);
      attempted = attempted && hasValue;
      correct = correct && answerCorrect;
      input.classList.toggle("is-correct", answerCorrect);
      input.classList.toggle("is-incorrect", hasValue && !answerCorrect);
    });

    const status = card.querySelector(".problem-status");
    card.classList.toggle("is-correct", correct);
    card.classList.toggle("is-incorrect", !correct && attempted);
    if (attempted) attemptedProblems += 1;
    if (correct) {
      correctProblems += 1;
      status.textContent = "Correct.";
      status.className = "problem-status correct";
    } else if (!attempted) {
      status.textContent = "Complete every answer in this problem.";
      status.className = "problem-status incorrect";
      firstIncomplete ||= card;
    } else {
      status.textContent = "Check the entries marked in coral.";
      status.className = "problem-status incorrect";
    }
  });

  updateProgress(correctProblems);
  updateDownloadAccess();
  if (attemptedProblems === 10) {
    feedback.textContent = `${correctProblems} of 10 problems are correct.`;
    downloadPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    feedback.textContent = `${attemptedProblems} of 10 problems have been attempted. Complete the remaining answers and check again.`;
    firstIncomplete?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearAll() {
  form.reset();
  attempts = 0;
  document.querySelectorAll(".problem-card").forEach(card => {
    card.classList.remove("is-correct", "is-incorrect");
    const status = card.querySelector(".problem-status");
    status.textContent = "";
    status.className = "problem-status";
  });
  document.querySelectorAll(".answer-grid input, .answer-grid select").forEach(input => input.classList.remove("is-correct", "is-incorrect"));
  feedback.textContent = "";
  lockDownload();
  updateProgress(0);
}

form.addEventListener("submit", checkAll);
clearButton.addEventListener("click", clearAll);
form.querySelectorAll("input, select").forEach(input => input.addEventListener("input", () => {
  input.classList.remove("is-correct", "is-incorrect");
  input.closest(".problem-card").classList.remove("is-correct", "is-incorrect");
  updateDownloadAccess();
  updateProgress(document.querySelectorAll(".problem-card.is-correct").length);
  if (attempts) feedback.textContent = "Answer changed - check all answers again to update your result.";
}));

lockDownload();
updateProgress(0);
