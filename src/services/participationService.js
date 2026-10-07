// DAT01/DAT02 — Registro de participaciones.
import { collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp, getDocs, query, where } from "firebase/firestore";
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
export async function startParticipation({ usuarioId, usuarioNickname, experienciaId, experienciaNombre, duracionMin }) {
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
    duracionMin: Number.isFinite(Number(duracionMin)) ? Number(duracionMin) : null,
  });
  return { id: ref.id, startedAtMs: Date.now() };
}

/**
 * Busca la participación 'en_curso' más reciente del usuario (opcionalmente de una experiencia).
 * Dos igualdades → no requiere índice compuesto. El filtro por experiencia se hace en cliente.
 * @return {Promise<{id, experienciaId, experienciaNombre, duracionMin, startedAtMs} | null>}
 */
export async function findActiveParticipation(usuarioId, experienciaId = null) {
  if (!usuarioId) return null;
  const snap = await getDocs(
    query(
      participationsRef(),
      where("usuarioId", "==", String(usuarioId)),
      where("estado", "==", "en_curso")
    )
  );
  const items = snap.docs
    .map((d) => {
      const data = d.data({ serverTimestamps: "estimate" });
      return {
        id: d.id,
        experienciaId: data.experienciaId,
        experienciaNombre: data.experienciaNombre,
        duracionMin: data.duracionMin ?? null,
        startedAtMs: data.momentoInicio?.toMillis?.() ?? Date.now(),
      };
    })
    .filter((p) => !experienciaId || p.experienciaId === experienciaId)
    .sort((a, b) => b.startedAtMs - a.startedAtMs);
  return items[0] ?? null;
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