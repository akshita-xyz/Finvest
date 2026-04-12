/** Tab order for Personalized Portfolio hub (roadmap). */
export const PP_ROADMAP_ORDER = ['overview', 'calculator', 'quiz', 'where', 'portfolio'];

/**
 * @param {Record<string, unknown> | null | undefined} profile - `user_profiles` row
 * @returns {Record<string, boolean>}
 */
export function getPPRoadmapCompletion(profile) {
  const prefs =
    profile?.dashboard_prefs && typeof profile.dashboard_prefs === 'object' && !Array.isArray(profile.dashboard_prefs)
      ? profile.dashboard_prefs
      : {};
  const roadmap = prefs.ppRoadmap && typeof prefs.ppRoadmap === 'object' ? prefs.ppRoadmap : {};
  const assessment = prefs.assessment;
  const fearOk = profile?.fear_score != null && Number.isFinite(Number(profile.fear_score));

  return {
    overview: Boolean(profile), calculator: fearOk, quiz: Boolean(assessment?.completedAt), where: Boolean(assessment?.completedAt) && Boolean(roadmap.whereVisited), portfolio: Boolean(assessment?.completedAt) && Boolean(roadmap.portfolioVisited), };
}

/**
 * First step not yet satisfied; if all done, returns `portfolio`.
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function getFirstIncompletePPTab(profile) {
  const done = getPPRoadmapCompletion(profile);
  for (const id of PP_ROADMAP_ORDER) {
    if (!done[id]) return id;
  }
  return 'portfolio';
}

/**
 * Entry URL when user should land on the next incomplete step (e.g. from Dashboard “Decode Your Finance Self”).
 */
export function getPersonalizedPortfolioResumePath() {
  return '/personalized-portfolio?resume=1';
}
