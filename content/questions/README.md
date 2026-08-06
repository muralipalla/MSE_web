# MSE question bank

The initial bank lives in `question-bank.ts` so the quiz and catalogue share one typed source of truth. Questions are formative, locally scored, and reviewed before their `status` is set to `reviewed`.

## Authoring checklist

1. Give every question an immutable ID and increment `version` when its meaning changes.
2. Link it to one topic and at least one measurable learning outcome.
3. Write plausible distractors that diagnose misconceptions without using trick wording.
4. Include a concise explanation that teaches the governing idea, not just the correct letter.
5. Check calculations, units, symbols, and accepted numeric tolerance independently.
6. Test keyboard operation and review the item on a narrow screen.
7. Add or update the review date only after a subject-matter review.

The public question-bank page intentionally exposes answers because this site is designed for self-learning, not secure assessment.
