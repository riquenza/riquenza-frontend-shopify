(function () {
  'use strict';

  const placeHotspots = () => {
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    document.querySelectorAll('[data-riq-hotspots]').forEach((scene) => {
      const spots = scene.querySelectorAll('[data-riq-hotspot]');
      const cards = scene.querySelectorAll('[data-riq-hotspot-card]');
      spots.forEach((spot, i) => {
        const top = desktop ? spot.getAttribute('data-top-d') : spot.getAttribute('data-top-m');
        const left = desktop ? spot.getAttribute('data-left-d') : spot.getAttribute('data-left-m');
        spot.style.top = top + '%';
        spot.style.left = left + '%';
        const card = cards[i];
        if (card) {
          card.style.top = top + '%';
          card.style.left = left + '%';
        }
      });
    });
  };

  document.addEventListener('click', (e) => {
    const spot = e.target.closest('[data-riq-hotspot]');
    if (!spot) {
      if (!e.target.closest('[data-riq-hotspot-card]')) {
        document.querySelectorAll('[data-riq-hotspot-card].is-open').forEach((c) => c.classList.remove('is-open'));
        document.querySelectorAll('[data-riq-hotspot].is-active').forEach((s) => s.classList.remove('is-active'));
      }
      return;
    }
    e.preventDefault();
    const scene = spot.closest('[data-riq-hotspots]');
    const spots = [...scene.querySelectorAll('[data-riq-hotspot]')];
    const cards = [...scene.querySelectorAll('[data-riq-hotspot-card]')];
    const i = spots.indexOf(spot);
    const was = spot.classList.contains('is-active');
    spots.forEach((s) => s.classList.remove('is-active'));
    cards.forEach((c) => c.classList.remove('is-open'));
    if (!was && cards[i]) {
      spot.classList.add('is-active');
      cards[i].classList.add('is-open');
    }
  });

  window.addEventListener('resize', placeHotspots);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeHotspots);
  else placeHotspots();
})();
