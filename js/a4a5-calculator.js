// Simplicity Living - A4/A5 Carbon Calculator
// A logistics-first A4 engine (dual baseline-vs-optimised run) plus an
// interactive A5 site-activity model. Projects are stored in the shared
// SQLite DB (a4a5_projects). See js/a4a5-data.js for reference data.

const EF = A4A5_DATA.emissionFactors;

let projects = [];
let current = null;        // { id, name, location, data }
let a4Chart = null;
// A5 weekly-activity model now lives on the Site Activity page (js/site-activity.js);
// this public calculator links out to per-element activity calculators instead.

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initSimplicityDb();
        loadProjects();
        renderProjectBar();
        if (projects.length) selectProject(projects[0].id);
        renderSiteTools();
    } catch (err) {
        console.error('A4/A5 calculator failed to start:', err);
        const el = document.getElementById('calcStatus');
        if (el) { el.textContent = 'Could not load the database (needs internet on first load).'; el.style.color = '#dc3545'; }
    }
});

// ---------------------------------------------------------------------------
// Projects (front and centre — create / edit / delete, no login)
// ---------------------------------------------------------------------------
function loadProjects() {
    projects = dbQuery('SELECT * FROM a4a5_projects ORDER BY datetime(created_at)');
}

function renderProjectBar() {
    const bar = document.getElementById('projectBar');
    bar.innerHTML = '';
    projects.forEach(p => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'project-chip' + (current && p.id === current.id ? ' active' : '');
        chip.onclick = () => selectProject(p.id);
        chip.innerHTML = `<span class="project-chip-name">${escapeHtml(p.name)}</span>
            <span class="project-chip-loc">${escapeHtml(p.location || '')}</span>`;
        bar.appendChild(chip);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'project-chip project-chip-add';
    add.onclick = newProject;
    add.innerHTML = '<span class="project-chip-name">+ New project</span><span class="project-chip-loc">blank canvas</span>';
    bar.appendChild(add);
}

function selectProject(id) {
    const row = projects.find(p => p.id === id);
    if (!row) return;
    let data = {};
    try { data = JSON.parse(row.data_json || '{}'); } catch (e) { data = {}; }
    if (!data.materials) data.materials = [];
    current = { id: row.id, name: row.name, location: row.location, data };

    renderProjectBar();
    fillProjectForm();
    renderMaterials();
    renderA4();
}

function fillProjectForm() {
    const d = current.data;
    document.getElementById('pf_name').value = current.name || '';
    document.getElementById('pf_location').value = current.location || '';
    document.getElementById('pf_gfa').value = d.gfa || '';
    document.getElementById('pf_storeys').value = d.storeys || '';
    document.getElementById('pf_apts').value = d.apartmentsPerFloor || '';
    document.getElementById('pf_buildings').value = d.buildings || '';
}

function newProject() {
    if (!window.sbIsLoggedIn || !window.sbIsLoggedIn()) {
        _showA4AuthNudge(() => _createProject());
    } else {
        _createProject();
    }
}

function _createProject() {
    const now = new Date().toISOString();
    const data = { gfa: 5000, storeys: 6, apartmentsPerFloor: 8, buildings: 1, materials: [], a5Scenario: 'simplicity' };
    dbRun('INSERT INTO a4a5_projects (name, location, data_json, created_at, updated_at) VALUES (?,?,?,?,?)',
        ['New project', 'Auckland', JSON.stringify(data), now, now]);
    loadProjects();
    const created = projects[projects.length - 1];
    selectProject(created.id);
    flash('New project created — edit its details and materials below.');
    window.trackEvent?.('a4a5_project_created', {});
}

function _showA4AuthNudge(proceed) {
    window._a4NudgeProceed = proceed;
    const existing = document.getElementById('a4AuthNudgeOverlay');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'a4AuthNudgeOverlay';
    el.className = 'auth-overlay';
    el.innerHTML = `
        <div class="auth-card" style="max-width:440px;">
            <div class="auth-card-header">
                <img src="assets/images/simplicity-logo.svg" alt="Simplicity Living" class="auth-logo">
                <button class="auth-x" onclick="document.getElementById('a4AuthNudgeOverlay').remove()">✕</button>
            </div>
            <div style="padding:1.5rem;">
                <h3 style="margin:0 0 0.5rem;font-size:1.05rem;">Save your scenarios to your account</h3>
                <p style="color:#555;font-size:0.9rem;line-height:1.6;margin:0 0 1.25rem;">
                    Create a free account to save your A4–A5 scenarios to the cloud — access them from any device and keep them between sessions.<br><br>
                    <strong>You can continue without an account</strong>, but your work will only be saved in this browser session.
                </p>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;">
                    <button class="auth-nudge-btn-primary" onclick="document.getElementById('a4AuthNudgeOverlay').remove(); openAuthModal('signup');">Create account</button>
                    <button class="auth-nudge-btn-secondary" onclick="document.getElementById('a4AuthNudgeOverlay').remove(); openAuthModal('signin');">Sign in</button>
                    <button style="margin-left:auto;background:none;border:none;color:#888;font-size:0.88rem;cursor:pointer;text-decoration:underline;" onclick="document.getElementById('a4AuthNudgeOverlay').remove(); window._a4NudgeProceed && window._a4NudgeProceed();">Continue without account →</button>
                </div>
            </div>
        </div>`;
    el.addEventListener('click', e => { if (e.target === el) { el.remove(); proceed(); } });
    document.body.appendChild(el);
}

function saveProjectMeta() {
    if (!current) return;
    current.name = document.getElementById('pf_name').value.trim() || 'Untitled project';
    current.location = document.getElementById('pf_location').value.trim();
    current.data.gfa = Number(document.getElementById('pf_gfa').value) || 0;
    current.data.storeys = Number(document.getElementById('pf_storeys').value) || 0;
    current.data.apartmentsPerFloor = Number(document.getElementById('pf_apts').value) || 0;
    current.data.buildings = Number(document.getElementById('pf_buildings').value) || 0;
    persistCurrent();
    loadProjects();
    renderProjectBar();
    renderA4();
    flash('Project saved.');
}

function deleteProject() {
    if (!current) return;
    if (!confirm(`Delete project "${current.name}"? This cannot be undone.`)) return;
    dbRun('DELETE FROM a4a5_projects WHERE id = ?', [current.id]);
    loadProjects();
    renderProjectBar();
    if (projects.length) selectProject(projects[0].id);
    else { current = null; document.getElementById('calcBody').style.display = 'none'; }
    flash('Project deleted.');
}

function duplicateProject() {
    if (!current) return;
    const now = new Date().toISOString();
    const data = JSON.parse(JSON.stringify(current.data));
    dbRun('INSERT INTO a4a5_projects (name, location, data_json, created_at, updated_at) VALUES (?,?,?,?,?)',
        [current.name + ' (scenario)', current.location, JSON.stringify(data), now, now]);
    loadProjects();
    selectProject(projects[projects.length - 1].id);
    flash('Scenario copy created — tweak the levers to explore opportunities.');
}

function persistCurrent() {
    if (!current) return;
    dbRun('UPDATE a4a5_projects SET name = ?, location = ?, data_json = ?, updated_at = ? WHERE id = ?',
        [current.name, current.location, JSON.stringify(current.data), new Date().toISOString(), current.id]);
}

// ---------------------------------------------------------------------------
// Materials editor
// ---------------------------------------------------------------------------
function materialDef(key) {
    return A4A5_DATA.materials.find(m => m.key === key) || A4A5_DATA.materials[0];
}
function originDef(key) {
    return A4A5_DATA.origins.find(o => o.key === key) || A4A5_DATA.origins[0];
}
function massTonnes(line) {
    const m = materialDef(line.material);
    return (Number(line.qty) || 0) * m.density / 1000;
}

function renderMaterials() {
    const tbody = document.getElementById('materialsBody');
    tbody.innerHTML = '';
    current.data.materials.forEach((line, i) => {
        const m = materialDef(line.material);
        const tr = document.createElement('tr');
        const matOpts = A4A5_DATA.materials.map(mm =>
            `<option value="${mm.key}" ${mm.key === line.material ? 'selected' : ''}>${mm.name}</option>`).join('');
        const groups = [...new Set(A4A5_DATA.origins.map(o => o.group))];
        const originOpts = groups.map(g =>
            `<optgroup label="${g}">` +
            A4A5_DATA.origins.filter(o => o.group === g).map(o =>
                `<option value="${o.key}" ${o.key === line.origin ? 'selected' : ''}>${o.label}</option>`).join('') +
            `</optgroup>`).join('');
        tr.innerHTML = `
            <td><select onchange="updateMaterial(${i},'material',this.value)">${matOpts}</select></td>
            <td><input type="number" min="0" step="any" value="${line.qty}" onchange="updateMaterial(${i},'qty',this.value)" class="num"> <span class="unit-tag">${m.unit}</span></td>
            <td><select onchange="updateMaterial(${i},'origin',this.value)">${originOpts}</select></td>
            <td style="text-align:right;">${massTonnes(line).toLocaleString(undefined,{maximumFractionDigits:0})} t</td>
            <td style="text-align:right;"><button class="db-btn-sm db-btn-danger" onclick="removeMaterial(${i})">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function addMaterial() {
    const m = A4A5_DATA.materials[0];
    current.data.materials.push({ material: m.key, qty: 100, origin: m.defaultOrigin });
    persistCurrent();
    renderMaterials();
    renderA4();
}
function updateMaterial(i, field, value) {
    if (field === 'material') {
        current.data.materials[i].material = value;
        // reset origin to the material's default for convenience
        current.data.materials[i].origin = materialDef(value).defaultOrigin;
    } else if (field === 'qty') {
        current.data.materials[i].qty = Number(value) || 0;
    } else {
        current.data.materials[i][field] = value;
    }
    persistCurrent();
    renderMaterials();
    renderA4();
}
function removeMaterial(i) {
    current.data.materials.splice(i, 1);
    persistCurrent();
    renderMaterials();
    renderA4();
}

// ---------------------------------------------------------------------------
// A4 engine — dual baseline vs optimised
// ---------------------------------------------------------------------------
function legEmissions(massT, origin, wastePct, utilisation) {
    const gross = massT * (1 + wastePct / 100);
    const seaEF = origin.coastal ? EF.coastalContainer : EF.seaContainer;
    const sea = origin.seaKm > 0 ? gross * origin.seaKm * seaEF : 0;          // ships run full
    const road = (gross * origin.roadKm * EF.roadAllTrucks) / utilisation;    // trucks: load factor
    return { sea, road, total: sea + road, gross };
}

function computeA4() {
    const base = A4A5_DATA.levers.baseline;
    const opt = A4A5_DATA.levers.optimised;
    const perMaterial = [];
    let baseTotal = 0, optTotal = 0;

    current.data.materials.forEach(line => {
        const mt = massTonnes(line);
        const origin = originDef(line.origin);
        const b = legEmissions(mt, origin, base.wastePct, base.utilisation);
        const o = legEmissions(mt, origin, opt.wastePct, opt.utilisation);
        baseTotal += b.total;
        optTotal += o.total;
        perMaterial.push({
            name: materialDef(line.material).name,
            icon: materialDef(line.material).icon,
            origin: origin.label,
            massT: mt,
            baseline: b.total, optimised: o.total,
            seaBase: b.sea, roadBase: b.road
        });
    });

    const gfa = current.data.gfa || 1;
    return {
        baseTotal, optTotal,
        delta: baseTotal - optTotal,
        deltaPct: baseTotal > 0 ? ((baseTotal - optTotal) / baseTotal * 100) : 0,
        basePerM2: baseTotal / gfa, optPerM2: optTotal / gfa,
        perMaterial
    };
}

function renderA4() {
    const r = computeA4();

    // KPI cards
    document.getElementById('a4Baseline').textContent = fmt(r.baseTotal);
    document.getElementById('a4Optimised').textContent = fmt(r.optTotal);
    document.getElementById('a4Delta').textContent = fmt(r.delta);
    document.getElementById('a4DeltaPct').textContent = r.deltaPct.toFixed(1) + '%';
    document.getElementById('a4BasePerM2').textContent = r.basePerM2.toFixed(1);
    document.getElementById('a4OptPerM2').textContent = r.optPerM2.toFixed(1);

    // Per-material comparison chart
    const ctx = document.getElementById('a4Chart');
    const labels = r.perMaterial.map(m => m.name);
    if (a4Chart) a4Chart.destroy();
    a4Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Industry baseline', data: r.perMaterial.map(m => Math.round(m.baseline)),
                  backgroundColor: '#cccccc', borderColor: '#999', borderWidth: 1, borderRadius: 3 },
                { label: 'Simplicity optimised', data: r.perMaterial.map(m => Math.round(m.optimised)),
                  backgroundColor: '#ff6600', borderColor: '#cc5200', borderWidth: 1, borderRadius: 3 }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.x)} kgCO₂e` } }
            },
            scales: {
                x: { title: { display: true, text: 'A4 transport carbon (kgCO₂e)', font: { weight: 'bold' } }, grid: { color: '#eee' } },
                y: { grid: { display: false } }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// A5 weekly-activity model relocated to the Site Activity page (js/site-activity.js).
// This calculator now links out to per-element activity calculators (see the A5
// section in a4a5-calculator.html).

// ---------------------------------------------------------------------------
// Site-data tool cards (imagined sources for A5 primary data)
// ---------------------------------------------------------------------------
function renderSiteTools() {
    const wrap = document.getElementById('siteTools');
    if (!wrap) return;
    wrap.innerHTML = A4A5_DATA.a5SiteTools.map(t => `
        <div class="site-tool-card">
            <div class="site-tool-icon">${appIcon(t.icon)}</div>
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.desc)}</p>
        </div>`).join('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n) { return Math.round(n).toLocaleString(); }

function flash(msg) {
    const el = document.getElementById('calcStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = '#28a745';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 3000);
}
