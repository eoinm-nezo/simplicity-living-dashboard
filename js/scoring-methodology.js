// Simplicity Living Benchmark — v0.2 methodology + rule engine
// =====================================================================================
// Encodes the seven modules, their criteria and scoring rules from the methodology
// record "V2 - Simplicity-Living-Benchmark-Methodology.md".
//
// KEY RULE (V2 §4.1): scores are calculated UPWARD from per-criterion measured evidence.
// Never enter a module total and distribute it. Each criterion is assessed on its own
// measured value/items; module score = sum of criterion points. "Not assessed" is not
// zero performance — it is unknown, and is tracked as pending evidence coverage.
//
// This is a PILOT methodology (status: proposed). Numeric thresholds are calibration
// candidates, not asserted industry norms or compliance limits. No external-rating
// language, logos, star equivalents or credit codes.
// =====================================================================================

const BENCHMARK_VERSION = '0.2 (pilot)';

// Neutral progress bands: points -> label. (V2 §3 display rules.)
const BENCHMARK_BANDS = [
    { min: 20, label: 'Target achieved' },
    { min: 16, label: 'Close to target' },
    { min: 12, label: 'Substantial progress' },
    { min: 8,  label: 'Building progress' },
    { min: 0,  label: 'Early progress' }
];
function benchmarkBand(points) {
    return (BENCHMARK_BANDS.find(b => points >= b.min) || BENCHMARK_BANDS[BENCHMARK_BANDS.length - 1]).label;
}

// Assessment stages (V2 §4.2). Used at the assessment level.
const BENCHMARK_STAGES = [
    { id: 'forecast',  name: 'Design forecast' },
    { id: 'completed', name: 'Completed building' },
    { id: 'inuse',     name: 'In use' }
];

// Helper: "1 point per threshold crossed" ladder.
// dir 'up'  -> higher value is better (reductions, coverage): point for each value >= t
// dir 'down'-> lower value is better (demand, kg/m², distance, interval): point for value <= t
function _ladderPoints(value, thresholds, dir) {
    const v = parseFloat(value);
    if (!isFinite(v)) return { pts: 0, next: thresholds[0] };
    let pts = 0;
    if (dir === 'down') { thresholds.forEach(t => { if (v <= t) pts++; }); }
    else                { thresholds.forEach(t => { if (v >= t) pts++; }); }
    const next = dir === 'down' ? (thresholds.find(t => v > t) ?? null)
                                : (thresholds.find(t => v < t) ?? null);
    return { pts, next };
}

// =====================================================================================
//  The seven modules. module.col maps to the shared DB column so computed module scores
//  keep the comparison charts working; per-criterion inputs live in answers_json.
// =====================================================================================
const BENCHMARK_MODULES = [
    {
        id: 'energy', col: 'energy', name: 'Energy to Live', icon: 'energy', color: '#ff6600', max: 20,
        question: 'How much energy does it take to run these homes and their shared services?',
        intent: 'Reduce the energy needed for a comfortable home. No separate points for buying a particular technology, fitting PV, or a brochure COP rating. Efficiency is scored before PV.',
        criteria: [
            { id: 'home_energy', name: 'Home energy (excl. hot water)', max: 8, type: 'ladder', dir: 'up', unit: '%', metric: 'Reduction vs matched reference',
              how: '1 point at each of 5, 10, 15, 20, 25, 30, 35, 40% reduction vs the matched reference. Below 5% earns nothing.',
              thresholds: [5,10,15,20,25,30,35,40],
              evidence: 'Project and reference model files, input comparison and annual end-use outputs.' },
            { id: 'hot_water', name: 'Hot-water energy', max: 6, type: 'ladder', dir: 'up', unit: '%', metric: 'Reduction vs resistance-cylinder reference',
              how: '1 point at each of 10, 20, 30, 40, 50, 60% reduction vs a frozen resistance-cylinder reference.',
              thresholds: [10,20,30,40,50,60],
              evidence: 'Annual system calculation (storage, distribution, circulation, pumps, backup); installed equipment and controls.' },
            { id: 'shared_services', name: 'Shared-services energy', max: 4, type: 'ladder', dir: 'up', unit: '%', metric: 'Reduction vs common-services reference',
              how: '1 point at each of 10, 20, 30, 40% reduction in annual common-services energy.',
              thresholds: [10,20,30,40],
              evidence: 'Lighting, lift, ventilation and pumping calculations, schedules and controls commissioning.' },
            { id: 'energy_visibility', name: 'Energy visibility', max: 2, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Separate apartment and common-service meters with usable resident/manager access' },
                { pts: 1, label: 'Working hot-water energy monitoring with a named review responsibility' }
              ],
              evidence: 'Meter schematic, access demonstration and handover/monitoring procedure.' }
        ]
    },
    {
        id: 'comfort', col: 'ieq', name: 'Comfort at Home', icon: 'comfort', color: '#E0A800', max: 20,
        question: 'Can residents keep warm, avoid excessive heat, and have fresh, dry indoor air?',
        intent: 'Homes that are easy to keep warm, do not overheat, and have effective ventilation and moisture control. Assessed on the credible worst-case apartment group, not a building average.',
        criteria: [
            { id: 'keep_warm', name: 'Easy to keep warm', max: 6, type: 'ladder', dir: 'up', unit: '%', metric: 'Heating-demand reduction vs envelope reference',
              how: '1 point at each of 5, 10, 15, 20, 25, 30% useful heating-demand reduction. Award the lowest band achieved across all assessed apartment groups.',
              thresholds: [5,10,15,20,25,30],
              evidence: 'Thermal model, apartment-group map, heat-loss checks and as-built envelope evidence.' },
            { id: 'excess_heat', name: 'Avoiding excessive heat', max: 6, type: 'levels',
              how: 'Highest level achieved (no intermediate bands). Based on the bespoke pilot overheating test, current and future climate.',
              levels: [
                { pts: 0, label: 'Current-climate comfort test fails' },
                { pts: 2, label: 'All groups pass with the installed cooling strategy' },
                { pts: 4, label: 'All pass with compressor cooling off (feasible shading, windows, fans)' },
                { pts: 6, label: 'Passive/fan case also passes the frozen future-climate test' }
              ],
              evidence: 'Dynamic room-level outputs, current/future weather files, opening constraints, control and shading details.' },
            { id: 'fresh_air', name: 'Fresh air', max: 4, type: 'levels',
              how: 'Progressive ladder. Each level adds a requirement on top of the one below.',
              levels: [
                { pts: 0, label: 'No substantiated design' },
                { pts: 1, label: 'Room-by-room air supply/extract design' },
                { pts: 2, label: '+ demonstrated transfer paths and acoustic/pressure feasibility' },
                { pts: 3, label: '+ commissioning of every apartment and rectification of failures' },
                { pts: 4, label: '+ successful occupied verification in the defined sample' }
              ],
              evidence: 'Airflow calculations, commissioning sheets, instrument records and occupied monitoring.' },
            { id: 'dry_interiors', name: 'Dry interiors', max: 4, type: 'levels',
              how: 'Progressive ladder. Each level adds a requirement on top of the one below.',
              levels: [
                { pts: 0, label: 'No substantiated review' },
                { pts: 1, label: 'Junction / condensation risk register' },
                { pts: 2, label: '+ calculations showing critical details meet the moisture protocol' },
                { pts: 3, label: '+ installation inspections and rectified defects' },
                { pts: 4, label: '+ successful occupied verification in the defined sample' }
              ],
              evidence: 'Hygrothermal / thermal-bridge assessment, inspection photos, moisture records and defect closeout.' }
        ]
    },
    {
        id: 'carbon', col: 'carbon', name: 'Carbon to Build', icon: 'carbon', color: '#795548', max: 20,
        question: 'How much carbon is emitted to build and maintain the building?',
        intent: 'Reward measured emissions reductions against a credible frozen reference, not simply commissioning an assessment or describing a structure as efficient.',
        criteria: [
            { id: 'upfront', name: 'Upfront emissions (A1–A5)', max: 12, type: 'ladder', dir: 'up', unit: '%', metric: 'Reduction vs frozen reference',
              how: '1 point for each complete 2.5% reduction vs the frozen reference, up to 12 points at 30%.',
              thresholds: [2.5,5,7.5,10,12.5,15,17.5,20,22.5,25,27.5,30],
              evidence: 'Quantity-based A1–A5 assessment, reference model, factor sources and uncertainty review.' },
            { id: 'later_life', name: 'Later-life embodied (B–C)', max: 6, type: 'ladder', dir: 'up', unit: '%', metric: 'Reduction vs reference',
              how: '1 point at each of 5, 10, 15, 20, 25, 30% reduction in B1–B5 plus C1–C4 emissions.',
              thresholds: [5,10,15,20,25,30],
              evidence: 'Same study period / service life for project and reference; replacement, maintenance and end-of-life scenarios.' },
            { id: 'delivery_verification', name: 'Delivery verification', max: 2, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Procurement records linked to the assessed products and quantities' },
                { pts: 1, label: 'Updated as-built assessment with substitutions reconciled and a second-person check' }
              ],
              evidence: 'Orders / delivery records, change register and checked final assessment.' }
        ]
    },
    {
        id: 'materials', col: 'site', name: 'Materials that Matter', icon: 'materials', color: '#4CAF50', max: 20,
        question: 'Are products traceable, responsibly sourced and practical to maintain?',
        intent: 'Reward responsible purchasing, lower-emission interiors and maintainable products. Coverage is qualifying installed product value over all eligible value (material supply cost, excl. labour).',
        criteria: [
            { id: 'responsible_sourcing', name: 'Responsible sourcing', max: 6, type: 'ladder', dir: 'up', unit: '%', metric: 'Qualifying coverage',
              how: 'Qualifying coverage: 1 point at 50%, then 60, 70, 80, 90, 95%.',
              thresholds: [50,60,70,80,90,95],
              evidence: 'Eligible product register; product-specific chain-of-custody / sourcing / certification evidence; orders.' },
            { id: 'lower_emission_finishes', name: 'Lower-emission finishes', max: 6, type: 'ladder', dir: 'up', unit: '%', metric: 'Qualifying coverage',
              how: 'Qualifying coverage: 1 point at 50%, then 60, 70, 80, 90, 95%.',
              thresholds: [50,60,70,80,90,95],
              evidence: 'Installed finishes schedule and relevant emission-test / product evidence.' },
            { id: 'repairability', name: 'Repairable & replaceable', max: 6, type: 'ladder', dir: 'up', unit: '%', metric: 'Qualifying coverage',
              how: 'Qualifying coverage: 1 point at 50%, then 60, 70, 80, 90, 95%.',
              thresholds: [50,60,70,80,90,95],
              evidence: 'Component register, access drawings, replacement method, parts/support evidence and maintenance instructions.' },
            { id: 'environmental_data', name: 'Environmental data (EPDs)', max: 2, type: 'ladder', dir: 'up', unit: '%', metric: 'Eligible coverage with verified EPDs',
              how: '1 point at 60% eligible coverage with applicable verified EPDs; 2 points at 90%.',
              thresholds: [60,90],
              evidence: 'Valid EPD register matched to supplier/product and declared scope.' }
        ]
    },
    {
        id: 'water', col: 'water', name: 'Water to Live', icon: 'water', color: '#2196F3', max: 20,
        question: 'How much drinking water is needed, and how quickly can waste be found?',
        intent: 'Low standardised potable demand, visible use and effective leak response. No compulsory rainwater system; efficient fittings can reach full marks if the calibrated target is met.',
        criteria: [
            { id: 'water_demand', name: 'Modelled drinking-water demand', max: 12, type: 'ladder', dir: 'down', unit: ' L/p/day', metric: 'Modelled demand',
              how: '1 point at ≤140 L/person/day, then one more point for each 5 L reduction down to 12 points at ≤85.',
              thresholds: [140,135,130,125,120,115,110,105,100,95,90,85],
              evidence: 'Standard demand calculation, installed flow/flush volumes, appliance data and any reuse balance.' },
            { id: 'leak_management', name: 'Leak management', max: 4, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Accessible, labelled apartment isolation' },
                { pts: 1, label: 'Monitored common supplies / plant' },
                { pts: 1, label: 'Apartment leak alerts or automated abnormal-use detection' },
                { pts: 1, label: 'Tested alerts with a documented response owner and timeframe' }
              ],
              evidence: 'Drawings, installed devices, alarm tests and operating procedure.' },
            { id: 'water_visibility', name: 'Water visibility', max: 4, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Individual apartment meters' },
                { pts: 1, label: 'Separate common-use measurement' },
                { pts: 1, label: 'Usable consumption access for residents and manager' },
                { pts: 1, label: 'Verified readings and a monthly review process in operation' }
              ],
              evidence: 'Meter records, interface demonstration, commissioning and first review record.' }
        ]
    },
    {
        id: 'waste', col: 'waste', name: 'Waste on Site', icon: 'recycle', color: '#009688', max: 20,
        question: 'How much construction waste is created, and where does it go?',
        intent: 'Prevent waste first, then reuse and recycle, proven by measured mass and verified destinations. No scored conversion from skips or a generic "waste depth".',
        criteria: [
            { id: 'total_waste', name: 'Total construction waste', max: 10, type: 'ladder', dir: 'down', unit: ' kg/m²', metric: 'Waste per m² of construction GFA',
              how: 'kg/m²: 1 point at ≤40, then ≤36, ≤32, ≤28, ≤24, ≤20, ≤16, ≤12, ≤8, 10 points at ≤5.',
              thresholds: [40,36,32,28,24,20,16,12,8,5],
              evidence: 'Waste mass ledger (recycled and landfilled), site records and measured area.' },
            { id: 'reuse_recycling', name: 'Reuse & recycling', max: 8, type: 'ladder', dir: 'up', unit: '%', metric: 'Verified diversion by mass',
              how: 'Verified proportion by mass: 1 point at 50%, then 60, 70, 75, 80, 85, 90, 95%.',
              thresholds: [50,60,70,75,80,85,90,95],
              evidence: 'Destination records, recovery evidence and residual fractions for mixed loads.' },
            { id: 'waste_traceability', name: 'Traceability', max: 2, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Complete reconciled monthly mass ledger' },
                { pts: 1, label: 'Downstream recovery checks and a final closeout review' }
              ],
              evidence: 'Dockets, facility reports and signed reconciliation.' }
        ]
    },
    {
        id: 'transport', col: 'innovation', name: 'Getting Around', icon: 'transport', color: '#9C27B0', max: 20,
        question: 'How practical is everyday life without relying on a private car?',
        intent: 'Frequent, accessible transport, nearby daily needs, usable cycling and working shared/electric mobility. Measured along real walking routes, not circles on a map.',
        criteria: [
            { id: 'public_transport', name: 'Usable public transport', max: 8, type: 'transportPT',
              how: 'Two scores added. Walking distance: ≤800 m=1, ≤600=2, ≤400=3, ≤250 m=4. Daytime interval: ≤60 min=1, ≤30=2, ≤20=3, ≤15=4. If either is zero, the whole criterion is zero.',
              distanceThresholds: [800,600,400,250], serviceThresholds: [60,30,20,15],
              evidence: 'Dated route map, crossings/access review and operating timetable.' },
            { id: 'everyday_destinations', name: 'Everyday destinations', max: 6, type: 'count',
              how: '1 point per qualifying distinct category within an 800 m usable walking route (groceries, pharmacy, primary healthcare, park/recreation, childcare/school, community/library). Maximum 6.',
              categories: ['Groceries','Pharmacy','Primary healthcare','Park / recreation','Childcare / school','Community / library'],
              evidence: 'Dated routes and confirmation of operating destinations.' },
            { id: 'cycling', name: 'Useful cycling provision', max: 4, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Secure covered spaces ≥1 per apartment' },
                { pts: 1, label: 'Capacity ≥1 per bedroom' },
                { pts: 1, label: 'Step-free access plus ≥10% oversize spaces for cargo/adapted bikes' },
                { pts: 1, label: 'Low-stress connection to a connected cycle network within 300 m' }
              ],
              evidence: 'Plans, capacity checks, access inspection and route review.' },
            { id: 'shared_electric_mobility', name: 'Shared / electric mobility', max: 2, type: 'additive',
              how: 'Additive. 1 point for each item delivered.',
              items: [
                { pts: 1, label: 'Operating car-share with a reservable vehicle within 400 m' },
                { pts: 1, label: 'Resident EV charging (≥5% of spaces) plus capacity/conduit for the rest' }
              ],
              evidence: 'Service agreement/availability, installed chargers and electrical capacity plan.' }
        ]
    }
];

function benchmarkModule(id) { return BENCHMARK_MODULES.find(m => m.id === id) || null; }
function benchmarkModuleByCol(col) { return BENCHMARK_MODULES.find(m => m.col === col) || null; }

// =====================================================================================
//  Rule engine: score one criterion from its stored input data.
//  data shapes:  ladder -> {value}   additive -> {items:[bool]}   levels -> {level}
//                count -> {count}     transportPT -> {distance, interval}
//                any -> {notAssessed:true}
//  Returns a rich object for both scoring and display.
// =====================================================================================
function scoreCriterion(crit, data) {
    data = data || {};
    const r = { id: crit.id, name: crit.name, max: crit.max, type: crit.type,
                points: 0, assessed: false, next: null };
    if (data.notAssessed) return r;

    switch (crit.type) {
        case 'ladder': {
            if (data.value === undefined || data.value === null || data.value === '') return r;
            r.assessed = true; r.value = parseFloat(data.value);
            const { pts, next } = _ladderPoints(r.value, crit.thresholds, crit.dir || 'up');
            r.points = Math.min(crit.max, pts);
            if (r.points < crit.max && next != null) {
                r.next = crit.dir === 'down' ? `Reach ${next}${crit.unit || ''} for +1 point`
                                             : `Reach ${next}${crit.unit || ''} for +1 point`;
            }
            break;
        }
        case 'additive': {
            if (data.items === undefined && !data._assessed) return r;
            r.assessed = true;
            const items = data.items || [];
            let pts = 0;
            r.items = crit.items.map((it, i) => { const done = !!items[i]; if (done) pts += it.pts; return { label: it.label, pts: it.pts, done }; });
            r.points = Math.min(crit.max, pts);
            const undone = r.items.find(it => !it.done);
            if (undone) r.next = 'Add: ' + undone.label;
            break;
        }
        case 'levels': {
            if (data.level === undefined || data.level === null || data.level === '') return r;
            r.assessed = true;
            const lvl = Math.max(0, Math.min(crit.levels.length - 1, parseInt(data.level, 10)));
            r.level = lvl; r.levels = crit.levels; r.points = crit.levels[lvl].pts;
            if (lvl < crit.levels.length - 1) r.next = 'Reach: ' + crit.levels[lvl + 1].label;
            break;
        }
        case 'count': {
            if (data.count === undefined || data.count === null || data.count === '') return r;
            r.assessed = true;
            r.value = Math.max(0, Math.min(crit.max, parseInt(data.count, 10) || 0));
            r.points = r.value;
            if (r.points < crit.max) r.next = 'Add one more qualifying category for +1 point';
            break;
        }
        case 'transportPT': {
            const hasD = !(data.distance === undefined || data.distance === null || data.distance === '');
            const hasS = !(data.interval === undefined || data.interval === null || data.interval === '');
            if (!hasD && !hasS) return r;
            r.assessed = true;
            const d = _ladderPoints(data.distance, crit.distanceThresholds, 'down').pts; // 0..4
            const s = _ladderPoints(data.interval, crit.serviceThresholds, 'down').pts; // 0..4
            r.distance = parseFloat(data.distance); r.interval = parseFloat(data.interval);
            r.parts = [{ label: 'Walking distance', pts: d, max: 4 }, { label: 'Service frequency', pts: s, max: 4 }];
            r.points = (d === 0 || s === 0) ? 0 : Math.min(crit.max, d + s);
            if (d === 0) r.next = 'Bring a stop within 800 m walking distance';
            else if (s === 0) r.next = 'Reach a daytime interval of 60 min or better';
            else if (r.points < crit.max) r.next = 'Improve distance or frequency for more points';
            break;
        }
    }
    return r;
}

// Score a whole module from its per-criterion data map + module meta (onHold etc.).
function scoreModule(mod, critDataMap, meta) {
    critDataMap = critDataMap || {}; meta = meta || {};
    const crits = mod.criteria.map(c => scoreCriterion(c, critDataMap[c.id]));
    const earned = crits.reduce((a, c) => a + c.points, 0);
    const assessedWeight = crits.reduce((a, c) => a + (c.assessed ? c.max : 0), 0);
    const pending = mod.max - assessedWeight;
    const onHold = !!meta.onHold;
    const coverage = mod.max ? assessedWeight / mod.max : 0;
    const complete = coverage >= 1 && !onHold;
    return {
        id: mod.id, col: mod.col, earned, max: mod.max, crits,
        assessedWeight, pending, coverage, onHold,
        band: complete ? benchmarkBand(earned) : null
    };
}
