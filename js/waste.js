// Waste Management Calculator

function calculateWaste() {
    const volume = parseFloat(document.getElementById('wasteVolume').value) || 0;
    const area = parseFloat(document.getElementById('floorArea').value) || 1;
    
    // Calculate waste height in mm
    const wasteHeightM = volume / area;
    const wasteHeightMm = wasteHeightM * 1000;
    
    // Update display
    document.getElementById('wasteHeight').textContent = wasteHeightMm.toFixed(1);
    
    // Update emoji and performance text
    updateWasteEmoji(wasteHeightMm);
    
    // Update visual representation
    updateWasteVisualization(wasteHeightM);
}

function updateWasteEmoji(wasteHeightMm) {
    const emojiElement = document.getElementById('wasteEmoji');
    const performanceElement = document.getElementById('performanceText');
    
    let emoji, performance, color;
    
    if (wasteHeightMm < 50) {
        emoji = '😊';
        performance = 'Excellent Performance';
        color = '#28a745';
    } else if (wasteHeightMm < 100) {
        emoji = '🙂';
        performance = 'Good Performance';
        color = '#5cb85c';
    } else if (wasteHeightMm < 150) {
        emoji = '😐';
        performance = 'Acceptable';
        color = '#f0ad4e';
    } else if (wasteHeightMm < 250) {
        emoji = '🤔';
        performance = 'Needs Attention';
        color = '#ff9800';
    } else if (wasteHeightMm < 400) {
        emoji = '😟';
        performance = 'High Waste';
        color = '#ff5722';
    } else {
        emoji = '😰';
        performance = 'Critical - Urgent Action Required';
        color = '#dc3545';
    }
    
    emojiElement.textContent = emoji;
    performanceElement.textContent = performance;
    performanceElement.style.color = color;
}

function updateWasteVisualization(wasteHeightM) {
    const visualElement = document.getElementById('wasteVisualization');
    
    // Building is 400px tall representing ~2.5m (typical floor heights)
    // So each meter = 160px
    const maxVisibleHeight = 2.5; // meters
    const heightPercentage = Math.min((wasteHeightM / maxVisibleHeight) * 100, 100);
    
    visualElement.style.height = heightPercentage + '%';
    
    // Change color based on severity
    if (wasteHeightM < 0.05) {
        visualElement.style.background = 'linear-gradient(to top, rgba(40,167,69,0.8), rgba(40,167,69,0.4))';
        visualElement.style.borderTopColor = '#28a745';
    } else if (wasteHeightM < 0.1) {
        visualElement.style.background = 'linear-gradient(to top, rgba(92,184,92,0.8), rgba(92,184,92,0.4))';
        visualElement.style.borderTopColor = '#5cb85c';
    } else if (wasteHeightM < 0.15) {
        visualElement.style.background = 'linear-gradient(to top, rgba(255,152,0,0.8), rgba(255,152,0,0.4))';
        visualElement.style.borderTopColor = '#ff9800';
    } else if (wasteHeightM < 0.4) {
        visualElement.style.background = 'linear-gradient(to top, rgba(255,87,34,0.8), rgba(255,87,34,0.4))';
        visualElement.style.borderTopColor = '#ff5722';
    } else {
        visualElement.style.background = 'linear-gradient(to top, rgba(220,53,69,0.8), rgba(220,53,69,0.4))';
        visualElement.style.borderTopColor = '#dc3545';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    calculateWaste();
});
