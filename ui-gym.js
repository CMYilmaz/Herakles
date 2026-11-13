/* Herakles – Gym-Modus: Sätze, Eingabe, Pausentimer. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, fitSize, CHECK, $, esc, now, ui, save, wDisp, beep, flash, reduceMotion, flip } = HK;

  // ---------- Gym-Modus ----------
  function curEx() { const a = HK.S.active; a.cur = Math.max(0, Math.min(a.cur || 0, a.exercises.length - 1)); return a.exercises[a.cur]; }
  function selIdx(e) {
    const k = e.exId + '#' + HK.S.active.cur;
    if (ui.sel[k] !== undefined && ui.sel[k] < e.sets.length) return ui.sel[k];
    const i = e.sets.findIndex((s) => !s.done);
    return i < 0 ? -1 : i;
  }
  function renderGym() {
    const a = HK.S.active, e = curEx(), ex = HK.S.exercises[e.exId] || { name: e.name, equip: 'machine', sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '' };
    const wt = C.usesWeight(ex), sel = selIdx(e);
    const elapsed = C.fmtDuration((now() - a.start) / 1000);
    let h = '<div class="view gym"><div class="gymbar"><button class="btn sm ghost" data-a="ex-list" aria-label="Übungsliste">Übungen</button><div class="title"><b>' + esc(a.dayName) + (a.deload ? ', Deload' : '') + '</b><span class="num" id="elapsed">' + elapsed + '</span></div><button class="btn sm ghost" data-a="finish">Beenden</button></div>';
    h += '<div class="prog">' + a.exercises.map((x, i) => '<i class="' + (x.sets.length && x.sets.every((s) => s.done) ? 'done' : i === a.cur ? 'cur' : '') + '"></i>').join('') + '</div>';
    const libE = C.libOf(ex);
    const pi = C.ssPartnerIdx(a, a.cur);
    const ssLine = pi < 0 ? '' : '<div class="ssline" data-testid="ss-line"><b>Supersatz</b> mit ' + esc(a.exercises[pi].name) + (a.cur < pi ? ': nach dem Satz ohne Pause wechseln' : ': danach Pause') + '</div>';
    h += '<div class="exhead"><div class="eyebrow">Übung ' + (a.cur + 1) + ' von ' + a.exercises.length + (ex.suggested ? ', Vorschlag' : '') + (e.swappedFrom ? ', statt ' + esc(e.swappedFrom) : '') + '</div><h1 style="font-size:' + fitSize(e.name, 60, 34) + 'px"><span data-testid="ex-name">' + esc(e.name) + '</span>' + '<button class="info-dot" data-a="info" data-ctx="gym" data-id="' + e.exId + '" aria-label="Ausführung und Alternativen" data-testid="info-gym">i</button></h1><div class="exmeta">' + esc(C.EQUIP[ex.equip] || '') + ', ' + ex.sets + ' × ' + ex.repMin + '–' + ex.repMax + ', Pause ' + C.fmtDuration(ex.rest) + '</div>' + (ex.note ? '<div class="exmeta small" style="margin-top:4px">Notiz: ' + esc(ex.note) + '</div>' : '') + ssLine + '</div>';
    const L = e.sugg.last, unit = ex.equip === 'bwplus' ? ' +' : '';
    const tgt = e.sugg.reps || [];
    // groß: Gewicht (oder Wiederholungen bei Übungen ohne Gewicht), darunter die Wiederholungen
    const lastBig = L ? (wt ? unit + C.fmtKg(L.W) : C.repsLabel(L.reps)) : '–', lastSub = L && wt ? C.repsLabel(L.reps) + ' Wdh.' : '';
    const nowBig = wt ? (e.sugg.weight === null ? 'Gewicht?' : unit + C.fmtKg(e.sugg.weight)) : C.repsLabel(tgt), nowSub = wt ? 'Ziel ' + C.repsLabel(tgt) + ' Wdh.' : '';
    h += '<div class="sugg"><div class="box"><div class="k">Letztes Mal' + (L ? ', ' + C.fmtDate(L.date) : '') + '</div><div data-testid="last"><div class="v num">' + esc(lastBig) + '</div><div class="r num">' + esc(lastSub) + '</div></div></div><div class="box now"><div class="k">Heute</div><div data-testid="sugg"><div class="v num">' + esc(nowBig) + '</div><div class="r num">' + esc(nowSub) + '</div></div></div></div>';
    h += '<div class="why ' + esc(e.sugg.kind) + '" data-testid="why">' + esc(e.sugg.reason) + '</div>';
    if (e.sugg.kind === 'reduce' && libE) h += '<button class="btn sm ghost" style="margin:-4px 0 14px" data-a="info" data-ctx="gym" data-id="' + e.exId + '" data-focus="alts" data-testid="alts-btn">Alternativen ansehen</button>';
    h += '<div class="sets">';
    e.sets.forEach((s, i) => {
      const label = s.warmup ? 'W' : (e.sets.slice(0, i + 1).filter((x) => !x.warmup).length);
      if (i === sel) { h += renderEditor(e, ex, s, i, label); return; }
      const val = (wt ? (s.w === null || s.w === undefined ? '? kg' : unit + C.fmtKg(s.w)) + ' × ' : '') + (s.r || 0) + ' Wdh.' + (s.rir !== null && s.rir !== undefined ? ', R' + (s.rir >= 4 ? '4+' : s.rir) : '');
      h += '<button class="set' + (s.done ? ' done' : '') + (s.warmup ? ' warm' : '') + '" data-a="sel-set" data-i="' + i + '"><span class="n">' + label + '</span><span class="val num">' + esc(val) + '</span><span class="ck">' + (s.done ? CHECK : '') + '</span></button>';
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
    let h = '<div class="editor" data-testid="editor"><div class="lbl"><span>' + (s.warmup ? 'Aufwärmsatz' : 'Satz ' + label) + (s.done ? ', erledigt' : '') + '</span><span>' + (!s.warmup && tgt !== null ? 'Ziel ' + tgt + ' Wdh.' : '') + '</span></div>';
    const wl = ex.equip === 'bwplus' ? 'Zusatzgewicht, kg' : 'Gewicht' + (C.loadLabel(ex) ? ' ' + C.loadLabel(ex) : '') + ', kg';
    h += '<div class="steppers' + (wt ? '' : ' one') + '">';
    if (wt) h += '<div class="stepcol"><div class="slbl">' + wl + '</div><input class="num" inputmode="decimal" data-c="w" data-testid="w-input" aria-label="' + wl + '" value="' + wDisp(s.w) + '" placeholder="eintragen"><div class="stepper"><button data-a="w-" aria-label="Gewicht minus">−</button><button data-a="w+" aria-label="Gewicht plus">+</button></div></div>';
    h += '<div class="stepcol"><div class="slbl">' + (C.sidesMode(ex) === 'alt' ? 'Wdh. beider Seiten' : 'Wiederholungen') + '</div><input class="num" inputmode="numeric" data-c="r" data-testid="r-input" aria-label="Wiederholungen" value="' + (s.r || 0) + '"><div class="stepper"><button data-a="r-" aria-label="Wiederholungen minus">−</button><button data-a="r+" aria-label="Wiederholungen plus">+</button></div></div></div>';
    if ((ex.equip === 'bwplus' || ex.equip === 'bw') && HK.S.active.bw) {
      const bw = HK.S.active.bw, add = ex.equip === 'bwplus' ? (s.w || 0) : 0;
      h += '<div class="plates" data-testid="total-load">' + (ex.equip === 'bwplus' ? 'Gesamtlast: ' + C.fmtNum(bw) + ' + ' + C.fmtNum(add) + ' = ' + C.fmtKg(C.r2(bw + add)) : 'Körpergewicht: ' + C.fmtKg(bw)) + '</div>';
    }
    const lm = C.loadMode(ex), bar = HK.S.settings.plates.bar;
    if (wt && ex.equip !== 'bwplus' && s.w !== null && s.w !== undefined && lm === 'side') {
      const tot = C.totalWeight(ex, s.w, bar), pl = ex.equip === 'barbell' ? C.plateLoad(tot, bar, HK.S.settings.plates.list) : null;
      const side = pl ? (pl.ok ? 'Scheiben je Seite: ' + esc(pl.text.replace(/ je Seite$/, '')) : 'mit deinen Scheiben nicht genau ladbar – nächstes: ' + C.fmtNum(pl.perSide.reduce((x, y) => x + y, 0)) + ' kg je Seite (' + esc(pl.perSide.map((x) => C.fmtNum(x)).join(' + ') || 'keine') + ')') : '';
      h += '<div class="plates' + (pl && !pl.ok ? ' warn' : '') + '" data-testid="plates">Gesamt ' + C.fmtKg(tot) + ' mit Stange (' + C.fmtNum(bar) + ')' + (side ? '. ' + side : '') + '</div>';
    } else if (wt && s.w !== null && s.w !== undefined && lm === 'each' && C.sidesMode(ex) === 'both') {
      h += '<div class="plates" data-testid="plates">Beide Hanteln: 2 × ' + C.fmtNum(s.w) + ' = ' + C.fmtKg(C.totalWeight(ex, s.w, bar)) + '</div>';
    }
    h += '<div class="slbl">Reserve: Wie viele Wdh. wären noch gegangen? (optional)</div><div class="rir">' + [0, 1, 2, 3, 4].map((v) => '<button data-a="rir" data-v="' + v + '" class="' + (s.rir === v ? 'on' : '') + '">' + (v === 4 ? '4+' : v) + '</button>').join('') + '<button class="warm' + (s.warmup ? ' on' : '') + '" data-a="warm">Aufwärm</button></div></div>';
    return h;
  }

  // Timer
  HK.tickT = null;
  function tick() {
    const slot = $('#timer-slot'), a = HK.S.active;
    const el = $('#elapsed'); if (el && a) el.textContent = C.fmtDuration((now() - a.start) / 1000);
    if (!slot || !a) return;
    const tm = a.timer;
    if (!tm) { if (slot.innerHTML) { slot.innerHTML = ''; slot.dataset.k = ''; slot.dataset.t = ''; } return; }
    const left = (tm.endsAt - now()) / 1000;
    if (left <= 0 && !tm.fired) {
      tm.fired = true; save();
      if (-left < 5 && document.visibilityState === 'visible') { beep(); flash(); }
    }
    const over = left <= 0;
    const frac = over ? 0 : Math.max(0, Math.min(1, left / tm.total)), RC = 2 * Math.PI * 19;
    const leftStr = (over ? '+' : '') + C.fmtDuration(Math.abs(Math.ceil(left)));
    const ring = '<div class="tbar" aria-hidden="true"><i style="width:' + (frac * 100).toFixed(1) + '%"></i></div>';
    const html = '<div class="timer' + (over ? ' over' : '') + '" data-testid="timer">' + ring + '<div><div class="cap">' + (over ? 'Pause vorbei seit' : 'Pause, ' + esc(tm.exName || '')) + '</div><div class="left" data-testid="timer-left">' + leftStr.split('').map((ch) => (ch >= '0' && ch <= '9' ? '<span class="dg">' + ch + '</span>' : ch)).join('') + '</div></div><div class="tb">' +
      (over ? '<button data-a="t-skip" style="min-width:76px">OK</button>' : '<button data-a="t-minus">−15</button><button data-a="t-plus">+15</button><button data-a="t-skip">Stopp</button>') + '</div>' +
      '</div>';
    const key = (over ? 'o' : 'r') + Math.ceil(left);
    if (slot.dataset.k !== key) {
      const prev = slot.dataset.t || '';
      slot.innerHTML = html; slot.dataset.k = key; slot.dataset.t = leftStr;
      if (prev && prev.length === leftStr.length && !reduceMotion()) {
        const dg = slot.querySelectorAll('.left .dg'); let n = 0;
        for (let i = 0; i < leftStr.length; i++) { const ch = leftStr[i]; if (ch >= '0' && ch <= '9') { if (ch !== prev[i]) flip(dg[n], over ? 1 : -1); n++; } }
      }
    }
  }
  function startTimer(sec, name) {
    HK.S.active.timer = { endsAt: now() + sec * 1000, total: sec, exName: name, fired: false };
  }

  // ================= Aktionen =================
  function setByPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; }
  function stepWeight(e, s, dir) {
    const ex = HK.S.exercises[e.exId];
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

  Object.assign(HK, { curEx, selIdx, renderGym, tick, startTimer, setByPath, stepWeight, carryWeight, exerciseDoneAll });
})();
