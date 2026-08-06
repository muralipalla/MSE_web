# Publication review checklist

## Scientific and instructional review

- [ ] Learning outcomes are measurable and match the lesson.
- [ ] Equations, units, definitions, and assumptions are correct.
- [ ] Worked examples have been recalculated independently.
- [ ] Common misconceptions are addressed explicitly.
- [ ] Prerequisites and next steps use stable topic IDs.
- [ ] Questions cover every published outcome and include worked explanations.
- [ ] Sources, citations, permissions, and licenses are recorded.

## Interactive review

- [ ] Default state is meaningful and reset works.
- [ ] Parameter limits prevent invalid or misleading states.
- [ ] Numerical results match reference calculations.
- [ ] Units and significant figures are visible.
- [ ] Assumptions and limitations are stated beside the model.
- [ ] A text summary or data table communicates the result without the graphic.

## Accessibility review

- [ ] Entire flow works using only a keyboard.
- [ ] Focus is always visible and moves appropriately after quiz transitions.
- [ ] Headings, landmarks, fieldsets, legends, labels, and table headers are correct.
- [ ] Status and feedback updates are announced by assistive technology.
- [ ] Meaning is not conveyed by color alone.
- [ ] Text and controls meet WCAG AA contrast.
- [ ] Layout remains usable at 200% zoom and on a 320 px-wide viewport.
- [ ] Reduced-motion preferences are respected.
- [ ] Images and models have instructional alt text or descriptions.

## Technical review

- [ ] JSON validates against the relevant schema.
- [ ] IDs and slugs are unique.
- [ ] Internal links and referenced files exist.
- [ ] Quiz sampling is reproducible for a supplied seed.
- [ ] Build, tests, and lint pass.
- [ ] No answer or progress claim implies secure examination behavior.

Only change `status` to `published` after all applicable checks are complete.
