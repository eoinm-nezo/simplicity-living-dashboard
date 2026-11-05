/* Simplicity Living — Home page benchmark scorecard.
 * Renders the seven v0.2 benchmark modules aggregated across all loaded projects,
 * with a toggle between the portfolio AVERAGE and the BEST result achieved on each
 * module. Reads the computed module scores straight from the assessments table
 * (the Benchmark page and Admin editor keep those columns in step with the engine).
 */
(function () {
  'use strict';

  let mode = 'avg'; // 'avg' | 'best'

  // One row per project (latest assessment wins if a project were scored twice).
  function latestPerProject() {
    if (typeof dbQuery !== 'function') return [];
    const rows = dbQuery('SELECT * FROM assessments ORDER BY datetime(created_at) ASC, id ASC');
    const byName = {};
    rows.forEach((r) => { byName[r.project_name] = r; });
    return Object.keys(byName).map((k) => byName[k]);
  }

  function render() {
    if (typeof BENCHMARK_MODULES === 'undefined') return;
    const cardsEl = document.getElementById('scCards');
    const totalEl = document.getElementById('scTotal');
    if (!cardsEl) return;

    const rows = latestPerProject();
    if (!rows.length) { cardsEl.innerHTML = '<p class="sc-note">No projects loaded yet.</p>'; return; }

    let totalAgg = 0;
    const cards = BENCHMARK_MODULES.map((m) => {
      const vals = rows.map((r) => +r[m.col] || 0);
      const agg = mode === 'avg'
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : Math.max.apply(null, vals);
      totalAgg += agg;
      const pts = Math.round(agg * 10) / 10;
      const pct = Math.max(0, Math.min(100, Math.round(agg / m.max * 100)));
      const band = (typeof benchmarkBand === 'function') ? benchmarkBand(agg) : '';
      const icon = (typeof appIcon === 'function') ? appIcon(m.icon, { cls: 'app-icon sc-icon' }) : '';
      return `<div class="sc-card" style="--cat:${m.color}">
          <div class="sc-card-head">${icon}<span class="sc-name">${m.name}</span></div>
          <div class="sc-score"><strong>${pts}</strong><span>/ 20</span></div>
          <div class="sc-bar"><span style="width:${pct}%"></span></div>
          <div class="sc-band">${band}</div>
        </div>`;
    }).join('');
    cardsEl.innerHTML = cards;

    if (totalEl) {
      const totalPts = Math.round(totalAgg);
      const lbl = mode === 'avg'
        ? 'average across ' + rows.length + ' projects'
        : 'best achieved per module';
      totalEl.innerHTML =
        `<span class="sc-total-num">${totalPts}</span>` +
        `<span class="sc-total-max">/ 140</span>` +
        `<span class="sc-total-lbl">${lbl}</span>`;
    }
    if (typeof hydrateIcons === 'function') hydrateIcons(cardsEl);
  }

  window.setScorecardMode = function (m, btn) {
    mode = m;
    ['scAvgBtn', 'scBestBtn'].forEach((id) => {
      const b = document.getElementById(id);
      if (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); }
    });
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
    const lead = document.getElementById('scLead');
    if (lead) {
      lead.innerHTML = (m === 'avg')
        ? 'The seven benchmark modules, <strong>averaged across all loaded projects</strong>. ' +
          'Each module is scored out of 20, calculated upward from measured evidence. ' +
          'Open the <a href="scoring.html">Benchmark</a> for the full method and per-project detail.'
        : 'The seven benchmark modules, showing the <strong>best result achieved on each</strong> across all loaded projects. ' +
          'Each module is scored out of 20, calculated upward from measured evidence. ' +
          'Open the <a href="scoring.html">Benchmark</a> for the full method and per-project detail.';
    }
    render();
  };

  async function boot() {
    if (typeof initSimplicityDb !== 'function') return;
    try { await initSimplicityDb(); } catch (e) { return; }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
