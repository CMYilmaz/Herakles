/* Herakles – Mehr: Einstellungen, Hilfe, Export und Import. Keine externen Bibliotheken. Alle Daten bleiben lokal auf dem Gerät. */
(function () {
  'use strict';
  const HK = window.HeraklesUI;
  const { C, VERSION, esc, now, ui, save, toast, confirmBox, render, lineChart } = HK;

  // ---------- Einstellungen ----------
  function numSetting(label, desc, path, val, opts) {
    return '<div class="setting"><div><div>' + label + '</div>' + (desc ? '<div class="d">' + desc + '</div>' : '') + '</div><input type="number" inputmode="decimal" step="' + ((opts && opts.step) || 1) + '" min="' + ((opts && opts.min) || 0) + '" data-c="setnum" data-p="' + path + '" value="' + val + '"></div>';
  }
  function toggleSetting(label, desc, path, val) {
    return '<div class="setting"><div><div>' + label + '</div>' + (desc ? '<div class="d">' + desc + '</div>' : '') + '</div><label class="toggle"><input type="checkbox" data-c="settog" data-p="' + path + '"' + (val ? ' checked' : '') + ' aria-label="' + esc(label) + '"></label></div>';
  }
  function renderBodyCard() {
    const t = now(), bw = C.bodyWeightAt(HK.S, t), age = C.currentAge(HK.S, t), z = C.heartZones(age), list = (HK.S.body || []).slice(-30);
    let h = '<h2>Körper</h2><div class="list" data-testid="body">';
    h += '<div class="setting"><div><div>Körpergewicht (kg)</div><div class="d">Für die Gesamtlast bei Klimmzügen und Dips. Ein Eintrag pro Tag, der Verlauf bleibt.</div></div><input type="text" class="setnum" inputmode="decimal" data-c="bodyweight" data-testid="bw-input" value="' + (bw ? C.fmtNum(bw) : '') + '" placeholder="–" aria-label="Körpergewicht in kg"></div>';
    h += '<div class="setting"><div><div>Alter</div><div class="d">Nur für geschätzte Pulsbereiche beim Laufen.</div></div><input type="text" class="setnum" inputmode="numeric" data-c="age" data-testid="age-input" value="' + (age || '') + '" placeholder="–" aria-label="Alter"></div></div>';
    if (list.length >= 2) h += '<div class="card" data-testid="bw-chart"><div class="eyebrow">Gewichtsverlauf</div>' + lineChart(list.map((b) => ({ x: b.date, y: b.kg })), (v) => C.fmtNum(Math.round(v * 10) / 10) + ' kg') + '</div>';
    if (z) h += '<div class="card" data-testid="zones"><div class="eyebrow">Pulsbereiche (Schätzung)</div><div class="kv1"><span>Maximalpuls ~</span><b>' + z.max + '</b></div><div class="kv1"><span>Locker (60–70 %)</span><b>' + z.easy.join('–') + '</b></div><div class="kv1"><span>Zügig (70–80 %)</span><b>' + z.steady.join('–') + '</b></div><div class="kv1"><span>Hart (80–90 %)</span><b>' + z.hard.join('–') + '</b></div><div class="tiny muted" style="margin-top:8px">Formel 208 − 0,7 × Alter (Tanaka, Monahan &amp; Seals 2001). Eine Schätzung: Der echte Maximalpuls kann deutlich abweichen. Keine medizinische Aussage.</div></div>';
    h += '<p class="tiny muted" style="margin:6px 2px 0">Größe wird nicht abgefragt: Für Sätze, Wiederholungen und Gewichte gibt es keine belastbare Regel, die sich daraus ableitet. Alle Angaben bleiben auf diesem iPhone.</p>';
    return h;
  }
  function renderSettings() {
    const st = HK.S.settings, P = st.progression, D = st.deload, Cd = st.cardio;
    const lb = HK.S.meta.lastExportAt;
    let h = '<div class="view"><div class="topbar"><div><h1>Mehr</h1><div class="sub">Einstellungen und Hilfe</div></div></div>';
    h += '<h2>Datensicherung</h2><div class="card"><div class="small">Deine Daten liegen nur auf diesem iPhone. iOS kann Website-Speicher in seltenen Fällen löschen (z. B. bei Speichermangel oder wenn du die App vom Home-Bildschirm entfernst). <b>Exportiere regelmäßig</b> und lege die Datei in „Dateien“/iCloud Drive ab.</div><div class="small muted" style="margin:8px 0 12px" data-testid="last-backup">Letzte Sicherung: ' + (lb ? C.fmtDateLong(lb) + ' (' + C.daysSinceBackup(HK.S, now()) + ' Tage)' : 'noch nie') + '</div>' +
      '<div class="grid2"><button class="btn primary" data-a="export" data-testid="export">Exportieren</button><button class="btn" data-a="import">Importieren</button></div>' +
      '<div class="csvbox"><div class="small"><b>Verlauf als Tabelle (CSV)</b> für Excel oder Numbers: eine Zeile pro Satz. Kein Ersatz für das Backup – importieren lässt sich nur die Backup-Datei.</div>' +
      '<div class="grid2"><button class="btn" data-a="export-csv" data-k="sets" data-testid="csv-sets">Sätze als CSV</button>' + (HK.S.cardio.length ? '<button class="btn" data-a="export-csv" data-k="cardio" data-testid="csv-cardio">Cardio als CSV</button>' : '') + '</div></div></div>';
    h += '<div class="list">' + numSetting('Erinnerung nach … Tagen', 'Warnung beim Start, wenn so lange nicht gesichert wurde', 'backupIntervalDays', st.backupIntervalDays, { min: 1 }) + '</div>';
    h += '<h2>Allgemein</h2><div class="list"><div class="setting"><div>Darstellung</div><select data-c="theme"><option value="light"' + (st.theme === 'light' ? ' selected' : '') + '>Creme (hell)</option><option value="dark"' + (st.theme === 'dark' ? ' selected' : '') + '>Nacht (dunkel)</option><option value="system"' + (st.theme === 'system' ? ' selected' : '') + '>wie iPhone</option></select></div>' +
      toggleSetting('Ton am Pausenende', 'Drei kurze Töne + Aufblinken', 'sound', st.sound) +
      '<div class="setting"><div>Ton testen</div><button class="btn sm" data-a="sound-test">Abspielen</button></div>' +
      toggleSetting('Ton auch im Lautlos-Modus', 'Experimentell. Kann laufende Musik kurz unterbrechen.', 'soundInSilentMode', st.soundInSilentMode) +
      toggleSetting('Bildschirm während des Trainings an', 'Verhindert Sperren, damit der Timer sichtbar bleibt', 'keepAwake', st.keepAwake) +
      '<div class="setting"><div>Cardio-Art auf „Heute“</div><select data-c="cardioType">' + Object.keys(C.CARDIO).map((k) => '<option value="' + k + '"' + (k === st.cardioType ? ' selected' : '') + '>' + C.CARDIO[k].label + '</option>').join('') + '</select></div></div>';
    h += renderBodyCard();
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
    h += '<p class="tiny muted" style="margin:16px 4px">Hinweis: Herakles gibt Trainingsvorschläge auf Basis deiner Eingaben und fester Regeln. Es ersetzt keine ärztliche oder trainerische Beratung. Bei Schmerzen: Übung pausieren.<br><br>Version ' + VERSION + ', offline, keine Konten, keine Cloud, kein Tracking.</p>';
    return h + '</div>';
  }
  function explainHtml() {
    const P = HK.S.settings.progression, D = HK.S.settings.deload, Cd = HK.S.settings.cardio;
    return '<details class="card" data-testid="explain"><summary>So entscheidet die App</summary><div class="prose">' +
      '<p><b>Doppelprogression.</b> Jede Übung hat einen Wiederholungsbereich (bei dir 8–12) und eine Gewichtsstufe (Standard 2,5 kg). Schaffst du in <i>allen</i> Arbeitssätzen die obere Grenze, schlägt die App beim nächsten Mal genau <b>eine Stufe mehr</b> vor und startet wieder bei der unteren Grenze. Sonst bleibt das Gewicht, und das Ziel ist je Satz +1 Wiederholung.</p>' +
      '<p><b>Reserve.</b> Trägst du bei einem Satz „Reserve 0“ ein (keine Wiederholung mehr möglich) und erreichst trotzdem die obere Grenze, bleibt das Gewicht einmal gleich. Schaffst du die Grenze beim nächsten Mal wieder, wird gesteigert. Ohne Reserve-Angabe gilt die normale Regel. Abschaltbar unter „Erweitert“.</p>' +
      '<p><b>Rückschläge.</b> Steigt die Summe deiner Wiederholungen bei gleichem Gewicht nicht, zählt das als Fehlversuch. Ab ' + P.stallHold + ' Fehlversuchen heißt es ausdrücklich „Gewicht bleibt“. Nach ' + P.stallReduce + ' Fehlversuchen in Folge schlägt die App eine Reduktion um höchstens ' + P.reducePct + ' % (auf die nächste Stufe gerundet) oder eine kurze Pause der Übung vor.</p>' +
      '<p><b>Pausen.</b> Liegt die letzte Einheit einer Übung ≥ ' + P.longBreakDays + ' Tage zurück, wird beim ersten Mal nicht gesteigert.</p>' +
      '<p><b>Deload.</b> Nach ' + D.everyWeeks + ' Wochen oder wenn ' + D.stagnationCount + ' Übungen stagnieren (' + P.stallReduce + '× in Folge ohne Steigerung), schlägt die App eine leichtere Woche vor: ' + Math.round(D.setsFactor * 100) + ' % der Sätze, ~' + Math.round(D.weightFactor * 100) + ' % Gewicht, für ' + HK.S.days.length + ' Einheiten. Du kannst annehmen oder ablehnen (dann fragt sie in 7 Tagen wieder). Deload-Einheiten zählen nicht für die Progression. Eine Trainingspause ab 10 Tagen gilt selbst als Erholung.</p>' +
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
      '<li><b>Gewichte:</b> Langhantel je Seite (ohne Stange), Kurzhantel je Hantel, Maschinen gesamt. Volumen und Bestwerte rechnen mit dem tatsächlich bewegten Gewicht. Bei abwechselnden Kurzhantelübungen (Curls, Hammercurls, einarmiges Rudern, Bulgarische Kniebeuge) zählst du die Wiederholungen beider Seiten zusammen – das Ziel verdoppelt sich entsprechend. Einstellbar je Übung unter Plan → Ändern.</li>' +
      '<li><b>Plan optimieren:</b> Tab „Plan“ → „Vorschlag erstellen“ (alle 3 Wochen erinnert die App). Stagnierende Übungen werden getauscht oder neu aufgebaut, Sätze nach Muskel ausgeglichen. Alles, einzelne Tage oder einzelne Änderungen übernehmen – oder nichts. Rückgängig bis zur nächsten Einheit.</li>' +
      '<li><b>Körper:</b> „Mehr“ → Körpergewicht (Gesamtlast bei Klimmzügen und Dips, Gewichtsverlauf) und Alter (geschätzte Pulsbereiche fürs Laufen).</li>' +
      '<li><b>Korrigieren:</b> „Verlauf“ → Einheit antippen → Werte ändern oder Einheit löschen.</li>' +
      '<li><b>Monatsrückblick:</b> „Verlauf“ → „Monat“: Einheiten, Sätze, Volumen, Stunden, Lauf-Kilometer, neue Bestwerte.</li>' +
      '<li><b>Supersatz:</b> Tab „Plan“ → „Ändern“ → mit der folgenden Übung koppeln. Im Training springt die App nach jedem Satz ohne Pause zur zweiten Übung und nach deren Satz mit Pause zurück.</li>' +
      '<li><b>Sichern:</b> Alle 2 Wochen „Exportieren“ und die Datei in „Dateien“ speichern. Die App erinnert daran, sobald seit der letzten Sicherung neue Einheiten dazugekommen sind.</li>' +
      '<li><b>Auswerten:</b> „Mehr“ → „Sätze als CSV“ gibt den ganzen Verlauf als Tabelle für Excel aus (eine Zeile pro Satz).</li></ul></div></details>';
  }

  // ================= Export / Import =================
  const dateStamp = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // Datei über das Teilen-Menü abgeben (iPhone: „In Dateien sichern“), sonst als Download. false = abgebrochen
  async function handOver(file, title) {
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return true; }
    } catch (e) {
      if (e && e.name === 'AbortError') { toast('Export abgebrochen'); return false; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }
  async function exportData() {
    const name = 'herakles-backup-' + dateStamp() + '.json';
    const payload = { app: 'herakles', version: VERSION, exportedAt: new Date().toISOString(), data: HK.S };
    if (!(await handOver(new File([JSON.stringify(payload, null, 1)], name, { type: 'application/json' }), 'Herakles-Backup'))) return;
    HK.S.meta.lastExportAt = now(); save(); render(); toast('Backup erstellt: ' + name);
  }
  // Verlauf als Tabelle – zählt nicht als Backup
  async function exportTable(kind) {
    const cardio = kind === 'cardio', n = cardio ? HK.S.cardio.length : HK.S.sessions.length;
    if (!n) { toast(cardio ? 'Noch keine Cardio-Einträge' : 'Noch keine abgeschlossene Einheit'); return; }
    const name = 'herakles-' + (cardio ? 'cardio' : 'saetze') + '-' + dateStamp() + '.csv';
    const text = cardio ? C.cardioCSV(HK.S) : C.setsCSV(HK.S);
    if (await handOver(new File([text], name, { type: 'text/csv' }), cardio ? 'Herakles-Cardio' : 'Herakles-Sätze')) toast('Tabelle erstellt: ' + name);
  }
  async function importFile(file) {
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { toast('Datei ist kein gültiges JSON'); return; }
    const err = C.validateImport(obj); if (err) { toast(err); return; }
    const data = (obj.app === 'herakles' || obj.app === 'satzwerk') ? obj.data : obj;
    const n = (data.sessions || []).length, c = (data.cardio || []).length;
    if (!(await confirmBox('Backup importieren?', 'Die Datei enthält ' + n + ' Einheiten und ' + c + ' Cardio-Einträge' + (obj.exportedAt ? ' (Stand ' + C.fmtDateLong(Date.parse(obj.exportedAt)) + ')' : '') + '. Deine aktuellen Daten werden dabei ersetzt.', 'Importieren'))) return;
    HK.S = C.migrate(data); if (!HK.S.meta.lastExportAt) HK.S.meta.lastExportAt = now();
    save(); HK.view = HK.S.active ? 'gym' : 'home'; render(); toast('Import abgeschlossen');
  }

  Object.assign(HK, { renderSettings, exportData, importFile, exportTable });
})();
