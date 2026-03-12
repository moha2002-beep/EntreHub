import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadProfileImage(uid, file) {
  const fileRef = ref(storage, `profileImages/${uid}/avatar`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
