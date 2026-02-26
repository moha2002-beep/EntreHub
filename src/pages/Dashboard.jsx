import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { getUserProfile } from "../services/userService";
import { logoutUser } from "../services/authService";
import "../styles/Dashboard.css";

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const data = await getUserProfile(user.uid);
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Could not load your profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      navigate("/login", { replace: true });
    } else {
      console.error("Logout failed:", result.error);
    }
  };

  if (!user) return <p>You are not signed in.</p>;
  if (loadingProfile) return <p>Loading dashboard...</p>;
  if (error) return <p>{error}</p>;
  if (!profile) return <p>No profile found for this user.</p>;

  const displayName = profile.displayName || user.displayName || "User";
  const role = profile.role || "user";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabelMap = {
    entrepreneur: "Entrepreneur",
    investor: "Investor",
    mentor: "Mentor",
  };

  const roleLabel = roleLabelMap[role] || "Member";

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-logo">EntreHub</div>

        <nav className="dashboard-nav">
          <button
            type="button"
            className={
              "dashboard-nav-link" +
              (activeSection === "overview" ? " dashboard-nav-link-active" : "")
            }
            onClick={() => setActiveSection("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={
              "dashboard-nav-link" +
              (activeSection === "profile" ? " dashboard-nav-link-active" : "")
            }
            onClick={() => setActiveSection("profile")}
          >
            Profile
          </button>
          <button
            type="button"
            className={
              "dashboard-nav-link" +
              (activeSection === "mentors" ? " dashboard-nav-link-active" : "")
            }
            onClick={() => setActiveSection("mentors")}
          >
            Mentors
          </button>
          <button
            type="button"
            className={
              "dashboard-nav-link" +
              (activeSection === "resources"
                ? " dashboard-nav-link-active"
                : "")
            }
            onClick={() => setActiveSection("resources")}
          >
            Resources
          </button>
          <button
            type="button"
            className={
              "dashboard-nav-link" +
              (activeSection === "community"
                ? " dashboard-nav-link-active"
                : "")
            }
            onClick={() => setActiveSection("community")}
          >
            Community
          </button>
        </nav>

        <div className="dashboard-user">
          <div className="dashboard-avatar">{initials}</div>
          <div>
            <div>{displayName}</div>
            <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              {roleLabel}
            </div>
          </div>
          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Hero / Overview banner */}
          <section className="dashboard-hero-card">
            <div className="dashboard-hero-title">
              Welcome back, {displayName}
            </div>
            <p className="dashboard-hero-subtitle">
              You are signed in as{" "}
              <span className="dashboard-pill">{roleLabel}</span>.
            </p>
          </section>

          {/* Section content */}
          {activeSection === "overview" && (
            <section className="dashboard-grid">
              <div className="dashboard-card">
                <h2 className="dashboard-card-title">Getting started</h2>
                <div className="dashboard-card-body">
                  <p>
                    This is your EntreHub dashboard. Use the navigation above to
                    access your profile, mentors, resources, and the community
                    feed.
                  </p>
                  <ul className="dashboard-meta-list">
                    <li>Profile: review your basic information</li>
                    <li>Mentors: discover guidance tailored to your role</li>
                    <li>Resources: curated content to help you grow</li>
                    <li>Community: stay updated with the latest activity</li>
                  </ul>
                </div>
              </div>

              <div className="dashboard-card">
                <h2 className="dashboard-card-title">Your role</h2>
                <div className="dashboard-card-body">
                  <p style={{ marginBottom: "0.4rem" }}>
                    You&apos;re currently set up as <strong>{roleLabel}</strong>
                    .
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
                        <span className="dashboard-chip">
                          Deal flow overview
                        </span>
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
                    {role !== "entrepreneur" &&
                      role !== "investor" &&
                      role !== "mentor" && (
                        <span className="dashboard-chip">Member</span>
                      )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "profile" && (
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Profile</h2>
              <div className="dashboard-card-body">
                <p>
                  Name: <strong>{displayName}</strong>
                </p>
                <p>
                  Email: <strong>{profile.email || user.email}</strong>
                </p>
                <p>
                  Role: <strong>{roleLabel}</strong>
                </p>
                <p style={{ marginTop: "0.7rem" }}>
                  Profile editing and additional details will appear here.
                </p>
              </div>
            </section>
          )}

          {activeSection === "mentors" && (
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Mentors</h2>
              <div className="dashboard-card-body">
                <p>
                  A curated list of mentors and suggested matches for your role
                  will appear here.
                </p>
              </div>
            </section>
          )}

          {activeSection === "resources" && (
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Resources</h2>
              <div className="dashboard-card-body">
                <p>
                  Learning paths, templates, and recommended resources will be
                  surfaced here based on your role.
                </p>
              </div>
            </section>
          )}

          {activeSection === "community" && (
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Community feed</h2>
              <div className="dashboard-card-body">
                <p>
                  Community updates, founder stories, and discussions will show
                  here in a future iteration.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
