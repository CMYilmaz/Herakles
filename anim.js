/* Herakles – Bewegungsvorschau: schematische Strichfigur (SVG), ohne externe Bibliothek.
   Winkel in Grad, mathematisch (0° = rechts, 90° = oben). Boden bei y = 0, Ansicht 240 × 175. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Anim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const W = 240, H = 175, G = 160; // svgY = G - y
  const LEN = { T: 52, U: 30, F: 28, Th: 38, Sh: 36, Ft: 12, neck: 15, head: 9 };
  const rad = (d) => (d * Math.PI) / 180;
  const dir = (d) => [Math.cos(rad(d)), Math.sin(rad(d))];
  const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];

  // ---------- Bewegungen ----------
  const S = 'side', F = 'front';
  const benchProps = [{ k: 'line', p: [52, 38, 166, 38], w: 6 }, { k: 'line', p: [68, 38, 68, 0], w: 4 }, { k: 'line', p: [150, 38, 150, 0], w: 4 }];
  const seat = (x1, x2, y) => [{ k: 'line', p: [x1, y, x2, y], w: 6 }, { k: 'line', p: [(x1 + x2) / 2, y, (x1 + x2) / 2, 0], w: 4 }];
  const SPECS = {
    bench: { view: S, anchor: ['hip', 150, 44], A: { t: 180, hx: 0, hy: 58, eb: -1, th: -15, sh: 260, ft: 0 }, B: { hx: 20, hy: 10 }, props: benchProps.concat([{ k: 'plate', at: 'wrist' }]) },
    incline: { view: S, anchor: ['hip', 140, 40], A: { t: 145, hx: 2, hy: 57, eb: -1, th: -5, sh: 265, ft: 0 }, B: { hx: 13, hy: 7 }, props: [{ k: 'line', p: [150, 32, 86, 78], w: 6 }, { k: 'line', p: [146, 32, 174, 32], w: 6 }, { k: 'line', p: [152, 32, 152, 0], w: 4 }, { k: 'db', at: 'wrist' }] },
    chestpress: { view: S, anchor: ['hip', 105, 42], A: { t: 100, ua: 230, fa: 20, th: 0, sh: 268, ft: 0 }, B: { ua: 362, fa: 2 }, props: [{ k: 'line', p: [96, 36, 86, 112], w: 7 }, { k: 'line', p: [92, 36, 132, 36], w: 6 }, { k: 'line', p: [100, 36, 100, 0], w: 4 }, { k: 'handle', at: 'wrist' }] },
    fly: { view: F, anchor: ['pelvis', 120, 50], A: { t: 90, ua: 0, su: 1, fa: 90, sf: 1, th: 272, ths: 0.35, sh: 270 }, B: { su: -0.5 }, props: [{ k: 'line', p: [96, 46, 144, 46], w: 6 }, { k: 'handle', at: 'wristR' }, { k: 'handle', at: 'wristL' }] },
    cablefly: { view: F, anchor: ['pelvis', 120, 72], A: { t: 90, ua: 10, su: 1, fa: 10, sf: 1, th: 274, sh: 270 }, B: { ua: -30, su: -0.25, fa: -30, sf: -0.3 }, props: [{ k: 'cableR', from: [228, 150] }, { k: 'cableL', from: [12, 150] }, { k: 'handle', at: 'wristR' }, { k: 'handle', at: 'wristL' }] },
    reversefly: { view: F, anchor: ['pelvis', 120, 50], A: { t: 90, ua: 0, su: -0.5, fa: 0, sf: -0.5, th: 272, ths: 0.35, sh: 270 }, B: { su: 1, sf: 1 }, props: [{ k: 'line', p: [96, 46, 144, 46], w: 6 }, { k: 'handle', at: 'wristR' }, { k: 'handle', at: 'wristL' }], note: 'Ansicht von hinten', back: true },
    dips: { view: S, scale: 0.86, anchor: ['wrist', 128, 80], A: { t: 86, hx: 2, hy: -57, eb: -1, th: 250, sh: 218, ft: 300 }, B: { t: 68, hx: -8, hy: -30, th: 238, sh: 204 }, props: [{ k: 'line', p: [108, 80, 150, 80], w: 5 }, { k: 'line', p: [144, 80, 144, 0], w: 4 }] },
    pushup: { view: S, anchor: ['wrist', 142, 4], A: { t: 27, ua: 268, fa: 270, th: 207, sh: 207, ft: 212 }, B: { t: 13, ua: 200, fa: 320, th: 193, sh: 193, ft: 202 }, props: [] },
    pullup: { view: F, scale: 0.62, anchor: ['wristR', 143, 135], A: { t: 90, hx: 20, hy: 54, eb: -1, th: 269, sh: 271 }, B: { hx: 22, hy: 6 }, props: [{ k: 'line', p: [82, 135, 158, 135], w: 4 }], note: 'Ansicht von vorn' },
    latpull: { view: F, anchor: ['pelvis', 120, 47], A: { t: 90, ua: 60, fa: 64, th: 272, ths: 0.35, sh: 270, shs: 0.9 }, B: { ua: -68, fa: 80 }, props: [{ k: 'cableC', from: [120, 172] }, { k: 'line', p: [98, 43, 142, 43], w: 6 }, { k: 'line', p: [120, 43, 120, 0], w: 4 }, { k: 'barLR', ext: 10 }], note: 'Ansicht von vorn' },
    cablerow: { view: S, anchor: ['hip', 88, 30], A: { t: 72, ua: 2, fa: 2, th: 14, sh: -12, ft: 80 }, B: { t: 96, ua: -162, fa: 8 }, props: [{ k: 'cable', from: [218, 42] }, { k: 'handle', at: 'wrist' }, { k: 'line', p: [62, 24, 112, 24], w: 6 }, { k: 'line', p: [170, 12, 170, 50], w: 5 }] },
    machinerow: { view: S, anchor: ['hip', 92, 40], A: { t: 80, hx: 54, hy: -6, eb: -1, th: 2, sh: 268, ft: 0 }, B: { t: 88, hx: 8, hy: -12 }, props: [{ k: 'line', p: [112, 70, 116, 104], w: 7 }, { k: 'line', p: [72, 34, 112, 34], w: 6 }, { k: 'line', p: [92, 34, 92, 0], w: 4 }, { k: 'handle', at: 'wrist' }, { k: 'line', p: [176, 20, 176, 130], w: 4 }] },
    bbrow: { view: S, anchor: ['ankle', 112, 2], A: { t: 28, ua: 268, fa: 270, th: 288, sh: 262, ft: 0 }, B: { ua: 205, fa: 268 }, props: [{ k: 'plate', at: 'wrist' }] },
    dbrow: { view: S, anchor: ['ankle', 112, 2], A: { t: 22, ua: 270, fa: 270, ua2: 290, fa2: 290, th: 285, sh: 262, ft: 0 }, B: { ua: 200, fa: 268 }, props: [{ k: 'db', at: 'wrist' }, { k: 'line', p: [150, 46, 196, 46], w: 6 }, { k: 'line', p: [176, 46, 176, 0], w: 4 }] },
    hyperext: { view: S, anchor: ['ankle', 192, 54], A: { t: 242, uaR: 165, faR: -150, th: -30, sh: -30, ft: 60 }, B: { t: 150 }, props: [{ k: 'line', p: [136, 84, 184, 56], w: 7 }, { k: 'line', p: [184, 56, 198, 0], w: 4 }, { k: 'roller', at: 'ankle' }] },
    facepull: { view: F, anchor: ['pelvis', 120, 74], A: { t: 90, ua: 8, su: -0.25, fa: 8, sf: -0.25, th: 273, sh: 270 }, B: { su: 1, fa: 100, sf: 0.75 }, props: [{ k: 'handle', at: 'wristR' }, { k: 'handle', at: 'wristL' }], note: 'Ansicht von vorn' },
    ohp: { view: F, anchor: ['pelvis', 120, 47], A: { t: 90, ua: 0, fa: 90, th: 272, ths: 0.35, sh: 270, shs: 0.9 }, B: { ua: 66, fa: 86 }, props: [{ k: 'line', p: [98, 43, 142, 43], w: 6 }, { k: 'line', p: [120, 43, 120, 0], w: 4 }, { k: 'db', at: 'wristR' }, { k: 'db', at: 'wristL' }], note: 'Ansicht von vorn' },
    latraise: { view: F, anchor: ['pelvis', 120, 74], A: { t: 90, ua: 276, fa: 279, su: 1, sf: 1, th: 273, sh: 270 }, B: { ua: 358, fa: 362 }, props: [{ k: 'db', at: 'wristR' }, { k: 'db', at: 'wristL' }] },
    curl: { view: S, anchor: ['ankle', 110, 2], A: { t: 90, ua: 268, fa: 272, th: 271, sh: 269, ft: 0 }, B: { ua: 276, fa: 472 }, props: [{ k: 'db', at: 'wrist' }] },
    preacher: { view: S, anchor: ['hip', 100, 46], A: { t: 80, ua: 318, fa: 306, th: 0, sh: 268, ft: 0 }, B: { fa: 470 }, props: [{ k: 'line', p: [118, 92, 146, 66], w: 7 }, { k: 'line', p: [140, 66, 140, 0], w: 4 }, { k: 'line', p: [82, 40, 118, 40], w: 6 }, { k: 'handle', at: 'wrist' }] },
    pushdown: { view: S, anchor: ['ankle', 100, 2], A: { t: 84, ua: 272, fa: 58, th: 272, sh: 268, ft: 0 }, B: { fa: -80 }, props: [{ k: 'cable', from: [150, 172] }, { k: 'handle', at: 'wrist' }, { k: 'line', p: [150, 0, 150, 172], w: 3 }] },
    overheadext: { view: S, scale: 0.85, anchor: ['ankle', 120, 2], A: { t: 80, ua: 112, fa: 250, th: 280, sh: 266, ft: 0, th2: 262, sh2: 262 }, B: { fa: 108 }, props: [{ k: 'cable', from: [34, 96] }, { k: 'handle', at: 'wrist' }] },
    squat: { view: S, anchor: ['ankle', 118, 2], A: { t: 90, ua: 240, fa: 100, th: 272, sh: 268, ft: 0 }, B: { t: 58, ua: 208, fa: 68, th: 352, sh: 248 }, props: [{ k: 'plate', at: 'back' }] },
    goblet: { view: S, anchor: ['ankle', 118, 2], A: { t: 90, ua: 285, fa: 70, th: 272, sh: 268, ft: 0 }, B: { t: 64, ua: 262, fa: 42, th: 352, sh: 248 }, props: [{ k: 'kb', at: 'wrist' }] },
    legpress: { view: S, anchor: ['hip', 74, 40], A: { t: 128, ua: 285, fa: 330, ax: 38.3, ay: 32.1, kb: 1, ft: 130 }, B: { ax: 56.6, ay: 47.5 }, props: [{ k: 'line', p: [78, 32, 40, 82], w: 7 }, { k: 'line', p: [66, 30, 98, 30], w: 6 }, { k: 'line', p: [115, 53, 172, 101], w: 3 }, { k: 'foot', at: 'ankle', ang: -50, dx: 5.4, dy: -4.5 }] },
    calfpress: { view: S, anchor: ['hip', 74, 40], A: { t: 128, ua: 285, fa: 330, ax: 56.6, ay: 47.5, kb: 1, ft: 130 }, B: { ft: 80 }, props: [{ k: 'line', p: [78, 32, 40, 82], w: 7 }, { k: 'line', p: [66, 30, 98, 30], w: 6 }, { k: 'line', p: [120, 57, 178, 106], w: 3 }, { k: 'foot', at: 'toe', ang: -50, dx: 3.8, dy: -3.2 }] },
    legext: { view: S, anchor: ['hip', 100, 56], A: { t: 96, ua: 280, fa: 300, th: 0, sh: 266, ft: 356 }, B: { sh: 366, ft: 456 }, props: [{ k: 'line', p: [90, 50, 92, 116], w: 7 }, { k: 'line', p: [84, 50, 140, 50], w: 6 }, { k: 'line', p: [100, 50, 100, 0], w: 4 }, { k: 'roller', at: 'ankle' }] },
    legcurl: { view: S, anchor: ['hip', 96, 56], A: { t: 100, ua: 280, fa: 300, th: 0, sh: 360, ft: 450 }, B: { sh: 250, ft: 340 }, props: [{ k: 'line', p: [86, 50, 88, 116], w: 7 }, { k: 'line', p: [80, 50, 136, 50], w: 6 }, { k: 'line', p: [96, 50, 96, 0], w: 4 }, { k: 'roller', at: 'ankle', dy: 7 }] },
    rdl: { view: S, anchor: ['ankle', 116, 2], A: { t: 90, ua: 270, fa: 270, th: 272, sh: 268, ft: 0 }, B: { t: 22, th: 284, sh: 264 }, props: [{ k: 'plate', at: 'wrist' }] },
    hipthrust: { view: S, anchor: ['shoulder', 80, 50], A: { t: 147, ua: 300, fa: 20, th: 40, sh: 298, ft: 0 }, B: { t: 180, ua: 330, fa: 10, th: 0, sh: 272 }, props: [{ k: 'line', p: [36, 46, 88, 46], w: 6 }, { k: 'line', p: [50, 46, 50, 0], w: 4 }, { k: 'plate', at: 'hip', dy: 9 }] },
    splitsquat: { view: S, anchor: ['ankle', 130, 2], foot2: [62, 42], A: { t: 88, ua: 270, fa: 270, th: 278, sh: 266, ft: 0, ft2: 182 }, B: { t: 80, th: 346, sh: 258 }, props: [{ k: 'db', at: 'wrist' }, { k: 'line', p: [24, 34, 74, 34], w: 6 }, { k: 'line', p: [46, 34, 46, 0], w: 4 }] },
    calfraise: { view: S, scale: 0.86, anchor: ['toe', 122, 9], A: { t: 90, ua: 240, fa: 100, th: 271, sh: 269, ft: 22 }, B: { ft: -32 }, props: [{ k: 'line', p: [100, 5, 150, 5], w: 6 }, { k: 'pad', at: 'shoulder' }] },
    swing: { view: S, anchor: ['ankle', 112, 2], A: { t: 36, ua: 250, fa: 246, th: 292, sh: 264, ft: 0 }, B: { t: 92, ua: 362, fa: 362, th: 272, sh: 268 }, props: [{ k: 'kb', at: 'wrist' }] },
    situp: { view: S, anchor: ['hip', 118, 8], A: { t: 176, ua: 18, fa: 186, th: 55, sh: 300, ft: 0 }, B: { t: 110, ua: -50, fa: 122 }, props: [{ k: 'line', p: [30, 2, 220, 2], w: 4 }] },
    twist: { view: F, anchor: ['pelvis', 120, 30], A: { t: 98, ts: 0.85, hand: [-36, 30], th: 66, ths: 0.5, sh: 285, shs: 1 }, B: { t: 82, hand: [36, 30] }, props: [{ k: 'kb', at: 'hand' }, { k: 'line', p: [60, 2, 180, 2], w: 4 }] },
    hangraise: { view: S, scale: 0.66, anchor: ['wrist', 120, 150], A: { t: 90, ua: 90, fa: 90, th: 268, sh: 268, ft: 310 }, B: { th: 364, sh: 364, ft: 400 }, props: [{ k: 'line', p: [92, 150, 150, 150], w: 4 }] },
    cablecrunch: { view: S, anchor: ['knee', 120, 4], A: { t: 82, ua: 130, fa: 300, th: 270, sh: 180, ft: 192 }, B: { t: 18, ua: 70, fa: 230 }, props: [{ k: 'cable', from: [150, 172] }, { k: 'handle', at: 'wrist' }] },
    plank: { view: S, anchor: ['ankle', 40, 8], A: { t: 11, ua: 270, fa: 0, th: 194, sh: 194, ft: 228 }, B: { t: 13 }, props: [] },
    // Schultertag mit Kettlebell (ab 3.4)
    shrug: { view: F, anchor: ['pelvis', 120, 74], A: { t: 90, hx: 5, hy: -60, eb: -1, th: 273, sh: 270 }, B: { hx: 6, hy: -52 }, props: [{ k: 'db', at: 'wristR' }, { k: 'db', at: 'wristL' }], note: 'Ansicht von vorn' },
    uprightrow: { view: F, anchor: ['pelvis', 120, 74], A: { t: 90, hx: -8, hy: -59, eb: -1, th: 273, sh: 270 }, B: { hx: -8, hy: -14 }, props: [{ k: 'barLR', ext: 22 }], note: 'Ansicht von vorn' },
    kbrow: { view: F, anchor: ['pelvis', 120, 74], A: { t: 90, hx: -15, hy: -57, eb: -1, th: 273, sh: 270 }, B: { hx: -15, hy: -14 }, props: [{ k: 'kb', at: 'wristR', dx: -2 }], note: 'Ansicht von vorn' },
    kbaround: { view: F, anchor: ['pelvis', 120, 74], A: { t: 90, hand: [-27, -4], th: 273, sh: 270 }, B: { hand: [27, -4] }, props: [{ k: 'kb', at: 'hand' }], note: 'Ansicht von vorn' },
    pullthrough: { view: S, anchor: ['wrist', 142, 4], A: { t: 27, ua: 268, fa: 270, ua2: 250, fa2: 262, th: 207, sh: 207, ft: 212 }, B: { ua2: 214, fa2: 205 }, props: [{ k: 'kb', at: 'wrist2', dy: -12 }] }
  };

  // ---------- Kinematik ----------
  function lerp(a, b, k) { return a + (b - a) * k; }
  function pose(spec, k) {
    const A = spec.A, B = Object.assign({}, A, spec.B), o = {};
    for (const key of Object.keys(A)) {
      const a = A[key], b = B[key];
      if (Array.isArray(a)) o[key] = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
      else o[key] = lerp(a, b, k);
    }
    return o;
  }
  function sideJoints(p, sc) {
    const L = (n) => LEN[n] * sc;
    const j = { hip: [0, 0] };
    j.shoulder = add(j.hip, dir(p.t), L('T'));
    j.neck = add(j.shoulder, dir(p.t), 2 * sc);
    j.back = add(add(j.shoulder, dir(p.t + 90), 9 * sc), dir(p.t), 1 * sc); // Stange auf dem oberen Rücken
    j.head = add(j.shoulder, dir(p.hd !== undefined ? p.hd : p.t), L('neck'));
    // Arme: entweder Winkel (absolut oder relativ zum Rumpf) oder Handziel relativ zur Schulter (IK)
    const uaA = p.uaR !== undefined ? p.t + p.uaR : p.ua;
    const faA = p.faR !== undefined ? uaA + p.faR : p.fa;
    if (p.hx !== undefined) [j.elbow, j.wrist] = ik2(j.shoulder, [j.shoulder[0] + p.hx * sc, j.shoulder[1] + p.hy * sc], L('U'), L('F'), p.eb || -1);
    else { j.elbow = add(j.shoulder, dir(uaA), L('U')); j.wrist = add(j.elbow, dir(faA), L('F')); }
    if (p.ax !== undefined) [j.knee, j.ankle] = ik2(j.hip, [p.ax * sc, p.ay * sc], L('Th'), L('Sh'), p.kb || 1); // Fußziel relativ zur Hüfte
    else { j.knee = add(j.hip, dir(p.th), L('Th')); j.ankle = add(j.knee, dir(p.sh), L('Sh')); }
    j.toe = add(j.ankle, dir(p.ft), L('Ft'));
    const ua2 = p.ua2 !== undefined ? p.ua2 : uaA, fa2 = p.fa2 !== undefined ? p.fa2 : faA;
    const th2 = p.th2 !== undefined ? p.th2 : p.th, sh2 = p.sh2 !== undefined ? p.sh2 : p.sh, ft2 = p.ft2 !== undefined ? p.ft2 : p.ft;
    if (p.hx !== undefined && p.ua2 === undefined) { j.elbow2 = j.elbow; j.wrist2 = j.wrist; }
    else { j.elbow2 = add(j.shoulder, dir(ua2), L('U')); j.wrist2 = add(j.elbow2, dir(fa2), L('F')); }
    if (p.ax !== undefined && p.th2 === undefined) { j.knee2 = j.knee; j.ankle2 = j.ankle; j.toe2 = add(j.ankle2, dir(ft2), L('Ft')); }
    else { j.knee2 = add(j.hip, dir(th2), L('Th')); j.ankle2 = add(j.knee2, dir(sh2), L('Sh')); j.toe2 = add(j.ankle2, dir(ft2), L('Ft')); }
    return j;
  }
  function ik2(s, target, a, b, bendSign) {
    const dx = target[0] - s[0], dy = target[1] - s[1];
    let d = Math.hypot(dx, dy); d = Math.min(Math.max(d, 1e-3), a + b - 0.01);
    const base = Math.atan2(dy, dx);
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const ang = base + bendSign * Math.acos(Math.max(-1, Math.min(1, cosA)));
    const e = [s[0] + Math.cos(ang) * a, s[1] + Math.sin(ang) * a];
    const w = [s[0] + dx / Math.hypot(dx, dy) * Math.min(Math.hypot(dx, dy), a + b), s[1] + dy / Math.hypot(dx, dy) * Math.min(Math.hypot(dx, dy), a + b)];
    return [e, w];
  }
  function frontJoints(p, sc) {
    const L = (n) => LEN[n] * sc;
    const j = { pelvis: [0, 0] };
    const tlen = L('T') * (p.ts || 1);
    const sc0 = add(j.pelvis, dir(p.t), tlen);
    const perp = [Math.cos(rad(p.t - 90)), Math.sin(rad(p.t - 90))];
    j.sc = sc0; j.head = add(sc0, dir(p.t), L('neck'));
    j.shoulderR = [sc0[0] + perp[0] * 17 * sc, sc0[1] + perp[1] * 17 * sc];
    j.shoulderL = [sc0[0] - perp[0] * 17 * sc, sc0[1] - perp[1] * 17 * sc];
    j.hipR = [9 * sc, 0]; j.hipL = [-9 * sc, 0];
    if (p.hx !== undefined) {
      const eb = p.eb || -1;
      [j.elbowR, j.wristR] = ik2(j.shoulderR, [j.shoulderR[0] + p.hx * sc, j.shoulderR[1] + p.hy * sc], L('U'), L('F'), eb);
      [j.elbowL, j.wristL] = ik2(j.shoulderL, [j.shoulderL[0] - p.hx * sc, j.shoulderL[1] + p.hy * sc], L('U'), L('F'), -eb);
    } else if (p.hand) {
      j.hand = [p.hand[0], p.hand[1]];
      [j.elbowR, j.wristR] = ik2(j.shoulderR, [j.hand[0] + 3, j.hand[1]], L('U') * 0.8, L('F') * 0.8, -1);
      [j.elbowL, j.wristL] = ik2(j.shoulderL, [j.hand[0] - 3, j.hand[1]], L('U') * 0.8, L('F') * 0.8, 1);
    } else {
      const su = p.su === undefined ? 1 : p.su, sf = p.sf === undefined ? 1 : p.sf;
      const du = dir(p.ua), df = dir(p.fa);
      j.elbowR = [j.shoulderR[0] + du[0] * L('U') * su, j.shoulderR[1] + du[1] * L('U')];
      j.wristR = [j.elbowR[0] + df[0] * L('F') * sf, j.elbowR[1] + df[1] * L('F')];
      j.elbowL = [j.shoulderL[0] - du[0] * L('U') * su, j.shoulderL[1] + du[1] * L('U')];
      j.wristL = [j.elbowL[0] - df[0] * L('F') * sf, j.elbowL[1] + df[1] * L('F')];
    }
    const dt = dir(p.th), ds = dir(p.sh), ths = p.ths || 1, shs = p.shs || 1;
    j.kneeR = [j.hipR[0] + dt[0] * L('Th'), j.hipR[1] + dt[1] * L('Th') * ths];
    j.ankleR = [j.kneeR[0] + ds[0] * L('Sh'), j.kneeR[1] + ds[1] * L('Sh') * shs];
    j.kneeL = [j.hipL[0] - dt[0] * L('Th'), j.hipL[1] + dt[1] * L('Th') * ths];
    j.ankleL = [j.kneeL[0] - ds[0] * L('Sh'), j.kneeL[1] + ds[1] * L('Sh') * shs];
    return j;
  }
  function joints(spec, k) {
    const p = pose(spec, k), sc = spec.scale || 1;
    const j = spec.view === F ? frontJoints(p, sc) : sideJoints(p, sc);
    const [an, ax, ay] = spec.anchor;
    const ref = j[an];
    const off = [ax - ref[0], ay - ref[1]];
    const out = {};
    for (const key of Object.keys(j)) out[key] = [j[key][0] + off[0], j[key][1] + off[1]];
    if (spec.foot2) { // hinterer Fuß bleibt fest liegen (z. B. auf der Bank)
      [out.knee2, out.ankle2] = ik2(out.hip, spec.foot2, LEN.Th * sc, LEN.Sh * sc, spec.foot2bend || 1);
      out.toe2 = add(out.ankle2, dir(p.ft2 !== undefined ? p.ft2 : 180), LEN.Ft * sc);
    }
    out._p = p;
    return out;
  }

  // ---------- Zeichnen ----------
  const NS = 'http://www.w3.org/2000/svg';
  const X = (p) => p[0], Y = (p) => G - p[1];
  function seg(a, b, cls, w) { return '<line class="' + cls + '" x1="' + X(a).toFixed(1) + '" y1="' + Y(a).toFixed(1) + '" x2="' + X(b).toFixed(1) + '" y2="' + Y(b).toFixed(1) + '"' + (w ? ' stroke-width="' + w + '"' : '') + '/>'; }
  function propSvg(pr, j) {
    const at = pr.at ? j[pr.at] : null;
    const pt = at ? [at[0] + (pr.dx || 0), at[1] - (pr.dy || 0)] : null;
    switch (pr.k) {
      case 'line': return seg([pr.p[0], pr.p[1]], [pr.p[2], pr.p[3]], 'eq', pr.w);
      case 'plate': return '<circle class="wt" ' + (paint('wt') || '') + ' cx="' + X(pt).toFixed(1) + '" cy="' + Y(pt).toFixed(1) + '" r="12"/><circle class="hub" cx="' + X(pt).toFixed(1) + '" cy="' + Y(pt).toFixed(1) + '" r="3"/>';
      case 'db': return '<rect class="wt" ' + (paint('wt') || '') + ' x="' + (X(pt) - 9).toFixed(1) + '" y="' + (Y(pt) - 5).toFixed(1) + '" width="18" height="10" rx="2"/>';
      case 'kb': return '<circle class="wt" ' + (paint('wt') || '') + ' cx="' + X(pt).toFixed(1) + '" cy="' + (Y(pt) + 8).toFixed(1) + '" r="8"/>';
      case 'handle': return '<circle class="hub2" cx="' + X(pt).toFixed(1) + '" cy="' + Y(pt).toFixed(1) + '" r="4"/>';
      case 'bar': return seg([pt[0] - 16, pt[1] + 1], [pt[0] + 16, pt[1] + 1], 'eqd', 4);
      case 'roller': return '<circle class="eq-f" cx="' + X(pt).toFixed(1) + '" cy="' + Y(pt).toFixed(1) + '" r="6"/>';
      case 'pad': return '<rect class="eq-f" x="' + (X(pt) - 12).toFixed(1) + '" y="' + (Y(pt) - 9).toFixed(1) + '" width="24" height="6" rx="2"/>';
      case 'foot': { const d = dir(pr.ang); return seg([pt[0] - d[0] * 16, pt[1] - d[1] * 16], [pt[0] + d[0] * 16, pt[1] + d[1] * 16], 'eqd', 5); }
      case 'cable': return seg(pr.from, j.wrist, 'cable', 1.5);
      case 'cableR': return seg(pr.from, j.wristR, 'cable', 1.5);
      case 'cableL': return seg(pr.from, j.wristL, 'cable', 1.5);
      case 'barLR': { const a = j.wristL, b = j.wristR, e = pr.ext || 8; return seg([a[0] - e, a[1] + 1], [b[0] + e, b[1] + 1], 'eqd', 4); }
      case 'cableC': return seg(pr.from, mid(j.wristL, j.wristR), 'cable', 1.5);
      default: return '';
    }
  }
  // ---------- Körper: eigene Athletenfigur (Haut, Muskeln, Kleidung) ----------
  const f1 = (v) => v.toFixed(1);
  const SP = (p) => f1(X(p)) + ' ' + f1(Y(p));
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // weiche offene Linie durch Punkte (quadratisch über Mittelpunkte)
  function smoothTo(pts) {
    let d = '';
    for (let i = 1; i < pts.length - 1; i++) d += ' Q' + SP(pts[i]) + ' ' + SP(mid(pts[i], pts[i + 1]));
    d += ' L' + SP(pts[pts.length - 1]);
    return d;
  }
  // ---------- Plastischer Stil (Licht von links oben, weiche Kanten statt Konturlinien) ----------
  const BASE = { wt: '#a07a3a', skin: '#9a6446', skin2: '#74472f', top: '#ece4d2', shorts: '#2c4a37', shorts2: '#213a2b', sock: '#f3efe6', stripe: '#2c4a37', shoe: '#2a2622', shoe2: '#1d1a17', hair: '#1c1512', beard: '#1c1512', ear: '#85533a', eye: '#1c1512' };
  const LIGHT = (() => { const v = [-0.45, 0.89]; const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; })();
  let REAL = null; // { id, defs: [], n }
  function shade(hex, f) { // f > 0 heller, f < 0 dunkler
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)));
    return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }
  const STOPS = (b, cls) => {
    const lift = cls === 'top' || cls === 'sock' ? 0.35 : cls === 'hair' || cls === 'beard' || cls === 'shoe' || cls === 'shoe2' ? 0.22 : 0.2;
    const sink = cls === 'top' || cls === 'sock' ? -0.16 : -0.3;
    return '<stop offset="0" stop-color="' + shade(b, lift) + '"/><stop offset=".38" stop-color="' + b + '"/><stop offset=".78" stop-color="' + shade(b, sink * 0.65) + '"/><stop offset="1" stop-color="' + shade(b, sink) + '"/>';
  };
  function realFill(cls, A, B, rad) {
    const b = BASE[cls]; if (!b) return null;
    const id = REAL.id + 'g' + (REAL.n++);
    if (!A) { // runde Form: Radialverlauf, Glanzpunkt links oben
      REAL.defs.push('<radialGradient id="' + id + '" cx=".36" cy=".3" r=".8" fx=".32" fy=".24">' + STOPS(b, cls) + '</radialGradient>');
    } else { // Gliedmaße: Zylinder-Schattierung quer zur Achse
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6;
      let nx = -dy / L, ny = dx / L;
      if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
      const m = mid(A, B), p1 = [m[0] + nx * rad, m[1] + ny * rad], p2 = [m[0] - nx * rad, m[1] - ny * rad];
      REAL.defs.push('<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + f1(X(p1)) + '" y1="' + f1(Y(p1)) + '" x2="' + f1(X(p2)) + '" y2="' + f1(Y(p2)) + '">' + STOPS(b, cls) + '</linearGradient>');
    }
    return 'style="fill:url(#' + id + ');stroke:' + shade(b, -0.45) + ';stroke-opacity:.35;stroke-width:.5;stroke-linejoin:round"';
  }
  const paint = (cls, A, B, rad) => (REAL ? realFill(cls, A, B, rad) : null);
  // geschlossene weiche Form
  function blob(pts, cls) {
    const n = pts.length;
    let d = 'M' + SP(mid(pts[n - 1], pts[0]));
    for (let i = 0; i < n; i++) d += ' Q' + SP(pts[i]) + ' ' + SP(mid(pts[i], pts[(i + 1) % n]));
    const pf = paint(cls);
    return pf ? '<path class="' + cls + ' rl" ' + pf + ' d="' + d + 'Z"/>' : '<path class="' + cls + '" d="' + d + 'Z"/>';
  }
  // Gliedmaße mit Muskelprofil: prof = [[t, Radius], …] von A nach B, runde Enden
  function limb(A, B, prof, sc, cls, t0, t1) {
    const a0 = t0 === undefined ? 0 : t0, a1 = t1 === undefined ? 1 : t1;
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6;
    const nx = -dy / L, ny = dx / L;
    const r = (t) => { // lineare Interpolation im Profil
      for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) { const [ta, ra] = prof[i - 1], [tb, rb] = prof[i]; return (ra + (rb - ra) * (t - ta) / (tb - ta)) * sc; }
      return prof[prof.length - 1][1] * sc;
    };
    const ts = []; for (let i = 0; i <= 6; i++) ts.push(a0 + (a1 - a0) * i / 6);
    const P = (t, s) => [A[0] + dx * t + nx * r(t) * s, A[1] + dy * t + ny * r(t) * s];
    const left = ts.map((t) => P(t, 1)), right = ts.map((t) => P(t, -1)).reverse();
    const re = r(a1), rs = r(a0);
    let d = 'M' + SP(left[0]) + smoothTo(left);
    d += a1 < 1 ? ' L' + SP(right[0]) : ' A' + f1(re) + ' ' + f1(re) + ' 0 0 1 ' + SP(right[0]); // Saum: gerade Kante
    d += smoothTo(right);
    d += a0 > 0 ? ' L' + SP(left[0]) : ' A' + f1(rs) + ' ' + f1(rs) + ' 0 0 1 ' + SP(left[0]);
    const pf = paint(cls, along(A, B, a0), along(A, B, a1), Math.max(rs, re, r((a0 + a1) / 2)));
    return pf ? '<path class="' + cls + ' rl" ' + pf + ' d="' + d + 'Z"/>' : '<path class="' + cls + '" d="' + d + 'Z"/>';
  }
  const along = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  const circ = (p, r, cls) => { const pf = cls === 'eye' ? null : paint(cls); return '<circle class="' + cls + (pf ? ' rl' : '') + '" ' + (pf || '') + ' cx="' + f1(X(p)) + '" cy="' + f1(Y(p)) + '" r="' + f1(r) + '"/>'; };
  // Profile (Radius in px bei Maßstab 1)
  const PR = {
    uarm: [[0, 6.4], [0.3, 6.8], [0.62, 5.6], [1, 4.6]],
    farm: [[0, 4.7], [0.28, 5.4], [1, 3.3]],
    thigh: [[0, 9.6], [0.3, 9.2], [0.75, 7], [1, 5.8]],
    shin: [[0, 5.6], [0.3, 6.8], [0.7, 4.6], [1, 3.6]],
    neck: [[0, 4.6], [1, 4.2]],
    shoe: [[0, 4.4], [1, 3.6]]
  };
  // Lokales Koordinatensystem: Punkt = O + u*a + n*b
  const loc = (O, u, n) => (a, b) => [O[0] + u[0] * a + n[0] * b, O[1] + u[1] * a + n[1] * b];

  function arm(sh, el, wr, sc, skin) {
    const hd = dir(Math.atan2(wr[1] - el[1], wr[0] - el[0]) * 180 / Math.PI);
    return limb(sh, el, PR.uarm, sc, skin) + limb(el, wr, PR.farm, sc, skin) + circ(add(wr, hd, 2.2 * sc), 4.1 * sc, skin);
  }
  function legSide(hip, kn, an, toe, sc, far) {
    const sk = far ? 'skin2' : 'skin', sh = far ? 'shorts2' : 'shorts';
    const fdir = Math.atan2(toe[1] - an[1], toe[0] - an[0]) * 180 / Math.PI;
    const heel = add(an, dir(fdir), -4.5 * sc);
    let s = limb(hip, kn, PR.thigh, sc, sk);
    s += limb(kn, an, PR.shin, sc, sk);
    s += limb(kn, an, [[0, 6.2], [1, 4.3]], sc, 'sock', 0.62, 1);
    s += limb(kn, an, [[0, 6.3], [1, 4.4]], sc, 'stripe', 0.68, 0.74);
    s += limb(heel, toe, PR.shoe, sc, far ? 'shoe2' : 'shoe');
    s += limb(hip, kn, [[0, 11], [1, 8.6]], sc, sh, 0, 0.5);
    return s;
  }
  function headSide(Hc, hdDeg, sc, back) {
    const u = dir(hdDeg), n = dir(hdDeg - 90), L = loc(Hc, u, n), r = 9.4 * sc;
    let s = blob([L(-r * 0.95, r * 0.25), L(-r * 0.75, r * 0.85), L(-r * 0.2, r * 1.06), L(r * 0.5, r * 0.98), L(r * 0.95, r * 0.55), L(r * 1.0, -r * 0.1), L(r * 0.7, -r * 0.85), L(0, -r * 1.05), L(-r * 0.75, -r * 0.7)], 'skin');
    if (!back) {
      s += blob([L(r * 0.3, r * 0.9), L(-r * 0.12, r * 1.2), L(-r * 0.3, r * 0.92)], 'skin'); // Nase
      s += blob([L(-r * 0.95, r * 0.55), L(-r * 0.3, r * 1.02), L(-r * 0.62, r * 0.98), L(-r * 1.0, r * 0.8)], 'beard'); // Kinnbart
      s += circ(L(r * 0.22, r * 0.6), 1.1 * sc, 'eye');
      s += blob([L(r * 0.1, -r * 0.05), L(r * 0.25, -r * 0.35), L(-r * 0.15, -r * 0.4), L(-r * 0.25, -r * 0.05)], 'ear');
    }
    // Haar: kurze Locken oben/hinten, kantige Linie zur Stirn
    s += blob([L(r * 0.55, r * 0.55), L(r * 1.18, r * 0.35), L(r * 1.2, -r * 0.45), L(r * 0.75, -r * 1.12), L(-r * 0.1, -r * 1.2), L(-r * 0.3, -r * 0.75), L(r * 0.05, -r * 0.35), L(r * 0.45, r * 0.15)], 'hair');
    return s;
  }
  function torsoSide(hip, t, sc) {
    const u = dir(t), n = dir(t - 90), T = LEN.T * sc, L = loc(hip, u, n);
    const front = [[0, 8.5], [0.3, 7.8], [0.55, 9.2], [0.8, 12.6], [0.97, 8.6]];
    const backp = [[0.97, 9], [0.78, 11.6], [0.5, 9.6], [0.22, 10.6], [0, 12.4]];
    const pts = front.map(([a, b]) => L(a * T, b * sc)).concat([L(T * 1.06, 0)]).concat(backp.map(([a, b]) => L(a * T, -b * sc))).concat([L(-T * 0.1, 0)]);
    return { skin: blob(pts, 'skin'), top: blob(front.slice(0, 4).map(([a, b]) => L(a * T, (b + 0.6) * sc)).concat([L(T * 0.9, 4 * sc), L(T * 0.84, 0), L(T * 0.93, -5 * sc)]).concat(backp.slice(1).map(([a, b]) => L(a * T, -(b + 0.6) * sc))).concat([L(-T * 0.08, 0)]), 'top'), hips: blob([L(-T * 0.13, 1 * sc), L(-T * 0.04, 9.4 * sc), L(T * 0.12, 8.8 * sc), L(T * 0.2, 8.6 * sc), L(T * 0.2, -11.4 * sc), L(T * 0.08, -12.2 * sc), L(-T * 0.04, -13.2 * sc), L(-T * 0.14, -6 * sc)], 'shorts') };
  }
  function bodySide(spec, j) {
    const p = j._p, sc = spec.scale || 1;
    let s = '';
    s += arm(j.shoulder, j.elbow2, j.wrist2, sc, 'skin2');
    s += legSide(j.hip, j.knee2, j.ankle2, j.toe2, sc, true);
    const ts = torsoSide(j.hip, p.t, sc);
    s += ts.skin + ts.top + ts.hips;
    s += legSide(j.hip, j.knee, j.ankle, j.toe, sc, false);
    const hdDeg = p.hd !== undefined ? p.hd : p.t;
    s += limb(add(j.shoulder, dir(p.t), -3 * sc), add(j.head, dir(hdDeg), -6 * sc), PR.neck, sc, 'skin');
    s += headSide(j.head, hdDeg, sc, spec.back);
    s += arm(j.shoulder, j.elbow, j.wrist, sc, 'skin');
    return s;
  }
  function bodyFront(spec, j) {
    const p = j._p, sc = spec.scale || 1, back = !!spec.back;
    const u = dir(p.t), rr = dir(p.t - 90), T = LEN.T * sc * (p.ts || 1), L = loc(j.pelvis, u, rr);
    let s = '';
    // Beine
    ['R', 'L'].forEach((k) => {
      const hip = j['hip' + k], kn = j['knee' + k], an = j['ankle' + k];
      s += limb(hip, kn, PR.thigh, sc, 'skin') + limb(kn, an, PR.shin, sc, 'skin') + limb(kn, an, [[0, 6.2], [1, 4.3]], sc, 'sock', 0.62, 1) + limb(kn, an, [[0, 6.3], [1, 4.4]], sc, 'stripe', 0.68, 0.74);
      s += '<ellipse class="shoe' + (REAL ? ' rl" ' + paint('shoe') : '"') + ' cx="' + f1(X(an) + (k === 'R' ? 2 : -2)) + '" cy="' + f1(Y(an) + 2) + '" rx="' + f1(6.5 * sc) + '" ry="' + f1(3.6 * sc) + '"/>';
      s += limb(hip, kn, [[0, 11], [1, 8.8]], sc, 'shorts', 0, 0.5);
    });
    // Rumpf
    const side = [[-0.06, 12.5], [0.25, 11.6], [0.5, 12.6], [0.78, 16.5], [0.97, 19.5]];
    const skin = side.map(([a, b]) => L(a * T, b * sc)).concat([L(T * 1.07, 9 * sc), L(T * 1.1, 0), L(T * 1.07, -9 * sc)]).concat(side.slice().reverse().map(([a, b]) => L(a * T, -b * sc)));
    s += blob(skin, 'skin');
    const topSide = [[-0.04, 13.1], [0.3, 12.3], [0.6, 13.6], [0.82, 14], [0.98, 8]];
    s += blob(topSide.map(([a, b]) => L(a * T, b * sc)).concat([L(T * (back ? 0.98 : 0.84), 0)]).concat(topSide.slice().reverse().map(([a, b]) => L(a * T, -b * sc))), 'top');
    s += blob([L(-T * 0.14, 13.4 * sc), L(T * 0.1, 13.4 * sc), L(T * 0.1, -13.4 * sc), L(-T * 0.14, -13.4 * sc), L(-T * 0.22, 0)], 'shorts');
    // Hals + Kopf
    s += limb(L(T * 0.95, 0), add(j.head, u, -6 * sc), PR.neck, sc, 'skin');
    const H = loc(j.head, u, rr), r = 9.4 * sc;
    s += blob([H(-r * 1.05, 0), H(-r * 0.7, r * 0.75), H(0, r * 0.95), H(r * 0.7, r * 0.85), H(r * 0.95, 0), H(r * 0.7, -r * 0.85), H(0, -r * 0.95), H(-r * 0.7, -r * 0.75)], 'skin');
    s += circ(H(r * 0.05, r * 0.98), 2.1 * sc, 'ear') + circ(H(r * 0.05, -r * 0.98), 2.1 * sc, 'ear');
    if (!back) {
      s += circ(H(r * 0.15, r * 0.35), 1.1 * sc, 'eye') + circ(H(r * 0.15, -r * 0.35), 1.1 * sc, 'eye');
      s += blob([H(-r * 0.55, r * 0.75), H(-r * 0.25, r * 0.85), H(-r * 0.15, 0), H(-r * 0.25, -r * 0.85), H(-r * 0.55, -r * 0.75), H(-r * 1.02, 0)], 'beard');
    }
    s += blob(back ? [H(r * 1.15, 0), H(r * 0.85, r * 0.98), H(-r * 0.2, r * 1.0), H(-r * 0.7, r * 0.6), H(-r * 0.6, -r * 0.6), H(-r * 0.2, -r * 1.0), H(r * 0.85, -r * 0.98)]
      : [H(r * 1.15, 0), H(r * 0.85, r * 0.98), H(r * 0.4, r * 1.02), H(r * 0.42, r * 0.5), H(r * 0.48, 0), H(r * 0.42, -r * 0.5), H(r * 0.4, -r * 1.02), H(r * 0.85, -r * 0.98)], 'hair');
    // Arme zuletzt (vor dem Körper)
    s += arm(j.shoulderR, j.elbowR, j.wristR, sc, 'skin') + arm(j.shoulderL, j.elbowL, j.wristL, sc, 'skin');
    return s;
  }
  function figureSvg(spec, j) {
    let shadow = '';
    const feet = spec.view === F ? [j.ankleR, j.ankleL] : [j.ankle, j.ankle2, j.toe];
    const low = feet.filter((q) => q[1] < 10);
    if (low.length) {
      const cx = low.reduce((a, q) => a + q[0], 0) / low.length;
      if (REAL) { const id = REAL.id + 'sh'; REAL.defs.push('<radialGradient id="' + id + '"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".55" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'); shadow = '<ellipse fill="url(#' + id + ')" cx="' + f1(cx) + '" cy="' + f1(G - 0.5) + '" rx="34" ry="5"/>'; }
      else shadow = '<ellipse class="shadow" cx="' + f1(cx) + '" cy="' + f1(G - 1) + '" rx="26" ry="3.2"/>';
    }
    return shadow + (spec.view === F ? bodyFront(spec, j) : bodySide(spec, j));
  }
  function frame(spec, k) {
    const j = joints(spec, k);
    const back = (spec.props || []).filter((p) => p.k === 'line' || p.k === 'cable' || p.k === 'cableR' || p.k === 'cableL' || p.k === 'cableC').map((p) => propSvg(p, j)).join('');
    const front = (spec.props || []).filter((p) => !(p.k === 'line' || p.k === 'cable' || p.k === 'cableR' || p.k === 'cableL' || p.k === 'cableC')).map((p) => propSvg(p, j)).join('');
    return '<line class="floor" x1="0" y1="' + G + '" x2="' + W + '" y2="' + G + '"/>' + back + figureSvg(spec, j) + front;
  }
  // Bewegungszyklus: Start halten → Bewegung → oben halten → zurück (exzentrisch langsamer)
  function phaseK(t) {
    const c = t % 3.2; // Sekunden
    const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
    if (c < 0.35) return 0;
    if (c < 1.25) return ease((c - 0.35) / 0.9);
    if (c < 1.6) return 1;
    if (c < 3.0) return 1 - ease((c - 1.6) / 1.4);
    return 0;
  }
  // Variante einer Bewegung für einen Bibliothekseintrag (anderes Gewicht, Zusatzgewicht am Gürtel)
  function forEntry(e) {
    if (!e || !SPECS[e.anim]) return null;
    const base = SPECS[e.anim];
    if (!e.animProps && !e.animExtra) return base;
    const weights = ['plate', 'db', 'kb', 'handle'];
    let props = base.props.map((p) => (e.animProps && weights.indexOf(p.k) >= 0 ? Object.assign({}, p, { k: e.animProps }) : p));
    if (e.animExtra === 'kbHip') props = props.concat([{ k: 'kb', at: base.view === F ? 'pelvis' : 'hip', dy: base.view === F ? -6 : 10 }]);
    return Object.assign({}, base, { props });
  }
  const getSpec = (s) => (typeof s === 'string' ? SPECS[s] : s);
  let realSeq = 0;
  // Quadratischer Bildausschnitt, mittig auf die Figur (für runde Vorschaubilder)
  function fitBox(spec, k, pad) {
    const j = joints(spec, k); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const key of Object.keys(j)) {
      const p = j[key]; if (key === '_p' || !p || !isFinite(p[0]) || !isFinite(p[1])) continue;
      const sy = G - p[1]; // Gelenke liegen mit y nach oben vor, das Bild mit y nach unten
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const s = Math.max(x1 - x0, y1 - y0) + 2 * (pad === undefined ? 16 : pad), r = (v) => Math.round(v * 10) / 10;
    return [r((x0 + x1) / 2 - s / 2), r((y0 + y1) / 2 - s / 2), r(s), r(s)];
  }
  function svg(specKey, k, cls, opts) {
    const spec = getSpec(specKey);
    if (!spec) return '';
    if (opts && opts.fit) return '<svg class="' + (cls || 'fig') + '" viewBox="' + fitBox(spec, k === undefined ? 0 : k, opts.pad).join(' ') + '" aria-hidden="true">' + frame(spec, k === undefined ? 0 : k) + '</svg>';
    if (opts && opts.real) {
      REAL = { id: 'h' + (++realSeq).toString(36) + '-', defs: [], n: 0 };
      let body;
      try { body = frame(spec, k === undefined ? 0 : k); } finally { var defs = REAL.defs.join(''); REAL = null; }
      return '<svg class="' + (cls || 'fig') + ' real" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bewegungsablauf"><defs>' + defs + '</defs>' + body + '</svg>';
    }
    return '<svg class="' + (cls || 'fig') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bewegungsablauf">' + frame(spec, k === undefined ? 0 : k) + '</svg>';
  }
  // Animation in einem Element starten; gibt eine Stopp-Funktion zurück
  function play(el, specKey, opts) {
    const spec = getSpec(specKey);
    if (!spec || !el) return () => {};
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = svg(specKey, 0);
    const g = el.querySelector('svg');
    let raf = 0, t0 = null, stopped = false;
    let last = -1;
    const step = (ts) => {
      if (stopped) return;
      if (t0 === null) t0 = ts;
      if (ts - last < 32) { raf = requestAnimationFrame(step); return; } // ~30 Bilder/s schonen den Akku
      last = ts;
      const k = (opts && opts.k !== undefined) ? opts.k : phaseK((ts - t0) / 1000);
      g.innerHTML = frame(spec, k);
      g.dataset.k = k.toFixed(3);
      raf = requestAnimationFrame(step);
    };
    if (reduce) { g.innerHTML = frame(spec, 1); } else raf = requestAnimationFrame(step);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }
  return { SPECS, svg, fitBox, play, joints, phaseK, forEntry, note: (k) => (SPECS[k] && SPECS[k].note) || '' };
});
