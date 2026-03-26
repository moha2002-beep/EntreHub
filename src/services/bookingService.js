/**
 * bookingService.js
 *
 * All Firestore operations for the booking feature.
 *
 * Data model — top-level "bookings" collection chosen over a subcollection
 * because BOTH mentors and entrepreneurs need to query bookings from their
 * own perspective.  A subcollection under users/{mentorId}/bookings would
 * require a Firestore "collection group query" to fetch an entrepreneur's
 * own bookings — a harder concept.  A top-level collection lets both sides
 * use a simple where() filter that pairs cleanly with onSnapshot.
 */

import {
  collection,
  addDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── CREATE ────────────────────────────────────────────────────────────────

/**
 * Creates a new booking request with status "pending".
 * Called by an entrepreneur from the BookingCalendar component.
 *
 * We snapshot hourlyRate at booking time so future profile edits
 * by the mentor don't silently change what the entrepreneur agreed to.
 *
 * Returns the new document's auto-generated ID.
 */
export async function createBooking({
  mentorId,
  mentorName,
  entrepreneurId,
  entrepreneurName,
  date,       // "YYYY-MM-DD"
  timeSlot,   // "09:00" — start of the 1-hour slot
  hourlyRate, // number — snapshotted at booking time
  message = "",
}) {
  const docRef = await addDoc(collection(db, "bookings"), {
    mentorId,
    mentorName,
    entrepreneurId,
    entrepreneurName,
    date,
    timeSlot,
    hourlyRate,
    message,
    status: "pending",
    cancelledBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── REAL-TIME LISTENERS ───────────────────────────────────────────────────

/**
 * Subscribes to all bookings where this user is the MENTOR.
 *
 * Teaching note — onSnapshot vs getDocs:
 *   getDocs()    → one-shot read, returns a Promise
 *   onSnapshot() → persistent listener, fires immediately with current data
 *                  then fires again on EVERY subsequent change
 *
 * onSnapshot returns an "unsubscribe" function.  Always call it when the
 * component unmounts (inside the useEffect return) to avoid memory leaks
 * and Firestore billing for a listener nobody is reading.
 *
 * Usage in a component:
 *   useEffect(() => {
 *     const unsub = listenToMentorBookings(uid, setBookings, console.error);
 *     return () => unsub();   // ← cleanup
 *   }, [uid]);
 */
export function listenToMentorBookings(mentorId, onUpdate, onError) {
  const q = query(
    collection(db, "bookings"),
    where("mentorId", "==", mentorId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(bookings);
    },
    onError
  );
}

/**
 * Subscribes to all bookings where this user is the ENTREPRENEUR.
 * Identical pattern to listenToMentorBookings — same concept, different filter.
 */
export function listenToEntrepreneurBookings(entrepreneurId, onUpdate, onError) {
  const q = query(
    collection(db, "bookings"),
    where("entrepreneurId", "==", entrepreneurId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(bookings);
    },
    onError
  );
}

// ─── AVAILABILITY CHECK ────────────────────────────────────────────────────

/**
 * Returns an array of already-accepted time slot strings for a given mentor
 * on a specific date.  Used by BookingCalendar to grey out unavailable slots.
 *
 * Teaching note — composite index:
 *   This query filters on TWO different fields (mentorId AND date).
 *   Firestore requires a composite index for any query with multiple where()
 *   clauses on different fields.  The first time this query runs in
 *   development, Firestore will log a clickable URL in the browser console
 *   that creates the index automatically in 1–2 minutes.
 *
 * We fetch all bookings for that mentor+date and then filter status in JS
 * rather than adding a third where() clause, to avoid needing a 3-field
 * composite index.
 */
export async function getAcceptedSlotsForMentor(mentorId, date) {
  const q = query(
    collection(db, "bookings"),
    where("mentorId", "==", mentorId),
    where("date", "==", date)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => b.status === "accepted")
    .map((b) => b.timeSlot);
}

// ─── STATUS UPDATES ────────────────────────────────────────────────────────

/**
 * Generic helper to change a booking's status.
 * The `extra` object lets callers attach additional fields (e.g. cancelledBy).
 */
export async function updateBookingStatus(bookingId, status, extra = {}) {
  const ref = doc(db, "bookings", bookingId);
  await updateDoc(ref, {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}

/**
 * When a mentor accepts booking A for slot X, every OTHER pending booking
 * for that same mentor + date + slot must be auto-declined — the slot is now
 * taken and the slot picker will no longer show it as available.
 *
 * Teaching note — writeBatch:
 *   writeBatch() groups multiple writes into a single atomic operation.
 *   "Atomic" means ALL writes succeed or NONE do — you never end up with
 *   some declined and some still pending after a network failure.
 *   Batch writes also count as a single Firestore round-trip, which is
 *   cheaper than N separate updateDoc() calls.
 *
 *   Steps:
 *     1. writeBatch(db)          — open a batch
 *     2. batch.update(ref, data) — queue one or more writes
 *     3. batch.commit()          — send all queued writes at once
 */
async function autoDeclineConflicts(mentorId, date, timeSlot, acceptedBookingId) {
  // Reuse the same mentorId + date composite index
  const q = query(
    collection(db, "bookings"),
    where("mentorId", "==", mentorId),
    where("date", "==", date)
  );

  const snapshot = await getDocs(q);

  // Filter in JS: only pending bookings for the same time slot, excluding
  // the one we just accepted
  const conflicts = snapshot.docs.filter((d) => {
    const data = d.data();
    return (
      d.id !== acceptedBookingId &&
      data.timeSlot === timeSlot &&
      data.status === "pending"
    );
  });

  if (conflicts.length === 0) return;

  const batch = writeBatch(db);
  const now = serverTimestamp();

  conflicts.forEach((d) => {
    batch.update(d.ref, { status: "declined", updatedAt: now });
  });

  await batch.commit();
}

/**
 * Accepts a booking, then auto-declines all other pending bookings that
 * were competing for the same slot.  Both happen in sequence.
 */
export async function acceptBooking(bookingId, mentorId, date, timeSlot) {
  await updateBookingStatus(bookingId, "accepted");
  await autoDeclineConflicts(mentorId, date, timeSlot, bookingId);
}
