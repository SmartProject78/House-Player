// ========================================
// HOUSE PLAYER - CONFIGURATION FIREBASE
// ========================================

// Configuration Firebase (on va la remplir après)
const firebaseConfig = {
  apiKey: "AIzaSyCnXAkY056vOTYyXrKFelKpLu4Bs7jn4wM",
  authDomain: "house-player-d00f1.firebaseapp.com",
  databaseURL: "https://house-player-d00f1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "house-player-d00f1",
  storageBucket: "house-player-d00f1.firebasestorage.app",
  messagingSenderId: "516895498262",
  appId: "1:516895498262:web:42d99423aa55c39948d537"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
