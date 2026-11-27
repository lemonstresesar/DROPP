import {
  AuthError,
  ServerConfigError,
  assertAdminSession,
  extractBearerToken,
  getAdminAuth,
  getAdminFirestore,
} from '../_lib/droppAuth.js';

function isoFromVal(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  try {
    await assertAdminSession(token);
    const db = getAdminFirestore();
    const auth = getAdminAuth();

    const [usersSnap, walletsSnap, authList, withdrawalsSnap, auditSnap, settingsSnap] =
      await Promise.all([
        db.collection('users').limit(200).get(),
        db.collection('wallets').limit(200).get(),
        auth.listUsers(200),
        db.collection('withdrawalRequests').orderBy('createdAt', 'desc').limit(100).get(),
        db.collection('auditLogs').orderBy('createdAt', 'desc').limit(150).get(),
        db.collection('platformConfig').doc('settings').get(),
      ]);

    const walletMap = new Map<string, Record<string, unknown>>();
    for (const docSnap of walletsSnap.docs) {
      walletMap.set(docSnap.id, docSnap.data() as Record<string, unknown>);
    }

    const authMap = new Map<string, { email: string; emailVerified: boolean; disabled: boolean }>();
    for (const u of authList.users) {
      authMap.set(u.uid, {
        email: u.email || '',
        emailVerified: Boolean(u.emailVerified),
        disabled: Boolean(u.disabled),
      });
    }

    const users = usersSnap.docs.map((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const w = walletMap.get(docSnap.id);
      const a = authMap.get(docSnap.id);
      return {
        uid: String(d.uid || docSnap.id),
        email: a?.email || '',
        displayName: String(d.displayName || 'Utilisateur DROPP'),
        role: (d.role as 'client' | 'vendor' | 'admin') || 'client',
        vendorStatus: String(d.vendorStatus || 'none'),
        isCertified: Boolean(d.isCertified),
        disabled: Boolean(d.disabled || a?.disabled),
        emailVerified: Boolean(a?.emailVerified),
        city: String(d.city || 'Douala'),
        neighborhood: String(d.neighborhood || ''),
        shopId: typeof d.shopId === 'string' ? d.shopId : undefined,
        walletBalanceFcfa: Number(w?.availableFcfa ?? 0),
        pendingEscrowFcfa: Number(w?.pendingFcfa ?? 0),
        createdAt: isoFromVal(d.createdAt),
      };
    });

    const withdrawalRequests = withdrawalsSnap.docs.map((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      return {
        requestId: String(d.requestId || docSnap.id),
        userId: String(d.userId || ''),
        userName: String(d.userName || ''),
        userEmail: String(d.userEmail || ''),
        amountFcfa: Number(d.amountFcfa ?? 0),
        method: d.method === 'orange_money' ? 'orange_money' : 'mtn_momo',
        phone: String(d.phone || ''),
        status: (d.status as 'pending' | 'approved' | 'rejected') || 'pending',
        note: typeof d.note === 'string' ? d.note : undefined,
        createdAt: isoFromVal(d.createdAt),
        reviewedAt: d.reviewedAt ? isoFromVal(d.reviewedAt) : undefined,
        reviewedBy: typeof d.reviewedBy === 'string' ? d.reviewedBy : undefined,
      };
    });

    const auditLogs = auditSnap.docs.map((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      return {
        logId: String(d.logId || docSnap.id),
        actorId: String(d.actorId || ''),
        actorName: String(d.actorName || 'Super Admin'),
        action: String(d.action || ''),
        targetType: String(d.targetType || 'settings'),
        targetId: String(d.targetId || ''),
        details: String(d.details || ''),
        createdAt: isoFromVal(d.createdAt),
      };
    });

    const rawSettings = settingsSnap.data() as Record<string, unknown> | undefined;
    const platformSettings = {
      commissionPercent: Number(rawSettings?.commissionPercent ?? 5),
      enabledCategories: Array.isArray(rawSettings?.enabledCategories)
        ? rawSettings.enabledCategories
        : ['Mode', 'Électronique', 'Beauté', 'Alimentation', 'Maison', 'Autre'],
      announcement: rawSettings?.announcement ?? null,
      updatedAt: rawSettings?.updatedAt ? isoFromVal(rawSettings.updatedAt) : undefined,
      updatedBy: typeof rawSettings?.updatedBy === 'string' ? rawSettings.updatedBy : undefined,
    };

    res.status(200).json({
      users,
      withdrawalRequests,
      auditLogs,
      platformSettings,
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
      error: err instanceof Error ? err.message : 'Erreur serveur lors du chargement admin.',
    });
  }
}
