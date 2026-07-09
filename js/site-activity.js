// Simplicity Living — Site Activity page
//   (1) Project selector that points the element-card calculators at a project
//   (2) The construction-activity programme chart: Baseline vs Waiatarua
//       (relocated from the public A4–A5 calculator, where it was benchmark info).
// Depends on A4A5_DATA (js/a4a5-data.js) and Chart.js.
(function () {
    const D = (typeof A4A5_DATA !== 'undefined') ? A4A5_DATA : null;

    // ── (1) Project selector → element-card calculator links ─────────────────────
    function initProjectSelector() {
        const chips = document.querySelectorAll('#activityProjectBar .ap-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (chip.classList.contains('soon')) return;
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const key = chip.dataset.project;
                document.querySelectorAll('a.carbon-link[data-base]').forEach(a => {
                    a.href = a.dataset.base + '?project=' + key;
                });
            });
        });
    }

    // ── (2) Construction-activity programme (Baseline vs Waiatarua) ───────────────
    const WAIATARUA_GFA = 11000;           // approx GFA driving weekly site scale
    const REF_GFA = 9500;
    let a5Chart = null, a5Scenario = 'simplicity', a5Week = 1;
    const gfaFactor = () => WAIATARUA_GFA / REF_GFA;

    const bell = (wk, s, e, peak) => (wk < s || wk > e || e <= s) ? 0 : peak * Math.sin(Math.PI * (wk - s) / (e - s));

    function buildActivity(key) {
        const sc = D.a5Scenarios[key], out = {};
        D.a5Categories.forEach(c => {
            const w = sc.windows[c.key]; out[c.key] = [];
            for (let wk = 1; wk <= sc.weeks; wk++) out[c.key].push(bell(wk, w.start, w.end, w.peak));
        });
        return { weeks: sc.weeks, activity: out };
    }
    function metricAt(activity, key, i) {
        const wts = D.a5MetricWeights[key], scale = D.a5MetricScale[key];
        let sum = 0; D.a5Categories.forEach(c => sum += (activity[c.key][i] || 0) * wts[c.key]);
        return (sum / 100) * scale * gfaFactor();
    }
    function totals(key) {
        const { weeks, activity } = buildActivity(key);
        let fuelL = 0, elecKwh = 0, peak = 0;
        for (let i = 0; i < weeks; i++) {
            fuelL += metricAt(activity, 'fuel', i);
            elecKwh += metricAt(activity, 'electricity', i);
            let t = 0; D.a5Categories.forEach(c => t += activity[c.key][i]); peak = Math.max(peak, t);
        }
        const wastePenalty = weeks * 90 * gfaFactor();
        return { weeks, fuelL, elecKwh, total: fuelL * D.emissionFactors.diesel + elecKwh * D.emissionFactors.electricityGrid + wastePenalty, peak };
    }
    const label = key => key === 'simplicity' ? 'Waiatarua' : 'Baseline';

    const weekMarker = {
        id: 'weekMarker',
        afterDraw(chart) {
            const meta = chart.getDatasetMeta(0), pt = meta.data[a5Week - 1];
            if (!pt) return;
            const { ctx, chartArea } = chart;
            ctx.save(); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(pt.x, chartArea.top); ctx.lineTo(pt.x, chartArea.bottom); ctx.stroke(); ctx.restore();
        }
    };

    window.setActivityScenario = function (key) {
        a5Scenario = key; a5Week = 1; renderProgramme();
    };
    window.onActivityWeek = function (wk) {
        a5Week = Number(wk);
        const { activity } = buildActivity(a5Scenario), i = a5Week - 1;
        document.getElementById('weekLabel').textContent = 'Week ' + a5Week;
        Object.keys(D.a5MetricMeta).forEach(k => {
            const e = document.getElementById('metric_' + k);
            if (e) e.textContent = Math.round(metricAt(activity, k, i)).toLocaleString();
        });
        let top = null, tv = -1;
        D.a5Categories.forEach(c => { const v = activity[c.key][i] || 0; if (v > tv) { tv = v; top = c; } });
        const ph = document.getElementById('weekPhase');
        if (ph) ph.innerHTML = (top && tv > 1) ? `Dominant activity: <strong style="color:${top.color}">${top.icon} ${top.name}</strong>` : 'Site inactive this week';
        if (a5Chart) a5Chart.update('none');
    };

    function renderProgramme() {
        if (!D || !document.getElementById('a5Chart')) return;
        const sc = D.a5Scenarios[a5Scenario];
        const { weeks, activity } = buildActivity(a5Scenario);

        document.querySelectorAll('#a5ScenarioToggle .building-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.scenario === a5Scenario));

        // default slider to busiest week
        if (a5Week <= 1) {
            let pw = 1, pt = -1;
            for (let i = 0; i < weeks; i++) { let t = 0; D.a5Categories.forEach(c => t += activity[c.key][i]); if (t > pt) { pt = t; pw = i + 1; } }
            a5Week = pw;
        }
        const slider = document.getElementById('weekSlider');
        slider.max = weeks; if (a5Week > weeks) a5Week = weeks; slider.value = a5Week;

        const labels = Array.from({ length: weeks }, (_, i) => 'W' + (i + 1));
        const datasets = D.a5Categories.map(c => ({
            label: c.icon + ' ' + c.name, data: activity[c.key].map(v => Math.round(v)),
            backgroundColor: c.color, borderWidth: 0, stack: 'a'
        }));
        if (a5Chart) a5Chart.destroy();
        a5Chart = new Chart(document.getElementById('a5Chart'), {
            type: 'bar', data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 20, font: { size: 9 } }, title: { display: true, text: 'Construction week', font: { weight: 'bold' } } },
                    y: { stacked: true, grid: { color: '#eee' }, title: { display: true, text: 'Site activity intensity', font: { weight: 'bold' } } }
                }
            },
            plugins: [weekMarker]
        });

        const sum = document.getElementById('a5ScenarioSummary');
        if (sum) sum.innerHTML = `<strong>${label(a5Scenario)}</strong> — ${a5Scenario === 'simplicity' ? 'overlapped trades, shorter programme' : 'sequential trades, longer programme'}. Programme length: <strong>${weeks} weeks</strong>.`;

        renderComparison();
        window.onActivityWeek(a5Week);
    }

    function renderComparison() {
        const base = totals('baseline'), simp = totals('simplicity');
        const wrap = document.getElementById('a5Comparison');
        if (!wrap) return;
        const row = (l, b, s, u, lowGood = true) => {
            const better = lowGood ? (s < b) : (s > b);
            return `<tr><td>${l}</td><td style="text-align:right;">${Math.round(b).toLocaleString()} ${u}</td>
                <td style="text-align:right;font-weight:700;color:${better ? '#28a745' : '#dc3545'}">${Math.round(s).toLocaleString()} ${u}</td></tr>`;
        };
        const saved = base.total - simp.total, pct = base.total > 0 ? saved / base.total * 100 : 0;
        wrap.innerHTML = `
            <table class="db-table">
              <thead><tr><th>A5 measure</th><th style="text-align:right;">Baseline</th><th style="text-align:right;">Waiatarua</th></tr></thead>
              <tbody>
                ${row('Programme duration', base.weeks, simp.weeks, 'wks')}
                ${row('Peak weekly activity', base.peak, simp.peak, '', false)}
                ${row('Site diesel', base.fuelL, simp.fuelL, 'L')}
                ${row('Site electricity', base.elecKwh, simp.elecKwh, 'kWh')}
                ${row('A5 construction carbon', base.total, simp.total, 'kg')}
              </tbody>
            </table>
            <p class="a5-verdict">${saved > 0
                ? `Waiatarua's overlapped programme runs <strong>${simp.weeks} weeks vs ${base.weeks}</strong> for the baseline — a shorter site duration that cuts A5 construction carbon by <strong style="color:#28a745">${Math.round(saved).toLocaleString()} kgCO₂e (${pct.toFixed(0)}%)</strong>, even at a higher activity peak.`
                : `Waiatarua concentrates resource into a shorter, more intense programme. These are placeholder figures — the site-capture tools will confirm where the balance truly lands.`}</p>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initProjectSelector();
        if (typeof Chart !== 'undefined' && D) renderProgramme();
    });
})();
