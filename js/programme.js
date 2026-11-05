/* Simplicity Living — Waiatarua construction programme.
 *
 * This used to synthesise a programme from a handful of rate assumptions. It no longer
 * does. Everything here is read from assets/4d/plan.json, which tools/build_4d_plan.mjs
 * produces by running the Nezo 4D Optimiser's own generator and resource-constrained
 * scheduler over the SketchUp model: 1,426 activities, twelve pour zones, four tower
 * cranes and two boom pumps, with the buildings genuinely overlapping rather than one
 * starting as the last one finishes.
 *
 * Both scenarios come from the same network and the same solver. The industry baseline
 * differs only in method and crew numbers — conventional formwork and propped timber
 * decks instead of StackCell and Traydec, and roughly half the crews. Those are stated
 * assumptions, not measurements.
 *
 * Working days, five per week, with the project's Christmas shutdowns already removed
 * from the calendar.
 */
(function (global) {
  'use strict';

  // Programme rows, in the planner's own activity groups.
  const PHASES = [
    { key: 'site',          name: 'Site, piling & earthworks',   color: '#8d6e63' },
    { key: 'structure',     name: 'Structure — walls & floors',  color: '#ff6600' },
    { key: 'facade',        name: 'Envelope — cladding, windows & roof', color: '#2196F3' },
    { key: 'services',      name: 'Services rough-in',           color: '#f5a623' },
    { key: 'fitout',        name: 'Framing, linings & finishes', color: '#4CAF50' },
    { key: 'commissioning', name: 'Commissioning & handover',    color: '#607D8B' }
  ];

  // Four categories for the weekly activity profile, mapped from the planner's groups.
  const PROFILE = [
    { key: 'ground',   name: 'Groundworks',                from: ['site'] },
    { key: 'core',     name: 'Core structure',             from: ['structure'] },
    { key: 'envelope', name: 'Envelope',                   from: ['facade'] },
    { key: 'fitout',   name: 'Internal fit-out & services', from: ['services', 'fitout', 'commissioning'] }
  ];

  const BUILDINGS = ['A', 'B', 'C', 'D'];

  let plan = null;

  /* Collapse 1,426 activities into the per-phase, per-building bars the Gantt draws, and
   * into a weekly intensity profile. One pass over the activities per scenario. */
  function digest(scenario) {
    const sc = plan[scenario];
    const acts = plan.activities;
    const start = sc.start;
    const days = sc.makespan;
    const weeks = Math.ceil(days / 5);

    const phases = PHASES.map((p) => ({
      key: p.key, name: p.name, color: p.color,
      start: Infinity, end: -Infinity,
      segs: BUILDINGS.map((b) => ({ label: b, start: Infinity, end: -Infinity }))
    }));
    const byKey = Object.fromEntries(phases.map((p) => [p.key, p]));

    // Weekly crew-days per profile category — the real measure of how busy the site is.
    const series = {};
    PROFILE.forEach((c) => { series[c.key] = new Array(weeks + 1).fill(0); });
    const catOf = {};
    PROFILE.forEach((c) => c.from.forEach((g) => { catOf[g] = c.key; }));

    for (let id = 0; id < acts.length; id++) {
      const a = acts[id];
      if (a.m) continue;                       // milestones have no duration
      const s = start[id], e = s + a.d;
      const ph = byKey[a.g];
      if (ph) {
        ph.start = Math.min(ph.start, s);
        ph.end = Math.max(ph.end, e);
        const bi = BUILDINGS.indexOf(a.z);
        if (bi >= 0) {
          ph.segs[bi].start = Math.min(ph.segs[bi].start, s);
          ph.segs[bi].end = Math.max(ph.segs[bi].end, e);
        }
      }
      const cat = catOf[a.g];
      if (cat) {
        for (let d = s; d < e; d++) {
          const w = Math.floor(d / 5);
          if (w >= 0 && w <= weeks) series[cat][w] += 1;
        }
      }
    }

    phases.forEach((p) => {
      if (!isFinite(p.start)) { p.start = 0; p.end = 0; }
      p.segs = p.segs.filter((s) => isFinite(s.start));
    });

    // Normalise the profile to a 0–100 intensity so the two scenarios are comparable
    // against the same axis; the peak of the busier scenario sets the scale.
    return { days, weeks, phases, series, start, critical: sc.critical };
  }

  function load(json) {
    plan = json;
    const simplicity = digest('simplicity');
    const baseline = digest('baseline');

    // Shared scale for the activity profile.
    let peak = 0;
    [simplicity, baseline].forEach((p) => PROFILE.forEach((c) => {
      p.series[c.key].forEach((v) => { if (v > peak) peak = v; });
    }));
    const k = peak > 0 ? 100 / peak : 1;
    [simplicity, baseline].forEach((p) => PROFILE.forEach((c) => {
      p.series[c.key] = p.series[c.key].map((v) => v * k);
    }));

    global.SimplicityProgramme = Object.assign(global.SimplicityProgramme || {}, {
      PHASES, PROFILE, BUILDINGS,
      plan,
      simplicity, baseline,
      span: Math.max(simplicity.weeks, baseline.weeks),
      days: Math.max(simplicity.days, baseline.days),
      // Working-day index -> calendar date, for the date readout.
      dateOf(day) {
        const d = plan.dates[Math.max(0, Math.min(day, plan.dates.length - 1))];
        return d ? new Date(d + 'T00:00:00Z') : null;
      },
      ready: true
    });
    global.dispatchEvent(new Event('simplicity-programme-ready'));
    return global.SimplicityProgramme;
  }

  global.SimplicityProgramme = { PHASES, PROFILE, BUILDINGS, ready: false, load };
})(window);
