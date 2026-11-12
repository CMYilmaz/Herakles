/* Herakles – Übungsbibliothek: Ausführung, Zielmuskeln, Begründung, Bewegungsvorschau.
   Muskeln: primär zählt 1 Satz, sekundär 0,5 Sätze (übliche „fraktionale“ Zählweise). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Library = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GROUPS = ['Brust', 'Rücken', 'Schulter vorn', 'Schulter seitlich', 'Schulter hinten', 'Bizeps', 'Trizeps', 'Quadrizeps', 'Beinbeuger', 'Gesäß', 'Waden', 'Bauch', 'Unterer Rücken'];
  const L = [];
  function x(key, name, equip, primary, secondary, anim, cues, why, more) {
    L.push(Object.assign({ key, name, equip, primary, secondary, anim, cues, why, aliases: [], compound: secondary.length > 0 }, more || {}));
  }
  // ---- Brust ----
  x('bench', 'Bankdrücken', 'barbell', ['Brust'], ['Trizeps', 'Schulter vorn'], 'bench',
    ['Schulterblätter zusammen und nach unten, leichtes Hohlkreuz', 'Füße fest am Boden', 'Stange kontrolliert zur unteren Brust, Ellbogen ca. 45–70° vom Körper', 'Drücken, bis die Arme fast gestreckt sind'],
    'Die Grundübung für Brust und Trizeps – lässt sich in kleinen Schritten über Jahre steigern.', { aliases: ['bankdrücken langhantel', 'bench press', 'flachbank'] });
  x('db_bench', 'Kurzhantel-Bankdrücken', 'dumbbell', ['Brust'], ['Trizeps', 'Schulter vorn'], 'bench',
    ['Hanteln über der Brust starten', 'Tief absenken, bis die Brust gedehnt ist', 'Ellbogen leicht angelegt', 'Oben nicht zusammenschlagen'],
    'Mehr Bewegungsumfang als mit der Stange und jede Seite arbeitet für sich – gut bei Seitenunterschieden oder Schulterdruck an der Stange.', { animProps: 'db' });
  x('incline_db', 'Schrägbankdrücken', 'dumbbell', ['Brust'], ['Schulter vorn', 'Trizeps'], 'incline',
    ['Bank auf ca. 30° stellen', 'Hanteln seitlich der oberen Brust absenken', 'Unterarme senkrecht halten', 'Nach oben leicht zusammenführen'],
    'Betont den oberen Brustanteil; mit Kurzhanteln großer Bewegungsumfang.', { aliases: ['schrägbank', 'schrägbankdrücken kurzhantel', 'incline press'] });
  x('incline_bb', 'Schrägbankdrücken (Langhantel)', 'barbell', ['Brust'], ['Schulter vorn', 'Trizeps'], 'incline',
    ['Bank auf ca. 30°', 'Stange zur oberen Brust', 'Schulterblätter fixieren', 'Kontrolliert, ohne Abfedern'],
    'Obere Brust mit schwerer, gut steigerbarer Last.', { animProps: 'plate' });
  x('chest_press', 'Brustpresse', 'machine', ['Brust'], ['Trizeps', 'Schulter vorn'], 'chestpress',
    ['Griffe auf Höhe der mittleren Brust einstellen', 'Rücken an der Lehne, Schulterblätter zurück', 'Drücken ohne die Schultern nach vorn zu schieben', 'Langsam zurück, bis die Brust gedehnt ist'],
    'Sicher bis nahe ans Muskelversagen trainierbar – gute Ergänzung nach den freien Übungen.', { aliases: ['chest press', 'brustpresse maschine'] });
  x('butterfly', 'Butterfly', 'machine', ['Brust'], [], 'fly',
    ['Sitz so, dass die Griffe auf Brusthöhe sind', 'Ellbogen leicht gebeugt und fixiert', 'Arme vor der Brust zusammenführen, kurz halten', 'Langsam öffnen, bis die Brust gedehnt ist'],
    'Isoliert die Brust ohne Trizeps – sinnvoll, wenn der Trizeps beim Drücken zuerst ermüdet.', { aliases: ['butterfly maschine', 'pec deck', 'flys'] });
  x('cable_fly', 'Cable Crossover', 'cable', ['Brust'], [], 'cablefly',
    ['Rollen auf Schulterhöhe oder höher', 'Leichter Ausfallschritt, Oberkörper stabil', 'Hände in einem Bogen vor dem Körper zusammenführen', 'Langsam zurück in die Dehnung'],
    'Konstante Spannung über den ganzen Weg – eine Alternative, wenn die Butterfly-Maschine belegt ist.', { aliases: ['kabelzug fliegende', 'cable fly'] });
  x('dips', 'Dips', 'bw', ['Brust', 'Trizeps'], ['Schulter vorn'], 'dips',
    ['Oberkörper leicht nach vorn für mehr Brust', 'Absenken, bis die Oberarme etwa waagerecht sind', 'Schultern weg von den Ohren', 'Oben strecken, nicht abfedern'],
    'Trainiert untere Brust und Trizeps zugleich mit dem eigenen Körpergewicht.', { aliases: ['barrendips'] });
  x('dips_w', 'Dips mit Gewicht', 'bwplus', ['Brust', 'Trizeps'], ['Schulter vorn'], 'dips',
    ['Zusatzgewicht am Gürtel', 'Gleiche Technik wie Dips', 'Erst steigern, wenn 3×12 sauber gehen', 'Kontrolliert absenken'],
    'Wenn normale Dips zu leicht werden, bleibt die Übung so steigerbar.', { animExtra: 'kbHip' });
  x('pushup', 'Liegestütze', 'bw', ['Brust'], ['Trizeps', 'Schulter vorn', 'Bauch'], 'pushup',
    ['Hände etwas breiter als schulterbreit', 'Körper eine Linie, Bauch fest', 'Brust fast bis zum Boden', 'Ellbogen ca. 45° vom Körper'],
    'Ohne Geräte, gut als Abschluss oder zum Aufwärmen.', { aliases: ['liegestütz', 'push ups'] });
  // ---- Rücken ----
  x('pullup', 'Klimmzüge', 'bw', ['Rücken'], ['Bizeps', 'Schulter hinten'], 'pullup',
    ['Griff etwas breiter als schulterbreit', 'Aus dem Hang Schulterblätter nach unten ziehen', 'Kinn über die Stange, Brust zur Stange', 'Ganz kontrolliert in den Hang'],
    'Die Grundübung für einen breiten Rücken mit dem eigenen Körpergewicht.', { aliases: ['klimmzug', 'pull ups'] });
  x('pullup_w', 'Klimmzüge mit Gewicht', 'bwplus', ['Rücken'], ['Bizeps', 'Schulter hinten'], 'pullup',
    ['Zusatzgewicht am Gürtel', 'Voller Bewegungsumfang', 'Kein Schwung', 'Steigern erst nach 3×12'],
    'Hält Klimmzüge steigerbar, wenn das eigene Gewicht nicht mehr reicht.', { animExtra: 'kbHip' });
  x('latpull', 'Latzug', 'cable', ['Rücken'], ['Bizeps', 'Schulter hinten'], 'latpull',
    ['Oberschenkel unter dem Polster fixieren', 'Leicht zurücklehnen', 'Stange zur oberen Brust, Ellbogen nach unten', 'Langsam nach oben, Arme ganz strecken'],
    'Wie Klimmzüge, aber mit frei wählbarem Gewicht – ideal auch für hohe Wiederholungen.', { aliases: ['latziehen', 'lat pulldown', 'lattzug'] });
  x('row_cable', 'Rudern', 'cable', ['Rücken'], ['Bizeps', 'Schulter hinten'], 'cablerow',
    ['Aufrecht sitzen, Knie leicht gebeugt', 'Griff zum Bauchnabel ziehen', 'Schulterblätter zusammen, kurz halten', 'Vorn die Schultern mitgehen lassen, Rücken gerade'],
    'Trainiert die Rückenmitte – Gegengewicht zu viel Drücken.', { aliases: ['kabelrudern', 'rudern eng', 'seated row'] });
  x('row_wide', 'Rudern breit', 'machine', ['Rücken', 'Schulter hinten'], ['Bizeps'], 'machinerow',
    ['Brust gegen das Polster', 'Breiter Griff, Ellbogen nach außen', 'Ellbogen nach hinten führen', 'Langsam zurück'],
    'Mit weitem Griff mehr oberer Rücken und hintere Schulter.', { aliases: ['rudermaschine breit'] });
  x('bb_row', 'Langhantelrudern', 'barbell', ['Rücken'], ['Schulter hinten', 'Bizeps', 'Unterer Rücken'], 'bbrow',
    ['Hüfte zurück, Oberkörper ca. 45° vorgebeugt', 'Rücken gerade', 'Stange zum Bauch ziehen', 'Kein Schwung aus der Hüfte'],
    'Schwere Grundübung für den ganzen Rücken; trainiert die Rumpfstabilität mit.', { aliases: ['vorgebeugtes rudern', 'barbell row'] });
  x('db_row', 'Einarmiges Kurzhantelrudern', 'dumbbell', ['Rücken'], ['Schulter hinten', 'Bizeps'], 'dbrow',
    ['Knie und Hand auf der Bank', 'Rücken waagerecht und gerade', 'Hantel Richtung Hüfte ziehen', 'Unten ganz strecken'],
    'Jede Seite einzeln, großer Bewegungsumfang – gut bei Seitenunterschieden.', { aliases: ['kurzhantelrudern'] });
  x('hyperext', 'Unterer Rücken (Hyperextension)', 'bwplus', ['Unterer Rücken'], ['Gesäß', 'Beinbeuger'], 'hyperext',
    ['Polster knapp unter dem Hüftknochen', 'Rücken gerade, aus der Hüfte absenken', 'Bis zur Linie mit den Beinen hochkommen, nicht überstrecken', 'Später mit Hantelscheibe an der Brust'],
    'Stärkt die Rückenstrecker und das Gesäß.', { aliases: ['hyperextension', 'rückenstrecker', 'unterer rücken'] });
  x('face_pull', 'Face Pulls', 'cable', ['Schulter hinten'], ['Rücken'], 'facepull',
    ['Seil auf Augenhöhe', 'Zum Gesicht ziehen, Hände auseinander', 'Ellbogen hoch, Daumen nach hinten', 'Kurz halten, langsam zurück'],
    'Stärkt hintere Schulter und Schulterblattmuskulatur – ein guter Ausgleich zu viel Bank- und Schulterdrücken.', { aliases: ['facepull'] });
  // ---- Schulter ----
  x('ohp_db', 'Schulterdrücken', 'dumbbell', ['Schulter vorn'], ['Trizeps', 'Schulter seitlich'], 'ohp',
    ['Lehne fast senkrecht', 'Hanteln auf Schulterhöhe starten', 'Über den Kopf drücken, ohne ins Hohlkreuz zu gehen', 'Bis auf Ohrhöhe absenken'],
    'Die Grunddrückübung für die Schulter.', { aliases: ['schulterdrücken kurzhantel', 'shoulder press', 'überkopfdrücken'] });
  x('lat_raise', 'Seitheben', 'dumbbell', ['Schulter seitlich'], [], 'latraise',
    ['Leicht nach vorn geneigt stehen', 'Arme seitlich bis Schulterhöhe heben', 'Ellbogen führen, leicht gebeugt', 'Langsam ablassen, kein Schwung'],
    'Die direkteste Übung für die seitliche Schulter – sorgt für breitere Schultern.', { aliases: ['seitheben kurzhantel', 'lateral raise'] });
  x('cable_lat_raise', 'Seitheben am Kabel', 'cable', ['Schulter seitlich'], [], 'latraise',
    ['Rolle unten, Griff mit der fernen Hand', 'Arm seitlich bis Schulterhöhe', 'Oberkörper ruhig', 'Langsam zurück'],
    'Mehr Spannung im unteren Teil der Bewegung als mit der Kurzhantel – gute Ergänzung für die seitliche Schulter.', { animProps: 'handle' });
  x('reverse_fly', 'Reverse Butterfly', 'machine', ['Schulter hinten'], ['Rücken'], 'reversefly',
    ['Brust gegen das Polster', 'Arme leicht gebeugt', 'Seitlich nach hinten öffnen', 'Kurz halten, langsam zurück'],
    'Isoliert die hintere Schulter, die bei Drückübungen kaum mittrainiert wird.', { aliases: ['reverse flys', 'butterfly reverse'] });
  // ---- Arme ----
  x('curl_db', 'Bizepscurls', 'dumbbell', ['Bizeps'], [], 'curl',
    ['Ellbogen am Körper fixiert', 'Handflächen nach vorn', 'Hoch bis kurz vor die Schulter', 'Unten ganz strecken'],
    'Direktes Bizepstraining.', { aliases: ['bizepscurl', 'curls', 'kurzhantelcurls'] });
  x('hammer', 'Hammercurls', 'dumbbell', ['Bizeps'], [], 'curl',
    ['Daumen zeigen nach oben', 'Ellbogen am Körper', 'Kontrolliert hoch und runter', 'Kein Schwung'],
    'Trainiert Bizeps, Oberarmmuskel und Unterarm.', { aliases: ['hammer curls'] });
  x('preacher', 'Scott-Curls', 'machine', ['Bizeps'], [], 'preacher',
    ['Oberarme ganz auf dem Polster', 'Unten fast ganz strecken', 'Hoch ohne die Schultern zu heben', 'Langsam ablassen'],
    'Schwung ist ausgeschlossen, der Bizeps arbeitet stark in der Dehnung.', { aliases: ['scottcurls', 'preacher curl'] });
  x('pushdown', 'Trizepsdrücken am Kabelturm', 'cable', ['Trizeps'], [], 'pushdown',
    ['Ellbogen an den Seiten fixiert', 'Nach unten strecken, kurz halten', 'Nur die Unterarme bewegen', 'Langsam zurück bis etwa 90°'],
    'Direktes Trizepstraining, leicht zu dosieren.', { aliases: ['trizepsdrücken', 'pushdown', 'trizeps kabel'] });
  x('overhead_ext', 'Überkopf-Trizepsstrecken', 'cable', ['Trizeps'], [], 'overheadext',
    ['Rücken zum Kabelzug, Seil über dem Kopf', 'Ellbogen zeigen nach vorn-oben', 'Arme nach vorn-oben strecken', 'Tief in die Dehnung zurück'],
    'Dehnt den langen Trizepskopf über Kopf – ergänzt das Trizepsdrücken.', { aliases: ['french press kabel', 'overhead extension'] });
  // ---- Beine ----
  x('squat', 'Kniebeuge', 'barbell', ['Quadrizeps', 'Gesäß'], ['Unterer Rücken', 'Beinbeuger'], 'squat',
    ['Stange auf dem oberen Rücken, Füße schulterbreit', 'Knie in Richtung der Zehen', 'Tief, solange der Rücken gerade bleibt', 'Aus der Mitte des Fußes hochdrücken'],
    'Die Grundübung für Beine und Gesäß.', { aliases: ['kniebeugen', 'squat', 'back squat'] });
  x('legpress', 'Beinpresse', 'machine', ['Quadrizeps'], ['Gesäß'], 'legpress',
    ['Füße schulterbreit mittig auf der Platte', 'Knie in Richtung der Zehen', 'Tief, ohne dass das Becken abhebt', 'Oben nicht ganz durchstrecken'],
    'Schwere Beinarbeit ohne Belastung des Rückens.', { aliases: ['leg press'] });
  x('legext', 'Beinstrecker', 'machine', ['Quadrizeps'], [], 'legext',
    ['Kniegelenk auf Höhe der Drehachse', 'Strecken, oben kurz halten', 'Langsam ablassen', 'Hüfte bleibt im Sitz'],
    'Isoliert den vorderen Oberschenkel.', { aliases: ['leg extension', 'beinstreckmaschine'] });
  x('legcurl', 'Beinbeuger', 'machine', ['Beinbeuger'], [], 'legcurl',
    ['Knie auf Höhe der Drehachse', 'Polster über der Ferse', 'Ganz beugen, kurz halten', 'Langsam strecken'],
    'Isoliert die hintere Oberschenkelmuskulatur.', { aliases: ['leg curl', 'beinbeugermaschine'] });
  x('rdl', 'Rumänisches Kreuzheben', 'barbell', ['Beinbeuger', 'Gesäß'], ['Unterer Rücken'], 'rdl',
    ['Knie leicht gebeugt und fix', 'Hüfte nach hinten schieben, Stange nah am Bein', 'Bis zur Dehnung hinten im Oberschenkel', 'Hüfte nach vorn bringen, Rücken gerade'],
    'Trainiert Beinbeuger und Gesäß in der Dehnung – ergänzt den Beinbeuger an der Maschine.', { aliases: ['rumänisches kreuzheben', 'rdl', 'romanian deadlift'] });
  x('hip_thrust', 'Hip Thrust', 'barbell', ['Gesäß'], ['Beinbeuger'], 'hipthrust',
    ['Oberer Rücken an der Bank, Stange auf der Hüfte (mit Polster)', 'Füße so, dass die Schienbeine oben senkrecht sind', 'Hüfte hochdrücken, oben das Gesäß anspannen', 'Kinn zur Brust, kein Hohlkreuz'],
    'Die direkteste schwere Übung fürs Gesäß.', { aliases: ['hipthrust', 'hüftheben'] });
  x('bulgarian', 'Bulgarische Kniebeuge', 'dumbbell', ['Quadrizeps', 'Gesäß'], [], 'splitsquat',
    ['Hinterer Fuß auf der Bank', 'Vorderes Knie über dem Fuß', 'Senkrecht absenken', 'Über die vordere Ferse hochdrücken'],
    'Einbeinig: trainiert Beine und Gesäß, gleicht Seitenunterschiede aus.', { aliases: ['bulgarian split squat'] });
  x('goblet', 'Goblet Squat', 'kettlebell', ['Quadrizeps', 'Gesäß'], [], 'goblet',
    ['Kettlebell vor der Brust', 'Aufrecht bleiben, tief beugen', 'Ellbogen zwischen die Knie', 'Fersen am Boden'],
    'Leichter zu lernen als die Langhantel-Kniebeuge, schont den Rücken.', { aliases: ['goblet kniebeuge'] });
  x('calf_press', 'Wadenpresse', 'machine', ['Waden'], [], 'calfpress',
    ['Fußballen auf den Plattenrand', 'Beine fast gestreckt', 'Tief in die Dehnung', 'Ganz auf die Zehen drücken, kurz halten'],
    'Waden an der Beinpresse – rückenfreundlich.', { aliases: ['wadenpresse beinpresse'] });
  x('calf_raise', 'Wadendrücker', 'machine', ['Waden'], [], 'calfraise',
    ['Fußballen auf der Kante', 'Knie fast gestreckt', 'Unten dehnen, oben 1 s halten', 'Kein Wippen'],
    'Stehende Variante – trainiert die Wade mit gestrecktem Knie.', { aliases: ['wadenheben', 'wadenheben stehend', 'calf raise'] });
  x('kb_swing', 'Kettlebell Swings', 'kettlebell', ['Gesäß', 'Beinbeuger'], ['Unterer Rücken'], 'swing',
    ['Aus der Hüfte schwingen, nicht aus den Armen', 'Rücken gerade, Kettlebell zwischen den Beinen', 'Explosiv Hüfte strecken, Gesäß anspannen', 'Kettlebell bis Brusthöhe'],
    'Kräftigt die hintere Kette explosiv und bringt den Puls hoch.', { aliases: ['kettlebell swing', 'kettlebell übungen', 'kb swings'] });
  // ---- Bauch ----
  x('situp', 'Situps gerade', 'bw', ['Bauch'], [], 'situp',
    ['Füße fixiert oder angewinkelt', 'Rücken Wirbel für Wirbel einrollen', 'Hände an der Brust', 'Langsam ablegen'],
    'Gerade Bauchmuskeln.', { aliases: ['situps', 'sit ups', 'crunches'] });
  x('situp_side', 'Situps seitlich', 'bw', ['Bauch'], [], 'situp',
    ['Wie Situps, oben zur Seite drehen', 'Schulter Richtung gegenüberliegendes Knie', 'Seiten abwechseln', 'Langsam ablegen'],
    'Schräge Bauchmuskeln durch die Rotation.', { aliases: ['seitliche situps', 'situps schräg'] });
  x('russian_twist', 'Russian Twists', 'kettlebell', ['Bauch'], [], 'twist',
    ['Leicht zurückgelehnt sitzen, Rücken gerade', 'Kettlebell vor dem Körper', 'Oberkörper von Seite zu Seite drehen', 'Füße am Boden oder angehoben'],
    'Rotation für die schrägen Bauchmuskeln.', { aliases: ['russian twist', 'russian twists mit kettlebell'] });
  x('hang_raise', 'Beinheben hängend', 'bw', ['Bauch'], [], 'hangraise',
    ['An der Stange hängen, Schultern aktiv', 'Beine ohne Schwung anheben', 'Becken leicht einrollen', 'Langsam senken'],
    'Fordert vor allem den unteren Bauch und die Hüftbeuger.', { aliases: ['beinheben', 'hanging leg raise'] });
  x('cable_crunch', 'Kabel-Crunch', 'cable', ['Bauch'], [], 'cablecrunch',
    ['Kniend, Seil neben dem Kopf', 'Rücken einrollen, Ellbogen Richtung Knie', 'Hüfte bleibt ruhig', 'Langsam aufrollen'],
    'Bauchtraining mit Gewicht – lässt sich wie jede andere Übung steigern.', { aliases: ['kabelcrunch'] });
  x('plank', 'Unterarmstütz', 'bw', ['Bauch'], [], 'plank',
    ['Ellbogen unter den Schultern', 'Körper eine Linie', 'Gesäß und Bauch anspannen', 'Ruhig atmen'],
    'Rumpfstabilität ohne Geräte.', { aliases: ['plank', 'planke'] });

  const FAMILY = {"calf_press": "calf", "calf_raise": "calf", "situp": "situp", "situp_side": "situp", "dips": "dips", "dips_w": "dips", "pullup": "pullup", "pullup_w": "pullup", "curl_db": "curl", "hammer": "curl"}; // gleichwertige Varianten
  L.forEach((e) => { e.family = FAMILY[e.key] || e.key; });
  const BY = {};
  L.forEach((e) => { BY[e.key] = e; });
  const norm = (s) => String(s || '').toLowerCase().replace(/[()]/g, ' ').replace(/ß/g, 'ss').replace(/[^a-z0-9äöü ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function match(name) {
    const n = norm(name);
    if (!n) return null;
    for (const e of L) if (norm(e.name) === n || e.aliases.some((a) => norm(a) === n)) return e.key;
    for (const e of L) if (n.indexOf(norm(e.name)) === 0 || e.aliases.some((a) => n.indexOf(norm(a)) === 0)) return e.key;
    return null;
  }
  return { GROUPS, LIST: L, BY, match, norm };
});
