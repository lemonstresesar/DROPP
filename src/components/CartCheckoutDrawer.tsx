import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  LocalCartPreviewItem,
  PaymentMethod,
  ShopProfile,
  UserSession,
} from '../types/dropp';
import { formatFcfa } from '../utils/formatters';
import { groupCartByVendor } from '../utils/commerce';
import { canBuy } from '../utils/permissions';

interface CartCheckoutDrawerProps {
  t: DroppDictionary;
  cartItems: LocalCartPreviewItem[];
  shops: ShopProfile[];
  session: UserSession | null;
  isOnline: boolean;
  onRequireAuth: () => void;
  onUpdateQty: (postId: string, variantId: string, nextQty: number) => void;
  onCheckout: (params: {
    idempotencyKey: string;
    paymentMethod: PaymentMethod;
    simulateMobileSuccess: boolean;
    deliveryCity: string;
    deliveryNeighborhood: string;
    deliveryPhone: string;
  }) => Promise<{ ok: boolean; reason?: string }>;
  onViewOrders: () => void;
  onClose: () => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  t,
  cartItems,
  shops,
  session,
  isOnline,
  onRequireAuth,
  onUpdateQty,
  onCheckout,
  onViewOrders,
  onClose,
}) => {
  const [deliveryCity, setDeliveryCity] = useState(session?.city || 'Douala');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState(
    session?.neighborhood || 'Akwa'
  );
  const [deliveryPhone, setDeliveryPhone] = useState('677102030');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn_momo');
  const [simulateSuccess, setSimulateSuccess] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [attemptSeed, setAttemptSeed] = useState(() => `chk-${Date.now()}`);

  const groups = useMemo(
    () => groupCartByVendor(cartItems, shops, deliveryCity),
    [cartItems, shops, deliveryCity]
  );

  const grandTotal = useMemo(
    () => groups.reduce((sum, g) => sum + g.totalFcfa, 0),
    [groups]
  );

  const handlePay = async () => {
    setErrorMsg('');
    if (!isOnline) {
      setErrorMsg(t.network.offlineOrderBlocked);
      return;
    }
    if (!session) {
      onRequireAuth();
      return;
    }
    if (!canBuy(session)) {
      setErrorMsg(t.errors.suspendedBlocked);
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await onCheckout({
        idempotencyKey: attemptSeed,
        paymentMethod,
        simulateMobileSuccess: simulateSuccess,
        deliveryCity,
        deliveryNeighborhood,
        deliveryPhone,
      });
      if (result.ok) {
        setCheckoutDone(true);
      } else {
        setAttemptSeed(`chk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`);
        if (result.reason === 'insufficient_wallet') {
          setErrorMsg(t.cart.errInsufficientWallet);
        } else if (result.reason === 'mobile_payment_failed') {
          setErrorMsg(t.cart.errMobileFailed);
        } else if (result.reason === 'invalid_address') {
          setErrorMsg(t.cart.errInvalidAddress);
        } else if (result.reason === 'email_unverified') {
          setErrorMsg(t.errors.emailUnverified);
        } else {
          setErrorMsg(t.errors.writeFailed);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.cart.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[var(--dropp-elevated)] border-l border-[var(--dropp-border)] h-full flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dropp-border)]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--dropp-text)]">{t.cart.title}</h2>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {checkoutDone ? (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#FF5A1F] mx-auto" aria-hidden="true" />
              <h3 className="text-lg font-bold text-[var(--dropp-text)]">{t.cart.successTitle}</h3>
              <p className="text-xs text-[var(--dropp-muted)] max-w-sm mx-auto leading-relaxed">
                {t.cart.successDesc}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewOrders();
                }}
                className="min-h-[44px] px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold"
              >
                {t.cart.viewOrdersBtn}
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-base font-semibold text-[var(--dropp-text)]">{t.cart.emptyTitle}</p>
              <p className="text-xs text-[var(--dropp-muted)]">{t.cart.emptyDesc}</p>
            </div>
          ) : (
            <>
              {/* Grouped per vendor */}
              <div className="space-y-4">
                {groups.map((group) => (
                  <div
                    key={group.shopId}
                    className="rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--dropp-border)] pb-2.5">
                      <div className="text-sm font-bold text-[var(--dropp-text)]">{group.shopName}</div>
                      <span className="text-xs text-[var(--dropp-muted)]">{group.shopCity}</span>
                    </div>

                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div key={`${item.postId}-${item.variantId}`} className="flex gap-3">
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-16 rounded-xl object-cover bg-black shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[var(--dropp-text)] line-clamp-1">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-[var(--dropp-muted)] mt-0.5">
                              {item.variantLabel}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[var(--dropp-accent)] tabular-nums">
                                {formatFcfa(item.unitPriceFcfa * item.qty)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label="-"
                                  onClick={() =>
                                    onUpdateQty(item.postId, item.variantId, item.qty - 1)
                                  }
                                  className="w-8 h-8 rounded-lg bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] text-[var(--dropp-text)] flex items-center justify-center"
                                >
                                  <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <span className="w-7 text-center text-xs font-bold tabular-nums text-[var(--dropp-text)]">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  aria-label="+"
                                  onClick={() =>
                                    onUpdateQty(item.postId, item.variantId, item.qty + 1)
                                  }
                                  className="w-8 h-8 rounded-lg bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] text-[var(--dropp-text)] flex items-center justify-center"
                                >
                                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={t.cart.removeItem}
                                  onClick={() => onUpdateQty(item.postId, item.variantId, 0)}
                                  className="w-8 h-8 rounded-lg text-[var(--dropp-muted)] hover:text-[#E5484D] flex items-center justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[var(--dropp-border)] pt-2.5 space-y-1 text-xs">
                      <div className="flex justify-between text-[var(--dropp-muted)]">
                        <span>{t.cart.vendorSubtotal}</span>
                        <span className="tabular-nums text-[var(--dropp-text)]">
                          {formatFcfa(group.subtotalFcfa)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--dropp-muted)]">
                        <span>{t.cart.shippingLabel}</span>
                        <span className="tabular-nums text-[var(--dropp-text)]">
                          {group.shippingFeeFcfa === 0 ? '0 FCFA' : formatFcfa(group.shippingFeeFcfa)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[var(--dropp-muted)]">{t.cart.freeShippingNote}</p>

              {/* Delivery Address */}
              <div className="space-y-3 border-t border-[var(--dropp-border)] pt-4">
                <h3 className="text-xs font-semibold text-[var(--dropp-text)]">{t.cart.deliverySection}</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    aria-label={t.auth.cityLabel}
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Bafoussam">Bafoussam</option>
                    <option value="Garoua">Garoua</option>
                    <option value="Buea">Buea</option>
                  </select>
                  <input
                    type="text"
                    value={deliveryNeighborhood}
                    onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                    placeholder={t.cart.neighborhoodLabel}
                    aria-label={t.cart.neighborhoodLabel}
                    className="min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)]"
                  />
                </div>
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder={t.cart.phoneLabel}
                  aria-label={t.cart.phoneLabel}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)]"
                />
              </div>

              {/* Payment Method + Simulation Toggle */}
              <div className="space-y-3 border-t border-[var(--dropp-border)] pt-4">
                <h3 className="text-xs font-semibold text-[var(--dropp-text)]">
                  {t.cart.paymentMethodLabel}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      {
                        id: 'mtn_momo' as const,
                        label: t.cart.methodMtn,
                      },
                      {
                        id: 'orange_money' as const,
                        label: t.cart.methodOrange,
                      },
                      {
                        id: 'wallet' as const,
                        label: `${t.cart.methodWallet} (${formatFcfa(session?.walletBalanceFcfa || 0)})`,
                      },
                    ]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`min-h-[44px] px-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                        paymentMethod === m.id
                          ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/12 text-[var(--dropp-text)]'
                          : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-muted)]'
                      }`}
                    >
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod !== 'wallet' && (
                  <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2">
                    <div className="text-[11px] font-medium text-[var(--dropp-muted)]">
                      {t.cart.simulatedOutcomeLabel}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSimulateSuccess(true)}
                        className={`min-h-[38px] rounded-lg text-xs font-bold ${
                          simulateSuccess
                            ? 'bg-[#FF5A1F] text-white'
                            : 'bg-[var(--dropp-surface-alt)] text-[var(--dropp-muted)]'
                        }`}
                      >
                        {t.cart.simulateSuccess}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulateSuccess(false)}
                        className={`min-h-[38px] rounded-lg text-xs font-bold ${
                          !simulateSuccess
                            ? 'bg-[#E5484D] text-white'
                            : 'bg-[var(--dropp-surface-alt)] text-[var(--dropp-muted)]'
                        }`}
                      >
                        {t.cart.simulateFailure}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#E5484D]/12 border border-[#E5484D]/40 text-xs text-[#B42328] dark:text-[#FCA5A5] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {groups.length > 0 && !checkoutDone && (
          <div className="p-5 border-t border-[var(--dropp-border)] bg-[var(--dropp-bg)] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--dropp-muted)]">{t.cart.grandTotal}</span>
              <span className="text-xl font-bold text-[var(--dropp-text)] tabular-nums">
                {formatFcfa(grandTotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>{isProcessing ? t.cart.processingBtn : t.cart.payNowBtn}</span>
            </button>
            <p className="text-[11px] text-[var(--dropp-muted)] text-center">{t.cart.escrowNotice}</p>
          </div>
        )}
      </div>
    </div>
  );
};
