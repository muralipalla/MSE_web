export const QUESTION_TYPES = [
  "single-choice",
  "multiple-select",
  "true-false",
  "numeric",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = [
  "foundation",
  "intermediate",
  "advanced",
] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export interface QuizTopic {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

export interface Choice {
  id: string;
  label: string;
}

interface QuestionBase {
  id: string;
  version: number;
  status: "reviewed";
  topicId: string;
  outcomeIds: string[];
  difficulty: Difficulty;
  bloom: "remember" | "understand" | "apply" | "analyze";
  stem: string;
  explanation: string;
  tags: string[];
  reviewedAt: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: "single-choice";
  choices: Choice[];
  answer: string;
}

export interface MultipleSelectQuestion extends QuestionBase {
  type: "multiple-select";
  choices: Choice[];
  answer: string[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: "true-false";
  answer: boolean;
}

export interface NumericQuestion extends QuestionBase {
  type: "numeric";
  answer: number;
  tolerance: number;
  unit?: string;
  answerNote?: string;
}

export type QuizQuestion =
  | SingleChoiceQuestion
  | MultipleSelectQuestion
  | TrueFalseQuestion
  | NumericQuestion;

export type QuestionResponse = string | string[] | boolean | number | undefined;

export interface QuizSelection {
  topicIds: string[];
  difficulties: Difficulty[];
  count: number;
  seed: string;
}

export interface GradeResult {
  correct: boolean;
  earned: number;
  possible: number;
}
