// Vamos a crear este archivo: /lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Aquí colocarás los datos de tu proyecto desde Firebase Console
  apiKey: "AIzaSyCf9hHyBIlFDA9Ld5IF4Wio1CnSo1hfpuo",
  authDomain: "nexus-app-55885.firebaseapp.com",
  projectId: "nexus-app-55885",
  storageBucket: "nexus-app-55885.appspot.com",
  messagingSenderId: "299453480536",
  appId: "1:299453480536:web:a768b76b494f13a047142d",
  measurementId: "G-G6EFYH2JRS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);