/**
 * Navbar.jsx — Shared navigation with responsive menu and user dropdown.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { logoutUser } from "../services/authService";
import "../styles/Navbar.css";

const NAV_LINKS = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/mentors",   label: "Mentors" },
  { path: "/bookings",  label: "Bookings" },
  { path: "/community", label: "Community" },
  { path: "/resources", label: "Resources" },
];

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile]       = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setProfile).catch(console.error);
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) navigate("/login", { replace: true });
  };

  const displayName = profile?.displayName || user?.displayName || "User";
  const roleLabel = { entrepreneur: "Entrepreneur", mentor: "Mentor", investor: "Investor" }[profile?.role] || "Member";

  // Generate initials for placeholder avatar
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /**
   * Helper to determine if a link is active.
   * Matches nested routes for better navigation feedback.
   */
  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <button
          type="button"
          className="navbar-logo"
          onClick={() => navigate("/dashboard")}
        >
          Entre<span className="navbar-logo-accent">Hub</span>
          <span className="navbar-slogan">Connect. Create. Accelerate.</span>
        </button>

        {/* Desktop nav links */}
        <div className="navbar-links">
          {NAV_LINKS.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`navbar-link${isActive(link.path) ? " navbar-link-active" : ""}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right side: user menu + mobile hamburger */}
        <div className="navbar-right">
          {/* User dropdown with dynamic profile data */}
          <div className="navbar-user" ref={dropdownRef}>
            <button
              type="button"
              className="navbar-avatar-btn"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={displayName}
                  className="navbar-avatar-img"
                />
              ) : (
                <span className="navbar-avatar-initials">{initials}</span>
              )}
            </button>

            {dropdownOpen && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-header">
                  <div className="navbar-dropdown-name">{displayName}</div>
                  <div className="navbar-dropdown-role">{roleLabel}</div>
                </div>
                <div className="navbar-dropdown-divider" />
                <button
                  type="button"
                  className="navbar-dropdown-item"
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="navbar-dropdown-item"
                  onClick={() => navigate("/bookings")}
                >
                  My Bookings
                </button>
                <div className="navbar-dropdown-divider" />
                <button
                  type="button"
                  className="navbar-dropdown-item navbar-dropdown-item-danger"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="navbar-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span className={`navbar-hamburger-bar${mobileOpen ? " open" : ""}`} />
            <span className={`navbar-hamburger-bar${mobileOpen ? " open" : ""}`} />
            <span className={`navbar-hamburger-bar${mobileOpen ? " open" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay - revealed via hamburger */}
      {mobileOpen && (
        <div className="navbar-mobile">
          {NAV_LINKS.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`navbar-mobile-link${isActive(link.path) ? " navbar-mobile-link-active" : ""}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
          <div className="navbar-dropdown-divider" />
          <button
            type="button"
            className="navbar-mobile-link"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
          <button
            type="button"
            className="navbar-mobile-link navbar-dropdown-item-danger"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
