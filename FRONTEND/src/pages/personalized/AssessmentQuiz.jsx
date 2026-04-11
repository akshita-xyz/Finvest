/**
 * Timed multi-step quiz: records hesitation per question and calls `onComplete` with result payload.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ASSESSMENT_QUESTIONS, buildAssessmentResult } from '../../lib/personalizedPortfolioEngine';

/**
 * @param {{ onComplete: (result: ReturnType<typeof buildAssessmentResult>) => void; onBusyChange?: (busy: boolean) => void }} props
 */
export default function AssessmentQuiz({ onComplete, onBusyChange }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(/** @type {Record<string, string>} */ ({}));
  const [hesitationMs, setHesitationMs] = useState(/** @type {number[]} */ ([]));
  const startRef = useRef(/** @type {number | null} */ (null));

  useEffect(() => {
    startRef.current = Date.now();
  }, [step]);

  const notifyBusy = useCallback(
    (v) => {
      onBusyChange?.(v);
    },
    [onBusyChange]
  );

  const selectOption = useCallback(
    (optionId) => {
      const q = ASSESSMENT_QUESTIONS[step];
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      const nextHes = [...hesitationMs];
      nextHes[step] = elapsed;
      const nextAnswers = { ...answers, [q.id]: optionId };

      if (step < ASSESSMENT_QUESTIONS.length - 1) {
        setHesitationMs(nextHes);
        setAnswers(nextAnswers);
        setStep((s) => s + 1);
        return;
      }

      const result = buildAssessmentResult(nextAnswers, nextHes);
      notifyBusy(true);
      Promise.resolve(onComplete(result)).finally(() => notifyBusy(false));
    },
    [step, answers, hesitationMs, onComplete, notifyBusy]
  );

  const q = ASSESSMENT_QUESTIONS[step];

  return (
    <div className="pp-card">
      <p className="pp-eyebrow">
        Personality & behavior · Step {step + 1} of {ASSESSMENT_QUESTIONS.length}
      </p>
      <h2 className="pp-card-title">{q.title}</h2>
      <p className="pp-card-desc">{q.description}</p>
      <p className="pp-hint">We record how long you take on each screen — quick vs deliberate choices inform your investor profile.</p>
      <ul className="pp-options" role="list">
        {q.options.map((opt) => (
          <li key={opt.id}>
            <button type="button" className="pp-option-btn" onClick={() => selectOption(opt.id)}>
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
