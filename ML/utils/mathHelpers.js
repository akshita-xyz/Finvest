function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr) {
  if (!arr || arr.length === 0) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / arr.length);
}

function variance(arr) {
  if (!arr || arr.length === 0) return 0;
  const avg = mean(arr);
  return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
}

function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x, mean = 0, stdDev = 1) {
  const exp = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
  return exp / (stdDev * Math.sqrt(2 * Math.PI));
}

function randomNormal(mean = 0, stdDev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

function randomLogNormal(mean, stdDev) {
  return Math.exp(randomNormal(Math.log(mean), stdDev));
}

function randomUniform(min, max) {
  return min + Math.random() * (max - min);
}

function randomChoice(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function compoundReturns(rate, periods, principal = 1) {
  return principal * Math.pow(1 + rate, periods);
}

function presentValue(futureValue, rate, periods) {
  return futureValue / Math.pow(1 + rate, periods);
}

function futureValue(presentValue, rate, periods) {
  return presentValue * Math.pow(1 + rate, periods);
}

function calculateCAGR(startValue, endValue, years) {
  if (startValue <= 0 || years <= 0) return 0;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

function calculateVolatility(returns) {
  return stdDev(returns);
}

function calculateSharpeRatio(returns, riskFreeRate = 0.02) {
  const avgReturn = mean(returns);
  const vol = calculateVolatility(returns);
  return vol > 0 ? (avgReturn - riskFreeRate) / vol : 0;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatPercent(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

module.exports = {
  mean,
  median,
  stdDev,
  variance,
  percentile,
  normalCDF,
  normalPDF,
  randomNormal,
  randomLogNormal,
  randomUniform,
  randomChoice,
  shuffle,
  compoundReturns,
  presentValue,
  futureValue,
  calculateCAGR,
  calculateVolatility,
  calculateSharpeRatio,
  formatCurrency,
  formatPercent,
  clamp,
  lerp
};
