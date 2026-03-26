/**
 * matchScore.js
 *
 * Rule-based scoring function that quantifies how well a mentor matches
 * an entrepreneur's profile.
 * The score is a weighted sum of several components, each designed to capture a different aspect of compatibility.  The breakdown is returned
 * alongside the overall score for transparency and debugging.
 */

// ─── Weight table ────────────────────────────────────────────────────────────

export const WEIGHTS = {
  tagOverlap: { pointsEach: 6, maxMatches: 5, noData: 15 }, // max 30; 15 if entrepreneur has no interests
  stageAlign: { full: 30, partial: 15, mismatch: 10 }, // max 30; 10 even on explicit mismatch
  goalsMatch: { pointsEach: 4, maxMatches: 5, noData: 10 }, // max 20; 10 if entrepreneur has no goals
  experience: {
    // [minimumYears, pointsAwarded] — checked in order, first match wins
    tiers: [
      [10, 15],
      [5, 12],
      [1, 8],
    ],
    floor: 5, // all mentors earn at least this
  }, // max 15
  availability: { match: 5, unknown: 5 }, // max  5
};

export const MAX_SCORE = 100;

// ─── Internal helper ────────────────────────────────────────────────────────

/**
 * Normalises a Firestore field that can be a string ("a, b") or an array
 * (["a", "b"]) into a clean array of lowercase trimmed strings.
 */
function parseList(val) {
  if (!val) return [];
  const raw = Array.isArray(val) ? val : String(val).split(",");
  return raw.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * calculateMatchScore(mentor, entrepreneur)
 *
 * Returns:
 *   {
 *     score:     number  — 0–100, the overall percentage match
 *     breakdown: object  — per-component scores for transparency/debugging
 *   }
 *
 * If either argument is falsy, returns { score: 0, breakdown: {} }.
 */
export function calculateMatchScore(mentor, entrepreneur) {
  if (!mentor || !entrepreneur) return { score: 0, breakdown: {} };

  let total = 0;
  const breakdown = {};

  // ── Component 1: Interest–tag overlap (max 30) ────────────────────────
  // Compare entrepreneur's declared interests against mentor's expertise tags.
  // Each shared interest earns 6 pts, capped at 5 matches (30 pts total).
  // If the entrepreneur hasn't declared interests yet, award partial credit
  // (15 pts) — missing data is not the same as a confirmed mismatch.
  const entrepreneurInterests = parseList(entrepreneur.interests);
  const mentorTags = parseList(mentor.expertiseTags);

  let tagScore;
  let tagMatches = [];
  if (entrepreneurInterests.length === 0) {
    tagScore = WEIGHTS.tagOverlap.noData; // no interests set — give benefit of the doubt
  } else {
    tagMatches = entrepreneurInterests.filter((i) => mentorTags.includes(i));
    tagScore =
      Math.min(tagMatches.length, WEIGHTS.tagOverlap.maxMatches) *
      WEIGHTS.tagOverlap.pointsEach;
  }
  total += tagScore;
  breakdown.tagOverlap = { score: tagScore, max: 30, matched: tagMatches };

  // ── Component 2: Stage alignment (max 30) ─────────────────────────────
  // Mentors can declare which startup stages they prefer (idea/mvp/growth/
  // scaling).  A direct match earns full points.  If the mentor hasn't set
  // preferred stages they are treated as open to all stages (partial credit)
  // rather than penalised for an unfilled field.  Only an explicit mismatch
  // — mentor has stages set but the entrepreneur's stage isn't among them —
  // scores 0.
  const preferredStages = parseList(mentor.preferredStages);
  const currentStage = (entrepreneur.currentStage || "").toLowerCase();

  let stageScore;
  let stageLabel;
  if (preferredStages.length === 0) {
    // Mentor hasn't declared a preference — treat as "open to all"
    stageScore = WEIGHTS.stageAlign.partial;
    stageLabel = "open";
  } else if (currentStage && preferredStages.includes(currentStage)) {
    stageScore = WEIGHTS.stageAlign.full;
    stageLabel = "match";
  } else {
    stageScore = WEIGHTS.stageAlign.mismatch; // explicit mismatch — small partial credit
    stageLabel = "mismatch";
  }
  total += stageScore;
  breakdown.stageAlign = { score: stageScore, max: 30, result: stageLabel };

  // ── Component 3: Goals text match (max 20) ────────────────────────────
  // The entrepreneur's free-text goals are searched for each of the mentor's
  // tags.  Each found tag earns 4 pts, capped at 5 matches (20 pts total).
  // If the entrepreneur hasn't written goals yet, award partial credit (10 pts)
  // — an empty goals field should not eliminate an otherwise relevant mentor.
  const goalsText = (entrepreneur.goals || "").toLowerCase();
  let goalsScore;
  let goalsMatches = [];
  if (!goalsText) {
    goalsScore = WEIGHTS.goalsMatch.noData; // no goals set — give benefit of the doubt
  } else {
    goalsMatches = mentorTags.filter((t) => goalsText.includes(t));
    goalsScore =
      Math.min(goalsMatches.length, WEIGHTS.goalsMatch.maxMatches) *
      WEIGHTS.goalsMatch.pointsEach;
  }
  total += goalsScore;
  breakdown.goalsMatch = { score: goalsScore, max: 20, matched: goalsMatches };

  // ── Component 4: Experience tier (max 15) ─────────────────────────────
  // All mentors earn at least the floor score — being on the platform is
  // itself a signal.  Higher experience earns more, using tiers rather than
  // a linear scale (the jump from 0→1 year matters more than 15→16).
  const yoe = Number(mentor.yearsOfExperience) || 0;
  let expScore = WEIGHTS.experience.floor;
  for (const [minYears, pts] of WEIGHTS.experience.tiers) {
    if (yoe >= minYears) {
      expScore = pts;
      break;
    }
  }
  total += expScore;
  breakdown.experience = { score: expScore, max: 15, years: yoe };

  // ── Component 5: Availability alignment (max 5) ───────────────────────
  // Only scores 0 when both parties have explicitly set incompatible
  // availability (e.g. mentor = weekdays, entrepreneur = weekends).
  // If either side hasn't set a preference, we assume flexibility and award
  // the full 5 pts — an unknown preference is not a penalty.
  const mentorAvail = (mentor.availability || "").toLowerCase();
  const entrepreneurAvail = (entrepreneur.availabilityPref || "").toLowerCase();

  let availScore;
  if (!mentorAvail || !entrepreneurAvail) {
    availScore = WEIGHTS.availability.unknown; // at least one side not set — assume ok
  } else if (
    mentorAvail === "flexible" ||
    entrepreneurAvail === "flexible" ||
    mentorAvail === entrepreneurAvail
  ) {
    availScore = WEIGHTS.availability.match;
  } else {
    availScore = 0; // explicit mismatch
  }
  total += availScore;
  breakdown.availability = {
    score: availScore,
    max: 5,
    mentorAvail,
    entrepreneurAvail,
  };

  return {
    score: Math.min(total, MAX_SCORE), // clamp — should never exceed 100 by design
    breakdown,
  };
}

/**
 * hasEnoughProfileData(entrepreneurProfile)
 *
 * Returns true when the entrepreneur has filled in enough fields to
 * generate a meaningful score.  We require at least one of:
 *   • interests (drives components 1 & 2)
 *   • currentStage (drives component 3)
 *
 * If neither is set, every score will be 0 — not useful — so we show
 * a "Complete your profile" prompt instead.
 */
export function hasEnoughProfileData(profile) {
  if (!profile) return false;
  const hasInterests = parseList(profile.interests).length > 0;
  const hasStage = !!profile.currentStage;
  return hasInterests || hasStage;
}
