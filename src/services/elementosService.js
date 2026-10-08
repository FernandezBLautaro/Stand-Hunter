// ADM14 / ADM15 / ADM16 — Elementos físicos del stand (entidad ELEMENTO_FISICO).
//
//   id                   string  (Firestore)
//   experienciaId        string  (FK a experiences)
//   nombre               string  máx 80
//   codigoIdentificador  string  ÚNICO en todo el inventario, en MAYÚSCULAS (lo que codifica el QR)
//   tipo                 'qr'
//   ubicacion            string  pista para el staff / texto de ayuda
//   creadoEl             timestamp
//
// El vínculo con la pista (ADM16) se guarda del lado del desafío:
//   experiences/{id}.desafios[i].elementoFisicoId === codigoIdentificador

import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "elementos_fisicos";
const ref = () => collection(db, COLLECTION);

export const TIPOS_ELEMENTO = ["qr"];
export const TIPO_ELEMENTO_LABEL = { qr: "QR" };
const normalizeTipo = (tipo) => (TIPOS_ELEMENTO.includes(tipo) ? tipo : "qr"); // docs legados con 'ambos' pasan a 'qr'

/** Prefijo que va dentro del QR para distinguir códigos de StandHunter de cualquier otro QR. */
export const QR_PREFIX = "SH:";
export const buildQrPayload = (codigo) => `${QR_PREFIX}${codigo}`;

export const normalizeCode = (value) => String(value ?? "").trim().toUpperCase();

/**
 * Convierte lo que lee la cámara en un código normalizado.
 * Acepta "SH:TOTEM-A12", una URL con ?el=TOTEM-A12 o el código a secas.
 */
export function parseScanPayload(raw) {
  let text = String(raw ?? "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    const el = url.searchParams.get("el");
    if (el) text = el;
  } catch {
    /* no era una URL */
  }
  if (text.toUpperCase().startsWith(QR_PREFIX)) text = text.slice(QR_PREFIX.length);
  return normalizeCode(text);
}

/** Formato válido de un código: letras, números, guion, guion bajo y ":". */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9:_-]{1,59}$/;

/**
 * ADM15 — Valida lo leído por QR para autocompletar el campo.
 * Devuelve el código normalizado, o "" si no es un código válido.
 */
export function parseCapturedCode(raw) {
  const codigo = parseScanPayload(raw).replace(/\s+/g, "-");
  return CODE_PATTERN.test(codigo) ? codigo : "";
}

export function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `SH-${out}`;
}

function sanitize(data) {
  const nombre = String(data.nombre ?? "").trim().slice(0, 80);
  if (!nombre) throw new Error("El nombre del elemento es obligatorio.");
  const codigo = normalizeCode(data.codigoIdentificador).replace(/\s+/g, "-").slice(0, 60);
  if (!codigo) throw new Error("El código identificador es obligatorio.");
  if (!data.experienciaId) throw new Error("Falta la experiencia a la que pertenece el elemento.");
  return {
    experienciaId: String(data.experienciaId),
    nombre,
    codigoIdentificador: codigo,
    tipo: normalizeTipo(data.tipo),
    ubicacion: String(data.ubicacion ?? "").trim().slice(0, 120),
  };
}

/**
 * ADM15 — Busca otro elemento que ya use ese código (en cualquier experiencia).
 * Una sola igualdad → no requiere índice compuesto.
 * @returns {Promise<{id: string, nombre: string, experienciaId: string} | null>}
 */
export async function findCodeConflict(codigo, ignoreId = null) {
  if (!codigo) return null;
  const snap = await getDocs(query(ref(), where("codigoIdentificador", "==", codigo)));
  const hit = snap.docs.find((d) => d.id !== ignoreId);
  return hit ? { id: hit.id, ...hit.data() } : null;
}

async function assertUniqueCode(codigo, ignoreId = null) {
  const conflict = await findCodeConflict(codigo, ignoreId);
  if (conflict) {
    throw Object.assign(
      new Error(`El código ${codigo} ya está asignado a «${conflict.nombre}». Cada elemento físico necesita un código único.`),
      { code: "codigo-duplicado" }
    );
  }
}

const millis = (ts) => ts?.toMillis?.() ?? 0;

/** Suscripción en tiempo real a los elementos de UNA experiencia. Devuelve el unsubscribe. */
export function subscribeElementos(experienciaId, onData, onError) {
  if (!experienciaId) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    query(ref(), where("experienciaId", "==", experienciaId)),
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: "estimate" });
        return {
          ...data,
          id: d.id,
          tipo: normalizeTipo(data.tipo),
          codigoIdentificador: normalizeCode(data.codigoIdentificador),
        };
      });
      onData(list.sort((a, b) => millis(a.creadoEl) - millis(b.creadoEl)));
    },
    (err) => onError?.(err)
  );
}

export async function createElemento(data) {
  const clean = sanitize(data);
  await assertUniqueCode(clean.codigoIdentificador);
  const created = await addDoc(ref(), { ...clean, creadoEl: serverTimestamp() });
  return created.id;
}

export async function updateElemento(id, data) {
  const clean = sanitize(data);
  await assertUniqueCode(clean.codigoIdentificador, id);
  await updateDoc(doc(db, COLLECTION, id), clean);
}

export async function deleteElemento(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}