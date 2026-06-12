// Simplicity Living - shared client-side SQLite database (sql.js)
// One database, persisted to localStorage, used by every page:
//   lca_results     -> embodied-carbon.html breakdown charts
//   energy_results  -> energy.html comparison charts
//   waste_results   -> waste.html case-study cards
//   assessments     -> scoring.html results viewer
// The admin page (admin.html) provides CRUD over all tables plus
// .sqlite export/import. Data seeds itself on first run.

const SIMPLICITY_DB_KEY = 'simplicity_db_v1';
const LEGACY_DB_KEY = 'simplicity_scoring_db_v1';

// The four real Simplicity Living projects, in delivery order
const SIMPLICITY_PROJECTS = [
    { name: 'Reiputa',           location: 'Mt Wellington' },
    { name: 'Waiatarua',         location: 'Remuera' },
    { name: 'Lake Road',         location: 'Northcote' },
    { name: 'Morningside Drive', location: 'Morningside' }
];

const SCORING_CATEGORIES = [
    { id: 'energy',     name: 'Energy Use' },
    { id: 'ieq',        name: 'Indoor Environment Quality' },
    { id: 'carbon',     name: 'Embodied Carbon' },
    { id: 'site',       name: 'Sustainable Materials' },        // DB col 'site' repurposed
    { id: 'water',      name: 'Water Use' },
    { id: 'waste',      name: 'Construction Waste Minimisation' },
    { id: 'innovation', name: 'Sustainable Transport' }          // DB col 'innovation' repurposed
];
const SCORING_MAX_PER_CATEGORY = 20;

let SQL = null;
let db = null;
let dbReadyPromise = null;

// ---------------------------------------------------------------------------
// Init / persistence
// ---------------------------------------------------------------------------
function initSimplicityDb() {
    if (dbReadyPromise) return dbReadyPromise;
    dbReadyPromise = (async () => {
        SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });
        const saved = localStorage.getItem(SIMPLICITY_DB_KEY) || localStorage.getItem(LEGACY_DB_KEY);
        db = saved ? new SQL.Database(base64ToBytes(saved)) : new SQL.Database();
        ensureSchema();
        seedIfEmpty();
        persistDb();
        return db;
    })();
    return dbReadyPromise;
}

function ensureSchema() {
    db.run(`
        CREATE TABLE IF NOT EXISTS assessments (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            location     TEXT,
            assessor     TEXT,
            notes        TEXT,
            total_score  INTEGER NOT NULL,
            rating       TEXT,
            energy       INTEGER,
            carbon       INTEGER,
            waste        INTEGER,
            water        INTEGER,
            ieq          INTEGER,
            site         INTEGER,
            innovation   INTEGER,
            answers_json TEXT,
            created_at   TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS lca_results (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            location     TEXT,
            a1a3         REAL NOT NULL DEFAULT 0,
            a4a5         REAL NOT NULL DEFAULT 0,
            b1b7         REAL NOT NULL DEFAULT 0,
            c1c4         REAL NOT NULL DEFAULT 0,
            d            REAL NOT NULL DEFAULT 0,
            sort_order   INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS energy_results (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            grp          TEXT NOT NULL DEFAULT 'project',  -- 'scenario' | 'project'
            label        TEXT NOT NULL,
            sub_label    TEXT,
            heating      REAL NOT NULL DEFAULT 0,   -- kWh/m2/yr
            cooling      REAL NOT NULL DEFAULT 0,
            lighting     REAL NOT NULL DEFAULT 0,
            equipment    REAL NOT NULL DEFAULT 0,
            annual_cost  REAL NOT NULL DEFAULT 0,   -- $/m2/yr energy cost
            initial_cost REAL NOT NULL DEFAULT 0,   -- relative initial cost index (baseline=100)
            highlight    INTEGER NOT NULL DEFAULT 0,
            sort_order   INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS waste_results (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name   TEXT NOT NULL,
            location       TEXT,
            waste_volume   REAL NOT NULL DEFAULT 0,  -- m3
            floor_area     REAL NOT NULL DEFAULT 1,  -- m2
            sort_order     INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS a4a5_projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            location    TEXT,
            data_json   TEXT,           -- full calculator state (materials, levers, A5 scenario)
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
    `);
}

function tableEmpty(name) {
    const res = db.exec(`SELECT COUNT(*) FROM ${name}`);
    return !res.length || res[0].values[0][0] === 0;
}

function seedIfEmpty() {
    const P = SIMPLICITY_PROJECTS;

    if (tableEmpty('lca_results')) {
        const rows = [
            [P[0].name, P[0].location, 380, 48, 280, 125, -35, 1],
            [P[1].name, P[1].location, 350, 46, 265, 115, -35, 2],
            [P[2].name, P[2].location, 320, 44, 245, 105, -35, 3],
            [P[3].name, P[3].location, 290, 42, 225,  95, -35, 4]
        ];
        const st = db.prepare('INSERT INTO lca_results (project_name, location, a1a3, a4a5, b1b7, c1c4, d, sort_order) VALUES (?,?,?,?,?,?,?,?)');
        rows.forEach(r => st.run(r));
        st.free();
    }

    if (tableEmpty('energy_results')) {
        const rows = [
            // grp, label, sub_label, heating, cooling, lighting, equipment, annual_cost, initial_cost, highlight, sort
            ['scenario', 'Baseline', 'Code-minimum traditional', 85, 42, 28, 35, 52, 100, 0, 1],
            ['scenario', 'Enhanced Standard', 'Better insulation & windows', 72, 38, 25, 30, 45, 115, 0, 2],
            ['scenario', 'CLT Building', 'Cross-laminated timber', 60, 33, 24, 28, 40, 155, 0, 3],
            ['scenario', 'Simplicity Building', 'Lake Road, Northcote', 45, 23, 19, 18, 35, 125, 1, 4],
            ['project', 'Reiputa', 'Mt Wellington', 52, 26, 21, 21, 40, 120, 0, 1],
            ['project', 'Waiatarua', 'Remuera', 49, 25, 21, 20, 38, 118, 0, 2],
            ['project', 'Lake Road', 'Northcote', 45, 23, 19, 18, 35, 115, 0, 3],
            ['project', 'Morningside Drive', 'Morningside', 40, 21, 18, 16, 32, 112, 1, 4]
        ];
        const st = db.prepare('INSERT INTO energy_results (grp, label, sub_label, heating, cooling, lighting, equipment, annual_cost, initial_cost, highlight, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        rows.forEach(r => st.run(r));
        st.free();
    }

    if (tableEmpty('waste_results')) {
        const rows = [
            [P[0].name, P[0].location, 32, 680, 1],
            [P[1].name, P[1].location, 28, 550, 2],
            [P[2].name, P[2].location, 25, 720, 3],
            [P[3].name, P[3].location, 18, 610, 4]
        ];
        const st = db.prepare('INSERT INTO waste_results (project_name, location, waste_volume, floor_area, sort_order) VALUES (?,?,?,?,?)');
        rows.forEach(r => st.run(r));
        st.free();
    }

    if (tableEmpty('assessments')) {
        // Per-category notes grounded in the Ascot Waiatarua green-rating assessment.
        // Keys are DB columns; 'site' = Sustainable Materials, 'innovation' = Sustainable Transport.
        const notes = {
            energy: 'Modelled in the ECCHO tool; high-COP R32 heat pumps (COP 4.0–5.2) for heating & hot water, no on-site fossil fuels. Rooftop PV offsets a growing share of shared loads.',
            ieq: 'Thermally-broken windows (frame R ≥ 0.25) and a well-insulated concrete envelope keep winter heating demand low; shading and ceiling fans manage summer overheating; continuous wet-room extract controls moisture.',
            carbon: 'Full A–D lifecycle assessment via BRANZ LCAQuick; over 20% embodied-carbon reduction demonstrated on the Green Star pathway using the optimised in-situ / precast structure.',
            site: 'Materials schedule run through the recognised materials calculator with EPDs and certifications for the major materials — Ascot achieved full marks on this credit (10/10).',
            water: 'WELS-rated low-flow fittings plus per-apartment metering bring consumption under the high-performance threshold (≤ 132 L/person/day); rainwater harvesting offsets further demand.',
            waste: 'A documented waste-management plan applied consistently across projects; systemised, repetitive design keeps the real waste factor far below the 5–10% industry default.',
            innovation: 'Cycleway within 300 m and public transport within 800 m; 168 secure cycle parks provided vs 141 required; on-site café plus medical centre (350 m), dairy (450 m) and school (500 m) within walking distance; EV charging expanding.'
        };
        const notesJson = JSON.stringify({ notes });

        // Seed results for the 4 projects. Score order:
        // [energy, carbon, waste, water, ieq, site(materials), innovation(transport)]
        const seeds = [
            { p: P[0], scores: [12, 11, 14, 10, 13, 15, 14], date: '2026-01-15T09:00:00.000Z' },
            { p: P[1], scores: [14, 13, 15, 12, 14, 17, 16], date: '2026-03-10T09:00:00.000Z' },
            { p: P[2], scores: [13, 15, 16, 13, 14, 18, 17], date: '2026-04-22T09:00:00.000Z' },
            { p: P[3], scores: [16, 17, 17, 14, 15, 19, 18], date: '2026-06-05T09:00:00.000Z' }
        ];
        const st = db.prepare(`INSERT INTO assessments
            (project_name, location, assessor, notes, total_score, rating,
             energy, carbon, waste, water, ieq, site, innovation, answers_json, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        seeds.forEach(s => {
            const total = s.scores.reduce((a, b) => a + b, 0);
            st.run([
                s.p.name, s.p.location, 'Simplicity Team', 'Green-rating-aligned assessment (Ascot-based)',
                total, null,
                s.scores[0], s.scores[1], s.scores[2], s.scores[3], s.scores[4], s.scores[5], s.scores[6],
                notesJson, s.date
            ]);
        });
        st.free();
    }

    if (tableEmpty('a4a5_projects')) {
        const now = new Date().toISOString();
        // Example Auckland high-rise so the calculator opens with something to explore
        const exampleData = {
            gfa: 9500, storeys: 10, apartmentsPerFloor: 12, buildings: 3,
            materials: [
                { material: 'concrete',     qty: 3200, origin: 'Auckland' },
                { material: 'rebar',        qty: 480,  origin: 'Auckland' },
                { material: 'struct_steel', qty: 220,  origin: 'China' },
                { material: 'glazing',      qty: 310,  origin: 'China' },
                { material: 'cladding',     qty: 260,  origin: 'Auckland' },
                { material: 'plasterboard', qty: 540,  origin: 'Auckland' },
                { material: 'services',     qty: 180,  origin: 'China' }
            ],
            a5Scenario: 'simplicity'
        };
        const st = db.prepare('INSERT INTO a4a5_projects (name, location, data_json, created_at, updated_at) VALUES (?,?,?,?,?)');
        st.run(['Lake Road (example)', 'Northcote', JSON.stringify(exampleData), now, now]);
        st.free();
    }
}

function persistDb() {
    localStorage.setItem(SIMPLICITY_DB_KEY, bytesToBase64(db.export()));
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------
// Returns rows as array of plain objects
function dbQuery(sql, params) {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    const out = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    stmt.free();
    return out;
}

function dbRun(sql, params) {
    const stmt = db.prepare(sql);
    stmt.run(params || []);
    stmt.free();
    persistDb();
}

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------
function exportSimplicityDb() {
    const blob = new Blob([db.export()], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simplicity-data-${new Date().toISOString().split('T')[0]}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
}

function importSimplicityDb(file, onDone) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            db = new SQL.Database(new Uint8Array(reader.result));
            ensureSchema();
            persistDb();
            if (onDone) onDone(null);
        } catch (err) {
            if (onDone) onDone(err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function resetSimplicityDb() {
    db = new SQL.Database();
    ensureSchema();
    seedIfEmpty();
    persistDb();
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
