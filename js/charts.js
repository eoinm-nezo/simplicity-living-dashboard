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
    
    return {
        labels: projectData.projects,
        datasets: [
            {
                label: energyChartMode === 'usage' ? 'Energy Usage' : 'Energy Carbon',
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
