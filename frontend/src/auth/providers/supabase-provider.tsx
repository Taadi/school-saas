import { PropsWithChildren, useEffect, useState } from 'react';
import { LaravelAdapter } from '@/auth/adapters/laravel-adapter';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';

const useLaravelAuth =
  import.meta.env.VITE_APP_AUTH_PROVIDER === 'laravel';

// Auth provider: Supabase (demo) or Laravel Sanctum API (`VITE_APP_AUTH_PROVIDER=laravel`).
export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);
  }, [currentUser]);

  const verify = async () => {
    if (auth) {
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch {
        saveAuth(undefined);
        setCurrentUser(undefined);
      }
    }
  };

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth);
    if (auth) {
      authHelper.setAuth(auth);
    } else {
      authHelper.removeAuth();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const slug =
        import.meta.env.VITE_APP_SCHOOL_SLUG?.trim() || undefined;
      const sessionAuth = useLaravelAuth
        ? await LaravelAdapter.login(email, password, slug)
        : await SupabaseAdapter.login(email, password);
      saveAuth(sessionAuth);
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => {
    if (useLaravelAuth) {
      throw new Error(
        'Sign up from the UI is disabled in Laravel mode. Register a school via POST /api/schools/register or switch VITE_APP_AUTH_PROVIDER.',
      );
    }
    try {
      const sessionAuth = await SupabaseAdapter.register(
        email,
        password,
        password_confirmation,
        firstName,
        lastName,
      );
      saveAuth(sessionAuth);
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    if (useLaravelAuth) {
      await LaravelAdapter.requestPasswordReset();
      return;
    }
    await SupabaseAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (
    password: string,
    password_confirmation: string,
  ) => {
    if (useLaravelAuth) {
      await LaravelAdapter.resetPassword();
      return;
    }
    await SupabaseAdapter.resetPassword(password, password_confirmation);
  };

  const resendVerificationEmail = async (email: string) => {
    if (useLaravelAuth) {
      await LaravelAdapter.resendVerificationEmail();
      return;
    }
    await SupabaseAdapter.resendVerificationEmail(email);
  };

  const getUser = async () => {
    return useLaravelAuth
      ? await LaravelAdapter.getCurrentUser()
      : await SupabaseAdapter.getCurrentUser();
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    if (useLaravelAuth) {
      return await LaravelAdapter.updateUserProfile();
    }
    return await SupabaseAdapter.updateUserProfile(userData);
  };

  const logout = () => {
    if (useLaravelAuth) {
      void LaravelAdapter.logout();
    } else {
      void SupabaseAdapter.logout();
    }
    saveAuth(undefined);
    setCurrentUser(undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        register,
        requestPasswordReset,
        resetPassword,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
