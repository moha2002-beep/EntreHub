import { useNavigate } from "react-router-dom";
import "../styles/Mentors.css";

/**
 * MentorCard — displays a summary of one mentor.
 *
 * Props:
 *   mentor  {object}  A Firestore user document with role === "mentor".
 *                     Expected fields: id, displayName, headline,
 *                     expertiseTags, availability, yearsOfExperience.
 */
function MentorCard({ mentor }) {
  const navigate = useNavigate();

  // Build initials from displayName (e.g. "Sarah Chen" → "SC")
  const initials = (mentor.displayName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // expertiseTags may be a string ("Product, Growth") or an array (["Product", "Growth"])
  const parseTags = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
    return String(val).split(",").map((t) => t.trim()).filter(Boolean);
  };
  const tags = parseTags(mentor.expertiseTags);

  const metaParts = [];
  if (mentor.yearsOfExperience) metaParts.push(`${mentor.yearsOfExperience} yrs exp`);
  if (mentor.availability) metaParts.push(mentor.availability);

  return (
    <div className="mentor-card">
      <div className="mentor-card-top">
        <div className="mentor-card-avatar">{initials}</div>
        <div>
          <div className="mentor-card-name">{mentor.displayName || "Unnamed mentor"}</div>
          {mentor.headline && (
            <p className="mentor-card-headline">{mentor.headline}</p>
          )}
        </div>
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
