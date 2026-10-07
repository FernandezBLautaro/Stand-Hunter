const ICONOS = [
  [/cienc/i, 'science'],
  [/espion|secreto|infiltr/i, 'visibility_off'],
  [/fantas|magia/i, 'auto_awesome'],
  [/tecno|digital|cripto/i, 'memory'],
  [/aventur|explor/i, 'explore'],
  [/miste|terror|detect/i, 'search'],
];

const iconoPara = (nombre) => ICONOS.find(([re]) => re.test(nombre))?.[1] ?? 'sell';

/**
 * VIS05 — Selector visual de temáticas. Reemplaza al <select> de ExperiencesScreen.
 *
 * @param {{
 *   tematicas: { nombre: string, cantidad: number }[],
 *   total: number,
 *   value: string,
 *   onChange: (tematica: string) => void,
 * }} props
 */
export const ThemeSelector = ({ tematicas, total, value, onChange }) => {
  if (tematicas.length === 0) return null;

  const items = [{ nombre: 'todas', etiqueta: 'Todas', cantidad: total, icono: 'apps' }].concat(
    tematicas.map((t) => ({ ...t, etiqueta: t.nombre, icono: iconoPara(t.nombre) }))
  );

  return (
    <div className="mb-4">
      <p className="font-label-code text-[11px] text-[#c9c5d0] mb-2">Elegí una temática</p>
      <div className="flex gap-2.5 overflow-x-auto pb-1" role="radiogroup" aria-label="Temática">
        {items.map((item) => {
          const active = value === item.nombre;
          return (
            <button
              key={item.nombre}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(item.nombre)}
              className={`shrink-0 w-24 p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'bg-[#1a1442] border-[#00eefc] text-[#00eefc] shadow-[0_0_14px_rgba(0,238,252,0.3)]'
                  : 'bg-[#1c192f] border-white/10 text-[#c9c5d0] hover:border-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">{item.icono}</span>
              <span className="text-[12px] font-semibold leading-tight text-center truncate max-w-full">
                {item.etiqueta}
              </span>
              <span className="text-[10px] opacity-70">
                {item.cantidad} {item.cantidad === 1 ? 'experiencia' : 'experiencias'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
