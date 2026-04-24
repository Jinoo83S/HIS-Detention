const firebaseConfig = {
  apiKey: "AIzaSyCc3rwlIlZd7NaFkd2viT-tYhS9IemsV9o",
  authDomain: "his-detention.firebaseapp.com",
  databaseURL: "https://his-detention-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "his-detention",
  storageBucket: "his-detention.firebasestorage.app",
  messagingSenderId: "357843127217",
  appId: "1:357843127217:web:88175e347add4931294b90",
  measurementId: "G-K3X22E8JL5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();