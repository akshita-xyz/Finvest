const RISK_TOLERANCE_LEVELS = {
  very_conservative: {
    stocks: 20,
    bonds: 60,
    cash: 20,
    description: 'Maximum capital preservation'
  },
  conservative: {
    stocks: 35,
    bonds: 50,
    cash: 15,
    description: 'Low risk with modest growth'
  },
  moderate: {
    stocks: 50,
    bonds: 40,
    cash: 10,
    description: 'Balanced growth and stability'
  },
  aggressive: {
    stocks: 70,
    bonds: 25,
    cash: 5,
    description: 'Growth focused with higher risk'
  },
  very_aggressive: {
    stocks: 85,
    bonds: 10,
    cash: 5,
    description: 'Maximum growth potential'
  }
};

const ASSET_CLASSES = {
  stocks: {
    domestic_large: { weight: 0.4, expectedReturn: 0.10, volatility: 0.16 },
    domestic_small: { weight: 0.2, expectedReturn: 0.12, volatility: 0.22 },
    international_developed: { weight: 0.25, expectedReturn: 0.08, volatility: 0.18 },
    emerging_markets: { weight: 0.15, expectedReturn: 0.11, volatility: 0.25 }
  },
  bonds: {
    government_short: { weight: 0.3, expectedReturn: 0.03, volatility: 0.03 },
    government_long: { weight: 0.25, expectedReturn: 0.04, volatility: 0.08 },
    corporate_investment: { weight: 0.30, expectedReturn: 0.05, volatility: 0.06 },
    corporate_high_yield: { weight: 0.15, expectedReturn: 0.07, volatility: 0.12 }
  },
  alternatives: {
    real_estate: { weight: 0.4, expectedReturn: 0.08, volatility: 0.15 },
    commodities: { weight: 0.3, expectedReturn: 0.06, volatility: 0.20 },
    hedge_funds: { weight: 0.3, expectedReturn: 0.07, volatility: 0.12 }
  }
};

const SECTOR_ALLOCATION = {
  technology: 0.20,
  healthcare: 0.15,
  financials: 0.12,
  consumer_discretionary: 0.10,
  industrials: 0.10,
  energy: 0.08,
  consumer_staples: 0.08,
  utilities: 0.05,
  materials: 0.05,
  real_estate: 0.05,
  communication: 0.02
};

function getRiskTolerance(fearScore) {
  if (fearScore < 20) return 'very_aggressive';
  if (fearScore < 35) return 'aggressive';
  if (fearScore < 55) return 'moderate';
  if (fearScore < 75) return 'conservative';
  return 'very_conservative';
}

function generateAllocationRules(fearScore, goals, constraints) {
  const riskTolerance = getRiskTolerance(fearScore);
  const baseAllocation = RISK_TOLERANCE_LEVELS[riskTolerance];
  
  const adjustedAllocation = adjustForGoals(baseAllocation, goals);
  const finalAllocation = applyConstraints(adjustedAllocation, constraints);
  
  return {
    riskTolerance,
    ...finalAllocation,
    rules: generateRules(riskTolerance, goals)
  };
}

function adjustForGoals(baseAllocation, goals) {
  const adjusted = { ...baseAllocation };
  
  if (!goals) return adjusted;
  
  if (goals.horizon === 'short') {
    adjusted.stocks = Math.max(10, adjusted.stocks - 20);
    adjusted.bonds = Math.min(80, adjusted.bonds + 15);
    adjusted.cash = Math.min(30, adjusted.cash + 5);
  } else if (goals.horizon === 'medium') {
    adjusted.stocks = Math.max(30, adjusted.stocks - 10);
    adjusted.bonds = adjusted.bonds + 5;
    adjusted.cash = adjusted.cash + 5;
  } else if (goals.horizon === 'long') {
    adjusted.stocks = Math.min(90, adjusted.stocks + 10);
    adjusted.bonds = Math.max(10, adjusted.bonds - 5);
    adjusted.cash = Math.max(0, adjusted.cash - 5);
  }
  
  if (goals.purpose === 'retirement') {
    adjusted.stocks = Math.min(95, adjusted.stocks + 5);
  } else if (goals.purpose === 'education') {
    adjusted.stocks = Math.max(30, adjusted.stocks - 10);
    adjusted.cash = Math.min(25, adjusted.cash + 10);
  }
  
  const total = adjusted.stocks + adjusted.bonds + adjusted.cash;
  if (total !== 100) {
    const factor = 100 / total;
    adjusted.stocks = Math.round(adjusted.stocks * factor);
    adjusted.bonds = Math.round(adjusted.bonds * factor);
    adjusted.cash = Math.round(adjusted.cash * factor);
  }
  
  return adjusted;
}

function applyConstraints(allocation, constraints) {
  const adjusted = { ...allocation };
  
  if (constraints?.liquidity === 'high') {
    adjusted.cash = Math.min(50, adjusted.cash + 20);
    adjusted.stocks = Math.max(20, adjusted.stocks - 15);
    adjusted.bonds = Math.max(10, adjusted.bonds - 5);
  }
  
  if (constraints?.tax_efficiency) {
    const temp = adjusted.stocks;
    adjusted.stocks = adjusted.bonds;
    adjusted.bonds = temp;
  }
  
  const total = adjusted.stocks + adjusted.bonds + adjusted.cash;
  if (total !== 100) {
    const factor = 100 / total;
    adjusted.stocks = Math.round(adjusted.stocks * factor);
    adjusted.bonds = Math.round(adjusted.bonds * factor);
    adjusted.cash = 100 - adjusted.stocks - adjusted.bonds;
  }
  
  return adjusted;
}

function generateRules(riskTolerance, goals) {
  const rules = [];
  
  rules.push({
    category: 'rebalancing',
    rule: getRebalancingRule(riskTolerance),
    frequency: getRebalancingFrequency(riskTolerance)
  });
  
  rules.push({
    category: 'diversification',
    rule: 'Maintain minimum 15% international exposure',
    min_concentration: 5,
    max_concentration: 25
  });
  
  if (goals?.horizon === 'long') {
    rules.push({
      category: 'time_horizon',
      rule: 'Focus on growth stocks, accept short-term volatility',
      min_horizon_years: 10
    });
  }
  
  rules.push({
    category: 'risk_management',
    rule: 'Set stop-loss orders at 10% for individual stocks',
    max_drawdown_tolerance: riskTolerance === 'very_conservative' ? 5 : 15
  });
  
  return rules;
}

function getRebalancingRule(riskTolerance) {
  const rules = {
    very_conservative: 'Defensive rebalancing: shift to bonds when stocks exceed target by 5%',
    conservative: 'Conservative rebalancing: shift when stocks exceed target by 10%',
    moderate: 'Standard rebalancing: shift when any asset class exceeds target by 15%',
    aggressive: 'Growth rebalancing: shift when stocks exceed target by 20%',
    very_aggressive: 'Minimal rebalancing: shift only when stocks exceed target by 25%'
  };
  return rules[riskTolerance];
}

function getRebalancingFrequency(riskTolerance) {
  const frequencies = {
    very_conservative: 'quarterly',
    conservative: 'semi-annually',
    moderate: 'annually',
    aggressive: 'annually',
    very_aggressive: 'bi-annually'
  };
  return frequencies[riskTolerance];
}

module.exports = {
  RISK_TOLERANCE_LEVELS,
  ASSET_CLASSES,
  SECTOR_ALLOCATION,
  getRiskTolerance,
  generateAllocationRules,
  adjustForGoals,
  applyConstraints,
  generateRules
};
