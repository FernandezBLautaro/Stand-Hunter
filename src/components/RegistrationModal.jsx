import { useState } from 'react';
import { registerParticipant } from '../services/firestoreService.js';

const randomAliases = [
  'CyberHunter_99',
  'Nexus_Phantom',
  'Neo_Specter',
  'Quantum_Rider',
  'Echo_Scout',
  'Aura_Coder',
  'Valkyrie_Zero',
  'Vortex_Agent',
];

/**
 * @param {{
 *   profile: import('../types.js').ParticipantProfile,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSaveProfile: (profile: import('../types.js').ParticipantProfile) => void,
 * }} props
 */
export const RegistrationModal = ({ profile, isOpen, onClose, onSaveProfile }) => {
  const [nickname, setNickname] = useState(profile.nickname || 'Lautaro_Agent');
  const [email, setEmail] = useState(profile.email || 'lautarofernandezb14@gmail.com');
  const [specialty, setSpecialty] = useState(profile.specialty || 'cazador');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleRandomize = () => {
    const pick = randomAliases[Math.floor(Math.random() * randomAliases.length)];
    setNickname(pick);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMsg('Por favor ingresa un nombre o alias táctico.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const result = await registerParticipant({
        nickname: nickname.trim(),
        email: email.trim(),
        specialty,
      });

      onSaveProfile({
        id: result.id || profile.id,
        nickname: nickname.trim(),
        email: email.trim(),
        specialty,
        registered: true,
        score: profile.score || 1450,
      });

      onClose();
    } catch {
      // Fallback offline
      onSaveProfile({
        ...profile,
        nickname: nickname.trim(),
        email: email.trim(),
        specialty,
        registered: true,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0e0b21]/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#131027] border border-[#00eefc]/30 p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden my-6">
        {/* Glow acccents */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#00eefc]/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-[#ff027f]/15 blur-2xl pointer-events-none" />

        {/* Top Header Telemetry */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-1.5 bg-[#0e0b21] px-2.5 py-1 rounded-full border border-[#00eefc]/20">
            <span className="w-2 h-2 rounded-full bg-[#00eefc] animate-pulse" />
            <span className="font-label-code text-[10px] text-[#7df4ff] tracking-wider uppercase font-semibold">
              NODO REGISTRO PWA // ID_EXP-2025
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[#00eefc] font-label-code text-[10px] bg-[#0e0b21] px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-[14px]">sensors</span>
            <span className="font-bold">STAND SYNC: LIVE</span>
          </div>
        </div>

        {/* Hero Title Section */}
        <div className="flex items-center gap-3 my-4">
          <div className="w-14 h-14 rounded-xl bg-[#1a1442] border border-[#00eefc]/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(0,238,252,0.25)]">
            <span className="material-symbols-outlined text-3xl text-[#00eefc]">
              shield_person
            </span>
          </div>
          <div>
            <span className="font-label-code text-[11px] text-[#ffb1c4] uppercase font-bold tracking-wider">
              FASE 2B • PERFIL TEMPORAL PWA
            </span>
            <h2 className="font-headline-md text-[22px] font-bold text-[#e5defe] leading-tight">
              Identificación de <span className="text-[#00eefc]">Participante</span>
            </h2>
          </div>
        </div>

        <p className="font-body-sm text-[13px] text-[#c9c5d0] mb-4 leading-relaxed">
          Ingresa tu alias táctico para sincronizar tu puntuación en tiempo real con el marcador global del stand y resguardar tu progreso sin descargas de tienda.
        </p>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-[#93000a]/60 border border-[#ffb4ab]/40 text-[#ffdad6] text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-label-code text-[11px] text-[#00eefc] uppercase font-semibold tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">badge</span>
                NOMBRE O NICKNAME *
              </label>
              <span className="font-label-code text-[10px] text-[#ffb1c4] font-bold">
                OBLIGATORIO
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#c9c5d0] material-symbols-outlined text-[18px]">
                alternate_email
              </span>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej. CyberHunter_99 o Lautaro"
                className="w-full h-12 bg-[#0e0b21] border border-[#00eefc]/30 rounded-xl pl-10 pr-3 text-[#e5defe] placeholder-[#c9c5d0]/50 font-body-md text-[14px] focus:outline-none focus:border-[#00eefc] focus:ring-1 focus:ring-[#00eefc] transition-all"
              />
            </div>
            <p className="font-label-code text-[10px] text-[#c9c5d0]/70 mt-1">
              Visible en los tótems LED interactivos del stand y en el leaderboard.
            </p>
          </div>

          {/* Email Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-label-code text-[11px] text-[#c9c5d0] uppercase font-semibold tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                EMAIL CORPORATIVO O PERSONAL
              </label>
              <span className="font-label-code text-[10px] text-[#c7c0f8]">
                (OPCIONAL) LOOT REWARDS
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#c9c5d0] material-symbols-outlined text-[18px]">
                drafts
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                className="w-full h-12 bg-[#0e0b21] border border-white/10 rounded-xl pl-10 pr-3 text-[#e5defe] placeholder-[#c9c5d0]/50 font-body-md text-[14px] focus:outline-none focus:border-[#00eefc] transition-all"
              />
            </div>
            <p className="font-label-code text-[10px] text-[#c9c5d0]/70 mt-1">
              Para despacharte el certificado digital conmemorativo y fotografías AR.
            </p>
          </div>

          {/* Tactical Specialty Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-code text-[11px] text-[#00eefc] uppercase font-semibold tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                ESPECIALIDAD TÁCTICA INICIAL
              </span>
              <span className="font-label-code text-[10px] text-[#00eefc] font-bold">
                BONUS XP +50
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cazador', label: 'CAZADOR', sub: 'Rastreo QR', icon: 'my_location' },
                { id: 'cripto', label: 'CRIPTO', sub: 'Trivia Booth', icon: 'terminal' },
                { id: 'explorador', label: 'EXPLORADOR', sub: 'Mapa Libre', icon: 'explore' },
              ].map((item) => {
                const isSelected = specialty === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSpecialty(item.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a1442] border-[#00eefc] text-[#00eefc] shadow-[0_0_14px_rgba(0,238,252,0.3)] font-bold'
                        : 'bg-[#0e0b21]/70 border-white/10 text-[#c9c5d0] hover:border-white/25'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="font-label-code text-[10px] tracking-wider uppercase font-bold leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-[#c9c5d0]/70 leading-none">{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Local Session Protected Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c192f] border border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00eefc] text-[18px]">
                save
              </span>
              <div className="flex flex-col">
                <span className="font-label-code text-[10px] text-[#e5defe] font-bold">
                  SESIÓN LOCAL RESGUARDADA
                </span>
                <span className="text-[10px] text-[#c9c5d0]/80">
                  LocalStorage + IndexedDB activo • Sin descargas
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#00eefc] text-[16px]">cloud_done</span>
          </div>

          {/* Participant Card Preview */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0e0b21] border border-[#00eefc]/25">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#2a273e] border border-[#ff027f]/40 flex items-center justify-center text-[#ffb1c4]">
                <span className="material-symbols-outlined text-[22px]">smart_toy</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-code text-[9px] text-[#00eefc] uppercase font-bold tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00eefc]" />
                  {specialty.toUpperCase()} TÁCTICO
                </span>
                <span className="font-headline-sm text-[14px] text-[#e5defe] font-bold truncate max-w-[170px]">
                  {nickname || 'Operativo_Nuevo'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-label-code text-[9px] text-[#c9c5d0]">STATUS</span>
              <span className="font-label-code text-[11px] text-[#00FF88] font-bold">LISTO</span>
            </div>
          </div>

          {/* Main Action Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-13 rounded-xl bg-[#ff027f] hover:bg-[#ff027f]/90 text-white font-headline-sm text-[15px] font-bold tracking-wide uppercase flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,2,127,0.55)] active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            <span>{submitting ? 'Sincronizando Perfil...' : 'INGRESAR AL DESAFÍO'}</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>

          {/* Random Alias Trigger */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRandomize}
              className="text-[#00eefc] font-label-code text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">shuffle</span>
              <span>Generar Alias Aleatorio y Entrar Rápido</span>
            </button>
          </div>
        </form>

        {/* Security Footer Note */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-1 text-[#c9c5d0]/70 font-label-code text-[10px]">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            <span>CONEXIÓN CIFRADA SSL/TLS • BASE DE DATOS CENTRALIZADA [USUARIO]</span>
          </div>
          <span className="font-label-code text-[9px] text-[#c9c5d0]/50 uppercase tracking-wider">
            STANDHUNTER EVENT SUITE V1.2 • PRIVACIDAD DE DATOS PROTEGIDA
          </span>
        </div>
      </div>
    </div>
  );
};
