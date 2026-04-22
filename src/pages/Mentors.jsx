/**
 * Mentors.jsx — Page shell for the mentor discovery feature.
 */

import Navbar from "../components/Navbar";
import MentorList from "../components/MentorList";

function Mentors() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-body page-entry">
        <div className="page-inner">
          <div className="page-header">
            <div>
              <h1 className="page-title">Discover Mentors</h1>
              <p className="page-subtitle">
                Find the right mentor to guide your entrepreneurial journey.
              </p>
            </div>
          </div>
          <MentorList />
        </div>
      </div>
    </div>
  );
}

export default Mentors;
