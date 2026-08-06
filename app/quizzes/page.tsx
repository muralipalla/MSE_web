import type { Metadata } from "next";
import Link from "next/link";

import { QuizExperience } from "@/components/quiz";
import { QUESTION_BANK, QUIZ_TOPICS } from "@/content/questions/question-bank";
import styles from "@/components/quiz/quiz.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Practice quiz",
  description:
    "Build a topic-selected formative materials science quiz with immediate feedback and explanations.",
};

export default function QuizzesPage() {
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.pageHeader}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> Back to the learning lab
        </Link>
        <p className={styles.eyebrow}>Practice · Check · Learn</p>
        <h1>Build a quiz around your next learning goal.</h1>
        <p>
          Select topics, level, and length. Every answer includes teaching feedback,
          and nothing is submitted to a gradebook. Prefer to browse first? Visit the{" "}
          <Link href="/question-bank">open question bank</Link>.
        </p>
      </header>
      <QuizExperience bank={QUESTION_BANK} topics={QUIZ_TOPICS} />
    </main>
  );
}
