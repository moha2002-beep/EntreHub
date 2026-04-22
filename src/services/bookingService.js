/**
 * bookingService.js — Firestore operations for bookings.
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
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";

//  CREATE 

export async function createBooking({
  mentorId,
  mentorName,
  entrepreneurId,
  entrepreneurName,
  date,
  timeSlot,
  hourlyRate,
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
    chat: [],
    status: "pending",
    cancelledBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// REAL-TIME LISTENERS 

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

// AVAILABILITY CHECK 

/**
 * Fetches accepted time slots to disable 'Booked' slots in UI.
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

// STATUS & MESSAGING UPDATES 

export async function updateBookingStatus(bookingId, status, extra = {}) {
  const ref = doc(db, "bookings", bookingId);
  await updateDoc(ref, {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Sends a message within a booking context using atomic arrayUnion.
 */
export async function sendBookingMessage(bookingId, senderId, senderName, text) {
  const ref = doc(db, "bookings", bookingId);
  const newMessage = {
    senderId,
    senderName,
    text: text.trim(),
    timestamp: Date.now(),
  };

  await updateDoc(ref, {
    chat: arrayUnion(newMessage),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Automatically declines conflicting pending requests once one is accepted.
 */
async function autoDeclineConflicts(mentorId, date, timeSlot, acceptedBookingId) {
  const q = query(
    collection(db, "bookings"),
    where("mentorId", "==", mentorId),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);
  const conflicts = snapshot.docs.filter((d) => {
    const data = d.data();
    return (
      d.id !== acceptedBookingId &&
      data.timeSlot === timeSlot &&
      data.status === "pending"
    );
  });

  if (conflicts.length === 0) return;
  
  // Use a batch write for atomicity
  const batch = writeBatch(db);
  const now = serverTimestamp();
  conflicts.forEach((d) => {
    batch.update(d.ref, { status: "declined", updatedAt: now });
  });
  await batch.commit();
}

export async function acceptBooking(bookingId, mentorId, date, timeSlot) {
  await updateBookingStatus(bookingId, "accepted");
  await autoDeclineConflicts(mentorId, date, timeSlot, bookingId);
}
