import { useState } from 'react';

/**
 * @param {{ onDismiss: () => void, onCameraGranted: () => void, onAdminAccess: () => void }} props
 */
export const OnboardingScreen = ({ onDismiss, onCameraGranted, onAdminAccess }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cameraConnecting, setCameraConnecting] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const isLastSlide = currentSlide === 2;
  const goNext = () => setCurrentSlide((s) => Math.min(s + 1, 2));

  const requestCamera = async () => {
    setCameraConnecting(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }
      setCameraConnected(true);
      setTimeout(() => {
        onCameraGranted();
      }, 700);
    } catch {
      setCameraConnected(true);
      setTimeout(() => {
        onCameraGranted();
      }, 600);
    } finally {
      setCameraConnecting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pb-20 overflow-x-hidden relative select-none pt-4 min-h-[85vh]">
      {/* Dynamic Neon Ambient Aura */}
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#00eefc]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-16 w-72 h-72 bg-[#ff027f]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Micro-Telemetries */}
      <div className="flex items-center justify-between pt-2 pb-3">
        <div className="flex items-center space-x-2 bg-[#1c192f]/80 border border-[#00eefc]/20 backdrop-blur-md px-3 py-1 rounded-full">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00eefc] animate-pulse" />
          <span className="font-label-code text-[11px] text-[#d3fbff] tracking-widest uppercase font-semibold">
            HUD://v2.4 ONLINE
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="font-label-lg text-[14px] text-[#c9c5d0] hover:text-[#e5defe] transition-colors py-1 px-3 cursor-pointer"
        >
          Omitir
        </button>
      </div>

      {/* Main Carousel Container */}
      <div className="relative w-full overflow-hidden my-2">
        <div
          className="flex transition-transform duration-500 ease-out w-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* Slide 0: Environment Sync */}
          <div className="w-full flex-shrink-0 flex flex-col items-center">
            <div className="w-full h-[360px] relative rounded-xl overflow-hidden bg-[#0e0b21] border border-[#00eefc]/20 flex items-center justify-center p-4">
              <img
                className="absolute inset-0 w-full h-full object-cover opacity-35"
                alt="Stand holográfico en convención tech"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRzWKtT2RKfedzlp1ThYAIu0D9za1cHEjTBjGU1BSbhWCzDjZdf8bk_4QRt1-8nb599P1709Ke3iBw-qsUrQoWIQlLBhu1xy6YfUhmlLVntqwKJH7o1YhGJdtq01y0MFEezQFpZHuCC9GV87TP6rcnptZaWxZ0fcyQ6iedEDi5yJpWELNHGyUPR6yKJpQDkDLK27p6uhdy0V_TLe_yMPLSf1iM9cILPN80HgYOC6evB4SZpoOr0H6h"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b21] via-[#0e0b21]/60 to-transparent" />
              <div className="relative z-10 flex flex-col items-center text-center p-4">
                <div className="w-20 h-20 rounded-full bg-[#2a273e]/80 border border-[#00eefc]/40 flex items-center justify-center mb-4 shadow-lg shadow-[#00eefc]/20">
                  <span className="material-symbols-outlined text-[#7df4ff] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    radar
                  </span>
                </div>
                <div className="inline-block bg-[#1a1442]/90 border border-[#c7c0f8]/30 px-3 py-1 rounded-full mb-2">
                  <p className="font-label-code text-[11px] text-[#c7c0f8] uppercase tracking-wider font-semibold">
                    Protocolo de Detección
                  </p>
                </div>
                <p className="font-headline-sm text-[18px] text-[#e5defe] font-bold">
                  Sincronización de Entorno
                </p>
                <p className="font-body-sm text-[13px] text-[#c9c5d0] mt-1 max-w-xs leading-relaxed">
                  Localiza balizas sensoriales y marcadores ópticos distribuidos físicamente en el pabellón.
                </p>
              </div>
            </div>
          </div>

          {/* Slide 1: Active Target AR Viewport */}
          <div className="w-full flex-shrink-0 flex flex-col items-center">
            <div className="w-full h-[380px] relative rounded-xl overflow-hidden bg-[#0e0b21] border border-[#00eefc]/30 flex flex-col justify-between p-4 shadow-2xl">
              <img
                className="absolute inset-0 w-full h-full object-cover opacity-45 mix-blend-screen"
                alt="Perspectiva de escaneo AR cyberpunk"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxkbGPVeGBQE0VDuzlZaFzZwxoIbJFefbuMGxYTScpBdxWDLbFrg6kOwlbytnCkfyPHy9zdp6LxaRQzXug66gZsUxAbKNlVhIVqVPeMDiM8-o7T54Etq1LNvUQ2PsTpRPPE_znhbC0GwRRak0d9_5No-tt7UunSZn4xMpF_KI_gZdIGcPN1VZRdKzVGM6lt4zR00r63PjLYVPVm3RcZeEtDL-qQ0Kjh_Dpx3gD_dyTa2MPTiPyJzTW"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0e0b21]/80 via-transparent to-[#0e0b21]" />

              {/* Card Top Bar */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 bg-[#0e0b21]/80 px-2.5 py-1 rounded-full border border-[#00eefc]/30">
                  <span className="material-symbols-outlined text-[#00eefc] text-[16px] animate-spin" style={{ animationDuration: '6s' }}>
                    data_object
                  </span>
                  <span className="font-label-code text-[11px] text-[#d3fbff] tracking-wider font-semibold">
                    AI_NODE_09 [ACTIVO]
                  </span>
                </div>
                <span className="font-label-code text-[11px] text-[#ffb1c4] font-semibold tracking-widest bg-[#3e001a]/70 border border-[#ff027f]/40 px-2 py-0.5 rounded">
                  FPS: 60.0
                </span>
              </div>

              {/* Central Viewfinder */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 rounded-xl flex items-center justify-center bg-[#2a273e]/20 backdrop-blur-sm border border-[#00eefc]/20">
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00eefc] rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00eefc] rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00eefc] rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00eefc] rounded-br" />

                  {/* Moving Laser Scan Bar */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#00eefc] to-transparent shadow-[0_0_12px_#00eefc] animate-pulse" />

                  {/* Optical Core */}
                  <div className="w-24 h-24 rounded-full bg-[#00eefc]/10 flex items-center justify-center animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-20 h-20 rounded-full bg-[#35324a]/80 border border-[#00eefc]/40 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,238,252,0.4)]">
                    <span className="material-symbols-outlined text-[#7df4ff] text-3xl">
                      photo_camera
                    </span>
                    <span className="font-label-code text-[10px] text-[#00eefc] font-bold mt-0.5">
                      AR OPTIC
                    </span>
                  </div>
                </div>

                {/* Analysis Tag */}
                <div className="mt-3 flex items-center space-x-1.5 bg-[#201d33]/90 border border-[#00eefc]/30 px-3 py-1 rounded-full shadow-md">
                  <span className="material-symbols-outlined text-[#ff027f] text-[16px]">
                    filter_center_focus
                  </span>
                  <span className="font-label-code text-[11px] text-[#e5defe]">
                    Vectores físicos listos para decodificación
                  </span>
                </div>
              </div>

              {/* Card Bottom Diagnostic Feed */}
              <div className="relative z-10 flex items-center justify-between text-[#c9c5d0] font-label-code text-[10px]">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00eefc]" />
                  <span>FOV: 84° ULTRA-WIDE</span>
                </span>
                <span className="text-[#c7c0f8] font-bold">STAND_HUNTER_XR_CORE</span>
              </div>
            </div>
          </div>

          {/* Slide 2: Challenges & Rewards */}
          <div className="w-full flex-shrink-0 flex flex-col items-center">
            <div className="w-full h-[360px] relative rounded-xl overflow-hidden bg-[#0e0b21] border border-[#ff027f]/30 flex items-center justify-center p-4">
              <img
                className="absolute inset-0 w-full h-full object-cover opacity-35"
                alt="Trofeos holográficos y premios"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmWJP8mCoY5D52iiqzk36_7JsJnM-P3yTioKlX94YiD007V14xruly6gjUeCiHtHx9zjBQ0oArSNPP-R8zgr1Nv70rMWaOFgxauIBKcnUxeUJ9i_U5OPNUifDBhc0eAi0ahfT3DbK5mLqO0Bd56KeCCMhY3kssfpBJfaCJ1F1ZuUTtszNSIjJLmNKIedZN9z1ki19iPQ_7HGk0QiwtovKgTx2A2sKDPC5IfO5fMqVHccgg7axomczn"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b21] via-[#0e0b21]/60 to-transparent" />
              <div className="relative z-10 flex flex-col items-center text-center p-4">
                <div className="w-20 h-20 rounded-full bg-[#2a273e]/80 border border-[#ff027f]/50 flex items-center justify-center mb-4 shadow-lg shadow-[#ff027f]/30">
                  <span className="material-symbols-outlined text-[#ffb1c4] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    military_tech
                  </span>
                </div>
                <div className="inline-block bg-[#201d33] border border-[#ff027f]/30 px-3 py-1 rounded-full mb-2">
                  <p className="font-label-code text-[11px] text-[#ffb1c4] uppercase tracking-wider font-semibold">
                    Recompensas Inmediatas
                  </p>
                </div>
                <p className="font-headline-sm text-[18px] text-[#e5defe] font-bold">
                  Desbloquea Recompensas
                </p>
                <p className="font-body-sm text-[13px] text-[#c9c5d0] mt-1 max-w-xs leading-relaxed">
                  Canjea insignias digitales exclusivas y botín físico directo en el mostrador del stand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Texts */}
      <div className="flex flex-col text-center mt-3 px-2">
        <h1 className="font-headline-lg text-[24px] font-bold text-[#00eefc] tracking-tight leading-snug">
          Explora el Stand en Realidad Aumentada
        </h1>
        <p className="font-body-lg text-[15px] text-[#e5defe] mt-2 max-w-md mx-auto leading-relaxed">
          Apunta con tu cámara a los elementos físicos del stand para revelar misterios ocultos y desbloquear desafíos con Inteligencia Artificial.
        </p>
      </div>

      {/* Pagination Indicators */}
      <div aria-label="Progreso de introducción" className="flex items-center justify-center space-x-2 my-5">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Diapositiva ${idx + 1}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${currentSlide === idx
              ? 'w-8 h-2.5 bg-[#ff027f] shadow-[0_0_12px_#ff027f]'
              : 'w-2.5 h-2.5 bg-[#00eefc]/40 hover:bg-[#00eefc]/70'
              }`}
          />
        ))}
      </div>


      {/* Interactive Controls Area */}
      {!isLastSlide ? (
        <div className="flex flex-col space-y-3 w-full max-w-sm mx-auto">
          <button
            onClick={goNext}
            className="w-full h-14 bg-[#00eefc] hover:bg-[#00eefc]/90 active:scale-[0.98] text-[#002022] font-headline-sm text-[17px] font-bold tracking-wide rounded-xl shadow-[0_0_16px_rgba(0,238,252,0.4)] flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>Siguiente</span>
            <span className="material-symbols-outlined text-2xl">arrow_forward</span>
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-3 w-full max-w-sm mx-auto">
            <button
              onClick={requestCamera}
              disabled={cameraConnecting}
              className="w-full h-14 bg-[#ff027f] hover:bg-[#ff027f]/90 active:scale-[0.98] text-[#e5defe] font-headline-sm text-[17px] font-bold tracking-wide rounded-xl shadow-[0_0_24px_rgba(255,2,127,0.55)] flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">
                {cameraConnected ? 'check_circle' : 'center_focus_strong'}
              </span>
              <span>
                {cameraConnecting
                  ? 'Conectando sensor...'
                  : cameraConnected
                    ? 'Cámara Conectada'
                    : 'Conceder acceso a Cámara'}
              </span>
            </button>

            <button
              onClick={onDismiss}
              className="w-full py-2 font-label-lg text-[14px] text-[#e5defe] hover:text-[#00eefc] transition-colors text-center cursor-pointer"
            >
              Decidir luego
            </button>
          </div>

          {/* Accessibility & Security Badge Banner*/}
          <div className="mt-5 w-full max-w-md mx-auto">
            <button
              onClick={onAdminAccess}
              className="w-full bg-[#1c192f]/90 border border-[#00eefc]/25 hover:border-[#00eefc]/60 rounded-lg p-3 flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#00eefc] text-[20px] group-hover:scale-110 transition-transform">
                admin_panel_settings
              </span>
              <span className="font-label-code text-[12px] text-[#e5defe] tracking-wider uppercase font-semibold">
                Ingresar como administrador
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
