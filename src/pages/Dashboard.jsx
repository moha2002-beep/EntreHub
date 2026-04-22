/**
 * Dashboard.jsx — Central user hub.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { getCompleteness } from "../utils/profileCompletedness";
import {
  listenToMentorBookings,
  listenToEntrepreneurBookings,
} from "../services/bookingService";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";
import { runDatabaseSeed } from "../utils/seedDatabase";

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    let retryCount = 0;

    const loadProfile = async () => {
      try {
        const data = await getUserProfile(user.uid);

        if (data) {
          setProfile(data);
          setLoadingProfile(false);
        } else if (retryCount < 2) {
          // If profile isn't found immediately, wait 800ms and retry
          retryCount++;
          setTimeout(loadProfile, 800);
        } else {
          // If still missing after retries, stop loading to show the Welcome screen
          setProfile(null);
          setLoadingProfile(false);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Could not load your profile.");
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  const [pendingCount, setPendingCount] = useState(0);

  /**
   * Subscribes to real-time booking updates for notification badges.
   */
  useEffect(() => {
    if (!profile) return;

    let unsub;

    const countPending = (bookings) => {
      setPendingCount(bookings.filter((b) => b.status === "pending").length);
    };
    // Show the skeleton loader while waiting/retrying for the profile to load
    if (loadingProfile) {
      return (
        <div className="page-shell">
          <Navbar />
          <div className="page-body page-entry">
            <div className="page-inner">
              <div className="spinner"></div>
              <p style={{ textAlign: "center", marginTop: "1rem" }}>
                Preparing your workspace...
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (profile.role === "mentor") {
      unsub = listenToMentorBookings(user.uid, countPending, console.error);
    } else if (profile.role === "entrepreneur") {
      unsub = listenToEntrepreneurBookings(
        user.uid,
        countPending,
        console.error,
      );
    }

    return () => unsub?.();
  }, [profile, user]);

  if (!user) return null;

  // Shimmering skeleton loader for premium UX
  if (loadingProfile) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-inner">
            <div
              className="dashboard-hero-card skeleton"
              style={{
                height: "160px",
                border: "none",
                marginBottom: "1.5rem",
              }}
            ></div>
            <div className="dashboard-grid">
              <div
                className="dashboard-card skeleton"
                style={{ height: "240px" }}
              ></div>
              <div
                className="dashboard-card skeleton"
                style={{ height: "240px" }}
              ></div>
            </div>
            <div className="dashboard-grid-3" style={{ marginTop: "1.5rem" }}>
              <div
                className="dashboard-card skeleton"
                style={{ height: "180px" }}
              ></div>
              <div
                className="dashboard-card skeleton"
                style={{ height: "180px" }}
              ></div>
              <div
                className="dashboard-card skeleton"
                style={{ height: "180px" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-inner">
            <div className="alert alert-error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-inner">
            <p>No profile found for this user.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName || user.displayName || "User";
  const role = profile.role || "user";

  const roleLabelMap = {
    entrepreneur: "Entrepreneur",
    investor: "Investor",
    mentor: "Mentor",
  };

  const roleLabel = roleLabelMap[role] || "Member";

  // Calculate completeness based on required profile fields
  const completeness = getCompleteness(profile);

  return (
    <div className="page-shell">
      <Navbar />

      <div className="page-body page-entry">
        <div className="page-inner">
          {/*  TEMPORARY DEV BUTTON: DELETE AFTER SEEDING  */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "1rem",
            }}
          >
            <button
              onClick={() => runDatabaseSeed()}
              className="btn btn-secondary"
            >
              🌱 Seed Test Data
            </button>
          </div>

          {/* Hero banner with premium avatar styling */}
          <section className="dashboard-hero-card">
            <div className="dashboard-hero-content">
              {profile.photoURL ? (
                <img
                  className="dashboard-hero-avatar"
                  src={profile.photoURL}
                  alt={displayName}
                />
              ) : (
                <div className="dashboard-hero-avatar dashboard-hero-avatar-placeholder">
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div className="dashboard-hero-text">
                <div className="dashboard-hero-title">
                  Welcome back, {displayName}
                </div>
                <p className="dashboard-hero-subtitle">
                  You are signed in as{" "}
                  <span className="dashboard-pill">{roleLabel}</span>.
                </p>
              </div>
            </div>
          </section>

          {/* Quick-action cards */}
          <div className="dashboard-grid">
            {/* Profile completeness card */}
            <div className="dashboard-card">
              <h2 className="dashboard-card-title">Profile</h2>
              <div className="dashboard-card-body">
                <strong>Completeness: {completeness.percent}%</strong>
                <div className="dashboard-progress" aria-hidden="true">
                  <div
                    className="dashboard-progress-bar"
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>

                {completeness.missing.length > 0 && (
                  <ul className="dashboard-meta-list">
                    {completeness.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                <div className="dashboard-action-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate("/profile?mode=edit")}
                  >
                    Complete profile
                  </button>
                </div>
              </div>
            </div>

            {/* Your role - dynamic suggestions based on user type */}
            <div className="dashboard-card">
              <h2 className="dashboard-card-title">Your role</h2>
              <div className="dashboard-card-body">
                <p style={{ marginBottom: "0.4rem" }}>
                  You&apos;re currently set up as <strong>{roleLabel}</strong>.
                </p>
                <div className="dashboard-chip-row">
                  {role === "entrepreneur" && (
                    <>
                      <span className="dashboard-chip">Idea validation</span>
                      <span className="dashboard-chip">Pitch practice</span>
                      <span className="dashboard-chip">Funding prep</span>
                    </>
                  )}
                  {role === "investor" && (
                    <>
                      <span className="dashboard-chip">Deal flow overview</span>
                      <span className="dashboard-chip">Founder access</span>
                    </>
                  )}
                  {role === "mentor" && (
                    <>
                      <span className="dashboard-chip">
                        Matchmaking preview
                      </span>
                      <span className="dashboard-chip">Session planning</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Grid */}
          <div className="dashboard-grid dashboard-grid-3">
            <div
              className="dashboard-card dashboard-card-link"
              onClick={() => navigate("/mentors")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/mentors")}
            >
              <h2 className="dashboard-card-title">Mentors</h2>
              <div className="dashboard-card-body">
                <p>Discover mentors matched to your profile and goals.</p>
              </div>
              <span className="dashboard-card-arrow">→</span>
            </div>

            <div
              className="dashboard-card dashboard-card-link"
              onClick={() => navigate("/bookings")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/bookings")}
            >
              <h2 className="dashboard-card-title">
                Bookings
                {pendingCount > 0 && (
                  <span className="dashboard-nav-badge">{pendingCount}</span>
                )}
              </h2>
              <div className="dashboard-card-body">
                <p>
                  {pendingCount > 0
                    ? `You have ${pendingCount} pending ${pendingCount === 1 ? "request" : "requests"}.`
                    : "View and manage your mentoring sessions."}
                </p>
              </div>
              <span className="dashboard-card-arrow">→</span>
            </div>

            <div
              className="dashboard-card dashboard-card-link"
              onClick={() => navigate("/community")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/community")}
            >
              <h2 className="dashboard-card-title">Community</h2>
              <div className="dashboard-card-body">
                <p>
                  Ask questions, share wins, and connect with the community.
                </p>
              </div>
              <span className="dashboard-card-arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
