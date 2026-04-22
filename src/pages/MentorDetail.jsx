/**
 * MentorDetail.jsx — Detailed mentor profile and booking access.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import BookingCalendar from "../components/BookingCalendar";
import Navbar from "../components/Navbar";
import "../styles/Mentors.css";

function MentorDetail() {
  const { uid }    = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [mentor,          setMentor]          = useState(null);
  const [viewerProfile,   setViewerProfile]   = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  /**
   * Fetches the mentor's profile and the viewer's own profile in parallel.
   */
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

  // Loading / error states 

  if (loading) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="loading-state">
            <div className="spinner spinner-light" />
            <p className="loading-state-text">Loading mentor profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-inner-narrow">
            <button
              type="button"
              className="mentor-detail-back"
              onClick={() => navigate("/mentors")}
            >
              ← Back to mentors
            </button>
            <div className="empty-state">
              <div className="empty-state-icon">😕</div>
              <h2 className="empty-state-heading">Mentor not found</h2>
              <p className="empty-state-text">{error || "This mentor profile doesn't exist or has been removed."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derived values 

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

  //  Render 

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-body">
        <div className="mentor-detail-inner">

        <button
          type="button"
          className="mentor-detail-back"
          onClick={() => navigate("/mentors")}
        >
          ← Back to mentors
        </button>

        {/*  Profile card  */}
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

        {/*  Booking widget (entrepreneurs only)  */}
        {isSelf ? (
          // Mentor is viewing their own profile
          <div className="mentor-detail-card">
            <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", margin: 0 }}>
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
            <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", margin: 0 }}>
              Only entrepreneurs can book sessions with mentors.
            </p>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

export default MentorDetail;
