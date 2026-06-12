// Simplicity Living - Admin page
// UI-only password gate (password: "Simple") + CRUD editors over every table
// in the shared client-side SQLite database.

const ADMIN_PASSWORD = 'Simple';
const ADMIN_SESSION_KEY = 'simplicity_admin_ok';

// ---------------------------------------------------------------------------
// Table editor configs
// ---------------------------------------------------------------------------
const TABLE_CONFIGS = {
    scoring: {
        table: 'assessments',
        orderBy: "datetime(created_at) ASC, id ASC",
        columns: [
            { key: 'project_name', label: 'Project', type: 'text', width: '150px' },
            { key: 'location', label: 'Location', type: 'text', width: '120px' },
            { key: 'assessor', label: 'Assessor', type: 'text', width: '110px' },
            { key: 'energy', label: '⚡ Energy', type: 'score' },
            { key: 'ieq', label: '🏠 IEQ', type: 'score' },
            { key: 'carbon', label: '🏗️ Carbon', type: 'score' },
            { key: 'site', label: '🧱 Materials', type: 'score' },
            { key: 'water', label: '💧 Water', type: 'score' },
            { key: 'waste', label: '♻️ Waste', type: 'score' },
            { key: 'innovation', label: '🚌 Transport', type: 'score' },
            { key: 'total_score', label: 'Total', type: 'computed' },
            { key: 'notes', label: 'Notes', type: 'text', width: '160px' },
            { key: 'created_at', label: 'Date', type: 'date' }
        ],
        defaults: { project_name: '', location: '', assessor: '', notes: '',
                    energy: 0, carbon: 0, waste: 0, water: 0, ieq: 0, site: 0, innovation: 0 },
        beforeSave(values) {
            const cats = ['energy', 'carbon', 'waste', 'water', 'ieq', 'site', 'innovation'];
            cats.forEach(c => values[c] = clamp(Number(values[c]) || 0, 0, 20));
            values.total_score = cats.reduce((s, c) => s + values[c], 0);
            if (!values.created_at) values.created_at = new Date().toISOString();
            return values;
        }
    },
    lca: {
        table: 'lca_results',
        orderBy: 'sort_order, id',
        columns: [
            { key: 'project_name', label: 'Project', type: 'text', width: '150px' },
            { key: 'location', label: 'Location', type: 'text', width: '120px' },
            { key: 'a1a3', label: 'A1-A3 Product', type: 'number' },
            { key: 'a4a5', label: 'A4-A5 Constr.', type: 'number' },
            { key: 'b1b7', label: 'B1-B7 Use', type: 'number' },
            { key: 'c1c4', label: 'C1-C4 End', type: 'number' },
            { key: 'd', label: 'D Beyond', type: 'number' },
            { key: 'total', label: 'Total A-D', type: 'computedLca' },
            { key: 'sort_order', label: 'Order', type: 'number', width: '60px' }
        ],
        defaults: { project_name: '', location: '', a1a3: 0, a4a5: 0, b1b7: 0, c1c4: 0, d: 0, sort_order: 99 }
    },
    energy: {
        table: 'energy_results',
        orderBy: "grp DESC, sort_order, id",
        columns: [
            { key: 'grp', label: 'Group', type: 'select', options: ['scenario', 'project'], width: '95px' },
            { key: 'label', label: 'Label', type: 'text', width: '150px' },
            { key: 'sub_label', label: 'Sub-label', type: 'text', width: '140px' },
            { key: 'heating', label: 'Heating', type: 'number' },
            { key: 'cooling', label: 'Cooling', type: 'number' },
            { key: 'lighting', label: 'Lighting', type: 'number' },
            { key: 'equipment', label: 'Equip.', type: 'number' },
            { key: 'annual_cost', label: '$ /m²/yr', type: 'number' },
            { key: 'initial_cost', label: 'Cost idx', type: 'number' },
            { key: 'highlight', label: 'Highlight', type: 'checkbox', width: '70px' },
            { key: 'sort_order', label: 'Order', type: 'number', width: '60px' }
        ],
        defaults: { grp: 'project', label: '', sub_label: '', heating: 0, cooling: 0, lighting: 0,
                    equipment: 0, annual_cost: 0, initial_cost: 100, highlight: 0, sort_order: 99 }
    },
    waste: {
        table: 'waste_results',
        orderBy: 'sort_order, id',
        columns: [
            { key: 'project_name', label: 'Project', type: 'text', width: '150px' },
            { key: 'location', label: 'Location', type: 'text', width: '130px' },
            { key: 'waste_volume', label: 'Waste (m³)', type: 'number' },
            { key: 'floor_area', label: 'Floor (m²)', type: 'number' },
            { key: 'height', label: 'Height (mm)', type: 'computedWaste' },
            { key: 'sort_order', label: 'Order', type: 'number', width: '60px' }
        ],
        defaults: { project_name: '', location: '', waste_volume: 0, floor_area: 1, sort_order: 99 }
    }
};

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------
function checkGate() {
    const input = document.getElementById('gatePassword');
    if (input.value === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
        document.getElementById('adminGate').style.display = 'none';
    } else {
        document.getElementById('gateError').textContent = 'Incorrect password.';
        input.select();
    }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
        document.getElementById('adminGate').style.display = 'none';
    } else {
        document.getElementById('gatePassword').focus();
    }
    try {
        await initSimplicityDb();
        document.getElementById('adminStatus').textContent = 'Database ready — changes save instantly to this browser. Export from the Database tab to back up.';
        Object.keys(TABLE_CONFIGS).forEach(renderTable);
    } catch (err) {
        console.error(err);
        const el = document.getElementById('adminStatus');
        el.textContent = 'Could not load the database engine (needs internet on first load).';
        el.style.color = '#dc3545';
    }
});

function showTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-' + tab).style.display = 'block';
}

// ---------------------------------------------------------------------------
// Generic table editor
// ---------------------------------------------------------------------------
function renderTable(cfgKey) {
    const cfg = TABLE_CONFIGS[cfgKey];
    const tableEl = document.getElementById('table-' + cfgKey);
    if (!tableEl) return;

    const rows = dbQuery(`SELECT * FROM ${cfg.table} ORDER BY ${cfg.orderBy}`);

    let html = '<thead><tr>';
    cfg.columns.forEach(c => html += `<th>${c.label}</th>`);
    html += '<th></th></tr></thead><tbody>';
    tableEl.innerHTML = html + '</tbody>';
    const tbody = tableEl.querySelector('tbody');

    rows.forEach(row => tbody.appendChild(buildRowEditor(cfgKey, row)));
}

function buildRowEditor(cfgKey, row) {
    const cfg = TABLE_CONFIGS[cfgKey];
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    cfg.columns.forEach(col => {
        const td = document.createElement('td');
        const val = row[col.key];
        switch (col.type) {
            case 'computed':
                td.innerHTML = `<span class="db-score-pill" data-computed="${col.key}">${val != null ? val : ''}</span>`;
                break;
            case 'computedLca': {
                const total = Math.round((row.a1a3 || 0) + (row.a4a5 || 0) + (row.b1b7 || 0) + (row.c1c4 || 0) + (row.d || 0));
                td.innerHTML = `<span class="db-score-pill" data-computed="total">${total}</span>`;
                break;
            }
            case 'computedWaste': {
                const h = Math.round(((row.waste_volume || 0) / (row.floor_area || 1)) * 1000);
                td.innerHTML = `<span class="db-score-pill" data-computed="height">${h}</span>`;
                break;
            }
            case 'date': {
                const d = val ? new Date(val) : null;
                td.innerHTML = `<input type="date" data-key="${col.key}" value="${d ? d.toISOString().split('T')[0] : ''}">`;
                break;
            }
            case 'select': {
                const opts = col.options.map(o =>
                    `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('');
                td.innerHTML = `<select data-key="${col.key}">${opts}</select>`;
                break;
            }
            case 'checkbox':
                td.style.textAlign = 'center';
                td.innerHTML = `<input type="checkbox" data-key="${col.key}" ${val ? 'checked' : ''}>`;
                break;
            case 'score':
                td.innerHTML = `<input type="number" min="0" max="20" step="1" data-key="${col.key}" value="${val != null ? val : 0}" class="num score">`;
                break;
            case 'number':
                td.innerHTML = `<input type="number" step="any" data-key="${col.key}" value="${val != null ? val : 0}" class="num"${col.width ? ` style="width:${col.width}"` : ''}>`;
                break;
            default:
                td.innerHTML = `<input type="text" data-key="${col.key}" value="${escapeHtml(val)}"${col.width ? ` style="width:${col.width}"` : ''}>`;
        }
        tr.appendChild(td);
    });

    const actions = document.createElement('td');
    actions.style.whiteSpace = 'nowrap';
    actions.style.textAlign = 'right';
    actions.innerHTML = `
        <button class="db-btn-sm" onclick="saveRow('${cfgKey}', this)">Save</button>
        <button class="db-btn-sm db-btn-danger" onclick="deleteRow('${cfgKey}', this)">Delete</button>
    `;
    tr.appendChild(actions);
    return tr;
}

function collectRowValues(cfgKey, tr) {
    const cfg = TABLE_CONFIGS[cfgKey];
    const values = {};
    cfg.columns.forEach(col => {
        const input = tr.querySelector(`[data-key="${col.key}"]`);
        if (!input) return; // computed column
        if (col.type === 'checkbox') values[col.key] = input.checked ? 1 : 0;
        else if (col.type === 'number' || col.type === 'score') values[col.key] = Number(input.value) || 0;
        else if (col.type === 'date') values[col.key] = input.value ? new Date(input.value + 'T09:00:00').toISOString() : '';
        else values[col.key] = input.value;
    });
    return values;
}

function saveRow(cfgKey, btn) {
    const cfg = TABLE_CONFIGS[cfgKey];
    const tr = btn.closest('tr');
    let values = collectRowValues(cfgKey, tr);
    if (cfg.beforeSave) values = cfg.beforeSave(values);

    const keys = Object.keys(values);
    const sql = `UPDATE ${cfg.table} SET ${keys.map(k => k + ' = ?').join(', ')} WHERE id = ?`;
    dbRun(sql, [...keys.map(k => values[k]), Number(tr.dataset.id)]);

    renderTable(cfgKey);
    flashStatus('Saved.');
}

function deleteRow(cfgKey, btn) {
    if (!confirm('Delete this row? This cannot be undone (export a backup first if unsure).')) return;
    const cfg = TABLE_CONFIGS[cfgKey];
    const tr = btn.closest('tr');
    dbRun(`DELETE FROM ${cfg.table} WHERE id = ?`, [Number(tr.dataset.id)]);
    renderTable(cfgKey);
    flashStatus('Row deleted.');
}

function addRow(cfgKey) {
    const cfg = TABLE_CONFIGS[cfgKey];
    let values = Object.assign({}, cfg.defaults);
    if (cfg.beforeSave) values = cfg.beforeSave(values);
    const keys = Object.keys(values);
    dbRun(
        `INSERT INTO ${cfg.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        keys.map(k => values[k])
    );
    renderTable(cfgKey);
    flashStatus('Row added — fill it in and press Save.');
}

// ---------------------------------------------------------------------------
// Database tab
// ---------------------------------------------------------------------------
function adminImport(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    importSimplicityDb(file, err => {
        if (err) { alert('That file could not be read as a SQLite database.'); return; }
        Object.keys(TABLE_CONFIGS).forEach(renderTable);
        flashStatus(`Imported "${file.name}".`);
    });
    input.value = '';
}

function adminReset() {
    if (!confirm('Replace ALL data with the original seed data? Export a backup first if unsure.')) return;
    resetSimplicityDb();
    Object.keys(TABLE_CONFIGS).forEach(renderTable);
    flashStatus('Database reset to seed data.');
}

function flashStatus(msg) {
    const el = document.getElementById('adminStatus');
    el.textContent = msg;
    el.style.color = '#28a745';
    setTimeout(() => {
        el.textContent = 'Database ready — changes save instantly to this browser. Export from the Database tab to back up.';
        el.style.color = '';
    }, 2500);
}
