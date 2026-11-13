/* Herakles – Aktionen, Ereignisse, Start. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, LIB, AN, VERSION, applyFontMetrics, SPRIG, EMBLEM, $, esc, now, ui, save, load, toast, dismissSheet, initSheetDrag, sheet, closeSheet,
    confirmBox, haptic, applyTheme, setAudioSession, audioUnlock, beep, flash, wakeOn, wakeOff, flip, countUp, popCheck, render, curEx, selIdx, tick,
    startTimer, exerciseForm, readExerciseForm, openInfo, summaryImage, shareSummary, optCount, openOptimize, setByPath, stepWeight, carryWeight,
    exerciseDoneAll, openCardioSheet, updateCardioPace, openSessionEditor, saveSessionEditor, exportData, importFile, exportTable, supersetBox } = HK;

  const A = {
    nav(el) { HK.view = el.dataset.v; closeSheet(); render(); window.scrollTo(0, 0); },
    'go-gym'() { HK.view = 'gym'; audioUnlock(); wakeOn(); render(); },
    start(el) {
      audioUnlock();
      C.startSession(HK.S, el.dataset.day, now()); save(); HK.view = 'gym'; ui.sel = {}; render(); window.scrollTo(0, 0); wakeOn();
    },
    'pick-day'() {
      sheet('<h3>Welcher Tag?</h3><div class="list">' + HK.S.days.map((d) => '<button class="li" data-a="start-day" data-day="' + d.id + '"><div class="grow"><div class="t">' + esc(d.name) + '</div><div class="s">' + d.exerciseIds.filter((id) => HK.S.exercises[id] && !HK.S.exercises[id].archived).length + ' Übungen</div></div>›</button>').join('') + '</div>');
    },
    'start-day'(el) { closeSheet(); A.start(el); },
    'sheet-bg'(el, ev) { if (ev.target === el) dismissSheet(); },
    'sheet-dismiss'() { dismissSheet(); },
    async 'share-summary'() { await shareSummary(); },
    'opt-open'() { if (HK.S.active) { toast('Erst die laufende Einheit beenden'); return; } if (HK.view !== 'plan') { HK.view = 'plan'; render(); } openOptimize(); },
    'opt-snooze'() { C.snoozeOptimization(HK.S, now(), 7); save(); render(); toast('Erinnerung in einer Woche'); },
    'opt-none'() { C.optimizationChecked(HK.S, now()); save(); closeSheet(); render(); },
    'opt-apply'() {
      const p = ui.optProposal; if (!p) return;
      const ids = Array.from(document.querySelectorAll('.optck:checked')).map((x) => x.value);
      if (!ids.length) return;
      const done = C.applyOptimization(HK.S, p, ids, now());
      ui.optProposal = null; save(); closeSheet(); render();
      toast(done.length + (done.length === 1 ? ' Änderung' : ' Änderungen') + ' übernommen');
    },
    async 'opt-undo'() {
      if (!(await confirmBox('Optimierung rückgängig?', 'Der Plan wird auf den Stand vor der letzten Übernahme zurückgesetzt.', 'Rückgängig'))) return;
      if (C.undoOptimization(HK.S)) { save(); render(); toast('Plan zurückgesetzt'); }
    },
    'cf-yes'() { const p = HK.pendingConfirm; HK.pendingConfirm = null; closeSheet(); if (p) p(true); },
    'cf-no'() { const p = HK.pendingConfirm; HK.pendingConfirm = null; closeSheet(); if (p) p(false); },
    'deload-yes'() { C.acceptDeload(HK.S, now()); save(); toast('Deload-Woche aktiv'); render(); },
    'deload-no'() { C.declineDeload(HK.S, now()); save(); toast('Erinnerung in 7 Tagen'); render(); },
    async 'deload-end'() { if (await confirmBox('Deload beenden?', 'Ab der nächsten Einheit gelten wieder die normalen Vorschläge.', 'Beenden')) { C.endDeload(HK.S); save(); render(); } },
    'apply-update'() { if (HK.updateReady) HK.updateReady.postMessage('skipWaiting'); },

    // Gym
    'sel-set'(el) { const e = curEx(); ui.sel[e.exId + '#' + HK.S.active.cur] = +el.dataset.i; render(); },
    'w-'() { const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return; const old = s.w; stepWeight(e, s, -1); carryWeight(e, i, old); save(); render(); if (s.w !== old) flip($('[data-testid="w-input"]'), -1); },
    'w+'() { const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return; const old = s.w; stepWeight(e, s, 1); carryWeight(e, i, old); save(); render(); if (s.w !== old) flip($('[data-testid="w-input"]'), 1); },
    'r-'() { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; const old = s.r || 0; s.r = Math.max(0, old - 1); save(); render(); if (s.r !== old) flip($('[data-testid="r-input"]'), -1); },
    'r+'() { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; s.r = (s.r || 0) + 1; save(); render(); flip($('[data-testid="r-input"]'), 1); },
    rir(el) { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; const v = +el.dataset.v; s.rir = s.rir === v ? null : v; save(); render(); },
    warm() { const e = curEx(), s = e.sets[selIdx(e)]; if (!s) return; s.warmup = !s.warmup; save(); render(); },
    check() {
      const e = curEx(), i = selIdx(e), s = e.sets[i]; if (!s) return;
      const ck = e.exId + '#' + i;
      if (!s.done && now() - HK.lastCheck < 450 && HK.lastCheckKey !== ck) return; // versehentlicher Doppeltipp würde sonst den nächsten Satz abhaken
      HK.lastCheck = now(); HK.lastCheckKey = ck;
      const ex = HK.S.exercises[e.exId];
      audioUnlock(); wakeOn();
      if (s.done) { s.done = false; save(); render(); return; }
      if (ex && C.usesWeight(ex) && (s.w === null || s.w === undefined)) { toast('Bitte zuerst das Gewicht eintragen'); const inp = $('[data-c=w]'); if (inp) inp.focus(); return; }
      if (!s.r) { toast('Wiederholungen eintragen'); return; }
      s.done = true; s.t = now(); haptic();
      if (!s.warmup) C.propagateWeight(e, i);
      delete ui.sel[e.exId + '#' + HK.S.active.cur];
      const rest = ex ? ex.rest : 90, a = HK.S.active;
      // Supersatz: nach der ersten Übung ohne Pause zur zweiten, nach der zweiten Pause und zurück
      const ss = s.warmup ? { goto: null, rest: true } : C.ssAfterCheck(a, a.cur);
      if (!ss.rest) a.timer = null;
      else if (rest > 0) startTimer(s.warmup ? Math.min(60, rest) : rest, e.name);
      const pi = C.ssPartnerIdx(a, a.cur);
      if (ss.goto !== null) { a.cur = ss.goto; toast('Supersatz: ' + (ss.rest ? 'nach der Pause' : 'ohne Pause') + ' weiter mit ' + a.exercises[ss.goto].name); }
      else if (exerciseDoneAll(e) && (pi < 0 || exerciseDoneAll(a.exercises[pi]))) toast(a.cur < a.exercises.length - 1 ? (pi < 0 ? 'Übung' : 'Supersatz') + ' erledigt – weiter mit „Nächste Übung ›“' : 'Letzte Übung erledigt – „Training beenden“');
      save(); render();
      if (ss.goto === null) popCheck(i); else window.scrollTo(0, 0);
    },
    'add-set'() { const e = curEx(), last = e.sets.filter((s) => !s.warmup).pop() || e.sets[e.sets.length - 1]; e.sets.push({ w: last ? last.w : e.sugg.weight, r: last ? last.r : 8, rir: null, warmup: false, done: false }); ui.sel[e.exId + '#' + HK.S.active.cur] = e.sets.length - 1; save(); render(); },
    'add-warm'() { const e = curEx(), w = e.sugg.weight; e.sets.unshift({ w: w ? Math.round(w * 0.5 / 2.5) * 2.5 : null, r: 10, rir: null, warmup: true, done: false }); ui.sel[e.exId + '#' + HK.S.active.cur] = 0; save(); render(); },
    'del-set'() { const e = curEx(), i = selIdx(e); if (i < 0 || e.sets.length < 2) return; e.sets.splice(i, 1); delete ui.sel[e.exId + '#' + HK.S.active.cur]; save(); render(); },
    'toggle-note'() { const e = curEx(); ui.showNote[e.exId] = !ui.showNote[e.exId]; render(); },
    'ex-prev'() { if (HK.S.active.cur > 0) { HK.S.active.cur--; save(); render(); window.scrollTo(0, 0); } },
    'ex-next'() { if (HK.S.active.cur < HK.S.active.exercises.length - 1) { HK.S.active.cur++; save(); render(); window.scrollTo(0, 0); } },
    'ex-list'() {
      const a = HK.S.active;
      sheet('<h3>Übungen</h3><div class="list">' + a.exercises.map((e, i) => { const d = e.sets.filter((s) => s.done && !s.warmup).length, n = e.sets.filter((s) => !s.warmup).length; return '<button class="li" data-a="ex-goto" data-i="' + i + '"><div class="grow"><div class="t">' + (i === a.cur ? '▸ ' : '') + esc(e.name) + '</div><div class="s">' + d + '/' + n + ' Sätze' + (e.ss ? ', Supersatz' : '') + '</div></div>' + (n && d >= n ? '✓' : '') + '</button>'; }).join('') + '</div><button class="btn block ghost" data-a="discard" style="margin-top:6px">Einheit verwerfen</button>');
    },
    'ex-goto'(el) { HK.S.active.cur = +el.dataset.i; save(); closeSheet(); render(); window.scrollTo(0, 0); },
    't-minus'() { const t = HK.S.active.timer; if (t) { t.endsAt -= 15000; t.total = Math.max(1, t.total - 15); save(); tick(); } },
    't-plus'() { const t = HK.S.active.timer; if (t) { t.endsAt = Math.max(now(), t.endsAt) + 15000; t.total += 15; t.fired = false; save(); tick(); } },
    't-skip'() { HK.S.active.timer = null; save(); tick(); },
    async discard() {
      closeSheet();
      if (await confirmBox('Einheit verwerfen?', 'Alle Sätze dieser Einheit werden gelöscht. Das kann nicht rückgängig gemacht werden.', 'Verwerfen', true)) { HK.S.active = null; save(); wakeOff(); HK.view = 'home'; render(); }
    },
    async finish() {
      const a = HK.S.active, done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0), open = a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done && !s.warmup).length, 0);
      if (!done) { if (await confirmBox('Noch kein Satz erledigt', 'Einheit ohne Sätze verwerfen?', 'Verwerfen', true)) { HK.S.active = null; save(); wakeOff(); HK.view = 'home'; render(); } return; }
      if (!(await confirmBox('Training beenden?', done + ' Sätze erledigt' + (open ? ', ' + open + ' offen (werden nicht gespeichert)' : '') + '.', 'Beenden'))) return;
      const sum = C.finishSession(HK.S, now()); save(); wakeOff(); HK.view = 'home';
      render();
      const nd = (C.nextDay(HK.S) || {}).name || '';
      ui.justDone = sum.session.id;
      ui.lastSummary = { day: sum.session.dayName, date: sum.session.start, dur: sum.durationSec, sets: sum.sets, vol: sum.volume, prs: sum.prs, deload: sum.session.deload };
      sheet('<div class="finish-card" data-testid="summary-card">' + EMBLEM + '<div class="fc-eye">Einheit abgeschlossen, ' + C.fmtDateLong(sum.session.start) + '</div><div class="fc-title">' + esc(sum.session.dayName) + (sum.session.deload ? ', Deload' : '') + '</div>' +
        '<div class="kv" data-testid="summary"><div><b class="num" data-cu="dur" data-v="' + Math.round(sum.durationSec) + '">' + C.fmtDuration(sum.durationSec) + '</b><span>Dauer</span></div><div><b class="num" data-cu="int" data-v="' + sum.sets + '">' + sum.sets + '</b><span>Sätze</span></div><div><b class="num" data-cu="num" data-v="' + Math.round(sum.volume) + '">' + C.fmtNum(Math.round(sum.volume)) + '</b><span>kg Volumen</span></div></div>' +
        (sum.prs.length ? '<div class="fc-prs"><div class="fc-eye">Neue Bestwerte</div>' + sum.prs.map((p) => '<div class="fc-pr">' + SPRIG + '<div><div class="t">' + esc(p.name) + '</div><div class="s">' + esc(p.text) + '</div></div></div>').join('') + '</div>' : '<div class="fc-note">Keine neuen Bestwerte. Beständigkeit zählt.</div>') +
        '</div><div class="small muted" style="margin-top:12px">Nächstes Training: <b>' + esc(nd) + '</b></div><div class="actions"><button class="btn" data-a="share-summary" data-testid="share-summary">Als Bild teilen</button><button class="btn primary" data-a="close">Fertig</button></div>');
      countUp($('#sheet-root .finish-card'));
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
      if (await confirmBox('Einheit löschen?', 'Die Einheit und alle Sätze werden entfernt. Die Vorschläge rechnen danach ohne sie.', 'Löschen', true)) { HK.S.sessions = HK.S.sessions.filter((s) => s.id !== id); save(); toast('Einheit gelöscht'); render(); }
    },
    'se-delset'(el) { const row = el.closest('.editset'); if (row) row.remove(); },
    async 'cardio-del'(el) { if (await confirmBox('Cardio-Einheit löschen?', '', 'Löschen', true)) { HK.S.cardio = HK.S.cardio.filter((c) => c.id !== el.dataset.id); save(); render(); } },
    'cardio-log'() { openCardioSheet(HK.S.settings.cardioType); },
    'cardio-type'(el) { openCardioSheet(el.dataset.v); },
    'cardio-save'(el) {
      const type = el.dataset.t, T = C.CARDIO[type];
      let dist = C.parseNum($('#c-dist').value); const dur = C.parseDuration($('#c-dur').value);
      if (type === 'swim' && dist !== null) dist = dist / 1000;
      if (T.metric === 'distance' && !(dist > 0)) { toast('Bitte Distanz eintragen'); return; }
      if (T.metric === 'duration' && !(dur > 0)) { toast('Bitte Dauer eintragen'); return; }
      const dv = $('#c-date').value; const dt = dv ? new Date(dv + 'T12:00').getTime() : now();
      C.logCardio(HK.S, { type, distance: dist, duration: dur, note: $('#c-note').value.trim(), date: dt }, now());
      save(); closeSheet(); toast('Cardio gespeichert'); render();
    },

    // Plan
    'ex-up'(el) { const d = HK.S.days[+el.dataset.d], i = +el.dataset.i; if (i > 0) { const l = d.exerciseIds; [l[i - 1], l[i]] = [l[i], l[i - 1]]; save(); render(); } },
    'ex-down'(el) { const d = HK.S.days[+el.dataset.d], i = +el.dataset.i, l = d.exerciseIds; if (i < l.length - 1) { [l[i + 1], l[i]] = [l[i], l[i + 1]]; save(); render(); } },
    'ex-edit'(el) {
      const e = HK.S.exercises[el.dataset.id];
      sheet(exerciseForm(e, 'Übung bearbeiten') + supersetBox(e, +el.dataset.d) + '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="ex-save" data-id="' + e.id + '">Speichern</button></div><div class="actions"><button class="btn ghost" data-a="ex-replace" data-id="' + e.id + '" data-d="' + el.dataset.d + '">Ersetzen</button><button class="btn ghost" data-a="ex-archive" data-id="' + e.id + '">Archivieren</button></div>');
    },
    // Supersatz bilden oder lösen (Änderungen im Formular werden dabei mitgespeichert)
    'ss-set'(el) {
      const e = HK.S.exercises[el.dataset.id], d = HK.S.days[+el.dataset.d], on = el.dataset.on === '1';
      if (!e || !d || !readExerciseForm(e)) return;
      const p = C.setSuperset(HK.S, d.id, e.id, on); if (!p) return;
      e.suggested = false; save(); closeSheet(); render();
      toast(on ? 'Supersatz: ' + e.name + ' + ' + HK.S.exercises[p].name : 'Supersatz gelöst');
    },
    'ex-save'(el) { const e = HK.S.exercises[el.dataset.id]; if (!readExerciseForm(e)) return; e.suggested = false; save(); closeSheet(); render(); },
    'ex-replace'(el) {
      const old = HK.S.exercises[el.dataset.id];
      const tmp = Object.assign({}, old, { name: '', note: '' });
      sheet(exerciseForm(tmp, 'Ersetzen: ' + old.name, '<p class="small muted">Die neue Übung übernimmt den Platz im Plan. „' + esc(old.name) + '“ wird archiviert – ihr Verlauf bleibt erhalten.</p>') + '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="ex-replace-do" data-id="' + old.id + '">Ersetzen</button></div>');
    },
    'ex-replace-do'(el) {
      const old = HK.S.exercises[el.dataset.id];
      const ne = { id: C.uid('e'), name: '', equip: old.equip, sets: old.sets, repMin: old.repMin, repMax: old.repMax, rest: old.rest, step: old.step, note: '', archived: false, suggested: false };
      if (!readExerciseForm(ne)) return;
      HK.S.exercises[ne.id] = ne; old.archived = true;
      HK.S.days.forEach((d) => { d.exerciseIds = d.exerciseIds.map((id) => (id === old.id ? ne.id : id)); });
      C.renameInSupersets(HK.S, old.id, ne.id);
      save(); closeSheet(); toast('Ersetzt'); render();
    },
    async 'ex-archive'(el) {
      const e = HK.S.exercises[el.dataset.id]; closeSheet();
      if (await confirmBox('„' + e.name + '“ archivieren?', 'Die Übung verschwindet aus dem Plan. Der Verlauf bleibt erhalten und du kannst sie zurückholen.', 'Archivieren')) {
        e.archived = true; HK.S.days.forEach((d) => { d.exerciseIds = d.exerciseIds.filter((id) => id !== e.id); }); save(); render();
      }
    },
    'ex-restore'(el) {
      const e = HK.S.exercises[el.dataset.id];
      sheet('<h3>„' + esc(e.name) + '“ zurückholen</h3><div class="list">' + HK.S.days.map((d, i) => '<button class="li" data-a="ex-restore-to" data-id="' + e.id + '" data-d="' + i + '">' + esc(d.name) + '</button>').join('') + '</div>');
    },
    'ex-restore-to'(el) { const e = HK.S.exercises[el.dataset.id]; e.archived = false; HK.S.days[+el.dataset.d].exerciseIds.push(e.id); save(); closeSheet(); render(); },
    'ex-add'(el) {
      const di = +el.dataset.d, used = HK.S.days[di].exerciseIds.map((id) => HK.S.exercises[id] && HK.S.exercises[id].lib);
      let h = '<h3>Übung hinzufügen</h3><div class="eyebrow">Aus der Bibliothek, mit Animation</div>';
      LIB.GROUPS.forEach((g) => {
        const items = LIB.LIST.filter((l) => l.primary[0] === g);
        if (!items.length) return;
        h += '<h2 style="margin-top:16px">' + esc(g) + '</h2><div class="list">' + items.map((l) => '<div class="li"><button class="grow" style="text-align:left" data-a="info" data-ctx="lib" data-lib="' + l.key + '" data-day="' + HK.S.days[di].id + '"><div class="t serif">' + esc(l.name) + '</div><div class="s">' + esc(C.EQUIP[l.equip]) + ', ' + esc(l.primary.concat(l.secondary).join(', ')) + '</div></button>' + (used.indexOf(l.key) >= 0 ? '<span class="badge">drin</span>' : '<button class="btn sm ghost" data-a="sugg-add" data-key="' + l.key + '" data-day="' + HK.S.days[di].id + '">+</button>') + '</div>').join('') + '</div>';
      });
      const tmp = { name: '', equip: 'machine', sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '', lib: null };
      h += '<details class="card" style="margin-top:16px"><summary>Eigene Übung anlegen</summary>' + exerciseForm(tmp, '').replace('<h3></h3>', '') + '<div class="actions"><button class="btn primary" data-a="ex-add-do" data-d="' + di + '">Hinzufügen</button></div></details>';
      const own = Object.values(HK.S.exercises).filter((e) => HK.S.days[di].exerciseIds.indexOf(e.id) < 0 && !e.lib).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (own.length) h += '<h2>Deine eigenen Übungen</h2><div class="list">' + own.map((e) => '<button class="li" data-a="ex-add-lib" data-id="' + e.id + '" data-d="' + di + '"><div class="grow"><div class="t">' + esc(e.name) + (e.archived ? ' <span class="badge">archiviert</span>' : '') + '</div></div>+</button>').join('') + '</div>';
      h += '<div class="actions"><button class="btn ghost" data-a="close">Schließen</button></div>';
      sheet(h);
    },
    'ex-add-do'(el) { const ne = { id: C.uid('e'), name: '', equip: 'machine', sets: 3, repMin: 8, repMax: 12, rest: 90, step: 2.5, note: '', archived: false, suggested: false, lib: null }; if (!readExerciseForm(ne)) return; HK.S.exercises[ne.id] = ne; HK.S.days[+el.dataset.d].exerciseIds.push(ne.id); save(); closeSheet(); render(); },
    'ex-add-lib'(el) { const e = HK.S.exercises[el.dataset.id]; e.archived = false; HK.S.days[+el.dataset.d].exerciseIds.push(e.id); save(); closeSheet(); render(); },
    'day-add'() { HK.S.days.push({ id: C.uid('d'), name: 'Tag ' + (HK.S.days.length + 1), exerciseIds: [] }); save(); render(); },
    'day-edit'(el) {
      const di = +el.dataset.d, d = HK.S.days[di];
      sheet('<h3>Tag bearbeiten</h3><div class="field"><label>Name</label><input id="d-name" value="' + esc(d.name) + '" maxlength="40"></div><div class="grid2"><button class="btn ghost" data-a="day-move" data-d="' + di + '" data-dir="-1"' + (di === 0 ? ' disabled' : '') + '>↑ früher</button><button class="btn ghost" data-a="day-move" data-d="' + di + '" data-dir="1"' + (di === HK.S.days.length - 1 ? ' disabled' : '') + '>↓ später</button></div><div class="actions"><button class="btn ghost" data-a="day-next" data-d="' + di + '">Als nächstes Training</button></div><div class="actions"><button class="btn danger" data-a="day-del" data-d="' + di + '">Tag löschen</button><button class="btn primary" data-a="day-save" data-d="' + di + '">Speichern</button></div>');
    },
    'day-save'(el) { const d = HK.S.days[+el.dataset.d], n = $('#d-name').value.trim(); if (n) d.name = n; save(); closeSheet(); render(); },
    'day-move'(el) { const i = +el.dataset.d, j = i + +el.dataset.dir; if (j < 0 || j >= HK.S.days.length) return; const nd = C.nextDay(HK.S); [HK.S.days[i], HK.S.days[j]] = [HK.S.days[j], HK.S.days[i]]; if (nd) HK.S.rotation.nextDayIndex = HK.S.days.indexOf(nd); save(); closeSheet(); render(); },
    'day-next'(el) { HK.S.rotation.nextDayIndex = +el.dataset.d; save(); closeSheet(); toast('Nächstes Training geändert'); render(); },
    async 'day-del'(el) {
      const i = +el.dataset.d, d = HK.S.days[i]; closeSheet();
      if (await confirmBox('„' + d.name + '“ löschen?', 'Der Tag wird entfernt. Übungen und Verlauf bleiben im Archiv erhalten.', 'Löschen', true)) {
        const nd = C.nextDay(HK.S);
        d.exerciseIds.forEach((id) => { if (!HK.S.days.some((x, k) => k !== i && x.exerciseIds.indexOf(id) >= 0)) HK.S.exercises[id].archived = true; });
        HK.S.days.splice(i, 1);
        HK.S.rotation.nextDayIndex = Math.max(0, nd && nd.id !== d.id ? HK.S.days.indexOf(nd) : Math.min(i, HK.S.days.length - 1));
        save(); render();
      }
    },

    // Übungsvorschläge & Bibliothek
    info(el) { openInfo({ ctx: el.dataset.ctx, exId: el.dataset.id, lib: el.dataset.lib, dayId: el.dataset.day, focus: el.dataset.focus }); },
    'alt-play'(el) { if (HK.stopAlt) HK.stopAlt(); const box = el.querySelector('.mini-anim') || el; HK.stopAlt = AN.play(box, AN.forEntry(LIB.BY[el.dataset.key])); box.querySelector('svg').setAttribute('class', 'figmini'); },
    'swap-today'(el) {
      const cur = curEx(), key = el.dataset.key;
      C.swapInSession(HK.S, HK.S.active.cur, key, false, now()); save(); closeSheet(); ui.sel = {}; render();
      toast('Heute: ' + LIB.BY[key].name + ' statt ' + cur.name);
    },
    async 'swap-perm'(el) {
      const cur = curEx(), key = el.dataset.key; closeSheet();
      if (!(await confirmBox('Dauerhaft ersetzen?', '„' + cur.name + '“ wird im Plan durch „' + LIB.BY[key].name + '“ ersetzt und archiviert. Der Verlauf bleibt erhalten.', 'Ersetzen'))) return;
      C.swapInSession(HK.S, HK.S.active.cur, key, true, now()); save(); ui.sel = {}; render(); toast('Im Plan ersetzt');
    },
    async 'plan-replace'(el) {
      const old = HK.S.exercises[el.dataset.id], key = el.dataset.key; closeSheet();
      if (!(await confirmBox('„' + old.name + '“ ersetzen?', 'Neu im Plan: „' + LIB.BY[key].name + '“ mit denselben Sätzen, Wiederholungen und Pausen. Die alte Übung wird archiviert, ihr Verlauf bleibt.', 'Ersetzen'))) return;
      C.replaceInPlan(HK.S, old.id, key); save(); render(); toast('Ersetzt');
    },
    'sugg-add'(el) {
      const key = el.dataset.key, d = HK.S.days.find((x) => x.id === el.dataset.day) || HK.S.days[0];
      if (!d) { toast('Lege zuerst einen Trainingstag an'); return; }
      C.addFromLib(HK.S, key, d.id); save(); closeSheet(); render(); toast(LIB.BY[key].name + ' → ' + d.name);
    },
    'sugg-set'(el) { const e = C.addSetToExercise(HK.S, el.dataset.id); save(); render(); toast(e.name + ': jetzt ' + e.sets + ' Sätze'); },

    // Einstellungen / Daten
    'plate-toggle'(el) {
      const v = +el.dataset.v, L = HK.S.settings.plates.list, i = L.indexOf(v);
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
    'export-csv'(el) { exportTable(el.dataset.k); },
    import() { $('#import-file').value = ''; $('#import-file').click(); },
    async wipe() {
      if (await confirmBox('Wirklich alle Daten löschen?', 'Plan, Einheiten, Cardio und Einstellungen werden auf den Ausgangszustand zurückgesetzt. Ohne Export ist das endgültig.', 'Alles löschen', true)) {
        HK.S = C.defaultState(now()); save(); wakeOff(); HK.view = 'home'; render(); toast('Alle Daten gelöscht');
      }
    }
  };

  // ================= Ereignisse =================
  initSheetDrag();
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
    } else if (c === 'bodyweight') {
      const v = C.parseNum(el.value);
      if (v === null) return;
      if (C.logBodyWeight(HK.S, v, now())) { if (HK.S.active && !HK.S.active.bw) HK.S.active.bw = C.r2(v); save(); render(); toast('Körpergewicht gespeichert'); } else { toast('Bitte ein Gewicht zwischen 20 und 400 kg'); render(); }
    } else if (c === 'age') {
      const v = C.parseNum(el.value);
      HK.S.settings.profile = v && v >= 10 && v <= 100 ? { age: Math.round(v), ageAt: now() } : { age: null, ageAt: null };
      save(); render();
    } else if (c === 'opt-day') { document.querySelectorAll('.optck[data-day="' + el.dataset.d + '"]').forEach((x) => { x.checked = el.checked; }); optCount(); }
    else if (c === 'opt-ck') optCount();
    else if (c === 'ex-note') { curEx().note = el.value; save(); }
    else if (c === 'hist-ex') { ui.histEx = el.value; render(); }
    else if (c === 'theme') { HK.S.settings.theme = el.value; save(); render(); }
    else if (c === 'cardioType') { HK.S.settings.cardioType = el.value; save(); }
    else if (c === 'settog') { setByPath(HK.S.settings, el.dataset.p, el.checked); save(); if (el.dataset.p === 'keepAwake' && !el.checked) wakeOff(); setAudioSession(); }
    else if (c === 'setnum') {
      let v = C.parseNum(el.value); if (v === null || v < 0) { render(); return; }
      const p = el.dataset.p;
      if (/setsFactor|weightFactor|deloadFactor/.test(p)) v = Math.min(100, v) / 100;
      if (p === 'cardio.caps.swim') v = v / 1000;
      setByPath(HK.S.settings, p, v); save();
    }
  });
  document.addEventListener('toggle', (ev) => { if (ev.target && ev.target.dataset && ev.target.dataset.testid === 'advanced') ui.advOpen = ev.target.open; }, true);
  document.addEventListener('input', (ev) => { if (ev.target.dataset && ev.target.dataset.c === 'cardio-calc') updateCardioPace(); });
  document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.stepper input')) setTimeout(() => ev.target.select(), 0); });
  $('#import-file').addEventListener('change', (ev) => { const f = ev.target.files && ev.target.files[0]; if (f) importFile(f); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (HK.S && HK.S.active) { wakeOn(); tick(); }
      if (HK.actx && HK.actx.state !== 'running') HK.actx.resume().catch(() => {});
    } else if (HK.S) save();
  });
  window.addEventListener('pagehide', () => { if (HK.S) save(); });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (HK.S && HK.S.settings.theme === 'system') applyTheme(); });

  // ================= Service Worker =================
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const watch = (w) => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { HK.updateReady = w; if (HK.view !== 'gym') render(); } }); };
      if (reg.waiting && navigator.serviceWorker.controller) { HK.updateReady = reg.waiting; }
      reg.addEventListener('updatefound', () => watch(reg.installing));
    }).catch(() => { /* ohne SW läuft die App trotzdem, nur nicht offline */ });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (HK.updateReady && !reloaded) { reloaded = true; location.reload(); } });
  }

  // ================= Start =================
  async function init() {
    HK.S = await load();
    applyTheme(); applyFontMetrics(); setAudioSession();
    if (HK.S.active) {
      HK.view = 'gym';
      const t = HK.S.active.timer;
      if (t && !t.fired && t.endsAt < now() - 5000) t.fired = true; // Pause lief ab, während die App zu war
    }
    render();
    if (HK.S.active) toast('Einheit fortgesetzt');
    save();
    HK.tickT = setInterval(() => { if (HK.view === 'gym' && HK.S.active) tick(); }, 250);
    registerSW();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
    window.Herakles = { version: VERSION, state: () => HK.S, _save: save, _render: render, _summaryImage: summaryImage }; // _save/_render nur für automatische Tests
  }
  init();
})();
