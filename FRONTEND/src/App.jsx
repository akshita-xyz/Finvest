import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import ProtectedRoute from './components/ProtectedRoute';
import PersonalizedPortfolioHub from './pages/PersonalizedPortfolioHub';
import FinancialGoals from './pages/FinancialGoals';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* Protected routes send guests to `/account` */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personalized-portfolio"
        element={
          <ProtectedRoute>
            <PersonalizedPortfolioHub />
          </ProtectedRoute>
        }
      />
      <Route path="/financial-goals" element={<FinancialGoals />} />
    </Routes>
  );
}

export default App;
