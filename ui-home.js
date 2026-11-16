/* Herakles – Ansicht „Heute“. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, AN, fitSize, CHECK, EMPTY_ART, EMBLEM, esc, now, WD, WDL } = HK;

  // ---------- Heute ----------
  function renderHome() {
    const t = now(), d = new Date(t);
    let h = '<div class="view home">', notes = '';
    const mast = '<header class="mast">' + EMBLEM + '<div class="wordmark">HERAKLES</div><div class="sub">' + WDL[d.getDay()] + ', ' + C.fmtDate(t) + '</div></header>';
    const title = (name, tid) => '<h1 class="herotitle"' + (tid ? ' data-testid="' + tid + '"' : '') + ' style="font-size:' + fitSize(name, 56, 36) + 'px">' + esc(name) + '</h1>';
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
    // Figur einer Übung als einfarbige Silhouette; ohne Bibliothekseintrag gibt es kein Bild
    const figOf = (e, cls, fit) => { const l = e && C.libOf(e); return l && l.anim && AN.SPECS[l.anim] ? AN.svg(l.anim, 0.5, cls, fit ? { fit: true } : undefined).replace(' role="img" aria-label="Bewegungsablauf"', ' aria-hidden="true"') : ''; };
    const lead = (e, n, sub) => { const f = figOf(e, 'sil'); return '<button class="lead" data-a="info" data-ctx="plan" data-id="' + e.id + '" data-testid="lead" aria-label="Ausführung: ' + esc(e.name) + '">' + (f ? '<span class="leadfig">' + f + '</span>' : '') + '<span class="leadcap"><b>' + n + '</b><span class="t">' + esc(e.name) + '</span><span class="r">' + sub + '</span></span></button>'; };
    const sheetTop = '<section class="base"><div class="grip" aria-hidden="true"></div>';
    if (HK.S.active) {
      const a = HK.S.active, done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0), ce = a.exercises[a.cur], cx = ce && HK.S.exercises[ce.exId];
      h += '<section class="hero"><div class="grain" aria-hidden="true"></div>' + mast + '<div class="eyebrow">Einheit läuft seit ' + C.fmtTime(a.start) + '</div>' + title(a.dayName) + (cx ? lead(cx, a.cur + 1, 'läuft') : '') + '</section>';
      h += sheetTop + '<div class="meta">' + done + ' Sätze erledigt</div><button class="btn primary block xl" data-a="go-gym">Weiter trainieren</button>';
    } else {
      const nd = C.nextDay(HK.S);
      if (nd) {
        const exs = nd.exerciseIds.map((id) => HK.S.exercises[id]).filter((e) => e && !e.archived);
        h += '<section class="hero"><div class="grain" aria-hidden="true"></div>' + mast + '<div class="row between"><div class="eyebrow">Heute dran, Tag ' + (HK.S.days.indexOf(nd) + 1) + ' von ' + HK.S.days.length + '</div>' + (HK.S.deload.active ? '<span class="badge warn">Deload</span>' : '') + '</div>' + title(nd.name, 'next-day') + (exs[0] ? lead(exs[0], 1, exs[0].sets + ' × ' + C.eff(exs[0]).repMin + '–' + C.eff(exs[0]).repMax) : '') + '</section>';
        h += sheetTop;
        // Übrige Übungen als runde Bilder; bei mehr als fünf lässt sich die Reihe zur Seite wischen
        if (exs.length > 1) h += '<div class="thumbs' + (exs.length > 6 ? ' more' : '') + '" data-testid="thumbs">' + exs.slice(1).map((e, i) => { const f = figOf(e, 'sil2', true); return '<button class="thumb' + (e.suggested ? ' sug' : '') + '" data-a="info" data-ctx="plan" data-id="' + e.id + '" aria-label="Ausführung: ' + esc(e.name) + '"><span class="tdisc">' + (f || '<span class="tn">' + (i + 2) + '</span>') + '</span><span class="tl">' + esc(e.name) + '</span></button>'; }).join('') + '</div>';
        h += '<div class="meta">' + exs.length + ' Übungen, ' + exs.reduce((m, e) => m + e.sets, 0) + ' Sätze, etwa ' + Math.round(exs.reduce((m, e) => m + e.sets * (e.rest / 60 + 0.9), 0)) + ' Minuten</div>';
        h += '<button class="btn primary block xl" data-a="start" data-day="' + nd.id + '">Training starten</button><div class="center"><button class="link" data-a="pick-day">Anderen Tag wählen</button></div>';
      } else h += '<section class="hero"><div class="grain" aria-hidden="true"></div>' + mast + '</section>' + sheetTop + '<div class="card empty">' + EMPTY_ART + '<div>Noch kein Trainingstag angelegt. Unter „Plan“ hinzufügen.</div></div>';
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
    h += '</section></div>';
    return h;
  }

  Object.assign(HK, { renderHome });
})();
