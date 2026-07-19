/**
 * CONFIGURAÇÃO FIREBASE — substitua com os dados do seu projecto antes de publicar.
 * Obtenha em: https://console.firebase.google.com → Project settings → Your apps → Web
 *
 * Serviços necessários no Firebase Console:
 *   - Authentication  → Ativar método "Email/Password"
 *   - Firestore       → Criar base de dados (modo produção)
 *   - Storage         → Criar bucket predefinido
 *   - Hosting         → Ativar Firebase Hosting
 *
 * Regras de segurança: ver ficheiro firestore.rules na raiz do projecto.
 */
export const firebaseConfig = {
  apiKey:            "AIzaSyDf2VeVIxqHb5tuj6NiRGmBF4rgwVYAe1g",
  authDomain:        "formacoes-algartempo.firebaseapp.com",
  projectId:         "formacoes-algartempo",
  storageBucket:     "formacoes-algartempo.firebasestorage.app",
  messagingSenderId: "515604823599",
  appId:             "1:515604823599:web:eb2f9502c0e0a1ff0990da"
};
