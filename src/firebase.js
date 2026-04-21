import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCc3rwlIlZd7NaFkd2viT-tYhS9IemsV9o',
  authDomain: 'his-detention.firebaseapp.com',
  projectId: 'his-detention',
  storageBucket: 'his-detention.firebasestorage.app',
  messagingSenderId: '357843127217',
  appId: '1:357843127217:web:88175e347add4931294b90',
  measurementId: 'G-K3X22E8JL5',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
