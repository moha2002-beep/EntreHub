/**
 * formatRelativeTime
 *
 * Converts a Firestore Timestamp (or any Date-like object) to a
 * human-friendly relative string.
 *
 * Examples:
 *   < 60 seconds  → "just now"
 *   < 60 minutes  → "3m ago"
 *   < 24 hours    → "2h ago"
 *   < 7 days      → "5d ago"
 *   older         → locale date string (e.g. "12/04/2025")
 *
 * Firestore Timestamps have a .toDate() method that returns a JS Date.
 * We check for that first before falling back to new Date(timestamp).
 *
 * @param {import("firebase/firestore").Timestamp | Date | null} timestamp
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
