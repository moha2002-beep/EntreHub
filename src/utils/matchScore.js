/**
 * matchScore.js — Rule-based scoring for mentor/entrepreneur matching.
 * 
 * Transparent scoring (0-100) based on five weighted components:
 * 1. Interest-tag overlap (30 pts)
 * 2. Stage alignment (30 pts)
 * 3. Goals text match (20 pts)
 * 4. Experience tier (15 pts)
 * 5. Availability (5 pts)
 */

export const WEIGHTS = {
  tagOverlap: { pointsEach: 6, maxMatches: 5, noData: 15 },
  stageAlign: { full: 30, partial: 15, mismatch: 10 },
  goalsMatch: { pointsEach: 4, maxMatches: 5, noData: 10 },
  experience: {
    tiers: [
      [10, 15],
      [5,  12],
      [1,   8],
    ],
    floor: 5,
  },
  availability: { match: 5, unknown: 5 },
};

export const MAX_SCORE = 100;

// Internal helper 

function parseList(val) {
  if (!val) return [];
  const raw = Array.isArray(val) ? val : String(val).split(",");
  return raw.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

//  Main export 

/**
 * Returns an overall percentage match score and per-component breakdown.
 */
export function calculateMatchScore(mentor, entrepreneur) {
  if (!mentor || !entrepreneur) return { score: 0, breakdown: {} };

  let total = 0;
  const breakdown = {};

  // 1. Interest–tag overlap
  const entrepreneurInterests = parseList(entrepreneur.interests);
  const mentorTags = parseList(mentor.expertiseTags);

  let tagScore;
  let tagMatches = [];
  if (entrepreneurInterests.length === 0) {
    tagScore = WEIGHTS.tagOverlap.noData;
  } else {
    tagMatches = entrepreneurInterests.filter((i) => mentorTags.includes(i));
    tagScore =
      Math.min(tagMatches.length, WEIGHTS.tagOverlap.maxMatches) *
      WEIGHTS.tagOverlap.pointsEach;
  }
  total += tagScore;
  breakdown.tagOverlap = { score: tagScore, max: 30, matched: tagMatches };

  // 2. Stage alignment
  const preferredStages = parseList(mentor.preferredStages);
  const currentStage = (entrepreneur.currentStage || "").toLowerCase();

  let stageScore;
  let stageLabel;
  if (preferredStages.length === 0) {
    stageScore = WEIGHTS.stageAlign.partial;
    stageLabel = "open";
  } else if (currentStage && preferredStages.includes(currentStage)) {
    stageScore = WEIGHTS.stageAlign.full;
    stageLabel = "match";
  } else {
    stageScore = WEIGHTS.stageAlign.mismatch;
    stageLabel = "mismatch";
  }
  total += stageScore;
  breakdown.stageAlign = { score: stageScore, max: 30, result: stageLabel };

  // 3. Goals text match
  const goalsText = (entrepreneur.goals || "").toLowerCase();
  let goalsScore;
  let goalsMatches = [];
  if (!goalsText) {
    goalsScore = WEIGHTS.goalsMatch.noData;
  } else {
    goalsMatches = mentorTags.filter((t) => goalsText.includes(t));
    goalsScore =
      Math.min(goalsMatches.length, WEIGHTS.goalsMatch.maxMatches) *
      WEIGHTS.goalsMatch.pointsEach;
  }
  total += goalsScore;
  breakdown.goalsMatch = { score: goalsScore, max: 20, matched: goalsMatches };

  // 4. Experience tier
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

  // 5. Availability alignment
  const mentorAvail = (mentor.availability || "").toLowerCase();
  const entrepreneurAvail = (entrepreneur.availabilityPref || "").toLowerCase();

  let availScore;
  if (!mentorAvail || !entrepreneurAvail) {
    availScore = WEIGHTS.availability.unknown;
  } else if (
    mentorAvail === "flexible" ||
    entrepreneurAvail === "flexible" ||
    mentorAvail === entrepreneurAvail
  ) {
    availScore = WEIGHTS.availability.match;
  } else {
    availScore = 0;
  }
  total += availScore;
  breakdown.availability = { score: availScore, max: 5, mentorAvail, entrepreneurAvail };

  return {
    score: Math.min(total, MAX_SCORE),
    breakdown,
  };
}

/**
 * Ensures entrepreneur has enough data for a meaningful match.
 */
export function hasEnoughProfileData(profile) {
  if (!profile) return false;
  const hasInterests = parseList(profile.interests).length > 0;
  const hasStage = !!profile.currentStage;
  return hasInterests || hasStage;
}
