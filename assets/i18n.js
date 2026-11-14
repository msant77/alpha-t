/*
 * Alpha Tester i18n: pt-BR (default), en and es.
 *
 * Every string lives in assets/i18n/<locale>.json (same keys in all three,
 * checked by scripts/i18n-check.mjs). Markup carries keys:
 *   data-i18n="key"            text content
 *   data-i18n-html="key"       trusted markup from our own files (<code>, <em>)
 *   data-i18n-attr="attr:key;attr:key"
 *   data-href="home|como|precos|apps"   internal links that follow the locale
 *   data-lang-btn="pt-BR|en|es"         the header switcher
 *
 * Locale: ?lang= wins, then the page's preset (/en/, /es/ entry pages), then
 * the saved choice (localStorage), then navigator.languages (pt -> pt-BR,
 * es -> es, anything else -> en), then pt-BR. Switching re-renders in place
 * and fires "alphatester:locale" so scenes redraw their text.
 */
(function () {
  'use strict';
  var LOCALES = ['pt-BR', 'en', 'es'];
  var KEY = 'alphatester-lang';
  var html = document.documentElement;
  var base = html.getAttribute('data-i18n-base') || '/assets/i18n/';
  var origin = html.getAttribute('data-site-origin') || '';
  var dicts = {};
  var current = null;

  function norm(x) {
    x = String(x || '').toLowerCase();
    if (x.indexOf('pt') === 0) return 'pt-BR';
    if (x.indexOf('es') === 0) return 'es';
    if (x.indexOf('en') === 0) return 'en';
    return null;
  }
  function saved() { try { return norm(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function resolve() {
    var q = null;
    try { q = norm(new URLSearchParams(location.search).get('lang')); } catch (e) { /* old browser */ }
    if (q) return q;
    var preset = norm(html.getAttribute('data-locale-preset'));
    if (preset) return preset;
    var s = saved();
    if (s) return s;
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    if (langs[0]) return norm(langs[0]) || 'en';
    return 'pt-BR';
  }

  function lookup(dict, key) {
    var v = dict;
    var parts = String(key).split('.');
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  /* t(key, vars): the value for the current locale; strings get {name} filled */
  function t(key, vars) {
    var v = lookup(dicts[current] || {}, key);
    if (v === undefined) v = lookup(dicts['pt-BR'] || {}, key);
    if (v === undefined) return key;
    if (typeof v === 'string' && vars) {
      v = v.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    }
    return v;
  }

  function load(loc) {
    if (dicts[loc]) return Promise.resolve(dicts[loc]);
    return fetch(base + loc + '.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { dicts[loc] = d; return d; });
  }

  function href(name, loc) {
    var pre = loc === 'pt-BR' ? '' : '/' + loc;
    if (name === 'home') return origin + pre + '/';
    if (name === 'como') return origin + pre + '/como-funciona/';
    if (name === 'precos') return origin + pre + '/precos/';
    if (name === 'apps') return 'https://apps.alphatester.app/' + (loc === 'pt-BR' ? '' : '?lang=' + loc);
    return null;
  }

  function apply(root) {
    root = root || document;
    var all = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < all.length; i++) all[i].textContent = t(all[i].getAttribute('data-i18n'));
    all = root.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < all.length; i++) all[i].innerHTML = t(all[i].getAttribute('data-i18n-html'));
    all = root.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < all.length; i++) {
      var pairs = all[i].getAttribute('data-i18n-attr').split(';');
      for (var j = 0; j < pairs.length; j++) {
        var p = pairs[j].split(':');
        if (p.length === 2) all[i].setAttribute(p[0].trim(), t(p[1].trim()));
      }
    }
    all = root.querySelectorAll('[data-href]');
    for (i = 0; i < all.length; i++) {
      var h = href(all[i].getAttribute('data-href'), current);
      if (h) all[i].setAttribute('href', h);
    }
    all = root.querySelectorAll('[data-lang-btn]');
    for (i = 0; i < all.length; i++) {
      all[i].setAttribute('aria-pressed', all[i].getAttribute('data-lang-btn') === current ? 'true' : 'false');
    }
    html.setAttribute('lang', current);
  }

  function set(loc, remember) {
    loc = norm(loc) || 'pt-BR';
    return Promise.all([load(loc), load('pt-BR').catch(function () { return null; })]).then(function () {
      current = loc;
      if (remember) {
        try { localStorage.setItem(KEY, loc); } catch (e) { /* storage off: session only */ }
        try {
          var u = new URL(location.href);
          var preset = norm(html.getAttribute('data-locale-preset')) || 'pt-BR';
          if (loc === preset) u.searchParams.delete('lang'); else u.searchParams.set('lang', loc);
          history.replaceState(null, '', u.pathname + u.search + u.hash);
        } catch (e) { /* no URL API: the saved choice still applies */ }
      }
      apply(document);
      document.dispatchEvent(new CustomEvent('alphatester:locale', { detail: { locale: loc } }));
      return loc;
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lang-btn]') : null;
    if (!b) return;
    e.preventDefault();
    set(b.getAttribute('data-lang-btn'), true);
  });

  var first = resolve();
  current = first;
  var ready = set(first, false).catch(function () {
    // a locale file failed to load: fall back to Portuguese, which the markup already shows
    current = 'pt-BR';
    return load('pt-BR').then(function () { apply(document); return 'pt-BR'; }, function () { return 'pt-BR'; });
  });

  window.AlphaI18n = {
    t: t,
    ready: ready,
    set: set,
    apply: apply,
    locale: function () { return current; },
    locales: LOCALES
  };
})();
