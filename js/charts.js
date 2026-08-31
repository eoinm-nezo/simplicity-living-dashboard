// Simplicity Living - Charts and Interactive Features

// Data for the 4 Simplicity Living projects (ordered by delivery)
const projectData = {
    projects: [
        ['Reiputa', 'Mt Wellington'],
        ['Waiatarua', 'Remuera'],
        ['Lake Road', 'Northcote'],
        ['Morningside Dr', 'Morningside']
    ],
    embodiedCarbon: {
        typical: [450, 450, 450, 450], // kgCO2e/m2
        simplicity: [380, 350, 320, 290], // kgCO2e/m2 (improving)
    },
    energy: {
        benchmark: { usage: 150, carbon: 60 }, // NZ H1 code-minimum residential
        usage: [120, 115, 105, 95], // kWh/m2/year
        carbon: [48, 46, 42, 38] // kgCO2e/m2/year
    }
};

// Current energy chart mode
let energyChartMode = 'usage'; // 'usage' or 'carbon'
let energyChartInstance = null;

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    initCarbonChart();
    initEnergyChart();
});

// ─── Shared chart theme ───────────────────────────────────────────────────────
// One place to change how every chart on the dashboard reads.
const chartTheme = {
    orange:     '#ff6600',
    orangeSoft: 'rgba(255,102,0,0.15)',
    benchmark:  '#9aa0a6',
    ink:        '#333333',
    muted:      '#8a8a8a',
    grid:       '#ededed',
    font: "'Segoe UI', system-ui, -apple-system, sans-serif"
};

Chart.defaults.font.family = chartTheme.font;
Chart.defaults.color = chartTheme.muted;

// Draws the value above each bar. Chart.js has no built-in data labels and
// pulling in the plugin for two charts isn't worth the weight.
const barValueLabels = {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((ds, di) => {
            if (ds.type === 'line' || ds.hideValues) return;
            const meta = chart.getDatasetMeta(di);
            if (meta.hidden) return;
            meta.data.forEach((bar, i) => {
                const v = ds.data[i];
                if (v === null || v === undefined) return;
                ctx.save();
                ctx.font = '700 12px ' + chartTheme.font;
                ctx.fillStyle = chartTheme.ink;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(Math.round(v).toLocaleString(), bar.x, bar.y - 6);
                ctx.restore();
            });
        });
    }
};

// Common axis / legend treatment
function baseChartOptions(yTitle) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 22 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            title: { display: false },
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    boxHeight: 8,
                    padding: 18,
                    font: { size: 12 },
                    color: chartTheme.muted
                }
            },
            tooltip: {
                backgroundColor: 'rgba(30,30,30,0.92)',
                padding: 12,
                cornerRadius: 6,
                titleFont: { size: 12, weight: '700' },
                bodyFont: { size: 12 },
                displayColors: true,
                usePointStyle: true
            }
        },
        scales: {
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: chartTheme.ink, font: { size: 12, weight: '600' } }
            },
            y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: chartTheme.grid, drawTicks: false },
                ticks: { color: chartTheme.muted, font: { size: 11 }, padding: 8 },
                title: {
                    display: true,
                    text: yTitle,
                    color: chartTheme.muted,
                    font: { size: 11, weight: '700' }
                }
            }
        }
    };
}

// A constant benchmark is a reference line, not four identical bars.
function benchmarkLine(label, value, count) {
    return {
        label: label,
        type: 'line',
        data: Array(count).fill(value),
        borderColor: chartTheme.benchmark,
        backgroundColor: chartTheme.benchmark,
        borderWidth: 2,
        borderDash: [6, 5],
        pointRadius: 0,
        pointHitRadius: 12,
        fill: false,
        hideValues: true,
        order: 0
    };
}

// Embodied Carbon Chart
function initCarbonChart() {
    const ctx = document.getElementById('carbonChart');
    if (!ctx) return;

    const n = projectData.projects.length;
    const options = baseChartOptions('kgCO₂e / m² GFA');
    options.plugins.tooltip.callbacks = {
        label: function (context) {
            const label = context.dataset.label || '';
            let out = label + ': ' + context.parsed.y + ' kgCO₂e/m²';
            if (context.dataset.label === 'Simplicity actual') {
                const typical = projectData.embodiedCarbon.typical[context.dataIndex];
                out += '  (−' + ((typical - context.parsed.y) / typical * 100).toFixed(0) + '% vs benchmark)';
            }
            return out;
        }
    };

    new Chart(ctx, {
        type: 'bar',
        plugins: [barValueLabels],
        data: {
            labels: projectData.projects,
            datasets: [
                {
                    label: 'Simplicity actual',
                    data: projectData.embodiedCarbon.simplicity,
                    backgroundColor: chartTheme.orange,
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 64,
                    order: 1
                },
                benchmarkLine('Industry benchmark', projectData.embodiedCarbon.typical[0], n)
            ]
        },
        options: options
    });
}

// Energy Chart with Toggle
function initEnergyChart() {
    const ctx = document.getElementById('energyChart');
    if (!ctx) return;

    const options = baseChartOptions(energyAxisTitle());
    options.plugins.tooltip.callbacks = {
        label: function (context) {
            const unit = energyChartMode === 'usage' ? ' kWh/m²/yr' : ' kgCO₂e/m²/yr';
            return (context.dataset.label || '') + ': ' + context.parsed.y + unit;
        }
    };

    energyChartInstance = new Chart(ctx, {
        type: 'bar',
        plugins: [barValueLabels],
        data: getEnergyChartData(),
        options: options
    });
}

function energyAxisTitle() {
    return energyChartMode === 'usage' ? 'kWh / m² / year' : 'kgCO₂e / m² / year';
}

function getEnergyChartData() {
    const dataToUse = energyChartMode === 'usage' ? projectData.energy.usage : projectData.energy.carbon;
    const benchVal  = energyChartMode === 'usage' ? projectData.energy.benchmark.usage : projectData.energy.benchmark.carbon;

    return {
        labels: projectData.projects,
        datasets: [
            {
                label: energyChartMode === 'usage' ? 'Simplicity actual' : 'Simplicity carbon',
                data: dataToUse,
                backgroundColor: chartTheme.orange,
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 64,
                order: 1
            },
            benchmarkLine('Code-minimum benchmark', benchVal, dataToUse.length)
        ]
    };
}

// Toggle energy chart between usage and carbon
function toggleEnergyChart() {
    const toggle = document.getElementById('energyToggle');
    toggle.classList.toggle('active');

    energyChartMode = energyChartMode === 'usage' ? 'carbon' : 'usage';

    if (energyChartInstance) {
        energyChartInstance.data = getEnergyChartData();
        energyChartInstance.options.scales.y.title.text = energyAxisTitle();
        energyChartInstance.update();
    }
}

// Waste calculator emoji expressions
function getWasteEmoji(wasteLevel) {
    // wasteLevel is height in mm
    if (wasteLevel < 50) {
        return '😊'; // Happy - very low waste
    } else if (wasteLevel < 100) {
        return '🙂'; // Satisfied - good
    } else if (wasteLevel < 150) {
        return '😐'; // Neutral - acceptable
    } else if (wasteLevel < 200) {
        return '🤔'; // Thinking - needs attention
    } else if (wasteLevel < 300) {
        return '😟'; // Concerned - high waste
    } else {
        return '😰'; // Worried - very high waste
    }
}

// Update waste emoji based on input
function updateWasteEmoji() {
    const volume = parseFloat(document.getElementById('wasteVolume')?.value || 0);
    const area = parseFloat(document.getElementById('floorArea')?.value || 1);
    const wasteHeight = (volume / area) * 1000; // Convert to mm

    const emojiElement = document.getElementById('wasteEmoji');
    if (emojiElement) {
        emojiElement.textContent = getWasteEmoji(wasteHeight);
    }
}

// ─── Lifecycle Overview (LCA breakdown table + chart) ─────────────────────────

// Per-module lifecycle data per m² GFA (kgCO₂e/m²)
// A1-A3 and A4-A5 from EPD-based LCA / Simplicity logistics tool (confirmed).
// B-C and Operational are indicative estimates pending full analysis.
const lcaData = {
    modules: [
        { key: 'a1a3', label: 'A1–A3', desc: 'Embodied carbon — manufacturing & supply (EPD-based LCA)', confirmed: true },
        { key: 'a4a5', label: 'A4–A5', desc: 'Construction logistics — transport & site (Simplicity Tool)', confirmed: true },
        { key: 'bc',   label: 'B–C',   desc: 'In-use durability & end-of-life — component replacement over 50 yr', confirmed: false },
        { key: 'op',   label: 'Operational', desc: 'Grid emissions from energy in use — 50-year estimate', confirmed: false }
    ],
    // Benchmark: NZ code-minimum multi-unit residential
    benchmark: { a1a3: 450, a4a5: 40, bc: 60, op: 735 },
    // Simplicity projects (improving across portfolio)
    projects: [
        { name: 'Reiputa',     sub: 'Mt Wellington', a1a3: 380, a4a5: 32, bc: 40, op: 588 },
        { name: 'Waiatarua',   sub: 'Remuera',       a1a3: 350, a4a5: 29, bc: 38, op: 564 },
        { name: 'Lake Road',   sub: 'Northcote',     a1a3: 320, a4a5: 27, bc: 36, op: 515 },
        { name: 'Morningside', sub: 'Morningside',   a1a3: 290, a4a5: 25, bc: 34, op: 466 }
    ]
};

function lcaTotal(obj) {
    return obj.a1a3 + obj.a4a5 + obj.bc + obj.op;
}

// Toggle between Charts view and Lifecycle Overview
function showView(view, btn) {
    document.querySelectorAll('.view-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });
    if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
    }
    document.getElementById('chartsView').style.display = view === 'charts' ? '' : 'none';
    document.getElementById('lcaView').style.display   = view === 'lca'    ? '' : 'none';
    if (view === 'lca') buildLcaView();
    // Keep the URL in step so a view can be linked to directly.
    if (history.replaceState) {
        history.replaceState(null, '', view === 'lca' ? '#lifecycle' : location.pathname + location.search);
    }
}

// Honour #lifecycle on load so the Lifecycle Overview can be shared as a link
document.addEventListener('DOMContentLoaded', function () {
    if (location.hash === '#lifecycle') {
        var tabs = document.querySelectorAll('.view-tab');
        if (tabs.length > 1) showView('lca', tabs[1]);
    }
});

let lcaBuilt = false;
function buildLcaView() {
    if (lcaBuilt) return;
    lcaBuilt = true;

    const benchTotal = lcaTotal(lcaData.benchmark);
    const cols = lcaData.projects;

    // ── Build table ──────────────────────────────────────────────────────────
    let html = '<div class="lca-table-wrap"><table class="lca-table"><thead><tr>';
    html += '<th>LCA Module</th><th class="col-bench">Benchmark</th>';
    cols.forEach(p => { html += `<th>${p.name}<br><small style="font-weight:400;text-transform:none;letter-spacing:0">${p.sub}</small></th>`; });
    html += '</tr></thead><tbody>';

    lcaData.modules.forEach(m => {
        const bVal = lcaData.benchmark[m.key];
        const estTag = m.confirmed ? '' : ' <span class="lca-est">est.</span>';
        html += `<tr><td><strong>${m.label}</strong><span class="lca-desc">${m.desc}${estTag}</span></td>`;
        html += `<td class="col-bench">${bVal.toLocaleString()}</td>`;
        cols.forEach(p => {
            const v = p[m.key];
            const cls = v <= bVal ? 'better' : 'worse';
            html += `<td class="${cls}">${v.toLocaleString()}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody><tfoot><tr>';
    html += '<td><strong>Total (50-year lifecycle)</strong><span class="lca-desc">kgCO&#8322;e/m&#178; GFA</span></td>';
    html += `<td class="col-bench"><strong>${benchTotal.toLocaleString()}</strong></td>`;
    cols.forEach(p => {
        const t = lcaTotal(p);
        const pct = Math.round((benchTotal - t) / benchTotal * 100);
        html += `<td style="text-align:right"><strong>${t.toLocaleString()}</strong><br><span class="saving-pill">&#8722;${pct}%</span></td>`;
    });
    html += '</tr></tfoot></table></div>';
    html += '<p class="lca-note">&#42; B&#8211;C and Operational values are indicative estimates &mdash; full durability and energy-in-use data being compiled from live projects. A1&#8211;A3 from EPD-based LCA; A4&#8211;A5 via the Simplicity logistics tool. Operational emissions use NZ grid average. All values kgCO&#8322;e/m&#178; GFA.</p>';

    document.getElementById('lcaTableContainer').innerHTML = html;

    buildLcaChart(benchTotal, cols);
}

let lcaChartInstance = null;
function buildLcaChart(benchTotal, cols) {
    const ctx = document.getElementById('lcaChart');
    if (!ctx) return;

    const labels = ['Benchmark', ...cols.map(p => p.name)];
    const modColors = ['#ff6600', '#ff9a4d', '#ffc79e', '#c9ced3'];
    const modLabels = ['A1–A3', 'A4–A5', 'B–C', 'Operational'];
    const modKeys   = ['a1a3', 'a4a5', 'bc', 'op'];

    lcaChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: modKeys.map((k, i) => ({
                label: modLabels[i],
                data: [lcaData.benchmark[k], ...cols.map(p => p[k])],
                backgroundColor: modColors[i],
                borderColor: modColors[i],
                borderWidth: 1,
                borderRadius: 3,
                borderSkipped: false
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        footer: items => {
                            const total = items.reduce((s, i) => s + i.parsed.y, 0);
                            const isProj = items.length > 0 && items[0].label !== 'Benchmark';
                            const pct = isProj ? `  (−${Math.round((benchTotal - total) / benchTotal * 100)}% vs benchmark)` : '';
                            return `Total: ${total.toLocaleString()} kgCO₂e/m²${pct}`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'kgCO₂e / m² GFA  (50-year lifecycle)', font: { size: 11, weight: 'bold' } },
                    grid: { color: chartTheme.grid, drawTicks: false },
                    border: { display: false }
                }
            }
        }
    });
}
