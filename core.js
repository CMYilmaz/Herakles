/* Herakles – Kernlogik (reine Funktionen, ohne DOM). Läuft im Browser und in Node (Tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./library.js'));
  else root.Core = factory(root.Library);
})(typeof self !== 'undefined' ? self : this, function (Library) {
  'use strict';

  const DAY = 86400000;
  const SCHEMA = 1;

  const EQUIP = {
    barbell: 'Langhantel',
    dumbbell: 'Kurzhantel',
    machine: 'Maschine',
    cable: 'Kabelzug',
    kettlebell: 'Kettlebell',
    bw: 'Körpergewicht',
    bwplus: 'Körpergewicht + Zusatz'
  };

  const CARDIO = {
    run: { label: 'Laufen', metric: 'distance', unit: 'km', round: 0.1 },
    bike: { label: 'Rad', metric: 'duration', unit: 'min', round: 1 },
    swim: { label: 'Schwimmen', metric: 'distance', unit: 'm', round: 0.05 },
    other: { label: 'Sonstiges', metric: 'duration', unit: 'min', round: 1 }
  };

  // ---------- Hilfsfunktionen ----------
  let idCounter = 0;
  function uid(prefix) {
    idCounter = (idCounter + 1) % 1e6;
    return (prefix || 'x') + Date.now().toString(36) + idCounter.toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  const r2 = (x) => Math.round(x * 100) / 100;
  function fmtNum(x, dec) {
    if (x === null || x === undefined || isNaN(x)) return '–';
    const d = dec === undefined ? (Math.abs(x - Math.round(x)) < 1e-9 ? 0 : (Math.abs(x * 10 - Math.round(x * 10)) < 1e-9 ? 1 : 2)) : dec;
    return x.toFixed(d).replace('.', ',');
  }
  const fmtKg = (x) => fmtNum(x) + ' kg';
  function fmtDate(ts) {
    const d = new Date(ts);
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.';
  }
  function fmtDateLong(ts) {
    const d = new Date(ts);
    return fmtDate(ts) + d.getFullYear();
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
  }
  function parseDuration(str) {
    // "36", "36:30", "1:05:00" -> Sekunden; reine Zahl = Minuten
    if (str === null || str === undefined) return null;
    const s = String(str).trim().replace(',', '.');
    if (!s) return null;
    const parts = s.split(':').map(Number);
    if (parts.some((p) => isNaN(p) || p < 0)) return null;
    if (parts.length === 1) return Math.round(parts[0] * 60);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }
  function parseNum(str) {
    if (str === null || str === undefined) return null;
    const s = String(str).trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  function repsLabel(reps) {
    if (!reps.length) return '–';
    const same = reps.every((r) => r === reps[0]);
    return same ? reps.length + '×' + reps[0] : reps.join('/');
  }
  function weekStart(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const wd = (d.getDay() + 6) % 7; // Mo=0
    d.setDate(d.getDate() - wd);
    return d.getTime();
  }
  function isoWeek(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / DAY - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }
  const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0); // Epley
  const usesWeight = (ex) => ex.equip !== 'bw';

  // ---------- Standardzustand ----------
  function defaultSettings() {
    return {
      theme: 'light',
      themeV: 2,
      sound: true,
      soundInSilentMode: false,
      keepAwake: true,
      backupIntervalDays: 14,
      cardioType: 'run',
      progression: { stallHold: 2, stallReduce: 3, reducePct: 10, longBreakDays: 14, useRIR: true },
      plates: { bar: 20, list: [25, 20, 15, 10, 5, 2.5, 1.25] },
      profile: { age: null, ageAt: null },
      deload: { everyWeeks: 6, stagnationCount: 3, setsFactor: 0.5, weightFactor: 0.9 },
      cardio: { ratePct: 5, deloadEvery: 4, deloadFactor: 0.8, maxSpikePct: 10, holdBelowPct: 95,
        caps: { run: 12, bike: 90, swim: 2, other: 90 } }
    };
  }

  function ex(name, equip, opts) {
    return Object.assign({ id: uid('e'), name, equip, sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '', archived: false, suggested: false }, opts || {});
  }

  // Schultertag nach eigener Liste (Plan-Version 3)
  const SHOULDER_NOTES = {
    ohp: 'Mit Kurzhanteln, Langhantel oder an der Maschine – über „Heute stattdessen“ wechseln.',
    row: 'Mit Langhantel oder Kettlebell – über „Heute stattdessen“ wechseln.',
    around: 'Wiederholungen = Umrundungen insgesamt. Nach der Hälfte die Richtung wechseln.',
    pull: 'Wiederholungen = Züge insgesamt, beide Seiten zusammen.'
  };
  const SHOULDER_ORDER = [['ohp_db', 'ohp_machine', 'ohp_bb'], ['lat_raise_machine'], ['shrug_db'], ['upright_row', 'kb_upright_row'], ['kb_around'], ['kb_curl'], ['kb_pull_through'], ['pullup_w'], ['dips_w']];
  // Ergänzt den Tag mit Klimmzügen/Dips mit Gewicht um die fehlenden Übungen und bringt ihn in die genannte Reihenfolge.
  // Vorhandene Übungen bleiben erhalten (samt Verlauf); nicht genannte rücken ans Ende.
  function addShoulderDay(state) {
    if (!Library) return false;
    const libOfId = (id) => state.exercises[id] && !state.exercises[id].archived ? state.exercises[id].lib : null;
    const day = state.days.find((d) => d.exerciseIds.some((id) => libOfId(id) === 'pullup_w' || libOfId(id) === 'dips_w'));
    if (!day) return false;
    const extra = { ohp_db: { note: SHOULDER_NOTES.ohp }, upright_row: { note: SHOULDER_NOTES.row }, kb_around: { note: SHOULDER_NOTES.around }, kb_pull_through: { note: SHOULDER_NOTES.pull } };
    const front = [];
    SHOULDER_ORDER.forEach((keys) => {
      let id = day.exerciseIds.find((x) => keys.indexOf(libOfId(x)) >= 0);
      if (!id) { const l = Library.BY[keys[0]], e = ex(l.name, l.equip, extra[keys[0]]); e.lib = l.key; state.exercises[e.id] = e; id = e.id; }
      front.push(id);
    });
    day.exerciseIds = front.concat(day.exerciseIds.filter((id) => front.indexOf(id) < 0));
    return true;
  }

  function defaultPlan() {
    const SUG = { suggested: true, note: 'Von der App als Ergänzung vorgeschlagen – archivieren, wenn du sie nicht willst.' };
    const days = [
      ['Brust & Bizeps', [ex('Bankdrücken', 'barbell'), ex('Schrägbankdrücken', 'dumbbell'), ex('Butterfly', 'machine'), ex('Brustpresse', 'machine'), ex('Bizepscurls', 'dumbbell'), ex('Hammercurls', 'dumbbell')]],
      ['Rücken & Trizeps', [ex('Klimmzüge', 'bw'), ex('Rudern', 'cable'), ex('Latzug', 'cable'), ex('Rudern breit', 'machine'), ex('Unterer Rücken (Hyperextension)', 'bwplus'), ex('Trizepsdrücken am Kabelturm', 'cable')]],
      ['Schulter & Eigengewicht', [ex('Schulterdrücken', 'dumbbell', { note: SHOULDER_NOTES.ohp }), ex('Seitheben an der Maschine', 'machine'), ex('Shrugs (Schulterheben)', 'dumbbell'),
        ex('Aufrechtes Rudern', 'barbell', { note: SHOULDER_NOTES.row }), ex('Kettlebell Around the World', 'kettlebell', { note: SHOULDER_NOTES.around }), ex('Kettlebell-Curls', 'kettlebell'),
        ex('Plank Pull-Through', 'kettlebell', { note: SHOULDER_NOTES.pull }), ex('Klimmzüge mit Gewicht', 'bwplus'), ex('Dips mit Gewicht', 'bwplus')]],
      ['Beine & Bauch', [ex('Kniebeuge', 'barbell', SUG), ex('Rumänisches Kreuzheben', 'barbell', SUG), ex('Beinpresse', 'machine'), ex('Beinstrecker', 'machine'), ex('Beinbeuger', 'machine'),
        ex('Wadendrücker', 'machine', { sets: 4, note: 'Wadenpresse und Wadendrücker zusammengelegt: 4 Sätze an einem Gerät deiner Wahl.' }),
        ex('Situps', 'bw', { sets: 4, note: 'Gerade und seitliche Situps zusammengelegt: abwechselnd ein Satz gerade, ein Satz seitlich.' }), ex('Russian Twists', 'kettlebell')]]
    ];
    const exercises = {};
    const outDays = days.map(([name, list]) => {
      list.forEach((e) => { e.lib = Library ? Library.match(e.name) : null; exercises[e.id] = e; });
      return { id: uid('d'), name, exerciseIds: list.map((e) => e.id) };
    });
    return { exercises, days: outDays };
  }

  function defaultState(now) {
    const plan = defaultPlan();
    return {
      schema: SCHEMA,
      createdAt: now || Date.now(),
      settings: defaultSettings(),
      exercises: plan.exercises,
      days: plan.days,
      rotation: { nextDayIndex: 0 },
      sessions: [],
      cardio: [],
      active: null,
      deload: { active: false, sessionsLeft: 0, lastDeloadAt: null, snoozeUntil: null },
      body: [],
      optim: { lastAt: null, snoozeUntil: null, undo: null, log: [] },
      planV: 3,
      meta: { lastExportAt: null, updatedAt: now || Date.now() }
    };
  }

  // Fehlende Felder nach Import/Update ergänzen
  function migrate(s) {
    const d = defaultState(s && s.createdAt);
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign({}, d, s);
    out.settings = Object.assign({}, d.settings, s.settings || {});
    if (!(s.settings && s.settings.themeV >= 2)) { out.settings.theme = 'light'; out.settings.themeV = 2; } // Creme wird Standard (einmalig)
    out.settings.progression = Object.assign({}, d.settings.progression, (s.settings || {}).progression || {});
    out.settings.deload = Object.assign({}, d.settings.deload, (s.settings || {}).deload || {});
    out.settings.cardio = Object.assign({}, d.settings.cardio, (s.settings || {}).cardio || {});
    out.settings.cardio.caps = Object.assign({}, d.settings.cardio.caps, ((s.settings || {}).cardio || {}).caps || {});
    out.settings.plates = Object.assign({}, d.settings.plates, (s.settings || {}).plates || {});
    out.settings.profile = Object.assign({}, d.settings.profile, (s.settings || {}).profile || {});
    out.body = Array.isArray(s.body) ? s.body : [];
    out.optim = Object.assign({}, d.optim, s.optim || {});
    out.deload = Object.assign({}, d.deload, s.deload || {});
    out.meta = Object.assign({}, d.meta, s.meta || {});
    out.rotation = Object.assign({}, d.rotation, s.rotation || {});
    out.sessions = Array.isArray(s.sessions) ? s.sessions : [];
    out.cardio = Array.isArray(s.cardio) ? s.cardio : [];
    if (!s.exercises || !s.days) { out.exercises = d.exercises; out.days = d.days; }
    // Plan-Version 2 (gestrafft): nur übernehmen, solange noch nichts trainiert wurde
    if ((s.planV || 1) < 2) { if (!out.sessions.length && !s.active) { out.exercises = d.exercises; out.days = d.days; out.rotation = { nextDayIndex: 0 }; } out.planV = 2; }
    if (Library) Object.values(out.exercises).forEach((e) => { if (e.lib === undefined || (e.lib && !Library.BY[e.lib])) e.lib = Library.match(e.name); });
    // Plan-Version 3: Schultertag um Maschinen-Seitheben, Shrugs, aufrechtes Rudern und Kettlebell-Übungen ergänzen (einmalig)
    if ((out.planV || 2) < 3) { addShoulderDay(out); out.planV = 3; }
    out.schema = SCHEMA;
    return out;
  }

  function validateImport(obj) {
    if (!obj || typeof obj !== 'object') return 'Keine gültige Datei.';
    const s = (obj.app === 'herakles' || obj.app === 'satzwerk') ? obj.data : obj;
    if (!s || typeof s !== 'object' || !s.exercises || !Array.isArray(s.days) || !Array.isArray(s.sessions)) return 'Die Datei ist kein Herakles-Backup.';
    return null;
  }

  // ---------- Historie & Auswertung ----------
  function workSets(entry) {
    return (entry.sets || []).filter((x) => !x.warmup && x.done !== false && x.r > 0);
  }

  // Alle abgeschlossenen, nicht-Deload Einträge einer Übung (aufsteigend)
  function exerciseHistory(state, exId, opts) {
    const includeDeload = opts && opts.includeDeload;
    const out = [];
    for (const s of state.sessions) {
      if (s.deload && !includeDeload) continue;
      for (const e of s.exercises) {
        if (e.exId !== exId) continue;
        const ws = workSets(e);
        if (!ws.length) continue;
        out.push({ date: s.start, sessionId: s.id, deload: !!s.deload, bw: s.bw === undefined || s.bw === null ? bodyWeightAt(state, s.start) : s.bw, sets: ws.map((x) => ({ w: x.w || 0, r: x.r, rir: x.rir })) });
      }
    }
    out.sort((a, b) => a.date - b.date);
    return out;
  }

  function summarize(entry, ex) {
    const W = usesWeight(ex) ? Math.max.apply(null, entry.sets.map((x) => x.w || 0)) : 0;
    const atW = entry.sets.filter((x) => (usesWeight(ex) ? (x.w || 0) === W : true));
    const reps = atW.map((x) => x.r);
    const total = reps.reduce((a, b) => a + b, 0);
    const allTop = atW.length >= ex.sets && atW.slice(0, ex.sets).every((x) => x.r >= ex.repMax);
    const noReserve = atW.some((x) => x.rir === 0); // mindestens ein Satz ohne Reserve eingetragen
    return { W, reps, total, allTop, noReserve, date: entry.date };
  }

  // Verlauf der Stillstandszählung
  function analyze(history, ex) {
    ex = eff(ex);
    let stall = 0, prev = null;
    const steps = [];
    for (const h of history) {
      const cur = summarize(h, ex);
      if (prev && prev.W === cur.W && !prev.allTop) {
        stall = cur.total > prev.total ? 0 : stall + 1;
      } else stall = 0;
      steps.push(Object.assign({}, cur, { stall }));
      prev = cur;
    }
    return { steps, last: steps[steps.length - 1] || null, stall };
  }

  function clampReps(r, ex) { return Math.min(ex.repMax, Math.max(ex.repMin, r)); }

  function targetsFrom(lastReps, ex) {
    const out = [];
    for (let i = 0; i < ex.sets; i++) {
      const base = lastReps[i] !== undefined ? lastReps[i] : lastReps[lastReps.length - 1];
      out.push(clampReps(base + 1, ex));
    }
    return out;
  }

  function reduceWeight(W, step, pct) {
    if (W <= 0) return 0;
    const floor = W * (1 - pct / 100);
    let w = Math.ceil(floor / step - 1e-9) * step;
    if (w >= W) w = W - step;
    return Math.max(0, r2(w));
  }

  // Kernfunktion: Vorschlag für die nächste Einheit einer Übung
  function suggest(state, exId, now, opts) {
    now = now || Date.now();
    const ex = eff(state.exercises[exId]);
    const P = state.settings.progression;
    const deloadMode = opts && opts.deload !== undefined ? opts.deload : !!(state.deload && state.deload.active);
    const hist = exerciseHistory(state, exId);
    const a = analyze(hist, ex);
    const L = a.last;
    const wt = usesWeight(ex);
    const unit = ex.equip === 'bwplus' ? ' Zusatz' : '';
    const res = { exId, sets: ex.sets, weight: null, reps: [], kind: 'first', reason: '', last: L, stall: a.stall };

    if (!L) {
      res.reps = Array(ex.sets).fill(ex.repMin);
      res.weight = wt ? (ex.equip === 'bwplus' ? 0 : null) : 0;
      res.reason = wt
        ? (ex.equip === 'bwplus' ? 'Erste Einheit: trag dein Zusatzgewicht ein (0 = ohne) – ab dann rechnet die App.' : 'Erste Einheit: trag dein Arbeitsgewicht ein – ab dann rechnet die App.')
        : 'Erste Einheit: Wiederholungen eintragen – ab dann rechnet die App.';
      if (deloadMode) { res.kind = 'deload'; res.sets = Math.max(1, Math.ceil(ex.sets * state.settings.deload.setsFactor)); res.reps = res.reps.slice(0, res.sets); }
      return res;
    }

    const lastTxt = repsLabel(L.reps) + (wt ? ' mit ' + fmtKg(L.W) + unit : '');
    // Deload-Einheiten zählen als Training (keine „Pause“), aber nicht für die Progression
    const allHist = exerciseHistory(state, exId, { includeDeload: true });
    const lastAny = allHist.length ? allHist[allHist.length - 1].date : L.date;
    const daysSince = Math.floor((now - Math.max(L.date, lastAny)) / DAY);

    if (deloadMode) {
      const D = state.settings.deload;
      const n = Math.max(1, Math.ceil(ex.sets * D.setsFactor));
      const w = wt ? Math.max(0, Math.floor((L.W * D.weightFactor) / ex.step + 1e-9) * ex.step) : 0;
      res.kind = 'deload'; res.sets = n; res.weight = r2(w); res.reps = Array(n).fill(ex.repMin);
      res.reason = 'Deload-Woche: ' + n + ' statt ' + ex.sets + ' Sätze' + (wt ? ' mit ~' + Math.round(D.weightFactor * 100) + ' % (' + fmtKg(res.weight) + ')' : '') + ' – Erholung, kein Rekordversuch.';
      return res;
    }

    if (ex.nextWeight !== undefined && ex.nextWeight !== null) {
      res.kind = 'plan'; res.weight = ex.nextWeight; res.reps = Array(ex.sets).fill(ex.repMin);
      res.reason = ex.nextReason || ('Neuer Block: ' + fmtKg(ex.nextWeight) + ' und von hier aus steigern.');
      return res;
    }
    if (L.allTop) {
      if (daysSince >= P.longBreakDays) {
        res.kind = 'break'; res.weight = L.W; res.reps = targetsFrom(L.reps.map((r) => r - 1), ex);
        res.reason = 'Letzte Einheit vor ' + daysSince + ' Tagen – nach der Pause bleibt es bei ' + (wt ? fmtKg(L.W) : 'deinem Niveau') + ', erst danach wird gesteigert.';
        return res;
      }
      const prev = a.steps.length > 1 ? a.steps[a.steps.length - 2] : null;
      if (wt && P.useRIR !== false && L.noReserve && !(prev && prev.allTop && prev.W === L.W)) {
        res.kind = 'confirm'; res.weight = L.W; res.reps = Array(ex.sets).fill(ex.repMax);
        res.reason = 'Letztes Mal ' + lastTxt + ' – obere Grenze erreicht, aber ohne Reserve. Gewicht bleibt einmal; schaffst du es wieder, folgen ' + fmtKg(r2(L.W + ex.step)) + unit + '.';
        return res;
      }
      if (wt) {
        res.kind = 'increase'; res.weight = r2(L.W + ex.step); res.reps = Array(ex.sets).fill(ex.repMin);
        res.reason = 'Letztes Mal ' + lastTxt + ' – obere Grenze in allen Sätzen, daher heute ' + fmtKg(res.weight) + unit + ' ab ' + ex.repMin + ' Wdh.';
      } else {
        res.kind = 'bwtop'; res.weight = 0; res.reps = Array(ex.sets).fill(ex.repMax);
        res.reason = 'Letztes Mal ' + lastTxt + ' – Obergrenze erreicht. Für mehr Reiz: Übungstyp auf „Körpergewicht + Zusatz“ stellen oder den Wdh-Bereich anheben.';
      }
      return res;
    }

    res.weight = L.W;
    res.reps = targetsFrom(L.reps, ex);
    if (a.stall >= P.stallReduce) {
      if (wt && L.W > 0) {
        const w = reduceWeight(L.W, ex.step, P.reducePct);
        const pct = Math.round((1 - w / L.W) * 100);
        res.kind = 'reduce'; res.weight = w; res.reps = targetsFrom(L.reps, ex);
        res.reason = a.stall + '× in Folge ohne Steigerung (' + lastTxt + ') – Vorschlag: ' + fmtKg(w) + unit + ' (−' + pct + ' %) und neu aufbauen, oder für 1–2 Wochen eine Alternative wählen.';
      } else {
        res.kind = 'reduce';
        res.reason = a.stall + '× in Folge ohne Steigerung (' + lastTxt + ') – Vorschlag: Übung 1–2 Wochen pausieren oder eine Variante wählen.';
      }
      return res;
    }
    if (a.stall >= 1) {
      res.kind = 'hold';
      res.reason = (a.stall >= P.stallHold ? a.stall + '× ohne Steigerung' : 'Letztes Mal keine Steigerung') + ' (' + lastTxt + ') – Gewicht bleibt, Ziel: mehr Wiederholungen.';
      return res;
    }
    res.kind = 'progress';
    res.reason = 'Letztes Mal ' + lastTxt + ' – ' + (wt ? 'Gewicht bleibt' : 'gleiche Übung') + ', Ziel je Satz +1 Wdh. bis ' + ex.repMax + '.';
    return res;
  }

  // ---------- Deload ----------
  function deloadCheck(state, now) {
    now = now || Date.now();
    const D = state.settings.deload, P = state.settings.progression;
    const out = { suggest: false, reason: '', weeks: 0, stagnating: [] };
    if (state.deload.active || !state.sessions.length) return out;
    if (state.deload.snoozeUntil && state.deload.snoozeUntil > now) return out;
    const firstNonDeload = state.sessions.filter((s) => !s.deload).map((s) => s.start);
    if (!firstNonDeload.length) return out;
    // Eine Trainingspause ab 10 Tagen zählt selbst als Erholung
    const starts = state.sessions.map((s) => s.start).sort((a, b) => a - b);
    if (now - starts[starts.length - 1] >= 10 * DAY) return out;
    let afterGap = starts[0];
    for (let i = 1; i < starts.length; i++) if (starts[i] - starts[i - 1] >= 10 * DAY) afterGap = starts[i];
    const from = Math.max(state.deload.lastDeloadAt || 0, afterGap);
    out.weeks = Math.floor((now - from) / (7 * DAY));
    const active = activeExerciseIds(state);
    const since = state.deload.lastDeloadAt || 0;
    for (const id of active) {
      const a = analyze(exerciseHistory(state, id), state.exercises[id]);
      // nur Stillstände nach dem letzten Deload zählen
      let streak = 0;
      for (let i = a.steps.length - 1; i >= 0 && a.steps[i].stall > 0 && a.steps[i].date > since; i--) streak++;
      if (streak >= P.stallReduce) out.stagnating.push(state.exercises[id].name);
    }
    if (out.weeks >= D.everyWeeks) {
      out.suggest = true;
      out.reason = 'Seit ' + out.weeks + ' Wochen ohne leichtere Woche (eingestellt: alle ' + D.everyWeeks + ').';
    } else if (out.stagnating.length >= D.stagnationCount && out.weeks >= 3) {
      out.suggest = true;
      out.reason = out.stagnating.length + ' Übungen stagnieren (' + out.stagnating.slice(0, 4).join(', ') + (out.stagnating.length > 4 ? ', …' : '') + ').';
    }
    return out;
  }
  function acceptDeload(state, now) {
    state.deload.active = true;
    state.deload.sessionsLeft = Math.max(1, state.days.length);
    state.deload.lastDeloadAt = now || Date.now();
    state.deload.snoozeUntil = null;
  }
  function declineDeload(state, now) {
    state.deload.snoozeUntil = (now || Date.now()) + 7 * DAY;
  }
  function endDeload(state) {
    state.deload.active = false; state.deload.sessionsLeft = 0;
  }

  function activeExerciseIds(state) {
    const ids = [];
    state.days.forEach((d) => d.exerciseIds.forEach((id) => { if (state.exercises[id] && !state.exercises[id].archived && ids.indexOf(id) < 0) ids.push(id); }));
    return ids;
  }

  // ---------- Einheit ----------
  function nextDay(state) {
    if (!state.days.length) return null;
    const i = ((state.rotation.nextDayIndex || 0) % state.days.length + state.days.length) % state.days.length;
    return state.days[i];
  }

  function startSession(state, dayId, now) {
    now = now || Date.now();
    const day = state.days.find((d) => d.id === dayId) || nextDay(state);
    const deload = !!state.deload.active;
    const exs = day.exerciseIds.filter((id) => state.exercises[id] && !state.exercises[id].archived).map((id) => {
      const e = state.exercises[id];
      const s = suggest(state, id, now, { deload });
      const sets = [];
      for (let i = 0; i < s.sets; i++) sets.push({ w: s.weight, r: s.reps[i] !== undefined ? s.reps[i] : eff(e).repMin, rir: null, warmup: false, done: false });
      return { exId: id, name: e.name, note: '', sugg: { weight: s.weight, reps: s.reps, kind: s.kind, reason: s.reason, last: s.last ? { W: s.last.W, reps: s.last.reps, date: s.last.date } : null }, sets };
    });
    ssPairs(state, day).forEach((p, k) => exs.forEach((e) => { if (e.exId === p[0] || e.exId === p[1]) e.ss = k + 1; }));
    state.active = { id: uid('s'), dayId: day.id, dayName: day.name, start: now, deload, cur: 0, exercises: exs, timer: null, updatedAt: now, bw: bodyWeightAt(state, now) };
    return state.active;
  }

  // ---------- Supersätze ----------
  // day.ss = IDs der Übungen, die mit der jeweils folgenden Übung des Tages gekoppelt sind (immer Paare)
  function ssPairs(state, day) {
    const ids = day.exerciseIds.filter((id) => state.exercises[id] && !state.exercises[id].archived), ss = day.ss || [], out = [];
    for (let i = 0; i < ids.length - 1; i++) if (ss.indexOf(ids[i]) >= 0) { out.push([ids[i], ids[i + 1]]); i++; }
    return out;
  }
  // Rolle einer Übung am Tag: { first: true|false, partner: id } oder null
  function ssInfo(state, day, exId) {
    const p = ssPairs(state, day).find((x) => x[0] === exId || x[1] === exId);
    return p ? { first: p[0] === exId, partner: p[0] === exId ? p[1] : p[0] } : null;
  }
  // Koppelt exId mit der folgenden Übung (on) oder löst das Paar, zu dem exId gehört (off). Gibt die Partner-ID zurück.
  function setSuperset(state, dayId, exId, on) {
    const day = state.days.find((d) => d.id === dayId); if (!day) return null;
    const ids = day.exerciseIds.filter((id) => state.exercises[id] && !state.exercises[id].archived);
    const cur = ssInfo(state, day, exId);
    let ss = (day.ss || []).filter((id) => ids.indexOf(id) >= 0), partner = null;
    if (!on) {
      if (!cur) return null;
      const first = cur.first ? exId : cur.partner;
      ss = ss.filter((id) => id !== first); partner = cur.partner;
    } else {
      const i = ids.indexOf(exId);
      if (cur || i < 0 || i >= ids.length - 1) return null; // schon gekoppelt oder keine folgende Übung
      partner = ids[i + 1];
      ss = ss.filter((id) => id !== partner); // die folgende Übung kann nicht zugleich ein eigenes Paar anführen
      ss.push(exId);
    }
    if (ss.length) day.ss = ss; else delete day.ss;
    return partner;
  }
  function renameInSupersets(state, oldId, newId) {
    state.days.forEach((d) => { if (d.ss) d.ss = d.ss.map((id) => (id === oldId ? newId : id)); });
  }
  // Partner in der laufenden Einheit (Index) oder -1
  function ssPartnerIdx(active, idx) {
    const e = active.exercises[idx];
    return e && e.ss ? active.exercises.findIndex((x, j) => j !== idx && x.ss === e.ss) : -1;
  }
  // Nach einem abgehakten Arbeitssatz: Wohin geht es, und läuft die Pause?
  // Erste Übung → ohne Pause zur zweiten. Zweite Übung → Pause, dann zurück zur ersten, solange dort Sätze offen sind.
  function ssAfterCheck(active, idx) {
    const p = ssPartnerIdx(active, idx);
    if (p < 0) return { goto: null, rest: true };
    const open = active.exercises[p].sets.some((s) => !s.done && !s.warmup);
    if (idx < p) return open ? { goto: p, rest: false } : { goto: null, rest: true };
    return { goto: open ? p : null, rest: true };
  }

  // Gewicht in nachfolgende leere Sätze übernehmen
  function propagateWeight(exEntry, fromIdx) {
    const w = exEntry.sets[fromIdx].w;
    for (let i = fromIdx + 1; i < exEntry.sets.length; i++) {
      const s = exEntry.sets[i];
      if (!s.done && !s.warmup && (s.w === null || s.w === undefined)) s.w = w;
    }
  }

  // ---------- Gewichtsangabe und Zählweise ----------
  // Gewicht: je Seite (Langhantel, ohne Stange), je Hantel (Kurzhantel) oder gesamt (Maschine, Kabel, Kettlebell).
  // Wiederholungen: bei abwechselnden/einseitigen Kurzhantelübungen zählst du beide Seiten zusammen.
  const ALT_KEYS = ['curl_db', 'hammer', 'db_row', 'bulgarian'];
  function defaultLoad(equip) { return equip === 'barbell' ? 'side' : equip === 'dumbbell' ? 'each' : 'total'; }
  function defaultSides(ex) { return ex.equip === 'dumbbell' && ALT_KEYS.indexOf(ex.lib) >= 0 ? 'alt' : 'both'; }
  function loadMode(ex) { return (ex && ex.load) || defaultLoad(ex && ex.equip); }
  function sidesMode(ex) { return (ex && ex.sides) || (ex ? defaultSides(ex) : 'both'); }
  function repFactor(ex) { return sidesMode(ex) === 'alt' ? 2 : 1; }
  // Übung mit wirksamem Wiederholungsbereich (bei „abwechselnd“ zählen beide Seiten: 8–12 je Seite = 16–24 gesamt)
  function eff(ex) { const f = repFactor(ex); return f === 1 ? ex : Object.assign({}, ex, { repMin: ex.repMin * f, repMax: ex.repMax * f }); }
  // Bewegte Last je Wiederholung in kg (für Volumen und 1RM)
  function repLoad(ex, w, bar) {
    w = w || 0;
    const m = loadMode(ex);
    if (m === 'side') return w > 0 || bar ? (bar || 0) + 2 * w : 0;
    if (m === 'each') return sidesMode(ex) === 'alt' ? w : 2 * w;
    return w;
  }
  // Gesamtgewicht zur Anzeige (Langhantel inkl. Stange, Kurzhanteln beide zusammen)
  function totalWeight(ex, w, bar) { const m = loadMode(ex); return m === 'side' ? r2((bar || 0) + 2 * (w || 0)) : m === 'each' ? r2(2 * (w || 0)) : r2(w || 0); }
  function loadLabel(ex) { const m = loadMode(ex); return m === 'side' ? 'je Seite' : m === 'each' ? 'je Hantel' : ''; }
  const BAR = (state) => (state && state.settings && state.settings.plates ? state.settings.plates.bar : 20);
  function setVolume(state, exId, x, ex) {
    ex = ex || (state && state.exercises[exId]);
    if (!ex) return (x.w || 0) * x.r;
    if (ex.equip === 'bw' || ex.equip === 'bwplus') return (x.w || 0) * x.r;
    return repLoad(ex, x.w, BAR(state)) * x.r;
  }
  function sessionVolume(session, state) {
    let v = 0, sets = 0;
    session.exercises.forEach((e) => (e.sets || []).forEach((x) => { if (!x.warmup && x.done !== false && x.r > 0) { v += setVolume(state, e.exId, x); sets++; } }));
    return { volume: r2(v), sets };
  }

  // Bestwerte vor einer Einheit vs. in der Einheit
  function bestBefore(state, exId, beforeTs) {
    let w = 0, e = 0, reps = 0;
    for (const s of state.sessions) {
      if (s.start >= beforeTs) continue;
      for (const x of s.exercises) {
        if (x.exId !== exId) continue;
        for (const st of workSets(x)) {
          w = Math.max(w, st.w || 0); e = Math.max(e, e1rm(st.w || 0, st.r)); reps = Math.max(reps, st.r);
        }
      }
    }
    return { w, e1rm: e, reps };
  }

  function sessionPRs(state, session) {
    const prs = [];
    for (const x of session.exercises) {
      const ex = state.exercises[x.exId] || { equip: 'machine', name: x.name };
      const ws = workSets(x);
      if (!ws.length) continue;
      const before = bestBefore(state, x.exId, session.start);
      const hadBefore = state.sessions.some((s) => s.start < session.start && s.exercises.some((y) => y.exId === x.exId && workSets(y).length));
      if (!hadBefore) continue; // erste Einheit ist kein Rekord
      const bw = Math.max.apply(null, ws.map((s) => s.w || 0));
      const be = Math.max.apply(null, ws.map((s) => e1rm(s.w || 0, s.r)));
      const br = Math.max.apply(null, ws.map((s) => s.r));
      if (ex.equip === 'bw') {
        if (br > before.reps) prs.push({ name: x.name, text: br + ' Wdh. (vorher ' + before.reps + ')' });
      } else if (bw > before.w) prs.push({ name: x.name, text: 'Gewicht ' + fmtKg(bw) + ' (vorher ' + fmtKg(before.w) + ')' });
      else if (be > before.e1rm + 0.01 && ex.equip !== 'bwplus') prs.push({ name: x.name, text: 'geschätztes 1RM ' + fmtKg(Math.round(be * 10) / 10) });
    }
    return prs;
  }

  function finishSession(state, now) {
    now = now || Date.now();
    const a = state.active;
    if (!a) return null;
    const session = {
      id: a.id, dayId: a.dayId, dayName: a.dayName, start: a.start, end: now, deload: a.deload, bw: a.bw === undefined ? bodyWeightAt(state, a.start) : a.bw,
      exercises: a.exercises.map((e) => ({ exId: e.exId, name: e.name, note: e.note || '', ss: e.ss || undefined, sets: e.sets.filter((s) => s.done).map((s) => ({ w: s.w === null || s.w === undefined ? 0 : s.w, r: s.r || 0, rir: s.rir, warmup: !!s.warmup })) }))
        .filter((e) => e.sets.length || e.note)
    };
    const prs = sessionPRs(state, session);
    state.sessions.push(session);
    // einmaliges Startgewicht nach einer Planoptimierung ist verbraucht, sobald die Übung trainiert wurde
    if (!a.deload) session.exercises.forEach((e) => { const ex = state.exercises[e.exId]; if (ex && ex.nextWeight !== undefined && workSets(e).length) { delete ex.nextWeight; delete ex.nextReason; } });
    const idx = state.days.findIndex((d) => d.id === a.dayId);
    if (idx >= 0) state.rotation.nextDayIndex = (idx + 1) % state.days.length;
    if (a.deload && state.deload.active) {
      state.deload.sessionsLeft = Math.max(0, state.deload.sessionsLeft - 1);
      if (state.deload.sessionsLeft === 0) endDeload(state);
    }
    state.active = null;
    const vol = sessionVolume(session, state);
    return { session, durationSec: Math.round((now - a.start) / 1000), volume: vol.volume, sets: vol.sets, prs };
  }

  // ---------- Wochenübersicht ----------
  function weekOverview(state, now) {
    now = now || Date.now();
    const ws = weekStart(now), we = ws + 7 * DAY;
    const gym = state.sessions.filter((s) => s.start >= ws && s.start < we);
    const cardio = state.cardio.filter((c) => c.date >= ws && c.date < we);
    const vol = gym.reduce((a, s) => a + sessionVolume(s, state).volume, 0);
    return { weekStart: ws, week: isoWeek(now), gym, cardio, gymTarget: 4, cardioTarget: 1, volume: r2(vol) };
  }

  function weeklyStats(state, weeks, now) {
    now = now || Date.now();
    const out = [];
    const ws0 = weekStart(now);
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = ws0 - i * 7 * DAY, we = ws + 7 * DAY;
      const g = state.sessions.filter((s) => s.start >= ws && s.start < we);
      const c = state.cardio.filter((x) => x.date >= ws && x.date < we);
      out.push({ weekStart: ws, week: isoWeek(ws), sessions: g.length, volume: r2(g.reduce((a, s) => a + sessionVolume(s, state).volume, 0)), cardio: c.length, cardioKm: r2(c.reduce((a, x) => a + (x.distance || 0), 0)) });
    }
    return out;
  }

  // ---------- Cardio ----------
  function cardioMetric(c, type) {
    const t = CARDIO[type];
    return t.metric === 'distance' ? (c.distance || 0) : (c.duration || 0) / 60;
  }
  function roundMetric(v, type, mode) {
    const step = CARDIO[type].round;
    const f = mode === 'floor' ? Math.floor : Math.round;
    return r2(f(v / step + 1e-9) * step);
  }
  function fmtMetric(v, type) {
    if (type === 'swim') return Math.round(v * 1000) + ' m';
    if (CARDIO[type].metric === 'distance') return fmtNum(v, 1) + ' km';
    return Math.round(v) + ' min';
  }
  function pace(c, type) {
    if (!c.duration || !c.distance) return null;
    if (type === 'run') return fmtDuration(c.duration / c.distance) + ' /km';
    if (type === 'swim') return fmtDuration(c.duration / (c.distance * 10)) + ' /100 m';
    return fmtNum(c.distance / (c.duration / 3600), 1) + ' km/h';
  }

  function cardioSuggest(state, type, now) {
    now = now || Date.now();
    const C = state.settings.cardio;
    const T = CARDIO[type];
    const list = state.cardio.filter((c) => c.type === type).sort((a, b) => a.date - b.date);
    const res = { type, target: null, deload: false, kind: 'first', reason: '' };
    if (!list.length) {
      res.reason = 'Trag deine ' + (type === 'run' ? 'letzte Laufeinheit' : 'letzte Einheit') + ' ein – daraus berechnet die App das nächste Ziel.';
      return res;
    }
    const regular = list.filter((c) => !c.deload);
    const last = list[list.length - 1];
    const lastReg = regular[regular.length - 1] || last;
    const ref = cardioMetric(lastReg, type);
    const cap = C.caps[type] || Infinity;
    // Anzahl regulärer Einheiten seit letztem Deload
    let sinceDeload = 0;
    for (let i = list.length - 1; i >= 0 && !list[i].deload; i--) sinceDeload++;
    const lastTxt = (type === 'run' ? 'Letzter Lauf ' : 'Letzte Einheit ') + fmtMetric(cardioMetric(lastReg, type), type) + (lastReg.duration ? ' in ' + fmtDuration(lastReg.duration) : '') + (pace(lastReg, type) ? ' (' + pace(lastReg, type) + ')' : '');

    if (C.deloadEvery > 1 && sinceDeload >= C.deloadEvery - 1) {
      res.deload = true; res.kind = 'deload';
      res.target = roundMetric(ref * C.deloadFactor, type);
      res.reason = 'Jede ' + C.deloadEvery + '. Einheit ist leichter: heute ' + fmtMetric(res.target, type) + ' (~' + Math.round(C.deloadFactor * 100) + ' % von ' + fmtMetric(ref, type) + ').';
      return res;
    }
    const daysSince = Math.floor((now - last.date) / DAY);
    // längste Einheit der letzten 30 Tage (Spike-Grenze nach Frandsen et al. 2025)
    const recent = list.filter((c) => c.date >= now - 30 * DAY);
    const longest30 = recent.length ? Math.max.apply(null, recent.map((c) => cardioMetric(c, type))) : 0;
    if (!recent.length || daysSince > 21) {
      res.kind = 'break'; res.target = roundMetric(Math.min(ref, cap) * (recent.length ? 1 : 0.9), type, 'floor');
      res.reason = 'Letzte Einheit vor ' + daysSince + ' Tagen – erst wieder einsteigen: ' + fmtMetric(res.target, type) + ', keine Steigerung.';
      return res;
    }
    if (lastReg.target && ref < lastReg.target * C.holdBelowPct / 100) {
      res.kind = 'hold'; res.target = Math.min(lastReg.target, cap);
      res.reason = lastTxt + ' – Ziel (' + fmtMetric(lastReg.target, type) + ') nicht ganz erreicht, daher bleibt es bei ' + fmtMetric(res.target, type) + '.';
      return res;
    }
    let t = ref * (1 + C.ratePct / 100);
    const spikeCap = longest30 * (1 + C.maxSpikePct / 100);
    t = Math.min(t, spikeCap, cap);
    t = roundMetric(t, type, 'floor');
    if (t <= ref && ref < cap) t = roundMetric(Math.min(ref + T.round, spikeCap, cap), type, 'floor');
    res.target = Math.max(t, Math.min(ref, cap));
    if (res.target >= cap && ref >= cap) {
      res.kind = 'cap';
      res.reason = lastTxt + ' – Obergrenze ' + fmtMetric(cap, type) + ' erreicht, Ziel bleibt (Grenze in den Einstellungen änderbar).';
    } else {
      res.kind = 'progress';
      const pct = Math.round((res.target / ref - 1) * 100);
      res.reason = lastTxt + ' – heute ' + fmtMetric(res.target, type) + ' (+' + pct + ' %).';
    }
    return res;
  }

  function logCardio(state, entry, now) {
    const sug = cardioSuggest(state, entry.type, entry.date || now);
    const c = { id: uid('c'), date: entry.date || now || Date.now(), type: entry.type, distance: entry.distance || null, duration: entry.duration || null, note: entry.note || '', target: sug.target, deload: !!sug.deload };
    state.cardio.push(c);
    state.cardio.sort((a, b) => a.date - b.date);
    return c;
  }

  // ---------- Diagrammdaten ----------
  function exerciseSeries(state, exId) {
    const ex = state.exercises[exId];
    return exerciseHistory(state, exId, { includeDeload: true }).map((h) => {
      const s = summarize(h, eff(ex));
      const total = (ex.equip === 'bw' || ex.equip === 'bwplus') && h.bw ? r2(h.bw + s.W) : null;
      return { date: h.date, weight: s.W, total, reps: s.reps, e1rm: ex.equip === 'bw' || ex.equip === 'bwplus' ? null : r2(Math.max.apply(null, h.sets.map((x) => e1rm(x.w, x.r / repFactor(ex))))), volume: r2(h.sets.reduce((a, x) => a + setVolume(state, exId, x, ex), 0)), totalReps: h.sets.reduce((a, x) => a + x.r, 0), deload: h.deload };
    });
  }

  function personalRecords(state) {
    const out = [];
    for (const id of Object.keys(state.exercises)) {
      const ex = state.exercises[id];
      const ser = exerciseSeries(state, id);
      if (!ser.length) continue;
      const maxW = Math.max.apply(null, ser.map((s) => s.weight));
      const maxE = Math.max.apply(null, ser.map((s) => s.e1rm || 0));
      const maxR = Math.max.apply(null, ser.map((s) => Math.max.apply(null, s.reps)));
      const tot = ser.filter((s) => s.total).map((s) => s.total);
      out.push({ id, name: ex.name, equip: ex.equip, maxW, maxE: r2(maxE), maxR, maxTotal: tot.length ? Math.max.apply(null, tot) : null, sessions: ser.length });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  // ---------- Export als Tabelle (CSV für Excel: Semikolon, Dezimalkomma, UTF-8 mit BOM) ----------
  function csvCell(v) { v = v === null || v === undefined ? '' : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  // Freitext darf in Excel nicht als Formel gelesen werden
  const csvText = (v) => { v = String(v || ''); return /^[=+\-@]/.test(v) ? "'" + v : v; };
  const csvNum = (x) => (x === null || x === undefined || isNaN(x) ? '' : String(r2(x)).replace('.', ','));
  const csvFile = (rows) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
  // Eine Zeile pro erledigtem Satz, älteste Einheit zuerst
  function setsCSV(state) {
    const rows = [['Datum', 'Beginn', 'Trainingstag', 'Deload', 'Übung', 'Gerät', 'Supersatz', 'Satz', 'Aufwärmsatz', 'Gewicht (kg, wie eingetragen)', 'Eintrag gilt', 'Gesamtgewicht (kg)', 'Wdh.', 'Reserve (Wdh.)', 'Volumen (kg)', 'Notiz']];
    state.sessions.slice().sort((a, b) => a.start - b.start).forEach((se) => se.exercises.forEach((e) => {
      const ex = state.exercises[e.exId], wt = ex ? usesWeight(ex) : true, body = ex && (ex.equip === 'bw' || ex.equip === 'bwplus');
      let n = 0;
      (e.sets || []).forEach((x) => {
        if (!x.warmup) n++;
        rows.push([fmtDateLong(se.start), fmtTime(se.start), csvText(se.dayName), se.deload ? 'ja' : 'nein', csvText(e.name), ex ? EQUIP[ex.equip] : '', e.ss ? 'ja' : 'nein',
          x.warmup ? '' : n, x.warmup ? 'ja' : 'nein', wt ? csvNum(x.w) : '', !ex || !wt ? '' : ex.equip === 'bwplus' ? 'Zusatzgewicht' : loadLabel(ex) || 'gesamt',
          ex && wt && !body ? csvNum(totalWeight(ex, x.w, BAR(state))) : '', x.r || 0, x.rir === null || x.rir === undefined ? '' : x.rir >= 4 ? '4+' : x.rir,
          x.warmup ? '' : csvNum(setVolume(state, e.exId, x)), csvText(e.note)]);
      });
    }));
    return csvFile(rows);
  }
  function cardioCSV(state) {
    const rows = [['Datum', 'Art', 'Strecke (km)', 'Dauer (min)', 'Tempo', 'Ziel', 'Deload', 'Notiz']];
    state.cardio.slice().sort((a, b) => a.date - b.date).forEach((c) => {
      const t = CARDIO[c.type] ? c.type : 'other';
      rows.push([fmtDateLong(c.date), CARDIO[t].label, csvNum(c.distance), c.duration ? csvNum(c.duration / 60) : '', pace(c, t) || '', c.target === null || c.target === undefined ? '' : fmtMetric(c.target, t), c.deload ? 'ja' : 'nein', csvText(c.note)]);
    });
    return csvFile(rows);
  }

  function daysSinceBackup(state, now) {
    now = now || Date.now();
    const ref = state.meta.lastExportAt;
    if (!ref) return null;
    return Math.floor((now - ref) / DAY);
  }
  // Einträge, die nach der letzten Sicherung dazugekommen sind
  function unsavedCount(state) {
    const ref = state.meta.lastExportAt || 0;
    return state.sessions.filter((s) => (s.end || s.start) > ref).length + state.cardio.filter((c) => c.date > ref).length;
  }
  function backupWarning(state, now) {
    now = now || Date.now();
    const hasData = state.sessions.length > 0 || state.cardio.length > 0;
    if (!hasData) return null;
    const d = daysSinceBackup(state, now);
    const limit = state.settings.backupIntervalDays;
    if (d === null) {
      const first = Math.min.apply(null, state.sessions.map((s) => s.start).concat(state.cardio.map((c) => c.date)));
      if (now - first >= 3 * DAY) return 'Du hast noch nie gesichert. Exportiere deine Daten, damit nichts verloren geht.';
      return null;
    }
    // Ist seit der letzten Sicherung nichts dazugekommen, ist sie noch aktuell – dann keine Erinnerung
    const n = unsavedCount(state);
    if (d >= limit && n > 0) return 'Letzte Sicherung vor ' + d + ' Tagen, seitdem ' + (n === 1 ? 'ein neuer Eintrag' : n + ' neue Einträge') + '. Zeit für einen Export.';
    return null;
  }

  // ---------- Scheibenrechner ----------
  // Scheiben pro Seite für eine Langhantel; gierig mit den vorhandenen Scheiben
  function plateLoad(total, bar, list) {
    const plates = (list || []).slice().filter((x) => x > 0).sort((a, b) => b - a);
    if (total === null || total === undefined || isNaN(total)) return null;
    if (total < bar) return { ok: false, perSide: [], text: 'leichter als die Stange (' + fmtKg(bar) + ')' };
    let rest = r2((total - bar) / 2); const out = [];
    for (const p of plates) { while (rest + 1e-9 >= p) { out.push(p); rest = r2(rest - p); } }
    if (rest > 1e-9) {
      const loaded = r2(bar + 2 * out.reduce((a, b) => a + b, 0));
      return { ok: false, perSide: out, text: 'mit deinen Scheiben nicht genau ladbar – nächstes: ' + fmtKg(loaded) };
    }
    return { ok: true, perSide: out, text: out.length ? out.map((x) => fmtNum(x)).join(' + ') + ' je Seite' : 'nur die Stange' };
  }

  // ---------- Monatsrückblick ----------
  function monthReview(state, year, month) {
    const from = new Date(year, month, 1).getTime(), to = new Date(year, month + 1, 1).getTime();
    const gym = state.sessions.filter((s) => s.start >= from && s.start < to);
    const cardio = state.cardio.filter((c) => c.date >= from && c.date < to);
    let sets = 0, volume = 0, seconds = 0;
    const perEx = {};
    gym.forEach((s) => {
      seconds += Math.max(0, (s.end - s.start) / 1000);
      s.exercises.forEach((e) => workSets(e).forEach((x) => { sets++; volume += setVolume(state, e.exId, x); perEx[e.exId] = perEx[e.exId] || { name: (state.exercises[e.exId] || e).name, volume: 0, sets: 0 }; perEx[e.exId].volume += setVolume(state, e.exId, x); perEx[e.exId].sets++; }));
    });
    // Bestwerte im Monat: höchstes Gewicht über allem davor (nur Übungen mit Vorgeschichte)
    const prs = [];
    Object.keys(perEx).forEach((id) => {
      const ex = state.exercises[id]; if (!ex || ex.equip === 'bw') return;
      const before = bestBefore(state, id, from);
      const hadBefore = state.sessions.some((s) => s.start < from && s.exercises.some((y) => y.exId === id && workSets(y).length));
      if (!hadBefore) return;
      let best = 0;
      gym.forEach((s) => s.exercises.forEach((e) => { if (e.exId === id) workSets(e).forEach((x) => { best = Math.max(best, x.w || 0); }); }));
      if (best > before.w) prs.push({ name: ex.name, w: best, before: before.w });
    });
    // Wochen dieses Monats mit vollem Pensum (4 Gym-Einheiten)
    const weeks = {};
    gym.forEach((s) => { const k = weekStart(s.start); weeks[k] = (weeks[k] || 0) + 1; });
    const fullWeeks = Object.values(weeks).filter((n) => n >= 4).length;
    const km = cardio.filter((c) => c.type === 'run').reduce((a, c) => a + (c.distance || 0), 0);
    const top = Object.values(perEx).sort((a, b) => b.volume - a.volume).slice(0, 3).map((x) => ({ name: x.name, volume: r2(x.volume), sets: x.sets }));
    return { year, month, sessions: gym.length, sets, volume: r2(volume), hours: r2(seconds / 3600), cardio: cardio.length, runKm: r2(km), prs, fullWeeks, weeksTrained: Object.keys(weeks).length, top };
  }

  // ---------- Übungsvorschläge ----------
  const VOLUME_TARGET = 10; // Richtwert: ~10+ Sätze pro Muskel und Woche (Schoenfeld, Ogborn & Krieger 2017)
  function libOf(ex) { return Library && ex ? (ex.lib && Library.BY[ex.lib]) || (Library.match(ex.name) && Library.BY[Library.match(ex.name)]) || null : null; }
  function planVolume(state) {
    const perWeek = 4 / Math.max(1, state.days.length); // 4 Einheiten pro Woche in Rotation
    const sets = {}; (Library ? Library.GROUPS : []).forEach((g) => { sets[g] = 0; });
    const unmatched = [];
    state.days.forEach((d) => d.exerciseIds.forEach((id) => {
      const ex = state.exercises[id]; if (!ex || ex.archived) return;
      const L = libOf(ex);
      if (!L) { if (unmatched.indexOf(ex.name) < 0) unmatched.push(ex.name); return; }
      L.primary.forEach((g) => { sets[g] += ex.sets * perWeek; });
      L.secondary.forEach((g) => { sets[g] += ex.sets * perWeek * 0.5; });
    }));
    const groups = Object.keys(sets).map((g) => ({ group: g, sets: r2(sets[g]), status: sets[g] < VOLUME_TARGET ? 'low' : sets[g] > 20 ? 'high' : 'ok' }));
    return { groups, unmatched, target: VOLUME_TARGET, perWeek };
  }
  function planLibKeys(state) {
    const keys = [];
    state.days.forEach((d) => d.exerciseIds.forEach((id) => { const L = libOf(state.exercises[id]); if (L && !state.exercises[id].archived) keys.push(L.key); }));
    return keys;
  }
  function bestDayFor(state, group) {
    let best = null, bestScore = -1;
    state.days.forEach((d) => {
      let score = 0;
      d.exerciseIds.forEach((id) => { const e = state.exercises[id], L = libOf(e); if (!L || e.archived) return; if (L.primary.indexOf(group) >= 0) score += 2; else if (L.secondary.indexOf(group) >= 0) score += 1; });
      score -= d.exerciseIds.length * 0.05;
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }
  function planSuggestions(state) {
    if (!Library || !state.days.length) return [];
    const vol = planVolume(state), used = planLibKeys(state), out = [];
    vol.groups.filter((g) => g.status === 'low').forEach((g) => {
      const usedFam = used.map((k) => Library.BY[k].family);
      const cands = Library.LIST.filter((e) => e.primary.indexOf(g.group) >= 0 && used.indexOf(e.key) < 0 && usedFam.indexOf(e.family) < 0 && out.every((o) => o.key !== e.key));
      const head = g.group + ': ' + fmtNum(g.sets) + ' Sätze pro Woche – unter dem Richtwert von ~' + VOLUME_TARGET + '. ';
      if (cands.length) {
        const e = cands[0], day = bestDayFor(state, g.group);
        out.push({ kind: 'add', group: g.group, sets: g.sets, key: e.key, name: e.name, equip: e.equip, reason: head + e.name + ': ' + e.why, dayId: day ? day.id : null, dayName: day ? day.name : '' });
      } else {
        // keine neue Übung verfügbar → einen Satz bei einer vorhandenen Übung ergänzen
        let pick = null;
        state.days.forEach((d) => d.exerciseIds.forEach((id) => { const ex = state.exercises[id], L = libOf(ex); if (ex && !ex.archived && L && L.primary.indexOf(g.group) >= 0 && (!pick || ex.sets < pick.sets)) pick = ex; }));
        if (pick && pick.sets < 6) out.push({ kind: 'sets', group: g.group, sets: g.sets, exId: pick.id, name: pick.name, reason: head + 'Alle passenden Übungen sind schon im Plan – ein zusätzlicher Satz bei ' + pick.name + ' (' + pick.sets + ' → ' + (pick.sets + 1) + ') bringt dich näher heran.' });
      }
    });
    return out;
  }
  function alternatives(state, libKey) {
    if (!Library || !Library.BY[libKey]) return [];
    const src = Library.BY[libKey], used = planLibKeys(state);
    const score = (e) => {
      const same = e.primary.filter((g) => src.primary.indexOf(g) >= 0).length;
      return same * 10 + (e.anim === src.anim ? 3 : 0) + (e.equip !== src.equip ? 1 : 0);
    };
    return Library.LIST.filter((e) => e.key !== libKey && e.primary.some((g) => src.primary.indexOf(g) >= 0))
      .map((e) => {
        const same = e.primary.filter((g) => src.primary.indexOf(g) >= 0);
        const eq = e.equip !== src.equip ? ' Mit ' + EQUIP[e.equip] + ' statt ' + EQUIP[src.equip] + '.' : '';
        return { key: e.key, name: e.name, equip: e.equip, inPlan: used.indexOf(e.key) >= 0, score: score(e),
          reason: 'Gleiche Zielmuskeln (' + same.join(', ') + '). ' + e.why + eq };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'de'))
      .slice(0, 6);
  }
  // Übung aus der Bibliothek im Plan anlegen (Parameter wie die übrigen Übungen)
  function exerciseFromLib(state, key, opts) {
    const L = Library.BY[key];
    const existing = Object.values(state.exercises).find((e) => e.lib === key);
    if (existing) { if (opts && opts.unarchive) existing.archived = false; return existing; }
    const e = { id: uid('e'), name: L.name, equip: L.equip, sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '', archived: !!(opts && opts.archived), suggested: !!(opts && opts.suggested), lib: key };
    state.exercises[e.id] = e;
    return e;
  }
  function addSetToExercise(state, exId) { const e = state.exercises[exId]; if (e) e.sets = Math.min(10, e.sets + 1); return e; }
  function addFromLib(state, key, dayId) {
    const e = exerciseFromLib(state, key, { suggested: true, unarchive: true });
    const d = state.days.find((x) => x.id === dayId) || state.days[0];
    if (d.exerciseIds.indexOf(e.id) < 0) d.exerciseIds.push(e.id);
    return e;
  }
  function replaceInPlan(state, oldId, key) {
    const old = state.exercises[oldId];
    const ne = exerciseFromLib(state, key, { unarchive: true });
    if (ne.id === oldId) return ne;
    ['sets', 'repMin', 'repMax', 'rest', 'step'].forEach((k) => { ne[k] = old[k]; });
    ne.suggested = false;
    state.days.forEach((d) => { d.exerciseIds = d.exerciseIds.map((id) => (id === oldId ? ne.id : id)).filter((id, i, arr) => arr.indexOf(id) === i); });
    renameInSupersets(state, oldId, ne.id);
    old.archived = true;
    return ne;
  }
  // Übung in der laufenden Einheit tauschen (nur heute oder dauerhaft)
  function swapInSession(state, idx, key, permanent, now) {
    const a = state.active, cur = a.exercises[idx];
    let ne;
    if (permanent) ne = replaceInPlan(state, cur.exId, key);
    else ne = exerciseFromLib(state, key, { archived: true });
    const s = suggest(state, ne.id, now || Date.now(), { deload: a.deload });
    const sets = [];
    for (let i = 0; i < s.sets; i++) sets.push({ w: s.weight, r: s.reps[i] !== undefined ? s.reps[i] : eff(ne).repMin, rir: null, warmup: false, done: false });
    a.exercises[idx] = { exId: ne.id, name: ne.name, note: '', swappedFrom: cur.name, ss: cur.ss, sugg: { weight: s.weight, reps: s.reps, kind: s.kind, reason: s.reason, last: s.last ? { W: s.last.W, reps: s.last.reps, date: s.last.date } : null }, sets };
    return ne;
  }

  // ---------- Plan-Optimierung (alle 3 Wochen, immer nur ein Vorschlag) ----------
  const OPT_DAYS = 21, OPT_MIN_SESSIONS = 6, VOLUME_HIGH = 22;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function optimState(state) { return Object.assign({ lastAt: null, snoozeUntil: null, undo: null, log: [] }, state.optim || {}); }
  function optimizeDue(state, now) {
    now = now || Date.now();
    const O = optimState(state);
    if (!state.sessions.length || (O.snoozeUntil && now < O.snoozeUntil)) return null;
    const since = O.lastAt || state.sessions.reduce((m, x) => Math.min(m, x.start), Infinity);
    const n = state.sessions.filter((x) => x.start >= since && !x.deload).length;
    const days = Math.floor((now - since) / DAY);
    if (days >= OPT_DAYS && n >= OPT_MIN_SESSIONS) return { days, sessions: n, first: !O.lastAt };
    return null;
  }
  // Startgewicht nur aus eigenen Daten: dieselbe Übung schon einmal trainiert (z. B. „heute stattdessen“ oder archiviert)
  function ownStartWeight(state, key, now) {
    const ex = Object.values(state.exercises).find((e) => e.lib === key);
    if (!ex || !usesWeight(ex) || !exerciseHistory(state, ex.id).length) return null;
    const sg = suggest(state, ex.id, now, { deload: false });
    return sg.weight === null || sg.weight === undefined ? null : { w: sg.weight, last: sg.last };
  }
  function optimizePlan(state, now) {
    now = now || Date.now();
    const P = state.settings.progression;
    const changes = [], touched = {}, usedKeys = planLibKeys(state);
    const fam = (k) => (Library && Library.BY[k] ? Library.BY[k].family : null);
    const usedFam = () => usedKeys.map(fam).filter(Boolean);
    const add = (c) => { c.id = 'c' + (changes.length + 1); changes.push(c); return c; };
    const dayOf = (exId) => state.days.find((d) => d.exerciseIds.indexOf(exId) >= 0);
    let analysed = 0;
    // 1) Stagnation: pro Trainingstag höchstens ein Tausch (die hartnäckigste Übung), sonst Gewicht zurücknehmen
    const pickAlt = (L0) => {
      if (!L0) return null;
      let best = null, bestScore = -1;
      Library.LIST.forEach((e) => {
        if (e.key === L0.key || usedKeys.indexOf(e.key) >= 0 || usedFam().indexOf(e.family) >= 0) return;
        if (e.primary.indexOf(L0.primary[0]) < 0) return; // Hauptmuskel muss gleich bleiben
        const overlap = e.primary.filter((g) => L0.primary.indexOf(g) >= 0).length;
        const score = (e.anim === L0.anim ? 100 : 0) + (overlap === L0.primary.length ? 40 : 0) + overlap * 10 + (e.equip !== L0.equip ? 1 : 0);
        if (score > bestScore) { bestScore = score; best = e; }
      });
      return best;
    };
    state.days.forEach((d) => {
      const stalled = [];
      d.exerciseIds.forEach((exId) => {
        const ex = state.exercises[exId];
        if (!ex || ex.archived || touched[exId]) return;
        const hist = exerciseHistory(state, exId);
        if (hist.length < 3) return;
        analysed++;
        const a = analyze(hist, ex), steps = a.steps, L = a.last;
        const block = steps.filter((x) => x.date >= now - OPT_DAYS * DAY);
        const flat = block.length >= 3 && block[block.length - 1].W <= block[0].W && block[block.length - 1].total <= block[0].total && !block.some((x) => x.allTop);
        if (!(a.stall >= P.stallReduce || flat)) return;
        const wt = usesWeight(ex);
        const lastTxt = repsLabel(L.reps) + (wt ? ' mit ' + fmtKg(L.W) + (ex.equip === 'bwplus' ? ' Zusatz' : '') : '');
        const why = a.stall >= P.stallReduce ? a.stall + '× in Folge ohne Steigerung (zuletzt ' + lastTxt + ')' : 'in den letzten 3 Wochen kein Fortschritt (' + block.length + ' Einheiten, zuletzt ' + lastTxt + ')';
        stalled.push({ ex, exId, L, wt, why, weight: Math.max(a.stall, flat ? P.stallReduce : 0) });
      });
      stalled.sort((x, y) => y.weight - x.weight);
      let swapped = false;
      stalled.forEach((st) => {
        const { ex, exId, L, wt, why } = st;
        touched[exId] = true;
        const alt = swapped ? null : pickAlt(libOf(ex));
        if (alt) {
          swapped = true;
          const sw = ownStartWeight(state, alt.key, now);
          usedKeys.push(alt.key);
          const same = alt.primary.filter((g) => libOf(ex).primary.indexOf(g) >= 0);
          add({ kind: 'replace', dayId: d.id, exId, oldName: ex.name, key: alt.key, newName: alt.name, equip: alt.equip, startWeight: sw ? sw.w : null,
            weightNote: !usesWeight({ equip: alt.equip }) ? 'ohne Gewicht' : sw ? 'aus deinem eigenen Verlauf mit dieser Übung' : 'noch kein eigener Wert – beim ersten Mal selbst eintragen',
            reason: ex.name + ': ' + why + '. Neuer Reiz für dieselben Muskeln (' + same.join(', ') + '): ' + alt.why + (alt.equip !== ex.equip ? ' Mit ' + EQUIP[alt.equip] + ' statt ' + EQUIP[ex.equip] + '.' : '') });
        } else if (wt && L.W > 0) {
          const w = reduceWeight(L.W, ex.step, P.reducePct);
          add({ kind: 'reset', dayId: d.id, exId, name: ex.name, from: L.W, to: w,
            reason: ex.name + ': ' + why + '. ' + (swapped ? 'Pro Tag wird nur eine Übung getauscht, damit Fortschritte vergleichbar bleiben. Hier daher:' : 'Keine passende Alternative frei, daher:') + ' Gewicht auf ' + fmtKg(w) + ' (−' + Math.round((1 - w / L.W) * 100) + ' %) und von dort wieder steigern.' });
        }
      });
    });
    // 2) Satzverteilung pro Muskel (nach den Tauschvorschlägen)
    const sim = clone({ exercises: state.exercises, days: state.days, settings: state.settings });
    changes.filter((c) => c.kind === 'replace').forEach((c) => {
      const L = Library.BY[c.key], tmpId = 'tmp-' + c.id, old = sim.exercises[c.exId];
      sim.exercises[tmpId] = Object.assign({}, old, { id: tmpId, name: L.name, equip: L.equip, lib: c.key });
      sim.days.forEach((d) => { d.exerciseIds = d.exerciseIds.map((x) => (x === c.exId ? tmpId : x)); });
    });
    const vol = planVolume(sim);
    vol.groups.filter((g) => g.status === 'low').forEach((g) => {
      const head = g.group + ': ' + fmtNum(g.sets) + ' Sätze pro Woche, Richtwert ~' + VOLUME_TARGET + ' (Schoenfeld, Ogborn & Krieger 2017). ';
      // erst eine vorhandene Übung um einen Satz ergänzen, sonst eine neue Übung
      let pick = null;
      state.days.forEach((d) => d.exerciseIds.forEach((id) => {
        const ex = state.exercises[id], L = libOf(ex);
        if (!ex || ex.archived || touched[id] || !L || L.primary.indexOf(g.group) < 0 || ex.sets >= 5) return;
        if (!pick || ex.sets < pick.sets) pick = ex;
      }));
      const need = Math.ceil((VOLUME_TARGET - g.sets) / (vol.perWeek || 1));
      if (pick && need <= 1) {
        touched[pick.id] = true;
        add({ kind: 'sets', dayId: dayOf(pick.id).id, exId: pick.id, name: pick.name, from: pick.sets, to: pick.sets + 1, reason: head + 'Ein Satz mehr bei ' + pick.name + ' reicht dafür.' });
        return;
      }
      const plusSets = (ex) => Math.min(5, ex.sets + Math.min(2, need)) - ex.sets;
      const cand = Library.LIST.find((e) => e.primary.indexOf(g.group) >= 0 && usedKeys.indexOf(e.key) < 0 && usedFam().indexOf(e.family) < 0);
      if (cand) {
        const day = bestDayFor(state, g.group), sw = ownStartWeight(state, cand.key, now);
        usedKeys.push(cand.key);
        add({ kind: 'add', dayId: day ? day.id : state.days[0].id, key: cand.key, newName: cand.name, equip: cand.equip, startWeight: sw ? sw.w : null,
          weightNote: !usesWeight({ equip: cand.equip }) ? 'ohne Gewicht' : sw ? 'aus deinem eigenen Verlauf mit dieser Übung' : 'noch kein eigener Wert – beim ersten Mal selbst eintragen',
          reason: head + cand.name + ': ' + cand.why });
      } else if (pick) {
        touched[pick.id] = true;
        const n = plusSets(pick);
        add({ kind: 'sets', dayId: dayOf(pick.id).id, exId: pick.id, name: pick.name, from: pick.sets, to: pick.sets + n, reason: head + 'Alle passenden Übungen sind im Plan – ' + (n > 1 ? n + ' Sätze' : 'ein Satz') + ' mehr bei ' + pick.name + (pick.sets + n >= 5 ? ' (Obergrenze 5 Sätze pro Übung).' : '.') });
      }
    });
    vol.groups.filter((g) => g.sets > VOLUME_HIGH).forEach((g) => {
      let pick = null;
      state.days.forEach((d) => d.exerciseIds.forEach((id) => {
        const ex = state.exercises[id], L = libOf(ex);
        if (!ex || ex.archived || touched[id] || !L || L.primary.indexOf(g.group) < 0 || ex.sets <= 2) return;
        if (!pick || ex.sets > pick.sets) pick = ex;
      }));
      if (!pick) return;
      touched[pick.id] = true;
      const after = r2(g.sets - vol.perWeek);
      add({ kind: 'sets', dayId: dayOf(pick.id).id, exId: pick.id, name: pick.name, from: pick.sets, to: pick.sets - 1,
        reason: g.group + ': ' + fmtNum(g.sets) + ' Sätze pro Woche. Mehr schadet nicht, der Zusatznutzen ist aber unsicher – ein Satz weniger bei ' + pick.name + ' spart Zeit, der Muskel bleibt mit ~' + fmtNum(after) + ' Sätzen klar über dem Richtwert.' });
    });
    // 3) Unveränderte Übungen: nächstes Gewicht laut Progression (zur Übersicht)
    const days = state.days.map((d) => ({
      dayId: d.id, name: d.name,
      changes: changes.filter((c) => c.dayId === d.id),
      keep: d.exerciseIds.filter((id) => state.exercises[id] && !state.exercises[id].archived && !touched[id]).map((id) => {
        const ex = state.exercises[id], sg = suggest(state, id, now, { deload: false });
        return { exId: id, name: ex.name, weight: usesWeight(ex) ? sg.weight : null, kind: sg.kind, equip: ex.equip };
      })
    }));
    return { createdAt: now, analysed, sessions: state.sessions.length, changes, days };
  }
  function applyOptimization(state, proposal, ids, now) {
    now = now || Date.now();
    const pick = proposal.changes.filter((c) => ids.indexOf(c.id) >= 0);
    const O = optimState(state);
    O.undo = { at: now, exercises: clone(state.exercises), days: clone(state.days), sessions: state.sessions.length };
    const done = [];
    const order = { replace: 0, reset: 1, sets: 2, add: 3 };
    pick.sort((a, b) => order[a.kind] - order[b.kind]).forEach((c) => {
      const ex = c.exId ? state.exercises[c.exId] : null;
      if (c.kind === 'replace') {
        if (!ex || ex.archived || !state.days.some((d) => d.exerciseIds.indexOf(c.exId) >= 0)) return;
        replaceInPlan(state, c.exId, c.key);
      } else if (c.kind === 'reset') {
        if (!ex || ex.archived) return;
        ex.nextWeight = c.to; ex.nextReason = 'Neuer Block nach der Planoptimierung: ' + fmtKg(c.to) + ' (vorher ' + fmtKg(c.from) + ') – von hier aus wieder steigern.';
      } else if (c.kind === 'sets') {
        if (!ex || ex.archived) return;
        ex.sets = Math.max(1, Math.min(10, c.to));
      } else if (c.kind === 'add') {
        addFromLib(state, c.key, c.dayId);
      }
      done.push(c.id);
    });
    O.lastAt = now; O.snoozeUntil = null;
    O.log = (O.log || []).concat([{ at: now, proposed: proposal.changes.length, accepted: done.length }]).slice(-12);
    if (!done.length) O.undo = null;
    state.optim = O;
    return done;
  }
  function optimizationChecked(state, now) { const O = optimState(state); O.lastAt = now || Date.now(); O.snoozeUntil = null; state.optim = O; }
  function snoozeOptimization(state, now, days) { const O = optimState(state); O.snoozeUntil = (now || Date.now()) + (days || 7) * DAY; state.optim = O; }
  function canUndoOptimization(state) { const O = optimState(state); return !!(O.undo && O.undo.sessions === state.sessions.length && !state.active); }
  function undoOptimization(state) {
    if (!canUndoOptimization(state)) return false;
    const O = optimState(state);
    state.exercises = O.undo.exercises; state.days = O.undo.days; O.undo = null; state.optim = O;
    return true;
  }

  // ---------- Körperdaten ----------
  function bodyWeightAt(state, ts) {
    const list = (state.body || []).filter((b) => b.date <= (ts || Date.now()) + DAY / 2).sort((a, b) => a.date - b.date);
    return list.length ? list[list.length - 1].kg : null;
  }
  function logBodyWeight(state, kg, now) {
    now = now || Date.now();
    if (!(kg > 20 && kg < 400)) return false;
    state.body = (state.body || []).filter((b) => new Date(b.date).toDateString() !== new Date(now).toDateString());
    state.body.push({ date: now, kg: r2(kg) });
    state.body.sort((a, b) => a.date - b.date);
    return true;
  }
  function currentAge(state, now) {
    const pr = (state.settings && state.settings.profile) || {};
    if (!pr.age) return null;
    return pr.age + Math.floor(((now || Date.now()) - (pr.ageAt || now || Date.now())) / (365.25 * DAY));
  }
  // Maximalpuls geschätzt nach Tanaka, Monahan & Seals (2001): 208 − 0,7 × Alter. Nur eine Schätzung.
  function heartZones(age) {
    if (!age || age < 10 || age > 100) return null;
    const max = Math.round(208 - 0.7 * age);
    const z = (a, b) => [Math.round(max * a), Math.round(max * b)];
    return { max, easy: z(0.6, 0.7), steady: z(0.7, 0.8), hard: z(0.8, 0.9) };
  }

  return {
    loadMode, sidesMode, repFactor, repLoad, totalWeight, loadLabel, eff, setVolume,
    optimizeDue, optimizePlan, applyOptimization, optimizationChecked, snoozeOptimization, canUndoOptimization, undoOptimization, bodyWeightAt, logBodyWeight, currentAge, heartZones,
    DAY, SCHEMA, VOLUME_TARGET, plateLoad, monthReview, planVolume, planSuggestions, alternatives, addFromLib, addSetToExercise, replaceInPlan, swapInSession, exerciseFromLib, libOf, EQUIP, CARDIO, uid, r2, fmtNum, fmtKg, fmtDate, fmtDateLong, fmtTime, fmtDuration, parseDuration, parseNum, repsLabel,
    weekStart, isoWeek, e1rm, usesWeight, defaultSettings, defaultPlan, defaultState, migrate, validateImport,
    exerciseHistory, summarize, analyze, suggest, reduceWeight, deloadCheck, acceptDeload, declineDeload, endDeload, activeExerciseIds,
    nextDay, startSession, propagateWeight, sessionVolume, sessionPRs, finishSession, weekOverview, weeklyStats,
    cardioMetric, fmtMetric, pace, cardioSuggest, logCardio, exerciseSeries, personalRecords, daysSinceBackup, unsavedCount, backupWarning, addShoulderDay,
    ssPairs, ssInfo, setSuperset, renameInSupersets, ssPartnerIdx, ssAfterCheck, setsCSV, cardioCSV
  };
});
