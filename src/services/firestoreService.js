// src/services/firestoreService.js
// CRUD real de "experiences" sobre Firestore.
//
// Modelo alineado a "Diseño de Base de Datos" (entidad EXPERIENCIA) y types.js:
//   id            string   (lo genera Firestore)
//   nombre        string   (obligatorio, máx 80)
//   descripcion   string   (máx 400)
//   duracion      number   duración estimada en minutos (límite global 1–120)
//   dificultad    string   'facil' | 'media' | 'dificil'
//   puntos        number   puntos que otorga completar la experiencia
//   activa        boolean  visible para participantes en la PWA
//   locacion      string   ubicación física dentro del stand
//   imagenUrl     string   URL de la imagen de la tarjeta (PWA)
//   creadoEl      timestamp
//
// Los desafíos siguen la entidad DESAFIO del diseño. En Firestore se persisten
// como array embebido `desafios` (la posición en el array reemplaza al FK
// id_experiencia y al orden_secuencial):
//   { id, titulo, descripcion, tipoValidacion ('pregunta'|'codigo'|'voz'),
//     criteriosValidacion (respuestas/patrones correctos), tiempoMaximo (s),
//     puntosOtorgados, penalizacionPista, elementoFisicoId (nullable) }
//
// Las escrituras las bloquean las reglas de Firestore (solo claim admin).
// Este servicio valida y normaliza antes de escribir para no guardar basura.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const COLLECTION = "experiences";
const experiencesRef = () => collection(db, COLLECTION);

export const TIPOS_VALIDACION = ["pregunta", "codigo", "voz"];
export const DIFICULTADES = ["facil", "media", "dificil"];
export const DIFICULTAD_LABEL = { facil: "Fácil", media: "Media", dificil: "Difícil" };
const DEFAULT_DIFICULTAD = DIFICULTADES[0];


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);

/** Desafío nuevo con valores por defecto (usado por el editor). */
export function newChallenge(index = 0) {
  return {
    id: uid(),
    titulo: `Desafío ${index + 1}`,
    descripcion: "",
    tipoValidacion: "pregunta",
    criteriosValidacion: "",
    tiempoMaximo: 120,
    puntosOtorgados: 100,
    penalizacionPista: 25,
    elementoFisicoId: null,
  };
}

function sanitizeChallenge(d, i) {
  return {
    id: d?.id || uid(),
    titulo: String(d?.titulo ?? `Desafío ${i + 1}`).trim().slice(0, 80) || `Desafío ${i + 1}`,
    descripcion: String(d?.descripcion ?? "").trim().slice(0, 400),
    tipoValidacion: TIPOS_VALIDACION.includes(d?.tipoValidacion)
      ? d.tipoValidacion
      : "pregunta",
    criteriosValidacion: String(d?.criteriosValidacion ?? "").trim().slice(0, 400),
    tiempoMaximo: clamp(d?.tiempoMaximo, 30, 600, 120),
    puntosOtorgados: clamp(d?.puntosOtorgados, 50, 1000, 100),
    penalizacionPista: clamp(d?.penalizacionPista, 0, 200, 25),
    elementoFisicoId: d?.elementoFisicoId ? String(d.elementoFisicoId).trim().slice(0, 60) : null,
  };
}

/**
 * Valida y normaliza. Con { partial: true } solo procesa las claves presentes
 * (para updates); sin partial exige todo lo obligatorio (para create).
 */
function sanitize(data, { partial = false } = {}) {
  const has = (k) => data[k] !== undefined;
  const out = {};

  if (!partial || has("nombre")) {
    const nombre = String(data.nombre ?? "").trim();
    if (!nombre) throw new Error("El nombre de la experiencia es obligatorio.");
    out.nombre = nombre.slice(0, 80);
  }
  if (!partial || has("descripcion")) {
    out.descripcion = String(data.descripcion ?? "").trim().slice(0, 400);
  }
  if (!partial || has("duracion")) {
    out.duracion = clamp(data.duracion, 1, 120, 10);
  }
  if (!partial || has("dificultad")) {
    out.dificultad = DIFICULTADES.includes(data.dificultad) ? data.dificultad : DEFAULT_DIFICULTAD;
  }
  if (!partial || has("puntos")) {
    out.puntos = clamp(data.puntos, 0, 5000, 500);
  }
  if (!partial || has("locacion")) {
    out.locacion = String(data.locacion ?? "").trim().slice(0, 120);
  }
  if (!partial || has("tematica")) {
  out.tematica = String(data.tematica ?? "").trim().slice(0, 40);
  }
  if (!partial || has("imagenUrl")) {
    const url = String(data.imagenUrl ?? "").trim().slice(0, 500);
    out.imagenUrl = /^https?:\/\//.test(url) ? url : "";
  }
  if (!partial || has("desafios")) {
    out.desafios = (Array.isArray(data.desafios) ? data.desafios : []).map(sanitizeChallenge);
  }
  if (has("activa")) {
    out.activa = Boolean(data.activa);
  }
  return out;
}

/** DocumentSnapshot → objeto plano listo para la UI. */
function fromDoc(snap) {
  // 'estimate' evita creadoEl=null en el snapshot local mientras el servidor confirma.
  const data = snap.data({ serverTimestamps: "estimate" });
  return {
    ...data,
    id: snap.id,
    dificultad: DIFICULTADES.includes(data.dificultad) ? data.dificultad : DEFAULT_DIFICULTAD,
    activa: data.activa === true,
    desafios: (data.desafios ?? []).map((d, i) => ({
      ...newChallenge(i),
      ...d,
      id: d.id || `${snap.id}-${i}`,
    })),
  };
}

const millis = (ts) => ts?.toMillis?.() ?? 0;
const sortByCreated = (list) => [...list].sort((a, b) => millis(a.creadoEl) - millis(b.creadoEl));

// Sin orderBy en la query a propósito: evita índices compuestos cuando se combina con where().
const buildQuery = ({ onlyActive = false } = {}) =>
  onlyActive ? query(experiencesRef(), where("activa", "==", true)) : experiencesRef();

/* ------------------------------------------------------------------ */
/* READ                                                               */
/* ------------------------------------------------------------------ */

/** Lectura única. `onlyActive: true` para el lado participante. */
export async function listExperiences(options) {
  const snap = await getDocs(buildQuery(options));
  return sortByCreated(snap.docs.map(fromDoc));
}

/**
 * Suscripción en tiempo real. Devuelve la función para cancelar.
 * onData(experiencias[]) · onError(error)
 */
export function subscribeExperiences(onData, onError, options) {
  return onSnapshot(
    buildQuery(options),
    (snap) => onData(sortByCreated(snap.docs.map(fromDoc))),
    (err) => onError?.(err)
  );
}

export async function getExperience(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? fromDoc(snap) : null;
}

/**
 * DAT01 — Registro rápido de participante (tabla USUARIO).
 * @param {{ nickname: string, email?: string, specialty: string }} data
 * @returns {Promise<any>}
 */
export async function registerParticipant(data) {
  const response = await apiClient.post('/participant/register', data);
  return response.data.participant;
}

/**
 * Crea una experiencia. Nace INACTIVA para que el admin la revise antes de
 * publicarla en la PWA. Devuelve el id generado.
 */
export async function createExperience(data) {
  const clean = sanitize(data);
  const ref = doc(experiencesRef()); // id generado en cliente
  await setDoc(ref, {
    ...clean,
    activa: data.activa === true,
    creadoEl: serverTimestamp(),
  });
  return ref.id;
}

/* ------------------------------------------------------------------ */
/* UPDATE                                                             */
/* ------------------------------------------------------------------ */

/** Actualiza solo los campos enviados. */
export async function updateExperience(id, patch) {
  const clean = sanitize(patch, { partial: true });
  await updateDoc(doc(db, COLLECTION, id), clean);
}

/** Activa/oculta una experiencia en la PWA. */
export async function setExperienceActive(id, activa) {
  await updateDoc(doc(db, COLLECTION, id), {
    activa: Boolean(activa),
  });
}

/* ------------------------------------------------------------------ */
/* DELETE                                                             */
/* ------------------------------------------------------------------ */

export async function deleteExperience(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

/* ------------------------------------------------------------------ */
/* Seed (datos de ejemplo para colección vacía)                       */
/* ------------------------------------------------------------------ */

export async function seedExperiences() {
  const seeds = [
    {
      id: "EXP-001",
      nombre: "El Núcleo Cuántico Perdido",
      descripcion: "Restablece la matriz de refrigeración cuántica antes de que suba la temperatura.",
      duracion: 10,
      dificultad: "media",
      puntos: 1000,
      locacion: "Stand A — Sector Cian",
      tematica: "Ciencia",
      imagenUrl: "",
      activa: true,
      desafios: [
        {
          titulo: "Escaneo Tótem de Entrada",
          descripcion: "Encontrá el tótem de entrada y escaneá su código para activar el núcleo.",
          tipoValidacion: "codigo",
          criteriosValidacion: "TOTEM-A12",
          tiempoMaximo: 180,
          puntosOtorgados: 250,
          penalizacionPista: 50,
          elementoFisicoId: "TOTEM-A12",
        },
        {
          titulo: "Enigma del Tablero de Circuitos",
          descripcion: "Respondé la consigna del tablero de circuitos para estabilizar la matriz.",
          tipoValidacion: "pregunta",
          criteriosValidacion: "42",
          tiempoMaximo: 240,
          puntosOtorgados: 350,
          penalizacionPista: 50,
          elementoFisicoId: null,
        },
        {
          titulo: "Reconocimiento por Voz",
          descripcion: "Dictá el código de autodestrucción cancelada al asistente de voz.",
          tipoValidacion: "voz",
          criteriosValidacion: "cancelar autodestruccion",
          tiempoMaximo: 120,
          puntosOtorgados: 400,
          penalizacionPista: 50,
          elementoFisicoId: null,
        },
      ],
    },
    {
      id: "EXP-002",
      nombre: "Decodificador de Señales NFC",
      descripcion: "Triangula el paquete de datos acercando tu terminal a tres balizas.",
      duracion: 8,
      dificultad: "facil",
      puntos: 600,
      locacion: "Stand A — Sector Magenta",
      tematica: "Tecnología",
      imagenUrl: "",
      activa: true,
      desafios: [],
    },
    {
      id: "EXP-003",
      nombre: "Infiltración Biométrica",
      descripcion: "Supera el escaneo facial y responde las preguntas de seguridad del avatar.",
      duracion: 15,
      dificultad: "dificil",
      puntos: 1500,
      locacion: "Stand B — Zona Segura",
      tematica: "Espionaje",
      imagenUrl: "",
      activa: false,
      desafios: [],
    },
  ];

  const batch = writeBatch(db);
  seeds.forEach(({ id, activa, ...rest }) => {
    batch.set(doc(db, COLLECTION, id), {
      ...sanitize(rest),
      activa,
      creadoEl: serverTimestamp(),
    });
  });
  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Errores legibles                                                    */
/* ------------------------------------------------------------------ */

export function describeFirestoreError(err) {
  switch (err?.code) {
    case "permission-denied":
      return "Sin permisos en Firestore. Verificá que las reglas estén desplegadas y que tu sesión tenga el claim admin.";
    case "unavailable":
      return "Sin conexión con Firestore. Reintentá en unos segundos.";
    case "unauthenticated":
      return "Tu sesión expiró. Volvé a ingresar el PIN.";
    default:
      return err?.message || "Error inesperado al hablar con Firestore.";
  }
}
