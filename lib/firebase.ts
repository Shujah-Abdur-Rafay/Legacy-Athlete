import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6jjpkK0ADGiebYDhOiZs_uvQKtgQBtgo",
  authDomain: "limitless-athlete-1e02a.firebaseapp.com",
  projectId: "limitless-athlete-1e02a",
  storageBucket: "limitless-athlete-1e02a.firebasestorage.app",
  messagingSenderId: "1030103982518",
  appId: "1:1030103982518:web:5df7d0d4ee4777a6cc6117"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();
