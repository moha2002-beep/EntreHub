/**
 * userService.js — Firestore operations for user profiles and account standing.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  deleteField,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Hour range for mentor availability selects (6 AM – 10 PM)
const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h      = i + 6;
  const period = h < 12 ? "AM" : "PM";
  const h12    = h % 12 || 12;
  const value  = `${String(h).padStart(2, "0")}:00`;
  return { value, label: `${h12}:00 ${period}` };
});

export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Error loading profile:", error);
    throw error;
  }
}

export async function createUserProfile(uid, data) {
  try {
    await setDoc(
      doc(db, "users", uid),
      { ...data, createdAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
}

export async function updateUserProfile(uid, data) {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

export async function getMentors() {
  try {
    const q = query(collection(db, "users"), where("role", "==", "mentor"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching mentors:", error);
    throw error;
  }
}

/**
 * Returns the schema definition for role-specific profile fields.
 */
export function getRoleSpecificFields(role) {
  const roleFields = {
    entrepreneur: {
      section: "Venture Details",
      fields: [
        { key: "currentStage", label: "Current Stage", type: "select", required: true },
        { key: "goals", label: "Goals", type: "textarea", required: true },
        { key: "interests", label: "Interests (comma-separated)", type: "text", required: false },
        { key: "founded", label: "Founded Date", type: "date", required: false },
        {
          key: "availabilityPref",
          label: "Your availability",
          type: "select",
          options: [
            { value: "weekdays", label: "Weekdays" },
            { value: "weekends", label: "Weekends" },
            { value: "flexible", label: "Flexible" },
          ],
          required: false,
        },
        { key: "maxHourlyRate", label: "Max hourly rate budget (£)", type: "number", required: false },
      ],
    },
    mentor: {
      section: "Expertise Details",
      fields: [
        { key: "headline", label: "Headline", type: "text", required: true },
        { key: "expertiseTags", label: "Expertise Tags (comma-separated)", type: "text", required: true },
        { key: "availability", label: "Availability (which days)", type: "select", required: true },
        { key: "availabilityHoursStart", label: "Available from", type: "select", options: HOUR_OPTIONS, required: false },
        { key: "availabilityHoursEnd", label: "Available until", type: "select", options: HOUR_OPTIONS, required: false },
        { key: "yearsOfExperience", label: "Years of Experience", type: "number", required: false },
        { key: "hourlyRate", label: "Hourly Rate (£)", type: "number", required: false },
        {
          key: "preferredStages",
          label: "Preferred startup stages",
          type: "checkboxgroup",
          options: [
            { value: "idea",    label: "Idea Stage" },
            { value: "mvp",     label: "MVP"        },
            { value: "growth",  label: "Growth"     },
            { value: "scaling", label: "Scaling"    },
          ],
          required: false,
        },
      ],
    },
    investor: {
      section: "Investment Preferences",
      fields: [
        { key: "investmentFocus", label: "Investment Focus (comma-separated)", type: "text", required: true },
        { key: "checkSize", label: "Typical Check Size", type: "text", required: true },
        { key: "portfolio", label: "Portfolio Companies (comma-separated)", type: "text", required: false },
      ],
    },
  };

  return roleFields[role] || { section: "Additional Info", fields: [] };
}

//  ACCOUNT STANDING 

/**
 * Atomically escalates account status based on violation count.
 * 1 violation = warned, 2 = suspended (7 days), 3 = banned.
 */
export async function recordViolation(uid, reason) {
  const ref = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.accountStatus === "banned") return;

    const newCount = (data.violationCount || 0) + 1;
    const update = { violationCount: newCount };

    if (newCount === 1) {
      update.accountStatus = "warned";
    } else if (newCount === 2) {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      update.accountStatus     = "suspended";
      update.suspendedUntil    = Timestamp.fromDate(sevenDaysFromNow);
      update.suspensionReason  = reason;
    } else {
      update.accountStatus = "banned";
      update.banReason     = reason;
    }

    tx.update(ref, update);
  });
}

/**
 * Resets account status to 'active' and removes suspension metadata.
 */
export async function reinstateUser(uid) {
  await updateDoc(doc(db, "users", uid), {
    accountStatus: "active",
    suspendedUntil: deleteField(),
    suspensionReason: deleteField(),
    banReason: deleteField(),
  });
}

/**
 * Reads account status and auto-lifts expired suspensions.
 */
export async function checkAccountStatus(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return { status: "active" };

  const data   = snap.data();
  const status = data.accountStatus || "active";

  if (status === "suspended") {
    const until = data.suspendedUntil;
    if (until && until.toDate() <= new Date()) {
      await reinstateUser(uid);
      return { status: "active" };
    }
    return {
      status: "suspended",
      until: until ? until.toDate() : null,
      reason: data.suspensionReason || null,
    };
  }

  if (status === "banned") return { status: "banned", reason: data.banReason || null };
  if (status === "warned") return { status: "warned" };

  return { status: "active" };
}
