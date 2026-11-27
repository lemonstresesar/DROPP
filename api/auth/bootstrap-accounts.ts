export default async function handler(_req: any, res: any) {
  res.status(410).json({
    error:
      'Route désactivée pour des raisons de sécurité. Utilisez le script serveur `npm run seed`.',
  });
}
