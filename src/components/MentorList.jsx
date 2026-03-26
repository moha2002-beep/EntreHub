import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMentors, getUserProfile } from "../services/userService";
import { calculateMatchScore, hasEnoughProfileData } from "../utils/matchScore";
import MentorCard from "./MentorCard";
import "../styles/Mentors.css";

// ─── Tag colour palette ───────────────────────────────────────────────────────
const TAG_COLORS = [
  { bg: "#EEF2FF", text: "#4338CA" },
  { bg: "#F3E8FF", text: "#7C3AED" },
  { bg: "#FCE7F3", text: "#BE185D" },
  { bg: "#ECFEFF", text: "#0E7490" },
  { bg: "#F0FDFA", text: "#0F766E" },
  { bg: "#DCFCE7", text: "#15803D" },
  { bg: "#FFF7ED", text: "#C2410C" },
  { bg: "#FFFBEB", text: "#B45309" },
  { bg: "#FFF1F2", text: "#BE123C" },
  { bg: "#EFF6FF", text: "#1D4ED8" },
];

function getTagColor(index) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

const parseTags = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
  return String(val).split(",").map((t) => t.trim()).filter(Boolean);
};

// ─── Component ────────────────────────────────────────────────────────────────

function MentorList() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [allMentors,          setAllMentors]          = useState([]);
  const [entrepreneurProfile, setEntrepreneurProfile] = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState(null);

  const [searchTerm,   setSearchTerm]   = useState("");
  const [activeTags,   setActiveTags]   = useState(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  // ── Fetch mentors + current user's profile in parallel ─────────────────
  // Teaching note — Promise.all:
  //   Both reads fire simultaneously.  The component waits for whichever
  //   takes longer, not their sum.  With sequential awaits you would wait
  //   for mentor-fetch THEN profile-fetch; with Promise.all you wait for
  //   max(mentor-fetch, profile-fetch).
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [mentorData, profileData] = await Promise.all([
          getMentors(),
          user ? getUserProfile(user.uid) : Promise.resolve(null),
        ]);
        setAllMentors(mentorData);
        setEntrepreneurProfile(profileData);
      } catch (err) {
        console.error("Failed to load mentors:", err);
        setError("Could not load mentors. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [user]);

  // ── Close dropdown on outside click ────────────────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ── Score calculation (derived — not stored in state) ──────────────────
  // Teaching note — derived vs stored state:
  //   We do NOT put scores in useState.  Instead we recompute them on every
  //   render from allMentors + entrepreneurProfile.  This keeps a single
  //   source of truth: if either changes, the scores automatically update.
  //   The trade-off is CPU; for large lists you would wrap this in useMemo.
  const isEntrepreneur = entrepreneurProfile?.role === "entrepreneur";
  const canScore       = isEntrepreneur && hasEnoughProfileData(entrepreneurProfile);

  const mentorsWithScores = allMentors.map((m) => ({
    ...m,
    _score: canScore
      ? calculateMatchScore(m, entrepreneurProfile).score
      : null,
  }));

  // ── Tag universe ────────────────────────────────────────────────────────
  const allTags = [
    ...new Set(
      allMentors.flatMap((m) => parseTags(m.expertiseTags)).filter(Boolean)
    ),
  ];

  // ── Filter then sort ────────────────────────────────────────────────────
  // Teaching note:
  //   Filter runs first (reduces the set), then sort runs on the smaller
  //   filtered array.  Sort is O(n log n) so filtering first is important.
  //   Within the filtered set, mentors are always ordered by score descending
  //   regardless of which search or tag filter is active.
  const filteredAndSorted = mentorsWithScores
    .filter((mentor) => {
      const nameMatch = (mentor.displayName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const mentorTagSet = new Set(
        parseTags(mentor.expertiseTags).map((t) => t.toLowerCase())
      );
      const tagMatch =
        activeTags.size === 0 ||
        [...activeTags].some((t) => mentorTagSet.has(t.toLowerCase()));

      return nameMatch && tagMatch;
    })
    .sort((a, b) => {
      // Both scored → descending by score
      if (a._score !== null && b._score !== null) return b._score - a._score;
      // Scored before unscored
      if (a._score !== null) return -1;
      if (b._score !== null) return  1;
      return 0;
    });

  // ── Tag dropdown helpers ────────────────────────────────────────────────
  const toggleTag  = (tag) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };
  const clearTags  = () => setActiveTags(new Set());

  const triggerLabel =
    activeTags.size === 0  ? "All expertise areas"
    : activeTags.size === 1 ? [...activeTags][0]
    :                         `${activeTags.size} tags selected`;

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) return <p className="mentor-empty">Loading mentors…</p>;
  if (error)   return <p className="mentor-empty">{error}</p>;

  return (
    <div className="mentor-list">

      {/* ── Controls bar ── */}
      <div className="mentor-list-controls">
        <input
          type="text"
          className="mentor-search"
          placeholder="Search by name…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {allTags.length > 0 && (
          <div className="mentor-tag-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`mentor-tag-trigger${dropdownOpen ? " mentor-tag-trigger-open" : ""}${activeTags.size > 0 ? " mentor-tag-trigger-active" : ""}`}
              onClick={() => setDropdownOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="mentor-tag-trigger-label">{triggerLabel}</span>
              {activeTags.size > 0 && (
                <span className="mentor-tag-trigger-count">{activeTags.size}</span>
              )}
              <span className="mentor-tag-trigger-chevron" aria-hidden="true">
                {dropdownOpen ? "▴" : "▾"}
              </span>
            </button>

            {dropdownOpen && (
              <div className="mentor-tag-panel" role="listbox" aria-multiselectable="true">
                <div className="mentor-tag-panel-header">
                  <span className="mentor-tag-panel-title">Filter by expertise</span>
                  {activeTags.size > 0 && (
                    <button type="button" className="mentor-tag-clear" onClick={clearTags}>
                      Clear all
                    </button>
                  )}
                </div>
                <div className="mentor-tag-options">
                  {allTags.map((tag, index) => {
                    const checked = activeTags.has(tag);
                    const color   = getTagColor(index);
                    return (
                      <button
                        key={tag}
                        type="button"
                        role="option"
                        aria-selected={checked}
                        className={`mentor-tag-option${checked ? " mentor-tag-option-checked" : ""}`}
                        onClick={() => toggleTag(tag)}
                      >
                        <span
                          className="mentor-tag-pill"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {tag}
                        </span>
                        <span
                          className={`mentor-tag-checkbox${checked ? " mentor-tag-checkbox-checked" : ""}`}
                          aria-hidden="true"
                        >
                          {checked && "✓"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Active tag pills ── */}
      {activeTags.size > 0 && (
        <div className="mentor-active-tags">
          {[...activeTags].map((tag) => {
            const color = getTagColor(allTags.indexOf(tag));
            return (
              <span
                key={tag}
                className="mentor-active-tag-pill"
                style={{ background: color.bg, color: color.text, borderColor: color.text + "33" }}
              >
                {tag}
                <button
                  type="button"
                  className="mentor-active-tag-remove"
                  style={{ color: color.text }}
                  onClick={() => toggleTag(tag)}
                  aria-label={`Remove ${tag} filter`}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button type="button" className="mentor-active-tags-clear" onClick={clearTags}>
            Clear all
          </button>
        </div>
      )}

      {/* ── "Complete profile" prompt (shown when user is entrepreneur but
           profile lacks enough data to generate scores) ── */}
      {isEntrepreneur && !canScore && (
        <div className="mentor-match-prompt">
          <span className="mentor-match-prompt-icon">✦</span>
          <span>Complete your profile to see personalised match scores.</span>
          <button
            type="button"
            className="mentor-match-prompt-link"
            onClick={() => navigate("/profile?mode=edit")}
          >
            Complete now →
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {filteredAndSorted.length === 0 ? (
        <p className="mentor-empty">
          {allMentors.length === 0
            ? "No mentors have joined yet."
            : "No mentors match your search."}
        </p>
      ) : (
        <div className="mentor-grid">
          {filteredAndSorted.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} score={mentor._score} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MentorList;
