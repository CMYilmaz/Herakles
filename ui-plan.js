/* Herakles – Plan: Übungen, Übungsinfo, Plan-Optimierung, Muskelbilanz. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, LIB, AN, $, esc, now, ui, toast, sheet } = HK;

  // ---------- Plan ----------
  function renderPlan() {
    let h = '<div class="view"><div class="topbar"><div><h1>Plan</h1><div class="sub">Rotation: ' + HK.S.days.map((d) => esc(d.name.split(' ')[0])).join(' → ') + ' → …</div></div></div>';
    h += '<p class="muted small" style="margin:0 0 6px">„Nächstes Training“ folgt immer der letzten Einheit – nicht dem Wochentag. Übung antippen: Ausführung, Animation, Alternativen.</p>';
    h += renderOptimizeCard();
    h += renderBalance();
    HK.S.days.forEach((d, di) => {
      const nd = C.nextDay(HK.S);
      h += '<h2>' + (di + 1) + '. ' + esc(d.name) + (nd && nd.id === d.id ? ' <span class="badge accent">als Nächstes</span>' : '') + '</h2><div class="list">';
      const inSS = {}; C.ssPairs(HK.S, d).forEach((p) => { inSS[p[0]] = 'a'; inSS[p[1]] = 'b'; });
      d.exerciseIds.forEach((id, i) => {
        const e = HK.S.exercises[id]; if (!e || e.archived) return;
        h += '<div class="li' + (inSS[id] ? ' ss ss-' + inSS[id] : '') + '"><button class="grow" style="text-align:left" data-a="info" data-ctx="plan" data-id="' + id + '"><div class="t serif">' + esc(e.name) + (e.suggested ? ' <span class="badge warn">Vorschlag</span>' : '') + (inSS[id] ? ' <span class="badge accent" data-testid="ss-badge">Supersatz</span>' : '') + '</div><div class="s">' + esc(C.EQUIP[e.equip]) + ', ' + e.sets + '×' + e.repMin + '–' + e.repMax + ', ' + C.fmtDuration(e.rest) + (C.usesWeight(e) ? ', +' + C.fmtNum(e.step) + ' kg' : '') + '</div></button>' +
          '<button class="iconbtn" data-a="ex-up" data-d="' + di + '" data-i="' + i + '" aria-label="nach oben"' + (i === 0 ? ' disabled' : '') + '>↑</button><button class="iconbtn" data-a="ex-down" data-d="' + di + '" data-i="' + i + '" aria-label="nach unten">↓</button><button class="iconbtn" data-a="ex-edit" data-id="' + id + '" data-d="' + di + '" aria-label="bearbeiten"><span class="txtbtn">Ändern</span></button></div>';
      });
      h += '<div class="li"><button class="link" data-a="ex-add" data-d="' + di + '">+ Übung</button><span class="grow"></span><button class="btn sm ghost" data-a="day-edit" data-d="' + di + '">Tag bearbeiten</button></div></div>';
    });
    h += '<button class="btn block ghost" data-a="day-add">+ Trainingstag</button>';
    const arch = Object.values(HK.S.exercises).filter((e) => e.archived);
    if (arch.length) h += '<h2>Archiv</h2><div class="list">' + arch.map((e) => '<div class="li arch"><div class="grow"><div class="t">' + esc(e.name) + '</div><div class="s">Verlauf bleibt erhalten</div></div><button class="btn sm ghost" data-a="ex-restore" data-id="' + e.id + '">Zurückholen</button></div>').join('') + '</div>';
    return h + '</div>';
  }

  // Block im Bearbeiten-Fenster: Übung mit der folgenden zu einem Supersatz koppeln oder Kopplung lösen
  function supersetBox(e, di) {
    const d = HK.S.days[di]; if (!d) return '';
    const ids = d.exerciseIds.filter((id) => HK.S.exercises[id] && !HK.S.exercises[id].archived), i = ids.indexOf(e.id), cur = C.ssInfo(HK.S, d, e.id);
    const nxt = i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
    const btn = (on, label) => '<button class="btn block" data-a="ss-set" data-testid="ss-set" data-on="' + (on ? 1 : 0) + '" data-id="' + e.id + '" data-d="' + di + '">' + label + '</button>';
    let h = '<div class="ssbox" data-testid="ss-box"><label>Supersatz</label>';
    if (cur) h += '<p class="small">Gekoppelt mit „' + esc(HK.S.exercises[cur.partner].name) + '“. Im Training wechselst du nach jedem Satz ohne Pause zur zweiten Übung, die Pause läuft erst danach.</p>' + btn(false, 'Supersatz lösen');
    else if (!nxt) h += '<p class="small muted">Für einen Supersatz muss im Plan direkt danach eine Übung stehen.</p>';
    else if (C.ssInfo(HK.S, d, nxt)) h += '<p class="small muted">Die folgende Übung „' + esc(HK.S.exercises[nxt].name) + '“ ist schon Teil eines Supersatzes.</p>';
    else h += '<p class="small muted">Zwei Übungen im Wechsel: nach jedem Satz ohne Pause zur folgenden Übung, die Pause läuft erst danach.</p>' + btn(true, 'Mit „' + esc(HK.S.exercises[nxt].name) + '“ koppeln');
    return h + '</div>';
  }

  function exerciseForm(e, title, extra) {
    const opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>';
    return '<h3>' + esc(title) + '</h3><div class="field"><label>Name</label><input id="f-name" value="' + esc(e.name) + '" maxlength="60"></div>' +
      '<div class="field"><label>Equipment</label><select id="f-equip">' + Object.keys(C.EQUIP).map((k) => opt(k, C.EQUIP[k], e.equip)).join('') + '</select></div>' +
      '<div class="grid3"><div class="field"><label>Sätze</label><input id="f-sets" inputmode="numeric" value="' + e.sets + '"></div><div class="field"><label>Wdh. von</label><input id="f-min" inputmode="numeric" value="' + e.repMin + '"></div><div class="field"><label>bis</label><input id="f-max" inputmode="numeric" value="' + e.repMax + '"></div></div>' +
      '<div class="grid2"><div class="field"><label>Pause (Sek.)</label><input id="f-rest" inputmode="numeric" value="' + e.rest + '"></div><div class="field"><label>Gewichtsstufe (kg)</label><input id="f-step" inputmode="decimal" value="' + C.fmtNum(e.step) + '"></div></div>' +
      '<div class="grid2"><div class="field"><label>Gewicht angeben</label><select id="f-load">' + opt('side', 'je Seite (ohne Stange)', C.loadMode(e)) + opt('each', 'je Hantel', C.loadMode(e)) + opt('total', 'gesamt (Maschine)', C.loadMode(e)) + '</select></div><div class="field"><label>Wiederholungen</label><select id="f-sides">' + opt('both', 'beidseitig gleichzeitig', C.sidesMode(e)) + opt('alt', 'abwechselnd, Summe beider Seiten', C.sidesMode(e)) + '</select></div></div>' +
      '<div class="field"><label>Bewegungsvorschau / Muskelzuordnung</label><select id="f-lib"><option value="">– keine (eigene Übung) –</option>' + LIB.LIST.map((l) => opt(l.key, l.name + ', ' + l.primary.join(', '), e.lib || '')).join('') + '</select></div>' +
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
    // nur abweichende Wahl speichern, sonst gilt der Standard des Equipments
    if ($('#f-load')) { const v = $('#f-load').value; if (v === C.loadMode({ equip: e.equip })) delete e.load; else e.load = v; }
    if ($('#f-sides')) { const v = $('#f-sides').value; if (v === C.sidesMode({ equip: e.equip, lib: e.lib })) delete e.sides; else e.sides = v; }
    return true;
  }

  // ================= Übungsinfo, Muskelbilanz =================
  HK.stopAlt = null;
  function openInfo(o) {
    const ex = o.exId ? HK.S.exercises[o.exId] : null;
    const L = o.lib ? LIB.BY[o.lib] : C.libOf(ex);
    const title = ex ? ex.name : L ? L.name : '';
    const day = o.dayId ? HK.S.days.find((d) => d.id === o.dayId) : null;
    let h = '<h3 data-testid="info-title">' + esc(title) + '</h3>';
    if (L) {
      h += '<div class="figbox" id="figbox" data-testid="figbox"></div><div class="figcap">Schematischer Bewegungsablauf' + (AN.note(L.anim) ? ', ' + AN.note(L.anim) : '') + '</div>';
      h += '<div class="muscles">' + L.primary.map((g) => '<span class="p">' + esc(g) + '</span>').join('') + L.secondary.map((g) => '<span>' + esc(g) + '</span>').join('') + '</div>';
      h += '<div class="eyebrow">Ausführung</div><ol class="cues">' + L.cues.map((c) => '<li>' + esc(c) + '</li>').join('') + '</ol>';
      h += '<p class="why" style="margin-top:0">' + esc(L.why) + '</p>';
    } else h += '<p class="muted">Für diese eigene Übung gibt es keine Vorschau. Unter Plan → „Ändern“ → „Bewegungsvorschau“ kannst du sie einer Bibliotheksübung zuordnen.</p>';
    if (o.ctx === 'lib' && L && HK.S.days.length) h += '<div class="actions"><button class="btn primary" data-a="sugg-add" data-key="' + L.key + '" data-day="' + (day ? day.id : HK.S.days[0].id) + '" data-testid="lib-add">Zu „' + esc((day || HK.S.days[0]).name) + '“ hinzufügen</button></div>';
    if (L) {
      const alts = C.alternatives(HK.S, L.key);
      if (alts.length) {
        h += '<div class="eyebrow" id="alts" style="margin-top:22px">Alternativen, antippen für Vorschau</div>';
        alts.forEach((a) => {
          let acts = '';
          if (o.ctx === 'gym' && HK.S.active) acts = '<button class="btn sm primary" data-a="swap-today" data-key="' + a.key + '" data-testid="swap-today">Heute stattdessen</button><button class="btn sm ghost" data-a="swap-perm" data-key="' + a.key + '">Im Plan ersetzen</button>';
          else if (o.ctx === 'plan' && ex && !a.inPlan) acts = '<button class="btn sm ghost" data-a="plan-replace" data-id="' + ex.id + '" data-key="' + a.key + '" data-testid="plan-replace">Im Plan ersetzen</button>';
          h += '<div class="alt" data-testid="alt"><button data-a="alt-play" data-key="' + a.key + '" aria-label="Vorschau ' + esc(a.name) + '"><span class="mini-anim">' + AN.svg(AN.forEntry(LIB.BY[a.key]), 1, 'figmini') + '</span></button><div class="grow"><div class="t">' + esc(a.name) + (a.inPlan ? ' <span class="badge">im Plan</span>' : '') + '</div><div class="s">' + esc(a.reason) + '</div><div class="acts">' + acts + '</div></div></div>';
        });
      }
    }
    h += '<div class="actions"><button class="btn ghost" data-a="close">Schließen</button></div>';
    if (HK.stopAlt) { HK.stopAlt(); HK.stopAlt = null; }
    sheet(h);
    if (L) HK.stopAnim = AN.play($('#figbox'), AN.forEntry(L));
    if (o.focus === 'alts') { const el = $('#alts'); if (el && el.scrollIntoView) el.scrollIntoView(); }
  }

  // ---------- Plan-Optimierung ----------
  function renderOptimizeCard() {
    const O = HK.S.optim || {}, t = now(), due = C.optimizeDue(HK.S, t);
    let h = '<div class="card optcard" data-testid="optim-card"><div class="row between"><div class="eyebrow">Plan optimieren</div>' + (due ? '<span class="badge warn">fällig</span>' : '') + '</div>';
    h += '<div class="small" style="margin:6px 0 10px">Prüft Stagnation und Satzverteilung deiner Einheiten und schlägt neue Übungen, Gewichte und Sätze vor. Du übernimmst alles, einzelne Tage oder einzelne Übungen.</div>';
    h += '<div class="tiny muted" style="margin-bottom:10px">' + (O.lastAt ? 'Letzte Prüfung: ' + C.fmtDateLong(O.lastAt) + (due ? '' : ', nächste in ' + Math.max(0, 21 - Math.floor((t - O.lastAt) / C.DAY)) + ' Tagen') : 'Empfohlen alle 3 Wochen, ab 6 Einheiten.') + '</div>';
    h += '<button class="btn block' + (due ? ' primary' : '') + '" data-a="opt-open" data-testid="optim-open">Vorschlag erstellen</button>';
    if (C.canUndoOptimization(HK.S)) h += '<div style="text-align:center;margin-top:6px"><button class="link" data-a="opt-undo" data-testid="optim-undo">Letzte Optimierung rückgängig</button></div>';
    return h + '</div>';
  }
  function optTitle(c) {
    if (c.kind === 'replace') return esc(c.oldName) + ' → ' + esc(c.newName);
    if (c.kind === 'reset') return esc(c.name) + ': ' + C.fmtNum(c.from) + ' → ' + C.fmtKg(c.to);
    if (c.kind === 'sets') return esc(c.name) + ': ' + c.from + ' → ' + c.to + ' Sätze';
    return '+ ' + esc(c.newName) + ' (3 Sätze)';
  }
  function optWeightLine(c) {
    if (c.kind !== 'replace' && c.kind !== 'add') return '';
    if (c.weightNote === 'ohne Gewicht') return '';
    return '<div class="s optw">Startgewicht: ' + (c.startWeight !== null && c.startWeight !== undefined ? '<b>' + C.fmtKg(c.startWeight) + '</b>, ' + esc(c.weightNote) : esc(c.weightNote)) + '</div>';
  }
  function optCount() {
    const n = document.querySelectorAll('.optck:checked').length, b = $('[data-a="opt-apply"]');
    if (b) { b.textContent = n ? 'Übernehmen (' + n + ')' : 'Nichts ausgewählt'; b.disabled = !n; }
    document.querySelectorAll('[data-c="opt-day"]').forEach((d) => {
      const all = Array.from(document.querySelectorAll('.optck[data-day="' + d.dataset.d + '"]'));
      d.checked = all.length > 0 && all.every((x) => x.checked); d.indeterminate = !d.checked && all.some((x) => x.checked);
    });
  }
  function openOptimize() {
    const t = now();
    const p = C.optimizePlan(HK.S, t);
    ui.optProposal = p;
    let h = '<h3>Planvorschlag</h3><p class="small muted" style="margin-top:-4px">Grundlage: ' + p.sessions + ' Einheiten, ' + p.analysed + ' Übungen mit genug Verlauf. Dein aktiver Plan bleibt unverändert, bis du übernimmst.</p>';
    if (!p.changes.length) {
      h += '<div class="card"><b>Kein Änderungsbedarf.</b><div class="small" style="margin-top:6px">Keine Übung stagniert, und alle Muskeln liegen im Richtwert von ~' + C.VOLUME_TARGET + ' Sätzen pro Woche.</div></div><div class="actions"><button class="btn primary" data-a="opt-none">Fertig</button></div>';
      sheet(h); return;
    }
    const quiet = [];
    p.days.forEach((d, i) => {
      if (!d.changes.length) { quiet.push((i + 1) + '. ' + d.name); return; }
      h += '<div class="optday" data-testid="optim-day"><label class="optdayhead"><input type="checkbox" data-c="opt-day" data-d="' + d.dayId + '" checked aria-label="Ganzen Tag übernehmen"><span class="grow"><span class="serif">' + (i + 1) + '. ' + esc(d.name) + '</span><span class="tiny muted">, ' + d.changes.length + ' Änderung' + (d.changes.length > 1 ? 'en' : '') + '</span></span></label>';
      d.changes.forEach((c) => {
        h += '<label class="optrow" data-testid="optim-change"><input type="checkbox" class="optck" data-c="opt-ck" data-day="' + d.dayId + '" value="' + c.id + '" checked><div class="grow"><div class="t">' + optTitle(c) + '</div><div class="s">' + esc(c.reason) + '</div>' + optWeightLine(c) + '</div></label>';
      });
      const keep = d.keep.filter((k) => k.weight !== null && k.weight !== undefined);
      if (keep.length) h += '<details class="optkeep"><summary>Unverändert, nächste Gewichte (' + keep.length + ')</summary>' + keep.map((k) => '<div class="kv1"><span>' + esc(k.name) + '</span><b>' + C.fmtKg(k.weight) + '</b></div>').join('') + '</details>';
      h += '</div>';
    });
    if (quiet.length) h += '<p class="tiny muted">Ohne Änderungen: ' + esc(quiet.join(', ')) + '.</p>';
    h += '<div class="actions"><button class="btn ghost" data-a="close">Später</button><button class="btn primary" data-a="opt-apply" data-testid="optim-apply">Übernehmen (' + p.changes.length + ')</button></div>';
    sheet(h);
  }

  function renderBalance() {
    const v = C.planVolume(HK.S), sug = C.planSuggestions(HK.S);
    const max = Math.max(24, Math.max.apply(null, v.groups.map((g) => g.sets)));
    let h = '';
    if (sug.length) {
      h += '<h2>Vorschläge für deinen Plan</h2><div class="list" data-testid="suggestions">';
      sug.forEach((x) => {
        if (x.kind === 'add') h += '<div class="li" style="align-items:flex-start;gap:12px">' + AN.svg(AN.forEntry(LIB.BY[x.key]), 1, 'figmini') + '<div class="grow"><div class="t serif">' + esc(x.name) + '</div><div class="s">' + esc(x.reason) + '</div><div class="tiny muted" style="margin-top:6px">Vorgeschlagen für Tag ' + (HK.S.days.findIndex((d) => d.id === x.dayId) + 1) + ', ' + esc(x.dayName) + '</div><div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px"><button class="btn sm primary" data-a="sugg-add" data-key="' + x.key + '" data-day="' + x.dayId + '" data-testid="sugg-add" aria-label="Zu ' + esc(x.dayName) + ' hinzufügen">Zu Tag ' + (HK.S.days.findIndex((d) => d.id === x.dayId) + 1) + '</button><button class="btn sm ghost" data-a="info" data-ctx="lib" data-lib="' + x.key + '" data-day="' + x.dayId + '">Ansehen</button></div></div></div>';
        else h += '<div class="li" style="align-items:flex-start"><div class="grow"><div class="eyebrow">+1 Satz</div><div class="t serif">' + esc(x.name) + '</div><div class="s">' + esc(x.reason) + '</div><div class="row" style="margin-top:10px"><button class="btn sm primary" data-a="sugg-set" data-id="' + x.exId + '" data-testid="sugg-set">Satz ergänzen</button></div></div></div>';
      });
      h += '</div>';
    }
    h += '<details class="card" data-testid="balance"' + (sug.length ? '' : ' open') + '><summary>Muskelbilanz, Sätze pro Woche</summary>';
    v.groups.forEach((g) => { h += '<div class="vol ' + g.status + '"><span class="g">' + esc(g.group) + '</span><span class="bar"><i style="width:' + Math.min(100, g.sets / max * 100).toFixed(1) + '%"></i><span class="tick" style="left:' + (v.target / max * 100).toFixed(1) + '%"></span></span><span class="n num">' + C.fmtNum(g.sets) + '</span></div>'; });
    h += '<div class="tiny muted" style="margin-top:10px">Strich = Richtwert ~' + v.target + ' Sätze pro Muskel und Woche (Meta-Analyse Schoenfeld, Ogborn & Krieger 2017: ab ~10 Sätzen deutlich mehr Muskelzuwachs; eine Obergrenze ist nicht belegt). Hauptmuskel zählt 1, Hilfsmuskel 0,5 Sätze; angenommen sind 4 Einheiten pro Woche.' + (v.unmatched.length ? ' Ohne Zuordnung: ' + esc(v.unmatched.join(', ')) + ' (Ändern → Bewegungsvorschau).' : '') + '</div></details>';
    return h;
  }

  Object.assign(HK, { renderPlan, exerciseForm, readExerciseForm, openInfo, optCount, openOptimize, supersetBox });
})();
