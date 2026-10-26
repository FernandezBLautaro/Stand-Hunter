import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { AdminBottomNav } from '../../components/AdminBottomNav.jsx';
import {
  subscribeExperiences, updateExperience, describeFirestoreError,
} from '../../services/firestoreService.js';
import {
  subscribeTodosElementos, createElemento, updateElemento, deleteElemento,
  generateCode, normalizeCode, buildQrPayload, parseCapturedCode, findCodeConflict,
  TIPO_ELEMENTO_LABEL,
} from '../../services/elementosService.js';
import { QrScanner } from '../../components/QrScanner.jsx';

const inputBase =
  'w-full bg-[#0e0b21] rounded-lg px-3 text-[#e5defe] text-[14px] placeholder-[#c9c5d0]/50 border border-white/10 focus:outline-none focus:border-[#00eefc] transition-colors';

// Un desafío se identifica en el panel por «experienciaId::desafioId» (el id del desafío solo es único dentro de su experiencia).
const vinculoKey = (experienciaId, desafioId) => `${experienciaId}::${desafioId}`;

let rowSeq = 0;
const newRowId = () => `v${Date.now()}-${rowSeq++}`;
const newVinculacion = () => ({ rowId: newRowId(), experienciaId: '', desafios: [] });

/** Aplana las filas a claves «experienciaId::desafioId» (formato que usa relinkDesafios). */
const flattenVinculaciones = (vinculaciones) =>
  vinculaciones.flatMap((v) =>
    v.experienciaId ? v.desafios.map((id) => vinculoKey(v.experienciaId, id)) : []
  );

const newDraft = () => ({
  id: null,
  nombre: '',
  codigoIdentificador: generateCode(),
  tipo: 'qr',
  ubicacion: '',
  vinculaciones: [], // [{ rowId, experienciaId, desafios: [desafioId] }]
});

/**
 * Sprint 2 — Inventario de elementos físicos (ADM14), códigos QR (ADM15)
 * y vínculo con los desafíos (ADM16).
 *
 * El elemento es global: puede vincularse a varios desafíos de tipo «código», incluso de
 * experiencias distintas. El panel de vinculación del editor agrupa los desafíos por experiencia.
 *
 * @param {{ onClose?: () => void, onNavigate: (section: string) => void }} props
 */
export default function AdminInventarioScreen({ onClose, onNavigate }) {
  const [experiencias, setExperiencias] = useState([]);
  const [elementos, setElementos] = useState([]); // de todas las experiencias
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null); // null = editor cerrado
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qrFor, setQrFor] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [conflict, setConflict] = useState(null); // elemento que ya usa el código del borrador
  const [toast, setToast] = useState({ visible: false, mensaje: '', error: false });
  const toastTimer = useRef(null);

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
        },
        (err) => {
          setLoading(false);
          showToast(describeFirestoreError(err), true);
        }
      ),
    [showToast]
  );

  useEffect(
    () => subscribeTodosElementos(setElementos, (err) => showToast(describeFirestoreError(err), true)),
    [showToast]
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

  /** Desafíos (de cualquier experiencia) que hoy apuntan a este elemento. */
  const desafiosDe = (el) =>
    experiencias.flatMap((exp) =>
      (exp.desafios ?? [])
        .filter((d) => normalizeCode(d.elementoFisicoId) === el.codigoIdentificador)
        .map((d) => ({ exp, d }))
    );

  /** Agrupa los desafíos hoy vinculados a un elemento en una fila por experiencia. */
  const vinculacionesDe = (el) => {
    const map = new Map();
    desafiosDe(el).forEach(({ exp, d }) => {
      if (!map.has(exp.id)) map.set(exp.id, { rowId: newRowId(), experienciaId: exp.id, desafios: [] });
      map.get(exp.id).desafios.push(d.id);
    });
    return [...map.values()];
  };

  // Solo los desafíos de tipo «código» pueden vincularse a un elemento físico; se agrupan por experiencia.
  const gruposCodigo = useMemo(
    () =>
      experiencias
        .map((exp) => ({
          exp,
          desafios: (exp.desafios ?? [])
            .map((d, idx) => ({ d, idx }))
            .filter(({ d }) => d.tipoValidacion === 'codigo'),
        }))
        .filter((g) => g.desafios.length > 0),
    [experiencias]
  );
  const validKeys = useMemo(
    () => new Set(gruposCodigo.flatMap((g) => g.desafios.map(({ d }) => vinculoKey(g.exp.id, d.id)))),
    [gruposCodigo]
  );
  const totalDesafios = experiencias.reduce((n, e) => n + (e.desafios?.length ?? 0), 0);

  /** Otro elemento (distinto al del borrador) que hoy tiene vinculado ese desafío (para avisar del reemplazo). */
  const otroElementoDe = (d) => {
    const code = normalizeCode(d.elementoFisicoId);
    if (!code) return null;
    return elementos.find((e) => e.codigoIdentificador === code && e.id !== draft.id) ?? null;
  };

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
      vinculaciones: vinculacionesDe(el),
    });
  };

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  const patchVinculacion = (rowId, p) =>
    setDraft((d) => ({
      ...d,
      vinculaciones: d.vinculaciones.map((v) => (v.rowId === rowId ? { ...v, ...p } : v)),
    }));

  const addVinculacion = () =>
    setDraft((d) => ({ ...d, vinculaciones: [...d.vinculaciones, newVinculacion()] }));

  const removeVinculacion = (rowId) =>
    setDraft((d) => ({ ...d, vinculaciones: d.vinculaciones.filter((v) => v.rowId !== rowId) }));

  // Al cambiar de experiencia se limpian los desafíos marcados (pertenecían a la anterior).
  const setVinculacionExp = (rowId, experienciaId) => patchVinculacion(rowId, { experienciaId, desafios: [] });

  const toggleDesafioVinc = (rowId, desafioId) =>
    setDraft((d) => ({
      ...d,
      vinculaciones: d.vinculaciones.map((v) =>
        v.rowId !== rowId
          ? v
          : {
              ...v,
              desafios: v.desafios.includes(desafioId)
                ? v.desafios.filter((x) => x !== desafioId)
                : [...v.desafios, desafioId],
            }
      ),
    }));

  const toggleTodosVinc = (rowId, ids) =>
    setDraft((d) => ({
      ...d,
      vinculaciones: d.vinculaciones.map((v) =>
        v.rowId !== rowId ? v : { ...v, desafios: ids.every((id) => v.desafios.includes(id)) ? [] : ids }
      ),
    }));

  /**
   * Reescribe elementoFisicoId en los desafíos de TODAS las experiencias (ADM16):
   * los seleccionados apuntan al código nuevo; los que apuntaban al código (nuevo o anterior)
   * y ya no están seleccionados se desvinculan. Solo se escriben las experiencias que cambian.
   */
  const relinkDesafios = async ({ codigoNuevo, codigoAnterior, vinculos }) => {
    const seleccion = new Set(vinculos);
    for (const exp of experiencias) {
      const actuales = exp.desafios ?? [];
      const siguientes = actuales.map((d) => {
        if (codigoNuevo && seleccion.has(vinculoKey(exp.id, d.id))) return { ...d, elementoFisicoId: codigoNuevo };
        const c = normalizeCode(d.elementoFisicoId);
        if (c && (c === codigoNuevo || c === codigoAnterior)) return { ...d, elementoFisicoId: null };
        return d;
      });
      if (JSON.stringify(siguientes) !== JSON.stringify(actuales)) {
        await updateExperience(exp.id, { desafios: siguientes });
      }
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
    const vinculos = flattenVinculaciones(draft.vinculaciones);

    // Regla: solo desafíos de tipo «código».
    if (vinculos.some((k) => !validKeys.has(k))) {
      showToast('Solo se pueden vincular desafíos de tipo «código».', true);
      return;
    }
    if (draft.vinculaciones.some((v) => v.experienciaId && v.desafios.length === 0)) {
      showToast('Hay una vinculación con experiencia pero sin desafíos marcados.', true);
      return;
    }
    setSaving(true);
    try {
      const codigoNuevo = normalizeCode(draft.codigoIdentificador).replace(/\s+/g, '-');
      const anterior = draft.id ? elementos.find((e) => e.id === draft.id) : null;
      const codigoAnterior = anterior?.codigoIdentificador ?? null;

      if (draft.id) await updateElemento(draft.id, draft);
      else await createElemento(draft);

      await relinkDesafios({ codigoNuevo, codigoAnterior, vinculos });
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
      if (el) {
        await relinkDesafios({ codigoNuevo: null, codigoAnterior: el.codigoIdentificador, vinculos: [] });
      }
      showToast('Elemento eliminado.');
      setDraft(null);
    } catch (err) {
      showToast(describeFirestoreError(err), true);
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
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
              aria-label="Registrar elemento"
              className="w-11 h-11 rounded-lg bg-[#00eefc]/15 hover:bg-[#00eefc]/25 active:scale-95 text-[#00eefc] flex items-center justify-center transition-all cursor-pointer"
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
        <div className="px-4 pt-4 pb-2">
          <p className="text-[12px] text-[#c9c5d0]">
            Registrá los objetos del stand, generá su QR y vinculalos con los desafíos de tipo código que desbloquean.
            Un mismo elemento puede servir a varios desafíos, aunque sean de experiencias distintas.
          </p>
        </div>

        {loading && <p className="text-center text-[13px] text-[#c9c5d0] py-10">Sincronizando…</p>}

        {!loading && elementos.length === 0 && (
          <div className="mx-4 my-4 p-5 rounded-xl bg-[#1c192f] border border-white/10 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-[#00eefc]">inventory_2</span>
            <p className="text-[14px]">Todavía no hay elementos físicos.</p>
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
            const vinculados = desafiosDe(el);
            const expsVinc = [...new Map(vinculados.map(({ exp }) => [exp.id, exp])).values()];
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
                  {expsVinc.length > 0 && (
                    <p className="text-[12px] text-[#c9c5d0] mt-1 flex items-start gap-1">
                      <span className="material-symbols-outlined text-[14px] mt-0.5">local_activity</span>
                      <span className="truncate">
                        {expsVinc.map((e) => `${e.nombre}${e.activa ? '' : ' (oculta)'}`).join(' · ')}
                      </span>
                    </p>
                  )}
                  {el.ubicacion && (
                    <p className="text-[12px] text-[#c9c5d0] mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {el.ubicacion}
                    </p>
                  )}
                  <p className={`text-[12px] mt-1 flex items-start gap-1 ${vinculados.length ? 'text-[#00eefc]' : 'text-[#ffb1c4]'}`}>
                    <span className="material-symbols-outlined text-[14px] mt-0.5">{vinculados.length ? 'link' : 'link_off'}</span>
                    <span>
                      {vinculados.length
                        ? `${vinculados.length === 1 ? 'Desafío' : 'Desafíos'}: ${vinculados
                            .map(({ exp, d }) => (expsVinc.length > 1 ? `${d.titulo} (${exp.nombre})` : d.titulo))
                            .join(' · ')}`
                        : 'Sin desafío vinculado'}
                    </span>
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
                </div>
                {conflict && (
                  <p role="alert" className="text-[12px] text-[#ff027f] mt-1 flex items-start gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>
                      Conflicto: este código ya lo usa «{conflict.nombre}». Escaneá otro o generá uno nuevo.
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-[#c9c5d0]/70 mt-1">
                  Escaneá el QR o leé el tag para completarlo solo. Si lo cambiás, tenés que imprimir de nuevo el QR.
                </p>
              </div>

              <div className="rounded-lg border border-[#00eefc]/20 bg-[#0e0b21] px-3 py-2 text-[12px] text-[#7df4ff] flex items-center justify-between">
                <span>Tecnología</span>
                <span className="font-semibold">QR</span>
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

              {/* Panel de vinculación: desafíos de tipo código de cualquier experiencia */}
              <section className="rounded-xl border border-[#00eefc]/25 bg-[#0e0b21] p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 text-[#00eefc]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    <h3 className="text-[13px] font-semibold">Vinculaciones</h3>
                  </div>
                  <span className="text-[11px] text-[#c9c5d0]/80">
                    {flattenVinculaciones(draft.vinculaciones).length} desafío(s) en total
                  </span>
                </div>

                {gruposCodigo.length === 0 ? (
                  <p className="text-[11px] text-[#ffb1c4]">
                    {totalDesafios === 0
                      ? 'Todavía no hay desafíos. Agregalos en Experiencias → Secuenciador.'
                      : 'Ninguna experiencia tiene desafíos de tipo «código». Solo esos pueden vincularse a un elemento físico.'}
                  </p>
                ) : (
                  <>
                    {draft.vinculaciones.length === 0 && (
                      <p className="text-[11px] text-[#ffb1c4]">
                        Sin vinculaciones. Agregá una para elegir experiencia y desafíos.
                      </p>
                    )}

                    {draft.vinculaciones.map((v, i) => {
                      const grupo = gruposCodigo.find((g) => g.exp.id === v.experienciaId);
                      const usadas = new Set(
                        draft.vinculaciones.filter((x) => x.rowId !== v.rowId).map((x) => x.experienciaId)
                      );
                      const ids = grupo ? grupo.desafios.map(({ d }) => d.id) : [];
                      const todos = ids.length > 0 && ids.every((id) => v.desafios.includes(id));
                      return (
                        <div key={v.rowId} className="rounded-lg border border-white/10 bg-[#201d33] p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-[#e5defe]">Vinculación {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeVinculacion(v.rowId)}
                              aria-label={`Quitar vinculación ${i + 1}`}
                              className="text-[#ffb1c4] hover:text-[#ff027f] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <div>
                            <label htmlFor={`vin-exp-${v.rowId}`} className="text-[12px] text-[#c9c5d0] block mb-1">
                              Experiencia
                            </label>
                            <select
                              id={`vin-exp-${v.rowId}`}
                              value={grupo ? v.experienciaId : ''}
                              onChange={(e) => setVinculacionExp(v.rowId, e.target.value)}
                              className={`${inputBase} h-10`}
                            >
                              <option value="">Elegí una experiencia…</option>
                              {gruposCodigo.map((g) => (
                                <option key={g.exp.id} value={g.exp.id} disabled={usadas.has(g.exp.id)}>
                                  {g.exp.nombre}{g.exp.activa ? '' : ' (oculta)'}{usadas.has(g.exp.id) ? ' — ya agregada' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {grupo && (
                            <div className="flex flex-col gap-1.5" role="group" aria-label="Desafíos de tipo código">
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#c9c5d0]">Desafíos</span>
                                <button
                                  type="button"
                                  onClick={() => toggleTodosVinc(v.rowId, ids)}
                                  className="text-[11px] text-[#00eefc] hover:underline cursor-pointer"
                                >
                                  {todos ? 'Quitar todos' : 'Marcar todos'}
                                </button>
                              </div>
                              {grupo.desafios.map(({ d, idx }) => {
                                const checked = v.desafios.includes(d.id);
                                const otro = !checked ? otroElementoDe(d) : null;
                                return (
                                  <label
                                    key={d.id}
                                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                      checked ? 'border-[#00eefc] bg-[#1a1442]' : 'border-white/10 bg-[#0e0b21] hover:border-white/25'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleDesafioVinc(v.rowId, d.id)}
                                      className="mt-0.5 w-4 h-4 shrink-0"
                                      style={{ accentColor: '#00eefc' }}
                                    />
                                    <span className="min-w-0">
                                      <span className="text-[13px] font-semibold block truncate">{idx + 1}. {d.titulo}</span>
                                      {otro && (
                                        <span className="text-[11px] text-[#ffb1c4] block">
                                          Hoy vinculado a «{otro.nombre}»; quedará reemplazado.
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={addVinculacion}
                      disabled={draft.vinculaciones.length >= gruposCodigo.length}
                      className="h-10 rounded-lg bg-[#00eefc]/15 hover:bg-[#00eefc]/25 text-[#00eefc] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      Agregar vinculación
                    </button>
                  </>
                )}
                <p className="text-[11px] text-[#c9c5d0]/70">
                  Solo aparecen los desafíos de tipo «código». Un desafío tiene un único elemento; un elemento puede
                  desbloquear varios desafíos, de la misma experiencia o de distintas.
                </p>
              </section>

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

      {/* Código QR (ADM15) */}
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
            </div>
            <button type="button" onClick={closeQr} className="text-[12px] text-[#c9c5d0] hover:text-[#e5defe] cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {qrScanOpen && <QrScanner onDetect={handleQrDetect} onClose={() => setQrScanOpen(false)} />}
    </div>
  );
}