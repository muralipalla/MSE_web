(function () {
  'use strict';

  if (!window.katex) return;

  function render(element, tex = element?.dataset.tex) {
    if (!element || typeof tex !== 'string') return false;
    const fallback = element.innerHTML;
    try {
      window.katex.render(tex, element, {
        displayMode: element.classList.contains('formula'),
        throwOnError: true,
        output: 'htmlAndMathml',
        strict: 'error',
        trust: false
      });
      element.dataset.tex = tex;
      element.dataset.mathRendered = 'true';
      return true;
    } catch (error) {
      element.innerHTML = fallback;
      delete element.dataset.mathRendered;
      console.warn('Math typesetting unavailable for an equation; using its HTML fallback.', error);
      return false;
    }
  }

  function renderAll(root = document) {
    root.querySelectorAll('[data-tex]').forEach(element => render(element));
  }

  let fontPromise;
  function fontsReady() {
    if (!fontPromise) {
      fontPromise = document.fonts?.load ? Promise.all([
        document.fonts.load('italic 40px KaTeX_Math', 'Fϕλdnaxyzc'),
        document.fonts.load('24px KaTeX_Main', '0123')
      ]).catch(error => console.warn('Math canvas fonts unavailable; using serif fallback.', error)) : Promise.resolve();
    }
    return fontPromise;
  }

  window.MSEMath = { render, renderAll, fontsReady };
  renderAll();
}());
