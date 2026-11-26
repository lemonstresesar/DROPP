export interface MediaOptimizationOptions {
  dataSaver: boolean;
  effectiveType?: string;
  isThumbnail?: boolean;
}

/**
 * Optimizes Cloudinary URLs with f_auto,q_auto and caps resolution to 480p on slow/data-saver
 * connections or 720p max on fast connections. Non-Cloudinary local demo assets pass through cleanly.
 */
export function buildCloudinaryMediaUrl(
  rawUrl: string,
  options: MediaOptimizationOptions
): string {
  if (!rawUrl) return '';
  const isCloudinary = rawUrl.includes('res.cloudinary.com') && rawUrl.includes('/upload/');
  if (!isCloudinary) {
    return rawUrl;
  }

  const isSlowNetwork =
    options.dataSaver ||
    options.effectiveType === 'slow-2g' ||
    options.effectiveType === '2g' ||
    options.effectiveType === '3g';

  const maxHeight = options.isThumbnail ? 360 : isSlowNetwork ? 480 : 720;
  const quality = options.dataSaver ? 'q_auto:eco' : 'q_auto:good';
  const transform = `f_auto,${quality},h_${maxHeight},c_limit`;

  const [prefix, suffix] = rawUrl.split('/upload/');
  if (!suffix) return rawUrl;
  if (suffix.startsWith('f_auto')) return rawUrl;
  return `${prefix}/upload/${transform}/${suffix}`;
}

export interface SignedUploadResult {
  url: string;
  mode: 'cloudinary' | 'demo';
}

export async function uploadSignedMedia(
  file: File,
  resourceType: 'image' | 'video' | 'raw'
): Promise<SignedUploadResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { url: URL.createObjectURL(file), mode: 'demo' };
  }

  try {
    const { getFirebaseServices } = await import('../lib/firebase');
    const { auth } = await getFirebaseServices();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      return { url: URL.createObjectURL(file), mode: 'demo' };
    }

    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!signRes.ok) {
      return { url: URL.createObjectURL(file), mode: 'demo' };
    }

    const sig = (await signRes.json()) as {
      configured?: boolean;
      cloudName?: string;
      apiKey?: string;
      timestamp?: number;
      folder?: string;
      signature?: string;
    };

    if (!sig.configured || !sig.cloudName || !sig.apiKey || !sig.signature || !sig.timestamp) {
      return { url: URL.createObjectURL(file), mode: 'demo' };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sig.apiKey);
    formData.append('timestamp', String(sig.timestamp));
    formData.append('signature', sig.signature);
    if (sig.folder) {
      formData.append('folder', sig.folder);
    }

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    if (!uploadRes.ok) {
      return { url: URL.createObjectURL(file), mode: 'demo' };
    }
    const uploaded = (await uploadRes.json()) as { secure_url?: string };
    if (uploaded.secure_url) {
      return { url: uploaded.secure_url, mode: 'cloudinary' };
    }
  } catch {
    // Graceful demo fallback when offline or unconfigured
  }

  return { url: URL.createObjectURL(file), mode: 'demo' };
}
