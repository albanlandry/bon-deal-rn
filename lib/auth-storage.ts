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
