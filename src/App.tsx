import React, { Suspense, lazy, useMemo, useState } from 'react';
import {
  Compass,
  Download,
  Home,
  MessageSquare,
  Plus,
  ShoppingBag,
  Store,
  User,
  Zap,
} from 'lucide-react';
import { TRANSLATIONS } from './i18n/translations';
import { useNetworkProfile } from './hooks/useNetworkProfile';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useDroppState } from './hooks/useDroppState';
import { useTheme } from './hooks/useTheme';
import type { FeedPost, NavTab, ShopProfile } from './types/dropp';
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
const VendorStudioModal = lazy(() =>
  import('./components/VendorStudioModal').then((m) => ({ default: m.VendorStudioModal }))
);
const AdminDashboardModal = lazy(() =>
  import('./components/AdminDashboardModal').then((m) => ({
    default: m.AdminDashboardModal,
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
    likedIds,
    bookmarkedIds,
    followedShopIds,
    commentsByPost,
    reviewsByPost,
    cartItems,
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
    toggleNotifPref,
    markAllNotifsRead,
    applyReferralCode,
    submitAppRating,
    signOutUser,
  } = useDroppState(isOnline);

  const t = TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<NavTab>('feed');
  const [profileSubTab, setProfileSubTab] = useState<
    'posts' | 'products' | 'info' | 'orders' | 'wallet' | 'notifs'
  >('posts');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('post');
    } catch {
      return null;
    }
  });

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
  const [vendorStudioTab, setVendorStudioTab] = useState<
    'publish' | 'orders' | 'stories' | 'kyc' | null
  >(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [viewedShopId, setViewedShopId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const viewedShop = useMemo(
    () => (viewedShopId ? shops.find((s) => s.shopId === viewedShopId) ?? null : null),
    [shops, viewedShopId]
  );

  const publishedPosts = useMemo(
    () => posts.filter((p) => p.status === 'published'),
    [posts]
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

  const handleOpenShopProfile = (shopId: string) => {
    setViewedShopId(shopId);
    setProfileSubTab('posts');
    setActiveTab('profile');
  };

  const handleWatchPost = (postId: string) => {
    setSelectedPostId(postId);
    setViewedShopId(null);
    setActiveTab('feed');
  };

  const handleToggleCompare = (postId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(postId)) return prev.filter((id) => id !== postId);
      if (prev.length >= 4) return [...prev.slice(1), postId];
      return [...prev, postId];
    });
  };

  const handleNegotiateWithShop = (shop: ShopProfile, post?: FeedPost) => {
    const initialText = post
      ? `Bonjour ${shop.name}, je souhaite négocier le tarif de gros pour "${post.title}" (MOQ ${post.moq} pcs).`
      : undefined;
    const convId = openOrCreateConversation(shop, initialText);
    setActiveConversationId(convId);
    setDetailPost(null);
    setActiveTab('messages');
  };

  return (
    <div className="h-dvh w-full bg-[var(--dropp-bg)] text-[var(--dropp-text)] flex overflow-hidden">
      <OfflineBanner isOnline={isOnline} justReconnected={justReconnected} t={t} />

      {/* Desktop Left Sidebar (TikTok Web Disposition) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--dropp-border)] bg-[var(--dropp-bg)] px-4 py-5 justify-between">
        <div className="space-y-6">
          <div className="px-2">
            <DroppLogo />
          </div>

          <nav aria-label="Navigation principale" className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setViewedShopId(null);
                setActiveTab('feed');
              }}
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
              onClick={() => setActiveTab('market')}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                activeTab === 'market'
                  ? 'bg-[var(--dropp-surface)] text-[var(--dropp-accent)]'
                  : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)]'
              }`}
            >
              <Store className="w-5 h-5" aria-hidden="true" />
              <span>{t.nav.market}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateSheet(true)}
              className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)] transition-colors"
            >
              <Plus className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
              <span>{t.nav.create}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('messages')}
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
              onClick={() => {
                setViewedShopId(null);
                setActiveTab('profile');
              }}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[var(--dropp-surface)] text-[var(--dropp-accent)]'
                  : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface)] hover:text-[var(--dropp-text)]'
              }`}
            >
              <User className="w-5 h-5" aria-hidden="true" />
              <span>{t.nav.profile}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
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

          {!session ? (
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
              onClick={() => {
                setViewedShopId(null);
                setActiveTab('profile');
              }}
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

      {/* Main Content Area */}
      <main className="flex-1 relative h-full overflow-hidden">
        {activeTab === 'feed' && (
          <FeedScreen
            t={t}
            lang={lang}
            posts={publishedPosts}
            shops={shops}
            likedIds={likedIds}
            bookmarkedIds={bookmarkedIds}
            followedShopIds={followedShopIds}
            cartCount={totalCartQty}
            dataSaver={dataSaver}
            isSlowNetwork={isSlowNetwork}
            initialPostId={selectedPostId}
            isAuthenticated={Boolean(session)}
            onRequireAuth={() => setShowAuthModal(true)}
            onToggleLike={toggleLike}
            onToggleBookmark={toggleBookmark}
            onToggleFollow={toggleFollowShop}
            onOpenComments={(post) => setCommentsPost(post)}
            onOpenOrder={(post) => setOrderPost(post)}
            onOpenShare={(post) => setSharePost(post)}
            onOpenShopProfile={handleOpenShopProfile}
            onOpenStory={(shop) => setStoryShop(shop)}
            onOpenSearch={() => setActiveTab('market')}
            onPostVisible={recordViewedPost}
          />
        )}

        {activeTab === 'market' && (
          <Suspense fallback={<ScreenSkeleton />}>
            <MarketScreen
              t={t}
              posts={publishedPosts}
              likedIds={likedIds}
              recentlyViewedIds={recentlyViewedIds}
              compareIds={compareIds}
              cartCount={totalCartQty}
              dataSaver={dataSaver}
              onWatchPost={handleWatchPost}
              onOpenProductDetail={(post) => setDetailPost(post)}
              onToggleCompare={handleToggleCompare}
              onOpenComparator={() => setShowComparator(true)}
              onOpenCart={() => setShowCartDrawer(true)}
              onOpenRfq={() => setShowRfqModal(true)}
            />
          </Suspense>
        )}

        {activeTab === 'messages' && (
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
              onOpenCart={() => setShowCartDrawer(true)}
              onOpenRfqModal={() => setShowRfqModal(true)}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          </Suspense>
        )}

        {activeTab === 'profile' && (
          <Suspense fallback={<ScreenSkeleton />}>
            <ProfileScreen
              t={t}
              lang={lang}
              onChangeLang={setLang}
              themePref={themePref}
              onChangeTheme={setThemePref}
              session={session}
              isOnline={isOnline}
              viewedShop={viewedShop}
              posts={publishedPosts}
              bookmarkedIds={bookmarkedIds}
              followedShopIds={followedShopIds}
              orders={orders}
              transactions={transactions}
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
              onOpenProductDetail={(post) => setDetailPost(post)}
              onClearViewedShop={() => setViewedShopId(null)}
              onMessageShop={(shop) => handleNegotiateWithShop(shop)}
              onOpenVendorStudio={(tab = 'publish') => setVendorStudioTab(tab)}
              onOpenAdminConsole={() => setShowAdminModal(true)}
              onCancelOrder={cancelOrder}
              onConfirmDelivery={confirmOrderDelivery}
              onOpenDispute={openOrderDispute}
              onRateOrder={rateOrder}
              onReorder={reorderItems}
              onOpenCart={() => setShowCartDrawer(true)}
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

      {/* Mobile Bottom 5-Item Navigation Bar (TikTok DNA, <= 64px height) */}
      <nav
        aria-label="Navigation mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--dropp-elevated)]/95 backdrop-blur-md border-t border-[var(--dropp-border)] grid grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => {
            setViewedShopId(null);
            setActiveTab('feed');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'feed' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.feed}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('market')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'market' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <Compass className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.market}</span>
        </button>

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

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
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
          onClick={() => {
            setViewedShopId(null);
            setActiveTab('profile');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'profile' ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-muted)]'
          }`}
        >
          <User className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">{t.nav.profile}</span>
        </button>
      </nav>

      {/* Bottom Sheets & Modals */}
      {commentsPost && (
        <CommentsSheet
          t={t}
          post={commentsPost}
          comments={commentsByPost[commentsPost.postId] || []}
          isAuthenticated={Boolean(session)}
          onRequireAuth={() => setShowAuthModal(true)}
          onAddComment={addComment}
          onRetryComment={retryFailedComment}
          onClose={() => setCommentsPost(null)}
        />
      )}

      {orderPost && (
        <QuickOrderSheet
          t={t}
          post={orderPost}
          cartCount={totalCartQty}
          onAddToCart={addToCartPreview}
          onOpenCart={() => setShowCartDrawer(true)}
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
          onReplyToShop={(shop) => handleNegotiateWithShop(shop)}
          onClose={() => setStoryShop(null)}
        />
      )}

      {showCreateSheet && (
        <CreateActionSheet
          t={t}
          session={session}
          onRequireAuth={() => setShowAuthModal(true)}
          onOpenVendorStudio={(tab = 'publish') => setVendorStudioTab(tab)}
          onOpenRfq={() => setShowRfqModal(true)}
          onClose={() => setShowCreateSheet(false)}
        />
      )}

      {detailPost && (
        <Suspense fallback={null}>
          <ProductDetailSheet
            t={t}
            post={detailPost}
            shop={shops.find((s) => s.shopId === detailPost.shopId)}
            reviews={reviewsByPost[detailPost.postId] || []}
            dataSaver={dataSaver}
            isAuthenticated={Boolean(session)}
            onRequireAuth={() => setShowAuthModal(true)}
            onAddToCart={addToCartPreview}
            onBuyNow={(item) => {
              addToCartPreview(item);
              setDetailPost(null);
              setShowCartDrawer(true);
            }}
            onAddReview={addProductReview}
            onNegotiate={(shop, post) => handleNegotiateWithShop(shop, post)}
            onOpenShop={(shopId) => {
              setDetailPost(null);
              handleOpenShopProfile(shopId);
            }}
            onWatchVideo={(postId) => {
              setDetailPost(null);
              handleWatchPost(postId);
            }}
            onClose={() => setDetailPost(null)}
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
              setDetailPost(post);
            }}
            onClose={() => setShowComparator(false)}
          />
        </Suspense>
      )}

      {showCartDrawer && (
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
              setViewedShopId(null);
              setProfileSubTab('orders');
              setActiveTab('profile');
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
              setShowCartDrawer(true);
            }}
            onClose={() => setShowRfqModal(false)}
          />
        </Suspense>
      )}

      {vendorStudioTab && (
        <Suspense fallback={null}>
          <VendorStudioModal
            t={t}
            session={session}
            orders={orders}
            kycApplications={kycApplications}
            initialTab={vendorStudioTab}
            onSubmitKyc={submitVendorKyc}
            onPublishPost={publishVendorPost}
            onPublishStory={publishVendorStory}
            onUpdateOrderStatus={updateOrderStatusByVendor}
            onClose={() => setVendorStudioTab(null)}
          />
        </Suspense>
      )}

      {showAdminModal && (
        <Suspense fallback={null}>
          <AdminDashboardModal
            t={t}
            kycApplications={kycApplications}
            disputes={disputes}
            orders={orders}
            shops={shops}
            posts={posts}
            onReviewKyc={reviewKycApplication}
            onResolveDispute={resolveDispute}
            onToggleCertifyShop={toggleShopCertification}
            onSuspendShop={suspendShop}
            onModeratePost={moderatePost}
            onClose={() => setShowAdminModal(false)}
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
