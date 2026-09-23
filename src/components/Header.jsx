import { StandHunterLogo } from './StandHunterLogo';

const tabTitles = {
  misiones: 'Misiones',
  'escaner-ar': 'Escáner AR',
  'asistente-ia': 'Asistente IA',
  recompensas: 'Recompensas',
};

/**
 * @param {{
 *   activeTab: import('../types.js').ActiveTab,
 *   participant: import('../types.js').ParticipantProfile,
 *   latencyMs?: number,
 *   onOpenProfile: () => void,
 * }} props
 */
export const Header = ({ activeTab, participant, latencyMs = 12, onOpenProfile }) => {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#131027]/85 backdrop-blur-xl border-b border-[#00eefc]/15 shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
      <div className="h-16 px-4 max-w-lg mx-auto flex items-center justify-between gap-2">
        {/* Brand & Section Label */}
        <div className="flex items-center gap-2.5 min-w-0">
          <StandHunterLogo size={36} animated={true} />
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-[18px] text-[#e5defe] font-bold tracking-tight truncate leading-none">
              StandHunter
            </span>
            <span className="font-label-code text-[11px] text-[#00eefc] tracking-widest uppercase opacity-85 mt-0.5 truncate font-medium">
              {tabTitles[activeTab]}
            </span>
          </div>
        </div>

        {/* Live HUD Status & User Profile Trigger */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            title={`Latencia de nodo: ${latencyMs}ms`}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0e0b21]/90 text-[#00eefc] border border-[#00eefc]/30 shadow-[0_0_8px_rgba(0,238,252,0.15)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#00eefc] animate-pulse shadow-[0_0_6px_#00eefc]" />
            <span className="font-label-code text-[10px] tracking-widest uppercase font-semibold">
              HUD ACTIVO
            </span>
          </div>

          <button
            onClick={onOpenProfile}
            type="button"
            aria-label="Perfil de agente"
            className="w-8 h-8 rounded-full bg-[#c7c0f8] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(199,192,248,0.35)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[#2f2a58] text-[18px]">
              person
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
