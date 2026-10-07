const ITEMS = [
  { section: 'experiencias', icono: 'local_activity', label: 'Experiencias' },
  { section: 'inventario', icono: 'inventory_2', label: 'Inventario' },
  { section: 'premios', icono: 'military_tech', label: 'Premios', pendiente: true },
  { section: 'canje', icono: 'currency_exchange', label: 'Canje', pendiente: true },
];

/**
 * Navegación inferior compartida por las pantallas del panel de staff.
 * @param {{ section: 'experiencias' | 'inventario', onNavigate: (section: string) => void }} props
 */
export const AdminBottomNav = ({ section, onNavigate }) => (
  <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#0e0b21]/85 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
    <div className="max-w-[480px] mx-auto h-16 px-1 flex items-center justify-around">
      {ITEMS.map((item) => {
        const activo = item.section === section;
        return (
          <button
            key={item.section}
            type="button"
            disabled={item.pendiente}
            onClick={() => onNavigate(item.section)}
            aria-current={activo ? 'page' : undefined}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              item.pendiente
                ? 'text-[#c9c5d0]/35 cursor-not-allowed'
                : activo
                ? 'text-[#7df4ff]'
                : 'text-[#c9c5d0] hover:text-[#e5defe] cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icono}</span>
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
