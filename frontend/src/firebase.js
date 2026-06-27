import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configuración de Firebase utilizando variables de entorno de Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validar carga de variables de entorno
if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing! Check your .env file.");
  alert("Error de configuración:\n\nNo se cargaron las variables de entorno de Firebase en el frontend. Asegúrate de tener un archivo .env válido y que el servidor se esté iniciando desde la carpeta del frontend.");
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicio de Autenticación
export const auth = getAuth(app);

// Proveedor de Google para Sign-In con popup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
