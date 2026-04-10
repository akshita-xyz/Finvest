function extractBehaviorFeatures({ answers, hesitationTimes, interactions, demographics }) {
  const features = {
    hesitationScore: calculateHesitationScore(hesitationTimes),
    riskTolerance: calculateRiskTolerance(answers),
    financialLiteracy: calculateLiteracyScore(answers),
    timeHorizon: calculateTimeHorizon(answers),
    volatilityComfort: calculateVolatilityComfort(answers),
    investmentExperience: calculateExperience(answers),
    emotionalStability: calculateEmotionalStability(hesitationTimes),
    decisionSpeed: calculateDecisionSpeed(hesitationTimes),
    diversification: calculateDiversification(answers),
    goalClarity: calculateGoalClarity(answers)
  };
  
  return normalizeFeatures(features);
}

function calculateHesitationScore(times) {
  if (!times || times.length === 0) return 0.5;
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  const normalizedAvg = Math.min(1, avg / 10000);
  const normalizedVariance = Math.min(1, stdDev / 5000);
  
  return (normalizedAvg * 0.7) + (normalizedVariance * 0.3);
}

function calculateRiskTolerance(answers) {
  const weights = {
    'Sell immediately': 0.2,
    'Wait it out': 0.5,
    'Buy more': 0.9,
    'Consult an advisor': 0.4
  };
  
  return answers?.risk ? weights[answers.risk] || 0.5 : 0.5;
}

function calculateLiteracyScore(answers) {
  let score = 0.5;
  
  if (answers?.goal) score += 0.1;
  if (answers?.risk) score += 0.15;
  if (answers?.salary) score += 0.1;
  
  return Math.min(1, score);
}

function calculateTimeHorizon(answers) {
  const weights = {
    'Travel': 0.2,
    'Buying a house': 0.5,
    'Growing wealth': 0.8,
    'Retirement': 0.95
  };
  
  return answers?.goal ? weights[answers.goal] || 0.5 : 0.5;
}

function calculateVolatilityComfort(answers) {
  if (answers?.risk === 'Sell immediately') return 0.2;
  if (answers?.risk === 'Buy more') return 0.9;
  if (answers?.risk === 'Wait it out') return 0.6;
  return 0.5;
}

function calculateExperience(answers) {
  const weights = {
    'Under $50k': 0.3,
    '$50k - $100k': 0.5,
    '$100k - $200k': 0.7,
    'Over $200k': 0.85
  };
  
  return answers?.salary ? weights[answers.salary] || 0.5 : 0.5;
}

function calculateEmotionalStability(times) {
  if (!times || times.length < 2) return 0.5;
  
  const variance = calculateVariance(times);
  const normalizedVariance = Math.min(1, variance / 10000000);
  
  return 1 - normalizedVariance;
}

function calculateDecisionSpeed(times) {
  if (!times || times.length === 0) return 0.5;
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const normalized = Math.min(1, avg / 10000);
  
  return 1 - normalized;
}

function calculateDiversification(answers) {
  return 0.5;
}

function calculateGoalClarity(answers) {
  return answers?.goal ? 0.8 : 0.3;
}

function calculateVariance(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}

function normalizeFeatures(features) {
  const normalized = {};
  for (const [key, value] of Object.entries(features)) {
    normalized[key] = Math.max(0, Math.min(1, value));
  }
  return normalized;
}

function getFeatureVector(features) {
  return [
    features.hesitationScore,
    features.riskTolerance,
    features.financialLiteracy,
    features.timeHorizon,
    features.volatilityComfort,
    features.investmentExperience,
    features.emotionalStability,
    features.decisionSpeed,
    features.diversification,
    features.goalClarity
  ];
}

module.exports = {
  extractBehaviorFeatures,
  normalizeFeatures,
  getFeatureVector
};
