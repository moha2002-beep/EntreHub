/**
 * storageService.js — Firebase Storage for profile image uploads.
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads a file to Firebase Storage and returns its public download URL.
 */
export async function uploadProfileImage(uid, file) {
  const fileRef = ref(storage, `profileImages/${uid}/avatar`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
