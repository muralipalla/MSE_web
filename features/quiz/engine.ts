import type {
  Difficulty,
  GradeResult,
  QuestionResponse,
  QuizQuestion,
  QuizSelection,
} from "./types";

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

/**
 * Selects a reproducible, topic-balanced quiz from the reviewed question bank.
 * The same bank, filters, count, and seed always produce the same sequence.
 */
export function selectQuestions(
  bank: QuizQuestion[],
  selection: QuizSelection,
): QuizQuestion[] {
  const selectedTopics = new Set(selection.topicIds);
  const selectedDifficulties = new Set<Difficulty>(selection.difficulties);
  const eligible = bank.filter(
    (question) =>
      question.status === "reviewed" &&
      selectedTopics.has(question.topicId) &&
      selectedDifficulties.has(question.difficulty),
  );

  if (eligible.length === 0) return [];

  const random = seededRandom(
    hashSeed(
      `${selection.seed}|${selection.topicIds.slice().sort().join(",")}|${selection.difficulties
        .slice()
        .sort()
        .join(",")}`,
    ),
  );
  const topicOrder = shuffled(
    [...new Set(eligible.map((question) => question.topicId))],
    random,
  );
  const queues = new Map(
    topicOrder.map((topicId) => [
      topicId,
      shuffled(
        eligible.filter((question) => question.topicId === topicId),
        random,
      ),
    ]),
  );
  const requestedCount = Math.max(
    1,
    Math.min(Math.floor(selection.count), eligible.length),
  );
  const chosen: QuizQuestion[] = [];

  while (chosen.length < requestedCount) {
    let addedInRound = false;

    for (const topicId of topicOrder) {
      if (chosen.length >= requestedCount) break;
      const nextQuestion = queues.get(topicId)?.shift();

      if (nextQuestion) {
        chosen.push(nextQuestion);
        addedInRound = true;
      }
    }

    if (!addedInRound) break;
  }

  return chosen;
}

function normalizedSet(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function gradeQuestion(
  question: QuizQuestion,
  response: QuestionResponse,
): GradeResult {
  let correct = false;

  if (question.type === "multiple-select") {
    const submitted = Array.isArray(response) ? normalizedSet(response) : [];
    correct =
      JSON.stringify(submitted) === JSON.stringify(normalizedSet(question.answer));
  } else if (question.type === "numeric") {
    const value = typeof response === "number" ? response : Number(response);
    correct = Number.isFinite(value) && Math.abs(value - question.answer) <= question.tolerance;
  } else {
    correct = response === question.answer;
  }

  return { correct, earned: correct ? 1 : 0, possible: 1 };
}

export function isAnswered(response: QuestionResponse): boolean {
  if (Array.isArray(response)) return response.length > 0;
  if (typeof response === "string") return response.trim().length > 0;
  return response !== undefined;
}

export function formatCorrectAnswer(question: QuizQuestion): string {
  if (question.type === "single-choice") {
    return (
      question.choices.find((choice) => choice.id === question.answer)?.label ??
      question.answer
    );
  }

  if (question.type === "multiple-select") {
    return question.answer
      .map(
        (answerId) =>
          question.choices.find((choice) => choice.id === answerId)?.label ?? answerId,
      )
      .join("; ");
  }

  if (question.type === "true-false") {
    return question.answer ? "True" : "False";
  }

  return `${question.answer}${question.unit ? ` ${question.unit}` : ""}${
    question.answerNote ? ` (${question.answerNote})` : ""
  }`;
}
