import { resolveAuthoritativePolicy, verifyFirebaseIdToken } from '../_lib/droppAuth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const authHeader = req.headers?.authorization || '';
  const token =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

  if (!token) {
    res.status(401).json({ error: 'Jeton d’authentification requis.' });
    return;
  }

  try {
    const verified = await verifyFirebaseIdToken(token);
    const profile = resolveAuthoritativePolicy(
      verified.sub,
      verified.email,
      verified.name,
      Boolean(verified.email_verified)
    );
    res.status(200).json({
      ...profile,
      avatarUrl: verified.picture || undefined,
    });
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Jeton Firebase invalide.',
    });
  }
}
