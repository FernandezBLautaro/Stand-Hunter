const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = 'Q0ftlrPJuDQjh2JqWmIkx2OCVvh1'; 

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`¡Éxito! El usuario ${uid} ahora tiene permisos de administrador.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error al asignar permisos:', error);
    process.exit(1);
  });
