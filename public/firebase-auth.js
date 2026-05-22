import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider,
    OAuthProvider,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnp-Zst8ebEfBWu0CGmkvGp1YT6DfTze8",
  authDomain: "nutri-paws.vercel.app",
  projectId: "nutripaws-c0d81",
  storageBucket: "nutripaws-c0d81.firebasestorage.app",
  messagingSenderId: "606825253960",
  appId: "1:606825253960:web:eb0aa13a609c3bd4d31c7d",
  measurementId: "G-9R8G01YDMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

window.firebaseAuth = {
    auth,
    signInWithPopup,
    googleProvider,
    appleProvider,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
};
