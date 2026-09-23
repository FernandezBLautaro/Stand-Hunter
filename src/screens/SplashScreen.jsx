import { useEffect, useState } from 'react';
import { StandHunterLogo } from '../components/StandHunterLogo';
/**
 * @param {{ onComplete: () => void }} props
 */
export const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(65);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      aria-label="Pantalla de inicialización de StandHunter"
      className="fixed inset-0 z-50 flex flex-col w-full bg-[#131027] text-[#e5defe] overflow-hidden py-10 px-4 justify-between items-center select-none"
    >
      {/* Dynamic Ambient Glow Gradients */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-[#ff027f]/30 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tl from-[#ff027f]/35 via-[#1a1442]/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-[#00eefc]/10 via-[#1a1442]/40 to-transparent blur-2xl pointer-events-none" />

      {/* Top Telemetry & Spatial Context */}
      <div className="w-full max-w-sm flex items-center justify-between text-[#c9c5d0]/80 z-10 px-2 pt-safe">
        <div className="flex items-center gap-1.5 bg-[#0e0b21]/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#00eefc]/20 shadow-sm">
          <span className="material-symbols-outlined text-[#00eefc] text-[14px] animate-pulse">
            radar
          </span>
          <span className="font-label-code text-[11px] tracking-widest text-[#00eefc] font-semibold">
            HUD.SYS.ACTIVO
          </span>
        </div>
        <div className="flex items-center gap-1 bg-[#0e0b21]/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[#c9c5d0] font-label-code text-[11px] border border-[#ff027f]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00eefc] animate-ping mr-1" />
          <span>LATENCIA: 12ms</span>
        </div>
      </div>

      {/* Central Brand & Scanner Anchor */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full max-w-xs text-center">
        {/* Rotating Visor Reticle Frame with Logo */}
        <div
          aria-label="Logo animado de StandHunter, detector de desafíos interactivos"
          className="relative flex items-center justify-center mb-8"
          role="img"
        >
          {/* Outer Orbiting Ring Graphics */}
          <div className="absolute w-48 h-48 rounded-full bg-[#0e0b21]/40 backdrop-blur-sm flex items-center justify-center shadow-[0_0_40px_rgba(0,238,252,0.18)]">
            <svg
              className="w-full h-full animate-[spin_8s_linear_infinite] opacity-60"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                fill="none"
                opacity="0.65"
                r="76"
                stroke="#00eefc"
                strokeDasharray="14 10 4 10"
                strokeWidth="1.5"
              />
              <circle
                cx="80"
                cy="80"
                fill="none"
                opacity="0.5"
                r="68"
                stroke="#ff027f"
                strokeDasharray="6 14"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* Core Glowing Plate */}
          <div className="relative w-[140px] h-[140px] rounded-2xl bg-[#0e0b21]/90 backdrop-blur-md p-2 flex items-center justify-center shadow-[0_0_35px_rgba(0,238,252,0.35)] overflow-hidden border border-[#00eefc]/30">
            {/* Interior Scanner Beam Sweep */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00eefc]/20 to-transparent -translate-y-full animate-[pulse_2.2s_ease-in-out_infinite]" />
            <StandHunterLogo size={120} animated={true} />
          </div>

          {/* Corner Crosshair Micro-Accents */}
          <span className="absolute -top-1 -left-1 material-symbols-outlined text-[#00eefc] text-[18px] opacity-80">
            filter_center_focus
          </span>
          <span className="absolute -top-1 -right-1 material-symbols-outlined text-[#00eefc] text-[18px] opacity-80">
            filter_center_focus
          </span>
          <span className="absolute -bottom-1 -left-1 material-symbols-outlined text-[#ff027f] text-[18px] opacity-80">
            filter_center_focus
          </span>
          <span className="absolute -bottom-1 -right-1 material-symbols-outlined text-[#ff027f] text-[18px] opacity-80">
            filter_center_focus
          </span>
        </div>

        {/* Title and Subtitle System */}
        <h1 className="font-headline-lg text-[30px] font-bold text-[#e5defe] uppercase tracking-[0.18em] drop-shadow-[0_0_16px_rgba(199,192,248,0.35)]">
          STANDHUNTER
        </h1>
        <p className="font-label-md text-[11px] text-[#c9c5d0] uppercase tracking-[0.24em] mt-2 text-balance">
          Laboratorio de Experiencias Interactivas
        </p>

        {/* Cybernetic State Pill Badge */}
        <div className="mt-6 inline-flex items-center gap-2 bg-[#2a273e]/80 border border-[#00eefc]/30 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#00eefc] animate-pulse shadow-[0_0_8px_#00eefc]" />
          <span className="font-label-code text-[10px] text-[#7df4ff] tracking-wider uppercase font-semibold">
            V2.4 • INICIALIZANDO SENSORES &amp; IA
          </span>
        </div>
      </div>

      {/* Bottom Interactive Telemetry & Loader */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3 z-10 pb-safe">
        {/* Fast Connection Verification Note */}
        <div className="flex items-center gap-2 text-[#c9c5d0] font-body-sm text-[12px] bg-[#0e0b21]/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
          <span className="material-symbols-outlined text-[#00eefc] text-[16px]">bolt</span>
          <span>Conexión ultrarrápida con stand físico establecida (1.5s)</span>
        </div>

        {/* Indeterminate Radiant Cyan Progress Bar */}
        <div className="w-full h-1.5 bg-[#35324a]/60 rounded-full overflow-hidden relative shadow-[0_0_12px_rgba(0,238,252,0.2)]">
          <div
            className="h-full bg-[#00eefc] rounded-full shadow-[0_0_14px_#00eefc] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Diagnostic Readout Grid */}
        <div className="w-full flex justify-between items-center text-[#c9c5d0]/80 font-label-code text-[11px] px-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#ff027f]">sensors</span>
            BEACON SCAN: OK
          </span>
          <span className="text-[#7df4ff] font-bold">{progress}%</span>
          <span className="flex items-center gap-1">
            NEURAL SYNC
            <span className="material-symbols-outlined text-[14px] text-[#00eefc]">done_all</span>
          </span>
        </div>

        <button
          onClick={onComplete}
          className="mt-2 text-[#00eefc] text-[12px] font-label-code underline tracking-widest uppercase hover:text-white transition-colors cursor-pointer"
        >
          [ Entrar Directo ]
        </button>
      </div>
    </div>
  );
};
