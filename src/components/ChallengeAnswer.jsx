import { useEffect, useState } from 'react';
import { useSpeechRecognition, describeSpeechError } from '../hooks/useSpeechRecognition.js';

const TITULO = {
  pregunta: 'Tu respuesta',
  codigo: 'Escaneá el QR o escribí el código',
  voz: 'Dictá la frase en voz alta',
};
const PLACEHOLDER = {
  pregunta: 'Escribí tu respuesta',
  codigo: '¿No escanea? Escribí el código',
  voz: 'O escribila acá si no podés hablar',
};

/**
 * ESC04 — Entrada de respuesta según el tipo del desafío activo: pregunta (texto),
 * código (QR o manual) o voz (dictado, con respaldo de texto si el navegador no lo soporta).
 * Usar con key={desafio.id} para que se reinicie al avanzar.
 *
 * @param {{
 *   desafio: { id: string, tipoValidacion: 'pregunta'|'codigo'|'voz' },
 *   disabled?: boolean,
 *   busy?: boolean,
 *   onSubmit: (respuesta: string, via: 'texto'|'codigo'|'voz') => Promise<any>,
 *   onScan?: () => void,
 * }} props
 */
export const ChallengeAnswer = ({ desafio, disabled = false, busy = false, onSubmit, onScan }) => {
  const tipo = desafio.tipoValidacion;
  const [value, setValue] = useState('');
  const [dictated, setDictated] = useState(false);
  const speech = useSpeechRecognition();
  const speechNotice = describeSpeechError(!speech.supported && tipo === 'voz' ? 'unsupported' : speech.error);

  useEffect(() => {
    if (disabled) speech.stop();
  }, [disabled, speech]);

  const startVoice = () => {
    if (disabled || busy) return;
    if (speech.listening) {
      speech.stop();
      return;
    }
    speech.start((text) => {
      setValue(text);
      setDictated(true);
    });
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (disabled || busy) return;
    const via = tipo === 'voz' && dictated ? 'voz' : tipo === 'codigo' ? 'codigo' : 'texto';
    const r = await onSubmit(value, via);
    if (r?.type === 'error' && tipo === 'voz') {
      setValue('');
      setDictated(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <p className="font-label-code text-[11px] text-[#00eefc] uppercase tracking-wider">{TITULO[tipo]}</p>

      {tipo === 'codigo' && (
        <button
          type="button"
          onClick={onScan}
          disabled={disabled || busy}
          className="h-14 rounded-xl bg-[#ff027f] hover:bg-[#ff027f]/90 text-white font-headline-sm text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,2,127,0.55)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
          Escanear QR
        </button>
      )}

      {tipo === 'voz' && speech.supported && (
        <button
          type="button"
          onClick={startVoice}
          disabled={disabled || busy}
          aria-pressed={speech.listening}
          className={`h-14 rounded-xl font-headline-sm text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 ${
            speech.listening
              ? 'bg-[#3e001a] border border-[#ff027f] text-[#ff027f] animate-pulse'
              : 'bg-[#ff027f] text-white shadow-[0_0_24px_rgba(255,2,127,0.55)]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">{speech.listening ? 'graphic_eq' : 'mic'}</span>
          {speech.listening ? 'Escuchando… tocá para terminar' : 'Hablar'}
        </button>
      )}

      {speech.listening && speech.interim && (
        <p className="text-[13px] text-[#7df4ff] italic">«{speech.interim}»</p>
      )}
      {speechNotice && (
        <p role="alert" className="text-[12px] text-[#ffb1c4] flex items-start gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          {speechNotice}
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          maxLength={400}
          onChange={(e) => {
            setValue(e.target.value);
            setDictated(false);
          }}
          placeholder={PLACEHOLDER[tipo]}
          aria-label={TITULO[tipo]}
          disabled={disabled}
          autoComplete="off"
          className="flex-1 h-12 bg-[#0e0b21] border border-white/10 rounded-lg px-3 text-[14px] text-[#e5defe] placeholder-[#c9c5d0]/50 focus:outline-none focus:border-[#00eefc] disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled || busy}
          className="px-4 h-12 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${busy ? 'animate-spin' : ''}`}>
            {busy ? 'sync' : 'check'}
          </span>
          {busy ? 'Validando…' : 'Validar'}
        </button>
      </div>
    </form>
  );
};
