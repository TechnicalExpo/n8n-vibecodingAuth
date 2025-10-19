// Use CDN imports for Firebase libraries
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

// Configuration Firebase - n8n-vibecoding project
const firebaseConfig = {
  apiKey: "AIzaSyAgz2TZaxIzaVvwvLhdXUn0CsYT-GZNZ9k",
  authDomain: "n8n-vibecoding.firebaseapp.com",
  projectId: "n8n-vibecoding",
  storageBucket: "n8n-vibecoding.firebasestorage.app",
  messagingSenderId: "768576570501",
  appId: "1:768576570501:web:8e758a211bfedfa0efd5ec",
  measurementId: "G-ZYZF76GK5P",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// This ensures we're communicating with the parent frame only if it's our offscreen document
const PARENT_FRAME_ORIGIN = document.location.ancestorOrigins[0];

function sendAuthResponse(result) {
  globalThis.parent.self.postMessage(JSON.stringify(result), PARENT_FRAME_ORIGIN);
}

// Listen for messages from the offscreen document
globalThis.addEventListener('message', async (event) => {
  // Only process messages from our offscreen document
  if (event.origin !== PARENT_FRAME_ORIGIN) {
    console.warn('Received message from unknown origin:', event.origin);
    return;
  }

  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    // If it's not JSON, it might be a Firebase internal message, ignore it
    if (typeof event.data === 'string' && event.data.startsWith('!_{')) {
      return;
    }
    console.error('Failed to parse message from offscreen document:', e, event.data);
    return;
  }

  // --- THIS IS THE CRITICAL CHANGE ---
  // Listen for the 'initAuth' message from offscreen.js
  if (data.initAuth) {
    console.log('Received initAuth message from offscreen document. Triggering Google Sign-in...');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      console.log('Google Sign-in successful:', user);
      sendAuthResponse({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          accessToken: await user.getIdToken(),
          refreshToken: user.refreshToken
        }
      });
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      sendAuthResponse({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
  } else if (data.type === 'FIREBASE_AUTH_GET_TOKEN') {
     console.log('Received request to get ID token from offscreen document.');
     try {
       const user = auth.currentUser;
       if (user) {
         const idToken = await user.getIdToken(/* forceRefresh */ true);
         sendAuthResponse({ success: true, idToken: idToken });
       } else {
         sendAuthResponse({ success: false, message: 'No user signed in.' });
       }
     } catch (error) {
       console.error('Failed to get ID token:', error);
       sendAuthResponse({ success: false, error: { code: error.code, message: error.message } });
     }
  }
});

auth.onAuthStateChanged(user => {
  if (user) {
    console.log('User already signed in within iframe:', user.uid);
  } else {
    console.log('No user signed in within iframe.');
  }
});

console.log('Firebase Auth Iframe script loaded and listening for messages.');
