// scoring-self.js — "Score Your Project" guided self-assessment wizard
// Wizard: Step 0 = project details, Steps 1-7 = one category each, Step 8 = results
// Saves to localStorage key simplicity_self_assessments_v1
// PDF via window.print() with @media print isolation

(function () {

const BANDS = [
    { label: 'Not Assessed', score: 0,  color: '#9e9e9e' },
    { label: 'Developing',   score: 4,  color: '#dc3545' },
    { label: 'Fair',         score: 8,  color: '#fd7e14' },
    { label: 'Good',         score: 12, color: '#5cb85c' },
    { label: 'Excellent',    score: 16, color: '#28a745' },
    { label: 'Exceptional',  score: 20, color: '#1b8a3a' },
];

const CAT_KEYS = ['energy', 'ieq', 'carbon', 'site', 'water', 'waste', 'innovation'];

let step = 0;
let project = { name: '', type: 'Apartment', notes: '' };
let scores = {};
let selfWheelChart = null;

// ── Public API ───────────────────────────────────────────────────────────────

window.openSelfScorer = function () {
    step = 0;
    project = { name: '', type: 'Apartment', notes: '' };
    scores = {};
    CAT_KEYS.forEach(k => { scores[k] = null; });
    document.getElementById('selfScorerOverlay').style.display = 'flex';
    render();
};

window.closeSelfScorer = function () {
    document.getElementById('selfScorerOverlay').style.display = 'none';
    destroyWheel();
};

window.selfGoNext = function () {
    if (step === 0) {
        const nameEl = document.getElementById('selfProjectName');
        const name = nameEl.value.trim();
        if (!name) { nameEl.focus(); nameEl.classList.add('self-input-error'); return; }
        nameEl.classList.remove('self-input-error');
        project.name = name;
        project.type = document.getElementById('selfProjectType').value;
        project.notes = document.getElementById('selfProjectNotes').value.trim();
        step = 1; render(); return;
    }
    if (step >= 1 && step <= 7) {
        const key = CAT_KEYS[step - 1];
        if (scores[key] === null || scores[key] === undefined) {
            document.getElementById('selfBandError').style.display = 'block'; return;
        }
        if (step < 7) { step++; render(); }
        else { step = 8; renderResults(); }
        return;
    }
};

window.selfGoBack = function () {
    if (step === 8) { step = 7; render(); return; }
    if (step > 0) { step--; render(); }
};

window.selfSelectBand = function (key, score) {
    scores[key] = score;
    document.querySelectorAll('.band-btn').forEach(btn => {
        const isSelected = parseInt(btn.dataset.score) === score;
        btn.classList.toggle('selected', isSelected);
    });
    document.getElementById('selfBandError').style.display = 'none';
};

window.selfSaveLocal = async function () {
    const btn = document.getElementById('selfSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    if (window.sbIsLoggedIn && window.sbIsLoggedIn()) {
        const { error } = await window.sbSaveAssessment(project, scores);
        if (error) {
            btn.textContent = '✗ Error';
            btn.disabled = false;
            console.error('Supabase save error:', error.message);
        } else {
            btn.textContent = '✓ Saved to your account';
            window.selfLoadAssessments();
        }
    } else {
        const saved = JSON.parse(localStorage.getItem('simplicity_self_assessments_v1') || '[]');
        saved.push({
            id: Date.now(),
            created_at: new Date().toISOString(),
            project: { ...project },
            scores: { ...scores },
            total: CAT_KEYS.reduce((a, k) => a + (scores[k] || 0), 0)
        });
        localStorage.setItem('simplicity_self_assessments_v1', JSON.stringify(saved));
        btn.textContent = '✓ Saved locally';
    }
};

window.selfPrintPDF = function () {
    window.print();
};

// ── Your Assessments panel ───────────────────────────────────────────────────

window.selfLoadAssessments = async function () {
    const panel = document.getElementById('yourAssessmentsPanel');
    if (!panel) return;

    if (!window.sbIsLoggedIn || !window.sbIsLoggedIn()) {
        panel.innerHTML = `<div class="your-assess-login">
            <p>Sign in to save and revisit your project assessments.</p>
            <button onclick="openAuthModal()">Sign In / Create Account</button>
        </div>`;
        return;
    }

    const { data, error } = await window.sbLoadAssessments();
    if (error || !data || !data.length) {
        panel.innerHTML = `<p class="your-assess-login">No saved assessments yet. Score your project above!</p>`;
        return;
    }

    panel.innerHTML = data.map(r => {
        const total = ['energy','ieq','carbon','site','water','waste','innovation']
            .reduce((a, k) => a + (r[k] || 0), 0);
        const date  = new Date(r.created_at).toLocaleDateString('en-NZ', { day:'numeric', month:'short', year:'numeric' });
        return `<div class="your-assess-row">
            <div>
                <span class="your-assess-name">${esc(r.project_name)}</span>
                <span class="your-assess-meta">${esc(r.project_type || '')} &middot; ${date}</span>
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <span class="your-assess-score">${total}/140</span>
                <button class="your-assess-del" title="Delete" onclick="window.selfDeleteAssessment('${r.id}')">✕</button>
            </div>
        </div>`;
    }).join('');
};

window.selfDeleteAssessment = async function (id) {
    if (!confirm('Delete this assessment?')) return;
    await window.sbDeleteAssessment(id);
    window.selfLoadAssessments();
};

// ── Render helpers ───────────────────────────────────────────────────────────

function updateChrome() {
    const label   = document.getElementById('selfStepLabel');
    const fill    = document.getElementById('selfProgress');
    const backBtn = document.getElementById('selfBackBtn');
    const nextBtn = document.getElementById('selfNextBtn');
    const footer  = document.getElementById('selfFooter');

    if (step === 0) {
        label.textContent = 'Your Project';
        fill.style.width = '0%';
        backBtn.style.visibility = 'hidden';
        nextBtn.textContent = 'Start Scoring →';
        nextBtn.style.display = '';
        footer.style.display = '';
    } else if (step <= 7) {
        const meta = CATEGORY_META[step - 1];
        label.innerHTML = `${meta.icon} <strong>${meta.name}</strong>&ensp;<small class="self-step-num">Step ${step} of 7</small>`;
        fill.style.width = (step / 7 * 100) + '%';
        backBtn.style.visibility = 'visible';
        backBtn.textContent = '← Back';
        nextBtn.textContent = step < 7 ? 'Next →' : 'See Results →';
        nextBtn.style.display = '';
        footer.style.display = '';
    } else {
        // results
        label.innerHTML = `Results &mdash; <strong>${esc(project.name)}</strong>`;
        fill.style.width = '100%';
        backBtn.style.visibility = 'visible';
        backBtn.textContent = '← Edit';
        nextBtn.style.display = 'none';
        footer.style.display = 'none';
    }
}

function render() {
    updateChrome();
    destroyWheel();
    const body = document.getElementById('selfScorerBody');
    if (step === 0) renderDetails(body);
    else renderCategory(body, step);
}

function renderDetails(el) {
    el.innerHTML = `
        <div class="self-details-form">
            <p class="self-intro">Rate your project against the same seven categories used to benchmark Simplicity builds.
            Takes about 2 minutes — select a performance band for each category.</p>
            <label class="self-label">Project name <span class="self-req">*</span>
                <input id="selfProjectName" class="self-input" type="text"
                    placeholder="e.g. Elm Street Apartments" value="${esc(project.name)}">
            </label>
            <label class="self-label">Project type
                <select id="selfProjectType" class="self-input">
                    ${['Apartment building','Townhouse / terrace','Standalone house','Mixed-use','Commercial','Other']
                        .map(t => `<option ${project.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
            </label>
            <label class="self-label">Notes <span class="self-optional">(optional)</span>
                <textarea id="selfProjectNotes" class="self-input self-textarea" rows="2"
                    placeholder="Location, year, anything useful…">${esc(project.notes)}</textarea>
            </label>
        </div>`;
    setTimeout(() => document.getElementById('selfProjectName').focus(), 50);
}

function renderCategory(el, s) {
    const key  = CAT_KEYS[s - 1];
    const cat  = ACTIVE_CRITERIA[key];
    const meta = CATEGORY_META[s - 1];
    const cur  = scores[key];

    el.innerHTML = `
        <div class="self-cat-header" style="border-left:4px solid ${meta.color}">
            <div class="self-cat-credits">${cat.credits}</div>
            <p class="self-cat-intro">${cat.intro}</p>
        </div>
        <div class="self-criteria-list">
            ${cat.criteria.map(c => `
                <div class="self-criterion">
                    <span class="self-crit-name">${c.name}</span>
                    <span class="self-crit-desc">${c.desc}</span>
                </div>`).join('')}
        </div>
        <p class="self-band-prompt">How does your project perform on <strong>${meta.name}</strong>?</p>
        <div class="band-picker">
            ${BANDS.map(b => `
                <button class="band-btn${cur === b.score ? ' selected' : ''}"
                        data-score="${b.score}"
                        style="--bc:${b.color}"
                        onclick="selfSelectBand('${key}', ${b.score})">
                    <span class="band-score">${b.score}/20</span>
                    <span class="band-label">${b.label}</span>
                </button>`).join('')}
        </div>
        <p id="selfBandError" class="self-error" style="display:none;">Please select a rating to continue.</p>`;
}

function renderResults() {
    updateChrome();
    destroyWheel();
    const body  = document.getElementById('selfScorerBody');
    const total = CAT_KEYS.reduce((a, k) => a + (scores[k] || 0), 0);

    let compHtml = '';
    if (typeof assessmentRows !== 'undefined' && assessmentRows.length) {
        const simAvg = Math.round(
            assessmentRows.reduce((a, r) => a + CAT_KEYS.reduce((s, k) => s + (r[k] || 0), 0), 0)
            / assessmentRows.length
        );
        const diff = total - simAvg;
        const diffStr = diff > 0
            ? `<span style="color:#28a745">▲ +${diff} above Simplicity average</span>`
            : diff < 0
            ? `<span style="color:#dc3545">▼ ${Math.abs(diff)} below Simplicity average</span>`
            : `<span style="color:#666">= Simplicity average</span>`;
        compHtml = `<p class="self-comp">${diffStr} (avg ${simAvg}/140)</p>`;
    }

    const overallBand = BANDS.reduce((best, b) => b.score <= total / 7 ? b : best, BANDS[0]);

    body.innerHTML = `
        <div id="selfResultsPanel" class="self-results">
            <div class="self-result-top">
                <div class="self-wheel-wrap">
                    <canvas id="selfResultWheel" width="200" height="200"></canvas>
                </div>
                <div class="self-result-meta">
                    <div class="self-result-name">${esc(project.name)}</div>
                    <div class="self-result-type">${esc(project.type)}${project.notes ? ' · ' + esc(project.notes) : ''}</div>
                    <div class="self-total-row">
                        <span class="self-total-num">${total}</span>
                        <span class="self-total-max">&thinsp;/&thinsp;140</span>
                        <span class="self-overall-band" style="background:${overallBand.color}">${overallBand.label}</span>
                    </div>
                    ${compHtml}
                </div>
            </div>
            <div class="self-cat-scores">
                ${CAT_KEYS.map(k => {
                    const meta = CATEGORY_META.find(m => m.id === k);
                    const s    = scores[k] || 0;
                    const band = BANDS.find(b => b.score === s) || BANDS[0];
                    return `<div class="self-cat-row">
                        <span class="self-cat-icon">${meta.icon}</span>
                        <span class="self-cat-name">${meta.name}</span>
                        <div class="self-bar-track">
                            <div class="self-bar-fill" style="width:${s/20*100}%;background:${band.color}"></div>
                        </div>
                        <span class="self-cat-pts" style="color:${band.color}">${s}/20</span>
                        <span class="self-band-chip" style="background:${band.color}">${band.label}</span>
                    </div>`;
                }).join('')}
            </div>
            <div class="self-result-actions">
                <button id="selfSaveBtn" class="self-btn secondary" onclick="selfSaveLocal()">💾 Save locally</button>
                <button class="self-btn primary" onclick="selfPrintPDF()">🖨️ Export PDF</button>
            </div>
        </div>`;

    setTimeout(() => {
        const ctx = document.getElementById('selfResultWheel');
        if (!ctx) return;
        selfWheelChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: CATEGORY_META.map(m => m.name),
                datasets: [{
                    data: CAT_KEYS.map(k => scores[k] || 0),
                    backgroundColor: CATEGORY_META.map(m => m.color + 'bb'),
                    borderColor:     CATEGORY_META.map(m => m.color),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: false,
                scales: { r: { min: 0, max: 20, ticks: { display: false }, grid: { color: '#e8e8e8' } } },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}/20` } }
                }
            }
        });
    }, 50);
}

function destroyWheel() {
    if (selfWheelChart) { selfWheelChart.destroy(); selfWheelChart = null; }
}

function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

})();
