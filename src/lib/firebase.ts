import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let cachedAuthPromise: Promise<{ app: FirebaseApp; auth: Auth }> | null = null;
let cachedServicesPromise: Promise<FirebaseServices> | null = null;
let cachedAuthInstance: Auth | null = null;
let connectionTested = false;

export async function getFirebaseAuth(): Promise<{ app: FirebaseApp; auth: Auth }> {
  if (!cachedAuthPromise) {
    cachedAuthPromise = (async () => {
      const [{ initializeApp, getApps, getApp }, { getAuth }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      cachedAuthInstance = auth;
      return { app, auth };
    })();
  }
  return cachedAuthPromise;
}

export async function getFirebaseServices(): Promise<FirebaseServices> {
  if (!cachedServicesPromise) {
    cachedServicesPromise = (async () => {
      const [{ app, auth }, { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, doc, getDocFromServer }] =
        await Promise.all([
          getFirebaseAuth(),
          import('firebase/firestore'),
        ]);

      let db: Firestore;
      try {
        db = initializeFirestore(
          app,
          {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          },
          firebaseConfig.firestoreDatabaseId
        );
      } catch {
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      }

      if (!connectionTested) {
        connectionTested = true;
        getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error('Firestore offline or unreachable configuration.');
          }
        });
      }

      return { app, auth, db };
    })();
  }
  return cachedServicesPromise;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = cachedAuthInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
