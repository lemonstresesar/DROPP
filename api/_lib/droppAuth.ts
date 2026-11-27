import { createRequire } from 'node:module';
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
export const firebaseConfig = require('../../firebase-applet-config.json') as {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
};

export type DroppRole = 'client' | 'vendor' | 'admin';
export type DroppVendorStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';

export interface AuthoritativeSession {
  uid: string;
  email: string;
  displayName: string;
  role: DroppRole;
  vendorStatus: DroppVendorStatus;
  isCertified: boolean;
  city: string;
  neighborhood: string;
  shopId?: string;
  walletBalanceFcfa: number;
  pendingEscrowFcfa: number;
  referralBonusEarnedFcfa: number;
  referredByCode?: string;
  hasCompletedFirstOrder?: boolean;
  referralCode: string;
  avatarUrl?: string;
  emailVerified: boolean;
  disabled?: boolean;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export class ServerConfigError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = 'ServerConfigError';
    this.status = status;
  }
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;

  let jsonStr = raw;
  if (!raw.startsWith('{')) {
    try {
      jsonStr = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      throw new ServerConfigError(
        'Variable FIREBASE_SERVICE_ACCOUNT invalide (JSON ou base64 attendu).'
      );
    }
  }

  try {
    const parsed = JSON.parse(jsonStr) as ServiceAccount & {
      private_key?: string;
      project_id?: string;
      client_email?: string;
    };
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (!parsed.project_id && !parsed.projectId) {
      throw new Error('project_id manquant');
    }
    return parsed;
  } catch (err) {
    throw new ServerConfigError(
      `FIREBASE_SERVICE_ACCOUNT illisible: ${err instanceof Error ? err.message : 'JSON invalide'}`
    );
  }
}

export function hasAdminCredentialsConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  );
}

let cachedAdminApp: App | null = null;
let cachedPublicVerifyApp: App | null = null;

export function getAdminApp(): App {
  if (cachedAdminApp) return cachedAdminApp;

  const sa = parseServiceAccountFromEnv();
  if (!sa && !process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    throw new ServerConfigError(
      'Configuration serveur manquante: définissez FIREBASE_SERVICE_ACCOUNT.'
    );
  }

  const existing = getApps().find((a) => a.name === 'dropp-admin');
  if (existing) {
    cachedAdminApp = existing;
    return existing;
  }

  cachedAdminApp = initializeApp(
    sa
      ? {
          credential: cert(sa),
          projectId: firebaseConfig.projectId,
        }
      : {
          projectId: firebaseConfig.projectId,
        },
    'dropp-admin'
  );
  return cachedAdminApp;
}

function getTokenVerifierApp(): App {
  if (hasAdminCredentialsConfigured()) {
    return getAdminApp();
  }
  if (cachedPublicVerifyApp) return cachedPublicVerifyApp;
  const existing = getApps().find((a) => a.name === 'dropp-token-verify');
  if (existing) {
    cachedPublicVerifyApp = existing;
    return existing;
  }
  cachedPublicVerifyApp = getApps().length
    ? getApp()
    : initializeApp({ projectId: firebaseConfig.projectId }, 'dropp-token-verify');
  return cachedPublicVerifyApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore {
  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId?.trim();
  if (dbId && dbId !== '(default)') {
    return getFirestore(app, dbId);
  }
  return getFirestore(app);
}

export function extractBearerToken(req: { headers?: Record<string, unknown> }): string {
  const rawHeader = req.headers?.authorization;
  if (typeof rawHeader !== 'string') return '';
  if (!rawHeader.startsWith('Bearer ')) return '';
  return rawHeader.slice(7).trim();
}

export async function verifyIdTokenOrThrow(token: string) {
  if (!token) {
    throw new AuthError('Jeton d’authentification requis.', 401);
  }
  try {
    const auth = getAuth(getTokenVerifierApp());
    return await auth.verifyIdToken(token);
  } catch (err) {
    throw new AuthError(
      err instanceof Error ? err.message : 'Jeton Firebase invalide.',
      401
    );
  }
}

export async function resolveAuthoritativeSession(token: string): Promise<AuthoritativeSession> {
  const decoded = await verifyIdTokenOrThrow(token);

  if (!hasAdminCredentialsConfigured()) {
    throw new ServerConfigError(
      'Configuration serveur manquante: définissez FIREBASE_SERVICE_ACCOUNT pour charger le profil.'
    );
  }

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const uid = decoded.uid;

  const [userSnap, adminSnap, walletSnap, shopsSnap, kycSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('admins').doc(uid).get(),
    db.collection('wallets').doc(uid).get(),
    db.collection('shops').where('ownerId', '==', uid).limit(5).get(),
    db.collection('kycApplications').where('userId', '==', uid).limit(5).get(),
  ]);

  const now = Timestamp.now();
  let userData = userSnap.data() as Record<string, unknown> | undefined;

  if (!userSnap.exists || !userData) {
    const cleanUidSuffix =
      uid.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'USER01';
    const initialDisplayName =
      (typeof decoded.name === 'string' && decoded.name.trim().length >= 2
        ? decoded.name.trim().slice(0, 80)
        : typeof decoded.email === 'string' && decoded.email.includes('@')
          ? decoded.email.split('@')[0].slice(0, 80)
          : 'Utilisateur DROPP');

    const newProfile: Record<string, unknown> = {
      uid,
      displayName: initialDisplayName,
      role: adminSnap.exists ? 'admin' : 'client',
      vendorStatus: 'none',
      isCertified: adminSnap.exists,
      city: 'Douala',
      neighborhood: 'Akwa',
      referralCode: `DROPP-${cleanUidSuffix}`,
      createdAt: now,
      updatedAt: now,
    };
    if (typeof decoded.picture === 'string' && decoded.picture) {
      newProfile.avatarUrl = decoded.picture.slice(0, 500);
    }

    const batch = db.batch();
    batch.set(db.collection('users').doc(uid), newProfile, { merge: true });

    if (typeof decoded.email === 'string' && decoded.email.trim()) {
      batch.set(
        db.collection('users').doc(uid).collection('private').doc('info'),
        {
          uid,
          email: decoded.email.trim().toLowerCase(),
          updatedAt: now,
        },
        { merge: true }
      );
    }

    if (!adminSnap.exists && !walletSnap.exists) {
      batch.set(db.collection('wallets').doc(uid), {
        userId: uid,
        availableFcfa: 0,
        pendingFcfa: 0,
        referralFcfa: 0,
        updatedAt: now,
      });
    }

    await batch.commit();
    userData = newProfile;
  }

  if (userData.disabled === true) {
    throw new AuthError('Compte suspendu par l’administration DROPP.', 403);
  }

  const isAdmin = adminSnap.exists || userData.role === 'admin';

  // Pick owned shop from Firestore if any
  const ownedShops = shopsSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const preferredShop =
    ownedShops.find((s) => s.shopId === userData?.shopId) ||
    ownedShops.find((s) => s.vendorStatus === 'approved') ||
    ownedShops.find((s) => s.vendorStatus === 'suspended') ||
    ownedShops[0];

  const hasPendingKyc = kycSnap.docs.some((d) => d.data()?.status === 'pending');

  let role: DroppRole;
  let vendorStatus: DroppVendorStatus;
  let isCertified: boolean;
  let shopId: string | undefined;

  if (isAdmin) {
    role = 'admin';
    vendorStatus = 'none';
    isCertified = true;
    shopId = undefined; // Admin never has a vendor shop
  } else {
    const rawRole = userData.role === 'vendor' ? 'vendor' : 'client';
    const rawStatus = (userData.vendorStatus as DroppVendorStatus) || 'none';
    const shopStatus = (preferredShop?.vendorStatus as DroppVendorStatus | undefined) || undefined;

    if (rawStatus === 'suspended' || shopStatus === 'suspended') {
      vendorStatus = 'suspended';
      role = rawRole === 'vendor' || preferredShop ? 'vendor' : 'client';
    } else if (rawStatus === 'approved' && (preferredShop || userData.shopId)) {
      vendorStatus = 'approved';
      role = 'vendor';
    } else if (rawStatus === 'pending' || (rawStatus === 'none' && hasPendingKyc)) {
      vendorStatus = 'pending';
      role = rawRole;
    } else if (rawStatus === 'rejected') {
      vendorStatus = 'rejected';
      role = 'client';
    } else {
      vendorStatus = 'none';
      role = 'client';
    }

    shopId =
      typeof userData.shopId === 'string' && userData.shopId
        ? userData.shopId
        : typeof preferredShop?.shopId === 'string'
          ? preferredShop.shopId
          : undefined;
    isCertified = Boolean(userData.isCertified || preferredShop?.isCertified);
  }

  // Synchronize Custom Claims when out of sync
  const currentClaims = decoded as Record<string, unknown>;
  const desiredShopId = shopId ?? null;
  if (
    currentClaims.role !== role ||
    currentClaims.vendorStatus !== vendorStatus ||
    (currentClaims.shopId ?? null) !== desiredShopId ||
    Boolean(currentClaims.isCertified) !== isCertified
  ) {
    await auth.setCustomUserClaims(uid, {
      role,
      vendorStatus,
      shopId: desiredShopId,
      isCertified,
    });
  }

  const walletData = walletSnap.data() as Record<string, unknown> | undefined;
  const walletBalanceFcfa = isAdmin ? 0 : Number(walletData?.availableFcfa ?? 0);
  const pendingEscrowFcfa = isAdmin ? 0 : Number(walletData?.pendingFcfa ?? 0);
  const referralBonusEarnedFcfa = isAdmin ? 0 : Number(walletData?.referralFcfa ?? 0);

  const fallbackSuffix =
    uid.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'USER01';

  return {
    uid,
    email: typeof decoded.email === 'string' ? decoded.email : '',
    displayName:
      typeof userData.displayName === 'string' && userData.displayName
        ? userData.displayName
        : typeof decoded.name === 'string' && decoded.name
          ? decoded.name
          : 'Utilisateur DROPP',
    role,
    vendorStatus,
    isCertified,
    city: typeof userData.city === 'string' && userData.city ? userData.city : 'Douala',
    neighborhood:
      typeof userData.neighborhood === 'string' && userData.neighborhood
        ? userData.neighborhood
        : 'Akwa',
    shopId,
    walletBalanceFcfa,
    pendingEscrowFcfa,
    referralBonusEarnedFcfa,
    referredByCode:
      typeof userData.referredByCode === 'string' ? userData.referredByCode : undefined,
    hasCompletedFirstOrder: Boolean(userData.hasCompletedFirstOrder),
    referralCode:
      typeof userData.referralCode === 'string' && userData.referralCode
        ? userData.referralCode
        : `DROPP-${fallbackSuffix}`,
    avatarUrl:
      typeof userData.avatarUrl === 'string' && userData.avatarUrl
        ? userData.avatarUrl
        : typeof decoded.picture === 'string'
          ? decoded.picture
          : undefined,
    emailVerified: Boolean(decoded.email_verified),
    disabled: Boolean(userData.disabled),
  };
}

export async function assertAdminSession(token: string): Promise<AuthoritativeSession> {
  const session = await resolveAuthoritativeSession(token);
  if (session.role !== 'admin') {
    throw new AuthError('Accès réservé au Super Admin.', 403);
  }
  if (!session.emailVerified) {
    throw new AuthError('E-mail administrateur non vérifié.', 403);
  }
  return session;
}

export async function assertVerifiedSession(token: string): Promise<AuthoritativeSession> {
  const session = await resolveAuthoritativeSession(token);
  if (!session.emailVerified) {
    throw new AuthError(
      'Veuillez vérifier votre adresse e-mail avant d’effectuer une opération financière.',
      403
    );
  }
  return session;
}
