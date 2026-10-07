import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export const TIPO_JUGADOR = "jugador";
export const TIPO_ADMIN = "administrador";

const userRef = (uid) => doc(db, "usuarios", uid);

async function createUserDoc(user, { nickname }) {
  // Las reglas solo permiten crear con tipo == 'jugador'.
  await setDoc(userRef(user.uid), {
    nombre: nickname,
    email: user.email,
    tipo: TIPO_JUGADOR,
    fechaRegistro: serverTimestamp(),
  });
}

/** Crea la cuenta en Firebase Auth + su documento en /usuarios. Si falla el documento, revierte la cuenta. */
export async function registerUser({ nickname, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await updateProfile(cred.user, { displayName: nickname });
    await createUserDoc(cred.user, { nickname });
  } catch (err) {
    await cred.user.delete().catch(() => {});
    throw err;
  }
  return cred.user;
}

export async function loginUser({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  // Cuentas creadas antes de este cambio (o con documento faltante): se completan al ingresar.
  const snap = await getDoc(userRef(user.uid));
  if (!snap.exists()) {
    await createUserDoc(user, { nickname: user.displayName || user.email.split("@")[0] });
  }
  return user;
}

export const logoutUser = () => signOut(auth);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

/**
 * Notifica { user, profile, ready } cuando cambia la sesión o el documento /usuarios/{uid}.
 * `tipo` se lee de Firestore, así que cambiarlo en la consola se refleja en vivo.
 */
export function subscribeSession(callback) {
  let unsubProfile = () => {};
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    unsubProfile();
    unsubProfile = () => {};
    if (!user) {
      callback({ user: null, profile: null, ready: true });
      return;
    }
    unsubProfile = onSnapshot(
      userRef(user.uid),
      (snap) => callback({ user, profile: snap.exists() ? snap.data() : null, ready: true }),
      () => callback({ user, profile: null, ready: true })
    );
  });
  return () => {
    unsubProfile();
    unsubAuth();
  };
}

export const isAdminProfile = (profile) => profile?.tipo === TIPO_ADMIN;

export function describeAuthError(err) {
  switch (err?.code) {
    case "auth/email-already-in-use":
      return "Ese email ya tiene una cuenta. Ingresá con tu contraseña.";
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/weak-password":
      return "La contraseña es muy débil (mínimo 6 caracteres).";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá un momento y reintentá.";
    case "auth/network-request-failed":
      return "Sin conexión. Reintentá en unos segundos.";
    case "auth/operation-not-allowed":
      return "Falta habilitar Email/Password en Firebase Authentication.";
    case "permission-denied":
      return "Las reglas de Firestore rechazaron la operación.";
    default:
      return err?.message || "No se pudo completar la operación.";
  }
}