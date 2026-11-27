import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFcfa, formatCompactCount, getUnitPriceForQty } from './formatters';
import { buildCloudinaryMediaUrl } from './cloudinary';
import { buildDroppPath, parseDroppRoute, routeToNavTab } from './routing';
import {
  canQueueActionOffline,
  enqueueOfflineAction,
  markQueuedActionStatus,
  getRetryableActions,
} from './offlineQueue';
import {
  calculateVendorShippingFcfa,
  canBuyerCancelOrder,
  canBuyerDisputeOrder,
  computeCommissionSplit,
  filterAndSortMarketPosts,
  groupCartByVendor,
  processMultiVendorCheckout,
  qualifiesForReferralReward,
  resolveEscrowOnDispute,
} from './commerce';
import {
  canAccessAdmin,
  canBuy,
  canCreateRfq,
  canLikeAndComment,
  canManageOwnSalesOrders,
  canModerate,
  canPublishPostOrStory,
  canRequestVendorKyc,
  canRespondToRfq,
  canUseWalletAndReferral,
  canViewFeedAndMarket,
  canViewOwnSalesOrders,
} from './permissions';
import type { FeedPost, LocalCartPreviewItem, OrderRecord, ShopProfile, UserSession } from '../types/dropp';

test('formatFcfa formats Cameroonian currency with spaces and FCFA suffix', () => {
  assert.equal(formatFcfa(12500), '12 500 FCFA');
  assert.equal(formatFcfa(100000), '100 000 FCFA');
  assert.equal(formatFcfa(500), '500 FCFA');
  assert.equal(formatFcfa(-50), '0 FCFA');
});

test('formatCompactCount formats counts cleanly in French and English', () => {
  assert.equal(formatCompactCount(840, 'fr'), '840');
  assert.equal(formatCompactCount(14200, 'fr'), '14,2 k');
  assert.equal(formatCompactCount(14200, 'en'), '14.2K');
});

test('getUnitPriceForQty resolves wholesale price tiers and variant delta', () => {
  const tiers = [
    { minQty: 1, maxQty: 9, unitPriceFcfa: 15000 },
    { minQty: 10, maxQty: 49, unitPriceFcfa: 12500 },
    { minQty: 50, maxQty: null, unitPriceFcfa: 10000 },
  ];
  assert.equal(getUnitPriceForQty(tiers, 2, 15000), 15000);
  assert.equal(getUnitPriceForQty(tiers, 10, 15000), 12500);
  assert.equal(getUnitPriceForQty(tiers, 60, 15000, 500), 10500);
});

test('buildCloudinaryMediaUrl caps to 480p on slow/data-saver and 720p max on 4g, passing local demo paths through', () => {
  const demo = '/videos/wax.mp4';
  assert.equal(buildCloudinaryMediaUrl(demo, { dataSaver: true, effectiveType: '3g' }), demo);

  const cloud = 'https://res.cloudinary.com/demo/video/upload/v123/sample.mp4';
  assert.equal(
    buildCloudinaryMediaUrl(cloud, { dataSaver: true, effectiveType: '4g' }),
    'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto:eco,h_480,c_limit/v123/sample.mp4'
  );
  assert.equal(
    buildCloudinaryMediaUrl(cloud, { dataSaver: false, effectiveType: '3g' }),
    'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto:good,h_480,c_limit/v123/sample.mp4'
  );
  assert.equal(
    buildCloudinaryMediaUrl(cloud, { dataSaver: false, effectiveType: '4g' }),
    'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto:good,h_720,c_limit/v123/sample.mp4'
  );
});

test('routing utility parses and builds all canonical DROPP routes cleanly', () => {
  assert.deepEqual(parseDroppRoute('/', ''), { route: 'feed', shopId: null, postId: null });
  assert.deepEqual(parseDroppRoute('/', '?post=post-03'), { route: 'feed', shopId: null, postId: 'post-03' });
  assert.deepEqual(parseDroppRoute('/marche/', ''), { route: 'market', shopId: null, postId: null });
  assert.deepEqual(parseDroppRoute('/messages', ''), { route: 'messages', shopId: null, postId: null });
  assert.deepEqual(parseDroppRoute('/profil', ''), { route: 'profile', shopId: null, postId: null });
  assert.deepEqual(parseDroppRoute('/admin', ''), { route: 'admin', shopId: null, postId: null });
  assert.deepEqual(parseDroppRoute('/vendeur', ''), { route: 'vendor', shopId: null, postId: null });
  assert.deepEqual(parseDroppRoute('/boutique/shop-akwa-mode/', ''), {
    route: 'shop',
    shopId: 'shop-akwa-mode',
    postId: null,
  });

  assert.equal(buildDroppPath({ route: 'market' }), '/marche');
  assert.equal(buildDroppPath({ route: 'shop', shopId: 'shop-1' }), '/boutique/shop-1');
  assert.equal(buildDroppPath({ route: 'feed', postId: 'post-01' }), '/?post=post-01');
  assert.equal(routeToNavTab('admin'), 'profile');
  assert.equal(routeToNavTab('market'), 'market');
});

test('computeCommissionSplit computes platform fee and net vendor payout cleanly', () => {
  const split = computeCommissionSplit(100000, 3500, 5);
  assert.equal(split.commissionRatePercent, 5);
  assert.equal(split.commissionFcfa, 5000);
  assert.equal(split.netVendorFcfa, 98500);

  const zeroCap = computeCommissionSplit(50000, 1500, 50);
  assert.equal(zeroCap.commissionRatePercent, 30);
  assert.equal(zeroCap.commissionFcfa, 15000);
});

test('offlineQueue blocks offline order/payment actions and deduplicates pending toggles', () => {
  assert.equal(canQueueActionOffline('order_create'), false);
  assert.equal(canQueueActionOffline('payment_confirm'), false);
  assert.equal(canQueueActionOffline('like_toggle'), true);

  let q = enqueueOfflineAction([], {
    id: 'a1',
    type: 'like_toggle',
    targetId: 'post-1',
    payload: { liked: true },
    createdAt: 100,
  });
  q = enqueueOfflineAction(q, {
    id: 'a2',
    type: 'like_toggle',
    targetId: 'post-1',
    payload: { liked: false },
    createdAt: 200,
  });
  assert.equal(q.length, 1);
  assert.equal(q[0].id, 'a2');

  q = markQueuedActionStatus(q, 'a2', 'failed');
  assert.equal(q[0].attempts, 1);
  assert.equal(getRetryableActions(q).length, 1);

  q = markQueuedActionStatus(q, 'a2', 'sent');
  assert.equal(getRetryableActions(q).length, 0);
});

test('multi-vendor cart grouping calculates per-vendor subtotals and Cameroon tiered shipping', () => {
  assert.equal(calculateVendorShippingFcfa(30000, 'Douala', 'Douala'), 1500);
  assert.equal(calculateVendorShippingFcfa(60000, 'Douala', 'Yaoundé'), 3500);
  assert.equal(calculateVendorShippingFcfa(160000, 'Douala', 'Yaoundé'), 0);

  const shops = [
    { shopId: 's1', name: 'Boutique Akwa', city: 'Douala' },
    { shopId: 's2', name: 'Boutique Bastos', city: 'Yaoundé' },
  ] as ShopProfile[];

  const items: LocalCartPreviewItem[] = [
    {
      postId: 'p1',
      shopId: 's1',
      shopName: 'Boutique Akwa',
      shopCity: 'Douala',
      title: 'Wax',
      variantId: 'v1',
      variantLabel: 'M',
      qty: 2,
      unitPriceFcfa: 15000,
      posterUrl: '/x.webp',
    },
    {
      postId: 'p2',
      shopId: 's2',
      shopName: 'Boutique Bastos',
      shopCity: 'Yaoundé',
      title: 'Écouteurs',
      variantId: 'v1',
      variantLabel: 'Noir',
      qty: 5,
      unitPriceFcfa: 12000,
      posterUrl: '/y.webp',
    },
  ];

  const groups = groupCartByVendor(items, shops, 'Douala');
  assert.equal(groups.length, 2);
  assert.equal(groups[0].subtotalFcfa, 30000);
  assert.equal(groups[0].shippingFeeFcfa, 1500);
  assert.equal(groups[1].subtotalFcfa, 60000);
  assert.equal(groups[1].shippingFeeFcfa, 3500);
});

test('checkout splits global order into sub-orders, enforces escrow, and prevents double debit', () => {
  const groups = [
    {
      shopId: 's1',
      shopName: 'Boutique Akwa',
      shopCity: 'Douala',
      items: [],
      subtotalFcfa: 30000,
      shippingFeeFcfa: 1500,
      totalFcfa: 31500,
    },
    {
      shopId: 's2',
      shopName: 'Boutique Bastos',
      shopCity: 'Yaoundé',
      items: [],
      subtotalFcfa: 60000,
      shippingFeeFcfa: 3500,
      totalFcfa: 63500,
    },
  ];

  const failWallet = processMultiVendorCheckout({
    idempotencyKey: 'key-1',
    processedKeys: [],
    buyerId: 'u1',
    buyerName: 'Client',
    groups,
    paymentMethod: 'wallet',
    walletBalanceFcfa: 50000,
    simulateMobileSuccess: true,
    deliveryCity: 'Douala',
    deliveryNeighborhood: 'Akwa',
    deliveryPhone: '677001122',
  });
  assert.equal(failWallet.ok, false);
  assert.equal(failWallet.reason, 'insufficient_wallet');

  const successWallet = processMultiVendorCheckout({
    idempotencyKey: 'key-2',
    processedKeys: [],
    buyerId: 'u1',
    buyerName: 'Client',
    groups,
    paymentMethod: 'wallet',
    walletBalanceFcfa: 100000,
    simulateMobileSuccess: true,
    deliveryCity: 'Douala',
    deliveryNeighborhood: 'Akwa',
    deliveryPhone: '677001122',
  });
  assert.equal(successWallet.ok, true);
  assert.equal(successWallet.newOrders.length, 2);
  assert.equal(successWallet.walletDeltaFcfa, -95000);
  assert.equal(successWallet.escrowDeltaFcfa, 95000);

  const duplicate = processMultiVendorCheckout({
    idempotencyKey: 'key-2',
    processedKeys: ['key-2'],
    buyerId: 'u1',
    buyerName: 'Client',
    groups,
    paymentMethod: 'wallet',
    walletBalanceFcfa: 100000,
    simulateMobileSuccess: true,
    deliveryCity: 'Douala',
    deliveryNeighborhood: 'Akwa',
    deliveryPhone: '677001122',
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, 'duplicate_attempt');

  const momoFail = processMultiVendorCheckout({
    idempotencyKey: 'key-3',
    processedKeys: [],
    buyerId: 'u1',
    buyerName: 'Client',
    groups,
    paymentMethod: 'mtn_momo',
    walletBalanceFcfa: 0,
    simulateMobileSuccess: false,
    deliveryCity: 'Douala',
    deliveryNeighborhood: 'Akwa',
    deliveryPhone: '677001122',
  });
  assert.equal(momoFail.ok, false);
  assert.equal(momoFail.reason, 'mobile_payment_failed');
  assert.equal(momoFail.newOrders[0].status, 'awaiting_payment');
  assert.equal(momoFail.walletDeltaFcfa, 0);
});

test('order cancellation, 24h dispute window, escrow dispute resolution, and 500 FCFA referral bonus', () => {
  const pendingOrder = {
    orderId: 'CMD-1',
    status: 'pending',
    escrowStatus: 'held',
  } as OrderRecord;
  assert.equal(canBuyerCancelOrder(pendingOrder), true);

  const confirmedOrder = { ...pendingOrder, status: 'confirmed' } as OrderRecord;
  assert.equal(canBuyerCancelOrder(confirmedOrder), false);

  const now = Date.parse('2026-11-26T12:00:00Z');
  const recentDelivered = {
    orderId: 'CMD-2',
    status: 'delivered',
    escrowStatus: 'held',
    deliveredAt: '2026-11-26T02:00:00Z',
  } as OrderRecord;
  const expiredDelivered = {
    ...recentDelivered,
    deliveredAt: '2026-11-24T10:00:00Z',
  } as OrderRecord;
  assert.equal(canBuyerDisputeOrder(recentDelivered, now), true);
  assert.equal(canBuyerDisputeOrder(expiredDelivered, now), false);

  const buyerRefund = resolveEscrowOnDispute(
    {
      disputeId: 'LIT-1',
      orderId: 'CMD-2',
      buyerId: 'u1',
      buyerName: 'Client',
      shopId: 's1',
      shopName: 'Shop',
      reason: 'Défectueux',
      amountHeldFcfa: 37000,
      status: 'open',
      createdAt: '2026-11-26T10:00:00Z',
    },
    'resolved_buyer'
  );
  assert.equal(buyerRefund.escrowStatus, 'refunded');
  assert.equal(buyerRefund.buyerWalletCreditFcfa, 37000);

  assert.equal(
    qualifiesForReferralReward({
      referredByCode: 'DROPP-AKWA1',
      hasCompletedFirstOrder: false,
      orderStatus: 'delivered',
    }),
    true
  );
  assert.equal(
    qualifiesForReferralReward({
      referredByCode: 'DROPP-AKWA1',
      hasCompletedFirstOrder: true,
      orderStatus: 'delivered',
    }),
    false
  );
});

test('market filterAndSortMarketPosts filters by price/moq/neighborhood and boosts liked categories', () => {
  const samplePosts = [
    {
      postId: 'p1',
      title: 'Wax Douala',
      description: 'Tissu',
      shopName: 'Akwa',
      shopCertified: true,
      city: 'Douala',
      neighborhood: 'Akwa',
      category: 'Mode',
      priceFcfa: 25000,
      moq: 5,
      rating: 4.9,
      likesCount: 100,
      status: 'published',
    },
    {
      postId: 'p2',
      title: 'Écouteurs Yaoundé',
      description: 'Audio',
      shopName: 'Bastos Tech',
      shopCertified: false,
      city: 'Yaoundé',
      neighborhood: 'Bastos',
      category: 'Électronique',
      priceFcfa: 15000,
      moq: 10,
      rating: 4.6,
      likesCount: 300,
      status: 'published',
    },
  ] as FeedPost[];

  const recommended = filterAndSortMarketPosts(samplePosts, {
    query: '',
    category: 'ALL',
    city: 'ALL',
    neighborhood: 'ALL',
    certifiedOnly: false,
    minPriceFcfa: null,
    maxPriceFcfa: null,
    maxMoq: null,
    minRating: 0,
    sortBy: 'recommended',
    likedIds: ['p1'],
    recentlyViewedIds: [],
  });
  assert.equal(recommended[0].postId, 'p1');

  const filteredMoq = filterAndSortMarketPosts(samplePosts, {
    query: '',
    category: 'ALL',
    city: 'ALL',
    neighborhood: 'ALL',
    certifiedOnly: false,
    minPriceFcfa: null,
    maxPriceFcfa: 20000,
    maxMoq: 10,
    minRating: 4.5,
    sortBy: 'price_asc',
    likedIds: [],
    recentlyViewedIds: [],
  });
  assert.equal(filteredMoq.length, 1);
  assert.equal(filteredMoq[0].postId, 'p2');
});

test('permissions matrix strictly enforces rights across visitor, client, pending, approved, suspended, and admin', () => {
  const makeSession = (patch: Partial<UserSession>): UserSession => ({
    uid: 'u-1',
    email: 'u1@example.com',
    displayName: 'User',
    role: 'client',
    vendorStatus: 'none',
    isCertified: false,
    city: 'Douala',
    neighborhood: 'Akwa',
    walletBalanceFcfa: 0,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-U1',
    emailVerified: true,
    ...patch,
  });

  const visitor = null;
  const client = makeSession({ role: 'client', vendorStatus: 'none' });
  const pendingVendor = makeSession({ role: 'vendor', vendorStatus: 'pending' });
  const approvedVendor = makeSession({ role: 'vendor', vendorStatus: 'approved', shopId: 'shop-1' });
  const suspendedVendor = makeSession({ role: 'vendor', vendorStatus: 'suspended', shopId: 'shop-1' });
  const admin = makeSession({ role: 'admin', vendorStatus: 'none', shopId: undefined });

  for (const s of [visitor, client, pendingVendor, approvedVendor, suspendedVendor, admin]) {
    assert.equal(canViewFeedAndMarket(s), true);
  }

  assert.equal(canLikeAndComment(visitor), false);
  assert.equal(canLikeAndComment(client), true);
  assert.equal(canLikeAndComment(pendingVendor), true);
  assert.equal(canLikeAndComment(approvedVendor), true);
  assert.equal(canLikeAndComment(suspendedVendor), false);
  assert.equal(canLikeAndComment(admin), false);
  assert.equal(canModerate(admin), true);
  assert.equal(canModerate(approvedVendor), false);

  assert.equal(canBuy(visitor), false);
  assert.equal(canBuy(client), true);
  assert.equal(canBuy(pendingVendor), true);
  assert.equal(canBuy(approvedVendor), true);
  assert.equal(canBuy(suspendedVendor), false);
  assert.equal(canBuy(admin), false);
  assert.equal(canCreateRfq(admin), false);
  assert.equal(canCreateRfq(suspendedVendor), false);

  assert.equal(canPublishPostOrStory(visitor), false);
  assert.equal(canPublishPostOrStory(client), false);
  assert.equal(canPublishPostOrStory(pendingVendor), false);
  assert.equal(canPublishPostOrStory(approvedVendor), true);
  assert.equal(canPublishPostOrStory(suspendedVendor), false);
  assert.equal(canPublishPostOrStory(admin), false);
  assert.equal(canRespondToRfq(approvedVendor), true);
  assert.equal(canRespondToRfq(admin), false);
  assert.equal(canRespondToRfq(suspendedVendor), false);

  assert.equal(canViewOwnSalesOrders(approvedVendor), true);
  assert.equal(canManageOwnSalesOrders(approvedVendor), true);
  assert.equal(canViewOwnSalesOrders(suspendedVendor), true);
  assert.equal(canManageOwnSalesOrders(suspendedVendor), false);
  assert.equal(canViewOwnSalesOrders(admin), false);

  assert.equal(canRequestVendorKyc(visitor), false);
  assert.equal(canRequestVendorKyc(client), true);
  assert.equal(canRequestVendorKyc(pendingVendor), false);
  assert.equal(canRequestVendorKyc(approvedVendor), false);
  assert.equal(canRequestVendorKyc(suspendedVendor), false);
  assert.equal(canRequestVendorKyc(admin), false);

  assert.equal(canAccessAdmin(admin), true);
  assert.equal(canAccessAdmin(client), false);
  assert.equal(canUseWalletAndReferral(admin), false);
  assert.equal(canUseWalletAndReferral(client), true);
  assert.equal(canUseWalletAndReferral(approvedVendor), true);
});
