import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

const describeCameraError = (err) => {
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Permiso de cámara denegado. Habilitalo en los ajustes del navegador y reintentá.';
    case 'NotFoundError':
      return 'No se encontró ninguna cámara en este dispositivo.';
    case 'NotReadableError':
      return 'La cámara está siendo usada por otra aplicación.';
    default:
      return err?.message || 'No se pudo abrir la cámara.';
  }
};

/**
 * ESC03 — Visor de cámara que decodifica códigos QR.
 * Usa BarcodeDetector cuando existe (Chrome/Android) y jsQR como alternativa (iOS Safari, escritorio).
 *
 * @param {{ onDetect: (rawValue: string) => void, onClose: () => void }} props
 */
export const QrScanner = ({ onDetect, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onDetectRef = useRef(onDetect);
  const [error, setError] = useState('');

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stream = null;
    let rafId = 0;
    let stopped = false;
    let lastValue = '';
    let lastAt = 0;

    const detector =
      'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;

    const decodeWithCanvas = (video) => {
      const canvas = canvasRef.current;
      if (!canvas || !video.videoWidth) return null;
      // Se reduce la imagen para que jsQR no se coma la CPU del teléfono.
      const scale = Math.min(1, 480 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height)?.data ?? null;
    };

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const value = detector
            ? (await detector.detect(video))[0]?.rawValue ?? null
            : decodeWithCanvas(video);
          const now = Date.now();
          // Evita disparar el mismo QR en cada frame: se vuelve a aceptar a los 2 s.
          if (value && (value !== lastValue || now - lastAt > 2000)) {
            lastValue = value;
            lastAt = now;
            onDetectRef.current(value);
          }
        } catch {
          /* un frame fallido no debe cortar el escaneo */
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no permite usar la cámara. Probá abriendo la app desde HTTPS.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch (err) {
        setError(describeCameraError(err));
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-[#0e0b21] flex flex-col">
      <div className="pt-safe px-4 h-16 flex items-center justify-between border-b border-[#00eefc]/15">
        <span className="font-headline-sm text-[16px] font-bold text-[#e5defe]">Escanear código</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar cámara"
          className="w-10 h-10 rounded-lg bg-[#2a273e] text-[#e5defe] flex items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64 rounded-xl shadow-[0_0_0_9999px_rgba(14,11,33,0.65)]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00eefc] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00eefc] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00eefc] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00eefc] rounded-br-lg" />
              <div className="absolute inset-x-3 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#ff027f] to-transparent shadow-[0_0_12px_#ff027f] animate-pulse" />
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-xs text-center rounded-xl bg-[#3e001a]/95 border border-[#ff027f]/60 p-4 space-y-3">
              <span className="material-symbols-outlined text-[32px] text-[#ff027f]">no_photography</span>
              <p className="text-[13px] text-[#ffdad6]">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-10 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer"
              >
                Ingresar el código a mano
              </button>
            </div>
          </div>
        )}
      </div>

      {!error && (
        <p className="pb-safe px-6 py-4 text-center text-[12px] text-[#c9c5d0]">
          Apuntá al código QR del elemento. Se detecta solo.
        </p>
      )}
    </div>
  );
};
