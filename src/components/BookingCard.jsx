/**
 * BookingCard.jsx — Renders a single booking with contextual actions for
 * both mentor (accept/decline/complete) and entrepreneur (cancel) views.
 */

import { useState } from "react";
import "../styles/Bookings.css";

// Maps each booking status to a display label and CSS modifier for its badge
const STATUS_CONFIG = {
  pending:   { label: "Pending",   className: "booking-badge-pending"   },
  accepted:  { label: "Accepted",  className: "booking-badge-accepted"  },
  declined:  { label: "Declined",  className: "booking-badge-declined"  },
  completed: { label: "Completed", className: "booking-badge-completed" },
  cancelled: { label: "Cancelled", className: "booking-badge-cancelled" },
};

function formatTime(timeStr) {
  const h      = parseInt(timeStr.split(":")[0], 10);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00 ${period}`;
}

function getEndSlot(startSlot) {
  const h = parseInt(startSlot.split(":")[0], 10) + 1;
  return `${String(h).padStart(2, "0")}:00`;
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatCost(rate) {
  if (!rate || rate <= 0) return "Free";
  return `£${Number(rate).toLocaleString()}`;
}

function BookingCard({
  booking,
  viewAs,
  currentUserId,
  onAccept,
  onDecline,
  onComplete,
  onCancel,
  onSendMessage,
}) {
  const {
    id,
    status,
    date,
    timeSlot,
    mentorName,
    entrepreneurName,
    hourlyRate,
    message,
    chat = [],
    cancelledBy,
  } = booking;

  const [replyText, setReplyText] = useState("");
  const [showChat, setShowChat] = useState(false);

  const badgeConfig = STATUS_CONFIG[status] ?? { label: status, className: "" };
  const otherParty = viewAs === "mentor" ? entrepreneurName : mentorName;
  const otherLabel = viewAs === "mentor" ? "Entrepreneur" : "Mentor";

  const canAccept   = viewAs === "mentor" && status === "pending";
  const canDecline  = viewAs === "mentor" && status === "pending";
  const canComplete = viewAs === "mentor" && status === "accepted";
  const canCancel   =
    (status === "pending"  && viewAs === "entrepreneur") ||
    (status === "accepted" && (viewAs === "mentor" || viewAs === "entrepreneur"));

  const handleSend = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSendMessage(id, replyText);
    setReplyText("");
  };

  return (
    <div className={`booking-card booking-card-${status}`}>
      <div className="booking-card-header">
        <div className="booking-card-date">{formatDate(date)}</div>
        <span className={`booking-badge ${badgeConfig.className}`}>
          {badgeConfig.label}
        </span>
      </div>

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
            <span className="booking-card-label">Initial Note</span>
            <p>{message}</p>
          </div>
        )}

        {/* Messaging History */}
        {(chat.length > 0 || status === 'pending' || status === 'accepted') && (
          <div className="booking-card-messaging-section">
            <button 
              type="button" 
              className="booking-chat-toggle-btn"
              onClick={() => setShowChat(!showChat)}
            >
              {showChat ? "Hide Messages" : `Show Messages ${chat.length > 0 ? `(${chat.length})` : ""}`}
              <span className="booking-chat-toggle-icon">{showChat ? "▴" : "▾"}</span>
            </button>

            {showChat && (
              <div className="booking-chat-container">
                {chat.length > 0 && (
                  <div className="booking-chat-history">
                    {chat.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`booking-chat-msg ${msg.senderId === currentUserId ? 'msg-own' : 'msg-other'}`}
                      >
                        <div className="msg-bubble">
                          <div className="msg-header">
                            <span className="msg-author">{msg.senderName}</span>
                          </div>
                          <div className="msg-text">{msg.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(status === 'pending' || status === 'accepted') && (
                  <form className="booking-reply-form" onSubmit={handleSend}>
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button type="submit" className="booking-reply-btn" disabled={!replyText.trim()}>
                      Send
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {status === "cancelled" && cancelledBy && (
          <div className="booking-card-cancelled-note">
            {cancelledBy === "mentor" ? "Cancelled by mentor. Refund applies if paid." : "Cancelled by entrepreneur."}
          </div>
        )}
      </div>

      <div className="booking-card-actions">
        {canAccept && <button className="booking-btn-accept" onClick={() => onAccept(booking)}>Accept</button>}
        {canDecline && <button className="booking-btn-decline" onClick={() => onDecline(booking)}>Decline</button>}
        {canComplete && <button className="booking-btn-complete" onClick={() => onComplete(booking)}>Complete</button>}
        {canCancel && <button className="booking-btn-cancel" onClick={() => onCancel(booking)}>Cancel</button>}
      </div>
    </div>
  );
}

export default BookingCard;
