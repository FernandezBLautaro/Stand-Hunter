import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { AdminBottomNav } from '../../components/AdminBottomNav.jsx';
import {
  subscribeExperiences, updateExperience, describeFirestoreError,
} from '../../services/firestoreService.js';
import {
  subscribeElementos, createElemento, updateElemento, deleteElemento,
  generateCode, normalizeCode, buildQrPayload, parseCapturedCode, findCodeConflict,
  TIPOS_ELEMENTO, TIPO_ELEMENTO_LABEL,
} from '../../services/elementosService.js';
import { isNfcSupported } from '../../services/nfc.js';
import { NfcToolsModal } from '../../components/NfcToolsModal.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';

const inputBase =
  'w-full bg-[#0e0b21] rounded-lg px-3 text-[#e5defe] text-[14px] placeholder-[#c9c5d0]/50 border border-white/10 focus:outline-none focus:border-[#00eefc] transition-colors';

const newDraft = () => ({
  id: null,
  nombre: '',
  codigoIdentificador: generateCode(),
  tipo: 'qr',
  ubicacion: '',
  desafioId: '',
});

/**
 * Sprint 2 — Inventario de elementos físicos (ADM14), códigos QR/NFC (ADM15)
 * y vínculo con las pistas (ADM16).
 *
 * @param {{ onClose?: () => void, onNavigate: (section: string) => void }} props
 */
export default function AdminInventarioScreen({ onClose, onNavigate }) {
  const [experiencias, setExperiencias] = useState([]);
  const [expId, setExpId] = useState('');
  const [elementos, setElementos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null); // null = editor cerrado
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qrFor, setQrFor] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [nfcTools, setNfcTools] = useState(null); // null = cerrado, o { codigo, onPick? }
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [conflict, setConflict] = useState(null); // elemento que ya usa el código del borrador
  const [toast, setToast] = useState({ visible: false, mensaje: '', error: false });
  const toastTimer = useRef(null);

  const experiencia = useMemo(() => experiencias.find((e) => e.id === expId) ?? null, [experiencias, expId]);
  const desafios = experiencia?.desafios ?? [];

  const showToast = useCallback((mensaje, error = false) => {
    setToast({ visible: true, mensaje, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(
    () =>
      subscribeExperiences(
        (list) => {
          setExperiencias(list);
          setLoading(false);
          setExpId((prev) => prev || list[0]?.id || '');
        },
        (err) => {
          setLoading(false);
          showToast(describeFirestoreError(err), true);
        }
      ),
    [showToast]
  );

  useEffect(
    () => subscribeElementos(expId, setElementos, (err) => showToast(describeFirestoreError(err), true)),
    [expId, showToast]
  );

  // Imagen del QR para el elemento elegido (ADM15).
  useEffect(() => {
    if (!qrFor) {
      setQrUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(buildQrPayload(qrFor.codigoIdentificador), {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((url) => !cancelled && setQrUrl(url));
    return () => {
      cancelled = true;
    };
  }, [qrFor]);

  // ADM15 — Avisa de inmediato si el código ya pertenece a otro elemento.
  const codigoDraft = draft ? normalizeCode(draft.codigoIdentificador).replace(/\s+/g, '-') : '';
  const draftId = draft?.id ?? null;
  useEffect(() => {
    if (!codigoDraft) {
      setConflict(null);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      findCodeConflict(codigoDraft, draftId)
        .then((c) => !cancelled && setConflict(c))
        .catch(() => !cancelled && setConflict(null));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [codigoDraft, draftId]);

  const desafioDe = (el) =>
    desafios.find((d) => normalizeCode(d.elementoFisicoId) === el.codigoIdentificador) ?? null;

  /* ---------- editor ---------- */

  const openNew = () => {
    setConfirmDelete(false);
    setDraft(newDraft());
  };

  const openEdit = (el) => {
    setConfirmDelete(false);
    setDraft({
      id: el.id,
      nombre: el.nombre ?? '',
      codigoIdentificador: el.codigoIdentificador,
      tipo: el.tipo ?? 'qr',
      ubicacion: el.ubicacion ?? '',
      desafioId: desafioDe(el)?.id ?? '',
    });
  };

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  /** Reescribe elementoFisicoId en los desafíos para mantener el vínculo 1 a 1 (ADM16). */
  const relinkDesafios = async ({ codigoNuevo, codigoAnterior, desafioId }) => {
    const actuales = experiencia?.desafios ?? [];
    const siguientes = actuales.map((d) => {
      const c = normalizeCode(d.elementoFisicoId);
      if (desafioId && d.id === desafioId) return { ...d, elementoFisicoId: codigoNuevo };
      if (c && (c === codigoNuevo || c === codigoAnterior)) return { ...d, elementoFisicoId: null };
      return d;
    });
    if (JSON.stringify(siguientes) !== JSON.stringify(actuales)) {
      await updateExperience(expId, { desafios: siguientes });
    }
  };

  const save = async () => {
    if (!draft.nombre.trim()) {
      showToast('Ponele un nombre al elemento antes de guardar.', true);
      return;
    }
    if (conflict) {
      showToast(`El código ${codigoDraft} ya está asignado a «${conflict.nombre}».`, true);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, experienciaId: expId };
      const codigoNuevo = normalizeCode(draft.codigoIdentificador).replace(/\s+/g, '-');
      const codigoAnterior = draft.id ? elementos.find((e) => e.id === draft.id)?.codigoIdentificador : null;
      if (draft.id) await updateElemento(draft.id, payload);
      else await createElemento(payload);
      await relinkDesafios({ codigoNuevo, codigoAnterior, desafioId: draft.desafioId });
      showToast(draft.id ? 'Elemento actualizado.' : 'Elemento registrado.');
      setDraft(null);
    } catch (err) {
      showToast(err.code ? describeFirestoreError(err) : err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      const el = elementos.find((e) => e.id === draft.id);
      await deleteElemento(draft.id);
      if (el) await relinkDesafios({ codigoNuevo: null, codigoAnterior: el.codigoIdentificador, desafioId: '' });
      showToast('Elemento eliminado.');
      setDraft(null);
    } catch (err) {
      showToast(describeFirestoreError(err), true);
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  /* ---------- NFC ---------- */

  const openNfcReader = () =>
    setNfcTools({
      codigo: draft.codigoIdentificador,
      onPick: (c) => {
        patch({ codigoIdentificador: c });
        showToast('Código capturado desde el tag NFC.');
      },
    });

  /** Al elegir NFC se abren las herramientas NFC para leer/grabar el tag. */
  const selectTipo = (t) => {
    patch({ tipo: t });
    if (t === 'qr') return;
    if (isNfcSupported()) openNfcReader();
    else showToast('Este dispositivo o navegador no soporta NFC (se necesita Chrome en Android).', true);
  };

  // ADM15 — Autocompleta el código con lo leído por la cámara.
  const handleQrDetect = (raw) => {
    const codigo = parseCapturedCode(raw);
    if (!codigo) {
      showToast('Ese QR no es un código de elemento válido.', true);
      return;
    }
    patch({ codigoIdentificador: codigo });
    setQrScanOpen(false);
    showToast('Código capturado desde el QR.');
  };

  const closeQr = () => setQrFor(null);


  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#131027] text-[#e5defe] flex flex-col selection:bg-[#00eefc] selection:text-[#002022]">
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#0e0b21]/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-4 max-w-[480px] mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="font-headline-sm text-[18px] font-bold tracking-tight leading-none block truncate">Inventario</span>
            <span className="text-[12px] text-[#c9c5d0] block truncate">Elementos físicos del stand</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={openNew}
              disabled={!expId}
              aria-label="Registrar elemento"
              className="w-11 h-11 rounded-lg bg-[#00eefc]/15 hover:bg-[#00eefc]/25 active:scale-95 text-[#00eefc] flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Volver a la app"
                className="w-11 h-11 rounded-lg bg-[#2a273e] text-[#e5defe] flex items-center justify-center hover:bg-[#35324a] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        role="status"
        aria-live="polite"
        className={`fixed top-20 left-4 right-4 max-w-[448px] mx-auto z-[80] transition-all duration-300 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div
          className={`px-4 py-2.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-2 backdrop-blur-md ${
            toast.error ? 'bg-[#3e001a]/95 border border-[#ff027f]/60 text-[#ffdad6]' : 'bg-[#35324a]/95 text-[#e5defe]'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${toast.error ? 'text-[#ff027f]' : 'text-[#7df4ff]'}`}>
            {toast.error ? 'error' : 'check_circle'}
          </span>
          <span className="text-[13px] flex-1">{toast.mensaje}</span>
        </div>
      </div>

      <main className="flex-1 w-full pt-16 pb-24 max-w-[480px] mx-auto">
        <div className="px-4 pt-4 pb-2 flex flex-col gap-3">
          <p className="text-[12px] text-[#c9c5d0]">
            Registrá los objetos del stand, generá su QR o NFC y vinculalos con la pista que desbloquean.
          </p>
          <div>
            <label htmlFor="inv-exp" className="text-[12px] text-[#c9c5d0] block mb-1">Experiencia</label>
            <select
              id="inv-exp"
              value={expId}
              onChange={(e) => setExpId(e.target.value)}
              className={`${inputBase} h-11 cursor-pointer`}
            >
              {experiencias.length === 0 && <option value="">Sin experiencias</option>}
              {experiencias.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}{e.activa ? '' : ' (oculta)'}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="text-center text-[13px] text-[#c9c5d0] py-10">Sincronizando…</p>}

        {!loading && experiencias.length === 0 && (
          <div className="mx-4 my-4 p-5 rounded-xl bg-[#1c192f] border border-white/10 text-center space-y-2">
            <span className="material-symbols-outlined text-[32px] text-[#00eefc]">local_activity</span>
            <p className="text-[14px]">Primero creá una experiencia.</p>
            <button
              type="button"
              onClick={() => onNavigate('experiencias')}
              className="px-4 h-10 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer"
            >
              Ir a Experiencias
            </button>
          </div>
        )}

        {expId && elementos.length === 0 && !loading && (
          <div className="mx-4 my-4 p-5 rounded-xl bg-[#1c192f] border border-white/10 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-[#00eefc]">inventory_2</span>
            <p className="text-[14px]">Esta experiencia no tiene elementos físicos.</p>
            <button
              type="button"
              onClick={openNew}
              className="px-4 h-10 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer"
            >
              Registrar el primero
            </button>
          </div>
        )}

        <div className="px-4 py-2 flex flex-col gap-2">
          {elementos.map((el) => {
            const d = desafioDe(el);
            return (
              <div key={el.id} className="rounded-xl p-4 bg-[#201d33]/85 shadow-md flex flex-col gap-3">
                <button type="button" onClick={() => openEdit(el)} className="text-left cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-headline-sm text-[16px] font-semibold truncate">{el.nombre}</h2>
                      <span className="font-label-code text-[11px] text-[#7df4ff]">{el.codigoIdentificador}</span>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#0e0b21] border border-[#00eefc]/30 text-[11px] text-[#00eefc]">
                      {TIPO_ELEMENTO_LABEL[el.tipo] ?? el.tipo}
                    </span>
                  </div>
                  {el.ubicacion && (
                    <p className="text-[12px] text-[#c9c5d0] mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {el.ubicacion}
                    </p>
                  )}
                  <p className={`text-[12px] mt-1 flex items-center gap-1 ${d ? 'text-[#00eefc]' : 'text-[#ffb1c4]'}`}>
                    <span className="material-symbols-outlined text-[14px]">{d ? 'link' : 'link_off'}</span>
                    {d ? `Pista: ${d.titulo}` : 'Sin pista vinculada'}
                  </p>
                </button>
                <div className="flex gap-2">
                  {el.tipo === 'qr' && (
                    <button
                      type="button"
                      onClick={() => setQrFor(el)}
                      className="flex-1 h-10 rounded-lg bg-[#00eefc]/15 hover:bg-[#00eefc]/25 text-[#00eefc] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                      Ver código
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(el)}
                    className={`${el.tipo === 'qr' ? 'px-4' : 'flex-1'} h-10 rounded-lg bg-[#2a273e] hover:bg-[#35324a] text-[#e5defe] text-[13px] font-semibold cursor-pointer`}
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <AdminBottomNav section="inventario" onNavigate={onNavigate} />

      {/* Editor */}
      {draft && (
        <>
          <div className="fixed inset-0 bg-[#0e0b21]/80 backdrop-blur-md z-[55]" onClick={() => setDraft(null)} />
          <div className="fixed inset-x-0 bottom-0 max-w-[480px] mx-auto z-[60] bg-[#1c192f] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.7)] flex flex-col max-h-[88vh]">
            <div className="pt-2 pb-1 px-4 flex flex-col items-center">
              <div className="w-12 h-1.5 rounded-full bg-[#3a364e]" />
              <div className="w-full flex items-center justify-between mt-2">
                <h2 className="font-headline-sm text-[18px] font-semibold truncate">
                  {draft.id ? draft.nombre || 'Editar elemento' : 'Nuevo elemento'}
                </h2>
                <button
                  type="button"
                  aria-label="Cerrar editor"
                  onClick={() => setDraft(null)}
                  className="w-8 h-8 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#201d33] flex flex-col gap-3">
              <div>
                <label htmlFor="el-nombre" className="text-[12px] text-[#c9c5d0] block mb-1">Nombre del elemento</label>
                <input
                  id="el-nombre"
                  type="text"
                  value={draft.nombre}
                  maxLength={80}
                  onChange={(e) => patch({ nombre: e.target.value })}
                  placeholder="Ej. Tótem de entrada"
                  className={`${inputBase} h-11`}
                />
              </div>

              <div>
                <label htmlFor="el-codigo" className="text-[12px] text-[#c9c5d0] block mb-1">Código identificador</label>
                <div className="flex gap-2">
                  <input
                    id="el-codigo"
                    type="text"
                    value={draft.codigoIdentificador}
                    maxLength={60}
                    onChange={(e) => patch({ codigoIdentificador: e.target.value.toUpperCase() })}
                    aria-invalid={!!conflict}
                    className={`${inputBase} h-11 font-label-code ${conflict ? 'border-[#ff027f]' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ codigoIdentificador: generateCode() })}
                    aria-label="Generar otro código"
                    className="w-11 h-11 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">autorenew</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrScanOpen(true)}
                    aria-label="Capturar código escaneando un QR"
                    className="w-11 h-11 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  </button>
                  {isNfcSupported() && (
                    <button
                      type="button"
                      onClick={openNfcReader}
                      aria-label="Capturar código desde un tag NFC"
                      className="w-11 h-11 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[20px]">nfc</span>
                    </button>
                  )}
                </div>
                {conflict && (
                  <p role="alert" className="text-[12px] text-[#ff027f] mt-1 flex items-start gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>
                      Conflicto: este código ya lo usa «{conflict.nombre}»
                      {experiencias.find((e) => e.id === conflict.experienciaId)?.nombre
                        ? ` (${experiencias.find((e) => e.id === conflict.experienciaId).nombre})`
                        : ''}
                      . Escaneá otro o generá uno nuevo.
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-[#c9c5d0]/70 mt-1">
                  Escaneá el QR o leé el tag para completarlo solo. Si lo cambiás, tenés que imprimir de nuevo el QR.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-[#c9c5d0]">Tecnología</span>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0e0b21] p-1 rounded-lg">
                  {TIPOS_ELEMENTO.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={draft.tipo === t}
                      onClick={() => selectTipo(t)}
                      className={`py-2 rounded-md text-[12px] cursor-pointer ${
                        draft.tipo === t ? 'bg-[#00eefc] text-[#002022] font-semibold' : 'text-[#c9c5d0] hover:text-[#e5defe]'
                      }`}
                    >
                      {TIPO_ELEMENTO_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="el-ubic" className="text-[12px] text-[#c9c5d0] block mb-1">Ubicación en el stand</label>
                <input
                  id="el-ubic"
                  type="text"
                  value={draft.ubicacion}
                  maxLength={120}
                  onChange={(e) => patch({ ubicacion: e.target.value })}
                  placeholder="Ej. Columna norte, a 1,5 m del piso"
                  className={`${inputBase} h-11`}
                />
              </div>

              <div>
                <label htmlFor="el-desafio" className="text-[12px] text-[#c9c5d0] block mb-1">Pista que desbloquea</label>
                <select
                  id="el-desafio"
                  value={draft.desafioId}
                  onChange={(e) => patch({ desafioId: e.target.value })}
                  className={`${inputBase} h-11 cursor-pointer`}
                >
                  <option value="">Sin vincular</option>
                  {desafios.map((d, i) => (
                    <option key={d.id} value={d.id}>{i + 1}. {d.titulo}</option>
                  ))}
                </select>
                {desafios.length === 0 && (
                  <p className="text-[11px] text-[#ffb1c4] mt-1">
                    Esta experiencia no tiene desafíos. Agregalos en Experiencias → Secuenciador.
                  </p>
                )}
                {draft.desafioId && (
                  <p className="text-[11px] text-[#c9c5d0]/70 mt-1">
                    Si la pista ya tenía otro elemento, queda reemplazado.
                  </p>
                )}
              </div>

              {draft.id && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={saving}
                  className={`self-start flex items-center gap-1 text-[12px] cursor-pointer ${
                    confirmDelete ? 'text-[#ff027f] font-bold' : 'text-[#ffb1c4] hover:text-[#ff027f]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  {confirmDelete ? 'Tocá de nuevo para eliminar definitivamente' : 'Eliminar elemento'}
                </button>
              )}
            </div>

            <div className="px-4 py-2 bg-[#1c192f] flex items-center gap-2 pb-safe">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex-1 py-3 rounded-xl bg-[#201d33] hover:bg-[#35324a] text-[13px] font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !!conflict}
                className="flex-[2] py-3 rounded-xl bg-[#00eefc] text-[#002022] text-[13px] font-bold shadow-[0_0_20px_rgba(0,238,252,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${saving ? 'animate-spin' : ''}`}>sync</span>
                {saving ? 'Guardando…' : 'Guardar elemento'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Código QR / NFC (ADM15) */}
      {qrFor && (
        <div className="fixed inset-0 z-[65] bg-[#0e0b21]/90 backdrop-blur-md flex items-center justify-center p-4" onClick={closeQr}>
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1c192f] border border-[#00eefc]/30 p-5 flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline-sm text-[18px] font-semibold text-center">{qrFor.nombre}</h2>
            <div className="w-56 h-56 bg-white rounded-xl p-2 flex items-center justify-center">
              {qrUrl ? (
                <img src={qrUrl} alt={`Código QR de ${qrFor.nombre}`} className="w-full h-full" />
              ) : (
                <span className="material-symbols-outlined text-[#131027] animate-spin">sync</span>
              )}
            </div>
            <span className="font-label-code text-[12px] text-[#7df4ff]">{qrFor.codigoIdentificador}</span>
            <p className="text-[12px] text-[#c9c5d0] text-center">
              Descargá la imagen, imprimila y pegala en el elemento.
            </p>

            <div className="w-full flex gap-2">
              <a
                href={qrUrl || undefined}
                download={`QR-${qrFor.codigoIdentificador}.png`}
                aria-disabled={!qrUrl}
                className="flex-1 h-11 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Descargar PNG
              </a>
              {isNfcSupported() && (
                <button
                  type="button"
                  onClick={() => setNfcTools({ codigo: qrFor.codigoIdentificador })}
                  className="px-4 h-11 rounded-lg bg-[#2a273e] text-[#e5defe] text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">nfc</span>
                  Herramientas NFC
                </button>
              )}
            </div>
            <button type="button" onClick={closeQr} className="text-[12px] text-[#c9c5d0] hover:text-[#e5defe] cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {nfcTools && (
        <NfcToolsModal
          codigo={nfcTools.codigo}
          onPickCode={nfcTools.onPick}
          onClose={() => setNfcTools(null)}
        />
      )}

      {qrScanOpen && <QrScanner onDetect={handleQrDetect} onClose={() => setQrScanOpen(false)} />}
    </div>
  );
}