/* Simplicity Living — Green Star A4–A5 baseline engine
 * =====================================================================================
 * This is the NZGBC Embodied Carbon Calculator's own A4 and A5 method, reimplemented so
 * the industry default can be shown next to Simplicity's measured figure on one page.
 *
 * Every constant below was read out of the project's own submission workbook:
 *   "NZGBC-ZP102646-Embodied carbon calculator-v1_01_r02 (Ascot A).xlsm"
 * The sheet and cell each value came from is noted inline, so the workings are auditable
 * rather than asserted.
 *
 * The method in one line:
 *   A4  = tonnes × (truck km × EF_truck  +  sea km × EF_ship)
 *   A5w = tonnes × waste %  ×  disposal-route emission factor
 *   A5a = measured site fuel/power  OR, if none supplied, 25 kgCO2e per m² GFA
 *
 * Two things are worth noticing, because they are the whole reason we measure instead:
 *   1. A4 distance is a CITY-PAIR LOOKUP, not the real haul. An Auckland supplier serving
 *      an Auckland site is scored at 0 km plus a 1 km "distance from city" allowance.
 *   2. A5a is a flat per-m² allowance. It does not know, and cannot reward, how the job
 *      is actually built — programme length, plant hours, crane cycles, waste discipline.
 * =====================================================================================
 */

const GREENSTAR_A45 = (function () {
    'use strict';

    // ── Transport emission factors — DB_EFs!A2:F5 (MfE 2022 freight) ──────────────────
    const EF_TRANSPORT = {
        truck: 0.135,    // kgCO2e / tonne.km — "All trucks"
        ship:  0.01614,  // kgCO2e / tonne.km — "Container ship - Average"
        rail:  0.027     // kgCO2e / tonne.km — "Rail freight"
    };

    // ── Energy emission factors — DB_EFs!A8:F14 (MfE 2022) ───────────────────────────
    const EF_ENERGY = {
        diesel:      2.6938826722389,   // kgCO2e / L
        petrol:      2.4519317098740201,// kgCO2e / L
        electricity: 0.10717787483367899, // kgCO2e / kWh — Purchased energy 2020
        gas:         0.194421840653073  // kgCO2e / kWh
    };

    // ── Construction-waste end-of-life factors — DB_EFs!A17:F21 ──────────────────────
    // Reuse and recycling are scored at zero at A5; the burden sits in module D.
    const EF_WASTE = {
        reuse:          0,
        recycling:      0,
        energyRecovery: 0.21293565891499999, // DEFRA combustion, average construction
        landfill:       0.175928124690654,   // MfE 2022 non-municipal, average
        landfillWood:   0.14,                // MfE 2022 non-municipal, wood
        landfillInert:  0                    // MfE 2022 non-municipal, inert
    };

    // ── Default wastage rates — Lists_Bounds!D1:H37 (Material_bounds[Waste (%)]) ──────
    const WASTE_PCT = {
        concrete:     0.05,  // "Concrete (in-situ)" and "Concrete (precast)"
        steel:        0.01,  // "Steel" — also used for reinforcing steel
        timber:       0.05,  // "Timber & engineered woods"
        aggregates:   0.05,
        earth:        0,
        masonry:      0.05,
        aluminium:    0.01,
        glazing:      0.01,
        windowsDoors: 0,
        cladding:     0.05,  // "Wall cladding"
        roofing:      0.05,
        insulation:   0.05,
        linings:      0.15   // "Wall & ceiling linings" — the worst default in the table
    };

    // ── Where waste of each class ends up, per the calculator's default route split ───
    // C_Waste columns E–H (Reuse / Recycling / Recovery / Landfill) as shipped.
    const WASTE_ROUTE = {
        concrete:   { recycling: 0.00, landfill: 1.00, kind: 'inert'   },
        aggregates: { recycling: 0.00, landfill: 1.00, kind: 'inert'   },
        earth:      { recycling: 0.00, landfill: 1.00, kind: 'inert'   },
        masonry:    { recycling: 0.00, landfill: 1.00, kind: 'inert'   },
        steel:      { recycling: 0.95, landfill: 0.05, kind: 'general' },
        aluminium:  { recycling: 0.95, landfill: 0.05, kind: 'general' },
        timber:     { recycling: 0.00, landfill: 1.00, kind: 'wood'    },
        glazing:    { recycling: 0.00, landfill: 1.00, kind: 'general' },
        cladding:   { recycling: 0.00, landfill: 1.00, kind: 'inert'   },
        roofing:    { recycling: 0.00, landfill: 1.00, kind: 'general' },
        insulation: { recycling: 0.00, landfill: 1.00, kind: 'general' },
        linings:    { recycling: 0.00, landfill: 1.00, kind: 'general' }
    };

    // ── A5a site-activity default — C_Energy!B18 ─────────────────────────────────────
    // "Default of 25 kg CO2e/m2 GFA used if no other data are provided."
    // Source: RICS (2023) Whole Life Carbon Assessment for the Built Environment,
    // 2nd edition, §4.1.5 "Construction activities (A5.2)".
    const A5A_PER_M2_GFA = 25;

    // ── Road distances between NZ cities — "Distance - Warehouse to City" sheet ───────
    // Only the Auckland column is needed while Waiatarua is the project being measured.
    const TRUCK_KM_TO_AUCKLAND = {
        'Auckland': 0,       'Christchurch': 1073, 'Dunedin': 1428,
        'Gisborne': 480,     'Hamilton': 121,      'Invercargill': 1631,
        'Napier-Hastings': 412, 'Nelson': 848,     'New Plymouth': 359,
        'Palmerston North': 514, 'Rotorua': 228,   'Tauranga': 200,
        'Wellington': 645,   'Whanganui': 445,     'Whangarei': 158
    };

    // Metadata!B8 "Distance from city" — added to every truck leg, including local ones.
    const LAST_MILE_KM = 1;

    const n = (x) => { const f = parseFloat(x); return isFinite(f) ? f : 0; };

    // ── A4: transport of the product to site ─────────────────────────────────────────
    // GWPT A4 = EF_ship × tonnes × ship km  +  EF_truck × tonnes × truck km
    // Note what is absent: no wastage uplift and no load-factor. Green Star carries the
    // wastage tonnage at A5 instead, and assumes every truck is a full one.
    function a4Line(m) {
        const t = n(m.tonnes);
        const truckKm = m.truckKm != null
            ? n(m.truckKm)
            : (TRUCK_KM_TO_AUCKLAND[m.source] != null ? TRUCK_KM_TO_AUCKLAND[m.source] : 0) + LAST_MILE_KM;
        const seaKm = n(m.seaKm);
        const road = t * truckKm * EF_TRANSPORT.truck;
        const sea  = t * seaKm * EF_TRANSPORT.ship;
        return {
            label: m.label,
            tonnes: t,
            source: m.source || 'Auckland',
            truckKm: truckKm,
            seaKm: seaKm,
            road: road,
            sea: sea,
            total: road + sea,
            formula: seaKm > 0
                ? `${t.toFixed(1)} t × ${seaKm.toLocaleString()} km × ${EF_TRANSPORT.ship} + ${t.toFixed(1)} t × ${truckKm} km × ${EF_TRANSPORT.truck}`
                : `${t.toFixed(1)} t × ${truckKm} km × ${EF_TRANSPORT.truck} kg/t·km`
        };
    }

    // ── A5w: the wastage allowance, routed to its disposal fate ──────────────────────
    function a5wLine(m) {
        const cls = m.cls || 'concrete';
        const pct = WASTE_PCT[cls] != null ? WASTE_PCT[cls] : 0.05;
        const route = WASTE_ROUTE[cls] || WASTE_ROUTE.concrete;
        const wasteT = n(m.tonnes) * pct;
        const landfillEF = route.kind === 'wood'  ? EF_WASTE.landfillWood
                         : route.kind === 'inert' ? EF_WASTE.landfillInert
                         : EF_WASTE.landfill;
        const total = wasteT * 1000 * (route.landfill * landfillEF + route.recycling * EF_WASTE.recycling);
        return {
            label: m.label,
            cls: cls,
            wastePct: pct,
            wasteT: wasteT,
            route: route,
            landfillEF: landfillEF,
            total: total,
            formula: `${n(m.tonnes).toFixed(1)} t × ${(pct * 100).toFixed(0)}% waste × ` +
                     `${(route.landfill * 100).toFixed(0)}% to landfill × ${landfillEF.toFixed(3)} kg/kg`
        };
    }

    // ── A5a: site activities ─────────────────────────────────────────────────────────
    // Measured fuel and power if the project supplies it; otherwise the flat allowance.
    function a5a(gfa, measured) {
        if (measured && (measured.diesel || measured.petrol || measured.electricity || measured.gas)) {
            const total = n(measured.diesel) * EF_ENERGY.diesel
                        + n(measured.petrol) * EF_ENERGY.petrol
                        + n(measured.electricity) * EF_ENERGY.electricity
                        + n(measured.gas) * EF_ENERGY.gas;
            return { basis: 'measured', gfa: n(gfa), total: total,
                     formula: 'measured site fuel & power × MfE 2022 factors' };
        }
        return {
            basis: 'default',
            gfa: n(gfa),
            total: n(gfa) * A5A_PER_M2_GFA,
            formula: `${Math.round(n(gfa)).toLocaleString()} m² GFA × ${A5A_PER_M2_GFA} kgCO₂e/m²`
        };
    }

    /* Run the whole method over one element's material inventory.
     *
     * inventory = {
     *   materials: [ { label, tonnes, cls, source?, truckKm?, seaKm? } ],
     *   gfaShare:  m² of GFA this element is charged with for the A5a allowance,
     *   unit:      the element's own denominator (m² wall, m² floor, …)
     * }
     */
    function run(inventory) {
        if (!inventory || !inventory.materials) return null;
        const a4 = inventory.materials.map(a4Line);
        const a5w = inventory.materials.map(a5wLine);
        const site = a5a(inventory.gfaShare, inventory.measured);

        const sum = (arr) => arr.reduce((s, x) => s + x.total, 0);
        const a4Total = sum(a4);
        const a5Total = sum(a5w) + site.total;
        const denom = n(inventory.unit) > 0 ? n(inventory.unit) : 1;

        return {
            a4: a4, a5w: a5w, a5a: site,
            a4Total: a4Total,
            a5wTotal: sum(a5w),
            a5Total: a5Total,
            total: a4Total + a5Total,
            perUnit: (a4Total + a5Total) / denom,
            a4PerUnit: a4Total / denom,
            a5PerUnit: a5Total / denom
        };
    }

    return {
        EF_TRANSPORT: EF_TRANSPORT,
        EF_ENERGY: EF_ENERGY,
        EF_WASTE: EF_WASTE,
        WASTE_PCT: WASTE_PCT,
        WASTE_ROUTE: WASTE_ROUTE,
        A5A_PER_M2_GFA: A5A_PER_M2_GFA,
        TRUCK_KM_TO_AUCKLAND: TRUCK_KM_TO_AUCKLAND,
        LAST_MILE_KM: LAST_MILE_KM,
        a4Line: a4Line,
        a5wLine: a5wLine,
        a5a: a5a,
        run: run,
        SOURCE: 'NZGBC Embodied Carbon Calculator v1.01 r02 — ' +
                'transport & energy factors MfE 2022; A5 site-activity default RICS 2023 (2nd ed) §4.1.5'
    };
})();
