import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFcfa, formatCompactCount, getUnitPriceForQty } from './formatters';
import { buildCloudinaryMediaUrl } from './cloudinary';
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
  filterAndSortMarketPosts,
  groupCartByVendor,
  processMultiVendorCheckout,
  qualifiesForReferralReward,
  resolveEscrowOnDispute,
} from './commerce';
import type { FeedPost, LocalCartPreviewItem, OrderRecord, ShopProfile } from '../types/dropp';

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
      posterUrl: '/x.jpg',
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
      posterUrl: '/y.jpg',
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

  // Insufficient wallet
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

  // Successful wallet checkout
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

  // Double-debit idempotency check
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

  // Simulated Mobile Money failure creates awaiting_payment orders with 0 debit
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
