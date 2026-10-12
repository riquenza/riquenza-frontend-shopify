(function () {
  'use strict';
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-riq-sort-toggle]');
    if (!toggle) return;
    const menu = document.querySelector('[data-riq-sort-menu]');
    if (menu) menu.hidden = !menu.hidden;
  });
})();
