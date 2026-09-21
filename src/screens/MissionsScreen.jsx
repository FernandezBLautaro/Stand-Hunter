import { useState } from 'react';
import { DIFICULTAD_LABEL } from '../services/firestoreService.js';

// Estilo visual por dificultad (única variación entre tarjetas).
const ESTILO = {
  facil: {
    card: 'border-[#00eefc]/30',
    badge: 'bg-[#0e0b21] text-[#00eefc] border border-[#00eefc]/30',
    puntos: 'text-[#7df4ff]',
    icono: 'stars',
    boton: 'bg-[#00eefc] hover:bg-[#00eefc]/90 text-[#002022] shadow-[0_0_16px_rgba(0,238,252,0.4)]',
  },
  media: {
    card: 'border-[#ff027f]/50 shadow-[0_0_24px_rgba(255,2,127,0.15)]',
    badge: 'bg-[#1a1442] text-[#ff027f] border border-[#ff027f]/40',
    puntos: 'text-[#00eefc]',
    icono: 'bolt',
    boton: 'bg-[#ff027f] hover:bg-[#ff027f]/90 text-white shadow-[0_0_20px_rgba(255,2,127,0.55)]',
  },
  dificil: {
    card: 'border-[#ffb1c4]/30',
    badge: 'bg-[#3e001a] text-[#ffb1c4] border border-[#ff027f]/30',
    puntos: 'text-[#ffb1c4]',
    icono: 'military_tech',
    boton: 'bg-[#2a273e] text-[#e5defe] hover:text-white border border-[#ff027f]/30',
  },
};

const FILTROS = [
  { id: 'todas', label: 'Todas', icono: null },
  { id: 'facil', label: 'Fácil', icono: 'signal_cellular_1_bar' },
  { id: 'media', label: 'Media', icono: 'signal_cellular_3_bar' },
  { id: 'dificil', label: 'Difícil', icono: 'signal_cellular_4_bar' },
  { id: 'corta', label: '≤ 10 min', icono: 'timer' },
];

const coincide = (filtro, exp) => {
  if (filtro === 'todas') return true;
  if (filtro === 'corta') return exp.duracion <= 10;
  return exp.dificultad === filtro;
};

/**
 * @param {{
 *   missions: import('../types.js').Experience[],
 *   participant: import('../types.js').ParticipantProfile,
 *   onStartMission: (mission: import('../types.js').Experience) => void,
 *   isLoading?: boolean,
 * }} props
 */
export const MissionsScreen = ({ missions, participant, onStartMission, isLoading = false }) => {
  const [filtro, setFiltro] = useState('todas');

  const visibles = missions.filter((m) => coincide(filtro, m));

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-24 relative select-none">
      {/* Pase del participante */}
      <div className="flex items-center justify-between py-2 text-[#c9c5d0] font-label-code text-[11px] border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00eefc] shadow-[0_0_6px_#00eefc]" />
          <span>PASE: #{participant.id}</span>
        </div>
        <div className="flex items-center gap-1 bg-[#1c192f] px-2.5 py-0.5 rounded-full border border-white/10 text-[#c7c0f8]">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          <span className="font-semibold uppercase tracking-wider">{participant.nickname}</span>
        </div>
      </div>

      {/* Título */}
      <div className="flex items-center gap-2.5 mt-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#201d33] border border-[#00eefc]/30 flex items-center justify-center text-[#00eefc]">
          <span className="material-symbols-outlined text-[20px]">radar</span>
        </div>
        <div>
          <h1 className="font-headline-md text-[20px] font-bold text-[#e5defe] leading-tight">
            Misiones disponibles
          </h1>
          <p className="font-label-code text-[10px] text-[#00eefc] tracking-widest uppercase font-semibold">
            {isLoading ? 'Sincronizando…' : `${visibles.length} de ${missions.length} activas`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full font-label-md text-[12px] tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer ${
              filtro === f.id
                ? 'bg-[#00eefc] text-[#002022] font-bold shadow-[0_0_12px_rgba(0,238,252,0.4)]'
                : 'bg-[#1c192f] text-[#c9c5d0] hover:text-white border border-white/5'
            }`}
          >
            {f.icono && <span className="material-symbols-outlined text-[14px]">{f.icono}</span>}
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Estados vacíos */}
      {isLoading && missions.length === 0 && (
        <p className="text-center text-[13px] text-[#c9c5d0] py-10">Buscando misiones…</p>
      )}

      {!isLoading && missions.length === 0 && (
        <div className="p-5 rounded-xl bg-[#1c192f] border border-white/10 text-center space-y-2">
          <span className="material-symbols-outlined text-[32px] text-[#00eefc]">local_activity</span>
          <p className="text-[14px] text-[#e5defe]">No hay misiones activas por ahora.</p>
          <p className="text-[12px] text-[#c9c5d0]">Consultá con el staff del stand.</p>
        </div>
      )}

      {missions.length > 0 && visibles.length === 0 && (
        <p className="text-center text-[13px] text-[#c9c5d0] py-10">
          Ninguna misión coincide con este filtro.
        </p>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-4">
        {visibles.map((exp) => {
          const estilo = ESTILO[exp.dificultad] ?? ESTILO.facil;
          const cantDesafios = exp.desafios?.length ?? 0;

          return (
            <article
              key={exp.id}
              className={`rounded-2xl overflow-hidden bg-[#1c192f] border shadow-xl p-4 flex flex-col gap-3 ${estilo.card}`}
            >
              {/* Dificultad y puntos */}
              <div className="flex items-center justify-between">
                <span
                  className={`font-label-code text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${estilo.badge}`}
                >
                  {DIFICULTAD_LABEL[exp.dificultad] ?? exp.dificultad}
                </span>
                <div className={`flex items-center gap-1 font-label-code text-[13px] font-extrabold ${estilo.puntos}`}>
                  <span className="material-symbols-outlined text-[16px]">{estilo.icono}</span>
                  <span>+{exp.puntos.toLocaleString()} pts</span>
                </div>
              </div>

              {/* Imagen y locación */}
              <div className="relative w-full h-36 rounded-xl overflow-hidden bg-[#0e0b21] border border-white/10">
                {exp.imagenUrl ? (
                  <img src={exp.imagenUrl} alt={exp.nombre} className="w-full h-full object-cover brightness-90" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#00eefc]/40">
                    <span className="material-symbols-outlined text-[48px]">blur_on</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b21] via-transparent to-transparent" />
                {exp.locacion && (
                  <span className="absolute bottom-2 left-2 max-w-[90%] truncate font-label-code text-[10px] text-[#e5defe] bg-[#0e0b21]/80 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                    {exp.locacion}
                  </span>
                )}
              </div>

              {/* Nombre y descripción */}
              <div>
                <h3 className="font-headline-sm text-[17px] font-bold text-[#e5defe] leading-snug">{exp.nombre}</h3>
                {exp.descripcion && (
                  <p className="font-body-sm text-[13px] text-[#c9c5d0] mt-1 line-clamp-2 leading-relaxed">
                    {exp.descripcion}
                  </p>
                )}
              </div>

              {/* Duración y desafíos */}
              <div className="flex items-center gap-4 text-[#c9c5d0] font-label-code text-[11px] pt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  {exp.duracion} min
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">assignment</span>
                  {cantDesafios} {cantDesafios === 1 ? 'desafío' : 'desafíos'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onStartMission(exp)}
                className={`w-full h-12 rounded-xl font-headline-sm text-[14px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer ${estilo.boton}`}
              >
                <span>Iniciar desafío</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
};
