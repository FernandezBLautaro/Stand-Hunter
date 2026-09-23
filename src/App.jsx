import { useState, useEffect, useCallback } from 'react';
import { subscribeExperiences, describeFirestoreError} from './services/firestoreService.js';
import { Header } from './components/Header.jsx';
import { BottomNavigation } from './components/BottomNavigation.jsx';
import { SplashScreen } from './screens/SplashScreen.jsx';
import { OnboardingScreen } from './screens/OnboardingScreen.jsx';
import { RegistrationModal } from './components/RegistrationModal.jsx';
import { MissionsScreen } from './screens/MissionsScreen.jsx';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { ComingSoonScreen } from './screens/ComingSoonScreen.jsx';
import { AdminLoginModal } from './components/AdminLoginModal.jsx';
import { startParticipation, finishParticipation } from './services/participationService.js';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeTab, setActiveTab] = useState('misiones');
  const [activeParticipation, setActiveParticipation] = useState(null); 

  const [participant, setParticipant] = useState({
    id: 'SH-9428',
    nickname: 'Lautaro_Agent',
    email: 'lautarofernandezb14@gmail.com',
    specialty: 'cazador',
    registered: true,
    score: 1450,
  });

  // Solo las activas llegan al participante.
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Suscripción en tiempo real: si el admin activa/desactiva una experiencia,
  // la misión aparece o desaparece al instante.
  useEffect(() => {
    setLoadingMissions(true);
    const unsubscribe = subscribeExperiences(
      (list) => {
        setMissions(list);
        setApiError(null);
        setLoadingMissions(false);
        setIsRetrying(false);
      },
      (err) => {
        setApiError({
          message: describeFirestoreError(err),
          code: err?.code ?? 'FIRESTORE',
          isNetworkError: err?.code === 'unavailable',
        });
        setLoadingMissions(false);
        setIsRetrying(false);
      },
      { onlyActive: true }
    );
    return unsubscribe;
  }, [retryKey]);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryKey((k) => k + 1);
  };

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setShowOnboarding(true);
  }, []);

  // ESC01-ESC12 (motor de escape room) llegan en Sprints posteriores.
  const handleStartMission = async (mission) => {
  setSelectedMission(mission);
  setActiveTab('escaner-ar');
  try {
      const { id, startedAtMs } = await startParticipation({
        usuarioId: participant.id,
        usuarioNickname: participant.nickname,
        experienciaId: mission.id,
        experienciaNombre: mission.nombre,
      });
      setActiveParticipation({ id, startedAtMs });
    } catch (err) {
      setApiError({
        message: describeFirestoreError(err),
        code: err?.code ?? 'FIRESTORE',
        isNetworkError: err?.code === 'unavailable',
      });
    }
};

const handleConcludeMission = async () => {
    if (activeParticipation) {
      try {
        await finishParticipation(activeParticipation.id, {
          estado: 'completada',
          startedAtMs: activeParticipation.startedAtMs,
          puntajeFinal: selectedMission?.puntos ?? null,
        });
      } catch (err) {
        setApiError({
          message: describeFirestoreError(err),
          code: err?.code ?? 'FIRESTORE',
          isNetworkError: err?.code === 'unavailable',
        });
      }
    }
    setActiveParticipation(null);
    setSelectedMission(null);
    setActiveTab('misiones');
  };

  return (
    <div className="min-h-screen bg-[#131027] text-[#e5defe] flex flex-col justify-between selection:bg-[#00eefc] selection:text-[#002022] relative overflow-x-hidden font-body-md">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <Header
        activeTab={activeTab}
        participant={participant}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <ErrorBanner
        error={apiError}
        onRetry={handleRetry}
        onDismiss={() => setApiError(null)}
        isRetrying={isRetrying}
      />

      <main className="flex-1 w-full pt-16 pb-20 relative">
        {showOnboarding ? (
          <OnboardingScreen
            onDismiss={() => setShowOnboarding(false)}
            onCameraGranted={() => {
              setShowOnboarding(false);
              setActiveTab('misiones');
            }}
            onAdminAccess={() => setShowAdminModal(true)}
          />
        ) : (
          <>
            {activeTab === 'misiones' && (
              <MissionsScreen
                missions={missions}
                participant={participant}
                onStartMission={handleStartMission}
                isLoading={loadingMissions}
              />
            )}

            {activeTab === 'escaner-ar' && (
              <ComingSoonScreen
                title={selectedMission?.nombre ?? 'Escáner de Entorno y Visor de IA'}
                sprintLabel="Sprint 2"
                onBack={() => setActiveTab('misiones')}
                onConclude={activeParticipation ? handleConcludeMission : undefined}
              />
            )}
            {activeTab === 'asistente-ia' && (
              <ComingSoonScreen
                title="Chatbot de Asistencia IA"
                sprintLabel="Sprint 3"
                onBack={() => setActiveTab('misiones')}
              />
            )}

            {activeTab === 'recompensas' && (
              <ComingSoonScreen
                title="Resultados y Recompensas"
                sprintLabel="Sprint 5"
                onBack={() => setActiveTab('misiones')}
              />
            )}
          </>
        )}
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setShowOnboarding(false);
          setActiveTab(tab);
        }}
        unclaimedRewards={false}
      />

      <RegistrationModal
        profile={participant}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSaveProfile={(updated) => setParticipant(updated)}
      />

      <AdminLoginModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </div>
  );
}
