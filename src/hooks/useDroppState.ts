import { useCallback, useEffect, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type {
  AdminUserRecord,
  AppNotification,
  AuditLogEntry,
  ChatMessage,
  Conversation,
  DealOfferCard,
  DisputeRecord,
  FeedPost,
  LanguageCode,
  LocalCartPreviewItem,
  MarketplaceCategory,
  NotificationPrefs,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  PlatformSettings,
  PostComment,
  ProductReview,
  QueuedAction,
  RfqOffer,
  RfqRequest,
  ShopProfile,
  UserSession,
  VendorKycApplication,
  WalletTransaction,
  WithdrawalRequestRecord,
} from '../types/dropp';
import {
  enqueueOfflineAction,
  getRetryableActions,
  markQueuedActionStatus,
} from '../utils/offlineQueue';
import { DEMO_POSTS, DEMO_SHOPS } from '../data/demoData';
import {
  canBuyerCancelOrder,
  canBuyerDisputeOrder,
} from '../utils/commerce';
import {
  canBuy,
  canCreateRfq,
  canLikeAndComment,
  canManageOwnSalesOrders,
  canModerate,
  canPublishPostOrStory,
  canRequestVendorKyc,
  canRespondToRfq,
  canSendMessage,
  isAdminUser,
  isSuspendedVendor,
} from '../utils/permissions';
import { getFirebaseServices } from '../lib/firebase';

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  commissionPercent: 5,
  enabledCategories: ['Mode', 'Électronique', 'Beauté', 'Alimentation', 'Maison', 'Autre'],
  announcement: null,
};

const PREF_STORAGE_KEYS = {
  lang: 'dropp_lang',
  notifPrefs: 'dropp_notif_prefs',
  appRating: 'dropp_app_rating',
};

const LEGACY_KEYS_TO_PURGE = [
  'dropp_wallet_overrides',
  'dropp_posts_cache',
  'dropp_shops_cache',
  'dropp_orders_cache',
  'dropp_tx_cache',
  'dropp_disputes_cache',
  'dropp_conversations_cache',
  'dropp_rfqs_cache',
  'dropp_kyc_cache',
  'dropp_liked_posts',
  'dropp_bookmarked_posts',
  'dropp_following_shops',
  'dropp_comments_cache',
  'dropp_reviews_cache',
  'dropp_notifs_cache',
  'dropp_cart_preview',
  'dropp_offline_queue',
  'dropp_recent_posts',
];

function userCartKey(scope: string): string {
  return `dropp_cart_${scope}`;
}

function userQueueKey(scope: string): string {
  return `dropp_queue_${scope}`;
}

function userRecentKey(scope: string): string {
  return `dropp_recent_${scope}`;
}

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues on entry-level Android devices
  }
}

function removeStorageKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toISOString();
  if (typeof val === 'object') {
    const maybeTs = val as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      return maybeTs.toDate().toISOString();
    }
    if (typeof maybeTs.seconds === 'number') {
      return new Date(maybeTs.seconds * 1000).toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeShopDoc(raw: Record<string, unknown>, id: string): ShopProfile {
  return {
    shopId: String(raw.shopId || id),
    ownerId: String(raw.ownerId || ''),
    name: String(raw.name || 'Boutique DROPP'),
    handle: String(raw.handle || '@dropp'),
    city: raw.city === 'Yaoundé' ? 'Yaoundé' : 'Douala',
    neighborhood: String(raw.neighborhood || 'Akwa'),
    category: (raw.category as MarketplaceCategory) || 'Mode',
    isCertified: Boolean(raw.isCertified),
    isPremium: Boolean(raw.isPremium),
    vendorStatus: (raw.vendorStatus as ShopProfile['vendorStatus']) || 'pending',
    memberSinceYear: typeof raw.memberSinceYear === 'number' ? raw.memberSinceYear : 2024,
    rating: typeof raw.rating === 'number' ? raw.rating : 5,
    salesCount: typeof raw.salesCount === 'number' ? raw.salesCount : 0,
    responseRate: typeof raw.responseRate === 'number' ? raw.responseRate : 100,
    followersCount: typeof raw.followersCount === 'number' ? raw.followersCount : 0,
    followingCount: typeof raw.followingCount === 'number' ? raw.followingCount : 0,
    likesCount: typeof raw.likesCount === 'number' ? raw.likesCount : 0,
    avatarUrl: String(raw.avatarUrl || ''),
    bio: String(raw.bio || ''),
    hasActiveStory: Boolean(raw.hasActiveStory),
    storyPreviewText: typeof raw.storyPreviewText === 'string' ? raw.storyPreviewText : undefined,
    storyMediaUrl: typeof raw.storyMediaUrl === 'string' ? raw.storyMediaUrl : undefined,
    storyExpiresAt: typeof raw.storyExpiresAt === 'string' ? raw.storyExpiresAt : undefined,
    isOnline: raw.isOnline !== undefined ? Boolean(raw.isOnline) : true,
    isDemo: Boolean(raw.isDemo),
  };
}

function normalizePostDoc(raw: Record<string, unknown>, id: string): FeedPost {
  return {
    postId: String(raw.postId || id),
    shopId: String(raw.shopId || ''),
    ownerId: String(raw.ownerId || ''),
    shopName: String(raw.shopName || 'Boutique DROPP'),
    shopHandle: String(raw.shopHandle || '@dropp'),
    shopAvatarUrl: String(raw.shopAvatarUrl || ''),
    shopCertified: Boolean(raw.shopCertified),
    city: raw.city === 'Yaoundé' ? 'Yaoundé' : 'Douala',
    neighborhood: String(raw.neighborhood || 'Akwa'),
    title: String(raw.title || ''),
    description: String(raw.description || ''),
    category: (raw.category as MarketplaceCategory) || 'Mode',
    mediaType: raw.mediaType === 'carousel' ? 'carousel' : 'video',
    videoUrl: String(raw.videoUrl || ''),
    posterUrl: String(raw.posterUrl || ''),
    galleryUrls: Array.isArray(raw.galleryUrls) ? (raw.galleryUrls as string[]) : undefined,
    priceFcfa: Number(raw.priceFcfa || 0),
    promoPercent: typeof raw.promoPercent === 'number' ? raw.promoPercent : undefined,
    moq: Math.max(1, Number(raw.moq || 1)),
    samplePriceFcfa: typeof raw.samplePriceFcfa === 'number' ? raw.samplePriceFcfa : undefined,
    tiers: Array.isArray(raw.tiers) ? (raw.tiers as FeedPost['tiers']) : [],
    variants: Array.isArray(raw.variants) && raw.variants.length > 0
      ? (raw.variants as FeedPost['variants'])
      : [{ id: 'v1', label: 'Standard', stock: 20, priceDeltaFcfa: 0 }],
    specs: Array.isArray(raw.specs) ? (raw.specs as FeedPost['specs']) : [],
    likesCount: Number(raw.likesCount || 0),
    commentsCount: Number(raw.commentsCount || 0),
    bookmarksCount: Number(raw.bookmarksCount || 0),
    sharesCount: Number(raw.sharesCount || 0),
    rating: Number(raw.rating || 5),
    status: (raw.status as FeedPost['status']) || 'published',
    createdAt: toIsoString(raw.createdAt),
    isDemo: Boolean(raw.isDemo),
  };
}

function normalizeOrderDoc(raw: Record<string, unknown>, id: string): OrderRecord {
  return {
    orderId: String(raw.orderId || id),
    globalOrderId: String(raw.globalOrderId || raw.orderId || id),
    buyerId: String(raw.buyerId || ''),
    buyerName: String(raw.buyerName || 'Client DROPP'),
    shopId: String(raw.shopId || ''),
    shopName: String(raw.shopName || 'Boutique'),
    vendorOwnerId: typeof raw.vendorOwnerId === 'string' ? raw.vendorOwnerId : undefined,
    items: Array.isArray(raw.items) ? (raw.items as LocalCartPreviewItem[]) : [],
    subtotalFcfa: Number(raw.subtotalFcfa || 0),
    shippingFeeFcfa: Number(raw.shippingFeeFcfa || 0),
    totalFcfa: Number(raw.totalFcfa || 0),
    paymentMethod: (raw.paymentMethod as PaymentMethod) || 'mtn_momo',
    escrowStatus: (raw.escrowStatus as OrderRecord['escrowStatus']) || 'held',
    status: (raw.status as OrderStatus) || 'pending',
    deliveryCity: String(raw.deliveryCity || 'Douala'),
    deliveryNeighborhood: String(raw.deliveryNeighborhood || 'Akwa'),
    deliveryPhone: String(raw.deliveryPhone || ''),
    createdAt: toIsoString(raw.createdAt),
    deliveredAt: raw.deliveredAt ? toIsoString(raw.deliveredAt) : undefined,
    rated: Boolean(raw.rated),
    disputeId: typeof raw.disputeId === 'string' ? raw.disputeId : undefined,
    idempotencyKey: typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : undefined,
  };
}

function normalizeDisputeDoc(raw: Record<string, unknown>, id: string): DisputeRecord {
  return {
    disputeId: String(raw.disputeId || id),
    orderId: String(raw.orderId || ''),
    buyerId: String(raw.buyerId || ''),
    buyerName: String(raw.buyerName || 'Client DROPP'),
    shopId: String(raw.shopId || ''),
    shopName: String(raw.shopName || 'Boutique'),
    vendorOwnerId: typeof raw.vendorOwnerId === 'string' ? raw.vendorOwnerId : undefined,
    reason: String(raw.reason || ''),
    amountHeldFcfa: Number(raw.amountHeldFcfa || 0),
    status: (raw.status as DisputeRecord['status']) || 'open',
    resolutionNote: typeof raw.resolutionNote === 'string' ? raw.resolutionNote : undefined,
    createdAt: toIsoString(raw.createdAt),
  };
}

function normalizeKycDoc(raw: Record<string, unknown>, id: string): VendorKycApplication {
  return {
    applicationId: String(raw.applicationId || id),
    userId: String(raw.userId || ''),
    applicantName: String(raw.applicantName || 'Candidat'),
    shopName: String(raw.shopName || ''),
    city: raw.city === 'Yaoundé' ? 'Yaoundé' : 'Douala',
    neighborhood: String(raw.neighborhood || 'Akwa'),
    category: (raw.category as MarketplaceCategory) || 'Mode',
    cniNumber: String(raw.cniNumber || ''),
    cniFrontUrl: String(raw.cniFrontUrl || ''),
    cniBackUrl: String(raw.cniBackUrl || ''),
    selfieUrl: String(raw.selfieUrl || ''),
    status: (raw.status as VendorKycApplication['status']) || 'pending',
    rejectionReason: typeof raw.rejectionReason === 'string' ? raw.rejectionReason : undefined,
    submittedAt: toIsoString(raw.submittedAt || raw.createdAt),
  };
}

export function useDroppState(isOnline: boolean) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    const saved = readStorageJson<LanguageCode>(PREF_STORAGE_KEYS.lang, 'fr');
    return saved === 'en' ? 'en' : 'fr';
  });

  // Purge any legacy client-stored business caches or role/wallet overrides immediately
  useEffect(() => {
    for (const key of LEGACY_KEYS_TO_PURGE) {
      removeStorageKey(key);
    }
  }, []);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReloadKey, setCatalogReloadKey] = useState<number>(0);

  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [followedShopIds, setFollowedShopIds] = useState<string[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [reviewsByPost, setReviewsByPost] = useState<Record<string, ProductReview[]>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [activeReviewsPostId, setActiveReviewsPostId] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [rfqs, setRfqs] = useState<RfqRequest[]>([]);
  const [kycApplications, setKycApplications] = useState<VendorKycApplication[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() =>
    readStorageJson<NotificationPrefs>(PREF_STORAGE_KEYS.notifPrefs, {
      orders: true,
      messages: true,
      following: true,
      promos: true,
    })
  );
  const [appRating, setAppRating] = useState<number>(() =>
    readStorageJson<number>(PREF_STORAGE_KEYS.appRating, 0)
  );

  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const storageScope = session?.uid || firebaseUid || 'guest';
  const [cartItems, setCartItems] = useState<LocalCartPreviewItem[]>(() =>
    readStorageJson<LocalCartPreviewItem[]>(userCartKey('guest'), [])
  );
  const [offlineQueue, setOfflineQueue] = useState<QueuedAction[]>(() =>
    readStorageJson<QueuedAction[]>(userQueueKey('guest'), [])
  );
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    readStorageJson<string[]>(userRecentKey('guest'), [])
  );

  const flushingRef = useRef<boolean>(false);
  const sessionRef = useRef<UserSession | null>(null);
  sessionRef.current = session;

  // Reload per-user localStorage state when account changes
  useEffect(() => {
    setCartItems(readStorageJson<LocalCartPreviewItem[]>(userCartKey(storageScope), []));
    setOfflineQueue(readStorageJson<QueuedAction[]>(userQueueKey(storageScope), []));
    setRecentlyViewedIds(readStorageJson<string[]>(userRecentKey(storageScope), []));
  }, [storageScope]);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    writeStorageJson(PREF_STORAGE_KEYS.lang, next);
  }, []);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  const pushNotification = useCallback(
    (category: keyof NotificationPrefs, title: string, body: string) => {
      if (!notifPrefs[category]) return;
      setNotifications((prev) =>
        [
          {
            notifId: `N-${Date.now()}`,
            category,
            title,
            body,
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 30)
      );
    },
    [notifPrefs]
  );

  const fetchServerSession = useCallback(
    async (firebaseUser: FirebaseUser, forceRefresh = false) => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const idToken = await firebaseUser.getIdToken(forceRefresh);
        const res = await fetch('/api/me/session', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) {
          let errText = `Erreur serveur (${res.status})`;
          try {
            const errJson = (await res.json()) as { error?: string };
            if (errJson?.error) errText = errJson.error;
          } catch {
            // Keep HTTP code message
          }
          setSession(null);
          setProfileError(errText);
          return;
        }
        const serverProfile = (await res.json()) as UserSession;
        setSession(serverProfile);
        setProfileError(null);
      } catch (err) {
        setSession(null);
        setProfileError(
          err instanceof Error
            ? err.message
            : 'Impossible de contacter le serveur de session.'
        );
      } finally {
        setProfileLoading(false);
        setAuthReady(true);
      }
    },
    []
  );

  const retryProfileLoad = useCallback(async () => {
    try {
      const { auth } = await getFirebaseServices();
      if (auth.currentUser) {
        await fetchServerSession(auth.currentUser, true);
      }
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Erreur lors du rechargement du profil.'
      );
    }
  }, [fetchServerSession]);

  const retryCatalogLoad = useCallback(() => {
    setCatalogReloadKey((k) => k + 1);
  }, []);

  const callApiWithAuth = useCallback(
    async <T = Record<string, unknown>>(
      url: string,
      init: RequestInit = {}
    ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> => {
      try {
        const { auth } = await getFirebaseServices();
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          return { ok: false, status: 401, error: 'Session expirée : reconnectez-vous.' };
        }
        const headers = new Headers(init.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        if (init.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
        const res = await fetch(url, { ...init, headers });
        const json = (await res.json().catch(() => ({}))) as T & {
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            data: json,
            error: json.error || json.message || `Erreur serveur (${res.status})`,
          };
        }
        return { ok: true, status: res.status, data: json };
      } catch (err) {
        return {
          ok: false,
          status: 0,
          error: err instanceof Error ? err.message : 'Erreur réseau lors de la requête serveur.',
        };
      }
    },
    []
  );

  const refreshAdminOverview = useCallback(async () => {
    if (!isAdminUser(sessionRef.current)) return;
    setAdminLoading(true);
    try {
      const res = await callApiWithAuth<{
        users?: AdminUserRecord[];
        withdrawalRequests?: WithdrawalRequestRecord[];
        auditLogs?: AuditLogEntry[];
        platformSettings?: PlatformSettings;
      }>('/api/admin/overview', { method: 'GET' });
      if (res.ok && res.data) {
        if (Array.isArray(res.data.users)) setAdminUsers(res.data.users);
        if (Array.isArray(res.data.withdrawalRequests)) {
          setWithdrawalRequests(res.data.withdrawalRequests);
        }
        if (Array.isArray(res.data.auditLogs)) setAuditLogs(res.data.auditLogs);
        if (res.data.platformSettings) setPlatformSettings(res.data.platformSettings);
      } else if (res.error) {
        setActionError(res.error);
      }
    } finally {
      setAdminLoading(false);
    }
  }, [callApiWithAuth]);

  // Firebase Auth state listener
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        const [{ auth }, { onAuthStateChanged }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/auth'),
        ]);

        if (!active) return;

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!active) return;
          if (!firebaseUser) {
            setFirebaseUid(null);
            setSession(null);
            setProfileError(null);
            setProfileLoading(false);
            setAuthReady(true);
            return;
          }
          setFirebaseUid(firebaseUser.uid);
          await fetchServerSession(firebaseUser, false);
        });
      } catch (err) {
        if (active) {
          setProfileError(
            err instanceof Error ? err.message : 'Initialisation Firebase Auth impossible.'
          );
          setAuthReady(true);
        }
      }
    };

    const idleTimer = setTimeout(initAuth, 30);
    return () => {
      active = false;
      clearTimeout(idleTimer);
      unsubscribe?.();
    };
  }, [fetchServerSession]);

  // Real-time public & role-scoped Catalog (Shops + Posts) from Firestore
  useEffect(() => {
    let active = true;
    const unsubs: Array<() => void> = [];

    const subscribeCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [{ db }, { collection, doc, query, where, onSnapshot }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        if (!active) return;

        unsubs.push(
          onSnapshot(
            doc(db, 'platformConfig', 'settings'),
            (snap) => {
              if (!active || !snap.exists()) return;
              const raw = snap.data() as Record<string, unknown>;
              setPlatformSettings({
                commissionPercent: Number(raw.commissionPercent ?? 5),
                enabledCategories: Array.isArray(raw.enabledCategories)
                  ? (raw.enabledCategories as MarketplaceCategory[])
                  : DEFAULT_PLATFORM_SETTINGS.enabledCategories,
                announcement: (raw.announcement as PlatformSettings['announcement']) ?? null,
                updatedAt: raw.updatedAt ? toIsoString(raw.updatedAt) : undefined,
                updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
              });
            },
            () => undefined
          )
        );

        const approvedShopsMap = new Map<string, ShopProfile>();
        const ownedOrAllShopsMap = new Map<string, ShopProfile>();
        const publishedPostsMap = new Map<string, FeedPost>();
        const ownedOrAllPostsMap = new Map<string, FeedPost>();

        const emitShops = () => {
          if (!active) return;
          const merged = new Map<string, ShopProfile>();
          for (const [id, s] of approvedShopsMap) merged.set(id, s);
          for (const [id, s] of ownedOrAllShopsMap) merged.set(id, s);
          const list = Array.from(merged.values());
          setShops(list.length > 0 ? list : DEMO_SHOPS);
          setCatalogLoading(false);
        };

        const emitPosts = () => {
          if (!active) return;
          const merged = new Map<string, FeedPost>();
          for (const [id, p] of publishedPostsMap) merged.set(id, p);
          for (const [id, p] of ownedOrAllPostsMap) merged.set(id, p);
          const list = Array.from(merged.values());
          const sorted = (list.length > 0 ? list : DEMO_POSTS).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setPosts(sorted);
          setCatalogLoading(false);
        };

        const isAdmin = isAdminUser(session);

        if (isAdmin) {
          unsubs.push(
            onSnapshot(
              collection(db, 'shops'),
              (snap) => {
                ownedOrAllShopsMap.clear();
                snap.forEach((docSnap) => {
                  ownedOrAllShopsMap.set(
                    docSnap.id,
                    normalizeShopDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
                  );
                });
                emitShops();
              },
              (err) => {
                if (active) {
                  setCatalogError(err.message);
                  setCatalogLoading(false);
                }
              }
            )
          );
          unsubs.push(
            onSnapshot(
              collection(db, 'posts'),
              (snap) => {
                ownedOrAllPostsMap.clear();
                snap.forEach((docSnap) => {
                  ownedOrAllPostsMap.set(
                    docSnap.id,
                    normalizePostDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
                  );
                });
                emitPosts();
              },
              (err) => {
                if (active) {
                  setCatalogError(err.message);
                  setCatalogLoading(false);
                }
              }
            )
          );
        } else {
          unsubs.push(
            onSnapshot(
              query(collection(db, 'shops'), where('vendorStatus', '==', 'approved')),
              (snap) => {
                approvedShopsMap.clear();
                snap.forEach((docSnap) => {
                  approvedShopsMap.set(
                    docSnap.id,
                    normalizeShopDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
                  );
                });
                emitShops();
              },
              (err) => {
                if (active) {
                  setCatalogError(err.message);
                  setCatalogLoading(false);
                }
              }
            )
          );

          unsubs.push(
            onSnapshot(
              query(collection(db, 'posts'), where('status', '==', 'published')),
              (snap) => {
                publishedPostsMap.clear();
                snap.forEach((docSnap) => {
                  publishedPostsMap.set(
                    docSnap.id,
                    normalizePostDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
                  );
                });
                emitPosts();
              },
              (err) => {
                if (active) {
                  setCatalogError(err.message);
                  setCatalogLoading(false);
                }
              }
            )
          );

          if (session?.uid) {
            unsubs.push(
              onSnapshot(
                query(collection(db, 'shops'), where('ownerId', '==', session.uid)),
                (snap) => {
                  ownedOrAllShopsMap.clear();
                  snap.forEach((docSnap) => {
                    ownedOrAllShopsMap.set(
                      docSnap.id,
                      normalizeShopDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
                    );
                  });
                  emitShops();
                }
              )
            );
            if (session.role === 'vendor') {
              unsubs.push(
                onSnapshot(
                  query(collection(db, 'posts'), where('ownerId', '==', session.uid)),
                  (snap) => {
                    ownedOrAllPostsMap.clear();
                    snap.forEach((docSnap) => {
                      ownedOrAllPostsMap.set(
                        docSnap.id,
                        normalizePostDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
                      );
                    });
                    emitPosts();
                  }
                )
              );
            }
          }
        }
      } catch (err) {
        if (active) {
          setCatalogError(
            err instanceof Error ? err.message : 'Erreur de lecture du catalogue Firestore.'
          );
          setCatalogLoading(false);
        }
      }
    };

    subscribeCatalog();
    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
  }, [session?.uid, session?.role, catalogReloadKey]);

  // Real-time User-scoped Firestore Listeners (Profile role watch, Wallet, Bookmarks, Following, Orders, Disputes, KYC, Chats, RFQs)
  useEffect(() => {
    if (!session?.uid) {
      setLikedIds([]);
      setBookmarkedIds([]);
      setFollowedShopIds([]);
      setOrders([]);
      setTransactions([]);
      setDisputes([]);
      setConversations([]);
      setRfqs([]);
      setKycApplications([]);
      setWithdrawalRequests([]);
      setAdminUsers([]);
      setAuditLogs([]);
      return;
    }

    const uid = session.uid;
    const isAdmin = isAdminUser(session);
    const isVendorOrPendingShop = session.role === 'vendor' || Boolean(session.shopId);
    let active = true;
    const unsubs: Array<() => void> = [];
    const convMessageUnsubs = new Map<string, () => void>();
    const rfqOfferUnsubs = new Map<string, () => void>();

    const subscribeUserScoped = async () => {
      try {
        const [{ auth, db }, { collection, doc, query, where, onSnapshot }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        if (!active) return;

        // 1. Live user role/status sync (without reload/cache clear when admin approves KYC or suspends)
        unsubs.push(
          onSnapshot(doc(db, 'users', uid), (snap) => {
            if (!active || !snap.exists()) return;
            const data = snap.data() as Record<string, unknown>;
            const cur = sessionRef.current;
            if (!cur) return;
            const remoteRole = data.role === 'admin' ? 'admin' : data.role === 'vendor' ? 'vendor' : 'client';
            const remoteStatus = (data.vendorStatus as UserSession['vendorStatus']) || 'none';
            const remoteShopId = typeof data.shopId === 'string' && data.shopId ? data.shopId : undefined;
            const remoteCert = Boolean(data.isCertified);
            if (
              cur.role !== remoteRole ||
              cur.vendorStatus !== remoteStatus ||
              cur.shopId !== remoteShopId ||
              cur.isCertified !== remoteCert
            ) {
              if (auth.currentUser) {
                fetchServerSession(auth.currentUser, true);
              }
            }
          })
        );

        // 2. Wallet & Transactions (never for admin)
        if (!isAdmin) {
          unsubs.push(
            onSnapshot(doc(db, 'wallets', uid), (snap) => {
              if (!active || !snap.exists()) return;
              const w = snap.data() as Record<string, unknown>;
              setSession((prev) =>
                prev && prev.uid === uid
                  ? {
                      ...prev,
                      walletBalanceFcfa: Number(w.availableFcfa ?? prev.walletBalanceFcfa),
                      pendingEscrowFcfa: Number(w.pendingFcfa ?? prev.pendingEscrowFcfa),
                      referralBonusEarnedFcfa: Number(
                        w.referralFcfa ?? prev.referralBonusEarnedFcfa ?? 0
                      ),
                    }
                  : prev
              );
            })
          );

          unsubs.push(
            onSnapshot(
              query(collection(db, 'walletTransactions'), where('userId', '==', uid)),
              (snap) => {
                if (!active) return;
                const list: WalletTransaction[] = [];
                snap.forEach((d) => {
                  const r = d.data() as Record<string, unknown>;
                  list.push({
                    txId: String(r.txId || d.id),
                    userId: String(r.userId || uid),
                    type: (r.type as WalletTransaction['type']) || 'deposit',
                    amountFcfa: Number(r.amountFcfa || 0),
                    methodLabel: String(r.methodLabel || ''),
                    referenceId: typeof r.referenceId === 'string' ? r.referenceId : undefined,
                    status: r.status === 'failed' ? 'failed' : 'completed',
                    createdAt: toIsoString(r.createdAt),
                  });
                });
                list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setTransactions(list);
              }
            )
          );

          // 3. Bookmarks & Following
          unsubs.push(
            onSnapshot(collection(db, 'users', uid, 'bookmarks'), (snap) => {
              if (!active) return;
              setBookmarkedIds(snap.docs.map((d) => String(d.data()?.postId || d.id)));
            })
          );

          unsubs.push(
            onSnapshot(collection(db, 'users', uid, 'following'), (snap) => {
              if (!active) return;
              setFollowedShopIds(snap.docs.map((d) => String(d.data()?.shopId || d.id)));
            })
          );
        } else {
          setTransactions([]);
          setBookmarkedIds([]);
          setFollowedShopIds([]);
        }

        // 4. Orders
        const buyerOrdersMap = new Map<string, OrderRecord>();
        const vendorOrdersMap = new Map<string, OrderRecord>();
        const emitOrders = () => {
          if (!active) return;
          const merged = new Map<string, OrderRecord>();
          for (const [id, o] of buyerOrdersMap) merged.set(id, o);
          for (const [id, o] of vendorOrdersMap) merged.set(id, o);
          setOrders(
            Array.from(merged.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        };

        if (isAdmin) {
          unsubs.push(
            onSnapshot(collection(db, 'orders'), (snap) => {
              buyerOrdersMap.clear();
              snap.forEach((d) => {
                buyerOrdersMap.set(d.id, normalizeOrderDoc(d.data() as Record<string, unknown>, d.id));
              });
              emitOrders();
            })
          );
        } else {
          unsubs.push(
            onSnapshot(query(collection(db, 'orders'), where('buyerId', '==', uid)), (snap) => {
              buyerOrdersMap.clear();
              snap.forEach((d) => {
                buyerOrdersMap.set(d.id, normalizeOrderDoc(d.data() as Record<string, unknown>, d.id));
              });
              emitOrders();
            })
          );
          if (isVendorOrPendingShop) {
            unsubs.push(
              onSnapshot(
                query(collection(db, 'orders'), where('vendorOwnerId', '==', uid)),
                (snap) => {
                  vendorOrdersMap.clear();
                  snap.forEach((d) => {
                    vendorOrdersMap.set(
                      d.id,
                      normalizeOrderDoc(d.data() as Record<string, unknown>, d.id)
                    );
                  });
                  emitOrders();
                }
              )
            );
          }
        }

        // 5. Disputes
        const buyerDisputesMap = new Map<string, DisputeRecord>();
        const vendorDisputesMap = new Map<string, DisputeRecord>();
        const emitDisputes = () => {
          if (!active) return;
          const merged = new Map<string, DisputeRecord>();
          for (const [id, d] of buyerDisputesMap) merged.set(id, d);
          for (const [id, d] of vendorDisputesMap) merged.set(id, d);
          setDisputes(
            Array.from(merged.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        };

        if (isAdmin) {
          unsubs.push(
            onSnapshot(collection(db, 'disputes'), (snap) => {
              buyerDisputesMap.clear();
              snap.forEach((d) => {
                buyerDisputesMap.set(
                  d.id,
                  normalizeDisputeDoc(d.data() as Record<string, unknown>, d.id)
                );
              });
              emitDisputes();
            })
          );
        } else {
          unsubs.push(
            onSnapshot(query(collection(db, 'disputes'), where('buyerId', '==', uid)), (snap) => {
              buyerDisputesMap.clear();
              snap.forEach((d) => {
                buyerDisputesMap.set(
                  d.id,
                  normalizeDisputeDoc(d.data() as Record<string, unknown>, d.id)
                );
              });
              emitDisputes();
            })
          );
          if (isVendorOrPendingShop) {
            unsubs.push(
              onSnapshot(
                query(collection(db, 'disputes'), where('vendorOwnerId', '==', uid)),
                (snap) => {
                  vendorDisputesMap.clear();
                  snap.forEach((d) => {
                    vendorDisputesMap.set(
                      d.id,
                      normalizeDisputeDoc(d.data() as Record<string, unknown>, d.id)
                    );
                  });
                  emitDisputes();
                }
              )
            );
          }
        }

        // 6. KYC Applications
        unsubs.push(
          onSnapshot(
            isAdmin
              ? collection(db, 'kycApplications')
              : query(collection(db, 'kycApplications'), where('userId', '==', uid)),
            (snap) => {
              if (!active) return;
              const list = snap.docs
                .map((d) => normalizeKycDoc(d.data() as Record<string, unknown>, d.id))
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
              setKycApplications(list);
            }
          )
        );

        // 6b. Withdrawal Requests
        unsubs.push(
          onSnapshot(
            isAdmin
              ? collection(db, 'withdrawalRequests')
              : query(collection(db, 'withdrawalRequests'), where('userId', '==', uid)),
            (snap) => {
              if (!active) return;
              const list: WithdrawalRequestRecord[] = snap.docs
                .map((d) => {
                  const r = d.data() as Record<string, unknown>;
                  return {
                    requestId: String(r.requestId || d.id),
                    userId: String(r.userId || ''),
                    userName: String(r.userName || ''),
                    userEmail: String(r.userEmail || ''),
                    amountFcfa: Number(r.amountFcfa ?? 0),
                    method: (r.method === 'orange_money' ? 'orange_money' : 'mtn_momo') as WithdrawalRequestRecord['method'],
                    phone: String(r.phone || ''),
                    status: (r.status as WithdrawalRequestRecord['status']) || 'pending',
                    note: typeof r.note === 'string' ? r.note : undefined,
                    createdAt: toIsoString(r.createdAt),
                    reviewedAt: r.reviewedAt ? toIsoString(r.reviewedAt) : undefined,
                    reviewedBy: typeof r.reviewedBy === 'string' ? r.reviewedBy : undefined,
                  };
                })
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setWithdrawalRequests(list);
            }
          )
        );

        // 7. Conversations + Subcollection Messages
        const buyerConvsMap = new Map<string, Omit<Conversation, 'messages'>>();
        const vendorConvsMap = new Map<string, Omit<Conversation, 'messages'>>();
        const messagesByConv = new Map<string, ChatMessage[]>();

        const emitConversations = () => {
          if (!active) return;
          const merged = new Map<string, Omit<Conversation, 'messages'>>();
          for (const [id, c] of buyerConvsMap) merged.set(id, c);
          for (const [id, c] of vendorConvsMap) merged.set(id, c);

          // Subscribe to message subcollections for newly appeared conversations
          for (const convId of merged.keys()) {
            if (!convMessageUnsubs.has(convId)) {
              const msgUnsub = onSnapshot(
                collection(db, 'conversations', convId, 'messages'),
                (msgSnap) => {
                  if (!active) return;
                  const msgs: ChatMessage[] = msgSnap.docs
                    .map((md) => {
                      const mr = md.data() as Record<string, unknown>;
                      return {
                        messageId: String(mr.messageId || md.id),
                        conversationId: String(mr.conversationId || convId),
                        senderId: String(mr.senderId || ''),
                        senderName: String(mr.senderName || 'Utilisateur'),
                        kind: (mr.kind as ChatMessage['kind']) || 'text',
                        text: String(mr.text || ''),
                        mediaUrl: typeof mr.mediaUrl === 'string' ? mr.mediaUrl : undefined,
                        fileName: typeof mr.fileName === 'string' ? mr.fileName : undefined,
                        locationLabel:
                          typeof mr.locationLabel === 'string' ? mr.locationLabel : undefined,
                        offer: mr.offer ? (mr.offer as DealOfferCard) : undefined,
                        createdAt: toIsoString(mr.createdAt),
                      };
                    })
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                  messagesByConv.set(convId, msgs);
                  emitConversations();
                }
              );
              convMessageUnsubs.set(convId, msgUnsub);
            }
          }

          const full: Conversation[] = Array.from(merged.values())
            .map((c) => ({
              ...c,
              messages: messagesByConv.get(c.conversationId) || [],
            }))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setConversations(full);
        };

        const mapConvDoc = (raw: Record<string, unknown>, id: string): Omit<Conversation, 'messages'> => ({
          conversationId: String(raw.conversationId || id),
          buyerId: String(raw.buyerId || ''),
          buyerName: String(raw.buyerName || 'Client'),
          shopId: String(raw.shopId || ''),
          shopName: String(raw.shopName || 'Boutique'),
          vendorOwnerId: typeof raw.vendorOwnerId === 'string' ? raw.vendorOwnerId : undefined,
          shopAvatarUrl: String(raw.shopAvatarUrl || ''),
          shopCertified: Boolean(raw.shopCertified),
          shopOnline: raw.shopOnline !== undefined ? Boolean(raw.shopOnline) : true,
          unreadCount: Number(raw.unreadCount || 0),
          lastMessageText: String(raw.lastMessageText || ''),
          updatedAt: toIsoString(raw.updatedAt),
        });

        if (isAdmin) {
          unsubs.push(
            onSnapshot(collection(db, 'conversations'), (snap) => {
              buyerConvsMap.clear();
              snap.forEach((d) => {
                buyerConvsMap.set(d.id, mapConvDoc(d.data() as Record<string, unknown>, d.id));
              });
              emitConversations();
            })
          );
        } else {
          unsubs.push(
            onSnapshot(
              query(collection(db, 'conversations'), where('buyerId', '==', uid)),
              (snap) => {
                buyerConvsMap.clear();
                snap.forEach((d) => {
                  buyerConvsMap.set(d.id, mapConvDoc(d.data() as Record<string, unknown>, d.id));
                });
                emitConversations();
              }
            )
          );
          if (isVendorOrPendingShop) {
            unsubs.push(
              onSnapshot(
                query(collection(db, 'conversations'), where('vendorOwnerId', '==', uid)),
                (snap) => {
                  vendorConvsMap.clear();
                  snap.forEach((d) => {
                    vendorConvsMap.set(
                      d.id,
                      mapConvDoc(d.data() as Record<string, unknown>, d.id)
                    );
                  });
                  emitConversations();
                }
              )
            );
          }
        }

        // 8. RFQs + Subcollection Offers
        const openRfqsMap = new Map<string, Omit<RfqRequest, 'offers'>>();
        const myRfqsMap = new Map<string, Omit<RfqRequest, 'offers'>>();
        const offersByRfq = new Map<string, RfqOffer[]>();

        const emitRfqs = () => {
          if (!active) return;
          const merged = new Map<string, Omit<RfqRequest, 'offers'>>();
          for (const [id, r] of openRfqsMap) merged.set(id, r);
          for (const [id, r] of myRfqsMap) merged.set(id, r);

          for (const rfqId of merged.keys()) {
            if (!rfqOfferUnsubs.has(rfqId)) {
              const offerUnsub = onSnapshot(collection(db, 'rfqs', rfqId, 'offers'), (oSnap) => {
                if (!active) return;
                const list: RfqOffer[] = oSnap.docs
                  .map((od) => {
                    const or = od.data() as Record<string, unknown>;
                    return {
                      offerId: String(or.offerId || od.id),
                      rfqId: String(or.rfqId || rfqId),
                      shopId: String(or.shopId || ''),
                      shopName: String(or.shopName || 'Fournisseur'),
                      vendorOwnerId:
                        typeof or.vendorOwnerId === 'string' ? or.vendorOwnerId : undefined,
                      shopCertified: Boolean(or.shopCertified),
                      unitPriceFcfa: Number(or.unitPriceFcfa || 0),
                      deliveryDays: Number(or.deliveryDays || 1),
                      message: String(or.message || ''),
                      status: (or.status as RfqOffer['status']) || 'pending',
                      createdAt: toIsoString(or.createdAt),
                    };
                  })
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                offersByRfq.set(rfqId, list);
                emitRfqs();
              });
              rfqOfferUnsubs.set(rfqId, offerUnsub);
            }
          }

          const full: RfqRequest[] = Array.from(merged.values())
            .map((r) => ({
              ...r,
              offers: offersByRfq.get(r.rfqId) || [],
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRfqs(full);
        };

        const mapRfqDoc = (raw: Record<string, unknown>, id: string): Omit<RfqRequest, 'offers'> => ({
          rfqId: String(raw.rfqId || id),
          buyerId: String(raw.buyerId || ''),
          buyerName: String(raw.buyerName || 'Client'),
          title: String(raw.title || ''),
          description: String(raw.description || ''),
          category: (raw.category as MarketplaceCategory) || 'Mode',
          quantity: Number(raw.quantity || 1),
          budgetFcfa: Number(raw.budgetFcfa || 1000),
          deadlineDays: Number(raw.deadlineDays || 1),
          city: String(raw.city || 'Douala'),
          photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : undefined,
          status: (raw.status as RfqRequest['status']) || 'open',
          createdAt: toIsoString(raw.createdAt),
        });

        if (isAdmin) {
          unsubs.push(
            onSnapshot(collection(db, 'rfqs'), (snap) => {
              openRfqsMap.clear();
              snap.forEach((d) => {
                openRfqsMap.set(d.id, mapRfqDoc(d.data() as Record<string, unknown>, d.id));
              });
              emitRfqs();
            })
          );
        } else {
          unsubs.push(
            onSnapshot(query(collection(db, 'rfqs'), where('status', '==', 'open')), (snap) => {
              openRfqsMap.clear();
              snap.forEach((d) => {
                openRfqsMap.set(d.id, mapRfqDoc(d.data() as Record<string, unknown>, d.id));
              });
              emitRfqs();
            })
          );
          unsubs.push(
            onSnapshot(query(collection(db, 'rfqs'), where('buyerId', '==', uid)), (snap) => {
              myRfqsMap.clear();
              snap.forEach((d) => {
                myRfqsMap.set(d.id, mapRfqDoc(d.data() as Record<string, unknown>, d.id));
              });
              emitRfqs();
            })
          );
        }
      } catch (err) {
        if (active) {
          setActionError(
            err instanceof Error ? err.message : 'Erreur de synchronisation Firestore.'
          );
        }
      }
    };

    subscribeUserScoped();
    if (isAdmin) {
      refreshAdminOverview();
    }
    return () => {
      active = false;
      unsubs.forEach((u) => u());
      convMessageUnsubs.forEach((u) => u());
      rfqOfferUnsubs.forEach((u) => u());
    };
  }, [session?.uid, session?.role, session?.shopId, fetchServerSession, refreshAdminOverview]);

  // Load user's existing post likes from Firestore when posts/user change
  useEffect(() => {
    if (!session?.uid || isAdminUser(session) || posts.length === 0) {
      if (!session?.uid) setLikedIds([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [{ db }, { doc, getDoc }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const checks = await Promise.all(
          posts.map(async (p) => {
            try {
              const snap = await getDoc(doc(db, 'posts', p.postId, 'likes', session.uid));
              return snap.exists() ? p.postId : null;
            } catch {
              return null;
            }
          })
        );
        if (active) {
          setLikedIds(checks.filter((id): id is string => Boolean(id)));
        }
      } catch {
        // Ignore transient offline error
      }
    })();
    return () => {
      active = false;
    };
  }, [posts, session?.uid, session?.role]);

  // Real-time comments listener for active CommentsSheet post
  useEffect(() => {
    if (!activeCommentsPostId) return;
    let active = true;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const [{ db }, { collection, query, where, onSnapshot }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        if (!active) return;
        const commentsRef = collection(db, 'posts', activeCommentsPostId, 'comments');
        const q = isAdminUser(sessionRef.current)
          ? commentsRef
          : query(commentsRef, where('status', '==', 'visible'));
        unsub = onSnapshot(q, (snap) => {
          if (!active) return;
          const remoteComments: PostComment[] = snap.docs
            .map((d) => {
              const r = d.data() as Record<string, unknown>;
              return {
                commentId: String(r.commentId || d.id),
                postId: String(r.postId || activeCommentsPostId),
                authorId: String(r.authorId || ''),
                authorName: String(r.authorName || 'Client'),
                text: String(r.text || ''),
                createdAt: toIsoString(r.createdAt),
                deliveryStatus: 'sent' as const,
                isDemo: Boolean(r.isDemo),
              };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setCommentsByPost((prev) => {
            const localUnsent = (prev[activeCommentsPostId] || []).filter(
              (c) =>
                (c.deliveryStatus === 'pending' || c.deliveryStatus === 'failed') &&
                !remoteComments.some((rc) => rc.commentId === c.commentId)
            );
            return {
              ...prev,
              [activeCommentsPostId]: [...localUnsent, ...remoteComments],
            };
          });
        });
      } catch {
        // Handled on next open/retry
      }
    })();

    return () => {
      active = false;
      unsub?.();
    };
  }, [activeCommentsPostId]);

  // Real-time reviews listener for active ProductDetailSheet post
  useEffect(() => {
    if (!activeReviewsPostId) return;
    let active = true;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const [{ db }, { collection, onSnapshot }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        if (!active) return;
        unsub = onSnapshot(collection(db, 'posts', activeReviewsPostId, 'reviews'), (snap) => {
          if (!active) return;
          const list: ProductReview[] = snap.docs
            .map((d) => {
              const r = d.data() as Record<string, unknown>;
              return {
                reviewId: String(r.reviewId || d.id),
                postId: String(r.postId || activeReviewsPostId),
                authorId: String(r.authorId || ''),
                authorName: String(r.authorName || 'Acheteur'),
                rating: Number(r.rating || 5),
                comment: String(r.comment || ''),
                createdAt: toIsoString(r.createdAt),
                isDemo: Boolean(r.isDemo),
              };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setReviewsByPost((prev) => ({
            ...prev,
            [activeReviewsPostId]: list,
          }));
        });
      } catch {
        // Ignore transient offline error
      }
    })();

    return () => {
      active = false;
      unsub?.();
    };
  }, [activeReviewsPostId]);

  const syncQueueItemToFirestore = useCallback(
    async (action: QueuedAction, currentSession: UserSession | null): Promise<boolean> => {
      if (!navigator.onLine) return false;
      if (!currentSession || !canLikeAndComment(currentSession)) return false;

      try {
        const [{ db }, { doc, setDoc, deleteDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);

        if (action.type === 'like_toggle') {
          const liked = Boolean(action.payload.liked);
          const ref = doc(db, 'posts', action.targetId, 'likes', currentSession.uid);
          if (liked) {
            await setDoc(ref, {
              userId: currentSession.uid,
              postId: action.targetId,
              createdAt: serverTimestamp(),
            });
          } else {
            await deleteDoc(ref);
          }
        } else if (action.type === 'bookmark_toggle') {
          const saved = Boolean(action.payload.saved);
          const ref = doc(db, 'users', currentSession.uid, 'bookmarks', action.targetId);
          if (saved) {
            await setDoc(ref, {
              userId: currentSession.uid,
              postId: action.targetId,
              createdAt: serverTimestamp(),
            });
          } else {
            await deleteDoc(ref);
          }
        } else if (action.type === 'follow_toggle') {
          const followed = Boolean(action.payload.followed);
          const ref = doc(db, 'users', currentSession.uid, 'following', action.targetId);
          if (followed) {
            await setDoc(ref, {
              userId: currentSession.uid,
              shopId: action.targetId,
              createdAt: serverTimestamp(),
            });
          } else {
            await deleteDoc(ref);
          }
        } else if (action.type === 'comment_create') {
          const commentId = String(action.payload.commentId);
          const text = String(action.payload.text);
          const ref = doc(db, 'posts', action.targetId, 'comments', commentId);
          await setDoc(ref, {
            commentId,
            postId: action.targetId,
            authorId: currentSession.uid,
            authorName: currentSession.displayName,
            text,
            status: 'visible',
            createdAt: serverTimestamp(),
          });
        }
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Flush queued offline social actions when back online and authenticated with permission
  useEffect(() => {
    if (!isOnline || !session || flushingRef.current) return;
    const pending = getRetryableActions(offlineQueue);
    if (pending.length === 0) return;

    flushingRef.current = true;
    (async () => {
      let nextQueue = [...offlineQueue];
      for (const action of pending) {
        const ok = await syncQueueItemToFirestore(action, session);
        nextQueue = markQueuedActionStatus(nextQueue, action.id, ok ? 'sent' : 'failed');
        if (action.type === 'comment_create') {
          const commentId = String(action.payload.commentId);
          setCommentsByPost((prev) => {
            const list = prev[action.targetId] || [];
            return {
              ...prev,
              [action.targetId]: list.map((c) =>
                c.commentId === commentId
                  ? { ...c, deliveryStatus: ok ? ('sent' as const) : ('failed' as const) }
                  : c
              ),
            };
          });
        }
      }
      setOfflineQueue(nextQueue);
      writeStorageJson(userQueueKey(storageScope), nextQueue);
      flushingRef.current = false;
    })();
  }, [isOnline, offlineQueue, session, storageScope, syncQueueItemToFirestore]);

  const recordViewedPost = useCallback(
    (postId: string) => {
      setRecentlyViewedIds((prev) => {
        const next = [postId, ...prev.filter((id) => id !== postId)].slice(0, 12);
        writeStorageJson(userRecentKey(storageScope), next);
        return next;
      });
    },
    [storageScope]
  );

  const toggleLike = useCallback(
    (postId: string, forceLike?: boolean) => {
      if (!canLikeAndComment(session)) {
        setActionError(
          isSuspendedVendor(session)
            ? 'Compte vendeur suspendu : action désactivée.'
            : isAdminUser(session)
              ? 'Le Super Admin modère sans liker comme acheteur.'
              : 'Connectez-vous pour aimer cette publication.'
        );
        return;
      }
      const currentlyLiked = likedIds.includes(postId);
      const nextLiked = forceLike !== undefined ? forceLike : !currentlyLiked;
      if (nextLiked === currentlyLiked) return;

      const nextLikes = nextLiked
        ? [...likedIds, postId]
        : likedIds.filter((id) => id !== postId);
      setLikedIds(nextLikes);

      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId
            ? { ...p, likesCount: Math.max(0, p.likesCount + (nextLiked ? 1 : -1)) }
            : p
        )
      );

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `like-${postId}-${Date.now()}`,
        type: 'like_toggle',
        targetId: postId,
        payload: { liked: nextLiked },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(userQueueKey(storageScope), updatedQueue);
    },
    [likedIds, offlineQueue, session, storageScope]
  );

  const toggleBookmark = useCallback(
    (postId: string) => {
      if (!canLikeAndComment(session)) {
        setActionError(
          isSuspendedVendor(session)
            ? 'Compte vendeur suspendu : action désactivée.'
            : 'Connectez-vous pour enregistrer ce produit.'
        );
        return;
      }
      const currentlySaved = bookmarkedIds.includes(postId);
      const nextSaved = !currentlySaved;
      const nextList = nextSaved
        ? [...bookmarkedIds, postId]
        : bookmarkedIds.filter((id) => id !== postId);
      setBookmarkedIds(nextList);

      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId
            ? { ...p, bookmarksCount: Math.max(0, p.bookmarksCount + (nextSaved ? 1 : -1)) }
            : p
        )
      );

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `bm-${postId}-${Date.now()}`,
        type: 'bookmark_toggle',
        targetId: postId,
        payload: { saved: nextSaved },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(userQueueKey(storageScope), updatedQueue);
    },
    [bookmarkedIds, offlineQueue, session, storageScope]
  );

  const toggleFollowShop = useCallback(
    (shopId: string) => {
      if (!canLikeAndComment(session)) {
        setActionError(
          isSuspendedVendor(session)
            ? 'Compte vendeur suspendu : action désactivée.'
            : 'Connectez-vous pour suivre cette boutique.'
        );
        return;
      }
      const currentlyFollowed = followedShopIds.includes(shopId);
      const nextFollowed = !currentlyFollowed;
      const nextList = nextFollowed
        ? [...followedShopIds, shopId]
        : followedShopIds.filter((id) => id !== shopId);
      setFollowedShopIds(nextList);

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `flw-${shopId}-${Date.now()}`,
        type: 'follow_toggle',
        targetId: shopId,
        payload: { followed: nextFollowed },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(userQueueKey(storageScope), updatedQueue);
    },
    [followedShopIds, offlineQueue, session, storageScope]
  );

  const addComment = useCallback(
    (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !canLikeAndComment(session) || !session) return;

      const commentId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newComment: PostComment = {
        commentId,
        postId,
        authorId: session.uid,
        authorName: session.displayName,
        text: trimmed,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'pending',
      };

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])],
      }));

      setPosts((prev) =>
        prev.map((p) => (p.postId === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `cmt-${commentId}`,
        type: 'comment_create',
        targetId: postId,
        payload: { commentId, text: trimmed },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(userQueueKey(storageScope), updatedQueue);
    },
    [offlineQueue, session, storageScope]
  );

  const retryFailedComment = useCallback(
    (postId: string, commentId: string) => {
      setOfflineQueue((prev) => {
        const next = prev.map((a) =>
          a.type === 'comment_create' && a.payload.commentId === commentId
            ? { ...a, status: 'pending' as const }
            : a
        );
        writeStorageJson(userQueueKey(storageScope), next);
        return next;
      });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) =>
          c.commentId === commentId ? { ...c, deliveryStatus: 'pending' as const } : c
        ),
      }));
    },
    [storageScope]
  );

  const addProductReview = useCallback(
    async (postId: string, rating: number, comment: string) => {
      if (!session || !canLikeAndComment(session) || !comment.trim()) return;
      const reviewId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      try {
        const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        await setDoc(doc(db, 'posts', postId, 'reviews', reviewId), {
          reviewId,
          postId,
          authorId: session.uid,
          authorName: `${session.displayName} · ${session.city}`,
          rating,
          comment: comment.trim(),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de l’envoi de l’avis.');
      }
    },
    [session]
  );

  // Cart actions (device-local & user-scoped)
  const addToCartPreview = useCallback(
    (item: LocalCartPreviewItem) => {
      if (session && !canBuy(session)) {
        setActionError(
          isSuspendedVendor(session)
            ? 'Boutique suspendue : achats désactivés.'
            : 'Le Super Admin ne passe pas de commande acheteur.'
        );
        return;
      }
      setCartItems((prev) => {
        const existingIdx = prev.findIndex(
          (x) => x.postId === item.postId && x.variantId === item.variantId
        );
        let next: LocalCartPreviewItem[];
        if (existingIdx >= 0) {
          next = prev.map((x, idx) =>
            idx === existingIdx
              ? { ...x, qty: x.qty + item.qty, unitPriceFcfa: item.unitPriceFcfa }
              : x
          );
        } else {
          next = [...prev, item];
        }
        writeStorageJson(userCartKey(storageScope), next);
        return next;
      });
    },
    [session, storageScope]
  );

  const updateCartItemQty = useCallback(
    (postId: string, variantId: string, nextQty: number) => {
      setCartItems((prev) => {
        const next =
          nextQty <= 0
            ? prev.filter((x) => !(x.postId === postId && x.variantId === variantId))
            : prev.map((x) =>
                x.postId === postId && x.variantId === variantId ? { ...x, qty: nextQty } : x
              );
        writeStorageJson(userCartKey(storageScope), next);
        return next;
      });
    },
    [storageScope]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
    writeStorageJson(userCartKey(storageScope), []);
  }, [storageScope]);

  // Multi-vendor Checkout & Escrow -> computed & written exclusively on server (/api/commerce/action)
  const checkoutCart = useCallback(
    async (params: {
      idempotencyKey: string;
      paymentMethod: PaymentMethod;
      simulateMobileSuccess: boolean;
      deliveryCity: string;
      deliveryNeighborhood: string;
      deliveryPhone: string;
    }) => {
      if (!session || !isOnline) {
        return { ok: false, reason: 'offline_or_unauth' as const };
      }
      if (!canBuy(session)) {
        return { ok: false, reason: 'forbidden_role' as const };
      }
      if (!session.emailVerified) {
        setActionError(
          'Adresse e-mail non vérifiée : confirmez votre e-mail avant de passer commande.'
        );
        return { ok: false, reason: 'email_unverified' as const };
      }
      if (cartItems.length === 0) {
        return { ok: false, reason: 'empty_cart' as const };
      }
      if (
        !params.deliveryCity.trim() ||
        !params.deliveryNeighborhood.trim() ||
        params.deliveryPhone.trim().length < 8
      ) {
        return { ok: false, reason: 'invalid_address' as const };
      }

      const res = await callApiWithAuth<{
        ok?: boolean;
        globalOrderId?: string;
        orderCount?: number;
        message?: string;
        error?: string;
      }>('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkout',
          idempotencyKey: params.idempotencyKey,
          items: cartItems.map((item) => ({
            postId: item.postId,
            variantId: item.variantId,
            qty: item.qty,
            isSample: Boolean(item.isSample),
            acceptedOfferId: item.acceptedOfferId,
            conversationId: item.conversationId,
            rfqId: item.rfqId,
          })),
          paymentMethod: params.paymentMethod,
          simulateMobileSuccess: params.simulateMobileSuccess,
          deliveryCity: params.deliveryCity.trim(),
          deliveryNeighborhood: params.deliveryNeighborhood.trim(),
          deliveryPhone: params.deliveryPhone.trim(),
        }),
      });

      if (res.ok && res.data?.ok) {
        clearCart();
        pushNotification(
          'orders',
          `Commande ${res.data.globalOrderId || ''} confirmée`,
          `${res.data.orderCount || 1} sous-commande(s) enregistrée(s) en séquestre.`
        );
        return { ok: true, globalOrderId: res.data.globalOrderId };
      }

      if (res.status === 402) {
        return { ok: false, reason: 'mobile_payment_failed' as const };
      }
      if (res.status === 409) {
        return { ok: false, reason: 'duplicate_attempt' as const };
      }
      const errLower = (res.error || '').toLowerCase();
      if (errLower.includes('insuffisant') && errLower.includes('portefeuille')) {
        return { ok: false, reason: 'insufficient_wallet' as const };
      }
      if (errLower.includes('téléphone') || errLower.includes('quartier')) {
        return { ok: false, reason: 'invalid_address' as const };
      }
      if (res.error) setActionError(res.error);
      return { ok: false, reason: 'server_error' as const };
    },
    [callApiWithAuth, cartItems, clearCart, isOnline, pushNotification, session]
  );

  // Order lifecycle -> server transactions (/api/commerce/action)
  const cancelOrder = useCallback(
    async (orderId: string) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (!target || !canBuyerCancelOrder(target) || !canBuy(session)) return;
      const res = await callApiWithAuth('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel_order', orderId }),
      });
      if (!res.ok && res.error) setActionError(res.error);
    },
    [callApiWithAuth, orders, session]
  );

  const confirmOrderDelivery = useCallback(
    async (orderId: string) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (
        !target ||
        !canBuy(session) ||
        (target.status !== 'delivered' && target.status !== 'delivering')
      ) {
        return;
      }
      const res = await callApiWithAuth('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm_delivery', orderId }),
      });
      if (!res.ok && res.error) setActionError(res.error);
    },
    [callApiWithAuth, orders, session]
  );

  const openOrderDispute = useCallback(
    async (orderId: string, reason: string) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (!target || !canBuyerDisputeOrder(target) || !canBuy(session) || !reason.trim()) return;
      const res = await callApiWithAuth<{ disputeId?: string }>('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'open_dispute', orderId, reason: reason.trim() }),
      });
      if (res.ok) {
        pushNotification(
          'orders',
          `Litige ${res.data?.disputeId || ''} ouvert`,
          'Le séquestre reste bloqué pendant l’examen par l’administrateur.'
        );
      } else if (res.error) {
        setActionError(res.error);
      }
    },
    [callApiWithAuth, orders, pushNotification, session]
  );

  const rateOrder = useCallback(
    async (orderId: string) => {
      const res = await callApiWithAuth('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'rate_order', orderId }),
      });
      if (!res.ok && res.error) setActionError(res.error);
    },
    [callApiWithAuth]
  );

  const reorderItems = useCallback(
    (order: OrderRecord) => {
      if (!canBuy(session)) return;
      for (const item of order.items) {
        addToCartPreview(item);
      }
    },
    [addToCartPreview, session]
  );

  const updateOrderStatusByVendor = useCallback(
    async (orderId: string, nextStatus: OrderStatus) => {
      if (!canManageOwnSalesOrders(session)) {
        setActionError('Action réservée aux vendeurs approuvés non suspendus.');
        return;
      }
      const target = orders.find((o) => o.orderId === orderId);
      if (!target || target.shopId !== session?.shopId) return;
      const res = await callApiWithAuth('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'vendor_order_status', orderId, nextStatus }),
      });
      if (!res.ok && res.error) setActionError(res.error);
    },
    [callApiWithAuth, orders, session]
  );

  // Wallet deposit/withdraw -> server transactions (/api/commerce/action)
  const depositToWallet = useCallback(
    async (
      amountFcfa: number,
      method: 'mtn_momo' | 'orange_money',
      phone: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!session || !isOnline || isAdminUser(session)) {
        return { ok: false, error: 'Action indisponible hors ligne ou sur ce compte.' };
      }
      const res = await callApiWithAuth<{ availableFcfa?: number }>('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'wallet_deposit',
          idempotencyKey: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          amountFcfa,
          method,
          phone,
        }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return { ok: false, error: res.error };
      }
      return { ok: true };
    },
    [callApiWithAuth, isOnline, session]
  );

  const withdrawFromWallet = useCallback(
    async (
      amountFcfa: number,
      method: 'mtn_momo' | 'orange_money',
      phone: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!session || !isOnline || isAdminUser(session)) {
        return { ok: false, error: 'Action indisponible hors ligne ou sur ce compte.' };
      }
      const res = await callApiWithAuth<{ requestId?: string; availableFcfa?: number }>(
        '/api/commerce/action',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'wallet_withdraw',
            idempotencyKey: `wdr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            amountFcfa,
            method,
            phone,
          }),
        }
      );
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return { ok: false, error: res.error };
      }
      return { ok: true };
    },
    [callApiWithAuth, isOnline, session]
  );

  // Messaging & Negotiation
  const openOrCreateConversation = useCallback(
    async (shop: ShopProfile, initialText?: string): Promise<string | null> => {
      if (!session || !canSendMessage(session)) {
        setActionError(
          isSuspendedVendor(session)
            ? 'Boutique suspendue : messagerie bloquée.'
            : 'Connectez-vous pour contacter une boutique.'
        );
        return null;
      }
      if (!session.emailVerified) {
        setActionError('Confirmez votre e-mail pour démarrer une discussion.');
        return null;
      }
      const existing = conversations.find((c) => c.shopId === shop.shopId);
      if (existing) {
        if (initialText) {
          try {
            const [{ db }, { doc, writeBatch, serverTimestamp }] = await Promise.all([
              getFirebaseServices(),
              import('firebase/firestore'),
            ]);
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
            const batch = writeBatch(db);
            batch.set(doc(db, 'conversations', existing.conversationId, 'messages', messageId), {
              messageId,
              conversationId: existing.conversationId,
              senderId: session.uid,
              senderName: session.displayName,
              buyerId: existing.buyerId,
              vendorOwnerId: existing.vendorOwnerId || shop.ownerId,
              kind: 'text',
              text: initialText,
              createdAt: serverTimestamp(),
            });
            batch.update(doc(db, 'conversations', existing.conversationId), {
              lastMessageText: initialText,
              updatedAt: serverTimestamp(),
            });
            await batch.commit();
          } catch (err) {
            setActionError(
              err instanceof Error ? err.message : 'Échec de l’envoi du message initial.'
            );
          }
        }
        return existing.conversationId;
      }

      const convId = `conv-${shop.shopId}-${Date.now().toString().slice(-4)}`;
      try {
        const [{ db }, { doc, writeBatch, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const batch = writeBatch(db);
        batch.set(doc(db, 'conversations', convId), {
          conversationId: convId,
          buyerId: session.uid,
          buyerName: session.displayName,
          shopId: shop.shopId,
          shopName: shop.name,
          vendorOwnerId: shop.ownerId,
          shopAvatarUrl: shop.avatarUrl,
          shopCertified: shop.isCertified,
          shopOnline: shop.isOnline ?? true,
          unreadCount: 0,
          lastMessageText: initialText || `Discussion ouverte avec ${shop.name}`,
          updatedAt: serverTimestamp(),
        });
        if (initialText) {
          const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
          batch.set(doc(db, 'conversations', convId, 'messages', messageId), {
            messageId,
            conversationId: convId,
            senderId: session.uid,
            senderName: session.displayName,
            buyerId: session.uid,
            vendorOwnerId: shop.ownerId,
            kind: 'text',
            text: initialText,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
        return convId;
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'Impossible de créer la discussion.'
        );
        return null;
      }
    },
    [conversations, session]
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      payload: {
        kind: ChatMessage['kind'];
        text: string;
        mediaUrl?: string;
        fileName?: string;
        locationLabel?: string;
        offer?: DealOfferCard;
      }
    ) => {
      if (!session || !canSendMessage(session)) return;
      const targetConv = conversations.find((c) => c.conversationId === conversationId);
      if (!targetConv) return;
      const vendorOwnerId =
        targetConv.vendorOwnerId ||
        shops.find((s) => s.shopId === targetConv.shopId)?.ownerId ||
        '';
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

      try {
        const [{ db }, { doc, writeBatch, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const msgData: Record<string, unknown> = {
          messageId,
          conversationId,
          senderId: session.uid,
          senderName: session.displayName,
          buyerId: targetConv.buyerId,
          vendorOwnerId,
          kind: payload.kind,
          text: payload.text,
          createdAt: serverTimestamp(),
        };
        if (payload.mediaUrl) msgData.mediaUrl = payload.mediaUrl;
        if (payload.fileName) msgData.fileName = payload.fileName;
        if (payload.locationLabel) msgData.locationLabel = payload.locationLabel;
        if (payload.offer) {
          msgData.offer = payload.offer;
          msgData.offerStatus = payload.offer.status;
        }

        const batch = writeBatch(db);
        batch.set(doc(db, 'conversations', conversationId, 'messages', messageId), msgData);
        batch.update(doc(db, 'conversations', conversationId), {
          lastMessageText: payload.text || payload.offer?.productTitle || 'Pièce jointe',
          unreadCount: 0,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de l’envoi du message.');
      }
    },
    [conversations, session, shops]
  );

  const respondToDealOffer = useCallback(
    async (conversationId: string, messageId: string, decision: 'accepted' | 'declined') => {
      if (!session || !canBuy(session)) return;
      const conv = conversations.find((c) => c.conversationId === conversationId);
      const targetMsg = conv?.messages.find((m) => m.messageId === messageId);
      if (!conv || !targetMsg?.offer) return;

      try {
        const [{ db }, { doc, updateDoc }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const updatedOffer = { ...targetMsg.offer, status: decision };
        await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
          offer: updatedOffer,
          offerStatus: decision,
        });

        if (decision === 'accepted') {
          const shop = shops.find((s) => s.shopId === updatedOffer.shopId);
          addToCartPreview({
            postId: updatedOffer.postId || `offer-${updatedOffer.offerId}`,
            shopId: updatedOffer.shopId,
            shopName: updatedOffer.shopName,
            shopCity: shop?.city || 'Douala',
            title: `${updatedOffer.productTitle} (Offre négociée)`,
            variantId: updatedOffer.offerId,
            variantLabel: `Lot négocié · ${updatedOffer.qty} pcs`,
            qty: updatedOffer.qty,
            unitPriceFcfa: updatedOffer.unitPriceFcfa,
            posterUrl: shop?.avatarUrl || posts[0]?.posterUrl || '',
            acceptedOfferId: messageId,
            conversationId,
          });
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de réponse à l’offre.');
      }
    },
    [addToCartPreview, conversations, posts, session, shops]
  );

  // RFQs -> Firestore
  const createRfq = useCallback(
    async (payload: {
      title: string;
      description: string;
      category: MarketplaceCategory;
      quantity: number;
      budgetFcfa: number;
      deadlineDays: number;
      city: string;
      photoUrl?: string;
    }) => {
      if (!session || !canCreateRfq(session)) return;
      const rfqId = `RFQ-${Date.now().toString().slice(-5)}`;
      try {
        const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const rfqDoc: Record<string, unknown> = {
          rfqId,
          buyerId: session.uid,
          buyerName: session.displayName,
          title: payload.title.trim(),
          description: payload.description.trim(),
          category: payload.category,
          quantity: payload.quantity,
          budgetFcfa: payload.budgetFcfa,
          deadlineDays: payload.deadlineDays,
          city: payload.city,
          status: 'open',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (payload.photoUrl) rfqDoc.photoUrl = payload.photoUrl;
        await setDoc(doc(db, 'rfqs', rfqId), rfqDoc);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de création du devis.');
      }
    },
    [session]
  );

  const submitRfqOffer = useCallback(
    async (rfqId: string, unitPriceFcfa: number, deliveryDays: number, message: string) => {
      if (!session || !canRespondToRfq(session)) {
        setActionError('Seul un vendeur approuvé peut répondre à un devis.');
        return;
      }
      const myShop = shops.find(
        (s) => s.shopId === session.shopId || s.ownerId === session.uid
      );
      if (!myShop || myShop.vendorStatus !== 'approved') {
        setActionError('Boutique vendeur approuvée introuvable.');
        return;
      }
      const targetRfq = rfqs.find((r) => r.rfqId === rfqId);
      if (!targetRfq) return;

      const offerId = `RFQO-${Date.now().toString().slice(-5)}`;
      try {
        const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        await setDoc(doc(db, 'rfqs', rfqId, 'offers', offerId), {
          offerId,
          rfqId,
          buyerId: targetRfq.buyerId,
          shopId: myShop.shopId,
          shopName: myShop.name,
          shopCertified: myShop.isCertified,
          vendorOwnerId: session.uid,
          unitPriceFcfa,
          deliveryDays,
          message: message.trim(),
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de soumission de l’offre.');
      }
    },
    [rfqs, session, shops]
  );

  const acceptRfqOffer = useCallback(
    async (rfqId: string, offerId: string) => {
      if (!session || !canBuy(session)) return;
      const targetRfq = rfqs.find((r) => r.rfqId === rfqId);
      const targetOffer = targetRfq?.offers.find((o) => o.offerId === offerId);
      if (!targetRfq || !targetOffer) return;

      try {
        const [{ db }, { doc, writeBatch, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const batch = writeBatch(db);
        batch.update(doc(db, 'rfqs', rfqId), {
          status: 'awarded',
          updatedAt: serverTimestamp(),
        });
        for (const o of targetRfq.offers) {
          batch.update(doc(db, 'rfqs', rfqId, 'offers', o.offerId), {
            status: o.offerId === offerId ? 'accepted' : 'declined',
          });
        }
        await batch.commit();

        const shop = shops.find((s) => s.shopId === targetOffer.shopId);
        addToCartPreview({
          postId: `rfq-${rfqId}`,
          shopId: targetOffer.shopId,
          shopName: targetOffer.shopName,
          shopCity: shop?.city || 'Douala',
          title: `${targetRfq.title} (Devis ${rfqId})`,
          variantId: offerId,
          variantLabel: `Devis accepté · ${targetRfq.quantity} pcs`,
          qty: targetRfq.quantity,
          unitPriceFcfa: targetOffer.unitPriceFcfa,
          posterUrl: targetRfq.photoUrl || shop?.avatarUrl || posts[0]?.posterUrl || '',
          acceptedOfferId: offerId,
          rfqId,
        });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec d’attribution du devis.');
      }
    },
    [addToCartPreview, posts, rfqs, session, shops]
  );

  // Vendor KYC, Publish & Stories -> Firestore (no shops[0] fallback)
  const submitVendorKyc = useCallback(
    async (payload: {
      shopName: string;
      city: 'Douala' | 'Yaoundé';
      neighborhood: string;
      category: MarketplaceCategory;
      cniNumber: string;
      cniFrontUrl: string;
      cniBackUrl: string;
      selfieUrl: string;
    }): Promise<boolean> => {
      if (!session || !canRequestVendorKyc(session)) {
        setActionError('Demande KYC impossible pour ce compte.');
        return false;
      }
      if (!session.emailVerified) {
        setActionError(
          'Confirmez votre adresse e-mail avant de soumettre un dossier vendeur KYC.'
        );
        return false;
      }
      const applicationId = `KYC-${Date.now().toString().slice(-6)}`;
      try {
        const [{ auth, db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        await setDoc(doc(db, 'kycApplications', applicationId), {
          applicationId,
          userId: session.uid,
          applicantName: session.displayName,
          shopName: payload.shopName.trim(),
          city: payload.city,
          neighborhood: payload.neighborhood.trim(),
          category: payload.category,
          cniNumber: payload.cniNumber.trim(),
          cniFrontUrl: payload.cniFrontUrl,
          cniBackUrl: payload.cniBackUrl,
          selfieUrl: payload.selfieUrl,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (auth.currentUser) {
          await fetchServerSession(auth.currentUser, true);
        }
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de soumission du dossier KYC.');
        return false;
      }
    },
    [fetchServerSession, session]
  );

  const publishVendorPost = useCallback(
    async (payload: {
      title: string;
      description: string;
      category: MarketplaceCategory;
      mediaType: 'video' | 'carousel';
      videoUrl: string;
      posterUrl: string;
      galleryUrls?: string[];
      priceFcfa: number;
      moq: number;
      promoPercent?: number;
    }): Promise<boolean> => {
      if (!session || !canPublishPostOrStory(session)) {
        setActionError('Seul un vendeur approuvé non suspendu peut publier.');
        return false;
      }
      const myShop = shops.find(
        (s) => s.shopId === session.shopId || s.ownerId === session.uid
      );
      if (!myShop || myShop.vendorStatus !== 'approved') {
        setActionError('Aucune boutique approuvée rattachée à votre compte.');
        return false;
      }
      const postId = `post-${Date.now().toString().slice(-6)}`;
      try {
        const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        const docData: Record<string, unknown> = {
          postId,
          shopId: myShop.shopId,
          ownerId: session.uid,
          shopName: myShop.name,
          shopHandle: myShop.handle,
          shopAvatarUrl: myShop.avatarUrl,
          shopCertified: myShop.isCertified,
          city: myShop.city,
          neighborhood: myShop.neighborhood.split('·')[0].trim(),
          title: payload.title.trim(),
          description: payload.description.trim(),
          category: payload.category,
          mediaType: payload.mediaType,
          videoUrl: payload.videoUrl,
          posterUrl: payload.posterUrl,
          priceFcfa: payload.priceFcfa,
          moq: payload.moq,
          samplePriceFcfa: Math.round(payload.priceFcfa * 1.25),
          tiers: [
            { minQty: payload.moq, maxQty: payload.moq * 3 - 1, unitPriceFcfa: payload.priceFcfa },
            {
              minQty: payload.moq * 3,
              maxQty: null,
              unitPriceFcfa: Math.round(payload.priceFcfa * 0.85),
            },
          ],
          variants: [{ id: 'v1', label: 'Standard', stock: 50, priceDeltaFcfa: 0 }],
          specs: [{ label: 'Disponibilité', value: `${myShop.city} · Expédition 24 h` }],
          likesCount: 0,
          commentsCount: 0,
          bookmarksCount: 0,
          sharesCount: 0,
          rating: 5.0,
          status: 'published',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (payload.galleryUrls && payload.galleryUrls.length > 0) {
          docData.galleryUrls = payload.galleryUrls;
        }
        if (payload.promoPercent) {
          docData.promoPercent = payload.promoPercent;
        }
        await setDoc(doc(db, 'posts', postId), docData);
        pushNotification('following', `Nouveau produit · ${myShop.name}`, payload.title.trim());
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de publication du produit.');
        return false;
      }
    },
    [pushNotification, session, shops]
  );

  const publishVendorStory = useCallback(
    async (storyText: string, mediaUrl?: string): Promise<boolean> => {
      if (!session || !canPublishPostOrStory(session) || !storyText.trim()) {
        setActionError('Seul un vendeur approuvé non suspendu peut publier une story.');
        return false;
      }
      const myShop = shops.find(
        (s) => s.shopId === session.shopId || s.ownerId === session.uid
      );
      if (!myShop || myShop.vendorStatus !== 'approved') {
        setActionError('Boutique vendeur introuvable.');
        return false;
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      try {
        const [{ db }, { doc, updateDoc, serverTimestamp }] = await Promise.all([
          getFirebaseServices(),
          import('firebase/firestore'),
        ]);
        await updateDoc(doc(db, 'shops', myShop.shopId), {
          hasActiveStory: true,
          storyPreviewText: storyText.trim(),
          storyMediaUrl: mediaUrl || myShop.storyMediaUrl || myShop.avatarUrl,
          storyExpiresAt: expiresAt,
          updatedAt: serverTimestamp(),
        });
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Échec de publication de la story.');
        return false;
      }
    },
    [session, shops]
  );

  // Admin actions -> routed exclusively through server API (/api/admin/action)
  const reviewKycApplication = useCallback(
    async (applicationId: string, decision: 'approved' | 'rejected', reason?: string) => {
      if (!canModerate(session)) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'review_kyc',
          applicationId,
          decision,
          rejectionReason: reason || '',
        }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session]
  );

  const toggleShopCertification = useCallback(
    async (shopId: string) => {
      if (!canModerate(session)) return;
      const targetShop = shops.find((s) => s.shopId === shopId);
      if (!targetShop) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'certify_shop',
          shopId,
          certified: !targetShop.isCertified,
        }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session, shops]
  );

  const suspendShop = useCallback(
    async (shopId: string) => {
      if (!canModerate(session)) return;
      const targetShop = shops.find((s) => s.shopId === shopId);
      if (!targetShop) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'suspend_shop',
          shopId,
          suspended: targetShop.vendorStatus !== 'suspended',
        }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session, shops]
  );

  const resolveDispute = useCallback(
    async (disputeId: string, decision: 'resolved_buyer' | 'resolved_vendor', note?: string) => {
      if (!canModerate(session)) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resolve_dispute',
          disputeId,
          decision,
          note: note || '',
        }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session]
  );

  const moderatePost = useCallback(
    async (postId: string, status: 'published' | 'rejected') => {
      if (!canModerate(session)) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'moderate_post', postId, status }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session]
  );

  const manageAdminUser = useCallback(
    async (targetUid: string, operation: 'suspend' | 'reactivate' | 'delete') => {
      if (!canModerate(session)) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'user_status', targetUid, operation }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session]
  );

  const reviewWithdrawalRequest = useCallback(
    async (requestId: string, decision: 'approved' | 'rejected', note?: string) => {
      if (!canModerate(session)) return;
      const res = await callApiWithAuth('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'review_withdrawal',
          requestId,
          decision,
          note: note || '',
        }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return;
      }
      await refreshAdminOverview();
    },
    [callApiWithAuth, refreshAdminOverview, session]
  );

  const updatePlatformSettings = useCallback(
    async (patch: {
      commissionPercent?: number;
      enabledCategories?: MarketplaceCategory[];
      announcement?: PlatformSettings['announcement'];
    }): Promise<boolean> => {
      if (!canModerate(session)) return false;
      const res = await callApiWithAuth<{ platformSettings?: PlatformSettings }>(
        '/api/admin/action',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'update_settings', ...patch }),
        }
      );
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return false;
      }
      if (res.data?.platformSettings) {
        setPlatformSettings(res.data.platformSettings);
      }
      await refreshAdminOverview();
      return true;
    },
    [callApiWithAuth, refreshAdminOverview, session]
  );

  // Notifications & Referrals & App Rating
  const toggleNotifPref = useCallback((key: keyof NotificationPrefs) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeStorageJson(PREF_STORAGE_KEYS.notifPrefs, next);
      return next;
    });
  }, []);

  const markAllNotifsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const applyReferralCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!session || isAdminUser(session)) return false;
      const trimmed = code.trim().toUpperCase();
      if (!trimmed.startsWith('DROPP-') || trimmed === session.referralCode) return false;
      const res = await callApiWithAuth<{ referredByCode?: string }>('/api/commerce/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'apply_referral', referralCode: trimmed }),
      });
      if (!res.ok) {
        if (res.error) setActionError(res.error);
        return false;
      }
      setSession((prev) =>
        prev ? { ...prev, referredByCode: res.data?.referredByCode || trimmed } : prev
      );
      return true;
    },
    [callApiWithAuth, session]
  );

  const submitAppRating = useCallback((stars: number) => {
    setAppRating(stars);
    writeStorageJson(PREF_STORAGE_KEYS.appRating, stars);
  }, []);

  const signOutUser = useCallback(async () => {
    const uidToClear = sessionRef.current?.uid || firebaseUid;
    if (uidToClear) {
      removeStorageKey(userCartKey(uidToClear));
      removeStorageKey(userQueueKey(uidToClear));
      removeStorageKey(userRecentKey(uidToClear));
    }
    const [{ auth }, { signOut }] = await Promise.all([
      getFirebaseServices(),
      import('firebase/auth'),
    ]);
    await signOut(auth);
    setFirebaseUid(null);
    setSession(null);
    setProfileError(null);
    setActionError(null);
    setLikedIds([]);
    setBookmarkedIds([]);
    setFollowedShopIds([]);
    setOrders([]);
    setTransactions([]);
    setDisputes([]);
    setConversations([]);
    setRfqs([]);
    setKycApplications([]);
    setWithdrawalRequests([]);
    setAdminUsers([]);
    setAuditLogs([]);
    setNotifications([]);
    setCartItems([]);
    setOfflineQueue([]);
    setRecentlyViewedIds([]);
  }, [firebaseUid]);

  return {
    lang,
    setLang,
    posts,
    shops,
    catalogLoading,
    catalogError,
    retryCatalogLoad,
    likedIds,
    bookmarkedIds,
    followedShopIds,
    commentsByPost,
    reviewsByPost,
    setActiveCommentsPostId,
    setActiveReviewsPostId,
    cartItems,
    offlineQueue,
    recentlyViewedIds,
    orders,
    transactions,
    disputes,
    conversations,
    rfqs,
    kycApplications,
    withdrawalRequests,
    adminUsers,
    auditLogs,
    platformSettings,
    adminLoading,
    refreshAdminOverview,
    notifications,
    notifPrefs,
    appRating,
    session,
    firebaseUid,
    authReady,
    profileLoading,
    profileError,
    retryProfileLoad,
    actionError,
    clearActionError,
    recordViewedPost,
    toggleLike,
    toggleBookmark,
    toggleFollowShop,
    addComment,
    retryFailedComment,
    addProductReview,
    addToCartPreview,
    updateCartItemQty,
    clearCart,
    checkoutCart,
    cancelOrder,
    confirmOrderDelivery,
    openOrderDispute,
    rateOrder,
    reorderItems,
    updateOrderStatusByVendor,
    depositToWallet,
    withdrawFromWallet,
    openOrCreateConversation,
    sendMessage,
    respondToDealOffer,
    createRfq,
    submitRfqOffer,
    acceptRfqOffer,
    submitVendorKyc,
    publishVendorPost,
    publishVendorStory,
    reviewKycApplication,
    toggleShopCertification,
    suspendShop,
    resolveDispute,
    moderatePost,
    manageAdminUser,
    reviewWithdrawalRequest,
    updatePlatformSettings,
    toggleNotifPref,
    markAllNotifsRead,
    applyReferralCode,
    submitAppRating,
    signOutUser,
  };
}
