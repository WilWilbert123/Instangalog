/**
 * Multi-Account Cloudinary Media Upload Pool Service
 *
 * Direct browser-to-Cloudinary upload with real-time XHR progress tracking (0-100%).
 * Features Smart Automatic Quota Failover: if one Cloudinary account becomes full or hits
 * its limit, the system automatically switches to the next account in the pool.
 */

export interface CloudinaryAccount {
  cloudName: string;
  uploadPreset: string;
}

export interface CloudinaryUploadResult {
  url: string;
  thumbnailUrl: string;
  duration?: number;
  format?: string;
  accountUsed?: string;
}

export function getCloudinaryAccountPool(): CloudinaryAccount[] {
  const pool: CloudinaryAccount[] = [];

  const addAccount = (cloudName?: string, uploadPreset?: string) => {
    if (cloudName && cloudName.trim() && !cloudName.includes('your-cloud')) {
      const preset = uploadPreset?.trim() || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'instangalog_videos';
      pool.push({ cloudName: cloudName.trim(), uploadPreset: preset });
    }
  };

  // Explicit static NEXT_PUBLIC_ references so Next.js Turbopack/Webpack client bundler inlines env variables
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_1, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_1);
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_2, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_2);
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_3, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_3);
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_4, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_4);
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_5, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_5);
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_6, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_6);

  if (pool.length > 0) return pool;

  // Single primary account fallback
  addAccount(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

  return pool;
}

/**
 * Uploads a video file directly to Cloudinary with automatic failover if an account is full
 * or has preset configuration issues.
 */
export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<CloudinaryUploadResult> {
  const pool = getCloudinaryAccountPool();

  if (pool.length === 0) {
    if (onProgress) onProgress(100);
    const objectUrl = URL.createObjectURL(file);
    return {
      url: objectUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    };
  }

  // Shuffle accounts starting pool for load balancing
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  let lastError: Error | null = null;

  for (const account of shuffledPool) {
    if (onProgress) onProgress(0);

    const presetsToTry = Array.from(
      new Set([account.uploadPreset, 'instangalog_videos', 'ml_default', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''].filter(Boolean))
    );
    const endpointsToTry = [
      `https://api.cloudinary.com/v1_1/${account.cloudName}/auto/upload`,
      `https://api.cloudinary.com/v1_1/${account.cloudName}/video/upload`,
    ];

    for (const preset of presetsToTry) {
      for (const endpoint of endpointsToTry) {
        try {
          const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', preset);
            formData.append('resource_type', 'video');

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                const thumbnailUrl = (data.secure_url || data.url || '').replace(/\.[^/.]+$/, '.jpg');
                resolve({
                  url: data.secure_url || data.url,
                  thumbnailUrl,
                  duration: data.duration,
                  format: data.format,
                  accountUsed: account.cloudName,
                });
              } else {
                try {
                  const errData = JSON.parse(xhr.responseText);
                  reject(new Error(errData.error?.message || `Quota/Upload error on account (${account.cloudName})`));
                } catch {
                  reject(new Error(`Upload failed on account (${account.cloudName}) with status ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', () => reject(new Error(`Network error on account (${account.cloudName})`)));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted by user')));

            xhr.open('POST', endpoint);
            xhr.send(formData);
          });

          return result;
        } catch (err: any) {
          console.warn(`Cloudinary account (${account.cloudName}) with preset [${preset}] failed:`, err.message);
          lastError = err;
        }
      }
    }
  }

  throw lastError || new Error('All configured Cloudinary accounts in pool failed or reached their quota limit.');
}

/**
 * Uploads an image file directly to Cloudinary with automatic failover if an account is full
 */
export async function uploadImageToCloudinary(
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<{ url: string; accountUsed?: string }> {
  const pool = getCloudinaryAccountPool();

  if (pool.length === 0) {
    throw new Error('No valid Cloudinary accounts configured in environment');
  }

  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  let lastError: Error | null = null;

  for (const account of shuffledPool) {
    if (onProgress) onProgress(0);

    const presetsToTry = Array.from(
      new Set([account.uploadPreset, 'instangalog_images', 'instangalog_videos', 'ml_default', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''].filter(Boolean))
    );
    const endpoints = [
      `https://api.cloudinary.com/v1_1/${account.cloudName}/image/upload`,
      `https://api.cloudinary.com/v1_1/${account.cloudName}/auto/upload`,
    ];

    for (const preset of presetsToTry) {
      for (const endpoint of endpoints) {
        try {
          const result = await new Promise<{ url: string; accountUsed?: string }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', preset);

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                if (data.secure_url || data.url) {
                  resolve({
                    url: data.secure_url || data.url,
                    accountUsed: account.cloudName,
                  });
                } else {
                  reject(new Error('Cloudinary response missing secure_url'));
                }
              } else {
                try {
                  const errData = JSON.parse(xhr.responseText);
                  reject(new Error(errData.error?.message || `Upload error on account (${account.cloudName})`));
                } catch {
                  reject(new Error(`Upload failed on account (${account.cloudName}) with status ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', () => reject(new Error(`Network error on account (${account.cloudName})`)));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted by user')));

            xhr.open('POST', endpoint);
            xhr.send(formData);
          });

          return result;
        } catch (err: any) {
          lastError = err;
        }
      }
    }
  }

  throw lastError || new Error('All configured Cloudinary accounts in pool failed.');
}

/**
 * Uploads media (image, video, audio) directly to Cloudinary with automatic failover
 */
export async function uploadMediaToCloudinary(
  file: File,
  resourceType: 'image' | 'video' | 'auto' = 'auto',
  onProgress?: (progressPercent: number) => void
): Promise<{ url: string; thumbnailUrl?: string; duration?: number; accountUsed?: string }> {
  const pool = getCloudinaryAccountPool();

  if (pool.length === 0) {
    if (onProgress) onProgress(100);
    const objectUrl = URL.createObjectURL(file);
    return { url: objectUrl };
  }

  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  let lastError: Error | null = null;

  for (const account of shuffledPool) {
    if (onProgress) onProgress(0);

    const presetsToTry = Array.from(
      new Set([account.uploadPreset, 'instangalog_videos', 'ml_default', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''].filter(Boolean))
    );
    const endpointsToTry = [
      `https://api.cloudinary.com/v1_1/${account.cloudName}/${resourceType}/upload`,
      `https://api.cloudinary.com/v1_1/${account.cloudName}/auto/upload`,
    ];

    for (const preset of presetsToTry) {
      for (const endpoint of endpointsToTry) {
        try {
          const result = await new Promise<{ url: string; thumbnailUrl?: string; duration?: number; accountUsed?: string }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', preset);

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                const url = data.secure_url || data.url;
                let thumbnailUrl = data.secure_url;
                if (resourceType === 'video' || file.type.startsWith('video/')) {
                  thumbnailUrl = (data.secure_url || data.url).replace(/\.[^/.]+$/, '.jpg');
                }
                resolve({
                  url,
                  thumbnailUrl,
                  duration: data.duration,
                  accountUsed: account.cloudName,
                });
              } else {
                try {
                  const errData = JSON.parse(xhr.responseText);
                  reject(new Error(errData.error?.message || `Quota/Upload error on account (${account.cloudName})`));
                } catch {
                  reject(new Error(`Upload failed on account (${account.cloudName}) with status ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', () => reject(new Error(`Network error on account (${account.cloudName})`)));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted by user')));

            xhr.open('POST', endpoint);
            xhr.send(formData);
          });

          return result;
        } catch (err: any) {
          console.warn(`Cloudinary account (${account.cloudName}) with preset [${preset}] failed:`, err.message);
          lastError = err;
        }
      }
    }
  }

  throw lastError || new Error('All configured Cloudinary accounts in pool failed or reached their quota limit.');
}


