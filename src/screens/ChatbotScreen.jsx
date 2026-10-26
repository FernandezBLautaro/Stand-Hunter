import { useCallback, useEffect, useRef, useState } from 'react';
import { useParticipation } from '../context/ParticipationContext.jsx';
import { useChallenge } from '../context/ChallengeContext.jsx';
import { subscribeTodosElementos, normalizeCode } from '../services/elementosService.js';
import { askHint, loadChat, saveChat, MAX_CONSULTAS } from '../services/chatbotService.js';
import { logChatQuery } from '../services/challengeService.js';
import { useSpeechRecognition, describeSpeechError } from '../hooks/useSpeechRecognition.js';

const formatTime = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const PREGUNTAS_RAPIDAS = [
  '¿Me das una pista sobre este desafío?',
  'No entiendo la consigna',
];

let msgSeq = 0;
const newMsg = (role, text, extra = {}) => ({ id: `m${Date.now()}-${msgSeq++}`, role, text, ...extra });

/**
 * ESC06 — Chatbot de asistencia (Firebase AI Logic + Gemini Developer API).
 * Orienta sin revelar la respuesta: el modelo nunca recibe los criterios de validación.
 * Si el servicio de IA falla, ofrece la pista base del desafío y el participante sigue jugando.
 *
 * @param {{ onBack: () => void, onGoToScanner: () => void }} props
 */
export const ChatbotScreen = ({ onBack, onGoToScanner }) => {
  const { selectedExperience: experience, active, remainingMs } = useParticipation();
  const { desafioActual, indiceActual, total, completo, pistasEntregadas, restanteDesafioMs, requestHint, hintBusy, bloqueado } =
    useChallenge();

  const [elementos, setElementos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const speech = useSpeechRecognition();

  const key = active && desafioActual ? `${active.id}:${desafioActual.id}` : null;
  const keyRef = useRef(key);
  keyRef.current = key;

  // Los elementos son globales: un mismo elemento puede servir a desafíos de distintas experiencias.
  useEffect(() => subscribeTodosElementos(setElementos, () => {}), []);

  // Restaura la conversación de este desafío (o la limpia al cambiar de desafío).
  useEffect(() => {
    setMessages(key ? loadChat(key) : []);
  }, [key]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const append = useCallback((k, msg) => {
    const next = [...loadChat(k), msg];
    saveChat(k, next);
    if (keyRef.current === k) setMessages(next);
  }, []);

  const consultas = messages.filter((m) => m.role === 'user' && !m.local).length;
  const limite = consultas >= MAX_CONSULTAS;
  const deshabilitado = bloqueado || sending;

  const ubicacion = desafioActual?.elementoFisicoId
    ? elementos.find((e) => e.codigoIdentificador === normalizeCode(desafioActual.elementoFisicoId))?.ubicacion ?? ''
    : '';

  const send = async (raw) => {
    const text = String(raw ?? '').trim();
    if (!text || deshabilitado || !key || !desafioActual) return;
    if (limite) {
      append(key, newMsg('sys', 'Llegaste al máximo de consultas para este desafío. Probá con una pista base.', { local: true }));
      return;
    }
    const k = key;
    const historial = loadChat(k);
    append(k, newMsg('user', text));
    setInput('');
    setSending(true);
    try {
      const reply = await askHint({
        experiencia: experience,
        desafio: desafioActual,
        ubicacion,
        pistasBase: pistasEntregadas,
        messages: historial,
        text,
      });
      append(k, newMsg('ai', reply));
      logChatQuery({
        participacionId: active.id,
        desafioId: desafioActual.id,
        pregunta: text,
      }).catch(() => {});
    } catch {
      append(k, newMsg('sys', 'No pude conectarme con el asistente. Te muestro la pista del desafío.', { local: true }));
      const fb = await requestHint();
      append(
        k,
        newMsg(
          'ai',
          fb.type === 'ok' ? `Pista ${fb.indice} de ${fb.total}: ${fb.pista}` : `${fb.text} Seguí explorando el stand y probá de nuevo en un rato.`,
          { local: true }
        )
      );
    } finally {
      setSending(false);
    }
  };

  const sendBaseHint = async () => {
    if (!key || deshabilitado || hintBusy) return;
    const k = key;
    append(k, newMsg('user', 'Quiero una pista oficial', { local: true }));
    const r = await requestHint();
    append(k, newMsg('ai', r.type === 'ok' ? `Pista ${r.indice} de ${r.total}: ${r.pista}` : r.text, { local: true }));
  };

  const showTime = () => {
    if (!key) return;
    append(key, newMsg('user', 'Ver tiempo restante', { local: true }));
    const parts = [`Te quedan ${formatTime(remainingMs ?? 0)} en total`];
    if (restanteDesafioMs !== null) parts.push(`y ${formatTime(restanteDesafioMs)} previstos para este desafío`);
    append(key, newMsg('ai', `${parts.join(' ')}.`, { local: true }));
  };

  const toggleMic = () => {
    if (deshabilitado) return;
    if (speech.listening) speech.stop();
    else speech.start((t) => setInput(t));
  };

  /* ---------- Estados vacíos ---------- */
  if (!experience || !active) {
    return (
      <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto px-4 pt-24 min-h-[70vh]">
        <div className="w-16 h-16 rounded-full bg-[#1c192f] border border-[#00eefc]/30 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[28px] text-[#00eefc]">smart_toy</span>
        </div>
        <h2 className="font-headline-md text-[20px] font-bold text-[#e5defe] mb-1">El asistente te espera en juego</h2>
        <p className="text-[13px] text-[#c9c5d0] max-w-xs mb-6">
          Iniciá una experiencia para pedirle pistas al asistente IA mientras resolvés los desafíos.
        </p>
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl bg-[#00eefc] text-[#002022] font-headline-sm text-[13px] font-bold cursor-pointer">
          Ver experiencias
        </button>
      </div>
    );
  }

  if (completo || !desafioActual) {
    return (
      <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto px-4 pt-24 min-h-[70vh]">
        <span className="material-symbols-outlined text-[40px] text-[#00eefc] mb-3">military_tech</span>
        <h2 className="font-headline-md text-[20px] font-bold text-[#e5defe] mb-1">¡No necesitás más pistas!</h2>
        <p className="text-[13px] text-[#c9c5d0] max-w-xs mb-6">Resolviste todos los desafíos de esta experiencia.</p>
        <button type="button" onClick={onGoToScanner} className="px-4 py-2 rounded-xl bg-[#00eefc] text-[#002022] font-headline-sm text-[13px] font-bold cursor-pointer">
          Volver al juego
        </button>
      </div>
    );
  }

  const saludo = newMsg('ai', `Soy Hunter, tu asistente. Preguntame lo que necesites sobre «${desafioActual.titulo}». No te voy a dar la respuesta, pero sí te oriento.`, { local: true });
  const view = [{ ...saludo, id: 'saludo' }, ...messages];
  const urgente = remainingMs !== null && remainingMs < 2 * 60 * 1000;
  const speechNotice = describeSpeechError(speech.error);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 h-[calc(100dvh-9rem)]">
      {/* Objetivo + temporizador siempre visibles */}
      <div className="rounded-xl bg-[#1c192f] border border-[#00eefc]/25 p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label-code text-[10px] text-[#00eefc] uppercase tracking-wider">
            Desafío {indiceActual + 1} de {total}
          </p>
          <p className="text-[14px] font-semibold text-[#e5defe] truncate">{desafioActual.titulo}</p>
        </div>
        {remainingMs !== null && (
          <div
            role="timer"
            aria-label="Tiempo restante"
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border font-label-code text-[12px] font-bold ${
              urgente ? 'bg-[#3e001a] border-[#ff027f]/60 text-[#ff027f] animate-pulse' : 'bg-[#0e0b21] border-[#00eefc]/30 text-[#7df4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">timer</span>
            {formatTime(remainingMs)}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#c9c5d0]/80 mt-2 flex items-start gap-1">
        <span className="material-symbols-outlined text-[14px] text-[#ffb1c4]">warning</span>
        Las consultas al asistente quedan registradas y podrán restar puntos de tu marcador.
      </p>

      {/* Conversación */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5" aria-live="polite">
        {view.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[#00eefc] text-[#002022] px-3.5 py-2 text-[14px]'
                : m.role === 'sys'
                ? 'self-center max-w-[90%] rounded-lg bg-[#3e001a]/80 border border-[#ff027f]/40 text-[#ffdad6] px-3 py-1.5 text-[12px]'
                : 'self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-[#1a1442] border border-white/10 text-[#e5defe] px-3.5 py-2 text-[14px]'
            }
          >
            <span className="whitespace-pre-wrap">{m.text}</span>
          </div>
        ))}
        {sending && (
          <div className="self-start flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#1a1442] border border-white/10 px-3.5 py-3" aria-label="El asistente está pensando">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#00eefc] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Opciones rápidas */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PREGUNTAS_RAPIDAS.map((q) => (
          <button key={q} type="button" onClick={() => send(q)} disabled={deshabilitado}
            className="shrink-0 px-3 py-1.5 rounded-full border border-[#00eefc]/40 text-[#7df4ff] text-[12px] cursor-pointer disabled:opacity-40">
            {q}
          </button>
        ))}
        {desafioActual.tipoValidacion === 'codigo' && (
          <button type="button" onClick={() => send('¿Dónde busco el elemento?')} disabled={deshabilitado}
            className="shrink-0 px-3 py-1.5 rounded-full border border-[#00eefc]/40 text-[#7df4ff] text-[12px] cursor-pointer disabled:opacity-40">
            ¿Dónde busco el elemento?
          </button>
        )}
        <button type="button" onClick={sendBaseHint} disabled={deshabilitado || hintBusy}
          className="shrink-0 px-3 py-1.5 rounded-full border border-[#ff027f]/40 text-[#ffb1c4] text-[12px] cursor-pointer disabled:opacity-40">
          Pista oficial del staff
        </button>
        <button type="button" onClick={showTime} disabled={bloqueado}
          className="shrink-0 px-3 py-1.5 rounded-full border border-white/15 text-[#c9c5d0] text-[12px] cursor-pointer disabled:opacity-40">
          Ver tiempo restante
        </button>
      </div>

      {speechNotice && <p role="alert" className="text-[12px] text-[#ffb1c4] pb-1">{speechNotice}</p>}

      {/* Entrada de texto y voz */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 pb-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={speech.listening ? speech.interim : input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={300}
            disabled={bloqueado}
            placeholder={speech.listening ? 'Escuchando…' : 'Escribí tu consulta'}
            aria-label="Consulta al asistente"
            className="w-full h-12 bg-[#0e0b21] border border-white/10 rounded-xl pl-3 pr-11 text-[14px] text-[#e5defe] placeholder-[#c9c5d0]/50 focus:outline-none focus:border-[#00eefc] disabled:opacity-40"
          />
          {speech.supported && (
            <button type="button" onClick={toggleMic} disabled={deshabilitado} aria-label={speech.listening ? 'Detener dictado' : 'Dictar consulta'}
              className={`absolute right-1.5 top-1.5 w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-40 ${speech.listening ? 'text-[#00eefc] animate-pulse' : 'text-[#ff027f]'}`}>
              <span className="material-symbols-outlined text-[22px]">{speech.listening ? 'graphic_eq' : 'mic'}</span>
            </button>
          )}
        </div>
        <button type="submit" disabled={deshabilitado || !input.trim()} aria-label="Enviar consulta"
          className="w-12 h-12 rounded-xl bg-[#00eefc] text-[#002022] flex items-center justify-center cursor-pointer disabled:opacity-40">
          <span className="material-symbols-outlined text-[22px]">send</span>
        </button>
      </form>
    </div>
  );
};