/**
 * authService.js — Firebase Authentication & profile creation.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const registerUser = async (email, password, displayName, role) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const user = userCredential.user;

    await updateProfile(user, {
      displayName: displayName,
    });

    // Match Firestore document ID to Firebase Auth UID
    await setDoc(doc(db, "users", user.uid), {
      displayName: displayName,
      email: email,
      role: role,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: role,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Maps technical Firebase error codes to user-friendly messages.
 */
export const getErrorMessage = (errorCode) => {
  const errorMessages = {
    "auth/email-already-in-use":
      "This email is already registered. Please use a different email or try logging in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password":
      "Password is too weak. Please use at least 6 characters.",
    "auth/operation-not-allowed":
      "Registration is currently disabled. Please try again later.",
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection and try again.",
    "auth/invalid-credential":
      "The email or password you entered is incorrect. Please try again.",
  };

  return errorMessages[errorCode] || "An error occurred. Please try again.";
};
