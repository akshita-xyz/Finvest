# Quiz calculations — specification

This document is the **authoritative reference** for scoring in the Finvest frontend. If question banks or constants change in code, update this file in the same change.

**Sources of truth**

- Emotional Readiness: [`FRONTEND/src/lib/emotionInvestingMindset.js`](../FRONTEND/src/lib/emotionInvestingMindset.js)
- Decode Your Finance Self (timed): [`FRONTEND/src/lib/personalizedPortfolioEngine.js`](../FRONTEND/src/lib/personalizedPortfolioEngine.js)

## Why this shape (theory)

- **Pillar scores** — Dimensions (regulation, FOMO, loss composure, etc.) are scored separately so feedback is **actionable** (“grow patience”) rather than one opaque number.
- **Normalization** — Raw sums are divided by per-pillar theoretical maxima so scales are comparable across pillars with different question weights.
- **Timed assessment** — Average hesitation feeds both **traits** (patience vs. impulsivity) and **fear** with caps, reflecting that very fast answers may indicate under-reading, and very slow ones may indicate anxiety—both useful signals in a **non-clinical** educational tool.

---

## 1. Emotional Readiness Test (Dashboard)

### Stored data

- Map **`questionId` → `optionId`** (e.g. `eq3` → `eq3a`).
- Only the selected option’s `scores` object counts; **no** time-based signal.

### Pillars

| Pillar key | Title |
|------------|--------|
| `emotionalRegulation` | Emotional regulation |
| `impulseFomo` | Impulse & FOMO |
| `lossComposure` | Composure after setbacks |
| `patienceLongTerm` | Patience & long-term view |
| `selfHonesty` | Self-honesty & motives |
| `balanceRecovery` | Balance & recovery |

### Per-question option scores

For each question, each option adds only the `scores` keys it defines (missing keys add 0).

| Question ID | Topic (short) | Option IDs | Pillar points (`scores`) |
|-------------|---------------|------------|---------------------------|
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
\text{raw}[k] = \sum_{\text{answered}} \text{selected option’s } \text{scores}[k] \ (\text{or } 0)
\]

### `PILLAR_MAX` (sum of per-question maxima)

| Pillar | `PILLAR_MAX` |
|--------|----------------|
| `emotionalRegulation` | 14 |
| `impulseFomo` | 8 |
| `lossComposure` | 5 |
| `patienceLongTerm` | 7 |
| `selfHonesty` | 13 |
| `balanceRecovery` | 11 |

\[
\text{percent}[k] = \text{round}\left(100 \times \frac{\text{raw}[k]}{\max(\text{PILLAR\_MAX}[k], 1)}\right)
\]

### Levels

- **`strong`**: `percent >= 72`
- **`grow`**: `percent < 48`
- **`watch`**: `48 <= percent < 72`

### Overall readiness

\[
\text{overallReadiness} = \text{round}\left(\frac{1}{6} \sum_{k} \text{percent}[k]\right)
\]

### Archetype (from overall only)

| Condition | Label |
|-----------|--------|
| `overallReadiness >= 78` | The Grounded Investor |
| `58 <= overallReadiness < 78` | The Growing Steward |
| `42 <= overallReadiness < 58` | The Cautious Learner |
| `overallReadiness < 42` | The Recovery-First Explorer |

### Closing copy

`closingAdvice` / `lookAfter` are **rule-based** from `improveAreas.length`, not from pillar percents beyond that.

---

## 2. Decode Your Finance Self (timed)

### Stored data

- **`answers`**: `questionId` → `optionId` for `ASSESSMENT_QUESTIONS` order.
- **`hesitationMs`**: one dwell time per question, same order as `ASSESSMENT_QUESTIONS`.

Entrypoints: `aggregateTraits`, `buildAssessmentResult` in `personalizedPortfolioEngine.js`.

### Options

- **`traits`**: only `patient`, `impulsive`, `overconfident`, `planning`, `leverage_comfort` are summed; other keys (e.g. `balanced`) are ignored for aggregation.
- **`fearDelta`**: added to a running fear score (starts at 50).

#### `decision_style`

| Option ID | Traits | `fearDelta` |
|-----------|--------|-------------|
| `read_first` | `patient +1`, `impulsive -0.8`, `planning +1` | `+8` |
| `facts_first` | `patient +0.5`, `impulsive -0.3`, `planning +0.6` | `+3` |
| `immediate` | `patient -0.9`, `impulsive +1`, `overconfident +0.7`, `planning -0.4` | `-10` |

#### `holding_period`

| Option ID | Traits | `fearDelta` |
|-----------|--------|-------------|
| `intraday` | `impulsive +0.6`, `overconfident +0.3` | `-12` |
| `months` | `patient +0.3` only | `+2` |
| `years` | `patient +1`, `planning +0.8` | `+10` |

#### `market_drop`

| Option ID | Traits | `fearDelta` |
|-----------|--------|-------------|
| `sell` | — | `+22` |
| `wait` | `patient +0.5` | `-4` |
| `buy` | `overconfident +0.4` | `-14` |
| `advisor` | `planning +0.7` | `+6` |

#### `credit_comfort`

| Option ID | Traits | `fearDelta` |
|-----------|--------|-------------|
| `prefer_loans` | `leverage_comfort +1` | `-5` |
| `neutral_credit` | `leverage_comfort +0.3` | `+4` |
| `avoid_debt` | `leverage_comfort -0.8`, `patient +0.3` | `+12` |

### Trait aggregation

Start traits at 0; sum contributions; **clamp** each to **[-2, 4]**.

### Fear score (answers + hesitation)

1. `fear = 50` + sum of `fearDelta` for chosen options.
2. `avgHes` = mean(`hesitationMs`) if length > 0, else **4000** ms.
3. `hesitationPatience` = `min(1, avgHes / 28000)`.
4. `patient += hesitationPatience * 0.9`; `impulsive += (1 - hesitationPatience) * 0.55` (then traits clamped as above).
5. `fear += min(18, avgHes / 900)`; `fear -= min(12, 3000 / max(avgHes, 400))`.
6. `fearScore = round(clamp(fear, 1, 100))`.

### Cluster (nearest centroid)

Vector: `[fearN, patienceN, impulseN, planN]` with  
`fearN = fearScore/100`, `patienceN = (patient+2)/6`, `impulseN = (impulsive+2)/6`, `planN = (planning+2)/6` (clamped traits).

| Key | Centroid `[fearN, patienceN, impulseN, planN]` |
|-----|-----------------------------------------------|
| `risk_averse` | `[0.78, 0.72, 0.22, 0.7]` |
| `balanced` | `[0.5, 0.5, 0.45, 0.5]` |
| `growth_seeker` | `[0.38, 0.42, 0.55, 0.42]` |
| `overconfident` | `[0.22, 0.28, 0.88, 0.25]` |

Assign **`clusterKey`** by minimum Euclidean distance.

### Allocation from `fearScore` only

| `fearScore` | Stocks | Bonds | Cash | Label |
|-------------|--------:|------:|-----:|--------|
| < 28 | 78 | 17 | 5 | Aggressive growth mix |
| 28–44 | 62 | 28 | 10 | Growth tilt |
| 45–61 | 48 | 38 | 14 | Balanced |
| 62–77 | 32 | 48 | 20 | Conservative |
| ≥ 78 | 18 | 55 | 27 | Capital preservation |

### Suitability copy (rules)

- Trading style: if `impulsive > patient + 0.3` → shorter-horizon copy; else DCA / longer horizon.
- Leverage: if `leverage_comfort > 0.4` → loan-comparison copy; else minimal leverage copy.

---

## API entrypoints

| Quiz | Constant | Function |
|------|----------|----------|
| Emotional Readiness | `EMOTION_QUESTIONS` | `evaluateEmotionMindset(answers)` |
| Decode Your Finance Self | `ASSESSMENT_QUESTIONS` | `buildAssessmentResult(answers, hesitationMs)` |
