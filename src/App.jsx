import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
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

  return (
    <Routes>
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App