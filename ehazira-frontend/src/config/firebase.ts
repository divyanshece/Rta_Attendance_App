import { initializeApp } from 'firebase/app'
import { getAuth, initializeAuth, browserLocalPersistence, GoogleAuthProvider, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// On native (Capacitor WKWebView), IndexedDB can hang silently, so use
// initializeAuth with browserLocalPersistence. On web, use getAuth which
// includes the popup/redirect resolver needed by signInWithPopup.
const isNative = typeof window !== 'undefined' &&
  (window as any).Capacitor?.isNativePlatform?.()

let auth: Auth
if (isNative) {
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    })
  } catch {
    auth = getAuth(app)
  }
} else {
  auth = getAuth(app)
}

export { auth }
export const googleProvider = new GoogleAuthProvider()

// Force account selection every time
googleProvider.setCustomParameters({
  prompt: 'select_account'
})