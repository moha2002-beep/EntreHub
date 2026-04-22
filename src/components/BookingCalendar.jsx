/**
 * BookingCalendar.jsx — 3-step booking flow for MentorDetail page.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { createBooking, getAcceptedSlotsForMentor } from "../services/bookingService";
import "../styles/Bookings.css";

// Constants 

const AVAILABILITY_DAYS = {
  weekdays: [1, 2, 3, 4, 5],
  weekends: [0, 6],
  flexible: [0, 1, 2, 3, 4, 5, 6],
};

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];

// helper functions 

/**
 * Generates 1-hour time slot strings between startTime and endTime.
 */
function generateSlots(startTime = "09:00", endTime = "17:00") {
  const startH = parseInt(startTime.split(":")[0], 10);
  const endH   = parseInt(endTime.split(":")[0],   10);
  const slots  = [];
  for (let h = startH; h < endH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

/**
 * Returns an array of the next `count` Date objects starting from today.
 */
function getUpcomingDates(count = 28) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

/**
 * Formats a Date as "YYYY-MM-DD" using local time to avoid UTC shifts.
 */
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(timeStr) {
  const h      = parseInt(timeStr.split(":")[0], 10);
  const period = h < 12 ? "AM" : "PM";
  const h12    = h % 12 || 12;
  return `${h12}:00 ${period}`;
}

function getEndSlot(startSlot) {
  const h = parseInt(startSlot.split(":")[0], 10) + 1;
  return `${String(h).padStart(2, "0")}:00`;
}

function formatCost(rate) {
  if (!rate || rate <= 0) return "Free";
  return `£${Number(rate).toLocaleString()}`;
}

// Component  

function BookingCalendar({ mentor }) {
  const { user } = useAuth();

  const [userProfile, setUserProfile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Accepted slots are disabled as "Booked" in the UI
  const [bookedSlots, setBookedSlots]     = useState([]);
  const [loadingSlots, setLoadingSlots]   = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState("");

  const [step, setStep]           = useState("calendar");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setUserProfile).catch(console.error);
  }, [user]);

  /**
   * Refetch availability whenever the selected date changes.
   */
  useEffect(() => {
    if (!selectedDate) return;

    setLoadingSlots(true);
    setSelectedSlot(null);

    getAcceptedSlotsForMentor(mentor.id, toDateString(selectedDate))
      .then(setBookedSlots)
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, mentor.id]);

  // Derived values 
  // These are re-computed on every render.  Since they depend only on the
  // mentor prop (which doesn't change while the page is open), this is
  // efficient and keeps the state surface minimal.

  const availableDayNums = AVAILABILITY_DAYS[mentor.availability] ?? AVAILABILITY_DAYS.flexible;

  // Filter the next 28 days to only the days the mentor works
  const availableDates = getUpcomingDates(28).filter((d) =>
    availableDayNums.includes(d.getDay())
  );

  // Generate 1-hour slots within the mentor's configured window
  const allSlots = generateSlots(
    mentor.availabilityHoursStart || "09:00",
    mentor.availabilityHoursEnd   || "17:00"
  );

  //  Event handlers

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setStep("calendar");
    setError("");
  };

  const handleSlotSelect = (slot) => {
    if (bookedSlots.includes(slot)) return; // slot taken — ignore the click
    setSelectedSlot(slot);
    setStep("confirm");
    setError("");
  };

  const handleConfirm = async () => {
    if (!user || !userProfile || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setError("");

    try {
      await createBooking({
        mentorId:          mentor.id,
        mentorName:        mentor.displayName,
        entrepreneurId:    user.uid,
        entrepreneurName:  userProfile.displayName || user.email,
        date:              toDateString(selectedDate),
        timeSlot:          selectedSlot,
        hourlyRate:        mentor.hourlyRate || 0,
        message,
      });
      setStep("success");
    } catch (err) {
      console.error("Failed to create booking:", err);
      setError("Failed to send booking request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Resets all state back to the initial calendar view. */
  const handleReset = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setMessage("");
    setStep("calendar");
    setError("");
  };

  // Render: success screen 

  if (step === "success") {
    return (
      <div className="booking-success">
        <div className="booking-success-icon">✓</div>
        <h3>Booking request sent!</h3>
        <p>
          Your request for{" "}
          <strong>{formatTime(selectedSlot)}</strong> on{" "}
          <strong>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </strong>{" "}
          has been sent to <strong>{mentor.displayName}</strong>.
          You will see the status update in your{" "}
          <a href="/bookings">Bookings page</a>.
        </p>
        <button
          type="button"
          className="booking-btn-primary"
          onClick={handleReset}
        >
          Book another slot
        </button>
      </div>
    );
  }

  // Render: confirm screen

  if (step === "confirm") {
    return (
      <div className="booking-confirm">
        <h3 className="booking-section-title">Confirm your booking</h3>

        {/* Cost summary — entrepreneur sees the full price before committing */}
        <div className="booking-summary">
          <div className="booking-summary-row">
            <span>Mentor</span>
            <strong>{mentor.displayName}</strong>
          </div>
          <div className="booking-summary-row">
            <span>Date</span>
            <strong>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </strong>
          </div>
          <div className="booking-summary-row">
            <span>Time</span>
            <strong>
              {formatTime(selectedSlot)} – {formatTime(getEndSlot(selectedSlot))}
            </strong>
          </div>
          <div className="booking-summary-row booking-summary-total">
            <span>Session cost</span>
            <strong>{formatCost(mentor.hourlyRate)}</strong>
          </div>
        </div>

        {/* Optional message to the mentor */}
        <div className="booking-message-group">
          <label htmlFor="booking-message">
            Message to mentor <span className="booking-optional">(optional)</span>
          </label>
          <textarea
            id="booking-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Briefly describe what you'd like to work on…"
            rows={3}
            disabled={submitting}
          />
        </div>

        {error && <p className="booking-error">{error}</p>}

        <div className="booking-confirm-actions">
          <button
            type="button"
            className="booking-btn-primary"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send booking request"}
          </button>
          <button
            type="button"
            className="booking-btn-secondary"
            onClick={() => setStep("calendar")}
            disabled={submitting}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  //  Render: calendar screen (step === "calendar") 

  return (
    <div className="booking-calendar">

      {/*  Date strip  */}
      <h3 className="booking-section-title">Select a date</h3>

      {availableDates.length === 0 ? (
        <p className="booking-empty">
          This mentor has no available dates in the next 4 weeks.
        </p>
      ) : (
        <div className="booking-date-row">
          {availableDates.map((date) => {
            const dateStr    = toDateString(date);
            const isSelected = selectedDate && toDateString(selectedDate) === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                className={`booking-date-btn${isSelected ? " booking-date-btn-active" : ""}`}
                onClick={() => handleDateSelect(date)}
              >
                <span className="booking-date-day">{DAY_NAMES[date.getDay()]}</span>
                <span className="booking-date-num">{date.getDate()}</span>
                <span className="booking-date-mon">{MONTH_NAMES[date.getMonth()]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/*  Time slot grid (only shown after a date is selected)  */}
      {selectedDate && (
        <>
          <h3 className="booking-section-title" style={{ marginTop: "1.5rem" }}>
            Select a time slot
          </h3>

          {loadingSlots ? (
            <p className="booking-empty">Checking availability…</p>
          ) : allSlots.length === 0 ? (
            <p className="booking-empty">
              No time slots are configured for this mentor yet.
            </p>
          ) : (
            <div className="booking-slots-grid">
              {allSlots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`booking-slot-btn${isBooked ? " booking-slot-booked" : ""}`}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={isBooked}
                    title={isBooked ? "This slot is already booked" : formatTime(slot)}
                  >
                    {formatTime(slot)}
                    {isBooked && (
                      <span className="booking-slot-booked-label">Booked</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BookingCalendar;
