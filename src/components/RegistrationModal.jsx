import { useState } from 'react';
import {
  registerUser, loginUser, logoutUser, resetPassword, describeAuthError,
} from '../services/authService.js';

const randomAliases = [
  'CyberHunter_99', 'Nexus_Phantom', 'Neo_Specter', 'Quantum_Rider',
  'Echo_Scout', 'Aura_Coder', 'Valkyrie_Zero', 'Vortex_Agent',
];

const inputCls =
  'w-full h-12 bg-[#0e0b21] border border-white/10 rounded-xl pl-10 pr-3 text-[#e5defe] placeholder-[#c9c5d0]/50 text-[14px] focus:outline-none focus:border-[#00eefc] transition-all';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   user: import('firebase/auth').User | null,
 *   profile: any,
 *   isAdmin: boolean,
 *   onOpenAdmin: () => void,
 *   onLogout: () => void,
 * }} props
 */
export const RegistrationModal = ({ isOpen, onClose, onCancel, user, profile, isAdmin, onOpenAdmin, onLogout }) => {
  const [mode, setMode] = useState('register');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (mode === 'register' && !nickname.trim()) {
      setErrorMsg('Ingresá un nombre o alias.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await registerUser({ nickname: nickname.trim(), email, password });
      } else {
        await loginUser({ email, password });
      }
      setPassword('');
      onClose();
    } catch (err) {
      setErrorMsg(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim()) {
      setErrorMsg('Escribí tu email arriba para enviarte el enlace.');
      return;
    }
    try {
      await resetPassword(email);
      setInfoMsg('Te enviamos un email para restablecer la contraseña.');
    } catch (err) {
      setErrorMsg(describeAuthError(err));
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout?.();
    onClose();
  };

  const shell = (children) => (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0e0b21]/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#131027] border border-[#00eefc]/30 p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden my-6">
        <button
          type="button"
          onClick={onCancel ?? onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 material-symbols-outlined text-[#c9c5d0] hover:text-[#e5defe] cursor-pointer"
        >
          close
        </button>
        {children}
      </div>
    </div>
  );

  /* ---------- Sesión iniciada ---------- */
  if (user) {
    return shell(
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 pr-8">
          <div className="w-14 h-14 rounded-xl bg-[#1a1442] border border-[#00eefc]/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[#00eefc]">shield_person</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-md text-[20px] font-bold text-[#e5defe] truncate">
              {profile?.nombre ?? user.displayName ?? 'Agente'}
            </h2>
            <p className="text-[12px] text-[#c9c5d0] truncate">{user.email}</p>
            <span className="font-label-code text-[10px] text-[#7df4ff] uppercase tracking-wider">
              {isAdmin ? 'Administrador' : 'Jugador'}
            </span>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => { onClose(); onOpenAdmin(); }}
            className="w-full h-12 rounded-xl bg-[#00eefc] text-[#002022] font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            Abrir panel de staff
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-12 rounded-xl border border-white/15 text-[#e5defe] font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Cerrar sesión
        </button>
      </div>
    );
  }

  /* ---------- Registro / Login ---------- */
  return shell(
    <>
      <div className="flex gap-1 bg-[#0e0b21] p-1 rounded-xl mb-4 mr-8">
        {[
          { id: 'register', label: 'Crear cuenta' },
          { id: 'login', label: 'Ya tengo cuenta' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setMode(t.id); setErrorMsg(''); setInfoMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-[13px] cursor-pointer ${mode === t.id ? 'bg-[#00eefc] text-[#002022] font-bold' : 'text-[#c9c5d0]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-[#93000a]/60 border border-[#ffb4ab]/40 text-[#ffdad6] text-xs">{errorMsg}</div>
      )}
      {infoMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-[#0e0b21] border border-[#00eefc]/40 text-[#7df4ff] text-xs">{infoMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-[11px] text-[#00eefc] uppercase font-semibold tracking-wider block mb-1">
              Nombre o nickname *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#c9c5d0] material-symbols-outlined text-[18px]">alternate_email</span>
              <input
                type="text" required maxLength={40} value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej. CyberHunter_99"
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => setNickname(randomAliases[Math.floor(Math.random() * randomAliases.length)])}
              className="mt-1 text-[#00eefc] text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">shuffle</span>
              Generar alias aleatorio
            </button>
          </div>
        )}

        <div>
          <label className="text-[11px] text-[#00eefc] uppercase font-semibold tracking-wider block mb-1">Email *</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[#c9c5d0] material-symbols-outlined text-[18px]">mail</span>
            <input
              type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@ejemplo.com"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#00eefc] uppercase font-semibold tracking-wider block mb-1">Contraseña *</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[#c9c5d0] material-symbols-outlined text-[18px]">lock</span>
            <input
              type="password" required minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inputCls}
            />
          </div>
          {mode === 'login' && (
            <button type="button" onClick={handleReset} className="mt-1 text-[#c9c5d0] text-[11px] hover:underline cursor-pointer">
              Olvidé mi contraseña
            </button>
          )}
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#ff027f] text-white font-bold tracking-wide uppercase flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,2,127,0.55)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">bolt</span>
          {submitting ? 'Procesando…' : mode === 'register' ? 'Crear cuenta y entrar' : 'Ingresar'}
        </button>
      </form>
    </>
  );
};