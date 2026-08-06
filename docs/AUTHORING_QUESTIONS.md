# Authoring questions

Question banks are modular JSON files in `content/questions/`. The quiz interface
loads the normalized question records in `features/quiz/`.

## Core rules

- Give every question an immutable ID and integer version.
- Map questions to at least one topic and one learning outcome.
- Use stable choice IDs; never grade by visible option text.
- Write an instructional explanation of the reasoning.
- Add misconception-specific feedback when a distractor represents a known error.
- Record estimated time, Bloom level, difficulty, source, and review status.
- Keep answers and explanations outside HTML markup whenever possible.

## Example single-choice record

```json
{
  "id": "q.crystal.sc.001",
  "version": 1,
  "status": "reviewed",
  "primaryTopicId": "crystal-structures",
  "topicIds": ["crystal-structures"],
  "outcomeIds": ["lo.crystal.01"],
  "type": "single-choice",
  "difficulty": "foundation",
  "bloomLevel": "understand",
  "estimatedSeconds": 75,
  "stem": "What is the coordination number of an FCC crystal?",
  "choices": [
    { "id": "a", "text": "6" },
    { "id": "b", "text": "8" },
    { "id": "c", "text": "12" },
    { "id": "d", "text": "14" }
  ],
  "answer": { "choiceIds": ["c"] },
  "feedback": {
    "explanation": "Each FCC atom has twelve nearest neighbours.",
    "misconceptions": {
      "a": "Six is the coordination number of simple cubic.",
      "b": "Eight is the coordination number of BCC."
    }
  },
  "hints": ["Count neighbours in the same and adjacent close-packed planes."],
  "shuffleChoices": true,
  "source": { "citation": "Course-authored", "license": "CC BY-NC 4.0" }
}
```

## Supported first-release types

- single choice;
- multiple select;
- true or false;
- numeric with tolerance and accepted units.

Matching, ordering, graph reading, structure identification, and parameterized
questions are planned once the core validation and grading tests are stable.

## Quality checklist for each question

- The stem can be understood without reading the choices.
- There is one defensible answer set under the stated assumptions.
- Distractors are plausible and grammatically parallel.
- The correct choice is not consistently longer or more precise.
- Units, significant figures, and tolerance are explicit.
- The explanation teaches the reasoning and links back to the relevant lesson.
- The question has been solved independently by a reviewer.

Do not copy the older universal quiz into a single large HTML file. Its useful
ideas—topic selection, modular banks, hints, immediate feedback, and question
navigation—belong in separate data, selection, grading, and interface modules.
