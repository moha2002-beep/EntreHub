import { useEffect, useState } from "react";
import { getMentors } from "../services/userService";
import MentorCard from "./MentorCard";
import "../styles/Mentors.css";

/**
 * MentorList — fetches all mentors from Firestore and renders them
 * with live search (by name) and tag filter controls.
 *
 * No props required — this component manages its own data fetching.
 */
function MentorList() {
  const [allMentors, setAllMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // What the user has typed in the search box
  const [searchTerm, setSearchTerm] = useState("");

  // Which tag chip is currently selected ("" means none)
  const [activeTag, setActiveTag] = useState("");

  // Fetch all mentors once when the component mounts
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMentors();
        setAllMentors(data);
      } catch (err) {
        console.error("Failed to load mentors:", err);
        setError("Could not load mentors. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []); // empty array → run once on mount

  // ── Filter logic ──────────────────────────────────────────────
  // Normalise expertiseTags: Firestore may store it as a string ("A, B")
  // or as an array (["A", "B"]) depending on how the profile was saved.
  const parseTags = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
    return String(val).split(",").map((t) => t.trim()).filter(Boolean);
  };

  // Build a flat, deduplicated list of every tag across all mentors
  const allTags = [
    ...new Set(
      allMentors.flatMap((m) => parseTags(m.expertiseTags)).filter(Boolean)
    ),
  ];

  // Apply both filters simultaneously
  const filteredMentors = allMentors.filter((mentor) => {
    const nameMatch = (mentor.displayName || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const tagList = parseTags(mentor.expertiseTags).map((t) => t.toLowerCase());
    const tagMatch =
      activeTag === "" || tagList.includes(activeTag.toLowerCase());

    return nameMatch && tagMatch;
  });

  // Clicking an already-active tag deselects it
  const handleTagClick = (tag) => {
    setActiveTag((prev) => (prev === tag ? "" : tag));
  };

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <p className="mentor-empty">Loading mentors…</p>;
  if (error) return <p className="mentor-empty">{error}</p>;

  return (
    <div className="mentor-list">
      {/* Search + tag filters */}
      <div className="mentor-list-controls">
        <input
          type="text"
          className="mentor-search"
          placeholder="Search by name…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {allTags.length > 0 && (
          <div className="mentor-tags-row">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={
                  "mentor-tag-filter" +
                  (activeTag === tag ? " mentor-tag-filter-active" : "")
                }
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {filteredMentors.length === 0 ? (
        <p className="mentor-empty">
          {allMentors.length === 0
            ? "No mentors have joined yet."
            : "No mentors match your search."}
        </p>
      ) : (
        <div className="mentor-grid">
          {filteredMentors.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MentorList;
