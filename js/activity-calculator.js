// Simplicity Living — shared Activity calculator engine
// Renders any element (from activity-data.js) into #activityApp.
// The page sets  window.ACTIVITY_ELEMENT = 'walls' | 'foundation'.
// URL params:  ?project=waiatarua   (prefilled substantiation mode)
//              ?mode=blank          (empty public shell)
// -----------------------------------------------------------------------------

(function () {
    const elKey = window.ACTIVITY_ELEMENT;
    const el = ACTIVITY_ELEMENTS[elKey];
    const root = document.getElementById('activityApp');
    if (!el || !root) return;

    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') === 'blank' ? 'blank' : 'project';
    const projectKey = params.get('project') || 'waiatarua';
    const project = activityProject(projectKey);
    const hasData = mode === 'project' && activityHasData(projectKey, elKey);

    // ── state ──
    const state = { values: {}, assumptions: {}, scenario: 'simplicity' };
    el.inputs.forEach(f => { state.values[f.id] = f.value; });
    el.assumptions.forEach(a => { state.assumptions[a.id] = a.value; });
    if (mode === 'project' && hasData) {
        Object.assign(state.values, ACTIVITY_PREFILL[projectKey][elKey]);
    } else if (mode === 'blank') {
        el.inputs.forEach(f => { if (f.lever || f.group === 'Quantities') state.values[f.id] = ''; });
    }

    const fmt = (n) => {
        n = +n || 0;
        if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
        if (Math.abs(n) >= 100) return Math.round(n).toString();
        return (Math.round(n * 10) / 10).toString();
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ── coming-soon short-circuit ──
    if (mode === 'project' && !hasData) {
        root.innerHTML = `
          <div class="act-soon-wrap">
            <div class="act-soon">
              <div class="act-soon-icon">🚧</div>
              <h2>${esc(el.name)} — ${esc(project ? project.name : 'this project')}</h2>
              <p>This element hasn't been substantiated for <strong>${esc(project ? project.name : 'this project')}</strong> yet. Waiatarua is being completed first; the other projects follow once the method is locked down.</p>
              <div class="act-soon-actions">
                <a class="act-btn" href="activity-${elKey}.html?project=waiatarua">See it for Waiatarua →</a>
                <a class="act-btn act-btn-ghost" href="productivity.html">Back to Site Activity</a>
              </div>
            </div>
          </div>`;
        return;
    }

    // ── group helpers ──
    const inputGroups = () => {
        const g = {};
        el.inputs.forEach(f => { (g[f.group] = g[f.group] || []).push(f); });
        return g;
    };
    const assumpGroups = () => {
        const g = {};
        el.assumptions.forEach(a => { (g[a.grp] = g[a.grp] || []).push(a); });
        return g;
    };

    // ── build shell ──
    function render() {
        const banner = mode === 'blank'
            ? `<div class="act-mode act-mode-blank"><span class="act-mode-tag">Public tool</span> Blank shell — enter your own project's quantities and logistics to see how the Simplicity approach cuts A4–A5.</div>`
            : `<div class="act-mode act-mode-project"><span class="act-mode-tag">Substantiating</span> Prefilled with <strong>${esc(project.name)}</strong> data (${esc(project.location)}). Figures are placeholders pending final substantiation.</div>`;

        let inputsHtml = '';
        const ig = inputGroups();
        Object.keys(ig).forEach(grp => {
            inputsHtml += `<div class="act-fieldgroup"><h4>${esc(grp)}</h4><div class="act-fields">`;
            ig[grp].forEach(f => {
                inputsHtml += `<label class="act-field${f.lever ? ' act-field-lever' : ''}">
                    <span class="act-field-lbl">${esc(f.label)}${f.lever ? ' <span class="act-lever-dot" title="Key lever vs baseline">●</span>' : ''}</span>
                    <span class="act-input-wrap"><input type="number" data-vid="${f.id}" value="${state.values[f.id]}" min="${f.min != null ? f.min : ''}" step="${f.step || 'any'}" placeholder="0"><span class="act-unit">${esc(f.unit)}</span></span>
                </label>`;
            });
            inputsHtml += `</div></div>`;
        });

        let assumpHtml = '';
        const ag = assumpGroups();
        Object.keys(ag).forEach(grp => {
            assumpHtml += `<div class="act-fieldgroup"><h4>${esc(grp)}</h4><div class="act-fields act-fields-sm">`;
            ag[grp].forEach(a => {
                assumpHtml += `<label class="act-field">
                    <span class="act-field-lbl">${esc(a.label)}</span>
                    <span class="act-input-wrap"><input type="number" data-aid="${a.id}" value="${state.assumptions[a.id]}" step="${a.step || 'any'}"><span class="act-unit">${esc(a.unit)}</span></span>
                </label>`;
            });
            assumpHtml += `</div></div>`;
        });

        root.innerHTML = `
          ${banner}
          <div class="act-grid">
            <section class="act-panel act-inputs">
              <div class="act-card">
                <div class="act-card-head"><h3>Inputs</h3><button type="button" class="act-reset" id="actReset">Reset</button></div>
                ${inputsHtml}
              </div>
              <div class="act-card act-collapse" id="actAssumptions">
                <button type="button" class="act-collapse-head" id="actAssumpToggle" aria-expanded="false">
                  <h3>Assumptions &amp; emission factors</h3><span class="act-chev">▾</span>
                </button>
                <div class="act-collapse-body" hidden>
                  <p class="act-note">Indicative early-stage defaults (MfE 2023, ME1781). Override any value with project-specific data — the whole estimate stays transparent.</p>
                  ${assumpHtml}
                </div>
              </div>
            </section>

            <section class="act-panel act-results">
              <div class="act-card act-badge-card">
                <div class="act-badge">
                  <div class="act-badge-val"><span id="actIntensity">0</span> <small>kgCO₂e / ${esc(el.unitLabel)}</small></div>
                  <div class="act-badge-sub">Simplicity approach · <span id="actBaseIntensity">0</span> baseline</div>
                </div>
                <div class="act-saving" id="actSavingPill">–0%</div>
              </div>

              <div class="act-card">
                <div class="act-kpirow">
                  <div class="act-kpi act-kpi-base"><div class="act-kpi-v" id="actBaseTotal">0</div><div class="act-kpi-l">Baseline A4–A5</div></div>
                  <div class="act-kpi act-kpi-simp"><div class="act-kpi-v" id="actSimpTotal">0</div><div class="act-kpi-l">Simplicity A4–A5</div></div>
                  <div class="act-kpi act-kpi-save"><div class="act-kpi-v" id="actSaved">0</div><div class="act-kpi-l">Saved (kgCO₂e)</div></div>
                </div>
                <div class="act-stagesplit">
                  <div><span class="act-stage-tag a4">A4</span> Transport &nbsp;<strong id="actA4Simp">0</strong> <small>vs <span id="actA4Base">0</span> baseline</small></div>
                  <div><span class="act-stage-tag a5">A5</span> Construction &nbsp;<strong id="actA5Simp">0</strong> <small>vs <span id="actA5Base">0</span> baseline</small></div>
                </div>
              </div>

              <div class="act-card">
                <h3>Where the carbon is — and the saving</h3>
                <div class="act-breakdown" id="actBreakdown"></div>
                <p class="act-bd-legend"><span class="sw sw-base"></span> Baseline &nbsp;&nbsp;<span class="sw sw-simp"></span> Simplicity</p>
              </div>

              <div class="act-card act-viz-card">
                <div class="act-viz-head">
                  <h3>Live site view</h3>
                  <div class="act-scen-toggle">
                    <button type="button" data-scen="baseline"  class="${state.scenario === 'baseline' ? 'active' : ''}">Baseline</button>
                    <button type="button" data-scen="simplicity" class="${state.scenario === 'simplicity' ? 'active' : ''}">Simplicity</button>
                  </div>
                </div>
                <div class="act-viz" id="actViz"></div>
                <div class="act-quantities" id="actQuant"></div>
              </div>
            </section>
          </div>`;

        wire();
        recompute();
    }

    function wire() {
        root.querySelectorAll('input[data-vid]').forEach(inp =>
            inp.addEventListener('input', () => { state.values[inp.dataset.vid] = inp.value === '' ? '' : +inp.value; recompute(); }));
        root.querySelectorAll('input[data-aid]').forEach(inp =>
            inp.addEventListener('input', () => { state.assumptions[inp.dataset.aid] = inp.value === '' ? '' : +inp.value; recompute(); }));

        const at = document.getElementById('actAssumpToggle');
        if (at) at.addEventListener('click', () => {
            const body = at.parentElement.querySelector('.act-collapse-body');
            const open = at.getAttribute('aria-expanded') === 'true';
            at.setAttribute('aria-expanded', String(!open));
            body.hidden = open;
            at.parentElement.classList.toggle('open', !open);
        });

        const reset = document.getElementById('actReset');
        if (reset) reset.addEventListener('click', () => {
            el.inputs.forEach(f => { state.values[f.id] = f.value; });
            if (mode === 'project' && hasData) Object.assign(state.values, ACTIVITY_PREFILL[projectKey][elKey]);
            render();
        });

        root.querySelectorAll('.act-scen-toggle button').forEach(b =>
            b.addEventListener('click', () => {
                state.scenario = b.dataset.scen;
                root.querySelectorAll('.act-scen-toggle button').forEach(x => x.classList.toggle('active', x === b));
                paintViz();
            }));
    }

    let last = null;
    function recompute() {
        const r = el.compute(state.values, state.assumptions);
        last = r;
        const sum = (arr, k) => arr.reduce((s, x) => s + (+x[k] || 0), 0);
        const a4 = r.streams.filter(s => s.stage === 'A4');
        const a5 = r.streams.filter(s => s.stage === 'A5');
        const baseTotal = sum(r.streams, 'baseline');
        const simpTotal = sum(r.streams, 'simplicity');
        const saved = baseTotal - simpTotal;
        const pct = baseTotal > 0 ? Math.round(saved / baseTotal * 100) : 0;
        const denom = r.perUnitDenominator > 0 ? r.perUnitDenominator : 1;

        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set('actIntensity', fmt(simpTotal / denom));
        set('actBaseIntensity', fmt(baseTotal / denom));
        set('actBaseTotal', fmt(baseTotal));
        set('actSimpTotal', fmt(simpTotal));
        set('actSaved', fmt(saved));
        set('actA4Simp', fmt(sum(a4, 'simplicity')));
        set('actA4Base', fmt(sum(a4, 'baseline')));
        set('actA5Simp', fmt(sum(a5, 'simplicity')));
        set('actA5Base', fmt(sum(a5, 'baseline')));
        const pill = document.getElementById('actSavingPill');
        if (pill) { pill.textContent = (pct >= 0 ? '−' : '+') + Math.abs(pct) + '%'; pill.classList.toggle('neg', pct < 0); }

        // breakdown bars (scaled to the largest baseline stream)
        const maxBase = Math.max(1, ...r.streams.map(s => +s.baseline || 0));
        const bd = document.getElementById('actBreakdown');
        if (bd) bd.innerHTML = r.streams.map(s => {
            const bW = (+s.baseline || 0) / maxBase * 100;
            const sW = (+s.simplicity || 0) / maxBase * 100;
            return `<div class="act-bd-row">
                <div class="act-bd-top"><span class="act-bd-lbl"><span class="act-stage-tag ${s.stage.toLowerCase()}">${s.stage}</span> ${esc(s.label)}</span>
                  <span class="act-bd-val">${fmt(s.simplicity)} <small>/ ${fmt(s.baseline)}</small></span></div>
                <div class="act-bd-track"><span class="act-bd-base" style="width:${bW}%"></span><span class="act-bd-simp" style="width:${sW}%;background:${s.color}"></span></div>
            </div>`;
        }).join('');

        const q = document.getElementById('actQuant');
        if (q) q.innerHTML = r.quantities.map(x =>
            `<div class="act-q"><span class="act-q-v">${fmt(x.value)}</span><span class="act-q-l">${esc(x.label)}${x.unit ? ' (' + esc(x.unit) + ')' : ''}</span></div>`).join('');

        paintViz();
    }

    function paintViz() {
        const v = document.getElementById('actViz');
        if (v && el.viz) v.innerHTML = el.viz(state.values, last, state.scenario);
    }

    render();
})();
