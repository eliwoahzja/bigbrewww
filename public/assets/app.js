'use strict';

(() => {
  const pages = new Map([
    ['dashboard.php', 'Dashboard'],
    ['inventory.php', 'Inventory'],
    ['shiftlog.php', 'Shift log'],
    ['sales.php', 'Sales'],
    ['users.php', 'Users'],
  ]);
  let pending = null;
  const minimumSkeletonMs = 1500;

  function waitForSkeleton(startedAt, signal) {
    const remaining = minimumSkeletonMs - (performance.now() - startedAt);
    if (remaining <= 0 || signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = window.setTimeout(finish, remaining);
      signal.addEventListener('abort', finish, {once: true});
    });
  }

  const filename = (url) => new URL(url, window.location.href).pathname.split('/').pop();
  const pageName = (url) => pages.get(filename(url));
  const isAllowed = (url) => {
    const next = new URL(url, window.location.href);
    const here = new URL(window.location.href);
    return next.origin === here.origin &&
      next.pathname.slice(0, next.pathname.lastIndexOf('/') + 1) ===
        here.pathname.slice(0, here.pathname.lastIndexOf('/') + 1) &&
      pages.has(filename(next.href));
  };

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('form[data-confirm]')) return;
    if (!window.confirm(form.dataset.confirm || 'Are you sure?')) event.preventDefault();
  });
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-show-password]') : null;
    if (!(trigger instanceof HTMLElement)) return;
    const field = document.getElementById('login-password');
    if (!(field instanceof HTMLInputElement)) return;
    const visible = field.type === 'password';
    field.type = visible ? 'text' : 'password';
    trigger.textContent = visible ? 'Hide' : 'Show';
    trigger.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  });

  function skeletonMarkup(name) {
    const formPage = ['Inventory', 'Shift log', 'Sales', 'Users'].includes(name);
    const rows = Array.from({length: formPage ? 4 : 3}, (_, index) => `
      <div class="sk-row" aria-hidden="true">
        <span class="sk-bar sk-row-icon"></span>
        <span class="sk-row-copy"><span class="sk-bar sk-row-main"></span>
          <span class="sk-bar sk-row-sub"></span></span>
        <span class="sk-bar sk-row-tail"></span>
      </div>`).join('');
    return `<section class="navigation-skeleton" role="status" aria-live="polite" aria-label="Loading ${name}">
      <div class="skeleton-header">
        <p class="loading-title">Loading ${name}…</p>
        <div class="sk-bar sk-head-title" aria-hidden="true"></div>
        <div class="sk-bar sk-head-description" aria-hidden="true"></div>
      </div>
      <div class="sk-columns" aria-hidden="true">
        <div class="sk-panel">
          <div class="sk-bar sk-panel-title"></div>
          <div class="sk-bar sk-panel-value"></div>
          <div class="sk-bar sk-panel-caption"></div>
        </div>
        <div class="sk-panel">
          <div class="sk-bar sk-panel-title"></div>
          <div class="sk-bar sk-panel-value sk-panel-value-short"></div>
          <div class="sk-bar sk-panel-caption"></div>
        </div>
      </div>
      <div class="sk-panel sk-list-panel" aria-hidden="true">
        <div class="sk-bar sk-panel-title"></div>${rows}
      </div>
    </section>`;
  }

  async function loadPage(url, fromHistory = false) {
    if (pending) pending.abort();
    const controller = new AbortController();
    pending = controller;
    const current = document.querySelector('main#content');
    if (!current) { window.location.assign(url); return; }
    const savedMarkup = current.innerHTML;
    const label = pageName(url) || 'page';
    current.setAttribute('aria-busy', 'true');
    current.innerHTML = skeletonMarkup(label);
    const skeletonStartedAt = performance.now();
    try {
      const response = await fetch(url, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Accept': 'text/html' }, signal: controller.signal,
      });
      const finalUrl = new URL(response.url, window.location.href);
      if (!response.ok || !isAllowed(finalUrl.href)) {
        window.location.assign(finalUrl.href);
        return;
      }
      const html = await response.text();
      if (controller.signal.aborted) return;
      const nextDocument = new DOMParser().parseFromString(html, 'text/html');
      const nextMain = nextDocument.querySelector('main#content');
      const nextNav = nextDocument.querySelector('.site-nav');
      if (!nextMain || !nextNav || !nextDocument.querySelector('.account')) {
        window.location.assign(finalUrl.href);
        return;
      }
      await waitForSkeleton(skeletonStartedAt, controller.signal);
      if (controller.signal.aborted) return;
      if (!fromHistory) {
        history.replaceState({bbomsNavigation: true, scrollY: window.scrollY}, '', window.location.href);
        history.pushState({bbomsNavigation: true, scrollY: 0}, '', finalUrl.href);
      }
      document.title = nextDocument.title;
      document.querySelector('.site-nav')?.replaceWith(document.importNode(nextNav, true));
      const newMain = document.importNode(nextMain, true);
      newMain.tabIndex = -1;
      newMain.classList.add('page-enter');
      current.replaceWith(newMain);
      window.scrollTo({top: fromHistory ? (history.state?.scrollY || 0) : 0, behavior: 'instant'});
      if (!fromHistory) newMain.focus({preventScroll: true});
    } catch (error) {
      if (controller.signal.aborted) return;
      current.innerHTML = savedMarkup;
      current.removeAttribute('aria-busy');
      window.location.assign(url);
    } finally {
      if (pending === controller) pending = null;
    }
  }

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey || !document.querySelector('.site-nav')) return;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self')) return;
    if (!anchor.closest('.site-nav, .brand, main#content')) return;
    if (!isAllowed(anchor.href) || new URL(anchor.href).href === window.location.href) return;
    event.preventDefault();
    loadPage(anchor.href);
  });
  window.addEventListener('popstate', () => {
    if (!isAllowed(window.location.href) || !document.querySelector('.site-nav')) {
      window.location.reload();
      return;
    }
    loadPage(window.location.href, true);
  });
})();
