/* Herakles – Darstellung: gezielte Aktualisierung, Bewegung, Navigation. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, $, ui, applyTheme, updateWake } = HK;

  // ================= Render =================
  // Gezielte Aktualisierung: Die neue Ansicht wird mit der bestehenden abgeglichen; nur geänderte Knoten,
  // Attribute und Texte werden angefasst. Fokus, Scrollposition und VoiceOver-Position bleiben erhalten.
  let lastViewKey = '';
  function sameNode(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    return a.nodeName === b.nodeName && (a.nodeName !== 'INPUT' || a.type === b.type);
  }
  function syncAttrs(a, b) {
    for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  }
  function morph(a, b) {
    // Eingabefelder: Ein laufend getippter Wert bleibt stehen, solange sich der gespeicherte Wert nicht ändert.
    // Ändert er sich (z. B. über + / −), wird er übernommen, auch wenn das Feld den Fokus hat.
    const focused = document.activeElement === a;
    const oldVal = a.nodeName === 'TEXTAREA' ? a.defaultValue : a.getAttribute('value');
    syncAttrs(a, b);
    if (a.nodeName === 'INPUT') {
      if (a.type === 'checkbox' || a.type === 'radio') { const c = b.hasAttribute('checked'); if (a.checked !== c) a.checked = c; }
      else if (a.type !== 'file') { const v = b.getAttribute('value') || ''; if (a.value !== v && (!focused || (oldVal || '') !== v)) a.value = v; }
      return;
    }
    if (a.nodeName === 'TEXTAREA') { if (a.defaultValue !== b.value) a.defaultValue = b.value; if (a.value !== b.value && (!focused || oldVal !== b.value)) a.value = b.value; return; }
    morphChildren(a, b);
    if (a.nodeName === 'SELECT') { const o = b.querySelector('option[selected]'); const v = o ? o.value : (a.options[0] ? a.options[0].value : ''); if (a.value !== v) a.value = v; }
  }
  function morphChildren(a, b) {
    const nb = Array.from(b.childNodes);
    nb.forEach((n, i) => {
      const o = a.childNodes[i];
      if (!o) a.appendChild(n);
      else if (!sameNode(o, n)) a.replaceChild(n, o);
      else if (n.nodeType === 1) morph(o, n);
      else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
    });
    while (a.childNodes.length > nb.length) a.removeChild(a.lastChild);
  }
  function patch(root, html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    morphChildren(root, t.content);
  }
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Ruhiger Übergang (150 ms) bei Wechsel von Tab, Reiter oder Übung. Entfällt bei „Bewegung reduzieren“.
  function enter(el, dir) {
    // Tabs und Reiter springen hart um. Nur beim Wechsel der Übung schiebt sich der große Titel von der Seite herein.
    if (!el || !dir || reduceMotion()) return;
    const h = el.querySelector('.exhead h1');
    try { if (h && h.animate) h.animate([{ transform: 'translateX(' + (dir * 100) + '%)' }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }); } catch (e) { /* ohne Bewegung */ }
  }
  // Ziffer klappt um wie auf einer mechanischen Anzeigetafel (dir > 0: Wert steigt)
  function flip(el, dir) {
    if (!el || !el.animate || reduceMotion()) return;
    try { el.animate([{ transform: 'perspective(260px) rotateX(' + (dir >= 0 ? -88 : 88) + 'deg)', opacity: .3 }, { transform: 'perspective(260px) rotateX(0deg)', opacity: 1 }], { duration: 170, easing: 'cubic-bezier(.3,1.25,.5,1)' }); } catch (e) { /* ohne Bewegung */ }
  }
  // Kennzahlen zählen einmal von null hoch (Abschlusskarte)
  function countUp(root) {
    const els = root ? Array.from(root.querySelectorAll('[data-cu]')) : [];
    if (!els.length || reduceMotion() || !window.requestAnimationFrame) return;
    const fmt = { dur: (v) => C.fmtDuration(v), int: (v) => String(Math.round(v)), num: (v) => C.fmtNum(Math.round(v)) };
    const fin = els.map((el) => el.textContent), t0 = performance.now(), D = 700;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      els.forEach((el, i) => { el.textContent = k >= 1 ? fin[i] : fmt[el.dataset.cu](+el.dataset.v * e); });
      if (k < 1 && els[0].isConnected) requestAnimationFrame(step);
    };
    els.forEach((el) => { el.textContent = fmt[el.dataset.cu](0); });
    requestAnimationFrame(step);
  }
  // Die Scheibe des gerade beendeten Trainings dreht sich in der Woche ein
  function spinDisc(id) {
    const d = document.querySelector('.wk[data-sid="' + id + '"] .dot');
    if (!d || !d.animate || reduceMotion()) return;
    try { d.animate([{ transform: 'rotate(-180deg) scale(.5)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); } catch (e) { /* ohne Bewegung */ }
  }
  // Bestätigung beim Abhaken
  function popCheck(i) {
    if (reduceMotion()) return;
    const row = document.querySelector('.set[data-i="' + i + '"]');
    try { if (row && row.classList.contains('done') && row.animate) row.animate([{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); } catch (e) { /* ohne Bewegung */ }
  }
  function render() {
    applyTheme();
    const app = $('#app');
    let html = '';
    if (HK.view === 'gym' && HK.S.active) html = HK.renderGym();
    else { if (HK.view === 'gym') HK.view = 'home'; html = ({ home: HK.renderHome, history: HK.renderHistory, plan: HK.renderPlan, settings: HK.renderSettings })[HK.view]() + renderNav(); }
    const key = HK.view + (HK.view === 'gym' ? '#' + HK.S.active.cur : HK.view === 'history' ? '#' + ui.histTab : '');
    const prevKey = lastViewKey; lastViewKey = key;
    patch(app, html);
    if (prevKey && prevKey !== key) enter(app.firstElementChild, HK.view === 'gym' && prevKey.indexOf('gym#') === 0 ? (HK.S.active.cur > +prevKey.slice(4) ? 1 : -1) : 0);
    if (HK.view === 'gym') { HK.tick(); updateWake(); const ed = $('.editor'), ek = HK.S.active.cur + '#' + HK.selIdx(HK.curEx()), moved = ek !== ui.edKey; ui.edKey = ek; if (ed && ed.scrollIntoView && !ui.noScroll && moved) { const r = ed.getBoundingClientRect(), foot = $('.gymfoot').getBoundingClientRect().top; if (r.bottom > foot - 8 || r.top < 0) window.scrollBy(0, r.bottom > foot - 8 ? r.bottom - foot + 16 : r.top - 70); } }
  }

  function renderNav() {
    const b = (v, l) => '<button data-a="nav" data-v="' + v + '" class="' + (HK.view === v ? 'on' : '') + '"><span>' + l + '</span></button>';
    const at = ['home', 'history', 'plan', 'settings'].indexOf(HK.view);
    return '<nav class="nav"><div class="in"><i class="navblock" aria-hidden="true" style="transform:translateX(' + (Math.max(0, at) * 100) + '%)"></i>' + b('home', 'Heute') + b('history', 'Verlauf') + b('plan', 'Plan') + b('settings', 'Mehr') + '</div></nav>';
  }

  Object.assign(HK, { reduceMotion, flip, countUp, spinDisc, popCheck, render });
})();
