import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
// Load a single user's profile from Firestore: users/{uid}
export async function getUserProfile(uid) {
  // 1) Build a reference to the document: users/{uid}
  const userRef = doc(db, "users", uid);
  // 2) Fetch the document snapshot from Firestore
  const snap = await getDoc(userRef);
  // 3) If no document exists, return null (dashboard can handle this case)
  if (!snap.exists()) {
    return null;
  }
  // 4) Return a plain JS object with id + data
  return {
    id: snap.id,
    ...snap.data(),
  };
}