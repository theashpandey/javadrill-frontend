import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

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

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
    avatar: user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    idToken,
  };
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
