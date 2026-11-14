import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  getUltimaCompletada, countPistas, getOrCreateCanje, getCanjesPendientes, getVigenciaDias,
  vencimientoMs, estaVencido, WIN_PREFIX,
} from '../services/recompensasService.js';

const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const fecha = (ms) => new Date(ms).toLocaleDateString('es-AR');

/** Tarjeta del premio con su QR de canje (sin QR si el canje venció). */
const PremioCard = ({ canje, dias }) => {
  const [qr, setQr] = useState('');
  const vencido = estaVencido(canje, dias);
  const hecho = canje.estadoEntrega !== 'pendiente';
  const vence = vencimientoMs(canje, dias);

  useEffect(() => {
    if (vencido) return;
    QRCode.toDataURL(WIN_PREFIX + canje.participacionId, { width: 640, margin: 2, errorCorrectionLevel: 'M' }).then(setQr);
  }, [canje.participacionId, vencido]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a1442] to-[#3e001a] border border-[#ff027f]/40 p-5 flex flex-col items-center gap-3">
      <p className="font-label-code text-[11px] text-[#ffb1c4] uppercase tracking-wider">Tu premio</p>
      <p className="text-[17px] font-bold text-[#e5defe]">{canje.recompensaNombre}</p>
      {!vencido && (
        <div className="w-56 max-w-full aspect-square bg-white rounded-xl p-2 flex items-center justify-center">
          {qr ? <img src={qr} alt="Código QR de canje" className="w-full h-full" /> : <span className="material-symbols-outlined text-[#131027] animate-spin">sync</span>}
        </div>
      )}
      <p className={`text-[12px] ${hecho || vencido ? 'text-[#ffb1c4]' : 'text-[#c9c5d0]'}`}>
        {hecho
          ? 'Canje realizado.'
          : vencido
            ? `Canje vencido el ${fecha(vence)}.`
            : `Mostrá este código al staff para retirar tu premio.${vence ? ` Vence el ${fecha(vence)}.` : ''}`}
      </p>
    </div>
  );
};

/**
 * GAM02 — Resultados y recompensa. Lee la última participación completada (sirve también tras recargar)
 * y muestra su QR de canje; no hay QR si la partida fue abandonada/expirada o no hay premio.
 * También lista los canjes pendientes del usuario (los que vencen según la vigencia fijada por el admin).
 * @param {{ participant: import('../types.js').ParticipantProfile, onBack: () => void }} props
 */
export const RecompensasScreen = ({ participant, onBack }) => {
  const [st, setSt] = useState({ loading: true });
  const [dias, setDias] = useState(0);
  const [pend, setPend] = useState(null); // null = vista normal; array = lista de pendientes
  const [sel, setSel] = useState(null);
  const [pendErr, setPendErr] = useState(false);

  useEffect(() => {
    getVigenciaDias().then(setDias).catch(() => { });
  }, []);

  useEffect(() => {
    if (!participant.registered) {
      setSt({ loading: false });
      return undefined;
    }
    let off = false;
    (async () => {
      try {
        const p = await getUltimaCompletada(participant.id);
        if (!p) return !off && setSt({ loading: false });
        const [pistas, premio] = await Promise.all([countPistas(p.id), getOrCreateCanje(p)]);
        if (!off) setSt({ loading: false, p, pistas, ...premio });
      } catch {
        if (!off) setSt({ loading: false, error: true });
      }
    })();
    return () => { off = true; };
  }, [participant.id, participant.registered]);

  const abrirPendientes = async () => {
    setPendErr(false);
    try { setPend(await getCanjesPendientes(participant.id)); }
    catch { setPendErr(true); }
  };

  const botonPendientes = participant.registered && (
    <button type="button" onClick={abrirPendientes} className="h-12 rounded-xl border border-[#00eefc]/40 text-[#7df4ff] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
      <span className="material-symbols-outlined text-[18px]">pending_actions</span>
      Mis canjes pendientes
    </button>
  );

  if (pend) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-24 gap-3 text-center">
        <h1 className="font-headline-md text-[22px] font-bold text-[#e5defe]">Canjes pendientes</h1>
        {sel ? <PremioCard canje={sel} dias={dias} /> : pend.length === 0 && <p className="text-[13px] text-[#c9c5d0] py-6">No tenés canjes pendientes.</p>}
        {!sel && pend.map((c) => {
          const v = vencimientoMs(c, dias);
          const vencido = estaVencido(c, dias);
          return (
            <button key={c.participacionId} type="button" onClick={() => setSel(c)}
              className="text-left rounded-xl bg-[#1c192f] border border-white/10 p-3 cursor-pointer">
              <p className="text-[14px] font-semibold text-[#e5defe]">{c.recompensaNombre}</p>
              <p className={`text-[12px] ${vencido ? 'text-[#ffb1c4]' : 'text-[#c9c5d0]'}`}>
                {vencido ? `Vencido el ${fecha(v)}` : v ? `Vence el ${fecha(v)}` : 'Sin vencimiento'}
              </p>
            </button>
          );
        })}
        <button type="button" onClick={() => (sel ? setSel(null) : setPend(null))}
          className="h-12 rounded-xl border border-white/15 text-[#e5defe] text-[13px] font-semibold cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  if (st.loading) return <p className="text-center text-[13px] text-[#c9c5d0] pt-24">Cargando resultados…</p>;

  if (st.error || !st.p) {
    return (
      <div className="flex flex-col items-center text-center w-full max-w-md mx-auto px-4 pt-24 gap-3">
        <span className="material-symbols-outlined text-[40px] text-[#00eefc]">military_tech</span>
        <p className="text-[14px] text-[#e5defe]">
          {st.error
            ? 'No pudimos cargar tus resultados. Reintentá en unos segundos.'
            : participant.registered
              ? 'Todavía no completaste ninguna experiencia.'
              : 'Creá una cuenta y completá una experiencia para ganar premios.'}
        </p>
        {pendErr && <p className="text-[12px] text-[#ffb1c4]">No pudimos cargar tus canjes pendientes.</p>}
        <div className="flex flex-col gap-2 w-full">
          {botonPendientes}
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer">
            Ver experiencias
          </button>
        </div>
      </div>
    );
  }

  const { p, pistas, canje } = st;
  const stats = [
    ['Tiempo total', fmt(p.tiempoTotalMs ?? 0)],
    ['Tiempo límite', p.duracionMin ? `${p.duracionMin}:00` : '—'],
    ['Pistas usadas', pistas],
    ['Puntos netos', p.puntajeFinal ?? 0],
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-24 gap-4 text-center">
      <h1 className="font-headline-md text-[24px] font-bold text-[#e5defe]">¡Desafío Completado con Éxito!</h1>
      <p className="text-[13px] text-[#c9c5d0]">{p.experienciaNombre}</p>

      <div className="grid grid-cols-2 gap-2">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[#1c192f] border border-[#00eefc]/25 p-3">
            <p className="text-[18px] font-bold text-[#7df4ff]">{v}</p>
            <p className="text-[11px] text-[#c9c5d0]">{k}</p>
          </div>
        ))}
      </div>

      {canje ? (
        <PremioCard canje={canje} dias={dias} />
      ) : (
        <div className="rounded-xl bg-[#1c192f] border border-white/10 p-4 text-[13px] text-[#c9c5d0]">
          No hay un premio disponible para esta experiencia (sin stock, oculto o puntos insuficientes). Consultá con el staff.
        </div>
      )}

      {pendErr && <p className="text-[12px] text-[#ffb1c4]">No pudimos cargar tus canjes pendientes.</p>}
      {botonPendientes}
      <button type="button" onClick={onBack} className="h-12 rounded-xl border border-white/15 text-[#e5defe] text-[13px] font-semibold cursor-pointer">
        Volver al inicio
      </button>
    </div>
  );
};
