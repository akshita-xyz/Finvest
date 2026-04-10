const AVAILABLE_SCENARIOS = {
  market_crash_2008: {
    id: 'market_crash_2008',
    name: '2008 Financial Crisis',
    description: 'Simulates the 2008-2009 global financial crisis impact',
    severity: 'extreme',
    marketDecline: 56,
    recoveryTime: 4,
    duration: 2,
    probability: 8
  },
  dot_com_bubble: {
    id: 'dot_com_bubble',
    name: 'Dot-Com Bubble Burst (2000)',
    description: 'Technology sector collapse similar to 2000-2002',
    severity: 'severe',
    marketDecline: 49,
    recoveryTime: 7,
    duration: 3,
    probability: 10
  },
  covid_crash_2020: {
    id: 'covid_crash_2020',
    name: 'COVID-19 Crash (2020)',
    description: 'Pandemic-induced market crash and rapid recovery',
    severity: 'moderate',
    marketDecline: 34,
    recoveryTime: 0.5,
    duration: 1,
    probability: 15
  },
  inflation_spike: {
    id: 'inflation_spike',
    name: 'Stagflation (1970s)',
    description: 'High inflation with stagnant economic growth',
    severity: 'severe',
    marketDecline: 30,
    recoveryTime: 5,
    duration: 5,
    probability: 12
  },
  interest_rate_hike: {
    id: 'interest_rate_hike',
    name: 'Rapid Rate Increases',
    description: 'Aggressive central bank rate hikes causing market stress',
    severity: 'moderate',
    marketDecline: 25,
    recoveryTime: 2,
    duration: 2,
    probability: 18
  },
  recession: {
    id: 'recession',
    name: 'Mild Recession',
    description: 'Standard economic recession with moderate market impact',
    severity: 'mild',
    marketDecline: 20,
    recoveryTime: 1,
    duration: 1,
    probability: 25
  },
  geopolitical_crisis: {
    id: 'geopolitical_crisis',
    name: 'Major Geopolitical Event',
    description: 'War or significant geopolitical instability',
    severity: 'moderate',
    marketDecline: 22,
    recoveryTime: 1.5,
    duration: 1,
    probability: 15
  },
  tech_sector_crash: {
    id: 'tech_sector_crash',
    name: 'Tech Sector Correction',
    description: 'Technology-focused market correction',
    severity: 'moderate',
    marketDecline: 35,
    recoveryTime: 2,
    duration: 1,
    probability: 20
  },
  black_monday: {
    id: 'black_monday',
    name: 'Flash Crash (-30% in days)',
    description: 'Rapid market decline similar to 1987',
    severity: 'extreme',
    marketDecline: 33,
    recoveryTime: 1,
    duration: 0.1,
    probability: 5
  },
  slow_bear_market: {
    id: 'slow_bear_market',
    name: 'Prolonged Bear Market',
    description: 'Extended market decline over 2+ years',
    severity: 'severe',
    marketDecline: 50,
    recoveryTime: 6,
    duration: 3,
    probability: 10
  }
};

function runScenario(portfolio, scenarioId) {
  const scenario = AVAILABLE_SCENARIOS[scenarioId] || AVAILABLE_SCENARIOS.recession;
  
  const { allocation } = portfolio;
  const stockAllocation = allocation.stocks_aggressive + allocation.stocks_growth;
  const bondAllocation = allocation.bonds_intermediate + allocation.bonds_long;
  const cashAllocation = allocation.cash;
  
  const initialValue = 10000;
  
  const maxLoss = initialValue * (stockAllocation / 100) * (scenario.marketDecline / 100);
  const bondProtection = initialValue * (bondAllocation / 100) * 0.05;
  const netLoss = maxLoss - (bondProtection * (scenario.duration / 2));
  
  const recoveryMonths = scenario.recoveryTime * 12;
  const recoveryGain = netLoss * (recoveryMonths / 12) * 0.12;
  
  const finalValue = initialValue - netLoss + recoveryGain;
  
  const monthlyDrawdown = [];
  let currentValue = initialValue;
  
  const declineMonths = Math.ceil(scenario.duration * 12);
  const declinePerMonth = scenario.marketDecline / declineMonths;
  
  for (let m = 0; m < declineMonths; m++) {
    const stockLoss = currentValue * (stockAllocation / 100) * (declinePerMonth / 100);
    const bondGain = currentValue * (bondAllocation / 100) * 0.004;
    currentValue = currentValue - stockLoss + bondGain;
    monthlyDrawdown.push({
      month: m + 1,
      value: Math.round(currentValue),
      drawdown: ((1 - currentValue / initialValue) * 100).toFixed(1)
    });
  }
  
  const recoveryMonthsTotal = Math.ceil(recoveryMonths);
  const recoveryPerMonth = (finalValue - currentValue) / recoveryMonthsTotal;
  
  for (let m = 0; m < recoveryMonthsTotal; m++) {
    currentValue += recoveryPerMonth;
    monthlyDrawdown.push({
      month: declineMonths + m + 1,
      value: Math.round(currentValue),
      drawdown: ((1 - currentValue / initialValue) * 100).toFixed(1)
    });
  }
  
  return {
    scenario: {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      severity: scenario.severity
    },
    portfolio: {
      initialValue,
      finalValue: Math.round(finalValue),
      netLoss: Math.round(netLoss),
      netLossPercent: ((netLoss / initialValue) * 100).toFixed(1),
      recoveryTime: `${scenario.recoveryTime} years`
    },
    allocation: {
      stockExposure: stockAllocation,
      bondProtection: bondAllocation,
      cashBuffer: cashAllocation
    },
    recoveryProjection: {
      breakeven: Math.ceil(declineMonths / 12 * 10) / 10,
      fullRecovery: Math.ceil((declineMonths + recoveryMonthsTotal) / 12 * 10) / 10,
      valueAfterRecovery: Math.round(finalValue)
    },
    monthlyDrawdown,
    advice: generateAdvice(scenario, portfolio, netLoss, initialValue)
  };
}

function generateAdvice(scenario, portfolio, netLoss, initialValue) {
  const advice = [];
  const lossPercent = (netLoss / initialValue) * 100;
  const fearScore = portfolio.fearScore;
  
  if (lossPercent > 30) {
    advice.push({
      type: 'warning',
      message: 'This scenario would cause significant losses. Consider increasing your bond allocation.'
    });
  }
  
  if (scenario.severity === 'extreme') {
    advice.push({
      type: 'reassurance',
      message: `Historical data shows markets recovered from ${scenario.name} within ${scenario.recoveryTime} years.`
    });
    advice.push({
      type: 'strategy',
      message: 'During extreme crashes, continue investing systematically if possible - this often leads to better outcomes.'
    });
  }
  
  if (fearScore > 60) {
    advice.push({
      type: 'personalized',
      message: 'Based on your risk profile, this scenario aligns with your comfort zone for volatility.'
    });
  } else {
    advice.push({
      type: 'caution',
      message: 'This scenario may be more volatile than your risk tolerance. Review your allocation.'
    });
  }
  
  advice.push({
    type: 'general',
    message: 'Past performance does not guarantee future results, but markets have historically recovered from all major crashes.'
  });
  
  return advice;
}

function getAvailableScenarios() {
  return Object.values(AVAILABLE_SCENARIOS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    severity: s.severity,
    probability: s.probability
  }));
}

function runStressTest(portfolio, stressLevel = 'moderate') {
  const scenarios = Object.values(AVAILABLE_SCENARIOS)
    .filter(s => {
      if (stressLevel === 'extreme') return s.severity === 'extreme';
      if (stressLevel === 'severe') return s.severity === 'extreme' || s.severity === 'severe';
      if (stressLevel === 'moderate') return ['extreme', 'severe', 'moderate'].includes(s.severity);
      return true;
    });
  
  const results = scenarios.map(s => ({
    scenario: { id: s.id, name: s.name, severity: s.severity },
    outcome: runScenario(portfolio, s.id)
  }));
  
  const worstCase = results.reduce((worst, r) => 
    r.outcome.netLoss > worst.outcome.netLoss ? r : worst
  );
  
  const averageLoss = results.reduce((sum, r) => sum + r.outcome.netLoss, 0) / results.length;
  
  return {
    summary: {
      scenariosTested: results.length,
      stressLevel,
      averageLoss: Math.round(averageLoss),
      worstCase: worstCase.scenario
    },
    results,
    recommendations: generateStressRecommendations(worstCase, portfolio)
  };
}

function generateStressRecommendations(worstCase, portfolio) {
  const recommendations = [];
  
  if (worstCase.outcome.netLossPercent > 30) {
    recommendations.push('Consider reducing equity exposure by 10-15%');
    recommendations.push('Increase bond allocation for stability');
    recommendations.push('Build cash reserves for buying opportunities');
  }
  
  recommendations.push('Review your emergency fund before market downturns');
  recommendations.push('Consider dollar-cost averaging instead of lump sum');
  
  return recommendations;
}

module.exports = {
  AVAILABLE_SCENARIOS,
  runScenario,
  getAvailableScenarios,
  runStressTest
};
