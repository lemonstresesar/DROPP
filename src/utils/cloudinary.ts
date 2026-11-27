export interface MediaOptimizationOptions {
  dataSaver: boolean;
  effectiveType?: string;
  isThumbnail?: boolean;
}

/**
 * Optimizes Cloudinary URLs with f_auto,q_auto and caps resolution to 480p on slow/data-saver
 * connections or 720p max on fast connections. Non-Cloudinary local assets pass through cleanly.
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

export type SignedUploadResult =
  | { ok: true; url: string; mode: 'cloudinary' }
  | { ok: false; error: string; url?: never };

export type UploadPurpose = 'post' | 'story' | 'kyc' | 'rfq' | 'chat';

export async function uploadSignedMedia(
  file: File,
  resourceType: 'image' | 'video' | 'raw',
  purpose: UploadPurpose = 'post'
): Promise<SignedUploadResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      error: 'Connexion hors ligne : l’envoi de fichiers nécessite une connexion Internet.',
    };
  }

  try {
    const { getFirebaseServices } = await import('../lib/firebase');
    const { auth } = await getFirebaseServices();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      return {
        ok: false,
        error: 'Session expirée : reconnectez-vous pour envoyer ce fichier.',
      };
    }

    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ purpose }),
    });

    const sig = (await signRes.json().catch(() => ({}))) as {
      configured?: boolean;
      error?: string;
      cloudName?: string;
      apiKey?: string;
      timestamp?: number;
      folder?: string;
      signature?: string;
    };

    if (!signRes.ok || !sig.configured || !sig.cloudName || !sig.apiKey || !sig.signature || !sig.timestamp) {
      return {
        ok: false,
        error:
          sig.error ||
          'Cloudinary n’est pas configuré sur le serveur. Impossible d’enregistrer ce fichier.',
      };
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
      const errBody = (await uploadRes.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return {
        ok: false,
        error:
          errBody.error?.message ||
          `Échec du téléversement Cloudinary (${uploadRes.status}).`,
      };
    }
    const uploaded = (await uploadRes.json()) as { secure_url?: string };
    if (uploaded.secure_url) {
      return { ok: true, url: uploaded.secure_url, mode: 'cloudinary' };
    }
    return {
      ok: false,
      error: 'Réponse Cloudinary invalide (URL manquante).',
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Erreur réseau lors du téléversement vers Cloudinary.',
    };
  }
}
