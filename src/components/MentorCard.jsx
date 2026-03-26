import { useNavigate } from "react-router-dom";
import "../styles/Mentors.css";

/**
 * MentorCard — displays a summary of one mentor.
 *
 * Props:
 *   mentor  {object}        A Firestore user document with role === "mentor".
 *   score   {number|null}   0–100 match score, or null when no score is
 *                           available (non-entrepreneur viewer / incomplete
 *                           entrepreneur profile).
 */
function MentorCard({ mentor, score }) {
  const navigate = useNavigate();

  const initials = (mentor.displayName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const parseTags = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
    return String(val).split(",").map((t) => t.trim()).filter(Boolean);
  };
  const tags = parseTags(mentor.expertiseTags);

  const metaParts = [];
  if (mentor.yearsOfExperience) metaParts.push(`${mentor.yearsOfExperience} yrs exp`);
  if (mentor.availability)      metaParts.push(mentor.availability);

  // ── Match badge ──────────────────────────────────────────────────────────
  // score === null  → user is not an entrepreneur, or profile is incomplete
  // score === 0–100 → show badge with colour based on score tier
  //
  // Colour tiers (defined in brief):
  //   ≥ 70  green  — strong match
  //   ≥ 40  amber  — partial match
  //   < 40  red    — low match
  const showBadge  = score !== null && score !== undefined;
  const badgeClass = !showBadge      ? ""
    : score >= 70                    ? "mentor-score-badge-green"
    : score >= 40                    ? "mentor-score-badge-amber"
    :                                  "mentor-score-badge-red";

  return (
    <div className="mentor-card">
      <div className="mentor-card-top">

        {/* Avatar */}
        <div className="mentor-card-avatar">
          {mentor.photoURL ? (
            <img
              src={mentor.photoURL}
              alt={`${mentor.displayName || "Mentor"}'s avatar`}
              className="mentor-card-avatar-img"
            />
          ) : (
            initials
          )}
        </div>

        {/* Name + headline — flex: 1 pushes the badge to the right */}
        <div className="mentor-card-info">
          <div className="mentor-card-name">{mentor.displayName || "Unnamed mentor"}</div>
          {mentor.headline && (
            <p className="mentor-card-headline">{mentor.headline}</p>
          )}
        </div>

        {/* Match badge */}
        {showBadge && (
          <span className={`mentor-score-badge ${badgeClass}`}>
            {score}%
            <span className="mentor-score-badge-label">match</span>
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mentor-card-tags">
          {tags.map((tag) => (
            <span key={tag} className="mentor-tag">{tag}</span>
          ))}
        </div>
      )}

      {metaParts.length > 0 && (
        <p className="mentor-card-meta">{metaParts.join(" · ")}</p>
      )}

      <button
        type="button"
        className="mentor-card-btn"
        onClick={() => navigate(`/mentor/${mentor.id}`)}
      >
        View profile
      </button>
    </div>
  );
}

export default MentorCard;
