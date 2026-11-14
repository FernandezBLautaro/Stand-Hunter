import { useEffect, useRef, useState, useCallback } from 'react';
import { AdminBottomNav } from '../../components/AdminBottomNav.jsx';
import { subscribeExperiences } from '../../services/firestoreService.js';
import {
  subscribeRecompensas, createRecompensa, updateRecompensa, deleteRecompensa,
} from '../../services/recompensasService.js';
import { describeFirestoreError } from '../../services/firestoreService.js';

const inputBase =
  'w-full bg-[#0e0b21] rounded-lg px-3 text-[#e5defe] text-[14px] placeholder-[#c9c5d0]/50 border border-white/10 focus:outline-none focus:border-[#00eefc] transition-colors';
const EMPTY = { id: null, nombre: '', experienciaId: '', descripcion: '', puntosRequeridos: 0, stockDisponible: 10, oculta: false };

/** Mismo interruptor que la lista de experiencias. */
const Switch = ({ on, onClick, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
    className={`w-12 h-7 rounded-full p-0.5 transition-all duration-200 flex items-center cursor-pointer ${on ? 'bg-[#ff027f] justify-end shadow-[0_0_12px_rgba(255,2,127,0.5)]' : 'bg-[#35324a] justify-start'}`}>
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${on ? 'bg-[#0e0b21]' : 'bg-[#2a273e]'}`}>
      <span className={`material-symbols-outlined text-[14px] ${on ? 'text-[#ff027f]' : 'text-[#928f99]'}`}>{on ? 'bolt' : 'block'}</span>
    </div>
  </button>
);

/** ADM18 — Premios: crear, editar, ocultar y eliminar recompensas. */
export default function AdminPremiosScreen({ onClose, onNavigate }) {
  const [list, setList] = useState([]);
  const [experiencias, setExperiencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((m, error = false) => {
    setToast({ m, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(
    () => subscribeRecompensas(
      (l) => { setList(l); setLoading(false); },
      (e) => { setLoading(false); showToast(describeFirestoreError(e), true); }
    ),
    [showToast]
  );

  useEffect(() => subscribeExperiences(setExperiencias, () => {}), []);
  const expNombre = (id) => experiencias.find((e) => e.id === id)?.nombre;

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const open = (r) => { setConfirmDelete(false); setDraft(r ? { ...r } : { ...EMPTY }); };

  const run = async (fn, ok) => {
    setSaving(true);
    try { await fn(); showToast(ok); return true; }
    catch (e) { showToast(e.code ? describeFirestoreError(e) : e.message, true); return false; }
    finally { setSaving(false); }
  };

  const toggle = (r) => run(() => updateRecompensa(r.id, { ...r, oculta: !r.oculta }), r.oculta ? 'Premio visible.' : 'Premio oculto.');

  const save = async () => {
    const ok = await run(() => (draft.id ? updateRecompensa(draft.id, draft) : createRecompensa(draft)), 'Premio guardado.');
    if (ok) setDraft(null);
  };
  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    if (await run(() => deleteRecompensa(draft.id), 'Premio eliminado.')) setDraft(null);
    setConfirmDelete(false);
  };

  return (
    <div className="min-h-screen bg-[#131027] text-[#e5defe] flex flex-col">
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#0e0b21]/80 backdrop-blur-xl">
        <div className="h-16 px-4 max-w-[480px] mx-auto flex items-center justify-between gap-2">
          <div>
            <span className="font-headline-sm text-[18px] font-bold block leading-none">Premios</span>
            <span className="text-[12px] text-[#c9c5d0]">Recompensas del stand</span>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => open(null)} aria-label="Nuevo premio"
              className="w-11 h-11 rounded-lg bg-[#00eefc]/15 text-[#00eefc] flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Volver a la app"
                className="w-11 h-11 rounded-lg bg-[#2a273e] flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {toast && (
        <div role="status" className={`fixed top-20 left-4 right-4 max-w-[448px] mx-auto z-[80] px-4 py-2.5 rounded-xl text-[13px] ${toast.error ? 'bg-[#3e001a]/95 border border-[#ff027f]/60 text-[#ffdad6]' : 'bg-[#35324a]/95'}`}>
          {toast.m}
        </div>
      )}

      <main className="flex-1 w-full pt-20 pb-24 max-w-[480px] mx-auto px-4 flex flex-col gap-2">
        {loading && <p className="text-center text-[13px] text-[#c9c5d0] py-10">Sincronizando…</p>}
        {!loading && list.length === 0 && <p className="text-center text-[13px] text-[#c9c5d0] py-10">Todavía no hay premios.</p>}
        {list.map((r) => (
          <div key={r.id} onClick={() => open(r)}
            className={`cursor-pointer rounded-xl p-4 flex items-start justify-between gap-2 ${r.oculta ? 'bg-[#201d33]/50' : 'bg-[#201d33]/85 shadow-md'}`}>
            <div className="min-w-0">
              <span className={`text-[11px] ${expNombre(r.experienciaId) ? 'text-[#00eefc]' : 'text-[#ffb1c4]'}`}>
                {expNombre(r.experienciaId) ?? 'Sin experiencia asignada'}
              </span>
              <h2 className="text-[16px] font-semibold truncate">{r.nombre}</h2>
              <p className="text-[12px] text-[#c9c5d0] mt-1">
                Stock: <strong className={r.stockDisponible > 0 ? 'text-[#7df4ff]' : 'text-[#ff027f]'}>{r.stockDisponible}</strong>
                {' · '}desde {r.puntosRequeridos} pts
              </p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Switch on={!r.oculta} label={r.oculta ? 'Mostrar premio' : 'Ocultar premio'} onClick={() => toggle(r)} />
              <span className={`text-[10px] mt-1 ${r.oculta ? 'text-[#928f99]' : 'text-[#ff027f]'}`}>
                {r.oculta ? 'Oculto' : 'Visible'}
              </span>
            </div>
          </div>
        ))}
      </main>

      <AdminBottomNav section="premios" onNavigate={onNavigate} />

      {draft && (
        <>
          <div className="fixed inset-0 bg-[#0e0b21]/80 backdrop-blur-md z-[55]" onClick={() => setDraft(null)} />
          <div className="fixed inset-x-0 bottom-0 max-w-[480px] mx-auto z-[60] bg-[#1c192f] rounded-t-2xl flex flex-col max-h-[88vh]">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">{draft.id ? 'Editar premio' : 'Nuevo premio'}</h2>
              <button type="button" aria-label="Cerrar editor" onClick={() => setDraft(null)}
                className="w-8 h-8 rounded-lg bg-[#2a273e] flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-3 bg-[#201d33] flex flex-col gap-3">
              <div>
                <label htmlFor="pr-nombre" className="text-[12px] text-[#c9c5d0] block mb-1">Nombre</label>
                <input id="pr-nombre" type="text" maxLength={80} value={draft.nombre}
                  onChange={(e) => patch({ nombre: e.target.value })} className={`${inputBase} h-11`} />
              </div>
              <div>
                <label htmlFor="pr-exp" className="text-[12px] text-[#c9c5d0] block mb-1">Experiencia</label>
                <select id="pr-exp" value={draft.experienciaId} onChange={(e) => patch({ experienciaId: e.target.value })} className={`${inputBase} h-11`}>
                  <option value="">Elegí una experiencia…</option>
                  {experiencias.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <p className="text-[11px] text-[#c9c5d0]/70 mt-1">
                  Una experiencia puede tener varios premios; al completar, se asigna el premio visible de mayor puntaje requerido que puedas alcanzar.
                </p>
              </div>
              <div>
                <label htmlFor="pr-desc" className="text-[12px] text-[#c9c5d0] block mb-1">Descripción</label>
                <textarea id="pr-desc" rows={2} maxLength={200} value={draft.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })} className={`${inputBase} py-2 resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pr-stock" className="text-[12px] text-[#c9c5d0] block mb-1">Stock</label>
                  <input id="pr-stock" type="number" step={1} value={draft.stockDisponible}
                    onChange={(e) => patch({ stockDisponible: e.target.value })} className={`${inputBase} h-11`} />
                </div>
                <div>
                  <label htmlFor="pr-pts" className="text-[12px] text-[#c9c5d0] block mb-1">Puntos requeridos</label>
                  <input id="pr-pts" type="number" min={0} value={draft.puntosRequeridos}
                    onChange={(e) => patch({ puntosRequeridos: e.target.value })} className={`${inputBase} h-11`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px]">{draft.oculta ? 'Oculto para los participantes' : 'Visible para los participantes'}</span>
                <Switch on={!draft.oculta} label="Visible para los participantes" onClick={() => patch({ oculta: !draft.oculta })} />
              </div>
              {draft.id && (
                <button type="button" onClick={remove} disabled={saving}
                  className={`self-start flex items-center gap-1 text-[12px] cursor-pointer ${confirmDelete ? 'text-[#ff027f] font-bold' : 'text-[#ffb1c4]'}`}>
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  {confirmDelete ? 'Tocá de nuevo para eliminar' : 'Eliminar premio'}
                </button>
              )}
            </div>
            <div className="px-4 py-2 bg-[#1c192f] flex gap-2 pb-safe">
              <button type="button" onClick={() => setDraft(null)} className="flex-1 py-3 rounded-xl bg-[#201d33] text-[13px] font-semibold cursor-pointer">Cerrar</button>
              <button type="button" onClick={save} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar premio'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
