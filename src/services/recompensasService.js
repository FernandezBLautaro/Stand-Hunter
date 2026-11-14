// Una experiencia puede tener varios premios; cada participación genera un solo canje con el mejor premio elegible.
// Los canjes vencen según config/canje.vigenciaDias.
// Sprint 5 — GAM02 / ADM18 / ADM21. Recompensas y canje seguro.
// canjes/{participacionId}: el id ES la participación, así que hay un único canje por partida.
// Verificación (sin Cloud Functions, plan Spark): el QR solo lleva el id; el admin lo valida leyendo
// canjes/{id}, que únicamente pudo crearse pasando las reglas (participación completada, dueño, stock, puntaje).
import {
  collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, writeBatch, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const WIN_PREFIX = "SHWIN:";
const rRef = () => collection(db, "recompensas");
const cRef = (pid) => doc(db, "canjes", pid);
const millis = (ts) => ts?.toMillis?.() ?? 0;
const EST = { serverTimestamps: "estimate" };

/* ---------------- Vigencia de canjes (la fija el admin) ---------------- */

export async function getVigenciaDias() {
  const s = await getDoc(doc(db, "config", "canje"));
  return s.exists() ? Math.max(0, Number(s.data().vigenciaDias) || 0) : 0;
}

export function setVigenciaDias(n) {
  const d = Number(n);
  if (!Number.isInteger(d) || d < 0 || d > 365) throw new Error("La vigencia debe ser un entero entre 0 y 365 días (0 = sin vencimiento).");
  return setDoc(doc(db, "config", "canje"), { vigenciaDias: d });
}

/** Momento de vencimiento (ms) o null si no vence. */
export const vencimientoMs = (canje, dias) => {
  const c = canje.creadoEl?.toMillis?.();
  return dias > 0 && c ? c + dias * 86400000 : null;
};
export const estaVencido = (canje, dias) => {
  const v = vencimientoMs(canje, dias);
  return v !== null && Date.now() > v;
};

/* ---------------- ADM18: CRUD de recompensas ---------------- */

function sanitize(d) {
  const nombre = String(d.nombre ?? "").trim().slice(0, 80);
  if (!nombre) throw new Error("El nombre del premio es obligatorio.");
  const experienciaId = String(d.experienciaId ?? "").trim();
  if (!experienciaId) throw new Error("Elegí la experiencia a la que pertenece el premio.");
  const stock = Number(d.stockDisponible ?? 0);
  if (!Number.isInteger(stock) || stock < 0) throw new Error("El stock debe ser un entero mayor o igual a 0.");
  const pts = Math.min(100000, Math.max(0, Math.round(Number(d.puntosRequeridos) || 0)));
  return {
    nombre,
    experienciaId,
    descripcion: String(d.descripcion ?? "").trim().slice(0, 200),
    puntosRequeridos: pts,
    stockDisponible: stock,
    oculta: Boolean(d.oculta),
  };
}

export const subscribeRecompensas = (onData, onError) =>
  onSnapshot(
    rRef(),
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
          .sort((a, b) => millis(a.creadoEl) - millis(b.creadoEl))
      ),
    (err) => onError?.(err)
  );

export const createRecompensa = (d) => addDoc(rRef(), { ...sanitize(d), creadoEl: serverTimestamp() });
export const updateRecompensa = (id, d) => updateDoc(doc(db, "recompensas", id), sanitize(d));
export const deleteRecompensa = (id) => deleteDoc(doc(db, "recompensas", id));

/* ---------------- GAM02: lado participante ---------------- */

/** Última participación completada del usuario (dos igualdades → sin índice compuesto). */
export async function getUltimaCompletada(uid) {
  const snap = await getDocs(
    query(collection(db, "participaciones"), where("usuarioId", "==", uid), where("estado", "==", "completada"))
  );
  return (
    snap.docs
      .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
      .sort((a, b) => millis(b.momentoFin) - millis(a.momentoFin))[0] ?? null
  );
}

/** Canjes pendientes del usuario (dos igualdades → sin índice compuesto). */
export async function getCanjesPendientes(uid) {
  const snap = await getDocs(
    query(collection(db, "canjes"), where("usuarioId", "==", uid), where("estadoEntrega", "==", "pendiente"))
  );
  return snap.docs.map((d) => d.data(EST)).sort((a, b) => millis(b.creadoEl) - millis(a.creadoEl));
}

/** Pistas base + consultas al chatbot de una participación. */
export async function countPistas(pid) {
  const [prog, chat] = await Promise.all([
    getDocs(collection(db, "participaciones", pid, "progreso")),
    getDocs(collection(db, "participaciones", pid, "pistas_chat")),
  ]);
  return prog.docs.reduce((n, d) => n + (d.data().pistasUtilizadas ?? 0), 0) + chat.size;
}

/**
 * Devuelve el canje existente (misma QR tras recargar) o crea el canje del premio elegible
 * con mayor puntaje requerido para la experiencia.
 * @returns {Promise<{canje?: object, sinRecompensa?: boolean}>}
 */
export async function getOrCreateCanje(p) {
  const existing = await getDoc(cRef(p.id));
  if (existing.exists()) return { canje: existing.data(EST) };

  const elegibles = (await getDocs(rRef())).docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((x) => x.experienciaId === p.experienciaId
      && !x.oculta
      && x.stockDisponible > 0
      && x.puntosRequeridos <= p.puntajeFinal)
    .sort((a, b) =>
      b.puntosRequeridos - a.puntosRequeridos
      || millis(a.creadoEl) - millis(b.creadoEl)
      || a.id.localeCompare(b.id)
    );
  const r = elegibles[0];
  if (!r) return { sinRecompensa: true };

  try {
    await setDoc(cRef(p.id), {
      participacionId: p.id,
      usuarioId: p.usuarioId,
      recompensaId: r.id,
      recompensaNombre: r.nombre,
      estadoEntrega: "pendiente",
      creadoEl: serverTimestamp(),
      fechaCanje: null,
    });
  } catch (err) {
    // Doble montaje / otra pestaña ya lo creó: las reglas rechazan el segundo create, se lee el existente.
    if (!(await getDoc(cRef(p.id))).exists()) throw err;
  }
  return { canje: (await getDoc(cRef(p.id))).data(EST) };
}

/* ---------------- ADM21: lado admin ---------------- */

export const getCanje = async (pid) => {
  const s = await getDoc(cRef(pid));
  return s.exists() ? s.data(EST) : null;
};

/** Marca el canje como realizado y descuenta 1 de stock en un solo batch. */
export async function realizarCanje(pid, canje) {
  const rr = doc(db, "recompensas", canje.recompensaId);
  const r = await getDoc(rr);
  // shortcut: el stock se valida al reclamar y al realizar el canje, no se reserva; con carrera puede realizarse con stock justo.
  if (r.exists() && r.data().stockDisponible <= 0) throw new Error("Sin stock de este premio.");
  const batch = writeBatch(db);
  batch.update(cRef(pid), { estadoEntrega: "realizado", fechaCanje: serverTimestamp() });
  if (r.exists()) batch.update(rr, { stockDisponible: increment(-1) });
  await batch.commit();
}
