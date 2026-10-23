import { apiFetch } from '@/lib/api';
import type { BackendUser } from '@/contexts/AuthContext';

/** Update the current user's profile (PATCH /auth/me). Send only changed fields. */
export async function updateMe(patch: Partial<Record<string, unknown>>): Promise<BackendUser> {
  return apiFetch<BackendUser>('/auth/me', { method: 'PATCH', body: patch });
}

/** Upload and set a new avatar (POST /auth/me/avatar, multipart). */
export async function uploadAvatar(uri: string): Promise<BackendUser> {
  const form = new FormData();
  form.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
  return apiFetch<BackendUser>('/auth/me/avatar', { method: 'POST', body: form });
}

/**
 * Choose or change the password used by phone + password sign-in
 * (PUT /auth/me/password). `current_password` is required only when the
 * session itself came from a password login (400 `current_password_required`).
 */
export async function setMyPassword(body: {
  password: string;
  confirm_password: string;
  current_password?: string;
}): Promise<void> {
  await apiFetch('/auth/me/password', { method: 'PUT', body });
}
