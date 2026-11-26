import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEMO_POSTS,
  DEMO_SHOPS,
  INITIAL_COMMENTS_BY_POST,
  INITIAL_CONVERSATIONS,
  INITIAL_DISPUTES,
  INITIAL_KYC_APPLICATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS_BY_POST,
  INITIAL_RFQS,
  INITIAL_TRANSACTIONS,
} from '../data/demoData';
import type {
  AppNotification,
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
  PostComment,
  ProductReview,
  QueuedAction,
  RfqRequest,
  ShopProfile,
  UserSession,
  VendorKycApplication,
  WalletTransaction,
} from '../types/dropp';
import {
  enqueueOfflineAction,
  getRetryableActions,
  markQueuedActionStatus,
} from '../utils/offlineQueue';
import {
  canBuyerCancelOrder,
  canBuyerDisputeOrder,
  groupCartByVendor,
  processMultiVendorCheckout,
  qualifiesForReferralReward,
  REFERRAL_BONUS_FCFA,
  resolveEscrowOnDispute,
} from '../utils/commerce';
import { getFirebaseServices } from '../lib/firebase';

const STORAGE_KEYS = {
  lang: 'dropp_lang',
  likes: 'dropp_liked_posts',
  bookmarks: 'dropp_bookmarked_posts',
  following: 'dropp_following_shops',
  comments: 'dropp_comments_cache',
  reviews: 'dropp_reviews_cache',
  cart: 'dropp_cart_preview',
  queue: 'dropp_offline_queue',
  recent: 'dropp_recent_posts',
  orders: 'dropp_orders_cache',
  transactions: 'dropp_tx_cache',
  disputes: 'dropp_disputes_cache',
  conversations: 'dropp_conversations_cache',
  rfqs: 'dropp_rfqs_cache',
  kyc: 'dropp_kyc_cache',
  shops: 'dropp_shops_cache',
  posts: 'dropp_posts_cache',
  notifs: 'dropp_notifs_cache',
  notifPrefs: 'dropp_notif_prefs',
  walletOverrides: 'dropp_wallet_overrides',
  appRating: 'dropp_app_rating',
};

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

export function useDroppState(isOnline: boolean) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    const saved = readStorageJson<LanguageCode>(STORAGE_KEYS.lang, 'fr');
    return saved === 'en' ? 'en' : 'fr';
  });

  const [posts, setPosts] = useState<FeedPost[]>(() =>
    readStorageJson<FeedPost[]>(STORAGE_KEYS.posts, DEMO_POSTS)
  );
  const [shops, setShops] = useState<ShopProfile[]>(() =>
    readStorageJson<ShopProfile[]>(STORAGE_KEYS.shops, DEMO_SHOPS)
  );
  const [likedIds, setLikedIds] = useState<string[]>(() =>
    readStorageJson<string[]>(STORAGE_KEYS.likes, [])
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() =>
    readStorageJson<string[]>(STORAGE_KEYS.bookmarks, ['post-01', 'post-03'])
  );
  const [followedShopIds, setFollowedShopIds] = useState<string[]>(() =>
    readStorageJson<string[]>(STORAGE_KEYS.following, ['shop-akwa-mode', 'shop-ouest-terroir'])
  );
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>(() =>
    readStorageJson<Record<string, PostComment[]>>(
      STORAGE_KEYS.comments,
      INITIAL_COMMENTS_BY_POST
    )
  );
  const [reviewsByPost, setReviewsByPost] = useState<Record<string, ProductReview[]>>(() =>
    readStorageJson<Record<string, ProductReview[]>>(
      STORAGE_KEYS.reviews,
      INITIAL_REVIEWS_BY_POST
    )
  );
  const [cartItems, setCartItems] = useState<LocalCartPreviewItem[]>(() =>
    readStorageJson<LocalCartPreviewItem[]>(STORAGE_KEYS.cart, [])
  );
  const [offlineQueue, setOfflineQueue] = useState<QueuedAction[]>(() =>
    readStorageJson<QueuedAction[]>(STORAGE_KEYS.queue, [])
  );
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    readStorageJson<string[]>(STORAGE_KEYS.recent, ['post-01'])
  );

  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    readStorageJson<OrderRecord[]>(STORAGE_KEYS.orders, INITIAL_ORDERS)
  );
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    readStorageJson<WalletTransaction[]>(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS)
  );
  const [disputes, setDisputes] = useState<DisputeRecord[]>(() =>
    readStorageJson<DisputeRecord[]>(STORAGE_KEYS.disputes, INITIAL_DISPUTES)
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    readStorageJson<Conversation[]>(STORAGE_KEYS.conversations, INITIAL_CONVERSATIONS)
  );
  const [rfqs, setRfqs] = useState<RfqRequest[]>(() =>
    readStorageJson<RfqRequest[]>(STORAGE_KEYS.rfqs, INITIAL_RFQS)
  );
  const [kycApplications, setKycApplications] = useState<VendorKycApplication[]>(() =>
    readStorageJson<VendorKycApplication[]>(STORAGE_KEYS.kyc, INITIAL_KYC_APPLICATIONS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    readStorageJson<AppNotification[]>(STORAGE_KEYS.notifs, INITIAL_NOTIFICATIONS)
  );
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() =>
    readStorageJson<NotificationPrefs>(STORAGE_KEYS.notifPrefs, {
      orders: true,
      messages: true,
      following: true,
      promos: true,
    })
  );
  const [appRating, setAppRating] = useState<number>(() =>
    readStorageJson<number>(STORAGE_KEYS.appRating, 0)
  );

  const [processedCheckoutKeys, setProcessedCheckoutKeys] = useState<string[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const flushingRef = useRef<boolean>(false);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    writeStorageJson(STORAGE_KEYS.lang, next);
  }, []);

  const persistSessionOverrides = useCallback((nextSession: UserSession) => {
    const map = readStorageJson<Record<string, Partial<UserSession>>>(
      STORAGE_KEYS.walletOverrides,
      {}
    );
    map[nextSession.uid] = {
      walletBalanceFcfa: nextSession.walletBalanceFcfa,
      pendingEscrowFcfa: nextSession.pendingEscrowFcfa,
      referralBonusEarnedFcfa: nextSession.referralBonusEarnedFcfa,
      referredByCode: nextSession.referredByCode,
      hasCompletedFirstOrder: nextSession.hasCompletedFirstOrder,
      role: nextSession.role,
      vendorStatus: nextSession.vendorStatus,
      isCertified: nextSession.isCertified,
      shopId: nextSession.shopId,
    };
    writeStorageJson(STORAGE_KEYS.walletOverrides, map);
  }, []);

  const mergeWithOverrides = useCallback((base: UserSession): UserSession => {
    const map = readStorageJson<Record<string, Partial<UserSession>>>(
      STORAGE_KEYS.walletOverrides,
      {}
    );
    const patch = map[base.uid];
    if (!patch) return base;
    return { ...base, ...patch };
  }, []);

  const pushNotification = useCallback(
    (category: keyof NotificationPrefs, title: string, body: string) => {
      if (!notifPrefs[category]) return;
      setNotifications((prev) => {
        const next: AppNotification[] = [
          {
            notifId: `N-${Date.now()}`,
            category,
            title,
            body,
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 30);
        writeStorageJson(STORAGE_KEYS.notifs, next);
        return next;
      });
    },
    [notifPrefs]
  );

  // Deferred modular Firebase Auth listener
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
            setSession(null);
            setAuthReady(true);
            return;
          }

          const fallbackProfile: UserSession = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Utilisateur DROPP',
            role: 'client',
            vendorStatus: 'none',
            isCertified: false,
            city: 'Douala',
            neighborhood: 'Akwa',
            walletBalanceFcfa: 0,
            pendingEscrowFcfa: 0,
            referralCode: `DROPP-${firebaseUser.uid.slice(0, 5).toUpperCase()}`,
            emailVerified: firebaseUser.emailVerified,
          };

          try {
            const idToken = await firebaseUser.getIdToken();
            const res = await fetch('/api/me/session', {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (res.ok) {
              const serverProfile = (await res.json()) as UserSession;
              if (active) setSession(mergeWithOverrides(serverProfile));
            } else if (active) {
              setSession(mergeWithOverrides(fallbackProfile));
            }
          } catch {
            if (active) setSession(mergeWithOverrides(fallbackProfile));
          } finally {
            if (active) setAuthReady(true);
          }
        });
      } catch {
        if (active) setAuthReady(true);
      }
    };

    const idleTimer = setTimeout(initAuth, 50);
    return () => {
      active = false;
      clearTimeout(idleTimer);
      unsubscribe?.();
    };
  }, [mergeWithOverrides]);

  const syncQueueItemToFirestore = useCallback(
    async (action: QueuedAction, currentSession: UserSession | null): Promise<boolean> => {
      if (!navigator.onLine) return false;
      if (!currentSession) return true;

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
            }).catch(() => undefined);
          } else {
            await deleteDoc(ref).catch(() => undefined);
          }
        } else if (action.type === 'bookmark_toggle') {
          const saved = Boolean(action.payload.saved);
          const ref = doc(db, 'users', currentSession.uid, 'bookmarks', action.targetId);
          if (saved) {
            await setDoc(ref, {
              userId: currentSession.uid,
              postId: action.targetId,
              createdAt: serverTimestamp(),
            }).catch(() => undefined);
          } else {
            await deleteDoc(ref).catch(() => undefined);
          }
        } else if (action.type === 'follow_toggle') {
          const followed = Boolean(action.payload.followed);
          const ref = doc(db, 'users', currentSession.uid, 'following', action.targetId);
          if (followed) {
            await setDoc(ref, {
              userId: currentSession.uid,
              shopId: action.targetId,
              createdAt: serverTimestamp(),
            }).catch(() => undefined);
          } else {
            await deleteDoc(ref).catch(() => undefined);
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
          }).catch(() => undefined);
        }
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Flush queued offline social actions when back online
  useEffect(() => {
    if (!isOnline || flushingRef.current) return;
    const pending = getRetryableActions(offlineQueue);
    if (pending.length === 0) return;

    flushingRef.current = true;
    (async () => {
      let nextQueue = [...offlineQueue];
      for (const action of pending) {
        const ok = await syncQueueItemToFirestore(action, session);
        nextQueue = markQueuedActionStatus(nextQueue, action.id, ok ? 'sent' : 'failed');
        if (ok && action.type === 'comment_create') {
          const commentId = String(action.payload.commentId);
          setCommentsByPost((prev) => {
            const list = prev[action.targetId] || [];
            const updated = {
              ...prev,
              [action.targetId]: list.map((c) =>
                c.commentId === commentId ? { ...c, deliveryStatus: 'sent' as const } : c
              ),
            };
            writeStorageJson(STORAGE_KEYS.comments, updated);
            return updated;
          });
        }
      }
      setOfflineQueue(nextQueue);
      writeStorageJson(STORAGE_KEYS.queue, nextQueue);
      flushingRef.current = false;
    })();
  }, [isOnline, offlineQueue, session, syncQueueItemToFirestore]);

  const recordViewedPost = useCallback((postId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [postId, ...prev.filter((id) => id !== postId)].slice(0, 12);
      writeStorageJson(STORAGE_KEYS.recent, next);
      return next;
    });
  }, []);

  const toggleLike = useCallback(
    (postId: string, forceLike?: boolean) => {
      const currentlyLiked = likedIds.includes(postId);
      const nextLiked = forceLike !== undefined ? forceLike : !currentlyLiked;
      if (nextLiked === currentlyLiked) return;

      const nextLikes = nextLiked
        ? [...likedIds, postId]
        : likedIds.filter((id) => id !== postId);
      setLikedIds(nextLikes);
      writeStorageJson(STORAGE_KEYS.likes, nextLikes);

      setPosts((prev) => {
        const next = prev.map((p) =>
          p.postId === postId
            ? { ...p, likesCount: Math.max(0, p.likesCount + (nextLiked ? 1 : -1)) }
            : p
        );
        writeStorageJson(STORAGE_KEYS.posts, next);
        return next;
      });

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `like-${postId}-${Date.now()}`,
        type: 'like_toggle',
        targetId: postId,
        payload: { liked: nextLiked },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(STORAGE_KEYS.queue, updatedQueue);
    },
    [likedIds, offlineQueue]
  );

  const toggleBookmark = useCallback(
    (postId: string) => {
      const currentlySaved = bookmarkedIds.includes(postId);
      const nextSaved = !currentlySaved;
      const nextList = nextSaved
        ? [...bookmarkedIds, postId]
        : bookmarkedIds.filter((id) => id !== postId);
      setBookmarkedIds(nextList);
      writeStorageJson(STORAGE_KEYS.bookmarks, nextList);

      setPosts((prev) => {
        const next = prev.map((p) =>
          p.postId === postId
            ? { ...p, bookmarksCount: Math.max(0, p.bookmarksCount + (nextSaved ? 1 : -1)) }
            : p
        );
        writeStorageJson(STORAGE_KEYS.posts, next);
        return next;
      });

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `bm-${postId}-${Date.now()}`,
        type: 'bookmark_toggle',
        targetId: postId,
        payload: { saved: nextSaved },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(STORAGE_KEYS.queue, updatedQueue);
    },
    [bookmarkedIds, offlineQueue]
  );

  const toggleFollowShop = useCallback(
    (shopId: string) => {
      const currentlyFollowed = followedShopIds.includes(shopId);
      const nextFollowed = !currentlyFollowed;
      const nextList = nextFollowed
        ? [...followedShopIds, shopId]
        : followedShopIds.filter((id) => id !== shopId);
      setFollowedShopIds(nextList);
      writeStorageJson(STORAGE_KEYS.following, nextList);

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `flw-${shopId}-${Date.now()}`,
        type: 'follow_toggle',
        targetId: shopId,
        payload: { followed: nextFollowed },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(STORAGE_KEYS.queue, updatedQueue);
    },
    [followedShopIds, offlineQueue]
  );

  const addComment = useCallback(
    (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !session) return;

      const commentId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newComment: PostComment = {
        commentId,
        postId,
        authorId: session.uid,
        authorName: session.displayName,
        text: trimmed,
        createdAt: new Date().toISOString(),
        deliveryStatus: isOnline ? 'sent' : 'pending',
      };

      setCommentsByPost((prev) => {
        const next = {
          ...prev,
          [postId]: [newComment, ...(prev[postId] || [])],
        };
        writeStorageJson(STORAGE_KEYS.comments, next);
        return next;
      });

      setPosts((prev) => {
        const next = prev.map((p) =>
          p.postId === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        );
        writeStorageJson(STORAGE_KEYS.posts, next);
        return next;
      });

      const action: Omit<QueuedAction, 'status' | 'attempts'> = {
        id: `cmt-${commentId}`,
        type: 'comment_create',
        targetId: postId,
        payload: { commentId, text: trimmed },
        createdAt: Date.now(),
      };
      const updatedQueue = enqueueOfflineAction(offlineQueue, action);
      setOfflineQueue(updatedQueue);
      writeStorageJson(STORAGE_KEYS.queue, updatedQueue);
    },
    [isOnline, offlineQueue, session]
  );

  const retryFailedComment = useCallback((postId: string, commentId: string) => {
    setOfflineQueue((prev) => {
      const next = prev.map((a) =>
        a.type === 'comment_create' && a.payload.commentId === commentId
          ? { ...a, status: 'pending' as const }
          : a
      );
      writeStorageJson(STORAGE_KEYS.queue, next);
      return next;
    });
    setCommentsByPost((prev) => {
      const next = {
        ...prev,
        [postId]: (prev[postId] || []).map((c) =>
          c.commentId === commentId ? { ...c, deliveryStatus: 'pending' as const } : c
        ),
      };
      writeStorageJson(STORAGE_KEYS.comments, next);
      return next;
    });
  }, []);

  const addProductReview = useCallback(
    (postId: string, rating: number, comment: string) => {
      if (!session || !comment.trim()) return;
      const review: ProductReview = {
        reviewId: `rev-${Date.now()}`,
        postId,
        authorId: session.uid,
        authorName: `${session.displayName} · ${session.city}`,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };
      setReviewsByPost((prev) => {
        const next = { ...prev, [postId]: [review, ...(prev[postId] || [])] };
        writeStorageJson(STORAGE_KEYS.reviews, next);
        return next;
      });
    },
    [session]
  );

  // Cart actions
  const addToCartPreview = useCallback((item: LocalCartPreviewItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (x) => x.postId === item.postId && x.variantId === item.variantId
      );
      let next: LocalCartPreviewItem[];
      if (existingIdx >= 0) {
        next = prev.map((x, idx) =>
          idx === existingIdx ? { ...x, qty: x.qty + item.qty, unitPriceFcfa: item.unitPriceFcfa } : x
        );
      } else {
        next = [...prev, item];
      }
      writeStorageJson(STORAGE_KEYS.cart, next);
      return next;
    });
  }, []);

  const updateCartItemQty = useCallback((postId: string, variantId: string, nextQty: number) => {
    setCartItems((prev) => {
      const next =
        nextQty <= 0
          ? prev.filter((x) => !(x.postId === postId && x.variantId === variantId))
          : prev.map((x) =>
              x.postId === postId && x.variantId === variantId ? { ...x, qty: nextQty } : x
            );
      writeStorageJson(STORAGE_KEYS.cart, next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    writeStorageJson(STORAGE_KEYS.cart, []);
  }, []);

  // Multi-vendor Checkout & Escrow
  const checkoutCart = useCallback(
    (params: {
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
      const groups = groupCartByVendor(cartItems, shops, params.deliveryCity);
      const res = processMultiVendorCheckout({
        idempotencyKey: params.idempotencyKey,
        processedKeys: processedCheckoutKeys,
        buyerId: session.uid,
        buyerName: session.displayName,
        groups,
        paymentMethod: params.paymentMethod,
        walletBalanceFcfa: session.walletBalanceFcfa,
        simulateMobileSuccess: params.simulateMobileSuccess,
        deliveryCity: params.deliveryCity,
        deliveryNeighborhood: params.deliveryNeighborhood,
        deliveryPhone: params.deliveryPhone,
      });

      if (res.newOrders.length > 0) {
        setProcessedCheckoutKeys((prev) => [...prev, params.idempotencyKey]);
        setOrders((prev) => {
          const next = [...res.newOrders, ...prev];
          writeStorageJson(STORAGE_KEYS.orders, next);
          return next;
        });
      }

      if (res.ok) {
        const nextSession: UserSession = {
          ...session,
          walletBalanceFcfa: Math.max(0, session.walletBalanceFcfa + res.walletDeltaFcfa),
          pendingEscrowFcfa: session.pendingEscrowFcfa + res.escrowDeltaFcfa,
        };
        setSession(nextSession);
        persistSessionOverrides(nextSession);

        const methodLabel =
          params.paymentMethod === 'wallet'
            ? 'Portefeuille DROPP'
            : params.paymentMethod === 'mtn_momo'
            ? 'MTN MoMo'
            : 'Orange Money';

        setTransactions((prev) => {
          const tx: WalletTransaction = {
            txId: `TX-${Date.now()}`,
            userId: session.uid,
            type: 'escrow_hold',
            amountFcfa: -res.escrowDeltaFcfa,
            methodLabel,
            referenceId: res.globalOrderId,
            status: 'completed',
            createdAt: new Date().toISOString(),
          };
          const next = [tx, ...prev];
          writeStorageJson(STORAGE_KEYS.transactions, next);
          return next;
        });

        clearCart();
        pushNotification(
          'orders',
          `Commande ${res.globalOrderId} confirmée`,
          `${res.newOrders.length} sous-commande(s) protégée(s) en séquestre.`
        );
      }

      return res;
    },
    [
      cartItems,
      clearCart,
      isOnline,
      persistSessionOverrides,
      processedCheckoutKeys,
      pushNotification,
      session,
      shops,
    ]
  );

  // Order lifecycle & escrow release
  const cancelOrder = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (!target || !canBuyerCancelOrder(target)) return;

      setOrders((prev) => {
        const next = prev.map((o) =>
          o.orderId === orderId
            ? { ...o, status: 'cancelled' as const, escrowStatus: 'refunded' as const }
            : o
        );
        writeStorageJson(STORAGE_KEYS.orders, next);
        return next;
      });

      if (session) {
        const refundAmt = target.status === 'awaiting_payment' ? 0 : target.totalFcfa;
        const nextSession: UserSession = {
          ...session,
          walletBalanceFcfa: session.walletBalanceFcfa + refundAmt,
          pendingEscrowFcfa: Math.max(0, session.pendingEscrowFcfa - refundAmt),
        };
        setSession(nextSession);
        persistSessionOverrides(nextSession);

        if (refundAmt > 0) {
          setTransactions((prev) => {
            const next: WalletTransaction[] = [
              {
                txId: `TX-${Date.now()}`,
                userId: session.uid,
                type: 'refund',
                amountFcfa: refundAmt,
                methodLabel: 'Portefeuille DROPP',
                referenceId: orderId,
                status: 'completed',
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ];
            writeStorageJson(STORAGE_KEYS.transactions, next);
            return next;
          });
        }
      }
    },
    [orders, persistSessionOverrides, session]
  );

  const confirmOrderDelivery = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (!target || (target.status !== 'delivered' && target.status !== 'delivering')) return;

      setOrders((prev) => {
        const next = prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: 'delivered' as const,
                escrowStatus: 'released' as const,
                deliveredAt: o.deliveredAt || new Date().toISOString(),
              }
            : o
        );
        writeStorageJson(STORAGE_KEYS.orders, next);
        return next;
      });

      if (session) {
        const referralEarned = qualifiesForReferralReward({
          referredByCode: session.referredByCode,
          hasCompletedFirstOrder: session.hasCompletedFirstOrder,
          orderStatus: 'delivered',
        })
          ? REFERRAL_BONUS_FCFA
          : 0;

        const nextSession: UserSession = {
          ...session,
          pendingEscrowFcfa: Math.max(0, session.pendingEscrowFcfa - target.totalFcfa),
          walletBalanceFcfa: session.walletBalanceFcfa + referralEarned,
          referralBonusEarnedFcfa: (session.referralBonusEarnedFcfa || 0) + referralEarned,
          hasCompletedFirstOrder: true,
        };
        setSession(nextSession);
        persistSessionOverrides(nextSession);

        const newTxs: WalletTransaction[] = [
          {
            txId: `TX-REL-${Date.now()}`,
            userId: session.uid,
            type: 'escrow_release',
            amountFcfa: target.totalFcfa,
            methodLabel: `Libéré à ${target.shopName}`,
            referenceId: orderId,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ];
        if (referralEarned > 0) {
          newTxs.unshift({
            txId: `TX-REF-${Date.now() + 1}`,
            userId: session.uid,
            type: 'referral_bonus',
            amountFcfa: referralEarned,
            methodLabel: `Parrainage ${session.referredByCode}`,
            referenceId: orderId,
            status: 'completed',
            createdAt: new Date().toISOString(),
          });
          pushNotification(
            'orders',
            'Bonus parrainage crédité (+500 FCFA)',
            'Votre première commande livrée a débloqué 500 FCFA sur votre portefeuille DROPP.'
          );
        }

        setTransactions((prev) => {
          const next = [...newTxs, ...prev];
          writeStorageJson(STORAGE_KEYS.transactions, next);
          return next;
        });
      }
    },
    [orders, persistSessionOverrides, pushNotification, session]
  );

  const openOrderDispute = useCallback(
    (orderId: string, reason: string) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (!target || !canBuyerDisputeOrder(target) || !reason.trim()) return;

      const disputeId = `LIT-${Date.now().toString().slice(-5)}`;
      const dispute: DisputeRecord = {
        disputeId,
        orderId,
        buyerId: target.buyerId,
        buyerName: target.buyerName,
        shopId: target.shopId,
        shopName: target.shopName,
        reason: reason.trim(),
        amountHeldFcfa: target.totalFcfa,
        status: 'open',
        createdAt: new Date().toISOString(),
      };

      setDisputes((prev) => {
        const next = [dispute, ...prev];
        writeStorageJson(STORAGE_KEYS.disputes, next);
        return next;
      });
      setOrders((prev) => {
        const next = prev.map((o) =>
          o.orderId === orderId
            ? { ...o, status: 'disputed' as const, escrowStatus: 'disputed' as const, disputeId }
            : o
        );
        writeStorageJson(STORAGE_KEYS.orders, next);
        return next;
      });
      pushNotification(
        'orders',
        `Litige ${disputeId} ouvert`,
        'Le séquestre reste bloqué pendant l’examen par l’administrateur.'
      );
    },
    [orders, pushNotification]
  );

  const rateOrder = useCallback((orderId: string) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.orderId === orderId ? { ...o, rated: true } : o));
      writeStorageJson(STORAGE_KEYS.orders, next);
      return next;
    });
  }, []);

  const reorderItems = useCallback(
    (order: OrderRecord) => {
      for (const item of order.items) {
        addToCartPreview(item);
      }
    },
    [addToCartPreview]
  );

  // Vendor order status transition
  const updateOrderStatusByVendor = useCallback(
    (orderId: string, nextStatus: OrderStatus) => {
      const target = orders.find((o) => o.orderId === orderId);
      if (!target) return;

      setOrders((prev) => {
        const next = prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: nextStatus,
                escrowStatus: nextStatus === 'cancelled' ? ('refunded' as const) : o.escrowStatus,
                deliveredAt: nextStatus === 'delivered' ? new Date().toISOString() : o.deliveredAt,
              }
            : o
        );
        writeStorageJson(STORAGE_KEYS.orders, next);
        return next;
      });

      if (nextStatus === 'cancelled' && session && target.buyerId === session.uid) {
        const nextSession: UserSession = {
          ...session,
          walletBalanceFcfa: session.walletBalanceFcfa + target.totalFcfa,
          pendingEscrowFcfa: Math.max(0, session.pendingEscrowFcfa - target.totalFcfa),
        };
        setSession(nextSession);
        persistSessionOverrides(nextSession);
      }
    },
    [orders, persistSessionOverrides, session]
  );

  // Wallet deposit / withdraw (simulated)
  const depositToWallet = useCallback(
    (amountFcfa: number, methodLabel: string) => {
      if (!session || !isOnline || amountFcfa <= 0) return false;
      const nextSession: UserSession = {
        ...session,
        walletBalanceFcfa: session.walletBalanceFcfa + amountFcfa,
      };
      setSession(nextSession);
      persistSessionOverrides(nextSession);

      setTransactions((prev) => {
        const next: WalletTransaction[] = [
          {
            txId: `TX-DEP-${Date.now()}`,
            userId: session.uid,
            type: 'deposit',
            amountFcfa,
            methodLabel,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
        writeStorageJson(STORAGE_KEYS.transactions, next);
        return next;
      });
      return true;
    },
    [isOnline, persistSessionOverrides, session]
  );

  const withdrawFromWallet = useCallback(
    (amountFcfa: number, methodLabel: string) => {
      if (!session || !isOnline || amountFcfa <= 0 || session.walletBalanceFcfa < amountFcfa) {
        return false;
      }
      const nextSession: UserSession = {
        ...session,
        walletBalanceFcfa: session.walletBalanceFcfa - amountFcfa,
      };
      setSession(nextSession);
      persistSessionOverrides(nextSession);

      setTransactions((prev) => {
        const next: WalletTransaction[] = [
          {
            txId: `TX-WDR-${Date.now()}`,
            userId: session.uid,
            type: 'withdrawal',
            amountFcfa: -amountFcfa,
            methodLabel,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
        writeStorageJson(STORAGE_KEYS.transactions, next);
        return next;
      });
      return true;
    },
    [isOnline, persistSessionOverrides, session]
  );

  // Messaging & Negotiation
  const openOrCreateConversation = useCallback(
    (shop: ShopProfile, initialText?: string): string => {
      const existing = conversations.find((c) => c.shopId === shop.shopId);
      if (existing) {
        if (initialText && session) {
          const msg: ChatMessage = {
            messageId: `msg-${Date.now()}`,
            conversationId: existing.conversationId,
            senderId: session.uid,
            senderName: session.displayName,
            kind: 'text',
            text: initialText,
            createdAt: new Date().toISOString(),
          };
          setConversations((prev) => {
            const next = prev.map((c) =>
              c.conversationId === existing.conversationId
                ? {
                    ...c,
                    lastMessageText: initialText,
                    updatedAt: msg.createdAt,
                    messages: [...c.messages, msg],
                  }
                : c
            );
            writeStorageJson(STORAGE_KEYS.conversations, next);
            return next;
          });
        }
        return existing.conversationId;
      }

      const convId = `conv-${shop.shopId}-${Date.now().toString().slice(-4)}`;
      const firstMsg: ChatMessage | null = initialText
        ? {
            messageId: `msg-${Date.now()}`,
            conversationId: convId,
            senderId: session?.uid || 'visitor',
            senderName: session?.displayName || 'Client',
            kind: 'text',
            text: initialText,
            createdAt: new Date().toISOString(),
          }
        : null;

      const created: Conversation = {
        conversationId: convId,
        buyerId: session?.uid || 'client-demo',
        buyerName: session?.displayName || 'Client DROPP',
        shopId: shop.shopId,
        shopName: shop.name,
        shopAvatarUrl: shop.avatarUrl,
        shopCertified: shop.isCertified,
        shopOnline: shop.isOnline ?? true,
        unreadCount: 0,
        lastMessageText: initialText || `Discussion ouverte avec ${shop.name}`,
        updatedAt: new Date().toISOString(),
        messages: firstMsg ? [firstMsg] : [],
      };
      setConversations((prev) => {
        const next = [created, ...prev];
        writeStorageJson(STORAGE_KEYS.conversations, next);
        return next;
      });
      return convId;
    },
    [conversations, session]
  );

  const sendMessage = useCallback(
    (
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
      if (!session) return;
      const msg: ChatMessage = {
        messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        conversationId,
        senderId: session.uid,
        senderName: session.displayName,
        kind: payload.kind,
        text: payload.text,
        mediaUrl: payload.mediaUrl,
        fileName: payload.fileName,
        locationLabel: payload.locationLabel,
        offer: payload.offer,
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) => {
        const next = prev.map((c) =>
          c.conversationId === conversationId
            ? {
                ...c,
                lastMessageText: payload.text || payload.offer?.productTitle || 'Pièce jointe',
                updatedAt: msg.createdAt,
                unreadCount: 0,
                messages: [...c.messages, msg],
              }
            : c
        );
        writeStorageJson(STORAGE_KEYS.conversations, next);
        return next;
      });
    },
    [session]
  );

  const respondToDealOffer = useCallback(
    (conversationId: string, messageId: string, decision: 'accepted' | 'declined') => {
      let acceptedOffer: DealOfferCard | null = null;
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.conversationId !== conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.messageId !== messageId || !m.offer) return m;
              const updatedOffer = { ...m.offer, status: decision };
              if (decision === 'accepted') acceptedOffer = updatedOffer;
              return { ...m, offer: updatedOffer };
            }),
          };
        });
        writeStorageJson(STORAGE_KEYS.conversations, next);
        return next;
      });

      if (acceptedOffer) {
        const offer = acceptedOffer as DealOfferCard;
        const shop = shops.find((s) => s.shopId === offer.shopId);
        addToCartPreview({
          postId: offer.postId || `offer-${offer.offerId}`,
          shopId: offer.shopId,
          shopName: offer.shopName,
          shopCity: shop?.city || 'Douala',
          title: `${offer.productTitle} (Offre négociée)`,
          variantId: offer.offerId,
          variantLabel: `Lot négocié · ${offer.qty} pcs`,
          qty: offer.qty,
          unitPriceFcfa: offer.unitPriceFcfa,
          posterUrl: shop?.avatarUrl || posts[0]?.posterUrl || '',
        });
      }
    },
    [addToCartPreview, posts, shops]
  );

  // RFQs
  const createRfq = useCallback(
    (payload: {
      title: string;
      description: string;
      category: MarketplaceCategory;
      quantity: number;
      budgetFcfa: number;
      deadlineDays: number;
      city: string;
      photoUrl?: string;
    }) => {
      if (!session) return;
      const rfq: RfqRequest = {
        rfqId: `RFQ-${Date.now().toString().slice(-5)}`,
        buyerId: session.uid,
        buyerName: session.displayName,
        title: payload.title.trim(),
        description: payload.description.trim(),
        category: payload.category,
        quantity: payload.quantity,
        budgetFcfa: payload.budgetFcfa,
        deadlineDays: payload.deadlineDays,
        city: payload.city,
        photoUrl: payload.photoUrl,
        status: 'open',
        offers: [],
        createdAt: new Date().toISOString(),
      };
      setRfqs((prev) => {
        const next = [rfq, ...prev];
        writeStorageJson(STORAGE_KEYS.rfqs, next);
        return next;
      });
    },
    [session]
  );

  const submitRfqOffer = useCallback(
    (rfqId: string, unitPriceFcfa: number, deliveryDays: number, message: string) => {
      if (!session) return;
      const myShop = shops.find((s) => s.shopId === session.shopId) || shops[0];
      setRfqs((prev) => {
        const next = prev.map((r) =>
          r.rfqId === rfqId
            ? {
                ...r,
                offers: [
                  ...r.offers,
                  {
                    offerId: `RFQO-${Date.now().toString().slice(-4)}`,
                    rfqId,
                    shopId: myShop.shopId,
                    shopName: myShop.name,
                    shopCertified: myShop.isCertified,
                    unitPriceFcfa,
                    deliveryDays,
                    message: message.trim(),
                    status: 'pending' as const,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : r
        );
        writeStorageJson(STORAGE_KEYS.rfqs, next);
        return next;
      });
    },
    [session, shops]
  );

  const acceptRfqOffer = useCallback(
    (rfqId: string, offerId: string) => {
      const targetRfq = rfqs.find((r) => r.rfqId === rfqId);
      const targetOffer = targetRfq?.offers.find((o) => o.offerId === offerId);
      if (!targetRfq || !targetOffer) return;

      setRfqs((prev) => {
        const next = prev.map((r) =>
          r.rfqId === rfqId
            ? {
                ...r,
                status: 'awarded' as const,
                offers: r.offers.map((o) => ({
                  ...o,
                  status: o.offerId === offerId ? ('accepted' as const) : ('declined' as const),
                })),
              }
            : r
        );
        writeStorageJson(STORAGE_KEYS.rfqs, next);
        return next;
      });

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
      });
    },
    [addToCartPreview, posts, rfqs, shops]
  );

  // Vendor KYC, Publish & Stories
  const submitVendorKyc = useCallback(
    (payload: {
      shopName: string;
      city: 'Douala' | 'Yaoundé';
      neighborhood: string;
      category: MarketplaceCategory;
      cniNumber: string;
      cniFrontUrl: string;
      cniBackUrl: string;
      selfieUrl: string;
    }) => {
      if (!session) return;
      const app: VendorKycApplication = {
        applicationId: `KYC-${Date.now().toString().slice(-5)}`,
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
      };
      setKycApplications((prev) => {
        const next = [app, ...prev.filter((k) => k.userId !== session.uid)];
        writeStorageJson(STORAGE_KEYS.kyc, next);
        return next;
      });
      const nextSession: UserSession = {
        ...session,
        role: 'vendor',
        vendorStatus: 'pending',
      };
      setSession(nextSession);
      persistSessionOverrides(nextSession);
    },
    [persistSessionOverrides, session]
  );

  const publishVendorPost = useCallback(
    (payload: {
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
    }) => {
      if (!session) return;
      const myShop =
        shops.find((s) => s.shopId === session.shopId) ||
        shops.find((s) => s.ownerId === session.uid) ||
        shops[0];
      const postId = `post-${Date.now().toString().slice(-6)}`;
      const newPost: FeedPost = {
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
        galleryUrls: payload.galleryUrls,
        priceFcfa: payload.priceFcfa,
        promoPercent: payload.promoPercent || undefined,
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
        variants: [
          { id: 'v1', label: 'Standard', stock: 50, priceDeltaFcfa: 0 },
        ],
        specs: [{ label: 'Disponibilité', value: `${myShop.city} · Expédition 24 h` }],
        likesCount: 1,
        commentsCount: 0,
        bookmarksCount: 0,
        sharesCount: 0,
        rating: 5.0,
        status: 'published',
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => {
        const next = [newPost, ...prev];
        writeStorageJson(STORAGE_KEYS.posts, next);
        return next;
      });
      pushNotification('following', `Nouveau produit · ${myShop.name}`, newPost.title);
    },
    [pushNotification, session, shops]
  );

  const publishVendorStory = useCallback(
    (storyText: string, mediaUrl?: string) => {
      if (!session || !storyText.trim()) return;
      const myShopId = session.shopId || shops[0].shopId;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setShops((prev) => {
        const next = prev.map((s) =>
          s.shopId === myShopId
            ? {
                ...s,
                hasActiveStory: true,
                storyPreviewText: storyText.trim(),
                storyMediaUrl: mediaUrl || s.storyMediaUrl || s.avatarUrl,
                storyExpiresAt: expiresAt,
              }
            : s
        );
        writeStorageJson(STORAGE_KEYS.shops, next);
        return next;
      });
    },
    [session, shops]
  );

  // Admin actions
  const reviewKycApplication = useCallback(
    (applicationId: string, decision: 'approved' | 'rejected', reason?: string) => {
      const targetApp = kycApplications.find((k) => k.applicationId === applicationId);
      if (!targetApp) return;

      setKycApplications((prev) => {
        const next = prev.map((k) =>
          k.applicationId === applicationId
            ? { ...k, status: decision, rejectionReason: reason }
            : k
        );
        writeStorageJson(STORAGE_KEYS.kyc, next);
        return next;
      });

      setShops((prev) => {
        const existingShop = prev.find((s) => s.ownerId === targetApp.userId);
        let next: ShopProfile[];
        if (existingShop) {
          next = prev.map((s) =>
            s.ownerId === targetApp.userId
              ? { ...s, vendorStatus: decision === 'approved' ? 'approved' : 'rejected' }
              : s
          );
        } else if (decision === 'approved') {
          const newShop: ShopProfile = {
            shopId: `shop-${targetApp.userId.slice(0, 8)}`,
            ownerId: targetApp.userId,
            name: targetApp.shopName,
            handle: `@${targetApp.shopName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)}`,
            city: targetApp.city,
            neighborhood: targetApp.neighborhood,
            category: targetApp.category,
            isCertified: false,
            isPremium: false,
            vendorStatus: 'approved',
            memberSinceYear: 2026,
            rating: 5.0,
            salesCount: 0,
            responseRate: 100,
            followersCount: 1,
            followingCount: 0,
            likesCount: 0,
            avatarUrl: targetApp.selfieUrl,
            bio: `Boutique ${targetApp.category} à ${targetApp.neighborhood}, ${targetApp.city}.`,
            isOnline: true,
          };
          next = [newShop, ...prev];
        } else {
          next = prev;
        }
        writeStorageJson(STORAGE_KEYS.shops, next);
        return next;
      });
    },
    [kycApplications]
  );

  const toggleShopCertification = useCallback((shopId: string) => {
    setShops((prev) => {
      const next = prev.map((s) =>
        s.shopId === shopId ? { ...s, isCertified: !s.isCertified } : s
      );
      writeStorageJson(STORAGE_KEYS.shops, next);
      return next;
    });
    setPosts((prev) => {
      const next = prev.map((p) =>
        p.shopId === shopId ? { ...p, shopCertified: !p.shopCertified } : p
      );
      writeStorageJson(STORAGE_KEYS.posts, next);
      return next;
    });
  }, []);

  const suspendShop = useCallback((shopId: string) => {
    setShops((prev) => {
      const next = prev.map((s) =>
        s.shopId === shopId
          ? {
              ...s,
              vendorStatus: s.vendorStatus === 'suspended' ? ('approved' as const) : ('suspended' as const),
            }
          : s
      );
      writeStorageJson(STORAGE_KEYS.shops, next);
      return next;
    });
  }, []);

  const resolveDispute = useCallback(
    (disputeId: string, decision: 'resolved_buyer' | 'resolved_vendor') => {
      const target = disputes.find((d) => d.disputeId === disputeId);
      if (!target || target.status !== 'open') return;
      const resolution = resolveEscrowOnDispute(target, decision);

      setDisputes((prev) => {
        const next = prev.map((d) =>
          d.disputeId === disputeId ? { ...d, status: decision } : d
        );
        writeStorageJson(STORAGE_KEYS.disputes, next);
        return next;
      });

      setOrders((prev) => {
        const next = prev.map((o) =>
          o.orderId === target.orderId
            ? { ...o, status: resolution.orderStatus, escrowStatus: resolution.escrowStatus }
            : o
        );
        writeStorageJson(STORAGE_KEYS.orders, next);
        return next;
      });

      if (session && resolution.buyerWalletCreditFcfa > 0) {
        const nextSession: UserSession = {
          ...session,
          walletBalanceFcfa: session.walletBalanceFcfa + resolution.buyerWalletCreditFcfa,
          pendingEscrowFcfa: Math.max(
            0,
            session.pendingEscrowFcfa - resolution.escrowReleaseFcfa
          ),
        };
        setSession(nextSession);
        persistSessionOverrides(nextSession);
      }
    },
    [disputes, persistSessionOverrides, session]
  );

  const moderatePost = useCallback((postId: string, status: 'published' | 'rejected') => {
    setPosts((prev) => {
      const next = prev.map((p) => (p.postId === postId ? { ...p, status } : p));
      writeStorageJson(STORAGE_KEYS.posts, next);
      return next;
    });
  }, []);

  // Notifications & Referrals & App Rating
  const toggleNotifPref = useCallback((key: keyof NotificationPrefs) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeStorageJson(STORAGE_KEYS.notifPrefs, next);
      return next;
    });
  }, []);

  const markAllNotifsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      writeStorageJson(STORAGE_KEYS.notifs, next);
      return next;
    });
  }, []);

  const applyReferralCode = useCallback(
    (code: string) => {
      if (!session) return false;
      const trimmed = code.trim().toUpperCase();
      if (!trimmed.startsWith('DROPP-') || trimmed === session.referralCode) return false;
      const nextSession: UserSession = { ...session, referredByCode: trimmed };
      setSession(nextSession);
      persistSessionOverrides(nextSession);
      return true;
    },
    [persistSessionOverrides, session]
  );

  const submitAppRating = useCallback((stars: number) => {
    setAppRating(stars);
    writeStorageJson(STORAGE_KEYS.appRating, stars);
  }, []);

  const signOutUser = useCallback(async () => {
    const [{ auth }, { signOut }] = await Promise.all([
      getFirebaseServices(),
      import('firebase/auth'),
    ]);
    await signOut(auth);
    setSession(null);
  }, []);

  return {
    lang,
    setLang,
    posts,
    shops,
    likedIds,
    bookmarkedIds,
    followedShopIds,
    commentsByPost,
    reviewsByPost,
    cartItems,
    offlineQueue,
    recentlyViewedIds,
    orders,
    transactions,
    disputes,
    conversations,
    rfqs,
    kycApplications,
    notifications,
    notifPrefs,
    appRating,
    session,
    authReady,
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
    toggleNotifPref,
    markAllNotifsRead,
    applyReferralCode,
    submitAppRating,
    signOutUser,
  };
}
