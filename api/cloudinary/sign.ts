import crypto from 'node:crypto';
import { verifyFirebaseIdToken } from '../_lib/droppAuth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const authHeader = req.headers?.authorization || '';
  const token =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

  if (!token) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  try {
    const verified = await verifyFirebaseIdToken(token);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!cloudName || !apiKey || !apiSecret) {
      res.status(200).json({
        configured: false,
        mode: 'demo',
        message:
          'Cloudinary non configuré sur le serveur. L’application utilise les médias de démonstration légers.',
      });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `dropp/media/${verified.sub}`;
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
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Jeton invalide.',
    });
  }
}
