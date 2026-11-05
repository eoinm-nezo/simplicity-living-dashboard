/* Precompute the Waiatarua 4D programme for the Simplicity dashboard.
 *
 * The dashboard is a viewer, not a planner, so the resource-constrained schedule is
 * solved once here and shipped as static JSON. The project generator and the optimiser
 * are the Nezo 4D Optimiser's own modules, imported straight from that repo rather than
 * reimplemented — so the sequence the dashboard plays back is the planner's sequence,
 * overlapping buildings and all.
 *
 *   node tools/build_4d_plan.mjs
 *
 * Writes assets/4d/plan.json (Simplicity programme) and the industry-baseline variant.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FOURD = 'G:/.shortcut-targets-by-id/16rPMdPDRyG8h3sBcE4x5jcixZkQIgnGa/VQUEST TEAM DRIVE/' +
              '08. SOFTWARE DEVELOPMENT/26. 4D/app/js/';
const OUT = 'assets/4d/';

const imp = (f) => import(pathToFileURL(path.join(FOURD, f)).href);
const { generateAscot, ASCOT_CONFIG } = await imp('ascot.js');
const { buildInstance, optimise, analyse } = await imp('engine.js');
const { GROUPS } = await imp('project.js');

const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8'));

/* Solve one scenario and return the plan the viewer needs.
 *
 * `capacity` overrides crew and plant limits; `slower` stretches the durations of the
 * activities whose speed is a property of the build method rather than of the crew.
 * Cranes are never taken away — activities require a specific crane by id, so a zero
 * capacity makes the network infeasible rather than slow. */
function solve(label, { capacity, slower } = {}, timeMs) {
  const project = generateAscot(meta, ASCOT_CONFIG);
  if (slower) {
    for (const a of project.activities) {
      const k = slower[a.phase] || (/wall pour|slab pour/.test(a.name) ? slower.pour : 0);
      if (k) a.dur = Math.max(1, Math.round(a.dur * k));
    }
  }
  // A capacity below what one activity asks for makes the network unschedulable rather
  // than slow, and the optimiser can only report "infeasible" — so name the culprit here.
  if (capacity) {
    for (const a of project.activities) {
      for (const [res, q] of Object.entries(a.req)) {
        if (capacity[res] != null && q > capacity[res]) {
          throw new Error(`${label}: ${res} capped at ${capacity[res]} but "${a.name}" needs ${q}`);
        }
      }
    }
  }
  const inst = buildInstance(project, { edits: [], capacity: capacity || {} });
  const r = optimise(inst, { timeMs, seed: 20260205 });
  if (!r.feasible) throw new Error(label + ': no feasible plan (horizon or precedence)');
  const a = analyse(inst, r.start);
  console.log(`${label.padEnd(18)} makespan ${a.makespan} working days ` +
              `(~${Math.ceil(a.makespan / 5)} weeks)  lb ${r.lb.lb}  ${Math.round(r.ms)} ms`);
  return { project, start: Array.from(r.start), critical: Array.from(a.critical), makespan: a.makespan };
}

const simplicity = solve('Simplicity', {}, 6000);

// Industry baseline: the same scope, the same logic and the same four cranes, but
// conventional methods and thinner crews — loose formwork and propped timber decks in
// place of StackCell walls and Traydec, and roughly half the crew numbers. Both the
// slower cycle and the thinner resourcing are assumptions, and are labelled as such
// wherever the comparison is shown.
const baseline = solve('Industry baseline', {
  capacity: {
    PUMP: 1, PILE: 1, EW: 2, FDN: 2, SC: 2, DECK: 1, REO: 2, CON: 1,
    WIN: 2, FAC: 2, ROOF: 1, SRV: 3, LIN: 3, FIN: 3, COM: 2, SITE: 30
  },
  slower: { stackcell: 1.9, deck: 1.6, pour: 1.0 }
}, 6000);

// ---------------------------------------------------------------- trim for the browser
const P = simplicity.project;
const craneIds = P.resources.filter((r) => r.kind === 'crane').map((r) => r.id);
const pumpIds = P.resources.filter((r) => r.kind === 'pump').map((r) => r.id);

const activities = P.activities.map((a) => {
  const o = { n: a.name, g: a.grp, d: a.dur };
  if (a.cells && a.cells.length) o.c = a.cells;
  if (a.zoneId) o.zi = a.zoneId;
  if (a.zone) o.z = a.zone;
  if (a.pourLevel != null) o.pl = a.pourLevel;
  if (a.phase) o.ph = a.phase;
  if (a.milestone) o.m = 1;
  const cr = craneIds.find((id) => a.req[id]);
  if (cr) o.cr = cr;
  if (pumpIds.some((id) => a.req[id])) o.pu = 1;
  return o;
});

const plan = {
  source: 'Nezo 4D Optimiser — app/js/{ascot,meshproject,engine}.js, solved offline',
  project: P.config.name,
  startDate: P.config.startDate,
  dates: P.calendar.dates.slice(0, Math.max(simplicity.makespan, baseline.makespan) + 2),
  shutdown: Array.from(P.calendar.shutdown.slice(0, Math.max(simplicity.makespan, baseline.makespan) + 2)),
  groups: Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, v.label])),
  cranes: P.view.cranes,
  pumpSide: P.view.pumpSide,
  cameraDir: P.view.cameraDir,
  activities,
  simplicity: { start: simplicity.start, critical: simplicity.critical, makespan: simplicity.makespan },
  baseline: { start: baseline.start, critical: baseline.critical, makespan: baseline.makespan }
};

fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plan));
const kb = (fs.statSync(path.join(OUT, 'plan.json')).size / 1024).toFixed(0);
console.log(`\nassets/4d/plan.json  ${activities.length} activities, ${kb} KB`);
console.log(`Simplicity ${simplicity.makespan} d vs baseline ${baseline.makespan} d ` +
            `— ${baseline.makespan - simplicity.makespan} days (${Math.round((1 - simplicity.makespan / baseline.makespan) * 100)}%) shorter`);
