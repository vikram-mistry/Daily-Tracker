import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDTJhhOVT1oLIVCxj9QDJbT1DafnIKoxmc",
  authDomain: "trackit-app-dc1d5.firebaseapp.com",
  projectId: "trackit-app-dc1d5",
  storageBucket: "trackit-app-dc1d5.firebasestorage.app",
  messagingSenderId: "436927794751",
  appId: "1:436927794751:web:209151d70f8f23d312f28a"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

try {
  enableIndexedDbPersistence(firestore);
} catch (err) {
  console.log("Firestore persistence error", err);
}

export { firestore, auth, provider, signInWithPopup, signOut, onAuthStateChanged, updateProfile };
