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

function buildEnergyConsumptionChart(canvasId, rows) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
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
                    title: { display: true, text: 'Initial Construction Cost (index, baseline = 100)', font: { size: 12, weight: 'bold' } },
                    grid: { color: '#eee' }
                },
                y: {
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

// Report toggle: switch the embedded Nezo report between projects
function selectReport(btn) {
    document.querySelectorAll('#reportSelector .building-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('reportFrame').src = btn.dataset.report;
}

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

document.addEventListener('DOMContentLoaded', () => {
    const sorted = [...APARTMENT_APPLIANCES].sort((a, b) => b.kwh - a.kwh);
    const labels  = sorted.map(a => a.label);
    const bgColors = sorted.map(a => a.color + 'CC');
    const bdColors = sorted.map(a => a.border);

    const baseOpts = (xTitle) => ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x.toLocaleString()} ${xTitle}` } }
        },
        scales: {
            x: { beginAtZero: true, grid: { color: '#eee' }, ticks: { font: { size: 11 } },
                 title: { display: true, text: xTitle, font: { size: 11, weight: 'bold' } } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
    });

    const kwhCtx = document.getElementById('applianceEnergyChart');
    if (kwhCtx) new Chart(kwhCtx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'kWh/year', data: sorted.map(a => a.kwh),
            backgroundColor: bgColors, borderColor: bdColors, borderWidth: 1, borderRadius: 4 }] },
        options: baseOpts('kWh / year')
    });

    const co2Ctx = document.getElementById('applianceCarbonChart');
    if (co2Ctx) new Chart(co2Ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'kg CO₂e/year', data: sorted.map(a => Math.round(a.kwh * NZ_GRID_EF)),
            backgroundColor: bgColors, borderColor: bdColors, borderWidth: 1, borderRadius: 4 }] },
        options: baseOpts('kg CO₂e / year  (NZ grid: 0.098 kg/kWh)')
    });
});
