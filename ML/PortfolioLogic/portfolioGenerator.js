const allocationRules = require('./allocationRules');

function generatePortfolio(fearScore, classification, demographics = {}) {
  const allocation = determineAllocation(fearScore, demographics);
  const expectedReturns = calculateExpectedReturns(allocation);
  const volatility = calculateVolatility(allocation);
  const rebalancing = determineRebalancing(allocation);
  const riskMetrics = calculateRiskMetrics(allocation, expectedReturns, volatility);
  
  return {
    fearScore,
    classification: classification.category,
    allocation,
    expectedReturns,
    volatility,
    rebalancing,
    riskMetrics,
    projections: generateProjections(allocation, expectedReturns),
    recommendations: generateRecommendations(fearScore, classification)
  };
}

function determineAllocation(fearScore, demographics) {
  const baseAllocation = fearScoreToAllocation(fearScore);
  
  if (demographics.age) {
    const ageAdjustment = getAgeAdjustment(demographics.age);
    return adjustForAge(baseAllocation, ageAdjustment);
  }
  
  return baseAllocation;
}

function fearScoreToAllocation(score) {
  if (score < 25) {
    return {
      stocks_aggressive: 70,
      stocks_growth: 10,
      bonds_intermediate: 10,
      bonds_long: 5,
      cash: 5
    };
  } else if (score < 40) {
    return {
      stocks_aggressive: 50,
      stocks_growth: 15,
      bonds_intermediate: 20,
      bonds_long: 10,
      cash: 5
    };
  } else if (score < 55) {
    return {
      stocks_aggressive: 35,
      stocks_growth: 10,
      bonds_intermediate: 30,
      bonds_long: 15,
      cash: 10
    };
  } else if (score < 70) {
    return {
      stocks_aggressive: 20,
      stocks_growth: 10,
      bonds_intermediate: 35,
      bonds_long: 20,
      cash: 15
    };
  } else {
    return {
      stocks_aggressive: 10,
      stocks_growth: 5,
      bonds_intermediate: 40,
      bonds_long: 30,
      cash: 15
    };
  }
}

function getAgeAdjustment(age) {
  if (age < 25) return 0.2;
  if (age < 35) return 0.1;
  if (age < 45) return 0;
  if (age < 55) return -0.1;
  return -0.2;
}

function adjustForAge(allocation, adjustment) {
  const adjusted = { ...allocation };
  
  adjusted.stocks_aggressive = Math.max(0, Math.min(100, 
    adjusted.stocks_aggressive + adjustment * 30
  ));
  adjusted.stocks_growth = Math.max(0, Math.min(100,
    adjusted.stocks_growth + adjustment * 10
  ));
  adjusted.bonds_intermediate = Math.max(0, Math.min(100,
    adjusted.bonds_intermediate - adjustment * 20
  ));
  adjusted.bonds_long = Math.max(0, Math.min(100,
    adjusted.bonds_long - adjustment * 15
  ));
  adjusted.cash = Math.max(0, Math.min(100,
    adjusted.cash - adjustment * 5
  ));
  
  const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    const factor = 100 / total;
    for (const key in adjusted) {
      adjusted[key] = Math.round(adjusted[key] * factor);
    }
  }
  
  return adjusted;
}

function calculateExpectedReturns(allocation) {
  const assetReturns = {
    stocks_aggressive: 0.12,
    stocks_growth: 0.10,
    bonds_intermediate: 0.04,
    bonds_long: 0.05,
    cash: 0.02
  };
  
  const portfolioReturn = Object.entries(allocation).reduce((sum, [asset, weight]) => {
    return sum + (assetReturns[asset] || 0) * (weight / 100);
  }, 0);
  
  return {
    ...Object.fromEntries(
      Object.entries(assetReturns).map(([k, v]) => [k, (v * 100).toFixed(1) + '%'])
    ),
    portfolio: (portfolioReturn * 100).toFixed(1) + '%'
  };
}

function calculateVolatility(allocation) {
  const assetVolatility = {
    stocks_aggressive: 0.20,
    stocks_growth: 0.18,
    bonds_intermediate: 0.06,
    bonds_long: 0.10,
    cash: 0.01
  };
  
  const portfolioVol = Object.entries(allocation).reduce((sum, [asset, weight]) => {
    return sum + Math.pow((assetVolatility[asset] || 0) * (weight / 100), 2);
  }, 0);
  
  return {
    ...Object.fromEntries(
      Object.entries(assetVolatility).map(([k, v]) => [k, (v * 100).toFixed(1) + '%'])
    ),
    portfolio: (Math.sqrt(portfolioVol) * 100).toFixed(1) + '%'
  };
}

function determineRebalancing(allocation) {
  const highRisk = (allocation.stocks_aggressive + allocation.stocks_growth) / 100;
  
  if (highRisk > 0.7) return 'quarterly';
  if (highRisk > 0.4) return 'semi-annually';
  return 'annually';
}

function calculateRiskMetrics(allocation, expectedReturns, volatility) {
  const portfolioReturn = parseFloat(expectedReturns.portfolio);
  const portfolioVol = parseFloat(volatility.portfolio);
  
  const sharpeRatio = (portfolioReturn - 2) / portfolioVol;
  const maxDrawdown = portfolioVol * 2;
  const var95 = portfolioVol * 1.65;
  
  return {
    sharpeRatio: sharpeRatio.toFixed(2),
    expectedReturn: `${portfolioReturn.toFixed(1)}%`,
    volatility: `${portfolioVol.toFixed(1)}%`,
    maxDrawdown: `${(maxDrawdown * 100).toFixed(1)}%`,
    valueAtRisk95: `${(var95 * 100).toFixed(1)}%`,
    riskLevel: portfolioVol > 15 ? 'High' : portfolioVol > 8 ? 'Moderate' : 'Low'
  };
}

function generateProjections(allocation, expectedReturns) {
  const initialInvestment = 10000;
  const years = [5, 10, 15, 20, 30];
  
  return years.map(year => {
    const returnRate = parseFloat(expectedReturns.portfolio) / 100;
    const futureValue = initialInvestment * Math.pow(1 + returnRate, year);
    const inflationAdjusted = futureValue / Math.pow(1.03, year);
    
    return {
      years: year,
      projectedValue: Math.round(futureValue),
      inflationAdjusted: Math.round(inflationAdjusted),
      growth: ((futureValue / initialInvestment - 1) * 100).toFixed(0) + '%'
    };
  });
}

function generateRecommendations(fearScore, classification) {
  const recommendations = [];
  
  if (fearScore < 40) {
    recommendations.push({
      type: 'opportunity',
      message: 'Your risk tolerance suggests you could benefit from higher equity exposure. Consider increasing your stock allocation by 10-15%.'
    });
    recommendations.push({
      type: 'warning',
      message: 'Avoid concentrating too heavily in a single sector or asset class.'
    });
  } else if (fearScore > 70) {
    recommendations.push({
      type: 'opportunity',
      message: 'Your conservative approach is excellent for capital preservation. Focus on dividend-paying stocks for growth with stability.'
    });
    recommendations.push({
      type: 'tip',
      message: 'Consider laddering CDs or bonds for predictable income streams.'
    });
  } else {
    recommendations.push({
      type: 'tip',
      message: 'A balanced approach works well. Ensure you review and rebalance annually.'
    });
    recommendations.push({
      type: 'opportunity',
      message: 'Maximize tax-advantaged accounts like 401(k) and IRA before taxable accounts.'
    });
  }
  
  recommendations.push({
    type: 'general',
    message: `Historical data shows markets recover from downturns within 1-2 years on average.`
  });
  
  return recommendations;
}

module.exports = {
  generatePortfolio,
  determineAllocation,
  fearScoreToAllocation,
  calculateExpectedReturns,
  calculateVolatility
};
