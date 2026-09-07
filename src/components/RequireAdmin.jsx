import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NotFound from '@/pages/NotFound';

/**
 * RequireAdmin — Route guard for admin-only areas.
 *
 * Defense-in-depth layer (RLS/backend remains the real authority):
 * 1. Wait for auth to load
 * 2. If not authenticated → normal app auth flow handles it (AuthenticatedApp gates)
 * 3. If authenticated but not admin → NotFound (admin area is invisible to normal users)
 * 4. If admin → render Outlet (children)
 *
 * This prevents Admin component from mounting for non-admin users,
 * which means no admin queries execute and no admin code loads.
 */
export default function RequireAdmin() {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — AuthenticatedApp handles login redirect,
  // but if we get here, show nothing (safety net).
  if (!user) return null;

  // Authenticated but not admin — admin area does not exist for normal users.
  if (user.role !== 'admin') return <NotFound />;

  return <Outlet />;
}