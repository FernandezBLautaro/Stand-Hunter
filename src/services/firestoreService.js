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
// SPRINT 3: las respuestas correctas NO se guardan en el array público `desafios`. Viven en
// experiences/{id}/secretos/{desafioId}, legible solo por administradores (las reglas de Firestore
// sí lo leen para validar). 
// 
// Campos: criteriosValidacion (texto del admin), criteriosNorm (lista normalizada), 
// codigoElementoNorm (QR vinculado) y previoId (desafío anterior en la secuencia).
// Las pistas base (`pistasBase`) son públicas: orientan, no revelan la respuesta.
//
// Las escrituras las bloquean las reglas de Firestore (solo claim admin).
// Este servicio valida y normaliza antes de escribir para no guardar basura.

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, 
         deleteDoc, onSnapshot, query, where, serverTimestamp, writeBatch} from "firebase/firestore";
import { auth, db } from "../firebase";
import { normalizarRespuesta, compactar, parseCriterios } from "../utils/normalizar.js";
import { deleteParticipationsByExperience } from "./participationService.js";

const COLLECTION = "experiences";
const experiencesRef = () => collection(db, COLLECTION);
const secretosRef = (expId) => collection(db, COLLECTION, expId, "secretos");
const secretData = ({ id: _id, ...rest }) => rest;

/** SOLO ADMIN — respuestas correctas de una experiencia: { [desafioId]: { criteriosValidacion } }. */
export async function getSecretos(expId) {
  const snap = await getDocs(secretosRef(expId));
  const out = {};
  snap.docs.forEach((d) => {
    const x = d.data();
    out[d.id] = {
      criteriosValidacion: String(x.criteriosValidacion ?? ""),
    };
  });
  return out;
}

export const TIPOS_VALIDACION = ["pregunta", "codigo", "voz"];
export const DIFICULTADES = ["facil", "media", "dificil"];
export const DIFICULTAD_LABEL = { facil: "Fácil", media: "Media", dificil: "Difícil" };
const DEFAULT_DIFICULTAD = DIFICULTADES[0];

/* Umbrales de dificultad (desafíos por minuto).*/
export const DENSIDAD_MEDIA = 0.35;
export const DENSIDAD_DIFICIL = 0.6;

/**
 * Duración y dificultad derivadas de los desafíos (el admin no las ingresa).
 *  - duracion  = suma de tiempoMaximo (s) → minutos, redondeado hacia arriba (mín. 1)
 *  - densidad  = cantidad de desafíos / minutos totales
 */
export function calcularDuracionYDificultad(desafios = []) {
  const lista = Array.isArray(desafios) ? desafios : [];
  const segundos = lista.reduce((acc, d) => acc + clamp(d?.tiempoMaximo, 30, 600, 120), 0);
  const minutos = segundos / 60;
  const duracion = Math.max(1, Math.ceil(minutos));
  const densidad = minutos > 0 ? lista.length / minutos : 0;
  const dificultad =
    densidad >= DENSIDAD_DIFICIL ? "dificil" : densidad >= DENSIDAD_MEDIA ? "media" : "facil";
  return { duracion, dificultad, densidad: Number(densidad.toFixed(2)), segundos };
}


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);

const publicChallenge = (index = 0) => ({
  id: uid(),
  titulo: `Desafío ${index + 1}`,
  descripcion: "",
  tipoValidacion: "pregunta",
  tiempoMaximo: 120,
  puntosOtorgados: 100,
  penalizacionPista: 25,
  elementoFisicoId: null,
  pistasBase: [],
});

/** Desafío nuevo con valores por defecto (usado por el editor, incluye el campo secreto). */
export function newChallenge(index = 0) {
  return { ...publicChallenge(index), criteriosValidacion: "" };
}

/** → { pub, secret|null }. `secret` solo existe si el borrador trae criteriosValidacion (no pisa lo guardado). */
function sanitizeChallenge(d, i) {
  const id = d?.id || uid();
  const tipoValidacion = TIPOS_VALIDACION.includes(d?.tipoValidacion) ? d.tipoValidacion : "pregunta";
  const pub = {
    id,
    titulo: String(d?.titulo ?? `Desafío ${i + 1}`).trim().slice(0, 80) || `Desafío ${i + 1}`,
    descripcion: String(d?.descripcion ?? "").trim().slice(0, 400),
    tipoValidacion,
    tiempoMaximo: clamp(d?.tiempoMaximo, 30, 600, 120),
    puntosOtorgados: clamp(d?.puntosOtorgados, 50, 1000, 100),
    penalizacionPista: clamp(d?.penalizacionPista, 0, 200, 25),
    elementoFisicoId: d?.elementoFisicoId ? String(d.elementoFisicoId).trim().slice(0, 60) : null,
    pistasBase: (Array.isArray(d?.pistasBase) ? d.pistasBase : [])
      .map((p) => String(p ?? "").trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 5),
  };
  if (d && "criteriosValidacion" in d) {
    const raw = String(d.criteriosValidacion ?? "").trim().slice(0, 400);
    const norm = [...new Set(parseCriterios(raw).map((c) => normalizarRespuesta(tipoValidacion, c)).filter(Boolean))];
    return { pub, secret: { criteriosValidacion: raw, criteriosNorm: norm.slice(0, 20) } };
  }
  return { pub, secret: null };
}

/**
 * Valida y normaliza. Con { partial: true } solo procesa las claves presentes
 * (para updates); sin partial exige todo lo obligatorio (para create).
 */
function sanitize(data, { partial = false } = {}) {
  const has = (k) => data[k] !== undefined;
  const out = {};
  const secretos = [];

  if (!partial || has("nombre")) {
    const nombre = String(data.nombre ?? "").trim();
    if (!nombre) throw new Error("El nombre de la experiencia es obligatorio.");
    out.nombre = nombre.slice(0, 80);
  }
  if (!partial || has("descripcion")) {
    out.descripcion = String(data.descripcion ?? "").trim().slice(0, 400);
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
    const pubs = [];
    (Array.isArray(data.desafios) ? data.desafios : []).forEach((d, i) => {
      const { pub, secret } = sanitizeChallenge(d, i);
      pubs.push(pub);
      // Siempre se actualizan el vínculo QR y el orden; los criterios solo si vinieron en el borrador.
      secretos.push({
        id: pub.id,
        codigoElementoNorm:
          pub.tipoValidacion === "codigo" && pub.elementoFisicoId ? compactar(pub.elementoFisicoId) : "",
        previoId: i > 0 ? pubs[i - 1].id : "",
        ...(secret ?? {}),
      });
    });
    out.desafios = pubs;

    // Duración y dificultad derivadas (se recalculan cada vez que cambian los desafíos).
    const { duracion, dificultad } = calcularDuracionYDificultad(pubs);
    out.duracion = duracion;
    out.dificultad = dificultad;
  }
  if (has("activa")) {
    out.activa = Boolean(data.activa);
  }
  return { data: out, secretos };
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
      ...publicChallenge(i),
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
 * @param {{ nickname: string, email?: string }} data
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
  const { data: clean, secretos } = sanitize(data);
  const ref = doc(experiencesRef()); // id generado en cliente
  const batch = writeBatch(db);
  batch.set(ref, { ...clean, activa: data.activa === true, creadoEl: serverTimestamp() });
  secretos.forEach((sec) => batch.set(doc(secretosRef(ref.id), sec.id), secretData(sec)));
  await batch.commit();
  return ref.id;
}

/* ------------------------------------------------------------------ */
/* UPDATE                                                             */
/* ------------------------------------------------------------------ */

/** Actualiza solo los campos enviados. */
export async function updateExperience(id, patch) {
  const { data: clean, secretos } = sanitize(patch, { partial: true });
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTION, id), clean);
  if (clean.desafios) {
    // Secretos de desafíos que ya no existen se eliminan junto con la etapa.
    const keep = new Set(clean.desafios.map((d) => d.id));
    const existentes = await getDocs(secretosRef(id));
    existentes.docs.forEach((s) => {
      if (!keep.has(s.id)) batch.delete(s.ref);
    });
    secretos.forEach((sec) => batch.set(doc(secretosRef(id), sec.id), secretData(sec), { merge: true }));
  }
  await batch.commit();
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

/**
 * Elimina la experiencia y, en cascada, todas sus participaciones.
 * Orden intencional: primero los hijos, después el padre. Si algo falla a
 * mitad de camino, la experiencia sigue existiendo y el admin puede reintentar
 * (al revés quedarían participaciones huérfanas imposibles de limpiar desde la UI).
 * @returns {Promise<number>} participaciones eliminadas
 */

export async function deleteExperience(id) {
  const eliminadas = await deleteParticipationsByExperience(id);
  await deleteDoc(doc(db, COLLECTION, id));
  return eliminadas;
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
          pistasBase: ["Buscá un objeto alto cerca de la entrada del stand.", "Tiene un QR pegado a la altura de los ojos."],
          tiempoMaximo: 180,
          puntosOtorgados: 250,
          penalizacionPista: 50,
          elementoFisicoId: "TOTEM-A12",
        },
        {
          titulo: "Enigma del Tablero de Circuitos",
          descripcion: "Respondé la consigna del tablero de circuitos para estabilizar la matriz.",
          tipoValidacion: "pregunta",
          criteriosValidacion: "42 | cuarenta y dos",
          pistasBase: ["Es un número. Fijate en el tablero de circuitos.", "Es la respuesta a la pregunta fundamental de la vida, el universo y todo lo demás."],
          tiempoMaximo: 240,
          puntosOtorgados: 350,
          penalizacionPista: 50,
          elementoFisicoId: null,
        },
        {
          titulo: "Reconocimiento por Voz",
          descripcion: "Dictá el código de autodestrucción cancelada al asistente de voz.",
          tipoValidacion: "voz",
          criteriosValidacion: "cancelar autodestruccion | cancelar la autodestruccion",
          pistasBase: ["Es una orden corta, dicha en voz clara.", "La orden empieza con «cancelar»."],
          tiempoMaximo: 120,
          puntosOtorgados: 400,
          penalizacionPista: 50,
          elementoFisicoId: null,
        },
      ],
    },
    {
      id: "EXP-002",
      nombre: "Decodificador de Señales",
      descripcion: "Triangula el paquete de datos siguiendo las balizas del stand.",
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
    const { data, secretos } = sanitize(rest);
    batch.set(doc(db, COLLECTION, id), { ...data, activa, creadoEl: serverTimestamp() });
    secretos.forEach((sec) => batch.set(doc(secretosRef(id), sec.id), secretData(sec)));
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
    case "permission-denied":
      return "Sin permisos en Firestore. Verificá las reglas desplegadas y que tu cuenta sea de tipo administrador.";
    case "unauthenticated":
      return "Tu sesión expiró. Volvé a iniciar sesión.";
    default:
      return err?.message || "Error inesperado al hablar con Firestore.";
  }
}
