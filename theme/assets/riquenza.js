/*
 * Riquenza storefront core.
 *
 * Markup contract (used by every riq-* section/snippet):
 *
 * Drawers   [data-riq-drawer="cart|search|menu|<name>"]  gets [data-open] while open.
 *           [data-riq-open="<name>"]   opens, [data-riq-toggle="<name>"] toggles,
 *           [data-riq-close] closes the drawer it is inside (or data-riq-close="<name>").
 *           Style open state with Tailwind `data-open:` / `group-data-open:` variants.
 *
 * Cart      form[data-riq-add-to-cart]                 posts its FormData to /cart/add.js
 *           [data-riq-add-variant="<variant id>"]       button, optional data-quantity
 *           [data-riq-line-change] data-line="<1-based>" data-quantity="<new qty>"
 *           [data-riq-cart-count]                       text = number of cart lines; [hidden] when 0
 *           [data-riq-cart-section="<section.id>"]      re-rendered after every cart mutation
 *           Buttons get [data-loading] while a request is in flight.
 *           Event `riq:cart:updated` (detail = cart JSON) fires on document.
 *
 * Scroller  [data-riq-scroller] id="..."              horizontally scrolling track
 *             data-autoplay="4000"                       optional autoplay (wraps to start)
 *           [data-riq-scroll="prev|next"] data-target="<track id>"
 *             data-step="page|item"                      default page (= track width)
 *           [data-riq-dots] data-target="<track id>"   children [data-riq-dot] get [data-active]
 *
 * Accordion [data-riq-accordion-trigger] aria-controls="<panel id>" aria-expanded
 *           panel toggles [hidden]; inside [data-riq-accordion-group="single"] others close.
 *
 * Tabs      [data-riq-tabs] > [data-riq-tab="<key>"] + [data-riq-tab-panel="<key>"]
 *           active tab gets aria-selected="true" + [data-active]; inactive panels [hidden].
 *
 * Rotator   [data-riq-rotator] data-interval="4000"
 *           [data-riq-rotator-item] (one visible, others [hidden]), [data-riq-rotator-dot]
 *
 * Header    [data-riq-header] gets [data-scrolled] once window.scrollY > 10.
 *
 * Search    input[data-riq-predictive-search] data-target="<results container id>"
 *           data-section="<section id rendering predictive_search>"
 */
(function () {
  'use strict';

  const Riq = (window.Riq = window.Riq || {});
  const routes = Riq.routes || {};

  /* ---------- Drawers ---------- */

  const drawer = (name) => document.querySelector(`[data-riq-drawer="${name}"]`);

  const syncScrollLock = () => {
    const anyOpen = document.querySelector('[data-riq-drawer][data-open]:not([data-riq-no-lock])');
    document.documentElement.classList.toggle('overflow-hidden', Boolean(anyOpen));
  };

  Riq.openDrawer = (name) => {
    const el = drawer(name);
    if (!el) return;
    el.setAttribute('data-open', '');
    el.removeAttribute('inert');
    document.querySelectorAll(`[data-riq-open="${name}"],[data-riq-toggle="${name}"]`).forEach((b) =>
      b.setAttribute('aria-expanded', 'true')
    );
    syncScrollLock();
    const focusTarget = el.querySelector('[data-riq-autofocus]');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 50);
    document.dispatchEvent(new CustomEvent('riq:drawer:open', { detail: { name } }));
  };

  Riq.closeDrawer = (name) => {
    const el = drawer(name);
    if (!el) return;
    el.removeAttribute('data-open');
    document.querySelectorAll(`[data-riq-open="${name}"],[data-riq-toggle="${name}"]`).forEach((b) =>
      b.setAttribute('aria-expanded', 'false')
    );
    syncScrollLock();
    document.dispatchEvent(new CustomEvent('riq:drawer:close', { detail: { name } }));
  };

  Riq.toggleDrawer = (name) => {
    const el = drawer(name);
    if (!el) return;
    el.hasAttribute('data-open') ? Riq.closeDrawer(name) : Riq.openDrawer(name);
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-riq-open]');
    if (opener) {
      e.preventDefault();
      Riq.openDrawer(opener.getAttribute('data-riq-open'));
      return;
    }
    const toggler = e.target.closest('[data-riq-toggle]');
    if (toggler) {
      e.preventDefault();
      Riq.toggleDrawer(toggler.getAttribute('data-riq-toggle'));
      return;
    }
    const closer = e.target.closest('[data-riq-close]');
    if (closer) {
      const named = closer.getAttribute('data-riq-close');
      const owner = named ? drawer(named) : closer.closest('[data-riq-drawer]');
      if (owner) {
        if (closer.tagName !== 'A') e.preventDefault();
        Riq.closeDrawer(owner.getAttribute('data-riq-drawer'));
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[data-riq-drawer][data-open]').forEach((el) =>
      Riq.closeDrawer(el.getAttribute('data-riq-drawer'))
    );
  });

  /* ---------- Cart ---------- */

  const sectionIds = () =>
    [...new Set([...document.querySelectorAll('[data-riq-cart-section]')].map((el) => el.getAttribute('data-riq-cart-section')))];

  const renderSections = async () => {
    const ids = sectionIds();
    if (!ids.length) return;
    const url = `${window.location.pathname}?sections=${encodeURIComponent(ids.join(','))}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    ids.forEach((id) => {
      if (!data[id]) return;
      const doc = new DOMParser().parseFromString(data[id], 'text/html');
      const fresh = doc.querySelector(`[data-riq-cart-section="${id}"]`);
      document.querySelectorAll(`[data-riq-cart-section="${id}"]`).forEach((current) => {
        if (fresh) current.replaceWith(fresh.cloneNode(true));
      });
    });
    document.dispatchEvent(new CustomEvent('riq:sections:rendered', { detail: { ids } }));
  };

  const updateCounts = (cart) => {
    document.querySelectorAll('[data-riq-cart-count]').forEach((el) => {
      el.textContent = cart.items.length;
      el.hidden = cart.items.length === 0;
    });
  };

  Riq.cart = {
    async get() {
      const res = await fetch(`${routes.cart || '/cart'}.js`, { headers: { Accept: 'application/json' } });
      return res.json();
    },
    async refresh() {
      const cart = await Riq.cart.get();
      updateCounts(cart);
      await renderSections();
      document.dispatchEvent(new CustomEvent('riq:cart:updated', { detail: cart }));
      return cart;
    },
    async add(items) {
      const res = await fetch(`${routes.cartAdd || '/cart/add'}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.description || json.message || 'Could not add to cart');
      return Riq.cart.refresh();
    },
    async addForm(form) {
      const res = await fetch(`${routes.cartAdd || '/cart/add'}.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.description || json.message || 'Could not add to cart');
      return Riq.cart.refresh();
    },
    async change(line, quantity) {
      const res = await fetch(`${routes.cartChange || '/cart/change'}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line: Number(line), quantity: Number(quantity) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.description || json.message || 'Could not update cart');
      return Riq.cart.refresh();
    },
  };

  Riq.toast = (message) => {
    let host = document.getElementById('riq-toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'riq-toast';
      host.setAttribute('role', 'status');
      host.className =
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-[#4C4339] text-white text-sm font-inter px-4 py-2.5 rounded-lg shadow-lg transition-opacity duration-300 opacity-0 pointer-events-none';
      document.body.appendChild(host);
    }
    host.textContent = message;
    host.classList.remove('opacity-0');
    clearTimeout(host._t);
    host._t = setTimeout(() => host.classList.add('opacity-0'), 2800);
  };

  const withLoading = async (button, fn) => {
    if (button) {
      button.setAttribute('data-loading', '');
      button.disabled = true;
    }
    try {
      await fn();
    } catch (err) {
      Riq.toast(err.message);
    } finally {
      if (button) {
        button.removeAttribute('data-loading');
        button.disabled = false;
      }
    }
  };

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-riq-add-to-cart]');
    if (!form) return;
    e.preventDefault();
    const button = e.submitter || form.querySelector('[type="submit"]');
    const goToCheckout = button && button.hasAttribute('data-riq-buy-now');
    withLoading(button, async () => {
      await Riq.cart.addForm(form);
      if (goToCheckout) {
        window.location.href = '/checkout';
        return;
      }
      if (!form.hasAttribute('data-riq-no-drawer')) Riq.openDrawer('cart');
    });
  });

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-riq-add-variant]');
    if (addBtn) {
      e.preventDefault();
      const id = Number(addBtn.getAttribute('data-riq-add-variant'));
      const quantity = Number(addBtn.getAttribute('data-quantity') || 1);
      withLoading(addBtn, async () => {
        await Riq.cart.add([{ id, quantity }]);
        if (addBtn.hasAttribute('data-riq-buy-now')) {
          window.location.href = '/checkout';
          return;
        }
        if (!addBtn.hasAttribute('data-riq-no-drawer')) Riq.openDrawer('cart');
      });
      return;
    }
    const changeBtn = e.target.closest('[data-riq-line-change]');
    if (changeBtn) {
      e.preventDefault();
      withLoading(changeBtn, () =>
        Riq.cart.change(changeBtn.getAttribute('data-line'), changeBtn.getAttribute('data-quantity'))
      );
    }
  });

  /* ---------- Scroller / slider ---------- */

  const stepFor = (track, mode) => {
    if (mode === 'item') {
      const first = track.firstElementChild;
      if (!first) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    return track.clientWidth;
  };

  Riq.scroll = (track, dir, mode) => {
    const max = track.scrollWidth - track.clientWidth;
    const step = stepFor(track, mode);
    let left = track.scrollLeft + (dir === 'next' ? step : -step);
    if (track.hasAttribute('data-loop')) {
      if (dir === 'next' && track.scrollLeft >= max - 2) left = 0;
      if (dir === 'prev' && track.scrollLeft <= 2) left = max;
    }
    track.scrollTo({ left, behavior: 'smooth' });
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-riq-scroll]');
    if (!btn) return;
    const track = document.getElementById(btn.getAttribute('data-target'));
    if (!track) return;
    e.preventDefault();
    Riq.scroll(track, btn.getAttribute('data-riq-scroll'), btn.getAttribute('data-step') || 'page');
  });

  const syncDots = (track) => {
    document.querySelectorAll(`[data-riq-dots][data-target="${track.id}"]`).forEach((wrap) => {
      const dots = wrap.querySelectorAll('[data-riq-dot]');
      if (!dots.length) return;
      const max = track.scrollWidth - track.clientWidth;
      let index = 0;
      if (max > 0) {
        index = track.scrollLeft >= max - 2 ? dots.length - 1 : Math.round((track.scrollLeft / max) * (dots.length - 1));
      }
      dots.forEach((d, i) => d.toggleAttribute('data-active', i === index));
    });
  };

  document.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-riq-dot]');
    if (!dot) return;
    const wrap = dot.closest('[data-riq-dots]');
    const track = wrap && document.getElementById(wrap.getAttribute('data-target'));
    if (!track) return;
    const dots = [...wrap.querySelectorAll('[data-riq-dot]')];
    const max = track.scrollWidth - track.clientWidth;
    const i = dots.indexOf(dot);
    track.scrollTo({ left: dots.length > 1 ? (max * i) / (dots.length - 1) : 0, behavior: 'smooth' });
  });

  const initScroller = (track) => {
    if (track._riq) return;
    track._riq = true;
    let raf;
    track.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => syncDots(track));
      },
      { passive: true }
    );
    syncDots(track);

    const delay = Number(track.getAttribute('data-autoplay'));
    if (delay > 0) {
      let paused = false;
      const host = track.closest('[data-riq-slider]') || track;
      host.addEventListener('mouseenter', () => (paused = true));
      host.addEventListener('mouseleave', () => (paused = false));
      host.addEventListener('touchstart', () => (paused = true), { passive: true });
      host.addEventListener('touchend', () => setTimeout(() => (paused = false), delay));
      setInterval(() => {
        if (paused || document.hidden) return;
        const max = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= max - 2) track.scrollTo({ left: 0, behavior: 'smooth' });
        else Riq.scroll(track, 'next', 'page');
      }, delay);
    }
  };

  /* ---------- Accordion ---------- */

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-riq-accordion-trigger]');
    if (!trigger) return;
    e.preventDefault();
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
    const group = trigger.closest('[data-riq-accordion-group="single"]');
    if (group && willOpen) {
      group.querySelectorAll('[data-riq-accordion-trigger][aria-expanded="true"]').forEach((other) => {
        if (other === trigger) return;
        other.setAttribute('aria-expanded', 'false');
        const p = document.getElementById(other.getAttribute('aria-controls'));
        if (p) p.hidden = true;
      });
    }
    trigger.setAttribute('aria-expanded', String(willOpen));
    if (panel) panel.hidden = !willOpen;
  });

  /* ---------- Tabs ---------- */

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-riq-tab]');
    if (!tab) return;
    const root = tab.closest('[data-riq-tabs]');
    if (!root) return;
    e.preventDefault();
    const key = tab.getAttribute('data-riq-tab');
    root.querySelectorAll('[data-riq-tab]').forEach((t) => {
      const active = t.getAttribute('data-riq-tab') === key;
      t.setAttribute('aria-selected', String(active));
      t.toggleAttribute('data-active', active);
    });
    root.querySelectorAll('[data-riq-tab-panel]').forEach((p) => {
      p.hidden = p.getAttribute('data-riq-tab-panel') !== key;
    });
  });

  /* ---------- Rotator ---------- */

  const initRotator = (root) => {
    if (root._riq) return;
    root._riq = true;
    const items = [...root.querySelectorAll('[data-riq-rotator-item]')];
    const dots = [...root.querySelectorAll('[data-riq-rotator-dot]')];
    if (items.length < 2) return;
    let index = Math.max(0, items.findIndex((i) => !i.hidden));
    const show = (i) => {
      index = (i + items.length) % items.length;
      items.forEach((item, n) => {
        item.hidden = n !== index;
        if (n === index) {
          item.style.animation = 'none';
          void item.offsetHeight;
          item.style.animation = '';
        }
      });
      dots.forEach((d, n) => d.toggleAttribute('data-active', n === index));
    };
    dots.forEach((d, n) => d.addEventListener('click', () => show(n)));
    setInterval(() => show(index + 1), Number(root.getAttribute('data-interval')) || 4000);
  };

  /* ---------- Header scroll state ---------- */

  const syncHeader = () => {
    const scrolled = window.scrollY > 10;
    document.querySelectorAll('[data-riq-header]').forEach((h) => h.toggleAttribute('data-scrolled', scrolled));
  };
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ---------- Predictive search ---------- */

  const initSearch = (input) => {
    if (input._riq) return;
    input._riq = true;
    let timer;
    let controller;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const target = document.getElementById(input.getAttribute('data-target'));
        if (!target) return;
        const q = input.value.trim();
        if (!q) {
          target.innerHTML = '';
          target.hidden = true;
          document.dispatchEvent(new CustomEvent('riq:search:cleared', { detail: { input } }));
          return;
        }
        if (controller) controller.abort();
        controller = new AbortController();
        const section = input.getAttribute('data-section') || 'riq-predictive-search';
        const url = `${routes.predictiveSearch || '/search/suggest'}?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=8&section_id=${section}`;
        try {
          const res = await fetch(url, { signal: controller.signal });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const content = doc.querySelector('[data-riq-predictive-results]');
          target.innerHTML = content ? content.outerHTML : '';
          target.hidden = false;
          document.dispatchEvent(new CustomEvent('riq:search:results', { detail: { input, query: q } }));
        } catch (err) {
          if (err.name !== 'AbortError') console.error(err);
        }
      }, 250);
    });
  };

  /* ---------- Init ---------- */

  const init = (root = document) => {
    root.querySelectorAll('[data-riq-scroller]').forEach(initScroller);
    root.querySelectorAll('[data-riq-rotator]').forEach(initRotator);
    root.querySelectorAll('[data-riq-predictive-search]').forEach(initSearch);
    syncHeader();
  };
  Riq.init = init;

  document.addEventListener('riq:sections:rendered', () => init());
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
