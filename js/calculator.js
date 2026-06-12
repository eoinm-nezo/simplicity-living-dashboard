// A4-A5 Calculator JavaScript

// Carbon emission factors
const EMISSION_FACTORS = {
    diesel: 2.68, // kgCO2e per liter
    biodiesel: 2.0, // kgCO2e per liter (20% reduction)
    petrol: 2.31, // kgCO2e per liter
    electric_vehicle: 0.2, // kgCO2e per kWh (for EVs)
    crane: 15, // kgCO2e per hour
    excavator: 18, // kgCO2e per hour
    pump: 12 // kgCO2e per hour
};

// Store calculated results for comparison
const scenarioResults = {};

// Tab switching
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// Calculate carbon emissions
function calculateCarbon(event, scenarioId) {
    event.preventDefault();
    
    const prefix = scenarioId.replace('scenario', 's');
    
    // Get form values
    const workers = parseInt(document.getElementById(`${prefix}-workers`).value);
    const cars = parseInt(document.getElementById(`${prefix}-cars`).value);
    const distance = parseFloat(document.getElementById(`${prefix}-distance`).value);
    const fuelConsumption = parseFloat(document.getElementById(`${prefix}-fuel`).value);
    const workingDays = parseInt(document.getElementById(`${prefix}-days`).value);
    
    const trips = parseInt(document.getElementById(`${prefix}-trips`).value);
    const truckDistance = parseFloat(document.getElementById(`${prefix}-truck-distance`).value);
    const fuelType = document.getElementById(`${prefix}-fuel-type`).value;
    const dieselUsage = parseFloat(document.getElementById(`${prefix}-diesel`).value);
    
    const craneHours = parseInt(document.getElementById(`${prefix}-crane`).value);
    const excavatorHours = parseInt(document.getElementById(`${prefix}-excavator`).value);
    const pumpHours = parseInt(document.getElementById(`${prefix}-pump`).value);
    const otherEquipment = parseInt(document.getElementById(`${prefix}-other`).value);
    
    const electricity = parseInt(document.getElementById(`${prefix}-electricity`).value);
    const carbonIntensity = parseFloat(document.getElementById(`${prefix}-carbon-intensity`).value);
    
    // Calculate emissions
    
    // 1. Worker Transport
    const workerDailyDistance = cars * distance * 2; // round trip
    const workerTotalDistance = workerDailyDistance * workingDays;
    const workerFuelUsed = workerTotalDistance * (fuelConsumption / 100);
    const workerCarbon = workerFuelUsed * EMISSION_FACTORS.petrol;
    
    // 2. Material Transport (A4)
    let transportCarbon;
    if (fuelType === 'electric') {
        // Electric trucks - use kWh
        transportCarbon = trips * dieselUsage * carbonIntensity;
    } else {
        const fuelFactor = fuelType === 'biodiesel' ? EMISSION_FACTORS.biodiesel : EMISSION_FACTORS.diesel;
        transportCarbon = trips * dieselUsage * fuelFactor;
    }
    
    // 3. Equipment (A5)
    const craneCarbon = craneHours * EMISSION_FACTORS.crane;
    const excavatorCarbon = excavatorHours * EMISSION_FACTORS.excavator;
    const pumpCarbon = pumpHours * EMISSION_FACTORS.pump;
    const equipmentCarbon = craneCarbon + excavatorCarbon + pumpCarbon + otherEquipment;
    
    // 4. Site Energy (A5)
    const energyCarbon = electricity * carbonIntensity;
    
    // Total
    const totalCarbon = workerCarbon + transportCarbon + equipmentCarbon + energyCarbon;
    
    // Display results
    document.getElementById(`${prefix}-result-workers`).textContent = workerCarbon.toFixed(0) + ' kgCO2e';
    document.getElementById(`${prefix}-result-transport`).textContent = transportCarbon.toFixed(0) + ' kgCO2e';
    document.getElementById(`${prefix}-result-equipment`).textContent = equipmentCarbon.toFixed(0) + ' kgCO2e';
    document.getElementById(`${prefix}-result-energy`).textContent = energyCarbon.toFixed(0) + ' kgCO2e';
    document.getElementById(`${prefix}-result-total`).textContent = totalCarbon.toFixed(0) + ' kgCO2e';
    
    document.getElementById(`result-${scenarioId}`).style.display = 'block';
    
    // Store results for comparison
    scenarioResults[scenarioId] = {
        name: getScenarioName(scenarioId),
        worker: workerCarbon,
        transport: transportCarbon,
        equipment: equipmentCarbon,
        energy: energyCarbon,
        total: totalCarbon
    };
    
    // Update comparison if multiple scenarios calculated
    updateComparison();
}

function getScenarioName(scenarioId) {
    const names = {
        'scenario1': 'Baseline',
        'scenario2': 'Optimized',
        'scenario3': 'Electric/Low-Carbon'
    };
    return names[scenarioId] || 'Custom Scenario';
}

function updateComparison() {
    const keys = Object.keys(scenarioResults);
    if (keys.length < 2) return;
    
    // Find best (lowest) values
    let bestTotal = Infinity;
    let bestScenario = '';
    
    keys.forEach(key => {
        if (scenarioResults[key].total < bestTotal) {
            bestTotal = scenarioResults[key].total;
            bestScenario = key;
        }
    });
    
    // Build comparison table
    let html = '<table class="comparison-table">';
    html += '<thead><tr>';
    html += '<th>Scenario</th>';
    html += '<th>Worker Transport</th>';
    html += '<th>Material Transport (A4)</th>';
    html += '<th>Equipment (A5)</th>';
    html += '<th>Site Energy (A5)</th>';
    html += '<th>Total A4-A5</th>';
    html += '</tr></thead><tbody>';
    
    keys.forEach(key => {
        const result = scenarioResults[key];
        const isBest = key === bestScenario;
        const rowClass = isBest ? ' class="best"' : '';
        
        html += `<tr${rowClass}>`;
        html += `<td><strong>${result.name}</strong></td>`;
        html += `<td>${result.worker.toFixed(0)} kgCO2e</td>`;
        html += `<td>${result.transport.toFixed(0)} kgCO2e</td>`;
        html += `<td>${result.equipment.toFixed(0)} kgCO2e</td>`;
        html += `<td>${result.energy.toFixed(0)} kgCO2e</td>`;
        html += `<td><strong>${result.total.toFixed(0)} kgCO2e</strong></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    if (bestScenario) {
        const bestResult = scenarioResults[bestScenario];
        html += `<p style="margin-top: 1.5rem; padding: 1rem; background: #e8f5e9; border-radius: 4px; border-left: 4px solid #28a745;">`;
        html += `<strong>Best Scenario:</strong> ${bestResult.name} with total emissions of <strong>${bestResult.total.toFixed(0)} kgCO2e</strong>`;
        html += `</p>`;
    }
    
    document.getElementById('comparison-section').innerHTML = html;
}

function addScenario() {
    alert('Additional scenarios can be added by duplicating existing scenarios and modifying parameters. This feature allows you to create custom comparison scenarios.');
}

// Check for URL parameters to pre-populate
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const element = urlParams.get('element');
    
    if (element) {
        // Show a message about the element being analyzed
        const elementNames = {
            'foundation': 'Foundation',
            'walls': 'Structural Walls',
            'floors': 'Suspended Floors',
            'roof': 'Roof System',
            'windows': 'Windows & Glazing',
            'cladding': 'External Cladding'
        };
        
        if (elementNames[element]) {
            const message = document.createElement('div');
            message.style.cssText = 'background: #fff3cd; padding: 1rem; border-radius: 4px; margin-bottom: 2rem; border-left: 4px solid #ff6600;';
            message.innerHTML = `<strong>Analyzing:</strong> ${elementNames[element]} construction carbon emissions`;
            
            const container = document.querySelector('.container');
            const firstSection = container.querySelector('.section');
            firstSection.insertAdjacentElement('afterend', message);
        }
    }
});
