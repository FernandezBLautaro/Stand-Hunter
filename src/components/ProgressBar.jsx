/**
 * ESC09 — Barra de progreso del desafío.
 * @param {{ value: number, total: number, label?: string }} props
 */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const ProgressBar = ({ value, total, label = 'Pistas encontradas' }) => {
  const safeTotal = Math.max(0, Math.round(total));
  const safeValue = clamp(Math.round(value), 0, safeTotal);
  const pct = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0;
  const done = safeTotal > 0 && safeValue >= safeTotal;

  const segments = Array.from({ length: safeTotal }, (_, i) => i < safeValue);

  const counterClass = done
    ? 'text-[#00eefc] font-bold'
    : 'text-[#e5defe] font-semibold';

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-4 pt-6 bg-gradient-to-t from-[#0d0b16] via-[#0d0b16]/85 to-transparent pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="flex items-center justify-between mb-1.5 font-label-code text-[11px]">
          <span className="text-[#c9c5d0]">{label}</span>
          <span className={counterClass}>
            {safeValue} / {safeTotal} · {pct}%
          </span>
        </div>

        {/* Contenedor accesible con el valor total */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={safeTotal}
          aria-valuenow={safeValue}
          aria-label={label}
          className="h-2.5 flex gap-1"
        >
          {segments.map((filled, i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-[3px] transition-all duration-500 ${
                filled
                  ? done
                    ? 'bg-[#00eefc] shadow-[0_0_10px_#00eefc]'
                    : 'bg-[#00eefc]/90'
                  : 'bg-[#35324a]/70'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};