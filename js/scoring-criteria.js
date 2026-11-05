// Simplicity Living - Scoring criteria & green-building-rating alignment
// Grounded in an independent green-building rating assessment (Ascot Waiatarua)
// and its 22-credit scoring sheet. Internal category keys match the DB columns:
//   energy, ieq, carbon, site (=Sustainable Materials), water, waste,
//   innovation (=Sustainable Transport).
// The seven ACTIVE categories are what Simplicity actively benchmarks and
// scores /20. Everything in SIMPLICITY_STANDARD is where Simplicity scores full
// marks by default — shown for information, not scored.
//
// NOTE ON CODES: the rating credit codes (EF4, HC3, LV5 …) are kept in this data
// file for our own reference / traceability, but are NO LONGER rendered publicly.
//
// Each ACTIVE criterion carries `points` (its share of the /20). The detailed view
// builds the category score up from these, showing which items are met, partially
// met, or still to come — so the /20 is transparent, not a black box.

// ---------------------------------------------------------------------------
// The 7 active categories — what each is scored on (criteria, weighted to /20)
// plus how the /20 maps to a performance band.
// Criteria are listed with the dependable strengths first and the stretch items
// last, so the "met → partial → to come" breakdown reads naturally.
// ---------------------------------------------------------------------------
const ACTIVE_CRITERIA = {
    energy: {
        credits:'EF4 Energy Use · EN1 Renewable Energy',   // internal reference only
        intro: 'Operational energy: heating, hot water, ventilation, lighting and refrigerants, the energy a home actually buys each year.',
        criteria: [
            { name: 'Delivered energy intensity', points: 6, desc: 'kWh/m²/year against the climate-zone benchmark (modelled in the ECCHO tool).', target: 'Model delivered energy ≥20% below the climate-zone benchmark.' },
            { name: 'Heat-pump efficiency',       points: 5, desc: 'High-COP heat pumps (R32, COP 4.0–5.2) for space heating and hot water.', target: 'All space heating and hot water on high-COP (≥4.0) electric heat pumps — no gas.' },
            { name: 'Refrigerant emissions',      points: 5, desc: 'Under 4 kgCO₂e/m² on-site, no fossil fuels combusted on site.', target: 'Low-GWP refrigerants kept under 4 kgCO₂e/m²; zero on-site fossil combustion.' },
            { name: 'Renewable generation',       points: 4, desc: 'On-site PV offset of dwelling + shared loads (BRANZ PV calculator); growing with each project.', target: 'On-site PV offsetting a meaningful share of dwelling and shared loads.' }
        ]
    },
    ieq: {
        credits:'HC1 Winter Comfort · HC2 Summer Comfort · HC4 Moisture Control · HC3 Ventilation',
        intro: 'Indoor environment quality rolls Winter Comfort, Moisture Control, Ventilation and Summer Comfort into one liveability score.',
        criteria: [
            { name: 'Winter comfort',   points: 6, desc: 'Predicted space-heating demand within the climate-zone limit; well-insulated, thermally-broken envelope.', target: 'Space-heating demand within the climate-zone limit, with a thermally-broken, well-insulated envelope.' },
            { name: 'Moisture control', points: 4, desc: 'Thermally-broken windows (frame R ≥ 0.25), ground vapour barriers, mould-risk management.', target: 'Thermally-broken joinery (frame R ≥ 0.25), vapour barriers and a documented mould-risk strategy.' },
            { name: 'Ventilation',      points: 4, desc: 'Continuous mechanical extract from wet rooms with passive make-up air, commissioned to spec.', target: 'Continuous mechanical extract to all wet rooms with passive make-up air, commissioned.' },
            { name: 'Summer comfort',   points: 6, desc: 'Overheating risk under 25 °C for ≥93% of the year (CIBSE TM59), aided by shading & ceiling fans.', target: 'Keep indoors under 25 °C for ≥93% of the year (CIBSE TM59) via shading and cross-ventilation.' }
        ]
    },
    carbon: {
        credits:'EN2 Embodied Carbon',
        intro: 'The greenhouse gas emissions embodied in the products and materials used to build the home (modules A–D, EN 15978).',
        criteria: [
            { name: 'Whole-of-life LCA',       points: 6, desc: 'Full A–D lifecycle assessment completed (BRANZ LCAQuick); mandatory minimum met.', target: 'Complete an A–D lifecycle assessment (e.g. BRANZ LCAQuick) for the building.' },
            { name: 'Structural methodology',  points: 6, desc: 'In-situ / precast concrete optimised for material efficiency and low waste.', target: 'Optimise the concrete structure for material efficiency and minimal offcut waste.' },
            { name: 'Reduction vs baseline',   points: 8, desc: 'Embodied-carbon reduction demonstrated via the Green Star pathway (>20% shown).', target: 'Demonstrate >20% embodied-carbon reduction against the reference building.' }
        ]
    },
    site: { // Sustainable Materials
        credits:'EN3 Sustainable Materials',
        intro: 'Responsibly-sourced materials with lower lifetime environmental impact, backed by EPDs and recognised certifications.',
        criteria: [
            { name: 'Responsible sourcing', points: 7, desc: 'Materials schedule run through the recognised materials calculator.', target: 'Run the full materials schedule through the recognised materials calculator.' },
            { name: 'Certifications',       points: 6, desc: 'Recognised eco-labels / certification for timber, steel, concrete and finishes.', target: 'Hold recognised eco-labels / certification for timber, steel, concrete and key finishes.' },
            { name: 'Environmental Product Declarations', points: 7, desc: 'EPDs gathered for major materials to verify impacts; expanding coverage.', target: 'Gather Environmental Product Declarations for all major materials.' }
        ]
    },
    water: {
        credits:'EF3 Water Use',
        intro: 'Potable water conservation through efficient fittings, metering and rainwater harvesting.',
        criteria: [
            { name: 'WELS-rated fittings',    points: 5, desc: 'Low-flow showers, toilets, kitchen & basin taps (flow rates from WELS ratings).', target: 'Specify high-WELS showers, toilets and taps throughout.' },
            { name: 'Per-apartment metering', points: 4, desc: 'Individual metering to encourage conservation.', target: 'Meter every apartment individually.' },
            { name: 'Consumption target',     points: 7, desc: 'Litres per person per day below the high-performance threshold (≤132 L/p/day).', target: 'Design to ≤132 litres per person per day.' },
            { name: 'Rainwater harvesting',   points: 4, desc: 'Demand offset captured under EF3 Part B; expanding across projects.', target: 'Capture rainwater to offset a measured share of demand.' }
        ]
    },
    waste: {
        credits:'EN4 Construction Waste Minimisation',
        intro: 'Effective strategies that cut the environmental impact of construction waste, measured, not assumed.',
        criteria: [
            { name: 'Waste management plan', points: 6, desc: 'A documented plan applied consistently across projects.', target: 'Apply a documented construction-waste plan on every project.' },
            { name: 'Low waste factor',      points: 6, desc: 'Systemised, repetitive design keeps the real waste factor far below the industry default.', target: 'Use repetitive, systemised design to hold the real waste factor well below the industry default.' },
            { name: 'Diversion from landfill', points: 8, desc: 'Sorting and recycling to maximise diversion, verified by weighbridge dockets.', target: 'Sort and recycle to maximise diversion, verified by weighbridge dockets.' }
        ]
    },
    innovation: { // Sustainable Transport
        credits:'LV4 Sustainable Transport',
        intro: 'Safe, convenient access to low-carbon transport: cycling, public transport, EV charging and everyday amenities within walking distance.',
        criteria: [
            { name: 'Cycling & PT access',  points: 6, desc: 'Cycleway within 300 m and a public-transport stop within 800 m of the entrance.', target: 'Cycleway within 300 m and a public-transport stop within 800 m of the entrance.' },
            { name: 'Cycle parking',        points: 5, desc: 'Secure, covered resident parking ≥1 space/bedroom (Ascot: 168 provided vs 141 required).', target: 'Secure, covered cycle parking at ≥1 space per bedroom.' },
            { name: 'Sustainable-transport amenities', points: 5, desc: 'At least 3 of 6 additional amenities provided (only 1 needed for full points).', target: 'Provide at least 3 of the 6 recognised sustainable-transport amenities.' },
            { name: 'EV charging',          points: 4, desc: 'Electric-vehicle charging provision, partial and expanding.', target: 'Provide EV-charging infrastructure across the car park.' }
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

// Build a per-criterion points breakdown from a category score (0-20).
// Greedy fill in listed order: dependable strengths fill first, stretch items last.
// Returns [{ name, desc, points, earned, status }]  status ∈ met|partial|pending.
function criteriaBreakdown(categoryKey, score) {
    const cat = ACTIVE_CRITERIA[categoryKey];
    if (!cat) return [];
    let remaining = Math.max(0, Math.min(20, Math.round(score || 0)));
    return cat.criteria.map(ci => {
        const earned = Math.max(0, Math.min(ci.points, remaining));
        remaining -= earned;
        const status = earned >= ci.points ? 'met' : (earned > 0 ? 'partial' : 'pending');
        return { name: ci.name, desc: ci.desc, target: ci.target, points: ci.points, earned, status };
    });
}

// ---------------------------------------------------------------------------
// The 14 "Simplicity standard" credits — full marks by default, shown for info.
// Grouped by rating category. Each credit: code (internal ref only, not shown),
// name, icon, points (internal ref), purpose, achieves, detail (popup) + photo.
// ---------------------------------------------------------------------------
// Real Simplicity renders (already used on the home page). null => branded icon
// placeholder in the popup — drop a real finish/site photo URL here to replace it.
const SIMP_PHOTOS = {
    reiputa:     'https://d7dlgmcq34qnb.cloudfront.net/photos/OTOH_Te_Reiputa_Ext_Pavilion_small.jpg',
    waiatarua:   'https://d7dlgmcq34qnb.cloudfront.net/photos/apartments/waiatarua/renders/Simplicity_Ascot_Ext_Motorway.jpg',
    northcote:   'https://d7dlgmcq34qnb.cloudfront.net/photos/apartments/northcote/renders/Northcote.png',
    morningside: 'https://d7dlgmcq34qnb.cloudfront.net/photos/apartments/morningside/renders/Morningside.png'
};

const SIMPLICITY_STANDARD = [
    {
        group: 'Resource Efficiency', icon: 'recycle',
        credits: [
            { code: 'EF1', name: 'Resource Efficiency', icon: 'target', points: 4,
              purpose: 'Efficient use of land, infrastructure and space.',
              achieves: 'High-density apartment typology makes efficient use of land and shared infrastructure.',
              detail: 'Building up rather than out means one foundation, one roof and shared services carry many homes. Fewer materials and less land per dwelling is efficiency designed in from the master plan down.',
              photo: SIMP_PHOTOS.reiputa, photoCaption: 'Reiputa, Mt Wellington' },
            { code: 'EF2', name: 'Urban Density', icon: 'core', points: 3,
              purpose: 'Reward smaller footprints and denser urban planning.',
              achieves: 'GFA-to-footprint ratio of 5+ scores maximum points across all buildings.',
              detail: 'A gross-floor-area to footprint ratio above five puts every Simplicity building in the top density band, using scarce urban land for homes instead of sprawl.',
              photo: SIMP_PHOTOS.northcote, photoCaption: 'Lake Road, Northcote' }
        ]
    },
    {
        group: 'Healthy & Comfortable', icon: 'comfort',
        credits: [
            { code: 'HC3', name: 'Ventilation', icon: 'wind', points: 5,
              purpose: 'Control indoor moisture, cut respiratory illness and mould risk.',
              achieves: 'Continuous mechanical extract from wet rooms with passive make-up air, commissioned to spec.',
              detail: 'Kitchens and bathrooms run continuous mechanical extract, with fresh make-up air drawn in passively. Moisture leaves before it can condense, keeping air healthy and surfaces mould-free.',
              photo: null, photoCaption: 'Bathroom / wet-room ventilation' },
            { code: 'HC5', name: 'Natural Light', icon: 'sun', points: 3,
              purpose: 'Good daylight to habitable spaces.',
              achieves: 'Living and bedroom window-to-floor ratios exceed minimums (25%+ vs 15–20% required).',
              detail: 'Generous glazing to living areas and bedrooms brings daylight deep into every home, exceeding the required window-to-floor ratios and cutting daytime lighting energy.',
              photo: null, photoCaption: 'Apartment living space' },
            { code: 'HC6', name: 'Acoustic Performance', icon: 'sound', points: 3,
              purpose: 'A quieter, healthier indoor acoustic environment.',
              achieves: 'Inter-tenancy walls 5 dB better than Building Code minimum; absorptive finishes in common areas.',
              detail: 'Inter-tenancy walls and floors are detailed 5 dB beyond the Building Code minimum, with absorptive finishes in shared spaces, so neighbours stay neighbourly.',
              photo: null, photoCaption: 'Inter-tenancy construction' },
            { code: 'HC7', name: 'Healthy Materials', icon: 'roller', points: 4,
              purpose: 'Low-VOC interior finishes for better air quality.',
              achieves: 'Coatings, floor coverings, adhesives and engineered wood meet recognised low-VOC limits.',
              detail: 'Paints, flooring, adhesives and engineered timber are specified to recognised low-VOC limits, so the air residents breathe indoors is as clean as the design intends.',
              photo: null, photoCaption: 'Interior finishes' }
        ]
    },
    {
        group: 'Liveable', icon: 'nature',
        credits: [
            { code: 'LV1', name: 'Inclusive Design', icon: 'people', points: 3,
              purpose: 'Visitable, adaptable and accessible homes.',
              achieves: 'Designed to the Visitable & Adaptable Design checklists for changing occupant needs.',
              detail: 'Homes meet the Visitable and Adaptable Design checklists, so they work for guests with limited mobility today and can adapt as residents’ needs change over time.',
              photo: null, photoCaption: 'Accessible apartment layout' },
            { code: 'LV2', name: 'Occupant Amenities', icon: 'map', points: 2,
              purpose: 'Convenient day-to-day living near everyday amenities.',
              achieves: 'On-site café plus medical centre (350 m), dairy (450 m) and school (500 m) within walking distance.',
              detail: 'An on-site café and a medical centre, dairy and school all within a short walk mean daily errands rarely need a car, a quieter, lower-carbon way to live.',
              photo: SIMP_PHOTOS.waiatarua, photoCaption: 'Waiatarua, Remuera' },
            { code: 'LV3', name: 'Eco-Friendly Living', icon: 'recycle', points: 2,
              purpose: 'Designed-in recycling, composting and security.',
              achieves: 'Integrated recycling & food-waste bins, security lighting, CCTV and a residents’ forum.',
              detail: 'Recycling and food-waste collection are built into every home and common area, alongside security lighting, CCTV and a residents’ forum that keeps the community engaged.',
              photo: null, photoCaption: 'Shared resident facilities' },
            { code: 'LV5', name: 'Adaptation & Resilience', icon: 'shield', points: 2,
              purpose: 'Capacity to adapt to extreme weather and a changing climate.',
              achieves: 'Durable concrete structure + shading and drainage measures address all high climate risks to 2050.',
              detail: 'A durable concrete structure, considered shading and robust drainage mean the buildings are assessed to handle every high climate risk out to 2050, resilience that lasts.',
              photo: SIMP_PHOTOS.morningside, photoCaption: 'Morningside Drive' }
        ]
    },
    {
        group: 'Environmentally Responsible', icon: 'globe',
        credits: [
            { code: 'EN1', name: 'Renewable Energy', icon: 'energy', points: 4,
              purpose: 'Local renewable generation to cut operational emissions.',
              achieves: 'Rooftop PV offsetting dwelling and shared loads (growing with each project).',
              detail: 'Rooftop solar offsets both apartment and shared loads, turning otherwise unused roof space into clean generation, and the array grows with each successive project.',
              photo: null, photoCaption: 'Rooftop solar array' },
            { code: 'EN5', name: 'Water Sensitive Design & Ecology', icon: 'leaf', points: 4,
              purpose: 'Improve site ecology while reducing stormwater runoff and pollution.',
              achieves: 'Stormwater management plus extensive native landscaping (7,000+ plants at Waiatarua).',
              detail: 'Stormwater is managed on site and more than 7,000 native plants at Waiatarua lift local ecology, cutting runoff and pollution while greening the neighbourhood.',
              photo: SIMP_PHOTOS.waiatarua, photoCaption: 'Native landscaping, Waiatarua' },
            { code: 'EN6', name: 'Responsible Contracting', icon: 'clipboardCheck', points: 1,
              purpose: 'Best-practice environmental management during construction.',
              achieves: 'Environmental Management Plan in place; accredited trades on site.',
              detail: 'Every site runs to a documented Environmental Management Plan with accredited trades, so good environmental practice is enforced from the first day of construction.',
              photo: null, photoCaption: 'On-site construction' }
        ]
    }
];
