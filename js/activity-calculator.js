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
              <div class="act-soon-icon">${typeof appIcon === 'function' ? appIcon('cone') : ''}</div>
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
          <div id="actWorkings"></div>
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
                  <div class="act-badge-sub">Simplicity approach · <span id="actBaseIntensity">0</span> typical contractor</div>
                </div>
                <div class="act-saving" id="actSavingPill">–0%</div>
              </div>
              <p class="act-badge-note">This is the detailed site model: Simplicity’s measured figure against
                the same model run on typical contractor assumptions — full trucks and short hauls versus
                part loads and long ones. The Green Star default above is a different thing again: an
                industry lookup, not a site model.</p>

              <div class="act-card">
                <div class="act-kpirow">
                  <div class="act-kpi act-kpi-base"><div class="act-kpi-v" id="actBaseTotal">0</div><div class="act-kpi-l">Typical contractor A4–A5</div></div>
                  <div class="act-kpi act-kpi-simp"><div class="act-kpi-v" id="actSimpTotal">0</div><div class="act-kpi-l">Simplicity A4–A5</div></div>
                  <div class="act-kpi act-kpi-save"><div class="act-kpi-v" id="actSaved">0</div><div class="act-kpi-l">Saved (kgCO₂e)</div></div>
                </div>
                <div class="act-stagesplit">
                  <div><span class="act-stage-tag a4">A4</span> Transport &nbsp;<strong id="actA4Simp">0</strong> <small>vs <span id="actA4Base">0</span> typical</small></div>
                  <div><span class="act-stage-tag a5">A5</span> Construction &nbsp;<strong id="actA5Simp">0</strong> <small>vs <span id="actA5Base">0</span> typical</small></div>
                </div>
              </div>

              <div class="act-card">
                <h3>Where the carbon is — and the saving</h3>
                <div class="act-breakdown" id="actBreakdown"></div>
                <p class="act-bd-legend"><span class="sw sw-base"></span> Typical contractor &nbsp;&nbsp;<span class="sw sw-simp"></span> Simplicity</p>
              </div>

              <div class="act-card act-viz-card">
                <div class="act-viz-head">
                  <h3>Live site view</h3>
                  <div class="act-scen-toggle">
                    <button type="button" data-scen="baseline"  class="${state.scenario === 'baseline' ? 'active' : ''}">Typical</button>
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

        renderWorkings(r);
        paintViz();
    }

    function paintViz() {
        const v = document.getElementById('actViz');
        if (v && el.viz) v.innerHTML = el.viz(state.values, last, state.scenario);
    }

    // ── the workings: Green Star's own method printed beside ours ────────────────────
    // Both calculations, line by line, on one page. The Green Star side is the NZGBC
    // Embodied Carbon Calculator's logic reimplemented in greenstar-a45.js from the
    // project's own submission workbook; the Simplicity side is the model above.
    function renderWorkings(r) {
        const host = document.getElementById('actWorkings');
        if (!host) return;
        const gs = (typeof activityGreenStar === 'function')
            ? activityGreenStar(elKey, projectKey) : null;
        if (!gs || mode === 'blank') { host.innerHTML = ''; return; }

        const kg = (n) => Math.round(n).toLocaleString();
        const per = (n) => (n >= 10 ? n.toFixed(1) : n.toFixed(2));
        const denom = r.perUnitDenominator > 0 ? r.perUnitDenominator : 1;
        const a4 = r.streams.filter(s => s.stage === 'A4');
        const a5 = r.streams.filter(s => s.stage === 'A5');
        const sum = (arr) => arr.reduce((s, x) => s + (+x.simplicity || 0), 0);
        const simpA4 = sum(a4), simpA5 = sum(a5), simpTot = simpA4 + simpA5;

        const row = (label, formula, value) => `
          <tr><td class="w-lbl">${esc(label)}<em>${esc(formula)}</em></td>
              <td class="w-val">${kg(value)}</td></tr>`;

        // Green Star side
        const gsA4Rows = gs.a4.map(l => row(
            l.label + (l.seaKm > 0 ? ' — sea + road' : ' — from ' + l.source),
            l.formula, l.total)).join('');
        const gsA5Rows = gs.a5w.map(l => row(
            l.label + ' — wastage', l.formula, l.total)).join('')
            + row('Site activities — flat allowance', gs.a5a.formula, gs.a5a.total);

        // Simplicity side
        const sA4Rows = a4.map(s => row(s.label, s.fx || '', s.simplicity)).join('');
        const sA5Rows = a5.map(s => row(s.label, s.fx || '', s.simplicity)).join('');

        // Baseline side — a realistic conventional build of the same element (same line
        // items, run on the baseline assumptions). This is the reference the measured
        // figure reduces against, so the reduction is the Simplicity benefit.
        const sumB = (arr) => arr.reduce((s, x) => s + (+x.baseline || 0), 0);
        const blA4 = sumB(a4), blA5 = sumB(a5), blTot = blA4 + blA5;
        const blA4Rows = a4.map(s => row(s.label, '', s.baseline)).join('');
        const blA5Rows = a5.map(s => row(s.label, '', s.baseline)).join('');
        const redTot = blTot > 0 ? (blTot - simpTot) / blTot * 100 : 0;

        const ratio = simpTot > 0 ? gs.total / simpTot : 0;
        const a4Ratio = gs.a4Total > 0 ? simpA4 / gs.a4Total : 0;

        host.innerHTML = `
        <section class="act-card act-workings">
          <div class="w-head">
            <h3>Three references, one page</h3>
            <p>Left is the industry compliance number: the NZGBC Embodied Carbon Calculator's own
               A4&ndash;A5 method, which reads low. The middle is a realistic <strong>baseline</strong>:
               a conventional build of the same element. The right is what Simplicity measures.
               Nothing is hidden &mdash; every line shows its arithmetic, and the measured figure is
               <strong>${redTot >= 0 ? redTot.toFixed(0) + '% below the baseline' : Math.abs(redTot).toFixed(0) + '% above the baseline'}</strong>.</p>
          </div>

          <div class="w-cols">
            <div class="w-col w-col-base">
              <div class="w-col-head">
                <span class="w-tag">Green Star default</span>
                <strong>${per(gs.perUnit)}</strong><small>kgCO₂e / ${esc(el.unitLabel)}</small>
              </div>
              <h4>A4 &mdash; transport to site</h4>
              <table class="w-table"><tbody>${gsA4Rows}
                <tr class="w-sub"><td>A4 subtotal</td><td>${kg(gs.a4Total)}</td></tr></tbody></table>
              <h4>A5 &mdash; construction</h4>
              <table class="w-table"><tbody>${gsA5Rows}
                <tr class="w-sub"><td>A5 subtotal</td><td>${kg(gs.a5Total)}</td></tr></tbody></table>
              <div class="w-total">A4&ndash;A5 total <strong>${kg(gs.total)}</strong> kgCO₂e</div>
            </div>

            <div class="w-col w-col-mid">
              <div class="w-col-head">
                <span class="w-tag">Baseline estimate</span>
                <strong>${per(blTot / denom)}</strong><small>kgCO₂e / ${esc(el.unitLabel)}</small>
              </div>
              <h4>A4 &mdash; transport to site</h4>
              <table class="w-table"><tbody>${blA4Rows}
                <tr class="w-sub"><td>A4 subtotal</td><td>${kg(blA4)}</td></tr></tbody></table>
              <h4>A5 &mdash; construction</h4>
              <table class="w-table"><tbody>${blA5Rows}
                <tr class="w-sub"><td>A5 subtotal</td><td>${kg(blA5)}</td></tr></tbody></table>
              <div class="w-total">A4&ndash;A5 total <strong>${kg(blTot)}</strong> kgCO₂e</div>
            </div>

            <div class="w-col w-col-simp">
              <div class="w-col-head">
                <span class="w-tag">Simplicity measured</span>
                <strong>${per(simpTot / denom)}</strong><small>kgCO₂e / ${esc(el.unitLabel)}</small>
              </div>
              <h4>A4 &mdash; transport to site</h4>
              <table class="w-table"><tbody>${sA4Rows}
                <tr class="w-sub"><td>A4 subtotal</td><td>${kg(simpA4)}</td></tr></tbody></table>
              <h4>A5 &mdash; construction</h4>
              <table class="w-table"><tbody>${sA5Rows}
                <tr class="w-sub"><td>A5 subtotal</td><td>${kg(simpA5)}</td></tr></tbody></table>
              <div class="w-total">A4&ndash;A5 total <strong>${kg(simpTot)}</strong> kgCO₂e</div>
            </div>
          </div>

          <div class="w-reconcile">
            <h4>Reading the gap honestly</h4>
            <ul>
              <li><strong>Against the baseline, the measured figure is ${redTot >= 0 ? redTot.toFixed(0) + '% lower' : Math.abs(redTot).toFixed(0) + '% higher'}.</strong>
                  That is the Simplicity benefit: ${kg(blTot)} kgCO₂e for a conventional build of this
                  element, ${kg(simpTot)} kgCO₂e as we measure it. The Green Star number is not the
                  thing to beat, the realistic baseline is.</li>
              <li><strong>A4 is understated by the default, not overstated.</strong> Green Star does not
                  ask how far the truck went &mdash; it looks the distance up in a city-pair table. An
                  Auckland supplier serving an Auckland site scores
                  ${GREENSTAR_A45.LAST_MILE_KM} km. Measured against the real hauls, our A4 comes out
                  <strong>${a4Ratio >= 1 ? (a4Ratio).toFixed(1) + '&times; higher' : (1 / Math.max(a4Ratio, 1e-9)).toFixed(1) + '&times; lower'}</strong>
                  than the default allows for.</li>
              <li><strong>A5 is a flat allowance, so it cannot be beaten or missed.</strong> With no site
                  energy data the calculator charges
                  ${GREENSTAR_A45.A5A_PER_M2_GFA} kgCO₂e per m² GFA for the entire construction phase
                  &mdash; every trade, every preliminary, start to finish. That allowance is
                  <em>${kg(gs.buildingGfa * GREENSTAR_A45.A5A_PER_M2_GFA)} kgCO₂e</em> for
                  ${esc(gs.buildingLabel)}. We have apportioned
                  ${(gs.massShare * 100).toFixed(1)}% of it to this element by mass share, because
                  Green Star itself never splits it. The measured figure beside it covers only this
                  element's own plant and power &mdash; it is <em>not</em> a saving against the
                  allowance, it is the part of the allowance we can actually account for.</li>
              <li><strong>Same quantities, ${per(ratio)}&times; apart.</strong> That distance is the case
                  for measuring. The default is a defensible place to start a project; it is not a
                  defensible place to finish one.</li>
              ${gs.notes.map(nt => `<li>${esc(nt)}</li>`).join('')}
            </ul>
            <p class="w-src">Green Star column computed per ${esc(GREENSTAR_A45.SOURCE)}. Constants read
               from the project's own submission workbook, NZGBC-ZP102646 (Ascot A).</p>
          </div>
        </section>`;
    }

    render();
})();
