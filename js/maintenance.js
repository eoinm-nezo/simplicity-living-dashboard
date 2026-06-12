// Maintenance & Life Cycle Cost Calculator

// Maintenance schedule data
const maintenanceItems = [
    { name: 'Roof Inspection', frequency: 1, cost: 2500 },
    { name: 'Roof Minor Repairs', frequency: 5, cost: 15000 },
    { name: 'Roof Major Work', frequency: 20, cost: 80000 },
    { name: 'HVAC Annual Service', frequency: 1, cost: 3500 },
    { name: 'HVAC Component Replacement', frequency: 15, cost: 45000 },
    { name: 'Life Safety Systems Testing', frequency: 0.5, cost: 1800 },
    { name: 'Fire System Maintenance', frequency: 1, cost: 2200 },
    { name: 'Facade Washing', frequency: 2, cost: 8000 },
    { name: 'Facade Seal Maintenance', frequency: 5, cost: 12000 },
    { name: 'Exterior Repaint', frequency: 12, cost: 55000 },
    { name: 'Lift Servicing', frequency: 1, cost: 4500 },
    { name: 'Plumbing Inspection', frequency: 2, cost: 2000 },
    { name: 'Electrical Testing', frequency: 5, cost: 3500 },
    { name: 'Building Management System', frequency: 1, cost: 2800 },
    { name: 'Landscaping Maintenance', frequency: 0.25, cost: 1200 }
];

let comparisonChartInstance = null;

// Update schedule based on selected years
function updateSchedule() {
    const years = parseInt(document.getElementById('yearRange').value);
    document.getElementById('yearDisplay').textContent = years;
    
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';
    
    let totalCost = 0;
    
    maintenanceItems.forEach(item => {
        const occurrences = Math.floor(years / item.frequency);
        
        if (occurrences > 0) {
            const itemTotal = occurrences * item.cost;
            totalCost += itemTotal;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>Every ${item.frequency} year${item.frequency !== 1 ? 's' : ''}</td>
                <td>$${item.cost.toLocaleString()}</td>
                <td>${occurrences}</td>
                <td>$${itemTotal.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        }
    });
    
    document.getElementById('totalCost').textContent = '$' + totalCost.toLocaleString();
}

// Construction methodology comparison data
const methodologyData = {
    20: {
        simplicity: 2100000,
        precast: 2380000,
        clt: 2550000
    },
    35: {
        simplicity: 2450000,
        precast: 2820000,
        clt: 3050000
    },
    50: {
        simplicity: 2800000,
        precast: 3200000,
        clt: 3500000
    }
};

function updateComparison() {
    const period = parseInt(document.getElementById('comparisonPeriod').value);
    document.getElementById('comparisonYears').textContent = period;
    
    const data = methodologyData[period];
    
    // Update cost displays
    document.getElementById('simplicityCost').textContent = 
        '$' + (data.simplicity / 1000000).toFixed(1) + 'M';
    document.getElementById('precastCost').textContent = 
        '$' + (data.precast / 1000000).toFixed(1) + 'M';
    document.getElementById('cltCost').textContent = 
        '$' + (data.clt / 1000000).toFixed(1) + 'M';
    
    // Update chart
    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
    }
    
    const ctx = document.getElementById('comparisonChart');
    
    // Calculate cost breakdown
    const initialCostRatio = { simplicity: 0.65, precast: 0.70, clt: 0.72 };
    const maintenanceRatio = { simplicity: 0.20, precast: 0.18, clt: 0.16 };
    const operationalRatio = { simplicity: 0.15, precast: 0.12, clt: 0.12 };
    
    comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Simplicity In-Situ', 'Precast Concrete', 'CLT'],
            datasets: [
                {
                    label: 'Initial Construction',
                    data: [
                        data.simplicity * initialCostRatio.simplicity,
                        data.precast * initialCostRatio.precast,
                        data.clt * initialCostRatio.clt
                    ],
                    backgroundColor: '#ff6600'
                },
                {
                    label: 'Maintenance',
                    data: [
                        data.simplicity * maintenanceRatio.simplicity,
                        data.precast * maintenanceRatio.precast,
                        data.clt * maintenanceRatio.clt
                    ],
                    backgroundColor: '#ff9800'
                },
                {
                    label: 'Operational',
                    data: [
                        data.simplicity * operationalRatio.simplicity,
                        data.precast * operationalRatio.precast,
                        data.clt * operationalRatio.clt
                    ],
                    backgroundColor: '#ffcc00'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000000).toFixed(1) + 'M';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Total Cost Over ' + period + ' Years'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += '$' + (context.parsed.y / 1000000).toFixed(2) + 'M';
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateSchedule();
    updateComparison();
});
