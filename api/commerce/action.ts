import { Timestamp } from 'firebase-admin/firestore';
import {
  AuthError,
  ServerConfigError,
  assertVerifiedSession,
  extractBearerToken,
  getAdminFirestore,
  resolveAuthoritativeSession,
} from '../_lib/droppAuth.js';
import {
  REFERRAL_BONUS_FCFA,
  calculateVendorShippingFcfa,
  computeCommissionSplit,
  qualifiesForReferralReward,
} from '../../src/utils/commerce.js';
import { getUnitPriceForQty } from '../../src/utils/formatters.js';

interface CheckoutItemInput {
  postId: string;
  variantId?: string;
  qty: number;
  isSample?: boolean;
  acceptedOfferId?: string;
  conversationId?: string;
  rfqId?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const action = String(body.action || '');
    const db = getAdminFirestore();
    const now = Timestamp.now();

    if (action === 'apply_referral') {
      const session = await resolveAuthoritativeSession(token);
      if (session.role === 'admin' || session.vendorStatus === 'suspended') {
        res.status(403).json({ error: 'Votre compte ne peut pas appliquer de parrainage.' });
        return;
      }
      const code = String(body.referralCode || '').trim().toUpperCase();
      if (!code.startsWith('DROPP-') || code.length < 7) {
        res.status(400).json({ error: 'Code parrain invalide (format DROPP-XXXX).' });
        return;
      }
      if (code === session.referralCode) {
        res.status(400).json({ error: 'Vous ne pouvez pas utiliser votre propre code parrain.' });
        return;
      }

      const referrerSnap = await db.collection('users').where('referralCode', '==', code).limit(1).get();
      if (referrerSnap.empty) {
        res.status(404).json({ error: 'Code parrain introuvable.' });
        return;
      }

      await db.collection('users').doc(session.uid).set(
        {
          referredByCode: code,
          updatedAt: now,
        },
        { merge: true }
      );
      res.status(200).json({ ok: true, referredByCode: code });
      return;
    }

    // All remaining actions modify orders, escrow, wallets, or disputes -> verified email required
    const session = await assertVerifiedSession(token);
    if (session.vendorStatus === 'suspended' && action !== 'vendor_order_status') {
      res.status(403).json({ error: 'Compte vendeur suspendu : action financière bloquée.' });
      return;
    }

    if (action === 'wallet_deposit') {
      if (session.role === 'admin') {
        res.status(403).json({ error: 'Le Super Admin n’a pas de portefeuille personnel.' });
        return;
      }
      const idempotencyKey = String(body.idempotencyKey || '').trim();
      const amountFcfa = Math.round(Number(body.amountFcfa ?? 0));
      const method = body.method === 'orange_money' ? 'orange_money' : 'mtn_momo';
      const phone = String(body.phone || '').trim();
      if (!idempotencyKey || amountFcfa < 500 || amountFcfa > 5000000 || phone.length < 8) {
        res.status(400).json({ error: 'Montant (min. 500 FCFA) ou numéro Mobile Money invalide.' });
        return;
      }

      const result = await db.runTransaction(async (tx) => {
        const keyRef = db.collection('idempotencyKeys').doc(`${session.uid}_${idempotencyKey}`);
        const keySnap = await tx.get(keyRef);
        if (keySnap.exists) {
          throw new AuthError('Opération déjà traitée (anti-doublon).', 409);
        }

        const walletRef = db.collection('wallets').doc(session.uid);
        const walletSnap = await tx.get(walletRef);
        const currentAvail = Number(walletSnap.data()?.availableFcfa ?? 0);
        const nextAvail = currentAvail + amountFcfa;

        tx.set(keyRef, {
          uid: session.uid,
          action: 'wallet_deposit',
          amountFcfa,
          createdAt: now,
        });
        tx.set(
          walletRef,
          {
            userId: session.uid,
            availableFcfa: nextAvail,
            pendingFcfa: Number(walletSnap.data()?.pendingFcfa ?? 0),
            referralFcfa: Number(walletSnap.data()?.referralFcfa ?? 0),
            updatedAt: now,
          },
          { merge: true }
        );

        const txId = `TX-DEP-${Date.now()}`;
        tx.set(db.collection('walletTransactions').doc(txId), {
          txId,
          userId: session.uid,
          type: 'deposit',
          amountFcfa,
          methodLabel: `${method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} (Simulation · ${phone})`,
          referenceId: idempotencyKey,
          status: 'completed',
          isSimulated: true,
          createdAt: now,
        });

        return { availableFcfa: nextAvail, txId };
      });

      res.status(200).json({ ok: true, ...result });
      return;
    }

    if (action === 'wallet_withdraw') {
      if (session.role === 'admin') {
        res.status(403).json({ error: 'Le Super Admin n’a pas de portefeuille personnel.' });
        return;
      }
      const idempotencyKey = String(body.idempotencyKey || '').trim();
      const amountFcfa = Math.round(Number(body.amountFcfa ?? 0));
      const method = body.method === 'orange_money' ? 'orange_money' : 'mtn_momo';
      const phone = String(body.phone || '').trim();
      if (!idempotencyKey || amountFcfa < 1000 || phone.length < 8) {
        res.status(400).json({ error: 'Retrait minimum 1 000 FCFA avec numéro valide requis.' });
        return;
      }

      const result = await db.runTransaction(async (tx) => {
        const keyRef = db.collection('idempotencyKeys').doc(`${session.uid}_${idempotencyKey}`);
        const keySnap = await tx.get(keyRef);
        if (keySnap.exists) {
          throw new AuthError('Demande de retrait déjà enregistrée (anti-doublon).', 409);
        }

        const walletRef = db.collection('wallets').doc(session.uid);
        const walletSnap = await tx.get(walletRef);
        const currentAvail = Number(walletSnap.data()?.availableFcfa ?? 0);
        if (currentAvail < amountFcfa) {
          throw new AuthError('Solde disponible insuffisant pour ce retrait.', 400);
        }

        const nextAvail = currentAvail - amountFcfa;
        const requestId = `WDR-${Date.now().toString().slice(-6)}`;
        const txId = `TX-WDR-${Date.now()}`;

        tx.set(keyRef, {
          uid: session.uid,
          action: 'wallet_withdraw',
          requestId,
          createdAt: now,
        });
        tx.set(
          walletRef,
          {
            userId: session.uid,
            availableFcfa: nextAvail,
            updatedAt: now,
          },
          { merge: true }
        );
        tx.set(db.collection('withdrawalRequests').doc(requestId), {
          requestId,
          userId: session.uid,
          userName: session.displayName,
          userEmail: session.email,
          amountFcfa,
          method,
          phone,
          status: 'pending',
          createdAt: now,
        });
        tx.set(db.collection('walletTransactions').doc(txId), {
          txId,
          userId: session.uid,
          type: 'withdrawal',
          amountFcfa: -amountFcfa,
          methodLabel: `${method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} (Simulation · ${phone})`,
          referenceId: requestId,
          status: 'completed',
          isSimulated: true,
          createdAt: now,
        });

        return { requestId, availableFcfa: nextAvail };
      });

      res.status(200).json({ ok: true, ...result });
      return;
    }

    if (action === 'checkout') {
      if (session.role === 'admin') {
        res.status(403).json({ error: 'Le Super Admin modère la plateforme et ne passe pas de commande.' });
        return;
      }

      const idempotencyKey = String(body.idempotencyKey || '').trim();
      const rawItems = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [];
      const paymentMethod =
        body.paymentMethod === 'wallet'
          ? 'wallet'
          : body.paymentMethod === 'orange_money'
            ? 'orange_money'
            : 'mtn_momo';
      const simulateMobileSuccess = body.simulateMobileSuccess !== false;
      const deliveryCity = String(body.deliveryCity || '').trim();
      const deliveryNeighborhood = String(body.deliveryNeighborhood || '').trim();
      const deliveryPhone = String(body.deliveryPhone || '').trim();

      if (!idempotencyKey || rawItems.length === 0) {
        res.status(400).json({ error: 'Panier vide ou clé anti-doublon manquante.' });
        return;
      }
      if (!deliveryCity || !deliveryNeighborhood || deliveryPhone.length < 8) {
        res.status(400).json({ error: 'Ville, quartier et téléphone de livraison (≥ 8 chiffres) requis.' });
        return;
      }

      const outcome = await db.runTransaction(async (tx) => {
        const keyRef = db.collection('idempotencyKeys').doc(`${session.uid}_${idempotencyKey}`);
        const keySnap = await tx.get(keyRef);
        if (keySnap.exists) {
          throw new AuthError('Commande déjà enregistrée (protection anti-doublon).', 409);
        }

        const settingsSnap = await tx.get(db.collection('platformConfig').doc('settings'));
        const commissionPercent = Number(settingsSnap.data()?.commissionPercent ?? 5);

        // Fetch unique posts & shops from Firestore for authoritative price/status verification
        const uniquePostIds = Array.from(new Set(rawItems.map((i) => String(i.postId || '')).filter(Boolean)));
        const postDocs = await Promise.all(uniquePostIds.map((pid) => tx.get(db.collection('posts').doc(pid))));
        const postMap = new Map<string, Record<string, unknown>>();
        for (const snap of postDocs) {
          if (snap.exists) {
            postMap.set(snap.id, snap.data() as Record<string, unknown>);
          }
        }

        const uniqueShopIds = Array.from(
          new Set(
            Array.from(postMap.values())
              .map((p) => String(p.shopId || ''))
              .filter(Boolean)
          )
        );
        const shopDocs = await Promise.all(uniqueShopIds.map((sid) => tx.get(db.collection('shops').doc(sid))));
        const shopMap = new Map<string, Record<string, unknown>>();
        for (const snap of shopDocs) {
          if (snap.exists) {
            shopMap.set(snap.id, snap.data() as Record<string, unknown>);
          }
        }

        type PreparedOrderItem = {
          postId: string;
          shopId: string;
          shopName: string;
          shopCity: string;
          title: string;
          variantId: string;
          variantLabel: string;
          qty: number;
          isSample: boolean;
          unitPriceFcfa: number;
          posterUrl: string;
        };

        // Group items by shop with server-recomputed unit prices
        const groupedByShop = new Map<
          string,
          {
            shop: Record<string, unknown>;
            items: PreparedOrderItem[];
          }
        >();

        for (const rawItem of rawItems) {
          const qty = Math.max(1, Math.round(Number(rawItem.qty || 1)));
          const isSample = Boolean(rawItem.isSample);
          const rawPostId = String(rawItem.postId || '');
          const post = postMap.get(rawPostId);

          // Check accepted chat deal or RFQ offer first (works both with and without catalog postId)
          if (rawItem.acceptedOfferId && rawItem.conversationId) {
            const msgSnap = await tx.get(
              db
                .collection('conversations')
                .doc(String(rawItem.conversationId))
                .collection('messages')
                .doc(String(rawItem.acceptedOfferId))
            );
            const msgData = msgSnap.data() as Record<string, unknown> | undefined;
            const offerObj = msgData?.offer as Record<string, unknown> | undefined;
            if (
              !msgSnap.exists ||
              msgData?.buyerId !== session.uid ||
              msgData?.offerStatus !== 'accepted' ||
              !offerObj ||
              Number(offerObj.unitPriceFcfa) <= 0
            ) {
              throw new AuthError('Offre négociée invalide ou non acceptée.', 400);
            }
            const offerShopId = String(offerObj.shopId || post?.shopId || '');
            let offerShop = shopMap.get(offerShopId);
            if (!offerShop && offerShopId) {
              const sSnap = await tx.get(db.collection('shops').doc(offerShopId));
              if (sSnap.exists) {
                offerShop = sSnap.data() as Record<string, unknown>;
                shopMap.set(offerShopId, offerShop);
              }
            }
            if (!offerShop || offerShop.vendorStatus !== 'approved') {
              throw new AuthError(`Boutique suspendue ou non approuvée (${offerObj.shopName || offerShopId}).`, 403);
            }
            const unitPriceFcfa = Math.round(Number(offerObj.unitPriceFcfa));
            const existingGroup = groupedByShop.get(offerShopId) || { shop: offerShop, items: [] };
            existingGroup.items.push({
              postId: rawPostId || `offer-${rawItem.acceptedOfferId}`,
              shopId: offerShopId,
              shopName: String(offerShop.name || offerObj.shopName || ''),
              shopCity: String(offerShop.city || 'Douala'),
              title: String(offerObj.productTitle || post?.title || 'Offre négociée'),
              variantId: String(rawItem.variantId || offerObj.offerId || rawItem.acceptedOfferId),
              variantLabel: `Lot négocié · ${qty} pcs`,
              qty,
              isSample: false,
              unitPriceFcfa,
              posterUrl: String(post?.posterUrl || offerShop.avatarUrl || ''),
            });
            groupedByShop.set(offerShopId, existingGroup);
            continue;
          }

          if (rawItem.acceptedOfferId && rawItem.rfqId) {
            const rfqRef = db.collection('rfqs').doc(String(rawItem.rfqId));
            const [rfqSnap, offerSnap] = await Promise.all([
              tx.get(rfqRef),
              tx.get(rfqRef.collection('offers').doc(String(rawItem.acceptedOfferId))),
            ]);
            const rfqData = rfqSnap.data() as Record<string, unknown> | undefined;
            const offerData = offerSnap.data() as Record<string, unknown> | undefined;
            if (
              !rfqSnap.exists ||
              !offerSnap.exists ||
              rfqData?.buyerId !== session.uid ||
              offerData?.status !== 'accepted' ||
              Number(offerData?.unitPriceFcfa) <= 0
            ) {
              throw new AuthError('Offre de devis (RFQ) invalide ou non acceptée.', 400);
            }
            const offerShopId = String(offerData.shopId || '');
            let offerShop = shopMap.get(offerShopId);
            if (!offerShop && offerShopId) {
              const sSnap = await tx.get(db.collection('shops').doc(offerShopId));
              if (sSnap.exists) {
                offerShop = sSnap.data() as Record<string, unknown>;
                shopMap.set(offerShopId, offerShop);
              }
            }
            if (!offerShop || offerShop.vendorStatus !== 'approved') {
              throw new AuthError(`Boutique suspendue ou non approuvée (${offerData.shopName || offerShopId}).`, 403);
            }
            const unitPriceFcfa = Math.round(Number(offerData.unitPriceFcfa));
            const existingGroup = groupedByShop.get(offerShopId) || { shop: offerShop, items: [] };
            existingGroup.items.push({
              postId: rawPostId || `rfq-${rawItem.rfqId}`,
              shopId: offerShopId,
              shopName: String(offerShop.name || offerData.shopName || ''),
              shopCity: String(offerShop.city || 'Douala'),
              title: String(rfqData.title || `Devis ${rawItem.rfqId}`),
              variantId: String(rawItem.acceptedOfferId),
              variantLabel: `Devis accepté · ${qty} pcs`,
              qty,
              isSample: false,
              unitPriceFcfa,
              posterUrl: String(rfqData.photoUrl || offerShop.avatarUrl || ''),
            });
            groupedByShop.set(offerShopId, existingGroup);
            continue;
          }

          if (!post || post.status !== 'published') {
            throw new AuthError(`Produit indisponible ou retiré (${rawItem.postId}).`, 400);
          }
          const shopId = String(post.shopId || '');
          const shop = shopMap.get(shopId);
          if (!shop || shop.vendorStatus !== 'approved') {
            throw new AuthError(`Boutique suspendue ou non approuvée (${post.shopName}).`, 403);
          }

          const moq = Math.max(1, Number(post.moq ?? 1));
          if (!isSample && qty < moq) {
            throw new AuthError(`Quantité inférieure au MOQ (${moq}) pour ${post.title}.`, 400);
          }

          const variants = Array.isArray(post.variants)
            ? (post.variants as Array<{ id: string; label: string; stock: number; priceDeltaFcfa: number }>)
            : [];
          const variant =
            variants.find((v) => v.id === rawItem.variantId) ||
            variants[0] || { id: 'default', label: 'Standard', stock: 1, priceDeltaFcfa: 0 };

          const unitPriceFcfa = isSample
            ? Number(post.samplePriceFcfa ?? post.priceFcfa ?? 0) + Number(variant.priceDeltaFcfa ?? 0)
            : getUnitPriceForQty(
                Array.isArray(post.tiers) ? (post.tiers as Array<{ minQty: number; maxQty: number | null; unitPriceFcfa: number }>) : [],
                qty,
                Number(post.priceFcfa ?? 0),
                Number(variant.priceDeltaFcfa ?? 0)
              );

          if (unitPriceFcfa <= 0) {
            throw new AuthError(`Prix invalide sur ${post.title}.`, 400);
          }

          const existingGroup = groupedByShop.get(shopId) || { shop, items: [] };
          existingGroup.items.push({
            postId: String(post.postId),
            shopId,
            shopName: String(shop.name || post.shopName || ''),
            shopCity: String(shop.city || post.city || 'Douala'),
            title: String(post.title || ''),
            variantId: variant.id,
            variantLabel: variant.label,
            qty,
            isSample,
            unitPriceFcfa,
            posterUrl: String(post.posterUrl || ''),
          });
          groupedByShop.set(shopId, existingGroup);
        }

        const buyerWalletRef = db.collection('wallets').doc(session.uid);
        const buyerWalletSnap = await tx.get(buyerWalletRef);
        const buyerAvail = Number(buyerWalletSnap.data()?.availableFcfa ?? 0);

        const vendorOwnerIds = Array.from(
          new Set(Array.from(groupedByShop.values()).map((g) => String(g.shop.ownerId || '')).filter(Boolean))
        );
        const vendorWalletSnaps = await Promise.all(
          vendorOwnerIds.map((vid) => tx.get(db.collection('wallets').doc(vid)))
        );
        const vendorWalletMap = new Map<string, number>();
        vendorWalletSnaps.forEach((snap, idx) => {
          vendorWalletMap.set(vendorOwnerIds[idx], Number(snap.data()?.pendingFcfa ?? 0));
        });

        let grandTotal = 0;
        const preparedOrders: Array<{
          orderId: string;
          shopId: string;
          shopName: string;
          vendorOwnerId: string;
          items: PreparedOrderItem[];
          subtotalFcfa: number;
          shippingFeeFcfa: number;
          totalFcfa: number;
          commissionRatePercent: number;
          commissionFcfa: number;
          netVendorFcfa: number;
        }> = [];

        const globalOrderId = `GLB-${Date.now().toString().slice(-6)}`;
        let orderIdx = 1;
        for (const [shopId, group] of groupedByShop.entries()) {
          const subtotalFcfa = group.items.reduce((sum, i) => sum + i.unitPriceFcfa * i.qty, 0);
          const shopCity = String(group.shop.city || 'Douala');
          const shippingFeeFcfa = calculateVendorShippingFcfa(subtotalFcfa, shopCity, deliveryCity);
          const totalFcfa = subtotalFcfa + shippingFeeFcfa;
          const split = computeCommissionSplit(subtotalFcfa, shippingFeeFcfa, commissionPercent);
          grandTotal += totalFcfa;
          preparedOrders.push({
            orderId: `CMD-${Date.now().toString().slice(-5)}-${orderIdx++}`,
            shopId,
            shopName: String(group.shop.name || ''),
            vendorOwnerId: String(group.shop.ownerId || ''),
            items: group.items,
            subtotalFcfa,
            shippingFeeFcfa,
            totalFcfa,
            commissionRatePercent: split.commissionRatePercent,
            commissionFcfa: split.commissionFcfa,
            netVendorFcfa: split.netVendorFcfa,
          });
        }

        if (paymentMethod === 'wallet' && buyerAvail < grandTotal) {
          throw new AuthError('Solde du portefeuille DROPP insuffisant.', 400);
        }

        tx.set(keyRef, {
          uid: session.uid,
          action: 'checkout',
          globalOrderId,
          grandTotal,
          createdAt: now,
        });

        const isMobileFailure = paymentMethod !== 'wallet' && !simulateMobileSuccess;

        for (const ord of preparedOrders) {
          tx.set(db.collection('orders').doc(ord.orderId), {
            orderId: ord.orderId,
            globalOrderId,
            buyerId: session.uid,
            buyerName: session.displayName,
            shopId: ord.shopId,
            shopName: ord.shopName,
            vendorOwnerId: ord.vendorOwnerId,
            items: ord.items,
            subtotalFcfa: ord.subtotalFcfa,
            shippingFeeFcfa: ord.shippingFeeFcfa,
            totalFcfa: ord.totalFcfa,
            commissionRatePercent: ord.commissionRatePercent,
            commissionFcfa: ord.commissionFcfa,
            netVendorFcfa: ord.netVendorFcfa,
            paymentMethod,
            isSimulatedPayment: true,
            escrowStatus: 'held',
            status: isMobileFailure ? 'awaiting_payment' : 'pending',
            deliveryCity,
            deliveryNeighborhood,
            deliveryPhone,
            idempotencyKey,
            createdAt: now,
            updatedAt: now,
          });

          if (!isMobileFailure && ord.vendorOwnerId) {
            const curPending = vendorWalletMap.get(ord.vendorOwnerId) ?? 0;
            vendorWalletMap.set(ord.vendorOwnerId, curPending + ord.totalFcfa);
            tx.set(
              db.collection('wallets').doc(ord.vendorOwnerId),
              {
                userId: ord.vendorOwnerId,
                pendingFcfa: curPending + ord.totalFcfa,
                updatedAt: now,
              },
              { merge: true }
            );
          }
        }

        if (isMobileFailure) {
          return {
            ok: false as const,
            globalOrderId,
            grandTotal,
            orderCount: preparedOrders.length,
            message: 'Paiement Mobile Money simulé refusé. Vos sous-commandes sont enregistrées en attente de paiement.',
          };
        }

        if (paymentMethod === 'wallet') {
          tx.set(
            buyerWalletRef,
            {
              userId: session.uid,
              availableFcfa: buyerAvail - grandTotal,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        const txId = `TX-ESC-${Date.now()}`;
        tx.set(db.collection('walletTransactions').doc(txId), {
          txId,
          userId: session.uid,
          type: 'escrow_hold',
          amountFcfa: -grandTotal,
          methodLabel:
            paymentMethod === 'wallet'
              ? `Portefeuille DROPP (Simulation) · ${globalOrderId}`
              : `${paymentMethod === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} (Simulation) · ${globalOrderId}`,
          referenceId: globalOrderId,
          status: 'completed',
          isSimulated: true,
          createdAt: now,
        });

        return {
          ok: true as const,
          globalOrderId,
          grandTotal,
          orderCount: preparedOrders.length,
        };
      });

      if (!outcome.ok) {
        res.status(402).json(outcome);
        return;
      }

      res.status(200).json(outcome);
      return;
    }

    if (action === 'cancel_order') {
      const orderId = String(body.orderId || '').trim();
      if (!orderId) {
        res.status(400).json({ error: 'orderId requis.' });
        return;
      }

      const result = await db.runTransaction(async (tx) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) {
          throw new AuthError('Commande introuvable.', 404);
        }
        const order = orderSnap.data() as Record<string, unknown>;
        if (order.buyerId !== session.uid) {
          throw new AuthError('Accès refusé sur cette commande.', 403);
        }
        if (order.status !== 'pending' && order.status !== 'awaiting_payment') {
          throw new AuthError('Annulation impossible : commande déjà confirmée par le fournisseur.', 400);
        }

        const wasPaidIntoEscrow = order.status === 'pending';
        const totalFcfa = Number(order.totalFcfa ?? 0);
        const vendorOwnerId = String(order.vendorOwnerId || '');

        tx.set(
          orderRef,
          { status: 'cancelled', escrowStatus: 'refunded', updatedAt: now },
          { merge: true }
        );

        if (wasPaidIntoEscrow && totalFcfa > 0) {
          const buyerWalletRef = db.collection('wallets').doc(session.uid);
          const buyerWalletSnap = await tx.get(buyerWalletRef);
          const buyerAvail = Number(buyerWalletSnap.data()?.availableFcfa ?? 0);
          tx.set(
            buyerWalletRef,
            { userId: session.uid, availableFcfa: buyerAvail + totalFcfa, updatedAt: now },
            { merge: true }
          );

          if (vendorOwnerId) {
            const vRef = db.collection('wallets').doc(vendorOwnerId);
            const vSnap = await tx.get(vRef);
            const vPending = Number(vSnap.data()?.pendingFcfa ?? 0);
            tx.set(
              vRef,
              { userId: vendorOwnerId, pendingFcfa: Math.max(0, vPending - totalFcfa), updatedAt: now },
              { merge: true }
            );
          }

          const txId = `TX-CANC-${Date.now()}`;
          tx.set(db.collection('walletTransactions').doc(txId), {
            txId,
            userId: session.uid,
            type: 'refund',
            amountFcfa: totalFcfa,
            methodLabel: `Remboursement annulation ${orderId}`,
            referenceId: orderId,
            status: 'completed',
            isSimulated: true,
            createdAt: now,
          });
        }

        return { orderId, refundedFcfa: wasPaidIntoEscrow ? totalFcfa : 0 };
      });

      res.status(200).json({ ok: true, ...result });
      return;
    }

    if (action === 'confirm_delivery') {
      const orderId = String(body.orderId || '').trim();
      if (!orderId) {
        res.status(400).json({ error: 'orderId requis.' });
        return;
      }

      const result = await db.runTransaction(async (tx) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) {
          throw new AuthError('Commande introuvable.', 404);
        }
        const order = orderSnap.data() as Record<string, unknown>;
        if (order.buyerId !== session.uid) {
          throw new AuthError('Seul l’acheteur peut confirmer la réception.', 403);
        }
        if (order.escrowStatus !== 'held' || (order.status !== 'delivering' && order.status !== 'delivered')) {
          throw new AuthError('Cette commande ne peut pas encore libérer le séquestre.', 400);
        }

        const settingsSnap = await tx.get(db.collection('platformConfig').doc('settings'));
        const commissionPercent = Number(settingsSnap.data()?.commissionPercent ?? 5);
        const subtotal = Number(order.subtotalFcfa ?? order.totalFcfa ?? 0);
        const shipping = Number(order.shippingFeeFcfa ?? 0);
        const totalFcfa = Number(order.totalFcfa ?? subtotal + shipping);
        const split = computeCommissionSplit(subtotal, shipping, commissionPercent);

        const vendorOwnerId = String(order.vendorOwnerId || '');
        const shopId = String(order.shopId || '');
        const buyerRef = db.collection('users').doc(session.uid);
        const buyerSnap = await tx.get(buyerRef);
        const buyerData = (buyerSnap.data() as Record<string, unknown> | undefined) || {};

        const vendorWalletRef = vendorOwnerId ? db.collection('wallets').doc(vendorOwnerId) : null;
        const shopRef = shopId ? db.collection('shops').doc(shopId) : null;
        const [vendorWalletSnap, shopSnap] = await Promise.all([
          vendorWalletRef ? tx.get(vendorWalletRef) : Promise.resolve(null),
          shopRef ? tx.get(shopRef) : Promise.resolve(null),
        ]);

        // Check 500 FCFA referral qualification
        let referrerUid: string | null = null;
        let referrerReferralFcfa = 0;
        let referrerAvailFcfa = 0;
        const referredByCode = typeof buyerData.referredByCode === 'string' ? buyerData.referredByCode : undefined;
        const hasCompletedFirstOrder = Boolean(buyerData.hasCompletedFirstOrder);

        if (
          qualifiesForReferralReward({
            referredByCode,
            hasCompletedFirstOrder,
            orderStatus: 'delivered',
          }) &&
          referredByCode
        ) {
          const refUsersSnap = await db
            .collection('users')
            .where('referralCode', '==', referredByCode)
            .limit(1)
            .get();
          const refDoc = refUsersSnap.docs[0];
          if (refDoc && refDoc.id !== session.uid) {
            referrerUid = refDoc.id;
            const refWalletSnap = await tx.get(db.collection('wallets').doc(referrerUid));
            referrerReferralFcfa = Number(refWalletSnap.data()?.referralFcfa ?? 0);
            referrerAvailFcfa = Number(refWalletSnap.data()?.availableFcfa ?? 0);
          }
        }

        tx.set(
          orderRef,
          {
            status: 'delivered',
            escrowStatus: 'released',
            deliveredAt: order.deliveredAt || now.toDate().toISOString(),
            commissionRatePercent: split.commissionRatePercent,
            commissionFcfa: split.commissionFcfa,
            netVendorFcfa: split.netVendorFcfa,
            updatedAt: now,
          },
          { merge: true }
        );

        if (vendorWalletRef && vendorOwnerId) {
          const vAvail = Number(vendorWalletSnap?.data()?.availableFcfa ?? 0);
          const vPending = Number(vendorWalletSnap?.data()?.pendingFcfa ?? 0);
          tx.set(
            vendorWalletRef,
            {
              userId: vendorOwnerId,
              availableFcfa: vAvail + split.netVendorFcfa,
              pendingFcfa: Math.max(0, vPending - totalFcfa),
              updatedAt: now,
            },
            { merge: true }
          );
          const txId = `TX-REL-${Date.now()}`;
          tx.set(db.collection('walletTransactions').doc(txId), {
            txId,
            userId: vendorOwnerId,
            type: 'escrow_release',
            amountFcfa: split.netVendorFcfa,
            methodLabel: `Vente ${orderId} (com. ${split.commissionRatePercent}%)`,
            referenceId: orderId,
            status: 'completed',
            isSimulated: true,
            createdAt: now,
          });
        }

        if (shopRef && shopSnap?.exists) {
          const prevSales = Number(shopSnap.data()?.salesCount ?? 0);
          tx.set(shopRef, { salesCount: prevSales + 1, updatedAt: now }, { merge: true });
        }

        if (!hasCompletedFirstOrder) {
          tx.set(buyerRef, { hasCompletedFirstOrder: true, updatedAt: now }, { merge: true });
        }

        if (referrerUid) {
          tx.set(
            db.collection('wallets').doc(referrerUid),
            {
              userId: referrerUid,
              availableFcfa: referrerAvailFcfa + REFERRAL_BONUS_FCFA,
              referralFcfa: referrerReferralFcfa + REFERRAL_BONUS_FCFA,
              updatedAt: now,
            },
            { merge: true }
          );
          const refTxId = `TX-BONUS-${Date.now()}`;
          tx.set(db.collection('walletTransactions').doc(refTxId), {
            txId: refTxId,
            userId: referrerUid,
            type: 'referral_bonus',
            amountFcfa: REFERRAL_BONUS_FCFA,
            methodLabel: `Bonus parrainage (${session.displayName})`,
            referenceId: orderId,
            status: 'completed',
            isSimulated: true,
            createdAt: now,
          });
        }

        return { orderId, netVendorFcfa: split.netVendorFcfa, referralAwarded: Boolean(referrerUid) };
      });

      res.status(200).json({ ok: true, ...result });
      return;
    }

    if (action === 'open_dispute') {
      const orderId = String(body.orderId || '').trim();
      const reason = String(body.reason || '').trim().slice(0, 500);
      if (!orderId || reason.length < 4) {
        res.status(400).json({ error: 'Motif du litige requis (min. 4 caractères).' });
        return;
      }

      const result = await db.runTransaction(async (tx) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) {
          throw new AuthError('Commande introuvable.', 404);
        }
        const order = orderSnap.data() as Record<string, unknown>;
        if (order.buyerId !== session.uid) {
          throw new AuthError('Accès refusé sur cette commande.', 403);
        }
        if (order.status !== 'delivered' || order.escrowStatus !== 'held') {
          throw new AuthError('Un litige ne peut être ouvert que sous 24h après livraison avec séquestre bloqué.', 400);
        }

        const deliveredAtStr = typeof order.deliveredAt === 'string' ? order.deliveredAt : '';
        if (deliveredAtStr) {
          const deliveredMs = Date.parse(deliveredAtStr);
          if (!Number.isNaN(deliveredMs) && Date.now() - deliveredMs > 24 * 60 * 60 * 1000) {
            throw new AuthError('La fenêtre de litige de 24h est expirée.', 400);
          }
        }

        const disputeId = `LIT-${Date.now().toString().slice(-6)}`;
        tx.set(db.collection('disputes').doc(disputeId), {
          disputeId,
          orderId,
          buyerId: session.uid,
          buyerName: session.displayName,
          shopId: String(order.shopId || ''),
          shopName: String(order.shopName || ''),
          vendorOwnerId: String(order.vendorOwnerId || ''),
          reason,
          amountHeldFcfa: Number(order.totalFcfa ?? 0),
          status: 'open',
          createdAt: now,
          updatedAt: now,
        });
        tx.set(
          orderRef,
          { status: 'disputed', escrowStatus: 'disputed', disputeId, updatedAt: now },
          { merge: true }
        );
        return { disputeId, orderId };
      });

      res.status(200).json({ ok: true, ...result });
      return;
    }

    if (action === 'rate_order') {
      const orderId = String(body.orderId || '').trim();
      if (!orderId) {
        res.status(400).json({ error: 'orderId requis.' });
        return;
      }
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists || orderSnap.data()?.buyerId !== session.uid) {
        res.status(403).json({ error: 'Accès refusé.' });
        return;
      }
      await orderRef.set({ rated: true, updatedAt: now }, { merge: true });
      res.status(200).json({ ok: true, orderId });
      return;
    }

    if (action === 'vendor_order_status') {
      if (session.role !== 'vendor' || session.vendorStatus !== 'approved') {
        res.status(403).json({ error: 'Seul un vendeur approuvé actif peut gérer ses commandes.' });
        return;
      }
      const orderId = String(body.orderId || '').trim();
      const nextStatus = String(body.nextStatus || '').trim();
      if (!orderId || !['confirmed', 'delivering', 'delivered', 'cancelled'].includes(nextStatus)) {
        res.status(400).json({ error: 'Statut de commande invalide.' });
        return;
      }

      await db.runTransaction(async (tx) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) {
          throw new AuthError('Commande introuvable.', 404);
        }
        const order = orderSnap.data() as Record<string, unknown>;
        if (order.vendorOwnerId !== session.uid) {
          throw new AuthError('Cette commande appartient à une autre boutique.', 403);
        }

        const current = String(order.status || '');
        const valid =
          (current === 'pending' && (nextStatus === 'confirmed' || nextStatus === 'cancelled')) ||
          (current === 'confirmed' && nextStatus === 'delivering') ||
          (current === 'delivering' && nextStatus === 'delivered');

        if (!valid) {
          throw new AuthError(`Transition non autorisée (${current} -> ${nextStatus}).`, 400);
        }

        if (nextStatus === 'cancelled') {
          const totalFcfa = Number(order.totalFcfa ?? 0);
          const buyerId = String(order.buyerId || '');
          const buyerWalletRef = db.collection('wallets').doc(buyerId);
          const vendorWalletRef = db.collection('wallets').doc(session.uid);
          const [buyerWalletSnap, vendorWalletSnap] = await Promise.all([
            tx.get(buyerWalletRef),
            tx.get(vendorWalletRef),
          ]);
          const bAvail = Number(buyerWalletSnap.data()?.availableFcfa ?? 0);
          const vPending = Number(vendorWalletSnap.data()?.pendingFcfa ?? 0);

          tx.set(
            orderRef,
            { status: 'cancelled', escrowStatus: 'refunded', updatedAt: now },
            { merge: true }
          );
          if (buyerId && totalFcfa > 0) {
            tx.set(
              buyerWalletRef,
              { userId: buyerId, availableFcfa: bAvail + totalFcfa, updatedAt: now },
              { merge: true }
            );
            tx.set(
              vendorWalletRef,
              { userId: session.uid, pendingFcfa: Math.max(0, vPending - totalFcfa), updatedAt: now },
              { merge: true }
            );
            const txId = `TX-VDECL-${Date.now()}`;
            tx.set(db.collection('walletTransactions').doc(txId), {
              txId,
              userId: buyerId,
              type: 'refund',
              amountFcfa: totalFcfa,
              methodLabel: `Commande refusée par vendeur (${orderId})`,
              referenceId: orderId,
              status: 'completed',
              isSimulated: true,
              createdAt: now,
            });
          }
          return;
        }

        tx.set(
          orderRef,
          {
            status: nextStatus,
            ...(nextStatus === 'delivered' ? { deliveredAt: now.toDate().toISOString() } : {}),
            updatedAt: now,
          },
          { merge: true }
        );
      });

      res.status(200).json({ ok: true, orderId, status: nextStatus });
      return;
    }

    res.status(400).json({ error: 'Action commerce inconnue.' });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof ServerConfigError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur serveur lors de l’opération commerce.',
    });
  }
}
