import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Compass,
  Download,
  Home,
  Megaphone,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Store,
  User,
  X,
  Zap,
} from 'lucide-react';
import { TRANSLATIONS } from './i18n/translations';
import { useNetworkProfile } from './hooks/useNetworkProfile';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useDroppState } from './hooks/useDroppState';
import { useTheme } from './hooks/useTheme';
import type { AppRoute, FeedPost, NavTab, ShopProfile } from './types/dropp';
import { buildDroppPath, parseDroppRoute, routeToNavTab } from './utils/routing';
import {
  canAccessAdmin,
  canBuy,
  canCreateRfq,
  canLikeAndComment,
  canRespondToRfq,
  canRequestVendorKyc,
  canSendMessage,
  canViewOwnSalesOrders,
  isAdminUser,
  isApprovedVendorUser,
  isPendingVendorUser,
  isSuspendedVendor,
} from './utils/permissions';
import { DroppLogo } from './components/DroppLogo';
import { OfflineBanner } from './components/OfflineBanner';
import { FeedScreen } from './components/FeedScreen';
import {
  CommentsSheet,
  CreateActionSheet,
  QuickOrderSheet,
  ShareSheet,
  StoryPreviewSheet,
} from './components/BottomSheets';

const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const MarketScreen = lazy(() =>
  import('./components/MarketScreen').then((m) => ({ default: m.MarketScreen }))
);
const MessagesScreen = lazy(() =>
  import('./components/MessagesScreen').then((m) => ({ default: m.MessagesScreen }))
);
const ProfileScreen = lazy(() =>
  import('./components/ProfileScreen').then((m) => ({ default: m.ProfileScreen }))
);
const ProductDetailSheet = lazy(() =>
  import('./components/ProductDetailSheet').then((m) => ({ default: m.ProductDetailSheet }))
);
const ProductComparatorModal = lazy(() =>
  import('./components/ProductComparatorModal').then((m) => ({
    default: m.ProductComparatorModal,
  }))
);
const CartCheckoutDrawer = lazy(() =>
  import('./components/CartCheckoutDrawer').then((m) => ({ default: m.CartCheckoutDrawer }))
);
const RfqModal = lazy(() =>
  import('./components/RfqModal').then((m) => ({ default: m.RfqModal }))
);
const VendorStudioScreen = lazy(() =>
  import('./components/VendorStudioScreen').then((m) => ({ default: m.VendorStudioScreen }))
);
const AdminDashboardScreen = lazy(() =>
  import('./components/AdminDashboardScreen').then((m) => ({
    default: m.AdminDashboardScreen,
  }))
);

function ScreenSkeleton() {
  return (
    <div className="h-full w-full bg-[var(--dropp-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-[var(--dropp-surface)]" />
        <div className="h-48 w-full rounded-2xl bg-[var(--dropp-surface)]" />
        <div className="h-24 w-full rounded-2xl bg-[var(--dropp-surface)]" />
      </div>
    </div>
  );
}

export default function App() {
  const {
    isOnline,
    justReconnected,
    isSlowNetwork,
    dataSaver,
    manualDataSaver,
    toggleManualDataSaver,
  } = useNetworkProfile();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { themePref, setThemePref } = useTheme();

  const {
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
  } = useDroppState(isOnline);

  const t = TRANSLATIONS[lang];

  const isApprovedVendor = isApprovedVendorUser(session);
  const canOpenCart = !session || canBuy(session);

  const initialParsedRoute = useMemo(
    () =>
      typeof window !== 'undefined'
        ? parseDroppRoute(window.location.pathname, window.location.search)
        : { route: 'feed' as AppRoute, shopId: null, postId: null },
    []
  );

  const [appRoute, setAppRoute] = useState<AppRoute>(initialParsedRoute.route);
  const [viewedShopId, setViewedShopId] = useState<string | null>(initialParsedRoute.shopId);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialParsedRoute.postId);
  const [vendorStudioTab, setVendorStudioTab] = useState<
    'publish' | 'orders' | 'stories' | 'kyc'
  >('publish');

  const activeTab: NavTab = routeToNavTab(appRoute);

  const [profileSubTab, setProfileSubTab] = useState<
    'posts' | 'products' | 'info' | 'orders' | 'wallet' | 'notifs'
  >('posts');

  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null);
  const [orderPost, setOrderPost] = useState<FeedPost | null>(null);
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
  const [sharePost, setSharePost] = useState<FeedPost | null>(null);
  const [storyShop, setStoryShop] = useState<ShopProfile | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showComparator, setShowComparator] = useState(false);
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [uiNotice, setUiNotice] = useState<string | null>(null);
  const [dismissedAnnouncementKey, setDismissedAnnouncementKey] = useState<string | null>(null);

  const navigateTo = useCallback(
    (
      nextRoute: AppRoute,
      opts?: {
        shopId?: string | null;
        postId?: string | null;
        vendorTab?: 'publish' | 'orders' | 'stories' | 'kyc';
        replace?: boolean;
      }
    ) => {
      const nextShopId = opts?.shopId ?? null;
      const nextPostId = opts?.postId ?? null;
      if (opts?.vendorTab) {
        setVendorStudioTab(opts.vendorTab);
      }
      setAppRoute(nextRoute);
      setViewedShopId(nextShopId);
      setSelectedPostId(nextPostId);

      if (typeof window !== 'undefined') {
        const targetPath = buildDroppPath({
          route: nextRoute,
          shopId: nextShopId,
          postId: nextPostId,
        });
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (currentPath !== targetPath) {
          if (opts?.replace) {
            window.history.replaceState(null, '', targetPath);
          } else {
            window.history.pushState(null, '', targetPath);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseDroppRoute(window.location.pathname, window.location.search);
      setAppRoute(parsed.route);
      setViewedShopId(parsed.shopId);
      setSelectedPostId(parsed.postId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (appRoute === 'admin' && canAccessAdmin(session)) {
      refreshAdminOverview();
    }
  }, [appRoute, refreshAdminOverview, session]);

  const showRoleBlockedNotice = () => {
    if (isAdminUser(session)) {
      setUiNotice(t.errors.adminBlocked);
    } else if (isSuspendedVendor(session)) {
      setUiNotice(t.errors.suspendedBlocked);
    }
  };

  const viewedShop = useMemo(
    () => (viewedShopId ? shops.find((s) => s.shopId === viewedShopId) ?? null : null),
    [shops, viewedShopId]
  );

  const publishedPosts = useMemo(
    () =>
      posts.filter(
        (p) =>
          p.status === 'published' &&
          shops.some((s) => s.shopId === p.shopId && s.vendorStatus === 'approved')
      ),
    [posts, shops]
  );

  const totalCartQty = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );

  const comparePosts = useMemo(
    () => posts.filter((p) => compareIds.includes(p.postId)),
    [posts, compareIds]
  );

  const unreadMessagesCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const handleOpenComments = (post: FeedPost) => {
    setCommentsPost(post);
    setActiveCommentsPostId(post.postId);
  };

  const handleCloseComments = () => {
    setCommentsPost(null);
    setActiveCommentsPostId(null);
  };

  const handleOpenDetail = (post: FeedPost) => {
    setDetailPost(post);
    setActiveReviewsPostId(post.postId);
  };

  const handleCloseDetail = () => {
    setDetailPost(null);
    setActiveReviewsPostId(null);
  };

  const handleOpenShopProfile = (shopId: string) => {
    setProfileSubTab('posts');
    navigateTo('shop', { shopId });
  };

  const handleWatchPost = (postId: string) => {
    navigateTo('feed', { postId });
  };

  const handleToggleCompare = (postId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(postId)) return prev.filter((id) => id !== postId);
      if (prev.length >= 3) return [...prev.slice(1), postId];
      return [...prev, postId];
    });
  };

  const handleNegotiateWithShop = async (shop: ShopProfile, post?: FeedPost) => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    if (!canSendMessage(session)) {
      showRoleBlockedNotice();
      return;
    }
    const initialText = post
      ? `Bonjour ${shop.name}, je souhaite négocier le tarif de gros pour "${post.title}" (MOQ ${post.moq} pcs).`
      : undefined;
    const convId = await openOrCreateConversation(shop, initialText);
    if (convId) {
      setActiveConversationId(convId);
      handleCloseDetail();
      navigateTo('messages');
    }
  };

  const handleOpenVendorStudio = (tab: 'publish' | 'orders' | 'stories' | 'kyc' = 'publish') => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    if (tab === 'kyc') {
      if (canRequestVendorKyc(session) || isPendingVendorUser(session)) {
        navigateTo('vendor', { vendorTab: 'kyc' });
      } else {
        showRoleBlockedNotice();
      }
      return;
    }
    if (tab === 'orders') {
      if (canViewOwnSalesOrders(session)) {
        navigateTo('vendor', { vendorTab: 'orders' });
      } else {
        showRoleBlockedNotice();
      }
      return;
    }
    if (isApprovedVendorUser(session)) {
      navigateTo('vendor', { vendorTab: tab });
    } else if (canViewOwnSalesOrders(session)) {
      navigateTo('vendor', { vendorTab: 'orders' });
    } else {
      showRoleBlockedNotice();
    }
  };

  const handleOpenOrderSheet = (post: FeedPost) => {
    if (session && !canBuy(session)) {
      showRoleBlockedNotice();
      return;
    }
    setOrderPost(post);
  };

  const handleOpenCartDrawer = () => {
    if (session && !canBuy(session)) {
      showRoleBlockedNotice();
      return;
    }
    setShowCartDrawer(true);
  };

  const handleOpenRfqModal = () => {
    if (session && !canCreateRfq(session) && !canRespondToRfq(session)) {
      showRoleBlockedNotice();
      return;
    }
    setShowRfqModal(true);
  };

  return (
    <div className="h-dvh w-full bg-[var(--dropp-bg)] text-[var(--dropp-text)] flex overflow-hidden">
      <OfflineBanner isOnline={isOnline} justReconnected={justReconnected} t={t} />

      {/* Desktop Left Sidebar (hidden on full-screen Admin Console) */}
      {appRoute !== 'admin' && (
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--dropp-border)] bg-[var(--dropp-bg)] px-4 py-5 justify-between">
        <div className="space-y-6">
          <div className="px-2">
            <DroppLogo />
          </div>

          <nav aria-label="Navigation principale" className="space-y-1.5">
            <button
              type="button"
              onClick={() => navigateTo('feed')}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                activeTab === 'feed'
                  ? 'bg-[var(--dropp-surface)] text-[var(--dropp-accent)]'
                  : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)]'
              }`}
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              <span>{t.nav.feed}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('market')}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                activeTab === 'market'
                  ? 'bg-[var(--dropp-surface)] text-[var(--dropp-accent)]'
                  : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)]'
              }`}
            >
              <Store className="w-5 h-5" aria-hidden="true" />
              <span>{t.nav.market}</span>
            </button>

            {isApprovedVendor && (
              <button
                type="button"
                onClick={() => setShowCreateSheet(true)}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)] transition-colors"
              >
                <Plus className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
                <span>{t.nav.create}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('messages')}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-semibold transition-colors ${
                activeTab === 'messages'
                  ? 'bg-[var(--dropp-surface)] text-[var(--dropp-accent)]'
                  : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)]'
              }`}
            >
              <span className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" aria-hidden="true" />
                <span>{t.nav.messages}</span>
              </span>
              {unreadMessagesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold tabular-nums">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[var(--dropp-surface)] text-[var(--dropp-accent)]'
                  : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)]'
              }`}
            >
              <User className="w-5 h-5" aria-hidden="true" />
              <span>{t.nav.profile}</span>
            </button>

            {canOpenCart && (
              <button
                type="button"
                onClick={handleOpenCartDrawer}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-semibold text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
                  <span>{t.actions.cart}</span>
                </span>
                {totalCartQty > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold tabular-nums">
                    {totalCartQty}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        <div className="space-y-3 border-t border-[var(--dropp-border)] pt-4">
          <button
            type="button"
            onClick={toggleManualDataSaver}
            className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-between text-xs font-medium text-[var(--dropp-text)] hover:border-[var(--dropp-border-strong)]"
          >
            <span className="inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F5A524]" aria-hidden="true" />
              <span>480p Éco</span>
            </span>
            <span className={manualDataSaver ? 'text-[var(--dropp-accent)] font-bold' : 'text-[var(--dropp-muted)]'}>
              {manualDataSaver ? 'ON' : 'OFF'}
            </span>
          </button>

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-xs font-semibold text-[var(--dropp-text)] flex items-center justify-center gap-2 hover:border-[var(--dropp-border-strong)]"
            >
              <Download className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
              <span>{t.actions.installApp}</span>
            </button>
          )}

          {!session && firebaseUid ? (
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className="w-full p-2.5 rounded-xl bg-[#E5484D]/12 border border-[#E5484D]/40 text-left"
            >
              <div className="text-xs font-semibold text-[#FCA5A5] truncate">
                {profileLoading ? '...' : t.errors.profileLoadTitle}
              </div>
              <div className="text-[11px] text-[var(--dropp-muted)] truncate">
                {t.errors.retry}
              </div>
            </button>
          ) : !session ? (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold transition-colors"
            >
              {t.auth.loginSubmit}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className="w-full p-2.5 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-left hover:border-[var(--dropp-border-strong)]"
            >
              <div className="text-xs font-semibold text-[var(--dropp-text)] truncate">
                {session.displayName}
              </div>
              <div className="text-[11px] text-[var(--dropp-muted)] truncate">{session.email}</div>
            </button>
          )}
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative h-full overflow-hidden">
        {(actionError || uiNotice || (firebaseUid && profileError && !session)) && (
          <div className="absolute top-14 lg:top-4 right-4 left-4 lg:left-auto lg:max-w-md z-40 space-y-2">
            {firebaseUid && profileError && !session && (
              <div className="p-3 rounded-2xl bg-[var(--dropp-elevated)]/95 border border-[#E5484D]/60 shadow-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-[#FCA5A5] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--dropp-text)]">{t.errors.profileLoadTitle}</div>
                    <div className="text-[11px] text-[var(--dropp-muted)] line-clamp-2">{profileError}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => retryProfileLoad()}
                    className="min-h-[34px] px-2.5 rounded-lg bg-[#FF5A1F] text-white font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    <span>{t.errors.retry}</span>
                  </button>
                </div>
              </div>
            )}

            {(actionError || uiNotice) && (
              <div className="p-3 rounded-2xl bg-[var(--dropp-elevated)]/95 border border-[#FF5A1F]/60 shadow-xl flex items-center justify-between gap-3 text-xs text-[var(--dropp-text)]">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{actionError || uiNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearActionError();
                    setUiNotice(null);
                  }}
                  aria-label={t.actions.close}
                  className="p-1 text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {platformSettings.announcement?.active &&
          platformSettings.announcement.message &&
          appRoute !== 'admin' &&
          dismissedAnnouncementKey !==
            `${platformSettings.announcement.title}:${platformSettings.announcement.message}` && (
            <div className="absolute top-2 left-3 right-3 lg:left-6 lg:right-6 z-30 pointer-events-none flex justify-center">
              <div className="pointer-events-auto max-w-2xl w-full px-3.5 py-2.5 rounded-2xl bg-[var(--dropp-elevated)]/95 border border-[#FF5A1F]/50 shadow-xl flex items-center justify-between gap-3 text-xs backdrop-blur-md">
                <div className="flex items-start gap-2 min-w-0">
                  <Megaphone className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    {platformSettings.announcement.title && (
                      <div className="font-bold text-[var(--dropp-text)]">
                        {platformSettings.announcement.title}
                      </div>
                    )}
                    <div className="text-[var(--dropp-muted)]">
                      {platformSettings.announcement.message}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedAnnouncementKey(
                      `${platformSettings.announcement?.title}:${platformSettings.announcement?.message}`
                    )
                  }
                  aria-label={t.actions.close}
                  className="p-1 text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

        {appRoute === 'admin' && (
          !authReady || profileLoading ? (
            <ScreenSkeleton />
          ) : canAccessAdmin(session) ? (
            <Suspense fallback={<ScreenSkeleton />}>
              <AdminDashboardScreen
                t={t}
                adminUsers={adminUsers}
                withdrawalRequests={withdrawalRequests}
                auditLogs={auditLogs}
                platformSettings={platformSettings}
                adminLoading={adminLoading}
                kycApplications={kycApplications}
                disputes={disputes}
                orders={orders}
                shops={shops}
                posts={posts}
                onRefresh={refreshAdminOverview}
                onBack={() => navigateTo('profile')}
                onReviewKyc={reviewKycApplication}
                onResolveDispute={resolveDispute}
                onToggleCertifyShop={toggleShopCertification}
                onSuspendShop={suspendShop}
                onModeratePost={moderatePost}
                onManageUser={manageAdminUser}
                onReviewWithdrawal={reviewWithdrawalRequest}
                onUpdateSettings={updatePlatformSettings}
              />
            </Suspense>
          ) : (
            <div className="h-full w-full flex items-center justify-center p-6 bg-[var(--dropp-bg)]">
              <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E5484D]/15 text-[#FCA5A5] mx-auto flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" aria-hidden="true" />
                </div>
                <h1 className="text-lg font-extrabold text-[var(--dropp-text)]">
                  {t.admin.accessDeniedTitle}
                </h1>
                <p className="text-sm text-[var(--dropp-muted)]">{t.admin.accessDeniedDesc}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {!session && !firebaseUid && (
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(true)}
                      className="min-h-[44px] px-4 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold"
                    >
                      {t.auth.loginSubmit}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigateTo('feed')}
                    className="min-h-[44px] px-4 rounded-xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] text-sm font-semibold text-[var(--dropp-text)]"
                  >
                    {t.admin.backHomeBtn}
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {appRoute === 'vendor' && (
          !authReady || profileLoading ? (
            <ScreenSkeleton />
          ) : !session ? (
            <div className="h-full w-full flex items-center justify-center p-6 bg-[var(--dropp-bg)]">
              <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-center space-y-4">
                <h1 className="text-lg font-extrabold text-[var(--dropp-text)]">
                  {t.vendor.studioTitle}
                </h1>
                <p className="text-sm text-[var(--dropp-muted)]">{t.profile.visitorSubtitle}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold"
                  >
                    {t.profile.loginCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('feed')}
                    className="min-h-[44px] px-4 rounded-xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] text-sm font-semibold text-[var(--dropp-text)]"
                  >
                    {t.admin.backHomeBtn}
                  </button>
                </div>
              </div>
            </div>
          ) : isAdminUser(session) ? (
            <div className="h-full w-full flex items-center justify-center p-6 bg-[var(--dropp-bg)]">
              <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-center space-y-4">
                <h1 className="text-lg font-extrabold text-[var(--dropp-text)]">
                  {t.vendor.studioTitle}
                </h1>
                <p className="text-sm text-[var(--dropp-muted)]">{t.errors.adminBlocked}</p>
                <button
                  type="button"
                  onClick={() => navigateTo('admin')}
                  className="min-h-[44px] px-4 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold"
                >
                  {t.profile.openAdminBtn}
                </button>
              </div>
            </div>
          ) : (
            <Suspense fallback={<ScreenSkeleton />}>
              <VendorStudioScreen
                t={t}
                session={session}
                shops={shops}
                posts={posts}
                orders={orders}
                kycApplications={kycApplications}
                initialTab={vendorStudioTab}
                dataSaver={dataSaver}
                onSubmitKyc={submitVendorKyc}
                onPublishPost={publishVendorPost}
                onPublishStory={publishVendorStory}
                onUpdateOrderStatus={updateOrderStatusByVendor}
                onWatchPost={handleWatchPost}
                onOpenRfq={handleOpenRfqModal}
                onBack={() => navigateTo('profile')}
              />
            </Suspense>
          )
        )}

        {appRoute === 'feed' && (
          <FeedScreen
            t={t}
            lang={lang}
            session={session}
            posts={publishedPosts}
            shops={shops}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            onRetryCatalog={retryCatalogLoad}
            likedIds={likedIds}
            bookmarkedIds={bookmarkedIds}
            followedShopIds={followedShopIds}
            cartCount={totalCartQty}
            dataSaver={dataSaver}
            isSlowNetwork={isSlowNetwork}
            initialPostId={selectedPostId}
            isAuthenticated={Boolean(session)}
            onRequireAuth={() => setShowAuthModal(true)}
            onRoleBlocked={showRoleBlockedNotice}
            onToggleLike={toggleLike}
            onToggleBookmark={toggleBookmark}
            onToggleFollow={toggleFollowShop}
            onOpenComments={handleOpenComments}
            onOpenOrder={handleOpenOrderSheet}
            onOpenShare={(post) => setSharePost(post)}
            onOpenShopProfile={handleOpenShopProfile}
            onOpenStory={(shop) => setStoryShop(shop)}
            onOpenSearch={() => navigateTo('market')}
            onPostVisible={recordViewedPost}
          />
        )}

        {appRoute === 'market' && (
          <Suspense fallback={<ScreenSkeleton />}>
            <MarketScreen
              t={t}
              session={session}
              posts={publishedPosts}
              platformSettings={platformSettings}
              catalogLoading={catalogLoading}
              catalogError={catalogError}
              onRetryCatalog={retryCatalogLoad}
              likedIds={likedIds}
              recentlyViewedIds={recentlyViewedIds}
              compareIds={compareIds}
              cartCount={totalCartQty}
              dataSaver={dataSaver}
              onWatchPost={handleWatchPost}
              onOpenProductDetail={handleOpenDetail}
              onToggleCompare={handleToggleCompare}
              onOpenComparator={() => setShowComparator(true)}
              onOpenCart={handleOpenCartDrawer}
              onOpenRfq={handleOpenRfqModal}
            />
          </Suspense>
        )}

        {appRoute === 'messages' && (
          <Suspense fallback={<ScreenSkeleton />}>
            <MessagesScreen
              t={t}
              session={session}
              conversations={conversations}
              rfqs={rfqs}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onSendMessage={sendMessage}
              onRespondOffer={respondToDealOffer}
              onOpenCart={handleOpenCartDrawer}
              onOpenRfqModal={handleOpenRfqModal}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          </Suspense>
        )}

        {(appRoute === 'profile' || appRoute === 'shop') && (
          <Suspense fallback={<ScreenSkeleton />}>
            <ProfileScreen
              t={t}
              lang={lang}
              onChangeLang={setLang}
              themePref={themePref}
              onChangeTheme={setThemePref}
              session={session}
              firebaseUid={firebaseUid}
              profileLoading={profileLoading}
              profileError={profileError}
              onRetryProfile={retryProfileLoad}
              isOnline={isOnline}
              viewedShop={viewedShop}
              shops={shops}
              posts={publishedPosts}
              likedIds={likedIds}
              bookmarkedIds={bookmarkedIds}
              followedShopIds={followedShopIds}
              orders={orders}
              transactions={transactions}
              withdrawalRequests={withdrawalRequests}
              notifications={notifications}
              notifPrefs={notifPrefs}
              appRating={appRating}
              subTab={profileSubTab}
              onSubTabChange={setProfileSubTab}
              dataSaver={dataSaver}
              manualDataSaver={manualDataSaver}
              onToggleDataSaver={toggleManualDataSaver}
              pwaInstallable={isInstallable}
              pwaInstalled={isInstalled}
              pwaIsIOS={isIOS}
              onInstallPwa={install}
              onOpenAuth={() => setShowAuthModal(true)}
              onSignOut={signOutUser}
              onWatchPost={handleWatchPost}
              onOpenProductDetail={handleOpenDetail}
              onClearViewedShop={() => navigateTo('profile')}
              onMessageShop={(shop) => handleNegotiateWithShop(shop)}
              onOpenVendorStudio={handleOpenVendorStudio}
              onOpenAdminConsole={() => {
                if (canAccessAdmin(session)) navigateTo('admin');
              }}
              onCancelOrder={cancelOrder}
              onConfirmDelivery={confirmOrderDelivery}
              onOpenDispute={openOrderDispute}
              onRateOrder={rateOrder}
              onReorder={reorderItems}
              onOpenCart={handleOpenCartDrawer}
              onDeposit={depositToWallet}
              onWithdraw={withdrawFromWallet}
              onToggleNotifPref={toggleNotifPref}
              onMarkAllNotifsRead={markAllNotifsRead}
              onApplyReferralCode={applyReferralCode}
              onSubmitAppRating={submitAppRating}
            />
          </Suspense>
        )}
      </main>

      {/* Mobile Navigation Bar (hidden on full-screen Admin / Vendor workspaces) */}
      {appRoute !== 'admin' && appRoute !== 'vendor' && (
      <nav
        aria-label="Navigation mobile"
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--dropp-elevated)]/95 backdrop-blur-md border-t border-[var(--dropp-border)] grid ${
          isApprovedVendor ? 'grid-cols-5' : 'grid-cols-4'
        } items-center px-1`}
      >
        <button
          type="button"
          onClick={() => navigateTo('feed')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'feed' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.feed}</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('market')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'market' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <Compass className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.market}</span>
        </button>

        {isApprovedVendor && (
          <button
            type="button"
            onClick={() => setShowCreateSheet(true)}
            aria-label={t.nav.create}
            className="min-h-[44px] flex items-center justify-center"
          >
            <span
              style={{ background: 'var(--dropp-gradient)' }}
              className="w-11 h-8 rounded-xl text-white flex items-center justify-center shadow-md shadow-[#FF5A1F]/25"
            >
              <Plus className="w-5 h-5 stroke-[2.6]" aria-hidden="true" />
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigateTo('messages')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 relative ${
            activeTab === 'messages' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <MessageSquare className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.messages}</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-[#FF5A1F]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => navigateTo('profile')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'profile' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <User className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.profile}</span>
        </button>
      </nav>
      )}

      {/* Bottom Sheets & Modals */}
      {commentsPost && (
        <CommentsSheet
          t={t}
          post={commentsPost}
          comments={commentsByPost[commentsPost.postId] || []}
          isAuthenticated={Boolean(session)}
          canComment={canLikeAndComment(session)}
          blockedHint={isAdminUser(session) ? t.errors.adminBlocked : isSuspendedVendor(session) ? t.errors.suspendedBlocked : undefined}
          onRequireAuth={() => setShowAuthModal(true)}
          onAddComment={addComment}
          onRetryComment={retryFailedComment}
          onClose={handleCloseComments}
        />
      )}

      {orderPost && (
        <QuickOrderSheet
          t={t}
          post={orderPost}
          cartCount={totalCartQty}
          canOrder={!session || canBuy(session)}
          blockedHint={isAdminUser(session) ? t.errors.adminBlocked : isSuspendedVendor(session) ? t.errors.suspendedBlocked : undefined}
          onAddToCart={addToCartPreview}
          onOpenCart={handleOpenCartDrawer}
          onClose={() => setOrderPost(null)}
        />
      )}

      {sharePost && (
        <ShareSheet
          t={t}
          post={sharePost}
          onClose={() => setSharePost(null)}
        />
      )}

      {storyShop && (
        <StoryPreviewSheet
          t={t}
          shop={storyShop}
          canReply={!session || canSendMessage(session)}
          onReplyToShop={(shop) => handleNegotiateWithShop(shop)}
          onClose={() => setStoryShop(null)}
        />
      )}

      {showCreateSheet && (
        <CreateActionSheet
          t={t}
          session={session}
          onRequireAuth={() => setShowAuthModal(true)}
          onOpenVendorStudio={handleOpenVendorStudio}
          onOpenRfq={handleOpenRfqModal}
          onClose={() => setShowCreateSheet(false)}
        />
      )}

      {detailPost && (
        <Suspense fallback={null}>
          <ProductDetailSheet
            t={t}
            session={session}
            post={detailPost}
            shop={shops.find((s) => s.shopId === detailPost.shopId)}
            reviews={reviewsByPost[detailPost.postId] || []}
            dataSaver={dataSaver}
            isAuthenticated={Boolean(session)}
            onRequireAuth={() => setShowAuthModal(true)}
            onAddToCart={addToCartPreview}
            onBuyNow={(item) => {
              if (session && !canBuy(session)) {
                showRoleBlockedNotice();
                return;
              }
              addToCartPreview(item);
              handleCloseDetail();
              setShowCartDrawer(true);
            }}
            onAddReview={addProductReview}
            onNegotiate={(shop, post) => handleNegotiateWithShop(shop, post)}
            onOpenShop={(shopId) => {
              handleCloseDetail();
              handleOpenShopProfile(shopId);
            }}
            onWatchVideo={(postId) => {
              handleCloseDetail();
              handleWatchPost(postId);
            }}
            onClose={handleCloseDetail}
          />
        </Suspense>
      )}

      {showComparator && (
        <Suspense fallback={null}>
          <ProductComparatorModal
            t={t}
            posts={comparePosts}
            onRemovePost={(id) =>
              setCompareIds((prev) => prev.filter((item) => item !== id))
            }
            onSelectPost={(post) => {
              setShowComparator(false);
              handleOpenDetail(post);
            }}
            onClose={() => setShowComparator(false)}
          />
        </Suspense>
      )}

      {showCartDrawer && canOpenCart && (
        <Suspense fallback={null}>
          <CartCheckoutDrawer
            t={t}
            cartItems={cartItems}
            shops={shops}
            session={session}
            isOnline={isOnline}
            onRequireAuth={() => setShowAuthModal(true)}
            onUpdateQty={updateCartItemQty}
            onCheckout={checkoutCart}
            onViewOrders={() => {
              setShowCartDrawer(false);
              setProfileSubTab('orders');
              navigateTo('profile');
            }}
            onClose={() => setShowCartDrawer(false)}
          />
        </Suspense>
      )}

      {showRfqModal && (
        <Suspense fallback={null}>
          <RfqModal
            t={t}
            session={session}
            rfqs={rfqs}
            onRequireAuth={() => setShowAuthModal(true)}
            onCreateRfq={createRfq}
            onSubmitOffer={submitRfqOffer}
            onAcceptOffer={acceptRfqOffer}
            onOpenCart={() => {
              setShowRfqModal(false);
              handleOpenCartDrawer();
            }}
            onClose={() => setShowRfqModal(false)}
          />
        </Suspense>
      )}

      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal t={t} onClose={() => setShowAuthModal(false)} />
        </Suspense>
      )}
    </div>
  );
}
