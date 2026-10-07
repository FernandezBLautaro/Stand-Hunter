// src/context/ParticipationContext.jsx
// Fuente única de verdad de la participación en curso:
//  - Reanuda la participación si el usuario vuelve a tocar «Iniciar desafío» dentro del tiempo.
//  - Corre la cuenta regresiva (duración de la experiencia) y, al llegar a 0, marca la
//    participación como 'expirada'. Si el usuario está en el ScannerScreen, expone `expiredInfo`
//    para que se muestre el InfoModal.
//  - Restaura la participación tras recargar la página (se busca en Firestore: estado 'en_curso').
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  startParticipation, finishParticipation, findActiveParticipation,
} from '../services/participationService.js';

const ParticipationContext = createContext(null);

const MIN_MS = 60 * 1000;

/** Documento de Firestore / resultado de start → forma interna con deadline. */
const toActive = (p, fallbackMin) => {
  const duracionMin = Number(p.duracionMin) > 0 ? Number(p.duracionMin) : Number(fallbackMin) || 10;
  return {
    id: p.id,
    experienciaId: p.experienciaId,
    experienciaNombre: p.experienciaNombre ?? '',
    startedAtMs: p.startedAtMs,
    deadlineMs: p.startedAtMs + duracionMin * MIN_MS,
  };
};

/**
 * @param {{
 *   user: import('firebase/auth').User | null,
 *   nickname: string,
 *   experiences: import('../types.js').Experience[],
 *   onError?: (err: any) => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export function ParticipationProvider({ user, nickname, experiences, onError, children }) {
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [active, setActive] = useState(null); // { id, experienciaId, experienciaNombre, startedAtMs, deadlineMs }
  const [now, setNow] = useState(() => Date.now());
  const [expiredInfo, setExpiredInfo] = useState(null); // { experienciaNombre } → dispara el modal

  // Refs para leer el valor actual dentro de callbacks estables.
  const activeRef = useRef(active);
  const selectedRef = useRef(selectedExperience);
  const onErrorRef = useRef(onError);
  const scannerVisible = useRef(false);
  const expiring = useRef(false);
  const restoredFor = useRef(null);
  activeRef.current = active;
  selectedRef.current = selectedExperience;
  onErrorRef.current = onError;

  const reportError = (err) => onErrorRef.current?.(err);

  /* ---------- Cuenta regresiva ---------- */
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const remainingMs = active ? Math.max(0, active.deadlineMs - now) : null;

  /* ---------- Expiración ---------- */
  const expire = useCallback(async (part) => {
    if (expiring.current) return;
    expiring.current = true;
    try {
      await finishParticipation(part.id, { estado: 'expirada', startedAtMs: part.startedAtMs });
    } catch (err) {
      reportError(err);
    }
    setActive(null);
    if (scannerVisible.current) {
      // El usuario está mirando el escáner: se le avisa con el modal.
      setExpiredInfo({ experienciaNombre: part.experienciaNombre || selectedRef.current?.nombre || '' });
    } else {
      setSelectedExperience(null);
    }
    expiring.current = false;
  }, []);

  useEffect(() => {
    if (active && now >= active.deadlineMs) expire(active);
  }, [active, now, expire]);

  /* ---------- Restaurar tras recargar ---------- */
  useEffect(() => {
    if (!user?.uid) {
      restoredFor.current = null;
      setActive(null);
      setSelectedExperience(null);
      setExpiredInfo(null);
      return;
    }
    if (activeRef.current || restoredFor.current === user.uid || experiences.length === 0) return;
    restoredFor.current = user.uid;
    (async () => {
      try {
        const p = await findActiveParticipation(user.uid);
        if (!p) return;
        const exp = experiences.find((e) => e.id === p.experienciaId);
        const part = toActive(p, exp?.duracion);
        if (part.deadlineMs <= Date.now()) {
          await finishParticipation(part.id, { estado: 'expirada', startedAtMs: part.startedAtMs });
          return;
        }
        if (!exp) return; // la experiencia fue ocultada: no se puede retomar desde la UI
        setActive(part);
        setSelectedExperience(exp);
      } catch (err) {
        reportError(err);
      }
    })();
  }, [user, experiences]);

  /* ---------- Acciones ---------- */

  /** Inicia la experiencia o, si ya estaba en curso y dentro de tiempo, la retoma. */
  const startOrResume = useCallback(async (experience) => {
    if (!user) return null;
    setExpiredInfo(null);
    setSelectedExperience(experience);

    const cur = activeRef.current;
    if (cur && cur.experienciaId === experience.id && cur.deadlineMs > Date.now()) return 'resumed';

    try {
      // Solo una participación en curso a la vez: la anterior (otra experiencia) se abandona.
      if (cur && cur.experienciaId !== experience.id) {
        await finishParticipation(cur.id, { estado: 'abandonada', startedAtMs: cur.startedAtMs });
        setActive(null);
      }
      const existing = await findActiveParticipation(user.uid, experience.id);
      if (existing) {
        const part = toActive(existing, experience.duracion);
        if (part.deadlineMs > Date.now()) {
          setActive(part);
          return 'resumed';
        }
        await finishParticipation(part.id, { estado: 'expirada', startedAtMs: part.startedAtMs });
      }
      const started = await startParticipation({
        usuarioId: user.uid,
        usuarioNickname: nickname,
        experienciaId: experience.id,
        experienciaNombre: experience.nombre,
        duracionMin: experience.duracion,
      });
      setActive(toActive({
        id: started.id,
        experienciaId: experience.id,
        experienciaNombre: experience.nombre,
        startedAtMs: started.startedAtMs,
        duracionMin: experience.duracion,
      }));
      return 'started';
    } catch (err) {
      reportError(err);
      return null;
    }
  }, [user, nickname]);

  const conclude = useCallback(async () => {
    const cur = activeRef.current;
    if (cur) {
      try {
        await finishParticipation(cur.id, {
          estado: 'completada',
          startedAtMs: cur.startedAtMs,
          puntajeFinal: selectedRef.current?.puntos ?? null,
        });
      } catch (err) {
        reportError(err);
      }
    }
    setActive(null);
    setSelectedExperience(null);
  }, []);

  const abandon = useCallback(async () => {
    const cur = activeRef.current;
    if (cur) {
      try {
        await finishParticipation(cur.id, { estado: 'abandonada', startedAtMs: cur.startedAtMs });
      } catch (err) {
        reportError(err);
      }
    }
    setActive(null);
    setSelectedExperience(null);
  }, []);

  const dismissExpired = useCallback(() => {
    setExpiredInfo(null);
    setSelectedExperience(null);
  }, []);

  const setScannerVisible = useCallback((v) => {
    scannerVisible.current = v;
  }, []);

  const reset = useCallback(() => {
    setActive(null);
    setSelectedExperience(null);
    setExpiredInfo(null);
  }, []);

  const value = useMemo(
    () => ({
      selectedExperience,
      active,
      remainingMs,
      expiredInfo,
      startOrResume,
      conclude,
      abandon,
      dismissExpired,
      setScannerVisible,
      reset,
    }),
    [selectedExperience, active, remainingMs, expiredInfo, startOrResume, conclude, abandon, dismissExpired, setScannerVisible, reset]
  );

  return <ParticipationContext.Provider value={value}>{children}</ParticipationContext.Provider>;
}

export function useParticipation() {
  const ctx = useContext(ParticipationContext);
  if (!ctx) throw new Error('useParticipation debe usarse dentro de <ParticipationProvider>.');
  return ctx;
}