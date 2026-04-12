/** Pure math for goal planning , deterministic + Monte Carlo probability */

export const DEFAULT_INFLATION = 0.05;

/**
 * Heuristic labels for MF search hits (name + query text). Not from AMFI; for UI grouping only.
 * @returns {{ horizon: 'short'|'medium'|'long', risk: 'low'|'moderate'|'high' }}
 */
export function classifySuggestedMfScheme(schemeName, suggestedVia) {
  const text = `${schemeName || ''} ${suggestedVia || ''}`.toLowerCase();

  const shortHorizon =
    /\b(liquid|overnight|ultra\s*short|money\s*market|low\s*duration|treasury|cash\s*management|savings\s*fund|institutional\s*liquid)\b/.test(
      text
    );
  const longHorizon =
    /\b(elss|tax\s*saver|retirement|pension|flexi\s*cap|large\s*cap|mid\s*cap|small\s*cap|multi\s*cap|index\s*fund|\bnifty\b|\bsensex\b|equity\s*(?:fund|savings)|\bpure\s*equity\b|thematic|sector\s*fund|focused|contra|international|global\s*equity|value\s*fund|arbitrage)\b/.test(
      text
    );

  let horizon = 'medium';
  if (shortHorizon) horizon = 'short';
  else if (longHorizon) horizon = 'long';

  const lowRisk =
    /\b(liquid|overnight|ultra\s*short|money\s*market|low\s*duration|gilt|banking\s*(?:&|and)\s*psu|corporate\s*bond|short\s*term\s*debt|overnight\s*fund|treasury)\b/.test(
      text
    );
  const highRisk =
    /\b(small\s*cap|mid\s*cap|sector\s*fund|thematic|international|global\s*equity|aggressive|focused\s*equity|contra\s*fund)\b/.test(
      text
    );

  let risk = 'moderate';
  if (highRisk) risk = 'high';
  else if (lowRisk) risk = 'low';

  return { horizon, risk };
}

function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Future value of monthly contributions + lump at constant annual rate (compounded monthly). */
export function fvGrowingPortfolio({ monthlyContrib, lumpSum, meanAnnual, years }) {
  const months = Math.round(years * 12);
  const r = meanAnnual / 12;
  if (months <= 0) return lumpSum;
  let fvAnnuity = 0;
  if (r === 0) fvAnnuity = monthlyContrib * months;
  else fvAnnuity = monthlyContrib * ((Math.pow(1 + r, months) - 1) / r);
  const fvLump = lumpSum * Math.pow(1 + r, months);
  return fvAnnuity + fvLump;
}

/** Year-end balances for chart (deterministic, expected path). */
export function yearlySeriesDeterministic({ monthlyContrib, lumpSum, meanAnnual, years }) {
  const out = [{ year: 0, nominal: lumpSum, contributed: lumpSum }];
  let contributed = lumpSum;
  for (let y = 1; y <= years; y++) {
    contributed += monthlyContrib * 12;
    const nominal = fvGrowingPortfolio({
      monthlyContrib, lumpSum, meanAnnual, years: y, });
    out.push({
      year: y, nominal, contributed, });
  }
  return out;
}

/** Apply constant inflation to nominal terminal value (purchasing power). */
export function realFromNominal(nominal, years, inflationAnnual = DEFAULT_INFLATION) {
  return nominal / Math.pow(1 + inflationAnnual, years);
}

/**
 * Monte Carlo: monthly GBM on wealth + contribution at month end.
 * Probability final wealth > total cash contributed (simple profit probability).
 */
export function monteCarloProfitProbability({
  monthlyContrib, lumpSum, years, meanAnnual, volAnnual, simulations = 600, }) {
  const months = Math.round(years * 12);
  const dt = 1 / 12;
  const mu = meanAnnual;
  const sig = Math.max(1e-6, volAnnual);
  let wins = 0;
  for (let s = 0; s < simulations; s++) {
    let w = lumpSum;
    let contributed = lumpSum;
    for (let m = 0; m < months; m++) {
      const z = gaussian();
      const drift = (mu - 0.5 * sig * sig) * dt;
      const shock = sig * Math.sqrt(dt) * z;
      w = w * Math.exp(drift + shock) + monthlyContrib;
      contributed += monthlyContrib;
    }
    if (w > contributed) wins += 1;
  }
  return (wins / simulations) * 100;
}

/** Build three default paths; optional overrides from market data. */
export function buildRiskPaths({ mfAnnualReturn, mfVol, stockAnnualReturn, stockVol }) {
  const safe = {
    id: 'safe', label: 'Safe path', subtitle: 'Capital preservation, debt & high-quality bonds', meanAnnual: 0.055, volAnnual: 0.04, allocationHint: '~70% debt / cash-type, ~30% hybrid', };
  const moderate = {
    id: 'moderate', label: 'Moderate path', subtitle: 'Balanced mutual funds + some equity', meanAnnual: Number.isFinite(mfAnnualReturn) ? mfAnnualReturn : 0.085, volAnnual: Number.isFinite(mfVol) ? mfVol : 0.11, allocationHint: '~50 to 60% equity, rest debt (typical balanced fund)', };
  const aggressive = {
    id: 'aggressive', label: 'High-growth path', subtitle: 'Global / broad equity (market-linked)', meanAnnual: Number.isFinite(stockAnnualReturn) ? stockAnnualReturn : 0.105, volAnnual: Number.isFinite(stockVol) ? stockVol : 0.18, allocationHint: '~80 to 95% equity, small cash buffer', };
  // keep sensible bounds
  [safe, moderate, aggressive].forEach((p) => {
    p.meanAnnual = Math.min(0.22, Math.max(0.02, p.meanAnnual));
    p.volAnnual = Math.min(0.45, Math.max(0.03, p.volAnnual));
  });
  return [safe, moderate, aggressive];
}

/**
 * Blend MF NAV-derived stats across holdings (weight by current ₹; equal-weight if all zero).
 * @param {Array<{ stats: { meanAnnual: number, volAnnual: number, days: number } | null, weight: number }>} entries
 * @returns {{ meanAnnual: number, volAnnual: number, days: number } | null}
 */
export function aggregateWeightedMfStats(entries) {
  const valid = entries.filter((e) => e.stats && Number.isFinite(e.stats.meanAnnual));
  if (!valid.length) return null;
  const sumW = valid.reduce((s, e) => s + Math.max(0, Number(e.weight) || 0), 0);
  if (sumW <= 0) {
    const n = valid.length;
    return {
      meanAnnual: valid.reduce((acc, e) => acc + e.stats.meanAnnual, 0) / n, volAnnual: valid.reduce((acc, e) => acc + e.stats.volAnnual, 0) / n, days: Math.round(valid.reduce((acc, e) => acc + e.stats.days, 0) / n), };
  }
  return {
    meanAnnual: valid.reduce((acc, e) => acc + e.stats.meanAnnual * Math.max(0, e.weight), 0) / sumW, volAnnual: valid.reduce((acc, e) => acc + e.stats.volAnnual * Math.max(0, e.weight), 0) / sumW, days: Math.round(
      valid.reduce((acc, e) => acc + e.stats.days * Math.max(0, e.weight), 0) / sumW
    ), };
}
