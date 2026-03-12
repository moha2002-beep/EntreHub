import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserProfile } from "../services/userService";
import "../styles/Mentors.css";

/**
 * MentorDetail — full profile view for a single mentor.
 *
 * URL param: /mentor/:uid
 * The :uid comes from the mentor's Firestore document ID (= their Firebase Auth uid).
 */
function MentorDetail() {
  const { uid } = useParams();     // read :uid from the URL
  const navigate = useNavigate();

  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserProfile(uid);
        if (!data) {
          setError("Mentor not found.");
        } else {
          setMentor(data);
        }
      } catch (err) {
        console.error("Failed to load mentor:", err);
        setError("Could not load this mentor's profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [uid]);

  if (loading) {
    return (
      <div className="mentor-detail-page">
        <div className="mentor-detail-inner">
          <p className="mentor-empty">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="mentor-detail-page">
        <div className="mentor-detail-inner">
          <button
            type="button"
            className="mentor-detail-back"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to mentors
          </button>
          <p className="mentor-empty">{error || "Mentor not found."}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="mentor-detail-page">
      <div className="mentor-detail-inner">
        <button
          type="button"
          className="mentor-detail-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to mentors
        </button>

        <div className="mentor-detail-card">
          <div className="mentor-detail-header">
            <div className="mentor-detail-avatar">{initials}</div>
            <div>
              <h1 className="mentor-detail-name">
                {mentor.displayName || "Unnamed mentor"}
              </h1>
              {mentor.headline && (
                <p className="mentor-detail-headline">{mentor.headline}</p>
              )}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mentor-detail-section">
              <div className="mentor-detail-label">Expertise</div>
              <div className="mentor-detail-tags">
                {tags.map((tag) => (
                  <span key={tag} className="mentor-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {mentor.availability && (
            <div className="mentor-detail-section">
              <div className="mentor-detail-label">Availability</div>
              <div className="mentor-detail-value">{mentor.availability}</div>
            </div>
          )}

          {mentor.yearsOfExperience && (
            <div className="mentor-detail-section">
              <div className="mentor-detail-label">Years of experience</div>
              <div className="mentor-detail-value">{mentor.yearsOfExperience}</div>
            </div>
          )}

          {mentor.email && (
            <div className="mentor-detail-section">
              <div className="mentor-detail-label">Email</div>
              <div className="mentor-detail-value">{mentor.email}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MentorDetail;
