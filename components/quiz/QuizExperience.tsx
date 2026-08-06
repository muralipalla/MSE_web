"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DIFFICULTIES,
  formatCorrectAnswer,
  gradeQuestion,
  isAnswered,
  selectQuestions,
  type Difficulty,
  type QuestionResponse,
  type QuizQuestion,
  type QuizTopic,
} from "@/features/quiz";

import styles from "./quiz.module.css";

interface QuizExperienceProps {
  bank: QuizQuestion[];
  topics: QuizTopic[];
}

type QuizMode = "builder" | "quiz" | "results";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function ResponseControls({
  question,
  response,
  disabled,
  onChange,
}: {
  question: QuizQuestion;
  response: QuestionResponse;
  disabled: boolean;
  onChange: (response: QuestionResponse) => void;
}) {
  if (question.type === "single-choice") {
    return (
      <fieldset className={styles.answerGroup} disabled={disabled}>
        <legend>Choose one answer</legend>
        {question.choices.map((choice) => (
          <label className={styles.answerOption} key={choice.id}>
            <input
              type="radio"
              name={`response-${question.id}`}
              value={choice.id}
              checked={response === choice.id}
              onChange={() => onChange(choice.id)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (question.type === "multiple-select") {
    const selected = Array.isArray(response) ? response : [];

    return (
      <fieldset className={styles.answerGroup} disabled={disabled}>
        <legend>Choose every answer that applies</legend>
        {question.choices.map((choice) => (
          <label className={styles.answerOption} key={choice.id}>
            <input
              type="checkbox"
              value={choice.id}
              checked={selected.includes(choice.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, choice.id]
                  : selected.filter((answerId) => answerId !== choice.id);
                onChange(next);
              }}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (question.type === "true-false") {
    return (
      <fieldset className={styles.answerGroup} disabled={disabled}>
        <legend>Choose true or false</legend>
        {[true, false].map((value) => (
          <label className={styles.answerOption} key={String(value)}>
            <input
              type="radio"
              name={`response-${question.id}`}
              checked={response === value}
              onChange={() => onChange(value)}
            />
            <span>{value ? "True" : "False"}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <label className={styles.numericField}>
      <span>
        Your answer{question.unit ? ` (${question.unit})` : ""}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        disabled={disabled}
        value={
          typeof response === "string" || typeof response === "number"
            ? response
            : ""
        }
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter a number"
      />
    </label>
  );
}

export function QuizExperience({ bank, topics }: QuizExperienceProps) {
  const [mode, setMode] = useState<QuizMode>("builder");
  const [topicIds, setTopicIds] = useState(topics.map((topic) => topic.id));
  const [difficulties, setDifficulties] = useState<Difficulty[]>([
    ...DIFFICULTIES,
  ]);
  const [requestedCount, setRequestedCount] = useState(10);
  const [seed, setSeed] = useState("mse-practice-01");
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const activeHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (mode !== "builder") {
      activeHeadingRef.current?.focus();
    }
  }, [mode, currentIndex]);

  const availableCount = useMemo(
    () =>
      bank.filter(
        (question) =>
          topicIds.includes(question.topicId) &&
          difficulties.includes(question.difficulty),
      ).length,
    [bank, topicIds, difficulties],
  );

  const topicById = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );

  function toggleTopic(topicId: string) {
    setTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
    setMessage("");
  }

  function toggleDifficulty(difficulty: Difficulty) {
    setDifficulties((current) =>
      current.includes(difficulty)
        ? current.filter((value) => value !== difficulty)
        : [...current, difficulty],
    );
    setMessage("");
  }

  function startQuiz() {
    if (topicIds.length === 0 || difficulties.length === 0) {
      setMessage("Select at least one topic and one difficulty.");
      return;
    }

    const selected = selectQuestions(bank, {
      topicIds,
      difficulties,
      count: requestedCount,
      seed: seed.trim() || "mse-practice",
    });

    if (selected.length === 0) {
      setMessage("No reviewed questions match those filters yet.");
      return;
    }

    setActiveQuestions(selected);
    setCurrentIndex(0);
    setResponses({});
    setCheckedIds([]);
    setMessage(
      selected.length < requestedCount
        ? `Started with all ${selected.length} matching questions.`
        : "",
    );
    setMode("quiz");
  }

  function restartSameQuiz() {
    setCurrentIndex(0);
    setResponses({});
    setCheckedIds([]);
    setMessage("");
    setMode("quiz");
  }

  if (mode === "builder") {
    return (
      <section className={styles.panel} aria-labelledby="build-quiz-title">
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.eyebrow}>Build your practice set</p>
            <h2 id="build-quiz-title">Choose what to practise</h2>
          </div>
          <span className={styles.availability}>{availableCount} matching questions</span>
        </div>

        <fieldset className={styles.builderGroup}>
          <legend>1. Topics</legend>
          <div className={styles.topicGrid}>
            {topics.map((topic) => (
              <label className={styles.topicChoice} key={topic.id}>
                <input
                  type="checkbox"
                  checked={topicIds.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                />
                <span>
                  <strong>{topic.label}</strong>
                  <small>{topic.description}</small>
                </span>
              </label>
            ))}
          </div>
          <div className={styles.inlineActions}>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => setTopicIds(topics.map((topic) => topic.id))}
            >
              Select all
            </button>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => setTopicIds([])}
            >
              Clear
            </button>
          </div>
        </fieldset>

        <fieldset className={styles.builderGroup}>
          <legend>2. Difficulty</legend>
          <div className={styles.chipRow}>
            {DIFFICULTIES.map((difficulty) => (
              <label className={styles.chip} key={difficulty}>
                <input
                  type="checkbox"
                  checked={difficulties.includes(difficulty)}
                  onChange={() => toggleDifficulty(difficulty)}
                />
                <span>{DIFFICULTY_LABELS[difficulty]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.settingsGrid}>
          <label className={styles.selectField}>
            <span>3. Number of questions</span>
            <select
              value={requestedCount}
              onChange={(event) => setRequestedCount(Number(event.target.value))}
            >
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
              <option value={15}>15 questions</option>
            </select>
          </label>

          <label className={styles.selectField}>
            <span>4. Practice seed</span>
            <input
              value={seed}
              maxLength={40}
              onChange={(event) => setSeed(event.target.value)}
              aria-describedby="seed-help"
            />
            <small id="seed-help">Reuse a seed to reproduce the same set.</small>
          </label>
        </div>

        <div className={styles.builderFooter}>
          <p className={styles.statusMessage} role="status">
            {message || "Questions and scores stay in this browser session."}
          </p>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={startQuiz}
            disabled={availableCount === 0}
          >
            Start practice
          </button>
        </div>
      </section>
    );
  }

  const question = activeQuestions[currentIndex];

  if (mode === "quiz" && question) {
    const response = responses[question.id];
    const checked = checkedIds.includes(question.id);
    const grade = checked ? gradeQuestion(question, response) : undefined;
    const topic = topicById.get(question.topicId);

    return (
      <section className={styles.panel} aria-labelledby="question-title">
        <div className={styles.progressHeader}>
          <div>
            <p className={styles.eyebrow}>{topic?.label ?? question.topicId}</p>
            <p className={styles.progressText}>
              Question {currentIndex + 1} of {activeQuestions.length}
            </p>
          </div>
          <span className={styles.difficultyBadge}>
            {DIFFICULTY_LABELS[question.difficulty]}
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={1}
          aria-valuemax={activeQuestions.length}
          aria-valuenow={currentIndex + 1}
        >
          <span
            style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
          />
        </div>

        <h2
          className={styles.questionTitle}
          id="question-title"
          ref={activeHeadingRef}
          tabIndex={-1}
        >
          {question.stem}
        </h2>

        <ResponseControls
          question={question}
          response={response}
          disabled={checked}
          onChange={(nextResponse) => {
            setResponses((current) => ({
              ...current,
              [question.id]: nextResponse,
            }));
            setMessage("");
          }}
        />

        {checked && grade ? (
          <div
            className={grade.correct ? styles.feedbackCorrect : styles.feedbackReview}
            role="status"
            aria-live="polite"
          >
            <strong>{grade.correct ? "Correct." : "Not quite yet."}</strong>
            <p>
              <b>Answer:</b> {formatCorrectAnswer(question)}
            </p>
            <p>{question.explanation}</p>
          </div>
        ) : null}

        <div className={styles.quizFooter}>
          <p className={styles.statusMessage} role="alert">
            {message}
          </p>
          {!checked ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                if (!isAnswered(response)) {
                  setMessage("Choose or enter an answer before checking it.");
                  return;
                }
                setCheckedIds((current) => [...current, question.id]);
                setMessage("");
              }}
            >
              Check answer
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                if (currentIndex === activeQuestions.length - 1) {
                  setMode("results");
                } else {
                  setCurrentIndex((index) => index + 1);
                  setMessage("");
                }
              }}
            >
              {currentIndex === activeQuestions.length - 1
                ? "See results"
                : "Next question"}
            </button>
          )}
        </div>
      </section>
    );
  }

  const score = activeQuestions.reduce(
    (total, item) => total + gradeQuestion(item, responses[item.id]).earned,
    0,
  );
  const percentage = activeQuestions.length
    ? Math.round((score / activeQuestions.length) * 100)
    : 0;

  return (
    <section className={styles.panel} aria-labelledby="results-title">
      <div className={styles.resultsHero}>
        <p className={styles.eyebrow}>Practice complete</p>
        <h2 id="results-title" ref={activeHeadingRef} tabIndex={-1}>
          You scored {percentage}%
        </h2>
        <p>
          {score} of {activeQuestions.length} questions correct. Use the review below
          to decide what to revisit next.
        </p>
      </div>

      <div className={styles.resultActions}>
        <button className={styles.primaryButton} type="button" onClick={restartSameQuiz}>
          Try this set again
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => {
            setMode("builder");
            setMessage("");
          }}
        >
          Build another quiz
        </button>
      </div>

      <div className={styles.reviewList}>
        {activeQuestions.map((item, index) => {
          const grade = gradeQuestion(item, responses[item.id]);

          return (
            <details className={styles.reviewItem} key={item.id}>
              <summary>
                <span>{index + 1}. {item.stem}</span>
                <strong className={grade.correct ? styles.correctText : styles.reviewText}>
                  {grade.correct ? "Correct" : "Review"}
                </strong>
              </summary>
              <div>
                <p><b>Correct answer:</b> {formatCorrectAnswer(item)}</p>
                <p>{item.explanation}</p>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
