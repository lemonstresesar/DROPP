import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  Download,
  Globe,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Play,
  ShieldAlert,
  ShieldCheck,
  Store,
  Sun,
  Wallet,
  Zap,
} from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';
import type { DroppDictionary } from '../i18n/translations';
import type {
  AppNotification,
  FeedPost,
  LanguageCode,
  NotificationPrefs,
  OrderRecord,
  ShopProfile,
  UserSession,
  WalletTransaction,
} from '../types/dropp';
import { formatCompactCount, formatFcfa } from '../utils/formatters';
import { buildCloudinaryMediaUrl } from '../utils/cloudinary';
import { WalletAndOrdersPanel } from './WalletAndOrdersPanel';

interface ProfileScreenProps {
  t: DroppDictionary;
  lang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  themePref: ThemePreference;
  onChangeTheme: (pref: ThemePreference) => void;
  session: UserSession | null;
  isOnline: boolean;
  viewedShop: ShopProfile | null;
  posts: FeedPost[];
  bookmarkedIds: string[];
  followedShopIds: string[];
  orders: OrderRecord[];
  transactions: WalletTransaction[];
  notifications: AppNotification[];
  notifPrefs: NotificationPrefs;
  appRating: number;
  subTab?: 'posts' | 'products' | 'info' | 'orders' | 'wallet' | 'notifs';
  onSubTabChange?: (tab: 'posts' | 'products' | 'info' | 'orders' | 'wallet' | 'notifs') => void;
  dataSaver: boolean;
  manualDataSaver: boolean;
  onToggleDataSaver: () => void;
  pwaInstallable: boolean;
  pwaInstalled: boolean;
  pwaIsIOS: boolean;
  onInstallPwa: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onWatchPost: (postId: string) => void;
  onOpenProductDetail: (post: FeedPost) => void;
  onClearViewedShop: () => void;
  onMessageShop: (shop: ShopProfile) => void;
  onOpenVendorStudio: (tab?: 'publish' | 'orders' | 'stories' | 'kyc') => void;
  onOpenAdminConsole: () => void;
  onCancelOrder: (orderId: string) => void;
  onConfirmDelivery: (orderId: string) => void;
  onOpenDispute: (orderId: string, reason: string) => void;
  onRateOrder: (orderId: string) => void;
  onReorder: (order: OrderRecord) => void;
  onOpenCart: () => void;
  onDeposit: (amountFcfa: number, methodLabel: string) => boolean;
  onWithdraw: (amountFcfa: number, methodLabel: string) => boolean;
  onToggleNotifPref: (key: keyof NotificationPrefs) => void;
  onMarkAllNotifsRead: () => void;
  onApplyReferralCode: (code: string) => boolean;
  onSubmitAppRating: (stars: number) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  t,
  lang,
  onChangeLang,
  themePref,
  onChangeTheme,
  session,
  isOnline,
  viewedShop,
  posts,
  bookmarkedIds,
  followedShopIds,
  orders,
  transactions,
  notifications,
  notifPrefs,
  appRating,
  subTab,
  onSubTabChange,
  dataSaver,
  manualDataSaver,
  onToggleDataSaver,
  pwaInstallable,
  pwaInstalled,
  pwaIsIOS,
  onInstallPwa,
  onOpenAuth,
  onSignOut,
  onWatchPost,
  onOpenProductDetail,
  onClearViewedShop,
  onMessageShop,
  onOpenVendorStudio,
  onOpenAdminConsole,
  onCancelOrder,
  onConfirmDelivery,
  onOpenDispute,
  onRateOrder,
  onReorder,
  onOpenCart,
  onDeposit,
  onWithdraw,
  onToggleNotifPref,
  onMarkAllNotifsRead,
  onApplyReferralCode,
  onSubmitAppRating,
}) => {
  const [internalTab, setInternalTab] = useState<
    'posts' | 'products' | 'info' | 'orders' | 'wallet' | 'notifs'
  >('posts');
  const profileTab = subTab ?? internalTab;
  const setProfileTab = onSubTabChange ?? setInternalTab;
  const [showIosGuide, setShowIosGuide] = useState(false);

  const activeShop = viewedShop;

  const shopPosts = useMemo(() => {
    if (activeShop) return posts.filter((p) => p.shopId === activeShop.shopId);
    if (session?.shopId) return posts.filter((p) => p.shopId === session.shopId);
    return posts.filter((p) => bookmarkedIds.includes(p.postId));
  }, [activeShop, session, posts, bookmarkedIds]);

  const roleLabel =
    session?.role === 'admin'
      ? t.profile.roleAdmin
      : session?.role === 'vendor'
      ? t.profile.roleVendor
      : t.profile.roleClient;

  const availableTabs = useMemo(() => {
    if (activeShop) {
      return [
        { id: 'posts' as const, label: t.profile.tabPosts },
        { id: 'products' as const, label: t.profile.tabProducts },
        { id: 'info' as const, label: t.profile.tabInfo },
      ];
    }
    if (session) {
      return [
        { id: 'posts' as const, label: t.profile.tabPosts },
        { id: 'orders' as const, label: t.profile.tabOrders },
        { id: 'wallet' as const, label: t.profile.tabWallet },
        { id: 'notifs' as const, label: t.profile.tabNotifs },
      ];
    }
    return [
      { id: 'posts' as const, label: t.profile.tabPosts },
      { id: 'products' as const, label: t.profile.tabProducts },
      { id: 'info' as const, label: t.profile.tabInfo },
    ];
  }, [activeShop, session, t]);

  const effectiveTab = availableTabs.some((item) => item.id === profileTab)
    ? profileTab
    : 'posts';

  const isApprovedVendor =
    session?.role === 'admin' ||
    (session?.role === 'vendor' && session.vendorStatus === 'approved');

  return (
    <div className="h-full overflow-y-auto bg-[var(--dropp-bg)] pb-28 lg:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {activeShop && (
          <button
            type="button"
            onClick={onClearViewedShop}
            className="min-h-[44px] text-xs font-semibold text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] inline-flex items-center gap-1.5"
          >
            <span>← {t.profile.backToMyProfile}</span>
          </button>
        )}

        {/* Profile Card / Header */}
        {activeShop ? (
          <section className="p-6 rounded-3xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex flex-col items-center text-center space-y-4 shadow-xl">
            <img
              src={buildCloudinaryMediaUrl(activeShop.avatarUrl, {
                dataSaver,
                isThumbnail: true,
              })}
              alt={activeShop.name}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full object-cover border-4 border-black shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-xl font-bold text-[var(--dropp-text)]">{activeShop.name}</h1>
                {activeShop.isCertified && (
                  <BadgeCheck className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
                )}
              </div>
              <p className="text-xs text-[var(--dropp-muted)]">
                {activeShop.handle} · {activeShop.city} ({activeShop.neighborhood})
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 w-full py-3 border-y border-[var(--dropp-border)]">
              <div>
                <div className="text-base font-bold text-[var(--dropp-text)] tabular-nums">
                  {formatCompactCount(activeShop.followingCount, lang)}
                </div>
                <div className="text-[11px] text-[var(--dropp-muted)]">{t.profile.followingCount}</div>
              </div>
              <div>
                <div className="text-base font-bold text-[var(--dropp-text)] tabular-nums">
                  {formatCompactCount(activeShop.followersCount, lang)}
                </div>
                <div className="text-[11px] text-[var(--dropp-muted)]">{t.profile.followersCount}</div>
              </div>
              <div>
                <div className="text-base font-bold text-[var(--dropp-text)] tabular-nums">
                  {formatCompactCount(activeShop.likesCount, lang)}
                </div>
                <div className="text-[11px] text-[var(--dropp-muted)]">{t.profile.likesCount}</div>
              </div>
            </div>

            <p className="text-xs text-[var(--dropp-muted)] leading-relaxed">{activeShop.bio}</p>

            <button
              type="button"
              onClick={() => onMessageShop(activeShop)}
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-md shadow-[#FF5A1F]/25"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>{t.product.negotiateBtn}</span>
            </button>
          </section>
        ) : session ? (
          <section className="p-6 rounded-3xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border-strong)] flex items-center justify-center text-2xl font-bold text-[var(--dropp-text)] shrink-0 shadow-inner">
                {session.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <h1 className="text-xl font-bold text-[var(--dropp-text)] truncate">{session.displayName}</h1>
                  {session.isCertified && (
                    <BadgeCheck className="w-5 h-5 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
                  )}
                </div>
                <p className="text-xs text-[var(--dropp-muted)] mt-1">
                  {session.email} · <span className="font-semibold text-[var(--dropp-text)]">{roleLabel}</span> · {session.city}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                aria-label={t.auth.signOut}
                className="min-h-[40px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] hover:border-[var(--dropp-border-strong)] border border-[var(--dropp-border)] text-xs font-medium text-[var(--dropp-text)] inline-flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.auth.signOut}</span>
              </button>
            </div>

            {session.role === 'vendor' && session.vendorStatus === 'pending' && (
              <div className="p-3.5 rounded-xl bg-[#F5A524]/15 border border-[#F5A524]/40 flex items-start gap-2.5 text-xs text-[#9A5B00] dark:text-[#FCD34D]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t.profile.vendorPendingBanner}</span>
              </div>
            )}

            {/* Quick Actions (Vendor Studio / KYC / Admin) */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--dropp-border)]">
              {isApprovedVendor ? (
                <button
                  type="button"
                  onClick={() => onOpenVendorStudio('publish')}
                  className="min-h-[44px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-md shadow-[#FF5A1F]/20"
                >
                  <Store className="w-4 h-4" aria-hidden="true" />
                  <span>{t.profile.openVendorStudioBtn}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenVendorStudio('kyc')}
                  className="min-h-[44px] px-4 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-[var(--dropp-text)] text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Store className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                  <span>{t.profile.becomeVendorBtn}</span>
                </button>
              )}

              {session.role === 'admin' && (
                <button
                  type="button"
                  onClick={onOpenAdminConsole}
                  className="min-h-[44px] px-4 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-accent)]/60 hover:border-[var(--dropp-accent)] text-[var(--dropp-text)] text-xs font-bold inline-flex items-center gap-2 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                  <span>{t.profile.openAdminBtn}</span>
                </button>
              )}
            </div>

            {/* Wallet & Referral summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProfileTab('wallet')}
                className="p-4 rounded-2xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-[var(--dropp-muted)]">{t.profile.walletLabel}</div>
                    <div className="text-base font-bold text-[var(--dropp-text)] tabular-nums">
                      {formatFcfa(session.walletBalanceFcfa)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--dropp-muted)] block">{t.profile.escrowLabel}</span>
                  <span className="text-xs font-bold text-[var(--dropp-text)] tabular-nums">{formatFcfa(session.pendingEscrowFcfa)}</span>
                </div>
              </button>

              <div className="p-4 rounded-2xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--dropp-muted)]">{t.profile.referralLabel}</div>
                  <div className="text-sm font-bold text-[var(--dropp-text)] font-mono tracking-wide mt-0.5">
                    {session.referralCode}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#FF5A1F] bg-[#FF5A1F]/10 px-2.5 py-1 rounded-lg">
                  +500 FCFA
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section className="p-8 rounded-3xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-center space-y-4 shadow-xl">
            <h1 className="text-xl font-bold text-[var(--dropp-text)]">{t.profile.visitorTitle}</h1>
            <p className="text-sm text-[var(--dropp-muted)] max-w-md mx-auto leading-relaxed">{t.profile.visitorSubtitle}</p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[48px] px-8 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white font-bold text-sm transition-colors shadow-lg shadow-[#FF5A1F]/25"
            >
              {t.profile.loginCta}
            </button>
          </section>
        )}

        {/* Profile Navigation Tabs */}
        <div>
          <div className="flex border-b border-[var(--dropp-border)] overflow-x-auto no-scrollbar">
            {availableTabs.map((tabItem) => {
              const active = effectiveTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setProfileTab(tabItem.id)}
                  className={`flex-1 min-w-[100px] min-h-[44px] px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[var(--dropp-accent)] text-[var(--dropp-text)]'
                      : 'border-transparent text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
                  }`}
                >
                  {tabItem.label}
                </button>
              );
            })}
          </div>

          {effectiveTab === 'posts' && (
            <div className="pt-4">
              {!activeShop && !session?.shopId && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--dropp-muted)] mb-3 px-1">
                  <Bookmark className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                  <span>{t.profile.savedItemsTitle}</span>
                </div>
              )}
              {shopPosts.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Bookmark className="w-8 h-8 text-[var(--dropp-muted)] mx-auto opacity-40" aria-hidden="true" />
                  <p className="text-xs text-[var(--dropp-muted)]">
                    {activeShop ? t.profile.emptyPosts : t.profile.emptyBookmarks}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                  {shopPosts.map((post) => (
                    <button
                      key={post.postId}
                      type="button"
                      onClick={() => onWatchPost(post.postId)}
                      className="relative aspect-[3/4] bg-black overflow-hidden group rounded-xl border border-[var(--dropp-border)]"
                    >
                      <img
                        src={buildCloudinaryMediaUrl(post.posterUrl, {
                          dataSaver,
                          isThumbnail: true,
                        })}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" aria-hidden="true" />
                      <span className="absolute bottom-2 left-2 text-[11px] font-bold text-[#FF5A1F] drop-shadow tabular-nums">
                        {formatFcfa(post.priceFcfa)}
                      </span>
                      <Play
                        className="w-4 h-4 text-white/90 absolute top-2 right-2 drop-shadow"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {effectiveTab === 'products' && (
            <div className="pt-4 space-y-3">
              {shopPosts.map((post) => (
                <button
                  key={post.postId}
                  type="button"
                  onClick={() => onOpenProductDetail(post)}
                  className="w-full p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center gap-3.5 text-left hover:border-[var(--dropp-border-strong)] transition-colors"
                >
                  <img
                    src={buildCloudinaryMediaUrl(post.posterUrl, {
                      dataSaver,
                      isThumbnail: true,
                    })}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-16 rounded-xl object-cover shrink-0 bg-black"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--dropp-text)] truncate">{post.title}</div>
                    <div className="text-xs text-[var(--dropp-muted)] mt-1 tabular-nums flex items-center gap-2">
                      <span className="font-bold text-[var(--dropp-accent)] text-sm">{formatFcfa(post.priceFcfa)}</span>
                      <span>·</span>
                      <span>{t.feed.moqLabel} {post.moq} {t.sheets.pcsUnit}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {effectiveTab === 'info' && (
            <div className="pt-4 space-y-4">
              {activeShop ? (
                <div className="p-5 rounded-3xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums">{activeShop.rating}/5</div>
                    <div className="text-xs text-[var(--dropp-muted)] mt-0.5">{t.profile.shopStatsRating}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums">{activeShop.salesCount}</div>
                    <div className="text-xs text-[var(--dropp-muted)] mt-0.5">{t.profile.shopStatsSales}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums">{activeShop.responseRate}%</div>
                    <div className="text-xs text-[var(--dropp-muted)] mt-0.5">{t.profile.shopStatsResponse}</div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-3xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-center text-xs text-[var(--dropp-muted)]">
                  {t.tagline}
                </div>
              )}
            </div>
          )}

          {!activeShop && session && (effectiveTab === 'orders' || effectiveTab === 'wallet' || effectiveTab === 'notifs') && (
            <div className="pt-4">
              <WalletAndOrdersPanel
                t={t}
                section={effectiveTab}
                session={session}
                isOnline={isOnline}
                orders={orders}
                transactions={transactions}
                notifications={notifications}
                notifPrefs={notifPrefs}
                appRating={appRating}
                onCancelOrder={onCancelOrder}
                onConfirmDelivery={onConfirmDelivery}
                onOpenDispute={onOpenDispute}
                onRateOrder={onRateOrder}
                onReorder={onReorder}
                onOpenCart={onOpenCart}
                onDeposit={onDeposit}
                onWithdraw={onWithdraw}
                onToggleNotifPref={onToggleNotifPref}
                onMarkAllNotifsRead={onMarkAllNotifsRead}
                onApplyReferralCode={onApplyReferralCode}
                onSubmitAppRating={onSubmitAppRating}
              />
            </div>
          )}
        </div>

        {/* App Settings & Preferences */}
        <section className="pt-6 border-t border-[var(--dropp-border)] space-y-3.5">
          <h2 className="text-sm font-semibold text-[var(--dropp-text)]">{t.profile.settingsTitle}</h2>

          {/* Theme Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="flex items-center gap-3">
              {themePref === 'light' ? (
                <Sun className="w-4 h-4 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
              ) : themePref === 'system' ? (
                <Monitor className="w-4 h-4 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
              )}
              <span className="text-xs font-semibold text-[var(--dropp-text)]">{t.profile.themeLabel}</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border)]">
              {(
                [
                  { id: 'dark' as const, label: t.profile.themeDark, Icon: Moon },
                  { id: 'light' as const, label: t.profile.themeLight, Icon: Sun },
                  { id: 'system' as const, label: t.profile.themeSystem, Icon: Monitor },
                ]
              ).map(({ id, label, Icon }) => {
                const active = themePref === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeTheme(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-[var(--dropp-text)] text-[var(--dropp-bg)]'
                        : 'text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Saver */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-[#F5A524] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold text-[var(--dropp-text)]">{t.network.dataSaverLabel}</div>
                <div className="text-[11px] text-[var(--dropp-muted)] mt-0.5">{t.network.dataSaverHint}</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={manualDataSaver}
              aria-label={t.network.dataSaverLabel}
              onClick={onToggleDataSaver}
              className={`min-w-[52px] h-7 rounded-full p-1 transition-colors ${
                manualDataSaver ? 'bg-[#FF5A1F]' : 'bg-[var(--dropp-border-strong)]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  manualDataSaver ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[var(--dropp-muted)] shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-[var(--dropp-text)]">{t.profile.languageLabel}</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border)]">
              {(['fr', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLang(code)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors ${
                    lang === code
                      ? 'bg-[var(--dropp-text)] text-[var(--dropp-bg)]'
                      : 'text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {!pwaInstalled && (pwaInstallable || pwaIsIOS) && (
            <button
              type="button"
              onClick={() => (pwaIsIOS ? setShowIosGuide(true) : onInstallPwa())}
              className="w-full min-h-[48px] rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] text-[var(--dropp-text)] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[var(--dropp-surface-alt)] transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
              <span>{t.actions.installApp}</span>
            </button>
          )}
        </section>
      </div>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] p-6 space-y-3.5 shadow-2xl"
          >
            <h3 className="text-base font-bold text-[var(--dropp-text)]">{t.actions.installIosTitle}</h3>
            <p className="text-xs text-[var(--dropp-muted)] leading-relaxed">{t.actions.installIosStep1}</p>
            <p className="text-xs text-[var(--dropp-muted)] leading-relaxed">{t.actions.installIosStep2}</p>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full min-h-[48px] rounded-xl bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)] text-xs font-bold"
            >
              {t.actions.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
