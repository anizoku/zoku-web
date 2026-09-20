import { emailCallbackUrl } from './supabaseAuthNavigation.js';
import { createProfileService } from './supabaseProfileService.js';
import { createFriendService } from './supabaseFriendService.js';

// Framework-independent session lifecycle, shared by the React context and tests.
export function createSupabaseAuthStore(
  client,
  configurationError = null,
  origin = globalThis.location?.origin
) {
  let state = {
    enabled: Boolean(client),
    session: null,
    user: null,
    profile: null,
    isLoadingAuth: Boolean(client),
    isLoadingProfile: false,
    authChecked: !client,
    authError: configurationError,
    profileError: null,
    isPasswordRecovery: false,
    isInitializing: Boolean(client),
    initializationError: null,
  };

  const listeners = new Set();

  let active = false;
  let revision = 0;
  let lifecycle = 0;
  let subscription;
  let timer;

  const profileService = createProfileService(
    client,
    () => state.user?.id
  );

  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const requireClient = () => {
    if (!client) {
      throw configurationError || new Error('Supabase Auth is disabled');
    }

    return client;
  };

  const unwrap = async (request) => {
    const { data, error } = await request;

    if (error) throw error;

    return data;
  };

  async function loadProfile(ticket) {
    try {
      const profile = await unwrap(client.rpc('get_my_profile'));

      if (!profile || profile.id !== state.user?.id) {
        throw new Error('Profile does not match the authenticated user');
      }

      if (active && ticket === revision) {
        publish({
          profile,
          profileError: null,
          isLoadingProfile: false,
        });
      }

      return profile;
    } catch (error) {
      if (active && ticket === revision) {
        publish({
          profile: null,
          profileError: error,
          isLoadingProfile: false,
        });
      }

      throw error;
    }
  }

  function acceptSession(session) {
    const ticket = ++revision;

    clearTimeout(timer);

    const sameUser = Boolean(
      session &&
      state.user?.id === session.user.id
    );

    const previousProfile = sameUser
      ? state.profile
      : null;

    publish({
      session,
      user: session?.user ?? null,
      profile: previousProfile,
      isPasswordRecovery: sameUser
        ? state.isPasswordRecovery
        : false,
      isLoadingAuth: false,
      authChecked: true,
      authError: null,
      profileError: null,
      isLoadingProfile: Boolean(
        session && !previousProfile
      ),
    });

    // Auth callbacks must remain synchronous and must not call another SDK API.
    if (session) {
      timer = setTimeout(() => {
        if (active && ticket === revision) {
          void loadProfile(ticket).catch(() => {});
        }
      }, 0);
    }
  }

  return {
    profileService,

    // Always build against the currently authenticated UUID.
    get friendService() {
      return createFriendService(
        client,
        state.user?.id
      );
    },

    async mutateProfile(operation, ...args) {
      requireClient();

      const owner = state.user?.id;

      if (!active || !owner) {
        throw new Error('SESSION_CHANGED');
      }

      if (!['update', 'upload', 'remove', 'crop'].includes(operation)) {
        throw new Error('Unsupported profile operation');
      }

      const result = await profileService[operation](...args);

      if (!active || state.user?.id !== owner) {
        throw new Error('SESSION_CHANGED');
      }

      const ticket = ++revision;

      clearTimeout(timer);

      try {
        await loadProfile(ticket);
      } catch {
        throw new Error('PROFILE_REFRESH_FAILED');
      }

      return result;
    },

    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    start() {
      if (!client || active) return;

      active = true;

      const startLifecycle = ++lifecycle;

      publish({
        isLoadingAuth: true,
      });

      const initialRevision = revision;

      subscription = client.auth.onAuthStateChange(
        (event, session) => {
          if (active) {
            acceptSession(session);

            if (event === 'PASSWORD_RECOVERY') {
              publish({
                isPasswordRecovery: true,
              });
            }
          }
        }
      ).data.subscription;

      // getSession does not propagate callback initialization failures.
      // Inspect them separately so an old session cannot make an invalid email link look valid.
      void (
        client.auth.initialize?.() ||
        Promise.resolve({ error: null })
      )
        .then(({ error }) => {
          if (
            active &&
            startLifecycle === lifecycle
          ) {
            publish({
              isInitializing: false,
              initializationError: error || null,
            });
          }
        })
        .catch((error) => {
          if (
            active &&
            startLifecycle === lifecycle
          ) {
            publish({
              isInitializing: false,
              initializationError: error,
            });
          }
        });

      // A later event always wins over this initial storage read.
      void unwrap(client.auth.getSession())
        .then(({ session }) => {
          if (
            active &&
            revision === initialRevision
          ) {
            acceptSession(session);
          }
        })
        .catch((error) => {
          if (
            active &&
            revision === initialRevision
          ) {
            publish({
              isLoadingAuth: false,
              authChecked: true,
              authError: error,
            });
          }
        });
    },

    stop() {
      active = false;

      ++lifecycle;
      ++revision;

      clearTimeout(timer);

      subscription?.unsubscribe();
      subscription = null;
    },

    async signInWithEmail(email, password) {
      const result = await unwrap(
        requireClient().auth.signInWithPassword({
          email,
          password,
        })
      );

      publish({
        initializationError: null,
      });

      return result;
    },

    async signUpWithEmail(
      email,
      password,
      fullName,
      returnTo = '/'
    ) {
      // Confirmation-required signup can return user with session=null.
      // Only session events establish authenticated state.
      return unwrap(
        requireClient().auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || '',
            },
            emailRedirectTo: emailCallbackUrl(
              origin,
              returnTo
            ),
          },
        })
      );
    },

    async resendConfirmation(
      email,
      returnTo = '/'
    ) {
      return unwrap(
        requireClient().auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: emailCallbackUrl(
              origin,
              returnTo
            ),
          },
        })
      );
    },

    async requestPasswordReset(email) {
      return unwrap(
        requireClient().auth.resetPasswordForEmail(
          email,
          {
            redirectTo: new URL(
              '/reset-password',
              origin
            ).href,
          }
        )
      );
    },

    async resetPassword(password) {
      requireClient();

      if (!active || !state.session) {
        throw new Error(
          'Authentication required'
        );
      }

      const result = await unwrap(
        client.auth.updateUser({
          password,
        })
      );

      if (active) {
        publish({
          isPasswordRecovery: false,
        });
      }

      return result;
    },

    async verifyEmailOtp(email, token) {
      return unwrap(
        requireClient().auth.verifyOtp({
          email,
          token,
          type: 'signup',
        })
      );
    },

    async logout() {
      const ticket = revision;

      await unwrap(
        requireClient().auth.signOut({
          scope: 'local',
        })
      );

      if (active && ticket === revision) {
        acceptSession(null);
      }
    },

    async refreshProfile() {
      requireClient();

      if (!active || !state.user) {
        throw new Error(
          'Authentication required'
        );
      }

      const ticket = ++revision;

      clearTimeout(timer);

      publish({
        profile: null,
        isLoadingProfile: true,
        profileError: null,
      });

      return loadProfile(ticket);
    },

    async completeProfileSetup({
      username,
      displayName,
      preferredLanguage,
    }) {
      requireClient();

      if (!active || !state.user) {
        throw new Error(
          'Authentication required'
        );
      }

      const ticket = revision;

      const result = await unwrap(
        client.rpc(
          'complete_profile_setup',
          {
            p_username: username,
            p_display_name: displayName,
            p_preferred_language:
              preferredLanguage,
          }
        )
      );

      // The RPC returns status, not a complete profile.
      // Re-read authoritative data.
      if (
        active &&
        ticket === revision
      ) {
        const profileTicket = ++revision;

        clearTimeout(timer);

        publish({
          isLoadingProfile: true,
          profileError: null,
        });

        await loadProfile(profileTicket);
      }

      return result;
    },
  };
}