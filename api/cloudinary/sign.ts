import crypto from 'node:crypto';
import {
  AuthError,
  ServerConfigError,
  extractBearerToken,
  resolveAuthoritativeSession,
  type AuthoritativeSession,
} from '../_lib/droppAuth.js';

type UploadPurpose = 'post' | 'story' | 'kyc' | 'rfq' | 'chat';

function canUploadForPurpose(session: AuthoritativeSession, purpose: UploadPurpose): boolean {
  if (session.vendorStatus === 'suspended') return false;

  if (purpose === 'post' || purpose === 'story') {
    return (
      session.role === 'vendor' &&
      session.vendorStatus === 'approved' &&
      Boolean(session.shopId)
    );
  }

  if (purpose === 'kyc') {
    return (
      session.role === 'client' &&
      (session.vendorStatus === 'none' || session.vendorStatus === 'rejected')
    );
  }

  if (purpose === 'rfq' || purpose === 'chat') {
    return session.role !== 'admin';
  }

  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  try {
    const session = await resolveAuthoritativeSession(token);

    const rawPurpose = req.body?.purpose;
    const purpose: UploadPurpose =
      rawPurpose === 'story' ||
      rawPurpose === 'kyc' ||
      rawPurpose === 'rfq' ||
      rawPurpose === 'chat'
        ? rawPurpose
        : 'post';

    if (!canUploadForPurpose(session, purpose)) {
      res.status(403).json({
        error: 'Votre rôle ou statut actuel ne permet pas ce téléversement.',
      });
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({
        configured: false,
        mode: 'unconfigured',
        error:
          'Cloudinary n’est pas configuré sur le serveur. Définissez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET sur Vercel.',
      });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `dropp/${purpose}/${session.uid}`;
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    res.status(200).json({
      configured: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof ServerConfigError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur serveur lors de la signature.',
    });
  }
}
