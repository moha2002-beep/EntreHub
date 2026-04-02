/**
 * Community.jsx
 *
 * The main community feed page. Accessible at /community and linked
 * from the Dashboard's Community tab.
 *
 * Teaching concepts:
 *
 *   1. Chained useEffect hooks
 *      We run two independent effects:
 *        Effect A — fetches the user's Firestore profile (for authorRole)
 *        Effect B — opens a real-time onSnapshot listener on the posts feed
 *      Keeping them separate makes each effect's dependency array clear
 *      and avoids tangled logic in a single monolithic effect.
 *
 *   2. Client-side sort + filter
 *      We fetch ALL posts ordered by createdAt desc and sort/filter in JS.
 *      Doing this in Firestore would require a composite index for every
 *      sort+filter combination.  For a feed of this size, JS filtering
 *      is fast enough and much simpler to maintain.
 *
 *   3. onSnapshot cleanup
 *      The listener is unsubscribed when Community unmounts to prevent
 *      dangling Firestore connections and React state-update warnings.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { listenToPosts } from "../services/postService";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import "../styles/Community.css";

const CATEGORIES = [
  "Ask a Mentor",
  "Share a Win",
  "Resource Request",
  "Idea Feedback",
  "General",
];

function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]             = useState(null);
  const [posts, setPosts]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sortBy, setSortBy]               = useState("new");       // "new" | "top"
  const [activeCategory, setActiveCategory] = useState(null);      // null = show all

  // ── Effect A: fetch current user's Firestore profile ─────────────────────
  // We need profile.role to pass to CreatePost as authorRole.
  // AuthContext only stores uid/email/displayName — role must come from Firestore.
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then(setProfile)
      .catch(console.error);
  }, [user]);

  // ── Effect B: real-time posts feed ───────────────────────────────────────
  useEffect(() => {
    const unsub = listenToPosts(
      (data) => {
        setPosts(data);
        setLoading(false);
      },
      (err) => {
        console.error("Posts listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Sort + filter in JS ───────────────────────────────────────────────────
  // Start from the Firestore-ordered array (newest first) and apply
  // category filter then optional sort override.
  let displayedPosts = [...posts];

  if (activeCategory) {
    displayedPosts = displayedPosts.filter((p) => p.category === activeCategory);
  }

  if (sortBy === "top") {
    // Sort descending by upvote count; ties keep original (newest-first) order
    displayedPosts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  }

  // ─────────────────────────────────────────────────────────────────────────

  const toggleCategory = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <div className="community-page">
      <div className="community-inner">

        {/* Page header */}
        <div className="community-header">
          <button
            type="button"
            className="community-back"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
          <h1 className="community-title">Community Feed</h1>
          <p className="community-subtitle">
            Ask questions, share wins, and connect with the EntreHub community.
          </p>
        </div>

        {/* Create post form — always visible.
            Falls back to displayName / email if profile hasn't loaded yet. */}
        <CreatePost
          authorId={user.uid}
          authorName={profile?.displayName || user.displayName || user.email}
          authorRole={profile?.role || "entrepreneur"}
        />

        {/* Sort toggles + category filter bar */}
        <div className="community-controls">
          <div className="community-sort">
            <button
              type="button"
              className={`community-sort-btn${sortBy === "new" ? " community-sort-btn-active" : ""}`}
              onClick={() => setSortBy("new")}
            >
              New
            </button>
            <button
              type="button"
              className={`community-sort-btn${sortBy === "top" ? " community-sort-btn-active" : ""}`}
              onClick={() => setSortBy("top")}
            >
              Top
            </button>
          </div>

          <div className="community-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`community-cat-btn${activeCategory === cat ? " community-cat-btn-active" : ""}`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="community-loading">
            <div className="spinner community-spinner" />
          </div>
        ) : displayedPosts.length === 0 ? (
          <p className="community-empty">
            {activeCategory
              ? `No posts in "${activeCategory}" yet.`
              : "No posts yet — be the first to start a conversation!"}
          </p>
        ) : (
          <div className="community-feed">
            {displayedPosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user.uid} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default Community;
