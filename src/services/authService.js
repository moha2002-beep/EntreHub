import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

// Register a new user
export const registerUser = async (email, password, displayName, role) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, {
      displayName: displayName,
    });

    // TODO: Store additional user data (role, profile info) in Firestore
    // For now, role can be stored in custom claims or a separate database

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

// Login user
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

// Logout user
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

// Subscribe to auth state changes
export const subscribeToAuthState = (callback) => {
  const unsubscribe = onAuthStateChanged(auth, callback);
  return unsubscribe;
};

// Get user-friendly error messages
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
  };

  return errorMessages[errorCode] || "An error occurred. Please try again.";
};
