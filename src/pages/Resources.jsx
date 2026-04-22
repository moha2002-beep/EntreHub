/**
 * Resources.jsx — Community-curated resource library.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, checkAccountStatus } from "../services/userService";
import {
  listenToResources,
  createResource,
  upvoteResource,
} from "../services/resourceService";
import { moderateContent, detectThreateningIntent } from "../utils/moderation";
import Navbar from "../components/Navbar";
import { formatRelativeTime } from "../utils/formatTime";
import "../styles/Resources.css";

const CATEGORIES = ["Article", "Tool", "Template", "Video", "Podcast", "Book"];

const CATEGORY_ICONS = {
  Article:  "📄",
  Tool:     "🛠️",
  Template: "📋",
  Video:    "🎥",
  Podcast:  "🎧",
  Book:     "📚",
};

const EMPTY_FORM = {
  title:       "",
  url:         "",
  description: "",
  category:    "Article",
};

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function ResourceCard({ resource, currentUserId, onUpvote }) {
  const hasVoted = (resource.upvotedBy || []).includes(currentUserId);

  return (
    <div className="resource-card">
      <div className="resource-card-top">
        <span className="resource-category-badge">
          {CATEGORY_ICONS[resource.category] || "📎"} {resource.category}
        </span>
        <button
          type="button"
          className={`resource-upvote${hasVoted ? " resource-upvote-active" : ""}`}
          onClick={() => onUpvote(resource.id)}
          title={hasVoted ? "Remove upvote" : "Upvote this resource"}
        >
          ▲ {resource.upvotes || 0}
        </button>
      </div>

      <a
        className="resource-title"
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {resource.title}
      </a>

      {resource.description && (
        <p className="resource-description">{resource.description}</p>
      )}

      <div className="resource-meta">
        <span className={`resource-author-role role-${resource.authorRole}`}>
          {resource.authorRole}
        </span>
        <span className="resource-author">by {resource.authorName}</span>
        <span className="resource-time">{formatRelativeTime(resource.createdAt)}</span>
      </div>
    </div>
  );
}

function Resources() {
  const { user } = useAuth();

  const [profile,         setProfile]         = useState(null);
  const [resources,       setResources]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [accountStatus,   setAccountStatus]   = useState(null);
  const [warnDismissed,   setWarnDismissed]   = useState(false);

  const [sortBy,          setSortBy]          = useState("new");
  const [activeCategory,  setActiveCategory]  = useState(null);

  const [showForm,        setShowForm]        = useState(false);
  const [formData,        setFormData]        = useState(EMPTY_FORM);
  const [formErrors,      setFormErrors]      = useState({});
  const [moderationError, setModerationError] = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitSuccess,   setSubmitSuccess]   = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setProfile).catch(console.error);
  }, [user]);

  /**
   * Checks account standing before allowing submissions.
   */
  useEffect(() => {
    if (!user) return;
    checkAccountStatus(user.uid)
      .then(setAccountStatus)
      .catch((err) => {
        console.error("Account status check failed:", err);
        setAccountStatus({ status: "active" });
      });
  }, [user]);

  useEffect(() => {
    const unsub = listenToResources(
      (data) => {
        setResources(data);
        setLoading(false);
      },
      (err) => {
        console.error("Resources listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  /**
   * Logic: Derived filtering and sorting performed client-side 
   * to minimize Firestore composite index requirements.
   */
  let displayed = [...resources];

  if (activeCategory) {
    displayed = displayed.filter((r) => r.category === activeCategory);
  }

  if (sortBy === "top") {
    displayed.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  }

  const handleUpvote = async (resourceId) => {
    try {
      await upvoteResource(resourceId, user.uid);
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
    if (moderationError) setModerationError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim())       errors.title = "Title is required.";
    if (!formData.url.trim())         errors.url   = "URL is required.";
    else if (!isValidUrl(formData.url)) errors.url = "Please enter a valid URL (https://...).";
    if (!formData.description.trim()) errors.description = "A short description is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Logic: Runs a client-side moderation sweep before calling service.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const textToCheck = `${formData.title} ${formData.description}`;
    const check  = moderateContent(textToCheck);
    const threat = detectThreateningIntent(textToCheck);
    const allFlagged = check.flaggedWords;

    if (!check.safe) {
      setModerationError(
        `Your resource contains restricted content: "${allFlagged.join('", "')}". Please edit before submitting.`
      );
      return;
    }
    if (threat.threatening) {
      setModerationError(
        "Your resource contains content that violates our Safety Guidelines. Please edit before submitting."
      );
      return;
    }

    setSubmitting(true);
    try {
      await createResource({
        ...formData,
        authorId:   user.uid,
        authorName: profile?.displayName || user.displayName || user.email,
        authorRole: profile?.role || "entrepreneur",
      });
      setFormData(EMPTY_FORM);
      setFormErrors({});
      setModerationError(null);
      setShowForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error("Submit failed:", err);
      if (err.code === "CONTENT_VIOLATION") {
        setModerationError(
          "Your content violates our Safety Guidelines and was not submitted. Repeated violations may affect your account."
        );
      } else {
        setFormErrors({ general: "Failed to submit. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isBanned    = accountStatus?.status === "banned";
  const isSuspended = accountStatus?.status === "suspended";

  return (
    <div className="page-shell">
      <Navbar />

      <div className="page-body page-entry">
        <div className="page-inner">

          <div className="page-header">
            <div>
              <h1 className="page-title">Resource Library</h1>
              <p className="page-subtitle">
                Community-curated articles, tools, and templates for founders.
              </p>
            </div>
            {!isBanned && !isSuspended && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { setShowForm((v) => !v); setSubmitSuccess(false); }}
              >
                {showForm ? "Cancel" : "+ Share a Resource"}
              </button>
            )}
          </div>

          {isBanned && (
            <div className="account-status-banner account-status-banned">
              <p className="account-status-title">Your account has been permanently banned from EntreHub.</p>
              {accountStatus.reason && (
                <p className="account-status-reason">Reason: {accountStatus.reason}</p>
              )}
            </div>
          )}

          {isSuspended && (
            <div className="account-status-banner account-status-suspended">
              <p className="account-status-title">Your account is suspended.</p>
              {accountStatus.until && (
                <p className="account-status-reason">
                  Until: {accountStatus.until.toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              )}
              <p className="account-status-contact">
                You can browse resources but cannot share until your suspension ends.
              </p>
            </div>
          )}

          {showForm && !isBanned && !isSuspended && (
            <div className="resource-form-card">
              <h2 className="resource-form-title">Share a Resource</h2>
              <form onSubmit={handleSubmit} noValidate>
                {formErrors.general && (
                  <div className="alert alert-error">{formErrors.general}</div>
                )}

                {moderationError && (
                  <div className="moderation-warning">
                    <p>{moderationError}</p>
                    <button
                      type="button"
                      className="moderation-warning-dismiss"
                      onClick={() => setModerationError(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="res-title">Title *</label>
                  <input
                    id="res-title"
                    name="title"
                    className="form-input"
                    type="text"
                    placeholder="e.g. The Lean Startup"
                    value={formData.title}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                  {formErrors.title && <span className="form-error">{formErrors.title}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="res-url">URL *</label>
                  <input
                    id="res-url"
                    name="url"
                    className="form-input"
                    type="url"
                    placeholder="https://..."
                    value={formData.url}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                  {formErrors.url && <span className="form-error">{formErrors.url}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="res-description">Description *</label>
                  <textarea
                    id="res-description"
                    name="description"
                    className="form-textarea"
                    placeholder="What is this resource about?"
                    rows={3}
                    value={formData.description}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                  {formErrors.description && (
                    <span className="form-error">{formErrors.description}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="res-category">Category</label>
                  <select
                    id="res-category"
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleFormChange}
                    disabled={submitting}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="resource-form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !!moderationError}
                  >
                    {submitting ? "Sharing..." : "Share Resource"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setShowForm(false); setFormData(EMPTY_FORM); setFormErrors({}); setModerationError(null); }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="resource-controls">
            <div className="resource-sort">
              {["new", "top"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`resource-sort-btn${sortBy === s ? " resource-sort-btn-active" : ""}`}
                  onClick={() => setSortBy(s)}
                >
                  {s === "new" ? "New" : "Top"}
                </button>
              ))}
            </div>

            <div className="resource-categories">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`resource-cat-btn${activeCategory === cat ? " resource-cat-btn-active" : ""}`}
                  onClick={() => setActiveCategory((prev) => prev === cat ? null : cat)}
                >
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="resource-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="resource-card skeleton" style={{ height: '200px', border: 'none' }}></div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h2 className="empty-state-heading">
                {activeCategory ? `No ${activeCategory} resources yet` : "No resources yet"}
              </h2>
              <p className="empty-state-text">
                {activeCategory
                  ? "Try a different category, or be the first to share one!"
                  : "Be the first to share a useful resource with the community!"}
              </p>
            </div>
          ) : (
            <div className="resource-grid">
              {displayed.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  currentUserId={user.uid}
                  onUpvote={handleUpvote}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Resources;
