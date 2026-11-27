import React, { useState } from 'react';
import { BadgeCheck, ShieldCheck, X } from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  DisputeRecord,
  FeedPost,
  OrderRecord,
  ShopProfile,
  VendorKycApplication,
} from '../types/dropp';
import { formatFcfa } from '../utils/formatters';

interface AdminDashboardModalProps {
  t: DroppDictionary;
  kycApplications: VendorKycApplication[];
  disputes: DisputeRecord[];
  orders: OrderRecord[];
  shops: ShopProfile[];
  posts: FeedPost[];
  onReviewKyc: (applicationId: string, decision: 'approved' | 'rejected', reason?: string) => void;
  onResolveDispute: (disputeId: string, decision: 'resolved_buyer' | 'resolved_vendor') => void;
  onToggleCertifyShop: (shopId: string) => void;
  onSuspendShop: (shopId: string) => void;
  onModeratePost: (postId: string, status: 'published' | 'rejected') => void;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  t,
  kycApplications,
  disputes,
  orders,
  shops,
  posts,
  onReviewKyc,
  onResolveDispute,
  onToggleCertifyShop,
  onSuspendShop,
  onModeratePost,
  onClose,
}) => {
  const [tab, setTab] = useState<'kyc' | 'disputes' | 'shops' | 'posts'>('kyc');

  const pendingKycCount = kycApplications.filter((k) => k.status === 'pending').length;
  const openDisputesCount = disputes.filter((d) => d.status === 'open').length;
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'delivered'
  ).length;
  const escrowTotalFcfa = orders
    .filter((o) => o.escrowStatus === 'held' || o.escrowStatus === 'disputed')
    .reduce((sum, o) => sum + o.totalFcfa, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.admin.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dropp-border)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--dropp-text)]">{t.admin.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.close}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-[var(--dropp-border)] bg-[var(--dropp-bg)]">
          <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.admin.kpiPendingKyc}</div>
            <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums mt-0.5">
              {pendingKycCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.admin.kpiActiveOrders}</div>
            <div className="text-lg font-bold text-[var(--dropp-text)] tabular-nums mt-0.5">
              {activeOrdersCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.admin.kpiEscrowTotal}</div>
            <div className="text-lg font-bold text-[var(--dropp-accent)] tabular-nums mt-0.5">
              {formatFcfa(escrowTotalFcfa)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.admin.kpiOpenDisputes}</div>
            <div className="text-lg font-bold text-[#9A5B00] dark:text-[#F5A524] tabular-nums mt-0.5">
              {openDisputesCount}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--dropp-border)] px-3 overflow-x-auto">
          {(
            [
              { id: 'kyc' as const, label: `${t.admin.tabKyc} (${kycApplications.length})` },
              { id: 'disputes' as const, label: `${t.admin.tabDisputes} (${disputes.length})` },
              { id: 'shops' as const, label: `${t.admin.tabShops} (${shops.length})` },
              { id: 'posts' as const, label: `${t.admin.tabPosts} (${posts.length})` },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] px-4 text-xs font-semibold border-b-2 whitespace-nowrap ${
                tab === item.id
                  ? 'border-[var(--dropp-accent)] text-[var(--dropp-text)]'
                  : 'border-transparent text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tab === 'kyc' &&
            kycApplications.map((app) => (
              <div
                key={app.applicationId}
                className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[var(--dropp-muted)]">
                      {app.applicationId} · CNI #{app.cniNumber} · {app.city} ({app.neighborhood})
                    </div>
                    <div className="text-sm font-bold text-[var(--dropp-text)] mt-0.5">
                      {app.shopName} — {app.applicantName}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#9A5B00] dark:text-[#F5A524]">{app.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <img
                    src={app.cniFrontUrl}
                    alt={t.vendor.kycFrontLabel}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover rounded-lg border border-[var(--dropp-border)]"
                  />
                  <img
                    src={app.cniBackUrl}
                    alt={t.vendor.kycBackLabel}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover rounded-lg border border-[var(--dropp-border)]"
                  />
                  <img
                    src={app.selfieUrl}
                    alt={t.vendor.kycSelfieLabel}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover rounded-lg border border-[var(--dropp-border)]"
                  />
                </div>
                {app.status === 'pending' && (
                  <div className="flex gap-2">
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
                        onReviewKyc(app.applicationId, 'rejected', 'Documents illisibles')
                      }
                      className="min-h-[40px] px-4 rounded-xl bg-[#E5484D] hover:bg-[#D13B40] text-white text-xs font-bold"
                    >
                      {t.actions.reject}
                    </button>
                  </div>
                )}
              </div>
            ))}

          {tab === 'disputes' &&
            disputes.map((d) => (
              <div
                key={d.disputeId}
                className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[var(--dropp-muted)]">
                      {d.disputeId} · {d.orderId} · {d.shopName}
                    </div>
                    <div className="text-sm font-bold text-[var(--dropp-text)] mt-0.5">{d.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[var(--dropp-accent)] tabular-nums">
                      {formatFcfa(d.amountHeldFcfa)}
                    </div>
                    <div className="text-[11px] text-[var(--dropp-muted)]">
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
            ))}

          {tab === 'shops' &&
            shops.map((shop) => (
              <div
                key={shop.shopId}
                className="p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[var(--dropp-text)] truncate">{shop.name}</span>
                    {shop.isCertified && (
                      <BadgeCheck className="w-4 h-4 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <div className="text-xs text-[var(--dropp-muted)]">
                    {shop.city} · {shop.vendorStatus} · {shop.salesCount} {t.profile.shopStatsSales}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    {t.admin.suspendBtn}
                  </button>
                </div>
              </div>
            ))}

          {tab === 'posts' &&
            posts.map((post) => (
              <div
                key={post.postId}
                className="p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--dropp-text)] truncate">{post.title}</div>
                  <div className="text-[11px] text-[var(--dropp-muted)]">
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
            ))}
        </div>
      </div>
    </div>
  );
};
