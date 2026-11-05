// Simplicity Living - Admin page
// Password gate + Supabase admin-email auto-unlock + CRUD editors + analytics

const ADMIN_PASSWORD = 'Simple';
const ADMIN_SESSION_KEY = 'simplicity_admin_ok';
const ADMIN_EMAILS = ['eoinm@nezo-app.com'];

// ---------------------------------------------------------------------------
// Table editor configs
// ---------------------------------------------------------------------------
const TABLE_CONFIGS = {
    // Scoring assessments are now edited with the dedicated per-criterion Benchmark
    // editor (renderBenchmarkEditor) rather than the generic /20 table, because the
    // v0.2 methodology calculates each module UPWARD from criterion evidence.
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
function _unlockAdmin() {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    document.getElementById('adminGate').style.display = 'none';
}

window._checkAdminAuth = function (user) {
    if (user && ADMIN_EMAILS.includes(user.email)) _unlockAdmin();
};

function checkGate() {
    const input = document.getElementById('gatePassword');
    if (input.value === ADMIN_PASSWORD) {
        _unlockAdmin();
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
        renderBenchmarkEditor();
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
    if (tab === 'analytics') renderAnalytics();
    if (tab === 'scoring') renderBenchmarkEditor();
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
        renderBenchmarkEditor();
        flashStatus(`Imported "${file.name}".`);
    });
    input.value = '';
}

function adminReset() {
    if (!confirm('Replace ALL data with the original seed data? Export a backup first if unsure.')) return;
    resetSimplicityDb();
    Object.keys(TABLE_CONFIGS).forEach(renderTable);
    renderBenchmarkEditor();
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

// ---------------------------------------------------------------------------
// Analytics panel
// ---------------------------------------------------------------------------
async function renderAnalytics() {
    const panel = document.getElementById('panel-analytics');
    if (!panel) return;
    if (!window.sbLoadAnalytics) {
        panel.innerHTML = '<p class="admin-note" style="color:#dc3545;">Analytics not available — sign in to your admin account first.</p>';
        return;
    }
    panel.innerHTML = '<p class="admin-note">Loading analytics…</p>';

    const { data: events, error } = await window.sbLoadAnalytics(30);
    if (error) {
        panel.innerHTML = `<p class="admin-note" style="color:#dc3545;">Could not load: ${error.message}</p>`;
        return;
    }
    const rows = events || [];

    const uniqueAnons = new Set(rows.map(e => e.anon_id)).size;
    const uniqueUsers = new Set(rows.filter(e => e.user_id).map(e => e.user_id)).size;
    const pageViews   = rows.filter(e => e.event === 'page_view');
    const toolRows    = rows.filter(e => e.event !== 'page_view');

    const pageCounts = {};
    pageViews.forEach(e => { pageCounts[e.page] = (pageCounts[e.page] || 0) + 1; });
    const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const toolCounts = {};
    toolRows.forEach(e => { toolCounts[e.event] = (toolCounts[e.event] || 0) + 1; });

    const userAct = {};
    rows.filter(e => e.user_id).forEach(e => {
        if (!userAct[e.user_id]) userAct[e.user_id] = { events: 0, tools: new Set() };
        userAct[e.user_id].events++;
        if (e.event !== 'page_view') userAct[e.user_id].tools.add(e.event);
    });

    panel.innerHTML = `
        <h2 class="section-title">App Analytics <span style="font-size:0.8rem;font-weight:400;color:#888;">(last 30 days)</span></h2>

        <div class="analytics-stats">
            <div class="analytics-stat">
                <span class="analytics-num">${uniqueAnons}</span>
                <span class="analytics-lbl">Unique Visitors</span>
            </div>
            <div class="analytics-stat">
                <span class="analytics-num">${uniqueUsers}</span>
                <span class="analytics-lbl">Signed-In Users</span>
            </div>
            <div class="analytics-stat">
                <span class="analytics-num">${pageViews.length}</span>
                <span class="analytics-lbl">Page Views</span>
            </div>
            <div class="analytics-stat">
                <span class="analytics-num">${toolRows.length}</span>
                <span class="analytics-lbl">Tool Actions</span>
            </div>
        </div>

        <div class="analytics-grid">
            <div>
                <h3 class="analytics-sub">Page Popularity</h3>
                ${topPages.length
                    ? topPages.map(([p, n]) => `<div class="analytics-row"><span>${p || 'home'}</span><strong>${n}</strong></div>`).join('')
                    : '<p class="admin-note">No page view data yet.</p>'}
            </div>
            <div>
                <h3 class="analytics-sub">Tool Actions</h3>
                ${Object.entries(toolCounts).length
                    ? Object.entries(toolCounts).sort((a,b) => b[1]-a[1]).map(([ev, n]) => `<div class="analytics-row"><span>${ev}</span><strong>${n}</strong></div>`).join('')
                    : '<p class="admin-note">No tool events yet.</p>'}
            </div>
        </div>

        <h3 class="analytics-sub" style="margin-top:1.75rem;">Signed-In User Activity</h3>
        ${Object.keys(userAct).length
            ? `<div class="db-table-wrap"><table class="db-table admin-table" style="font-size:0.85rem;">
                <thead><tr><th>User ID</th><th>Events</th><th>Tools Used</th></tr></thead>
                <tbody>${Object.entries(userAct).map(([uid, a]) =>
                    `<tr>
                        <td style="font-family:monospace;font-size:0.78rem;">${uid.slice(0,18)}…</td>
                        <td>${a.events}</td>
                        <td>${[...a.tools].join(', ') || '—'}</td>
                    </tr>`).join('')}
                </tbody>
               </table></div>`
            : '<p class="admin-note">No signed-in user activity yet.</p>'}

        <div style="margin-top:1.25rem;">
            <button class="promo-btn db-btn-secondary" onclick="renderAnalytics()">↺ Refresh</button>
        </div>`;
}

// ===========================================================================
// Benchmark (scoring) editor — per-criterion evidence capture (v0.2)
// ---------------------------------------------------------------------------
// The v0.2 methodology scores each module UPWARD from criterion evidence, so
// this editor collects the measured inputs per criterion, live-computes points
// through the shared engine (scoreCriterion / scoreModule), and on save writes
// the per-criterion data to answers_json.criteria and the computed module
// scores + total back to the assessments columns (keeping the charts working).
// ===========================================================================
let benchSelectedId = null;

function benchAssessments() {
    return dbQuery('SELECT * FROM assessments ORDER BY datetime(created_at) ASC, id ASC');
}

function benchParseAnswers(row) {
    try { return JSON.parse(row.answers_json || '{}'); } catch (e) { return {}; }
}

// A criterion is "not assessed" when flagged, or when no measured data is stored.
function benchIsNa(crit, data) {
    if (!data || data.notAssessed) return true;
    switch (crit.type) {
        case 'ladder':      return data.value === undefined || data.value === null || data.value === '';
        case 'count':       return data.count === undefined || data.count === null || data.count === '';
        case 'levels':      return data.level === undefined || data.level === null || data.level === '';
        case 'additive':    return data.items === undefined;
        case 'transportPT': return (data.distance === undefined || data.distance === '') &&
                                    (data.interval === undefined || data.interval === '');
        default:            return true;
    }
}

function renderBenchmarkEditor() {
    const panel = document.getElementById('benchmarkEditor');
    if (!panel || typeof BENCHMARK_MODULES === 'undefined') return;
    const rows = benchAssessments();
    if (!rows.some(r => r.id === benchSelectedId)) benchSelectedId = rows.length ? rows[rows.length - 1].id : null;

    const chips = rows.map(r =>
        `<button type="button" class="bench-chip${r.id === benchSelectedId ? ' active' : ''}" onclick="benchSelect(${r.id})">` +
        `${escapeHtml(r.project_name || 'Untitled')}<small>${escapeHtml(r.location || '')}</small></button>`).join('');

    panel.innerHTML =
        `<div class="bench-bar">${chips}` +
        `<button type="button" class="bench-chip bench-add" onclick="benchNew()">+ New assessment</button></div>` +
        `<div id="benchForm"></div>`;

    const row = rows.find(r => r.id === benchSelectedId);
    if (row) renderBenchForm(row);
    else document.getElementById('benchForm').innerHTML = '<p class="admin-note">No assessments yet. Add one to begin capturing evidence.</p>';
    if (typeof hydrateIcons === 'function') hydrateIcons(panel);
}

function benchSelect(id) { benchSelectedId = id; renderBenchmarkEditor(); }

function benchNew() {
    const now = new Date().toISOString();
    const answers = JSON.stringify({ methodology: '0.2', stage: 'forecast', criteria: {}, moduleMeta: {}, notes: {} });
    dbRun(
        'INSERT INTO assessments (project_name,location,assessor,notes,total_score,rating,energy,carbon,waste,water,ieq,site,innovation,answers_json,created_at) ' +
        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ['New project', '', '', '', 0, null, 0, 0, 0, 0, 0, 0, 0, answers, now]
    );
    const rows = benchAssessments();
    benchSelectedId = rows[rows.length - 1].id;
    renderBenchmarkEditor();
    flashStatus('Assessment created — fill in the evidence and Save.');
}

function renderBenchForm(row) {
    const a = benchParseAnswers(row);
    const cd = a.criteria || {};
    const mmeta = a.moduleMeta || {};
    const stage = a.stage || 'forecast';
    const dateVal = row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '';

    const stageOpts = BENCHMARK_STAGES.map(s => `<option value="${s.id}" ${s.id === stage ? 'selected' : ''}>${s.name}</option>`).join('');
    const modulesHtml = BENCHMARK_MODULES.map(m => renderBenchModule(m, cd, mmeta[m.id] || {})).join('');

    document.getElementById('benchForm').innerHTML =
        `<div class="bench-meta">` +
        `<label>Project<input data-meta="project_name" value="${escapeHtml(row.project_name || '')}"></label>` +
        `<label>Location<input data-meta="location" value="${escapeHtml(row.location || '')}"></label>` +
        `<label>Assessor<input data-meta="assessor" value="${escapeHtml(row.assessor || '')}"></label>` +
        `<label>Stage<select data-meta="stage">${stageOpts}</select></label>` +
        `<label>Date<input type="date" data-meta="date" value="${dateVal}"></label>` +
        `</div>` +
        `<div class="bench-total" id="benchTotal">0 / 140</div>` +
        `<div class="bench-modules">${modulesHtml}</div>` +
        `<div class="bench-actions">` +
        `<button class="promo-btn" onclick="benchSave(${row.id})">Save assessment</button>` +
        `<button class="promo-btn db-btn-secondary bench-del" onclick="benchDelete(${row.id})">Delete assessment</button>` +
        `</div>`;

    document.querySelectorAll('#benchForm [data-crit]').forEach(el => {
        el.addEventListener('input', benchRecalc);
        el.addEventListener('change', benchRecalc);
    });
    benchRecalc();
}

function renderBenchModule(m, cd, meta) {
    const crits = m.criteria.map(c => renderBenchCrit(m, c, cd[c.id] || {})).join('');
    return `<div class="bench-mod" style="--cat:${m.color}">` +
        `<div class="bench-mod-head">` +
        `<span class="bench-mod-name">${appIcon(m.icon, { cls: 'app-icon bench-mod-icon' })}${escapeHtml(m.name)}</span>` +
        `<span class="bench-mod-score" data-modscore="${m.id}">0/20</span>` +
        `<label class="bench-hold"><input type="checkbox" data-hold="${m.id}" ${meta.onHold ? 'checked' : ''}> On hold</label>` +
        `</div>` +
        `<div class="bench-crits">${crits}</div></div>`;
}

function renderBenchCrit(m, c, data) {
    const na = benchIsNa(c, data);
    let input = '';
    if (c.type === 'ladder') {
        input = `<input type="number" step="any" data-crit="${c.id}" data-kind="value" value="${data.value ?? ''}" placeholder="measured">` +
                `<span class="bench-unit">${escapeHtml(c.unit || '')}</span>`;
    } else if (c.type === 'count') {
        input = `<input type="number" min="0" max="${c.max}" step="1" data-crit="${c.id}" data-kind="count" value="${data.value ?? data.count ?? ''}">` +
                `<span class="bench-unit">of ${c.max} categories</span>`;
    } else if (c.type === 'levels') {
        input = `<select data-crit="${c.id}" data-kind="level">` +
                c.levels.map((l, i) => `<option value="${i}" ${(+data.level === i) ? 'selected' : ''}>${l.pts} pt — ${escapeHtml(l.label)}</option>`).join('') +
                `</select>`;
    } else if (c.type === 'transportPT') {
        input = `<span class="bench-pt">` +
                `<input type="number" step="any" data-crit="${c.id}" data-kind="distance" value="${data.distance ?? ''}" placeholder="walk m">` +
                `<input type="number" step="any" data-crit="${c.id}" data-kind="interval" value="${data.interval ?? ''}" placeholder="interval min">` +
                `</span>`;
    } else if (c.type === 'additive') {
        input = `<span class="bench-items">` +
                c.items.map((it, i) => `<label><input type="checkbox" data-crit="${c.id}" data-kind="item" data-idx="${i}" ${(data.items && data.items[i]) ? 'checked' : ''}> ${escapeHtml(it.label)}</label>`).join('') +
                `</span>`;
    }
    return `<div class="bench-crit${na ? ' is-na' : ''}" data-critwrap="${c.id}">` +
        `<div class="bench-crit-top">` +
        `<span class="bench-crit-name">${escapeHtml(c.name)} <small>max ${c.max}</small></span>` +
        `<span class="bench-crit-pts" data-critpts="${c.id}">—</span>` +
        `</div>` +
        `<div class="bench-crit-how">${escapeHtml(c.how)}</div>` +
        `<div class="bench-crit-input">${input}</div>` +
        `<label class="bench-na"><input type="checkbox" data-crit="${c.id}" data-kind="na" ${na ? 'checked' : ''}> Not assessed (unknown, not zero)</label>` +
        `</div>`;
}

// Read one criterion's inputs from the form into engine-shaped data.
function benchReadCrit(c) {
    const naEl = document.querySelector(`[data-crit="${c.id}"][data-kind="na"]`);
    if (naEl && naEl.checked) return { notAssessed: true };
    const q = kind => document.querySelector(`[data-crit="${c.id}"][data-kind="${kind}"]`);
    if (c.type === 'ladder') {
        const v = q('value'); return (v && v.value !== '') ? { value: parseFloat(v.value) } : {};
    }
    if (c.type === 'count') {
        const v = q('count'); return (v && v.value !== '') ? { count: parseInt(v.value, 10) } : {};
    }
    if (c.type === 'levels') {
        const v = q('level'); return v ? { level: parseInt(v.value, 10) } : {};
    }
    if (c.type === 'transportPT') {
        const d = q('distance'), s = q('interval'), out = {};
        if (d && d.value !== '') out.distance = parseFloat(d.value);
        if (s && s.value !== '') out.interval = parseFloat(s.value);
        return out;
    }
    if (c.type === 'additive') {
        const boxes = document.querySelectorAll(`[data-crit="${c.id}"][data-kind="item"]`);
        if (!boxes.length) return {};
        return { items: c.items.map((_, i) => { const b = document.querySelector(`[data-crit="${c.id}"][data-kind="item"][data-idx="${i}"]`); return b ? b.checked : false; }) };
    }
    return {};
}

function benchCollect() {
    const cd = {}, meta = {};
    BENCHMARK_MODULES.forEach(m => {
        const hold = document.querySelector(`[data-hold="${m.id}"]`);
        if (hold && hold.checked) meta[m.id] = { onHold: true };
        m.criteria.forEach(c => {
            const d = benchReadCrit(c);
            if (d && (d.notAssessed || Object.keys(d).length)) cd[c.id] = d;
        });
    });
    return { cd, meta };
}

function benchRecalc() {
    if (typeof scoreModule === 'undefined') return;
    const { cd, meta } = benchCollect();
    let total = 0;
    BENCHMARK_MODULES.forEach(m => {
        const s = scoreModule(m, cd, meta[m.id] || {});
        total += s.earned;
        const me = document.querySelector(`[data-modscore="${m.id}"]`);
        if (me) me.textContent = `${s.earned}/20` + (s.coverage < 1 ? ` · ${s.assessedWeight}/20 assessed` : '') + (s.onHold ? ' · on hold' : '');
        s.crits.forEach((cr, i) => {
            const ce = document.querySelector(`[data-critpts="${m.criteria[i].id}"]`);
            if (ce) ce.textContent = cr.assessed ? `${cr.points}/${cr.max}` : '—';
            const wrap = document.querySelector(`[data-critwrap="${m.criteria[i].id}"]`);
            if (wrap) wrap.classList.toggle('is-na', !cr.assessed);
        });
    });
    const tot = document.getElementById('benchTotal');
    if (tot) tot.textContent = `${total} / 140`;
}

function benchSave(id) {
    const { cd, meta } = benchCollect();
    const getMeta = k => { const el = document.querySelector(`[data-meta="${k}"]`); return el ? el.value : ''; };
    const cols = {}; let total = 0;
    BENCHMARK_MODULES.forEach(m => { const s = scoreModule(m, cd, meta[m.id] || {}); cols[m.col] = s.earned; total += s.earned; });

    const existing = benchParseAnswers((benchAssessments().find(r => r.id === id) || {}));
    const dateStr = getMeta('date');
    const created = dateStr ? new Date(dateStr + 'T09:00:00').toISOString() : new Date().toISOString();
    const answers = JSON.stringify({
        methodology: '0.2', stage: getMeta('stage'),
        criteria: cd, moduleMeta: meta, notes: existing.notes || {}, pilot: true
    });

    dbRun(
        'UPDATE assessments SET project_name=?,location=?,assessor=?,energy=?,carbon=?,waste=?,water=?,ieq=?,site=?,innovation=?,total_score=?,answers_json=?,created_at=? WHERE id=?',
        [getMeta('project_name'), getMeta('location'), getMeta('assessor'),
         cols.energy, cols.carbon, cols.waste, cols.water, cols.ieq, cols.site, cols.innovation,
         total, answers, created, Number(id)]
    );
    renderBenchmarkEditor();
    flashStatus('Assessment saved — scores recomputed from the evidence.');
}

function benchDelete(id) {
    if (!confirm('Delete this assessment? This cannot be undone (export a backup first if unsure).')) return;
    dbRun('DELETE FROM assessments WHERE id = ?', [Number(id)]);
    if (benchSelectedId === id) benchSelectedId = null;
    renderBenchmarkEditor();
    flashStatus('Assessment deleted.');
}
