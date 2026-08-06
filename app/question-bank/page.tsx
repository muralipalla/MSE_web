import type { Metadata } from "next";
import Link from "next/link";

import { QuestionBankExplorer } from "@/components/quiz";
import { QUESTION_BANK, QUIZ_TOPICS } from "@/content/questions/question-bank";
import styles from "@/components/quiz/quiz.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Question bank",
  description:
    "Search reviewed materials science questions by topic, difficulty, and response type.",
};

export default function QuestionBankPage() {
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.pageHeader}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> Back to the learning lab
        </Link>
        <p className={styles.eyebrow}>Transparent by design</p>
        <h1>A question bank made for self-learning.</h1>
        <p>
          Search every reviewed item, reveal its answer, and study the explanation.
          When you are ready, use the <Link href="/quizzes">quiz builder</Link> to
          assemble a reproducible practice set from selected topics.
        </p>
      </header>
      <QuestionBankExplorer bank={QUESTION_BANK} topics={QUIZ_TOPICS} />
    </main>
  );
}
