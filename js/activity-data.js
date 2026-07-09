// Simplicity Living — Activity calculators: element configs, project prefill, calc model
// -------------------------------------------------------------------------------------
// Each "element" (structural walls, foundation, ...) is a focused single-activity A4–A5
// calculator, in the spirit of the Nezo Earth-works tool. One shared engine
// (activity-calculator.js) renders any element from the config below.
//
// A calculator runs in one of two modes:
//   • project mode  — prefilled with a Simplicity project's data (Waiatarua first), used
//                     on the Site Activity page to SUBSTANTIATE real projects.
//   • blank mode    — empty shell for the public A4–A5 calculator, "set up new project".
//
// Emission factors reuse A4A5_DATA (MfE 2023, ME1781) where available.
// All carbon values are kgCO2e. Defaults are indicative early-stage figures — override
// under Assumptions with project-specific data.

const _EF = (typeof A4A5_DATA !== 'undefined') ? A4A5_DATA.emissionFactors : {
    roadAllTrucks: 0.117, diesel: 2.68, electricityGrid: 0.0742
};

// Projects that can drive a calculator. Waiatarua is being substantiated first.
const ACTIVITY_PROJECTS = [
    { key: 'waiatarua',   name: 'Waiatarua',        location: 'Remuera',     status: 'active' },
    { key: 'reiputa',     name: 'Reiputa',          location: 'Mt Wellington', status: 'soon' },
    { key: 'lakeroad',    name: 'Lake Road',        location: 'Northcote',   status: 'soon' },
    { key: 'morningside', name: 'Morningside Drive', location: 'Morningside', status: 'soon' }
];

// ── helpers ──────────────────────────────────────────────────────────────────────────
function _round(n, d = 0) { const f = Math.pow(10, d); return Math.round((n || 0) * f) / f; }
function _num(v, fb = 0) { const n = parseFloat(v); return isFinite(n) ? n : fb; }

// =======================================================================================
//  ELEMENT: Concrete Structural Walls
// =======================================================================================
const EL_WALLS = {
    key: 'walls',
    name: 'Concrete Structural Walls',
    tagline: 'In-situ reinforced concrete walls — transport of concrete & steel (A4) and the pour, crane and formwork cycle on site (A5).',
    unitLabel: 'm² wall',
    accent: '#ff6600',

    // ── input fields (the levers the user or project data sets) ──
    inputs: [
        { id: 'wallArea',   label: 'Wall area',          unit: 'm²',    value: 2400, min: 0, step: 10, group: 'Quantities' },
        { id: 'thickness',  label: 'Wall thickness',     unit: 'mm',    value: 200,  min: 50, step: 10, group: 'Quantities' },
        { id: 'rebarRate',  label: 'Reinforcement rate', unit: 'kg/m³', value: 110,  min: 0, step: 5,  group: 'Quantities' },
        { id: 'concreteKm', label: 'Concrete plant distance', unit: 'km', value: 14, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'rebarKm',    label: 'Rebar supplier distance', unit: 'km', value: 22, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'formworkReuse', label: 'Formwork reuse cycles', unit: 'uses', value: 10, min: 1, step: 1, group: 'Logistics (your actual)' }
    ],

    // ── editable assumptions & emission factors ──
    assumptions: [
        { id: 'concreteDensity', label: 'Concrete density',        unit: 't/m³',  value: 2.40,  step: 0.01, grp: 'Materials' },
        { id: 'efRoad',          label: 'Road freight EF',         unit: 'kg/t·km', value: _round(_EF.roadAllTrucks, 3), step: 0.001, grp: 'Emission factors' },
        { id: 'efDiesel',        label: 'Diesel EF',               unit: 'kg/L',  value: _EF.diesel,          step: 0.01, grp: 'Emission factors' },
        { id: 'efGrid',          label: 'Electricity EF (NZ grid)',unit: 'kg/kWh',value: _round(_EF.electricityGrid, 4), step: 0.001, grp: 'Emission factors' },
        { id: 'distBaseConcrete',label: 'Baseline concrete distance', unit: 'km', value: 32, step: 1, grp: 'Baseline (industry default)' },
        { id: 'distBaseRebar',   label: 'Baseline rebar distance', unit: 'km',    value: 60, step: 1, grp: 'Baseline (industry default)' },
        { id: 'wasteBase',       label: 'Baseline waste',          unit: '%',     value: 10, step: 1, grp: 'Baseline (industry default)' },
        { id: 'utilBase',        label: 'Baseline truck load factor', unit: '0-1',value: 0.70, step: 0.05, grp: 'Baseline (industry default)' },
        { id: 'craneHrsBase',    label: 'Baseline crane', unit: 'hr/m²',          value: 0.055, step: 0.005, grp: 'Baseline (industry default)' },
        { id: 'wasteSimp',       label: 'Simplicity waste',        unit: '%',     value: 2,  step: 1, grp: 'Simplicity (verified)' },
        { id: 'utilSimp',        label: 'Simplicity truck load factor', unit: '0-1', value: 0.92, step: 0.02, grp: 'Simplicity (verified)' },
        { id: 'craneHrsSimp',    label: 'Simplicity crane', unit: 'hr/m²',        value: 0.036, step: 0.005, grp: 'Simplicity (verified)' },
        { id: 'placeDiesel',     label: 'Pump/place diesel',       unit: 'L/m³',  value: 0.85, step: 0.05, grp: 'Site energy' },
        { id: 'placeKwh',        label: 'Vibrate/cure power',      unit: 'kWh/m³',value: 3.0,  step: 0.1, grp: 'Site energy' },
        { id: 'craneDiesel',     label: 'Crane fuel burn',         unit: 'L/hr',  value: 12,   step: 1, grp: 'Site energy' },
        { id: 'rebarFixKwh',     label: 'Rebar fixing power',      unit: 'kWh/t', value: 14,   step: 1, grp: 'Site energy' }
    ],

    // ── the calc model: returns streams (each with baseline & simplicity), plus quantities ──
    compute(v, a) {
        const vol = _num(v.wallArea) * _num(v.thickness) / 1000;       // m³ concrete
        const concreteT = vol * _num(a.concreteDensity);
        const rebarT = vol * _num(v.rebarRate) / 1000;

        // A4 transport: massDelivered × distance × EF / load-factor
        const transport = (massT, distB, distS) => ({
            baseline:   massT * (1 + _num(a.wasteBase) / 100) * _num(distB) * _num(a.efRoad) / _num(a.utilBase, 0.7),
            simplicity: massT * (1 + _num(a.wasteSimp) / 100) * _num(distS) * _num(a.efRoad) / _num(a.utilSimp, 0.9)
        });
        const concreteA4 = transport(concreteT, a.distBaseConcrete, v.concreteKm);
        const rebarA4    = transport(rebarT, a.distBaseRebar, v.rebarKm);

        // A5 construction
        const volB = vol * (1 + _num(a.wasteBase) / 100);
        const volS = vol * (1 + _num(a.wasteSimp) / 100);
        const placeUnit = _num(a.placeDiesel) * _num(a.efDiesel) + _num(a.placeKwh) * _num(a.efGrid);
        const place = { baseline: volB * placeUnit, simplicity: volS * placeUnit };
        const crane = {
            baseline:   _num(v.wallArea) * _num(a.craneHrsBase) * _num(a.craneDiesel) * _num(a.efDiesel),
            simplicity: _num(v.wallArea) * _num(a.craneHrsSimp) * _num(a.craneDiesel) * _num(a.efDiesel)
        };
        const fix = { baseline: rebarT * _num(a.rebarFixKwh) * _num(a.efGrid),
                      simplicity: rebarT * _num(a.rebarFixKwh) * _num(a.efGrid) };

        const streams = [
            { key: 'concreteA4', stage: 'A4', label: 'Concrete transport', color: '#8d6e63', ...concreteA4 },
            { key: 'rebarA4',    stage: 'A4', label: 'Rebar transport',    color: '#78909c', ...rebarA4 },
            { key: 'place',      stage: 'A5', label: 'Pour: pump & vibrate', color: '#ff6600', ...place },
            { key: 'crane',      stage: 'A5', label: 'Crane & formwork',   color: '#f57f17', ...crane },
            { key: 'fix',        stage: 'A5', label: 'Rebar fixing',       color: '#4CAF50', ...fix }
        ];
        return {
            streams,
            quantities: [
                { label: 'Concrete volume', value: _round(vol, 1), unit: 'm³' },
                { label: 'Concrete mass',   value: _round(concreteT, 1), unit: 't' },
                { label: 'Reinforcement',   value: _round(rebarT, 2), unit: 't' },
                { label: 'Concrete loads (6.5 m³ truck)', value: Math.ceil(vol / 6.5) || 0, unit: 'loads' }
            ],
            perUnitDenominator: _num(v.wallArea)
        };
    },

    // ── live SVG scene: concrete truck → boom pump → reinforced wall being poured ──
    viz(v, r, scenario) {
        const loads = Math.ceil((_num(v.wallArea) * _num(v.thickness) / 1000) / 6.5) || 0;
        const fill = scenario === 'baseline' ? 46 : 70;   // simplicity pours faster/fuller
        return `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="100%">
            <rect x="0" y="120" width="300" height="30" fill="#e8e3da"/>
            <line x1="0" y1="120" x2="300" y2="120" stroke="#c9bfae" stroke-width="2"/>
            <!-- reinforced wall being poured (right) -->
            <rect x="212" y="40" width="60" height="80" fill="#eee" stroke="#9a9a9a" stroke-width="1.5"/>
            <rect x="212" y="${40 + (80 - 80 * fill / 100)}" width="60" height="${80 * fill / 100}" fill="#c9c2b6"/>
            <g stroke="#ff6600" stroke-width="1.2" opacity="0.85">
              <line x1="224" y1="42" x2="224" y2="118"/><line x1="236" y1="42" x2="236" y2="118"/>
              <line x1="248" y1="42" x2="248" y2="118"/><line x1="260" y1="42" x2="260" y2="118"/>
              <line x1="214" y1="58" x2="270" y2="58"/><line x1="214" y1="80" x2="270" y2="80"/><line x1="214" y1="102" x2="270" y2="102"/>
            </g>
            <text x="242" y="34" font-size="8" fill="#777" text-anchor="middle">${_round(fill)}% poured</text>
            <!-- boom pump line -->
            <path d="M120 96 L150 60 L205 52" fill="none" stroke="#f57f17" stroke-width="4" stroke-linecap="round"/>
            <circle cx="205" cy="52" r="3" fill="#f57f17"/>
            <!-- concrete truck (left) -->
            <g>
              <rect x="28" y="86" width="52" height="18" rx="3" fill="#ff6600"/>
              <ellipse cx="66" cy="82" rx="20" ry="14" fill="#ffb37a" stroke="#cc5200" stroke-width="1.5"/>
              <path d="M52 74 L80 90 M58 70 L84 84 M48 80 L74 96" stroke="#cc5200" stroke-width="1" opacity="0.5"/>
              <rect x="10" y="80" width="20" height="24" rx="3" fill="#ff8833"/>
              <rect x="13" y="84" width="12" height="9" rx="1" fill="#cfe8f5"/>
              <circle cx="24" cy="108" r="8" fill="#333"/><circle cx="24" cy="108" r="3" fill="#888"/>
              <circle cx="60" cy="108" r="8" fill="#333"/><circle cx="60" cy="108" r="3" fill="#888"/>
              <circle cx="78" cy="108" r="8" fill="#333"/><circle cx="78" cy="108" r="3" fill="#888"/>
            </g>
            <text x="54" y="128" font-size="8.5" fill="#555" text-anchor="middle" font-weight="600">${loads} truck loads</text>
        </svg>`;
    }
};

// =======================================================================================
//  ELEMENT: Foundation  (draft — same pattern, foundation-specific streams)
// =======================================================================================
const EL_FOUNDATION = {
    key: 'foundation',
    name: 'Foundation',
    tagline: 'Footings, pads and slab-thickenings — excavation and spoil cartage, imported hardfill, plus the concrete pour and compaction on site.',
    unitLabel: 'm² footprint',
    accent: '#ff6600',

    inputs: [
        { id: 'footprint',   label: 'Foundation footprint', unit: 'm²',  value: 900, min: 0, step: 10, group: 'Quantities' },
        { id: 'concreteVol', label: 'Concrete volume',      unit: 'm³',  value: 180, min: 0, step: 5,  group: 'Quantities' },
        { id: 'rebarRate',   label: 'Reinforcement rate',   unit: 'kg/m³', value: 95, min: 0, step: 5, group: 'Quantities' },
        { id: 'digVol',      label: 'Excavation volume',    unit: 'm³',  value: 320, min: 0, step: 10, group: 'Quantities' },
        { id: 'hardfillVol', label: 'Imported hardfill',    unit: 'm³',  value: 140, min: 0, step: 10, group: 'Quantities' },
        { id: 'concreteKm',  label: 'Concrete plant distance', unit: 'km', value: 14, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'spoilKm',     label: 'Spoil disposal distance', unit: 'km', value: 12, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'hardfillKm',  label: 'Hardfill quarry distance', unit: 'km', value: 20, min: 0, step: 1, group: 'Logistics (your actual)', lever: true }
    ],

    assumptions: [
        { id: 'concreteDensity', label: 'Concrete density', unit: 't/m³', value: 2.40, step: 0.01, grp: 'Materials' },
        { id: 'spoilDensity',    label: 'Spoil density (loose)', unit: 't/m³', value: 1.60, step: 0.05, grp: 'Materials' },
        { id: 'hardfillDensity', label: 'Hardfill density', unit: 't/m³', value: 2.10, step: 0.05, grp: 'Materials' },
        { id: 'efRoad',   label: 'Road freight EF',  unit: 'kg/t·km', value: _round(_EF.roadAllTrucks, 3), step: 0.001, grp: 'Emission factors' },
        { id: 'efDiesel', label: 'Diesel EF',        unit: 'kg/L',    value: _EF.diesel, step: 0.01, grp: 'Emission factors' },
        { id: 'efGrid',   label: 'Electricity EF',   unit: 'kg/kWh',  value: _round(_EF.electricityGrid, 4), step: 0.001, grp: 'Emission factors' },
        { id: 'distBaseConcrete', label: 'Baseline concrete distance', unit: 'km', value: 32, step: 1, grp: 'Baseline (industry default)' },
        { id: 'distBaseSpoil',    label: 'Baseline spoil distance',    unit: 'km', value: 25, step: 1, grp: 'Baseline (industry default)' },
        { id: 'distBaseHardfill', label: 'Baseline hardfill distance', unit: 'km', value: 40, step: 1, grp: 'Baseline (industry default)' },
        { id: 'wasteBase', label: 'Baseline waste', unit: '%', value: 10, step: 1, grp: 'Baseline (industry default)' },
        { id: 'utilBase',  label: 'Baseline truck load factor', unit: '0-1', value: 0.70, step: 0.05, grp: 'Baseline (industry default)' },
        { id: 'digBase',   label: 'Baseline dig intensity', unit: 'L/m³', value: 0.55, step: 0.05, grp: 'Baseline (industry default)' },
        { id: 'wasteSimp', label: 'Simplicity waste', unit: '%', value: 3, step: 1, grp: 'Simplicity (verified)' },
        { id: 'utilSimp',  label: 'Simplicity truck load factor', unit: '0-1', value: 0.92, step: 0.02, grp: 'Simplicity (verified)' },
        { id: 'digSimp',   label: 'Simplicity dig intensity', unit: 'L/m³', value: 0.40, step: 0.05, grp: 'Simplicity (verified)' },
        { id: 'placeDiesel', label: 'Pump/place diesel', unit: 'L/m³', value: 0.75, step: 0.05, grp: 'Site energy' },
        { id: 'compactDiesel', label: 'Compaction diesel', unit: 'L/m³', value: 0.30, step: 0.05, grp: 'Site energy' }
    ],

    compute(v, a) {
        const concreteT = _num(v.concreteVol) * _num(a.concreteDensity);
        const spoilT = _num(v.digVol) * _num(a.spoilDensity);
        const hardfillT = _num(v.hardfillVol) * _num(a.hardfillDensity);

        const transport = (massT, distB, distS) => ({
            baseline:   massT * (1 + _num(a.wasteBase) / 100) * _num(distB) * _num(a.efRoad) / _num(a.utilBase, 0.7),
            simplicity: massT * (1 + _num(a.wasteSimp) / 100) * _num(distS) * _num(a.efRoad) / _num(a.utilSimp, 0.9)
        });
        const concreteA4 = transport(concreteT, a.distBaseConcrete, v.concreteKm);
        const spoilA4    = transport(spoilT, a.distBaseSpoil, v.spoilKm);       // cart-away, one way modelled in mass
        const hardfillA4 = transport(hardfillT, a.distBaseHardfill, v.hardfillKm);

        const dig = { baseline: _num(v.digVol) * _num(a.digBase) * _num(a.efDiesel),
                      simplicity: _num(v.digVol) * _num(a.digSimp) * _num(a.efDiesel) };
        const volB = _num(v.concreteVol) * (1 + _num(a.wasteBase) / 100);
        const volS = _num(v.concreteVol) * (1 + _num(a.wasteSimp) / 100);
        const place = { baseline: volB * _num(a.placeDiesel) * _num(a.efDiesel),
                        simplicity: volS * _num(a.placeDiesel) * _num(a.efDiesel) };
        const compact = { baseline: _num(v.hardfillVol) * _num(a.compactDiesel) * _num(a.efDiesel),
                          simplicity: _num(v.hardfillVol) * _num(a.compactDiesel) * _num(a.efDiesel) };

        const streams = [
            { key: 'concreteA4', stage: 'A4', label: 'Concrete transport', color: '#8d6e63', ...concreteA4 },
            { key: 'spoilA4',    stage: 'A4', label: 'Spoil cartage',      color: '#b45f4d', ...spoilA4 },
            { key: 'hardfillA4', stage: 'A4', label: 'Hardfill import',    color: '#78909c', ...hardfillA4 },
            { key: 'dig',        stage: 'A5', label: 'Excavation',         color: '#c98b3a', ...dig },
            { key: 'place',      stage: 'A5', label: 'Concrete pour',      color: '#ff6600', ...place },
            { key: 'compact',    stage: 'A5', label: 'Compaction',         color: '#f57f17', ...compact }
        ];
        return {
            streams,
            quantities: [
                { label: 'Concrete mass', value: _round(concreteT, 1), unit: 't' },
                { label: 'Spoil carted',  value: _round(spoilT, 1), unit: 't' },
                { label: 'Hardfill imported', value: _round(hardfillT, 1), unit: 't' },
                { label: 'Reinforcement', value: _round(_num(v.concreteVol) * _num(v.rebarRate) / 1000, 2), unit: 't' }
            ],
            perUnitDenominator: _num(v.footprint)
        };
    },

    viz(v, r, scenario) {
        const trips = Math.ceil(_num(v.digVol) * 1.6 / 14) || 0;   // spoil loads @ ~14t
        const dug = scenario === 'baseline' ? 60 : 82;
        return `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="100%">
            <rect x="0" y="70" width="300" height="80" fill="#e3d7c4"/>
            <!-- excavated foundation trench -->
            <path d="M150 70 L170 118 L250 118 L270 70 Z" fill="#cbb699"/>
            <rect x="182" y="104" width="56" height="14" fill="#c9c2b6" stroke="#9a9a9a" stroke-width="1"/>
            <g stroke="#ff6600" stroke-width="1.1"><line x1="190" y1="106" x2="190" y2="116"/><line x1="204" y1="106" x2="204" y2="116"/><line x1="218" y1="106" x2="218" y2="116"/><line x1="232" y1="106" x2="232" y2="116"/></g>
            <line x1="0" y1="70" x2="150" y2="70" stroke="#b8a887" stroke-width="2"/>
            <text x="210" y="98" font-size="8" fill="#777" text-anchor="middle">${dug}% excavated</text>
            <!-- excavator (left) -->
            <g>
              <rect x="24" y="86" width="40" height="24" rx="3" fill="#ff6600"/>
              <rect x="30" y="74" width="20" height="14" rx="2" fill="#ff8833"/>
              <rect x="33" y="77" width="12" height="8" fill="#cfe8f5"/>
              <path d="M60 92 L92 70 L104 82" fill="none" stroke="#cc5200" stroke-width="4" stroke-linecap="round"/>
              <path d="M104 82 q10 4 6 14 l-14 -2 Z" fill="#f57f17" stroke="#cc5200" stroke-width="1"/>
              <rect x="20" y="108" width="48" height="8" rx="4" fill="#333"/>
              <circle cx="30" cy="112" r="4" fill="#888"/><circle cx="44" cy="112" r="4" fill="#888"/><circle cx="58" cy="112" r="4" fill="#888"/>
            </g>
            <text x="150" y="140" font-size="8.5" fill="#555" text-anchor="middle" font-weight="600">${trips} spoil loads carted</text>
        </svg>`;
    }
};

// =======================================================================================
//  ELEMENT: Suspended Concrete Floors (in-situ slabs across upper levels)
// =======================================================================================
const EL_FLOORS = {
    key: 'floors',
    name: 'Suspended Concrete Floors',
    tagline: 'In-situ reinforced slabs across the upper levels — concrete & steel transport (A4), plus the pour, pumping to height, soffit formwork & back-propping cycle (A5).',
    unitLabel: 'm² floor',
    accent: '#ff6600',

    inputs: [
        { id: 'floorArea',  label: 'Floor area (per level)', unit: 'm²',   value: 1100, min: 0, step: 10, group: 'Quantities' },
        { id: 'levels',     label: 'Suspended levels',       unit: 'levels', value: 6,  min: 1, step: 1,  group: 'Quantities' },
        { id: 'thickness',  label: 'Slab thickness',         unit: 'mm',   value: 220,  min: 100, step: 10, group: 'Quantities' },
        { id: 'rebarRate',  label: 'Reinforcement rate',     unit: 'kg/m³',value: 100,  min: 0, step: 5,  group: 'Quantities' },
        { id: 'concreteKm', label: 'Concrete plant distance', unit: 'km',  value: 14, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'rebarKm',    label: 'Rebar/mesh supplier distance', unit: 'km', value: 22, min: 0, step: 1, group: 'Logistics (your actual)', lever: true }
    ],

    assumptions: [
        { id: 'concreteDensity', label: 'Concrete density',        unit: 't/m³',  value: 2.40,  step: 0.01, grp: 'Materials' },
        { id: 'efRoad',          label: 'Road freight EF',         unit: 'kg/t·km', value: _round(_EF.roadAllTrucks, 3), step: 0.001, grp: 'Emission factors' },
        { id: 'efDiesel',        label: 'Diesel EF',               unit: 'kg/L',  value: _EF.diesel,          step: 0.01, grp: 'Emission factors' },
        { id: 'efGrid',          label: 'Electricity EF (NZ grid)',unit: 'kg/kWh',value: _round(_EF.electricityGrid, 4), step: 0.001, grp: 'Emission factors' },
        { id: 'distBaseConcrete',label: 'Baseline concrete distance', unit: 'km', value: 32, step: 1, grp: 'Baseline (industry default)' },
        { id: 'distBaseRebar',   label: 'Baseline rebar distance', unit: 'km',    value: 60, step: 1, grp: 'Baseline (industry default)' },
        { id: 'wasteBase',       label: 'Baseline waste',          unit: '%',     value: 10, step: 1, grp: 'Baseline (industry default)' },
        { id: 'utilBase',        label: 'Baseline truck load factor', unit: '0-1',value: 0.70, step: 0.05, grp: 'Baseline (industry default)' },
        { id: 'craneHrsBase',    label: 'Baseline crane, formwork & props', unit: 'hr/m²', value: 0.075, step: 0.005, grp: 'Baseline (industry default)' },
        { id: 'wasteSimp',       label: 'Simplicity waste',        unit: '%',     value: 2,  step: 1, grp: 'Simplicity (verified)' },
        { id: 'utilSimp',        label: 'Simplicity truck load factor', unit: '0-1', value: 0.92, step: 0.02, grp: 'Simplicity (verified)' },
        { id: 'craneHrsSimp',    label: 'Simplicity crane, formwork & props', unit: 'hr/m²', value: 0.050, step: 0.005, grp: 'Simplicity (verified)' },
        { id: 'placeDiesel',     label: 'Pump/place diesel (ground)', unit: 'L/m³', value: 0.95, step: 0.05, grp: 'Site energy' },
        { id: 'pumpLiftPct',     label: 'Extra pump diesel per level', unit: '%/lvl', value: 8, step: 1, grp: 'Site energy' },
        { id: 'placeKwh',        label: 'Vibrate/cure power',      unit: 'kWh/m³',value: 3.2,  step: 0.1, grp: 'Site energy' },
        { id: 'craneDiesel',     label: 'Crane fuel burn',         unit: 'L/hr',  value: 12,   step: 1, grp: 'Site energy' },
        { id: 'rebarFixKwh',     label: 'Rebar/mesh fixing power', unit: 'kWh/t', value: 13,   step: 1, grp: 'Site energy' }
    ],

    compute(v, a) {
        const totalArea = _num(v.floorArea) * _num(v.levels);
        const vol = totalArea * _num(v.thickness) / 1000;
        const concreteT = vol * _num(a.concreteDensity);
        const rebarT = vol * _num(v.rebarRate) / 1000;

        const transport = (massT, distB, distS) => ({
            baseline:   massT * (1 + _num(a.wasteBase) / 100) * _num(distB) * _num(a.efRoad) / _num(a.utilBase, 0.7),
            simplicity: massT * (1 + _num(a.wasteSimp) / 100) * _num(distS) * _num(a.efRoad) / _num(a.utilSimp, 0.9)
        });
        const concreteA4 = transport(concreteT, a.distBaseConcrete, v.concreteKm);
        const rebarA4    = transport(rebarT, a.distBaseRebar, v.rebarKm);

        // pumping to height: average lift factor over the levels
        const avgLift = (_num(v.levels) + 1) / 2;
        const liftMult = 1 + _num(a.pumpLiftPct) / 100 * Math.max(0, avgLift - 1);
        const volB = vol * (1 + _num(a.wasteBase) / 100);
        const volS = vol * (1 + _num(a.wasteSimp) / 100);
        const placeUnit = _num(a.placeDiesel) * liftMult * _num(a.efDiesel) + _num(a.placeKwh) * _num(a.efGrid);
        const place = { baseline: volB * placeUnit, simplicity: volS * placeUnit };
        const crane = {
            baseline:   totalArea * _num(a.craneHrsBase) * _num(a.craneDiesel) * _num(a.efDiesel),
            simplicity: totalArea * _num(a.craneHrsSimp) * _num(a.craneDiesel) * _num(a.efDiesel)
        };
        const fix = { baseline: rebarT * _num(a.rebarFixKwh) * _num(a.efGrid),
                      simplicity: rebarT * _num(a.rebarFixKwh) * _num(a.efGrid) };

        const streams = [
            { key: 'concreteA4', stage: 'A4', label: 'Concrete transport', color: '#8d6e63', ...concreteA4 },
            { key: 'rebarA4',    stage: 'A4', label: 'Rebar/mesh transport', color: '#78909c', ...rebarA4 },
            { key: 'place',      stage: 'A5', label: 'Pour: pump to height & vibrate', color: '#ff6600', ...place },
            { key: 'crane',      stage: 'A5', label: 'Crane, formwork & propping', color: '#f57f17', ...crane },
            { key: 'fix',        stage: 'A5', label: 'Rebar & mesh fixing', color: '#4CAF50', ...fix }
        ];
        return {
            streams,
            quantities: [
                { label: 'Total slab area', value: _round(totalArea, 0), unit: 'm²' },
                { label: 'Concrete volume', value: _round(vol, 1), unit: 'm³' },
                { label: 'Concrete mass',   value: _round(concreteT, 1), unit: 't' },
                { label: 'Concrete loads (6.5 m³ truck)', value: Math.ceil(vol / 6.5) || 0, unit: 'loads' }
            ],
            perUnitDenominator: totalArea
        };
    },

    viz(v, r, scenario) {
        const levels = Math.max(1, Math.min(6, Math.round(_num(v.levels))));
        const loads = Math.ceil((_num(v.floorArea) * _num(v.levels) * _num(v.thickness) / 1000) / 6.5) || 0;
        const fill = scenario === 'baseline' ? 48 : 72;
        let slabs = '';
        for (let i = 0; i < levels; i++) {
            const y = 112 - i * 17;
            const top = i === levels - 1;
            slabs += `<rect x="176" y="${y}" width="92" height="9" fill="${top ? '#eee' : '#d2ccc0'}" stroke="#9a9a9a" stroke-width="1"/>`;
            if (top) slabs += `<rect x="176" y="${y}" width="${92 * fill / 100}" height="9" fill="#c9c2b6"/>`;
            // props to the slab below
            if (i > 0) slabs += `<line x1="184" y1="${y + 9}" x2="184" y2="${y + 17}" stroke="#bbb" stroke-width="1.5"/><line x1="260" y1="${y + 9}" x2="260" y2="${y + 17}" stroke="#bbb" stroke-width="1.5"/>`;
        }
        const topY = 112 - (levels - 1) * 17;
        return `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="100%">
            <rect x="0" y="121" width="300" height="29" fill="#e8e3da"/>
            <line x1="0" y1="121" x2="300" y2="121" stroke="#c9bfae" stroke-width="2"/>
            ${slabs}
            <text x="222" y="${topY - 4}" font-size="8" fill="#777" text-anchor="middle">${levels}-level pour · ${_round(fill)}%</text>
            <!-- pump boom rising to the top slab -->
            <path d="M96 100 L140 ${topY + 20} L176 ${topY + 3}" fill="none" stroke="#f57f17" stroke-width="4" stroke-linecap="round"/>
            <circle cx="176" cy="${topY + 3}" r="3" fill="#f57f17"/>
            <!-- concrete pump truck -->
            <g>
              <rect x="30" y="96" width="60" height="16" rx="3" fill="#ff6600"/>
              <rect x="14" y="90" width="20" height="22" rx="3" fill="#ff8833"/>
              <rect x="17" y="94" width="12" height="8" rx="1" fill="#cfe8f5"/>
              <rect x="42" y="90" width="30" height="8" rx="2" fill="#cc5200"/>
              <circle cx="28" cy="114" r="7" fill="#333"/><circle cx="28" cy="114" r="2.5" fill="#888"/>
              <circle cx="62" cy="114" r="7" fill="#333"/><circle cx="62" cy="114" r="2.5" fill="#888"/>
              <circle cx="78" cy="114" r="7" fill="#333"/><circle cx="78" cy="114" r="2.5" fill="#888"/>
            </g>
            <text x="60" y="135" font-size="8.5" fill="#555" text-anchor="middle" font-weight="600">${loads} truck loads</text>
        </svg>`;
    }
};

// =======================================================================================
//  ELEMENT: Roof  (mixed material — concrete deck + timber trusses + structural steel)
// =======================================================================================
const EL_ROOF = {
    key: 'roof',
    name: 'Roof',
    tagline: 'Mixed-material roof — a concrete deck, timber trusses and structural steel. Three transport legs (A4) plus a crane-led erection, deck pour and connections (A5).',
    unitLabel: 'm² roof',
    accent: '#ff6600',

    inputs: [
        { id: 'roofArea',   label: 'Roof area',          unit: 'm²',   value: 1150, min: 0, step: 10, group: 'Quantities' },
        { id: 'concreteVol',label: 'Concrete deck volume', unit: 'm³', value: 45,   min: 0, step: 5,  group: 'Quantities' },
        { id: 'rebarRate',  label: 'Deck reinforcement', unit: 'kg/m³',value: 85,   min: 0, step: 5,  group: 'Quantities' },
        { id: 'timberVol',  label: 'Timber trusses',     unit: 'm³',   value: 55,   min: 0, step: 5,  group: 'Quantities' },
        { id: 'steelMass',  label: 'Structural steel',   unit: 't',    value: 18,   min: 0, step: 1,  group: 'Quantities' },
        { id: 'concreteKm', label: 'Concrete plant distance', unit: 'km', value: 14, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'timberKm',   label: 'Timber supplier distance', unit: 'km', value: 220, min: 0, step: 1, group: 'Logistics (your actual)', lever: true },
        { id: 'steelKm',    label: 'Steel fabricator distance', unit: 'km', value: 35, min: 0, step: 1, group: 'Logistics (your actual)', lever: true }
    ],

    assumptions: [
        { id: 'concreteDensity', label: 'Concrete density', unit: 't/m³', value: 2.40, step: 0.01, grp: 'Materials' },
        { id: 'timberDensity',   label: 'Timber density',   unit: 't/m³', value: 0.55, step: 0.01, grp: 'Materials' },
        { id: 'efRoad',   label: 'Road freight EF',  unit: 'kg/t·km', value: _round(_EF.roadAllTrucks, 3), step: 0.001, grp: 'Emission factors' },
        { id: 'efDiesel', label: 'Diesel EF',        unit: 'kg/L',    value: _EF.diesel, step: 0.01, grp: 'Emission factors' },
        { id: 'efGrid',   label: 'Electricity EF (NZ grid)', unit: 'kg/kWh', value: _round(_EF.electricityGrid, 4), step: 0.001, grp: 'Emission factors' },
        { id: 'distBaseConcrete', label: 'Baseline concrete distance', unit: 'km', value: 32,  step: 1, grp: 'Baseline (industry default)' },
        { id: 'distBaseTimber',   label: 'Baseline timber distance',   unit: 'km', value: 300, step: 5, grp: 'Baseline (industry default)' },
        { id: 'distBaseSteel',    label: 'Baseline steel distance',    unit: 'km', value: 90,  step: 5, grp: 'Baseline (industry default)' },
        { id: 'wasteBase', label: 'Baseline waste', unit: '%', value: 10, step: 1, grp: 'Baseline (industry default)' },
        { id: 'utilBase',  label: 'Baseline truck load factor', unit: '0-1', value: 0.70, step: 0.05, grp: 'Baseline (industry default)' },
        { id: 'craneHrsBase', label: 'Baseline crane (erection)', unit: 'hr/m²', value: 0.045, step: 0.005, grp: 'Baseline (industry default)' },
        { id: 'wasteSimp', label: 'Simplicity waste', unit: '%', value: 2, step: 1, grp: 'Simplicity (verified)' },
        { id: 'utilSimp',  label: 'Simplicity truck load factor', unit: '0-1', value: 0.92, step: 0.02, grp: 'Simplicity (verified)' },
        { id: 'craneHrsSimp', label: 'Simplicity crane (erection)', unit: 'hr/m²', value: 0.030, step: 0.005, grp: 'Simplicity (verified)' },
        { id: 'placeDiesel', label: 'Deck pour diesel',  unit: 'L/m³',  value: 0.90, step: 0.05, grp: 'Site energy' },
        { id: 'placeKwh',    label: 'Vibrate/cure power', unit: 'kWh/m³', value: 3.0, step: 0.1, grp: 'Site energy' },
        { id: 'craneDiesel', label: 'Crane fuel burn',   unit: 'L/hr',  value: 12,   step: 1, grp: 'Site energy' },
        { id: 'fixKwh',      label: 'Connections/welding power', unit: 'kWh/t', value: 45, step: 1, grp: 'Site energy' }
    ],

    compute(v, a) {
        const concreteT = _num(v.concreteVol) * _num(a.concreteDensity);
        const rebarT = _num(v.concreteVol) * _num(v.rebarRate) / 1000;
        const timberT = _num(v.timberVol) * _num(a.timberDensity);
        const steelT = _num(v.steelMass);

        const transport = (massT, distB, distS) => ({
            baseline:   massT * (1 + _num(a.wasteBase) / 100) * _num(distB) * _num(a.efRoad) / _num(a.utilBase, 0.7),
            simplicity: massT * (1 + _num(a.wasteSimp) / 100) * _num(distS) * _num(a.efRoad) / _num(a.utilSimp, 0.9)
        });
        const concreteA4 = transport(concreteT + rebarT, a.distBaseConcrete, v.concreteKm);
        const timberA4   = transport(timberT, a.distBaseTimber, v.timberKm);
        const steelA4    = transport(steelT, a.distBaseSteel, v.steelKm);

        const volB = _num(v.concreteVol) * (1 + _num(a.wasteBase) / 100);
        const volS = _num(v.concreteVol) * (1 + _num(a.wasteSimp) / 100);
        const pourUnit = _num(a.placeDiesel) * _num(a.efDiesel) + _num(a.placeKwh) * _num(a.efGrid);
        const pour = { baseline: volB * pourUnit, simplicity: volS * pourUnit };
        const crane = {
            baseline:   _num(v.roofArea) * _num(a.craneHrsBase) * _num(a.craneDiesel) * _num(a.efDiesel),
            simplicity: _num(v.roofArea) * _num(a.craneHrsSimp) * _num(a.craneDiesel) * _num(a.efDiesel)
        };
        const fix = { baseline: (steelT + timberT) * _num(a.fixKwh) * _num(a.efGrid),
                      simplicity: (steelT + timberT) * _num(a.fixKwh) * _num(a.efGrid) };

        const streams = [
            { key: 'concreteA4', stage: 'A4', label: 'Concrete deck transport', color: '#8d6e63', ...concreteA4 },
            { key: 'timberA4',   stage: 'A4', label: 'Timber truss transport',  color: '#a1887f', ...timberA4 },
            { key: 'steelA4',    stage: 'A4', label: 'Steel transport',         color: '#78909c', ...steelA4 },
            { key: 'crane',      stage: 'A5', label: 'Crane erection',          color: '#ff6600', ...crane },
            { key: 'pour',       stage: 'A5', label: 'Deck pour',               color: '#f57f17', ...pour },
            { key: 'fix',        stage: 'A5', label: 'Connections & welding',   color: '#4CAF50', ...fix }
        ];
        return {
            streams,
            quantities: [
                { label: 'Concrete mass', value: _round(concreteT, 1), unit: 't' },
                { label: 'Timber mass',   value: _round(timberT, 1), unit: 't' },
                { label: 'Steel mass',    value: _round(steelT, 1), unit: 't' },
                { label: 'Crane lifts (approx)', value: Math.ceil((steelT + timberT) / 2) || 0, unit: 'lifts' }
            ],
            perUnitDenominator: _num(v.roofArea)
        };
    },

    viz(v, r, scenario) {
        const placed = scenario === 'baseline' ? 3 : 5;   // trusses erected
        const lifts = Math.ceil((_num(v.steelMass) + _num(v.timberVol) * 0.55) / 2) || 0;
        // build a run of trusses on top of the wall line
        let trusses = '';
        for (let i = 0; i < 5; i++) {
            const x = 150 + i * 26;
            const on = i < placed;
            trusses += `<path d="M${x} 96 L${x + 13} 74 L${x + 26} 96" fill="none" stroke="${on ? '#c98b3a' : '#e0d5c2'}" stroke-width="${on ? 2.5 : 1.5}" stroke-linejoin="round"/>
                        <line x1="${x + 13}" y1="74" x2="${x + 13}" y2="96" stroke="${on ? '#c98b3a' : '#e0d5c2'}" stroke-width="1.5"/>`;
        }
        return `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="100%">
            <rect x="0" y="120" width="300" height="30" fill="#e8e3da"/>
            <line x1="0" y1="120" x2="300" y2="120" stroke="#c9bfae" stroke-width="2"/>
            <!-- top-of-building wall line the roof sits on -->
            <rect x="150" y="96" width="130" height="24" fill="#eceae6" stroke="#cfc8bb" stroke-width="1"/>
            <!-- steel purlins (horizontal) -->
            <line x1="150" y1="86" x2="276" y2="86" stroke="#90a4ae" stroke-width="1.5" stroke-dasharray="6,3"/>
            ${trusses}
            <text x="215" y="66" font-size="8" fill="#777" text-anchor="middle">${placed}/5 trusses set</text>
            <!-- mobile crane lifting a truss -->
            <g>
              <rect x="18" y="104" width="40" height="14" rx="3" fill="#ff6600"/>
              <rect x="24" y="96" width="16" height="10" rx="2" fill="#ff8833"/>
              <rect x="27" y="99" width="9" height="5" fill="#cfe8f5"/>
              <circle cx="28" cy="120" r="6" fill="#333"/><circle cx="48" cy="120" r="6" fill="#333"/>
              <!-- lattice boom up-and-over -->
              <path d="M50 104 L92 58 L128 66" fill="none" stroke="#cc5200" stroke-width="3" stroke-linecap="round"/>
              <line x1="128" y1="66" x2="128" y2="80" stroke="#555" stroke-width="1"/>
              <!-- slung truss -->
              <path d="M118 80 L128 68 L138 80" fill="none" stroke="#c98b3a" stroke-width="2.5" stroke-linejoin="round"/>
              <line x1="128" y1="68" x2="128" y2="80" stroke="#c98b3a" stroke-width="1.5"/>
            </g>
            <text x="150" y="140" font-size="8.5" fill="#555" text-anchor="middle" font-weight="600">${lifts} crane lifts</text>
        </svg>`;
    }
};

// =======================================================================================
//  Element registry + project prefill
// =======================================================================================
const ACTIVITY_ELEMENTS = { walls: EL_WALLS, foundation: EL_FOUNDATION, floors: EL_FLOORS, roof: EL_ROOF };

// Per-project, per-element prefill (only overrides; missing inputs fall back to defaults).
// Waiatarua is populated (placeholder figures pending substantiation); others = coming soon.
const ACTIVITY_PREFILL = {
    waiatarua: {
        walls:      { wallArea: 2650, thickness: 200, rebarRate: 115, concreteKm: 13, rebarKm: 20, formworkReuse: 12 },
        foundation: { footprint: 980, concreteVol: 205, rebarRate: 100, digVol: 360, hardfillVol: 150, concreteKm: 13, spoilKm: 11, hardfillKm: 18 },
        floors:     { floorArea: 1150, levels: 6, thickness: 220, rebarRate: 100, concreteKm: 13, rebarKm: 20 },
        roof:       { roofArea: 1150, concreteVol: 42, rebarRate: 85, timberVol: 52, steelMass: 17, concreteKm: 13, timberKm: 225, steelKm: 32 }
    }
    // reiputa / lakeroad / morningside: not yet substantiated → "coming soon"
};

function activityProject(key) { return ACTIVITY_PROJECTS.find(p => p.key === key) || null; }
function activityHasData(projectKey, elementKey) {
    return !!(ACTIVITY_PREFILL[projectKey] && ACTIVITY_PREFILL[projectKey][elementKey]);
}
