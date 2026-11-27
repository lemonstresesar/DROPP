import {
  AuthError,
  ServerConfigError,
  extractBearerToken,
  resolveAuthoritativeSession,
} from '../_lib/droppAuth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Jeton d’authentification requis.' });
    return;
  }

  try {
    const session = await resolveAuthoritativeSession(token);
    res.status(200).json(session);
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
      error: err instanceof Error ? err.message : 'Erreur serveur lors du chargement du profil.',
    });
  }
}
