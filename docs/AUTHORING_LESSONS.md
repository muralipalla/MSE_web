# Authoring lessons

Lessons live in `content/lessons/<domain>/<topic>.mdx`. Use one lesson record per
stable learning unit rather than creating long chapter pages.

## Required metadata

```yaml
---
id: lesson.crystal-structures.introduction
type: lesson
slug: crystal-structures
title: Crystal Structures
domainId: structure-microstructure
topicIds:
  - crystal-structures
outcomeIds:
  - lo.crystal.01
level: foundation
estimatedMinutes: 25
status: draft
version: 1
authors:
  - Author name
reviewedBy: []
lastReviewed: null
---
```

## Recommended lesson shape

1. A short orientation that explains why the idea matters.
2. Three to six explicit learning outcomes.
3. Prerequisite recall, with links rather than duplicated content.
4. Concept explanation from qualitative to quantitative.
5. One annotated worked example.
6. One common misconception and its correction.
7. One interactive or data interpretation activity.
8. A concise summary.
9. Topic-filtered practice and next-step links.

Use SI units and define symbols directly beside the first equation. State the
conditions under which every equation or model is valid.

## Writing principles

- Prefer short explanatory sections over textbook-length walls of text.
- Make the causal chain explicit: what changes, why it changes, and what is
  observed.
- Pair every mathematical relationship with a verbal and visual interpretation.
- Use tables only when learners need to compare several repeated attributes.
- Add alt text that explains the instructional meaning of every image.
- Cite the source and license for reused data, diagrams, or media.
- Use UTF-8 characters and avoid pasting corrupted symbols from older HTML.

Before publication, verify all outcome, topic, glossary, interactive, and quiz
links against the shared taxonomy.
