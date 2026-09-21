const navItems = [
  { id: 'misiones', label: 'Misiones', icon: 'explore', availableInSprint1: true },
  { id: 'escaner-ar', label: 'Escáner AR', icon: 'center_focus_strong', availableInSprint1: false },
  { id: 'asistente-ia', label: 'Asistente IA', icon: 'smart_toy', availableInSprint1: false },
  { id: 'recompensas', label: 'Recompensas', icon: 'military_tech', availableInSprint1: false },
];

/**
 * @param {{
 *   activeTab: import('../types.js').ActiveTab,
 *   onSelectTab: (tab: import('../types.js').ActiveTab) => void,
 *   unclaimedRewards?: boolean,
 * }} props
 */
export const BottomNavigation = ({ activeTab, onSelectTab, unclaimedRewards = false }) => {
  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#131027]/90 backdrop-blur-xl border-t border-[#00eefc]/15 shadow-[0_-1px_16px_rgba(0,0,0,0.45)]">
      <div className="h-20 max-w-lg mx-auto px-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          // Sprint 1: escáner AR, asistente IA y recompensas llegan en sprints
          // posteriores (2, 3 y 5). Se muestran bloqueados en vez de rotos.
          const isLocked = !item.availableInSprint1;

          return (
            <button
              key={item.id}
              onClick={() => !isLocked && onSelectTab(item.id)}
              disabled={isLocked}
              title={isLocked ? 'Disponible en un sprint posterior' : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-[68px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative ${
                isLocked
                  ? 'text-[#c9c5d0]/35 cursor-not-allowed'
                  : isActive
                  ? 'text-[#00eefc] bg-[#2a273e]/70 shadow-[0_0_16px_rgba(0,238,252,0.3)] border border-[#00eefc]/40 font-semibold cursor-pointer'
                  : 'text-[#c9c5d0] hover:text-[#e5defe] hover:bg-[#201d33]/40 cursor-pointer'
              }`}
            >
              {item.id === 'recompensas' && unclaimedRewards && !isLocked && (
                <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-[#ff027f] animate-ping" />
              )}
              {isLocked && (
                <span className="material-symbols-outlined absolute top-0 right-2 text-[12px] text-[#c9c5d0]/60">
                  lock
                </span>
              )}
              <span
                className="material-symbols-outlined text-[24px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-label-md text-[11px] truncate tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
