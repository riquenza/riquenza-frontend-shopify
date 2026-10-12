(function () {
  'use strict';

  const money = (cents) => {
    const n = Number(cents);
    if (!Number.isFinite(n)) return '';
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney && window.Riq?.moneyFormat) {
      return Shopify.formatMoney(n, window.Riq.moneyFormat);
    }
    return '₹' + Math.round(n / 100).toLocaleString('en-IN');
  };

  const parseSize = (title) => {
    const m = String(title || '').match(/(\d+\.?\d*)\s*([a-zA-Z]+)/);
    if (!m) return null;
    return { size: parseFloat(m[1]), unit: m[2] };
  };

  const unitPriceLabel = (title, priceCents) => {
    const parsed = parseSize(title);
    if (!parsed || !parsed.size || !priceCents) return '';
    const per = priceCents / 100 / parsed.size;
    return `₹${per.toFixed(2)}/${parsed.unit}`;
  };

  const syncQtyButtons = (form) => {
    const input = form.querySelector('[data-riq-qty-input]');
    const dec = form.querySelector('[data-riq-qty="-1"]');
    if (!input || !dec) return;
    dec.disabled = Number(input.value || 1) <= 1;
  };

  const applyVariant = (root, btn) => {
    if (!btn || btn.classList.contains('is-sold')) return;
    const id = btn.getAttribute('data-variant-id');
    const title = btn.getAttribute('data-variant-title');
    const price = Number(btn.getAttribute('data-price'));
    const compare = Number(btn.getAttribute('data-compare'));
    const available = btn.getAttribute('data-available') === 'true';
    const image = btn.getAttribute('data-image');

    root.querySelectorAll('[data-riq-variant-picker]').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    root.querySelectorAll('[data-riq-variant-input]').forEach((input) => {
      input.value = id;
    });

    const priceEl = root.querySelector('[data-riq-price]');
    if (priceEl) priceEl.textContent = money(price);

    const compareEl = root.querySelector('[data-riq-compare]');
    const badgeEl = root.querySelector('[data-riq-discount-badge]');
    const savingsEl = root.querySelector('[data-riq-savings]');
    if (compare > price && compare > 0) {
      const pct = Math.round(((compare - price) / compare) * 100);
      const save = compare - price;
      if (compareEl) {
        compareEl.textContent = money(compare);
        compareEl.hidden = false;
      }
      if (badgeEl) {
        badgeEl.textContent = pct + '% OFF';
        badgeEl.hidden = false;
      }
      if (savingsEl) {
        savingsEl.textContent = 'You save ' + money(save);
        savingsEl.hidden = false;
      }
    } else {
      if (compareEl) compareEl.hidden = true;
      if (badgeEl) badgeEl.hidden = true;
      if (savingsEl) savingsEl.hidden = true;
    }

    const unitRoot = root.querySelector('[data-riq-unit-price]');
    if (unitRoot) {
      const label = unitPriceLabel(title, price);
      if (label) {
        unitRoot.textContent = label;
        unitRoot.hidden = false;
        const dot = root.querySelector('.riq-pdp__dot--tax');
        if (dot) dot.hidden = false;
      } else {
        unitRoot.hidden = true;
      }
    }

    root.querySelectorAll('[data-riq-variant-unit]').forEach((el) => {
      const card = el.closest('[data-riq-variant-picker]');
      if (!card) return;
      const t = card.getAttribute('data-variant-title');
      const p = Number(card.getAttribute('data-price'));
      const u = unitPriceLabel(t, p);
      el.textContent = u ? '(' + u + ')' : '';
    });

    const titleSize = root.querySelector('[data-riq-variant-title]');
    if (titleSize && title) titleSize.textContent = ' — ' + title;

    const main = root.querySelector('[data-riq-main-image]');
    if (main && image) main.src = image;

    root.querySelectorAll('[data-riq-atc]').forEach((atc) => {
      atc.disabled = !available;
      atc.textContent = available ? 'Add to Cart' : 'Out of Stock';
    });

    const url = new URL(window.location.href);
    url.searchParams.set('variant', id);
    window.history.replaceState({}, '', url.toString());
  };

  const initGallery = (gallery) => {
    const stage = gallery.querySelector('[data-riq-pdp-stage]');
    const thumbs = gallery.querySelector('[data-riq-pdp-thumbs]');
    const more = gallery.querySelector('[data-riq-pdp-more]');
    if (thumbs) {
      thumbs.addEventListener(
        'scroll',
        () => {
          if (more) more.hidden = true;
        },
        { passive: true }
      );
    }

    if (!stage) return;
    let startX = null;
    const urls = [...gallery.querySelectorAll('[data-riq-thumb]')].map((t) => t.getAttribute('data-src'));
    const main = gallery.querySelector('[data-riq-main-image]');

    const setImage = (src) => {
      if (!main || !src) return;
      main.src = src;
      gallery.querySelectorAll('[data-riq-thumb]').forEach((t) => {
        t.classList.toggle('is-active', t.getAttribute('data-src') === src);
      });
    };

    const onStart = (x) => {
      startX = x;
    };
    const onEnd = (x) => {
      if (startX === null || !urls.length) return;
      const diff = startX - x;
      if (Math.abs(diff) < 50) {
        startX = null;
        return;
      }
      const current = urls.indexOf(main?.src) >= 0 ? urls.indexOf(main.src) : 0;
      const next =
        diff > 0 ? (current + 1) % urls.length : (current - 1 + urls.length) % urls.length;
      setImage(urls[next]);
      startX = null;
    };

    stage.addEventListener('pointerdown', (e) => onStart(e.clientX));
    stage.addEventListener('pointerup', (e) => onEnd(e.clientX));
    stage.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches[0]) onStart(e.touches[0].clientX);
      },
      { passive: true }
    );
    stage.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches[0]) onEnd(e.changedTouches[0].clientX);
      },
      { passive: true }
    );
  };

  const initAccordions = (root) => {
    const triggers = [...root.querySelectorAll('[data-riq-pdp-accordion-trigger]')];
    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        const open = trigger.getAttribute('aria-expanded') !== 'true';

        if (open) {
          triggers.forEach((other) => {
            if (other === trigger) return;
            other.setAttribute('aria-expanded', 'false');
            const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
            if (otherPanel) otherPanel.hidden = true;
          });
        }

        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (panel) panel.hidden = !open;
      });
    });
  };

  const initUpsell = (block) => {
    const track = block.querySelector('[data-riq-pdp-upsell-track]');
    const dotsWrap = block.querySelector('[data-riq-pdp-upsell-dots]');
    if (!track) return;

    const cards = [...track.children];
    if (dotsWrap && cards.length > 1) {
      dotsWrap.innerHTML = cards
        .map(
          (_, i) =>
            `<span class="riq-pdp-upsell__dot${i === 0 ? ' is-active' : ''}" data-index="${i}"></span>`
        )
        .join('');
    }

    const syncDots = () => {
      if (!dotsWrap || cards.length < 2) return;
      const step = (cards[0]?.offsetWidth || 220) + 8;
      const idx = Math.min(
        cards.length - 1,
        Math.max(0, Math.round(track.scrollLeft / Math.max(step, 1)))
      );
      dotsWrap.querySelectorAll('.riq-pdp-upsell__dot').forEach((d, i) => {
        d.classList.toggle('is-active', i === idx);
      });
    };

    track.addEventListener('scroll', syncDots, { passive: true });

    block.querySelectorAll('[data-riq-upsell-scroll]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = (cards[0]?.offsetWidth || 220) + 8;
        const dir = btn.getAttribute('data-riq-upsell-scroll');
        track.scrollBy({ left: dir === 'next' ? step : -step, behavior: 'smooth' });
      });
    });
  };

  const initProduct = (root) => {
    if (root._riqPdp) return;
    root._riqPdp = true;

    const gallery = root.querySelector('[data-riq-pdp-gallery]');
    if (gallery) initGallery(gallery);

    initAccordions(root);

    root.querySelectorAll('[data-riq-pdp-upsell]').forEach(initUpsell);

    const selected = root.querySelector('[data-riq-variant-picker].is-selected');
    if (selected) {
      applyVariant(root, selected);
    } else {
      let title = root.querySelector('[data-riq-variant-title]')?.textContent?.replace(/^ — /, '').trim();
      let priceCents = 0;
      try {
        const variants = JSON.parse(document.getElementById('riq-product-variants-json')?.textContent || '[]');
        const param = new URLSearchParams(window.location.search).get('variant');
        const v =
          variants.find((x) => String(x.id) === param) ||
          variants.find((x) => x.available) ||
          variants[0];
        if (v) {
          priceCents = v.price;
          if (!title || title === '') title = v.title;
        }
      } catch (_) {
        /* ignore */
      }
      const unitRoot = root.querySelector('[data-riq-unit-price]');
      const label = unitPriceLabel(title, priceCents);
      if (unitRoot && label) {
        unitRoot.textContent = label;
        unitRoot.hidden = false;
      } else if (unitRoot) {
        unitRoot.hidden = true;
        const dot = root.querySelector('.riq-pdp__dot--tax');
        if (dot) dot.hidden = label === '';
      }
    }

    root.querySelectorAll('[data-riq-variant-unit]').forEach((el) => {
      const card = el.closest('[data-riq-variant-picker]');
      if (!card) return;
      const t = card.getAttribute('data-variant-title');
      const p = Number(card.getAttribute('data-price'));
      const u = unitPriceLabel(t, p);
      el.textContent = u ? '(' + u + ')' : '';
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) return;
      const picker = e.target.closest('[data-riq-variant-picker]');
      if (picker && root.contains(picker)) {
        e.preventDefault();
        applyVariant(root, picker);
      }
    });
  };

  document.addEventListener('click', (e) => {
    const thumb = e.target.closest('[data-riq-thumb]');
    if (thumb) {
      const src = thumb.getAttribute('data-src');
      const gallery = thumb.closest('[data-riq-pdp-gallery]');
      const main = gallery?.querySelector('[data-riq-main-image]');
      if (main && src) main.src = src;
      gallery?.querySelectorAll('[data-riq-thumb]').forEach((t) => t.classList.toggle('is-active', t === thumb));
      return;
    }

    const qtyBtn = e.target.closest('[data-riq-qty]');
    if (!qtyBtn) return;
    const form = qtyBtn.closest('form');
    if (!form) return;
    const input = form.querySelector('[data-riq-qty-input]');
    const label = form.querySelector('[data-riq-qty-value]');
    const delta = Number(qtyBtn.getAttribute('data-riq-qty'));
    const next = Math.max(1, Number(input.value || 1) + delta);
    input.value = next;
    if (label) label.textContent = next;
    syncQtyButtons(form);
  });

  const boot = () => {
    document.querySelectorAll('[data-riq-product]').forEach(initProduct);
    document.querySelectorAll('.riq-pdp-buybar-form').forEach(syncQtyButtons);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
