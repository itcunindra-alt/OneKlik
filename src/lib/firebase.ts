import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBT0KJRaOAlTSR5S1MD72whlYWGjtmKRNM",
  authDomain: "storyengine-9c0ef.firebaseapp.com",
  projectId: "storyengine-9c0ef",
  storageBucket: "storyengine-9c0ef.firebasestorage.app",
  messagingSenderId: "249040249165",
  appId: "1:249040249165:web:6cdad09bf9b55de1d59704"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
