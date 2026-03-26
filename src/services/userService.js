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
} from "firebase/firestore";
import { db } from "./firebase";

// Pre-built option list for the availability hour select fields.
// Covers 6:00 AM – 10:00 PM in 1-hour increments.
const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h      = i + 6; // 6 → 22
  const period = h < 12 ? "AM" : "PM";
  const h12    = h % 12 || 12;
  const value  = `${String(h).padStart(2, "0")}:00`;
  return { value, label: `${h12}:00 ${period}` };
});

/**
 * Load a user's complete profile from Firestore
 * This function demonstrates:
 * - Reading from Firestore
 * - Error handling
 * - Data transformation
 */
export async function getUserProfile(uid) {
  try {
    // Step 1: Create a reference to the document
    const userRef = doc(db, "users", uid);

    // Step 2: Fetch the actual document from Firestore
    // This is like opening that file
    const snap = await getDoc(userRef);

    // Step 3: Check if document exists
    if (!snap.exists()) {
      console.log("No profile found for user:", uid);
      return null;
    }

    // Step 4: Return the data with the document ID
    // This merges the document ID with all the fields inside
    return {
      id: snap.id,
      ...snap.data(), // Spread the document data (displayName, email, role, etc.)
    };
  } catch (error) {
    console.error("Error loading profile:", error);
    throw error; // Rethrow so the component can handle it
  }
}

/**
 * Create a new user profile in Firestore
 * This is called during registration (already exists)
 */
export async function createUserProfile(uid, data) {
  try {
    const ref = doc(db, "users", uid);

    // Use setDoc with merge: true to add to existing data
    // This preserves any fields that already exist
    await setDoc(
      ref,
      {
        ...data,
        createdAt: serverTimestamp(), // Server generates timestamp for accuracy
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
}

/**
 * Update specific fields in a user's profile
 * This is used when user edits their profile
 *
 * Example usage:
 * updateUserProfile(uid, { bio: "New bio", headline: "My new headline" })
 */
export async function updateUserProfile(uid, data) {
  try {
    const ref = doc(db, "users", uid);

    // updateDoc only changes the fields you specify
    // It doesn't touch other fields
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(), // Track when profile was last updated
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

/**
 * Fetch all users with role === "mentor" from Firestore.
 * Demonstrates: collection reference, query with where, getDocs.
 */
export async function getMentors() {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "mentor"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching mentors:", error);
    throw error;
  }
}

/**
 * Helper function: Get role-specific fields
 * This shows which fields are required for each role
 */
export function getRoleSpecificFields(role) {
  const roleFields = {
    entrepreneur: {
      section: "Venture Details",
      fields: [
        {
          key: "currentStage",
          label: "Current Stage",
          type: "select",
          required: true,
        },
        { key: "goals", label: "Goals", type: "textarea", required: true },
        {
          key: "interests",
          label: "Interests (comma-separated)",
          type: "text",
          required: false,
        },
        {
          key: "founded",
          label: "Founded Date",
          type: "date",
          required: false,
        },
        // Used by the recommendation engine (component 5 — availability alignment)
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
        // Used by the recommendation engine (component 7 — budget match)
        {
          key: "maxHourlyRate",
          label: "Max hourly rate budget (£)",
          type: "number",
          required: false,
        },
      ],
    },
    mentor: {
      section: "Expertise Details",
      fields: [
        { key: "headline", label: "Headline", type: "text", required: true },
        {
          key: "expertiseTags",
          label: "Expertise Tags (comma-separated)",
          type: "text",
          required: true,
        },
        {
          key: "availability",
          label: "Availability (which days)",
          type: "select",
          required: true,
        },
        // New: what hours the mentor is available each day — rendered as a select
        {
          key: "availabilityHoursStart",
          label: "Available from",
          type: "select",
          options: HOUR_OPTIONS,
          required: false,
        },
        {
          key: "availabilityHoursEnd",
          label: "Available until",
          type: "select",
          options: HOUR_OPTIONS,
          required: false,
        },
        {
          key: "yearsOfExperience",
          label: "Years of Experience",
          type: "number",
          required: false,
        },
        // Used by the recommendation engine (component 7 — budget match)
        {
          key: "hourlyRate",
          label: "Hourly Rate (£)",
          type: "number",
          required: false,
        },
        // Used by the recommendation engine (component 3 — stage alignment)
        // Stored as an array: ["idea", "mvp"] etc.
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
        {
          key: "investmentFocus",
          label: "Investment Focus (comma-separated)",
          type: "text",
          required: true,
        },
        {
          key: "checkSize",
          label: "Typical Check Size",
          type: "text",
          required: true,
        },
        {
          key: "portfolio",
          label: "Portfolio Companies (comma-separated)",
          type: "text",
          required: false,
        },
      ],
    },
  };

  return roleFields[role] || { section: "Additional Info", fields: [] };
}
