/* Simplicity Living — Site Activity page.
 *   (1) project selector that points the element calculators at a project
 *   (2) live A4–A5 figures on each element card: the Green Star industry
 *       default beside Simplicity's measured result
 *   (3) the speed-dividend table under the programme section
 * The programme itself (4D, Gantt, activity profile) lives in programme-ui.js.
 */
(function () {
  'use strict';

  const D = (typeof A4A5_DATA !== 'undefined') ? A4A5_DATA : null;
  const EL = (typeof ACTIVITY_ELEMENTS !== 'undefined') ? ACTIVITY_ELEMENTS : null;
  const PREFILL = (typeof ACTIVITY_PREFILL !== 'undefined') ? ACTIVITY_PREFILL : {};
  let project = 'waiatarua';

  // Populated by renderComparison; read by the click-through explainer popups.
  let sdTopics = {};

  // ── (1) element A4–A5, both ways ───────────────────────────────────────────
  // base = the Green Star default, run through the NZGBC calculator's own method
  //        (greenstar-a45.js, constants read from the project submission workbook)
  // simp = what we measure, from the same model the sub-pages use
  // Both in kgCO2e per the element's own unit.
  function elementA4A5(elKey, projectKey) {
    if (!EL || !EL[elKey]) return null;
    const el = EL[elKey];
    const values = {}, assumptions = {};
    el.inputs.forEach((f) => { values[f.id] = f.value; });
    el.assumptions.forEach((a) => { assumptions[a.id] = a.value; });
    if (PREFILL[projectKey] && PREFILL[projectKey][elKey]) {
      Object.assign(values, PREFILL[projectKey][elKey]);
    }
    let r;
    try { r = el.compute(values, assumptions); } catch (e) { return null; }
    const denom = r.perUnitDenominator > 0 ? r.perUnitDenominator : 1;
    // Split both the measured and the estimated-baseline figures into A4 (transport) and
    // A5 (site) per unit. Three references then sit side by side on each stage row:
    //   Green Star default (compliance calculator, which under-reads),
    //   Baseline estimate  (a realistic conventional build of the same element),
    //   Simplicity measured (what we actually do), shown as a reduction vs the baseline.
    let simpA4 = 0, simpA5 = 0, blA4 = 0, blA5 = 0;
    r.streams.forEach((x) => {
      const sv = +x.simplicity || 0, bv = +x.baseline || 0;
      if (x.stage === 'A4') { simpA4 += sv; blA4 += bv; } else { simpA5 += sv; blA5 += bv; }
    });
    simpA4 /= denom; simpA5 /= denom; blA4 /= denom; blA5 /= denom;
    const simp = simpA4 + simpA5;

    const gs = (typeof activityGreenStar === 'function')
      ? activityGreenStar(elKey, projectKey) : null;
    const common = { simp: simp, simpA4: simpA4, simpA5: simpA5, blA4: blA4, blA5: blA5, bl: blA4 + blA5 };
    if (!gs) return Object.assign({ base: null, baseA4: null, baseA5: null, gs: null }, common);
    return Object.assign({ base: gs.perUnit, baseA4: gs.a4PerUnit, baseA5: gs.a5PerUnit, gs: gs }, common);
  }

  // Per-unit number format, shared by the element grids and the delta line.
  function fmt(v) { return v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : v.toFixed(2); }

  // One stage row: a coloured A4/A5 tag then three references, Green Star default,
  // Baseline estimate and Simplicity measured. The headline comparator is the reduction
  // the measured figure achieves against the realistic baseline (the Simplicity benefit).
  function stageRow(tag, gsVal, blVal, spVal) {
    let delta = '';
    if (blVal != null && blVal > 0 && spVal >= 0) {
      const red = (blVal - spVal) / blVal * 100;
      delta = red >= 0
        ? `<em class="a45-delta good">${red.toFixed(0)}% below baseline</em>`
        : `<em class="a45-delta bad">${Math.abs(red).toFixed(0)}% above baseline</em>`;
    }
    return `<div class="a45-row a45-row-${tag.toLowerCase()}">
        <span class="a45-tag">${tag}</span>
        <div class="a45-cell a45-gs"><small>Green Star default</small><strong>${gsVal != null ? fmt(gsVal) : '—'}</strong></div>
        <div class="a45-cell a45-base"><small>Baseline estimate</small><strong>${blVal != null ? fmt(blVal) : '—'}</strong></div>
        <div class="a45-cell a45-simp"><small>Simplicity measured</small><strong>${fmt(spVal)}</strong>${delta}</div>
      </div>`;
  }

  function paintCards() {
    document.querySelectorAll('.element-card[data-element]').forEach((card) => {
      const key = card.dataset.element;
      const res = elementA4A5(key, project);
      const grid = card.querySelector('[data-a45-grid]');
      if (!grid) return;
      if (!res) { grid.innerHTML = '<p class="a45-empty">—</p>'; return; }
      grid.innerHTML = stageRow('A4', res.baseA4, res.blA4, res.simpA4) + stageRow('A5', res.baseA5, res.blA5, res.simpA5);
    });

    // Section rollup — absolute kgCO2e for the block, split A4 vs A5, each shown across all
    // three references: Green Star default, Baseline estimate and Simplicity measured.
    let gA4 = 0, gA5 = 0, bA4 = 0, bA5 = 0, sA4 = 0, sA5 = 0, gfa = 0, label = '';
    document.querySelectorAll('.element-card[data-element]').forEach((card) => {
      const key = card.dataset.element;
      const res = elementA4A5(key, project);
      if (!res || !res.gs) return;
      gA4 += res.gs.a4Total; gA5 += res.gs.a5Total;
      gfa = res.gs.buildingGfa; label = res.gs.buildingLabel;
      const el = EL[key], values = {}, assumptions = {};
      el.inputs.forEach((f) => { values[f.id] = f.value; });
      el.assumptions.forEach((a) => { assumptions[a.id] = a.value; });
      if (PREFILL[project] && PREFILL[project][key]) Object.assign(values, PREFILL[project][key]);
      let r; try { r = el.compute(values, assumptions); } catch (e) { return; }
      r.streams.forEach((st) => {
        if (st.stage === 'A4') { sA4 += (+st.simplicity || 0); bA4 += (+st.baseline || 0); }
        else { sA5 += (+st.simplicity || 0); bA5 += (+st.baseline || 0); }
      });
    });

    const tot = document.getElementById('elementTotals');
    if (tot && gA4 > 0) {
      const t = (n) => Math.round(n).toLocaleString();
      const redA4 = bA4 > 0 ? (bA4 - sA4) / bA4 * 100 : 0;
      const redA5 = bA5 > 0 ? (bA5 - sA5) / bA5 * 100 : 0;
      const three = (lbl, g, bl, sp) =>
        `<span class="et-item et-gs"><small>Green Star default</small><strong>${t(g)}</strong> kgCO₂e</span>
         <span class="et-arrow">&rsaquo;</span>
         <span class="et-item et-base"><small>Baseline estimate</small><strong>${t(bl)}</strong> kgCO₂e</span>
         <span class="et-arrow">&rsaquo;</span>
         <span class="et-item et-simp"><small>${lbl}</small><strong>${t(sp)}</strong> kgCO₂e</span>`;
      tot.innerHTML =
        `<div class="et-pair et-pair-a4">
           <span class="et-tag">A4</span>
           ${three('Simplicity measured', gA4, bA4, sA4)}
           <span class="et-note"><strong class="et-red">${redA4.toFixed(0)}% below the baseline.</strong>
             Green Star reads low because it scores an Auckland supplier at
             ${window.GREENSTAR_A45 ? GREENSTAR_A45.LAST_MILE_KM : 1} km; the baseline is a realistic
             conventional haul, and our measured transport comes in under it.</span>
         </div>
         <div class="et-pair et-pair-a5">
           <span class="et-tag">A5</span>
           ${three('Simplicity measured', gA5, bA5, sA5)}
           <span class="et-note"><strong class="et-red">${redA5.toFixed(0)}% below the baseline.</strong>
             Green Star uses a flat ${window.GREENSTAR_A45 ? GREENSTAR_A45.A5A_PER_M2_GFA : 25} kgCO₂e/m²
             allowance across all ${t(gfa)} m² of ${label || 'the block'}; the baseline and measured figures
             are the modelled site activity for these six structural elements.</span>
         </div>`;
    }
  }

  function initProjectSelector() {
    const chips = document.querySelectorAll('#activityProjectBar .ap-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (chip.classList.contains('soon')) return;
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        project = chip.dataset.project;
        document.querySelectorAll('a.carbon-link[data-base]').forEach((a) => {
          a.href = a.dataset.base + '?project=' + project;
        });
        paintCards();
      });
    });
  }

  // ── (3) speed dividend, from the shared programme model ───────────────────
  function renderComparison() {
    const wrap = document.getElementById('a5Comparison');
    const P = window.SimplicityProgramme;
    if (!wrap || !P || !P.ready || !D) return;

    function totals(series, weeks) {
      let fuel = 0, elec = 0, peak = 0;
      const wts = D.a5MetricWeights, scale = D.a5MetricScale;
      const gf = 33300 / 9500 / 3.5;
      for (let i = 0; i <= weeks; i++) {
        let f = 0, e = 0, t = 0;
        Object.keys(wts.fuel).forEach((c) => {
          const v = series[c] && series[c][i] ? series[c][i] : 0;
          f += v * wts.fuel[c]; e += v * wts.electricity[c]; t += v;
        });
        fuel += (f / 100) * scale.fuel * gf;
        elec += (e / 100) * scale.electricity * gf;
        peak = Math.max(peak, t);
      }
      const waste = weeks * 90 * gf;
      return { weeks, fuel, elec, peak,
               total: fuel * D.emissionFactors.diesel + elec * D.emissionFactors.electricityGrid + waste };
    }

    const b = totals(P.baseline.series, P.baseline.weeks);
    const s = totals(P.simplicity.series, P.simplicity.weeks);

    // Plant and crew energy tracks the WORK, and the work is the same either way, so those
    // totals land within a few percent of each other. The saving is in the TIME-related
    // site overhead, which runs for as long as the site is open. Showing a single blended
    // "A5 carbon saving" would imply the work itself got cleaner. It did not; it got shorter.
    const PRELIM_KG_PER_WEEK = 640;      // modelled site overhead, pending site capture
    const bPre = b.weeks * PRELIM_KG_PER_WEEK, sPre = s.weeks * PRELIM_KG_PER_WEEK;
    const saved = bPre - sPre;
    const pct = bPre > 0 ? saved / bPre * 100 : 0;
    const weeksSaved = b.weeks - s.weeks;

    // What makes up that per-week overhead. Fractions sum to 1, so the parts always add
    // back to PRELIM_KG_PER_WEEK even if the rate is re-tuned after real site capture.
    const OVERHEAD_SPLIT = [
      { id: 'offices', item: 'Site offices &amp; welfare', note: 'Huts, heating, lighting and small power kept running every day', frac: 0.28,
        long: 'The site huts, meeting and drying rooms and welfare facilities are heated, lit and powered every working day the site is open, no matter what is being built that day.',
        calc: 'In a measured assessment this is the metered electricity for the site accommodation (kWh × grid factor) plus any gas or LPG for heating (× its own factor). It is the largest single share of the weekly overhead rate.' },
      { id: 'supervision', item: 'Supervision &amp; site management', note: 'Daily travel and the vehicles that run the site', frac: 0.25,
        long: 'The site management and supervision team runs the project day to day, along with the vehicles they use to reach site and move around it. This continues for the full duration, independent of the day\'s work.',
        calc: 'Measured as the fuel used by the management and supervision vehicles: litres of diesel or petrol × their MfE factor (diesel 2.69, petrol 2.45 kgCO₂e/L).' },
      { id: 'power', item: 'Temporary power &amp; lighting', note: 'Tower lights, distribution and any standby generation', frac: 0.22,
        long: 'Temporary site lighting, tower lights, the temporary distribution board and any standby generator keep the site usable and safe. This is a time-based load: it runs because the site is open.',
        calc: 'Grid electricity (kWh × 0.107 kgCO₂e/kWh) plus any generator diesel (L × 2.69 kgCO₂e/L).' },
      { id: 'hoardings', item: 'Hoardings, fencing &amp; signage', note: 'The perimeter, installed, maintained, then taken down', frac: 0.09,
        long: 'The site perimeter, hoardings, fencing and signage, is installed at the start, maintained throughout and removed at the end. Its carbon is carried for the whole time it stands.',
        calc: 'The embodied carbon of the temporary materials, spread across the weeks they are in place, plus any perimeter lighting.' },
      { id: 'security', item: 'Security &amp; monitoring', note: 'Out-of-hours lighting, cameras and patrols', frac: 0.08,
        long: 'Out-of-hours lighting, CCTV and monitoring, and any patrols, are a nightly and weekend cost that exists purely because the site is open and must be kept secure.',
        calc: 'Standby power for cameras and security lighting (kWh × 0.107 kgCO₂e/kWh) plus any patrol-vehicle fuel.' },
      { id: 'scaffold', item: 'Access &amp; scaffold hire', note: 'Standing access kept up the whole time the structure is open', frac: 0.08,
        long: 'Standing access, scaffold and edge protection stay up the whole time the structure is open, and are serviced while in place. Longer on site means longer in hire.',
        calc: 'The amortised embodied and hire carbon of the access equipment over the weeks it is in place, plus servicing transport.' }
    ];
    const kg = (v) => Math.round(v).toLocaleString();
    const perWeek = (f) => Math.round(f * PRELIM_KG_PER_WEEK);
    const simpW = Math.max(8, Math.round(s.weeks / b.weeks * 100));
    const maxOv = Math.max.apply(null, OVERHEAD_SPLIT.map((o) => perWeek(o.frac)));
    const obRows = OVERHEAD_SPLIT.map((o) => {
      const w = perWeek(o.frac);
      return `<div class="sd-ov-row sd-clickable" role="button" tabindex="0" data-sd-topic="ov-${o.id}" onclick="sdOpenTopic('ov-${o.id}')">
          <div class="sd-ov-label"><span class="sd-ov-item">${o.item}</span><span class="sd-ov-note">${o.note}</span></div>
          <div class="sd-ov-bar"><span style="width:${Math.round(w / maxOv * 100)}%"></span></div>
          <div class="sd-ov-num">${w}<small>kg / wk</small></div>
        </div>`;
    }).join('');

    const EF = (window.GREENSTAR_A45 && GREENSTAR_A45.EF_ENERGY) || { diesel: 2.69, electricity: 0.107, gas: 0.194 };
    const stat = (label, big, sub) => `<div class="sd-m-stat"><span>${label}</span><strong>${big}</strong><em>${sub}</em></div>`;
    sdTopics = {
      'tile-same': { tag: 'A5 · on-site energy', title: 'Energy to do the work', body:
        `<p>The diesel burned by the machines and the electricity for the crew's tools track <strong>how much work there is to do</strong>, and the work is identical in both programmes: the same concrete, the same trades, the same tasks in the same order.</p>
         <p>Compressing that work into fewer weeks does not reduce it, so the on-site work energy lands within a few percent either way. That is exactly why this is <em>not</em> where the carbon saving comes from.</p>
         <h5>How the carbon is worked out</h5>
         <p>Taken from the solved programme: each week's modelled activity for every trade is multiplied by that trade's fuel and electricity intensity, then by MfE 2022 factors (diesel ${EF.diesel.toFixed(2)} kgCO₂e/L, grid electricity ${EF.electricity.toFixed(3)} kgCO₂e/kWh). Delivery of materials to site (A4) is handled separately on the element cards; this figure is the A5 on-site work energy.</p>
         ${stat('Baseline vs Waiatarua', `~${kg((b.fuel + s.fuel) / 2)} L diesel · ${kg((b.elec + s.elec) / 2)} kWh`, 'within a few percent either way')}` },
      'tile-peak': { tag: 'Programme metric', title: 'Peak-week activity', body:
        `<p>Because the same work is packed into roughly half the weeks, more of it happens at once. The busiest week at Waiatarua carries more people and plant than the baseline's busiest week.</p>
         <p>This is the honest trade-off of a faster build: it is <strong>more intense, not quieter</strong>. We show it as a count rather than a carbon figure, because it is a resourcing and logistics measure.</p>
         <h5>How it is worked out</h5>
         <p>The peak is the highest weekly total across the solved 1,426-activity network: the sum of every trade's modelled activity in the single busiest week, taken for each programme.</p>
         ${stat('Busiest week', `${Math.round(b.peak)} → ${Math.round(s.peak)}`, 'baseline → Waiatarua')}` },
      'tile-saving': { tag: 'A5 · site overhead', title: 'Less time-related site overhead', body:
        `<p>This is the point of the whole card. The time-related overhead listed below runs for <strong>every week the site is open</strong>, not per wall built. Finishing ${weeksSaved} weeks sooner removes ${weeksSaved} weeks of all of it.</p>
         <h5>How the carbon is worked out</h5>
         <p>${kg(PRELIM_KG_PER_WEEK)} kgCO₂e per week (the modelled overhead rate, broken down in the list below) × ${weeksSaved} fewer weeks on site = ${kg(saved)} kgCO₂e avoided. Both the weekly rate and the baseline duration are modelled assumptions, pending real site metering.</p>
         ${stat('Overhead carbon', `${kg(bPre)} → ${kg(sPre)} kg`, `−${kg(saved)} kgCO₂e (${pct.toFixed(0)}% lower)`)}` }
    };
    OVERHEAD_SPLIT.forEach((o) => {
      const w = perWeek(o.frac), pctOf = Math.round(o.frac * 100);
      sdTopics['ov-' + o.id] = { tag: 'A5 · site overhead', title: o.item, body:
        `<p>${o.long}</p>
         <h5>How the carbon is worked out</h5>
         <p>${o.calc}</p>
         <p style="font-size:0.86rem;color:#8a93a0;">Currently modelled as a share of the weekly site-overhead rate, pending real site metering. It is <strong>A5 construction-phase</strong> carbon: it depends on how long the site runs, not on the materials in the building.</p>
         ${stat('Modelled', `${w} kgCO₂e / week`, `${pctOf}% of the ${kg(PRELIM_KG_PER_WEEK)} kg/week overhead rate`)}` };
    });

    wrap.innerHTML = `
      <p class="sd-lead">Same building. Same crews. Same machines. The one thing that changes is
        <strong>how long the site stays open</strong>, and that is where the carbon moves.</p>

      <div class="sd-hero">
        <div class="sd-hero-stat">
          <span class="sd-hero-num">${weeksSaved}</span>
          <span class="sd-hero-unit">weeks<br>shorter</span>
        </div>
        <div class="sd-hero-bars">
          <div class="sd-bar-row">
            <span class="sd-bar-label">Industry baseline</span>
            <span class="sd-bar-track"><span class="sd-bar-fill base" style="width:100%">${b.weeks} weeks</span></span>
          </div>
          <div class="sd-bar-row">
            <span class="sd-bar-label">Waiatarua</span>
            <span class="sd-bar-track"><span class="sd-bar-fill simp" style="width:${simpW}%">${s.weeks} weeks</span></span>
          </div>
        </div>
      </div>

      <div class="sd-tiles">
        <div class="sd-tile sd-clickable" role="button" tabindex="0" data-sd-topic="tile-same" onclick="sdOpenTopic('tile-same')">
          <div class="sd-tile-ic sd-ic-same">&asymp;</div>
          <div class="sd-tile-val">Same energy</div>
          <div class="sd-tile-lbl">to do the work. The build is identical, so diesel and power barely move.</div>
          <span class="sd-tile-more">Read more &rarr;</span>
        </div>
        <div class="sd-tile sd-clickable" role="button" tabindex="0" data-sd-topic="tile-peak" onclick="sdOpenTopic('tile-peak')">
          <div class="sd-tile-ic sd-ic-up">&uarr;</div>
          <div class="sd-tile-val">${Math.round(b.peak)} &rarr; ${Math.round(s.peak)}</div>
          <div class="sd-tile-lbl">peak-week activity: busier, not quieter.</div>
          <span class="sd-tile-more">Read more &rarr;</span>
        </div>
        <div class="sd-tile sd-tile-hero sd-clickable" role="button" tabindex="0" data-sd-topic="tile-saving" onclick="sdOpenTopic('tile-saving')">
          <div class="sd-tile-ic sd-ic-down">&darr;</div>
          <div class="sd-tile-val">&minus;${kg(saved)}<small>kgCO₂e</small></div>
          <div class="sd-tile-lbl">less site overhead, ${pct.toFixed(0)}% below the baseline.</div>
          <span class="sd-tile-more">Read more &rarr;</span>
        </div>
      </div>

      <div class="sd-explain">
        <h4>Why a shorter build is a lower-carbon build</h4>
        <p>The diesel and power that do the actual work track the work itself, and the work is identical, so
          they hardly change. But a site also carries a second kind of carbon: everything that has to keep
          running simply because the site is <em>open</em>, whether or not a wall goes up that day. Finish
          <strong>${weeksSaved} weeks sooner</strong> and you pay for ${weeksSaved} fewer weeks of all of it.
          The saving is time, not cleaner work.</p>
      </div>

      <div class="sd-overhead">
        <h4>What "time-related site overhead" actually is</h4>
        <p class="sd-ov-intro">Everything here runs for as long as the site is open, whether or not a wall goes up that day:</p>
        <div class="sd-ov-list">${obRows}</div>
        <div class="sd-formula">
          <span class="sd-f-chip"><strong>${kg(PRELIM_KG_PER_WEEK)}</strong><small>kgCO₂e / week</small></span>
          <span class="sd-f-op">&times;</span>
          <span class="sd-f-chip"><strong>${weeksSaved}</strong><small>fewer weeks</small></span>
          <span class="sd-f-op">=</span>
          <span class="sd-f-chip sd-f-result"><strong>${kg(saved)}</strong><small>kgCO₂e avoided</small></span>
        </div>
      </div>

      <p class="a5-verdict">Solved from the same 1,426-activity network. The overhead rate, and the baseline's
        crew numbers and cycle times, are modelled assumptions pending real site capture.</p>`;
  }

  // Autoplay the demonstration video once it is mostly in view, pause when it leaves.
  // Muted is required for browsers to allow unprompted playback; controls stay on so a
  // viewer can unmute, scrub or stop it. A direct scroll check is used rather than an
  // IntersectionObserver because it also works inside embedded/preview render contexts.
  function initVideoAutoplay() {
    const v = document.querySelector('.sd-video-frame video');
    if (!v) return;
    v.muted = true;
    let userStopped = false;
    v.addEventListener('pause', () => { // if the viewer pauses by hand, do not fight them
      const r = v.getBoundingClientRect(), vh = window.innerHeight || 0;
      const vis = r.height ? (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height : 0;
      if (vis >= 0.55) userStopped = true;
    });
    function check() {
      const r = v.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (!r.height) return;
      const visible = (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height;
      if (visible >= 0.55) {
        if (v.paused && !userStopped) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      } else {
        userStopped = false;          // reset once it leaves view, so it replays next time
        if (!v.paused) v.pause();
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    check();
  }

  // ── Click-through explainer popups for the tiles and overhead items ───────
  window.sdOpenTopic = function (id) {
    const t = sdTopics[id];
    const ov = document.getElementById('sdModalOverlay');
    if (!t || !ov) return;
    document.getElementById('sdModalTag').textContent = t.tag;
    document.getElementById('sdModalTitle').innerHTML = t.title;
    document.getElementById('sdModalBody').innerHTML = t.body;
    ov.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const close = ov.querySelector('.sd-modal-close');
    if (close) close.focus();
  };
  window.sdCloseTopic = function () {
    const ov = document.getElementById('sdModalOverlay');
    if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { window.sdCloseTopic(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest) {
      const el = e.target.closest('[data-sd-topic]');
      if (el) { e.preventDefault(); window.sdOpenTopic(el.getAttribute('data-sd-topic')); }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    initProjectSelector();
    paintCards();
    renderComparison();          // no-op until the solved programme lands
    initVideoAutoplay();
  });
  // The programme is read from the planner's plan.json alongside the 4D geometry, so it
  // is not available at DOMContentLoaded.
  window.addEventListener('simplicity-programme-ready', renderComparison);
})();
