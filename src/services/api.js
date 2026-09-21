import axios from 'axios';

// Cliente Axios configurado
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'X-StandHunter-Client': 'web-pwa-v2.4',
  },
});

// Interceptor de solicitudes salientes (marca inicio para medir latencia)
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(handleAxiosError(error))
);

// Interceptor de respuestas entrantes
apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(handleAxiosError(error))
);

/**
 * Normaliza cualquier error de Axios/red a un objeto ApiError consistente.
 * @param {any} error
 * @returns {import('../types.js').ApiError}
 */
export function handleAxiosError(error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return {
          message: 'Tiempo de espera agotado (Timeout). El nodo del stand tarda en responder.',
          code: 'TIMEOUT',
          isNetworkError: true,
        };
      }
      return {
        message: 'Sin conexión con el servidor del stand. Verificando canal WebRTC/Wi-Fi...',
        code: 'NETWORK_OFFLINE',
        isNetworkError: true,
      };
    }

    if (status === 503) {
      return {
        message: responseData?.message || 'Servicio de telemetría temporalmente no disponible.',
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        isNetworkError: false,
      };
    }

    if (status === 500) {
      return {
        message: responseData?.message || 'Error interno en la base de datos del stand.',
        status: 500,
        code: 'SERVER_ERROR',
        isNetworkError: false,
      };
    }

    return {
      message: responseData?.message || responseData?.error || error.message || 'Error en la solicitud.',
      status,
      code: error.code,
      isNetworkError: false,
    };
  }

  return {
    message: error?.message || 'Ocurrió un error inesperado al procesar la telemetría.',
    isNetworkError: false,
  };
}

/**
 * VIS01/VIS04 — Estado en vivo del stand (agentes activos, latencia).
 * @param {boolean} [simulateError]
 * @returns {Promise<import('../types.js').LiveTelemetry>}
 */
export async function fetchLiveTelemetry(simulateError = false) {
  const url = simulateError ? '/stand/live-status?simulate_error=true' : '/stand/live-status';
  const response = await apiClient.get(url);
  return response.data.data;
}

/**
 * VIS01/VIS03/VIS04 — Listado de misiones disponibles.
 * @param {boolean} [simulateError]
 * @returns {Promise<import('../types.js').MissionItem[]>}
 */
export async function fetchMissions(simulateError = false) {
  const url = simulateError ? '/missions?simulate_error=true' : '/missions';
  const response = await apiClient.get(url);
  return response.data.missions;
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
 * ADM01-ADM04 — Autenticación de administrador.
 * @param {{ email: string, password: string }} data
 * @returns {Promise<import('../types.js').AdminSession>}
 */
export async function loginAdmin(data) {
  const response = await apiClient.post('/admin/login', data);
  return response.data;
}

/**
 * ADM01-ADM04 — Catálogo de experiencias gestionables.
 * @returns {Promise<import('../types.js').Experience[]>}
 */
export async function fetchAdminExperiences() {
  const response = await apiClient.get('/admin/experiences');
  return response.data.experiences;
}

/**
 * ADM01/ADM02 — Crear y configurar una experiencia.
 * @param {{ name: string, description: string, durationMinutes: number }} data
 */
export async function createExperience(data) {
  const response = await apiClient.post('/admin/experiences', data);
  return response.data.experience;
}

/**
 * ADM04 — Modificar una experiencia existente.
 * @param {string} id
 * @param {{ name?: string, description?: string, durationMinutes?: number }} data
 */
export async function updateExperience(id, data) {
  const response = await apiClient.patch(`/admin/experiences/${id}`, data);
  return response.data.experience;
}

/**
 * ADM03 — Activar o desactivar una experiencia.
 * @param {string} id
 * @param {boolean} active
 */
export async function toggleExperience(id, active) {
  const response = await apiClient.patch(`/admin/experiences/${id}/status`, { active });
  return response.data.experience;
}