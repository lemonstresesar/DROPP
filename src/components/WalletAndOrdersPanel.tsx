import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  Gift,
  HelpCircle,
  Package,
  RefreshCw,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  AppNotification,
  NotificationPrefs,
  OrderRecord,
  UserSession,
  WalletTransaction,
} from '../types/dropp';
import { canBuyerCancelOrder, canBuyerDisputeOrder } from '../utils/commerce';
import { formatFcfa } from '../utils/formatters';

interface WalletAndOrdersPanelProps {
  t: DroppDictionary;
  section: 'orders' | 'wallet' | 'notifs';
  session: UserSession;
  isOnline: boolean;
  orders: OrderRecord[];
  transactions: WalletTransaction[];
  notifications: AppNotification[];
  notifPrefs: NotificationPrefs;
  appRating: number;
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

export const WalletAndOrdersPanel: React.FC<WalletAndOrdersPanelProps> = ({
  t,
  section,
  session,
  isOnline,
  orders,
  transactions,
  notifications,
  notifPrefs,
  appRating,
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
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'disputed'>('all');
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const [walletAmount, setWalletAmount] = useState('25000');
  const [walletMethod, setWalletMethod] = useState<'MTN MoMo' | 'Orange Money'>('MTN MoMo');
  const [walletMsg, setWalletMsg] = useState('');

  const [referralInput, setReferralInput] = useState('');
  const [referralFeedback, setReferralFeedback] = useState<'ok' | 'err' | null>(null);

  const filteredOrders = useMemo(() => {
    const mine = orders.filter((o) => o.buyerId === session.uid || o.buyerId === 'client-demo');
    return mine.filter((o) => {
      if (orderFilter === 'active') {
        return (
          o.status === 'awaiting_payment' ||
          o.status === 'pending' ||
          o.status === 'confirmed' ||
          o.status === 'delivering'
        );
      }
      if (orderFilter === 'delivered') return o.status === 'delivered';
      if (orderFilter === 'disputed') return o.status === 'disputed';
      return true;
    });
  }, [orderFilter, orders, session.uid]);

  const statusLabel = (status: OrderRecord['status']) => {
    switch (status) {
      case 'awaiting_payment':
        return t.orders.statusAwaitingPayment;
      case 'pending':
        return t.orders.statusPending;
      case 'confirmed':
        return t.orders.statusConfirmed;
      case 'delivering':
        return t.orders.statusDelivering;
      case 'delivered':
        return t.orders.statusDelivered;
      case 'cancelled':
        return t.orders.statusCancelled;
      case 'disputed':
        return t.orders.statusDisputed;
    }
  };

  const escrowLabel = (escrow: OrderRecord['escrowStatus']) => {
    switch (escrow) {
      case 'held':
        return t.orders.escrowHeld;
      case 'released':
        return t.orders.escrowReleased;
      case 'refunded':
        return t.orders.escrowRefunded;
      case 'disputed':
        return t.orders.escrowDisputed;
    }
  };

  const txLabel = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return t.wallet.txDeposit;
      case 'withdrawal':
        return t.wallet.txWithdrawal;
      case 'escrow_hold':
        return t.wallet.txEscrowHold;
      case 'escrow_release':
        return t.wallet.txEscrowRelease;
      case 'refund':
        return t.wallet.txRefund;
      case 'referral_bonus':
        return t.wallet.txReferralBonus;
    }
  };

  if (section === 'orders') {
    return (
      <div className="pt-3 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: t.orders.filterAll },
              { id: 'active', label: t.orders.filterActive },
              { id: 'delivered', label: t.orders.filterDelivered },
              { id: 'disputed', label: t.orders.filterDisputed },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setOrderFilter(f.id)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold border transition-colors ${
                orderFilter === f.id
                  ? 'bg-[var(--dropp-text)] text-[var(--dropp-bg)] border-[var(--dropp-text)]'
                  : 'bg-[var(--dropp-surface)] text-[var(--dropp-muted)] border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] hover:text-[var(--dropp-text)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Package className="w-8 h-8 text-[var(--dropp-muted)] mx-auto" aria-hidden="true" />
            <p className="text-xs text-[var(--dropp-muted)]">{t.orders.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const showConfirm =
                (order.status === 'delivered' || order.status === 'delivering') &&
                order.escrowStatus === 'held';
              const showDispute = canBuyerDisputeOrder(order);
              const showCancel = canBuyerCancelOrder(order);

              return (
                <article
                  key={order.orderId}
                  className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[var(--dropp-text)]">{order.shopName}</div>
                      <div className="text-[11px] text-[var(--dropp-muted)] tabular-nums">
                        {order.orderId} · {order.globalOrderId} · {order.deliveryCity} ({order.deliveryNeighborhood})
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          order.status === 'delivered'
                            ? 'bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/40'
                            : order.status === 'disputed'
                            ? 'bg-[#E5484D]/15 text-[#B42328] dark:text-[#FCA5A5] border border-[#E5484D]/40'
                            : order.status === 'cancelled'
                            ? 'bg-[var(--dropp-surface-alt)] text-[var(--dropp-muted)]'
                            : 'bg-[#F5A524]/15 text-[#9A5B00] dark:text-[#FCD34D] border border-[#F5A524]/40'
                        }`}
                      >
                        {statusLabel(order.status)}
                      </span>
                      <div className="text-[11px] text-[var(--dropp-muted)] mt-1 flex items-center justify-end gap-1">
                        <ShieldCheck className="w-3 h-3 text-[var(--dropp-accent)]" aria-hidden="true" />
                        <span>{escrowLabel(order.escrowStatus)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-b border-[var(--dropp-border)] py-2.5">
                    {order.items.map((item) => (
                      <div
                        key={`${item.postId}-${item.variantId}`}
                        className="flex items-center justify-between text-xs text-[var(--dropp-text)] gap-2"
                      >
                        <span className="truncate">
                          {item.qty}× {item.title} ({item.variantLabel})
                        </span>
                        <span className="font-semibold tabular-nums shrink-0">
                          {formatFcfa(item.unitPriceFcfa * item.qty)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs text-[var(--dropp-muted)] pt-1">
                      <span>{t.cart.shippingLabel}</span>
                      <span className="tabular-nums">{formatFcfa(order.shippingFeeFcfa)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold text-[var(--dropp-text)]">
                      <span>{t.cart.grandTotal}</span>
                      <span className="text-[var(--dropp-accent)] tabular-nums">{formatFcfa(order.totalFcfa)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {showConfirm && (
                      <button
                        type="button"
                        onClick={() => onConfirmDelivery(order.orderId)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.orders.confirmReceiptBtn}</span>
                      </button>
                    )}

                    {showDispute && (
                      <button
                        type="button"
                        onClick={() =>
                          setDisputeOrderId((prev) =>
                            prev === order.orderId ? null : order.orderId
                          )
                        }
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#E5484D]/12 border border-[#E5484D]/40 text-[#B42328] dark:text-[#FCA5A5] text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.orders.openDisputeBtn}</span>
                      </button>
                    )}

                    {showCancel && (
                      <button
                        type="button"
                        onClick={() => onCancelOrder(order.orderId)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-[var(--dropp-text)] text-xs font-semibold"
                      >
                        {t.orders.cancelBtn}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onReorder(order);
                        onOpenCart();
                      }}
                      className="min-h-[40px] px-3.5 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-[var(--dropp-text)] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.orders.reorderBtn}</span>
                    </button>

                    {order.status === 'delivered' && (
                      <button
                        type="button"
                        disabled={order.rated}
                        onClick={() => onRateOrder(order.orderId)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border-strong)] text-xs font-semibold text-[#9A5B00] dark:text-[#F5A524] inline-flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <Star className="w-3.5 h-3.5 fill-[#F5A524] text-[#F5A524]" aria-hidden="true" />
                        <span>{order.rated ? t.orders.ratedLabel : t.orders.rateBtn}</span>
                      </button>
                    )}
                  </div>

                  {disputeOrderId === order.orderId && (
                    <div className="pt-2 space-y-2 border-t border-[var(--dropp-border)]">
                      <input
                        type="text"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder={t.orders.disputePlaceholder}
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)] focus:outline-none focus:border-[#E5484D]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!disputeReason.trim()) return;
                          onOpenDispute(order.orderId, disputeReason);
                          setDisputeReason('');
                          setDisputeOrderId(null);
                        }}
                        className="min-h-[40px] px-4 rounded-xl bg-[#E5484D] hover:bg-[#D13B40] text-white text-xs font-bold"
                      >
                        {t.orders.disputeSubmit}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === 'wallet') {
    const parsedAmt = Math.max(0, Number(walletAmount) || 0);

    const handleDeposit = () => {
      setWalletMsg('');
      if (!isOnline) {
        setWalletMsg(t.network.offlineOrderBlocked);
        return;
      }
      if (parsedAmt <= 0) return;
      const ok = onDeposit(parsedAmt, walletMethod);
      if (ok) setWalletMsg(`${t.wallet.txDeposit} (+${formatFcfa(parsedAmt)})`);
    };

    const handleWithdraw = () => {
      setWalletMsg('');
      if (!isOnline) {
        setWalletMsg(t.network.offlineOrderBlocked);
        return;
      }
      if (parsedAmt <= 0) return;
      const ok = onWithdraw(parsedAmt, walletMethod);
      setWalletMsg(
        ok ? `${t.wallet.txWithdrawal} (-${formatFcfa(parsedAmt)})` : t.wallet.insufficientBalance
      );
    };

    return (
      <div className="pt-3 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-xs text-[var(--dropp-muted)]">{t.wallet.availableLabel}</div>
            <div className="mt-1 text-lg font-bold text-[var(--dropp-text)] tabular-nums">
              {formatFcfa(session.walletBalanceFcfa)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-xs text-[var(--dropp-muted)]">{t.wallet.escrowLabel}</div>
            <div className="mt-1 text-lg font-bold text-[#9A5B00] dark:text-[#F5A524] tabular-nums">
              {formatFcfa(session.pendingEscrowFcfa)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-xs text-[var(--dropp-muted)]">{t.wallet.referralEarnedLabel}</div>
            <div className="mt-1 text-lg font-bold text-[var(--dropp-accent)] tabular-nums">
              {formatFcfa(session.referralBonusEarnedFcfa || 0)}
            </div>
          </div>
        </div>

        <section className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dropp-text)]">
            <Wallet className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
            <span>{t.wallet.title}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="number"
              min="500"
              step="500"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              placeholder={t.wallet.amountPlaceholder}
              aria-label={t.wallet.amountPlaceholder}
              className="min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] tabular-nums focus:outline-none focus:border-[var(--dropp-accent)]"
            />
            <select
              value={walletMethod}
              onChange={(e) => setWalletMethod(e.target.value as 'MTN MoMo' | 'Orange Money')}
              aria-label={t.cart.paymentMethodLabel}
              className="min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] focus:outline-none focus:border-[var(--dropp-accent)]"
            >
              <option value="MTN MoMo">MTN MoMo</option>
              <option value="Orange Money">Orange Money</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDeposit}
              className="min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t.wallet.depositBtn}</span>
            </button>
            <button
              type="button"
              onClick={handleWithdraw}
              className="min-h-[44px] rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-[var(--dropp-text)] text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              <span>{t.wallet.withdrawBtn}</span>
            </button>
          </div>

          {walletMsg && (
            <p className="text-xs font-medium text-[#9A5B00] dark:text-[#F5A524]">{walletMsg}</p>
          )}
        </section>

        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--dropp-muted)]">
            {t.wallet.historyTitle}
          </h3>
          {transactions.length === 0 ? (
            <p className="text-xs text-[var(--dropp-muted)] py-4">{t.wallet.noTransactions}</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.txId}
                  className="p-3.5 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--dropp-text)] truncate">
                      {txLabel(tx.type)}
                    </div>
                    <div className="text-[11px] text-[var(--dropp-muted)] truncate">
                      {tx.methodLabel}
                      {tx.referenceId ? ` · ${tx.referenceId}` : ''}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      tx.amountFcfa >= 0 ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-text)]'
                    }`}
                  >
                    {tx.amountFcfa >= 0 ? '+' : ''}
                    {formatFcfa(tx.amountFcfa)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // section === 'notifs': Notifications, Preferences, Referral, App Rating, Help FAQ
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="pt-3 space-y-5">
      {/* Notifications feed */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dropp-text)]">
            <Bell className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
            <span>
              {t.profile.tabNotifs} ({unreadCount})
            </span>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllNotifsRead}
              className="text-xs font-semibold text-[var(--dropp-accent)] hover:underline"
            >
              {t.actions.save}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {notifications.slice(0, 5).map((n) => (
            <div
              key={n.notifId}
              className={`p-3 rounded-xl border text-xs ${
                n.read
                  ? 'bg-[var(--dropp-surface)] border-[var(--dropp-border)] text-[var(--dropp-muted)]'
                  : 'bg-[var(--dropp-surface)] border-[var(--dropp-accent)]/60 text-[var(--dropp-text)]'
              }`}
            >
              <div className="font-semibold">{n.title}</div>
              <div className="mt-0.5 text-[11px] text-[var(--dropp-muted)]">{n.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Notification preferences */}
      <section className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3">
        <h3 className="text-sm font-semibold text-[var(--dropp-text)]">{t.profile.notifPrefsTitle}</h3>
        {(
          [
            { key: 'orders', label: t.profile.notifOrders },
            { key: 'messages', label: t.profile.notifMessages },
            { key: 'following', label: t.profile.notifFollowing },
            { key: 'promos', label: t.profile.notifPromos },
          ] as const
        ).map((pref) => (
          <div key={pref.key} className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--dropp-text)]">{pref.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifPrefs[pref.key]}
              aria-label={pref.label}
              onClick={() => onToggleNotifPref(pref.key)}
              className={`min-w-[48px] h-6 rounded-full p-0.5 transition-colors ${
                notifPrefs[pref.key] ? 'bg-[#FF5A1F]' : 'bg-[var(--dropp-border-strong)]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifPrefs[pref.key] ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </section>

      {/* Referral apply */}
      <section className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dropp-text)]">
          <Gift className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
          <span>{t.profile.referralLabel}: {session.referralCode}</span>
        </div>
        <p className="text-xs text-[var(--dropp-muted)]">{t.profile.referralHint}</p>
        {session.referredByCode ? (
          <p className="text-xs font-semibold text-[var(--dropp-accent)]">
            Code actif : {session.referredByCode}
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              placeholder={t.profile.referralApplyPlaceholder}
              className="flex-1 min-h-[42px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)] focus:outline-none focus:border-[var(--dropp-accent)]"
            />
            <button
              type="button"
              onClick={() => {
                const ok = onApplyReferralCode(referralInput);
                setReferralFeedback(ok ? 'ok' : 'err');
              }}
              className="min-h-[42px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
            >
              {t.profile.referralApplyBtn}
            </button>
          </div>
        )}
        {referralFeedback === 'err' && (
          <p className="text-xs text-[#B42328] dark:text-[#FCA5A5]">DROPP-XXXXX requis</p>
        )}
      </section>

      {/* App rating */}
      <section className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2.5">
        <h3 className="text-sm font-semibold text-[var(--dropp-text)]">{t.profile.appRatingTitle}</h3>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onSubmitAppRating(star)}
              aria-label={`${star}/5`}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] flex items-center justify-center hover:border-[#F5A524]"
            >
              <Star
                className={`w-5 h-5 ${
                  star <= appRating ? 'text-[#F5A524] fill-[#F5A524]' : 'text-[var(--dropp-muted)]'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        {appRating > 0 && (
          <p className="text-xs text-[var(--dropp-accent)] font-medium">
            {t.profile.appRatingSubmitted} ({appRating}/5)
          </p>
        )}
      </section>

      {/* Help & Support FAQ */}
      <section className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dropp-text)]">
          <HelpCircle className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
          <span>{t.profile.helpTitle}</span>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <div className="font-semibold text-[var(--dropp-text)]">{t.profile.helpFaq1Q}</div>
            <p className="text-[var(--dropp-muted)] mt-0.5 leading-relaxed">{t.profile.helpFaq1A}</p>
          </div>
          <div className="pt-2 border-t border-[var(--dropp-border)]">
            <div className="font-semibold text-[var(--dropp-text)]">{t.profile.helpFaq2Q}</div>
            <p className="text-[var(--dropp-muted)] mt-0.5 leading-relaxed">{t.profile.helpFaq2A}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
