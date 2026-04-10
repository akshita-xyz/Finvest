const fearScore = require('./BehaviorAnalysis/fearScore');
const userClassification = require('./BehaviorAnalysis/userClassification');
const behaviorFeatures = require('./BehaviorAnalysis/behaviorFeatures');
const kmeans = require('./Clustering/kmeans');
const portfolioGenerator = require('./PortfolioLogic/portfolioGenerator');
const allocationRules = require('./PortfolioLogic/allocationRules');
const monteCarlo = require('./SimulationEngine/monteCarlo');
const scenarioSimulator = require('./SimulationEngine/scenarioSimulator');
const outcomeAnalysis = require('./SimulationEngine/outcomeAnalysis');
const mathHelpers = require('./utils/mathHelpers');

function analyzeUser(userData) {
  const { answers, hesitationTimes, demographics } = userData;
  
  const score = fearScore.calculateFearScore({ answers, hesitationTimes, demographics });
  const fearLevel = fearScore.getFearLevel(score);
  const classification = userClassification.classifyUser(score, answers);
  const features = behaviorFeatures.extractBehaviorFeatures(userData);
  const portfolio = portfolioGenerator.generatePortfolio(score, classification, demographics);
  
  return {
    fearScore: score,
    fearLevel,
    classification,
    behaviorFeatures: features,
    portfolio,
    insights: generateInsights(score, classification, portfolio)
  };
}

function generateInsights(fearScore, classification, portfolio) {
  const insights = [];
  
  insights.push({
    type: 'personality',
    title: 'Your Risk Profile',
    description: classification.description,
    icon: 'user'
  });
  
  insights.push({
    type: 'allocation',
    title: 'Suggested Asset Mix',
    description: `Stocks: ${portfolio.allocation.stocks_aggressive + portfolio.allocation.stocks_growth}%, Bonds: ${portfolio.allocation.bonds_intermediate + portfolio.allocation.bonds_long}%, Cash: ${portfolio.allocation.cash}%`,
    icon: 'pie-chart'
  });
  
  insights.push({
    type: 'strategy',
    title: 'Recommended Approach',
    description: classification.strategy,
    icon: 'target'
  });
  
  if (fearScore > 60) {
    insights.push({
      type: 'warning',
      title: 'Consider This',
      description: 'Your current risk aversion may lead to missed growth opportunities. Consider gradually increasing your risk exposure.',
      icon: 'alert'
    });
  } else if (fearScore < 30) {
    insights.push({
      type: 'caution',
      title: 'Stay Grounded',
      description: 'Your high risk tolerance is valuable, but remember to diversify and avoid overconfidence.',
      icon: 'shield'
    });
  }
  
  return insights;
}

async function runFullAnalysis(userData) {
  const basicAnalysis = analyzeUser(userData);
  
  const monteCarloResults = monteCarlo.runSimulation(basicAnalysis.portfolio, {
    years: 30,
    simulations: 1000
  });
  
  const scenarios = ['recession', 'market_crash_2008', 'covid_crash_2020', 'interest_rate_hike'];
  const scenarioResults = scenarios.map(scenarioId => 
    scenarioSimulator.runScenario(basicAnalysis.portfolio, scenarioId)
  );
  
  const outcomes = outcomeAnalysis.analyzeOutcomes(monteCarloResults, scenarioResults);
  
  return {
    ...basicAnalysis,
    monteCarlo: monteCarloResults,
    scenarios: scenarioResults,
    outcomes,
    recommendations: [
      ...basicAnalysis.portfolio.recommendations,
      ...outcomes.recommendations
    ]
  };
}

function clusterUsers(userVectors) {
  const { clusters, centroids } = kmeans.kmeans(userVectors, 4);
  
  const clusterLabels = ['Risk-Averse', 'Balanced', 'Growth-Seeker', 'Overconfident'];
  
  return clusters.map(clusterId => ({
    clusterId,
    label: clusterLabels[clusterId] || 'Unknown',
    centroid: centroids[clusterId]
  }));
}

module.exports = {
  fearScore,
  userClassification,
  behaviorFeatures,
  kmeans,
  portfolioGenerator,
  allocationRules,
  monteCarlo,
  scenarioSimulator,
  outcomeAnalysis,
  mathHelpers,
  analyzeUser,
  runFullAnalysis,
  clusterUsers
};
