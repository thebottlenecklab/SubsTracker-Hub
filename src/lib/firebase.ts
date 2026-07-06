import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || config.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || config.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId || ""
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore using the configured database with ignoreUndefinedProperties
const dbId = metaEnv.VITE_FIREBASE_DATABASE_ID || (config as any).firestoreDatabaseId || "(default)";
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, dbId);

// Initialize Firebase Authentication
export const auth = getAuth(app);
