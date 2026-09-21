import { httpsCallable } from "firebase/functions";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth, functions } from "../firebase";

async function readIsAdmin(user) {
  if (!user) return false;
  const { claims } = await user.getIdTokenResult();
  return claims.admin === true;
}

/** ¿La sesión actual ya tiene el claim admin? */
export function isCurrentUserAdmin() {
  return readIsAdmin(auth.currentUser);
}

/**
 * Notifica { user, isAdmin } al iniciar y cuando cambia la sesión.
 * Como el claim persiste en el usuario, un admin sigue siéndolo tras recargar la página.
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribeAdminState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    try {
      callback({ user, isAdmin: await readIsAdmin(user) });
    } catch {
      callback({ user, isAdmin: false });
    }
  });
}

/** Valida el PIN y convierte la sesión actual en sesión de administrador. */
export async function loginAdmin(pin) {
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  await httpsCallable(functions, "adminAuth")({ pin: String(pin ?? "").trim() });
  await user.getIdToken(true); // refresca el token para incluir el claim
  return { uid: user.uid };
}

export async function logoutAdmin() {
  await signOut(auth);
}

export function describeAuthError(err) {
  const code = err?.code ?? "";
  if (code.includes("permission-denied")) return "PIN incorrecto.";
  if (code.includes("operation-not-allowed") || code.includes("admin-restricted-operation"))
    return "Falta habilitar el acceso anónimo en Firebase Authentication.";
  if (code.includes("unauthenticated")) return "No se pudo iniciar la sesión. Reintentá.";
  if (code.includes("unavailable") || code.includes("network"))
    return "Sin conexión con el servidor. Reintentá en unos segundos.";
  return err?.message || "No se pudo validar el acceso.";
}
