const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
// Se setea con: firebase functions:secrets:set ADMIN_PIN
const ADMIN_PIN = defineSecret("ADMIN_PIN");

exports.adminAuth = onCall({ secrets: [ADMIN_PIN] }, async (request) => {
  const { pin } = request.data || {};
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión primero.");
  if (!pin || pin !== ADMIN_PIN.value()) throw new HttpsError("permission-denied", "PIN incorrecto.");

  // custom claim que que usan las reglas y las demas Cloud Functions. 
  await admin.auth().setCustomUserClaims(request.auth.uid, { admin: true });
  return { ok: true, uid: request.auth.uid };
});


