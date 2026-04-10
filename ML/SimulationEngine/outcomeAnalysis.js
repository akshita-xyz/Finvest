function analyzeOutcomes(monteCarloResults, scenarioResults) {
  const analysis = {
    summary: generateSummary(monteCarloResults, scenarioResults),
    probabilities: calculateProbabilities(monteCarloResults),
    riskAdjustedReturns: calculateRiskAdjustedReturns(monteCarloResults),
    scenarioComparison: compareScenarios(scenarioResults),
    recommendations: generateRecommendations(monteCarloResults, scenarioResults)
  };
  
  return analysis;
}

function generateSummary(monteCarloResults, scenarioResults) {
  const mcSummary = monteCarloResults.statistics;
  const scenarioWorst = getWorstScenario(scenarioResults);
  
  return {
    expectedValue: mcSummary.mean,
    medianValue: mcSummary.median,
    worstCaseScenario: scenarioWorst?.scenario?.name || 'N/A',
    worstCaseLoss: scenarioWorst?.outcome?.netLoss || 0,
    bestCasePercentile: monteCarloResults.percentiles.p95,
    baseCasePercentile: monteCarloResults.percentiles.p50,
    confidence: calculateConfidence(monteCarloResults)
  };
}

function calculateProbabilities(monteCarloResults) {
  return {
    lossProbability: parseFloat(monteCarloResults.lossProbability),
    profitProbability: parseFloat(monteCarloResults.profitProbability),
    significantLossProbability: calculateSignificantLossProb(monteCarloResults),
    targetAchievementProbability: calculateTargetProb(monteCarloResults, 10000)
  };
}

function calculateSignificantLossProb(results, threshold = 0.1) {
  const significantLosses = results.statistics.min / results.summary.initialInvestment;
  return significantLosses < (1 - threshold) 
    ? ((1 - parseFloat(results.lossProbability)) * 0.3).toFixed(1)
    : '5.0';
}

function calculateTargetProb(results, target) {
  const percentile50 = results.percentiles.p50;
  const initial = results.summary.initialInvestment;
  const targetGrowth = target / initial;
  
  if (percentile50 >= target) return 75;
  if (percentile50 >= target * 0.8) return 60;
  if (percentile50 >= target * 0.5) return 45;
  return 30;
}

function calculateRiskAdjustedReturns(results) {
  const { mean, median, stdDev } = results.statistics;
  const initial = results.summary.initialInvestment;
  
  const annualizedReturn = Math.pow(mean / initial, 1 / results.summary.years) - 1;
  const annualizedVol = stdDev / mean;
  const sharpeRatio = results.statistics.sharpeRatio;
  
  const sortinoRatio = calculateSortinoRatio(results);
  const calmarRatio = calculateCalmarRatio(results);
  
  return {
    annualizedReturn: (annualizedReturn * 100).toFixed(2) + '%',
    volatility: (annualizedVol * 100).toFixed(2) + '%',
    sharpeRatio: parseFloat(sharpeRatio).toFixed(2),
    sortinoRatio: sortinoRatio.toFixed(2),
    calmarRatio: calmarRatio.toFixed(2),
    riskLevel: getRiskLevel(annualizedVol)
  };
}

function calculateSortinoRatio(results) {
  const returns = results.yearlyPaths.map(p => (p.p50 - results.summary.initialInvestment) / results.summary.initialInvestment);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < 0);
  
  if (downsideReturns.length === 0) return 0;
  
  const downsideStd = Math.sqrt(
    downsideReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  
  return downsideStd > 0 ? avgReturn / downsideStd : 0;
}

function calculateCalmarRatio(results) {
  const annualizedReturn = Math.pow(
    results.percentiles.p50 / results.summary.initialInvestment, 
    1 / results.summary.years
  ) - 1;
  
  const maxDrawdown = parseFloat(results.statistics.maxDrawdown) / 100;
  
  return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
}

function getRiskLevel(volatility) {
  if (volatility < 0.1) return 'Very Low';
  if (volatility < 0.15) return 'Low';
  if (volatility < 0.2) return 'Moderate';
  if (volatility < 0.25) return 'High';
  return 'Very High';
}

function compareScenarios(scenarioResults) {
  if (!scenarioResults || scenarioResults.length === 0) {
    return { comparison: 'No scenarios to compare' };
  }
  
  const sorted = [...scenarioResults].sort((a, b) => 
    b.outcome.netLoss - a.outcome.netLoss
  );
  
  return {
    scenariosRanked: sorted.map((s, idx) => ({
      rank: idx + 1,
      name: s.scenario.name,
      severity: s.scenario.severity,
      netLoss: s.outcome.netLoss,
      lossPercent: s.outcome.netLossPercent + '%',
      recoveryTime: s.outcome.recoveryTime
    })),
    averageLoss: (
      sorted.reduce((sum, s) => sum + s.outcome.netLoss, 0) / sorted.length
    ).toFixed(0),
    averageRecoveryTime: calculateAverageRecovery(sorted)
  };
}

function getWorstScenario(scenarioResults) {
  if (!scenarioResults || scenarioResults.length === 0) return null;
  return scenarioResults.reduce((worst, current) => 
    current.outcome.netLoss > worst.outcome.netLoss ? current : worst
  );
}

function calculateAverageRecovery(scenarios) {
  const recoveryTimes = scenarios.map(s => {
    const match = s.outcome.recoveryTime.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  });
  const avg = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
  return `${avg.toFixed(1)} years`;
}

function calculateConfidence(results) {
  const { stdDev, mean } = results.statistics;
  const cv = mean > 0 ? stdDev / mean : 1;
  
  if (cv < 0.2) return 'High';
  if (cv < 0.4) return 'Moderate';
  return 'Low';
}

function generateRecommendations(monteCarloResults, scenarioResults) {
  const recommendations = [];
  
  const lossProb = parseFloat(monteCarloResults.lossProbability);
  
  if (lossProb > 40) {
    recommendations.push({
      priority: 'high',
      category: 'risk_reduction',
      suggestion: 'Consider reducing high-risk asset allocation by 10-15%'
    });
  }
  
  if (lossProb < 20) {
    recommendations.push({
      priority: 'medium',
      category: 'optimization',
      suggestion: 'Your current allocation shows good risk-adjusted returns. Consider tax-loss harvesting.'
    });
  }
  
  const worstScenario = getWorstScenario(scenarioResults);
  if (worstScenario && worstScenario.outcome.netLossPercent > 25) {
    recommendations.push({
      priority: 'high',
      category: 'stress_test',
      suggestion: `Your portfolio may lose ${worstScenario.outcome.netLossPercent}% in ${worstScenario.scenario.name}. Consider diversifying.`
    });
  }
  
  const sharpe = parseFloat(monteCarloResults.statistics.sharpeRatio);
  if (sharpe < 0.5) {
    recommendations.push({
      priority: 'medium',
      category: 'optimization',
      suggestion: 'Sharpe ratio below 0.5 suggests poor risk-adjusted returns. Review asset allocation.'
    });
  } else if (sharpe > 1) {
    recommendations.push({
      priority: 'low',
      category: 'validation',
      suggestion: 'Strong Sharpe ratio indicates well-balanced risk-reward profile.'
    });
  }
  
  recommendations.push({
    priority: 'general',
    category: 'monitoring',
    suggestion: 'Review and rebalance portfolio at least annually based on your risk tolerance.'
  });
  
  return recommendations;
}

module.exports = {
  analyzeOutcomes,
  calculateProbabilities,
  calculateRiskAdjustedReturns,
  compareScenarios,
  generateRecommendations
};
