// Simplicity Scoring System

const categories = {
    'energy': { name: 'Energy Efficiency', maxScore: 20 },
    'carbon': { name: 'Embodied Carbon', maxScore: 20 },
    'waste': { name: 'Waste Management', maxScore: 20 },
    'water': { name: 'Water Efficiency', maxScore: 20 },
    'ieq': { name: 'Indoor Environment Quality', maxScore: 20 },
    'site': { name: 'Site & Community', maxScore: 20 },
    'innovation': { name: 'Innovation & Leadership', maxScore: 20 }
};

// Toggle category visibility
function toggleCategory(categoryId) {
    const content = document.getElementById(`${categoryId}-content`);
    const allContents = document.querySelectorAll('.category-content');
    
    // Close all other categories
    allContents.forEach(c => {
        if (c !== content) {
            c.classList.remove('active');
        }
    });
    
    // Toggle current category
    content.classList.toggle('active');
}

// Update scores
function updateScore() {
    let totalScore = 0;
    const categoryScores = {};
    
    // Calculate scores for each category
    Object.keys(categories).forEach(categoryId => {
        const content = document.getElementById(`${categoryId}-content`);
        const selects = content.querySelectorAll('select');
        let categoryScore = 0;
        
        selects.forEach(select => {
            categoryScore += parseInt(select.value) || 0;
        });
        
        categoryScores[categoryId] = categoryScore;
        totalScore += categoryScore;
        
        // Update category score display
        document.getElementById(`${categoryId}-score`).textContent = 
            `${categoryScore}/${categories[categoryId].maxScore}`;
    });
    
    // Update total score
    document.getElementById('totalScore').textContent = totalScore;
    
    // Update rating
    updateRating(totalScore);
    
    // Update summary
    updateSummary(categoryScores, totalScore);
}

function updateRating(score) {
    const ratingElement = document.getElementById('scoreRating');
    let rating, stars;
    
    if (score >= 120) {
        rating = '5-Star: Exceptional';
        stars = '⭐⭐⭐⭐⭐';
    } else if (score >= 100) {
        rating = '4-Star: Excellent';
        stars = '⭐⭐⭐⭐';
    } else if (score >= 80) {
        rating = '3-Star: Good';
        stars = '⭐⭐⭐';
    } else if (score >= 60) {
        rating = '2-Star: Adequate';
        stars = '⭐⭐';
    } else if (score > 0) {
        rating = '1-Star: Needs Improvement';
        stars = '⭐';
    } else {
        rating = 'Not Yet Rated';
        stars = '';
    }
    
    ratingElement.textContent = stars + ' ' + rating;
}

function updateSummary(categoryScores, totalScore) {
    const summaryContainer = document.getElementById('categorySummary');
    summaryContainer.innerHTML = '';
    
    Object.keys(categories).forEach(categoryId => {
        const score = categoryScores[categoryId];
        const maxScore = categories[categoryId].maxScore;
        const percentage = ((score / maxScore) * 100).toFixed(0);
        
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h4>${categories[categoryId].name}</h4>
            <div class="score">${score}/${maxScore}</div>
            <div class="percentage">${percentage}% complete</div>
        `;
        summaryContainer.appendChild(card);
    });
}

// Export results as PDF
function exportResults() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const totalScore = parseInt(document.getElementById('totalScore').textContent);
    const rating = document.getElementById('scoreRating').textContent;
    const categoryScores = {};
    
    // Collect all category scores and details
    Object.keys(categories).forEach(categoryId => {
        const content = document.getElementById(`${categoryId}-content`);
        const selects = content.querySelectorAll('select');
        const questions = content.querySelectorAll('.question-item');
        let categoryScore = 0;
        const details = [];
        
        questions.forEach((question, index) => {
            const label = question.querySelector('label').textContent;
            const select = selects[index];
            const selectedOption = select.options[select.selectedIndex].text;
            const score = parseInt(select.value) || 0;
            categoryScore += score;
            
            details.push({
                question: label,
                answer: selectedOption,
                score: score
            });
        });
        
        categoryScores[categoryId] = {
            score: categoryScore,
            maxScore: categories[categoryId].maxScore,
            percentage: ((categoryScore / categories[categoryId].maxScore) * 100).toFixed(0),
            details: details
        };
    });
    
    // Determine rating info
    let ratingText, ratingColor, starCount;
    if (totalScore >= 120) {
        ratingText = '5-Star: Exceptional Performance';
        ratingColor = [40, 167, 69];
        starCount = 5;
    } else if (totalScore >= 100) {
        ratingText = '4-Star: Excellent Performance';
        ratingColor = [92, 184, 92];
        starCount = 4;
    } else if (totalScore >= 80) {
        ratingText = '3-Star: Good Performance';
        ratingColor = [255, 152, 0];
        starCount = 3;
    } else if (totalScore >= 60) {
        ratingText = '2-Star: Adequate Performance';
        ratingColor = [255, 87, 34];
        starCount = 2;
    } else {
        ratingText = '1-Star: Needs Improvement';
        ratingColor = [220, 53, 69];
        starCount = 1;
    }
    
    let yPos = 20;
    
    // Header with Simplicity branding
    doc.setFillColor(255, 102, 0);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('%', 15, 18);
    doc.setFontSize(20);
    doc.text('Simplicity Scoring System', 25, 18);
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('Building Performance Assessment Report', 15, 28);
    
    yPos = 45;
    
    // Executive Summary Box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, 180, 45, 3, 3, 'F');
    
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Executive Summary', 20, yPos + 10);
    
    // Score circle representation
    doc.setFillColor(...ratingColor);
    doc.circle(160, yPos + 22, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(totalScore.toString(), 160, yPos + 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('/140', 160, yPos + 32, { align: 'center' });
    
    // Rating text
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Overall Rating:', 20, yPos + 25);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...ratingColor);
    doc.text(ratingText, 20, yPos + 32);
    
    // Stars - using filled rectangles instead of star symbols
    doc.setFillColor(...ratingColor);
    let starX = 20;
    for (let i = 0; i < starCount; i++) {
        doc.rect(starX, yPos + 33, 5, 5, 'F');
        starX += 7;
    }
    // Empty stars
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    for (let i = starCount; i < 5; i++) {
        doc.rect(starX, yPos + 33, 5, 5, 'FD');
        starX += 7;
    }
    
    yPos += 55;
    
    // Date and project info
    doc.setTextColor(102, 102, 102);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Generated: ' + new Date().toLocaleString(), 15, yPos);
    doc.text('Assessment Tool: Simplicity Living Dashboard', 15, yPos + 5);
    
    yPos += 15;
    
    // Category Performance Summary Table
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Category Performance Summary', 15, yPos);
    
    yPos += 5;
    
    const summaryTableData = [];
    Object.keys(categories).forEach(categoryId => {
        const cat = categoryScores[categoryId];
        summaryTableData.push([
            categories[categoryId].name,
            `${cat.score}/${cat.maxScore}`,
            `${cat.percentage}%`,
            getPerformanceLevel(cat.percentage)
        ]);
    });
    
    doc.autoTable({
        startY: yPos,
        head: [['Category', 'Score', 'Achievement', 'Level']],
        body: summaryTableData,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 102, 0],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: {
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 50, halign: 'center' }
        },
        didParseCell: function(data) {
            // Color code performance levels
            if (data.column.index === 3 && data.section === 'body') {
                const level = data.cell.text[0];
                if (level === 'Excellent') {
                    data.cell.styles.textColor = [40, 167, 69];
                    data.cell.styles.fontStyle = 'bold';
                } else if (level === 'Good') {
                    data.cell.styles.textColor = [92, 184, 92];
                } else if (level === 'Fair') {
                    data.cell.styles.textColor = [255, 152, 0];
                }
            }
        }
    });
    
    // Add new page for detailed results
    doc.addPage();
    yPos = 20;
    
    doc.setFillColor(255, 102, 0);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Detailed Category Assessment', 15, 10);
    
    yPos = 25;
    
    // Detailed breakdown for each category
    Object.keys(categories).forEach((categoryId, index) => {
        const cat = categoryScores[categoryId];
        const categoryName = categories[categoryId].name;
        
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        // Category header
        doc.setFillColor(245, 245, 245);
        doc.rect(15, yPos, 180, 10, 'F');
        
        doc.setTextColor(255, 102, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${getCategoryIcon(categoryId)} ${categoryName}`, 17, yPos + 7);
        
        doc.setTextColor(51, 51, 51);
        doc.text(`Score: ${cat.score}/${cat.maxScore} (${cat.percentage}%)`, 150, yPos + 7);
        
        yPos += 12;
        
        // Question details
        const questionData = cat.details.map(detail => [
            detail.question,
            detail.answer,
            detail.score + ' pts'
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['Assessment Criteria', 'Response', 'Points']],
            body: questionData,
            theme: 'striped',
            headStyles: {
                fillColor: [255, 102, 0],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 90 },
                1: { cellWidth: 70 },
                2: { cellWidth: 20, halign: 'center' }
            },
            margin: { left: 15, right: 15 }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
    });
    
    // Add recommendations page
    doc.addPage();
    yPos = 20;
    
    doc.setFillColor(255, 102, 0);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Recommendations & Next Steps', 15, 10);
    
    yPos = 30;
    
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Performance Summary', 15, yPos);
    
    yPos += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    const summaryText = getSummaryText(totalScore, categoryScores);
    const splitSummary = doc.splitTextToSize(summaryText, 180);
    doc.text(splitSummary, 15, yPos);
    yPos += splitSummary.length * 5 + 5;
    
    // Areas of strength
    const strengths = getTopCategories(categoryScores);
    if (strengths.length > 0) {
        yPos += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(40, 167, 69);
        doc.text('[+] Areas of Strength:', 15, yPos);
        
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(51, 51, 51);
        
        strengths.forEach(cat => {
            const text = `  - ${cat.name}: ${cat.percentage}% achievement`;
            doc.text(text, 20, yPos);
            yPos += 5;
        });
    }
    
    // Areas for improvement
    const improvements = getBottomCategories(categoryScores);
    if (improvements.length > 0) {
        yPos += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 152, 0);
        doc.text('[!] Opportunities for Improvement:', 15, yPos);
        
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(51, 51, 51);
        
        improvements.forEach(cat => {
            const text = `  - ${cat.name}: ${cat.percentage}% achievement - Consider enhancing this area`;
            const lines = doc.splitTextToSize(text, 175);
            doc.text(lines, 20, yPos);
            yPos += lines.length * 5;
        });
    }
    
    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('© 2026 Simplicity Living. Building Performance Dashboard.', 105, 285, { align: 'center' });
    doc.text('This assessment is based on the Simplicity Scoring System, inspired by green-building rating schemes.', 105, 290, { align: 'center' });
    
    // Save the PDF
    const fileName = `Simplicity-Assessment-Report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}

// Helper functions for PDF generation
function getPerformanceLevel(percentage) {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    return 'Needs Work';
}

function getCategoryIcon(categoryId) {
    const icons = {
        'energy': '[E]',
        'carbon': '[C]',
        'waste': '[W]',
        'water': '[H2O]',
        'ieq': '[IEQ]',
        'site': '[S]',
        'innovation': '[I]'
    };
    return icons[categoryId] || '';
}

function getSummaryText(totalScore, categoryScores) {
    let text = `Your project achieved a total score of ${totalScore} out of 140 points. `;
    
    if (totalScore >= 120) {
        text += 'This represents exceptional performance across all sustainability dimensions. Your project demonstrates industry-leading practices and sets a benchmark for others to follow.';
    } else if (totalScore >= 100) {
        text += 'This represents excellent performance with strong sustainability outcomes. Your project exceeds standard expectations and demonstrates significant commitment to environmental and social responsibility.';
    } else if (totalScore >= 80) {
        text += 'This represents good performance with solid sustainability foundations. While performing well, there are opportunities to enhance certain areas for even better outcomes.';
    } else if (totalScore >= 60) {
        text += 'This represents adequate performance meeting baseline requirements. Significant opportunities exist to improve sustainability outcomes across multiple categories.';
    } else {
        text += 'This assessment indicates substantial room for improvement. We recommend reviewing each category to identify priority areas for enhancement.';
    }
    
    return text;
}

function getTopCategories(categoryScores) {
    const categories = [];
    Object.keys(categoryScores).forEach(catId => {
        const cat = categoryScores[catId];
        if (parseInt(cat.percentage) >= 75) {
            categories.push({
                name: getCategoryName(catId),
                percentage: cat.percentage
            });
        }
    });
    return categories.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
}

function getBottomCategories(categoryScores) {
    const categories = [];
    Object.keys(categoryScores).forEach(catId => {
        const cat = categoryScores[catId];
        if (parseInt(cat.percentage) < 60) {
            categories.push({
                name: getCategoryName(catId),
                percentage: cat.percentage
            });
        }
    });
    return categories.sort((a, b) => a.percentage - b.percentage).slice(0, 3);
}

function getCategoryName(catId) {
    const names = {
        'energy': 'Energy Efficiency',
        'carbon': 'Embodied Carbon',
        'waste': 'Waste Management',
        'water': 'Water Efficiency',
        'ieq': 'Indoor Environment Quality',
        'site': 'Site & Community',
        'innovation': 'Innovation & Leadership'
    };
    return names[catId] || catId;
}

// Reset assessment
function resetAssessment() {
    if (confirm('Are you sure you want to reset all assessment answers? This cannot be undone.')) {
        document.querySelectorAll('select').forEach(select => {
            select.value = '0';
        });
        updateScore();
        
        // Close all categories
        document.querySelectorAll('.category-content').forEach(content => {
            content.classList.remove('active');
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateScore();
});
