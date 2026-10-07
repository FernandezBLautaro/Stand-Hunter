import { useEffect, useRef, useState } from 'react';
import {
  watchTags, writeNfcRecords, eraseNfcTag, lockNfcTag, canLockNfc, describeNfcError,
  textRecord, urlRecord, mimeRecord, buildTagUrl,
} from '../services/nfc.js';
import { parseCapturedCode, buildQrPayload } from '../services/elementosService.js';

const TABS = [
  { id: 'leer', label: 'Leer', icono: 'nfc' },
  { id: 'escribir', label: 'Escribir', icono: 'edit_note' },
  { id: 'otros', label: 'Otros', icono: 'tune' },
];

const KINDS = [
  { id: 'text', label: 'Texto' },
  { id: 'url', label: 'URL' },
  { id: 'mime', label: 'MIME' },
];

const inputCls =
  'w-full h-11 bg-[#0e0b21] rounded-lg px-3 text-[#e5defe] text-[13px] placeholder-[#c9c5d0]/50 border border-white/10 focus:outline-none focus:border-[#00eefc]';

const STATUS_STYLE = {
  info: 'bg-[#1c192f] border-white/20 text-[#e5defe]',
  ok: 'bg-[#0e0b21] border-[#00eefc]/60 text-[#7df4ff]',
  error: 'bg-[#3e001a]/95 border-[#ff027f]/60 text-[#ffdad6]',
};

let rowSeq = 0;
const newRow = (kind, value = '', mediaType = 'application/json') => ({ id: ++rowSeq, kind, value, mediaType });

/**
 * Herramientas NFC para el staff, equivalentes a las pestañas de NFC Tools:
 * Leer (serie + registros), Escribir (varios registros), Otros (borrar / bloquear).
 *
 * @param {{
 *   codigo?: string,                       código identificador del elemento (para los atajos de escritura)
 *   onPickCode?: (codigo: string) => void, si se pasa, la lectura ofrece "Usar como código del elemento"
 *   onClose: () => void,
 * }} props
 */
export const NfcToolsModal = ({ codigo = '', onPickCode, onClose }) => {
  const [tab, setTab] = useState(onPickCode ? 'leer' : codigo ? 'escribir' : 'leer');
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState(null);
  const [tag, setTag] = useState(null);
  const [rows, setRows] = useState(() => (codigo ? [newRow('url', buildTagUrl(codigo))] : []));
  const [confirm, setConfirm] = useState(null); // 'erase' | 'lock'
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const changeTab = (id) => {
    controllerRef.current?.abort();
    setStatus(null);
    setConfirm(null);
    setTab(id);
  };

  /** Ejecuta una operación NFC cancelable y refleja su estado en pantalla. */
  const run = async (mode, task, okText) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(mode);
    setConfirm(null);
    setStatus({ type: 'info', text: 'Acercá el tag al teléfono y mantenelo quieto…' });
    try {
      await task(controller.signal);
      setStatus({ type: 'ok', text: okText });
    } catch (err) {
      if (controller.signal.aborted) setStatus(null);
      else setStatus({ type: 'error', text: describeNfcError(err) });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(null);
      }
    }
  };

  const cancel = () => controllerRef.current?.abort();

  /* ---------- Leer ---------- */
  const read = () =>
    run(
      'read',
      (signal) =>
        new Promise((resolve, reject) => {
          const stop = watchTags(
            (t) => {
              stop();
              setTag(t);
              resolve();
            },
            (err) => {
              stop();
              reject(err);
            }
          );
          signal.addEventListener(
            'abort',
            () => {
              stop();
              reject(new DOMException('Cancelado', 'AbortError'));
            },
            { once: true }
          );
        }),
      'Tag leído.'
    );

  const pickCode = () => {
    const code = parseCapturedCode(tag.payload || tag.serialNumber);
    if (!code) {
      setStatus({ type: 'error', text: 'El tag no contiene un código válido de StandHunter.' });
      return;
    }
    onPickCode(code);
    onClose();
  };

  /* ---------- Escribir ---------- */
  const addRow = (row) => setRows((r) => [...r, row]);
  const patchRow = (id, patch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeRow = (id) => setRows((r) => r.filter((x) => x.id !== id));

  const buildRecords = () =>
    rows.map((r, i) => {
      const value = r.value.trim();
      if (!value) throw new Error(`El registro ${i + 1} está vacío.`);
      if (r.kind === 'url') {
        try {
          new URL(value);
        } catch {
          throw new Error(`El registro ${i + 1} no es una URL válida (incluí https://).`);
        }
        return urlRecord(value);
      }
      if (r.kind === 'mime') {
        if (!/^[\w.+-]+\/[\w.+-]+$/.test(r.mediaType.trim())) {
          throw new Error(`El registro ${i + 1} tiene un tipo MIME inválido.`);
        }
        return mimeRecord(r.mediaType.trim(), value);
      }
      return textRecord(value);
    });

  const write = () => {
    let records;
    try {
      records = buildRecords();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
      return;
    }
    run('write', (signal) => writeNfcRecords(records, { overwrite: true, signal }), 'Tag grabado correctamente.');
  };

  /* ---------- Otros ---------- */
  const erase = () => {
    if (confirm !== 'erase') return setConfirm('erase');
    run('erase', (signal) => eraseNfcTag({ signal }), 'Tag borrado.');
  };
  const lock = () => {
    if (confirm !== 'lock') return setConfirm('lock');
    run('lock', (signal) => lockNfcTag({ signal }), 'Tag bloqueado en solo lectura.');
  };

  const working = busy !== null;

  return (
    <div className="fixed inset-0 z-[75] bg-[#0e0b21]/90 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#131027] border border-[#00eefc]/30 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h2 className="font-headline-sm text-[18px] font-semibold">Herramientas NFC</h2>
            <p className="text-[12px] text-[#c9c5d0]">Leer, grabar y administrar tags</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-lg bg-[#2a273e] hover:bg-[#35324a] flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-4 grid grid-cols-3 gap-1 bg-[#0e0b21] mx-4 p-1 rounded-lg" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => changeTab(t.id)}
              className={`py-2 rounded-md text-[12px] flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === t.id ? 'bg-[#00eefc] text-[#002022] font-semibold' : 'text-[#c9c5d0] hover:text-[#e5defe]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icono}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {/* ---------------- LEER ---------------- */}
          {tab === 'leer' && (
            <>
              {!tag && (
                <p className="text-[13px] text-[#c9c5d0]">
                  Tocá «Leer tag» y acercalo al teléfono. Vas a ver el número de serie y todos los registros que contiene.
                </p>
              )}

              {tag && (
                <div className="rounded-xl bg-[#1c192f] border border-white/10 p-3 flex flex-col gap-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#c9c5d0]">Número de serie</span>
                    <span className="font-label-code text-[#7df4ff]">{tag.serialNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#c9c5d0]">Registros NDEF</span>
                    <span className="text-[#e5defe]">{tag.records.length}</span>
                  </div>

                  {tag.records.length === 0 && (
                    <p className="text-[12px] text-[#ffb1c4]">El tag no tiene datos grabados.</p>
                  )}

                  {tag.records.map((r, i) => (
                    <div key={i} className="rounded-lg bg-[#0e0b21] p-2.5 border border-white/5">
                      <div className="flex justify-between text-[11px] text-[#c9c5d0]">
                        <span>{i + 1}. {r.label}</span>
                        <span>{r.size} bytes{r.lang ? ` · ${r.lang}` : ''}</span>
                      </div>
                      {r.value ? (
                        <p className="text-[13px] text-[#e5defe] break-all mt-1">{r.value}</p>
                      ) : (
                        <p className="text-[12px] text-[#c9c5d0]/60 mt-1">Sin contenido</p>
                      )}
                    </div>
                  ))}

                  {onPickCode && (
                    <button
                      type="button"
                      onClick={pickCode}
                      className="h-11 rounded-lg bg-[#00eefc] text-[#002022] text-[13px] font-bold cursor-pointer"
                    >
                      Usar como código del elemento
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={read}
                disabled={working}
                className="h-12 rounded-xl bg-[#ff027f] text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,2,127,0.5)] cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${busy === 'read' ? 'animate-pulse' : ''}`}>nfc</span>
                {busy === 'read' ? 'Esperando tag…' : tag ? 'Leer otro tag' : 'Leer tag'}
              </button>

              <p className="text-[11px] text-[#c9c5d0]/70">
                El navegador no informa el tipo de chip, la memoria ni las contraseñas; eso solo lo muestran las apps nativas.
              </p>
            </>
          )}

          {/* ---------------- ESCRIBIR ---------------- */}
          {tab === 'escribir' && (
            <>
              {codigo && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-[#c9c5d0]">Atajos para este elemento</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRows([newRow('url', buildTagUrl(codigo))])}
                      className="flex-1 h-10 rounded-lg bg-[#00eefc]/15 text-[#00eefc] text-[12px] font-semibold cursor-pointer"
                    >
                      URL de la app
                    </button>
                    <button
                      type="button"
                      onClick={() => setRows([newRow('text', buildQrPayload(codigo))])}
                      className="flex-1 h-10 rounded-lg bg-[#2a273e] text-[#e5defe] text-[12px] font-semibold cursor-pointer"
                    >
                      Texto del código
                    </button>
                  </div>
                  <p className="text-[11px] text-[#c9c5d0]/70">
                    La URL abre StandHunter al acercar el tag (también en iPhone) y el escáner la reconoce igual.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-[12px] text-[#c9c5d0]">Registros a grabar ({rows.length})</span>
                {rows.length === 0 && (
                  <p className="text-[12px] text-[#c9c5d0]/70">Todavía no agregaste registros.</p>
                )}
                {rows.map((r, i) => (
                  <div key={r.id} className="rounded-xl bg-[#1c192f] border border-white/10 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 bg-[#0e0b21] p-0.5 rounded-md">
                        {KINDS.map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            aria-pressed={r.kind === k.id}
                            onClick={() => patchRow(r.id, { kind: k.id })}
                            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
                              r.kind === k.id ? 'bg-[#00eefc] text-[#002022] font-semibold' : 'text-[#c9c5d0]'
                            }`}
                          >
                            {k.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        aria-label={`Quitar registro ${i + 1}`}
                        className="w-8 h-8 rounded-md text-[#ffb1c4] hover:text-[#ff027f] flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    {r.kind === 'mime' && (
                      <input
                        type="text"
                        value={r.mediaType}
                        onChange={(e) => patchRow(r.id, { mediaType: e.target.value })}
                        placeholder="application/json"
                        aria-label="Tipo MIME"
                        className={inputCls}
                      />
                    )}
                    <input
                      type={r.kind === 'url' ? 'url' : 'text'}
                      value={r.value}
                      onChange={(e) => patchRow(r.id, { value: e.target.value })}
                      placeholder={r.kind === 'url' ? 'https://…' : r.kind === 'mime' ? 'Contenido' : 'Texto'}
                      aria-label={`Contenido del registro ${i + 1}`}
                      className={inputCls}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRow(newRow('text'))}
                  className="h-10 rounded-lg border border-dashed border-white/20 text-[#c9c5d0] hover:text-[#e5defe] text-[13px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Agregar registro
                </button>
              </div>

              <button
                type="button"
                onClick={write}
                disabled={working || rows.length === 0}
                className="h-12 rounded-xl bg-[#ff027f] text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,2,127,0.5)] cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${busy === 'write' ? 'animate-pulse' : ''}`}>nfc</span>
                {busy === 'write' ? 'Esperando tag…' : 'Grabar en el tag'}
              </button>
              <p className="text-[11px] text-[#c9c5d0]/70">Grabar reemplaza todo lo que ya tenía el tag.</p>
            </>
          )}

          {/* ---------------- OTROS ---------------- */}
          {tab === 'otros' && (
            <>
              <div className="rounded-xl bg-[#1c192f] border border-white/10 p-3 flex flex-col gap-2">
                <h3 className="text-[14px] font-semibold">Borrar tag</h3>
                <p className="text-[12px] text-[#c9c5d0]">Elimina los datos y deja el tag listo para grabar de nuevo.</p>
                <button
                  type="button"
                  onClick={erase}
                  disabled={working}
                  className={`h-11 rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-50 ${
                    confirm === 'erase' ? 'bg-[#ff027f] text-white' : 'bg-[#2a273e] text-[#e5defe]'
                  }`}
                >
                  {busy === 'erase' ? 'Esperando tag…' : confirm === 'erase' ? 'Tocá de nuevo para borrar' : 'Borrar tag'}
                </button>
              </div>

              <div className="rounded-xl bg-[#1c192f] border border-white/10 p-3 flex flex-col gap-2">
                <h3 className="text-[14px] font-semibold">Bloquear tag</h3>
                <p className="text-[12px] text-[#ffb1c4]">
                  Lo deja en solo lectura y no se puede deshacer. Usalo cuando el tag ya esté pegado y definitivo.
                </p>
                <button
                  type="button"
                  onClick={lock}
                  disabled={working || !canLockNfc()}
                  className={`h-11 rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirm === 'lock' ? 'bg-[#ff027f] text-white' : 'bg-[#2a273e] text-[#e5defe]'
                  }`}
                >
                  {busy === 'lock' ? 'Esperando tag…' : confirm === 'lock' ? 'Tocá de nuevo para bloquear' : 'Bloquear tag'}
                </button>
                {!canLockNfc() && (
                  <p className="text-[11px] text-[#c9c5d0]/70">Tu navegador no permite bloquear tags.</p>
                )}
              </div>
            </>
          )}

          <div role="status" aria-live="polite" className="min-h-[20px]">
            {status && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] ${STATUS_STYLE[status.type]}`}>
                <span className="material-symbols-outlined text-[20px]">
                  {status.type === 'ok' ? 'check_circle' : status.type === 'error' ? 'error' : 'nfc'}
                </span>
                <span className="flex-1">{status.text}</span>
                {working && (
                  <button type="button" onClick={cancel} className="text-[12px] underline cursor-pointer">
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-1 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-white/15 text-[#c9c5d0] text-[13px] font-semibold hover:text-[#e5defe] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};