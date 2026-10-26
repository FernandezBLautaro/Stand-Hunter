import { useEffect, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { InfoModal } from '../components/InfoModal.jsx';
import { ChallengeAnswer } from '../components/ChallengeAnswer.jsx';
import { useParticipation } from '../context/ParticipationContext.jsx';
import { useChallenge } from '../context/ChallengeContext.jsx';
import { parseScanPayload } from '../services/elementosService.js';

const formatTime = (ms) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TIPO_LABEL = { pregunta: 'Pregunta', codigo: 'Código QR', voz: 'Voz' };
const TIPO_ICON = { pregunta: 'help', codigo: 'qr_code_2', voz: 'mic' };

const feedbackStyle = {
  ok: 'bg-[#0e0b21] border-[#00eefc]/60 text-[#7df4ff]',
  info: 'bg-[#1c192f] border-white/20 text-[#e5defe]',
  error: 'bg-[#3e001a]/95 border-[#ff027f]/60 text-[#ffdad6]',
};
const feedbackIcon = { ok: 'check_circle', info: 'info', error: 'error' };

/**
 * Sprint 3 — Pantalla de juego: un desafío a la vez (pregunta, código QR o voz), validado en el
 * servidor, con pistas base progresivas, barra de progreso y cuenta regresiva (total y por desafío).
 * La experiencia y la participación vienen de ParticipationContext; los desafíos, de ChallengeContext.
 *
 * @param {{
 *   onBack: () => void,
 *   onConclude?: () => void,
 *   onAbandon?: () => void,
 *   onOpenAssistant?: () => void,
 * }} props
 */
export const ScannerScreen = ({ onBack, onConclude, onAbandon, onOpenAssistant }) => {
  const {
    selectedExperience: experience,
    active,
    remainingMs,
    expiredInfo,
    dismissExpired,
    setScannerVisible,
  } = useParticipation();
  const {
    desafios, desafioActual, indiceActual, completo, resueltos, total, pistasEntregadas, pistasTotal,
    restanteDesafioMs, desafioExcedido, busy, hintBusy, bloqueado, submit, requestHint,
  } = useChallenge();

  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const feedbackTimer = useRef(null);

  // Le avisa al contexto que el escáner está en pantalla: solo así se muestra el modal al expirar.
  useEffect(() => {
    setScannerVisible(true);
    return () => setScannerVisible(false);
  }, [setScannerVisible]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const tiempoAgotado = !active && !!expiredInfo;

  const showFeedback = (type, text) => {
    setFeedback({ type: type === 'warn' ? 'info' : type, text });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
  };

  /** ESC04 / ESC07 — envía la respuesta y muestra el resultado de inmediato. */
  const handleAnswer = async (respuesta, via) => {
    if (bloqueado) return null;
    const r = await submit(respuesta, via);
    if (r) showFeedback(r.type, r.text);
    return r;
  };

  /** ESC03 — un QR leído se valida como respuesta del desafío activo (solo tipo «código»). */
  const handleQrDetect = async (raw) => {
    const codigo = parseScanPayload(raw);
    if (!codigo) return;
    const r = await handleAnswer(codigo, 'qr');
    if (r) setScanning(false); // se cierra la cámara para que se vea el resultado
  };

  const handleHint = async () => {
    const r = await requestHint();
    if (r.type === 'ok') showFeedback('ok', `Pista ${r.indice} de ${r.total} desbloqueada.`);
    else showFeedback(r.type, r.text);
  };

  // Cierre del modal de tiempo agotado (botón, X, fondo o Escape): limpia y vuelve a Experiencias.
  const handleExpiredClose = () => {
    setScanning(false);
    dismissExpired();
    onBack();
  };

  const expiredModal = (
    <InfoModal
      isOpen={!!expiredInfo}
      type="info"
      title="¡Se acabó el tiempo!"
      message={`El tiempo de «${expiredInfo?.experienciaNombre || 'la experiencia'}» terminó y la experiencia se marcó como expirada. Podés iniciar otra o volver a intentarlo.`}
      primaryLabel="Volver a Experiencias"
      onPrimary={handleExpiredClose}
      onClose={handleExpiredClose}
      icon="timer_off"
    />
  );

  // Con participación en curso se pide confirmación; sin ella se vuelve directo.
  const handleBackClick = () => {
    if (active) setConfirmLeave(true);
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
          Elegí una de la lista y tocá «Iniciar desafío» para comenzar.
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

  const urgente = remainingMs !== null && remainingMs < 2 * 60 * 1000;
  const entregadas = pistasEntregadas;
  const cantBase = pistasTotal;
  const sinPistasBase = cantBase === 0;
  const pistasAgotadas = typeof cantBase === 'number' && cantBase > 0 && entregadas.length >= cantBase;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-40 gap-4">
      {/* ESC01 — Experiencia + cuenta regresiva total (ESC11) */}
      <section className="rounded-2xl bg-[#1c192f] border border-[#00eefc]/25 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-headline-md text-[20px] font-bold text-[#e5defe] leading-tight">{experience.nombre}</h1>
          {remainingMs !== null && (
            <div
              role="timer"
              aria-label="Tiempo restante"
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-label-code text-[13px] font-bold ${
                urgente
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
      </section>

      {/* ESC09 — Progreso */}
      <ProgressBar value={resueltos} total={total} label="Desafíos resueltos" />

      {/* ESC07 — Feedback inmediato */}
      <div role="status" aria-live="polite" className="min-h-[44px]">
        {feedback && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] ${feedbackStyle[feedback.type]}`}>
            <span className="material-symbols-outlined text-[20px]">{feedbackIcon[feedback.type]}</span>
            <span className="flex-1">{feedback.text}</span>
          </div>
        )}
      </div>

      {/* ESC05 — Un desafío a la vez, en orden secuencial */}
      <section className="flex flex-col gap-3">
        {desafios.length === 0 && (
          <div className="p-4 rounded-xl bg-[#1c192f] border border-white/10 text-[13px] text-[#c9c5d0]">
            El staff todavía no cargó desafíos para esta experiencia. Consultá en el stand.
          </div>
        )}

        {desafios.slice(0, Math.max(0, indiceActual === -1 ? desafios.length : indiceActual)).map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 text-[12px] text-[#7df4ff]">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span className="truncate">{i + 1}. {r.titulo}</span>
          </div>
        ))}

        {desafioActual && (
          <div className="p-4 rounded-xl bg-[#1c192f] border border-[#00eefc]/50 shadow-[0_0_16px_rgba(0,238,252,0.2)] flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-[#00eefc] text-[#002022] flex items-center justify-center text-[13px] font-bold shrink-0">
                {indiceActual + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-label-code text-[11px] text-[#00eefc] uppercase tracking-wider">
                    Desafío {indiceActual + 1} de {total}
                  </p>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#0e0b21] border border-[#00eefc]/30 text-[10px] text-[#00eefc] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">{TIPO_ICON[desafioActual.tipoValidacion]}</span>
                    {TIPO_LABEL[desafioActual.tipoValidacion]}
                  </span>
                </div>
                <p className="text-[15px] font-semibold text-[#e5defe]">{desafioActual.titulo}</p>
                <p className="text-[13px] text-[#c9c5d0] leading-snug mt-0.5">
                  {desafioActual.descripcion || 'Resolvé el desafío para avanzar al siguiente.'}
                </p>
              </div>
            </div>

            {restanteDesafioMs !== null && (
              <p className={`text-[12px] flex items-center gap-1 ${desafioExcedido ? 'text-[#ffb1c4]' : 'text-[#c9c5d0]'}`}>
                <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                {desafioExcedido
                  ? 'Superaste el tiempo previsto para este desafío. Podés seguir mientras quede tiempo total.'
                  : `Tiempo previsto para este desafío: ${formatTime(restanteDesafioMs)}`}
              </p>
            )}

            {entregadas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {entregadas.map((p, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-[#0e0b21] border border-[#ff027f]/30 text-[13px] text-[#e5defe] flex gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#ff027f] mt-0.5">lightbulb</span>
                    <span><strong className="text-[#ffb1c4]">Pista {i + 1}:</strong> {p}</span>
                  </div>
                ))}
              </div>
            )}

            <ChallengeAnswer
              key={desafioActual.id}
              desafio={desafioActual}
              disabled={bloqueado}
              busy={busy}
              onSubmit={handleAnswer}
              onScan={() => setScanning(true)}
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleHint}
                disabled={bloqueado || hintBusy || sinPistasBase || pistasAgotadas}
                className="flex-1 h-11 rounded-lg border border-[#ff027f]/40 text-[#ffb1c4] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                {sinPistasBase
                  ? 'Sin pistas base'
                  : pistasAgotadas
                  ? 'Pistas agotadas'
                  : `Pedir pista${typeof cantBase === 'number' ? ` (${entregadas.length}/${cantBase})` : ''}`}
              </button>
              {onOpenAssistant && (
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  disabled={bloqueado}
                  className="flex-1 h-11 rounded-lg bg-[#2a273e] text-[#e5defe] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                  Asistente IA
                </button>
              )}
            </div>
          </div>
        )}

        {completo && (
          <div className="p-4 rounded-xl bg-[#0e0b21] border border-[#00eefc]/40 text-[13px] text-[#7df4ff] flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">military_tech</span>
            ¡Experiencia completada! Ya podés concluirla.
          </div>
        )}
      </section>

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

      {scanning && !bloqueado && desafioActual?.tipoValidacion === 'codigo' && (
        <QrScanner onDetect={handleQrDetect} onClose={() => setScanning(false)} />
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