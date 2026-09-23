import { useState, useRef, useEffect, useCallback, useMemo } from "react";
// Validacion futura
// import {
//   subscribeAdminState,
//   loginAdmin,
//   logoutAdmin,
//   describeAuthError,
// } from "../../services/adminService.js";
import {
  subscribeExperiences, createExperience, updateExperience, setExperienceActive, deleteExperience, seedExperiences,
  newChallenge, describeFirestoreError, TIPOS_VALIDACION, DIFICULTADES, DIFICULTAD_LABEL
} from "../../services/firestoreService.js";
import { subscribeParticipations, summarizeByExperience } from "../../services/participationService.js";

const TIPO_LABEL = { pregunta: "Pregunta", codigo: "Código QR", voz: "Voz" };

const DIFICULTAD_ICONO = { facil: "signal_cellular_1_bar", media: "signal_cellular_3_bar", dificil: "signal_cellular_4_bar" };

const EMPTY_DRAFT = {
  id: null,
  nombre: "",
  descripcion: "",
  duracion: 10,
  dificultad: DIFICULTADES[0],
  puntos: 500,
  locacion: "",
  tematica: "",
  imagenUrl: "",
  desafios: [],
};

const inputBase =
  "w-full bg-[#0e0b21] rounded-lg px-3 text-[#e5defe] text-[14px] placeholder-[#c9c5d0]/50 border border-white/10 focus:outline-none focus:border-[#00eefc] transition-colors";

/* ================================================================== */
/* Gate: decide entre login por PIN y panel                            */
/* ================================================================== */

export default function AdminExperiencesScreen({ onClose }) {
  // TEMPORAL: sin PIN. Entra directo al panel. Ver TODO(sprint PIN) más abajo.
  return <AdminPanel onClose={onClose} />;
}

// export default function AdminExperiencesScreen({ onClose }) {
//   const [status, setStatus] = useState("loading"); // loading | out | admin
//
//   useEffect(
//     () => subscribeAdminState(({ isAdmin }) => setStatus(isAdmin ? "admin" : "out")),
//     []
//   );
//
//   if (status === "loading") {
//     return (
//       <div className="min-h-screen bg-[#131027] flex items-center justify-center">
//         <span className="material-symbols-outlined text-[#00eefc] text-[32px] animate-spin">sync</span>
//       </div>
//     );
//   }
//
//   if (status === "out") {
//     return <PinGate onSuccess={() => setStatus("admin")} onClose={onClose} />;
//   }
//
//   return (
//     <AdminPanel
//       onClose={onClose}
//       onLogout={async () => {
//         await logoutAdmin();
//         setStatus("out");
//       }}
//     />
//   );
// }
//
// /* ================================================================== */
// /* Login por PIN                                                       */
// /* ================================================================== */
//
// function PinGate({ onSuccess, onClose }) {
//   const [pin, setPin] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState("");
//
//   const submit = async (e) => {
//     e.preventDefault();
//     if (!pin.trim()) return;
//     setBusy(true);
//     setError("");
//     try {
//       await loginAdmin(pin);
//       onSuccess();
//     } catch (err) {
//       setError(describeAuthError(err));
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   return (
//     <div className="min-h-screen bg-[#131027] flex items-center justify-center p-4">
//       <form
//         onSubmit={submit}
//         className="relative w-full max-w-md rounded-2xl bg-[#131027] border border-[#00eefc]/30 p-5 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
//       >
//         <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#ff027f]/15 blur-2xl pointer-events-none" />
//
//         <div className="flex items-center justify-between pb-3 border-b border-white/10">
//           <div className="flex items-center gap-1.5 bg-[#0e0b21] px-2.5 py-1 rounded-full border border-[#ff027f]/30">
//             <span className="w-2 h-2 rounded-full bg-[#ff027f] animate-pulse" />
//             <span className="font-label-code text-[10px] text-[#ffb1c4] tracking-wider uppercase font-semibold">
//               Consola de staff
//             </span>
//           </div>
//           {onClose && (
//             <button
//               type="button"
//               onClick={onClose}
//               aria-label="Cerrar"
//               className="material-symbols-outlined text-[#c9c5d0] hover:text-[#e5defe] cursor-pointer"
//             >
//               close
//             </button>
//           )}
//         </div>
//
//         <div className="flex items-center gap-3">
//           <div className="w-14 h-14 rounded-xl bg-[#1a1442] border border-[#ff027f]/40 flex items-center justify-center flex-shrink-0">
//             <span className="material-symbols-outlined text-3xl text-[#ff027f]">admin_panel_settings</span>
//           </div>
//           <div>
//             <h2 className="font-headline-md text-[22px] font-bold text-[#e5defe] leading-tight">
//               Acceso administrador
//             </h2>
//             <p className="text-[12px] text-[#c9c5d0]">Ingresá el PIN del stand para gestionar experiencias.</p>
//           </div>
//         </div>
//
//         {error && (
//           <div className="p-2.5 rounded-lg bg-[#93000a]/60 border border-[#ffb4ab]/40 text-[#ffdad6] text-xs">
//             {error}
//           </div>
//         )}
//
//         <div>
//           <label htmlFor="admin-pin" className="text-[12px] text-[#00eefc] font-semibold flex items-center gap-1 mb-1">
//             <span className="material-symbols-outlined text-[14px]">lock</span>
//             PIN de administrador
//           </label>
//           <input
//             id="admin-pin"
//             type="password"
//             autoComplete="off"
//             autoFocus
//             required
//             value={pin}
//             onChange={(e) => setPin(e.target.value)}
//             placeholder="••••••"
//             className={`${inputBase} h-12 border-[#00eefc]/30`}
//           />
//         </div>
//
//         <button
//           type="submit"
//           disabled={busy}
//           className="w-full h-12 rounded-xl bg-[#ff027f] hover:bg-[#ff027f]/90 text-white font-headline-sm text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,2,127,0.55)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
//         >
//           <span className="material-symbols-outlined text-[20px]">key</span>
//           <span>{busy ? "Verificando PIN…" : "Ingresar al panel"}</span>
//         </button>
//       </form>
//     </div>
//   );
// }

/* ================================================================== */
/* Panel                                                               */
/* ================================================================== */

function AdminPanel({ onClose }) {
  const [experiencias, setExperiencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [tab, setTab] = useState("a");
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState({ visible: false, mensaje: "", error: false });
  const toastTimer = useRef(null);
  const [participations, setParticipations] = useState([]);
  const statsByExp = useMemo(() => summarizeByExperience(participations), [participations]);
  useEffect(() => subscribeParticipations(setParticipations, () => { }), []);


  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((mensaje, error = false) => {
    setToast({ visible: true, mensaje, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3200);
  }, []);

  // Datos en tiempo real desde Firestore
  useEffect(() => {
    return subscribeExperiences(
      (list) => {
        setExperiencias(list);
        setLoading(false);
        setLoadError("");
      },
      (err) => {
        setLoadError(describeFirestoreError(err));
        setLoading(false);
      }
    );
  }, []);

  /* ---------- editor ---------- */

  const openEditor = (exp) => {
    setDraft({
      id: exp.id,
      nombre: exp.nombre ?? "",
      descripcion: exp.descripcion ?? "",
      duracion: exp.duracion ?? 10,
      dificultad: exp.dificultad ?? DIFICULTADES[0],
      puntos: exp.puntos ?? 500,
      locacion: exp.locacion ?? "",
      tematica: exp.tematica ?? "",
      imagenUrl: exp.imagenUrl ?? "",
      desafios: (exp.desafios ?? []).map((d) => ({ ...d })),
    });
    setExpandedId(null);
    setConfirmDelete(false);
    setTab("b");
    setEditorOpen(true);
  };

  const openNew = () => {
    setDraft({ ...EMPTY_DRAFT, desafios: [] });
    setExpandedId(null);
    setConfirmDelete(false);
    setTab("a");
    setEditorOpen(true);
  };

  const closeEditor = () => setEditorOpen(false);

  const patchDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const updateDesafio = (id, campo, valor) =>
    setDraft((d) => ({
      ...d,
      desafios: d.desafios.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)),
    }));

  const addStage = () => {
    const stage = newChallenge(draft.desafios.length);
    setDraft((d) => ({ ...d, desafios: [...d.desafios, stage] }));
    setExpandedId(stage.id);
  };

  const removeStage = (id) =>
    setDraft((d) => ({ ...d, desafios: d.desafios.filter((x) => x.id !== id) }));

  const moveStage = (id, dir) =>
    setDraft((d) => {
      const i = d.desafios.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.desafios.length) return d;
      const next = [...d.desafios];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, desafios: next };
    });

  /* acciones Firestore */

  const saveChanges = async () => {
    if (!draft.nombre.trim()) {
      setTab("a");
      showToast("Ponele un nombre a la experiencia antes de guardar.", true);
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await updateExperience(draft.id, draft);
        showToast("Cambios guardados.");
      } else {
        await createExperience(draft);
        showToast("Experiencia creada. Está oculta hasta que la actives.");
      }
      closeEditor();
    } catch (err) {
      showToast(err.code ? describeFirestoreError(err) : err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (exp) => {
    try {
      await setExperienceActive(exp.id, !exp.activa);
      showToast(
        exp.activa
          ? `«${exp.nombre}» oculta en la PWA.`
          : `«${exp.nombre}» visible para los participantes.`
      );
    } catch (err) {
      showToast(describeFirestoreError(err), true);
    }
  };

  const removeExperience = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteExperience(draft.id);
      showToast("Experiencia eliminada.");
      closeEditor();
    } catch (err) {
      showToast(describeFirestoreError(err), true);
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  const loadSeed = async () => {
    try {
      await seedExperiences();
      showToast("Experiencias de ejemplo cargadas.");
    } catch (err) {
      showToast(describeFirestoreError(err), true);
    }
  };

  const subtitulo = (d) =>
    `${TIPO_LABEL[d.tipoValidacion] ?? d.tipoValidacion} • ${Math.round(d.tiempoMaximo / 60)} min • +${d.puntosOtorgados} pts`;

  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#131027] text-[#e5defe] flex flex-col selection:bg-[#00eefc] selection:text-[#002022]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#0e0b21]/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-4 max-w-[480px] mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="font-headline-sm text-[18px] font-bold tracking-tight leading-none block truncate">
              Experiencias
            </span>
            <span className="text-[12px] text-[#c9c5d0] block truncate">Consola de staff</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={openNew}
              aria-label="Nueva experiencia"
              className="w-11 h-11 rounded-lg bg-[#00eefc]/15 hover:bg-[#00eefc]/25 active:scale-95 text-[#00eefc] flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
            {/* TODO(sprint PIN): botón de cerrar sesión de administrador
            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión de administrador"
              title="Cerrar sesión"
              className="w-11 h-11 rounded-lg bg-[#2a1020] border border-[#ff027f]/40 text-[#ffb1c4] flex items-center justify-center hover:bg-[#3d142e] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
            */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Volver a la app"
                title="Volver a la app"
                className="w-11 h-11 rounded-lg bg-[#2a273e] text-[#e5defe] flex items-center justify-center hover:bg-[#35324a] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-20 left-4 right-4 max-w-[448px] mx-auto z-[70] transition-all duration-300 ${toast.visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
      >
        <div
          className={`px-4 py-2.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-2 backdrop-blur-md ${toast.error
            ? "bg-[#3e001a]/95 border border-[#ff027f]/60 text-[#ffdad6]"
            : "bg-[#35324a]/95 text-[#e5defe]"
            }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${toast.error ? "text-[#ff027f]" : "text-[#7df4ff]"}`}>
            {toast.error ? "error" : "check_circle"}
          </span>
          <span className="text-[13px] flex-1">{toast.mensaje}</span>
          <button
            type="button"
            className="text-[#c9c5d0] hover:text-[#e5defe] p-1 cursor-pointer"
            onClick={() => setToast((t) => ({ ...t, visible: false }))}
            aria-label="Cerrar aviso"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <main className="flex-1 w-full pt-16 pb-24 max-w-[480px] mx-auto">
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-headline-sm text-[18px] font-bold tracking-tight">Administrar experiencias</h1>
          <p className="text-[12px] text-[#c9c5d0]">
            Los cambios se guardan en Firestore y se reflejan en la PWA al instante.
          </p>
        </div>

        {loadError && (
          <div className="mx-4 my-2 p-3 rounded-xl bg-[#3e001a]/80 border border-[#ff027f]/50 text-[#ffdad6] text-[13px]">
            {loadError}
          </div>
        )}

        {loading && (
          <p className="text-center text-[13px] text-[#c9c5d0] py-10">Sincronizando catálogo…</p>
        )}

        {!loading && !loadError && experiencias.length === 0 && (
          <div className="mx-4 my-4 p-5 rounded-xl bg-[#1c192f] border border-white/10 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-[#00eefc]">local_activity</span>
            <p className="text-[14px]">Todavía no hay experiencias.</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={openNew}
                className="px-4 h-10 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer"
              >
                Crear la primera
              </button>
              <button
                type="button"
                onClick={loadSeed}
                className="px-4 h-10 rounded-lg border border-white/15 text-[#c9c5d0] text-[13px] hover:text-[#e5defe] cursor-pointer"
              >
                Cargar ejemplos
              </button>
            </div>
          </div>
        )}

        <div className="px-4 py-2 flex flex-col gap-2">
          {experiencias.map((exp) => (
            <div
              key={exp.id}
              onClick={() => openEditor(exp)}
              className={`cursor-pointer group relative transition-all duration-200 rounded-xl p-4 ${exp.activa
                ? "bg-[#201d33]/85 hover:bg-[#2a273e] shadow-md"
                : "bg-[#201d33]/50 hover:bg-[#201d33]/70 shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${exp.activa ? "bg-[#35324a] text-[#7df4ff]" : "bg-[#201d33] text-[#928f99]"
                      }`}
                  >
                    {exp.imagenUrl ? (
                      <img src={exp.imagenUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[22px]">
                        {DIFICULTAD_ICONO[exp.dificultad] ?? "blur_on"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[11px] ${exp.activa ? "text-[#00eefc]" : "text-[#928f99]"}`}>
                      {DIFICULTAD_LABEL[exp.dificultad] ?? exp.dificultad}
                      {exp.locacion ? ` · ${exp.locacion}` : ""}
                      {exp.tematica ? ` · ${exp.tematica}` : ""}
                    </span>
                    <h2
                      className={`font-headline-sm text-[16px] font-semibold truncate leading-tight ${exp.activa ? "group-hover:text-[#7df4ff] transition-colors" : ""
                        }`}
                    >
                      {exp.nombre}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={exp.activa}
                    aria-label={exp.activa ? "Ocultar en la PWA" : "Mostrar en la PWA"}
                    onClick={() => toggleActive(exp)}
                    className={`w-12 h-7 rounded-full p-0.5 transition-all duration-200 flex items-center cursor-pointer ${exp.activa ? "bg-[#ff027f] justify-end shadow-[0_0_12px_rgba(255,2,127,0.5)]" : "bg-[#35324a] justify-start"
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${exp.activa ? "bg-[#0e0b21]" : "bg-[#2a273e]"
                        }`}
                    >
                      <span className={`material-symbols-outlined text-[14px] ${exp.activa ? "text-[#ff027f]" : "text-[#928f99]"}`}>
                        {exp.activa ? "bolt" : "block"}
                      </span>
                    </div>
                  </button>
                  <span className={`text-[10px] mt-1 ${exp.activa ? "text-[#ff027f]" : "text-[#928f99]"}`}>
                    {exp.activa ? "Activa en la PWA" : "Oculta en la PWA"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[#c9c5d0]">
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">assignment</span>
                    {exp.desafios.length} {exp.desafios.length === 1 ? "desafío" : "desafíos"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    {exp.duracion} min
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">military_tech</span>
                    {exp.puntos} pts
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {statsByExp.get(exp.id)?.total ?? 0} particip.
                  </span>
                </div>
                <span className="flex items-center text-[12px] font-semibold text-[#7df4ff]">
                  Editar
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom nav (solo Experiencias existe por ahora) */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#0e0b21]/85 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        <div className="max-w-[480px] mx-auto h-16 px-1 flex items-center justify-around">
          {[
            { icono: "local_activity", label: "Experiencias", activo: true },
            { icono: "inventory_2", label: "Inventario", activo: false },
            { icono: "military_tech", label: "Premios", activo: false },
            { icono: "currency_exchange", label: "Canje", activo: false },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={!item.activo}
              aria-current={item.activo ? "page" : undefined}
              className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${item.activo ? "text-[#7df4ff]" : "text-[#c9c5d0]/35 cursor-not-allowed"
                }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icono}</span>
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Backdrop del editor */}
      <div
        className={`fixed inset-0 bg-[#0e0b21]/80 backdrop-blur-md z-[55] transition-opacity duration-300 ${editorOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={closeEditor}
      />

      {/* Editor (bottom sheet) */}
      <div
        aria-hidden={!editorOpen}
        className={`fixed inset-x-0 bottom-0 max-w-[480px] mx-auto z-[60] transition-transform duration-300 ease-out bg-[#1c192f] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.7)] flex flex-col max-h-[86vh] overflow-hidden ${editorOpen ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="pt-2 pb-1 px-4 flex flex-col items-center bg-[#1c192f]">
          <div className="w-12 h-1.5 rounded-full bg-[#3a364e]" />
          <div className="w-full flex items-center justify-between mt-2">
            <h2 className="font-headline-sm text-[18px] font-semibold truncate">
              {draft.id ? draft.nombre || "Editar experiencia" : "Nueva experiencia"}
            </h2>
            <button
              type="button"
              aria-label="Cerrar editor"
              onClick={closeEditor}
              className="w-8 h-8 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="px-4 flex gap-1 pt-1">
          {[
            { key: "a", label: "Ajustes básicos", icono: "tune" },
            { key: "b", label: `Secuenciador (${draft.desafios.length})`, icono: "account_tree" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 px-1 rounded-t-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 relative cursor-pointer ${tab === t.key ? "bg-[#201d33] text-[#00eefc]" : "bg-[#2a273e] text-[#c9c5d0]"
                }`}
            >
              {tab === t.key && (
                <div className="absolute top-0 left-4 right-4 h-0.5 bg-[#00eefc] rounded-full shadow-[0_0_8px_rgba(0,238,252,0.8)]" />
              )}
              <span className="material-symbols-outlined text-[16px]">{t.icono}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#201d33] flex flex-col gap-4">
          {tab === "a" && (
            <div className="bg-[#2a273e] p-4 rounded-xl flex flex-col gap-3">
              {draft.id && (() => {
                const s = statsByExp.get(draft.id) ?? { total: 0, en_curso: 0, completada: 0, abandonada: 0, expirada: 0 };
                return (
                  <div className="bg-[#0e0b21] p-3 rounded-xl border border-[#00eefc]/20 flex flex-col gap-2">
                    <span className="text-[12px] text-[#00eefc] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">insights</span>
                      Participaciones registradas
                    </span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-[#c9c5d0]">
                      <span>Total: <strong className="text-[#e5defe]">{s.total}</strong></span>
                      <span>En curso: <strong className="text-[#7df4ff]">{s.en_curso}</strong></span>
                      <span>Completadas: <strong className="text-[#00eefc]">{s.completada}</strong></span>
                      <span>Abandonadas: <strong className="text-[#ffb1c4]">{s.abandonada}</strong></span>
                      <span>Expiradas: <strong className="text-[#ff027f]">{s.expirada}</strong></span>
                    </div>
                  </div>
                );
              })()}
              <div>
                <label htmlFor="exp-nombre" className="text-[12px] text-[#c9c5d0] block mb-1">
                  Nombre de la experiencia
                </label>
                <input
                  id="exp-nombre"
                  type="text"
                  value={draft.nombre}
                  maxLength={80}
                  onChange={(e) => patchDraft({ nombre: e.target.value })}
                  placeholder="Ej. El Núcleo Cuántico Perdido"
                  className={`${inputBase} h-11`}
                />
              </div>

              <div>
                <label htmlFor="exp-desc" className="text-[12px] text-[#c9c5d0] block mb-1">
                  Descripción
                </label>
                <textarea
                  id="exp-desc"
                  rows={3}
                  maxLength={400}
                  value={draft.descripcion}
                  onChange={(e) => patchDraft({ descripcion: e.target.value })}
                  placeholder="Qué tiene que lograr el participante"
                  className={`${inputBase} py-2 resize-none`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-[#c9c5d0]">Dificultad</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0e0b21] p-1 rounded-lg">
                  {DIFICULTADES.map((dif) => (
                    <button
                      key={dif}
                      type="button"
                      aria-pressed={draft.dificultad === dif}
                      onClick={() => patchDraft({ dificultad: dif })}
                      className={`py-2 rounded-md text-[12px] flex items-center justify-center gap-1.5 cursor-pointer ${draft.dificultad === dif
                        ? "bg-[#00eefc] text-[#002022] font-semibold"
                        : "text-[#c9c5d0] hover:text-[#e5defe]"
                        }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{DIFICULTAD_ICONO[dif]}</span>
                      {DIFICULTAD_LABEL[dif]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[12px] text-[#c9c5d0] block mb-1">Duración estimada (minutos)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar un minuto"
                      className="w-9 h-10 rounded-lg bg-[#201d33] flex items-center justify-center text-[18px] font-bold cursor-pointer"
                      onClick={() => patchDraft({ duracion: Math.max(1, Number(draft.duracion) - 1) })}
                    >
                      −
                    </button>
                    <div className="flex-1 bg-[#0e0b21] rounded-lg h-10 flex items-center justify-center font-headline-sm text-[16px] font-semibold text-[#7df4ff]">
                      {draft.duracion} min
                    </div>
                    <button
                      type="button"
                      aria-label="Sumar un minuto"
                      className="w-9 h-10 rounded-lg bg-[#201d33] flex items-center justify-center text-[18px] font-bold cursor-pointer"
                      onClick={() => patchDraft({ duracion: Math.min(120, Number(draft.duracion) + 1) })}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[12px] text-[#c9c5d0] block mb-1">Puntos</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar 50 puntos"
                      className="w-9 h-10 rounded-lg bg-[#201d33] flex items-center justify-center text-[18px] font-bold cursor-pointer"
                      onClick={() => patchDraft({ puntos: Math.max(0, Number(draft.puntos) - 50) })}
                    >
                      −
                    </button>
                    <div className="flex-1 bg-[#0e0b21] rounded-lg h-10 flex items-center justify-center font-headline-sm text-[16px] font-semibold text-[#7df4ff]">
                      {draft.puntos} pts
                    </div>
                    <button
                      type="button"
                      aria-label="Sumar 50 puntos"
                      className="w-9 h-10 rounded-lg bg-[#201d33] flex items-center justify-center text-[18px] font-bold cursor-pointer"
                      onClick={() => patchDraft({ puntos: Math.min(5000, Number(draft.puntos) + 50) })}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="exp-locacion" className="text-[12px] text-[#c9c5d0] block mb-1">
                  Locación en el stand
                </label>
                <input
                  id="exp-locacion"
                  type="text"
                  value={draft.locacion}
                  maxLength={120}
                  onChange={(e) => patchDraft({ locacion: e.target.value })}
                  placeholder="Ej. Stand A — Sector Cian"
                  className={`${inputBase} h-10`}
                />
              </div>
              <div>
                <label htmlFor="exp-tematica" className="text-[12px] text-[#c9c5d0] block mb-1">
                  Temática
                </label>
                <input
                  id="exp-tematica"
                  type="text"
                  value={draft.tematica}
                  maxLength={40}
                  onChange={(e) => patchDraft({ tematica: e.target.value })}
                  placeholder="Ej. Ciencia, Espionaje, Fantasía"
                  className={`${inputBase} h-10`}
                />
              </div>
              <div>
                <label htmlFor="exp-imagen" className="text-[12px] text-[#c9c5d0] block mb-1">
                  Imagen de la tarjeta (URL)
                </label>
                <input
                  id="exp-imagen"
                  type="url"
                  value={draft.imagenUrl}
                  maxLength={500}
                  onChange={(e) => patchDraft({ imagenUrl: e.target.value })}
                  placeholder="https://…"
                  className={`${inputBase} h-10`}
                />
                {draft.imagenUrl && (
                  <div className="mt-2 h-20 rounded-lg overflow-hidden bg-[#0e0b21] border border-white/10">
                    <img src={draft.imagenUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "b" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[16px] font-semibold">
                  {draft.desafios.length} {draft.desafios.length === 1 ? "etapa" : "etapas"}
                </span>
                <button
                  type="button"
                  onClick={addStage}
                  className="h-8 px-3 rounded-lg bg-[#00eefc]/20 hover:bg-[#00eefc]/30 text-[#00eefc] text-[12px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Nuevo desafío
                </button>
              </div>

              {draft.desafios.length === 0 && (
                <p className="text-[13px] text-[#c9c5d0] text-center py-4">
                  Sin etapas todavía. Agregá el primer desafío para armar la secuencia.
                </p>
              )}

              {draft.desafios.map((d, i) => {
                const open = expandedId === d.id;
                return (
                  <div
                    key={d.id}
                    className={`rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-all ${open ? "bg-[#2a273e]" : "bg-[#201d33] hover:bg-[#2a273e]"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : d.id)}
                        aria-expanded={open}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-bold flex-shrink-0 ${open ? "bg-[#00eefc] text-[#002022]" : "bg-[#35324a] text-[#c9c5d0]"
                            }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="font-headline-sm text-[15px] font-semibold block truncate">{d.titulo}</span>
                          <span className="text-[12px] text-[#c9c5d0] block truncate">{subtitulo(d)}</span>
                        </span>
                      </button>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          aria-label="Subir etapa"
                          disabled={i === 0}
                          onClick={() => moveStage(d.id, -1)}
                          className="w-8 h-8 rounded-md text-[#c9c5d0] hover:text-[#7df4ff] disabled:opacity-25 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Bajar etapa"
                          disabled={i === draft.desafios.length - 1}
                          onClick={() => moveStage(d.id, 1)}
                          className="w-8 h-8 rounded-md text-[#c9c5d0] hover:text-[#7df4ff] disabled:opacity-25 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="flex flex-col gap-4 pt-1">
                        <div>
                          <label htmlFor={`st-${d.id}`} className="text-[12px] text-[#c9c5d0] block mb-1">
                            Título del desafío
                          </label>
                          <input
                            id={`st-${d.id}`}
                            type="text"
                            value={d.titulo}
                            maxLength={80}
                            onChange={(e) => updateDesafio(d.id, "titulo", e.target.value)}
                            className={`${inputBase} h-10`}
                          />
                        </div>

                        <div>
                          <label htmlFor={`sd-${d.id}`} className="text-[12px] text-[#c9c5d0] block mb-1">
                            Descripción
                          </label>
                          <textarea
                            id={`sd-${d.id}`}
                            rows={2}
                            maxLength={400}
                            value={d.descripcion ?? ""}
                            onChange={(e) => updateDesafio(d.id, "descripcion", e.target.value)}
                            className={`${inputBase} py-2 resize-none`}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[12px] text-[#c9c5d0]">Tipo de validación</span>
                          <div className="grid grid-cols-3 gap-1.5 bg-[#0e0b21] p-1 rounded-lg">
                            {TIPOS_VALIDACION.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => updateDesafio(d.id, "tipoValidacion", t)}
                                className={`py-2 rounded-md text-[12px] flex items-center justify-center gap-1.5 cursor-pointer ${d.tipoValidacion === t
                                  ? "bg-[#00eefc] text-[#002022] font-semibold"
                                  : "text-[#c9c5d0] hover:text-[#e5defe]"
                                  }`}
                              >
                                {TIPO_LABEL[t]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`cv-${d.id}`} className="text-[12px] text-[#c9c5d0] block mb-1">
                            Criterios de validación (respuestas correctas o patrón)
                          </label>
                          <input
                            id={`cv-${d.id}`}
                            type="text"
                            value={d.criteriosValidacion ?? ""}
                            maxLength={400}
                            onChange={(e) => updateDesafio(d.id, "criteriosValidacion", e.target.value)}
                            placeholder={d.tipoValidacion === "voz" ? "Ej. cancelar autodestruccion" : "Ej. 42"}
                            className={`${inputBase} h-10`}
                          />
                        </div>

                        {d.tipoValidacion === "codigo" && (
                          <div>
                            <label htmlFor={`ef-${d.id}`} className="text-[12px] text-[#c9c5d0] block mb-1">
                              Elemento físico (codigo_identificador)
                            </label>
                            <input
                              id={`ef-${d.id}`}
                              type="text"
                              value={d.elementoFisicoId ?? ""}
                              maxLength={60}
                              onChange={(e) =>
                                updateDesafio(d.id, "elementoFisicoId", e.target.value.trim() || null)
                              }
                              placeholder="Ej. TOTEM-A12"
                              className={`${inputBase} h-10`}
                            />
                          </div>
                        )}

                        <div className="bg-[#0e0b21] p-4 rounded-xl flex flex-col gap-4">
                          <Slider
                            label="Tiempo máximo"
                            value={d.tiempoMaximo}
                            min={30}
                            max={600}
                            step={15}
                            display={`${(d.tiempoMaximo / 60).toFixed(1)} min (${d.tiempoMaximo}s)`}
                            accent="#00eefc"
                            onChange={(v) => updateDesafio(d.id, "tiempoMaximo", v)}
                          />
                          <Slider
                            label="Puntos otorgados"
                            value={d.puntosOtorgados}
                            min={50}
                            max={1000}
                            step={50}
                            display={`+${d.puntosOtorgados} pts`}
                            accent="#7df4ff"
                            onChange={(v) => updateDesafio(d.id, "puntosOtorgados", v)}
                          />
                          <Slider
                            label="Penalización por pistas"
                            value={d.penalizacionPista}
                            min={0}
                            max={200}
                            step={10}
                            display={`−${d.penalizacionPista} pts`}
                            accent="#ffb1c4"
                            onChange={(v) => updateDesafio(d.id, "penalizacionPista", v)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeStage(d.id)}
                          className="self-start flex items-center gap-1 text-[12px] text-[#ffb1c4] hover:text-[#ff027f] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Quitar esta etapa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {draft.id && (
            <button
              type="button"
              onClick={removeExperience}
              disabled={saving}
              className={`self-start flex items-center gap-1 text-[12px] cursor-pointer ${confirmDelete ? "text-[#ff027f] font-bold" : "text-[#ffb1c4] hover:text-[#ff027f]"
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              {confirmDelete ? "Tocá de nuevo para eliminar definitivamente" : "Eliminar experiencia"}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#1c192f] flex items-center gap-2 pb-safe">
          <button
            type="button"
            onClick={closeEditor}
            className="flex-1 py-3 rounded-xl bg-[#201d33] hover:bg-[#35324a] text-[13px] font-semibold transition-colors active:scale-[0.98] cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="flex-[2] py-3 rounded-xl bg-[#00eefc] text-[#002022] text-[13px] font-bold shadow-[0_0_20px_rgba(0,238,252,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[20px] ${saving ? "animate-spin" : ""}`}>sync</span>
            <span>{saving ? "Guardando…" : "Guardar cambios"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, display, accent, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-[12px]">
        <span className="text-[#c9c5d0]">{label}</span>
        <span className="font-semibold" style={{ color: accent }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[#2a273e] rounded-lg cursor-pointer"
        style={{ accentColor: accent }}
      />
    </div>
  );
}
