const mathHelpers = require('../utils/mathHelpers');

function runSimulation(portfolio, options = {}) {
  const {
    years = 30,
    simulations = 1000,
    initialInvestment = 10000,
    inflationRate = 0.03,
    taxRate = 0.15
  } = options;
  
  const { allocation, expectedReturns, volatility } = portfolio;
  
  const yearlyReturns = simulatePaths(allocation, expectedReturns, volatility, years, simulations);
  
  const finalValues = yearlyReturns.map(path => path[path.length - 1]);
  finalValues.sort((a, b) => a - b);
  
  const percentiles = calculatePercentiles(finalValues, [5, 10, 25, 50, 75, 90, 95]);
  const statistics = calculateStatistics(finalValues, initialInvestment, inflationRate);
  
  const yearlyPaths = calculateYearlyStatistics(yearlyReturns, initialInvestment);
  
  return {
    summary: {
      simulations,
      years,
      initialInvestment
    },
    percentiles,
    statistics,
    yearlyPaths,
    lossProbability: (finalValues.filter(v => v < initialInvestment).length / finalValues.length * 100).toFixed(1),
    profitProbability: (100 - (finalValues.filter(v => v < initialInvestment).length / finalValues.length * 100)).toFixed(1)
  };
}

function simulatePaths(allocation, expectedReturns, volatility, years, simulations) {
  const paths = [];
  
  for (let sim = 0; sim < simulations; sim++) {
    const path = [10000];
    
    for (let year = 1; year <= years; year++) {
      let yearReturn = 0;
      
      for (const [asset, weight] of Object.entries(allocation)) {
        const assetReturn = simulateAssetReturn(
          expectedReturns[asset] || 0.07,
          volatility[asset] || 0.15,
          year
        );
        yearReturn += assetReturn * (weight / 100);
      }
      
      const inflationFactor = Math.pow(1.03, year);
      const realReturn = yearReturn - 0.03;
      const newValue = path[year - 1] * (1 + realReturn);
      path.push(newValue);
    }
    
    paths.push(path);
  }
  
  return paths;
}

function simulateAssetReturn(expectedReturn, volatility, year) {
  const random1 = gaussianRandom();
  const random2 = gaussianRandom();
  const z = random1;
  
  const drift = expectedReturn - (volatility * volatility) / 2;
  const diffusion = volatility * z;
  
  return Math.exp(drift + diffusion);
}

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function calculatePercentiles(sortedValues, percentiles) {
  const result = {};
  
  for (const p of percentiles) {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    result[`p${p}`] = Math.round(sortedValues[Math.max(0, index)]);
  }
  
  return result;
}

function calculateStatistics(finalValues, initialInvestment, inflationRate) {
  const realReturns = finalValues.map(v => (v / initialInvestment) - 1);
  
  return {
    mean: Math.round(mathHelpers.mean(finalValues)),
    median: Math.round(mathHelpers.median(finalValues)),
    stdDev: Math.round(mathHelpers.stdDev(finalValues)),
    min: Math.round(Math.min(...finalValues)),
    max: Math.round(Math.max(...finalValues)),
    sharpeRatio: calculateSharpeRatio(finalValues, inflationRate),
    maxDrawdown: calculateMaxDrawdown(finalValues)
  };
}

function calculateSharpeRatio(returns, riskFreeRate) {
  const mean = mathHelpers.mean(returns);
  const std = mathHelpers.stdDev(returns);
  return std > 0 ? ((mean - riskFreeRate) / std).toFixed(2) : 0;
}

function calculateMaxDrawdown(values) {
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (const value of values) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  return (maxDrawdown * 100).toFixed(1);
}

function calculateYearlyStatistics(yearlyReturns, initialInvestment) {
  const years = yearlyReturns[0].length - 1;
  const yearlyStats = [];
  
  for (let year = 1; year <= years; year++) {
    const yearValues = yearlyReturns.map(path => path[year]);
    yearValues.sort((a, b) => a - b);
    
    yearlyStats.push({
      year,
      p10: Math.round(yearValues[Math.floor(yearValues.length * 0.1)]),
      p50: Math.round(yearValues[Math.floor(yearValues.length * 0.5)]),
      p90: Math.round(yearValues[Math.floor(yearValues.length * 0.9)]),
      inflationAdjusted: Math.round(yearValues[Math.floor(yearValues.length * 0.5)] / Math.pow(1.03, year))
    });
  }
  
  return yearlyStats;
}

function generateScenarios(portfolio, baseScenario) {
  const scenarios = {
    base: runSimulation(portfolio, { ...baseScenario, years: baseScenario.years || 30 }),
    optimistic: runSimulation(portfolio, { 
      ...baseScenario, 
      years: baseScenario.years || 30,
      expectedReturns: multiplyReturns(portfolio.expectedReturns, 1.3)
    }),
    pessimistic: runSimulation(portfolio, { 
      ...baseScenario, 
      years: baseScenario.years || 30,
      expectedReturns: multiplyReturns(portfolio.expectedReturns, 0.7)
    }),
    marketCrash: runSimulation(portfolio, {
      ...baseScenario,
      years: baseScenario.years || 30,
      volatility: multiplyVolatility(portfolio.volatility, 2)
    })
  };
  
  return scenarios;
}

function multiplyReturns(returns, factor) {
  const multiplied = {};
  for (const [key, value] of Object.entries(returns)) {
    multiplied[key] = value * factor;
  }
  return multiplied;
}

function multiplyVolatility(vol, factor) {
  const multiplied = {};
  for (const [key, value] of Object.entries(vol)) {
    multiplied[key] = value * factor;
  }
  return multiplied;
}

module.exports = {
  runSimulation,
  generateScenarios,
  simulateAssetReturn,
  gaussianRandom
};
