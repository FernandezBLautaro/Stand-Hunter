// Sprint 3 (plan Spark, sin Cloud Functions) — Validación de desafíos con reglas de Firestore.
//
// El participante escribe participaciones/{id}/progreso/{desafioId}. Las reglas aceptan el estado
// 'resuelto' SOLO si la respuesta normalizada está en experiences/{exp}/secretos/{desafioId}
// (que el cliente no puede leer), si la participación sigue en curso y dentro de tiempo, y si el
// desafío anterior ya estaba resuelto. Una respuesta incorrecta = escritura rechazada (permission-denied).
import {
  addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { normalizarRespuesta } from "../utils/normalizar.js";

const TIMEOUT_MS = 10000;
const progresoRef = (pid, did) => doc(db, "participaciones", pid, "progreso", did);

const withTimeout = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), TIMEOUT_MS)
    ),
  ]);

/** @returns {Promise<{resultado:'correcto'|'incorrecto'|'ya_resuelto'|'vacio'}>} */
export async function validateAnswer({ participacionId, desafioId, orden, tipo, respuesta, via }) {
  const norm = normalizarRespuesta(tipo, respuesta);
  if (!norm) return { resultado: "vacio" };

  const ref = progresoRef(participacionId, desafioId);
  const snap = await withTimeout(getDoc(ref));
  const prev = snap.exists() ? snap.data() : {};
  if (prev.estado === "resuelto") return { resultado: "ya_resuelto" };

  try {
    await withTimeout(
      setDoc(
        ref,
        {
          desafioId,
          orden,
          estado: "resuelto",
          respuestaNorm: norm,
          pistasUtilizadas: prev.pistasUtilizadas ?? 0, // las reglas exigen que no se altere
          comandosVoz: (prev.comandosVoz ?? 0) + (via === "voz" ? 1 : 0),
          fechaResolucion: serverTimestamp(),
        },
        { merge: true }
      )
    );
    return { resultado: "correcto" };
  } catch (err) {
    if (err?.code === "permission-denied") return { resultado: "incorrecto" };
    throw err;
  }
}

/** Registra el uso de la siguiente pista base. El texto sale de desafio.pistasBase (pistas, no respuestas). */
export async function requestBaseHint({ participacionId, desafioId, orden, usadas, total }) {
  if (!total) return { sinPistas: true, total: 0 };
  if (usadas >= total) return { sinPistas: true, total };
  await withTimeout(
    setDoc(
      progresoRef(participacionId, desafioId),
      { desafioId, orden, estado: "pendiente", pistasUtilizadas: usadas + 1 },
      { merge: true }
    )
  );
  return { indice: usadas + 1, total };
}

/**
 * Suscripción a participaciones/{id}/progreso (entidad PROGRESO, un doc por desafío).
 * Se ignoran las escrituras locales aún sin confirmar: una respuesta incorrecta se vería
 * «resuelta» un instante antes de que el servidor la rechace.
 */
export function subscribeProgreso(participacionId, onData, onError) {
  if (!participacionId) return () => {};
  return onSnapshot(
    collection(db, "participaciones", participacionId, "progreso"),
    { includeMetadataChanges: true },
    (snap) => {
      const map = new Map();
      snap.docs.forEach((d) => {
        if (d.metadata.hasPendingWrites) return;
        const x = d.data({ serverTimestamps: "estimate" });
        map.set(d.id, {
          estado: x.estado ?? "pendiente",
          pistasUtilizadas: x.pistasUtilizadas ?? 0,
          comandosVoz: x.comandosVoz ?? 0,
          resueltoMs: x.fechaResolucion?.toMillis?.() ?? null,
        });
      });
      onData(map);
    },
    (err) => onError?.(err)
  );
}

/** Registra cada consulta al chatbot (insumo para la penalización de Sprint 4 y el análisis DAT04). */
export function logChatQuery({ participacionId, desafioId, pregunta, origen = "chatbot" }) {
  return addDoc(collection(db, "participaciones", participacionId, "pistas_chat"), {
    usuarioId: auth.currentUser?.uid ?? null,
    desafioId,
    pregunta: String(pregunta ?? "").slice(0, 300),
    origen,
    creadoEl: serverTimestamp(),
  });
}

export function describeProgressError(err) {
  if (err?.code === "permission-denied") {
    return "No se pudo registrar: se acabó el tiempo o falta resolver un desafío anterior.";
  }
  return "No se pudo conectar con el servidor. Reintentá en unos segundos.";
}
