// Normalización de respuestas. La usan el panel admin (al guardar `criteriosNorm`)
// y el participante (al validar): ambos lados deben producir exactamente el mismo texto.

/** minúsculas, sin tildes, sin signos: "¡Cancelar Autodestrucción!" -> "cancelar autodestruccion". */
export function normalizarTexto(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Para códigos: ignora también espacios y guiones ("totem a12" == "TOTEM-A12"). */
export const compactar = (s) => normalizarTexto(s).replace(/\s+/g, '');

/** Varias respuestas válidas separadas por "|" o salto de línea. */
export const parseCriterios = (raw) =>
  String(raw ?? '').split(/[|\n]/).map((x) => x.trim()).filter(Boolean);

/** Forma normalizada según el tipo de desafío ('pregunta' | 'codigo' | 'voz'). */
export function normalizarRespuesta(tipo, raw) {
  let r = String(raw ?? '').trim();
  if (tipo === 'codigo') {
    if (/^sh:/i.test(r)) r = r.slice(3);
    return compactar(r);
  }
  return normalizarTexto(r);
}
