/**
 * Bookings.jsx — Booking management for mentors and entrepreneurs.
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
  sendBookingMessage,
} from "../services/bookingService";
import BookingCard from "../components/BookingCard";
import Navbar from "../components/Navbar";
import "../styles/Bookings.css";

function todayString() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Sorts bookings chronologically.
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

function Bookings() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [profile,        setProfile]        = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bookings,       setBookings]       = useState([]);
  const [actionError,    setActionError]    = useState("");

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
    return () => unsubscribe?.();
  }, [profile, user]);

  const handleAccept = async (booking) => {
    setActionError("");
    try {
      await acceptBooking(booking.id, booking.mentorId, booking.date, booking.timeSlot);
    } catch (err) {
      console.error("Accept failed:", err);
      setActionError("Could not accept booking.");
    }
  };

  const handleDecline = async (booking) => {
    if (!window.confirm("Decline this booking request?")) return;
    setActionError("");
    try {
      await updateBookingStatus(booking.id, "declined");
    } catch (err) {
      console.error("Decline failed:", err);
      setActionError("Could not decline booking.");
    }
  };

  const handleComplete = async (booking) => {
    if (!window.confirm("Mark this session as completed?")) return;
    setActionError("");
    try {
      await updateBookingStatus(booking.id, "completed");
    } catch (err) {
      console.error("Complete failed:", err);
      setActionError("Could not update booking.");
    }
  };

  /**
   * Logic: Role-specific confirmation messages and status transitions.
   */
  const handleCancel = async (booking) => {
    const isMentor = profile.role === "mentor";
    let confirmMessage;
    if (isMentor && booking.status === "accepted") {
      const cost = booking.hourlyRate > 0 ? `£${booking.hourlyRate}` : "the session fee";
      confirmMessage = `Cancel this session? A refund of ${cost} will be issued.`;
    } else if (booking.status === "accepted") {
      confirmMessage = "Cancel this accepted session? No refund will be issued.";
    } else {
      confirmMessage = "Withdraw this booking request?";
    }
    if (!window.confirm(confirmMessage)) return;
    setActionError("");
    try {
      await updateBookingStatus(booking.id, "cancelled", {
        cancelledBy: profile.role,
      });
    } catch (err) {
      console.error("Cancel failed:", err);
      setActionError("Could not cancel booking.");
    }
  };

  const handleSendMessage = async (bookingId, text) => {
    setActionError("");
    try {
      const displayName = profile?.displayName || user?.displayName || user?.email;
      await sendBookingMessage(bookingId, user.uid, displayName, text);
    } catch (err) {
      console.error("Message send failed:", err);
      setActionError("Could not send message.");
    }
  };

  const today = todayString();
  
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
    "desc"
  );
  
  const allBookingsSorted = sortByDateTime(bookings, "desc");

  if (!user || loadingProfile) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="loading-state">
            <div className="spinner spinner-light" />
            <p className="loading-state-text">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Props passed down to children BookingCards
  const cardProps = {
    viewAs:        profile.role,
    currentUserId: user.uid,
    onAccept:      handleAccept,
    onDecline:     handleDecline,
    onComplete:    handleComplete,
    onCancel:      handleCancel,
    onSendMessage: handleSendMessage,
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-body page-entry">
        <div className="bookings-inner">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {profile.role === "mentor" ? "Your Bookings" : "My Bookings"}
              </h1>
            </div>
          </div>

          {actionError && <div className="alert alert-error">{actionError}</div>}

          {/* Mentor View: Sectioned list */}
          {profile.role === "mentor" ? (
            <>
              <section className="bookings-section">
                <h2 className="bookings-section-title">Pending Requests ({pendingBookings.length})</h2>
                <div className="bookings-list">
                  {pendingBookings.map((b) => <BookingCard key={b.id} booking={b} {...cardProps} />)}
                </div>
              </section>
              <section className="bookings-section">
                <h2 className="bookings-section-title">Upcoming Sessions ({upcomingBookings.length})</h2>
                <div className="bookings-list">
                  {upcomingBookings.map((b) => <BookingCard key={b.id} booking={b} {...cardProps} />)}
                </div>
              </section>
              <section className="bookings-section">
                <h2 className="bookings-section-title">History</h2>
                <div className="bookings-list">
                  {historyBookings.map((b) => <BookingCard key={b.id} booking={b} {...cardProps} />)}
                </div>
              </section>
            </>
          ) : (
            /* Entrepreneur View: Single chronological feed */
            <section className="bookings-section">
              <h2 className="bookings-section-title">All Bookings ({bookings.length})</h2>
              <div className="bookings-list">
                {allBookingsSorted.map((b) => <BookingCard key={b.id} booking={b} {...cardProps} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default Bookings;
