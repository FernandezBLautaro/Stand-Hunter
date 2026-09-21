/**
 * @param {{
 *   error: import('../types.js').ApiError | null,
 *   onRetry: () => void,
 *   onDismiss: () => void,
 *   isRetrying?: boolean,
 * }} props
 */
export const ErrorBanner = ({ error, onRetry, onDismiss, isRetrying = false }) => {
  if (!error) return null;

  return (
    <div className="fixed top-18 left-0 right-0 z-50 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="rounded-xl bg-[#3e001a]/95 border border-[#ff027f]/60 backdrop-blur-xl p-3.5 shadow-[0_4px_24px_rgba(255,2,127,0.4)] flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ff027f] text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_#ff027f]">
              <span className="material-symbols-outlined text-[18px]">signal_disconnected</span>
            </div>
            <div>
              <span className="font-label-code text-[11px] text-[#ffb1c4] uppercase font-bold tracking-wider">
                {error.code || 'ALERTA DE TELEMETRÍA'} {error.status ? `[HTTP ${error.status}]` : ''}
              </span>
              <p className="font-body-sm text-[13px] text-[#ffdad6] leading-snug font-medium">
                {error.message}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-[#ffb1c4] hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Cerrar alerta"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#ff027f]/30">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-3 py-1.5 rounded-lg bg-[#ff027f] text-white font-label-md text-[12px] font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,2,127,0.5)] active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRetrying ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isRetrying ? 'Reconectando...' : 'Reintentar Ahora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
