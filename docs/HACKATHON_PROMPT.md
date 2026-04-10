# FINVEST - AI-Powered Investment Fear Reduction Platform

## Hackathon Project Specification

---

## PROBLEM STATEMENT: INVESTING FEAR

**Young users fear investing due to the fear of loss.** If investing risk is contextualized and loss is simulated before real exposure, fear can be significantly reduced.

### Core Features to Build:
- **Risk Stimulation Sandbox** - Interactive environment to experience market scenarios
- **AI-Based Portfolio Explainer** - Natural language explanations of investment concepts
- **Loss Probability Meter** - Real-time visualization of potential losses

---

## PROJECT OVERVIEW

FINVEST is an AI/ML-powered platform that:
1. Assesses users' risk tolerance through behavioral analysis (hesitation time, decision patterns)
2. Clusters users into investment profiles (Risk-Averse, Balanced, Overconfident, Growth-Seeker)
3. Generates personalized portfolio recommendations
4. Simulates market scenarios and future outcomes
5. Provides AI-powered explanations in simple language

---

## FEATURE BREAKDOWN

### Phase 1: Core Assessment (MVP)
- [x] **Behavioral Fear Score** - Calculate 1-100 score based on hesitation times and answers
- [x] **User Classification** - Cluster users into 4 risk profiles
- [x] **Basic Portfolio Generation** - Asset allocation based on fear score
- [x] **Onboarding Flow** - Interactive questionnaire with timing analysis

### Phase 2: Simulation Engine
- [x] **Monte Carlo Simulation** - 1000+ market scenarios over 30 years
- [x] **Historical Scenario Testing** - 2008 crash, COVID, dot-com bubble
- [x] **Probabilistic Outcomes** - Percentile-based projections (p5, p25, p50, p75, p95)
- [x] **Loss Probability Meter** - Visual display of profit/loss chances

### Phase 3: Personalization
- [ ] **Salary-Based Projections** - Realistic goals based on income
- [ ] **Goal-Based Planning** - Retirement, house, travel calculators
- [ ] **"Future You" Simulator** - Visualization of future wealth
- [ ] **Personalized Messages** - Behavioral nudges and warnings

### Phase 4: AI Integration
- [ ] **Chatbot Explainer** - "Explain like I'm 15" for financial concepts
- [ ] **Portfolio Chat** - Ask questions about your specific portfolio
- [ ] **Sentiment Analysis** - Adjust recommendations based on news

### Phase 5: Advanced Features
- [ ] **Live Market Integration** - Stock APIs, crypto prices
- [ ] **Real Trading Simulation** - Paper trading with real-time data
- [ ] **Social Features** - See what similar users are investing in
- [ ] **Progress Tracking** - Dashboard with portfolio performance

---

## TECH STACK

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui patterns
- **Charts**: Recharts
- **Animations**: Framer Motion
- **State**: React hooks + Context

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

### ML (JavaScript-based)
- **Fear Score Calculation**: Behavioral heuristics
- **Clustering**: K-means implementation
- **Monte Carlo**: Statistical simulation
- **Scenario Analysis**: Historical pattern matching

---

## WORK DIVISION (4 People)

### Person 1: Frontend Lead
**Focus**: UI/UX, Components, Animations

**Responsibilities**:
- Landing page optimization (already built)
- Dashboard components (in progress)
- Onboarding flow enhancement
- Chart visualizations (Recharts)
- Animations and transitions
- Responsive design

**Deliverables**:
- All page components
- Chart components (Monte Carlo, allocation pie)
- Animation effects
- Mobile responsiveness

**Files to work on**:
- `FRONTEND/src/pages/*`
- `FRONTEND/src/components/*`
- `FRONTEND/src/App.jsx`

---

### Person 2: Backend/API Lead
**Focus**: Server, Database, API Routes

**Responsibilities**:
- Express server setup (in progress)
- API route implementation
- Supabase database schema
- User authentication flow
- Data validation and sanitization
- Error handling

**Deliverables**:
- Working API endpoints
- Database tables and migrations
- Auth middleware
- API documentation

**Files to work on**:
- `BACKEND/src/server.js`
- `BACKEND/src/routes/*`
- `BACKEND/src/supabase/*`
- `BACKEND/src/middleware/*`

**API Endpoints Needed**:
```
POST /api/analyze-user
POST /api/monte-carlo
POST /api/scenario-test
GET /api/scenarios
POST /api/save-profile
GET /api/profile/:userId
POST /api/chat
```

---

### Person 3: ML/Analytics Lead
**Focus**: Algorithms, Calculations, Analysis

**Responsibilities**:
- Fear score algorithm refinement
- K-means clustering optimization
- Monte Carlo simulation tuning
- Scenario modeling
- Statistical analysis
- Performance metrics

**Deliverables**:
- All ML modules working
- Accurate calculations
- Multiple scenario support
- Risk metrics output

**Files to work on**:
- `ML/BehaviorAnalysis/*`
- `ML/Clustering/*`
- `ML/PortfolioLogic/*`
- `ML/SimulationEngine/*`

---

### Person 4: Integration/Polish Lead
**Focus**: Connecting pieces, testing, documentation

**Responsibilities**:
- Frontend-Backend integration
- API testing and debugging
- Supabase setup and schema
- Error handling and edge cases
- README and documentation
- Demo preparation
- Bug fixes

**Deliverables**:
- Connected frontend-backend
- Working database
- Test scenarios
- Demo flow
- Documentation

**Files to work on**:
- `BACKEND/src/server.js` (connect routes)
- Database migrations
- README.md
- Testing files

---

## ROADMAP

### Day 1: Foundation
- [ ] **Morning**: Team sync, clarify tasks, environment setup
- [ ] **Afternoon**: 
  - Frontend: Start dashboard components
  - Backend: Setup Express with basic routes
  - ML: Verify algorithms work correctly
  - Integration: Plan API structure

### Day 2: Core Features
- [ ] **Morning**:
  - Frontend: Onboarding flow complete
  - Backend: User profile endpoints
  - ML: Fear score + clustering working
- [ ] **Afternoon**:
  - Frontend: Dashboard layout
  - Backend: Portfolio endpoints
  - ML: Monte Carlo integration
  - Integration: Connect frontend to backend

### Day 3: Simulation & Polish
- [ ] **Morning**:
  - Frontend: Charts and visualizations
  - Backend: Scenario endpoints
  - ML: Scenario simulator working
- [ ] **Afternoon**:
  - Integration: Full flow testing
  - Bug fixes
  - UI polish
  - Prepare demo

### Day 4: Demo Prep
- [ ] **Morning**: Full integration testing
- [ ] **Afternoon**: 
  - Demo flow rehearsal
  - Edge case handling
  - Final polish

---

## FEATURE PRIORITIES

### MUST HAVE (MVP)
1. Onboarding questionnaire with timing
2. Fear score calculation (1-100)
3. User classification (4 types)
4. Basic portfolio allocation
5. Monte Carlo simulation (visual)
6. Dashboard display
7. Scenario testing (3-5 scenarios)

### SHOULD HAVE
1. "Future You" projections
2. Goal-based planning
3. Loss probability meter
4. Chatbot explainer (basic)
5. Historical scenario comparison

### NICE TO HAVE
1. Live market data
2. Real trading simulation
3. Social features
4. Advanced chatbot
5. Mobile app

---

## ALGORITHMS EXPLAINED

### Fear Score Calculation
```
Base Score: 50
+ Hesitation Time Factor (avg response time / 100)
+ Risk Response Factor (Sell: +25, Wait: -5, Buy: -15)
+ Goal Factor (varies by selection)
+ Salary Factor (higher salary = lower fear)
+ Age Factor (younger = lower fear)
Final: Clamped between 1-100
```

### User Classification
```
Fear Score < 30: Overconfident
Fear Score 30-45: Growth-Seeker
Fear Score 45-65: Balanced
Fear Score > 65: Risk-Averse
```

### Portfolio Allocation (Example for Balanced)
```
Stocks (Aggressive): 35%
Stocks (Growth): 10%
Bonds (Intermediate): 30%
Bonds (Long): 15%
Cash: 10%
```

### Monte Carlo Simulation
```
1. Run 1000+ simulations
2. Each simulation: random market returns following normal distribution
3. Track value over 30 years
4. Calculate percentiles (p5, p25, p50, p75, p95)
5. Output: Loss probability, expected value, risk metrics
```

---

## IMPROVEMENT SUGGESTIONS

### For Better ML:
1. **Behavioral Features**: Track hover patterns, scroll behavior, time on page
2. **Dynamic Fear Score**: Update based on ongoing user interactions
3. **Peer Comparison**: Show how user compares to similar profiles
4. **Gamification**: Add risk-free "games" to test risk tolerance

### For Better UX:
1. **Progress Indicators**: Show "investment age" and progress
2. **Storytelling**: Use "Future You" narratives
3. **Micro-interactions**: Celebrate milestones, show small wins
4. **Social Proof**: "78% of users like you chose this portfolio"

### For Better Demos:
1. **Before/After**: Show fear reduction after simulation
2. **Comparison Tool**: Side-by-side portfolios
3. **Quick Win**: Generate portfolio in < 60 seconds
4. **Shareable Results**: Generate shareable infographic

---

## DEMO FLOW SUGGESTION

1. **Landing** → Click "Start Your Journey"
2. **Onboarding** → Answer 3-5 questions (30 seconds)
3. **Fear Score Reveal** → Dramatic reveal with explanation
4. **Portfolio Preview** → Show allocation pie chart
5. **Monte Carlo** → Watch 1000 paths animate
6. **Scenario Test** → "See what 2008 looked like"
7. **Future You** → "In 30 years, you'd have $X"
8. **CTA** → "Create account to save your portfolio"

---

## DATABASE SCHEMA (Supabase)

```sql
-- Users (handled by Supabase Auth)
-- Additional profile data
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  fear_score INTEGER,
  classification VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Onboarding responses
CREATE TABLE onboarding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  answers JSONB,
  hesitation_times JSONB,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Saved portfolios
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  portfolio_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Simulation history
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  scenario_id VARCHAR(50),
  result_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## QUICK START COMMANDS

```bash
# Frontend
cd FRONTEND
npm install
npm run dev

# Backend
cd BACKEND
npm install
# Set up .env with Supabase credentials
npm start

# ML (used by backend)
cd ML
# Test individual modules with node
node -e "const m = require('./index'); console.log(m.analyzeUser({...}))"
```

---

## KEY METRICS TO TRACK

- Time to complete onboarding
- Fear score distribution
- Portfolio acceptance rate
- Scenario engagement
- Return to dashboard rate
- Demo conversion rate

---

## COMMON ISSUES & SOLUTIONS

1. **CORS errors**: Add frontend URL to backend CORS config
2. **Supabase connection**: Verify .env variables
3. **ML calculations off**: Double-check math helpers
4. **Slow Monte Carlo**: Reduce simulations for demo
5. **Chart rendering**: Use ResponsiveContainer from Recharts

---

## HACKATHON TIPS

1. **Demo First**: Build the happy path perfectly
2. **Real Data**: Use realistic numbers, not placeholders
3. **Storytelling**: Guide judges through the journey
4. **Visual Impact**: Make fear score reveal dramatic
5. **Q&A Ready**: Anticipate technical questions
6. **Time Management**: MVP first, polish later

---

*Good luck! Remember: The goal is to reduce investing fear through simulation and education.*
