"use client";

import { useMemo, useState } from "react";

import {
  DIFFICULTIES,
  QUESTION_TYPES,
  formatCorrectAnswer,
  type Difficulty,
  type QuestionType,
  type QuizQuestion,
  type QuizTopic,
} from "@/features/quiz";

import styles from "./quiz.module.css";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const TYPE_LABELS: Record<QuestionType, string> = {
  "single-choice": "Single choice",
  "multiple-select": "Multiple select",
  "true-false": "True / false",
  numeric: "Numeric",
};

export function QuestionBankExplorer({
  bank,
  topics,
}: {
  bank: QuizQuestion[];
  topics: QuizTopic[];
}) {
  const [query, setQuery] = useState("");
  const [topicId, setTopicId] = useState("all");
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>("all");
  const [type, setType] = useState<"all" | QuestionType>("all");
  const topicById = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return bank.filter((question) => {
      const searchable = [
        question.id,
        question.stem,
        question.explanation,
        ...question.tags,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return (
        (topicId === "all" || question.topicId === topicId) &&
        (difficulty === "all" || question.difficulty === difficulty) &&
        (type === "all" || question.type === type) &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [bank, query, topicId, difficulty, type]);

  return (
    <section className={styles.panel} aria-labelledby="bank-title">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>Reviewed formative items</p>
          <h2 id="bank-title">Browse the bank</h2>
        </div>
        <span className={styles.availability} aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "question" : "questions"}
        </span>
      </div>

      <div className={styles.filterGrid}>
        <label className={styles.searchField}>
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try ‘vacancy’ or ‘stress’"
          />
        </label>
        <label className={styles.selectField}>
          <span>Topic</span>
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            <option value="all">All topics</option>
            {topics.map((topic) => (
              <option value={topic.id} key={topic.id}>{topic.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.selectField}>
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as "all" | Difficulty)}
          >
            <option value="all">All levels</option>
            {DIFFICULTIES.map((value) => (
              <option value={value} key={value}>{DIFFICULTY_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <label className={styles.selectField}>
          <span>Question type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "all" | QuestionType)}
          >
            <option value="all">All types</option>
            {QUESTION_TYPES.map((value) => (
              <option value={value} key={value}>{TYPE_LABELS[value]}</option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length ? (
        <div className={styles.bankList}>
          {filtered.map((question) => (
            <article className={styles.bankItem} key={question.id}>
              <div className={styles.bankMeta}>
                <span>{topicById.get(question.topicId)?.label ?? question.topicId}</span>
                <span>{DIFFICULTY_LABELS[question.difficulty]}</span>
                <span>{TYPE_LABELS[question.type]}</span>
                <code>{question.id}</code>
              </div>
              <h3>{question.stem}</h3>
              <details>
                <summary>Show answer and explanation</summary>
                <div className={styles.bankAnswer}>
                  <p><b>Answer:</b> {formatCorrectAnswer(question)}</p>
                  <p>{question.explanation}</p>
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No questions match these filters</h3>
          <p>Clear the search or broaden one of the filters.</p>
        </div>
      )}
    </section>
  );
}
