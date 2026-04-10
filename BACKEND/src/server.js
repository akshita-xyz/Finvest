const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'your-anon-key'
);

const fearScore = require('../../ML/BehaviorAnalysis/fearScore');
const userClassification = require('../../ML/BehaviorAnalysis/userClassification');
const portfolioGenerator = require('../../ML/PortfolioLogic/portfolioGenerator');
const monteCarlo = require('../../ML/SimulationEngine/monteCarlo');
const scenarioSimulator = require('../../ML/SimulationEngine/scenarioSimulator');

app.post('/api/analyze-user', async (req, res) => {
  try {
    const { answers, hesitationTimes, demographics } = req.body;
    
    const score = fearScore.calculateFearScore({ answers, hesitationTimes, demographics });
    const classification = userClassification.classifyUser(score, answers);
    const portfolio = portfolioGenerator.generatePortfolio(score, classification, demographics);
    
    res.json({
      fearScore: score,
      classification,
      portfolio,
      insights: {
        riskProfile: classification.category,
        recommendedStrategy: classification.strategy,
        allocation: portfolio.allocation
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/monte-carlo', async (req, res) => {
  try {
    const { portfolio, years = 30, simulations = 1000 } = req.body;
    const results = monteCarlo.runSimulation(portfolio, { years, simulations });
    res.json(results);
  } catch (error) {
    console.error('Monte Carlo error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

app.post('/api/scenario-test', async (req, res) => {
  try {
    const { portfolio, scenario } = req.body;
    const results = scenarioSimulator.runScenario(portfolio, scenario);
    res.json(results);
  } catch (error) {
    console.error('Scenario test error:', error);
    res.status(500).json({ error: 'Scenario test failed' });
  }
});

app.get('/api/scenarios', (req, res) => {
  res.json(scenarioSimulator.getAvailableScenarios());
});

app.post('/api/save-profile', async (req, res) => {
  try {
    const { userId, profile } = req.body;
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Save profile error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`FINVEST API server running on port ${PORT}`);
});

module.exports = app;
