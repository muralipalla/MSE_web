(function () {
  'use strict';

  if (!window.katex) return;

  document.querySelectorAll('[data-tex]').forEach(element => {
    const fallback = element.innerHTML;
    try {
      window.katex.render(element.dataset.tex, element, {
        displayMode: element.classList.contains('formula'),
        throwOnError: true,
        output: 'htmlAndMathml',
        strict: 'error',
        trust: false
      });
      element.dataset.mathRendered = 'true';
    } catch (error) {
      element.innerHTML = fallback;
      console.warn('Math typesetting unavailable for an equation; using its HTML fallback.', error);
    }
  });
}());
