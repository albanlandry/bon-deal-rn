/**
 * AuthContext — bridges Firebase phone auth to the FastAPI backend.
 *
 * Firebase is the source of truth. When a Firebase user is present, we
 * exchange the Firebase ID token for a short-lived backend JWT via
 * `POST /auth/firebase`, persist it, and load the backend profile. The JWT
 * is refreshed transparently: the API client's 401 handler is wired to
 * `exchangeFirebaseToken(true)`, which re-mints the Firebase ID token and
 * re-exchanges it — no backend refresh-token machinery on mobile.
 *
 * Local test login (config.devLogin, while Firebase isn't configured): one
 * number signs in with a fixed code through `POST /auth/dev-otp`. That
 * "test session" is marked by the stored dev phone; while it exists, a 401
 * re-runs the dev exchange instead of Firebase, and Firebase's signed-out
 * state doesn't clear it.
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
import { getJwt, setJwt, clearJwt, getDevPhone, setDevPhone, clearDevPhone } from '@/lib/auth-storage';
import { config } from '@/utils/config';
import { registerPushToken, unregisterPushToken } from '@/lib/push';
import type { BdNotificationPrefs, BdPrivacyPrefs } from '@/constants/types';

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
  /** Legal documents whose current version still needs acceptance. */
  consent_required?: ('terms' | 'privacy')[];
  notification_prefs?: BdNotificationPrefs;
  privacy_prefs?: BdPrivacyPrefs;
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
  /** `local: true` skips server calls (e.g. after the account was deleted). */
  signOut: (opts?: { local?: boolean }) => Promise<void>;
  /** Local test login (config.devLogin only). Throws ApiError on a wrong number/code. */
  signInWithDevOtp: (phone: string, code: string) => Promise<void>;
}

/** The fixed code accepted by the backend's local test login. */
export const DEV_OTP_CODE = '123456';

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

  /** Local test login → backend JWT. Returns whether a JWT is now active. */
  const exchangeDevOtp = async (phone: string, code: string): Promise<boolean> => {
    const res = await apiFetch<TokenResponse>('/auth/dev-otp', {
      method: 'POST',
      body: { phone_number: phone, code },
      skipUnauthorized: true,
    });
    await setJwt(res.access_token);
    setAuthToken(res.access_token);
    setJwtState(res.access_token);
    return true;
  };

  const loadMe = async () => {
    try {
      const me = await apiFetch<BackendUser>('/auth/me');
      setUser(me);
      registerPushToken().catch(() => {});
    } catch (e) {
      console.warn('[auth] /auth/me failed:', e);
    }
  };

  // Wire the API client's 401 handler to a forced re-exchange (test session
  // → dev exchange, otherwise Firebase).
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      const devPhone = config.devLogin.enabled ? await getDevPhone() : null;
      if (devPhone) {
        return exchangeDevOtp(devPhone, DEV_OTP_CODE).catch(() => false);
      }
      return exchangeFirebaseToken(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // React to Firebase auth state — the single entry point for sign-in/out
  // (except a local test session, restored here first).
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (fbUser) => {
      const devPhone = config.devLogin.enabled ? await getDevPhone() : null;
      if (devPhone) {
        const cached = await getJwt();
        if (cached) {
          setAuthToken(cached);
          setJwtState(cached);
        }
        const ready = cached ? true : await exchangeDevOtp(devPhone, DEV_OTP_CODE).catch(() => false);
        if (ready) await loadMe();
      } else if (fbUser) {
        // Use a cached JWT for a fast cold start; the API client's 401
        // handler will transparently re-exchange it if it has expired.
        const cached = await getJwt();
        if (cached) {
          setAuthToken(cached);
          setJwtState(cached);
        }
        const ready = cached ? true : await exchangeFirebaseToken();
        if (ready) await loadMe();
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

  const signOut = async (opts?: { local?: boolean }) => {
    if (!opts?.local) {
      try {
        await unregisterPushToken();
      } catch {
        // best-effort — never block sign-out
      }
    }
    if (await getDevPhone()) {
      // Test session: no Firebase user to sign out, so clear everything here.
      await clearDevPhone();
      await clearJwt();
      setAuthToken(null);
      setJwtState(null);
      setUser(null);
      return;
    }
    await auth().signOut();
    // the onAuthStateChanged(null) branch clears jwt / user / storage
  };

  const signInWithDevOtp = async (phone: string, code: string) => {
    if (!config.devLogin.enabled) throw new Error('Local test login is disabled');
    await exchangeDevOtp(phone, code);
    await setDevPhone(phone);
    await loadMe();
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
        signInWithDevOtp,
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
