// Simplicity Living - Scoring criteria & green-building-rating alignment
// Grounded in an independent green-building rating assessment (Ascot Waiatarua)
// and its 22-credit scoring sheet. Internal category keys match the DB columns:
//   energy, ieq, carbon, site (=Sustainable Materials), water, waste,
//   innovation (=Sustainable Transport).
// The seven ACTIVE categories are what Simplicity actively benchmarks and
// scores /20. Everything in SIMPLICITY_STANDARD is where Simplicity scores full
// marks by default — shown for information, not scored.

// ---------------------------------------------------------------------------
// The 7 active categories — what each is scored on (criteria) + how the /20
// maps to a performance band.
// ---------------------------------------------------------------------------
const ACTIVE_CRITERIA = {
    energy: {
        credits:'EF4 Energy Use · EN1 Renewable Energy',
        intro: 'Operational energy: heating, hot water, ventilation, lighting and refrigerants — the energy a home actually buys each year.',
        criteria: [
            { name: 'Delivered energy intensity', desc: 'kWh/m²/year against the rating’s climate-zone benchmark (modelled in the ECCHO tool).' },
            { name: 'Heat-pump efficiency', desc: 'High-COP heat pumps (R32, COP 4.0–5.2) for space heating and hot water.' },
            { name: 'Refrigerant emissions', desc: 'Under 4 kgCO₂e/m² on-site, no fossil fuels combusted on site.' },
            { name: 'Renewable generation', desc: 'On-site PV offset of dwelling + shared loads (BRANZ PV calculator).' }
        ]
    },
    ieq: {
        credits:'HC1 Winter Comfort · HC2 Summer Comfort · HC4 Moisture Control · HC3 Ventilation',
        intro: 'Indoor environment quality rolls the rating’s Winter Comfort, Summer Comfort, Moisture Control and Ventilation into one liveability score.',
        criteria: [
            { name: 'Winter comfort', desc: 'Predicted space-heating demand within the climate-zone limit; well-insulated, thermally-broken envelope.' },
            { name: 'Summer comfort', desc: 'Overheating risk — under 25 °C for ≥93% of the year (or CIBSE TM59), aided by shading & ceiling fans.' },
            { name: 'Moisture control', desc: 'Thermally-broken windows (frame R ≥ 0.25), ground vapour barriers, mould-risk management.' },
            { name: 'Ventilation', desc: 'Continuous mechanical extract from wet rooms with passive make-up air, commissioned to spec.' }
        ]
    },
    carbon: {
        credits:'EN2 Embodied Carbon',
        intro: 'The greenhouse gas emissions embodied in the products and materials used to build the home (modules A–D, EN 15978).',
        criteria: [
            { name: 'Whole-of-life LCA', desc: 'Full A–D lifecycle assessment completed (BRANZ LCAQuick) — mandatory minimum met.' },
            { name: 'Reduction vs baseline', desc: 'Embodied-carbon reduction demonstrated via the Green Star pathway (>20% shown).' },
            { name: 'Structural methodology', desc: 'In-situ / precast concrete optimised for material efficiency and low waste.' }
        ]
    },
    site: { // Sustainable Materials
        credits:'EN3 Sustainable Materials',
        intro: 'Responsibly-sourced materials with lower lifetime environmental impact — backed by EPDs and recognised certifications.',
        criteria: [
            { name: 'Responsible sourcing', desc: 'Materials schedule run through the recognised materials calculator.' },
            { name: 'Environmental Product Declarations', desc: 'EPDs gathered for major materials to verify impacts.' },
            { name: 'Certifications', desc: 'Recognised eco-labels / certification for timber, steel, concrete and finishes.' }
        ]
    },
    water: {
        credits:'EF3 Water Use',
        intro: 'Potable water conservation through efficient fittings, metering and rainwater harvesting.',
        criteria: [
            { name: 'Consumption target', desc: 'Litres per person per day below the high-performance threshold (≤132 L/p/day).' },
            { name: 'WELS-rated fittings', desc: 'Low-flow showers, toilets, kitchen & basin taps (flow rates from WELS ratings).' },
            { name: 'Per-apartment metering', desc: 'Individual metering to encourage conservation.' },
            { name: 'Rainwater harvesting', desc: 'Demand offset captured under EF3 Part B.' }
        ]
    },
    waste: {
        credits:'EN4 Construction Waste Minimisation',
        intro: 'Effective strategies that cut the environmental impact of construction waste — measured, not assumed.',
        criteria: [
            { name: 'Waste management plan', desc: 'A documented plan applied consistently across projects.' },
            { name: 'Diversion from landfill', desc: 'Sorting and recycling to maximise diversion.' },
            { name: 'Low waste factor', desc: 'Systemised, repetitive design keeps the real waste factor far below the industry default.' }
        ]
    },
    innovation: { // Sustainable Transport
        credits:'LV4 Sustainable Transport',
        intro: 'Safe, convenient access to low-carbon transport — cycling, public transport, EV charging and everyday amenities within walking distance.',
        criteria: [
            { name: 'Cycling & PT access', desc: 'Cycleway within 300 m and a public-transport stop within 800 m of the entrance.' },
            { name: 'Cycle parking', desc: 'Secure, covered resident parking ≥1 space/bedroom (Ascot: 168 provided vs 141 required).' },
            { name: 'Sustainable-transport amenities', desc: 'At least 3 of 6 additional amenities provided (only 1 needed for full points).' },
            { name: 'EV charging', desc: 'Electric-vehicle charging provision (partial → expanding).' }
        ]
    }
};

// Score (/20) → performance band
function scoringBand(score) {
    const pct = (score / 20) * 100;
    if (pct >= 90) return { label: 'Exceptional', color: '#1b8a3a', cls: 'band-exceptional' };
    if (pct >= 75) return { label: 'Excellent',   color: '#28a745', cls: 'band-excellent' };
    if (pct >= 60) return { label: 'Good',        color: '#5cb85c', cls: 'band-good' };
    if (pct >= 40) return { label: 'Fair',        color: '#f0ad4e', cls: 'band-fair' };
    return { label: 'Developing', color: '#dc3545', cls: 'band-developing' };
}

// ---------------------------------------------------------------------------
// The 14 "Simplicity standard" credits — full marks by default, shown for info.
// Grouped by rating category. Each: code, name, points, purpose, achieves.
// ---------------------------------------------------------------------------
const SIMPLICITY_STANDARD = [
    {
        group: 'Resource Efficiency', icon: '♻️',
        credits: [
            { code: 'EF1', name: 'Resource Efficiency', points: 4,
              purpose: 'Efficient use of land, infrastructure and space.',
              achieves: 'High-density apartment typology makes efficient use of land and shared infrastructure.' },
            { code: 'EF2', name: 'Urban Density', points: 3,
              purpose: 'Reward smaller footprints and denser urban planning.',
              achieves: 'GFA-to-footprint ratio of 5+ scores maximum points across all buildings.' }
        ]
    },
    {
        group: 'Healthy & Comfortable', icon: '🏠',
        credits: [
            { code: 'HC3', name: 'Ventilation', points: 5,
              purpose: 'Control indoor moisture, cut respiratory illness and mould risk.',
              achieves: 'Continuous mechanical extract from wet rooms with passive make-up air, commissioned to spec.' },
            { code: 'HC5', name: 'Natural Light', points: 3,
              purpose: 'Good daylight to habitable spaces.',
              achieves: 'Living and bedroom window-to-floor ratios exceed minimums (25%+ vs 15–20% required).' },
            { code: 'HC6', name: 'Acoustic Performance', points: 3,
              purpose: 'A quieter, healthier indoor acoustic environment.',
              achieves: 'Inter-tenancy walls 5 dB better than Building Code minimum; absorptive finishes in common areas.' },
            { code: 'HC7', name: 'Healthy Materials', points: 4,
              purpose: 'Low-VOC interior finishes for better air quality.',
              achieves: 'Coatings, floor coverings, adhesives and engineered wood meet recognised low-VOC limits.' }
        ]
    },
    {
        group: 'Liveable', icon: '🌳',
        credits: [
            { code: 'LV1', name: 'Inclusive Design', points: 3,
              purpose: 'Visitable, adaptable and accessible homes.',
              achieves: 'Designed to the Visitable & Adaptable Design checklists for changing occupant needs.' },
            { code: 'LV2', name: 'Occupant Amenities', points: 2,
              purpose: 'Convenient day-to-day living near everyday amenities.',
              achieves: 'On-site café plus medical centre (350 m), dairy (450 m) and school (500 m) within walking distance.' },
            { code: 'LV3', name: 'Eco-Friendly Living', points: 2,
              purpose: 'Designed-in recycling, composting and security.',
              achieves: 'Integrated recycling & food-waste bins, security lighting, CCTV and a residents’ forum.' },
            { code: 'LV5', name: 'Adaptation & Resilience', points: 2,
              purpose: 'Capacity to adapt to extreme weather and a changing climate.',
              achieves: 'Durable concrete structure + shading and drainage measures address all high climate risks to 2050.' }
        ]
    },
    {
        group: 'Environmentally Responsible', icon: '🌏',
        credits: [
            { code: 'EN1', name: 'Renewable Energy', points: 4,
              purpose: 'Local renewable generation to cut operational emissions.',
              achieves: 'Rooftop PV offsetting dwelling and shared loads (growing with each project).' },
            { code: 'EN5', name: 'Water Sensitive Design & Ecology', points: 4,
              purpose: 'Improve site ecology while reducing stormwater runoff and pollution.',
              achieves: 'Stormwater management plus extensive native landscaping (7,000+ plants at Waiatarua).' },
            { code: 'EN6', name: 'Responsible Contracting', points: 1,
              purpose: 'Best-practice environmental management during construction.',
              achieves: 'Environmental Management Plan in place; accredited trades on site.' }
        ]
    }
];
