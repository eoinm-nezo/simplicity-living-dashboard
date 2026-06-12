// Simplicity Scoring System - results viewer
// Reads the latest assessment per project from the shared SQLite DB and shows:
//   - a comparison strip + combined trend + all-projects radar
//   - per-project "score wheel" (each category segment filled out of 20)
//   - detailed results table
// Data entry / editing happens on admin.html.

// 7 active categories, aligned to the leading green-building rating's key credits. DB columns are kept
// (energy/carbon/waste/water/ieq/site/innovation) but two are repurposed:
//   site = Sustainable Materials, innovation = Sustainable Transport.
const CATEGORY_META = [
    { id: 'energy',     name: 'Energy Use',                 icon: '⚡', color: '#ff6600' },
    { id: 'ieq',        name: 'Indoor Environment Quality', icon: '🏠', color: '#FFC107' },
    { id: 'carbon',     name: 'Embodied Carbon',            icon: '🏗️', color: '#795548' },
    { id: 'site',       name: 'Sustainable Materials',      icon: '🧱', color: '#4CAF50' },
    { id: 'water',      name: 'Water Use',                  icon: '💧', color: '#2196F3' },
    { id: 'waste',      name: 'Construction Waste Minimisation', icon: '♻️', color: '#009688' },
    { id: 'innovation', name: 'Sustainable Transport',      icon: '🚌', color: '#9C27B0' }
];
const MAX_SCORE = 20;

const PROJECT_COLORS = ['#90A4AE', '#42A5F5', '#66BB6A', '#ff6600'];

let assessmentRows = [];   // latest assessment per project, in delivery order
let selectedIndex = 0;
let wheelChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initSimplicityDb();
        // latest assessment per project, ordered by delivery order of the projects table seeds
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
        selectProject(assessmentRows.length - 1); // newest project by default
        renderStandardGroups();
    } catch (err) {
        console.error('Scoring view failed to load:', err);
        document.getElementById('trendStrip').innerHTML =
            '<p style="color:#dc3545;">Could not load the results database (needs internet on first load).</p>';
    }
});

function scoresOf(row) {
    return CATEGORY_META.map(c => row[c.id] || 0);
}

function totalOf(row) {
    return scoresOf(row).reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Comparison strip + trend badge
// ---------------------------------------------------------------------------
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
            ${arrow}
        `;
        card.onclick = () => selectProject(i);
        strip.appendChild(card);
    });

    // Overall direction: improving / declining / wavering
    const deltas = totals.slice(1).map((t, i) => t - totals[i]);
    const ups = deltas.filter(d => d > 0).length;
    const downs = deltas.filter(d => d < 0).length;
    let badge, cls;
    if (ups && !downs)      { badge = '▲ Improving';  cls = 'up'; }
    else if (downs && !ups) { badge = '▼ Declining';  cls = 'down'; }
    else                    { badge = '〜 Wavering';  cls = 'flat'; }
    const el = document.getElementById('trendBadge');
    el.textContent = badge;
    el.className = 'trend-badge ' + cls;
}

// ---------------------------------------------------------------------------
// Combined totals trend (context line)
// ---------------------------------------------------------------------------
function buildTotalsTrend() {
    const ctx = document.getElementById('totalsTrendChart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: assessmentRows.map(r => [r.project_name, r.location || '']),
            datasets: [{
                label: 'Combined score (all categories)',
                data: assessmentRows.map(totalOf),
                borderColor: '#ff6600',
                backgroundColor: 'rgba(255, 102, 0, 0.08)',
                borderWidth: 3,
                pointRadius: 7,
                pointBackgroundColor: '#ff6600',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => c.parsed.y + ' / 140 combined' } }
            },
            scales: {
                y: {
                    min: 0, max: 140,
                    title: { display: true, text: 'Combined score (max 140)', font: { size: 12, weight: 'bold' } },
                    grid: { color: '#eee' }
                },
                x: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Radar: every category (out of 20) for every project, one graph
// ---------------------------------------------------------------------------
function buildRadar() {
    const ctx = document.getElementById('categoriesRadarChart');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: CATEGORY_META.map(c => c.name.replace(' & ', ' & ')),
            datasets: assessmentRows.map((row, i) => ({
                label: row.project_name,
                data: scoresOf(row),
                borderColor: PROJECT_COLORS[i % PROJECT_COLORS.length],
                backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] + (i === assessmentRows.length - 1 ? '33' : '14'),
                borderWidth: i === assessmentRows.length - 1 ? 3 : 2,
                pointRadius: 3,
                pointBackgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length]
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.r}/20` } }
            },
            scales: {
                r: {
                    min: 0, max: MAX_SCORE,
                    ticks: { stepSize: 5, font: { size: 10 } },
                    pointLabels: { font: { size: 10, weight: 'bold' } }
                }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Project selector + score wheel
// ---------------------------------------------------------------------------
function buildProjectSelector() {
    const sel = document.getElementById('projectSelector');
    sel.innerHTML = '';
    assessmentRows.forEach((row, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'building-btn';
        btn.dataset.project = String(i);
        btn.onclick = () => selectProject(i);
        btn.innerHTML = escapeHtml(row.project_name) + '<small>' + escapeHtml(row.location || '') + '</small>';
        sel.appendChild(btn);
    });
}

function selectProject(index) {
    selectedIndex = index;
    const row = assessmentRows[index];
    document.querySelectorAll('#projectSelector .building-btn').forEach((b, i) =>
        b.classList.toggle('active', i === index));

    // Scorecard side panel
    document.getElementById('scorecardTitle').textContent = row.project_name + ' — ' + (row.location || '');
    const when = new Date(row.created_at).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('scorecardMeta').textContent =
        `Assessed ${when}` + (row.assessor ? ` by ${row.assessor}` : '') + (row.notes ? ` · ${row.notes}` : '');

    buildCategoryBars(row);
    buildScoreWheel(row);
    buildDetailTable(row);
}

function buildCategoryBars(row) {
    const wrap = document.getElementById('categoryBars');
    wrap.innerHTML = '';
    CATEGORY_META.forEach(c => {
        const score = row[c.id] || 0;
        const pct = (score / MAX_SCORE) * 100;
        const bar = document.createElement('div');
        bar.className = 'category-bar';
        const mapLink = c.id === 'innovation'
            ? ` <button class="map-mini-btn" onclick="openTransportMap()" title="Explore the transport map">🗺️ map</button>` : '';
        bar.innerHTML = `
            <div class="category-bar-label">
                <span>${c.icon} ${escapeHtml(c.name)}${mapLink}</span>
                <strong>${score}/20</strong>
            </div>
            <div class="category-bar-track">
                <div class="category-bar-fill" style="width:${pct}%; background:${c.color};"></div>
            </div>
        `;
        wrap.appendChild(bar);
    });
}

// The score wheel: a polar-area chart divided into 7 equal segments,
// each filled from the centre to its score out of 20.
function buildScoreWheel(row) {
    const ctx = document.getElementById('scoreWheelChart');
    const scores = scoresOf(row);

    if (wheelChart) wheelChart.destroy();
    wheelChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: CATEGORY_META.map(c => c.name),
            datasets: [
                {
                    // background "out of 20" wedges
                    data: CATEGORY_META.map(() => MAX_SCORE),
                    backgroundColor: CATEGORY_META.map(c => c.color + '1A'),
                    borderColor: '#ffffff',
                    borderWidth: 2
                },
                {
                    // actual scores
                    data: scores,
                    backgroundColor: CATEGORY_META.map(c => c.color + 'CC'),
                    borderColor: CATEGORY_META.map(c => c.color),
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        font: { size: 11 },
                        // generate from category meta (default would use dataset 0)
                        generateLabels: () => CATEGORY_META.map((c, i) => ({
                            text: `${c.name} — ${scores[i]}/20`,
                            fillStyle: c.color,
                            strokeStyle: c.color,
                            pointStyle: 'circle'
                        }))
                    }
                },
                tooltip: {
                    filter: item => item.datasetIndex === 1,
                    callbacks: {
                        label: c => `${CATEGORY_META[c.dataIndex].name}: ${c.parsed.r}/20`
                    }
                }
            },
            scales: {
                r: {
                    min: 0, max: MAX_SCORE,
                    ticks: { stepSize: 5, backdropColor: 'rgba(255,255,255,0.75)', font: { size: 10 } },
                    grid: { color: '#ddd' }
                }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Detailed results — expandable accordion (criteria + band + notes)
// ---------------------------------------------------------------------------
function notesOf(row) {
    try { return (JSON.parse(row.answers_json || '{}').notes) || {}; }
    catch (e) { return {}; }
}

function buildDetailTable(row) {
    document.getElementById('detailTitle').textContent =
        row.project_name + ' — Detailed Results';
    const wrap = document.getElementById('detailAccordion');
    wrap.innerHTML = '';
    const notes = notesOf(row);

    CATEGORY_META.forEach((c, idx) => {
        const score = row[c.id] || 0;
        const pct = Math.round((score / MAX_SCORE) * 100);
        const band = (typeof scoringBand === 'function') ? scoringBand(score)
                     : { label: '', color: '#666', cls: '' };
        const crit = (typeof ACTIVE_CRITERIA !== 'undefined') ? ACTIVE_CRITERIA[c.id] : null;

        const criteriaHtml = crit ? crit.criteria.map(ci => `
            <li><strong>${escapeHtml(ci.name)}</strong> — ${escapeHtml(ci.desc)}</li>`).join('') : '';

        const transportBtn = c.id === 'innovation'
            ? `<button class="map-launch-btn" onclick="openTransportMap()">🗺️ Explore the transport map</button>` : '';

        const item = document.createElement('div');
        item.className = 'detail-item';
        item.innerHTML = `
            <button class="detail-head" onclick="toggleDetail(this)">
                <span class="detail-head-main">
                    <span class="detail-icon">${c.icon}</span>
                    <span class="detail-name">${escapeHtml(c.name)}</span>
                </span>
                <span class="detail-head-right">
                    <span class="detail-band ${band.cls}" style="background:${band.color}1a;color:${band.color};">${band.label}</span>
                    <span class="db-score-pill">${score}/20</span>
                    <span class="detail-chevron">▾</span>
                </span>
            </button>
            <div class="detail-body">
                <div class="detail-bar-track"><div class="detail-bar-fill" style="width:${pct}%;background:${c.color};"></div></div>
                ${crit ? `<p class="detail-credits">Aligned credits: ${escapeHtml(crit.credits)}</p>
                          <p class="detail-intro">${escapeHtml(crit.intro)}</p>
                          <h5>Scored on</h5><ul class="detail-criteria">${criteriaHtml}</ul>` : ''}
                ${notes[c.id] ? `<div class="detail-note"><strong>Why this score:</strong> ${escapeHtml(notes[c.id])}</div>` : ''}
                ${transportBtn}
            </div>
        `;
        wrap.appendChild(item);
    });
}

function toggleDetail(btn) {
    btn.closest('.detail-item').classList.toggle('open');
}

// ---------------------------------------------------------------------------
// The Simplicity standard — the other rating credits (full marks by default)
// ---------------------------------------------------------------------------
function renderStandardGroups() {
    const wrap = document.getElementById('standardGroups');
    if (!wrap || typeof SIMPLICITY_STANDARD === 'undefined') return;
    wrap.innerHTML = SIMPLICITY_STANDARD.map(group => `
        <div class="standard-group">
            <h3 class="standard-group-title">${group.icon} ${escapeHtml(group.group)}</h3>
            <div class="standard-credit-grid">
                ${group.credits.map(cr => `
                    <div class="standard-credit">
                        <div class="standard-credit-head">
                            <span class="standard-code">${escapeHtml(cr.code)}</span>
                            <span class="standard-credit-name">${escapeHtml(cr.name)}</span>
                            <span class="standard-full">✓ ${cr.points} pts</span>
                        </div>
                        <p class="standard-purpose">${escapeHtml(cr.purpose)}</p>
                        <p class="standard-achieves"><strong>Simplicity:</strong> ${escapeHtml(cr.achieves)}</p>
                    </div>`).join('')}
            </div>
        </div>`).join('');
}

// ---------------------------------------------------------------------------
// Transport map overlay
// ---------------------------------------------------------------------------
function openTransportMap() {
    const overlay = document.getElementById('transportMapOverlay');
    const frame = document.getElementById('transportMapFrame');
    if (frame.src === 'about:blank' || !frame.src.includes('transport-map')) {
        frame.src = 'transport-map.html';
    }
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeTransportMap() {
    document.getElementById('transportMapOverlay').style.display = 'none';
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTransportMap(); });

// ---------------------------------------------------------------------------
// Scorecard / detail toggle
// ---------------------------------------------------------------------------
function setScoreView(view) {
    const scorecard = view === 'scorecard';
    document.getElementById('scorecardView').style.display = scorecard ? 'block' : 'none';
    document.getElementById('detailView').style.display = scorecard ? 'none' : 'block';
    document.getElementById('viewScorecardBtn').classList.toggle('active', scorecard);
    document.getElementById('viewDetailBtn').classList.toggle('active', !scorecard);
}
