const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Callable function — apaga um utilizador do Firebase Authentication.
 * Só pode ser chamada por utilizadores com role 'administrador' ou 'gestor_colaboradores'.
 */
exports.deleteAuthUser = onCall({ region: 'europe-west1' }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária.');
  }

  const { email } = request.data;
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }

  // Verifica o role do utilizador que faz o pedido
  const callerDoc = await admin.firestore()
    .collection('employees')
    .doc(request.auth.token.email)
    .get();

  const callerRole = callerDoc.exists ? callerDoc.data().role : null;
  const allowedRoles = ['administrador', 'gestor_colaboradores'];
  if (!allowedRoles.includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Sem permissão para esta operação.');
  }

  // Busca o utilizador pelo email e apaga-o
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') return { success: true }; // já não existe
    throw new HttpsError('internal', 'Erro ao localizar utilizador: ' + err.message);
  }

  await admin.auth().deleteUser(userRecord.uid);
  return { success: true };
});
