# FINVEST - Investment Fear Reduction Platform

**Feel the risk, master the outcome.**

An AI/ML-powered platform that reduces investing fear in young users through behavioral analysis, risk simulation, and personalized portfolio recommendations.

## Problem Statement

Young users fear investing due to the fear of loss. FINVEST contextualizes risk and simulates losses before real exposure, reducing fear through education and simulation.

## Core Features

- **Risk Stimulation Sandbox** - Experience market scenarios risk-free
- **AI-Based Portfolio Explainer** - Natural language explanations
- **Loss Probability Meter** - Visual display of potential outcomes
- **Behavioral Fear Score** - 1-100 score based on decision patterns
- **Monte Carlo Simulation** - 1000+ market scenarios
- **Personalized Portfolios** - Asset allocation based on your profile

## Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL + Auth)
- **ML**: JavaScript-based algorithms (K-means, Monte Carlo)

## Quick Start

### Frontend
```bash
cd FRONTEND
npm install
npm run dev
```

### Backend
```bash
cd BACKEND
npm install
# Create .env with SUPABASE_URL and SUPABASE_ANON_KEY
npm start
```

## Project Structure

```
FINVEST/
├── FRONTEND/          # React application
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── components/  # UI components
│   │   └── App.jsx   # Main app
│   └── package.json
├── BACKEND/           # Express API
│   ├── src/
│   │   ├── server.js  # Main server
│   │   ├── supabase/  # DB client
│   │   └── utils/     # Helpers
│   └── package.json
├── ML/                # Machine Learning modules
│   ├── BehaviorAnalysis/  # Fear score, classification
│   ├── Clustering/       # K-means implementation
│   ├── PortfolioLogic/   # Portfolio generation
│   └── SimulationEngine/ # Monte Carlo, scenarios
└── docs/              # Documentation
```

## Key Algorithms

### Fear Score (1-100)
Based on:
- Hesitation time during decisions
- Risk response patterns
- Financial goals
- Income level
- Age demographics

### User Classification
- **Risk-Averse** (Fear Score > 65): Capital preservation focus
- **Balanced** (Fear Score 45-65): Mix of growth and stability
- **Growth-Seeker** (Fear Score 30-45): Long-term appreciation
- **Overconfident** (Fear Score < 30): May underestimate risk

### Portfolio Allocation
Varies by fear score, example for Balanced (Score 45-65):
- Stocks (Aggressive): 35%
- Stocks (Growth): 10%
- Bonds (Intermediate): 30%
- Bonds (Long): 15%
- Cash: 10%

## Demo Flow

1. **Landing Page** → Click "Get Started"
2. **Onboarding** → Answer 3 questions with timing analysis
3. **Fear Score Reveal** → See your 1-100 score
4. **Classification** → Learn your investor profile
5. **Portfolio Preview** → View suggested allocation
6. **Monte Carlo** → Watch 1000 simulation paths
7. **Scenario Test** → See historical crash impacts
8. **Future You** → Project wealth over time

## Available Scripts

```bash
# Frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint check

# Backend
npm start        # Start server
```

## Hackathon Documentation

See `docs/HACKATHON_PROMPT.md` for:
- Feature breakdown by phase
- Work division for 4 people
- Detailed roadmap
- Algorithm explanations
- Demo flow suggestions

## License

ISC
