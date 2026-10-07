import { useEffect, useRef, useState } from 'react';
import { isNfcSupported, startNfcScan, describeNfcError } from '../services/nfc.js';

const BANNER = {
  error: 'bg-[#3e001a]/95 border-[#ff027f]/60 text-[#ffdad6]',
  info: 'bg-[#1c192f] border-white/20 text-[#e5defe]',
};

/**
 * ESC03 — Modal de lectura NFC para el participante.
 * Escucha tags hasta que se lee el código correcto (o se cierra).
 *
 * @param {{
 *   titulo?: string,
 *   onRead: (text: string) => Promise<{ type: 'ok' | 'error' | 'info', text: string } | null | undefined>,
 *   onClose: () => void,
 * }} props
 */
export const NfcScanModal = ({ titulo, onRead, onClose }) => {
  const supported = isNfcSupported();
  const [phase, setPhase] = useState(supported ? 'waiting' : 'unsupported'); // waiting | success | error | unsupported
  const [message, setMessage] = useState('');
  const [last, setLast] = useState(null); // { type, text } del último tag leído
  const [attempt, setAttempt] = useState(0);
  const onReadRef = useRef(onRead);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onReadRef.current = onRead;
    onCloseRef.current = onClose;
  }, [onRead, onClose]);

  useEffect(() => {
    if (!supported) return undefined;
    let closeTimer = null;
    let done = false;
    setPhase('waiting');
    setMessage('');
    setLast(null);

    const stop = startNfcScan(
      async (text) => {
        if (done) return;
        const res = await onReadRef.current(text);
        if (done || !res) return;
        if (res.type === 'ok') {
          done = true;
          stop();
          setPhase('success');
          setMessage(res.text);
          closeTimer = setTimeout(() => onCloseRef.current?.(), 1400);
        } else {
          setLast(res);
        }
      },
      (err) => {
        if (done) return;
        setPhase('error');
        setMessage(describeNfcError(err));
      }
    );

    return () => {
      done = true;
      stop();
      clearTimeout(closeTimer);
    };
  }, [attempt, supported]);

  const waiting = phase === 'waiting';

  const palette = {
    waiting: { ring: 'border-[#00eefc]/50 text-[#00eefc] shadow-[0_0_30px_rgba(0,238,252,0.35)]', icon: 'nfc' },
    success: { ring: 'border-[#00eefc] text-[#00eefc] shadow-[0_0_36px_rgba(0,238,252,0.6)]', icon: 'check_circle' },
    error: { ring: 'border-[#ff027f]/60 text-[#ff027f] shadow-[0_0_30px_rgba(255,2,127,0.4)]', icon: 'error' },
    unsupported: { ring: 'border-[#ffb1c4]/50 text-[#ffb1c4]', icon: 'nfc' },
  }[phase];

  return (
    <div
      className="fixed inset-0 z-[75] bg-[#0e0b21]/90 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-scan-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-[#131027] border border-[#00eefc]/30 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="min-w-0">
            <h2 id="nfc-scan-title" className="font-headline-sm text-[18px] font-semibold text-[#e5defe]">
              Lectura NFC
            </h2>
            {titulo && <p className="text-[12px] text-[#c9c5d0] truncate">{titulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-4 py-6 flex flex-col items-center text-center gap-4">
          {/* Ícono con ondas */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {waiting && (
              <>
                <span className="absolute inset-0 rounded-full border border-[#00eefc]/40 animate-ping" style={{ animationDuration: '2.2s' }} />
                <span className="absolute inset-3 rounded-full border border-[#ff027f]/40 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.6s' }} />
              </>
            )}
            <div className={`relative w-24 h-24 rounded-full bg-[#0e0b21] border-2 flex items-center justify-center ${palette.ring}`}>
              <span
                className={`material-symbols-outlined text-[44px] ${waiting ? 'animate-pulse' : ''}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {palette.icon}
              </span>
            </div>
          </div>

          {phase === 'waiting' && (
            <div>
              <p className="font-headline-sm text-[16px] font-bold text-[#e5defe]">Acercá el teléfono al tag</p>
              <p className="text-[13px] text-[#c9c5d0] mt-1 max-w-xs">
                Apoyá la parte trasera del teléfono sobre el elemento y mantenelo quieto un instante.
              </p>
            </div>
          )}

          {phase === 'success' && (
            <div>
              <p className="font-headline-sm text-[16px] font-bold text-[#00eefc]">¡Pista encontrada!</p>
              <p className="text-[13px] text-[#c9c5d0] mt-1">{message}</p>
            </div>
          )}

          {phase === 'error' && (
            <div>
              <p className="font-headline-sm text-[16px] font-bold text-[#ffb1c4]">No se pudo leer</p>
              <p className="text-[13px] text-[#ffdad6] mt-1 max-w-xs">{message}</p>
            </div>
          )}

          {phase === 'unsupported' && (
            <div>
              <p className="font-headline-sm text-[16px] font-bold text-[#ffb1c4]">NFC no disponible</p>
              <p className="text-[13px] text-[#c9c5d0] mt-1 max-w-xs">
                Este navegador o dispositivo no puede leer tags NFC. Probá con Chrome en Android, o escribí
                el código del elemento a mano en la pantalla anterior.
              </p>
            </div>
          )}

          {/* Resultado del último tag leído (código incorrecto, repetido, etc.) */}
          {last && phase === 'waiting' && (
            <div className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] text-left ${BANNER[last.type] ?? BANNER.info}`}>
              <span className="material-symbols-outlined text-[20px]">{last.type === 'error' ? 'error' : 'info'}</span>
              <span className="flex-1">{last.text}</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-1 pb-safe flex flex-col gap-2">
          {phase === 'error' && (
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="h-12 rounded-xl bg-[#ff027f] text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,2,127,0.5)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Reintentar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-white/15 text-[#c9c5d0] text-[13px] font-semibold hover:text-[#e5defe] cursor-pointer"
          >
            {phase === 'unsupported' ? 'Entendido' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
};