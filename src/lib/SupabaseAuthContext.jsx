import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { getSupabaseAuthClient } from '../api/supabaseClient';
import { createSupabaseAuthStore } from './supabaseAuthStore';

const SupabaseAuthContext = createContext(null);

// The legacy entry point never consumes this context.
export function SupabaseAuthProvider({ children, authStore }) {
  const [store] = useState(() => {
    if (authStore) return authStore;
    try { return createSupabaseAuthStore(getSupabaseAuthClient()); }
    catch (error) { return createSupabaseAuthStore(null, error); }
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);

  return (
    <SupabaseAuthContext.Provider value={{
      ...state,
      isLoadingAuth: state.isLoadingAuth || state.isInitializing,
      isAuthenticated: Boolean(state.session),
      // null means unknown/absent, never infer completion from avatar/username.
      needsProfileSetup: state.profile ? !state.profile.profile_setup_completed : null,
      signInWithEmail: store.signInWithEmail,
      signUpWithEmail: store.signUpWithEmail,
      verifyEmailOtp: store.verifyEmailOtp,
      resendConfirmation: store.resendConfirmation,
      requestPasswordReset: store.requestPasswordReset,
      resetPassword: store.resetPassword,
      logout: store.logout,
      refreshProfile: store.refreshProfile,
      completeProfileSetup: store.completeProfileSetup,
      profileService: store.profileService,
      mutateProfile: store.mutateProfile,
      friendService: store.friendService,
      directMessageService: store.directMessageService,
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  return context;
}
