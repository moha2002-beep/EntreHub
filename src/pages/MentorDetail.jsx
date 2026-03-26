/**
 * MentorDetail.jsx
 *
 * Full profile view for a single mentor, accessed via /mentor/:uid.
 *
 * Two new additions beyond the original design:
 *   1. Hourly rate, availability window, and years of experience displayed
 *      alongside the other profile fields.
 *   2. BookingCalendar embedded at the bottom — but ONLY if the logged-in
 *      user is an entrepreneur.  Mentors and investors see the profile
 *      information but not the booking widget.
 *
 * Teaching point — role-gated UI:
 *   We fetch the current viewer's own profile (getUserProfile(user.uid))
 *   to determine their role.  This check happens client-side: the data is
 *   already in Firestore and doesn't require an extra network call because
 *   it would have been loaded during Dashboard mount.  In a real app you'd
 *   cache this in context; here the extra fetch is acceptable and keeps the
 *   component self-contained for teaching purposes.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import BookingCalendar from "../components/BookingCalendar";
import "../styles/Mentors.css";

function MentorDetail() {
  const { uid }    = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [mentor,          setMentor]          = useState(null);
  const [viewerProfile,   setViewerProfile]   = useState(null); // current user's own profile
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // Fetch both the mentor's profile AND the current user's profile in parallel.
  // Promise.all() fires both requests simultaneously — faster than sequencing them.
  useEffect(() => {
    if (!uid || !user) return;

    const load = async () => {
      try {
        const [mentorData, viewerData] = await Promise.all([
          getUserProfile(uid),
          getUserProfile(user.uid),
        ]);

        if (!mentorData) {
          setError("Mentor not found.");
        } else {
          setMentor(mentorData);
        }

        setViewerProfile(viewerData);
      } catch (err) {
        console.error("Failed to load mentor:", err);
        setError("Could not load this mentor's profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [uid, user]);

  // ── Loading / error states ──────────────────────────────────────────────

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

  // ── Derived values ──────────────────────────────────────────────────────

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

  // Format hourly rate: "$120 / hr"  or  "Free"
  const rateLabel =
    mentor.hourlyRate && mentor.hourlyRate > 0
      ? `£${Number(mentor.hourlyRate).toLocaleString()} / hr`
      : "Free";

  // Format availability window: "09:00 – 17:00" (or nothing if not set)
  const hoursLabel =
    mentor.availabilityHoursStart && mentor.availabilityHoursEnd
      ? `${mentor.availabilityHoursStart} – ${mentor.availabilityHoursEnd}`
      : null;

  // Only show the booking calendar to entrepreneurs
  // (mentors booking themselves, or investors, see an info note instead)
  const isEntrepreneur = viewerProfile?.role === "entrepreneur";
  const isSelf         = user?.uid === uid; // mentor viewing their own profile

  // ── Render ──────────────────────────────────────────────────────────────

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

        {/* ── Profile card ── */}
        <div className="mentor-detail-card">

          {/* Header: avatar + name + headline */}
          <div className="mentor-detail-header">
            <div className="mentor-detail-avatar">
              {mentor.photoURL ? (
                <img
                  src={mentor.photoURL}
                  alt={`${mentor.displayName || "Mentor"}'s avatar`}
                  className="mentor-detail-avatar-img"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <h1 className="mentor-detail-name">
                {mentor.displayName || "Unnamed mentor"}
              </h1>
              {mentor.headline && (
                <p className="mentor-detail-headline">{mentor.headline}</p>
              )}
            </div>
          </div>

          {/* Expertise tags */}
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

          {/* Rate — new field */}
          <div className="mentor-detail-section">
            <div className="mentor-detail-label">Hourly rate</div>
            <div className="mentor-detail-value mentor-detail-rate">{rateLabel}</div>
          </div>

          {/* Availability days */}
          {mentor.availability && (
            <div className="mentor-detail-section">
              <div className="mentor-detail-label">Available days</div>
              <div className="mentor-detail-value" style={{ textTransform: "capitalize" }}>
                {mentor.availability}
              </div>
            </div>
          )}

          {/* Availability hours — new field */}
          {hoursLabel && (
            <div className="mentor-detail-section">
              <div className="mentor-detail-label">Session hours</div>
              <div className="mentor-detail-value">{hoursLabel}</div>
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

        {/* ── Booking widget (entrepreneurs only) ── */}
        {isSelf ? (
          // Mentor is viewing their own profile
          <div className="mentor-detail-card">
            <p style={{ color: "#475569", fontSize: "0.9rem", margin: 0 }}>
              This is your mentor profile. Entrepreneurs will see a booking
              calendar here.
            </p>
          </div>
        ) : isEntrepreneur ? (
          // Entrepreneur viewing a mentor's profile — show the calendar
          <div className="mentor-detail-card">
            <h2
              className="mentor-detail-name"
              style={{ fontSize: "1.1rem", marginBottom: "1rem" }}
            >
              Book a session with {mentor.displayName}
            </h2>
            <BookingCalendar mentor={mentor} />
          </div>
        ) : (
          // Investor or other role — informational note
          <div className="mentor-detail-card">
            <p style={{ color: "#475569", fontSize: "0.9rem", margin: 0 }}>
              Only entrepreneurs can book sessions with mentors.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default MentorDetail;
