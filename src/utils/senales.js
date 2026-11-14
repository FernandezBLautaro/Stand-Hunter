// ESC10 — Señales sonoras y hápticas. 
let ctx;

const tono = (hz, ms, tipo = 'sine', delay = 0, vol = 0.15) => {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume?.();
    const t = ctx.currentTime + delay / 1000;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.value = hz;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000); // decae suave, sin "clic" al cortar
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + ms / 1000);
  } catch { /* sin audio: queda la señal visual */ }
};

const vibrar = (patron) => {
  try { navigator.vibrate?.(patron); } catch { /* sin vibración */ }
};

/** 'ok' → campanita ascendente (do-mi-sol); 'error' → chicharra (dos zumbidos graves). Otros tipos no emiten señal. */
export const senal = (tipo) => {
  if (tipo === 'ok') {
    tono(523, 160, 'sine', 0);
    tono(659, 160, 'sine', 120);
    tono(784, 300, 'sine', 240);
    vibrar(80);
  } else if (tipo === 'error') {
    tono(130, 260, 'sawtooth', 0, 0.2);
    tono(130, 260, 'sawtooth', 300, 0.2);
    vibrar([100, 50, 100]);
  }
};