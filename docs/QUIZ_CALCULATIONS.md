# How quiz scores are calculated

This document describes the **exact** scoring logic implemented in the Finvest frontend for:

1. **Emotional Readiness Test** (Dashboard) — source: [`FRONTEND/src/lib/emotionInvestingMindset.js`](../FRONTEND/src/lib/emotionInvestingMindset.js)
2. **Decode Your Finance Self** (Personalized Portfolio timed quiz) — source: [`FRONTEND/src/lib/personalizedPortfolioEngine.js`](../FRONTEND/src/lib/personalizedPortfolioEngine.js)

Everything below matches those files as of the repo snapshot; if questions or numbers change in code, update this doc in the same PR.

---

## 1. Emotional Readiness Test (“emotional quiz”)

### What you store

- Answers are a map **`questionId` → `optionId`** (e.g. `eq3` → `eq3a`).
- Only the **selected option’s** `scores` object contributes; there is no time-based signal.

### Pillars (parameters)

Each pillar is one key in `scores` on options. Human-readable titles:

| Pillar key | Title |
|------------|--------|
| `emotionalRegulation` | Emotional regulation |
| `impulseFomo` | Impulse & FOMO |
| `lossComposure` | Composure after setbacks |
| `patienceLongTerm` | Patience & long-term view |
| `selfHonesty` | Self-honesty & motives |
| `balanceRecovery` | Balance & recovery |

### Per-question → pillar mapping

For each question, **each answer option** adds the pillar points listed in its `scores` (only keys present on that option; missing pillars add **0** for that answer).

| Question ID | Topic (short) | Option IDs | Pillar points added (`scores`) |
|-------------|---------------|--------------|----------------------------------|
| `eq1` | Reaction to “market crashed” | `eq1a` | `emotionalRegulation: 3`, `lossComposure: 2` |
| | | `eq1b` | `emotionalRegulation: 2` |
| | | `eq1c` | `emotionalRegulation: 0`, `impulseFomo: 0` |
| `eq2` | Hype + bill money | `eq2a` | `impulseFomo: 3`, `selfHonesty: 3` |
| | | `eq2b` | `impulseFomo: 2`, `selfHonesty: 2` |
| | | `eq2c` | `impulseFomo: 0`, `selfHonesty: 0` |
| `eq3` | After a losing day | `eq3a` | `lossComposure: 3`, `emotionalRegulation: 2` |
| | | `eq3b` | `lossComposure: 2` |
| | | `eq3c` | `lossComposure: 0`, `impulseFomo: 0` |
| `eq4` | Investing horizon | `eq4a` | `patienceLongTerm: 3` |
| | | `eq4b` | `patienceLongTerm: 2` |
| | | `eq4c` | `patienceLongTerm: 0` |
| `eq5` | Affordable loss clarity | `eq5a` | `selfHonesty: 3`, `emotionalRegulation: 2` |
| | | `eq5b` | `selfHonesty: 2` |
| | | `eq5c` | `selfHonesty: 0`, `lossComposure: 0` |
| `eq6` | Sleep / mood check-in | `eq6a` | `balanceRecovery: 3`, `emotionalRegulation: 1` |
| | | `eq6b` | `balanceRecovery: 2` |
| | | `eq6c` | `balanceRecovery: 0` |
| `eq7` | Friend brags about gains | `eq7a` | `impulseFomo: 3`, `selfHonesty: 2` |
| | | `eq7b` | `impulseFomo: 2` |
| | | `eq7c` | `impulseFomo: 0` |
| `eq8` | Portfolio app vs mood | `eq8a` | `emotionalRegulation: 3`, `balanceRecovery: 2` |
| | | `eq8b` | `emotionalRegulation: 2` |
| | | `eq8c` | `emotionalRegulation: 0`, `balanceRecovery: 0` |
| `eq9` | 90-day investing pause | `eq9a` | `balanceRecovery: 3`, `patienceLongTerm: 2` |
| | | `eq9b` | `balanceRecovery: 2` |
| | | `eq9c` | `balanceRecovery: 0`, `impulseFomo: 0` |
| `eq10` | Main reason to invest | `eq10a` | `selfHonesty: 3`, `patienceLongTerm: 2` |
| | | `eq10b` | `selfHonesty: 2` |
| | | `eq10c` | `selfHonesty: 0`, `impulseFomo: 0` |
| `eq11` | Angry/sad → money moves | `eq11a` | `emotionalRegulation: 3`, `impulseFomo: 2` |
| | | `eq11b` | `emotionalRegulation: 1`, `impulseFomo: 1` |
| | | `eq11c` | `emotionalRegulation: 0`, `impulseFomo: 0` |
| `eq12` | Investing vs life stress | `eq12a` | `balanceRecovery: 3`, `selfHonesty: 2` |
| | | `eq12b` | `balanceRecovery: 2`, `selfHonesty: 1` |
| | | `eq12c` | `balanceRecovery: 0`, `selfHonesty: 0` |

### Raw pillar score

For each pillar key \(k\):

\[
\text{raw}[k] = \sum_{\text{answered questions}} \text{selected option’s } \text{scores}[k] \text{ (or 0 if missing)}
\]

### Normalization (“percent” per pillar)

For each pillar, the code precomputes **`PILLAR_MAX[k]`**: for **each** question, take the **maximum** points that question could have added to pillar \(k\) across its three options, then **sum** those maxima over all 12 questions.

Computed values from the current question bank:

| Pillar | `PILLAR_MAX` |
|--------|----------------|
| `emotionalRegulation` | 14 |
| `impulseFomo` | 8 |
| `lossComposure` | 5 |
| `patienceLongTerm` | 7 |
| `selfHonesty` | 13 |
| `balanceRecovery` | 11 |

Then:

\[
\text{percent}[k] = \text{round}\left(100 \times \frac{\text{raw}[k]}{\text{PILLAR\_MAX}[k]}\right)
\]

(If `PILLAR_MAX` were 0, the code uses 1 to avoid division by zero; with the current bank this does not occur.)

### Level bands (per pillar)

- **`strong`**: `percent >= 72`
- **`grow`**: `percent < 48`
- **`watch`**: otherwise (`48 <= percent < 72`)

Lists in the UI:

- **Mastered**: pillars with level `strong` (titles only).
- **Improve**: level `grow`.
- **Watch out**: level `watch`.

### Overall readiness

\[
\text{overallReadiness} = \text{round}\left(\frac{1}{6} \sum_{k} \text{percent}[k]\right)
\]

(i.e. simple average of the six pillar percents).

### Archetype (from overall only)

| Condition | Archetype label |
|-----------|-----------------|
| `overallReadiness >= 78` | The Grounded Investor |
| `58 <= overallReadiness < 78` | The Growing Steward |
| `42 <= overallReadiness < 58` | The Cautious Learner |
| `overallReadiness < 42` | The Recovery-First Explorer |

The variable is initialized to **The Mindful Builder** in code, but the `if / else if / else` chain assigns one of the four names above for any finite numeric `overallReadiness`, so that default does not appear in normal results.

### Closing copy

`closingAdvice` and `lookAfter` strings are **rule-based** from counts of improve areas (`improveAreas.length`), not from numeric scores beyond that.

---

## 2. Decode Your Finance Self (timed assessment quiz)

### What you store

- **`answers`**: map **`questionId` → `optionId`** for each entry in `ASSESSMENT_QUESTIONS` (fixed order in code).
- **`hesitationMs`**: array of dwell/hesitation times in milliseconds, **one entry per question in the same order** as `ASSESSMENT_QUESTIONS`.

Implementation reference: `aggregateTraits` and `buildAssessmentResult` in [`personalizedPortfolioEngine.js`](../FRONTEND/src/lib/personalizedPortfolioEngine.js).

### Question → answer metadata

Each option may define:

- **`traits`**: partial map; only these keys are **read and summed** by the engine: `patient`, `impulsive`, `overconfident`, `planning`, `leverage_comfort`. Any other trait key on an option (e.g. `balanced`) is **ignored** for aggregation.
- **`fearDelta`**: a number added to the running fear score (starting from 50).

#### `decision_style` — Before you act on a new investment idea…

| Option ID | Label (short) | Traits summed | `fearDelta` |
|-----------|---------------|---------------|-------------|
| `read_first` | Read docs / fine print | `patient: +1`, `impulsive: -0.8`, `planning: +1` | `+8` |
| `facts_first` | Few key facts then decide | `patient: +0.5`, `impulsive: -0.3`, `planning: +0.6` | `+3` |
| `immediate` | Gut / right away | `patient: -0.9`, `impulsive: +1`, `overconfident: +0.7`, `planning: -0.4` | `-10` |

#### `holding_period` — Natural holding period

| Option ID | Label (short) | Traits summed | `fearDelta` |
|-----------|---------------|---------------|-------------|
| `intraday` | Days to weeks | `impulsive: +0.6`, `overconfident: +0.3` | `-12` |
| `months` | Several months | `patient: +0.3` only (`balanced: 0.5` on the option is **not** applied) | `+2` |
| `years` | Years / decades | `patient: +1`, `planning: +0.8` | `+10` |

#### `market_drop` — Portfolio −20% in a month

| Option ID | Label (short) | Traits summed | `fearDelta` |
|-----------|---------------|---------------|-------------|
| `sell` | Sell / reduce quickly | _(none)_ | `+22` |
| `wait` | Wait it out | `patient: +0.5` | `-4` |
| `buy` | Buy more | `overconfident: +0.4` | `-14` |
| `advisor` | Advisor / read more | `planning: +0.7` | `+6` |

#### `credit_comfort` — Loans / credit / bank policies

| Option ID | Label (short) | Traits summed | `fearDelta` |
|-----------|---------------|---------------|-------------|
| `prefer_loans` | Comfortable comparing credit | `leverage_comfort: +1` | `-5` |
| `neutral_credit` | Rare credit, simple | `leverage_comfort: +0.3` | `+4` |
| `avoid_debt` | Avoid debt | `leverage_comfort: -0.8`, `patient: +0.3` | `+12` |

### Trait aggregation (from answers only)

Starting values: `patient`, `impulsive`, `overconfident`, `planning`, `leverage_comfort` all **0**.

For each answered question, add the option’s trait contributions as above.

Then **clamp** each trait to **[-2, 4]**:

\[
\text{trait\_final} = \max(-2, \min(4, \text{trait\_sum}))
\]

### Fear score (answers + hesitation)

1. Start **`fear = 50`**.
2. For each answered option with numeric `fearDelta`, do **`fear += fearDelta`**.
3. Compute **`avgHes`** = mean of `hesitationMs` if length > 0, else **4000** ms.
4. **`hesitationPatience`** = `min(1, avgHes / 28000)`.
5. Trait adjustments from timing (also fed into patience / impulsive before clamp):
   - **`patient += hesitationPatience * 0.9`**
   - **`impulsive += (1 - hesitationPatience) * 0.55`**
6. Fear adjustments from timing:
   - **`fear += min(18, avgHes / 900)`**
   - **`fear -= min(12, 3000 / max(avgHes, 400))`**
7. **`fearScore = round(fear)`** then clamp to **[1, 100]**.

**Intuition:** slower average response nudges **patience** up and **impulsive** down; it also raises fear via `avgHes/900` but reduces it via the `3000/avgHes` term (very slow answers hit the `min` caps).

### Investor “cluster” (nearest centroid)

The engine builds a 4-vector (all in roughly \([0,1]\)):

| Component | Formula |
|-----------|---------|
| Fear dimension | `fearN = fearScore / 100` |
| Patience dimension | `patienceN = (patient + 2) / 6` |
| Impulse dimension | `impulseN = (impulsive + 2) / 6` |
| Planning dimension | `planN = (planning + 2) / 6` |

(`patient`, `impulsive`, `planning` here are the **clamped** trait values.)

Fixed centroids (same order: `[fearN, patienceN, impulseN, planN]`):

| Key | Centroid |
|-----|----------|
| `risk_averse` | `[0.78, 0.72, 0.22, 0.7]` |
| `balanced` | `[0.5, 0.5, 0.45, 0.5]` |
| `growth_seeker` | `[0.38, 0.42, 0.55, 0.42]` |
| `overconfident` | `[0.22, 0.28, 0.88, 0.25]` |

The assigned **`clusterKey`** is whichever centroid has **minimum Euclidean distance** to the user vector.

**Note:** `overconfident` and `leverage_comfort` traits affect the **derived** fear/patience/impulse/planning indirectly (only through answers and fear deltas), but **only these four dimensions** enter the centroid distance. `leverage_comfort` is used separately for suitability copy (below).

### Allocation bands (from `fearScore` only)

`allocationFromFearScore(fearScore)` returns stocks / bonds / cash:

| `fearScore` range | Stocks | Bonds | Cash | Label |
|-------------------|--------:|-----:|-----:|--------|
| < 28 | 78 | 17 | 5 | Aggressive growth mix |
| 28–44 | 62 | 28 | 10 | Growth tilt |
| 45–61 | 48 | 38 | 14 | Balanced |
| 62–77 | 32 | 48 | 20 | Conservative |
| ≥ 78 | 18 | 55 | 27 | Capital preservation |

### Suitability strings (simple rules)

- **Trading style:** if `impulsive > patient + 0.3` → active / shorter-horizon copy; else longer horizon / DCA copy.
- **Loans / policies:** if `leverage_comfort > 0.4` → more comfortable with loan comparison copy; else minimal leverage copy.

---

## Quick reference: which file owns what

| Quiz | Questions constant | Evaluation entrypoint |
|------|--------------------|-------------------------|
| Emotional Readiness | `EMOTION_QUESTIONS` | `evaluateEmotionMindset(answers)` |
| Decode Your Finance Self | `ASSESSMENT_QUESTIONS` | `buildAssessmentResult(answers, hesitationMs)` |
