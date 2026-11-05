/* Simplicity Living — combined Construction Programme section.
 *
 * Drives the 4D model, the Gantt playhead and the weekly activity profile from one
 * shared programme model (js/programme.js), which in turn reads the planner's solved
 * schedule from assets/4d/plan.json. Everything on this page is therefore the same
 * sequence: 1,426 activities, resource-constrained, buildings overlapping.
 *
 * The clock is the working day, as the planner counts it — five per week with the
 * Christmas shutdowns already removed. The scrubber shows weeks because that is how the
 * programme reads to a non-planner, but the 4D is told the day.
 */
(function () {
  'use strict';

  const D = (typeof A4A5_DATA !== 'undefined') ? A4A5_DATA : null;
  let P = null;                       // SimplicityProgramme, once the plan has loaded

  const icon = (k, cls) =>
    (typeof appIcon === 'function') ? appIcon(k, { cls: cls || 'pm-ico' }) : '';

  // ------------------------------------------------------------------ state
  let day = 0, playing = false, timer = null, speed = 2, baseOpacity = 0.45;
  let chart = null, view = 'model', wantModel = false;

  const clampDay = (d) => Math.max(0, Math.min(P ? P.simplicity.days : 0, d));
  const weekOf = (d) => Math.floor(d / 5) + 1;

  // ------------------------------------------------------------------ Gantt
  /* One track per workstream, showing the same scope run two ways.
   *
   * The pale band is the industry baseline's span; the solid bar is Waiatarua's, inset
   * so the baseline reads as the thing it overruns. Durations are printed in the bars
   * rather than in a side column, which previously collapsed into "57w109w".
   *
   * The per-building A/B/C/D segments are gone. Now the planner overlaps the buildings
   * they sat on top of each other and every one read "D". The staggered starts survive
   * as notches on the bar, which is the point they were making. */
  function renderGantt(host) {
    const span = Math.max(P.simplicity.days, P.baseline.days);
    const pct = (d) => (d / span * 100).toFixed(2) + '%';
    const wks = (d) => Math.max(1, Math.round(d / 5));
    const simp = P.simplicity, base = P.baseline;
    const byKey = Object.fromEntries(base.phases.map((p) => [p.key, p]));

    const rows = simp.phases.map((ph) => {
      const b = byKey[ph.key];
      const w = ph.end - ph.start;
      // Notches sit inside the bar, so they are a share of the BAR's width, not of the
      // whole track. The first building starts the phase, so it needs no marker.
      const notches = ph.segs.map((s) => {
        const f = w > 0 ? (s.start - ph.start) / w : 0;
        if (f < 0.02) return '';
        return `<i class="gnotch" style="left:${(f * 100).toFixed(2)}%" title="Building ${s.label} joins at week ${wks(s.start)}"></i>`;
      }).join('');
      return `<div class="grow">
          <span class="glabel">${ph.name}</span>
          <span class="gtrack">
            ${b ? `<span class="gbase" style="left:${pct(b.start)};width:${pct(b.end - b.start)}">
                     <em>${wks(b.end - b.start)} wks</em></span>` : ''}
            <span class="gbar" style="left:${pct(ph.start)};width:${pct(w)};background:${ph.color}">
              <em>${wks(w)} wks</em>${notches}</span>
          </span>
        </div>`;
    }).join('');

    const step = span / 5 > 80 ? 20 : 10;
    const ticks = [];
    for (let w = 0; w <= Math.ceil(span / 5); w += step) ticks.push(`<span style="left:${pct(w * 5)}">W${w}</span>`);

    host.innerHTML = `
      <div class="gantt2">
        <div class="gsummary">
          <div class="gstat gstat-simp"><b>${wks(simp.days)}</b><span>weeks<br>Waiatarua</span></div>
          <div class="gstat gstat-base"><b>${wks(base.days)}</b><span>weeks<br>industry baseline</span></div>
          <div class="gstat gstat-save"><b>${wks(base.days) - wks(simp.days)}</b><span>weeks<br>shorter</span></div>
        </div>
        <p class="gexplain">Each row is one workstream. The <b class="k-base">pale bar</b> is how long it
          runs on the industry baseline; the <b class="k-simp">solid bar</b> is Waiatarua. Notches mark
          where each of the four buildings joins that workstream &mdash; the closer together they sit,
          the more the site is running in parallel.</p>
        <div class="grows">
          ${rows}
          <div class="grow gaxis-row">
            <span class="glabel"></span>
            <span class="gtrack gaxis">${ticks.join('')}</span>
          </div>
          <div class="gplayhead" id="gPlayhead"><b class="gph-flag"></b></div>
        </div>
        <p class="gfoot">Construction week, from site establishment to practical completion.
          Working days only &mdash; Christmas shutdowns excluded.</p>
      </div>`;
  }

  function setPlayhead() {
    const el = document.getElementById('gPlayhead');
    if (!el) return;
    const span = Math.max(P.simplicity.days, P.baseline.days);
    el.style.setProperty('--f', (day / span).toFixed(4));
    el.firstChild.textContent = 'W' + weekOf(day);
  }

  // ------------------------------------------------------------------ paint
  function metricAt(s, key, i) {
    if (!D) return 0;
    const wts = D.a5MetricWeights[key], scale = D.a5MetricScale[key];
    let sum = 0;
    Object.keys(wts).forEach((c) => { sum += (s[c] && s[c][i] ? s[c][i] : 0) * wts[c]; });
    return (sum / 100) * scale * (33300 / 9500 / 3.5);
  }

  function paint() {
    if (!P) return;
    setPlayhead();

    const wk = weekOf(day);
    const wkEl = document.getElementById('pmWeek');
    if (wkEl) {
      const dt = P.dateOf(Math.round(day));
      wkEl.innerHTML = 'Week ' + wk +
        (dt ? ` <small>${dt.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</small>` : '');
    }
    const scrub = document.getElementById('pmScrub');
    if (scrub && +scrub.value !== Math.round(day)) scrub.value = Math.round(day);

    const i = Math.min(P.simplicity.series.core.length - 1, wk - 1);
    if (D) {
      Object.keys(D.a5MetricMeta).forEach((k) => {
        const el = document.getElementById('metric_' + k);
        if (el) el.textContent = Math.round(metricAt(P.simplicity.series, k, i)).toLocaleString();
      });
    }

    const live = P.simplicity.phases.filter((ph) => day >= ph.start && day <= ph.end);
    const nowEl = document.getElementById('pmNow');
    if (nowEl) {
      nowEl.innerHTML = live.length
        ? live.map((ph) => `<span class="pm-chip" style="--c:${ph.color}">${ph.name}</span>`).join('')
        : '<span class="pm-chip pm-chip-idle">Site complete</span>';
    }

    if (window.Simplicity4D && Simplicity4D.isLoaded()) Simplicity4D.setDay(Math.round(day));
    if (chart) chart.update('none');
  }

  // Playback runs at roughly a fortnight a second, which is quick enough to watch the
  // buildings climb without the trades becoming a flicker.
  function tick() {
    day += speed * 1.6;
    if (day >= P.simplicity.days) { day = P.simplicity.days; stop(); }
    paint();
  }
  function play() {
    if (playing || !P) return;
    if (day >= P.simplicity.days) day = 0;
    playing = true;
    document.getElementById('pmPlay').innerHTML = pauseIcon();
    timer = setInterval(tick, 120);
  }
  function stop() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = null;
    const b = document.getElementById('pmPlay');
    if (b) b.innerHTML = playIcon();
  }
  const playIcon = () => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>Play</span>';
  const pauseIcon = () => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg><span>Pause</span>';

  // ------------------------------------------------------------- activity chart
  function buildChart() {
    const cv = document.getElementById('pmActivityChart');
    if (!cv || typeof Chart === 'undefined' || !P) return;
    const weeks = Math.max(P.simplicity.weeks, P.baseline.weeks);
    const labels = Array.from({ length: weeks + 1 }, (_, i) => i);
    const cats = P.PROFILE;
    const colour = { ground: '#8d6e63', core: '#ff6600', envelope: '#2196F3', fitout: '#4CAF50' };

    // Baseline is one filled envelope behind the Waiatarua stack, so the comparison
    // reads as a single picture rather than two sets of bars.
    const baseTotal = labels.map((_, i) =>
      Math.round(cats.reduce((a, c) => a + (P.baseline.series[c.key][i] || 0), 0)));

    const ds = [{
      label: 'Industry baseline (total)', type: 'line', data: baseTotal,
      borderColor: 'rgba(120,126,132,0.85)',
      backgroundColor: 'rgba(130,136,142,' + baseOpacity + ')',
      fill: true, borderWidth: 1.5, pointRadius: 0, pointHitRadius: 8,
      tension: 0.35, order: 0, baseSeries: true
    }];
    cats.forEach((c) => ds.push({
      label: c.name,
      data: labels.map((_, i) => Math.round(P.simplicity.series[c.key][i] || 0)),
      backgroundColor: colour[c.key], borderWidth: 0, stack: 'simp', order: 1
    }));

    const marker = {
      id: 'pmMarker',
      afterDatasetsDraw(ch) {
        const area = ch.chartArea, x = ch.scales.x.getPixelForValue(weekOf(day) - 1);
        if (x == null || isNaN(x)) return;
        const c = ch.ctx;
        c.save();
        c.strokeStyle = '#111'; c.lineWidth = 2; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(x, area.top); c.lineTo(x, area.bottom); c.stroke();
        c.restore();
      }
    };

    if (chart) chart.destroy();
    chart = new Chart(cv, {
      type: 'bar',
      data: { labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'rect', boxWidth: 10, boxHeight: 10, padding: 12, font: { size: 11 } } },
          tooltip: { filter: (t) => t.raw > 0 }
        },
        scales: {
          x: { stacked: true, grid: { display: false },
               ticks: { maxTicksLimit: 18, font: { size: 10 }, callback: (v) => 'W' + v },
               title: { display: true, text: 'Construction week', font: { weight: 'bold' } } },
          y: { stacked: true, grid: { color: '#eee' }, border: { display: false },
               title: { display: true, text: 'Crew-days per week', font: { weight: 'bold' } } }
        }
      },
      plugins: [marker]
    });
    requestAnimationFrame(() => { if (chart) chart.resize(); });
  }

  function setBaseOpacity(v) {
    baseOpacity = v;
    if (!chart) return;
    chart.data.datasets.forEach((d) => {
      if (d.baseSeries) {
        d.backgroundColor = 'rgba(130,136,142,' + baseOpacity + ')';
        d.borderColor = 'rgba(120,126,132,' + Math.min(1, baseOpacity + 0.4) + ')';
      }
    });
    chart.update('none');
  }

  // --------------------------------------------------------------- 4D loading
  let loading4D = false;
  function load4D() {
    const wrap = document.getElementById('pm4dCanvas');
    const status = document.getElementById('pm4dStatus');
    if (!wrap || !window.Simplicity4D) { wantModel = true; return; }
    if (Simplicity4D.isLoaded() || loading4D) { Simplicity4D.resize(); return; }
    loading4D = true;
    Simplicity4D.init(wrap);
    if (status) status.textContent = 'Loading site model…';
    Simplicity4D.load((f) => {
      if (status) status.textContent = 'Loading site model… ' + Math.round(f * 100) + '%';
    }).then((plan) => {
      if (status) status.parentElement.classList.add('is-ready');
      boot(plan);
      Simplicity4D.setDay(Math.round(day));
      Simplicity4D.resize();
    }).catch((e) => {
      console.error('4D load failed', e);
      if (status) status.textContent = 'Site model could not be loaded.';
      loading4D = false;
    });
  }

  // The plan arrives with the geometry, so the programme model, the Gantt and the chart
  // are all built once it lands rather than at DOMContentLoaded.
  let booted = false;
  function boot(plan) {
    if (booted) return;
    booted = true;
    P = window.SimplicityProgramme.load(plan);
    const host = document.getElementById('pmGantt');
    if (host) renderGantt(host);
    const scrub = document.getElementById('pmScrub');
    if (scrub) { scrub.max = P.simplicity.days; scrub.value = 0; }
    if (view === 'activity') buildChart();
    paint();
  }

  // ------------------------------------------------------------------- wiring
  function switchView(v) {
    view = v;
    if (history.replaceState) {
      history.replaceState(null, '', v === 'activity' ? '#activity' : location.pathname + location.search);
    }
    document.querySelectorAll('[data-pm-view]').forEach((b) => {
      const on = b.dataset.pmView === v;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const model = document.getElementById('pmModelPane');
    const act = document.getElementById('pmActivityPane');
    if (model) model.style.display = v === 'model' ? '' : 'none';
    if (act) act.style.display = v === 'activity' ? '' : 'none';
    if (v === 'model') load4D();
    if (v === 'activity' && P) { if (!chart) buildChart(); else requestAnimationFrame(() => chart.resize()); }
    paint();
  }

  function wire() {
    const scrub = document.getElementById('pmScrub');
    if (scrub) scrub.addEventListener('input', function () { stop(); day = clampDay(+this.value); paint(); });
    const playBtn = document.getElementById('pmPlay');
    if (playBtn) {
      playBtn.innerHTML = playIcon();
      playBtn.addEventListener('click', () => (playing ? stop() : play()));
    }
    document.querySelectorAll('[data-pm-speed]').forEach((b) => {
      b.addEventListener('click', function () {
        speed = +this.dataset.pmSpeed;
        document.querySelectorAll('[data-pm-speed]').forEach((x) => x.classList.toggle('active', x === this));
      });
    });
    document.querySelectorAll('[data-pm-view]').forEach((b) => {
      b.addEventListener('click', () => switchView(b.dataset.pmView));
    });
    document.querySelectorAll('[data-pm-cam]').forEach((b) => {
      b.addEventListener('click', function () {
        if (window.Simplicity4D) Simplicity4D.view(this.dataset.pmCam);
        document.querySelectorAll('[data-pm-cam]').forEach((x) => x.classList.toggle('active', x === this));
      });
    });
    const op = document.getElementById('pmBaseOpacity');
    if (op) op.addEventListener('input', function () { setBaseOpacity(+this.value / 100); });
    document.querySelectorAll('[data-metric-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.metricIcon); });

    switchView(location.hash === '#activity' ? 'activity' : 'model');
  }

  // site-4d.js is a module, so it defines Simplicity4D after this classic script runs
  // but before DOMContentLoaded. Both signals therefore fire — bind on whichever comes
  // first and only once, or every control ends up with two handlers and Play toggles
  // itself straight back off.
  let wired = false;
  function wireOnce() {
    if (wired) return;
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', wireOnce, { once: true }); return; }
    wired = true;
    wire();
  }
  window.addEventListener('simplicity4d-ready', wireOnce);
  wireOnce();

  window.SimplicityProgrammeUI = { icon: icon, get programme() { return P; } };
})();
