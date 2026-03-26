/**
 * BookingCard.jsx
 *
 * A stateless "display" component — it renders a booking and exposes
 * action buttons, but holds NO state of its own.  All actions are
 * callback props passed in from the parent (Bookings.jsx).
 *
 * Teaching point — presentational vs container components:
 *   BookingCard is "presentational": it only knows HOW to display data.
 *   Bookings.jsx is the "container":  it knows WHAT data to show and
 *   WHAT happens when buttons are clicked.
 *   Keeping these responsibilities separate makes each component easier
 *   to understand and test in isolation.
 *
 * Props:
 *   booking    {object}   — the Firestore booking document + i
 *   viewAs     {string}   — "mentor" | "entrepreneur"
 *   onAccept   {function} — mentor only: accept a pending booking
 *   onDecline  {function} — mentor only: decline a pending booking
 *   onComplete {function} — mentor only: mark an accepted booking as done
 *   onCancel   {function} — either party: cancel pending or accepted booking
 */

import "../styles/Bookings.css";

// ─── Status badge config ────────────────────────────────────────────────────
// Centralising colours here means changing a status colour is a one-line edit.

const STATUS_CONFIG = {
  pending:   { label: "Pending",   className: "booking-badge-pending"   },
  accepted:  { label: "Accepted",  className: "booking-badge-accepted"  },
  declined:  { label: "Declined",  className: "booking-badge-declined"  },
  completed: { label: "Completed", className: "booking-badge-completed" },
  cancelled: { label: "Cancelled", className: "booking-badge-cancelled" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** "09:00" → "9:00 AM"  /  "13:00" → "1:00 PM" */
function formatTime(timeStr) {
  const h      = parseInt(timeStr.split(":")[0], 10);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00 ${period}`;
}

function getEndSlot(startSlot) {
  const h = parseInt(startSlot.split(":")[0], 10) + 1;
  return `${String(h).padStart(2, "0")}:00`;
}

/** "2025-04-15" → "Tuesday, 15 April 2025" */
function formatDate(dateStr) {
  // Append T00:00:00 to parse in LOCAL time — without it, Date() treats
  // "YYYY-MM-DD" as UTC midnight, which shifts by a day in UTC+ timezones.
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatCost(rate) {
  if (!rate || rate <= 0) return "Free";
  return `£${Number(rate).toLocaleString()}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  viewAs,
  onAccept,
  onDecline,
  onComplete,
  onCancel,
}) {
  const {
    status,
    date,
    timeSlot,
    mentorName,
    entrepreneurName,
    hourlyRate,
    message,
    cancelledBy,
  } = booking;

  const badgeConfig = STATUS_CONFIG[status] ?? { label: status, className: "" };

  // Determine the "other party" label depending on whose perspective we're in
  const otherParty = viewAs === "mentor" ? entrepreneurName : mentorName;
  const otherLabel = viewAs === "mentor" ? "Entrepreneur" : "Mentor";

  // ── Which action buttons to show ──────────────────────────────────────
  // Teaching note: these are booleans computed from props — no state needed.

  const canAccept   = viewAs === "mentor" && status === "pending";
  const canDecline  = viewAs === "mentor" && status === "pending";
  const canComplete = viewAs === "mentor" && status === "accepted";
  const canCancel   =
    (status === "pending"  && viewAs === "entrepreneur") ||
    (status === "accepted" && (viewAs === "mentor" || viewAs === "entrepreneur"));

  const showActions = canAccept || canDecline || canComplete || canCancel;

  return (
    <div className={`booking-card booking-card-${status}`}>
      {/* ── Header row: date + status badge ── */}
      <div className="booking-card-header">
        <div className="booking-card-date">{formatDate(date)}</div>
        <span className={`booking-badge ${badgeConfig.className}`}>
          {badgeConfig.label}
        </span>
      </div>

      {/* ── Session details ── */}
      <div className="booking-card-body">
        <div className="booking-card-row">
          <span className="booking-card-label">{otherLabel}</span>
          <span className="booking-card-value">{otherParty}</span>
        </div>
        <div className="booking-card-row">
          <span className="booking-card-label">Time</span>
          <span className="booking-card-value">
            {formatTime(timeSlot)} – {formatTime(getEndSlot(timeSlot))}
          </span>
        </div>
        <div className="booking-card-row">
          <span className="booking-card-label">Rate</span>
          <span className="booking-card-value">{formatCost(hourlyRate)}</span>
        </div>

        {message && (
          <div className="booking-card-message">
            <span className="booking-card-label">Note</span>
            <p>{message}</p>
          </div>
        )}

        {/* Show who cancelled and whether a refund applies */}
        {status === "cancelled" && cancelledBy && (
          <div className="booking-card-cancelled-note">
            {cancelledBy === "mentor" ? (
              <>
                Cancelled by mentor.{" "}
                {hourlyRate > 0 && (
                  <span className="booking-refund-note">
                    A refund of {formatCost(hourlyRate)} should be issued to{" "}
                    {entrepreneurName}.
                  </span>
                )}
              </>
            ) : (
              "Cancelled by entrepreneur. No refund is due."
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      {showActions && (
        <div className="booking-card-actions">
          {canAccept && (
            <button
              type="button"
              className="booking-btn-accept"
              onClick={() => onAccept(booking)}
            >
              Accept
            </button>
          )}
          {canDecline && (
            <button
              type="button"
              className="booking-btn-decline"
              onClick={() => onDecline(booking)}
            >
              Decline
            </button>
          )}
          {canComplete && (
            <button
              type="button"
              className="booking-btn-complete"
              onClick={() => onComplete(booking)}
            >
              Mark complete
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              className="booking-btn-cancel"
              onClick={() => onCancel(booking)}
            >
              {status === "pending" && viewAs === "entrepreneur"
                ? "Withdraw request"
                : "Cancel session"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default BookingCard;
