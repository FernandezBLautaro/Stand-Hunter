// DAT01/DAT02 — Registro de participaciones.
import { collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "participaciones";
const participationsRef = () => collection(db, COLLECTION);

export const ESTADOS_PARTICIPACION = ["en_curso", "completada", "abandonada", "expirada"];
export const ESTADO_PARTICIPACION_LABEL = {
  en_curso: "En curso",
  completada: "Completada",
  abandonada: "Abandonada",
  expirada: "Expirada",
};

/**
 * DAT01 — Registra el inicio de una participación: usuario, misión y momento de inicio, quedando en estado "en_curso".
 * @return { id, startedAtMs } para poder calcular el tiempo total al cerrarla.
 */
export async function startParticipation({ usuarioId, usuarioNickname, experienciaId, experienciaNombre }) {
  if (!usuarioId || !experienciaId) {
    throw new Error("Falta usuarioId o experienciaId para iniciar la participación.");
  }
  const ref = await addDoc(participationsRef(), {
    usuarioId: String(usuarioId),
    usuarioNickname: String(usuarioNickname ?? "").slice(0, 80),
    experienciaId: String(experienciaId),
    experienciaNombre: String(experienciaNombre ?? "").slice(0, 80),
    estado: "en_curso",
    momentoInicio: serverTimestamp(),
    momentoFin: null,
    tiempoTotalMs: null,
    puntajeFinal: null,
    creadoEl: serverTimestamp(),
  });
  return { id: ref.id, startedAtMs: Date.now() };
}

/**
 * DAT02 — Cierra una participación en curso al completarla, abandonarla o
 * agotarse el tiempo: guarda momento de fin, tiempo total y estado final.
 */
export async function finishParticipation(participationId, { estado, startedAtMs, puntajeFinal = null } = {}) {
  if (!participationId) throw new Error("Falta el id de la participación a finalizar.");
  if (!ESTADOS_PARTICIPACION.includes(estado) || estado === "en_curso") {
    throw new Error(`Estado final inválido: ${estado}`);
  }
  const tiempoTotalMs = Number.isFinite(startedAtMs) ? Math.max(0, Date.now() - startedAtMs) : null;
  await updateDoc(doc(db, COLLECTION, participationId), {
    estado,
    momentoFin: serverTimestamp(),
    tiempoTotalMs,
    ...(puntajeFinal !== null ? { puntajeFinal } : {}),
  });
}

/** DAT01/DAT02 — Suscripción en tiempo real, para el panel de administración. */
export function subscribeParticipations(onData, onError) {
  return onSnapshot(
    participationsRef(),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

/** Agrupa participaciones por experiencia: total y desglose por estado. */
export function summarizeByExperience(participations) {
  const map = new Map();
  for (const p of participations) {
    const key = p.experienciaId;
    if (!key) continue;
    const entry = map.get(key) ?? { total: 0, en_curso: 0, completada: 0, abandonada: 0, expirada: 0 };
    entry.total += 1;
    if (entry[p.estado] !== undefined) entry[p.estado] += 1;
    map.set(key, entry);
  }
  return map;
}