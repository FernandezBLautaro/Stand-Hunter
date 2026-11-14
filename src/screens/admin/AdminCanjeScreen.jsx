import { useEffect, useState } from 'react';
import { AdminBottomNav } from '../../components/AdminBottomNav.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';
import { WIN_PREFIX, getCanje, realizarCanje, getVigenciaDias, setVigenciaDias, estaVencido } from '../../services/recompensasService.js';
import { describeFirestoreError } from '../../services/firestoreService.js';

/** ADM21 — Escanea el QR de victoria, valida contra Firestore y registra el canje. También fija la vigencia de los canjes. */
export default function AdminCanjeScreen({ onClose, onNavigate }) {
  const [scanning, setScanning] = useState(false);
  const [res, setRes] = useState(null); // { type: 'ok'|'done'|'error', text, id?, canje? }
  const [busy, setBusy] = useState(false);
  const [dias, setDias] = useState('');
  const [cfgMsg, setCfgMsg] = useState(null); // { text, error }

  useEffect(() => { getVigenciaDias().then((d) => setDias(String(d))).catch(() => {}); }, []);

  const guardarVigencia = async () => {
    try { await setVigenciaDias(Number(dias)); setCfgMsg({ text: 'Vigencia guardada.' }); }
    catch (e) { setCfgMsg({ text: e.code ? describeFirestoreError(e) : e.message, error: true }); }
  };

  const onDetect = async (raw) => {
    setScanning(false);
    const id = raw.startsWith(WIN_PREFIX) ? raw.slice(WIN_PREFIX.length).trim() : '';
    if (!id || id.includes('/')) return setRes({ type: 'error', text: 'Código inválido: no es un QR de victoria.' });
    try {
      const [canje, vig] = await Promise.all([getCanje(id), getVigenciaDias()]);
      if (!canje) setRes({ type: 'error', text: 'Código inválido o alterado.' });
      else if (canje.estadoEntrega !== 'pendiente') setRes({ type: 'error', text: 'Canje duplicado: este premio ya fue entregado.' });
      else if (estaVencido(canje, vig)) setRes({ type: 'error', text: 'Canje vencido: superó la vigencia definida.' });
      else setRes({ type: 'ok', id, canje });
    } catch (e) {
      setRes({ type: 'error', text: describeFirestoreError(e) });
    }
  };

  const confirmar = async () => {
    setBusy(true);
    try {
      await realizarCanje(res.id, res.canje);
      setRes({ type: 'done', text: `Canje realizado: ${res.canje.recompensaNombre}.` });
    } catch (e) {
      setRes({ type: 'error', text: e.code ? describeFirestoreError(e) : e.message });
    } finally {
      setBusy(false);
    }
  };

  const tone = res?.type === 'error' ? 'bg-[#3e001a]/95 border-[#ff027f]/60 text-[#ffdad6]' : 'bg-[#0e0b21] border-[#00eefc]/40 text-[#e5defe]';

  return (
    <div className="min-h-screen bg-[#131027] text-[#e5defe] flex flex-col">
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#0e0b21]/80 backdrop-blur-xl">
        <div className="h-16 px-4 max-w-[480px] mx-auto flex items-center justify-between">
          <div>
            <span className="font-headline-sm text-[18px] font-bold block leading-none">Canje</span>
            <span className="text-[12px] text-[#c9c5d0]">Canje de premios</span>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Volver a la app"
              className="w-11 h-11 rounded-lg bg-[#2a273e] flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full pt-24 pb-24 max-w-[480px] mx-auto px-4 flex flex-col gap-4">
        <div className="rounded-xl bg-[#1c192f] border border-[#00eefc]/25 p-3 flex flex-col gap-2">
          <label htmlFor="vig" className="text-[12px] text-[#c9c5d0]">Vigencia de los canjes (días desde que se generan; 0 = no vencen)</label>
          <div className="flex flex-wrap gap-2">
            <input id="vig" type="number" min={0} max={365} step={1} value={dias} onChange={(e) => setDias(e.target.value)}
              className="flex-1 h-11 bg-[#0e0b21] rounded-lg px-3 text-[14px] border border-white/10 focus:outline-none focus:border-[#00eefc]" />
            <button type="button" onClick={guardarVigencia} className="px-4 h-11 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer">Guardar</button>
          </div>
          {cfgMsg && <p role="status" className={`text-[12px] ${cfgMsg.error ? 'text-[#ffb1c4]' : 'text-[#7df4ff]'}`}>{cfgMsg.text}</p>}
        </div>

        <button type="button" onClick={() => { setRes(null); setScanning(true); }}
          className="h-14 rounded-xl bg-[#ff027f] text-white font-bold flex items-center justify-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined">qr_code_scanner</span>
          Escanear código de victoria
        </button>

        {res && (
          <div role="status" className={`rounded-xl border p-4 flex flex-col gap-3 text-[14px] ${tone}`}>
            {res.type === 'ok' ? (
              <>
                <p>Premio: <strong>{res.canje.recompensaNombre}</strong></p>
                <button type="button" onClick={confirmar} disabled={busy}
                  className="h-12 rounded-xl bg-[#00eefc] text-[#002022] font-bold cursor-pointer disabled:opacity-50">
                  {busy ? 'Registrando…' : 'Confirmar canje'}
                </button>
              </>
            ) : (
              <p>{res.text}</p>
            )}
          </div>
        )}
      </main>

      <AdminBottomNav section="canje" onNavigate={onNavigate} />
      {scanning && <QrScanner onDetect={onDetect} onClose={() => setScanning(false)} />}
    </div>
  );
}
