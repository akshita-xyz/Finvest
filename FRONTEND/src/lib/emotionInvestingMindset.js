/**
 * Pre-investing emotional & mental well-being check (educational; not clinical advice).
 */

export const EMOTION_PILLARS = {
  emotionalRegulation: {
    id: 'emotionalRegulation', title: 'Emotional regulation', blurb: 'Staying steady when money or markets feel intense.', }, impulseFomo: {
    id: 'impulseFomo', title: 'Impulse & FOMO', blurb: 'Resisting rushed decisions driven by hype or fear of missing out.', }, lossComposure: {
    id: 'lossComposure', title: 'Composure after setbacks', blurb: 'How you respond when something loses value or a plan goes wrong.', }, patienceLongTerm: {
    id: 'patienceLongTerm', title: 'Patience & long-term view', blurb: 'Willingness to let wealth build gradually instead of chasing quick wins.', }, selfHonesty: {
    id: 'selfHonesty', title: 'Self-honesty & motives', blurb: 'Clarity about why you invest and what you can truly afford to risk.', }, balanceRecovery: {
    id: 'balanceRecovery', title: 'Balance & recovery', blurb: 'Sleep, stress load, and whether investing fits the rest of your life right now.', }, };

const PILLAR_KEYS = Object.keys(EMOTION_PILLARS);

/** @type {{ id: string, text: string, options: { id: string, label: string, scores: Partial<Record<string, number>> }[] }[]} */
export const EMOTION_QUESTIONS = [
  {
    id: 'eq1', text: 'When someone mentions “the market crashed,” what is closest to your first reaction?', options: [
      { id: 'eq1a', label: 'I notice tension in my body but I can step back and get facts before deciding anything.', scores: { emotionalRegulation: 3, lossComposure: 2 } }, { id: 'eq1b', label: 'I feel uneasy and need reassurance, but I don’t act on impulse.', scores: { emotionalRegulation: 2 } }, { id: 'eq1c', label: 'I spiral into worst-case stories or want to fix everything immediately.', scores: { emotionalRegulation: 0, impulseFomo: 0 } }, ], }, {
    id: 'eq2', text: 'You see a stock or coin everyone online says will “10x.” You have money earmarked for bills next month. You…', options: [
      { id: 'eq2a', label: 'Do not touch bill money; if I research at all, it’s with money I can lose.', scores: { impulseFomo: 3, selfHonesty: 3 } }, { id: 'eq2b', label: 'Feel tempted but wait a day or two before any move.', scores: { impulseFomo: 2, selfHonesty: 2 } }, { id: 'eq2c', label: 'Feel I might miss out if I don’t move fast, even if it strains my budget.', scores: { impulseFomo: 0, selfHonesty: 0 } }, ], }, {
    id: 'eq3', text: 'After a losing day on an investment, you are most likely to…', options: [
      { id: 'eq3a', label: 'Review what I can learn, accept volatility as normal, and stick to my rules.', scores: { lossComposure: 3, emotionalRegulation: 2 } }, { id: 'eq3b', label: 'Feel bad but distract myself and revisit later with a cooler head.', scores: { lossComposure: 2 } }, { id: 'eq3c', label: 'Obsess over charts, blame myself or others, or revenge-trade.', scores: { lossComposure: 0, impulseFomo: 0 } }, ], }, {
    id: 'eq4', text: 'Your realistic investing horizon feels like…', options: [
      { id: 'eq4a', label: 'Years, not weeks. I’m okay boring, steady progress.', scores: { patienceLongTerm: 3 } }, { id: 'eq4b', label: 'A mix; I want growth but I’m learning to wait.', scores: { patienceLongTerm: 2 } }, { id: 'eq4c', label: 'I mainly hope for fast results; waiting feels wasteful.', scores: { patienceLongTerm: 0 } }, ], }, {
    id: 'eq5', text: 'How true is this for you: “I know how much I can afford to lose without harming my mental health or essentials.”', options: [
      { id: 'eq5a', label: 'Very true, I’ve thought it through and written it down.', scores: { selfHonesty: 3, emotionalRegulation: 2 } }, { id: 'eq5b', label: 'Somewhat, I have a rough idea but could be sharper.', scores: { selfHonesty: 2 } }, { id: 'eq5c', label: 'Not really, I’d rather not think about losing.', scores: { selfHonesty: 0, lossComposure: 0 } }, ], }, {
    id: 'eq6', text: 'Sleep, appetite, and mood lately (honest check-in):', options: [
      { id: 'eq6a', label: 'Generally stable; stress is manageable.', scores: { balanceRecovery: 3, emotionalRegulation: 1 } }, { id: 'eq6b', label: 'Some rough patches but I’m aware and trying to fix basics.', scores: { balanceRecovery: 2 } }, { id: 'eq6c', label: 'Often poor sleep, irritable, or burned out, money thoughts make it worse.', scores: { balanceRecovery: 0 } }, ], }, {
    id: 'eq7', text: 'When a friend brags about gains, you…', options: [
      { id: 'eq7a', label: 'Feel happy for them without needing to copy their risk.', scores: { impulseFomo: 3, selfHonesty: 2 } }, { id: 'eq7b', label: 'Feel a sting of comparison but I don’t automatically chase.', scores: { impulseFomo: 2 } }, { id: 'eq7c', label: 'Feel behind and urgently want to catch up with similar bets.', scores: { impulseFomo: 0 } }, ], }, {
    id: 'eq8', text: 'You open your portfolio app. How often does it hijack your mood for the rest of the day?', options: [
      { id: 'eq8a', label: 'Rarely, I treat it as data, not my whole identity.', scores: { emotionalRegulation: 3, balanceRecovery: 2 } }, { id: 'eq8b', label: 'Sometimes, I’m working on boundaries.', scores: { emotionalRegulation: 2 } }, { id: 'eq8c', label: 'Often, it defines whether I feel good or awful.', scores: { emotionalRegulation: 0, balanceRecovery: 0 } }, ], }, {
    id: 'eq9', text: 'If investing were paused for 90 days so you could stabilize habits, you would…', options: [
      { id: 'eq9a', label: 'See it as wise; mental bandwidth matters as much as returns.', scores: { balanceRecovery: 3, patienceLongTerm: 2 } }, { id: 'eq9b', label: 'Resist at first but understand the logic.', scores: { balanceRecovery: 2 } }, { id: 'eq9c', label: 'Feel panicked or deprived, markets can’t wait.', scores: { balanceRecovery: 0, impulseFomo: 0 } }, ], }, {
    id: 'eq10', text: 'Your main reason to invest is closest to…', options: [
      { id: 'eq10a', label: 'Security and future goals I’ve named (education, home, retirement).', scores: { selfHonesty: 3, patienceLongTerm: 2 } }, { id: 'eq10b', label: 'Growth plus learning; still clarifying specifics.', scores: { selfHonesty: 2 } }, { id: 'eq10c', label: 'Status, excitement, or proving something to others or myself.', scores: { selfHonesty: 0, impulseFomo: 0 } }, ], }, {
    id: 'eq11', text: 'When you feel angry or sad, you are most likely to…', options: [
      { id: 'eq11a', label: 'Use a non-financial coping tool first (walk, talk, journal), then decide.', scores: { emotionalRegulation: 3, impulseFomo: 2 } }, { id: 'eq11b', label: 'Sometimes slip into scrolling or spending/investing to feel better.', scores: { emotionalRegulation: 1, impulseFomo: 1 } }, { id: 'eq11c', label: 'Often channel feelings into impulsive money moves.', scores: { emotionalRegulation: 0, impulseFomo: 0 } }, ], }, {
    id: 'eq12', text: 'How aligned is investing with your current life stress (work, family, health)?', options: [
      { id: 'eq12a', label: 'Aligned, I’m not using markets to escape bigger problems.', scores: { balanceRecovery: 3, selfHonesty: 2 } }, { id: 'eq12b', label: 'Mixed, I’m not sure; could use a clearer picture.', scores: { balanceRecovery: 2, selfHonesty: 1 } }, { id: 'eq12c', label: 'Investing is partly an escape or distraction from stress I’m avoiding.', scores: { balanceRecovery: 0, selfHonesty: 0 } }, ], }, ];

/** Max achievable per pillar = sum of max score that question could add (per question, max of options for that pillar) */
function computeMaxScores() {
  const max = {};
  PILLAR_KEYS.forEach((k) => {
    max[k] = 0;
  });
  for (const q of EMOTION_QUESTIONS) {
    const perQ = {};
    PILLAR_KEYS.forEach((k) => {
      perQ[k] = 0;
    });
    for (const opt of q.options) {
      for (const k of PILLAR_KEYS) {
        const v = opt.scores?.[k];
        if (typeof v === 'number') perQ[k] = Math.max(perQ[k], v);
      }
    }
    for (const k of PILLAR_KEYS) {
      max[k] += perQ[k];
    }
  }
  return max;
}

const PILLAR_MAX = computeMaxScores();

/**
 * @param {Record<string, string>} answers questionId -> optionId
 */
export function evaluateEmotionMindset(answers) {
  const raw = {};
  PILLAR_KEYS.forEach((k) => {
    raw[k] = 0;
  });

  for (const q of EMOTION_QUESTIONS) {
    const oid = answers[q.id];
    if (!oid) continue;
    const opt = q.options.find((o) => o.id === oid);
    if (!opt?.scores) continue;
    for (const k of PILLAR_KEYS) {
      const v = opt.scores[k];
      if (typeof v === 'number') raw[k] += v;
    }
  }

  const pillars = PILLAR_KEYS.map((key) => {
    const max = PILLAR_MAX[key] || 1;
    const score = raw[key];
    const percent = Math.round((score / max) * 100);
    let level = 'watch';
    if (percent >= 72) level = 'strong';
    else if (percent < 48) level = 'grow';
    return {
      key, ...EMOTION_PILLARS[key], score, max, percent, level, };
  });

  const mastered = pillars.filter((p) => p.level === 'strong').map((p) => p.title);
  const improve = pillars.filter((p) => p.level === 'grow').map((p) => p.title);
  const watchOut = pillars.filter((p) => p.level === 'watch').map((p) => p.title);

  const overall = Math.round(pillars.reduce((s, p) => s + p.percent, 0) / pillars.length);

  let archetype = 'The Mindful Builder';
  if (overall >= 78) archetype = 'The Grounded Investor';
  else if (overall >= 58) archetype = 'The Growing Steward';
  else if (overall >= 42) archetype = 'The Cautious Learner';
  else archetype = 'The Recovery-First Explorer';

  const closingAdvice =
    improve.length === 0
      ? 'Your answers suggest a solid emotional foundation for learning to invest. Keep journaling decisions, revisit this check-in after major life changes, and never risk money you need for peace of mind.'
      : improve.length <= 2
        ? 'A few areas need gentle work before sizing up risk. Small steps, sleep, a written plan, and pausing 24 hours before trades, compound faster than forcing “perfect” investing.'
        : 'Several signals point to stress, impulse, or unclear motives. That is normal. Prioritize basics (sleep, support, emergency fund) and consider pausing new risk until you feel steadier. This quiz is not therapy; reach out to trusted people or professionals when life feels heavy.';

  const lookAfter = [
    ...watchOut.map((t) => `Keep an eye on: ${t} , schedule short weekly check-ins with yourself, not just your portfolio.`), 'Avoid investing when hungry, exhausted, or right after a fight or bad news.', 'Name one non-negotiable (emergency buffer or rent) and never invest below that line.', ];

  return {
    pillars, masteredAreas: mastered, improveAreas: improve, watchOutLabels: watchOut, lookAfter, overallReadiness: overall, archetype, closingAdvice, answeredCount: Object.keys(answers).length, totalQuestions: EMOTION_QUESTIONS.length, };
}
