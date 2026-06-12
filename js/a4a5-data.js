// Simplicity Living - A4/A5 Calculator reference data
// Sources:
//   - Emission factors: Ministry for the Environment (MfE) "Measuring Emissions:
//     A guide for organisations — 2023 summary of emission factors" (ME1781).
//   - Transport distances: BRANZ-style "Transport Scenarios" matrix (origin -> site),
//     sea (container freight) + road (all trucks) distances, destination Auckland.
// All factors are kgCO2e per stated unit.

const A4A5_DATA = {

    // -----------------------------------------------------------------------
    // Emission factors (MfE 2023, ME1781)
    // -----------------------------------------------------------------------
    emissionFactors: {
        // Freight, kgCO2e per tonne-kilometre (t.km)
        roadAllTrucks:      0.117,   // Table 27 - all trucks
        roadLongHaul:       0.105,   // Table 27 - long-haul heavy truck
        roadUrban:          0.135,   // Table 27 - urban delivery heavy truck
        seaContainer:       0.0161,  // Table 30 - container ship (international), avg
        coastalContainer:   0.0460,  // Table 28 - coastal container freight (e.g. Cook Strait)
        rail:               0.0270,  // Table 28 - rail freight

        // Fuels & energy
        diesel:             2.68,    // kgCO2e per litre (transport diesel)
        petrol:             2.42,    // kgCO2e per litre
        electricityGrid:    0.0742   // kgCO2e per kWh (NZ purchased grid avg, 2022)
    },

    // -----------------------------------------------------------------------
    // Material density & default supply origin
    // density kg/m3; some materials are better entered by area or each (see unit)
    // -----------------------------------------------------------------------
    materials: [
        { key: 'concrete',   name: 'Ready-mix concrete (reinforced)', unit: 'm3', density: 2400, defaultOrigin: 'Auckland',   icon: '🧱' },
        { key: 'precast',    name: 'Precast concrete panels',         unit: 'm3', density: 2400, defaultOrigin: 'Hamilton',   icon: '🏗️' },
        { key: 'rebar',      name: 'Reinforcing steel (rebar)',       unit: 't',  density: 1000, defaultOrigin: 'Auckland',   icon: '🔩' },
        { key: 'struct_steel', name: 'Structural steel',              unit: 't',  density: 1000, defaultOrigin: 'China',      icon: '⚙️' },
        { key: 'timber',     name: 'Structural timber',               unit: 'm3', density: 550,  defaultOrigin: 'Rotorua',    icon: '🪵' },
        { key: 'clt',        name: 'CLT / mass timber',               unit: 'm3', density: 480,  defaultOrigin: 'Nelson',     icon: '🌲' },
        { key: 'plasterboard', name: 'Plasterboard / linings',        unit: 't',  density: 1000, defaultOrigin: 'Auckland',   icon: '📋' },
        { key: 'glazing',    name: 'Glazing & aluminium joinery',     unit: 't',  density: 1000, defaultOrigin: 'China',      icon: '🪟' },
        { key: 'cladding',   name: 'External cladding',               unit: 't',  density: 1000, defaultOrigin: 'Auckland',   icon: '🧊' },
        { key: 'insulation', name: 'Insulation',                      unit: 'm3', density: 30,   defaultOrigin: 'Auckland',   icon: '🧶' },
        { key: 'blockwork',  name: 'Masonry / blockwork',             unit: 'm3', density: 1900, defaultOrigin: 'Auckland',   icon: '🧱' },
        { key: 'services',   name: 'Mechanical & electrical services',unit: 't',  density: 1000, defaultOrigin: 'China',      icon: '🔧' }
    ],

    // -----------------------------------------------------------------------
    // Transport distances to an Auckland site (from Transport Scenarios.xlsx).
    // seaMode/seaKm = international/coastal shipping leg; roadKm = local road leg.
    // -----------------------------------------------------------------------
    origins: [
        // New Zealand (road, with a coastal sea leg for the South Island)
        { key: 'Auckland',         label: 'Auckland (local)',     group: 'New Zealand', seaKm: 0,     roadKm: 50,   coastal: false },
        { key: 'Hamilton',         label: 'Hamilton',             group: 'New Zealand', seaKm: 0,     roadKm: 121,  coastal: false },
        { key: 'Whangarei',        label: 'Whangārei',            group: 'New Zealand', seaKm: 0,     roadKm: 158,  coastal: false },
        { key: 'Tauranga',         label: 'Tauranga',             group: 'New Zealand', seaKm: 0,     roadKm: 200,  coastal: false },
        { key: 'Rotorua',          label: 'Rotorua',              group: 'New Zealand', seaKm: 0,     roadKm: 228,  coastal: false },
        { key: 'New Plymouth',     label: 'New Plymouth',         group: 'New Zealand', seaKm: 0,     roadKm: 359,  coastal: false },
        { key: 'Napier-Hastings',  label: 'Napier-Hastings',      group: 'New Zealand', seaKm: 0,     roadKm: 412,  coastal: false },
        { key: 'Whanganui',        label: 'Whanganui',            group: 'New Zealand', seaKm: 0,     roadKm: 445,  coastal: false },
        { key: 'Gisborne',         label: 'Gisborne',             group: 'New Zealand', seaKm: 0,     roadKm: 480,  coastal: false },
        { key: 'Palmerston North', label: 'Palmerston North',     group: 'New Zealand', seaKm: 0,     roadKm: 514,  coastal: false },
        { key: 'Wellington',       label: 'Wellington',           group: 'New Zealand', seaKm: 0,     roadKm: 645,  coastal: false },
        { key: 'Nelson',           label: 'Nelson',               group: 'New Zealand', seaKm: 100,   roadKm: 848,  coastal: true },
        { key: 'Christchurch',     label: 'Christchurch',         group: 'New Zealand', seaKm: 100,   roadKm: 1073, coastal: true },
        { key: 'Dunedin',          label: 'Dunedin',              group: 'New Zealand', seaKm: 100,   roadKm: 1428, coastal: true },
        { key: 'Invercargill',     label: 'Invercargill',         group: 'New Zealand', seaKm: 100,   roadKm: 1631, coastal: true },
        // International (sea container freight + 50km local road)
        { key: 'Australia - East Coast', label: 'Australia – East Coast', group: 'International', seaKm: 1645,  roadKm: 50, coastal: false },
        { key: 'Australia - West Coast', label: 'Australia – West Coast', group: 'International', seaKm: 3202,  roadKm: 50, coastal: false },
        { key: 'Japan',            label: 'Japan',                group: 'International', seaKm: 4809,  roadKm: 50, coastal: false },
        { key: 'South Korea',      label: 'South Korea',          group: 'International', seaKm: 5075,  roadKm: 50, coastal: false },
        { key: 'China',            label: 'China',                group: 'International', seaKm: 5142,  roadKm: 50, coastal: false },
        { key: 'Malayasia',        label: 'Malaysia',             group: 'International', seaKm: 5270,  roadKm: 50, coastal: false },
        { key: 'Thailand',         label: 'Thailand',             group: 'International', seaKm: 5739,  roadKm: 50, coastal: false },
        { key: 'India',            label: 'India',                group: 'International', seaKm: 7079,  roadKm: 50, coastal: false },
        { key: 'USA - West Coast', label: 'USA – West Coast',     group: 'International', seaKm: 5659,  roadKm: 50, coastal: false },
        { key: 'USA - East Coast', label: 'USA – East Coast',     group: 'International', seaKm: 12155, roadKm: 50, coastal: false },
        { key: 'European Union',   label: 'European Union',       group: 'International', seaKm: 12427, roadKm: 50, coastal: false },
        { key: 'United Kingdom',   label: 'United Kingdom',       group: 'International', seaKm: 12386, roadKm: 50, coastal: false },
        { key: 'Brazil',           label: 'Brazil',               group: 'International', seaKm: 10279, roadKm: 50, coastal: false }
    ],

    // -----------------------------------------------------------------------
    // Default logistics levers (the BRANZ "default" vs the verified "optimised")
    // -----------------------------------------------------------------------
    levers: {
        baseline:  { wastePct: 10, utilisation: 0.70, label: 'Industry baseline (BRANZ defaults)' },
        optimised: { wastePct: 2,  utilisation: 0.90, label: 'Simplicity optimised logistics' }
    },

    // =======================================================================
    // A5: Construction & installation. Weekly activity profiles.
    // 4 trade categories. Each scenario defines, per category, the on-site
    // window (start/end week) and a peak intensity 0-100. The engine builds a
    // bell-ish curve inside each window. Baseline = sequential (long, linear);
    // Simplicity = overlapped trades (shorter, higher peak).
    // =======================================================================
    a5Categories: [
        { key: 'ground',   name: 'Groundworks',                  color: '#8d6e63', icon: '🚜',
          desc: 'Site clearance, bulk earthworks, piling, foundations' },
        { key: 'core',     name: 'Core structure',               color: '#ff6600', icon: '🏗️',
          desc: 'Slab, in-situ structural walls, upper floors, roof frame' },
        { key: 'envelope', name: 'Envelope',                     color: '#2196F3', icon: '🪟',
          desc: 'External windows & doors, wall & roof cladding, weathertightness' },
        { key: 'fitout',   name: 'Internal fit-out & services',  color: '#4CAF50', icon: '🔧',
          desc: 'Linings, ceilings, 1st/2nd-fix plumbing, electrical, mechanical, joinery, flooring' }
    ],

    // How each trade category drives each A5 metric (relative weighting 0-1).
    // metric = sum over categories ( activity[cat] * weight[metric][cat] )
    a5MetricWeights: {
        people:      { ground: 0.35, core: 0.75, envelope: 0.70, fitout: 1.00 }, // labour-intensive fit-out
        material:    { ground: 0.25, core: 1.00, envelope: 0.65, fitout: 0.55 }, // structure = mass
        equipment:   { ground: 1.00, core: 0.85, envelope: 0.40, fitout: 0.30 }, // cranes/diggers early
        fuel:        { ground: 1.00, core: 0.70, envelope: 0.30, fitout: 0.20 }, // diesel: earthworks heavy
        electricity: { ground: 0.15, core: 0.40, envelope: 0.55, fitout: 1.00 }  // power tools/lighting late
    },

    // Per-unit-activity scaling to real-world weekly quantities (per 100 activity)
    // Calibrated so a ~9,500 m² high-rise peaks at believable site numbers.
    // (placeholder calibration — refine with real site data later)
    a5MetricScale: {
        people:      120,    // workers on site (peak ~110)
        material:    65,     // tonnes delivered / week
        equipment:   70,     // machine-hours / week
        fuel:        600,    // litres diesel / week
        electricity: 820     // kWh / week
    },

    a5MetricMeta: {
        people:      { name: 'People on site',  unit: 'workers',   icon: '👷', color: '#ff6600' },
        material:    { name: 'Material',        unit: 't/week',    icon: '📦', color: '#795548' },
        equipment:  { name: 'Equipment',       unit: 'mach-hrs',  icon: '🏗️', color: '#607D8B' },
        fuel:        { name: 'Fuel',            unit: 'L diesel',  icon: '⛽', color: '#f57f17' },
        electricity: { name: 'Electricity',     unit: 'kWh',       icon: '⚡', color: '#2196F3' }
    },

    // Scenario definitions: window [startWeek, endWeek] (1-based) and peak per category
    a5Scenarios: {
        baseline: {
            label: 'Industry baseline',
            sub: 'Sequential trades, longer programme',
            weeks: 80,
            windows: {
                ground:   { start: 1,  end: 14, peak: 70 },
                core:     { start: 12, end: 44, peak: 100 },
                envelope: { start: 42, end: 62, peak: 75 },
                fitout:   { start: 58, end: 80, peak: 90 }
            }
        },
        simplicity: {
            label: 'Simplicity methodology',
            sub: 'Overlapped trades, shorter programme, higher peak',
            weeks: 56,
            windows: {
                ground:   { start: 1,  end: 9,  peak: 72 },
                core:     { start: 7,  end: 36, peak: 100 },
                envelope: { start: 26, end: 46, peak: 80 },
                fitout:   { start: 30, end: 56, peak: 95 }
            }
        }
    },

    // Imagined site-data capture tools (placeholder — real tools/data to come)
    a5SiteTools: [
        { icon: '📱', name: 'Personnel tracking app',
          desc: 'Site sign-in / wearable beacons log actual headcount per trade, per day — replacing GFA-based labour estimates.' },
        { icon: '🚚', name: 'Vehicle & plant tracking app',
          desc: 'GPS + telematics on deliveries, cranes and diggers capture real machine-hours and idle time.' },
        { icon: '⛽', name: 'Fuel & maintenance app',
          desc: 'Every diesel docket and tank fill logged against plant — verified litres, not assumptions.' },
        { icon: '🗑️', name: 'Skip & waste ledger',
          desc: 'Weighbridge dockets per skip (material, landfill vs diversion) prove the real waste factor.' },
        { icon: '🔌', name: 'Smart meter feed',
          desc: 'Site board kWh pulled live (or monthly power bill) for actual temporary-works electricity.' }
    ]
};
