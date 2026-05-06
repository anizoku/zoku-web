import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import { CardOverridesProvider } from '@/context/CardOverridesContext';
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
import Admin from '@/pages/Admin';
import { useState, useEffect } from 'react';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;
    if (authError) { setProfileChecked(true); return; }
    // Check if current user needs profile setup
    base44.auth.me().then(async (u) => {
      if (!u) { setProfileChecked(true); return; }
      // Consider setup complete if flag is set OR if they already have username+avatar
      if (u.profile_setup_completed) { setProfileChecked(true); setNeedsSetup(false); return; }
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
        const p = profiles[0];
        const isComplete = p?.profile_setup_completed === true || (p?.username && p?.avatar_url);
        if (isComplete && !p?.profile_setup_completed) {
          // Backfill the flag for existing complete profiles
          await base44.entities.UserProfile.update(p.id, { profile_setup_completed: true });
        }
        setNeedsSetup(!isComplete);
      } catch {
        setNeedsSetup(false);
      }
      setProfileChecked(true);
    }).catch(() => { setProfileChecked(true); });
  }, [isLoadingAuth, isLoadingPublicSettings, authError]);

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

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Redirect to setup if needed (but not if already on setup page)
  const currentPath = window.location.pathname;
  if (needsSetup && currentPath !== "/profile-setup") {
    return <ProfileSetup />;
  }
  // If setup done and user visits /profile-setup, redirect to home
  if (!needsSetup && currentPath === "/profile-setup") {
    window.location.replace("/");
    return null;
  }

  return (
    <Routes>
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/animes" element={<Animes />} />
        <Route path="/mangas" element={<Mangas />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/films" element={<Films />} />
        <Route path="/series" element={<Series />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/events" element={<Events />} />
        <Route path="/my-list" element={<MyList />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/obra/:slug" element={<ObraProfile />} />
        <Route path="/u/:userEmail" element={<PublicProfile />} />
        <Route path="/communities/:communityId" element={<CommunityPage />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <CardOverridesProvider>
            <AuthenticatedApp />
          </CardOverridesProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App