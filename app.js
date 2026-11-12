/* Herakles – Oberfläche. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const C = window.Core, LIB = window.Library, AN = window.Anim;
  const VERSION = '2.5.0';
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => Date.now();

  let S = null;            // App-Zustand
  let view = 'home';
  let ui = { histTab: 'sessions', histEx: null, histMetric: 'weight', cardioType: null, sel: {}, planOpen: {}, showNote: {} };
  let updateReady = null;

  // ================= Speicher (IndexedDB + Sicherheitskopie der laufenden Einheit) =================
  const DB_NAME = 'herakles', STORE = 'kv', LS_STATE = 'herakles-state', LS_ACTIVE = 'herakles-active';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function idbGet(key) {
    const d = await db();
    return new Promise((res, rej) => { const t = d.transaction(STORE).objectStore(STORE).get(key); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); });
  }
  async function idbPut(key, val) {
    const d = await db();
    return new Promise((res, rej) => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }
  let idbOk = true;
  function save() {
    S.meta.updatedAt = now();
    try {
      if (S.active) { S.active.updatedAt = now(); localStorage.setItem(LS_ACTIVE, JSON.stringify(S.active)); }
      else localStorage.removeItem(LS_ACTIVE);
    } catch (e) { /* Speicher voll – IDB bleibt Hauptspeicher */ }
    if (idbOk) {
      idbPut('state', JSON.parse(JSON.stringify(S))).catch(() => { idbOk = false; saveLS(); });
    } else saveLS();
  }
  function saveLS() { try { localStorage.setItem(LS_STATE, JSON.stringify(S)); } catch (e) { toast('Speichern fehlgeschlagen – bitte Daten exportieren.'); } }
  async function load() {
    let st = null;
    try { st = await idbGet('state'); } catch (e) { idbOk = false; }
    if (!st) { try { st = JSON.parse(localStorage.getItem(LS_STATE) || 'null'); } catch (e) { st = null; } }
    st = st ? C.migrate(st) : C.defaultState(now());
    // laufende Einheit: neuere Sicherheitskopie gewinnt
    try {
      const a = JSON.parse(localStorage.getItem(LS_ACTIVE) || 'null');
      if (a && a.id && (!st.active || (a.updatedAt || 0) > (st.active.updatedAt || 0)) && !st.sessions.some((s) => s.id === a.id)) st.active = a;
    } catch (e) { /* ignorieren */ }
    return st;
  }

  // ================= Kleine UI-Helfer =================
  let toastT = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  let stopAnim = null, lastCheck = 0, lastCheckKey = '';
  function sheet(html, opts) {
    if (stopAnim) { stopAnim(); stopAnim = null; }
    const root = $('#sheet-root'); sheetGen++;
    root.innerHTML = '<div class="sheet-bg" data-a="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>';
    if (opts && opts.onOpen) opts.onOpen(root);
  }
  let sheetGen = 0;
  function closeSheet() {
    if (stopAnim) { stopAnim(); stopAnim = null; }
    const root = $('#sheet-root'), bg = root.firstElementChild;
    if (!bg || reduceMotion() || !bg.animate) { root.innerHTML = ''; return; }
    const g = ++sheetGen;
    bg.style.pointerEvents = 'none'; bg.removeAttribute('data-a');
    const sh = bg.querySelector('.sheet'); if (sh) sh.removeAttribute('role');
    try { bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-in', fill: 'forwards' }); if (sh) sh.animate([{ transform: 'none' }, { transform: 'translateY(24px)' }], { duration: 140, easing: 'ease-in', fill: 'forwards' }); } catch (e) { /* egal */ }
    setTimeout(() => { if (g === sheetGen && root.firstElementChild === bg) root.innerHTML = ''; }, 150);
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise((res) => {
      sheet('<h3>' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p><div class="actions"><button class="btn ghost" data-a="cf-no">Abbrechen</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-a="cf-yes">' + esc(okLabel || 'OK') + '</button></div>');
      pendingConfirm = res;
    });
  }
  let pendingConfirm = null;
  function haptic() { try { $('#haptic').click(); } catch (e) { /* nicht verfügbar */ } }
  const wDisp = (w) => (w === null || w === undefined ? '' : C.fmtNum(w));
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  // ================= Theme, Ton, Wachhalten =================
  function applyTheme() {
    const t = S.settings.theme;
    const dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#111512' : '#f2ede2';
  }
  let actx = null, fallbackUrl = null;
  function setAudioSession() {
    try { if (navigator.audioSession) navigator.audioSession.type = S.settings.soundInSilentMode ? 'playback' : 'ambient'; } catch (e) { /* nicht unterstützt */ }
  }
  function audioUnlock() {
    if (!S.settings.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (actx && actx.state !== 'running') { try { actx.close(); } catch (e) { /* egal */ } actx = null; }
      if (!actx) { setAudioSession(); actx = new AC(); }
      if (actx.state !== 'running') actx.resume().catch(() => {});
      // stiller Puls, damit iOS den Kontext freigibt
      const o = actx.createOscillator(), g = actx.createGain(); g.gain.value = 0.0001; o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.02);
    } catch (e) { actx = null; }
  }
  function makeWav() {
    const sr = 22050, beeps = [[0, 0.16], [0.24, 0.16], [0.48, 0.32]], len = Math.floor(sr * 0.85);
    const buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const t = i / sr; let a = 0;
      for (const [s, d] of beeps) if (t >= s && t < s + d) { const env = Math.min(1, (t - s) * 60, (s + d - t) * 60); a = Math.sin(2 * Math.PI * (s > 0.4 ? 1320 : 880) * t) * 0.6 * env; }
      v.setInt16(44 + i * 2, a * 32767, true);
    }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function beep() {
    if (!S.settings.sound) return;
    setAudioSession();
    try {
      if (actx && actx.state === 'running') {
        const t0 = actx.currentTime + 0.02;
        [[0, 880, 0.16], [0.24, 880, 0.16], [0.48, 1320, 0.32]].forEach(([d, f, len]) => {
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.6, t0 + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len);
          o.connect(g).connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + len + 0.02);
        });
        return;
      }
    } catch (e) { /* weiter mit Fallback */ }
    try { if (!fallbackUrl) fallbackUrl = makeWav(); const a = new Audio(fallbackUrl); a.play().catch(() => {}); } catch (e) { /* kein Ton möglich */ }
  }
  function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

  let wakeLock = null, wakeState = 'off';
  async function wakeOn() {
    if (!S.settings.keepAwake || !S.active) return;
    if (!('wakeLock' in navigator)) { wakeState = 'unsupported'; updateWake(); return; }
    if (wakeLock && !wakeLock.released) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeState = 'on';
      wakeLock.addEventListener('release', () => { wakeState = 'off'; updateWake(); });
    } catch (e) { wakeState = 'denied'; }
    updateWake();
  }
  function wakeOff() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* egal */ } wakeLock = null; wakeState = 'off'; }
  function updateWake() {
    const el = $('#wake'); if (!el) return;
    el.textContent = !S.settings.keepAwake ? 'Bildschirm-wach ist aus (Einstellungen)'
      : wakeState === 'on' ? 'Bildschirm bleibt an'
      : wakeState === 'unsupported' ? 'Bildschirm wach halten: auf diesem Gerät nicht verfügbar'
      : 'Bildschirm wach halten: nächster Tipp aktiviert es';
  }

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
    if (!el || !el.animate || reduceMotion()) return;
    // Feste oder klebende Leisten (Fußleiste, Kopfzeile) bleiben stehen; nur der Inhalt blendet ein.
    const kf = [{ opacity: 0, transform: dir ? 'translateX(' + (dir * 10) + 'px)' : 'translateY(4px)' }, { opacity: 1, transform: 'none' }];
    Array.from(el.children).forEach((c) => {
      const pos = getComputedStyle(c).position;
      if (pos === 'fixed' || pos === 'sticky' || c.classList.contains('gymbar') || c.classList.contains('prog') || c.classList.contains('seg') || c.classList.contains('topbar')) return;
      try { c.animate(kf, { duration: 150, easing: 'cubic-bezier(.2,.6,.2,1)' }); } catch (e) { /* ohne Übergang */ }
    });
  }
  function render() {
    applyTheme();
    const app = $('#app');
    let html = '';
    if (view === 'gym' && S.active) html = renderGym();
    else { if (view === 'gym') view = 'home'; html = ({ home: renderHome, history: renderHistory, plan: renderPlan, settings: renderSettings })[view]() + renderNav(); }
    const key = view + (view === 'gym' ? '#' + S.active.cur : view === 'history' ? '#' + ui.histTab : '');
    const prevKey = lastViewKey; lastViewKey = key;
    patch(app, html);
    if (prevKey && prevKey !== key) enter(app.firstElementChild, view === 'gym' && prevKey.indexOf('gym#') === 0 ? (S.active.cur > +prevKey.slice(4) ? 1 : -1) : 0);
    if (view === 'gym') { tick(); updateWake(); const ed = $('.editor'), ek = S.active.cur + '#' + selIdx(curEx()), moved = ek !== ui.edKey; ui.edKey = ek; if (ed && ed.scrollIntoView && !ui.noScroll && moved) { const r = ed.getBoundingClientRect(), foot = $('.gymfoot').getBoundingClientRect().top; if (r.bottom > foot - 8 || r.top < 0) window.scrollBy(0, r.bottom > foot - 8 ? r.bottom - foot + 16 : r.top - 70); } }
  }

  function renderNav() {
    const b = (v, l) => '<button data-a="nav" data-v="' + v + '" class="' + (view === v ? 'on' : '') + '">' + l + '</button>';
    return '<nav class="nav"><div class="in">' + b('home', 'Heute') + b('history', 'Verlauf') + b('plan', 'Plan') + b('settings', 'Mehr') + '</div></nav>';
  }

  // ---------- Heute ----------
  function renderHome() {
    const t = now(), d = new Date(t);
    let h = '<div class="view"><header class="mast"><div class="wordmark">HERAKLES</div><div class="sub">' + WDL[d.getDay()] + ' · ' + C.fmtDateLong(t) + '</div></header>';
    if (updateReady) h += '<div class="banner info"><b>Update verfügbar</b>Eine neue Version ist geladen.<div class="row"><button class="btn sm primary" data-a="apply-update">Jetzt neu laden</button></div></div>';
    const bw = C.backupWarning(S, t);
    if (bw) h += '<div class="banner" data-testid="backup-warning"><b>Datensicherung</b>' + esc(bw) + '<div class="row"><button class="btn sm primary" data-a="export">Jetzt exportieren</button></div></div>';
    if (S.deload.active) h += '<div class="banner info"><b>Deload-Woche läuft</b>Noch ' + S.deload.sessionsLeft + ' leichtere Einheit(en): weniger Sätze, ~' + Math.round(S.settings.deload.weightFactor * 100) + ' % Gewicht.<div class="row"><button class="btn sm ghost" data-a="deload-end">Deload beenden</button></div></div>';
    else {
      const dc = C.deloadCheck(S, t);
      if (dc.suggest && !S.active) h += '<div class="banner" data-testid="deload-suggest"><b>Vorschlag: leichtere Woche (Deload)</b>' + esc(dc.reason) + ' Die nächsten ' + S.days.length + ' Einheiten mit weniger Sätzen und ~' + Math.round(S.settings.deload.weightFactor * 100) + ' % Gewicht.<div class="row"><button class="btn sm primary" data-a="deload-yes">Annehmen</button><button class="btn sm ghost" data-a="deload-no">Diesmal nicht</button></div></div>';
    }
    if (S.active) {
      const a = S.active, done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
      h += '<div class="card hero"><div class="eyebrow">Einheit läuft seit ' + C.fmtTime(a.start) + '</div><div class="big">' + esc(a.dayName) + '</div><div class="muted small">' + done + ' Sätze erledigt</div><div style="margin-top:12px"><button class="btn primary block xl" data-a="go-gym">Weiter trainieren</button></div></div>';
    } else {
      const nd = C.nextDay(S);
      if (nd) {
        const exs = nd.exerciseIds.map((id) => S.exercises[id]).filter((e) => e && !e.archived);
        h += '<div class="card hero"><div class="row between"><div class="eyebrow">Nächstes Training · Tag ' + (S.days.indexOf(nd) + 1) + ' von ' + S.days.length + '</div>' + (S.deload.active ? '<span class="badge warn">Deload</span>' : '') + '</div><div class="big" data-testid="next-day">' + esc(nd.name) + '</div><div class="muted small">' + exs.length + ' Übungen · ca. ' + Math.round(exs.reduce((m, e) => m + e.sets * (e.rest / 60 + 0.9), 0)) + ' min</div>';
        h += '<div class="chips">' + exs.map((e) => '<span class="chip' + (e.suggested ? ' sug' : '') + '">' + esc(e.name) + '</span>').join('') + '</div>';
        h += '<div style="margin-top:14px"><button class="btn primary block xl" data-a="start" data-day="' + nd.id + '">Training starten</button></div><div style="text-align:center;margin-top:6px"><button class="link" data-a="pick-day">Anderen Tag wählen</button></div></div>';
      } else h += '<div class="card"><div class="empty">Noch kein Trainingstag angelegt. Unter „Plan“ hinzufügen.</div></div>';
    }
    // Woche
    const wk = C.weekOverview(S, t);
    h += '<h2>Woche ' + wk.week + '</h2><div class="card"><div class="stat"><div><b>' + wk.gym.length + '/4</b><span>Gym</span></div><div><b>' + wk.cardio.length + '/1</b><span>Cardio</span></div><div><b class="num">' + C.fmtNum(Math.round(wk.volume)) + '</b><span>kg Volumen</span></div></div><div class="week">';
    for (let i = 0; i < 4; i++) { const s = wk.gym[i]; h += '<div class="wk' + (s ? ' done' : '') + '"><div class="dot">' + (s ? '✓' : i + 1) + '</div><div class="lbl">' + (s ? esc(WD[new Date(s.start).getDay()] + ' ' + s.dayName.split(' ')[0]) : 'offen') + '</div></div>'; }
    const c = wk.cardio[0];
    h += '<div class="wk cardio' + (c ? ' done' : '') + '"><div class="dot">' + (c ? '✓' : '–') + '</div><div class="lbl">' + (c ? esc(C.CARDIO[c.type].label) : 'Cardio') + '</div></div></div></div>';
    // Cardio
    const ct = S.settings.cardioType, cs = C.cardioSuggest(S, ct, t);
    h += '<h2>Cardio · ' + esc(C.CARDIO[ct].label) + '</h2><div class="card">';
    if (cs.target !== null) h += '<div class="row between"><div class="eyebrow">Nächstes Ziel</div>' + (cs.deload ? '<span class="badge warn">leichter</span>' : '') + '</div><div class="big n" data-testid="cardio-target">' + C.fmtMetric(cs.target, ct) + '</div>';
    h += '<div class="why">' + esc(cs.reason) + '</div><button class="btn block" data-a="cardio-log">Cardio eintragen</button></div>';
    h += '</div>';
    return h;
  }

  // ---------- Gym-Modus ----------
  function curEx() { const a = S.active; a.cur = Math.max(0, Math.min(a.cur || 0, a.exercises.length - 1)); return a.exercises[a.cur]; }
  function selIdx(e) {
    const k = e.exId + '#' + S.active.cur;
    if (ui.sel[k] !== undefined && ui.sel[k] < e.sets.length) return ui.sel[k];
    const i = e.sets.findIndex((s) => !s.done);
    return i < 0 ? -1 : i;
  }
  function renderGym() {
    const a = S.active, e = curEx(), ex = S.exercises[e.exId] || { name: e.name, equip: 'machine', sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '' };
    const wt = C.usesWeight(ex), sel = selIdx(e);
    const elapsed = C.fmtDuration((now() - a.start) / 1000);
    let h = '<div class="view gym"><div class="gymbar"><button class="btn sm ghost" data-a="ex-list" aria-label="Übungsliste">Übungen</button><div class="title"><b>' + esc(a.dayName) + (a.deload ? ' · Deload' : '') + '</b><span class="num" id="elapsed">' + elapsed + '</span></div><button class="btn sm ghost" data-a="finish">Beenden</button></div>';
    h += '<div class="prog">' + a.exercises.map((x, i) => '<i class="' + (x.sets.length && x.sets.every((s) => s.done) ? 'done' : i === a.cur ? 'cur' : '') + '"></i>').join('') + '</div>';
    const libE = C.libOf(ex);
    h += '<div class="exhead"><div class="eyebrow">Übung ' + (a.cur + 1) + ' von ' + a.exercises.length + (ex.suggested ? ' · Vorschlag' : '') + (e.swappedFrom ? ' · statt ' + esc(e.swappedFrom) : '') + '</div><h1><span data-testid="ex-name">' + esc(e.name) + '</span>' + '<button class="info-dot" data-a="info" data-ctx="gym" data-id="' + e.exId + '" aria-label="Ausführung und Alternativen" data-testid="info-gym">i</button></h1><div class="exmeta">' + esc(C.EQUIP[ex.equip] || '') + ' · ' + ex.sets + ' × ' + ex.repMin + '–' + ex.repMax + ' · Pause ' + C.fmtDuration(ex.rest) + '</div>' + (ex.note ? '<div class="exmeta small" style="margin-top:4px">Notiz: ' + esc(ex.note) + '</div>' : '') + '</div>';
    const L = e.sugg.last, unit = ex.equip === 'bwplus' ? ' +' : '';
    const lastTxt = L ? C.repsLabel(L.reps) + (wt ? ' · ' + unit + C.fmtKg(L.W) : '') : '–';
    const tgt = e.sugg.reps || [];
    const nowTxt = (wt ? (e.sugg.weight === null ? 'Gewicht?' : unit + C.fmtKg(e.sugg.weight)) + ' · ' : '') + C.repsLabel(tgt);
    h += '<div class="sugg"><div class="box"><div class="k">Letztes Mal' + (L ? ' · ' + C.fmtDate(L.date) : '') + '</div><div class="v num" data-testid="last">' + esc(lastTxt) + '</div></div><div class="box now"><div class="k">Heute</div><div class="v num" data-testid="sugg">' + esc(nowTxt) + '</div></div></div>';
    h += '<div class="why ' + esc(e.sugg.kind) + '" data-testid="why">' + esc(e.sugg.reason) + '</div>';
    if (e.sugg.kind === 'reduce' && libE) h += '<button class="btn sm ghost" style="margin:-4px 0 14px" data-a="info" data-ctx="gym" data-id="' + e.exId + '" data-focus="alts" data-testid="alts-btn">Alternativen ansehen</button>';
    h += '<div class="sets">';
    e.sets.forEach((s, i) => {
      const label = s.warmup ? 'W' : (e.sets.slice(0, i + 1).filter((x) => !x.warmup).length);
      if (i === sel) { h += renderEditor(e, ex, s, i, label); return; }
      const val = (wt ? (s.w === null || s.w === undefined ? '? kg' : unit + C.fmtKg(s.w)) + ' × ' : '') + (s.r || 0) + ' Wdh.' + (s.rir !== null && s.rir !== undefined ? '  · R' + (s.rir >= 4 ? '4+' : s.rir) : '');
      h += '<button class="set' + (s.done ? ' done' : '') + (s.warmup ? ' warm' : '') + '" data-a="sel-set" data-i="' + i + '"><span class="n">' + label + '</span><span class="val num">' + esc(val) + '</span><span class="ck">' + (s.done ? '✓' : '') + '</span></button>';
    });
    h += '</div>';
    h += '<div class="subtools"><button class="btn sm ghost" data-a="add-set">+ Satz</button><button class="btn sm ghost" data-a="add-warm">+ Aufwärmsatz</button><button class="btn sm ghost" data-a="toggle-note">' + (e.note ? 'Notiz ·' : 'Notiz') + '</button>' + (sel >= 0 && e.sets.length > 1 && !e.sets[sel].done ? '<button class="btn sm ghost" data-a="del-set">Satz entfernen</button>' : '') + '</div>';
    if (ui.showNote[e.exId] || e.note) h += '<div style="margin-top:10px"><textarea class="note" data-c="ex-note" placeholder="Notiz zur Übung (z. B. Sitzposition, Griff)">' + esc(e.note) + '</textarea></div>';
    h += '<div class="wake" id="wake"></div></div>';
    // Fußleiste: Timer + Haupttaste in Daumenreichweite
    const last = a.cur >= a.exercises.length - 1;
    let main;
    if (sel >= 0) {
      const ss = e.sets[sel], lb = ss.warmup ? 'Aufwärmsatz' : 'Satz ' + e.sets.slice(0, sel + 1).filter((x) => !x.warmup).length;
      main = ss.done ? '<button class="btn ghost xl" data-a="check" data-testid="check">' + lb + ' rückgängig</button>' : '<button class="btn primary xl" data-a="check" data-testid="check">' + lb + ' abhaken</button>';
    } else main = last ? '<button class="btn primary xl" data-a="finish" data-testid="finish-main">Training beenden</button>' : '<button class="btn primary xl" data-a="ex-next" data-testid="next-main">Nächste Übung ›</button>';
    h += '<div class="gymfoot"><div class="in"><div id="timer-slot"></div><div class="navrow"><button class="btn xl" data-a="ex-prev" aria-label="Vorherige Übung" ' + (a.cur === 0 ? 'disabled' : '') + '>‹</button>' + main + '<button class="btn xl" data-a="ex-next" data-testid="next-ex" aria-label="Nächste Übung" ' + (last ? 'disabled' : '') + '>›</button></div></div></div>';
    return h;
  }
  function renderEditor(e, ex, s, i, label) {
    const wt = C.usesWeight(ex);
    const tgt = e.sugg.reps[i] !== undefined ? e.sugg.reps[i] : null;
    let h = '<div class="editor" data-testid="editor"><div class="lbl"><span>' + (s.warmup ? 'Aufwärmsatz' : 'Satz ' + label) + (s.done ? ' · erledigt' : '') + '</span><span>' + (!s.warmup && tgt !== null ? 'Ziel ' + tgt + ' Wdh.' : '') + '</span></div>';
    if (wt) h += '<div class="slbl">' + (ex.equip === 'bwplus' ? 'Zusatzgewicht kg' : 'Gewicht kg') + ' <span>± ' + C.fmtNum(ex.step) + '</span></div><div class="stepper"><button data-a="w-" aria-label="Gewicht minus">−</button><input class="num" inputmode="decimal" data-c="w" data-testid="w-input" value="' + wDisp(s.w) + '" placeholder="eintragen"><button data-a="w+" aria-label="Gewicht plus">+</button></div>';
    if (ex.equip === 'barbell' && s.w !== null && s.w !== undefined) {
      const pl = C.plateLoad(s.w, S.settings.plates.bar, S.settings.plates.list);
      if (pl) h += '<div class="plates' + (pl.ok ? '' : ' warn') + '" data-testid="plates">Scheiben: ' + esc(pl.text) + ' · Stange ' + C.fmtKg(S.settings.plates.bar) + '</div>';
    }
    h += '<div class="slbl">Wiederholungen</div><div class="stepper"><button data-a="r-" aria-label="Wiederholungen minus">−</button><input class="num" inputmode="numeric" data-c="r" data-testid="r-input" value="' + (s.r || 0) + '"><button data-a="r+" aria-label="Wiederholungen plus">+</button></div>';
    h += '<div class="slbl">Reserve – wie viele Wdh. wären noch gegangen? (optional)</div><div class="rir">' + [0, 1, 2, 3, 4].map((v) => '<button data-a="rir" data-v="' + v + '" class="' + (s.rir === v ? 'on' : '') + '">' + (v === 4 ? '4+' : v) + '</button>').join('') + '<button class="warm' + (s.warmup ? ' on' : '') + '" data-a="warm">Aufwärm</button></div></div>';
    return h;
  }

  // Timer
  let tickT = null;
  function tick() {
    const slot = $('#timer-slot'), a = S.active;
    const el = $('#elapsed'); if (el && a) el.textContent = C.fmtDuration((now() - a.start) / 1000);
    if (!slot || !a) return;
    const tm = a.timer;
    if (!tm) { if (slot.innerHTML) slot.innerHTML = ''; return; }
    const left = (tm.endsAt - now()) / 1000;
    if (left <= 0 && !tm.fired) {
      tm.fired = true; save();
      if (-left < 5 && document.visibilityState === 'visible') { beep(); flash(); }
    }
    const over = left <= 0;
    const html = '<div class="timer' + (over ? ' over' : '') + '" data-testid="timer"><div><div class="cap">' + (over ? 'Pause vorbei · seit' : 'Pause · ' + esc(tm.exName || '')) + '</div><div class="left" data-testid="timer-left">' + (over ? '+' : '') + C.fmtDuration(Math.abs(Math.ceil(left))) + '</div></div><div class="tb">' +
      (over ? '<button data-a="t-skip" style="min-width:76px">OK</button>' : '<button data-a="t-minus">−15</button><button data-a="t-plus">+15</button><button data-a="t-skip">Stopp</button>') + '</div>' +
      (over ? '' : '<div class="bar" style="width:' + Math.max(0, Math.min(100, (1 - left / tm.total) * 100)).toFixed(1) + '%"></div>') + '</div>';
    const key = (over ? 'o' : 'r') + Math.ceil(left);
    if (slot.dataset.k !== key) { slot.innerHTML = html; slot.dataset.k = key; }
  }
  function startTimer(sec, name) {
    S.active.timer = { endsAt: now() + sec * 1000, total: sec, exName: name, fired: false };
  }

  // ---------- Verlauf ----------
  function renderHistory() {
    let h = '<div class="view"><div class="topbar"><h1>Verlauf</h1></div>';
    const tabs = [['sessions', 'Einheiten'], ['ex', 'Übungen'], ['week', 'Woche'], ['month', 'Monat'], ['cardio', 'Cardio']];
    if (ui.histTab === 'pr') ui.histTab = 'ex';
    h += '<div class="seg">' + tabs.map(([k, l]) => '<button data-a="htab" data-v="' + k + '" class="' + (ui.histTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    if (ui.histTab === 'sessions') {
      const list = S.sessions.slice().sort((a, b) => b.start - a.start);
      if (!list.length) h += '<div class="card empty">Noch keine Einheit abgeschlossen.</div>';
      else h += '<div class="list">' + list.map((s) => { const v = C.sessionVolume(s); return '<button class="li" data-a="open-session" data-id="' + s.id + '"><div class="grow"><div class="t">' + esc(s.dayName) + (s.deload ? ' <span class="badge warn">Deload</span>' : '') + '</div><div class="s num">' + WD[new Date(s.start).getDay()] + ', ' + C.fmtDateLong(s.start) + ' · ' + C.fmtTime(s.start) + ' · ' + C.fmtDuration((s.end - s.start) / 1000) + ' · ' + v.sets + ' Sätze · ' + C.fmtNum(Math.round(v.volume)) + ' kg</div></div><span class="muted">›</span></button>'; }).join('') + '</div>';
    } else if (ui.histTab === 'ex') {
      const withHist = Object.values(S.exercises).filter((e) => C.exerciseHistory(S, e.id, { includeDeload: true }).length).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (!withHist.length) h += '<div class="card empty">Diagramme erscheinen nach der ersten Einheit.</div>';
      else {
        if (!ui.histEx || !withHist.some((e) => e.id === ui.histEx)) ui.histEx = withHist[0].id;
        const ex = S.exercises[ui.histEx], ser = C.exerciseSeries(S, ui.histEx);
        h += '<div class="field"><select data-c="hist-ex" aria-label="Übung">' + withHist.map((e) => '<option value="' + e.id + '"' + (e.id === ui.histEx ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('') + '</select></div>';
        const metrics = C.usesWeight(ex) ? (ex.equip === 'bwplus' ? [['weight', 'Zusatz'], ['reps', 'Wdh.'], ['volume', 'Volumen']] : [['weight', 'Gewicht'], ['e1rm', '1RM ~'], ['volume', 'Volumen'], ['reps', 'Wdh.']]) : [['reps', 'Wdh.']];
        if (!metrics.some((m) => m[0] === ui.histMetric)) ui.histMetric = metrics[0][0];
        h += '<div class="seg">' + metrics.map(([k, l]) => '<button data-a="hmetric" data-v="' + k + '" class="' + (ui.histMetric === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
        const pts = ser.map((s) => ({ x: s.date, y: ui.histMetric === 'reps' ? s.totalReps : s[ui.histMetric], dl: s.deload }));
        const unit = ui.histMetric === 'reps' ? '' : ' kg';
        h += '<div class="card">' + lineChart(pts, (v) => C.fmtNum(Math.round(v * 10) / 10) + unit) + '<div class="tiny muted" style="margin-top:6px">' + ({ weight: 'Arbeitsgewicht je Einheit', e1rm: 'Geschätztes 1RM (Epley-Formel: Gewicht × (1 + Wdh/30)) – nur Richtwert', volume: 'Volumen = Σ Gewicht × Wdh. der Arbeitssätze', reps: 'Summe der Wiederholungen in Arbeitssätzen' })[ui.histMetric] + '. Orange = Deload.</div></div>';
        h += '<div class="card"><table class="t"><tr><th>Datum</th><th>Sätze</th>' + (C.usesWeight(ex) ? '<th class="r">kg</th>' : '') + '<th class="r">Vol.</th></tr>' + ser.slice().reverse().slice(0, 10).map((s) => '<tr><td>' + C.fmtDate(s.date) + (s.deload ? ' <span class="badge warn">D</span>' : '') + '</td><td>' + C.repsLabel(s.reps) + '</td>' + (C.usesWeight(ex) ? '<td class="r">' + C.fmtNum(s.weight) + '</td>' : '') + '<td class="r">' + C.fmtNum(Math.round(s.volume)) + '</td></tr>').join('') + '</table></div>';
      }
      const pr = C.personalRecords(S);
      if (pr.length) h += '<h2>Bestwerte aller Übungen</h2><div class="card" data-testid="records"><table class="t"><tr><th>Übung</th><th class="r">max kg</th><th class="r">1RM ~</th><th class="r">max Wdh.</th></tr>' + pr.map((p) => '<tr><td>' + esc(p.name) + '</td><td class="r">' + (p.equip === 'bw' ? '–' : C.fmtNum(p.maxW)) + '</td><td class="r">' + (p.maxE ? C.fmtNum(Math.round(p.maxE * 10) / 10) : '–') + '</td><td class="r">' + p.maxR + '</td></tr>').join('') + '</table></div>';
    } else if (ui.histTab === 'week') {
      const ws = C.weeklyStats(S, 12, now());
      h += '<div class="card"><div class="muted small" style="margin-bottom:6px">Volumen pro Woche (kg)</div>' + barChart(ws.map((w) => ({ label: 'KW' + w.week, y: w.volume })), (v) => C.fmtNum(Math.round(v))) + '</div>';
      h += '<div class="card"><table class="t"><tr><th>Woche</th><th class="r">Gym</th><th class="r">Cardio</th><th class="r">Volumen</th></tr>' + ws.slice().reverse().map((w) => '<tr><td>KW ' + w.week + ' <span class="muted tiny">ab ' + C.fmtDate(w.weekStart) + '</span></td><td class="r">' + w.sessions + '/4</td><td class="r">' + w.cardio + '/1</td><td class="r">' + C.fmtNum(Math.round(w.volume)) + '</td></tr>').join('') + '</table></div>';
    } else if (ui.histTab === 'month') {
      if (!ui.month) { const x = new Date(); ui.month = { y: x.getFullYear(), m: x.getMonth() }; }
      const M = ui.month, r = C.monthReview(S, M.y, M.m), nowD = new Date();
      const isCur = M.y === nowD.getFullYear() && M.m === nowD.getMonth();
      const MN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      h += '<div class="month-head"><button class="iconbtn" data-a="month-nav" data-dir="-1" aria-label="Vormonat">‹</button><div class="mt"><div class="eyebrow">Rückblick</div><div class="mtitle" data-testid="month-title">' + MN[M.m] + ' <span class="yr">' + M.y + '</span></div></div><button class="iconbtn" data-a="month-nav" data-dir="1" aria-label="Nächster Monat"' + (isCur ? ' disabled' : '') + '>›</button></div>';
      if (!r.sessions && !r.cardio) h += '<div class="card empty">In diesem Monat noch keine Einheiten.</div>';
      else {
        const cell = (v, l) => '<div><b class="num">' + v + '</b><span>' + l + '</span></div>';
        h += '<div class="kv kv6" data-testid="month">' + cell(r.sessions, 'Einheiten') + cell(r.sets, 'Sätze') + cell(C.fmtNum(Math.round(r.volume / 100) / 10) + ' t', 'Volumen') + cell(C.fmtNum(r.hours, 1), 'Stunden') + cell(C.fmtNum(r.runKm, 1), 'Lauf-km') + cell(r.fullWeeks + '/' + r.weeksTrained, 'volle Wochen') + '</div>';
        h += '<p class="why" style="margin-top:0">' + (r.fullWeeks ? r.fullWeeks + (r.fullWeeks === 1 ? ' Woche' : ' Wochen') + ' mit allen vier Einheiten.' : 'Noch keine Woche mit allen vier Einheiten.') + (r.cardio ? ' ' + r.cardio + ' Cardio-' + (r.cardio === 1 ? 'Einheit' : 'Einheiten') + '.' : '') + '</p>';
        h += '<h2>Neue Bestwerte</h2>' + (r.prs.length ? '<div class="list">' + r.prs.map((x) => '<div class="li"><div class="grow"><div class="t serif">' + esc(x.name) + '</div><div class="s">' + C.fmtKg(x.w) + ' (vorher ' + C.fmtKg(x.before) + ')</div></div></div>').join('') + '</div>' : '<div class="card empty">Keine neuen Gewichtsrekorde in diesem Monat.</div>');
        if (r.top.length) h += '<h2>Meiste Arbeit</h2><div class="list">' + r.top.map((x) => '<div class="li"><div class="grow"><div class="t serif">' + esc(x.name) + '</div><div class="s">' + x.sets + ' Sätze · ' + C.fmtNum(Math.round(x.volume)) + ' kg Volumen</div></div></div>').join('') + '</div>';
      }
    } else if (ui.histTab === 'cardio') {
      const types = Object.keys(C.CARDIO).filter((t) => S.cardio.some((c) => c.type === t));
      if (!types.length) h += '<div class="card empty">Noch keine Cardio-Einheit eingetragen.<div style="margin-top:12px"><button class="btn" data-a="cardio-log">Cardio eintragen</button></div></div>';
      else {
        if (!ui.cardioType || types.indexOf(ui.cardioType) < 0) ui.cardioType = types[0];
        const t = ui.cardioType, list = S.cardio.filter((c) => c.type === t);
        h += '<div class="seg">' + types.map((k) => '<button data-a="ctab" data-v="' + k + '" class="' + (k === t ? 'on' : '') + '">' + C.CARDIO[k].label + '</button>').join('') + '</div>';
        h += '<div class="card">' + lineChart(list.map((c) => ({ x: c.date, y: C.cardioMetric(c, t), dl: c.deload })), (v) => C.fmtMetric(v, t), 'bar') + '<div class="tiny muted" style="margin-top:6px">' + (C.CARDIO[t].metric === 'distance' ? 'Distanz' : 'Dauer') + ' je Einheit. Orange = leichtere Einheit.</div></div>';
        const runs = t !== 'run' ? [] : S.cardio.filter((c) => c.type === 'run');
        if (runs.length) {
          const longest = runs.reduce((m, c) => (c.distance > m.distance ? c : m));
          const fastest = runs.filter((c) => c.distance >= 1 && c.duration).reduce((m, c) => (!m || c.duration / c.distance < m.duration / m.distance ? c : m), null);
          h += '<div class="card"><b>Bestwerte Laufen</b><div class="small" style="margin-top:6px">Längster Lauf: ' + C.fmtMetric(longest.distance, 'run') + ' (' + C.fmtDate(longest.date) + ')' + (fastest ? '<br>Schnellste Pace: ' + C.pace(fastest, 'run') + ' über ' + C.fmtMetric(fastest.distance, 'run') : '') + '</div></div>';
        }
        h += '<div class="list">' + list.slice().reverse().map((c) => '<div class="li"><div class="grow"><div class="t num">' + C.fmtMetric(C.cardioMetric(c, t), t) + (c.duration && C.CARDIO[t].metric === 'distance' ? ' · ' + C.fmtDuration(c.duration) : '') + (c.distance && C.CARDIO[t].metric === 'duration' ? ' · ' + C.fmtNum(c.distance, 1) + ' km' : '') + (c.deload ? ' <span class="badge warn">leichter</span>' : '') + '</div><div class="s">' + C.fmtDateLong(c.date) + (C.pace(c, t) ? ' · ' + C.pace(c, t) : '') + (c.target ? ' · Ziel ' + C.fmtMetric(c.target, t) : '') + (c.note ? ' · ' + esc(c.note) : '') + '</div></div><button class="iconbtn" data-a="cardio-del" data-id="' + c.id + '" aria-label="Löschen">×</button></div>').join('') + '</div>';
      }
    }
    return h + '</div>';
  }

  // ---------- Diagramme (eigenes SVG) ----------
  function lineChart(pts, fmt) {
    if (!pts.length) return '<div class="empty">Keine Daten.</div>';
    const W = 340, H = 180, pl = 44, pr = 12, pt = 16, pb = 26;
    let ys = pts.map((p) => p.y).filter((y) => y !== null && y !== undefined);
    if (!ys.length) return '<div class="empty">Keine Daten.</div>';
    let min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min = min - 1; max = max + 1; }
    const pad = (max - min) * 0.12; min = Math.max(0, min - pad); max = max + pad;
    const n = pts.length;
    const X = (i) => (n === 1 ? pl + (W - pl - pr) / 2 : pl + (i / (n - 1)) * (W - pl - pr));
    const Y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    let g = '';
    for (let k = 0; k <= 3; k++) { const v = min + (k / 3) * (max - min), y = Y(v); g += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/><text class="ax" x="' + (pl - 6) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(fmt(v).replace(/ (kg|km|min|m)$/, '')) + '</text>'; }
    const path = pts.map((p, i) => (p.y === null || p.y === undefined ? null : X(i).toFixed(1) + ',' + Y(p.y).toFixed(1))).filter(Boolean).join(' ');
    let dots = pts.map((p, i) => (p.y === null || p.y === undefined ? '' : '<circle class="dt' + (p.dl ? ' dl' : '') + '" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (n > 40 ? 2 : 3.5) + '"/>')).join('');
    const lastP = pts[n - 1];
    const lab = '<text class="lab" x="' + Math.min(X(n - 1), W - pr).toFixed(1) + '" y="' + Math.max(12, Y(lastP.y) - 9).toFixed(1) + '" text-anchor="end">' + esc(fmt(lastP.y)) + '</text>';
    const xl = '<text class="ax" x="' + pl + '" y="' + (H - 6) + '">' + C.fmtDate(pts[0].x) + '</text>' + (n > 1 ? '<text class="ax" x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + C.fmtDate(lastP.x) + '</text>' : '');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Verlaufsdiagramm">' + g + (n > 1 ? '<polyline class="ln" points="' + path + '"/>' : '') + dots + lab + xl + '</svg>';
  }
  function barChart(items, fmt) {
    const W = 340, H = 170, pl = 8, pr = 8, pt = 18, pb = 24;
    const max = Math.max(1, Math.max.apply(null, items.map((i) => i.y)));
    const bw = (W - pl - pr) / items.length;
    let s = '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '"/>';
    items.forEach((it, i) => {
      const h = (it.y / max) * (H - pt - pb), x = pl + i * bw + bw * 0.18, w = bw * 0.64, y = H - pb - h;
      s += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="3"/>';
      if (i % 2 === (items.length - 1) % 2) s += '<text class="ax" x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(it.label.replace('KW', '')) + '</text>';
    });
    const last = items[items.length - 1];
    s += '<text class="lab" x="' + (W - pr) + '" y="12" text-anchor="end">' + esc(last.label) + ': ' + esc(fmt(last.y)) + ' kg</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Wochenvolumen">' + s + '</svg>';
  }

  // ---------- Plan ----------
  function renderPlan() {
    let h = '<div class="view"><div class="topbar"><div><h1>Plan</h1><div class="sub">Rotation: ' + S.days.map((d) => esc(d.name.split(' ')[0])).join(' → ') + ' → …</div></div></div>';
    h += '<p class="muted small" style="margin:0 0 6px">„Nächstes Training“ folgt immer der letzten Einheit – nicht dem Wochentag. Übung antippen: Ausführung, Animation, Alternativen.</p>';
    h += renderBalance();
    S.days.forEach((d, di) => {
      const nd = C.nextDay(S);
      h += '<h2>' + (di + 1) + '. ' + esc(d.name) + (nd && nd.id === d.id ? ' <span class="badge accent">als Nächstes</span>' : '') + '</h2><div class="list">';
      d.exerciseIds.forEach((id, i) => {
        const e = S.exercises[id]; if (!e || e.archived) return;
        h += '<div class="li"><button class="grow" style="text-align:left" data-a="info" data-ctx="plan" data-id="' + id + '"><div class="t serif">' + esc(e.name) + (e.suggested ? ' <span class="badge warn">Vorschlag</span>' : '') + '</div><div class="s">' + esc(C.EQUIP[e.equip]) + ' · ' + e.sets + '×' + e.repMin + '–' + e.repMax + ' · ' + C.fmtDuration(e.rest) + (C.usesWeight(e) ? ' · +' + C.fmtNum(e.step) + ' kg' : '') + '</div></button>' +
          '<button class="iconbtn" data-a="ex-up" data-d="' + di + '" data-i="' + i + '" aria-label="nach oben"' + (i === 0 ? ' disabled' : '') + '>↑</button><button class="iconbtn" data-a="ex-down" data-d="' + di + '" data-i="' + i + '" aria-label="nach unten">↓</button><button class="iconbtn" data-a="ex-edit" data-id="' + id + '" data-d="' + di + '" aria-label="bearbeiten"><span class="txtbtn">Ändern</span></button></div>';
      });
      h += '<div class="li"><button class="link" data-a="ex-add" data-d="' + di + '">+ Übung</button><span class="grow"></span><button class="btn sm ghost" data-a="day-edit" data-d="' + di + '">Tag bearbeiten</button></div></div>';
    });
    h += '<button class="btn block ghost" data-a="day-add">+ Trainingstag</button>';
    const arch = Object.values(S.exercises).filter((e) => e.archived);
    if (arch.length) h += '<h2>Archiv</h2><div class="list">' + arch.map((e) => '<div class="li arch"><div class="grow"><div class="t">' + esc(e.name) + '</div><div class="s">Verlauf bleibt erhalten</div></div><button class="btn sm ghost" data-a="ex-restore" data-id="' + e.id + '">Zurückholen</button></div>').join('') + '</div>';
    return h + '</div>';
  }

  function exerciseForm(e, title, extra) {
    const opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>';
    return '<h3>' + esc(title) + '</h3><div class="field"><label>Name</label><input id="f-name" value="' + esc(e.name) + '" maxlength="60"></div>' +
      '<div class="field"><label>Equipment</label><select id="f-equip">' + Object.keys(C.EQUIP).map((k) => opt(k, C.EQUIP[k], e.equip)).join('') + '</select></div>' +
      '<div class="grid3"><div class="field"><label>Sätze</label><input id="f-sets" inputmode="numeric" value="' + e.sets + '"></div><div class="field"><label>Wdh. von</label><input id="f-min" inputmode="numeric" value="' + e.repMin + '"></div><div class="field"><label>bis</label><input id="f-max" inputmode="numeric" value="' + e.repMax + '"></div></div>' +
      '<div class="grid2"><div class="field"><label>Pause (Sek.)</label><input id="f-rest" inputmode="numeric" value="' + e.rest + '"></div><div class="field"><label>Gewichtsstufe (kg)</label><input id="f-step" inputmode="decimal" value="' + C.fmtNum(e.step) + '"></div></div>' +
      '<div class="field"><label>Bewegungsvorschau / Muskelzuordnung</label><select id="f-lib"><option value="">– keine (eigene Übung) –</option>' + LIB.LIST.map((l) => opt(l.key, l.name + ' · ' + l.primary.join(', '), e.lib || '')).join('') + '</select></div>' +
      '<div class="field"><label>Notiz</label><textarea id="f-note" maxlength="300">' + esc(e.note) + '</textarea></div>' + (extra || '');
  }
  function readExerciseForm(e) {
    const n = (id, def) => { const v = C.parseNum($(id).value); return v === null || v < 0 ? def : v; };
    const name = $('#f-name').value.trim();
    if (!name) { toast('Bitte einen Namen eingeben'); return false; }
    e.name = name; e.equip = $('#f-equip').value;
    e.sets = Math.max(1, Math.min(10, Math.round(n('#f-sets', e.sets))));
    e.repMin = Math.max(1, Math.round(n('#f-min', e.repMin)));
    e.repMax = Math.max(e.repMin, Math.round(n('#f-max', e.repMax)));
    e.rest = Math.max(0, Math.min(900, Math.round(n('#f-rest', e.rest))));
    e.step = Math.max(0.25, n('#f-step', e.step));
    e.note = $('#f-note').value.trim();
    const lv = $('#f-lib') ? $('#f-lib').value : '';
    e.lib = lv || LIB.match(e.name) || null;
    return true;
  }

  // ---------- Einstellungen ----------
  function numSetting(label, desc, path, val, opts) {
    return '<div class="setting"><div><div>' + label + '</div>' + (desc ? '<div class="d">' + desc + '</div>' : '') + '</div><input type="number" inputmode="decimal" step="' + ((opts && opts.step) || 1) + '" min="' + ((opts && opts.min) || 0) + '" data-c="setnum" data-p="' + path + '" value="' + val + '"></div>';
  }
  function toggleSetting(label, desc, path, val) {
    return '<div class="setting"><div><div>' + label + '</div>' + (desc ? '<div class="d">' + desc + '</div>' : '') + '</div><label class="toggle"><input type="checkbox" data-c="settog" data-p="' + path + '"' + (val ? ' checked' : '') + ' aria-label="' + esc(label) + '"></label></div>';
  }
  function renderSettings() {
    const st = S.settings, P = st.progression, D = st.deload, Cd = st.cardio;
    const lb = S.meta.lastExportAt;
    let h = '<div class="view"><div class="topbar"><h1>Einstellungen</h1><div class="sub">&amp; Hilfe</div></div>';
    h += '<h2>Datensicherung</h2><div class="card"><div class="small">Deine Daten liegen nur auf diesem iPhone. iOS kann Website-Speicher in seltenen Fällen löschen (z. B. bei Speichermangel oder wenn du die App vom Home-Bildschirm entfernst). <b>Exportiere regelmäßig</b> und lege die Datei in „Dateien“/iCloud Drive ab.</div><div class="small muted" style="margin:8px 0 12px" data-testid="last-backup">Letzte Sicherung: ' + (lb ? C.fmtDateLong(lb) + ' (' + C.daysSinceBackup(S, now()) + ' Tage)' : 'noch nie') + '</div>' +
      '<div class="grid2"><button class="btn primary" data-a="export" data-testid="export">Exportieren</button><button class="btn" data-a="import">Importieren</button></div></div>';
    h += '<div class="list">' + numSetting('Erinnerung nach … Tagen', 'Warnung beim Start, wenn so lange nicht gesichert wurde', 'backupIntervalDays', st.backupIntervalDays, { min: 1 }) + '</div>';
    h += '<h2>Allgemein</h2><div class="list"><div class="setting"><div>Darstellung</div><select data-c="theme"><option value="light"' + (st.theme === 'light' ? ' selected' : '') + '>Creme (hell)</option><option value="dark"' + (st.theme === 'dark' ? ' selected' : '') + '>Nacht (dunkel)</option><option value="system"' + (st.theme === 'system' ? ' selected' : '') + '>wie iPhone</option></select></div>' +
      toggleSetting('Ton am Pausenende', 'Drei kurze Töne + Aufblinken', 'sound', st.sound) +
      '<div class="setting"><div>Ton testen</div><button class="btn sm" data-a="sound-test">Abspielen</button></div>' +
      toggleSetting('Ton auch im Lautlos-Modus', 'Experimentell. Kann laufende Musik kurz unterbrechen.', 'soundInSilentMode', st.soundInSilentMode) +
      toggleSetting('Bildschirm während des Trainings an', 'Verhindert Sperren, damit der Timer sichtbar bleibt', 'keepAwake', st.keepAwake) +
      '<div class="setting"><div>Cardio-Art auf „Heute“</div><select data-c="cardioType">' + Object.keys(C.CARDIO).map((k) => '<option value="' + k + '"' + (k === st.cardioType ? ' selected' : '') + '>' + C.CARDIO[k].label + '</option>').join('') + '</select></div></div>';
    let adv = '<div class="eyebrow">Progression</div><div class="list">' +
      toggleSetting('Reserve berücksichtigen', 'Obergrenze ohne Reserve (0) erreicht → Gewicht bleibt einmal', 'progression.useRIR', P.useRIR !== false) +
      numSetting('Halten ab … Fehlversuchen', 'Hinweis „Gewicht bleibt“', 'progression.stallHold', P.stallHold, { min: 1 }) +
      numSetting('Reduktion ab … Fehlversuchen', 'in Folge ohne Steigerung', 'progression.stallReduce', P.stallReduce, { min: 2 }) +
      numSetting('Reduktion um max. … %', '', 'progression.reducePct', P.reducePct, { min: 1 }) +
      numSetting('Pause gilt ab … Tagen', 'danach keine Steigerung in der ersten Einheit', 'progression.longBreakDays', P.longBreakDays, { min: 3 }) + '</div>' +
      '';
    adv += '<div class="eyebrow">Deload</div><div class="list">' +
      numSetting('Vorschlag alle … Wochen', '', 'deload.everyWeeks', D.everyWeeks, { min: 2 }) +
      numSetting('…oder wenn … Übungen stagnieren', 'stagniert = so oft in Folge ohne Steigerung wie bei „Reduktion ab“', 'deload.stagnationCount', D.stagnationCount, { min: 1 }) +
      numSetting('Sätze im Deload (%)', '', 'deload.setsFactor', Math.round(D.setsFactor * 100), { min: 10, step: 5 }) +
      numSetting('Gewicht im Deload (%)', '', 'deload.weightFactor', Math.round(D.weightFactor * 100), { min: 40, step: 5 }) + '</div>';
    adv += '<div class="eyebrow">Cardio</div><div class="list">' +
      numSetting('Steigerung je Einheit (%)', 'gedeckelt bei +' + Cd.maxSpikePct + ' % über der längsten Einheit der letzten 30 Tage', 'cardio.ratePct', Cd.ratePct, { min: 0 }) +
      numSetting('Jede … Einheit leichter', '', 'cardio.deloadEvery', Cd.deloadEvery, { min: 2 }) +
      numSetting('Leichte Einheit (%)', '', 'cardio.deloadFactor', Math.round(Cd.deloadFactor * 100), { min: 30, step: 5 }) +
      numSetting('Max. Sprung (%)', 'über längster Einheit der letzten 30 Tage', 'cardio.maxSpikePct', Cd.maxSpikePct, { min: 0 }) +
      numSetting('Obergrenze Laufen (km)', '', 'cardio.caps.run', Cd.caps.run, { min: 1, step: 0.5 }) +
      numSetting('Obergrenze Rad (min)', '', 'cardio.caps.bike', Cd.caps.bike, { min: 10, step: 5 }) +
      numSetting('Obergrenze Schwimmen (m)', '', 'cardio.caps.swim', Math.round(Cd.caps.swim * 1000), { min: 100, step: 50 }) + '</div>';
    const plateChips = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5].map((v) => '<button class="pchip' + (st.plates.list.indexOf(v) >= 0 ? ' on' : '') + '" data-a="plate-toggle" data-v="' + v + '" aria-pressed="' + (st.plates.list.indexOf(v) >= 0) + '">' + C.fmtNum(v) + '</button>').join('');
    adv += '<div class="eyebrow">Langhantel &amp; Scheiben</div><div class="list">' + numSetting('Gewicht der Stange (kg)', 'für den Scheibenrechner im Training', 'plates.bar', st.plates.bar, { min: 0, step: 0.5 }) +
      '<div class="setting" style="display:block"><div>Vorhandene Scheiben (kg)</div><div class="d">Antippen zum An- und Abwählen</div><div class="pchips" data-testid="plate-chips">' + plateChips + '</div></div></div>';
    h += '<details class="card adv" data-testid="advanced"' + (ui.advOpen ? ' open' : '') + '><summary>Erweitert</summary><p class="small muted">Feinsteuerung für Progression, Deload, Cardio und Hantelscheiben. Die Standardwerte passen in den meisten Fällen. Sätze, Wiederholungen, Pausen und Gewichtsstufen stellst du pro Übung im Plan ein.</p>' + adv + '</details>';
    h += '<h2>Hilfe</h2>' + explainHtml() + helpHtml();
    h += '<div class="list"><div class="setting"><div><div>Alle Daten löschen</div><div class="d">Vorher exportieren.</div></div><button class="btn sm danger" data-a="wipe">Löschen</button></div></div>';
    h += '<p class="tiny muted" style="margin:16px 4px">Hinweis: Herakles gibt Trainingsvorschläge auf Basis deiner Eingaben und fester Regeln. Es ersetzt keine ärztliche oder trainerische Beratung. Bei Schmerzen: Übung pausieren.<br><br>Version ' + VERSION + ' · offline · keine Konten, keine Cloud, kein Tracking.</p>';
    return h + '</div>';
  }
  function explainHtml() {
    const P = S.settings.progression, D = S.settings.deload, Cd = S.settings.cardio;
    return '<details class="card" data-testid="explain"><summary>So entscheidet die App</summary><div class="prose">' +
      '<p><b>Doppelprogression.</b> Jede Übung hat einen Wiederholungsbereich (bei dir 8–12) und eine Gewichtsstufe (Standard 2,5 kg). Schaffst du in <i>allen</i> Arbeitssätzen die obere Grenze, schlägt die App beim nächsten Mal genau <b>eine Stufe mehr</b> vor und startet wieder bei der unteren Grenze. Sonst bleibt das Gewicht, und das Ziel ist je Satz +1 Wiederholung.</p>' +
      '<p><b>Reserve.</b> Trägst du bei einem Satz „Reserve 0“ ein (keine Wiederholung mehr möglich) und erreichst trotzdem die obere Grenze, bleibt das Gewicht einmal gleich. Schaffst du die Grenze beim nächsten Mal wieder, wird gesteigert. Ohne Reserve-Angabe gilt die normale Regel. Abschaltbar unter „Erweitert“.</p>' +
      '<p><b>Rückschläge.</b> Steigt die Summe deiner Wiederholungen bei gleichem Gewicht nicht, zählt das als Fehlversuch. Ab ' + P.stallHold + ' Fehlversuchen heißt es ausdrücklich „Gewicht bleibt“. Nach ' + P.stallReduce + ' Fehlversuchen in Folge schlägt die App eine Reduktion um höchstens ' + P.reducePct + ' % (auf die nächste Stufe gerundet) oder eine kurze Pause der Übung vor.</p>' +
      '<p><b>Pausen.</b> Liegt die letzte Einheit einer Übung ≥ ' + P.longBreakDays + ' Tage zurück, wird beim ersten Mal nicht gesteigert.</p>' +
      '<p><b>Deload.</b> Nach ' + D.everyWeeks + ' Wochen oder wenn ' + D.stagnationCount + ' Übungen stagnieren (' + P.stallReduce + '× in Folge ohne Steigerung), schlägt die App eine leichtere Woche vor: ' + Math.round(D.setsFactor * 100) + ' % der Sätze, ~' + Math.round(D.weightFactor * 100) + ' % Gewicht, für ' + S.days.length + ' Einheiten. Du kannst annehmen oder ablehnen (dann fragt sie in 7 Tagen wieder). Deload-Einheiten zählen nicht für die Progression. Eine Trainingspause ab 10 Tagen gilt selbst als Erholung.</p>' +
      '<p><b>Übungsvorschläge.</b> Jede Übung ist einer Bibliotheksübung mit Zielmuskeln zugeordnet. Die App zählt daraus die Sätze pro Muskel und Woche (Hauptmuskel 1, Hilfsmuskel 0,5). Liegt ein Muskel unter ~10 Sätzen – dem Richtwert aus der Meta-Analyse von Schoenfeld, Ogborn & Krieger (2017) –, schlägt sie eine passende Übung vor oder einen zusätzlichen Satz. Alternativen zu einer Übung trainieren dieselben Hauptmuskeln. Stagniert eine Übung 3× in Folge, verweist die App auf diese Alternativen. Du entscheidest: übernehmen, nur heute tauschen oder ignorieren.</p>' +
      '<p><b>Nicht gezählt:</b> Aufwärmsätze. Die Reserve-Angabe (RIR) wird gespeichert, verändert die Vorschläge aber nicht.</p>' +
      '<p><b>Cardio.</b> Ziel = letzte reguläre Einheit +' + Cd.ratePct + ' % (Laufen: Distanz, Rad: Dauer, Schwimmen: Distanz), nie mehr als +' + Cd.maxSpikePct + ' % über deiner längsten Einheit der letzten 30 Tage. Jede ' + Cd.deloadEvery + '. Einheit ist leichter (' + Math.round(Cd.deloadFactor * 100) + ' %). Unter ' + Cd.holdBelowPct + ' % des Ziels geblieben → Ziel bleibt. Die +10-%-Grenze für einen einzelnen Lauf stützt sich auf eine Kohortenstudie mit 5.200 Läufern (Frandsen et al., Br J Sports Med 2025): Läufe, die mehr als 10 % über dem längsten Lauf der letzten 30 Tage lagen, gingen mit mehr Überlastungsverletzungen einher. Das ist ein Zusammenhang, kein Beweis. Die +' + Cd.ratePct + ' % pro Woche sind eine konservative Faustregel.</p>' +
      '<p><b>Immer gilt:</b> Alles sind Vorschläge. Du kannst jedes Gewicht und jede Wiederholung überschreiben – die App rechnet beim nächsten Mal mit dem, was du tatsächlich gemacht hast.</p></div></details>';
  }
  function helpHtml() {
    return '<details class="card"><summary>Kurzanleitung</summary><div class="prose"><ul>' +
      '<li><b>Training starten:</b> „Heute“ → „Training starten“. Die App wählt den nächsten Tag der Rotation.</li>' +
      '<li><b>Satz erfassen:</b> Gewicht/Wdh. sind vorausgefüllt. Mit −/+ anpassen oder auf die Zahl tippen und tippen. Dann „Satz abhaken“ – der Pausentimer startet.</li>' +
      '<li><b>Erste Einheit:</b> Bei jeder Übung einmal das Arbeitsgewicht eintragen. Es wird in die folgenden Sätze übernommen.</li>' +
      '<li><b>Optional:</b> Reserve (wie viele Wdh. noch gingen), Aufwärmsatz markieren, Notiz. Bei Langhantel-Übungen zeigt der Scheibenrechner, was pro Seite auf die Stange kommt.</li>' +
      '<li><b>Übungen wechseln:</b> ‹ und › unten oder „Übungen“ oben links.</li>' +
      '<li><b>Unterbrechung:</b> App schließen oder Handy sperren ist kein Problem – beim Öffnen geht es genau dort weiter.</li>' +
      '<li><b>Beenden:</b> „Beenden“ → Zusammenfassung mit Dauer, Volumen und neuen Bestwerten.</li>' +
      '<li><b>Ausführung &amp; Alternativen:</b> Im Training auf das kleine „i“ neben dem Übungsnamen tippen (oder im Plan auf den Namen): Animation, Technik-Hinweise, Zielmuskeln, Alternativen. „Heute stattdessen“ tauscht nur für diese Einheit – praktisch, wenn ein Gerät belegt ist.</li>' +
      '<li><b>Plan ändern:</b> Tab „Plan“: Vorschläge übernehmen, Übung bearbeiten („Ändern“), ersetzen, archivieren, sortieren (↑↓), „+ Übung“ aus der Bibliothek.</li>' +
      '<li><b>Korrigieren:</b> „Verlauf“ → Einheit antippen → Werte ändern oder Einheit löschen.</li>' +
      '<li><b>Monatsrückblick:</b> „Verlauf“ → „Monat“: Einheiten, Sätze, Volumen, Stunden, Lauf-Kilometer, neue Bestwerte.</li>' +
      '<li><b>Sichern:</b> Alle 2 Wochen „Exportieren“ und die Datei in „Dateien“ speichern.</li></ul></div></details>';
  }

  // ================= Übungsinfo, Muskelbilanz =================
  let stopAlt = null;
  function openInfo(o) {
    const ex = o.exId ? S.exercises[o.exId] : null;
    const L = o.lib ? LIB.BY[o.lib] : C.libOf(ex);
    const title = ex ? ex.name : L ? L.name : '';
    const day = o.dayId ? S.days.find((d) => d.id === o.dayId) : null;
    let h = '<h3 data-testid="info-title">' + esc(title) + '</h3>';
    if (L) {
      h += '<div class="figbox" id="figbox" data-testid="figbox"></div><div class="figcap">Schematischer Bewegungsablauf' + (AN.note(L.anim) ? ' · ' + AN.note(L.anim) : '') + '</div>';
      h += '<div class="muscles">' + L.primary.map((g) => '<span class="p">' + esc(g) + '</span>').join('') + L.secondary.map((g) => '<span>' + esc(g) + '</span>').join('') + '</div>';
      h += '<div class="eyebrow">Ausführung</div><ol class="cues">' + L.cues.map((c) => '<li>' + esc(c) + '</li>').join('') + '</ol>';
      h += '<p class="why" style="margin-top:0">' + esc(L.why) + '</p>';
    } else h += '<p class="muted">Für diese eigene Übung gibt es keine Vorschau. Unter Plan → „Ändern“ → „Bewegungsvorschau“ kannst du sie einer Bibliotheksübung zuordnen.</p>';
    if (o.ctx === 'lib' && L && S.days.length) h += '<div class="actions"><button class="btn primary" data-a="sugg-add" data-key="' + L.key + '" data-day="' + (day ? day.id : S.days[0].id) + '" data-testid="lib-add">Zu „' + esc((day || S.days[0]).name) + '“ hinzufügen</button></div>';
    if (L) {
      const alts = C.alternatives(S, L.key);
      if (alts.length) {
        h += '<div class="eyebrow" id="alts" style="margin-top:22px">Alternativen · antippen für Vorschau</div>';
        alts.forEach((a) => {
          let acts = '';
          if (o.ctx === 'gym' && S.active) acts = '<button class="btn sm primary" data-a="swap-today" data-key="' + a.key + '" data-testid="swap-today">Heute stattdessen</button><button class="btn sm ghost" data-a="swap-perm" data-key="' + a.key + '">Im Plan ersetzen</button>';
          else if (o.ctx === 'plan' && ex && !a.inPlan) acts = '<button class="btn sm ghost" data-a="plan-replace" data-id="' + ex.id + '" data-key="' + a.key + '" data-testid="plan-replace">Im Plan ersetzen</button>';
          h += '<div class="alt" data-testid="alt"><button data-a="alt-play" data-key="' + a.key + '" aria-label="Vorschau ' + esc(a.name) + '"><span class="mini-anim">' + AN.svg(AN.forEntry(LIB.BY[a.key]), 1, 'figmini') + '</span></button><div class="grow"><div class="t">' + esc(a.name) + (a.inPlan ? ' <span class="badge">im Plan</span>' : '') + '</div><div class="s">' + esc(a.reason) + '</div><div class="acts">' + acts + '</div></div></div>';
        });
      }
    }
    h += '<div class="actions"><button class="btn ghost" data-a="close">Schließen</button></div>';
    if (stopAlt) { stopAlt(); stopAlt = null; }
    sheet(h);
    if (L) stopAnim = AN.play($('#figbox'), AN.forEntry(L));
    if (o.focus === 'alts') { const el = $('#alts'); if (el && el.scrollIntoView) el.scrollIntoView(); }
  }
  function renderBalance() {
    const v = C.planVolume(S), sug = C.planSuggestions(S);
    const max = Math.max(24, Math.max.apply(null, v.groups.map((g) => g.sets)));
    let h = '';
    if (sug.length) {
      h += '<h2>Vorschläge für deinen Plan</h2><div class="list" data-testid="suggestions">';
      sug.forEach((x) => {
        if (x.kind === 'add') h += '<div class="li" style="align-items:flex-start;gap:12px">' + AN.svg(AN.forEntry(LIB.BY[x.key]), 1, 'figmini') + '<div class="grow"><div class="t serif">' + esc(x.name) + '</div><div class="s">' + esc(x.reason) + '</div><div class="tiny muted" style="margin-top:6px">Vorgeschlagen für Tag ' + (S.days.findIndex((d) => d.id === x.dayId) + 1) + ' · ' + esc(x.dayName) + '</div><div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px"><button class="btn sm primary" data-a="sugg-add" data-key="' + x.key + '" data-day="' + x.dayId + '" data-testid="sugg-add" aria-label="Zu ' + esc(x.dayName) + ' hinzufügen">Zu Tag ' + (S.days.findIndex((d) => d.id === x.dayId) + 1) + '</button><button class="btn sm ghost" data-a="info" data-ctx="lib" data-lib="' + x.key + '" data-day="' + x.dayId + '">Ansehen</button></div></div></div>';
        else h += '<div class="li" style="align-items:flex-start"><div class="grow"><div class="eyebrow">+1 Satz</div><div class="t serif">' + esc(x.name) + '</div><div class="s">' + esc(x.reason) + '</div><div class="row" style="margin-top:10px"><button class="btn sm primary" data-a="sugg-set" data-id="' + x.exId + '" data-testid="sugg-set">Satz ergänzen</button></div></div></div>';
      });
      h += '</div>';
    }
    h += '<details class="card" data-testid="balance"' + (sug.length ? '' : ' open') + '><summary>Muskelbilanz · Sätze pro Woche</summary>';
    v.groups.forEach((g) => { h += '<div class="vol ' + g.status + '"><span class="g">' + esc(g.group) + '</span><span class="bar"><i style="width:' + Math.min(100, g.sets / max * 100).toFixed(1) + '%"></i><span class="tick" style="left:' + (v.target / max * 100).toFixed(1) + '%"></span></span><span class="n num">' + C.fmtNum(g.sets) + '</span></div>'; });
    h += '<div class="tiny muted" style="margin-top:10px">Strich = Richtwert ~' + v.target + ' Sätze pro Muskel und Woche (Meta-Analyse Schoenfeld, Ogborn & Krieger 2017: ab ~10 Sätzen deutlich mehr Muskelzuwachs; eine Obergrenze ist nicht belegt). Hauptmuskel zählt 1, Hilfsmuskel 0,5 Sätze; angenommen sind 4 Einheiten pro Woche.' + (v.unmatched.length ? ' Ohne Zuordnung: ' + esc(v.unmatched.join(', ')) + ' (Ändern → Bewegungsvorschau).' : '') + '</div></details>';
    return h;
  }

  // ================= Aktionen =================
  function setByPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; }
  function stepWeight(e, s, dir) {
    const ex = S.exercises[e.exId];
    const step = ex ? ex.step : 2.5;
    let w = s.w;
    if (w === null || w === undefined) { if (dir < 0) return; w = e.sugg.last ? e.sugg.last.W : step; }
    else w = w + dir * step;
    s.w = Math.max(0, Math.round(w * 100) / 100);
  }
  // geänderte Last in folgende offene Arbeitssätze mit gleicher (oder leerer) Last übernehmen
  function carryWeight(e, i, old) {
    const s = e.sets[i]; if (s.done || s.warmup) return;
    for (let j = i + 1; j < e.sets.length; j++) { const t = e.sets[j]; if (!t.done && !t.warmup && (t.w === null || t.w === undefined || t.w === old)) t.w = s.w; }
  }
  function exerciseDoneAll(e) { return e.sets.length && e.sets.every((s) => s.done); }

  const A = {
    nav(el) { view = el.dataset.v; closeSheet(); render(); window.scrollTo(0, 0); },
    'go-gym'() { view = 'gym'; audioUnlock(); wakeOn(); render(); },
    start(el) {
      audioUnlock();
      C.startSession(S, el.dataset.day, now()); save(); view = 'gym'; ui.sel = {}; render(); window.scrollTo(0, 0); wakeOn();
    },
    'pick-day'() {
      sheet('<h3>Welcher Tag?</h3><div class="list">' + S.days.map((d) => '<button class="li" data-a="start-day" data-day="' + d.id + '"><div class="grow"><div class="t">' + esc(d.name) + '</div><div class="s">' + d.exerciseIds.filter((id) => S.exercises[id] && !S.exercises[id].archived).length + ' Übungen</div></div>›</button>').join('') + '</div>');
    },
    'start-day'(el) { closeSheet(); A.start(el); },
    'sheet-bg'(el, ev) { if (ev.target === el) { if (pendingConfirm) { pendingConfirm(false); pendingConfirm = null; } closeSheet(); } },
    'cf-yes'() { const p = pendingConfirm; pendingConfirm = null; closeSheet(); if (p) p(true); },
    'cf-no'() { const p = pendingConfirm; pendingConfirm = null; closeSheet(); if (p) p(false); },
    'deload-yes'() { C.acceptDeload(S, now()); save(); toast('Deload-Woche aktiv'); render(); },
    'deload-no'() { C.declineDeload(S, now()); save(); toast('Erinnerung in 7 Tagen'); render(); },
    async 'deload-end'() { if (await confirmBox('Deload beenden?', 'Ab der nächsten Einheit gelten wieder die normalen Vorschläge.', 'Beenden')) { C.endDeload(S); save(); render(); } },
    'apply-update'() { if (updateReady) updateReady.postMessage('skipWaiting'); },

    // Gym
    'sel-set'(el) { const e = curEx(); ui.sel[e.exId + '#' + S.active.cur] = +el.dataset.i; render(); },
    'w-'() { const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return; const old = s.w; stepWeight(e, s, -1); carryWeight(e, i, old); save(); render(); },
    'w+'() { const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return; const old = s.w; stepWeight(e, s, 1); carryWeight(e, i, old); save(); render(); },
    'r-'() { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; s.r = Math.max(0, (s.r || 0) - 1); save(); render(); },
    'r+'() { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; s.r = (s.r || 0) + 1; save(); render(); },
    rir(el) { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; const v = +el.dataset.v; s.rir = s.rir === v ? null : v; save(); render(); },
    warm() { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; s.warmup = !s.warmup; save(); render(); },
    check() {
      const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return;
      const ck = e.exId + '#' + i;
      if (!s.done && now() - lastCheck < 450 && lastCheckKey !== ck) return; // versehentlicher Doppeltipp würde sonst den nächsten Satz abhaken
      lastCheck = now(); lastCheckKey = ck;
      const ex = S.exercises[e.exId];
      audioUnlock(); wakeOn();
      if (s.done) { s.done = false; save(); render(); return; }
      if (ex && C.usesWeight(ex) && (s.w === null || s.w === undefined)) { toast('Bitte zuerst das Gewicht eintragen'); const inp = $('[data-c=w]'); if (inp) inp.focus(); return; }
      if (!s.r) { toast('Wiederholungen eintragen'); return; }
      s.done = true; s.t = now(); haptic();
      if (!s.warmup) C.propagateWeight(e, i);
      delete ui.sel[e.exId + '#' + S.active.cur];
      const rest = ex ? ex.rest : 90;
      if (rest > 0) startTimer(s.warmup ? Math.min(60, rest) : rest, e.name);
      if (exerciseDoneAll(e)) toast(S.active.cur < S.active.exercises.length - 1 ? 'Übung erledigt – weiter mit „Nächste Übung ›“' : 'Letzte Übung erledigt – „Training beenden“');
      save(); render();
    },
    'add-set'() { const e = curEx(), last = e.sets.filter((s) => !s.warmup).pop() || e.sets[e.sets.length - 1]; e.sets.push({ w: last ? last.w : e.sugg.weight, r: last ? last.r : 8, rir: null, warmup: false, done: false }); ui.sel[e.exId + '#' + S.active.cur] = e.sets.length - 1; save(); render(); },
    'add-warm'() { const e = curEx(), w = e.sugg.weight; e.sets.unshift({ w: w ? Math.round(w * 0.5 / 2.5) * 2.5 : null, r: 10, rir: null, warmup: true, done: false }); ui.sel[e.exId + '#' + S.active.cur] = 0; save(); render(); },
    'del-set'() { const e = curEx(), i = selIdx(e); if (i < 0 || e.sets.length < 2) return; e.sets.splice(i, 1); delete ui.sel[e.exId + '#' + S.active.cur]; save(); render(); },
    'toggle-note'() { const e = curEx(); ui.showNote[e.exId] = !ui.showNote[e.exId]; render(); },
    'ex-prev'() { if (S.active.cur > 0) { S.active.cur--; save(); render(); window.scrollTo(0, 0); } },
    'ex-next'() { if (S.active.cur < S.active.exercises.length - 1) { S.active.cur++; save(); render(); window.scrollTo(0, 0); } },
    'ex-list'() {
      const a = S.active;
      sheet('<h3>Übungen</h3><div class="list">' + a.exercises.map((e, i) => { const d = e.sets.filter((s) => s.done && !s.warmup).length, n = e.sets.filter((s) => !s.warmup).length; return '<button class="li" data-a="ex-goto" data-i="' + i + '"><div class="grow"><div class="t">' + (i === a.cur ? '▸ ' : '') + esc(e.name) + '</div><div class="s">' + d + '/' + n + ' Sätze</div></div>' + (n && d >= n ? '✓' : '') + '</button>'; }).join('') + '</div><button class="btn block ghost" data-a="discard" style="margin-top:6px">Einheit verwerfen</button>');
    },
    'ex-goto'(el) { S.active.cur = +el.dataset.i; save(); closeSheet(); render(); window.scrollTo(0, 0); },
    't-minus'() { const t = S.active.timer; if (t) { t.endsAt -= 15000; t.total = Math.max(1, t.total - 15); save(); tick(); } },
    't-plus'() { const t = S.active.timer; if (t) { t.endsAt = Math.max(now(), t.endsAt) + 15000; t.total += 15; t.fired = false; save(); tick(); } },
    't-skip'() { S.active.timer = null; save(); tick(); },
    async discard() {
      closeSheet();
      if (await confirmBox('Einheit verwerfen?', 'Alle Sätze dieser Einheit werden gelöscht. Das kann nicht rückgängig gemacht werden.', 'Verwerfen', true)) { S.active = null; save(); wakeOff(); view = 'home'; render(); }
    },
    async finish() {
      const a = S.active, done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0), open = a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done && !s.warmup).length, 0);
      if (!done) { if (await confirmBox('Noch kein Satz erledigt', 'Einheit ohne Sätze verwerfen?', 'Verwerfen', true)) { S.active = null; save(); wakeOff(); view = 'home'; render(); } return; }
      if (!(await confirmBox('Training beenden?', done + ' Sätze erledigt' + (open ? ', ' + open + ' offen (werden nicht gespeichert)' : '') + '.', 'Beenden'))) return;
      const sum = C.finishSession(S, now()); save(); wakeOff(); view = 'home';
      render();
      sheet('<h3>Einheit abgeschlossen.</h3><div class="muted small">' + esc(sum.session.dayName) + (sum.session.deload ? ' · Deload' : '') + '</div><div class="kv" data-testid="summary"><div><b class="num">' + C.fmtDuration(sum.durationSec) + '</b><span>Dauer</span></div><div><b class="num">' + sum.sets + '</b><span>Sätze</span></div><div><b class="num">' + C.fmtNum(Math.round(sum.volume)) + '</b><span>kg Volumen</span></div></div>' +
        (sum.prs.length ? '<b>Neue Bestwerte</b><div class="list" style="margin-top:8px">' + sum.prs.map((p) => '<div class="li"><div class="grow"><div class="t serif">' + esc(p.name) + '</div><div class="s">' + esc(p.text) + '</div></div></div>').join('') + '</div>' : '<div class="muted small">Keine neuen Bestwerte. Beständigkeit zählt.</div>') +
        '<div class="small muted" style="margin-top:10px">Nächstes Training: <b>' + esc((C.nextDay(S) || {}).name || '') + '</b></div><div class="actions"><button class="btn primary" data-a="close">Fertig</button></div>');
    },
    close() { closeSheet(); },

    // Verlauf
    htab(el) { ui.histTab = el.dataset.v; render(); },
    hmetric(el) { ui.histMetric = el.dataset.v; render(); },
    ctab(el) { ui.cardioType = el.dataset.v; render(); },
    'open-session'(el) { openSessionEditor(el.dataset.id); },
    'se-save'(el) { saveSessionEditor(el.dataset.id); },
    async 'se-del'(el) {
      const id = el.dataset.id; closeSheet();
      if (await confirmBox('Einheit löschen?', 'Die Einheit und alle Sätze werden entfernt. Die Vorschläge rechnen danach ohne sie.', 'Löschen', true)) { S.sessions = S.sessions.filter((s) => s.id !== id); save(); toast('Einheit gelöscht'); render(); }
    },
    'se-delset'(el) { const row = el.closest('.editset'); if (row) row.remove(); },
    async 'cardio-del'(el) { if (await confirmBox('Cardio-Einheit löschen?', '', 'Löschen', true)) { S.cardio = S.cardio.filter((c) => c.id !== el.dataset.id); save(); render(); } },
    'cardio-log'() { openCardioSheet(S.settings.cardioType); },
    'cardio-type'(el) { openCardioSheet(el.dataset.v); },
    'cardio-save'(el) {
      const type = el.dataset.t, T = C.CARDIO[type];
      let dist = C.parseNum($('#c-dist').value); const dur = C.parseDuration($('#c-dur').value);
      if (type === 'swim' && dist !== null) dist = dist / 1000;
      if (T.metric === 'distance' && !(dist > 0)) { toast('Bitte Distanz eintragen'); return; }
      if (T.metric === 'duration' && !(dur > 0)) { toast('Bitte Dauer eintragen'); return; }
      const dv = $('#c-date').value; const dt = dv ? new Date(dv + 'T12:00').getTime() : now();
      C.logCardio(S, { type, distance: dist, duration: dur, note: $('#c-note').value.trim(), date: dt }, now());
      save(); closeSheet(); toast('Cardio gespeichert'); render();
    },

    // Plan
    'ex-up'(el) { const d = S.days[+el.dataset.d], i = +el.dataset.i; if (i > 0) { const l = d.exerciseIds; [l[i - 1], l[i]] = [l[i], l[i - 1]]; save(); render(); } },
    'ex-down'(el) { const d = S.days[+el.dataset.d], i = +el.dataset.i, l = d.exerciseIds; if (i < l.length - 1) { [l[i + 1], l[i]] = [l[i], l[i + 1]]; save(); render(); } },
    'ex-edit'(el) {
      const e = S.exercises[el.dataset.id];
      sheet(exerciseForm(e, 'Übung bearbeiten') + '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="ex-save" data-id="' + e.id + '">Speichern</button></div><div class="actions"><button class="btn ghost" data-a="ex-replace" data-id="' + e.id + '" data-d="' + el.dataset.d + '">Ersetzen</button><button class="btn ghost" data-a="ex-archive" data-id="' + e.id + '">Archivieren</button></div>');
    },
    'ex-save'(el) { const e = S.exercises[el.dataset.id]; if (!readExerciseForm(e)) return; e.suggested = false; save(); closeSheet(); render(); },
    'ex-replace'(el) {
      const old = S.exercises[el.dataset.id];
      const tmp = Object.assign({}, old, { name: '', note: '' });
      sheet(exerciseForm(tmp, 'Ersetzen: ' + old.name, '<p class="small muted">Die neue Übung übernimmt den Platz im Plan. „' + esc(old.name) + '“ wird archiviert – ihr Verlauf bleibt erhalten.</p>') + '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="ex-replace-do" data-id="' + old.id + '">Ersetzen</button></div>');
    },
    'ex-replace-do'(el) {
      const old = S.exercises[el.dataset.id];
      const ne = { id: C.uid('e'), name: '', equip: old.equip, sets: old.sets, repMin: old.repMin, repMax: old.repMax, rest: old.rest, step: old.step, note: '', archived: false, suggested: false };
      if (!readExerciseForm(ne)) return;
      S.exercises[ne.id] = ne; old.archived = true;
      S.days.forEach((d) => { d.exerciseIds = d.exerciseIds.map((id) => (id === old.id ? ne.id : id)); });
      save(); closeSheet(); toast('Ersetzt'); render();
    },
    async 'ex-archive'(el) {
      const e = S.exercises[el.dataset.id]; closeSheet();
      if (await confirmBox('„' + e.name + '“ archivieren?', 'Die Übung verschwindet aus dem Plan. Der Verlauf bleibt erhalten und du kannst sie zurückholen.', 'Archivieren')) {
        e.archived = true; S.days.forEach((d) => { d.exerciseIds = d.exerciseIds.filter((id) => id !== e.id); }); save(); render();
      }
    },
    'ex-restore'(el) {
      const e = S.exercises[el.dataset.id];
      sheet('<h3>„' + esc(e.name) + '“ zurückholen</h3><div class="list">' + S.days.map((d, i) => '<button class="li" data-a="ex-restore-to" data-id="' + e.id + '" data-d="' + i + '">' + esc(d.name) + '</button>').join('') + '</div>');
    },
    'ex-restore-to'(el) { const e = S.exercises[el.dataset.id]; e.archived = false; S.days[+el.dataset.d].exerciseIds.push(e.id); save(); closeSheet(); render(); },
    'ex-add'(el) {
      const di = +el.dataset.d, used = S.days[di].exerciseIds.map((id) => S.exercises[id] && S.exercises[id].lib);
      let h = '<h3>Übung hinzufügen</h3><div class="eyebrow">Aus der Bibliothek · mit Animation</div>';
      LIB.GROUPS.forEach((g) => {
        const items = LIB.LIST.filter((l) => l.primary[0] === g);
        if (!items.length) return;
        h += '<h2 style="margin-top:16px">' + esc(g) + '</h2><div class="list">' + items.map((l) => '<div class="li"><button class="grow" style="text-align:left" data-a="info" data-ctx="lib" data-lib="' + l.key + '" data-day="' + S.days[di].id + '"><div class="t serif">' + esc(l.name) + '</div><div class="s">' + esc(C.EQUIP[l.equip]) + ' · ' + esc(l.primary.concat(l.secondary).join(', ')) + '</div></button>' + (used.indexOf(l.key) >= 0 ? '<span class="badge">drin</span>' : '<button class="btn sm ghost" data-a="sugg-add" data-key="' + l.key + '" data-day="' + S.days[di].id + '">+</button>') + '</div>').join('') + '</div>';
      });
      const tmp = { name: '', equip: 'machine', sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '', lib: null };
      h += '<details class="card" style="margin-top:16px"><summary>Eigene Übung anlegen</summary>' + exerciseForm(tmp, '').replace('<h3></h3>', '') + '<div class="actions"><button class="btn primary" data-a="ex-add-do" data-d="' + di + '">Hinzufügen</button></div></details>';
      const own = Object.values(S.exercises).filter((e) => S.days[di].exerciseIds.indexOf(e.id) < 0 && !e.lib).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (own.length) h += '<h2>Deine eigenen Übungen</h2><div class="list">' + own.map((e) => '<button class="li" data-a="ex-add-lib" data-id="' + e.id + '" data-d="' + di + '"><div class="grow"><div class="t">' + esc(e.name) + (e.archived ? ' <span class="badge">archiviert</span>' : '') + '</div></div>+</button>').join('') + '</div>';
      h += '<div class="actions"><button class="btn ghost" data-a="close">Schließen</button></div>';
      sheet(h);
    },
    'ex-add-do'(el) { const ne = { id: C.uid('e'), name: '', equip: 'machine', sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '', archived: false, suggested: false, lib: null }; if (!readExerciseForm(ne)) return; S.exercises[ne.id] = ne; S.days[+el.dataset.d].exerciseIds.push(ne.id); save(); closeSheet(); render(); },
    'ex-add-lib'(el) { const e = S.exercises[el.dataset.id]; e.archived = false; S.days[+el.dataset.d].exerciseIds.push(e.id); save(); closeSheet(); render(); },
    'day-add'() { S.days.push({ id: C.uid('d'), name: 'Tag ' + (S.days.length + 1), exerciseIds: [] }); save(); render(); },
    'day-edit'(el) {
      const di = +el.dataset.d, d = S.days[di];
      sheet('<h3>Tag bearbeiten</h3><div class="field"><label>Name</label><input id="d-name" value="' + esc(d.name) + '" maxlength="40"></div><div class="grid2"><button class="btn ghost" data-a="day-move" data-d="' + di + '" data-dir="-1"' + (di === 0 ? ' disabled' : '') + '>↑ früher</button><button class="btn ghost" data-a="day-move" data-d="' + di + '" data-dir="1"' + (di === S.days.length - 1 ? ' disabled' : '') + '>↓ später</button></div><div class="actions"><button class="btn ghost" data-a="day-next" data-d="' + di + '">Als nächstes Training</button></div><div class="actions"><button class="btn danger" data-a="day-del" data-d="' + di + '">Tag löschen</button><button class="btn primary" data-a="day-save" data-d="' + di + '">Speichern</button></div>');
    },
    'day-save'(el) { const d = S.days[+el.dataset.d], n = $('#d-name').value.trim(); if (n) d.name = n; save(); closeSheet(); render(); },
    'day-move'(el) { const i = +el.dataset.d, j = i + +el.dataset.dir; if (j < 0 || j >= S.days.length) return; const nd = C.nextDay(S); [S.days[i], S.days[j]] = [S.days[j], S.days[i]]; if (nd) S.rotation.nextDayIndex = S.days.indexOf(nd); save(); closeSheet(); render(); },
    'day-next'(el) { S.rotation.nextDayIndex = +el.dataset.d; save(); closeSheet(); toast('Nächstes Training geändert'); render(); },
    async 'day-del'(el) {
      const i = +el.dataset.d, d = S.days[i]; closeSheet();
      if (await confirmBox('„' + d.name + '“ löschen?', 'Der Tag wird entfernt. Übungen und Verlauf bleiben im Archiv erhalten.', 'Löschen', true)) {
        const nd = C.nextDay(S);
        d.exerciseIds.forEach((id) => { if (!S.days.some((x, k) => k !== i && x.exerciseIds.indexOf(id) >= 0)) S.exercises[id].archived = true; });
        S.days.splice(i, 1);
        S.rotation.nextDayIndex = Math.max(0, nd && nd.id !== d.id ? S.days.indexOf(nd) : Math.min(i, S.days.length - 1));
        save(); render();
      }
    },

    // Übungsvorschläge & Bibliothek
    info(el) { openInfo({ ctx: el.dataset.ctx, exId: el.dataset.id, lib: el.dataset.lib, dayId: el.dataset.day, focus: el.dataset.focus }); },
    'alt-play'(el) { if (stopAlt) stopAlt(); const box = el.querySelector('.mini-anim') || el; stopAlt = AN.play(box, AN.forEntry(LIB.BY[el.dataset.key])); box.querySelector('svg').setAttribute('class', 'figmini'); },
    'swap-today'(el) {
      const cur = curEx(), key = el.dataset.key;
      C.swapInSession(S, S.active.cur, key, false, now()); save(); closeSheet(); ui.sel = {}; render();
      toast('Heute: ' + LIB.BY[key].name + ' statt ' + cur.name);
    },
    async 'swap-perm'(el) {
      const cur = curEx(), key = el.dataset.key; closeSheet();
      if (!(await confirmBox('Dauerhaft ersetzen?', '„' + cur.name + '“ wird im Plan durch „' + LIB.BY[key].name + '“ ersetzt und archiviert. Der Verlauf bleibt erhalten.', 'Ersetzen'))) return;
      C.swapInSession(S, S.active.cur, key, true, now()); save(); ui.sel = {}; render(); toast('Im Plan ersetzt');
    },
    async 'plan-replace'(el) {
      const old = S.exercises[el.dataset.id], key = el.dataset.key; closeSheet();
      if (!(await confirmBox('„' + old.name + '“ ersetzen?', 'Neu im Plan: „' + LIB.BY[key].name + '“ mit denselben Sätzen, Wiederholungen und Pausen. Die alte Übung wird archiviert, ihr Verlauf bleibt.', 'Ersetzen'))) return;
      C.replaceInPlan(S, old.id, key); save(); render(); toast('Ersetzt');
    },
    'sugg-add'(el) {
      const key = el.dataset.key, d = S.days.find((x) => x.id === el.dataset.day) || S.days[0];
      if (!d) { toast('Lege zuerst einen Trainingstag an'); return; }
      C.addFromLib(S, key, d.id); save(); closeSheet(); render(); toast(LIB.BY[key].name + ' → ' + d.name);
    },
    'sugg-set'(el) { const e = C.addSetToExercise(S, el.dataset.id); save(); render(); toast(e.name + ': jetzt ' + e.sets + ' Sätze'); },

    // Einstellungen / Daten
    'plate-toggle'(el) {
      const v = +el.dataset.v, L = S.settings.plates.list, i = L.indexOf(v);
      if (i >= 0) L.splice(i, 1); else L.push(v);
      L.sort((a, b) => b - a); save(); render();
    },
    'month-nav'(el) {
      const m = ui.month; let mm = m.m + +el.dataset.dir, yy = m.y;
      if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; }
      ui.month = { y: yy, m: mm }; render();
    },
    'sound-test'() { audioUnlock(); setTimeout(() => { beep(); flash(); }, 60); },
    export() { exportData(); },
    import() { $('#import-file').value = ''; $('#import-file').click(); },
    async wipe() {
      if (await confirmBox('Wirklich alle Daten löschen?', 'Plan, Einheiten, Cardio und Einstellungen werden auf den Ausgangszustand zurückgesetzt. Ohne Export ist das endgültig.', 'Alles löschen', true)) {
        S = C.defaultState(now()); save(); wakeOff(); view = 'home'; render(); toast('Alle Daten gelöscht');
      }
    }
  };

  function openCardioSheet(type) {
    const T = C.CARDIO[type], sug = C.cardioSuggest(S, type, now());
    const d = new Date(), dv = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    sheet('<h3>Cardio eintragen</h3><div class="seg">' + Object.keys(C.CARDIO).map((k) => '<button data-a="cardio-type" data-v="' + k + '" class="' + (k === type ? 'on' : '') + '">' + C.CARDIO[k].label + '</button>').join('') + '</div>' +
      '<div class="banner info" style="margin-bottom:12px">' + (sug.target !== null ? '<b>Ziel: ' + C.fmtMetric(sug.target, type) + '</b>' : '') + esc(sug.reason) + '</div>' +
      '<div class="grid2"><div class="field"><label>' + (type === 'swim' ? 'Distanz (m)' : 'Distanz (km)') + (T.metric === 'distance' ? '' : ' – optional') + '</label><input id="c-dist" inputmode="decimal" data-c="cardio-calc" placeholder="' + (type === 'swim' ? 'z. B. 1000' : 'z. B. 6,2') + '"></div><div class="field"><label>Zeit (mm:ss oder h:mm:ss)' + (T.metric === 'duration' ? '' : ' – optional') + '</label><input id="c-dur" inputmode="numeric" data-c="cardio-calc" placeholder="z. B. 34:30"></div></div>' +
      '<div class="small muted" id="c-pace" style="margin:-4px 2px 10px"></div>' +
      '<div class="grid2"><div class="field"><label>Datum</label><input id="c-date" type="date" value="' + dv + '"></div><div class="field"><label>Notiz</label><input id="c-note" maxlength="120" placeholder="optional"></div></div>' +
      '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="cardio-save" data-t="' + type + '">Speichern</button></div>');
  }
  function updateCardioPace() {
    const btn = $('[data-a=cardio-save]'); if (!btn) return;
    const type = btn.dataset.t; let dist = C.parseNum($('#c-dist').value); const dur = C.parseDuration($('#c-dur').value);
    if (type === 'swim' && dist) dist /= 1000;
    const p = C.pace({ distance: dist, duration: dur }, type);
    $('#c-pace').textContent = p ? 'Pace: ' + p : '';
  }

  function openSessionEditor(id) {
    const s = S.sessions.find((x) => x.id === id); if (!s) return;
    let h = '<h3>' + esc(s.dayName) + '</h3><div class="muted small" style="margin-bottom:12px">' + C.fmtDateLong(s.start) + ', ' + C.fmtTime(s.start) + '–' + C.fmtTime(s.end) + (s.deload ? ' · Deload' : '') + '</div>';
    s.exercises.forEach((e, ei) => {
      h += '<div style="margin-bottom:12px"><b>' + esc(e.name) + '</b>' + (e.note ? '<div class="small muted">Notiz: ' + esc(e.note) + '</div>' : '') + '<div class="tiny muted" style="margin:4px 0">kg · Wdh. · Aufwärmsatz</div>';
      e.sets.forEach((st, si) => { h += '<div class="editset" data-ei="' + ei + '" data-si="' + si + '"><span class="muted">' + (si + 1) + '</span><input type="text" inputmode="decimal" class="num" data-f="w" value="' + wDisp(st.w) + '" aria-label="Gewicht"><input type="text" inputmode="numeric" class="num" data-f="r" value="' + st.r + '" aria-label="Wiederholungen"><label class="w"><input type="checkbox" data-f="warm"' + (st.warmup ? ' checked' : '') + '>W</label><button class="iconbtn" data-a="se-delset" aria-label="Satz löschen">×</button></div>'; });
      h += '</div>';
    });
    h += '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="se-save" data-id="' + s.id + '">Speichern</button></div><div class="actions"><button class="btn danger" data-a="se-del" data-id="' + s.id + '" data-testid="se-del">Einheit löschen</button></div>';
    sheet(h);
  }
  function saveSessionEditor(id) {
    const s = S.sessions.find((x) => x.id === id); if (!s) return;
    const rows = Array.from(document.querySelectorAll('.editset'));
    const next = s.exercises.map(() => []);
    rows.forEach((r) => {
      const ei = +r.dataset.ei, si = +r.dataset.si, old = s.exercises[ei].sets[si];
      const w = C.parseNum(r.querySelector('[data-f=w]').value), rep = C.parseNum(r.querySelector('[data-f=r]').value);
      next[ei].push({ w: w === null ? 0 : Math.max(0, w), r: rep === null ? 0 : Math.max(0, Math.round(rep)), rir: old.rir, warmup: r.querySelector('[data-f=warm]').checked });
    });
    s.exercises.forEach((e, i) => { e.sets = next[i]; });
    s.exercises = s.exercises.filter((e) => e.sets.length || e.note);
    save(); closeSheet(); toast('Einheit korrigiert'); render();
  }

  // ================= Export / Import =================
  async function exportData() {
    const d = new Date();
    const name = 'herakles-backup-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.json';
    const payload = { app: 'herakles', version: VERSION, exportedAt: new Date().toISOString(), data: S };
    const text = JSON.stringify(payload, null, 1);
    const file = new File([text], name, { type: 'application/json' });
    let ok = false;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Herakles-Backup' });
        ok = true;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') { toast('Export abgebrochen'); return; }
    }
    if (!ok) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    S.meta.lastExportAt = now(); save(); render(); toast('Backup erstellt: ' + name);
  }
  async function importFile(file) {
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { toast('Datei ist kein gültiges JSON'); return; }
    const err = C.validateImport(obj); if (err) { toast(err); return; }
    const data = (obj.app === 'herakles' || obj.app === 'satzwerk') ? obj.data : obj;
    const n = (data.sessions || []).length, c = (data.cardio || []).length;
    if (!(await confirmBox('Backup importieren?', 'Die Datei enthält ' + n + ' Einheiten und ' + c + ' Cardio-Einträge' + (obj.exportedAt ? ' (Stand ' + C.fmtDateLong(Date.parse(obj.exportedAt)) + ')' : '') + '. Deine aktuellen Daten werden dabei ersetzt.', 'Importieren'))) return;
    S = C.migrate(data); if (!S.meta.lastExportAt) S.meta.lastExportAt = now();
    save(); view = S.active ? 'gym' : 'home'; render(); toast('Import abgeschlossen');
  }

  // ================= Ereignisse =================
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.a];
    if (fn) fn(el, ev);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target, c = el.dataset && el.dataset.c;
    if (!c) return;
    if (c === 'w' || c === 'r') {
      const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return;
      const v = C.parseNum(el.value);
      if (c === 'w') { const old = s.w; s.w = v === null ? null : Math.max(0, v); carryWeight(e, i, old); }
      else s.r = v === null ? 0 : Math.max(0, Math.round(v));
      save(); render();
    } else if (c === 'ex-note') { curEx().note = el.value; save(); }
    else if (c === 'hist-ex') { ui.histEx = el.value; render(); }
    else if (c === 'theme') { S.settings.theme = el.value; save(); render(); }
    else if (c === 'cardioType') { S.settings.cardioType = el.value; save(); }
    else if (c === 'settog') { setByPath(S.settings, el.dataset.p, el.checked); save(); if (el.dataset.p === 'keepAwake' && !el.checked) wakeOff(); setAudioSession(); }
    else if (c === 'setnum') {
      let v = C.parseNum(el.value); if (v === null || v < 0) { render(); return; }
      const p = el.dataset.p;
      if (/setsFactor|weightFactor|deloadFactor/.test(p)) v = Math.min(100, v) / 100;
      if (p === 'cardio.caps.swim') v = v / 1000;
      setByPath(S.settings, p, v); save();
    }
  });
  document.addEventListener('toggle', (ev) => { if (ev.target && ev.target.dataset && ev.target.dataset.testid === 'advanced') ui.advOpen = ev.target.open; }, true);
  document.addEventListener('input', (ev) => { if (ev.target.dataset && ev.target.dataset.c === 'cardio-calc') updateCardioPace(); });
  document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.stepper input')) setTimeout(() => ev.target.select(), 0); });
  $('#import-file').addEventListener('change', (ev) => { const f = ev.target.files && ev.target.files[0]; if (f) importFile(f); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (S && S.active) { wakeOn(); tick(); }
      if (actx && actx.state !== 'running') actx.resume().catch(() => {});
    } else if (S) save();
  });
  window.addEventListener('pagehide', () => { if (S) save(); });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S && S.settings.theme === 'system') applyTheme(); });

  // ================= Service Worker =================
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const watch = (w) => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { updateReady = w; if (view !== 'gym') render(); } }); };
      if (reg.waiting && navigator.serviceWorker.controller) { updateReady = reg.waiting; }
      reg.addEventListener('updatefound', () => watch(reg.installing));
    }).catch(() => { /* ohne SW läuft die App trotzdem, nur nicht offline */ });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateReady && !reloaded) { reloaded = true; location.reload(); } });
  }

  // ================= Start =================
  async function init() {
    S = await load();
    applyTheme(); setAudioSession();
    if (S.active) {
      view = 'gym';
      const t = S.active.timer;
      if (t && !t.fired && t.endsAt < now() - 5000) t.fired = true; // Pause lief ab, während die App zu war
    }
    render();
    if (S.active) toast('Einheit fortgesetzt');
    save();
    tickT = setInterval(() => { if (view === 'gym' && S.active) tick(); }, 250);
    registerSW();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
    window.Herakles = { version: VERSION, state: () => S, _save: save, _render: render }; // _save/_render nur für automatische Tests
  }
  init();
})();
