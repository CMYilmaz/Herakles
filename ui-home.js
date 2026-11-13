/* Herakles – Ansicht „Heute“. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, fitSize, CHECK, EMPTY_ART, EMBLEM, esc, now, WD, WDL } = HK;

  // ---------- Heute ----------
  function renderHome() {
    const t = now(), d = new Date(t);
    let h = '<div class="view home">', notes = '';
    const mast = '<header class="mast">' + EMBLEM + '<div class="wordmark">HERAKLES</div><div class="sub">' + WDL[d.getDay()] + ', ' + C.fmtDate(t) + '</div></header>';
    const title = (name, tid) => '<h1 class="herotitle"' + (tid ? ' data-testid="' + tid + '"' : '') + ' style="font-size:' + fitSize(name, 76, 40) + 'px">' + esc(name) + '</h1>';
    if (HK.updateReady) notes += '<div class="banner info"><b>Update verfügbar</b>Eine neue Version ist geladen.<div class="row"><button class="btn sm primary" data-a="apply-update">Jetzt neu laden</button></div></div>';
    const bw = C.backupWarning(HK.S, t);
    if (bw) notes += '<div class="banner" data-testid="backup-warning"><b>Datensicherung</b>' + esc(bw) + ' Im Teilen-Menü „In Dateien sichern“ wählen.<div class="row"><button class="btn sm primary" data-a="export">Jetzt exportieren</button></div></div>';
    if (HK.S.deload.active) notes += '<div class="banner info"><b>Deload-Woche läuft</b>Noch ' + HK.S.deload.sessionsLeft + ' leichtere Einheit(en): weniger Sätze, ~' + Math.round(HK.S.settings.deload.weightFactor * 100) + ' % Gewicht.<div class="row"><button class="btn sm ghost" data-a="deload-end">Deload beenden</button></div></div>';
    else {
      const dc = C.deloadCheck(HK.S, t);
      if (dc.suggest && !HK.S.active) notes += '<div class="banner" data-testid="deload-suggest"><b>Vorschlag: leichtere Woche (Deload)</b>' + esc(dc.reason) + ' Die nächsten ' + HK.S.days.length + ' Einheiten mit weniger Sätzen und ~' + Math.round(HK.S.settings.deload.weightFactor * 100) + ' % Gewicht.<div class="row"><button class="btn sm primary" data-a="deload-yes">Annehmen</button><button class="btn sm ghost" data-a="deload-no">Diesmal nicht</button></div></div>';
    }
    const due = !HK.S.active && C.optimizeDue(HK.S, t);
    if (due) notes += '<div class="banner" data-testid="optim-due"><b>Planprüfung fällig</b>' + (due.first ? 'Seit Beginn' : 'Seit ' + due.days + ' Tagen') + ' ' + due.sessions + ' Einheiten ohne Prüfung. Die App schlägt Änderungen vor – dein Plan bleibt, bis du etwas übernimmst.<div class="row"><button class="btn sm primary" data-a="opt-open">Vorschlag ansehen</button><button class="btn sm ghost" data-a="opt-snooze">In einer Woche</button></div></div>';
    if (HK.S.active) {
      const a = HK.S.active, done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
      h += '<section class="hero">' + mast + '<div class="eyebrow">Einheit läuft seit ' + C.fmtTime(a.start) + '</div>' + title(a.dayName) + '<div class="meta">' + done + ' Sätze erledigt</div><button class="btn primary block xl" data-a="go-gym">Weiter trainieren</button></section>';
    } else {
      const nd = C.nextDay(HK.S);
      if (nd) {
        const exs = nd.exerciseIds.map((id) => HK.S.exercises[id]).filter((e) => e && !e.archived);
        h += '<section class="hero">' + mast + '<div class="row between"><div class="eyebrow">Nächstes Training, Tag ' + (HK.S.days.indexOf(nd) + 1) + ' von ' + HK.S.days.length + '</div>' + (HK.S.deload.active ? '<span class="badge warn">Deload</span>' : '') + '</div>' + title(nd.name, 'next-day') + '<div class="meta">' + exs.length + ' Übungen, etwa ' + Math.round(exs.reduce((m, e) => m + e.sets * (e.rest / 60 + 0.9), 0)) + ' Minuten</div>';
        h += '<ol class="exlist">' + exs.map((e, i) => '<li' + (e.suggested ? ' class="sug"' : '') + '><span class="n">' + (i + 1) + '</span><span>' + esc(e.name) + '</span></li>').join('') + '</ol>';
        h += '<button class="btn primary block xl" data-a="start" data-day="' + nd.id + '">Training starten</button><div class="center"><button class="link" data-a="pick-day">Anderen Tag wählen</button></div></section>';
      } else h += '<section class="hero">' + mast + '</section><div class="card empty">' + EMPTY_ART + '<div>Noch kein Trainingstag angelegt. Unter „Plan“ hinzufügen.</div></div>';
    }
    h += notes ? '<div class="notes">' + notes + '</div>' : '';
    // Woche
    const wk = C.weekOverview(HK.S, t);
    const nDone = Math.min(4, wk.gym.length) + Math.min(1, wk.cardio.length);
    h += '<h2 class="split"><span>Woche ' + wk.week + '</span><small>' + nDone + ' von 5 Einheiten</small></h2><div class="week">';
    for (let i = 0; i < 4; i++) { const s = wk.gym[i]; h += '<div class="wk' + (s ? ' done' : '') + '"' + (s ? ' data-sid="' + s.id + '"' : '') + '><div class="dot">' + (s ? CHECK : i + 1) + '</div><div class="lbl">' + (s ? esc(WD[new Date(s.start).getDay()] + ' ' + s.dayName.split(' ')[0]) : 'offen') + '</div></div>'; }
    const c = wk.cardio[0], cl = C.CARDIO[HK.S.settings.cardioType].label;
    h += '<div class="wk cardio' + (c ? ' done' : '') + '"><div class="dot">' + (c ? CHECK : esc(cl.charAt(0))) + '</div><div class="lbl">' + esc(c ? C.CARDIO[c.type].label : cl) + '</div></div></div>';
    h += '<div class="statrow"><span>Volumen diese Woche</span><b class="num">' + C.fmtNum(Math.round(wk.volume)) + ' kg</b></div>';
    // Cardio
    const ct = HK.S.settings.cardioType, cs = C.cardioSuggest(HK.S, ct, t);
    h += '<h2>' + esc(C.CARDIO[ct].label) + '</h2><div class="card">';
    if (cs.target !== null) h += '<div class="row between"><div class="eyebrow">Nächstes Ziel</div>' + (cs.deload ? '<span class="badge warn">leichter</span>' : '') + '</div><div class="big n" data-testid="cardio-target">' + C.fmtMetric(cs.target, ct) + '</div>';
    h += '<div class="why">' + esc(cs.reason) + '</div><button class="btn block" data-a="cardio-log">Cardio eintragen</button></div>';
    h += '</div>';
    return h;
  }

  Object.assign(HK, { renderHome });
})();
