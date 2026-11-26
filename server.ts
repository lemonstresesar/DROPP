import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
const firebaseConfig = require('./firebase-applet-config.json') as {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
};

interface TestAccountSeed {
  email: string;
  password: string;
  displayName: string;
  role: 'client' | 'vendor' | 'admin';
  vendorStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';
  isCertified: boolean;
  city: string;
  neighborhood: string;
  shopId?: string;
  walletBalanceFcfa: number;
  referralCode: string;
}

const TEST_ACCOUNTS: TestAccountSeed[] = [
  {
    email: 'admin@dropp.test',
    password: process.env.DROPP_ADMIN_PASSWORD || 'Admin#Dropp2026',
    displayName: 'Super Admin DROPP',
    role: 'admin',
    vendorStatus: 'none',
    isCertified: true,
    city: 'Douala',
    neighborhood: 'Bonanjo',
    walletBalanceFcfa: 0,
    referralCode: 'DROPP-ADM01',
  },
  {
    email: 'vendeur1@dropp.test',
    password: process.env.DROPP_VENDOR1_PASSWORD || 'Vendeur1#2026',
    displayName: 'Maison Akwa Wax',
    role: 'vendor',
    vendorStatus: 'approved',
    isCertified: true,
    city: 'Douala',
    neighborhood: 'Akwa',
    shopId: 'shop-akwa-mode',
    walletBalanceFcfa: 0,
    referralCode: 'DROPP-AKWA1',
  },
  {
    email: 'vendeur2@dropp.test',
    password: process.env.DROPP_VENDOR2_PASSWORD || 'Vendeur2#2026',
    displayName: 'Bastos Tech Grossiste',
    role: 'vendor',
    vendorStatus: 'approved',
    isCertified: false,
    city: 'Yaoundé',
    neighborhood: 'Bastos',
    shopId: 'shop-bastos-tech',
    walletBalanceFcfa: 0,
    referralCode: 'DROPP-BAST2',
  },
  {
    email: 'vendeur3@dropp.test',
    password: process.env.DROPP_VENDOR3_PASSWORD || 'Vendeur3#2026',
    displayName: 'Karité Lab Cameroun',
    role: 'vendor',
    vendorStatus: 'pending',
    isCertified: false,
    city: 'Yaoundé',
    neighborhood: 'Biyem-Assi',
    shopId: 'shop-bonapriso-bio',
    walletBalanceFcfa: 0,
    referralCode: 'DROPP-KARI3',
  },
  {
    email: 'client@dropp.test',
    password: process.env.DROPP_CLIENT_PASSWORD || 'Client#2026',
    displayName: 'Client Démo Douala',
    role: 'client',
    vendorStatus: 'none',
    isCertified: false,
    city: 'Douala',
    neighborhood: 'Bonamoussadi',
    walletBalanceFcfa: 100000,
    referralCode: 'DROPP-CL2026',
  },
];

interface AuthSetupStatus {
  emailPasswordEnabled: boolean;
  seededCount: number;
  lastCheckedAt: string;
  details: string;
}

let authSetupStatus: AuthSetupStatus = {
  emailPasswordEnabled: false,
  seededCount: 0,
  lastCheckedAt: new Date().toISOString(),
  details: 'Initialisation en cours',
};

let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAt > now) {
    return cachedCerts.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Unable to fetch Google public certificates (${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  cachedCerts = { certs, expiresAt: now + 60 * 60 * 1000 };
  return certs;
}

interface VerifiedTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedTokenPayload> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
    aud?: string;
    iss?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm');
  }
  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown JWT key ID');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const validSig = verifier.verify(cert, Buffer.from(sigB64, 'base64url'));
  if (!validSig) {
    throw new Error('Invalid token signature');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseConfig.projectId) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }
  if (!payload.sub) {
    throw new Error('Token missing subject');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };
}

async function bootstrapTestAccounts(): Promise<AuthSetupStatus> {
  let seededCount = 0;
  let passwordDisabled = false;
  let lastMessage = 'Comptes de test vérifiés.';

  for (const account of TEST_ACCOUNTS) {
    try {
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
            displayName: account.displayName,
            returnSecureToken: false,
          }),
        }
      );
      const signUpData = (await signUpRes.json()) as {
        localId?: string;
        error?: { message?: string };
      };

      if (signUpRes.ok && signUpData.localId) {
        seededCount += 1;
        continue;
      }

      const errMsg = signUpData.error?.message || '';
      if (errMsg === 'EMAIL_EXISTS') {
        seededCount += 1;
        continue;
      }
      if (
        errMsg === 'OPERATION_NOT_ALLOWED' ||
        errMsg === 'PASSWORD_LOGIN_DISABLED' ||
        errMsg === 'ADMIN_ONLY_OPERATION'
      ) {
        passwordDisabled = true;
        lastMessage =
          'Email/Password non encore activé dans Firebase Console (Authentication > Sign-in method).';
        break;
      }
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : 'Erreur réseau Firebase Auth';
    }
  }

  authSetupStatus = {
    emailPasswordEnabled: !passwordDisabled && seededCount === TEST_ACCOUNTS.length,
    seededCount,
    lastCheckedAt: new Date().toISOString(),
    details: lastMessage,
  };
  return authSetupStatus;
}

function resolveAuthoritativePolicy(
  uid: string,
  email: string | undefined,
  displayName: string | undefined,
  emailVerified: boolean
) {
  const normalizedEmail = (email || '').toLowerCase();
  const matchedSeed = TEST_ACCOUNTS.find((a) => a.email === normalizedEmail);
  if (matchedSeed) {
    return {
      uid,
      email: matchedSeed.email,
      displayName: displayName || matchedSeed.displayName,
      role: matchedSeed.role,
      vendorStatus: matchedSeed.vendorStatus,
      isCertified: matchedSeed.isCertified,
      city: matchedSeed.city,
      neighborhood: matchedSeed.neighborhood,
      shopId: matchedSeed.shopId,
      walletBalanceFcfa: matchedSeed.walletBalanceFcfa,
      pendingEscrowFcfa: 0,
      referralCode: matchedSeed.referralCode,
      emailVerified,
    };
  }

  if (normalizedEmail === 'yvanfloriansidioboutchouang@gmail.com' && emailVerified) {
    return {
      uid,
      email: normalizedEmail,
      displayName: displayName || 'Administrateur DROPP',
      role: 'admin' as const,
      vendorStatus: 'none' as const,
      isCertified: true,
      city: 'Douala',
      neighborhood: 'Bonanjo',
      walletBalanceFcfa: 0,
      pendingEscrowFcfa: 0,
      referralCode: 'DROPP-OWNER',
      emailVerified,
    };
  }

  const suffix = uid.slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return {
    uid,
    email: normalizedEmail,
    displayName: displayName || 'Utilisateur DROPP',
    role: 'client' as const,
    vendorStatus: 'none' as const,
    isCertified: false,
    city: 'Douala',
    neighborhood: 'Akwa',
    walletBalanceFcfa: 0,
    pendingEscrowFcfa: 0,
    referralCode: `DROPP-${suffix}`,
    emailVerified,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health & Firebase auth provider setup status (no secrets exposed)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      projectId: firebaseConfig.projectId,
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
      ),
      authSetupStatus,
    });
  });

  // Trigger idempotent test account creation (no passwords returned)
  app.post('/api/auth/bootstrap-accounts', async (_req, res) => {
    const status = await bootstrapTestAccounts();
    res.json(status);
  });

  // Authoritative role, vendor status, and wallet balance resolved server-side from Firebase ID token
  app.get('/api/me/session', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
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
      res.json({
        ...profile,
        avatarUrl: verified.picture || undefined,
      });
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Jeton Firebase invalide.',
      });
    }
  });

  // Signed Cloudinary upload endpoint (server verifies token + vendor/admin role)
  app.post('/api/cloudinary/sign', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
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
        res.json({
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

      res.json({
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
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { maxAge: '7d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`DROPP server listening on http://0.0.0.0:${port}`);
    bootstrapTestAccounts()
      .then((status) => {
        console.log('[DROPP Bootstrap]', JSON.stringify(status));
      })
      .catch((err) => {
        console.warn('[DROPP Bootstrap Warning]', err);
      });
  });
}

startServer();
