// ESC02 / ESC09 — Progreso de pistas dentro de una participación.
// Se guarda en el propio documento de `participaciones` para no sumar otra colección
// (la entidad PROGRESO por desafío llega con la validación del Sprint 3).
import { doc, updateDoc, onSnapshot, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "participaciones";

/** Marca un elemento físico como encontrado. arrayUnion evita duplicados aunque se escanee dos veces. */
export async function registerClueFound(participationId, codigo) {
  if (!participationId || !codigo) throw new Error("Falta la participación o el código del elemento.");
  await updateDoc(doc(db, COLLECTION, participationId), {
    elementosEncontrados: arrayUnion(codigo),
    ultimaPistaEl: serverTimestamp(),
  });
}

/** Suscripción al documento de la participación (para restaurar progreso al recargar). */
export function subscribeParticipation(participationId, onData, onError) {
  if (!participationId) return () => {};
  return onSnapshot(
    doc(db, COLLECTION, participationId),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => onError?.(err)
  );
}