import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCv8uvlX5HEtyWkhXsmqzuFTCBj9kofOSE",
  authDomain: "javadrill.firebaseapp.com",
  projectId: "javadrill",
  storageBucket: "javadrill.firebasestorage.app",
  messagingSenderId: "167461966993",
  appId: "1:167461966993:web:dd09c4b4fefcbc6db65b30",
  measurementId: "G-TBZ1BZ3NXJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const popupFallbackCodes = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
]);

const toUserAuthData = async (user) => {
  const idToken = await user.getIdToken();
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
    avatar: user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    idToken,
  };
};

export async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return toUserAuthData(result.user);
  } catch (error) {
    if (!popupFallbackCodes.has(error?.code)) throw error;
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
}

export async function completeRedirectSignIn() {
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return toUserAuthData(result.user);
}

export async function firebaseSignOut() {
  await signOut(auth);
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function toUserData(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
    avatar: user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  };
}



export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}
