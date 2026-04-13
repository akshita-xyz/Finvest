/**
 * In-browser ML/simulation — parity with BACKEND routes:
 * POST /api/analyze-user, POST /api/monte-carlo, POST /api/scenario-test, GET /api/scenarios.
 *
 * Uses CommonJS modules from repo `ML/` via Vite alias `@ml`.
 */

import fearScore from '@ml/BehaviorAnalysis/fearScore.js';
import userClassification from '@ml/BehaviorAnalysis/userClassification.js';
import portfolioGenerator from '@ml/PortfolioLogic/portfolioGenerator.js';
import monteCarlo from '@ml/SimulationEngine/monteCarlo.js';
import scenarioSimulator from '@ml/SimulationEngine/scenarioSimulator.js';

/**
 * @param {{ answers?: object, hesitationTimes?: number[], demographics?: object }} body
 */
export function analyzeUserPayload(body) {
  const { answers, hesitationTimes, demographics } = body || {};
  const score = fearScore.calculateFearScore({ answers, hesitationTimes, demographics });
  const classification = userClassification.classifyUser(score, answers);
  const portfolio = portfolioGenerator.generatePortfolio(score, classification, demographics);
  return {
    fearScore: score,
    classification,
    portfolio,
    insights: {
      riskProfile: classification.category,
      recommendedStrategy: classification.strategy,
      allocation: portfolio.allocation,
    },
  };
}

/**
 * @param {object} portfolio - object returned from `generatePortfolio` / analyze payload
 * @param {{ years?: number, simulations?: number }} [options]
 */
export function runMonteCarloPayload(portfolio, options = {}) {
  const { years = 30, simulations = 1000 } = options;
  return monteCarlo.runSimulation(portfolio, { years, simulations });
}

/**
 * @param {object} portfolio
 * @param {string} scenario - scenario id (see listAvailableScenarios)
 */
export function runScenarioTestPayload(portfolio, scenario) {
  return scenarioSimulator.runScenario(portfolio, scenario);
}

/** @returns {{ id: string, name: string, description: string, severity: string, probability: number }[]} */
export function listAvailableScenarios() {
  return scenarioSimulator.getAvailableScenarios();
}
