// Simplicity Living Benchmark — results viewer (v0.2)
// Renders the seven modules from the rule engine (js/scoring-methodology.js).
// Scores are computed UPWARD from per-criterion evidence stored in answers_json.criteria.
// No external-rating language; neutral progress bands; evidence coverage shown.

const MAX_SCORE = 20;
const PROJECT_COLORS = ['#90A4AE', '#42A5F5', '#66BB6A', '#ff6600'];

let assessmentRows = [];
let selectedIndex = 0;
let wheelChart = null;

// ── per-row evidence helpers ───────────────────────────────────────────────
function answersOf(row) { try { return JSON.parse(row.answers_json || '{}'); } catch (e) { return {}; } }
function critDataOf(row) { return answersOf(row).criteria || {}; }
function moduleMetaOf(row) { return answersOf(row).moduleMeta || {}; }
function notesOf(row) { return answersOf(row).notes || {}; }
function scoreRowModule(row, mod) { return scoreModule(mod, critDataOf(row), moduleMetaOf(row)[mod.id] || {}); }
function moduleEarned(row, mod) { return scoreRowModule(row, mod).earned; }
function totalOf(row) { return BENCHMARK_MODULES.reduce((a, m) => a + moduleEarned(row, m), 0); }
function fmtNum(n) { n = +n; return Number.isInteger(n) ? n : Math.round(n * 10) / 10; }

function moduleStatus(s) {
    if (s.onHold) return { label: 'On hold', cls: 'st-hold' };
    if (s.coverage < 1) return { label: 'Assessment in progress', cls: 'st-progress' };
    return { label: s.band, cls: 'st-band' };
}

// ── init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    renderFocusTiles();
    if (typeof renderStandardGroups === 'function') renderStandardGroups();
    try {
        await initSimplicityDb();
        assessmentRows = dbQuery(`
            SELECT a.* FROM assessments a
            JOIN (SELECT project_name, MAX(datetime(created_at)) AS latest
                  FROM assessments GROUP BY project_name) m
              ON a.project_name = m.project_name AND datetime(a.created_at) = m.latest
            ORDER BY datetime(a.created_at) ASC, a.id ASC
        `);
        if (!assessmentRows.length) {
            document.getElementById('trendStrip').innerHTML =
                '<p style="color:#666;">No assessment results yet — add some on the <a href="admin.html">Admin page</a>.</p>';
            return;
        }
        buildTrendStrip();
        buildTotalsTrend();
        buildRadar();
        buildProjectSelector();
        selectProject(assessmentRows.length - 1);
    } catch (err) {
        console.error('Benchmark view failed to load:', err);
        document.getElementById('trendStrip').innerHTML =
            '<p style="color:#dc3545;">Could not load the results database (needs internet on first load).</p>';
    }
});

// ── About: the seven focus tiles ─────────────────────────────────────────────
function renderFocusTiles() {
    const wrap = document.getElementById('focusTiles');
    if (!wrap || typeof BENCHMARK_MODULES === 'undefined') return;
    wrap.innerHTML = BENCHMARK_MODULES.map(m => `
        <div class="focus-tile" style="--cat:${m.color}">
            <span class="focus-tile-icon">${appIcon(m.icon)}</span>
            <span class="focus-tile-name">${escapeHtml(m.name)}</span>
            <span class="focus-tile-blurb">${escapeHtml(m.question)}</span>
        </div>`).join('');
}

// ── comparison strip + direction ─────────────────────────────────────────────
function buildTrendStrip() {
    const strip = document.getElementById('trendStrip');
    strip.innerHTML = '';
    const totals = assessmentRows.map(totalOf);
    assessmentRows.forEach((row, i) => {
        const delta = i === 0 ? null : totals[i] - totals[i - 1];
        const arrow = delta === null ? '' :
            delta > 0 ? `<span class="delta up">▲ +${delta}</span>` :
            delta < 0 ? `<span class="delta down">▼ ${delta}</span>` :
                        `<span class="delta flat">— 0</span>`;
        const card = document.createElement('div');
        card.className = 'trend-card' + (i === assessmentRows.length - 1 ? ' latest' : '');
        card.innerHTML = `
            <div class="trend-project">${escapeHtml(row.project_name)}</div>
            <div class="trend-location">${escapeHtml(row.location || '')}</div>
            <div class="trend-total">${totals[i]}<span>/140</span></div>
            ${arrow}`;
        card.onclick = () => selectProject(i);
        strip.appendChild(card);
    });
    const deltas = totals.slice(1).map((t, i) => t - totals[i]);
    const ups = deltas.filter(d => d > 0).length, downs = deltas.filter(d => d < 0).length;
    let badge, cls;
    if (ups && !downs) { badge = '▲ Improving'; cls = 'up'; }
    else if (downs && !ups) { badge = '▼ Declining'; cls = 'down'; }
    else { badge = '〜 Wavering'; cls = 'flat'; }
    const el = document.getElementById('trendBadge');
    el.textContent = badge; el.className = 'trend-badge ' + cls;
}

function buildTotalsTrend() {
    new Chart(document.getElementById('totalsTrendChart'), {
        type: 'line',
        data: {
            labels: assessmentRows.map(r => [r.project_name, r.location || '']),
            datasets: [{
                label: 'Combined points (all modules)', data: assessmentRows.map(totalOf),
                borderColor: '#ff6600', backgroundColor: 'rgba(255,102,0,0.08)', borderWidth: 3,
                pointRadius: 7, pointBackgroundColor: '#ff6600', pointBorderColor: '#fff', pointBorderWidth: 2,
                fill: true, tension: 0.35
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + ' / 140 (internal navigation total only)' } } },
            scales: {
                y: { min: 0, max: 140, title: { display: true, text: 'Combined points (max 140, not a rating)', font: { size: 12, weight: 'bold' } }, grid: { color: '#eee' } },
                x: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } }
            }
        }
    });
}

function buildRadar() {
    new Chart(document.getElementById('categoriesRadarChart'), {
        type: 'radar',
        data: {
            labels: BENCHMARK_MODULES.map(m => m.name),
            datasets: assessmentRows.map((row, i) => ({
                label: row.project_name,
                data: BENCHMARK_MODULES.map(m => moduleEarned(row, m)),
                borderColor: PROJECT_COLORS[i % PROJECT_COLORS.length],
                backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] + (i === assessmentRows.length - 1 ? '33' : '14'),
                borderWidth: i === assessmentRows.length - 1 ? 3 : 2, pointRadius: 3,
                pointBackgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length]
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
                       tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.r}/20` } } },
            scales: { r: { min: 0, max: MAX_SCORE, ticks: { stepSize: 5, font: { size: 10 } }, pointLabels: { font: { size: 9.5, weight: 'bold' } } } }
        }
    });
}

// ── project selector + scorecard ─────────────────────────────────────────────
function buildProjectSelector() {
    const sel = document.getElementById('projectSelector');
    sel.innerHTML = '';
    assessmentRows.forEach((row, i) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'building-btn'; btn.dataset.project = String(i);
        btn.onclick = () => selectProject(i);
        btn.innerHTML = escapeHtml(row.project_name) + '<small>' + escapeHtml(row.location || '') + '</small>';
        sel.appendChild(btn);
    });
}

function selectProject(index) {
    selectedIndex = index;
    const row = assessmentRows[index];
    document.querySelectorAll('#projectSelector .building-btn').forEach((b, i) => b.classList.toggle('active', i === index));
    document.getElementById('scorecardTitle').textContent = row.project_name + ' — ' + (row.location || '');
    const when = new Date(row.created_at).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });
    const a = answersOf(row);
    const stageName = (BENCHMARK_STAGES.find(s => s.id === a.stage) || {}).name || '';
    document.getElementById('scorecardMeta').textContent =
        `Assessed ${when}` + (row.assessor ? ` by ${row.assessor}` : '') + (stageName ? ` · ${stageName}` : '') + (a.pilot ? ' · pilot placeholder data' : '');
    buildCategoryBars(row);
    buildScoreWheel(row);
    buildDetailCards(row);
}

function buildCategoryBars(row) {
    const wrap = document.getElementById('categoryBars');
    wrap.innerHTML = '';
    BENCHMARK_MODULES.forEach(m => {
        const s = scoreRowModule(row, m);
        const pct = (s.earned / MAX_SCORE) * 100;
        const mapLink = m.id === 'transport'
            ? ` <button class="map-mini-btn" onclick="openTransportMap()" title="Explore the transport map">${appIcon('map', { cls: 'app-icon app-icon-inline' })} map</button>` : '';
        const bar = document.createElement('div');
        bar.className = 'category-bar';
        bar.innerHTML = `
            <div class="category-bar-label">
                <span>${appIcon(m.icon, { cls: 'app-icon app-icon-inline' })} ${escapeHtml(m.name)}${mapLink}</span>
                <strong>${s.earned}/20</strong>
            </div>
            <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%; background:${m.color};"></div></div>`;
        wrap.appendChild(bar);
    });
}

function buildScoreWheel(row) {
    const ctx = document.getElementById('scoreWheelChart');
    const scores = BENCHMARK_MODULES.map(m => moduleEarned(row, m));
    if (wheelChart) wheelChart.destroy();
    wheelChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: BENCHMARK_MODULES.map(m => m.name),
            datasets: [
                { data: BENCHMARK_MODULES.map(() => MAX_SCORE), backgroundColor: BENCHMARK_MODULES.map(m => m.color + '1A'), borderColor: '#fff', borderWidth: 2 },
                { data: scores, backgroundColor: BENCHMARK_MODULES.map(m => m.color + 'CC'), borderColor: BENCHMARK_MODULES.map(m => m.color), borderWidth: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
            plugins: {
                legend: { display: true, position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 },
                    generateLabels: () => BENCHMARK_MODULES.map((m, i) => ({ text: `${m.name} — ${scores[i]}/20`, fillStyle: m.color, strokeStyle: m.color, pointStyle: 'circle' })) } },
                tooltip: { filter: item => item.datasetIndex === 1, callbacks: { label: c => `${BENCHMARK_MODULES[c.dataIndex].name}: ${c.parsed.r}/20` } }
            },
            scales: { r: { min: 0, max: MAX_SCORE, ticks: { stepSize: 5, backdropColor: 'rgba(255,255,255,0.75)', font: { size: 10 } }, grid: { color: '#ddd' } } }
        }
    });
}

// ── Detailed results = seven module cards → breakdown popup ───────────────────
function buildDetailCards(row) {
    document.getElementById('detailTitle').textContent = row.project_name + ' — Module Breakdown';
    const wrap = document.getElementById('detailAccordion');
    wrap.className = 'detail-cards';
    wrap.innerHTML = BENCHMARK_MODULES.map(m => {
        const s = scoreRowModule(row, m);
        const pct = Math.round((s.earned / MAX_SCORE) * 100);
        const st = moduleStatus(s);
        const cover = s.coverage < 1 ? `<span class="detail-card-cover">${s.assessedWeight}/20 assessed</span>` : '';
        return `
          <button type="button" class="detail-card" style="--cat:${m.color}" onclick="openCategoryModal('${m.id}')">
            <span class="detail-card-top">
              <span class="detail-card-icon">${appIcon(m.icon)}</span>
              <span class="detail-card-score"><strong>${s.earned}</strong><small>/20</small></span>
            </span>
            <span class="detail-card-name">${escapeHtml(m.name)}</span>
            <span class="detail-card-bar"><span style="width:${pct}%"></span></span>
            <span class="detail-card-foot">
              <span class="detail-band ${st.cls}">${escapeHtml(st.label)}</span>
              ${cover || '<span class="detail-card-more">View breakdown →</span>'}
            </span>
          </button>`;
    }).join('');
}

// mark class for a scored criterion
function critMark(cr) {
    if (!cr.assessed) return 'pending';
    if (cr.points >= cr.max) return 'met';
    if (cr.points <= 0) return 'zero';
    return 'partial';
}
function critBarColor(cls) { return { met: '#1b8a3a', partial: '#e68a00', zero: '#dc3545', pending: '#cfcfcf' }[cls]; }

function critValueLine(crit, cr) {
    if (!cr.assessed) return '<span class="cm-crit-val pending">Not yet assessed</span>';
    switch (crit.type) {
        case 'ladder':
            return `<span class="cm-crit-val">${escapeHtml(crit.metric)}: <strong>${fmtNum(cr.value)}${escapeHtml(crit.unit || '')}</strong></span>`;
        case 'count':
            return `<span class="cm-crit-val"><strong>${cr.value}</strong> of ${crit.max} qualifying categories</span>`;
        case 'levels':
            return `<span class="cm-crit-val">Level reached: <strong>${escapeHtml(crit.levels[cr.level].label)}</strong></span>`;
        case 'transportPT':
            return `<span class="cm-crit-val">Walk <strong>${fmtNum(cr.distance)} m</strong> (${cr.parts[0].pts}/4) · service <strong>${fmtNum(cr.interval)} min</strong> (${cr.parts[1].pts}/4)</span>`;
        case 'additive':
            return `<ul class="cm-items">${cr.items.map(it => `<li class="${it.done ? 'done' : ''}">${it.done ? '✓' : '○'} ${escapeHtml(it.label)}</li>`).join('')}</ul>`;
    }
    return '';
}

function openCategoryModal(moduleId) {
    const row = assessmentRows[selectedIndex];
    const m = benchmarkModule(moduleId);
    if (!row || !m) return;
    const s = scoreRowModule(row, m);
    const st = moduleStatus(s);
    const notes = notesOf(row);
    const a = answersOf(row);

    const critHtml = m.criteria.map((crit, i) => {
        const cr = s.crits[i];
        const cls = critMark(cr);
        const w = cr.max ? Math.round(cr.points / cr.max * 100) : 0;
        return `
          <div class="cm-crit cm-${cls}">
            <div class="cm-crit-head">
              <span class="cm-crit-mark" aria-hidden="true"></span>
              <span class="cm-crit-name">${escapeHtml(crit.name)}</span>
              <span class="cm-crit-pts">${cr.points}<small>/${cr.max} pts</small></span>
            </div>
            <div class="cm-crit-bar"><span style="width:${w}%;background:${critBarColor(cls)}"></span></div>
            <p class="cm-crit-how">${escapeHtml(crit.how)}</p>
            <div class="cm-crit-valwrap">${critValueLine(crit, cr)}</div>
            ${cr.next ? `<p class="cm-crit-next"><span class="cm-next-dot">↗</span> Next: ${escapeHtml(cr.next)}</p>` : ''}
            <p class="cm-crit-evi"><strong>Evidence:</strong> ${escapeHtml(crit.evidence)}</p>
          </div>`;
    }).join('');

    const compareHtml = assessmentRows.map((r, i) => {
        const e = moduleEarned(r, m); const sel = i === selectedIndex;
        return `
          <div class="cm-cmp-row${sel ? ' sel' : ''}">
            <span class="cm-cmp-name">${escapeHtml(r.project_name)}</span>
            <span class="cm-cmp-track"><span style="width:${e / MAX_SCORE * 100}%;background:${sel ? m.color : '#d4d4d4'}"></span></span>
            <span class="cm-cmp-val">${e}<small>/20</small></span>
          </div>`;
    }).join('');

    const coverPct = Math.round(s.coverage * 100);
    const transportBtn = moduleId === 'transport'
        ? `<button class="map-launch-btn" onclick="openTransportMap()">${appIcon('map', { cls: 'app-icon app-icon-inline' })} Explore the transport map</button>` : '';

    document.getElementById('categoryModalBody').innerHTML = `
        <div class="cm-hero" style="--cat:${m.color}">
            <span class="cm-hero-icon">${appIcon(m.icon, { cls: 'app-icon cm-hero-icon-svg' })}</span>
            <div class="cm-hero-mid">
                <span class="cm-hero-cat">${escapeHtml(m.name)}</span>
                <span class="cm-hero-sub">${escapeHtml(row.project_name)}${row.location ? ' · ' + escapeHtml(row.location) : ''}</span>
            </div>
            <div class="cm-hero-score"><span class="cm-hero-num">${s.earned}<small>/20</small></span><span class="cm-hero-band">${escapeHtml(st.label)}</span></div>
        </div>
        <div class="cm-content">
            ${a.pilot ? `<p class="cm-pilot">Pilot placeholder data, not yet verified against project evidence (methodology v0.2).</p>` : ''}
            <p class="cm-intro">${escapeHtml(m.intent)}</p>
            <div class="cm-cover">
                <div class="cm-cover-head"><span>Evidence coverage</span><strong>${s.assessedWeight}/20 points assessed</strong></div>
                <div class="cm-cover-bar"><span style="width:${coverPct}%"></span></div>
                ${s.pending > 0 ? `<span class="cm-cover-note">${s.pending} points not yet assessed</span>` : ''}
                ${s.onHold ? `<span class="cm-cover-note hold">Module on hold: an unresolved critical issue is open.</span>` : ''}
            </div>
            <h4>How the ${s.earned}/20 is earned</h4>
            <div class="cm-crits">${critHtml}</div>
            <p class="cm-legend"><span class="crit-key met">Full</span><span class="crit-key partial">Partial</span><span class="crit-key pending">Not assessed</span></p>
            <h4>Where our projects sit</h4>
            <div class="cm-compare">${compareHtml}</div>
            ${notes[m.id] ? `<div class="detail-note"><strong>Assessor note:</strong> ${escapeHtml(notes[m.id])}</div>` : ''}
            ${transportBtn}
        </div>`;
    document.getElementById('categoryModalOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeCategoryModal() {
    const o = document.getElementById('categoryModalOverlay');
    if (o) o.style.display = 'none';
    document.body.style.overflow = '';
}

// ---------------------------------------------------------------------------
// The Simplicity standard (unscored good-practice baseline) — cards + popup
// ---------------------------------------------------------------------------
function renderStandardGroups() {
    const wrap = document.getElementById('standardGroups');
    if (!wrap || typeof SIMPLICITY_STANDARD === 'undefined') return;
    wrap.innerHTML = SIMPLICITY_STANDARD.map((group, gi) => `
        <div class="standard-group">
            <h3 class="standard-group-title">${appIcon(group.icon, { cls: 'app-icon app-icon-inline' })} ${escapeHtml(group.group)}</h3>
            <div class="standard-credit-grid">
                ${group.credits.map((cr, ci) => `
                    <button type="button" class="standard-credit" onclick="openStandardModal(${gi},${ci})" aria-label="${escapeHtml(cr.name)}, view details">
                        <span class="standard-tick" title="Standard on every home" aria-hidden="true">✓</span>
                        <span class="standard-credit-icon">${appIcon(cr.icon || group.icon)}</span>
                        <span class="standard-credit-name">${escapeHtml(cr.name)}</span>
                        <span class="standard-purpose">${escapeHtml(cr.purpose)}</span>
                        <span class="standard-more">View details →</span>
                    </button>`).join('')}
            </div>
        </div>`).join('');
}

function openStandardModal(gi, ci) {
    const group = SIMPLICITY_STANDARD[gi];
    const cr = group && group.credits[ci];
    if (!cr) return;
    const overlay = document.getElementById('standardModalOverlay');
    const body = document.getElementById('standardModalBody');
    if (!overlay || !body) return;
    const iconBig = appIcon(cr.icon || group.icon, { cls: 'app-icon sm-hero-icon-svg' });
    const cap = escapeHtml(cr.photoCaption || cr.name);
    const hero = cr.photo
        ? `<div class="sm-hero"><img src="${cr.photo}" alt="${cap}" onerror="this.closest('.sm-hero').classList.add('sm-hero-fallback'); this.remove();"><span class="sm-hero-fallicon">${iconBig}</span><span class="sm-hero-cap">${cap}</span></div>`
        : `<div class="sm-hero sm-hero-fallback"><span class="sm-hero-fallicon">${iconBig}</span><span class="sm-hero-cap">${cap} · photo to come</span></div>`;
    body.innerHTML = `
        ${hero}
        <div class="sm-content">
            <div class="sm-head"><h3>${escapeHtml(cr.name)}</h3><span class="sm-badge"><span class="sm-badge-tick">✓</span> Standard on every home</span></div>
            <p class="sm-purpose">${escapeHtml(cr.purpose)}</p>
            <h4>How Simplicity delivers it</h4>
            <p class="sm-detail">${escapeHtml(cr.detail || cr.achieves)}</p>
            <p class="sm-group">${appIcon(group.icon, { cls: 'app-icon app-icon-inline' })} ${escapeHtml(group.group)}</p>
        </div>`;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeStandardModal() {
    const o = document.getElementById('standardModalOverlay');
    if (o) o.style.display = 'none';
    document.body.style.overflow = '';
}

// ── Transport map overlay ─────────────────────────────────────────────────────
function openTransportMap() {
    const overlay = document.getElementById('transportMapOverlay');
    const frame = document.getElementById('transportMapFrame');
    if (frame.src === 'about:blank' || !frame.src.includes('transport-map')) frame.src = 'transport-map.html';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeTransportMap() {
    document.getElementById('transportMapOverlay').style.display = 'none';
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeTransportMap(); closeStandardModal(); closeCategoryModal(); } });

// ── Scorecard / detail toggle ─────────────────────────────────────────────────
function setScoreView(view) {
    const scorecard = view === 'scorecard';
    document.getElementById('scorecardView').style.display = scorecard ? 'block' : 'none';
    document.getElementById('detailView').style.display = scorecard ? 'none' : 'block';
    document.getElementById('viewScorecardBtn').classList.toggle('active', scorecard);
    document.getElementById('viewDetailBtn').classList.toggle('active', !scorecard);
}
