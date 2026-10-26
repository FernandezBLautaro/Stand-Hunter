// src/context/ChallengeContext.jsx
// Estado de los desafíos de la participación en curso (ESC04, ESC05, ESC07, ESC11):
//  - progreso por desafío (PROGRESO), reconstruido desde Firestore tras recargar o perder conexión;
//  - desafío actual = el primero en orden que todavía no se resolvió (los posteriores no se ven);
//  - validación de respuestas y pistas base vía Cloud Functions;
//  - tiempo propio del desafío, acotado por el tiempo total de la experiencia.
// Debe montarse DENTRO de <ParticipationProvider>.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParticipation } from './ParticipationContext.jsx';
import {
  subscribeProgreso, validateAnswer, requestBaseHint, describeProgressError,
} from '../services/challengeService.js';

const ChallengeContext = createContext(null);

/**
 * @param {{ onError?: (err:any) => void, children: import('react').ReactNode }} props
 */
export function ChallengeProvider({ onError, children }) {
  const { selectedExperience: experience, active, remainingMs } = useParticipation();
  const participationId = active?.id ?? null;

  const [progreso, setProgreso] = useState(() => new Map());
  const [local, setLocal] = useState(() => new Map()); // resueltos confirmados por el servidor, aún sin snapshot
  const [loadingProgreso, setLoadingProgreso] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const busyRef = useRef(false);
  const hintRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    setProgreso(new Map());
    setLocal(new Map());
    if (!participationId) {
      setLoadingProgreso(false);
      return undefined;
    }
    setLoadingProgreso(true);
    return subscribeProgreso(
      participationId,
      (map) => {
        setProgreso(map);
        setLoadingProgreso(false);
      },
      (err) => {
        setLoadingProgreso(false);
        onErrorRef.current?.(err);
      }
    );
  }, [participationId]);

  const desafios = useMemo(() => experience?.desafios ?? [], [experience]);

  // desafioId -> momento de resolución (ms). El avance es monótono, por eso es seguro unir ambas fuentes.
  const resueltoMs = useMemo(() => {
    const m = new Map();
    progreso.forEach((p, id) => {
      if (p.estado === 'resuelto') m.set(id, p.resueltoMs ?? 0);
    });
    local.forEach((ms, id) => {
      if (!m.has(id)) m.set(id, ms);
    });
    return m;
  }, [progreso, local]);

  const indiceActual = desafios.findIndex((d) => !resueltoMs.has(d.id));
  const completo = desafios.length > 0 && indiceActual === -1;
  const desafioActual = completo ? null : desafios[indiceActual] ?? null;
  const progresoActual = desafioActual ? progreso.get(desafioActual.id) ?? null : null;
  const resueltos = completo ? desafios.length : Math.max(0, indiceActual);

  // Pistas base: públicas y progresivas. Se muestran tantas como `pistasUtilizadas` registre el progreso.
  const pistasTotal = (desafioActual?.pistasBase ?? []).length;
  const pistasUsadas = Math.min(progresoActual?.pistasUtilizadas ?? 0, pistasTotal);
  const pistasEntregadas = useMemo(
    () => (desafioActual?.pistasBase ?? []).slice(0, pistasUsadas),
    [desafioActual, pistasUsadas]
  );

  // Tiempo del desafío actual: arranca al resolver el anterior (o al iniciar) y nunca supera el total.
  const nowMs = active ? active.deadlineMs - (remainingMs ?? 0) : Date.now();
  const prevMs = indiceActual > 0 ? resueltoMs.get(desafios[indiceActual - 1].id) ?? 0 : 0;
  const inicioDesafioMs = Math.max(active?.startedAtMs ?? 0, prevMs);
  const limiteDesafioMs =
    desafioActual && active
      ? Math.min(inicioDesafioMs + desafioActual.tiempoMaximo * 1000, active.deadlineMs)
      : null;
  const restanteDesafioMs = limiteDesafioMs === null ? null : Math.max(0, limiteDesafioMs - nowMs);
  const desafioExcedido = restanteDesafioMs === 0 && (remainingMs ?? 0) > 0;

  /**
   * ESC04 / ESC07 — Envía una respuesta (texto, código o voz) a validar en el servidor.
   * @returns {Promise<{type:'ok'|'error'|'info'|'warn', text:string, completo?:boolean} | null>}
   */
  const submit = useCallback(
    async (respuesta, via = 'texto') => {
      const texto = String(respuesta ?? '').trim();
      if (!texto) return { type: 'warn', text: 'Escribí o dictá una respuesta antes de validar.' };
      if (!active || !desafioActual) return { type: 'error', text: 'No hay un desafío activo.' };
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      const desafio = desafioActual;
      try {
        const r = await validateAnswer({
          participacionId: active.id,
          desafioId: desafio.id,
          orden: indiceActual,
          tipo: desafio.tipoValidacion,
          respuesta: texto,
          via,
        });
        if (r.resultado === 'correcto' || r.resultado === 'ya_resuelto') {
          setLocal((prev) => (prev.has(desafio.id) ? prev : new Map(prev).set(desafio.id, Date.now())));
        }
        if (r.resultado === 'correcto') {
          return {
            type: 'ok',
            text: via === 'qr' ? `¡Pista encontrada! ${desafio.titulo}` : `¡Correcto! ${desafio.titulo}`,
            completo: resueltos + 1 >= desafios.length,
          };
        }
        if (r.resultado === 'ya_resuelto') return { type: 'info', text: 'Ya resolviste este desafío.' };
        return {
          type: 'error',
          text: via === 'qr' ? 'Código incorrecto.' : 'Respuesta incorrecta. Probá de nuevo o pedí una pista.',
        };
      } catch (err) {
        return { type: 'error', text: describeProgressError(err) };
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [active, desafioActual, indiceActual, resueltos, desafios.length]
  );

  /** ESC05 / ADM10 — Pide la siguiente pista base (una por solicitud, en el orden configurado). */
  const requestHint = useCallback(async () => {
    if (!active || !desafioActual) return { type: 'error', text: 'No hay un desafío activo.' };
    if (hintRef.current) return { type: 'info', text: 'Un momento, estoy buscando la pista…' };
    hintRef.current = true;
    setHintBusy(true);
    try {
      const r = await requestBaseHint({
        participacionId: active.id,
        desafioId: desafioActual.id,
        orden: indiceActual,
        usadas: pistasUsadas,
        total: pistasTotal,
      });
      if (r.sinPistas) {
        return {
          type: 'info',
          sinPistas: true,
          text: r.total === 0
            ? 'Este desafío no tiene pistas base cargadas.'
            : 'Ya usaste todas las pistas base de este desafío.',
        };
      }
      const pista = desafioActual.pistasBase[pistasUsadas];
      return { type: 'ok', pista, indice: r.indice, total: r.total, text: pista };
    } catch (err) {
      return { type: 'error', text: describeProgressError(err) };
    } finally {
      hintRef.current = false;
      setHintBusy(false);
    }
  }, [active, desafioActual, indiceActual, pistasUsadas, pistasTotal]);

  const value = useMemo(
    () => ({
      desafios,
      desafioActual,
      indiceActual,
      completo,
      resueltos,
      total: desafios.length,
      progresoActual,
      pistasEntregadas,
      pistasTotal,
      restanteDesafioMs,
      desafioExcedido,
      loadingProgreso,
      busy,
      hintBusy,
      bloqueado: !active, // sin participación en curso (p. ej. tiempo expirado): no se valida ni se consulta
      submit,
      requestHint,
    }),
    [
      desafios, desafioActual, indiceActual, completo, resueltos, progresoActual, pistasEntregadas, pistasTotal, restanteDesafioMs,
      desafioExcedido, loadingProgreso, busy, hintBusy, active, submit, requestHint,
    ]
  );

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenge debe usarse dentro de <ChallengeProvider>.');
  return ctx;
}
