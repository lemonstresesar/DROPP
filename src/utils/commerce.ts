import type {
  DisputeRecord,
  FeedPost,
  LocalCartPreviewItem,
  MarketplaceCategory,
  MarketSortOption,
  OrderRecord,
  PaymentMethod,
  ShopProfile,
  VendorCartGroup,
} from '../types/dropp';

export const REFERRAL_BONUS_FCFA = 500;
export const DEFAULT_COMMISSION_PERCENT = 5;
export const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function computeCommissionSplit(
  subtotalFcfa: number,
  shippingFeeFcfa: number,
  commissionPercent: number = DEFAULT_COMMISSION_PERCENT
): {
  commissionRatePercent: number;
  commissionFcfa: number;
  netVendorFcfa: number;
} {
  const safeRate = Math.max(0, Math.min(30, Number.isFinite(commissionPercent) ? commissionPercent : DEFAULT_COMMISSION_PERCENT));
  const safeSubtotal = Math.max(0, Math.round(subtotalFcfa));
  const safeShipping = Math.max(0, Math.round(shippingFeeFcfa));
  const commissionFcfa = Math.round((safeSubtotal * safeRate) / 100);
  const netVendorFcfa = Math.max(0, safeSubtotal + safeShipping - commissionFcfa);
  return {
    commissionRatePercent: safeRate,
    commissionFcfa,
    netVendorFcfa,
  };
}

/**
 * Tiered Cameroon shipping rules:
 * - Free shipping from 150 000 FCFA subtotal per vendor
 * - Same city (Douala->Douala or Yaounde->Yaounde): 1 500 FCFA (< 50 000) or 2 000 FCFA (>= 50 000)
 * - Inter-city / other cities: 2 500 FCFA (< 50 000) or 3 500 FCFA (>= 50 000)
 */
export function calculateVendorShippingFcfa(
  subtotalFcfa: number,
  shopCity: string,
  deliveryCity: string
): number {
  if (subtotalFcfa <= 0) return 0;
  if (subtotalFcfa >= 150000) return 0;
  const sameCity =
    shopCity.trim().toLowerCase() === deliveryCity.trim().toLowerCase();
  if (sameCity) {
    return subtotalFcfa >= 50000 ? 2000 : 1500;
  }
  return subtotalFcfa >= 50000 ? 3500 : 2500;
}

export function groupCartByVendor(
  items: LocalCartPreviewItem[],
  shops: ShopProfile[],
  deliveryCity: string
): VendorCartGroup[] {
  const map = new Map<string, LocalCartPreviewItem[]>();
  for (const item of items) {
    const list = map.get(item.shopId) || [];
    list.push(item);
    map.set(item.shopId, list);
  }

  const groups: VendorCartGroup[] = [];
  for (const [shopId, vendorItems] of map.entries()) {
    const shop = shops.find((s) => s.shopId === shopId);
    const shopCity = vendorItems[0]?.shopCity || shop?.city || 'Douala';
    const shopName = vendorItems[0]?.shopName || shop?.name || shopId;
    const subtotalFcfa = vendorItems.reduce(
      (sum, item) => sum + item.unitPriceFcfa * item.qty,
      0
    );
    const shippingFeeFcfa = calculateVendorShippingFcfa(
      subtotalFcfa,
      shopCity,
      deliveryCity
    );
    groups.push({
      shopId,
      shopName,
      shopCity,
      items: vendorItems,
      subtotalFcfa,
      shippingFeeFcfa,
      totalFcfa: subtotalFcfa + shippingFeeFcfa,
    });
  }
  return groups;
}

export interface CheckoutInput {
  idempotencyKey: string;
  processedKeys: string[];
  buyerId: string;
  buyerName: string;
  groups: VendorCartGroup[];
  paymentMethod: PaymentMethod;
  walletBalanceFcfa: number;
  simulateMobileSuccess: boolean;
  deliveryCity: string;
  deliveryNeighborhood: string;
  deliveryPhone: string;
  nowIso?: string;
}

export interface CheckoutResult {
  ok: boolean;
  reason?: 'duplicate_attempt' | 'empty_cart' | 'insufficient_wallet' | 'mobile_payment_failed' | 'invalid_address';
  newOrders: OrderRecord[];
  walletDeltaFcfa: number;
  escrowDeltaFcfa: number;
  globalOrderId?: string;
}

export function processMultiVendorCheckout(input: CheckoutInput): CheckoutResult {
  if (input.processedKeys.includes(input.idempotencyKey)) {
    return {
      ok: false,
      reason: 'duplicate_attempt',
      newOrders: [],
      walletDeltaFcfa: 0,
      escrowDeltaFcfa: 0,
    };
  }
  if (input.groups.length === 0) {
    return {
      ok: false,
      reason: 'empty_cart',
      newOrders: [],
      walletDeltaFcfa: 0,
      escrowDeltaFcfa: 0,
    };
  }
  if (
    !input.deliveryCity.trim() ||
    !input.deliveryNeighborhood.trim() ||
    input.deliveryPhone.trim().length < 8
  ) {
    return {
      ok: false,
      reason: 'invalid_address',
      newOrders: [],
      walletDeltaFcfa: 0,
      escrowDeltaFcfa: 0,
    };
  }

  const grandTotal = input.groups.reduce((s, g) => s + g.totalFcfa, 0);
  if (input.paymentMethod === 'wallet' && input.walletBalanceFcfa < grandTotal) {
    return {
      ok: false,
      reason: 'insufficient_wallet',
      newOrders: [],
      walletDeltaFcfa: 0,
      escrowDeltaFcfa: 0,
    };
  }

  const nowIso = input.nowIso || new Date().toISOString();
  const globalOrderId = `GLB-${Date.now().toString().slice(-6)}`;

  if (input.paymentMethod !== 'wallet' && !input.simulateMobileSuccess) {
    const failedOrders: OrderRecord[] = input.groups.map((g, idx) => ({
      orderId: `CMD-${Date.now().toString().slice(-5)}-${idx + 1}`,
      globalOrderId,
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      shopId: g.shopId,
      shopName: g.shopName,
      items: g.items,
      subtotalFcfa: g.subtotalFcfa,
      shippingFeeFcfa: g.shippingFeeFcfa,
      totalFcfa: g.totalFcfa,
      paymentMethod: input.paymentMethod,
      isSimulatedPayment: true,
      escrowStatus: 'held',
      status: 'awaiting_payment',
      deliveryCity: input.deliveryCity.trim(),
      deliveryNeighborhood: input.deliveryNeighborhood.trim(),
      deliveryPhone: input.deliveryPhone.trim(),
      createdAt: nowIso,
      idempotencyKey: input.idempotencyKey,
    }));
    return {
      ok: false,
      reason: 'mobile_payment_failed',
      newOrders: failedOrders,
      walletDeltaFcfa: 0,
      escrowDeltaFcfa: 0,
      globalOrderId,
    };
  }

  const newOrders: OrderRecord[] = input.groups.map((g, idx) => ({
    orderId: `CMD-${Date.now().toString().slice(-5)}-${idx + 1}`,
    globalOrderId,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    shopId: g.shopId,
    shopName: g.shopName,
    items: g.items,
    subtotalFcfa: g.subtotalFcfa,
    shippingFeeFcfa: g.shippingFeeFcfa,
    totalFcfa: g.totalFcfa,
    paymentMethod: input.paymentMethod,
    isSimulatedPayment: true,
    escrowStatus: 'held',
    status: 'pending',
    deliveryCity: input.deliveryCity.trim(),
    deliveryNeighborhood: input.deliveryNeighborhood.trim(),
    deliveryPhone: input.deliveryPhone.trim(),
    createdAt: nowIso,
    idempotencyKey: input.idempotencyKey,
  }));

  return {
    ok: true,
    newOrders,
    walletDeltaFcfa: input.paymentMethod === 'wallet' ? -grandTotal : 0,
    escrowDeltaFcfa: grandTotal,
    globalOrderId,
  };
}

export function canBuyerCancelOrder(order: OrderRecord): boolean {
  return order.status === 'pending' || order.status === 'awaiting_payment';
}

export function canBuyerDisputeOrder(
  order: OrderRecord,
  nowMs: number = Date.now()
): boolean {
  if (order.status !== 'delivered' || order.escrowStatus !== 'held') return false;
  if (!order.deliveredAt) return true;
  const deliveredMs = new Date(order.deliveredAt).getTime();
  if (Number.isNaN(deliveredMs)) return true;
  return nowMs - deliveredMs <= DISPUTE_WINDOW_MS;
}

export function resolveEscrowOnDispute(
  dispute: DisputeRecord,
  decision: 'resolved_buyer' | 'resolved_vendor'
): {
  escrowStatus: 'refunded' | 'released';
  orderStatus: 'cancelled' | 'delivered';
  buyerWalletCreditFcfa: number;
  escrowReleaseFcfa: number;
} {
  if (decision === 'resolved_buyer') {
    return {
      escrowStatus: 'refunded',
      orderStatus: 'cancelled',
      buyerWalletCreditFcfa: dispute.amountHeldFcfa,
      escrowReleaseFcfa: dispute.amountHeldFcfa,
    };
  }
  return {
    escrowStatus: 'released',
    orderStatus: 'delivered',
    buyerWalletCreditFcfa: 0,
    escrowReleaseFcfa: dispute.amountHeldFcfa,
  };
}

export function qualifiesForReferralReward(params: {
  referredByCode?: string;
  hasCompletedFirstOrder?: boolean;
  orderStatus: OrderRecord['status'];
}): boolean {
  return (
    Boolean(params.referredByCode && params.referredByCode.startsWith('DROPP-')) &&
    !params.hasCompletedFirstOrder &&
    params.orderStatus === 'delivered'
  );
}

export interface MarketFilterParams {
  query: string;
  category: 'ALL' | MarketplaceCategory;
  city: 'ALL' | 'Douala' | 'Yaoundé';
  neighborhood: string;
  certifiedOnly: boolean;
  minPriceFcfa: number | null;
  maxPriceFcfa: number | null;
  maxMoq: number | null;
  minRating: number;
  sortBy: MarketSortOption;
  likedIds: string[];
  recentlyViewedIds: string[];
}

export function filterAndSortMarketPosts(
  posts: FeedPost[],
  params: MarketFilterParams
): FeedPost[] {
  const q = params.query.trim().toLowerCase();
  const likedCategories = new Set(
    posts
      .filter((p) => params.likedIds.includes(p.postId) || params.recentlyViewedIds.includes(p.postId))
      .map((p) => p.category)
  );

  const filtered = posts.filter((p) => {
    if (p.status !== 'published') return false;
    if (params.category !== 'ALL' && p.category !== params.category) return false;
    if (params.city !== 'ALL' && p.city !== params.city) return false;
    if (
      params.neighborhood !== 'ALL' &&
      !p.neighborhood.toLowerCase().includes(params.neighborhood.toLowerCase())
    ) {
      return false;
    }
    if (params.certifiedOnly && !p.shopCertified) return false;
    if (params.minPriceFcfa !== null && p.priceFcfa < params.minPriceFcfa) return false;
    if (params.maxPriceFcfa !== null && p.priceFcfa > params.maxPriceFcfa) return false;
    if (params.maxMoq !== null && p.moq > params.maxMoq) return false;
    if (params.minRating > 0 && p.rating < params.minRating) return false;
    if (
      q &&
      !p.title.toLowerCase().includes(q) &&
      !p.description.toLowerCase().includes(q) &&
      !p.shopName.toLowerCase().includes(q) &&
      !p.city.toLowerCase().includes(q) &&
      !p.neighborhood.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (params.sortBy === 'price_asc') return a.priceFcfa - b.priceFcfa;
    if (params.sortBy === 'price_desc') return b.priceFcfa - a.priceFcfa;
    if (params.sortBy === 'rating_desc') return b.rating - a.rating || b.likesCount - a.likesCount;
    if (params.sortBy === 'moq_asc') return a.moq - b.moq || a.priceFcfa - b.priceFcfa;
    if (params.sortBy === 'popular') return b.likesCount - a.likesCount;

    const scoreA =
      (likedCategories.has(a.category) ? 2000 : 0) +
      (a.shopCertified ? 600 : 0) +
      a.likesCount;
    const scoreB =
      (likedCategories.has(b.category) ? 2000 : 0) +
      (b.shopCertified ? 600 : 0) +
      b.likesCount;
    return scoreB - scoreA;
  });

  return sorted;
}
