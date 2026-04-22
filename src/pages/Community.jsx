/**
 * Community.jsx — Public discussion feed.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { listenToPosts } from "../services/postService";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import Navbar from "../components/Navbar";
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

  const [profile, setProfile]             = useState(null);
  const [posts, setPosts]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sortBy, setSortBy]               = useState("new");
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then(setProfile)
      .catch(console.error);
  }, [user]);

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

  /**
   *  Logic: Hide content with 3+ reports.
   */
  const REPORT_THRESHOLD = 3;
  const isAdmin = profile?.isAdmin === true;

  let displayedPosts = posts.filter(
    (p) => isAdmin || !p.reportCount || p.reportCount < REPORT_THRESHOLD
  );

  if (activeCategory) {
    displayedPosts = displayedPosts.filter((p) => p.category === activeCategory);
  }

  if (sortBy === "top") {
    displayedPosts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  }

  const toggleCategory = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-body page-entry">
      <div className="community-inner">

        <div className="page-header">
          <div>
            <h1 className="page-title">Community Feed</h1>
            <p className="page-subtitle">Ask questions, share wins, and connect with the EntreHub community.</p>
          </div>
        </div>

        <CreatePost
          authorId={user.uid}
          authorName={profile?.displayName || user.displayName || user.email}
          authorRole={profile?.role || "entrepreneur"}
        />

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

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-light" />
            <p className="loading-state-text">Loading posts...</p>
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h2 className="empty-state-heading">
              {activeCategory ? `No posts in "${activeCategory}"` : "No posts yet"}
            </h2>
            <p className="empty-state-text">
              {activeCategory
                ? "Try a different category or be the first to post here!"
                : "Be the first to start a conversation!"}
            </p>
          </div>
        ) : (
          <div className="community-feed">
            {displayedPosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user.uid} />
            ))}
          </div>
        )}

      </div>
      </div>
    </div>
  );
}

export default Community;
