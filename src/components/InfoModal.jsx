import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Paleta por tipo de mensaje (tomada de tailwind.config.js y de los modales existentes).
 *  error   -> magenta electrico (mismo lenguaje que ErrorBanner)
 *  warning -> rosa claro (tertiary)
 *  success -> cian vibrante
 *  info    -> lila (primary)
 */
const TIPOS = {
  error: {
    icono: 'block',
    borde: 'border-[#ff027f]/60',
    glow: 'shadow-[0_0_40px_rgba(255,2,127,0.35)]',
    chip: 'bg-[#3e001a] border-[#ff027f]/60 text-[#ff027f]',
    titulo: 'text-[#ffb1c4]',
    texto: 'text-[#ffdad6]',
    boton: 'bg-[#ff027f] text-white shadow-[0_0_20px_rgba(255,2,127,0.55)]',
  },
  warning: {
    icono: 'warning',
    borde: 'border-[#ffb1c4]/50',
    glow: 'shadow-[0_0_40px_rgba(255,177,196,0.2)]',
    chip: 'bg-[#3e001a]/70 border-[#ffb1c4]/50 text-[#ffb1c4]',
    titulo: 'text-[#ffb1c4]',
    texto: 'text-[#e5defe]',
    boton: 'bg-[#ffb1c4] text-[#3f001a] shadow-[0_0_16px_rgba(255,177,196,0.4)]',
  },
  success: {
    icono: 'check_circle',
    borde: 'border-[#00eefc]/50',
    glow: 'shadow-[0_0_40px_rgba(0,238,252,0.25)]',
    chip: 'bg-[#0e0b21] border-[#00eefc]/50 text-[#00eefc]',
    titulo: 'text-[#00eefc]',
    texto: 'text-[#e5defe]',
    boton: 'bg-[#00eefc] text-[#002022] shadow-[0_0_16px_rgba(0,238,252,0.4)]',
  },
  info: {
    icono: 'info',
    borde: 'border-[#c7c0f8]/40',
    glow: 'shadow-[0_0_40px_rgba(199,192,248,0.2)]',
    chip: 'bg-[#1a1442] border-[#c7c0f8]/40 text-[#c7c0f8]',
    titulo: 'text-[#e5defe]',
    texto: 'text-[#c9c5d0]',
    boton: 'bg-[#00eefc] text-[#002022] shadow-[0_0_16px_rgba(0,238,252,0.4)]',
  },
};

/**
 * Modal informativo centrado, reutilizable para errores y avisos genericos.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   type?: 'error' | 'warning' | 'success' | 'info',
 *   title: string,
 *   message?: string,
 *   children?: import('react').ReactNode,
 *   icon?: string,
 *   primaryLabel?: string,
 *   onPrimary?: () => void,
 *   secondaryLabel?: string,
 *   onSecondary?: () => void,
 *   dismissOnBackdrop?: boolean,
 *   autoCloseMs?: number,
 * }} props
 */
export const InfoModal = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  children,
  icon,
  primaryLabel = 'Entendido',
  onPrimary,
  secondaryLabel,
  onSecondary,
  dismissOnBackdrop = true,
  autoCloseMs,
}) => {
  const primaryRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape para cerrar, foco inicial en el boton principal y cierre automatico opcional.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    primaryRef.current?.focus();
    const timer = autoCloseMs ? setTimeout(() => onCloseRef.current?.(), autoCloseMs) : null;
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [isOpen, autoCloseMs]);

  if (!isOpen) return null;

  const t = TIPOS[type] ?? TIPOS.info;

  const handlePrimary = () => {
    if (onPrimary) onPrimary();
    else onClose?.();
  };
  const handleSecondary = () => {
    onSecondary?.();
    onClose?.();
  };

  // Portal a <body>: queda por encima del Header y la BottomNavigation (z-50) sin importar donde se use.
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#0e0b21]/90 backdrop-blur-xl"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        role={type === 'error' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="info-modal-title"
        aria-describedby={message ? 'info-modal-message' : undefined}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-2xl bg-[#131027] border p-5 flex flex-col items-center text-center gap-3 ${t.borde} ${t.glow}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 material-symbols-outlined text-[#c9c5d0] hover:text-[#e5defe] cursor-pointer"
        >
          close
        </button>

        <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${t.chip}`}>
          <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon ?? t.icono}
          </span>
        </div>

        <h2 id="info-modal-title" className={`font-headline-md text-[20px] font-bold leading-tight ${t.titulo}`}>
          {title}
        </h2>

        {message && (
          <p id="info-modal-message" className={`text-[13px] leading-relaxed ${t.texto}`}>
            {message}
          </p>
        )}

        {children}

        <div className="w-full flex flex-col gap-2 pt-2">
          <button
            ref={primaryRef}
            type="button"
            onClick={handlePrimary}
            className={`w-full h-12 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-transform cursor-pointer ${t.boton}`}
          >
            {primaryLabel}
          </button>
          {secondaryLabel && (
            <button
              type="button"
              onClick={handleSecondary}
              className="w-full h-11 rounded-xl border border-white/15 text-[#e5defe] text-[13px] font-semibold hover:bg-white/5 cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
