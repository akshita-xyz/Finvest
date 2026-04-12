import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

const questions = [
  {
    id: 'goal', title: "What's driving you?", description: "Whether it's a house, retirement, or financial freedom , let's set the target.", options: ['Buying a house', 'Retirement', 'Travel', 'Growing wealth'], }, {
    id: 'risk', title: "How do you handle drops?", description: "If your portfolio drops 20% in a month, what's your first move?", options: ['Sell immediately', 'Wait it out', 'Buy more', 'Consult an advisor'], }, {
    id: 'salary', title: "What's your playing field?", description: "Knowing your income helps us simulate realistic growth.", options: ['Under $50k', '$50k - $100k', '$100k - $200k', 'Over $200k'], }
];

function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const startTimeRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [currentStep]);

  const handleSelect = useCallback((option) => {
    const timeTaken = Date.now() - startTimeRef.current;
    const _unusedTime = timeTaken;
    
    setAnswers(prev => ({ ...prev, [questions[currentStep].id]: option }));
    
    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        const fearScore = Math.min(100, Math.max(1, Math.floor(timeTaken / 100)));
        
        localStorage.setItem('fearScore', fearScore.toString());
        localStorage.setItem('userProfile', JSON.stringify({ ...answers, [questions[currentStep].id]: option }));
        
        navigate('/dashboard');
      }
    }, 400);
  }, [currentStep, answers, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tighter">FINVEST</h1>
          <div className="text-sm text-gray-500">Step {currentStep + 1} of {questions.length}</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-[#111] border border-gray-800 p-8 rounded-2xl shadow-xl"
          >
            <h2 className="text-3xl font-semibold mb-2">{questions[currentStep].title}</h2>
            <p className="text-gray-400 mb-8">{questions[currentStep].description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions[currentStep].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(option)}
                  className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-gray-800 hover:border-gray-600 transition-all text-left p-4 rounded-xl text-lg flex items-center justify-between group"
                >
                  {option}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Onboarding;
