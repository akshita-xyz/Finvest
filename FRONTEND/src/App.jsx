import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import LandingPage from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import ProtectedRoute from './components/ProtectedRoute';
import PersonalizedPortfolioHub from './pages/PersonalizedPortfolioHub';
import FinancialGoals from './pages/FinancialGoals';
import RagContracts from './pages/RagContracts';
import VerifyCertificate from './pages/VerifyCertificate';
import VoiceAssistant from "./components/VoiceAssistant";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* Protected routes require sign-in or “Login as Guest” (see guestMode + ProtectedRoute) */}
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
      <Route path="/rag-contracts" element={<RagContracts />} />
      <Route path="/verify" element={<VerifyCertificate />} />
    </Routes>
    <VoiceAssistant />
    </>
  );
}

export default App;
