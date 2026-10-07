import { useEffect, useMemo, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner.jsx';
import { NfcScanModal } from '../components/NfcScanModal.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { InfoModal } from '../components/InfoModal.jsx';
import { useParticipation } from '../context/ParticipationContext.jsx';
import {
  subscribeElementos, parseScanPayload, normalizeCode, TIPO_ELEMENTO_LABEL,
} from '../services/elementosService.js';
import { registerClueFound, subscribeParticipation } from '../services/progressService.js';

const formatTime = (ms) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * ESC01 + ESC02 + ESC03 + ESC09 — Entrega de la experiencia, búsqueda de pistas,
 * escaneo QR/NFC, barra de progreso y cuenta regresiva.
 * La experiencia y la participación vienen de ParticipationContext.
 *
 * El botón de acción depende del tipo (qr | nfc) del elemento físico del desafío actual.
 *
 * @param {{
 *   onBack: () => void,
 *   onConclude?: () => void,
 *   onAbandon?: () => void,
 *   onError?: (err: any) => void,
 * }} props
 */
export const ScannerScreen = ({ onBack, onConclude, onAbandon, onError }) => {
  const {
    selectedExperience: experience,
    active,
    remainingMs,
    expiredInfo,
    dismissExpired,
    setScannerVisible,
  } = useParticipation();
  const participationId = active?.id ?? null;

  const [elementos, setElementos] = useState([]);
  const [found, setFound] = useState(() => new Set());
  const [scanning, setScanning] = useState(false);
  const [nfcOpen, setNfcOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const feedbackTimer = useRef(null);
  const foundRef = useRef(found);
  const elementosRef = useRef(elementos);
  const onErrorRef = useRef(onError);
  const handleCodeRef = useRef(null);

  useEffect(() => { foundRef.current = found; }, [found]);
  useEffect(() => { elementosRef.current = elementos; }, [elementos]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Le avisa al contexto que el escáner está en pantalla: solo así se muestra el modal al expirar.
  useEffect(() => {
    setScannerVisible(true);
    return () => setScannerVisible(false);
  }, [setScannerVisible]);

  const experienciaId = experience?.id ?? null;

  // Elementos físicos de la experiencia (ADM14).
  useEffect(
    () => subscribeElementos(experienciaId, setElementos, (err) => onErrorRef.current?.(err)),
    [experienciaId]
  );

  // Progreso guardado: al volver a «Iniciar desafío» (o recargar) se recuperan las pistas ya encontradas.
  useEffect(
    () =>
      subscribeParticipation(
        participationId,
        (p) => {
          const saved = (p?.elementosEncontrados ?? []).map(normalizeCode);
          if (saved.length) setFound((prev) => new Set([...prev, ...saved]));
        },
        (err) => onErrorRef.current?.(err)
      ),
    [participationId]
  );

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  // Etapas = desafíos con elemento físico asociado (ADM16). Si el admin todavía no vinculó
  // ninguno, se muestran los elementos sueltos para que la experiencia igual sea jugable.
  // Cada etapa lleva el `tipo` del elemento físico (qr | nfc) para adaptar el botón.
  const etapas = useMemo(() => {
    const tipoDe = (codigo) => elementos.find((e) => e.codigoIdentificador === codigo)?.tipo ?? 'qr';
    const vinculadas = (experience?.desafios ?? [])
      .filter((d) => d.elementoFisicoId)
      .map((d) => {
        const codigo = normalizeCode(d.elementoFisicoId);
        return {
          key: d.id,
          codigo,
          titulo: d.titulo,
          descripcion: d.descripcion,
          tipo: tipoDe(codigo),
        };
      });
    if (vinculadas.length) return vinculadas;
    return elementos.map((e) => ({
      key: e.id,
      codigo: e.codigoIdentificador,
      titulo: e.nombre,
      descripcion: e.ubicacion,
      tipo: e.tipo ?? 'qr',
    }));
  }, [experience, elementos]);

  // Un desafío a la vez: el actual es el primero (en orden) que todavía no se resolvió.
  const indiceActual = etapas.findIndex((e) => !found.has(e.codigo));
  const completo = etapas.length > 0 && indiceActual === -1;
  const etapaActual = completo ? null : etapas[indiceActual] ?? null;
  const encontradas = completo ? etapas.length : Math.max(0, indiceActual);
  const resueltas = etapas.slice(0, encontradas);
  const tiempoAgotado = !active && !!expiredInfo;

  // Tipo de lectura del desafío actual → decide qué botón se muestra.
  const tipoActual = etapaActual?.tipo === 'nfc' ? 'nfc' : 'qr';
  // NFC siempre muestra su botón (el modal explica si el dispositivo no soporta NFC).
  const esNfc = tipoActual === 'nfc';

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
  };

  /** Procesa un código leído (QR, NFC o manual). Devuelve el resultado para que el modal NFC lo refleje. */
  const handleCode = async (raw) => {
    if (tiempoAgotado) return null;
    const codigo = parseScanPayload(raw);
    if (!codigo) return null;
    if (!etapaActual) return null; // ya completó todo o no hay etapas

    // Código de un desafío ya resuelto
    if (foundRef.current.has(codigo)) {
      const previa = etapas.find((e) => e.codigo === codigo);
      const text = `Ya resolviste «${previa?.titulo ?? 'esta pista'}».`;
      showFeedback('info', text);
      return { type: 'info', text };
    }

    // Cualquier código que no sea el del desafío actual se rechaza sin revelar a qué corresponde.
    if (codigo !== etapaActual.codigo) {
      const text = 'Código incorrecto. No corresponde al desafío actual.';
      showFeedback('error', text);
      return { type: 'error', text };
    }

    setScanning(false);
    const siguiente = new Set(foundRef.current).add(codigo);
    foundRef.current = siguiente; // síncrono: evita doble lectura del mismo código
    setFound(siguiente);
    const text = `¡Correcto! ${etapaActual.titulo}`;
    showFeedback('ok', text);
    if (participationId) {
      // sin participación registrada: el progreso queda solo en pantalla
      try {
        await registerClueFound(participationId, codigo);
      } catch (err) {
        onErrorRef.current?.(err);
      }
    }
    return { type: 'ok', text: etapaActual.titulo };
  };
  handleCodeRef.current = handleCode;

  // Estable para el modal NFC: siempre usa la versión más reciente de handleCode.
  const handleNfcRead = (text) => handleCodeRef.current?.(text);

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCode(manualCode);
    setManualCode('');
  };

  // Cierre del modal de tiempo agotado (botón, X, fondo o Escape): limpia y vuelve a Experiencias.
  const handleExpiredClose = () => {
    setScanning(false);
    setNfcOpen(false);
    dismissExpired();
    onBack();
  };

  const expiredModal = (
    <InfoModal
      isOpen={!!expiredInfo}
      type="info"
      title="¡Se acabó el tiempo!"
      message={`El tiempo de «${expiredInfo?.experienciaNombre || 'la experiencia'}» terminó y la experiencia se marcó como concluida. Podés iniciar otra o volver a intentarlo.`}
      primaryLabel="Volver a Experiencias"
      onPrimary={handleExpiredClose}
      onClose={handleExpiredClose}
      icon="timer_off"
    />
  );

  // Con participación en curso se pide confirmación; sin ella se vuelve directo.
  const handleBackClick = () => {
    if (participationId) setConfirmLeave(true);
    else onBack();
  };

  const handleConfirmAbandon = () => {
    setConfirmLeave(false);
    if (onAbandon) onAbandon();
    else onBack();
  };

  if (!experience) {
    return (
      <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto px-4 pt-24 min-h-[70vh]">
        <div className="w-16 h-16 rounded-full bg-[#1c192f] border border-[#00eefc]/30 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[28px] text-[#00eefc]">center_focus_strong</span>
        </div>
        <h2 className="font-headline-md text-[20px] font-bold text-[#e5defe] mb-1">Todavía no elegiste una experiencia</h2>
        <p className="text-[13px] text-[#c9c5d0] max-w-xs mb-6">
          Elegí una de la lista y tocá «Iniciar desafío» para activar el escáner.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#00eefc] text-[#002022] font-headline-sm text-[13px] font-bold cursor-pointer"
        >
          Ver experiencias
        </button>
        {expiredModal}
      </div>
    );
  }

  const feedbackStyle = {
    ok: 'bg-[#0e0b21] border-[#00eefc]/60 text-[#7df4ff]',
    info: 'bg-[#1c192f] border-white/20 text-[#e5defe]',
    error: 'bg-[#3e001a]/95 border-[#ff027f]/60 text-[#ffdad6]',
  };
  const feedbackIcon = { ok: 'check_circle', info: 'info', error: 'error' };

  const urgente = remainingMs !== null && remainingMs < 2 * 60 * 1000;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24 gap-4">
      {/* ESC01 — Experiencia inicial + cuenta regresiva */}
      <section className="rounded-2xl bg-[#1c192f] border border-[#00eefc]/25 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-headline-md text-[20px] font-bold text-[#e5defe] leading-tight">{experience.nombre}</h1>
          {remainingMs !== null && (
            <div
              role="timer"
              aria-label="Tiempo restante"
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-label-code text-[13px] font-bold ${urgente
                  ? 'bg-[#3e001a] border-[#ff027f]/60 text-[#ff027f] animate-pulse shadow-[0_0_10px_rgba(255,2,127,0.4)]'
                  : 'bg-[#0e0b21] border-[#00eefc]/30 text-[#7df4ff]'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">timer</span>
              {formatTime(remainingMs)}
            </div>
          )}
        </div>
        {experience.descripcion && (
          <p className="text-[13px] text-[#c9c5d0] leading-relaxed">{experience.descripcion}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#c9c5d0] font-label-code text-[11px] pt-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">timer</span>
            {experience.duracion} min
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">military_tech</span>
            +{experience.puntos} pts
          </span>
          {experience.locacion && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {experience.locacion}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#7df4ff] pt-1">
          Recorré el stand, encontrá los elementos y escaneá su código para desbloquear cada pista.
        </p>
      </section>

      {/* ESC09 — Progreso */}
      <ProgressBar value={encontradas} total={etapas.length} />

      {/* Feedback del último escaneo */}
      <div role="status" aria-live="polite" className="min-h-[44px]">
        {feedback && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] ${feedbackStyle[feedback.type]}`}>
            <span className="material-symbols-outlined text-[20px]">{feedbackIcon[feedback.type]}</span>
            <span className="flex-1">{feedback.text}</span>
          </div>
        )}
      </div>

      {/* ESC03 — Acciones de escaneo: cambian según el tipo del elemento del desafío actual */}
      <div className="flex gap-2">
        {esNfc ? (
          <button
            type="button"
            onClick={() => setNfcOpen(true)}
            disabled={tiempoAgotado}
            className="flex-1 h-14 rounded-xl bg-[#ff027f] hover:bg-[#ff027f]/90 text-white font-headline-sm text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,2,127,0.55)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[22px]">nfc</span>
            Leer tag NFC
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={tiempoAgotado}
            className="flex-1 h-14 rounded-xl bg-[#ff027f] hover:bg-[#ff027f]/90 text-white font-headline-sm text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,2,127,0.55)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
            Escanear QR
          </button>
        )}
      </div>

      {/* ESC02 — Desafío actual (uno a la vez) */}
      <section className="flex flex-col gap-2">
        {etapas.length === 0 && (
          <div className="p-4 rounded-xl bg-[#1c192f] border border-white/10 text-[13px] text-[#c9c5d0]">
            El staff todavía no registró elementos para esta experiencia. Consultá en el stand.
          </div>
        )}

        {resueltas.length > 0 && (
          <div className="flex flex-col gap-1">
            {resueltas.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2 text-[12px] text-[#7df4ff]">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span className="truncate">{i + 1}. {r.titulo}</span>
              </div>
            ))}
          </div>
        )}

        {etapaActual && (
          <div className="p-4 rounded-xl bg-[#1c192f] border border-[#00eefc]/50 shadow-[0_0_16px_rgba(0,238,252,0.2)] flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-[#00eefc] text-[#002022] flex items-center justify-center text-[13px] font-bold shrink-0">
              {indiceActual + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-label-code text-[11px] text-[#00eefc] uppercase tracking-wider">
                  Desafío {indiceActual + 1} de {etapas.length}
                </p>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#0e0b21] border border-[#00eefc]/30 text-[10px] text-[#00eefc] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">
                    {tipoActual === 'nfc' ? 'nfc' : 'qr_code_2'}
                  </span>
                  {TIPO_ELEMENTO_LABEL[tipoActual] ?? tipoActual}
                </span>
              </div>
              <p className="text-[15px] font-semibold text-[#e5defe]">{etapaActual.titulo}</p>
              <p className="text-[13px] text-[#c9c5d0] leading-snug mt-0.5">
                {etapaActual.descripcion || 'Buscá el elemento correspondiente y escaneá su código.'}
              </p>
            </div>
          </div>
        )}

        {completo && (
          <div className="p-4 rounded-xl bg-[#0e0b21] border border-[#00eefc]/40 text-[13px] text-[#7df4ff] flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">military_tech</span>
            ¡Resolviste todos los desafíos! Ya podés concluir la experiencia.
          </div>
        )}
      </section>

      {/* Ingreso manual: respaldo si la cámara/NFC falla o el código está dañado */}
      <form onSubmit={submitManual} className="flex gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="¿No escanea? Escribí el código"
          aria-label="Código del elemento"
          disabled={tiempoAgotado}
          className="flex-1 h-11 bg-[#0e0b21] border border-white/10 rounded-lg px-3 text-[13px] text-[#e5defe] placeholder-[#c9c5d0]/50 focus:outline-none focus:border-[#00eefc] disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={tiempoAgotado}
          className="px-4 h-11 rounded-lg bg-[#2a273e] text-[#e5defe] text-[13px] font-semibold cursor-pointer disabled:opacity-40"
        >
          Validar
        </button>
      </form>

      <div className="flex flex-col gap-2 pt-2">
        {onConclude && active && (
          <button
            type="button"
            onClick={onConclude}
            disabled={!completo}
            className="h-12 rounded-xl bg-[#00eefc] text-[#002022] font-headline-sm text-[14px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {completo ? 'Concluir experiencia' : 'Resolvé todos los desafíos para concluir'}
          </button>
        )}
        <button
          type="button"
          onClick={handleBackClick}
          className="h-11 rounded-xl border border-white/15 text-[#c9c5d0] text-[13px] font-semibold cursor-pointer hover:text-[#e5defe]"
        >
          Volver a Experiencias
        </button>
      </div>

      {scanning && !tiempoAgotado && <QrScanner onDetect={handleCode} onClose={() => setScanning(false)} />}

      {nfcOpen && !tiempoAgotado && (
        <NfcScanModal
          titulo={etapaActual?.titulo}
          onRead={handleNfcRead}
          onClose={() => setNfcOpen(false)}
        />
      )}

      {expiredModal}

      <InfoModal
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        type="warning"
        icon="logout"
        title="¿Deseas abandonar la experiencia?"
        message="Si abandonás, tu participación quedará registrada como abandonada y perderás el progreso de esta partida."
        primaryLabel="Sí, abandonar"
        onPrimary={handleConfirmAbandon}
        secondaryLabel="No, volver sin abandonar"
      />
    </div>
  );
};