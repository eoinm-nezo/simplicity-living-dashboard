// Simplicity Living - Energy page charts (driven by the shared SQLite DB)
// Two pairs of graphs:
//   1. Methodology benchmark: Baseline / Enhanced Standard / CLT vs the
//      Simplicity Building (Lake Road, Northcote)   -> grp = 'scenario'
//   2. The four Simplicity projects compared        -> grp = 'project'
// Each pair: stacked energy-consumption bars + cost-vs-performance bubbles.

const END_USES = [
    { key: 'heating',   label: 'Heating',   color: '#ff6600', border: '#cc5200' },
    { key: 'cooling',   label: 'Cooling',   color: '#4CAF50', border: '#388E3C' },
    { key: 'lighting',  label: 'Lighting',  color: '#FFC107', border: '#FFA000' },
    { key: 'equipment', label: 'Equipment', color: '#2196F3', border: '#1976D2' }
];

// Greys for the comparison options, Simplicity orange for the highlighted row
const BUBBLE_COLORS = ['#999999', '#757575', '#8BC34A', '#2196F3', '#9C27B0', '#607D8B'];

function totalEnergy(row) {
    return row.heating + row.cooling + row.lighting + row.equipment;
}

// Prints the stack total above each bar so the headline number is unmissable
const stackTotalLabels = {
    id: 'stackTotalLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0 || !meta0.data) return;
        meta0.data.forEach((_, i) => {
            let total = 0, top = Infinity;
            chart.data.datasets.forEach((ds, di) => {
                const m = chart.getDatasetMeta(di);
                if (m.hidden) return;
                total += ds.data[i] || 0;
                const bar = m.data[i];
                if (bar && bar.y < top) top = bar.y;
            });
            if (!isFinite(top)) return;
            const x = meta0.data[i].x;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#333';
            ctx.font = "700 15px 'Segoe UI', system-ui, sans-serif";
            ctx.fillText(Math.round(total).toLocaleString(), x, top - 15);
            ctx.fillStyle = '#9aa0a6';
            ctx.font = "600 10px 'Segoe UI', system-ui, sans-serif";
            ctx.fillText('kWh/m\u00B2/yr', x, top - 3);
            ctx.restore();
        });
    }
};

function buildEnergyConsumptionChart(canvasId, rows) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        plugins: [stackTotalLabels],
        type: 'bar',
        data: {
            labels: rows.map(r => r.sub_label ? [r.label, r.sub_label] : r.label),
            datasets: END_USES.map(u => ({
                label: u.label,
                data: rows.map(r => r[u.key]),
                backgroundColor: rows.map(r => r.highlight ? u.color : u.color + 'B3'), // soften non-highlight bars
                borderColor: u.border,
                borderWidth: rows.map(r => r.highlight ? 2 : 1),
                borderRadius: 3,
                borderSkipped: false
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 34 } },
            plugins: {
                legend: { display: true, position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        footer: items => 'Total: ' + items.reduce((s, i) => s + i.parsed.y, 0) + ' kWh/m²/year'
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Energy Use (kWh/m²/year)', font: { size: 12, weight: 'bold' } },
                    grid: { color: '#eee' }
                }
            }
        }
    });
}

function buildCostPerformanceChart(canvasId, rows) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const bubbles = rows.map((r, i) => ({
        x: r.initial_cost,
        y: r.annual_cost,
        r: Math.max(8, totalEnergy(r) / 8),
        label: r.label,
        sub: r.sub_label || '',
        energy: totalEnergy(r),
        color: r.highlight ? '#ff6600' : BUBBLE_COLORS[i % BUBBLE_COLORS.length]
    }));

    // Pad the axes so corner bubbles and their labels are not clipped
    const xs = bubbles.map(b => b.x), ys = bubbles.map(b => b.y);
    const padX = Math.max((Math.max(...xs) - Math.min(...xs)) * 0.18, 3);
    const padY = Math.max((Math.max(...ys) - Math.min(...ys)) * 0.28, 2);

    new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbles,
                backgroundColor: bubbles.map(b => b.color + 'CC'),
                borderColor: bubbles.map(b => b.color),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 18, right: 18 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const d = ctx.raw;
                            return [
                                d.label + (d.sub ? ' (' + d.sub + ')' : ''),
                                'Initial cost index: ' + d.x,
                                'Energy cost: $' + d.y + '/m²/year',
                                'Energy use: ' + d.energy + ' kWh/m²/year'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: Math.min(...xs) - padX,
                    max: Math.max(...xs) + padX,
                    title: { display: true, text: 'Initial Construction Cost (index, baseline = 100)', font: { size: 12, weight: 'bold' } },
                    grid: { color: '#eee' }
                },
                y: {
                    min: Math.min(...ys) - padY,
                    max: Math.max(...ys) + padY,
                    title: { display: true, text: 'Annual Energy Cost ($/m²/year)', font: { size: 12, weight: 'bold' } },
                    grid: { color: '#eee' }
                }
            }
        },
        plugins: [{
            // label each bubble
            id: 'bubbleLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 11px "Segoe UI", sans-serif';
                meta.data.forEach((pt, i) => {
                    const d = chart.data.datasets[0].data[i];
                    ctx.fillStyle = '#333';
                    ctx.fillText(d.label, pt.x, pt.y - pt.options.radius - 6);
                });
                ctx.restore();
            }
        }]
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initSimplicityDb();
        const scenarios = dbQuery("SELECT * FROM energy_results WHERE grp = 'scenario' ORDER BY sort_order, id");
        const projects = dbQuery("SELECT * FROM energy_results WHERE grp = 'project' ORDER BY sort_order, id");

        buildEnergyConsumptionChart('scenarioEnergyChart', scenarios);
        buildCostPerformanceChart('scenarioCostChart', scenarios);
        buildEnergyConsumptionChart('projectEnergyChart', projects);
        buildCostPerformanceChart('projectCostChart', projects);
    } catch (err) {
        console.error('Energy charts failed to load:', err);
    }
});

// ─── Detailed report: project, then building within the project ──────────────
// Waiatarua is modelled as four separate buildings; the others are single.
const REPORT_PROJECTS = {
    reiputa:     { buildings: [{ id: 'Whole site', file: 'assets/reports/nezo-report-reiputa.html' }] },
    waiatarua:   { buildings: [
                       { id: 'Block A', file: 'assets/reports/nezo-report-waiatarua.html' },
                       { id: 'Block B', file: 'assets/reports/nezo-report-waiatarua.html' },
                       { id: 'Block C', file: 'assets/reports/nezo-report-waiatarua.html' },
                       { id: 'Block D', file: 'assets/reports/nezo-report-waiatarua.html' }
                   ] },
    lakeroad:    { buildings: [{ id: 'Whole site', file: 'assets/reports/nezo-report-lakeroad.html' }] },
    morningside: { buildings: [{ id: 'Whole site', file: 'assets/reports/nezo-report-morningside.html' }] }
};
let reportProject = 'reiputa';

function renderReportTabs(activeIdx) {
    const wrap = document.getElementById('reportTabs');
    if (!wrap) return;
    const p = REPORT_PROJECTS[reportProject];
    wrap.innerHTML = '';
    if (!p || p.buildings.length < 2) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    p.buildings.forEach((b, i) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'report-tab' + (i === activeIdx ? ' active' : '');
        t.setAttribute('role', 'tab');
        t.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
        t.textContent = b.id;
        t.onclick = () => selectReportBuilding(i);
        wrap.appendChild(t);
    });
}

function selectReportBuilding(idx) {
    const p = REPORT_PROJECTS[reportProject];
    if (!p || !p.buildings[idx]) return;
    document.getElementById('reportFrame').src = p.buildings[idx].file;
    renderReportTabs(idx);
}

function selectReportProject(btn) {
    document.querySelectorAll('#reportSelector .building-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reportProject = btn.dataset.reportProject;
    selectReportBuilding(0);
}

document.addEventListener('DOMContentLoaded', () => renderReportTabs(0));

// ─── Apartment Energy Deep Dive ───────────────────────────────────────────────
const APARTMENT_APPLIANCES = [
    { label: 'Hot Water Cylinder',   kwh: 3400, color: '#c62828', border: '#b71c1c' },
    { label: 'Space Heating',        kwh: 1200, color: '#7b1fa2', border: '#6a1b9a' },
    { label: 'Cooking & Oven',       kwh: 620,  color: '#e65100', border: '#bf360c' },
    { label: 'Refrigerator/Freezer', kwh: 480,  color: '#1565c0', border: '#0d47a1' },
    { label: 'Other Electronics',    kwh: 450,  color: '#78909c', border: '#546e7a' },
    { label: 'Washing & Dryer',      kwh: 420,  color: '#00695c', border: '#004d40' },
    { label: 'Lighting',             kwh: 380,  color: '#f9a825', border: '#f57f17' },
    { label: 'Dishwasher',           kwh: 290,  color: '#e91e63', border: '#c2185b' }
];
// NZ Ministry for the Environment 2024 grid emission factor
const NZ_GRID_EF = 0.098; // kgCO₂e / kWh

// Per-apartment end uses by unit type. Heating, cooling and lighting scale with
// floor area; equipment scales with occupancy, which is why it flattens out.
const UNIT_TYPES = [
    { name: 'Typical 1 bed', area: 50, eui: 121,
      uses: { heating: 1050, cooling: 170, lighting: 280, equipment: 4550 } },
    { name: 'Typical 2 bed', area: 70, eui: 115,
      uses: { heating: 1290, cooling: 220, lighting: 400, equipment: 6140 } },
    { name: 'Typical 3 bed', area: 95, eui: 109,
      uses: { heating: 1620, cooling: 290, lighting: 540, equipment: 7900 } }
];

const END_USE_META = [
    { key: 'heating',   name: 'Heating',   colour: '#1976d2',
      desc: 'Heat pump in heating mode. Low already, thanks to Auckland\u2019s mild climate \u2014 and the load thermal mass acts on.' },
    { key: 'cooling',   name: 'Cooling',   colour: '#388e3c',
      desc: 'Heat pump in cooling mode. Concrete thermal mass shaves the summer peak.' },
    { key: 'lighting',  name: 'Lighting',  colour: '#f9a825',
      desc: 'All interior and common-area lighting. LED assumed throughout.' },
    { key: 'equipment', name: 'Equipment', colour: '#e65100',
      desc: 'Hot water cylinder, cooking, appliances and electronics. The dominant end use, and the one the fabric cannot touch.' }
];

function showUnitType(idx, btn) {
    const u = UNIT_TYPES[idx];
    if (!u) return;
    document.querySelectorAll('.enduse-head .unit-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }

    const totKwh = END_USE_META.reduce((a, m) => a + u.uses[m.key], 0);
    const totCo2 = Math.round(totKwh * NZ_GRID_EF);

    const sum = document.getElementById('unitSummary');
    if (sum) {
        sum.innerHTML =
            '<div class="us-main"><span class="us-kwh">' + totKwh.toLocaleString() + ' kWh</span>' +
            '<span class="us-dot">&bull;</span>' +
            '<span class="us-co2">' + totCo2.toLocaleString() + ' kg CO\u2082e</span></div>' +
            '<div class="us-sub">per apartment, per year &mdash; ' + u.name.toLowerCase() +
            ', ' + u.area + '\u00A0m\u00B2 &middot; ' + u.eui + ' kWh/m\u00B2/yr</div>';
    }

    const grid = document.getElementById('endUseGrid');
    if (grid) {
        grid.innerHTML = END_USE_META.map(m => {
            const kwh = u.uses[m.key];
            const co2 = Math.round(kwh * NZ_GRID_EF);
            const pct = Math.round(kwh / totKwh * 100);
            return '<div class="end-use-card" style="border-top-color:' + m.colour + '">' +
                   '<div class="end-use-headline" style="color:' + m.colour + '">' +
                       kwh.toLocaleString() + ' kWh <span>&bull;</span> ' + co2 + ' kg CO\u2082e' +
                   '</div>' +
                   '<div class="end-use-sub">per apartment / year &middot; ' + pct + '% of total</div>' +
                   '<div class="end-use-name">' + m.name + '</div>' +
                   '<div class="end-use-desc">' + m.desc + '</div>' +
                   '</div>';
        }).join('');
    }
}

// ─── Appliance chart, toggled between energy and carbon ──────────────────────
let applianceChart = null;
let applianceMode = 'kwh';

function applianceData() {
    const sorted = [...APARTMENT_APPLIANCES].sort((a, b) => b.kwh - a.kwh);
    const isKwh = applianceMode === 'kwh';
    return {
        labels: sorted.map(a => a.label),
        datasets: [{
            label: isKwh ? 'kWh / year' : 'kg CO\u2082e / year',
            data: sorted.map(a => isKwh ? a.kwh : Math.round(a.kwh * NZ_GRID_EF)),
            backgroundColor: sorted.map(a => a.color + 'CC'),
            borderColor: sorted.map(a => a.border),
            borderWidth: 1,
            borderRadius: 4
        }]
    };
}

function applianceAxisTitle() {
    return applianceMode === 'kwh'
        ? 'kWh / year'
        : 'kg CO\u2082e / year   (NZ grid: ' + NZ_GRID_EF + ' kg/kWh)';
}

function showApplianceMode(mode, btn) {
    applianceMode = mode;
    document.querySelectorAll('.chart-head .unit-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }

    const title = document.getElementById('applianceChartTitle');
    if (title) {
        title.textContent = mode === 'kwh'
            ? 'Electricity Use by Appliance'
            : 'Operational Carbon by Appliance';
    }
    if (applianceChart) {
        applianceChart.data = applianceData();
        applianceChart.options.scales.x.title.text = applianceAxisTitle();
        applianceChart.update();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('applianceChart');
    if (ctx) {
        applianceChart = new Chart(ctx, {
            type: 'bar',
            data: applianceData(),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                layout: { padding: { right: 28 } },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => ' ' + c.parsed.x.toLocaleString() +
                        (applianceMode === 'kwh' ? ' kWh/yr' : ' kg CO\u2082e/yr') } }
                },
                scales: {
                    x: { beginAtZero: true, border: { display: false },
                         grid: { color: '#eee', drawTicks: false },
                         ticks: { font: { size: 11 } },
                         title: { display: true, text: applianceAxisTitle(),
                                  font: { size: 11, weight: 'bold' } } },
                    y: { grid: { display: false }, border: { display: false },
                         ticks: { font: { size: 11 } } }
                }
            },
            plugins: [{
                id: 'applianceValues',
                afterDatasetsDraw(chart) {
                    const c = chart.ctx;
                    chart.getDatasetMeta(0).data.forEach((bar, i) => {
                        const v = chart.data.datasets[0].data[i];
                        c.save();
                        c.font = "700 11px 'Segoe UI', system-ui, sans-serif";
                        c.fillStyle = '#555';
                        c.textAlign = 'left';
                        c.textBaseline = 'middle';
                        c.fillText(v.toLocaleString(), bar.x + 7, bar.y);
                        c.restore();
                    });
                }
            }]
        });
    }

    // Default to the 2-bed, which is the commonest unit across the portfolio
    const defaultTab = document.querySelector('.enduse-head .unit-tab.active');
    showUnitType(1, defaultTab);
});
