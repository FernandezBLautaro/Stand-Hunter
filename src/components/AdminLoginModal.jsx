import AdminExperiencesScreen from '../screens/admin/AdminExperiencesScreen.jsx';

/**
 * Overlay a pantalla completa para la consola de staff.
 * El login (PIN) y el panel viven en AdminExperiencesScreen: un solo flujo de admin.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export const AdminLoginModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#131027]">
      <AdminExperiencesScreen onClose={onClose} />
    </div>
  );
};
