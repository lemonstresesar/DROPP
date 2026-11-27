import { bootstrapTestAccounts } from '../_lib/droppAuth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const status = await bootstrapTestAccounts();
  res.status(200).json(status);
}
