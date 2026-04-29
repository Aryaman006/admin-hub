import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

export type UploadBucket = 'thumbnails' | 'videos';

export interface UploadProgress {
  attempt: number;
  totalAttempts: number;
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
  attempts: number;
}

export interface UploadOptions {
  bucket: UploadBucket;
  file: File;
  path: string;
  maxRetries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgress) => void;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
const RETRY_BASE_DELAY_MS = 900;

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const validMimeTypesForBucket = (bucket: UploadBucket) => (
  bucket === 'videos' ? VIDEO_TYPES : IMAGE_TYPES
);

export const validateUploadFile = (
  file: File,
  bucket: UploadBucket,
  maxSizeMB: number,
): ValidationResult => {
  const validTypes = validMimeTypesForBucket(bucket);
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const allowedVideoExtensions = ['mp4', 'webm', 'mov', 'qt', 'avi'];
  const hasAllowedVideoExtension = bucket === 'videos' && !!fileExtension && allowedVideoExtensions.includes(fileExtension);

  if (!validTypes.includes(file.type) && !hasAllowedVideoExtension) {
    return {
      valid: false,
      message: `Invalid file type "${file.type || fileExtension || 'unknown'}". Allowed: ${validTypes.join(', ')}`,
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      message: `File too large (${formatBytes(file.size)}). Maximum size: ${maxSizeMB}MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      message: 'The selected file is empty. Please choose another file.',
    };
  }

  return { valid: true };
};

export const createUploadPath = (file: File) => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const randomPart = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${Date.now()}-${randomPart}.${fileExt}`;
};

export const getPublicUploadUrl = (bucket: UploadBucket, path: string) => (
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
);

export const removeUploadedObject = async (bucket: UploadBucket, path: string, reason: string) => {
  console.info('[upload:cleanup:start]', { bucket, path, reason });
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error('[upload:cleanup:failure]', { bucket, path, reason, error });
    throw error;
  }
  console.info('[upload:cleanup:success]', { bucket, path, reason });
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isAbortError = (error: unknown) => (
  error instanceof DOMException && error.name === 'AbortError'
);

const isRetryableStatus = (status: number) => (
  status === 0 || status === 408 || status === 429 || status >= 500
);

const isDuplicateObjectError = (status: number, message: string) => (
  status === 409 || /duplicate|already exists|resource already exists/i.test(message)
);

const buildStorageObjectUrl = (bucket: UploadBucket, path: string) => {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`;
};

const parseStorageError = (xhr: XMLHttpRequest) => {
  const raw = xhr.responseText || xhr.statusText || 'Storage upload failed';
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || raw;
  } catch {
    return raw;
  }
};

const uploadOnce = async ({
  bucket,
  file,
  path,
  attempt,
  totalAttempts,
  token,
  timeoutMs,
  signal,
  onProgress,
}: UploadOptions & { attempt: number; totalAttempts: number; token: string; timeoutMs: number }) => {
  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abortUpload = () => xhr.abort();

    xhr.open('POST', buildStorageObjectUrl(bucket, path));
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('Cache-Control', '3600');
    xhr.setRequestHeader('x-upsert', 'false');

    signal?.addEventListener('abort', abortUpload, { once: true });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.({
        attempt,
        totalAttempts,
        loaded: event.loaded,
        total: event.total,
        percent: Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))),
      });
    };

    xhr.onload = () => {
      signal?.removeEventListener('abort', abortUpload);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      const message = parseStorageError(xhr);
      const error = new Error(message) as Error & { status?: number };
      error.status = xhr.status;
      reject(error);
    };

    xhr.onerror = () => {
      signal?.removeEventListener('abort', abortUpload);
      const error = new Error('Network error while uploading. Please check the connection and try again.') as Error & { status?: number };
      error.status = xhr.status || 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      signal?.removeEventListener('abort', abortUpload);
      const error = new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)} seconds.`) as Error & { status?: number; timedOut?: boolean };
      error.status = 408;
      error.timedOut = true;
      reject(error);
    };

    xhr.onabort = () => {
      signal?.removeEventListener('abort', abortUpload);
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };

    xhr.send(file);
  });
};

export const uploadWithRetry = async ({
  bucket,
  file,
  path,
  maxRetries = 2,
  timeoutMs = bucket === 'videos' ? 8 * 60 * 1000 : 90 * 1000,
  signal,
  onProgress,
}: UploadOptions): Promise<UploadResult> => {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token || SUPABASE_ANON_KEY;
  const totalAttempts = maxRetries + 1;

  console.info('[upload:start]', {
    bucket,
    path,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    maxRetries,
    timeoutMs,
    online: navigator.onLine,
    userAgent: navigator.userAgent,
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      console.info('[upload:attempt:start]', { bucket, path, attempt, totalAttempts });
      await uploadOnce({ bucket, file, path, attempt, totalAttempts, token, timeoutMs, signal, onProgress });

      const publicUrl = getPublicUploadUrl(bucket, path);
      console.info('[upload:success]', { bucket, path, attempt, publicUrl });
      return { path, publicUrl, attempts: attempt };
    } catch (error: unknown) {
      lastError = error;

      if (isAbortError(error)) {
        console.warn('[upload:cancelled]', { bucket, path, attempt });
        throw new Error('Upload cancelled.');
      }

      const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 0;
      const message = error instanceof Error ? error.message : 'Upload failed.';

      if (isDuplicateObjectError(status, message)) {
        const publicUrl = getPublicUploadUrl(bucket, path);
        console.warn('[upload:duplicate-treated-as-success]', { bucket, path, attempt, message });
        return { path, publicUrl, attempts: attempt };
      }

      const canRetry = attempt < totalAttempts && isRetryableStatus(status);
      console.warn('[upload:attempt:failure]', {
        bucket,
        path,
        attempt,
        status,
        message,
        retrying: canRetry,
      });

      if (!canRetry) {
        break;
      }

      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  console.error('[upload:failure]', { bucket, path, error: lastError });
  throw lastError instanceof Error ? lastError : new Error('Upload failed. Please try again.');
};
