/**
 * Secure persistence for the backend JWT.
 *
 * The JWT is short-lived (15 min) and always re-mintable from the Firebase
 * session, so a failed read/write just means an extra exchange round-trip —
 * never a hard error.
 */
import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'bondeal.jwt';
// Set while signed in through the local test login (no Firebase session).
const DEV_PHONE_KEY = 'bondeal.devPhone';

export async function getJwt(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(JWT_KEY);
  } catch {
    return null;
  }
}

export async function setJwt(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(JWT_KEY, token);
  } catch {
    // non-persistent session is still usable for this run
  }
}

export async function clearJwt(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(JWT_KEY);
  } catch {
    // ignore
  }
}

export async function getDevPhone(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DEV_PHONE_KEY);
  } catch {
    return null;
  }
}

export async function setDevPhone(phone: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(DEV_PHONE_KEY, phone);
  } catch {
    // session still works for this run
  }
}

export async function clearDevPhone(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEV_PHONE_KEY);
  } catch {
    // ignore
  }
}

// Set while signed in with phone + password (no Firebase session): the
// 30-day token that renews the JWT through POST /auth/token/refresh.
const REFRESH_KEY = 'bondeal.refreshToken';

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  } catch {
    // session still works for this run
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    // ignore
  }
}
