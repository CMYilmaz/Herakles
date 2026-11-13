/* Herakles – Grundlagen: Zustand, Speicher, Fenster, Ton, Wachhalten. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI = {}; // gemeinsamer Namensraum aller Oberflächen-Dateien

  const C = window.Core, LIB = window.Library, AN = window.Anim;
  const VERSION = '3.2.0';
  // Auszeichnungsschrift (auf dem iPhone vorinstalliert) und Hilfen dazu
  const DISP = '"DIN Condensed", "Barlow Condensed", "Avenir Next Condensed", "Arial Narrow", sans-serif';
  // Große Titel so skalieren, dass das längste Wort in eine Zeile passt
  function fitSize(text, max, min) {
    const longest = String(text).split(/\s+/).reduce((m, w) => Math.max(m, w.length), 1);
    const avail = Math.min(window.innerWidth || 390, 560) - 44;
    return Math.max(min, Math.min(max, Math.floor(avail / (longest * 0.5))));
  }
  // Schmale Schriften sitzen je nach Gerät nicht mittig in der Zeile: Versatz messen und per CSS-Variable ausgleichen
  function applyFontMetrics() {
    try {
      const g = document.createElement('canvas').getContext('2d');
      g.font = '700 100px ' + DISP;
      const m = g.measureText('H0');
      if (m.fontBoundingBoxAscent === undefined) return;
      const off = (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent - m.actualBoundingBoxAscent) / 200; // > 0: sitzt zu tief
      const v = Math.max(-0.3, Math.min(0.3, -2 * off));
      document.documentElement.style.setProperty('--dpt', (v > 0 ? v : 0).toFixed(3));
      document.documentElement.style.setProperty('--dpb', (v < 0 ? -v : 0).toFixed(3));
    } catch (e) { /* ohne Ausgleich */ }
  }
  // Linien-Icons (eigene, ohne Bibliothek)
  const ICON = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 9.5h16M8.5 3.5v3.5M15.5 3.5v3.5"/><circle cx="12" cy="14.5" r="1.4" class="fill"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16"/><path d="M5 16l4.2-4.6 3.4 2.8L19 7"/><path d="M15.4 7H19v3.6"/></svg>',
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1.2" class="fill"/><circle cx="5" cy="12" r="1.2" class="fill"/><circle cx="5" cy="17" r="1.2" class="fill"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>'
  };
  // Häkchen mit kleinem Lorbeerblatt (Status „erledigt“)
  const CHECK = '<svg class="lck" viewBox="0 0 24 24" aria-hidden="true"><path class="lf" d="M3.6 13.6c2.4-1.3 4.6-.6 5.7 1.3-2.4 1.3-4.6.6-5.7-1.3z"/><path class="ln" d="M7.6 12.6l3.3 3.4 7.6-8.6"/></svg>';
  const SPRIG = '<svg class="sprig" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V8" class="st"/><path d="M12 9c-3.4-.4-5.2-2.6-5-5.6 3.2.2 5 2.4 5 5.6zM12 13c3.4-.4 5.2-2.6 5-5.6-3.2.2-5 2.4-5 5.6zM12 17c-3.2-.4-5-2.4-4.8-5.2 3 .2 4.8 2.2 4.8 5.2z"/></svg>';
  const EMPTY_ART = '<svg class="empty-art" viewBox="8 8 84 88" aria-hidden="true"><g fill="currentColor"><ellipse cx="39.99" cy="85.89" rx="4.5" ry="1.85" transform="rotate(-192.0 39.99 85.89)"/><ellipse cx="37.74" cy="80.23" rx="4.5" ry="1.85" transform="rotate(-129.3 37.74 80.23)"/><ellipse cx="32.13" cy="82.59" rx="4.5" ry="1.85" transform="rotate(-178.5 32.13 82.59)"/><ellipse cx="31.26" cy="76.56" rx="4.5" ry="1.85" transform="rotate(-115.8 31.26 76.56)"/><ellipse cx="25.24" cy="77.55" rx="4.5" ry="1.85" transform="rotate(-165.0 25.24 77.55)"/><ellipse cx="25.81" cy="71.48" rx="4.5" ry="1.85" transform="rotate(-102.3 25.81 71.48)"/><ellipse cx="19.73" cy="71.04" rx="4.5" ry="1.85" transform="rotate(-151.5 19.73 71.04)"/><ellipse cx="21.69" cy="65.27" rx="4.5" ry="1.85" transform="rotate(-88.8 21.69 65.27)"/><ellipse cx="15.89" cy="63.42" rx="4.5" ry="1.85" transform="rotate(-138.0 15.89 63.42)"/><ellipse cx="19.14" cy="58.27" rx="4.5" ry="1.85" transform="rotate(-75.3 19.14 58.27)"/><ellipse cx="13.93" cy="55.11" rx="4.5" ry="1.85" transform="rotate(-124.5 13.93 55.11)"/><ellipse cx="18.30" cy="50.86" rx="4.5" ry="1.85" transform="rotate(-61.8 18.30 50.86)"/><ellipse cx="13.97" cy="46.58" rx="4.5" ry="1.85" transform="rotate(-111.0 13.97 46.58)"/><ellipse cx="19.21" cy="43.47" rx="4.5" ry="1.85" transform="rotate(-48.3 19.21 43.47)"/><ellipse cx="16.00" cy="38.29" rx="4.5" ry="1.85" transform="rotate(-97.5 16.00 38.29)"/><ellipse cx="21.82" cy="36.49" rx="4.5" ry="1.85" transform="rotate(-34.8 21.82 36.49)"/><ellipse cx="19.91" cy="30.70" rx="4.5" ry="1.85" transform="rotate(-84.0 19.91 30.70)"/><ellipse cx="25.99" cy="30.31" rx="4.5" ry="1.85" transform="rotate(-21.3 25.99 30.31)"/><ellipse cx="60.01" cy="85.89" rx="4.5" ry="1.85" transform="rotate(-348.0 60.01 85.89)"/><ellipse cx="62.26" cy="80.23" rx="4.5" ry="1.85" transform="rotate(-410.8 62.26 80.23)"/><ellipse cx="67.87" cy="82.59" rx="4.5" ry="1.85" transform="rotate(-361.5 67.87 82.59)"/><ellipse cx="68.74" cy="76.56" rx="4.5" ry="1.85" transform="rotate(-424.3 68.74 76.56)"/><ellipse cx="74.76" cy="77.55" rx="4.5" ry="1.85" transform="rotate(-375.0 74.76 77.55)"/><ellipse cx="74.19" cy="71.48" rx="4.5" ry="1.85" transform="rotate(-437.8 74.19 71.48)"/><ellipse cx="80.27" cy="71.04" rx="4.5" ry="1.85" transform="rotate(-388.5 80.27 71.04)"/><ellipse cx="78.31" cy="65.27" rx="4.5" ry="1.85" transform="rotate(-451.3 78.31 65.27)"/><ellipse cx="84.11" cy="63.42" rx="4.5" ry="1.85" transform="rotate(-402.0 84.11 63.42)"/><ellipse cx="80.86" cy="58.27" rx="4.5" ry="1.85" transform="rotate(-464.8 80.86 58.27)"/><ellipse cx="86.07" cy="55.11" rx="4.5" ry="1.85" transform="rotate(-415.5 86.07 55.11)"/><ellipse cx="81.70" cy="50.86" rx="4.5" ry="1.85" transform="rotate(-478.3 81.70 50.86)"/><ellipse cx="86.03" cy="46.58" rx="4.5" ry="1.85" transform="rotate(-429.0 86.03 46.58)"/><ellipse cx="80.79" cy="43.47" rx="4.5" ry="1.85" transform="rotate(-491.8 80.79 43.47)"/><ellipse cx="84.00" cy="38.29" rx="4.5" ry="1.85" transform="rotate(-442.5 84.00 38.29)"/><ellipse cx="78.18" cy="36.49" rx="4.5" ry="1.85" transform="rotate(-505.3 78.18 36.49)"/><ellipse cx="80.09" cy="30.70" rx="4.5" ry="1.85" transform="rotate(-456.0 80.09 30.70)"/><ellipse cx="74.01" cy="30.31" rx="4.5" ry="1.85" transform="rotate(-518.8 74.01 30.31)"/><path d="M40.63 83.68 A34 34 0 0 1 21.81 31.99" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M59.37 83.68 A34 34 0 0 0 78.19 31.99" fill="none" stroke="currentColor" stroke-width=".7"/></g><path d="M46.4 87.6 L50 85.2 L53.6 87.6 L52.4 91 L50 89.3 L47.6 91 Z" fill="var(--ochre, #80612a)"/></svg>';
  // Markenzeichen: Lorbeerkranz mit H (Farben folgen dem Thema)
  const EMBLEM = '<svg class="emblem" viewBox="8 8 84 88" aria-hidden="true"><g fill="currentColor"><ellipse cx="39.99" cy="85.89" rx="4.5" ry="1.85" transform="rotate(-192.0 39.99 85.89)"/><ellipse cx="37.74" cy="80.23" rx="4.5" ry="1.85" transform="rotate(-129.3 37.74 80.23)"/><ellipse cx="32.13" cy="82.59" rx="4.5" ry="1.85" transform="rotate(-178.5 32.13 82.59)"/><ellipse cx="31.26" cy="76.56" rx="4.5" ry="1.85" transform="rotate(-115.8 31.26 76.56)"/><ellipse cx="25.24" cy="77.55" rx="4.5" ry="1.85" transform="rotate(-165.0 25.24 77.55)"/><ellipse cx="25.81" cy="71.48" rx="4.5" ry="1.85" transform="rotate(-102.3 25.81 71.48)"/><ellipse cx="19.73" cy="71.04" rx="4.5" ry="1.85" transform="rotate(-151.5 19.73 71.04)"/><ellipse cx="21.69" cy="65.27" rx="4.5" ry="1.85" transform="rotate(-88.8 21.69 65.27)"/><ellipse cx="15.89" cy="63.42" rx="4.5" ry="1.85" transform="rotate(-138.0 15.89 63.42)"/><ellipse cx="19.14" cy="58.27" rx="4.5" ry="1.85" transform="rotate(-75.3 19.14 58.27)"/><ellipse cx="13.93" cy="55.11" rx="4.5" ry="1.85" transform="rotate(-124.5 13.93 55.11)"/><ellipse cx="18.30" cy="50.86" rx="4.5" ry="1.85" transform="rotate(-61.8 18.30 50.86)"/><ellipse cx="13.97" cy="46.58" rx="4.5" ry="1.85" transform="rotate(-111.0 13.97 46.58)"/><ellipse cx="19.21" cy="43.47" rx="4.5" ry="1.85" transform="rotate(-48.3 19.21 43.47)"/><ellipse cx="16.00" cy="38.29" rx="4.5" ry="1.85" transform="rotate(-97.5 16.00 38.29)"/><ellipse cx="21.82" cy="36.49" rx="4.5" ry="1.85" transform="rotate(-34.8 21.82 36.49)"/><ellipse cx="19.91" cy="30.70" rx="4.5" ry="1.85" transform="rotate(-84.0 19.91 30.70)"/><ellipse cx="25.99" cy="30.31" rx="4.5" ry="1.85" transform="rotate(-21.3 25.99 30.31)"/><ellipse cx="60.01" cy="85.89" rx="4.5" ry="1.85" transform="rotate(-348.0 60.01 85.89)"/><ellipse cx="62.26" cy="80.23" rx="4.5" ry="1.85" transform="rotate(-410.8 62.26 80.23)"/><ellipse cx="67.87" cy="82.59" rx="4.5" ry="1.85" transform="rotate(-361.5 67.87 82.59)"/><ellipse cx="68.74" cy="76.56" rx="4.5" ry="1.85" transform="rotate(-424.3 68.74 76.56)"/><ellipse cx="74.76" cy="77.55" rx="4.5" ry="1.85" transform="rotate(-375.0 74.76 77.55)"/><ellipse cx="74.19" cy="71.48" rx="4.5" ry="1.85" transform="rotate(-437.8 74.19 71.48)"/><ellipse cx="80.27" cy="71.04" rx="4.5" ry="1.85" transform="rotate(-388.5 80.27 71.04)"/><ellipse cx="78.31" cy="65.27" rx="4.5" ry="1.85" transform="rotate(-451.3 78.31 65.27)"/><ellipse cx="84.11" cy="63.42" rx="4.5" ry="1.85" transform="rotate(-402.0 84.11 63.42)"/><ellipse cx="80.86" cy="58.27" rx="4.5" ry="1.85" transform="rotate(-464.8 80.86 58.27)"/><ellipse cx="86.07" cy="55.11" rx="4.5" ry="1.85" transform="rotate(-415.5 86.07 55.11)"/><ellipse cx="81.70" cy="50.86" rx="4.5" ry="1.85" transform="rotate(-478.3 81.70 50.86)"/><ellipse cx="86.03" cy="46.58" rx="4.5" ry="1.85" transform="rotate(-429.0 86.03 46.58)"/><ellipse cx="80.79" cy="43.47" rx="4.5" ry="1.85" transform="rotate(-491.8 80.79 43.47)"/><ellipse cx="84.00" cy="38.29" rx="4.5" ry="1.85" transform="rotate(-442.5 84.00 38.29)"/><ellipse cx="78.18" cy="36.49" rx="4.5" ry="1.85" transform="rotate(-505.3 78.18 36.49)"/><ellipse cx="80.09" cy="30.70" rx="4.5" ry="1.85" transform="rotate(-456.0 80.09 30.70)"/><ellipse cx="74.01" cy="30.31" rx="4.5" ry="1.85" transform="rotate(-518.8 74.01 30.31)"/><path d="M40.63 83.68 A34 34 0 0 1 21.81 31.99" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M59.37 83.68 A34 34 0 0 0 78.19 31.99" fill="none" stroke="currentColor" stroke-width=".7"/></g><path d="M46.4 87.6 L50 85.2 L53.6 87.6 L52.4 91 L50 89.3 L47.6 91 Z" fill="var(--ochre, #80612a)"/><g transform="translate(50 50) scale(.74) translate(-50 -50)"><g fill="currentColor"><rect x="36.5" y="34" width="5" height="32"/><rect x="58.5" y="34" width="5" height="32"/><rect x="41.5" y="48.6" width="17" height="2.8"/><rect x="33.5" y="32.4" width="11" height="2.2"/><rect x="55.5" y="32.4" width="11" height="2.2"/><rect x="33.5" y="65.4" width="11" height="2.2"/><rect x="55.5" y="65.4" width="11" height="2.2"/></g></g></svg>';
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => Date.now();

  HK.S = null;            // App-Zustand
  HK.view = 'home';
  let ui = { histTab: 'sessions', histEx: null, histMetric: 'weight', cardioType: null, sel: {}, planOpen: {}, showNote: {} };
  HK.updateReady = null;

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
    HK.S.meta.updatedAt = now();
    try {
      if (HK.S.active) { HK.S.active.updatedAt = now(); localStorage.setItem(LS_ACTIVE, JSON.stringify(HK.S.active)); }
      else localStorage.removeItem(LS_ACTIVE);
    } catch (e) { /* Speicher voll – IDB bleibt Hauptspeicher */ }
    if (idbOk) {
      idbPut('state', JSON.parse(JSON.stringify(HK.S))).catch(() => { idbOk = false; saveLS(); });
    } else saveLS();
  }
  function saveLS() { try { localStorage.setItem(LS_STATE, JSON.stringify(HK.S)); } catch (e) { toast('Speichern fehlgeschlagen – bitte Daten exportieren.'); } }
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
  HK.stopAnim = null; HK.lastCheck = 0; HK.lastCheckKey = '';
  // Schließen per ×, Hintergrund oder Wischen: offene Rückfragen gelten als „Nein“.
  function dismissSheet(opts) { if (HK.pendingConfirm) { HK.pendingConfirm(false); HK.pendingConfirm = null; } closeSheet(opts); }
  // Nach unten wischen schließt das Fenster: an der Griffleiste immer, im Inhalt, sobald er ganz oben steht.
  function initSheetDrag() {
    const root = $('#sheet-root');
    let st = null;
    const reset = () => {
      if (!st) return;
      const { sh, bg } = st; st = null;
      sh.style.transition = 'transform .22s cubic-bezier(.2,.7,.2,1)'; sh.style.transform = '';
      if (bg) { bg.style.transition = 'background-color .22s'; bg.style.backgroundColor = ''; }
      setTimeout(() => { sh.style.transition = ''; if (bg) bg.style.transition = ''; }, 240);
    };
    root.addEventListener('touchstart', (ev) => {
      const sh = ev.target.closest && ev.target.closest('.sheet');
      if (!sh || ev.touches.length !== 1 || ev.target.closest('input, textarea, select')) { st = null; return; }
      const t = ev.touches[0];
      st = { sh, bg: sh.parentElement, x0: t.clientX, y0: t.clientY, dy: 0, top: !!ev.target.closest('.sheet-top'), atTop: sh.scrollTop <= 0, on: false, ly: t.clientY, lt: ev.timeStamp, v: 0 };
    }, { passive: true });
    root.addEventListener('touchmove', (ev) => {
      if (!st) return;
      const t = ev.touches[0], dx = t.clientX - st.x0, dy = t.clientY - st.y0;
      if (!st.on) {
        // iOS entscheidet beim ersten Zug, ob gescrollt wird: Zug nach unten am oberen Rand sofort abfangen
        const canDrag = dy > 0 && Math.abs(dy) >= Math.abs(dx) && (st.top || (st.atTop && st.sh.scrollTop <= 0));
        if (canDrag && ev.cancelable) ev.preventDefault();
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || !(st.top || (st.atTop && st.sh.scrollTop <= 0))) { st = null; return; }
        st.on = true; st.y0 = t.clientY; st.sh.style.animation = 'none'; st.sh.style.transition = 'none';
      }
      ev.preventDefault();
      st.dy = Math.max(0, t.clientY - st.y0);
      const dt = ev.timeStamp - st.lt; if (dt > 0) st.v = (t.clientY - st.ly) / dt;
      st.ly = t.clientY; st.lt = ev.timeStamp;
      st.sh.style.transform = 'translateY(' + st.dy + 'px)';
      if (st.bg) st.bg.style.backgroundColor = 'rgba(8, 10, 8, ' + (0.6 * Math.max(0, 1 - st.dy / 400)).toFixed(3) + ')';
    }, { passive: false });
    const end = () => {
      if (!st) return;
      if (!st.on) { st = null; return; }
      const close = st.dy > Math.min(140, st.sh.offsetHeight * 0.25) || (st.dy > 24 && st.v > 0.5);
      if (close) { const y = st.dy; st = null; dismissSheet({ fromY: y }); } else reset();
    };
    root.addEventListener('touchend', end);
    root.addEventListener('touchcancel', reset);
  }
  function sheet(html, opts) {
    if (HK.stopAnim) { HK.stopAnim(); HK.stopAnim = null; }
    const root = $('#sheet-root'); sheetGen++;
    root.innerHTML = '<div class="sheet-bg" data-a="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-top"><div class="grab"></div><button class="sheet-x" data-a="sheet-dismiss" aria-label="Schließen">×</button></div>' + html + '</div></div>';
    if (opts && opts.onOpen) opts.onOpen(root);
  }
  let sheetGen = 0;
  function closeSheet(opts) {
    if (HK.stopAnim) { HK.stopAnim(); HK.stopAnim = null; }
    const root = $('#sheet-root'), bg = root.firstElementChild;
    const jd = ui.justDone; ui.justDone = null;
    if (!bg || HK.reduceMotion() || !bg.animate) { root.innerHTML = ''; return; }
    const g = ++sheetGen;
    bg.style.pointerEvents = 'none'; bg.removeAttribute('data-a');
    const sh = bg.querySelector('.sheet'); if (sh) sh.removeAttribute('role');
    const fromY = (opts && opts.fromY) || 0, dur = fromY ? 180 : 140;
    try {
      bg.animate([{ opacity: fromY ? Math.max(0, 1 - fromY / 400) : 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
      if (sh) sh.animate([{ transform: 'translateY(' + fromY + 'px)' }, { transform: fromY ? 'translateY(100%)' : 'translateY(24px)' }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
    } catch (e) { /* egal */ }
    setTimeout(() => { if (g === sheetGen && root.firstElementChild === bg) root.innerHTML = ''; if (jd) HK.spinDisc(jd); }, dur + 10);
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise((res) => {
      sheet('<h3>' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p><div class="actions"><button class="btn ghost" data-a="cf-no">Abbrechen</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-a="cf-yes">' + esc(okLabel || 'OK') + '</button></div>');
      HK.pendingConfirm = res;
    });
  }
  HK.pendingConfirm = null;
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
    const t = HK.S.settings.theme;
    const dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#111512' : '#f2ede2';
  }
  HK.actx = null; let fallbackUrl = null;
  function setAudioSession() {
    try { if (navigator.audioSession) navigator.audioSession.type = HK.S.settings.soundInSilentMode ? 'playback' : 'ambient'; } catch (e) { /* nicht unterstützt */ }
  }
  function audioUnlock() {
    if (!HK.S.settings.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (HK.actx && HK.actx.state !== 'running') { try { HK.actx.close(); } catch (e) { /* egal */ } HK.actx = null; }
      if (!HK.actx) { setAudioSession(); HK.actx = new AC(); }
      if (HK.actx.state !== 'running') HK.actx.resume().catch(() => {});
      // stiller Puls, damit iOS den Kontext freigibt
      const o = HK.actx.createOscillator(), g = HK.actx.createGain(); g.gain.value = 0.0001; o.connect(g).connect(HK.actx.destination); o.start(); o.stop(HK.actx.currentTime + 0.02);
    } catch (e) { HK.actx = null; }
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
    if (!HK.S.settings.sound) return;
    setAudioSession();
    try {
      if (HK.actx && HK.actx.state === 'running') {
        const t0 = HK.actx.currentTime + 0.02;
        [[0, 880, 0.16], [0.24, 880, 0.16], [0.48, 1320, 0.32]].forEach(([d, f, len]) => {
          const o = HK.actx.createOscillator(), g = HK.actx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.6, t0 + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len);
          o.connect(g).connect(HK.actx.destination); o.start(t0 + d); o.stop(t0 + d + len + 0.02);
        });
        return;
      }
    } catch (e) { /* weiter mit Fallback */ }
    try { if (!fallbackUrl) fallbackUrl = makeWav(); const a = new Audio(fallbackUrl); a.play().catch(() => {}); } catch (e) { /* kein Ton möglich */ }
  }
  function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

  let wakeLock = null, wakeState = 'off';
  async function wakeOn() {
    if (!HK.S.settings.keepAwake || !HK.S.active) return;
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
    el.textContent = !HK.S.settings.keepAwake ? 'Bildschirm-wach ist aus (Einstellungen)'
      : wakeState === 'on' ? 'Bildschirm bleibt an'
      : wakeState === 'unsupported' ? 'Bildschirm wach halten: auf diesem Gerät nicht verfügbar'
      : 'Bildschirm wach halten: nächster Tipp aktiviert es';
  }

  Object.assign(HK, { C, LIB, AN, VERSION, DISP, fitSize, applyFontMetrics, CHECK, SPRIG, EMPTY_ART, EMBLEM, $, esc, now, ui, save, load, toast,
    dismissSheet, initSheetDrag, sheet, closeSheet, confirmBox, haptic, wDisp, WD, WDL, applyTheme, setAudioSession, audioUnlock, beep, flash,
    wakeOn, wakeOff, updateWake });
})();
