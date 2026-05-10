import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCv33WveF_ILY1on5C966BeGkQUf3zVjCE",
  authDomain: "assessarc.com",
  projectId: "assessarc-6cd04",
  storageBucket: "assessarc-6cd04.firebasestorage.app",
  messagingSenderId: "869826255999",
  appId: "1:869826255999:web:7de72bc204f1ee109cf34a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const DEFAULT_AVATAR_URL = `${window.location.origin}/default-avatar.svg`;

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
    photoUrl: user.photoURL || DEFAULT_AVATAR_URL,
    avatar: user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    idToken,
  };
};

export async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);

  try {
    if (auth.currentUser && !auth.currentUser.providerData.some(p => p.providerId === 'google.com')) {
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      return toUserAuthData(result.user);
    }
    const result = await signInWithPopup(auth, googleProvider);
    return toUserAuthData(result.user);
  } catch (error) {
    if (!popupFallbackCodes.has(error?.code)) throw error;
    if (auth.currentUser && !auth.currentUser.providerData.some(p => p.providerId === 'google.com')) {
      await linkWithRedirect(auth.currentUser, googleProvider);
    } else {
      await signInWithRedirect(auth, googleProvider);
    }
    return null;
  }
}

export async function signUpWithEmail({ name, email, password }) {
  await setPersistence(auth, browserLocalPersistence);
  const cleanName = name.trim();
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(result.user, {
    displayName: cleanName,
    photoURL: DEFAULT_AVATAR_URL,
  });
  await result.user.getIdToken(true);
  return toUserAuthData(result.user);
}

export async function signInWithEmail({ email, password }) {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return toUserAuthData(result.user);
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
    photoUrl: user.photoURL || DEFAULT_AVATAR_URL,
    avatar: user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  };
}



export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}
