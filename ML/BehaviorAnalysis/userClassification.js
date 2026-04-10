const riskProfiles = {
  risk_averse: {
    category: 'Risk-Averse',
    description: 'You prefer stability and capital preservation over high returns.',
    strategy: 'Conservative',
    characteristics: [
      'Prioritize safety over returns',
      'Prefer guaranteed returns',
      'Dislike market volatility',
      'Focus on long-term stability'
    ],
    recommendations: [
      'High-yield savings accounts',
      'Government bonds',
      'Dividend-paying blue-chip stocks',
      'Index funds with low volatility',
      'Real estate investment trusts (REITs)'
    ],
    warnings: [
      'Avoid high-growth/high-risk investments',
      'Diversify to reduce single-point failures',
      'Keep 6-12 months emergency fund'
    ]
  },
  balanced: {
    category: 'Balanced',
    description: 'You seek a mix of growth and stability.',
    strategy: 'Moderate',
    characteristics: [
      'Comfortable with moderate volatility',
      'Want growth but not at extreme risk',
      'Willing to hold through market downturns',
      'Long-term wealth building focus'
    ],
    recommendations: [
      'Balanced mutual funds',
      '60/40 stock/bond portfolios',
      'S&P 500 index funds',
      'Investment-grade corporate bonds',
      'Growth and income stocks'
    ],
    warnings: [
      'Rebalance portfolio annually',
      'Don\'t panic sell during corrections',
      'Consider dollar-cost averaging'
    ]
  },
  overconfident: {
    category: 'Overconfident',
    description: 'You may underestimate risks and overestimate your knowledge.',
    strategy: 'Aggressive',
    characteristics: [
      'High confidence in market timing',
      'Tendency to concentrate positions',
      'May chase recent winners',
      'Often underdiversified'
    ],
    recommendations: [
      'Diversified index funds',
      'Systematic investment plans',
      'Asset allocation rebalancing',
      'Consider robo-advisor for discipline',
      'Set automatic stop-losses'
    ],
    warnings: [
      'Historical returns don\'t guarantee future results',
      'Concentration increases volatility risk',
      'Consider professional guidance',
      'Most active traders underperform index funds'
    ]
  },
  growth_seeker: {
    category: 'Growth-Seeker',
    description: 'You prioritize long-term capital appreciation.',
    strategy: 'Growth',
    characteristics: [
      'Long investment horizon',
      'Comfortable with market swings',
      'Focus on capital appreciation',
      'Willing to accept short-term losses'
    ],
    recommendations: [
      'Growth stocks and ETFs',
      'Small-cap and mid-cap investments',
      'Emerging markets exposure',
      'Sector-focused funds (tech, healthcare)',
      'Venture capital (for accredited investors)'
    ],
    warnings: [
      'Higher volatility expected',
      'Longer time horizons needed',
      'Diversify across sectors',
      'Rebalance periodically'
    ]
  }
};

function classifyUser(fearScore, answers) {
  let category = 'balanced';
  
  if (fearScore < 30) {
    category = 'overconfident';
  } else if (fearScore < 45) {
    category = 'growth_seeker';
  } else if (fearScore < 65) {
    category = 'balanced';
  } else {
    category = 'risk_averse';
  }
  
  if (answers?.risk === 'Sell immediately') {
    category = 'risk_averse';
  } else if (answers?.risk === 'Buy more') {
    category = 'growth_seeker';
  }
  
  return {
    ...riskProfiles[category],
    fearScore,
    confidence: calculateConfidence(fearScore, answers)
  };
}

function calculateConfidence(fearScore, answers) {
  let confidence = 0.5;
  
  if (fearScore > 50) confidence += 0.1;
  else confidence -= 0.2;
  
  if (answers?.salary === 'Over $200k') confidence += 0.15;
  else if (answers?.salary === 'Under $50k') confidence -= 0.1;
  
  return Math.max(0, Math.min(1, confidence));
}

function getClusterLabel(cluster) {
  const labels = {
    0: 'risk_averse',
    1: 'balanced',
    2: 'growth_seeker',
    3: 'overconfident'
  };
  return labels[cluster] || 'balanced';
}

module.exports = {
  classifyUser,
  getClusterLabel,
  riskProfiles
};
