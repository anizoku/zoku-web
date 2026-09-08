import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import { CardOverridesProvider } from '@/context/CardOverridesContext';
import { CatalogProvider } from '@/contexts/CatalogContext';
import ScrollMemory from '@/components/ScrollMemory';
import InstallBanner from '@/components/pwa/InstallBanner';
import PushPermissionPrompt from '@/components/pwa/PushPermissionPrompt';
import NotFound from '@/pages/NotFound';
import ProfileSetup from '@/pages/ProfileSetup';
import Home from '@/pages/Home';
import Trending from '@/pages/Trending';
import Animes from '@/pages/Animes';
import Mangas from '@/pages/Mangas';
import Communities from '@/pages/Communities';
import MyList from '@/pages/MyList';
import Profile from '@/pages/Profile';
import Films from '@/pages/Films';
import Friends from '@/pages/Friends';
import Events from '@/pages/Events';
import ObraProfile from '@/pages/ObraProfile';
import PublicProfile from '@/pages/PublicProfile';
import CommunityPage from '@/pages/CommunityPage';
import Series from '@/pages/Series';
import RequireAdmin from '@/components/RequireAdmin';
const Admin = lazy(() => import('@/pages/Admin'));
import Ranking from '@/pages/Ranking';
import Recommendations from '@/pages/Recommendations';
import News from '@/pages/News';
import NewsDetail from '@/pages/NewsDetail';
import Works from '@/pages/Works';
import FrozenCategory from '@/pages/FrozenCategory';
import AuthPage from '@/pages/AuthPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { useState, useEffect, lazy, Suspense } from 'react';

/**
 * Layout route que protege o app autenticado.
 * - Não autenticado → redirect para /login?returnTo=...
 * - user_not_registered → UserNotRegisteredError
 * - Profile incompleto → redirect para /profile-setup
 * - Saved returnTo (OAuth) → redirect após profile completo
 * - Caso contrário → <Outlet />
 */
const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;
    if (authError) { setProfileChecked(true); return; }
    if (!isAuthenticated) { setProfileChecked(true); return; }
    base44.auth.me().then(async (u) => {
      if (!u) { setProfileChecked(true); return; }
      if (u.profile_setup_completed) { setProfileChecked(true); setNeedsSetup(false); return; }
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
        const p = profiles[0];
        const isComplete = p?.profile_setup_completed === true || (p?.username && p?.avatar_url);
        if (isComplete && !p?.profile_setup_completed) {
          await base44.entities.UserProfile.update(p.id, { profile_setup_completed: true });
        }
        setNeedsSetup(!isComplete);
      } catch {
        setNeedsSetup(false);
      }
      setProfileChecked(true);
    }).catch(() => { setProfileChecked(true); });
  }, [isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated]);

  if (isLoadingPublicSettings || isLoadingAuth || !profileChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  // Não autenticado → redirect para /login com returnTo
  if (!isAuthenticated || (authError && authError.type === 'auth_required')) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // Usuário não registrado (app private/invite-only)
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Redirect para setup se necessário
  const currentPath = location.pathname;
  if (needsSetup && currentPath !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
  }
  if (!needsSetup && currentPath === "/profile-setup") {
    return <Navigate to="/" replace />;
  }

  // ReturnTo salvo do OAuth (após profile completo)
  if (!needsSetup) {
    const savedReturnTo = sessionStorage.getItem('auth_returnTo');
    if (savedReturnTo && savedReturnTo !== currentPath) {
      sessionStorage.removeItem('auth_returnTo');
      return <Navigate to={savedReturnTo} replace />;
    }
  }

  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CatalogProvider>
          <Router>
            <CardOverridesProvider>
              <ScrollMemory />
              <Routes>
                {/* Rotas de auth públicas */}
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/signup" element={<AuthPage mode="signup" />} />
                <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* App protegido */}
                <Route element={<AuthenticatedApp />}>
                  <Route path="/profile-setup" element={<ProfileSetup />} />
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/trending" element={<Trending />} />
                    <Route path="/animes" element={<Navigate to="/obras?categoria=anime" replace />} />
                    <Route path="/mangas" element={<FrozenCategory category="manga" />} />
                    <Route path="/films" element={<FrozenCategory category="movie" />} />
                    <Route path="/series" element={<FrozenCategory category="liveaction" />} />
                    <Route path="/communities" element={<Communities />} />
                    <Route path="/friends" element={<Friends />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/my-list" element={<MyList />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/obra/:slug" element={<ObraProfile />} />
                    <Route path="/u/:userEmail" element={<PublicProfile />} />
                    <Route path="/communities/:communityId" element={<CommunityPage />} />
                    <Route path="/obras" element={<Works />} />
                    <Route element={<RequireAdmin />}>
                      <Route path="/admin" element={
                        <Suspense fallback={
                          <div className="fixed inset-0 flex items-center justify-center bg-background">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          </div>
                        }>
                          <Admin />
                        </Suspense>
                      } />
                    </Route>
                    <Route path="/ranking" element={<Ranking />} />
                    <Route path="/recomendacoes" element={<Recommendations />} />
                    <Route path="/noticias" element={<News />} />
                    <Route path="/noticias/:slug" element={<NewsDetail />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <InstallBanner />
            </CardOverridesProvider>
          </Router>
        </CatalogProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App