/**
 * PostDetail.jsx — Detailed view for a single post and its replies.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { listenToPost, upvotePost, reportPost } from "../services/postService";
import ReplyThread from "../components/ReplyThread";
import Navbar from "../components/Navbar";
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

function PostDetail() {
  const { postId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [post, setPost]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setProfile).catch(console.error);
  }, [user]);

  /**
   * Real-time listener for the post document.
   */
  useEffect(() => {
    const unsub = listenToPost(
      postId,
      (data) => {
        setPost(data);
        setLoading(false);
      },
      (err) => {
        console.error("Post listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [postId]);

  // Derive interaction state from Firestore data
  const hasVoted    = post && (post.upvotedBy  || []).includes(user.uid);
  const hasReported = post && (post.reportedBy || []).includes(user.uid);

  const handleUpvote = async () => {
    try {
      await upvotePost(postId, user.uid);
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const handleReport = async () => {
    if (hasReported) return;
    try {
      await reportPost(postId, user.uid);
      // Firestore listener fires automatically — no local state needed.
    } catch (err) {
      console.error("Report failed:", err);
    }
  };

  // Loading state 
  if (loading) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="loading-state">
            <div className="spinner spinner-light" />
            <p className="loading-state-text">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  //  Not found 
  if (!post) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="community-inner">
            <button type="button" className="community-back" onClick={() => navigate("/community")}>
              ← Back to Feed
            </button>
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h2 className="empty-state-heading">Post not found</h2>
              <p className="empty-state-text">This post may have been removed or the link is invalid.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  //  Main render 
  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-body">
      <div className="community-inner">

        <button
          type="button"
          className="community-back"
          onClick={() => navigate("/community")}
        >
          ← Back to Feed
        </button>

        {/* Post card */}
        <div className="post-detail-card">
          {/* Meta row: author, role badge, category badge, timestamp */}
          <div className="post-detail-meta">
            <span className="post-card-author">{post.authorName}</span>
            <span className={`post-card-role-badge role-${post.authorRole}`}>
              {ROLE_LABELS[post.authorRole] || post.authorRole}
            </span>
            <span
              className={`post-card-cat-badge ${CATEGORY_CLASS[post.category] || "community-cat-gray"}`}
            >
              {post.category}
            </span>
            <span className="post-card-time">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>

          <h1 className="post-detail-title">{post.title}</h1>
          <p className="post-detail-body">{post.body}</p>

          {/* Actions: upvote + report */}
          <div className="post-detail-footer">
            <button
              type="button"
              className={`post-card-upvote${hasVoted ? " post-card-upvote-active" : ""}`}
              onClick={handleUpvote}
              title={hasVoted ? "Remove upvote" : "Upvote"}
            >
              ▲ {post.upvotes || 0}
            </button>
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

        {/* Reply thread — real-time, self-contained */}
        <ReplyThread
          postId={postId}
          authorRole={profile?.role || "entrepreneur"}
        />

      </div>
      </div>
    </div>
  );
}

export default PostDetail;
