import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileCheck,
  LayoutDashboard,
  Layers,
  Percent,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  AdminUserRecord,
  AuditLogEntry,
  DisputeRecord,
  FeedPost,
  MarketplaceCategory,
  OrderRecord,
  PlatformSettings,
  ShopProfile,
  VendorKycApplication,
  WithdrawalRequestRecord,
} from '../types/dropp';
import { formatFcfa } from '../utils/formatters';

export type AdminSectionTab =
  | 'overview'
  | 'users'
  | 'kyc'
  | 'shops'
  | 'posts'
  | 'disputes'
  | 'withdrawals'
  | 'categories'
  | 'commission'
  | 'announcements'
  | 'audit';

const ALL_CATEGORIES: MarketplaceCategory[] = [
  'Mode',
  'Électronique',
  'Beauté',
  'Alimentation',
  'Maison',
  'Autre',
];

interface AdminDashboardScreenProps {
  t: DroppDictionary;
  adminUsers: AdminUserRecord[];
  withdrawalRequests: WithdrawalRequestRecord[];
  auditLogs: AuditLogEntry[];
  platformSettings: PlatformSettings;
  adminLoading: boolean;
  kycApplications: VendorKycApplication[];
  disputes: DisputeRecord[];
  orders: OrderRecord[];
  shops: ShopProfile[];
  posts: FeedPost[];
  onRefresh: () => void;
  onBack: () => void;
  onReviewKyc: (
    applicationId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => Promise<void> | void;
  onResolveDispute: (
    disputeId: string,
    decision: 'resolved_buyer' | 'resolved_vendor',
    note?: string
  ) => Promise<void> | void;
  onToggleCertifyShop: (shopId: string) => Promise<void> | void;
  onSuspendShop: (shopId: string) => Promise<void> | void;
  onModeratePost: (postId: string, status: 'published' | 'rejected') => Promise<void> | void;
  onManageUser: (
    targetUid: string,
    operation: 'suspend' | 'reactivate' | 'delete'
  ) => Promise<void> | void;
  onReviewWithdrawal: (
    requestId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) => Promise<void> | void;
  onUpdateSettings: (patch: {
    commissionPercent?: number;
    enabledCategories?: MarketplaceCategory[];
    announcement?: PlatformSettings['announcement'];
  }) => Promise<boolean>;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  t,
  adminUsers,
  withdrawalRequests,
  auditLogs,
  platformSettings,
  adminLoading,
  kycApplications,
  disputes,
  orders,
  shops,
  posts,
  onRefresh,
  onBack,
  onReviewKyc,
  onResolveDispute,
  onToggleCertifyShop,
  onSuspendShop,
  onModeratePost,
  onManageUser,
  onReviewWithdrawal,
  onUpdateSettings,
}) => {
  const [tab, setTab] = useState<AdminSectionTab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [withdrawalNotes, setWithdrawalNotes] = useState<Record<string, string>>({});

  const [enabledCats, setEnabledCats] = useState<MarketplaceCategory[]>(
    platformSettings.enabledCategories
  );
  const [commissionInput, setCommissionInput] = useState<string>(
    String(platformSettings.commissionPercent ?? 5)
  );
  const [announceActive, setAnnounceActive] = useState<boolean>(
    Boolean(platformSettings.announcement?.active)
  );
  const [announceTitle, setAnnounceTitle] = useState<string>(
    platformSettings.announcement?.title || ''
  );
  const [announceMsg, setAnnounceMsg] = useState<string>(
    platformSettings.announcement?.message || ''
  );
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    setEnabledCats(platformSettings.enabledCategories);
    setCommissionInput(String(platformSettings.commissionPercent ?? 5));
    setAnnounceActive(Boolean(platformSettings.announcement?.active));
    setAnnounceTitle(platformSettings.announcement?.title || '');
    setAnnounceMsg(platformSettings.announcement?.message || '');
  }, [platformSettings]);

  const pendingKycCount = useMemo(
    () => kycApplications.filter((k) => k.status === 'pending').length,
    [kycApplications]
  );
  const openDisputesCount = useMemo(
    () => disputes.filter((d) => d.status === 'open').length,
    [disputes]
  );
  const pendingWithdrawalsCount = useMemo(
    () => withdrawalRequests.filter((w) => w.status === 'pending').length,
    [withdrawalRequests]
  );
  const activeOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered').length,
    [orders]
  );
  const escrowTotalFcfa = useMemo(
    () =>
      orders
        .filter((o) => o.escrowStatus === 'held' || o.escrowStatus === 'disputed')
        .reduce((sum, o) => sum + o.totalFcfa, 0),
    [orders]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return adminUsers;
    return adminUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.vendorStatus.toLowerCase().includes(q)
    );
  }, [adminUsers, userSearch]);

  const navItems: Array<{
    id: AdminSectionTab;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: t.admin.tabOverview, Icon: LayoutDashboard },
    { id: 'users', label: t.admin.tabUsers, Icon: Users, badge: adminUsers.length },
    { id: 'kyc', label: t.admin.tabKyc, Icon: FileCheck, badge: pendingKycCount },
    { id: 'shops', label: t.admin.tabShops, Icon: Store, badge: shops.length },
    { id: 'posts', label: t.admin.tabPosts, Icon: Video, badge: posts.length },
    { id: 'disputes', label: t.admin.tabDisputes, Icon: AlertTriangle, badge: openDisputesCount },
    {
      id: 'withdrawals',
      label: t.admin.tabWithdrawals,
      Icon: CreditCard,
      badge: pendingWithdrawalsCount,
    },
    { id: 'categories', label: t.admin.tabCategories, Icon: Layers },
    { id: 'commission', label: t.admin.tabCommission, Icon: Percent },
    { id: 'announcements', label: t.admin.tabAnnouncements, Icon: Bell },
    { id: 'audit', label: t.admin.tabAudit, Icon: ClipboardList },
  ];

  const handleSaveSettings = async (patch: Parameters<typeof onUpdateSettings>[0]) => {
    const ok = await onUpdateSettings(patch);
    if (ok) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2200);
    }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-[var(--dropp-bg)] overflow-hidden">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--dropp-border)] bg-[var(--dropp-surface)] p-4 justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-2.5 rounded-xl text-xs font-semibold text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.backToProfile}</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t.actions.retry}
              className="min-w-[36px] min-h-[36px] rounded-xl border border-[var(--dropp-border)] flex items-center justify-center text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]"
            >
              <RefreshCw
                className={`w-4 h-4 ${adminLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="px-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
            <h1 className="text-sm font-bold text-[var(--dropp-text)]">{t.admin.title}</h1>
          </div>

          <nav aria-label={t.admin.title} className="space-y-1">
            {navItems.map(({ id, label, Icon, badge }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`w-full min-h-[42px] px-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#FF5A1F] text-white'
                      : 'text-[var(--dropp-muted)] hover:bg-[var(--dropp-surface-alt)] hover:text-[var(--dropp-text)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{label}</span>
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                        active
                          ? 'bg-black/25 text-white'
                          : 'bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)]'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar + Horizontal Tabs */}
        <header className="lg:hidden border-b border-[var(--dropp-border)] bg-[var(--dropp-surface)] shrink-0">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-2.5 rounded-xl text-xs font-semibold text-[var(--dropp-text)] bg-[var(--dropp-surface-alt)] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.backToProfile}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
              <span className="text-sm font-bold text-[var(--dropp-text)]">{t.admin.title}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t.actions.retry}
              className="min-w-[40px] min-h-[40px] rounded-xl border border-[var(--dropp-border)] flex items-center justify-center text-[var(--dropp-text)]"
            >
              <RefreshCw
                className={`w-4 h-4 ${adminLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
          <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
            {navItems.map(({ id, label, badge }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 border ${
                    active
                      ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white'
                      : 'bg-[var(--dropp-bg)] border-[var(--dropp-border)] text-[var(--dropp-muted)]'
                  }`}
                >
                  <span>{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="text-[10px] opacity-90 tabular-nums">({badge})</span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-10 space-y-5 max-w-5xl w-full mx-auto">
          {settingsSaved && (
            <div className="p-3 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/50 text-xs font-semibold text-[#FF5A1F] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.actions.save}</span>
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.kpiPendingKyc}</div>
                  <div className="text-2xl font-bold text-[var(--dropp-text)] tabular-nums mt-1">
                    {pendingKycCount}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.kpiActiveOrders}</div>
                  <div className="text-2xl font-bold text-[var(--dropp-text)] tabular-nums mt-1">
                    {activeOrdersCount}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.kpiEscrowTotal}</div>
                  <div className="text-xl font-bold text-[var(--dropp-accent)] tabular-nums mt-1">
                    {formatFcfa(escrowTotalFcfa)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.kpiOpenDisputes}</div>
                  <div className="text-2xl font-bold text-[#9A5B00] dark:text-[#F5A524] tabular-nums mt-1">
                    {openDisputesCount}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTab('users')}
                  className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-left"
                >
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.tabUsers}</div>
                  <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums mt-1">
                    {adminUsers.length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('shops')}
                  className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-left"
                >
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.tabShops}</div>
                  <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums mt-1">
                    {shops.length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('withdrawals')}
                  className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-left"
                >
                  <div className="text-xs text-[var(--dropp-muted)]">{t.admin.tabWithdrawals}</div>
                  <div className="text-lg font-bold text-[var(--dropp-accent)] tabular-nums mt-1">
                    {pendingWithdrawalsCount}
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[var(--dropp-muted)] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t.admin.searchUsersPlaceholder}
                  aria-label={t.admin.searchUsersPlaceholder}
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)]"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyUsers}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.uid}
                      className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[var(--dropp-text)]">
                            {u.displayName}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)]">
                            {u.role} · {u.vendorStatus}
                          </span>
                          {u.disabled && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#E5484D]/15 text-[#FCA5A5]">
                              Suspendu
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--dropp-muted)] break-all">
                          {u.email} · UID: {u.uid} · {formatFcfa(u.walletBalanceFcfa)}
                        </div>
                      </div>

                      {u.role !== 'admin' && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onManageUser(u.uid, u.disabled ? 'reactivate' : 'suspend')
                            }
                            className="min-h-[38px] px-3 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)]"
                          >
                            {u.disabled ? t.admin.reactivateUserBtn : t.admin.suspendUserBtn}
                          </button>

                          {confirmDeleteUid === u.uid ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onManageUser(u.uid, 'delete');
                                  setConfirmDeleteUid(null);
                                }}
                                className="min-h-[38px] px-3 rounded-xl bg-[#E5484D] hover:bg-[#D13B40] text-white text-xs font-bold"
                              >
                                {t.admin.confirmDeleteUser}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUid(null)}
                                className="min-h-[38px] px-3 rounded-xl bg-[var(--dropp-surface-alt)] text-xs text-[var(--dropp-muted)]"
                              >
                                {t.actions.cancel}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUid(u.uid)}
                              className="min-h-[38px] px-3 rounded-xl border border-[#E5484D]/50 text-xs font-semibold text-[#B42328] dark:text-[#FCA5A5] inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t.admin.deleteUserBtn}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'kyc' && (
            <div className="space-y-3">
              {kycApplications.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyKyc}
                </p>
              ) : (
                kycApplications.map((app) => (
                  <div
                    key={app.applicationId}
                    className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-[var(--dropp-muted)]">
                          {app.applicationId} · CNI #{app.cniNumber} · {app.city} ({app.neighborhood})
                        </div>
                        <div className="text-sm font-bold text-[var(--dropp-text)] mt-0.5">
                          {app.shopName} — {app.applicantName}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#9A5B00] dark:text-[#F5A524]">
                        {app.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <img
                        src={app.cniFrontUrl}
                        alt={t.vendor.kycFrontLabel}
                        referrerPolicy="no-referrer"
                        className="h-28 w-full object-cover rounded-xl border border-[var(--dropp-border)] bg-black"
                      />
                      <img
                        src={app.cniBackUrl}
                        alt={t.vendor.kycBackLabel}
                        referrerPolicy="no-referrer"
                        className="h-28 w-full object-cover rounded-xl border border-[var(--dropp-border)] bg-black"
                      />
                      <img
                        src={app.selfieUrl}
                        alt={t.vendor.kycSelfieLabel}
                        referrerPolicy="no-referrer"
                        className="h-28 w-full object-cover rounded-xl border border-[var(--dropp-border)] bg-black"
                      />
                    </div>
                    {app.status === 'pending' && (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={rejectionReasons[app.applicationId] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({
                              ...prev,
                              [app.applicationId]: e.target.value,
                            }))
                          }
                          placeholder="Motif si rejet (optionnel)"
                          className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onReviewKyc(app.applicationId, 'approved')}
                            className="min-h-[40px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                          >
                            {t.actions.approve}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onReviewKyc(
                                app.applicationId,
                                'rejected',
                                rejectionReasons[app.applicationId]?.trim() || 'Documents illisibles'
                              )
                            }
                            className="min-h-[40px] px-4 rounded-xl bg-[#E5484D] hover:bg-[#D13B40] text-white text-xs font-bold"
                          >
                            {t.actions.reject}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'shops' && (
            <div className="space-y-3">
              {shops.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyShops}
                </p>
              ) : (
                shops.map((shop) => (
                  <div
                    key={shop.shopId}
                    className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-[var(--dropp-text)]">
                          {shop.name}
                        </span>
                        {shop.isCertified && (
                          <BadgeCheck
                            className="w-4 h-4 text-[var(--dropp-accent)] shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="text-xs text-[var(--dropp-muted)] mt-0.5">
                        {shop.city} · {shop.vendorStatus} · {shop.salesCount}{' '}
                        {t.profile.shopStatsSales}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleCertifyShop(shop.shopId)}
                        className="min-h-[38px] px-3 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)]"
                      >
                        {shop.isCertified ? t.admin.uncertifyBtn : t.admin.certifyBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSuspendShop(shop.shopId)}
                        className="min-h-[38px] px-3 rounded-xl border border-[#E5484D]/50 text-xs font-semibold text-[#B42328] dark:text-[#FCA5A5]"
                      >
                        {shop.vendorStatus === 'suspended'
                          ? t.admin.reactivateUserBtn
                          : t.admin.suspendBtn}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'posts' && (
            <div className="space-y-3">
              {posts.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyPosts}
                </p>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.postId}
                    className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-[var(--dropp-text)]">{post.title}</div>
                      <div className="text-xs text-[var(--dropp-muted)] mt-0.5">
                        {post.shopName} · {formatFcfa(post.priceFcfa)} · {post.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onModeratePost(
                          post.postId,
                          post.status === 'published' ? 'rejected' : 'published'
                        )
                      }
                      className="min-h-[38px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)] shrink-0"
                    >
                      {post.status === 'published' ? t.admin.rejectPostBtn : t.admin.approvePostBtn}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'disputes' && (
            <div className="space-y-3">
              {disputes.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyDisputes}
                </p>
              ) : (
                disputes.map((d) => (
                  <div
                    key={d.disputeId}
                    className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-[var(--dropp-muted)]">
                          {d.disputeId} · {d.orderId} · {d.shopName} · {d.buyerName}
                        </div>
                        <div className="text-sm font-bold text-[var(--dropp-text)] mt-0.5">
                          {d.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[var(--dropp-accent)] tabular-nums">
                          {formatFcfa(d.amountHeldFcfa)}
                        </div>
                        <div className="text-xs text-[var(--dropp-muted)]">
                          {d.status === 'resolved_buyer'
                            ? t.admin.disputeResolvedBuyer
                            : d.status === 'resolved_vendor'
                              ? t.admin.disputeResolvedVendor
                              : d.status}
                        </div>
                      </div>
                    </div>
                    {d.status === 'open' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onResolveDispute(d.disputeId, 'resolved_buyer')}
                          className="min-h-[40px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                        >
                          {t.admin.refundBuyerBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => onResolveDispute(d.disputeId, 'resolved_vendor')}
                          className="min-h-[40px] px-4 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-[var(--dropp-text)] text-xs font-semibold"
                        >
                          {t.admin.releaseVendorBtn}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'withdrawals' && (
            <div className="space-y-3">
              {withdrawalRequests.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyWithdrawals}
                </p>
              ) : (
                withdrawalRequests.map((w) => (
                  <div
                    key={w.requestId}
                    className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-[var(--dropp-text)]">
                          {w.userName} ({w.userEmail})
                        </div>
                        <div className="text-xs text-[var(--dropp-muted)] mt-0.5">
                          {w.requestId} · {w.method} · {w.phone}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[var(--dropp-accent)] tabular-nums">
                          {formatFcfa(w.amountFcfa)}
                        </div>
                        <div className="text-xs font-semibold text-[var(--dropp-muted)]">
                          {w.status}
                        </div>
                      </div>
                    </div>
                    {w.status === 'pending' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={withdrawalNotes[w.requestId] || ''}
                          onChange={(e) =>
                            setWithdrawalNotes((prev) => ({
                              ...prev,
                              [w.requestId]: e.target.value,
                            }))
                          }
                          placeholder="Note administrateur (optionnel)"
                          className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onReviewWithdrawal(
                                w.requestId,
                                'approved',
                                withdrawalNotes[w.requestId]
                              )
                            }
                            className="min-h-[40px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                          >
                            {t.admin.approveWithdrawalBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onReviewWithdrawal(
                                w.requestId,
                                'rejected',
                                withdrawalNotes[w.requestId] || 'Demande refusée'
                              )
                            }
                            className="min-h-[40px] px-4 rounded-xl bg-[#E5484D] hover:bg-[#D13B40] text-white text-xs font-bold"
                          >
                            {t.admin.rejectWithdrawalBtn}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'categories' && (
            <div className="p-5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-4">
              <h2 className="text-sm font-bold text-[var(--dropp-text)]">{t.admin.tabCategories}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_CATEGORIES.map((cat) => {
                  const checked = enabledCats.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="p-3 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border)] flex items-center justify-between text-xs font-semibold text-[var(--dropp-text)] cursor-pointer"
                    >
                      <span>{cat}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEnabledCats((prev) =>
                              prev.includes(cat) ? prev : [...prev, cat]
                            );
                          } else {
                            setEnabledCats((prev) =>
                              prev.length > 1 ? prev.filter((c) => c !== cat) : prev
                            );
                          }
                        }}
                        className="w-4 h-4 accent-[#FF5A1F]"
                      />
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => handleSaveSettings({ enabledCategories: enabledCats })}
                className="min-h-[44px] px-5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
              >
                {t.admin.saveSettingsBtn}
              </button>
            </div>
          )}

          {tab === 'commission' && (
            <div className="p-5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-4 max-w-md">
              <h2 className="text-sm font-bold text-[var(--dropp-text)]">
                {t.admin.commissionLabel}
              </h2>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
                aria-label={t.admin.commissionLabel}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] tabular-nums"
              />
              <button
                type="button"
                onClick={() =>
                  handleSaveSettings({
                    commissionPercent: Math.max(0, Math.min(30, Number(commissionInput) || 0)),
                  })
                }
                className="min-h-[44px] px-5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
              >
                {t.admin.saveSettingsBtn}
              </button>
            </div>
          )}

          {tab === 'announcements' && (
            <div className="p-5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-4 max-w-xl">
              <label className="flex items-center justify-between text-xs font-semibold text-[var(--dropp-text)] cursor-pointer">
                <span>{t.admin.announcementActiveLabel}</span>
                <input
                  type="checkbox"
                  checked={announceActive}
                  onChange={(e) => setAnnounceActive(e.target.checked)}
                  className="w-4 h-4 accent-[#FF5A1F]"
                />
              </label>

              <label className="block text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.admin.announcementTitleLabel}</span>
                <input
                  type="text"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)]"
                />
              </label>

              <label className="block text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.admin.announcementMsgLabel}</span>
                <textarea
                  rows={3}
                  value={announceMsg}
                  onChange={(e) => setAnnounceMsg(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)]"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  handleSaveSettings({
                    announcement: {
                      title: announceTitle.trim(),
                      message: announceMsg.trim(),
                      active: announceActive,
                    },
                  })
                }
                className="min-h-[44px] px-5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
              >
                {t.admin.saveSettingsBtn}
              </button>
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">
                  {t.admin.emptyAudit}
                </p>
              ) : (
                auditLogs.map((entry) => (
                  <div
                    key={entry.logId}
                    className="p-3.5 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[var(--dropp-text)]">
                        {entry.action} · {entry.targetType}:{entry.targetId}
                      </span>
                      <span className="text-[11px] text-[var(--dropp-muted)]">
                        {entry.actorName} · {entry.createdAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    <p className="text-[var(--dropp-muted)]">{entry.details}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
