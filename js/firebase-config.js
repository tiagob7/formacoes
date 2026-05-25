/**
 * CONFIGURAÇÃO FIREBASE — substitua com os dados do seu projecto antes de publicar.
 * Obtenha em: https://console.firebase.google.com → Project settings → Your apps → Web
 *
 * Serviços necessários no Firebase Console:
 *   - Authentication  → Enable "Anonymous" sign-in method
 *   - Firestore       → Create database (production mode)
 *   - Storage         → Create default bucket
 *
 * Regras Firestore recomendadas (rules):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /employees/{number}/{document=**} {
 *         allow read, write: if request.auth != null;
 *       }
 *       match /modules/{id} {
 *         allow read:  if request.auth != null;
 *         allow write: if request.auth != null && get(/databases/$(database)/documents/employees/$(request.auth.token.employee_number)).data.isAdmin == true;
 *       }
 *     }
 *   }
 */
export const firebaseConfig = {
  apiKey:            "AIzaSyDf2VeVIxqHb5tuj6NiRGmBF4rgwVYAe1g",
  authDomain:        "formacoes-algartempo.firebaseapp.com",
  projectId:         "formacoes-algartempo",
  storageBucket:     "formacoes-algartempo.firebasestorage.app",
  messagingSenderId: "515604823599",
  appId:             "1:515604823599:web:eb2f9502c0e0a1ff0990da"
};
