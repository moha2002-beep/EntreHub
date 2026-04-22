/**
 * CreatePost.jsx — Post composition with moderation gates.
 */

import { useEffect, useState } from "react";
import { createPost } from "../services/postService";
import { checkAccountStatus } from "../services/userService";
import { moderateContent } from "../utils/moderation";
import "../styles/Community.css";

const CATEGORIES = [
  "Ask a Mentor",
  "Share a Win",
  "Resource Request",
  "Idea Feedback",
  "General",
];

function CreatePost({ authorId, authorName, authorRole }) {
  const [title, setTitle]               = useState("");
  const [body, setBody]                 = useState("");
  const [category, setCategory]         = useState("");
  const [error, setError]               = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  const [accountStatus, setAccountStatus] = useState(null);
  const [warnDismissed, setWarnDismissed] = useState(false);
  const [moderationError, setModerationError] = useState(null);

  useEffect(() => {
    if (!authorId) return;
    checkAccountStatus(authorId)
      .then(setAccountStatus)
      .catch((err) => {
        console.error("Account status check failed:", err);
        setAccountStatus({ status: "active" });
      });
  }, [authorId]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (moderationError) setModerationError(null);
  };
  const handleBodyChange = (e) => {
    setBody(e.target.value);
    if (moderationError) setModerationError(null);
  };

  /**
   * Runs client-side validation and moderation before submit.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setModerationError(null);

    if (!title.trim() || !body.trim() || !category) {
      setError("Please fill in all fields before posting.");
      return;
    }

    const titleCheck = moderateContent(title);
    const bodyCheck  = moderateContent(body);
    const allFlagged = [...new Set([...titleCheck.flaggedWords, ...bodyCheck.flaggedWords])];

    if (allFlagged.length > 0) {
      setModerationError(
        `Your post contains restricted content: "${allFlagged.join('", "')}". Please edit before submitting.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await createPost({
        title: title.trim(),
        body: body.trim(),
        category,
        authorId,
        authorName,
        authorRole,
      });
      setTitle("");
      setBody("");
      setCategory("");
    } catch (err) {
      console.error("Failed to create post:", err);
      if (err.code === "CONTENT_VIOLATION") {
        setModerationError(
          "Your content violates our Safety Guidelines and was not submitted. Repeated violations may affect your account."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Layer 1: Account status gates 
  // Still loading — render nothing yet (avoids flash of the form before
  // we know whether the user is banned/suspended).
  if (!accountStatus) return null;

  // Banned — replace the form entirely with a permanent message
  if (accountStatus.status === "banned") {
    return (
      <div className="account-status-banner account-status-banned">
        <p className="account-status-title">Your account has been permanently banned from EntreHub.</p>
        {accountStatus.reason && (
          <p className="account-status-reason">Reason: {accountStatus.reason}</p>
        )}
        <p className="account-status-contact">
          Please contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  // Suspended — show the form in a disabled state with a clear message
  const isSuspended = accountStatus.status === "suspended";

  return (
    <form className="create-post" onSubmit={handleSubmit} noValidate>
      <h2 className="create-post-heading">Start a conversation</h2>

      {/* Suspension banner — replaces normal form access */}
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
          {accountStatus.reason && (
            <p className="account-status-reason">Reason: {accountStatus.reason}</p>
          )}
          <p className="account-status-contact">
            You can read the community but cannot post until your suspension ends.
          </p>
        </div>
      )}

      {/* Warning banner — dismissable, form still usable */}
      {accountStatus.status === "warned" && !warnDismissed && (
        <div className="account-status-banner account-status-warned">
          <p className="account-status-title">
            Your account has received a warning. Further violations may result in suspension.
          </p>
          <button
            type="button"
            className="account-status-dismiss"
            onClick={() => setWarnDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General submit error */}
      {error && <p className="create-post-error">{error}</p>}

      {/* Moderation warning — shown when blocked words are found */}
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

      <div className="create-post-field">
        <label className="create-post-label" htmlFor="post-title">
          Title
        </label>
        <input
          id="post-title"
          type="text"
          className="create-post-input"
          value={title}
          onChange={handleTitleChange}
          placeholder="What's on your mind?"
          maxLength={120}
          disabled={isSuspended}
        />
      </div>

      <div className="create-post-field">
        <label className="create-post-label" htmlFor="post-body">
          Body
        </label>
        <textarea
          id="post-body"
          className="create-post-textarea"
          value={body}
          onChange={handleBodyChange}
          placeholder="Share more detail..."
          rows={4}
          disabled={isSuspended}
        />
      </div>

      <div className="create-post-field">
        <label className="create-post-label" htmlFor="post-category">
          Category
        </label>
        <select
          id="post-category"
          className="create-post-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isSuspended}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="create-post-footer">
        <button
          type="submit"
          className="create-post-submit"
          disabled={submitting || isSuspended || !!moderationError}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

export default CreatePost;
