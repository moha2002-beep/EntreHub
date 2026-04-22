/**
 * PostCard.jsx — Summary card for a single community post in the feed.
 */

import { useNavigate } from "react-router-dom";
import { upvotePost, reportPost } from "../services/postService";
import { formatRelativeTime } from "../utils/formatTime";
import "../styles/Community.css";

const ROLE_LABELS = {
  mentor: "Mentor",
  entrepreneur: "Entrepreneur",
  investor: "Investor",
};

const CATEGORY_CLASS = {
  "Ask a Mentor":     "community-cat-indigo",
  "Share a Win":      "community-cat-green",
  "Resource Request": "community-cat-amber",
  "Idea Feedback":    "community-cat-violet",
  "General":          "community-cat-gray",
};

/**
 * PostCard — summary for community feed items.
 */
function PostCard({ post, currentUserId }) {
  const navigate = useNavigate();

  const hasVoted    = (post.upvotedBy  || []).includes(currentUserId);
  const hasReported = (post.reportedBy || []).includes(currentUserId);

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
    if (hasReported) return;
    try {
      await reportPost(post.id, currentUserId);
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

          {/* Report — disabled once the current user has already reported */}
          <button
            type="button"
            className="post-card-report"
            onClick={handleReport}
            disabled={hasReported}
            title={hasReported ? "You have already reported this post" : "Report post"}
          >
            {hasReported ? "Reported" : "⚑ Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
