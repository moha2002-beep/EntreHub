/**
 * Bookings.jsx
 *
 * A single page that shows a completely different UI depending on role:
 *
 *   MENTOR view
 *     "Pending Requests"  — bookings awaiting a decision (Accept / Decline)
 *     "Upcoming Sessions" — accepted bookings whose date is today or later
 *     "History"           — declined, cancelled, completed, or past sessions
 *
 *   ENTREPRENEUR view
 *     All bookings sorted newest-first, with status badges and a cancel
 *     (or withdraw) button where applicable.
 *
 * Teaching concepts:
 *
 *   1. Chained useEffect hooks
 *      The profile must be fetched BEFORE we know which onSnapshot query to
 *      run.  Rather than doing both in one effect, we chain two effects:
 *        Effect A: fetch profile → sets `profile` state
 *        Effect B: depends on `profile` → opens the onSnapshot subscription
 *      This pattern is easier to reason about than a single monolithic effect.
 *
 *   2. onSnapshot cleanup
 *      onSnapshot returns an unsubscribe function.  Returning it from the
 *      useEffect cleanup (return () => unsubscribe?.()) is CRITICAL:
 *        • Stops billing for a listener nobody reads
 *        • Prevents "setState on unmounted component" React warnings
 *        • Avoids subtle bugs when the user navigates away and comes back
 *
 *   3. Sorting and grouping in JS
 *      We sort / group the incoming booking array in JS rather than adding
 *      Firestore orderBy() calls, because orderBy on a filtered query would
 *      require additional composite indexes (one per field combination).
 *      For a small dataset this is fine; in production you'd add the indexes.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import {
  listenToMentorBookings,
  listenToEntrepreneurBookings,
  acceptBooking,
  updateBookingStatus,
} from "../services/bookingService";
import BookingCard from "../components/BookingCard";
import "../styles/Bookings.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for today in local time (used to bucket past vs future) */
function todayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Sorts bookings by date + timeSlot, either ascending or descending.
 * Pure function — safe to call on every render.
 */
function sortByDateTime(bookings, direction = "asc") {
  return [...bookings].sort((a, b) => {
    const keyA = `${a.date}T${a.timeSlot}`;
    const keyB = `${b.date}T${b.timeSlot}`;
    return direction === "asc"
      ? keyA.localeCompare(keyB)
      : keyB.localeCompare(keyA);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

function Bookings() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [profile,        setProfile]        = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bookings,       setBookings]       = useState([]);
  const [actionError,    setActionError]    = useState("");

  // ── Effect A: fetch profile to determine role ───────────────────────────
  // Runs once when `user` becomes available.
  useEffect(() => {
    if (!user) return;

    getUserProfile(user.uid)
      .then((data) => {
        setProfile(data);
        setLoadingProfile(false);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setLoadingProfile(false);
      });
  }, [user]);

  // ── Effect B: open real-time booking subscription ───────────────────────
  // Only runs after the profile is loaded (profile is in the dependency array).
  // Returns the unsubscribe function as the cleanup so the listener is torn
  // down whenever the component unmounts OR the profile changes.
  useEffect(() => {
    if (!profile) return;

    let unsubscribe;

    if (profile.role === "mentor") {
      unsubscribe = listenToMentorBookings(
        user.uid,
        (incoming) => setBookings(incoming),
        (err) => console.error("Booking listener error:", err)
      );
    } else if (profile.role === "entrepreneur") {
      unsubscribe = listenToEntrepreneurBookings(
        user.uid,
        (incoming) => setBookings(incoming),
        (err) => console.error("Booking listener error:", err)
      );
    }

    // ← THE critical cleanup.  Without this the listener survives navigation.
    return () => unsubscribe?.();
  }, [profile, user]);

  // ── Action handlers ────────────────────────────────────────────────────

  /** Mentor accepts a pending booking, auto-declining conflicting ones. */
  const handleAccept = async (booking) => {
    setActionError("");
    try {
      await acceptBooking(booking.id, booking.mentorId, booking.date, booking.timeSlot);
    } catch (err) {
      console.error("Accept failed:", err);
      setActionError("Could not accept booking. Please try again.");
    }
    // No need to call setBookings — onSnapshot fires automatically
    // and updates the UI within milliseconds.
  };

  /** Mentor declines a pending booking. */
  const handleDecline = async (booking) => {
    if (!window.confirm("Decline this booking request?")) return;
    setActionError("");
    try {
      await updateBookingStatus(booking.id, "declined");
    } catch (err) {
      console.error("Decline failed:", err);
      setActionError("Could not decline booking. Please try again.");
    }
  };

  /** Mentor marks an accepted (past) session as completed. */
  const handleComplete = async (booking) => {
    if (!window.confirm("Mark this session as completed?")) return;
    setActionError("");
    try {
      await updateBookingStatus(booking.id, "completed");
    } catch (err) {
      console.error("Complete failed:", err);
      setActionError("Could not update booking. Please try again.");
    }
  };

  /**
   * Either party cancels a booking.
   *
   * Refund logic (informational — no payment processing):
   *   • Mentor cancels ACCEPTED booking → refund notice shown on the card.
   *   • Entrepreneur cancels anything   → no refund.
   *
   * We confirm with different messages depending on the scenario so the
   * cancelling party knows exactly what they're agreeing to.
   */
  const handleCancel = async (booking) => {
    const isMentor = profile.role === "mentor";

    let confirmMessage;
    if (isMentor && booking.status === "accepted") {
      const cost = booking.hourlyRate > 0 ? `£${booking.hourlyRate}` : "the session fee";
      confirmMessage =
        `Cancel this session? A refund of ${cost} will be issued to ${booking.entrepreneurName}.`;
    } else if (booking.status === "accepted") {
      confirmMessage =
        "Cancel this accepted session? No refund will be issued.";
    } else {
      confirmMessage = "Withdraw this booking request?";
    }

    if (!window.confirm(confirmMessage)) return;

    setActionError("");
    try {
      await updateBookingStatus(booking.id, "cancelled", {
        cancelledBy: profile.role, // "mentor" or "entrepreneur"
      });
    } catch (err) {
      console.error("Cancel failed:", err);
      setActionError("Could not cancel booking. Please try again.");
    }
  };

  // ── Derived data: group and sort ────────────────────────────────────────
  // We compute these on every render from the live `bookings` array.
  // Because onSnapshot keeps `bookings` up-to-date, the UI always reflects
  // the latest Firestore state without any manual refresh.

  const today = todayString();

  // Mentor groups
  const pendingBookings  = sortByDateTime(bookings.filter((b) => b.status === "pending"), "asc");
  const upcomingBookings = sortByDateTime(
    bookings.filter((b) => b.status === "accepted" && b.date >= today),
    "asc"
  );
  const historyBookings  = sortByDateTime(
    bookings.filter(
      (b) =>
        b.status === "declined"  ||
        b.status === "cancelled" ||
        b.status === "completed" ||
        (b.status === "accepted" && b.date < today)
    ),
    "desc" // most recent history first
  );

  // Entrepreneur view: all bookings, newest first
  const allBookingsSorted = sortByDateTime(bookings, "desc");

  // ── Loading state ───────────────────────────────────────────────────────

  if (!user) return <p>You are not signed in.</p>;

  if (loadingProfile) {
    return (
      <div className="bookings-page">
        <div className="bookings-inner">
          <p className="bookings-loading">Loading…</p>
        </div>
      </div>
    );
  }

  if (!profile || (profile.role !== "mentor" && profile.role !== "entrepreneur")) {
    return (
      <div className="bookings-page">
        <div className="bookings-inner">
          <p className="bookings-empty">
            Bookings are available to mentors and entrepreneurs only.
          </p>
          <button
            type="button"
            className="booking-btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Shared card props builder ───────────────────────────────────────────

  const cardProps = {
    viewAs:     profile.role,
    onAccept:   handleAccept,
    onDecline:  handleDecline,
    onComplete: handleComplete,
    onCancel:   handleCancel,
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bookings-page">
      <div className="bookings-inner">

        {/* ── Page header ── */}
        <header className="bookings-header">
          <div>
            <h1 className="bookings-title">
              {profile.role === "mentor" ? "Your Bookings" : "My Bookings"}
            </h1>
            <p className="bookings-subtitle">
              {profile.role === "mentor"
                ? "Manage session requests and upcoming sessions."
                : "Track your mentoring session requests."}
            </p>
          </div>
          <button
            type="button"
            className="booking-btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </header>

        {actionError && (
          <div className="bookings-error">{actionError}</div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MENTOR VIEW
        ════════════════════════════════════════════════════════════════ */}
        {profile.role === "mentor" && (
          <>
            {/* Pending requests */}
            <section className="bookings-section">
              <h2 className="bookings-section-title">
                Pending Requests
                {pendingBookings.length > 0 && (
                  <span className="bookings-count-badge">
                    {pendingBookings.length}
                  </span>
                )}
              </h2>

              {pendingBookings.length === 0 ? (
                <p className="bookings-empty">No pending requests.</p>
              ) : (
                <div className="bookings-list">
                  {pendingBookings.map((b) => (
                    <BookingCard key={b.id} booking={b} {...cardProps} />
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming accepted sessions */}
            <section className="bookings-section">
              <h2 className="bookings-section-title">
                Upcoming Sessions
                {upcomingBookings.length > 0 && (
                  <span className="bookings-count-badge bookings-count-badge-green">
                    {upcomingBookings.length}
                  </span>
                )}
              </h2>

              {upcomingBookings.length === 0 ? (
                <p className="bookings-empty">No upcoming sessions.</p>
              ) : (
                <div className="bookings-list">
                  {upcomingBookings.map((b) => (
                    <BookingCard key={b.id} booking={b} {...cardProps} />
                  ))}
                </div>
              )}
            </section>

            {/* History */}
            <section className="bookings-section">
              <h2 className="bookings-section-title">History</h2>

              {historyBookings.length === 0 ? (
                <p className="bookings-empty">No past bookings yet.</p>
              ) : (
                <div className="bookings-list">
                  {historyBookings.map((b) => (
                    <BookingCard key={b.id} booking={b} {...cardProps} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ENTREPRENEUR VIEW
        ════════════════════════════════════════════════════════════════ */}
        {profile.role === "entrepreneur" && (
          <section className="bookings-section">
            <h2 className="bookings-section-title">
              All Bookings
              {bookings.length > 0 && (
                <span className="bookings-count-badge">{bookings.length}</span>
              )}
            </h2>

            {allBookingsSorted.length === 0 ? (
              <div className="bookings-empty-state">
                <p>You haven&apos;t made any booking requests yet.</p>
                <button
                  type="button"
                  className="booking-btn-primary"
                  onClick={() => navigate("/dashboard")}
                >
                  Browse mentors
                </button>
              </div>
            ) : (
              <div className="bookings-list">
                {allBookingsSorted.map((b) => (
                  <BookingCard key={b.id} booking={b} {...cardProps} />
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}

export default Bookings;
