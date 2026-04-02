import { useState } from "react";
import { createPost } from "../services/postService";
import { moderateContent } from "../utils/moderation";
import "../styles/Community.css";

const CATEGORIES = [
  "Ask a Mentor",
  "Share a Win",
  "Resource Request",
  "Idea Feedback",
  "General",
];

/**
 * CreatePost — inline form for composing a new community post.
 *
 * Always visible at the top of the Community feed (not hidden behind
 * a button) so users are immediately invited to contribute.
 *
 * Props:
 *   authorId   {string}  uid of the logged-in user
 *   authorName {string}  display name shown on the post
 *   authorRole {string}  'mentor' | 'entrepreneur' | 'investor'
 *
 * Validation:
 *   All three fields (title, body, category) are required.
 *   Content is run through moderateContent() before submission —
 *   currently a Phase 6 placeholder that always returns { safe: true }.
 *
 * The form clears after a successful submission and the real-time
 * listener in Community.jsx will surface the new post automatically.
 */
function CreatePost({ authorId, authorName, authorRole }) {
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [category, setCategory]   = useState("");
  const [error, setError]         = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation — all fields required
    if (!title.trim() || !body.trim() || !category) {
      setError("Please fill in all fields before posting.");
      return;
    }

    // Moderation check (Phase 6 placeholder — always passes)
    const titleCheck = moderateContent(title);
    const bodyCheck  = moderateContent(body);
    if (!titleCheck.safe || !bodyCheck.safe) {
      setError(
        "Your post contains content that cannot be submitted. Please review and try again."
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
      // Clear form on success
      setTitle("");
      setBody("");
      setCategory("");
    } catch (err) {
      console.error("Failed to create post:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="create-post" onSubmit={handleSubmit} noValidate>
      <h2 className="create-post-heading">Start a conversation</h2>

      {error && <p className="create-post-error">{error}</p>}

      <div className="create-post-field">
        <label className="create-post-label" htmlFor="post-title">
          Title
        </label>
        <input
          id="post-title"
          type="text"
          className="create-post-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={120}
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
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share more detail..."
          rows={4}
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
          disabled={submitting}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

export default CreatePost;
