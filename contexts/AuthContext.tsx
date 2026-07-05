/**
 * AuthContext — bridges Firebase phone auth to the FastAPI backend.
 *
 * Firebase is the source of truth. When a Firebase user is present, we
 * exchange the Firebase ID token for a short-lived backend JWT via
 * `POST /auth/firebase`, persist it, and load the backend profile. The JWT
 * is refreshed transparently: the API client's 401 handler is wired to
 * `exchangeFirebaseToken(true)`, which re-mints the Firebase ID token and
 * re-exchanges it — no backend refresh-token machinery on mobile.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import auth from '@react-native-firebase/auth';
import {
  apiFetch,
  setAuthToken,
  setUnauthorizedHandler,
} from '@/lib/api';
import { getJwt, setJwt, clearJwt } from '@/lib/auth-storage';
import { registerPushToken, unregisterPushToken } from '@/lib/push';

export interface BackendUser {
  id: number;
  username: string;
  role: string;
  city: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  quartier: string | null;
  gender: string | null;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  avg_rating: number | null;
  review_count: number;
  created_at: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthContextType {
  jwt: string | null;
  user: BackendUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwtState] = useState<string | null>(null);
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Exchange the current Firebase user's ID token for a backend JWT.
   * `forceRefresh` re-mints the Firebase token first (used on a 401, when
   * the backend JWT has expired). Returns whether a fresh JWT is now active.
   */
  const exchangeFirebaseToken = async (forceRefresh = false): Promise<boolean> => {
    const fbUser = auth().currentUser;
    if (!fbUser) return false;
    try {
      const idToken = await fbUser.getIdToken(forceRefresh);
      const res = await apiFetch<TokenResponse>('/auth/firebase', {
        method: 'POST',
        body: { firebase_id_token: idToken },
        skipUnauthorized: true,
      });
      await setJwt(res.access_token);
      setAuthToken(res.access_token);
      setJwtState(res.access_token);
      return true;
    } catch (e) {
      console.warn('[auth] Firebase token exchange failed:', e);
      return false;
    }
  };

  // Wire the API client's 401 handler to a forced re-exchange.
  useEffect(() => {
    setUnauthorizedHandler(() => exchangeFirebaseToken(true));
    return () => setUnauthorizedHandler(null);
  }, []);

  // React to Firebase auth state — the single entry point for sign-in/out.
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        // Use a cached JWT for a fast cold start; the API client's 401
        // handler will transparently re-exchange it if it has expired.
        const cached = await getJwt();
        if (cached) {
          setAuthToken(cached);
          setJwtState(cached);
        }
        const ready = cached ? true : await exchangeFirebaseToken();
        if (ready) {
          try {
            const me = await apiFetch<BackendUser>('/auth/me');
            setUser(me);
            registerPushToken().catch(() => {});
          } catch (e) {
            console.warn('[auth] /auth/me failed:', e);
          }
        }
      } else {
        await clearJwt();
        setAuthToken(null);
        setJwtState(null);
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    try {
      const me = await apiFetch<BackendUser>('/auth/me');
      setUser(me);
    } catch (e) {
      console.warn('[auth] refreshUser failed:', e);
    }
  };

  const signOut = async () => {
    try {
      await unregisterPushToken();
    } catch {
      // best-effort — never block sign-out
    }
    await auth().signOut();
    // the onAuthStateChanged(null) branch clears jwt / user / storage
  };

  return (
    <AuthContext.Provider
      value={{
        jwt,
        user,
        isLoading,
        isAuthenticated: !!jwt && !!user,
        refreshUser,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
