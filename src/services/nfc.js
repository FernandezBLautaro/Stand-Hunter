// ESC03 / ADM15 — Web NFC al estilo "NFC Tools" (solo Chrome en Android sobre HTTPS).
// En iOS y escritorio no existe NDEFReader: la UI debe ocultar los botones NFC
// cuando isNfcSupported() es false.
//
// Lo que Web NFC SÍ permite (y cubre este módulo):
//   Leer     -> número de serie + todos los registros NDEF (texto, URL, MIME, smart-poster, externos)
//   Escribir -> uno o varios registros (texto, URL, MIME)
//   Borrar   -> deja el tag con un registro vacío
//   Bloquear -> makeReadOnly() (irreversible), si el navegador lo soporta
// Lo que NO expone el navegador (solo apps nativas): tipo de chip, memoria, contraseñas, formatear.

export const isNfcSupported = () => typeof window !== "undefined" && "NDEFReader" in window;

export const canLockNfc = () =>
  isNfcSupported() && typeof window.NDEFReader.prototype.makeReadOnly === "function";

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

const toHex = (data) => {
  if (!data) return "";
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ").toUpperCase();
};

const decodeText = (record) => {
  if (!record?.data) return "";
  try {
    return new TextDecoder(record.encoding || "utf-8").decode(record.data);
  } catch {
    return "";
  }
};

/**
 * Convierte un NDEFRecord en un objeto simple para mostrar en pantalla.
 * @returns {{ type: string, label: string, value: string, mediaType: string|null, lang: string|null, size: number, nested?: any[] }}
 */
export function describeRecord(record) {
  const base = {
    type: record.recordType,
    mediaType: record.mediaType ?? null,
    lang: record.lang ?? null,
    size: record.data?.byteLength ?? 0,
  };
  switch (record.recordType) {
    case "empty":
      return { ...base, label: "Vacío", value: "" };
    case "text":
      return { ...base, label: "Texto", value: decodeText(record) };
    case "url":
    case "absolute-url":
      return { ...base, label: "URL", value: decodeText(record) };
    case "mime": {
      const mt = record.mediaType || "";
      const textual = mt.startsWith("text/") || mt.includes("json");
      return { ...base, label: `MIME ${mt}`, value: textual ? decodeText(record) : toHex(record.data) };
    }
    case "smart-poster": {
      let nested = [];
      try {
        nested = (record.toRecords?.() ?? []).map(describeRecord);
      } catch {
        /* smart-poster mal formado */
      }
      return { ...base, label: "Smart poster", value: nested.map((n) => n.value).filter(Boolean).join(" · "), nested };
    }
    default:
      return { ...base, label: `Registro ${record.recordType}`, value: toHex(record.data) };
  }
}

/** Primer valor "útil" (texto o URL) de una lista de registros ya descritos. */
const pickPayload = (described) => {
  for (const r of described) {
    if (["text", "url", "absolute-url"].includes(r.type) && r.value) return r.value;
    if (r.type === "mime" && r.value && !/^[0-9A-F ]+$/.test(r.value)) return r.value;
    if (r.nested?.length) {
      const inner = pickPayload(r.nested);
      if (inner) return inner;
    }
  }
  return "";
};

/**
 * Escucha tags de forma continua. onTag recibe:
 *   { serialNumber, records: [describeRecord...], payload }
 * `payload` es el primer texto/URL útil (o "" si el tag no tiene ninguno).
 * Devuelve la función para detener la escucha.
 */
export function watchTags(onTag, onError) {
  const controller = new AbortController();
  (async () => {
    try {
      const reader = new window.NDEFReader();
      await reader.scan({ signal: controller.signal });
      reader.onreadingerror = () => onError?.(new Error("No se pudo leer el tag. Acercalo de nuevo."));
      reader.onreading = (event) => {
        const records = event.message.records.map(describeRecord);
        onTag({ serialNumber: event.serialNumber || "", records, payload: pickPayload(records) });
      };
    } catch (err) {
      if (err?.name !== "AbortError") onError?.(err);
    }
  })();
  return () => controller.abort();
}

/**
 * Versión simple usada por el escáner del participante: entrega solo el texto del
 * primer registro útil (o el número de serie si el tag no tiene texto/URL).
 */
export function startNfcScan(onRead, onError) {
  return watchTags((tag) => onRead(tag.payload || tag.serialNumber || ""), onError);
}

/* ------------------------------------------------------------------ */
/* Escritura                                                           */
/* ------------------------------------------------------------------ */

export const textRecord = (text, lang = "es") => ({ recordType: "text", data: String(text), lang });
export const urlRecord = (url) => ({ recordType: "url", data: String(url) });
export const mimeRecord = (mediaType, text) => ({
  recordType: "mime",
  mediaType: String(mediaType),
  data: new TextEncoder().encode(String(text)),
});

/** URL que abre la PWA con el elemento ya identificado (parseScanPayload la entiende: ?el=CODIGO). */
export const buildTagUrl = (codigo) =>
  `${window.location.origin}/?el=${encodeURIComponent(String(codigo ?? "").trim())}`;

/**
 * Graba una lista de registros. Reemplaza el contenido del tag (como "Escribir" en NFC Tools).
 * Resuelve cuando el usuario acerca el tag y la escritura termina.
 */
export async function writeNfcRecords(records, { overwrite = true, signal } = {}) {
  if (!records?.length) throw new Error("Agregá al menos un registro para grabar.");
  const reader = new window.NDEFReader();
  await reader.write({ records }, { overwrite, signal });
}

/** Compatibilidad con el inventario anterior: graba un único registro de texto. */
export const writeNfcTag = (payload, options) => writeNfcRecords([textRecord(payload, "en")], options);

/** Borra el contenido (deja un registro vacío). */
export async function eraseNfcTag({ signal } = {}) {
  const reader = new window.NDEFReader();
  await reader.write({ records: [{ recordType: "empty" }] }, { overwrite: true, signal });
}

/** Bloquea el tag en solo lectura. Es IRREVERSIBLE. */
export async function lockNfcTag({ signal } = {}) {
  if (!canLockNfc()) throw Object.assign(new Error("Este navegador no permite bloquear tags."), { name: "NotSupportedError" });
  const reader = new window.NDEFReader();
  await reader.makeReadOnly({ signal });
}

/* ------------------------------------------------------------------ */
/* Errores legibles                                                    */
/* ------------------------------------------------------------------ */

export function describeNfcError(err) {
  switch (err?.name) {
    case "NotAllowedError":
      return "Permiso de NFC denegado. Habilitalo en los ajustes del navegador.";
    case "NotSupportedError":
      return err.message?.includes("bloquear")
        ? err.message
        : "Este dispositivo no tiene NFC o está apagado.";
    case "NotReadableError":
      return "No se pudo leer el tag. Acercalo de nuevo y mantenelo quieto.";
    case "NetworkError":
      return "No se pudo escribir. El tag se alejó, está bloqueado o no tiene memoria suficiente.";
    case "SyntaxError":
    case "DataError":
      return "Alguno de los registros no es válido. Revisá el contenido.";
    case "AbortError":
      return "Operación cancelada.";
    default:
      return err?.message || "No se pudo usar el NFC.";
  }
}