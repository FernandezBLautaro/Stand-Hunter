export const ComingSoonScreen = ({ title, sprintLabel, onBack, onConclude }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto px-4 pt-24 pb-24 min-h-[70vh]">
      <div className="w-16 h-16 rounded-full bg-[#1c192f] border border-[#00eefc]/30 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[28px] text-[#00eefc]">schedule</span>
      </div>
      <h2 className="font-headline-md text-[20px] font-bold text-[#e5defe] mb-1">{title}</h2>
      <p className="font-label-code text-[11px] text-[#c9c5d0] uppercase tracking-wider mb-4">
        Disponible en {sprintLabel}
      </p>
      <p className="font-body-sm text-[13px] text-[#c9c5d0] max-w-xs leading-relaxed mb-6">
        Esta sección todavía no forma parte del alcance del Sprint 1. Podés seguir explorando
        las misiones disponibles mientras tanto.
      </p>

      {onConclude && (
        <button
          onClick={onConclude}
          className="mb-3 px-4 py-2 rounded-xl bg-[#ff027f] hover:bg-[#ff027f]/90 text-white font-headline-sm text-[13px] font-bold uppercase tracking-wide cursor-pointer shadow-[0_0_16px_rgba(255,2,127,0.5)] active:scale-[0.98] transition-transform"
        >
          Concluir experiencia
        </button>
      )}

      <button
        onClick={onBack}
        className="px-4 py-2 rounded-xl bg-[#00eefc] text-[#002022] font-headline-sm text-[13px] font-bold uppercase tracking-wide cursor-pointer"
      >
        Volver a Misiones
      </button>
    </div>
  );
};