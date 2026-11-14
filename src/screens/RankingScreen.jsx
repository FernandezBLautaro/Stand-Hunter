import { useEffect, useState } from 'react';
import { subscribeRanking, resetRanking } from '../services/challengeService.js';

const TOP = 20;
const fmt = (ms) => (ms == null ? '—' : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`);

/**
 * GAM05 — Ranking global en tiempo real. Tu fila se resalta aunque quedes fuera del top.
 * @param {{ participant: import('../types.js').ParticipantProfile }} props
 */
export const RankingScreen = ({ participant, isAdmin = false }) => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [resetErr, setResetErr] = useState(false);

  const reset = async () => {
    if (!confirm) return setConfirm(true);
    setResetErr(false);
    try { await resetRanking(); } catch { setResetErr(true); }
    setConfirm(false);
  };

  useEffect(() => subscribeRanking(setRows, () => setError(true)), []);

  const mine = rows.findIndex((r) => r.usuarioId === participant.id);
  const visibles = rows.slice(0, TOP).map((r, i) => ({ ...r, pos: i + 1 }));
  if (mine >= TOP) visibles.push({ ...rows[mine], pos: mine + 1 });

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24 gap-3">
      {isAdmin && (
        <button type="button" onClick={reset}
          className={`h-11 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${confirm ? 'border-[#ff027f] text-[#ff027f] font-bold' : 'border-white/15 text-[#ffb1c4]'}`}>
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          {confirm ? 'Tocá de nuevo: se borrará todo el ranking' : 'Reiniciar ranking'}
        </button>
      )}
      {resetErr && <p className="text-[13px] text-[#ffb1c4]">No se pudo reiniciar el ranking. Reintentá.</p>}
      {error && <p className="text-[13px] text-[#ffb1c4]">No te pudimos encontrar en el ranking.</p>}
      {!error && rows.length === 0 && <p className="text-center text-[13px] text-[#c9c5d0] py-10">Todavía no hay participantes.</p>}

      <ol className="flex flex-col gap-2">
        {visibles.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              r.usuarioId === participant.id ? 'border-[#00eefc] bg-[#1a1442]' : 'border-white/10 bg-[#1c192f]'
            }`}
          >
            <span className="w-7 text-center font-bold text-[#00eefc]">{r.pos}</span>
            <span className="flex-1 truncate text-[14px] text-[#e5defe]">{r.usuarioNickname}
              {r.usuarioId === participant.id && <span className="sr-only"> (vos)</span>}
            </span>
            <span className="text-[11px] text-[#c9c5d0]">{r.completadas} exp · {fmt(r.tiempoTotalMs)}</span>
            <span className="font-bold text-[#7df4ff]">{r.puntaje} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
};