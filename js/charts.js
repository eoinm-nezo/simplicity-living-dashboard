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

// Embodied Carbon Chart
function initCarbonChart() {
    const ctx = document.getElementById('carbonChart');
    if (!ctx) return;

    const data = {
        labels: projectData.projects,
        datasets: [
            {
                label: 'Typical Embodied Carbon',
                data: projectData.embodiedCarbon.typical,
                backgroundColor: '#cccccc',
                borderColor: '#999999',
                borderWidth: 2
            },
            {
                label: 'Simplicity Actual',
                data: projectData.embodiedCarbon.simplicity,
                backgroundColor: '#ff6600',
                borderColor: '#cc5200',
                borderWidth: 2
            }
        ]
    };

    // Add improvement trend line
    const improvementLine = {
        label: 'Improvement Trend',
        data: projectData.embodiedCarbon.simplicity,
        type: 'line',
        borderColor: '#28a745',
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 0,
        borderDash: [5, 5]
    };

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [...data.datasets, improvementLine]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + ' kgCO2e/m²';
                            
                            // Calculate percentage improvement
                            if (context.datasetIndex === 1) {
                                const typical = projectData.embodiedCarbon.typical[context.dataIndex];
                                const actual = context.parsed.y;
                                const improvement = ((typical - actual) / typical * 100).toFixed(1);
                                label += ` (${improvement}% reduction)`;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Embodied Carbon (kgCO2e/m²)'
                    }
                }
            }
        }
    });
}

// Energy Chart with Toggle
function initEnergyChart() {
    const ctx = document.getElementById('energyChart');
    if (!ctx) return;

    energyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: getEnergyChartData(),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y;
                            label += energyChartMode === 'usage' ? ' kWh/m²/year' : ' kgCO2e/m²/year';
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: energyChartMode === 'usage' ? 'Energy Usage (kWh/m²/year)' : 'Energy Carbon (kgCO2e/m²/year)'
                    }
                }
            }
        }
    });
}

function getEnergyChartData() {
    const dataToUse = energyChartMode === 'usage' ? projectData.energy.usage : projectData.energy.carbon;
    const benchVal  = energyChartMode === 'usage' ? projectData.energy.benchmark.usage : projectData.energy.benchmark.carbon;
    const benchArr  = projectData.projects.map(() => benchVal);

    return {
        labels: projectData.projects,
        datasets: [
            {
                label: 'Code Minimum Benchmark',
                data: benchArr,
                backgroundColor: '#cccccc',
                borderColor: '#999999',
                borderWidth: 2
            },
            {
                label: energyChartMode === 'usage' ? 'Simplicity Actual' : 'Simplicity Carbon',
                data: dataToUse,
                backgroundColor: '#ff6600',
                borderColor: '#cc5200',
                borderWidth: 2
            },
            {
                label: 'Improvement Trend',
                data: dataToUse,
                type: 'line',
                borderColor: '#28a745',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                borderDash: [5, 5]
            }
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
        energyChartInstance.options.scales.y.title.text = 
            energyChartMode === 'usage' ? 'Energy Usage (kWh/m²/year)' : 'Energy Carbon (kgCO2e/m²/year)';
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
    document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('chartsView').style.display = view === 'charts' ? '' : 'none';
    document.getElementById('lcaView').style.display   = view === 'lca'    ? '' : 'none';
    if (view === 'lca') buildLcaView();
}

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
    const modColors = ['#ef9a9a', '#ffcc80', '#a5d6a7', '#90caf9'];
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
                legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 } } },
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
                    grid: { color: '#eee' }
                }
            }
        }
    });
}
