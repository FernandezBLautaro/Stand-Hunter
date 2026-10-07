import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeExperiences, describeFirestoreError } from './services/firestoreService.js';
import { subscribeSession, isAdminProfile } from './services/authService.js';
import { ParticipationProvider, useParticipation } from './context/ParticipationContext.jsx';
import { Header } from './components/Header.jsx';
import { BottomNavigation } from './components/BottomNavigation.jsx';
import { SplashScreen } from './screens/SplashScreen.jsx';
import { OnboardingScreen } from './screens/OnboardingScreen.jsx';
import { RegistrationModal } from './components/RegistrationModal.jsx';
import { ExperiencesScreen } from './screens/ExperiencesScreen.jsx';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { ComingSoonScreen } from './screens/ComingSoonScreen.jsx';
import { ScannerScreen } from './screens/ScannerScreen.jsx';
import AdminExperiencesScreen from './screens/admin/AdminExperiencesScreen.jsx';

const toApiError = (err) => ({
  message: describeFirestoreError(err),
  code: err?.code ?? 'FIRESTORE',
  isNetworkError: err?.code === 'unavailable',
});

/**
 * App: sesión + experiencias + errores. Envuelve todo en ParticipationProvider
 * (necesita user y experiences) y delega la UI en AppShell.
 */
export default function App() {
  const [session, setSession] = useState({ user: null, profile: null, ready: false });
  const [experiences, setExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => subscribeSession(setSession), []);

  const isAdmin = isAdminProfile(session.profile);

  const participant = useMemo(
    () =>
      session.user
        ? {
          id: session.user.uid,
          nickname: session.profile?.nombre ?? session.user.displayName ?? 'Agente',
          email: session.user.email ?? '',
          registered: true,
          score: session.profile?.puntaje ?? 0,
        }
        : { id: 'INVITADO', nickname: 'Invitado', email: '', registered: false, score: 0 },
    [session]
  );

  useEffect(() => {
    setLoadingExperiences(true);
    const unsubscribe = subscribeExperiences(
      (list) => {
        setExperiences(list);
        setApiError(null);
        setLoadingExperiences(false);
        setIsRetrying(false);
      },
      (err) => {
        setApiError(toApiError(err));
        setLoadingExperiences(false);
        setIsRetrying(false);
      },
      { onlyActive: true }
    );
    return unsubscribe;
  }, [retryKey]);

  // Estable a propósito: lo consumen el Provider y ScannerScreen sin re-suscribirse en cada render.
  const handleServiceError = useCallback((err) => setApiError(toApiError(err)), []);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryKey((k) => k + 1);
  };

  return (
    <ParticipationProvider
      user={session.user}
      nickname={participant.nickname}
      experiences={experiences}
      onError={handleServiceError}
    >
      <AppShell
        session={session}
        isAdmin={isAdmin}
        participant={participant}
        experiences={experiences}
        loadingExperiences={loadingExperiences}
        apiError={apiError}
        setApiError={setApiError}
        isRetrying={isRetrying}
        onRetry={handleRetry}
        onServiceError={handleServiceError}
      />
    </ParticipationProvider>
  );
}

function AppShell({
  session, isAdmin, participant, experiences, loadingExperiences,
  apiError, setApiError, isRetrying, onRetry, onServiceError,
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeTab, setActiveTab] = useState('experiencias');
  const [pendingExperience, setPendingExperience] = useState(null);

  const { active, startOrResume, conclude, abandon, reset } = useParticipation();

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setShowOnboarding(true);
  }, []);

  /* ---------- Iniciar / retomar / concluir experiencia ---------- */
  const handleStartExperience = (experience) => {
    if (!session.user) {
      // Sin cuenta: se pide registro y se retoma esta experiencia al terminar.
      setPendingExperience(experience);
      setShowProfileModal(true);
      return;
    }
    setActiveTab('escaner-ar');
    startOrResume(experience); // reanuda si ya estaba en curso y dentro de tiempo
  };

  // Cuando aparece el usuario y había una experiencia pendiente, la inicia.
  useEffect(() => {
    if (session.user && pendingExperience) {
      const exp = pendingExperience;
      setPendingExperience(null);
      setActiveTab('escaner-ar');
      startOrResume(exp);
    }
  }, [session.user, pendingExperience, startOrResume]);

  const handleConcludeExperience = async () => {
    await conclude();
    setActiveTab('experiencias');
  };

  const handleAbandonExperience = async () => {
    await abandon();
    setActiveTab('experiencias');
  };

  const handleLogout = () => {
    reset();
    setPendingExperience(null);
    setShowAdminModal(false);
    setActiveTab('experiencias');
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
        onRetry={onRetry}
        onDismiss={() => setApiError(null)}
        isRetrying={isRetrying}
      />

      <main className="flex-1 w-full pt-16 pb-20 relative">
        {showOnboarding ? (
          <OnboardingScreen
            onDismiss={() => setShowOnboarding(false)}
            onCameraGranted={() => {
              setShowOnboarding(false);
              setActiveTab('experiencias');
            }}
            isAdmin={isAdmin}
            onAdminAccess={() => setShowAdminModal(true)}
          />
        ) : (
          <>
            {activeTab === 'experiencias' && (
              <ExperiencesScreen
                experiences={experiences}
                participant={participant}
                onStartExperience={handleStartExperience}
                isLoading={loadingExperiences}
              />
            )}

            {activeTab === 'escaner-ar' && (
              <ScannerScreen
                onBack={() => setActiveTab('experiencias')}
                onConclude={active ? handleConcludeExperience : undefined}
                onAbandon={active ? handleAbandonExperience : undefined}
                onError={onServiceError}
              />
            )}

            {activeTab === 'asistente-ia' && (
              <ComingSoonScreen
                title="Chatbot de Asistencia IA"
                sprintLabel="Sprint 3"
                onBack={() => setActiveTab('experiencias')}
              />
            )}

            {activeTab === 'recompensas' && (
              <ComingSoonScreen
                title="Resultados y Recompensas"
                sprintLabel="Sprint 5"
                onBack={() => setActiveTab('experiencias')}
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
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onCancel={() => {
          setShowProfileModal(false);
          setPendingExperience(null);
        }}
        user={session.user}
        profile={session.profile}
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdminModal(true)}
        onLogout={handleLogout}
      />

      {showAdminModal && isAdmin && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#131027]">
          <AdminExperiencesScreen onClose={() => setShowAdminModal(false)} />
        </div>
      )}
    </div>
  );
}