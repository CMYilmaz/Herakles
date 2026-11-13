/* Herakles – Verlauf: Einheiten, Diagramme, Cardio, Abschlusskarte. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, DISP, SPRIG, EMPTY_ART, EMBLEM, $, esc, now, ui, save, toast, sheet, closeSheet, wDisp, WD, render } = HK;

  // ---------- Verlauf ----------
  function renderHistory() {
    let h = '<div class="view"><div class="topbar"><h1>Verlauf</h1></div>';
    const tabs = [['sessions', 'Einheiten'], ['ex', 'Übungen'], ['week', 'Woche'], ['month', 'Monat'], ['cardio', 'Cardio']];
    if (ui.histTab === 'pr') ui.histTab = 'ex';
    h += '<div class="seg">' + tabs.map(([k, l]) => '<button data-a="htab" data-v="' + k + '" class="' + (ui.histTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    if (ui.histTab === 'sessions') {
      const list = HK.S.sessions.slice().sort((a, b) => b.start - a.start);
      if (!list.length) h += '<div class="card empty">' + EMPTY_ART + 'Noch keine Einheit abgeschlossen.</div>';
      else h += '<div class="list">' + list.map((s) => { const v = C.sessionVolume(s); return '<button class="li" data-a="open-session" data-id="' + s.id + '"><div class="grow"><div class="t">' + esc(s.dayName) + (s.deload ? ' <span class="badge warn">Deload</span>' : '') + '</div><div class="s num">' + WD[new Date(s.start).getDay()] + ', ' + C.fmtDateLong(s.start) + ', ' + C.fmtTime(s.start) + ', ' + C.fmtDuration((s.end - s.start) / 1000) + ', ' + v.sets + ' Sätze, ' + C.fmtNum(Math.round(v.volume)) + ' kg</div></div><span class="muted">›</span></button>'; }).join('') + '</div>';
    } else if (ui.histTab === 'ex') {
      const withHist = Object.values(HK.S.exercises).filter((e) => C.exerciseHistory(HK.S, e.id, { includeDeload: true }).length).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (!withHist.length) h += '<div class="card empty">' + EMPTY_ART + 'Diagramme erscheinen nach der ersten Einheit.</div>';
      else {
        if (!ui.histEx || !withHist.some((e) => e.id === ui.histEx)) ui.histEx = withHist[0].id;
        const ex = HK.S.exercises[ui.histEx], ser = C.exerciseSeries(HK.S, ui.histEx);
        h += '<div class="field"><select data-c="hist-ex" aria-label="Übung">' + withHist.map((e) => '<option value="' + e.id + '"' + (e.id === ui.histEx ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('') + '</select></div>';
        let metrics = C.usesWeight(ex) ? (ex.equip === 'bwplus' ? [['weight', 'Zusatz'], ['reps', 'Wdh.'], ['volume', 'Volumen']] : [['weight', 'Gewicht'], ['e1rm', '1RM ~'], ['volume', 'Volumen'], ['reps', 'Wdh.']]) : [['reps', 'Wdh.']];
        if (ser.some((x) => x.total)) metrics = [['total', 'Gesamt']].concat(metrics);
        if (!metrics.some((m) => m[0] === ui.histMetric)) ui.histMetric = metrics[0][0];
        h += '<div class="seg">' + metrics.map(([k, l]) => '<button data-a="hmetric" data-v="' + k + '" class="' + (ui.histMetric === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
        const pts = ser.map((s) => ({ x: s.date, y: ui.histMetric === 'reps' ? s.totalReps : s[ui.histMetric], dl: s.deload }));
        const unit = ui.histMetric === 'reps' ? '' : ' kg';
        h += '<div class="card">' + lineChart(pts, (v) => C.fmtNum(Math.round(v * 10) / 10) + unit, { best: true }) + '<div class="tiny muted" style="margin-top:6px">' + ({ total: 'Gesamtlast = Körpergewicht am Trainingstag + Zusatzgewicht', weight: 'Arbeitsgewicht je Einheit', e1rm: 'Geschätztes 1RM (Epley-Formel: Gewicht × (1 + Wdh/30)) – nur Richtwert', volume: 'Volumen = Σ Gewicht × Wdh. der Arbeitssätze', reps: 'Summe der Wiederholungen in Arbeitssätzen' })[ui.histMetric] + '. Orange = Deload, Lorbeer = Bestwert.</div></div>';
        h += '<div class="card"><table class="t"><tr><th>Datum</th><th>Sätze</th>' + (C.usesWeight(ex) ? '<th class="r">kg</th>' : '') + '<th class="r">Vol.</th></tr>' + ser.slice().reverse().slice(0, 10).map((s) => '<tr><td>' + C.fmtDate(s.date) + (s.deload ? ' <span class="badge warn">D</span>' : '') + '</td><td>' + C.repsLabel(s.reps) + '</td>' + (C.usesWeight(ex) ? '<td class="r">' + C.fmtNum(s.weight) + '</td>' : '') + '<td class="r">' + C.fmtNum(Math.round(s.volume)) + '</td></tr>').join('') + '</table></div>';
      }
      const pr = C.personalRecords(HK.S);
      if (pr.length) h += '<h2>Bestwerte aller Übungen</h2><div class="card" data-testid="records"><table class="t"><tr><th>Übung</th><th class="r">max kg</th><th class="r">1RM ~</th><th class="r">max Wdh.</th></tr>' + pr.map((p) => '<tr><td>' + esc(p.name) + '</td><td class="r">' + (p.maxTotal ? C.fmtNum(p.maxTotal) + '*' : p.equip === 'bw' ? '–' : C.fmtNum(p.maxW)) + '</td><td class="r">' + (p.maxE ? C.fmtNum(Math.round(p.maxE * 10) / 10) : '–') + '</td><td class="r">' + p.maxR + '</td></tr>').join('') + '</table>' + (pr.some((p) => p.maxTotal) ? '<div class="tiny muted" style="margin-top:6px">* Gesamtlast inkl. Körpergewicht am Trainingstag</div>' : '') + '</div>';
    } else if (ui.histTab === 'week') {
      const ws = C.weeklyStats(HK.S, 12, now());
      h += '<div class="card"><div class="muted small" style="margin-bottom:6px">Volumen pro Woche (kg)</div>' + barChart(ws.map((w) => ({ label: 'KW' + w.week, y: w.volume })), (v) => C.fmtNum(Math.round(v))) + '</div>';
      h += '<div class="card"><table class="t"><tr><th>Woche</th><th class="r">Gym</th><th class="r">Cardio</th><th class="r">Volumen</th></tr>' + ws.slice().reverse().map((w) => '<tr><td>KW ' + w.week + ' <span class="muted tiny">ab ' + C.fmtDate(w.weekStart) + '</span></td><td class="r">' + w.sessions + '/4</td><td class="r">' + w.cardio + '/1</td><td class="r">' + C.fmtNum(Math.round(w.volume)) + '</td></tr>').join('') + '</table></div>';
    } else if (ui.histTab === 'month') {
      if (!ui.month) { const x = new Date(); ui.month = { y: x.getFullYear(), m: x.getMonth() }; }
      const M = ui.month, r = C.monthReview(HK.S, M.y, M.m), nowD = new Date();
      const isCur = M.y === nowD.getFullYear() && M.m === nowD.getMonth();
      const MN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      h += '<div class="month-head"><button class="iconbtn" data-a="month-nav" data-dir="-1" aria-label="Vormonat">‹</button><div class="mt"><div class="eyebrow">Rückblick</div><div class="mtitle" data-testid="month-title">' + MN[M.m] + ' <span class="yr">' + M.y + '</span></div></div><button class="iconbtn" data-a="month-nav" data-dir="1" aria-label="Nächster Monat"' + (isCur ? ' disabled' : '') + '>›</button></div>';
      if (!r.sessions && !r.cardio) h += '<div class="card empty">' + EMPTY_ART + 'In diesem Monat noch keine Einheiten.</div>';
      else {
        const cell = (v, l) => '<div><b class="num">' + v + '</b><span>' + l + '</span></div>';
        h += '<div class="kv kv6" data-testid="month">' + cell(r.sessions, 'Einheiten') + cell(r.sets, 'Sätze') + cell(C.fmtNum(Math.round(r.volume / 100) / 10) + ' t', 'Volumen') + cell(C.fmtNum(r.hours, 1), 'Stunden') + cell(C.fmtNum(r.runKm, 1), 'Lauf-km') + cell(r.fullWeeks + '/' + r.weeksTrained, 'volle Wochen') + '</div>';
        h += '<p class="pull">' + ((r.fullWeeks ? r.fullWeeks + (r.fullWeeks === 1 ? ' Woche' : ' Wochen') + ' mit allen vier Einheiten.' : 'Noch keine Woche mit allen vier Einheiten.') + (r.cardio ? ' ' + r.cardio + ' Cardio-' + (r.cardio === 1 ? 'Einheit' : 'Einheiten') + '.' : '')).replace(/\d+/g, '<span class="ns">$&</span>') + '</p>';
        h += '<h2>Neue Bestwerte</h2>' + (r.prs.length ? '<div class="list">' + r.prs.map((x) => '<div class="li">' + SPRIG + '<div class="grow"><div class="t serif">' + esc(x.name) + '</div><div class="s">' + C.fmtKg(x.w) + ' (vorher ' + C.fmtKg(x.before) + ')</div></div></div>').join('') + '</div>' : '<div class="card empty">' + EMPTY_ART + 'Keine neuen Gewichtsrekorde in diesem Monat.</div>');
        if (r.top.length) h += '<h2>Meiste Arbeit</h2><div class="list">' + r.top.map((x) => '<div class="li"><div class="grow"><div class="t serif">' + esc(x.name) + '</div><div class="s">' + x.sets + ' Sätze, ' + C.fmtNum(Math.round(x.volume)) + ' kg Volumen</div></div></div>').join('') + '</div>';
      }
    } else if (ui.histTab === 'cardio') {
      const types = Object.keys(C.CARDIO).filter((t) => HK.S.cardio.some((c) => c.type === t));
      if (!types.length) h += '<div class="card empty">' + EMPTY_ART + 'Noch keine Cardio-Einheit eingetragen.<div style="margin-top:12px"><button class="btn" data-a="cardio-log">Cardio eintragen</button></div></div>';
      else {
        if (!ui.cardioType || types.indexOf(ui.cardioType) < 0) ui.cardioType = types[0];
        const t = ui.cardioType, list = HK.S.cardio.filter((c) => c.type === t);
        h += '<div class="seg">' + types.map((k) => '<button data-a="ctab" data-v="' + k + '" class="' + (k === t ? 'on' : '') + '">' + C.CARDIO[k].label + '</button>').join('') + '</div>';
        h += '<div class="card">' + lineChart(list.map((c) => ({ x: c.date, y: C.cardioMetric(c, t), dl: c.deload })), (v) => C.fmtMetric(v, t), 'bar') + '<div class="tiny muted" style="margin-top:6px">' + (C.CARDIO[t].metric === 'distance' ? 'Distanz' : 'Dauer') + ' je Einheit. Orange = leichtere Einheit.</div></div>';
        const runs = t !== 'run' ? [] : HK.S.cardio.filter((c) => c.type === 'run');
        if (runs.length) {
          const longest = runs.reduce((m, c) => (c.distance > m.distance ? c : m));
          const fastest = runs.filter((c) => c.distance >= 1 && c.duration).reduce((m, c) => (!m || c.duration / c.distance < m.duration / m.distance ? c : m), null);
          h += '<div class="card"><b>Bestwerte Laufen</b><div class="small" style="margin-top:6px">Längster Lauf: ' + C.fmtMetric(longest.distance, 'run') + ' (' + C.fmtDate(longest.date) + ')' + (fastest ? '<br>Schnellste Pace: ' + C.pace(fastest, 'run') + ' über ' + C.fmtMetric(fastest.distance, 'run') : '') + '</div></div>';
        }
        h += '<div class="list">' + list.slice().reverse().map((c) => '<div class="li"><div class="grow"><div class="t num">' + C.fmtMetric(C.cardioMetric(c, t), t) + (c.duration && C.CARDIO[t].metric === 'distance' ? ', ' + C.fmtDuration(c.duration) : '') + (c.distance && C.CARDIO[t].metric === 'duration' ? ', ' + C.fmtNum(c.distance, 1) + ' km' : '') + (c.deload ? ' <span class="badge warn">leichter</span>' : '') + '</div><div class="s">' + C.fmtDateLong(c.date) + (C.pace(c, t) ? ', ' + C.pace(c, t) : '') + (c.target ? ', Ziel ' + C.fmtMetric(c.target, t) : '') + (c.note ? ', ' + esc(c.note) : '') + '</div></div><button class="iconbtn" data-a="cardio-del" data-id="' + c.id + '" aria-label="Löschen">×</button></div>').join('') + '</div>';
      }
    }
    return h + '</div>';
  }

  // ---------- Diagramme (eigenes SVG) ----------
  function lineChart(pts, fmt, opts) {
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
    const bestLast = !!(opts && opts.best) && n > 1 && pts.every((p) => p.y === null || p.y === undefined || p.y <= lastP.y);
    const lab = '<text class="lab" x="' + (Math.min(X(n - 1), W - pr) - (bestLast ? 14 : 0)).toFixed(1) + '" y="' + Math.max(12, Y(lastP.y) - 9).toFixed(1) + '" text-anchor="end">' + esc(fmt(lastP.y)) + '</text>';
    const xl = '<text class="ax" x="' + pl + '" y="' + (H - 6) + '">' + C.fmtDate(pts[0].x) + '</text>' + (n > 1 ? '<text class="ax" x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + C.fmtDate(lastP.x) + '</text>' : '');
    const valid = pts.map((p, i) => [p, i]).filter(([p]) => p.y !== null && p.y !== undefined);
    const area = n > 1 && valid.length > 1 ? '<path class="area" d="M' + X(valid[0][1]).toFixed(1) + ',' + (H - pb) + ' L' + path.split(' ').join(' L') + ' L' + X(valid[valid.length - 1][1]).toFixed(1) + ',' + (H - pb) + ' Z"/>' : '';
    let best = '';
    if (opts && opts.best && valid.length > 1) {
      const [bp, bi] = valid.reduce((m, v) => (v[0].y >= m[0].y ? v : m), valid[0]);
      const bx = X(bi), by = Y(bp.y);
      best = '<svg x="' + Math.max(pl + 2, Math.min(W - pr - 16, bx - 8)).toFixed(1) + '" y="' + (by - 23 < 0 ? by + 7 : by - 23).toFixed(1) + '" width="16" height="16" viewBox="0 0 24 24" class="bestmark"><path d="M12 21V8" class="st"/><path d="M12 9c-3.4-.4-5.2-2.6-5-5.6 3.2.2 5 2.4 5 5.6zM12 13c3.4-.4 5.2-2.6 5-5.6-3.2.2-5 2.4-5 5.6zM12 17c-3.2-.4-5-2.4-4.8-5.2 3 .2 4.8 2.2 4.8 5.2z"/></svg>';
    }
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Verlaufsdiagramm">' + g + area + (n > 1 ? '<polyline class="ln" points="' + path + '"/>' : '') + dots + best + lab + xl + '</svg>';
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
  // ---------- Abschlusskarte als Bild (Canvas, offline) ----------
  function summaryImage(d) {
    return new Promise((resolve) => {
      const Wd = 1080, Hd = 1350, cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd;
      const g = cv.getContext('2d');
      g.fillStyle = '#22382b'; g.fillRect(0, 0, Wd, Hd);
      const sans = '-apple-system, "Helvetica Neue", Arial, sans-serif', L = 90, R = Wd - 90;
      const finish = () => {
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillStyle = '#f3ecdc'; g.font = '700 76px ' + DISP; g.fillText('HERAKLES', L + 150, 196);
        g.fillStyle = '#c9c0a8'; g.font = '400 34px ' + sans; g.fillText('Einheit abgeschlossen, ' + C.fmtDateLong(d.date), L, 330);
        // Titel in Versalien, auf die Breite eingepasst und umbrochen
        const words = (d.day + (d.deload ? ', Deload' : '')).toUpperCase().split(/\s+/);
        let fs = 190; g.font = '700 ' + fs + 'px ' + DISP;
        while (fs > 90 && words.some((w) => g.measureText(w).width > R - L)) { fs -= 6; g.font = '700 ' + fs + 'px ' + DISP; }
        const lines = []; let cur = '';
        words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > R - L && cur) { lines.push(cur); cur = w; } else cur = t; });
        if (cur) lines.push(cur);
        let y = 350 + fs * 0.86; g.fillStyle = '#f3ecdc';
        lines.slice(0, 3).forEach((ln) => { g.fillText(ln, L, y); y += fs * 0.9; });
        // Kennzahlen und Bestwerte stehen unten, wie auf einer Anzeigetafel
        const nPr = Math.min(d.prs.length, 3), blockH = 290 + (nPr ? 84 + nPr * 96 : 0);
        y = Math.max(y - fs * 0.9 + 70, Hd - 96 - blockH);
        g.fillStyle = '#c9a564'; g.fillRect(L, y, R - L, 10); y += 10;
        const cells = [[C.fmtDuration(d.dur), 'Dauer'], [String(d.sets), 'Sätze'], [C.fmtNum(Math.round(d.vol)) + ' kg', 'Volumen']];
        cells.forEach(([v, l], i) => { const x = L + (R - L) * i / 3; g.fillStyle = '#c9c0a8'; g.font = '400 32px ' + sans; g.fillText(l, x, y + 66); g.fillStyle = '#f3ecdc'; g.font = '700 124px ' + DISP; g.fillText(v, x, y + 190, (R - L) / 3 - 24); });
        y += 280;
        if (nPr) {
          g.fillStyle = '#d9bb80'; g.font = '700 56px ' + DISP; g.fillText('Neue Bestwerte', L, y + 30); y += 96;
          d.prs.slice(0, nPr).forEach((p) => { g.fillStyle = '#f3ecdc'; g.font = '600 38px ' + sans; g.fillText(p.name, L, y, R - L); g.fillStyle = '#c9c0a8'; g.font = '400 30px ' + sans; g.fillText(p.text, L, y + 42, R - L); y += 96; });
        }
        cv.toBlob((b) => resolve(b), 'image/png');
      };
      // Lorbeer-Zeichen über der Wortmarke (SVG → Bild, alles lokal)
      const svg = EMBLEM.replace('class="emblem"', 'xmlns="http://www.w3.org/2000/svg" width="168" height="176"').split('currentColor').join('#f3ecdc').split('var(--ochre, #80612a)').join('#c9a564');
      const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      img.onload = () => { g.drawImage(img, 90, 96, 124, 130); URL.revokeObjectURL(url); finish(); };
      img.onerror = () => { URL.revokeObjectURL(url); finish(); };
      img.src = url;
    });
  }
  async function shareSummary() {
    const d = ui.lastSummary; if (!d) return;
    const blob = await summaryImage(d); if (!blob) { toast('Bild konnte nicht erstellt werden'); return; }
    const name = 'Herakles-' + new Date(d.date).toISOString().slice(0, 10) + '.png';
    const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (e) { /* abgebrochen */ } return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Bild gespeichert');
  }

  function openCardioSheet(type) {
    const T = C.CARDIO[type], sug = C.cardioSuggest(HK.S, type, now());
    const d = new Date(), dv = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    sheet('<h3>Cardio eintragen</h3><div class="seg">' + Object.keys(C.CARDIO).map((k) => '<button data-a="cardio-type" data-v="' + k + '" class="' + (k === type ? 'on' : '') + '">' + C.CARDIO[k].label + '</button>').join('') + '</div>' +
      '<div class="banner info" style="margin-bottom:12px">' + (sug.target !== null ? '<b>Ziel: ' + C.fmtMetric(sug.target, type) + '</b>' : '') + esc(sug.reason) + '</div>' +
      '<div class="grid2"><div class="field"><label>' + (type === 'swim' ? 'Distanz (m)' : 'Distanz (km)') + (T.metric === 'distance' ? '' : ' – optional') + '</label><input id="c-dist" inputmode="decimal" data-c="cardio-calc" placeholder="' + (type === 'swim' ? 'z. B. 1000' : 'z. B. 6,2') + '"></div><div class="field"><label>Zeit (mm:ss oder h:mm:ss)' + (T.metric === 'duration' ? '' : ' – optional') + '</label><input id="c-dur" inputmode="numeric" data-c="cardio-calc" placeholder="z. B. 34:30"></div></div>' +
      '<div class="small muted" id="c-pace" style="margin:-4px 2px 10px"></div>' + cardioZones(type) +
      '<div class="grid2"><div class="field"><label>Datum</label><input id="c-date" type="date" value="' + dv + '"></div><div class="field"><label>Notiz</label><input id="c-note" maxlength="120" placeholder="optional"></div></div>' +
      '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="cardio-save" data-t="' + type + '">Speichern</button></div>');
  }
  function cardioZones(type) {
    const z = (type === 'run' || type === 'bike') ? C.heartZones(C.currentAge(HK.S, now())) : null;
    return z ? '<div class="tiny muted" data-testid="cardio-zones" style="margin:-4px 2px 12px">Puls (Schätzung): locker ' + z.easy.join('–') + ', zügig ' + z.steady.join('–') + ', hart ' + z.hard.join('–') + '</div>' : '';
  }
  function updateCardioPace() {
    const btn = $('[data-a=cardio-save]'); if (!btn) return;
    const type = btn.dataset.t; let dist = C.parseNum($('#c-dist').value); const dur = C.parseDuration($('#c-dur').value);
    if (type === 'swim' && dist) dist /= 1000;
    const p = C.pace({ distance: dist, duration: dur }, type);
    $('#c-pace').textContent = p ? 'Pace: ' + p : '';
  }

  function openSessionEditor(id) {
    const s = HK.S.sessions.find((x) => x.id === id); if (!s) return;
    let h = '<h3>' + esc(s.dayName) + '</h3><div class="muted small" style="margin-bottom:12px">' + C.fmtDateLong(s.start) + ', ' + C.fmtTime(s.start) + '–' + C.fmtTime(s.end) + (s.deload ? ', Deload' : '') + '</div>';
    s.exercises.forEach((e, ei) => {
      h += '<div style="margin-bottom:12px"><b>' + esc(e.name) + '</b>' + (e.note ? '<div class="small muted">Notiz: ' + esc(e.note) + '</div>' : '') + '<div class="tiny muted" style="margin:4px 0">kg, Wdh., Aufwärmsatz</div>';
      e.sets.forEach((st, si) => { h += '<div class="editset" data-ei="' + ei + '" data-si="' + si + '"><span class="muted">' + (si + 1) + '</span><input type="text" inputmode="decimal" class="num" data-f="w" value="' + wDisp(st.w) + '" aria-label="Gewicht"><input type="text" inputmode="numeric" class="num" data-f="r" value="' + st.r + '" aria-label="Wiederholungen"><label class="w"><input type="checkbox" data-f="warm"' + (st.warmup ? ' checked' : '') + '>W</label><button class="iconbtn" data-a="se-delset" aria-label="Satz löschen">×</button></div>'; });
      h += '</div>';
    });
    h += '<div class="actions"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="se-save" data-id="' + s.id + '">Speichern</button></div><div class="actions"><button class="btn danger" data-a="se-del" data-id="' + s.id + '" data-testid="se-del">Einheit löschen</button></div>';
    sheet(h);
  }
  function saveSessionEditor(id) {
    const s = HK.S.sessions.find((x) => x.id === id); if (!s) return;
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

  Object.assign(HK, { renderHistory, lineChart, summaryImage, shareSummary, openCardioSheet, updateCardioPace, openSessionEditor, saveSessionEditor });
})();
