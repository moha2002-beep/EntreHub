/**
 * moderation.js — Phase 6 placeholder.
 *
 * In Phase 6 this will call a Firebase Cloud Function that checks
 * submitted text against a profanity / moderation API before allowing
 * it to be written to Firestore.
 *
 * For now it always returns { safe: true } so posts and replies
 * can be submitted normally.
 *
 * @param {string} _text — the content to check (unused until Phase 6)
 * @returns {{ safe: boolean, reason?: string }}
 */
// eslint-disable-next-line no-unused-vars
export function moderateContent(_text) {
  return { safe: true };
}
