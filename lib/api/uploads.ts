/**
 * Direct photo uploads (Phase 4):
 *   1. POST /uploads/presign {content_type, size} → {key, upload_url, headers}
 *   2. PUT the bytes straight to storage (never through the API)
 *   3. the caller attaches the key (POST /posts `image_keys`, or
 *      POST /posts/{id}/images) and refetches until the image is `ready`.
 *
 * The PUT uses expo-file-system's native upload task (already linked in the
 * dev client) for real progress events; if that module is missing it falls
 * back to XMLHttpRequest with a Blob read from the local URI.
 */
import { requireOptionalNativeModule } from 'expo';
import { apiFetch } from '@/lib/api';

export type UploadContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PresignResponse {
  key: string;
  upload_url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expires_in: number;
  max_bytes: number;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function presignUpload(contentType: UploadContentType, size: number): Promise<PresignResponse> {
  return apiFetch<PresignResponse>('/uploads/presign', {
    method: 'POST',
    body: { content_type: contentType, size },
  });
}

export function guessContentType(uri: string, mime?: string | null): UploadContentType {
  const m = (mime ?? '').toLowerCase();
  if (m === 'image/png' || m === 'image/webp' || m === 'image/jpeg') return m;
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

type Progress = (fraction: number) => void;

const hasNativeFs = !!requireOptionalNativeModule('ExponentFileSystem');

async function fileSize(uri: string): Promise<number | null> {
  if (hasNativeFs) {
    try {
      const FS = require('expo-file-system/legacy');
      const info = await FS.getInfoAsync(uri);
      if (info?.exists && typeof info.size === 'number') return info.size;
    } catch {
      // fall through
    }
  }
  return null;
}

async function putNative(url: string, uri: string, headers: Record<string, string>, onProgress?: Progress) {
  const FS = require('expo-file-system/legacy');
  const task = FS.createUploadTask(
    url,
    uri,
    { httpMethod: 'PUT', uploadType: FS.FileSystemUploadType.BINARY_CONTENT, headers },
    (p: { totalBytesSent: number; totalBytesExpectedToSend: number }) => {
      if (p.totalBytesExpectedToSend > 0) onProgress?.(p.totalBytesSent / p.totalBytesExpectedToSend);
    },
  );
  const res = await task.uploadAsync();
  if (!res || res.status < 200 || res.status >= 300) {
    throw new UploadError(`Envoi refusé par le stockage (${res?.status ?? '?'})`);
  }
}

function putXhr(url: string, blob: Blob, headers: Record<string, string>, onProgress?: Progress) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new UploadError(`Envoi refusé par le stockage (${xhr.status})`));
    xhr.onerror = () => reject(new UploadError('Connexion interrompue pendant l’envoi'));
    xhr.send(blob);
  });
}

/**
 * Upload one local photo and return its storage key (to attach to a post).
 * Progress is reported 0 → 1.
 */
export async function uploadPhoto(
  uri: string,
  opts: { mimeType?: string | null; size?: number | null; onProgress?: Progress } = {},
): Promise<string> {
  const contentType = guessContentType(uri, opts.mimeType);
  let blob: Blob | null = null;
  let size = opts.size ?? (await fileSize(uri));
  if (!hasNativeFs || !size) {
    blob = await (await fetch(uri)).blob();
    size = blob.size;
  }
  if (!size) throw new UploadError('Photo illisible');
  if (size > MAX_UPLOAD_BYTES) throw new UploadError('Photo trop lourde (10 Mo maximum)');

  const presign = await presignUpload(contentType, size);
  const headers = { 'Content-Type': contentType, ...(presign.headers ?? {}) };
  opts.onProgress?.(0);
  if (hasNativeFs && !blob) {
    await putNative(presign.upload_url, uri, headers, opts.onProgress);
  } else {
    await putXhr(presign.upload_url, blob!, headers, opts.onProgress);
  }
  opts.onProgress?.(1);
  return presign.key;
}
