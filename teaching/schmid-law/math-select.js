(function () {
  'use strict';
  let opened = null;

  // Enhance a native select only when mathematical typesetting is available.
  // Keep the select as the value source and as the no-JavaScript fallback.
  window.createMathSelect = function (select, format) {
    if (!window.MSEMath || !window.katex) return null;
    const label = document.querySelector('label[for="' + select.id + '"]');
    const wrapper = document.createElement('div');
    wrapper.className = 'math-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = select.id + '-picker';
    trigger.className = 'math-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const value = document.createElement('span');
    value.id = select.id + '-value';
    value.className = 'math-select-value';
    const chevron = document.createElement('span');
    chevron.className = 'math-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    const list = document.createElement('div');
    list.id = select.id + '-listbox';
    list.className = 'math-select-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label?.textContent || 'Options');
    list.hidden = true;
    trigger.setAttribute('aria-controls', list.id);
    trigger.append(value, chevron);
    wrapper.append(trigger, list);
    let options = [];
    let active = 0;
    let search = '';
    let searchedAt = 0;
    const spoken = option => option.getAttribute('aria-label') || option.textContent;
    const isOpen = () => !list.hidden;

    function position() {
      const rect = trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const height = Math.min(340, options.length * 56 + 8);
      const flip = below < Math.min(180, height) && above > below;
      wrapper.classList.toggle('opens-above', flip);
      list.style.maxHeight = Math.max(96, Math.min(340, flip ? above : below)) + 'px';
    }
    function highlight() {
      [...list.children].forEach((row, i) => {
        row.classList.toggle('is-active', i === active);
        row.setAttribute('aria-selected', String(i === active));
      });
      if (!isOpen()) return;
      const row = list.children[active];
      if (!row) return;
      trigger.setAttribute('aria-activedescendant', row.id);
      // Scroll the popup, without moving the surrounding page.
      if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
      }
    }
    function close() {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (opened === api) opened = null;
    }
    function open() {
      if (!options.length) return;
      if (opened && opened !== api) opened.close();
      active = Math.max(0, select.selectedIndex);
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      opened = api;
      position();
      highlight();
    }
    function visual(option) {
      const node = format(option);
      node.setAttribute('aria-hidden', 'true');
      return node;
    }
    function sync() {
      close();
      options = [...select.options];
      trigger.disabled = select.disabled || !options.length;
      active = Math.max(0, select.selectedIndex);
      list.replaceChildren(...options.map((option, i) => {
        const row = document.createElement('div');
        row.id = select.id + '-choice-' + i;
        row.className = 'math-select-option';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-label', spoken(option));
        row.append(visual(option));
        row.addEventListener('pointermove', () => {
          if (active !== i) { active = i; highlight(); }
        });
        row.addEventListener('pointerdown', event => {
          if (event.pointerType === 'mouse') event.preventDefault();
        });
        row.addEventListener('click', () => commit(i, true));
        return row;
      }));
      const selected = options[active];
      value.replaceChildren();
      if (selected) {
        const accessibleValue = document.createElement('span');
        accessibleValue.className = 'math-select-spoken';
        accessibleValue.textContent = spoken(selected);
        value.append(visual(selected), accessibleValue);
      }
      highlight();
    }
    function commit(index, focus) {
      if (!options[index]) return;
      const changed = select.value !== options[index].value;
      select.value = options[index].value;
      close();
      if (changed) select.dispatchEvent(new Event('change', {bubbles: true}));
      else sync();
      if (focus) trigger.focus({preventScroll: true});
    }
    function move(index) {
      active = Math.max(0, Math.min(options.length - 1, index));
      highlight();
    }
    trigger.addEventListener('click', () => isOpen() ? close() : open());
    trigger.addEventListener('keydown', event => {
      const key = event.key;
      if (key === 'Tab') {
        if (isOpen()) commit(active, false);
        return;
      }
      if (key === 'Escape') {
        if (isOpen()) { event.preventDefault(); close(); }
        return;
      }
      if (key === 'ArrowUp' && event.altKey && isOpen()) {
        event.preventDefault();
        commit(active, true);
        return;
      }
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(key)) {
        event.preventDefault();
        if (key === 'Enter' || key === ' ') {
          if (isOpen()) commit(active, true); else open();
          return;
        }
        const wasOpen = isOpen();
        if (!wasOpen) open();
        if (key === 'Home') move(0);
        else if (key === 'End') move(options.length - 1);
        else if (key === 'PageDown') move(active + 10);
        else if (key === 'PageUp') move(active - 10);
        else if (wasOpen) move(active + (key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (!isOpen()) open();
        const now = Date.now();
        const letter = key.toLowerCase();
        search = now - searchedAt > 700 || search === letter ? letter : search + letter;
        searchedAt = now;
        for (let step = 1; step <= options.length; step += 1) {
          const i = (active + step) % options.length;
          const text = options[i].textContent.toLowerCase().replace(/[\s()[\]{}⟨⟩\u0305]/g, '');
          if (text.startsWith(search)) { move(i); break; }
        }
      }
    });
    select.addEventListener('change', sync);
    document.addEventListener('pointerdown', event => {
      if (isOpen() && !wrapper.contains(event.target)) close();
    });
    document.addEventListener('focusin', event => {
      if (isOpen() && !wrapper.contains(event.target)) close();
    });
    window.addEventListener('resize', () => {
      if (isOpen()) { position(); highlight(); }
    });
    const api = {sync, close};
    try {
      sync();
      select.after(wrapper);
      if (label) {
        if (!label.id) label.id = select.id + '-label';
        label.htmlFor = trigger.id;
        trigger.setAttribute('aria-labelledby', label.id + ' ' + value.id);
      }
      select.hidden = true;
      return api;
    } catch (error) {
      wrapper.remove();
      select.hidden = false;
      if (label) label.htmlFor = select.id;
      console.warn('Math options unavailable; retaining native select.', error);
      return null;
    }
  };
}());
