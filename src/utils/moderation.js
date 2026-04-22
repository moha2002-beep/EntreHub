/**
 * moderation.js — Content safety utilities.
 */

export const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "idiot",
  "moron",
  "stupid",
  "dumb",
  "loser",
  "trash",
  "garbage",
  "worthless",
  "scammer",
  "fraud",
  "spam",
  "jerk",
  "hate",
  "ugly",
  "useless",
];

// normalizeText 

/**
 * Normalises text to catch leetspeak, punctuation bypasses, and padding.
 */
export function normalizeText(text) {
  if (!text || typeof text !== "string") return "";

  let t = text.toLowerCase();

  // Step 1: Leetspeak
  t = t
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\+/g, "t")
    .replace(/7/g, "t");

  // Collapse runs of 3+ identical characters
  t = t.replace(/(.)\1{2,}/g, "$1");

  // Strip punctuation between word characters
  let prev;
  do {
    prev = t;
    t = t.replace(/([a-z0-9])[^a-z0-9]{1,3}([a-z0-9])/g, "$1$2");
  } while (t !== prev);

  return t;
}

// moderateContent 

/**
 * Checks text against blocklist. Matches raw and normalised versions.
 */
export function moderateContent(text) {
  if (!text || typeof text !== "string") {
    return { safe: true, flaggedWords: [] };
  }

  const normalised = normalizeText(text);

  const flaggedWords = BLOCKED_WORDS.filter((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(text) || regex.test(normalised);
  });

  return {
    safe: flaggedWords.length === 0,
    flaggedWords,
  };
}

// detectThreateningIntent 

const THREAT_PATTERNS = [
  /\bi('ll| will| am going to| am gonna| gonna)\s+(hurt|kill|harm|attack|destroy|murder|stab|shoot|beat|break)\s+you\b/i,
  /\byou\s+(are|'re)\s+dead\b/i,
  /\bwatch\s+your\s+back\b/i,
  /\bi('ll| will)\s+find\s+you\b/i,
  /\byou\s+(will|won't)\s+(regret|survive)\b/i,
  /\bmake\s+you\s+pay\b/i,
  /\bdo\s+not\s+mess\s+with\s+me\b/i,
];

/**
 * Scans for explicit threatening intent.
 */
export function detectThreateningIntent(text) {
  if (!text || typeof text !== "string") return { threatening: false };
  const threatening = THREAT_PATTERNS.some((pattern) => pattern.test(text));
  return { threatening };
}
