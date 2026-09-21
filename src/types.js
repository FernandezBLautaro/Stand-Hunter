/**
 * Definiciones de forma de datos para StandHunter (Sprint 1).
 * En JS no existen los `interface`/`type` de TypeScript: se documentan
 * acá con JSDoc solo como referencia para el equipo, sin efecto en runtime.
 *
 * @typedef {'misiones' | 'escaner-ar' | 'asistente-ia' | 'recompensas'} ActiveTab
 * @typedef {'cazador' | 'cripto' | 'explorador'} TacticalSpecialty
 *
 * @typedef {Object} ParticipantProfile
 * @property {string} id
 * @property {string} nickname
 * @property {string} [email]
 * @property {TacticalSpecialty} specialty
 * @property {boolean} registered
 * @property {number} score
 *
 * @typedef {Object} LiveTelemetry
 * @property {string} boothId
 * @property {string} boothName
 * @property {number} activeAgents
 * @property {number} latencyMs
 * @property {string} timestamp
 *
 *  * @typedef {Object} AdminSession
 * @property {string} token
 * @property {string} email
 * @property {string} name
 * @property {string} loggedAt
 *
 * @typedef {Object} Experience
 * @property {string} id
 * @property {string} nombre
 * @property {string} descripcion
 * @property {number} duracion
 * @property {string} dificultad
 * @property {number} puntos
 * @property {boolean} activa
 * @property {string} locacion
 * @property {string} imagenUrl
 * @property {string} creadoEl
 * 
 *
 * @typedef {Object} ApiError
 * @property {string} message
 * @property {string} [code]
 * @property {number} [status]
 * @property {boolean} isNetworkError
 */

export {};
