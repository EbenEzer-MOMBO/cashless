import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Configuration Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDs1ZbzXDEEyEZz-dNk3FEbl88o_8cwRLI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cashless-29418.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cashless-29418",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cashless-29418.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "863868516442",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:863868516442:web:c5881bbb7eefcd998bc063",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RVWL6TXQNJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);

// Initialize Firestore with offline persistence (must be done before any Firestore operations)
let db;
if (typeof window !== 'undefined') {
  try {
    // Use initializeFirestore with persistentLocalCache for offline support
    db = initializeFirestore(app, {
      localCache: persistentLocalCache()
    });
    console.log('✅ Firestore initialized with offline persistence');
  } catch (error: any) {
    console.warn('⚠️ Could not initialize Firestore with persistence, falling back to default:', error);
    // Fallback to default Firestore if persistence fails
    db = getFirestore(app);
  }
} else {
  // Server-side: use default Firestore
  db = getFirestore(app);
}

export { db };

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}

export { analytics };
export default app;


