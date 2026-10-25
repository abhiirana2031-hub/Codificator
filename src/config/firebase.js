import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Check if credentials have been supplied
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_firebase_project_id_here'
);

// Initialize Firebase App
export const app = isFirebaseConfigured
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in using Firebase Email & Password
 */
export async function loginWithFirebaseEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase is not configured yet. Please configure VITE_FIREBASE_* in .env');
  }
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  const token = await result.user.getIdToken();
  return { user: result.user, token };
}

/**
 * Register account with Firebase Email & Password
 */
export async function registerWithFirebaseEmail(email, password, displayName) {
  if (!auth) {
    throw new Error('Firebase is not configured yet. Please configure VITE_FIREBASE_* in .env');
  }
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  const token = await result.user.getIdToken();
  return { user: result.user, token };
}

/**
 * Sign in with Google Popup
 */
export async function loginWithFirebaseGoogle() {
  if (!auth) {
    throw new Error('Firebase is not configured yet. Please configure VITE_FIREBASE_* in .env');
  }
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  return { user: result.user, token };
}

/**
 * Sign out of Firebase
 */
export async function logoutFirebase() {
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Send password reset email
 */
export async function sendFirebasePasswordReset(email) {
  if (!auth) {
    throw new Error('Firebase is not configured yet. Please configure VITE_FIREBASE_* in .env');
  }
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Upload a file to Firebase Cloud Storage and return its public download URL
 */
export async function uploadFileToFirebaseStorage(file, destinationPath) {
  if (!storage) {
    throw new Error('Firebase Storage is not configured yet. Please check VITE_FIREBASE_STORAGE_BUCKET in .env');
  }
  const storageRef = ref(storage, destinationPath);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

/**
 * Listen for Firebase auth state changes
 */
export function onFirebaseAuthState(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
