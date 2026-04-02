import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { upvotePost, flagPost } from "../services/postService";
import { formatRelativeTime } from "../utils/formatTime";
import "../styles/Community.css";

const ROLE_LABELS = {
  mentor: "Mentor",
  entrepreneur: "Entrepreneur",
  investor: "Investor",
};

// Maps each category name to its CSS colour modifier class
const CATEGORY_CLASS = {
  "Ask a Mentor":     "community-cat-indigo",
  "Share a Win":      "community-cat-green",
  "Resource Request": "community-cat-amber",
  "Idea Feedback":    "community-cat-violet",
  "General":          "community-cat-gray",
};

/**
 * PostCard — summary card for one community post.
 *
 * Props:
 *   post          {object}  Firestore post document (with .id)
 *   currentUserId {string}  uid of the logged-in user — used to
 *                           determine whether they have already upvoted
 *
 * Clicking anywhere on the card (except action buttons) navigates to
 * /community/:postId.  Action buttons use stopPropagation so the
 * card click handler doesn't also fire.
 */
function PostCard({ post, currentUserId }) {
  const navigate = useNavigate();
  const [reported, setReported] = useState(false);

  const hasVoted = (post.upvotedBy || []).includes(currentUserId);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    try {
      await upvotePost(post.id, currentUserId);
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const handleReport = async (e) => {
    e.stopPropagation();
    if (reported) return;
    try {
      await flagPost(post.id);
      setReported(true);
    } catch (err) {
      console.error("Report failed:", err);
    }
  };

  const goToPost = () => navigate(`/community/${post.id}`);

  return (
    <div
      className="post-card"
      onClick={goToPost}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && goToPost()}
    >
      {/* Author row */}
      <div className="post-card-header">
        <span className="post-card-author">{post.authorName}</span>
        <span className={`post-card-role-badge role-${post.authorRole}`}>
          {ROLE_LABELS[post.authorRole] || post.authorRole}
        </span>
        <span className="post-card-time">
          {formatRelativeTime(post.createdAt)}
        </span>
      </div>

      {/* Title + body preview */}
      <h3 className="post-card-title">{post.title}</h3>
      <p className="post-card-preview">{post.body}</p>

      {/* Footer: category badge + actions */}
      <div className="post-card-footer">
        <span
          className={`post-card-cat-badge ${CATEGORY_CLASS[post.category] || "community-cat-gray"}`}
        >
          {post.category}
        </span>

        <div className="post-card-actions">
          {/* Upvote — filled when current user has voted */}
          <button
            type="button"
            className={`post-card-upvote${hasVoted ? " post-card-upvote-active" : ""}`}
            onClick={handleUpvote}
            title={hasVoted ? "Remove upvote" : "Upvote"}
          >
            ▲ {post.upvotes || 0}
          </button>

          {/* Reply count — display only, clicking navigates to post */}
          <span className="post-card-reply-count">
            💬 {post.replyCount || 0}
          </span>

          {/* Report — toggles to "Reported" after flagging */}
          <button
            type="button"
            className="post-card-report"
            onClick={handleReport}
            title="Report post"
          >
            {reported ? "Reported" : "⚑ Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
