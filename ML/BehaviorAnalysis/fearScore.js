function calculateFearScore({ answers, hesitationTimes, demographics }) {
  let score = 50;
  
  const avgHesitation = hesitationTimes.length > 0 
    ? hesitationTimes.reduce((a, b) => a + b, 0) / hesitationTimes.length 
    : 2000;
  
  const hesitationScore = Math.min(30, avgHesitation / 100);
  score += hesitationScore;
  
  const riskResponses = {
    'Sell immediately': 25,
    'Wait it out': -5,
    'Buy more': -15,
    'Consult an advisor': 5
  };
  
  if (answers.risk && riskResponses[answers.risk] !== undefined) {
    score += riskResponses[answers.risk];
  }
  
  const goalResponses = {
    'Buying a house': 10,
    'Retirement': -5,
    'Travel': 15,
    'Growing wealth': -10
  };
  
  if (answers.goal && goalResponses[answers.goal] !== undefined) {
    score += goalResponses[answers.goal];
  }
  
  const salaryResponses = {
    'Under $50k': 15,
    '$50k - $100k': 5,
    '$100k - $200k': -5,
    'Over $200k': -15
  };
  
  if (answers.salary && salaryResponses[answers.salary] !== undefined) {
    score += salaryResponses[answers.salary];
  }
  
  if (demographics?.age) {
    if (demographics.age < 25) score -= 10;
    else if (demographics.age > 45) score += 10;
  }
  
  return Math.max(1, Math.min(100, Math.round(score)));
}

function getFearLevel(score) {
  if (score < 30) return { level: 'very_low', label: 'Risk-Tolerant', color: '#22c55e' };
  if (score < 50) return { level: 'low', label: 'Moderately Risk-Tolerant', color: '#84cc16' };
  if (score < 70) return { level: 'medium', label: 'Balanced', color: '#eab308' };
  if (score < 85) return { level: 'high', label: 'Risk-Averse', color: '#f97316' };
  return { level: 'very_high', label: 'Very Risk-Averse', color: '#ef4444' };
}

module.exports = {
  calculateFearScore,
  getFearLevel
};
