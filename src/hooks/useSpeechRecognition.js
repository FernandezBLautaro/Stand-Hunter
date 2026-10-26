import { useCallback, useEffect, useRef, useState } from 'react';

const Ctor = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const describeSpeechError = (code) => {
  switch (code) {
    case 'unsupported':
      return 'Tu navegador no soporta reconocimiento de voz. Escribí la respuesta.';
    case 'denied':
      return 'Permiso de micrófono denegado. Habilitalo en el navegador o escribí la respuesta.';
    case 'no-speech':
      return 'No te escuché. Probá de nuevo, más cerca del micrófono.';
    case 'error':
      return 'No se pudo usar el micrófono. Escribí la respuesta.';
    default:
      return '';
  }
};

/**
 * Dictado por voz (Web Speech API). Si el navegador no lo soporta o el permiso se deniega,
 * `error` lo informa y la UI ofrece ingresar el texto a mano.
 */
export function useSpeechRecognition({ lang = 'es-AR' } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(
    (onFinal) => {
      if (!Ctor) {
        setError('unsupported');
        return;
      }
      setError('');
      setInterim('');
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let finalText = '';
      rec.onresult = (e) => {
        let partial = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else partial += r[0].transcript;
        }
        setInterim(partial || finalText);
      };
      rec.onerror = (e) =>
        setError(
          e.error === 'not-allowed' || e.error === 'service-not-allowed'
            ? 'denied'
            : e.error === 'no-speech'
            ? 'no-speech'
            : 'error'
        );
      rec.onend = () => {
        setListening(false);
        setInterim('');
        recRef.current = null;
        if (finalText.trim()) onFinal?.(finalText.trim());
      };
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        setError('error');
      }
    },
    [lang]
  );

  useEffect(() => () => recRef.current?.abort?.(), []);

  return { supported: !!Ctor, listening, interim, error, start, stop };
}
