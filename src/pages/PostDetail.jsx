/**
 * PostDetail.jsx
 *
 * Full view for a single community post, including its reply thread.
 * Route: /community/:postId
 *
 * Teaching concepts:
 *
 *   1. useParams
 *      React Router's useParams() extracts the :postId segment from the
 *      URL without any extra wiring.  The value is a plain string that
 *      we pass directly to Firestore queries.
 *
 *   2. listenToPost (onSnapshot on a single document)
 *      We subscribe to the post document so the upvote count updates in
 *      real-time if another user votes while we're on this page.
 *      This is the same onSnapshot pattern used for collections, but
 *      applied to a single doc() reference instead of a query.
 *
 *   3. Two separate onSnapshot subscriptions
 *      PostDetail opens one listener for the post document and delegates
 *      the replies listener to the ReplyThread child component.
 *      Each listener is cleaned up independently via its useEffect return.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { listenToPost, upvotePost, flagPost } from "../services/postService";
import ReplyThread from "../components/ReplyThread";
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

  const [post, setPost]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [reported, setReported] = useState(false);

  // Fetch current user's role so ReplyThread can set isMentorReply correctly
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setProfile).catch(console.error);
  }, [user]);

  // Real-time listener on the post document
  // Keeps the upvote count live without a manual re-fetch after voting
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

  const hasVoted = post && (post.upvotedBy || []).includes(user.uid);

  const handleUpvote = async () => {
    try {
      await upvotePost(postId, user.uid);
      // No manual state update needed — listenToPost will fire with the
      // new upvotes count automatically after the Firestore write completes.
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const handleReport = async () => {
    if (reported) return;
    try {
      await flagPost(postId);
      setReported(true);
    } catch (err) {
      console.error("Report failed:", err);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="community-page">
        <div className="community-inner">
          <div className="community-loading">
            <div className="spinner community-spinner" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!post) {
    return (
      <div className="community-page">
        <div className="community-inner">
          <button
            type="button"
            className="community-back"
            onClick={() => navigate("/community")}
          >
            ← Back to Feed
          </button>
          <p className="community-empty">Post not found.</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="community-page">
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
            >
              {reported ? "Reported" : "⚑ Report"}
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
  );
}

export default PostDetail;
