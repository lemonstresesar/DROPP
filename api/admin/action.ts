import { Timestamp } from 'firebase-admin/firestore';
import {
  AuthError,
  ServerConfigError,
  assertAdminSession,
  extractBearerToken,
  getAdminAuth,
  getAdminFirestore,
} from '../_lib/droppAuth.js';
import { computeCommissionSplit } from '../../src/utils/commerce.js';

const ALL_CATEGORIES = ['Mode', 'Électronique', 'Beauté', 'Alimentation', 'Maison', 'Autre'] as const;

function sanitizeShopId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
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
    const adminSession = await assertAdminSession(token);
    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const body = (req.body || {}) as Record<string, unknown>;
    const action = String(body.action || '');
    const now = Timestamp.now();

    const writeAuditLog = async (
      entry: {
        action: string;
        targetType: 'user' | 'shop' | 'kyc' | 'post' | 'dispute' | 'withdrawal' | 'settings';
        targetId: string;
        details: string;
      }
    ) => {
      const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.collection('auditLogs').doc(logId).set({
        logId,
        actorId: adminSession.uid,
        actorName: adminSession.displayName,
        ...entry,
        createdAt: now,
      });
    };

    if (action === 'review_kyc') {
      const applicationId = String(body.applicationId || '').trim();
      const decision = body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : '';
      const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim().slice(0, 240) : '';
      if (!applicationId || !decision) {
        res.status(400).json({ error: 'Paramètres KYC invalides.' });
        return;
      }

      const result = await db.runTransaction(async (tx) => {
        const kycRef = db.collection('kycApplications').doc(applicationId);
        const kycSnap = await tx.get(kycRef);
        if (!kycSnap.exists) {
          throw new AuthError('Dossier KYC introuvable.', 404);
        }
        const kyc = kycSnap.data() as Record<string, unknown>;
        const targetUid = String(kyc.userId || '');
        if (!targetUid) {
          throw new AuthError('Identifiant utilisateur manquant sur le dossier KYC.', 400);
        }

        const userRef = db.collection('users').doc(targetUid);
        const userSnap = await tx.get(userRef);
        const userData = (userSnap.data() as Record<string, unknown> | undefined) || {};

        if (decision === 'approved') {
          const shopId =
            (typeof userData.shopId === 'string' && userData.shopId) ||
            sanitizeShopId(`shop-${targetUid.slice(0, 12)}`);
          const shopRef = db.collection('shops').doc(shopId);
          const shopSnap = await tx.get(shopRef);

          const shopName = String(kyc.shopName || userData.displayName || 'Boutique DROPP').slice(0, 80);
          const handleBase = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '') || targetUid.slice(0, 8);
          const city = kyc.city === 'Yaoundé' ? 'Yaoundé' : 'Douala';
          const neighborhood = String(kyc.neighborhood || userData.neighborhood || (city === 'Yaoundé' ? 'Bastos' : 'Akwa')).slice(0, 80);
          const category = ALL_CATEGORIES.includes(String(kyc.category) as typeof ALL_CATEGORIES[number])
            ? String(kyc.category)
            : 'Mode';

          tx.set(
            kycRef,
            {
              status: 'approved',
              rejectionReason: '',
              updatedAt: now,
            },
            { merge: true }
          );

          tx.set(
            userRef,
            {
              role: 'vendor',
              vendorStatus: 'approved',
              shopId,
              updatedAt: now,
            },
            { merge: true }
          );

          if (!shopSnap.exists) {
            tx.set(shopRef, {
              shopId,
              ownerId: targetUid,
              name: shopName,
              handle: `@${handleBase.slice(0, 24)}`,
              city,
              neighborhood,
              category,
              isCertified: Boolean(userData.isCertified),
              isPremium: false,
              vendorStatus: 'approved',
              memberSinceYear: new Date().getFullYear(),
              rating: 5,
              salesCount: 0,
              responseRate: 100,
              followersCount: 0,
              followingCount: 0,
              likesCount: 0,
              avatarUrl: String(kyc.selfieUrl || userData.avatarUrl || ''),
              bio: `${shopName} — Fournisseur vérifié sur DROPP (${city}).`,
              hasActiveStory: false,
              isOnline: true,
              createdAt: now,
              updatedAt: now,
            });
          } else {
            tx.set(
              shopRef,
              {
                name: shopName,
                city,
                neighborhood,
                category,
                vendorStatus: 'approved',
                updatedAt: now,
              },
              { merge: true }
            );
          }

          return { targetUid, shopId, shopName, isCertified: Boolean(userData.isCertified) };
        }

        tx.set(
          kycRef,
          {
            status: 'rejected',
            rejectionReason: rejectionReason || 'Documents illisibles ou incomplets.',
            updatedAt: now,
          },
          { merge: true }
        );
        tx.set(
          userRef,
          {
            role: 'client',
            vendorStatus: 'rejected',
            updatedAt: now,
          },
          { merge: true }
        );
        return { targetUid, shopId: null, shopName: String(kyc.shopName || ''), isCertified: false };
      });

      await auth.setCustomUserClaims(result.targetUid, {
        role: decision === 'approved' ? 'vendor' : 'client',
        vendorStatus: decision,
        shopId: result.shopId,
        isCertified: result.isCertified,
      });

      await writeAuditLog({
        action: decision === 'approved' ? 'KYC approuvé' : 'KYC refusé',
        targetType: 'kyc',
        targetId: applicationId,
        details: `${result.shopName} (${result.targetUid})${rejectionReason ? ` — ${rejectionReason}` : ''}`,
      });

      res.status(200).json({ ok: true, ...result });
      return;
    }

    if (action === 'certify_shop') {
      const shopId = String(body.shopId || '').trim();
      const certified = Boolean(body.certified);
      if (!shopId) {
        res.status(400).json({ error: 'shopId requis.' });
        return;
      }

      const shopRef = db.collection('shops').doc(shopId);
      const shopSnap = await shopRef.get();
      if (!shopSnap.exists) {
        res.status(404).json({ error: 'Boutique introuvable.' });
        return;
      }
      const shop = shopSnap.data() as Record<string, unknown>;
      const ownerId = String(shop.ownerId || '');
      const vendorStatus = String(shop.vendorStatus || 'approved');

      const postsSnap = await db.collection('posts').where('shopId', '==', shopId).limit(200).get();
      const batch = db.batch();
      batch.set(shopRef, { isCertified: certified, updatedAt: now }, { merge: true });
      if (ownerId) {
        batch.set(db.collection('users').doc(ownerId), { isCertified: certified, updatedAt: now }, { merge: true });
      }
      for (const p of postsSnap.docs) {
        batch.set(p.ref, { shopCertified: certified, updatedAt: now }, { merge: true });
      }
      await batch.commit();

      if (ownerId) {
        await auth.setCustomUserClaims(ownerId, {
          role: 'vendor',
          vendorStatus,
          shopId,
          isCertified: certified,
        }).catch(() => undefined);
      }

      await writeAuditLog({
        action: certified ? 'Boutique certifiée' : 'Certification retirée',
        targetType: 'shop',
        targetId: shopId,
        details: String(shop.name || shopId),
      });

      res.status(200).json({ ok: true, shopId, isCertified: certified });
      return;
    }

    if (action === 'suspend_shop') {
      const shopId = String(body.shopId || '').trim();
      const suspended = Boolean(body.suspended);
      if (!shopId) {
        res.status(400).json({ error: 'shopId requis.' });
        return;
      }

      const shopRef = db.collection('shops').doc(shopId);
      const shopSnap = await shopRef.get();
      if (!shopSnap.exists) {
        res.status(404).json({ error: 'Boutique introuvable.' });
        return;
      }
      const shop = shopSnap.data() as Record<string, unknown>;
      const ownerId = String(shop.ownerId || '');
      const nextStatus = suspended ? 'suspended' : 'approved';

      const batch = db.batch();
      batch.set(shopRef, { vendorStatus: nextStatus, updatedAt: now }, { merge: true });
      if (ownerId) {
        batch.set(
          db.collection('users').doc(ownerId),
          { role: 'vendor', vendorStatus: nextStatus, updatedAt: now },
          { merge: true }
        );
      }
      await batch.commit();

      if (ownerId) {
        await auth.setCustomUserClaims(ownerId, {
          role: 'vendor',
          vendorStatus: nextStatus,
          shopId,
          isCertified: Boolean(shop.isCertified),
        }).catch(() => undefined);
        if (suspended) {
          await auth.revokeRefreshTokens(ownerId).catch(() => undefined);
        }
      }

      await writeAuditLog({
        action: suspended ? 'Boutique suspendue' : 'Boutique réactivée',
        targetType: 'shop',
        targetId: shopId,
        details: String(shop.name || shopId),
      });

      res.status(200).json({ ok: true, shopId, vendorStatus: nextStatus });
      return;
    }

    if (action === 'moderate_post') {
      const postId = String(body.postId || '').trim();
      const status = body.status === 'rejected' ? 'rejected' : 'published';
      if (!postId) {
        res.status(400).json({ error: 'postId requis.' });
        return;
      }
      const postRef = db.collection('posts').doc(postId);
      const postSnap = await postRef.get();
      if (!postSnap.exists) {
        res.status(404).json({ error: 'Publication introuvable.' });
        return;
      }
      await postRef.set({ status, updatedAt: now }, { merge: true });

      await writeAuditLog({
        action: status === 'rejected' ? 'Publication masquée' : 'Publication rétablie',
        targetType: 'post',
        targetId: postId,
        details: String(postSnap.data()?.title || postId),
      });

      res.status(200).json({ ok: true, postId, status });
      return;
    }

    if (action === 'resolve_dispute') {
      const disputeId = String(body.disputeId || '').trim();
      const decision =
        body.decision === 'resolved_buyer'
          ? 'resolved_buyer'
          : body.decision === 'resolved_vendor'
            ? 'resolved_vendor'
            : '';
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 400) : '';
      if (!disputeId || !decision) {
        res.status(400).json({ error: 'Paramètres de litige invalides.' });
        return;
      }

      const summary = await db.runTransaction(async (tx) => {
        const disputeRef = db.collection('disputes').doc(disputeId);
        const disputeSnap = await tx.get(disputeRef);
        if (!disputeSnap.exists) {
          throw new AuthError('Litige introuvable.', 404);
        }
        const dispute = disputeSnap.data() as Record<string, unknown>;
        if (dispute.status !== 'open') {
          throw new AuthError('Ce litige a déjà été arbitré.', 409);
        }

        const orderId = String(dispute.orderId || '');
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        const order = (orderSnap.data() as Record<string, unknown> | undefined) || {};

        const buyerId = String(dispute.buyerId || '');
        const vendorOwnerId = String(dispute.vendorOwnerId || order.vendorOwnerId || '');
        const amountHeld = Number(dispute.amountHeldFcfa ?? order.totalFcfa ?? 0);
        const subtotal = Number(order.subtotalFcfa ?? amountHeld);
        const shipping = Number(order.shippingFeeFcfa ?? 0);

        const settingsSnap = await tx.get(db.collection('platformConfig').doc('settings'));
        const commissionPercent = Number(settingsSnap.data()?.commissionPercent ?? 5);
        const split = computeCommissionSplit(subtotal, shipping, commissionPercent);

        const buyerWalletRef = db.collection('wallets').doc(buyerId);
        const vendorWalletRef = vendorOwnerId ? db.collection('wallets').doc(vendorOwnerId) : null;
        const [buyerWalletSnap, vendorWalletSnap] = await Promise.all([
          tx.get(buyerWalletRef),
          vendorWalletRef ? tx.get(vendorWalletRef) : Promise.resolve(null),
        ]);

        const buyerAvail = Number(buyerWalletSnap.data()?.availableFcfa ?? 0);
        const vendorAvail = Number(vendorWalletSnap?.data()?.availableFcfa ?? 0);
        const vendorPending = Number(vendorWalletSnap?.data()?.pendingFcfa ?? 0);

        tx.set(
          disputeRef,
          {
            status: decision,
            resolutionNote: note || (decision === 'resolved_buyer' ? 'Remboursement intégral acheteur' : 'Fonds libérés au fournisseur'),
            updatedAt: now,
          },
          { merge: true }
        );

        if (decision === 'resolved_buyer') {
          if (orderSnap.exists) {
            tx.set(
              orderRef,
              { status: 'cancelled', escrowStatus: 'refunded', updatedAt: now },
              { merge: true }
            );
          }
          tx.set(
            buyerWalletRef,
            { userId: buyerId, availableFcfa: buyerAvail + amountHeld, updatedAt: now },
            { merge: true }
          );
          if (vendorWalletRef) {
            tx.set(
              vendorWalletRef,
              {
                userId: vendorOwnerId,
                pendingFcfa: Math.max(0, vendorPending - amountHeld),
                updatedAt: now,
              },
              { merge: true }
            );
          }
          const txId = `TX-REF-${Date.now()}`;
          tx.set(db.collection('walletTransactions').doc(txId), {
            txId,
            userId: buyerId,
            type: 'refund',
            amountFcfa: amountHeld,
            methodLabel: `Arbitrage litige ${disputeId}`,
            referenceId: orderId,
            status: 'completed',
            isSimulated: true,
            createdAt: now,
          });
        } else {
          if (orderSnap.exists) {
            tx.set(
              orderRef,
              {
                status: 'delivered',
                escrowStatus: 'released',
                commissionRatePercent: split.commissionRatePercent,
                commissionFcfa: split.commissionFcfa,
                netVendorFcfa: split.netVendorFcfa,
                updatedAt: now,
              },
              { merge: true }
            );
          }
          if (vendorWalletRef) {
            tx.set(
              vendorWalletRef,
              {
                userId: vendorOwnerId,
                availableFcfa: vendorAvail + split.netVendorFcfa,
                pendingFcfa: Math.max(0, vendorPending - amountHeld),
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
              methodLabel: `Séquestre libéré (com. ${split.commissionRatePercent}%)`,
              referenceId: orderId,
              status: 'completed',
              isSimulated: true,
              createdAt: now,
            });
          }
        }

        return { orderId, amountHeld };
      });

      await writeAuditLog({
        action: decision === 'resolved_buyer' ? 'Litige remboursé client' : 'Litige libéré vendeur',
        targetType: 'dispute',
        targetId: disputeId,
        details: `Commande ${summary.orderId} · ${summary.amountHeld} FCFA`,
      });

      res.status(200).json({ ok: true, disputeId, decision });
      return;
    }

    if (action === 'user_status') {
      const targetUid = String(body.targetUid || '').trim();
      const operation = String(body.operation || '').trim();
      if (!targetUid || !['suspend', 'reactivate', 'delete'].includes(operation)) {
        res.status(400).json({ error: 'Opération utilisateur invalide.' });
        return;
      }
      if (targetUid === adminSession.uid) {
        res.status(400).json({ error: 'Action impossible sur votre propre compte Super Admin.' });
        return;
      }

      const targetAdminSnap = await db.collection('admins').doc(targetUid).get();
      if (targetAdminSnap.exists) {
        res.status(403).json({ error: 'Impossible de modifier un autre compte Super Admin.' });
        return;
      }

      const userRef = db.collection('users').doc(targetUid);
      const userSnap = await userRef.get();
      const userData = (userSnap.data() as Record<string, unknown> | undefined) || {};

      if (operation === 'suspend' || operation === 'reactivate') {
        const disabled = operation === 'suspend';
        await auth.updateUser(targetUid, { disabled }).catch(() => undefined);
        if (disabled) {
          await auth.revokeRefreshTokens(targetUid).catch(() => undefined);
        }
        await userRef.set({ disabled, updatedAt: now }, { merge: true });
        if (typeof userData.shopId === 'string' && userData.shopId && userData.role === 'vendor') {
          await db
            .collection('shops')
            .doc(userData.shopId)
            .set({ vendorStatus: disabled ? 'suspended' : 'approved', updatedAt: now }, { merge: true });
        }

        await writeAuditLog({
          action: disabled ? 'Compte utilisateur suspendu' : 'Compte utilisateur réactivé',
          targetType: 'user',
          targetId: targetUid,
          details: String(userData.displayName || targetUid),
        });

        res.status(200).json({ ok: true, targetUid, disabled });
        return;
      }

      // delete
      await auth.deleteUser(targetUid).catch(() => undefined);
      const batch = db.batch();
      batch.delete(userRef);
      batch.delete(userRef.collection('private').doc('info'));
      batch.delete(db.collection('wallets').doc(targetUid));
      if (typeof userData.shopId === 'string' && userData.shopId) {
        batch.set(
          db.collection('shops').doc(userData.shopId),
          { vendorStatus: 'suspended', updatedAt: now },
          { merge: true }
        );
      }
      await batch.commit();

      await writeAuditLog({
        action: 'Compte utilisateur supprimé',
        targetType: 'user',
        targetId: targetUid,
        details: String(userData.displayName || targetUid),
      });

      res.status(200).json({ ok: true, targetUid, deleted: true });
      return;
    }

    if (action === 'review_withdrawal') {
      const requestId = String(body.requestId || '').trim();
      const decision =
        body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : '';
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 240) : '';
      if (!requestId || !decision) {
        res.status(400).json({ error: 'Paramètres de retrait invalides.' });
        return;
      }

      const info = await db.runTransaction(async (tx) => {
        const reqRef = db.collection('withdrawalRequests').doc(requestId);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists) {
          throw new AuthError('Demande de retrait introuvable.', 404);
        }
        const reqData = reqSnap.data() as Record<string, unknown>;
        if (reqData.status !== 'pending') {
          throw new AuthError('Ce retrait a déjà été traité.', 409);
        }

        const userId = String(reqData.userId || '');
        const amountFcfa = Number(reqData.amountFcfa ?? 0);

        tx.set(
          reqRef,
          {
            status: decision,
            note,
            reviewedAt: now,
            reviewedBy: adminSession.displayName,
          },
          { merge: true }
        );

        if (decision === 'rejected' && userId && amountFcfa > 0) {
          const walletRef = db.collection('wallets').doc(userId);
          const walletSnap = await tx.get(walletRef);
          const avail = Number(walletSnap.data()?.availableFcfa ?? 0);
          tx.set(walletRef, { userId, availableFcfa: avail + amountFcfa, updatedAt: now }, { merge: true });
          const txId = `TX-WREF-${Date.now()}`;
          tx.set(db.collection('walletTransactions').doc(txId), {
            txId,
            userId,
            type: 'refund',
            amountFcfa,
            methodLabel: `Retrait refusé (${requestId})`,
            referenceId: requestId,
            status: 'completed',
            isSimulated: true,
            createdAt: now,
          });
        }

        return { userId, amountFcfa };
      });

      await writeAuditLog({
        action: decision === 'approved' ? 'Retrait Mobile Money validé' : 'Retrait Mobile Money refusé',
        targetType: 'withdrawal',
        targetId: requestId,
        details: `${info.amountFcfa} FCFA · ${info.userId}${note ? ` — ${note}` : ''}`,
      });

      res.status(200).json({ ok: true, requestId, status: decision });
      return;
    }

    if (action === 'update_settings') {
      const settingsRef = db.collection('platformConfig').doc('settings');
      const currentSnap = await settingsRef.get();
      const current = (currentSnap.data() as Record<string, unknown> | undefined) || {};

      let commissionPercent = Number(current.commissionPercent ?? 5);
      if (body.commissionPercent !== undefined) {
        const parsed = Number(body.commissionPercent);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 30) {
          res.status(400).json({ error: 'Commission invalide (entre 0 % et 30 %).' });
          return;
        }
        commissionPercent = Math.round(parsed * 10) / 10;
      }

      let enabledCategories = Array.isArray(current.enabledCategories)
        ? current.enabledCategories
        : [...ALL_CATEGORIES];
      if (Array.isArray(body.enabledCategories)) {
        const filtered = body.enabledCategories
          .map((c) => String(c))
          .filter((c) => ALL_CATEGORIES.includes(c as typeof ALL_CATEGORIES[number]));
        if (filtered.length === 0) {
          res.status(400).json({ error: 'Au moins une catégorie doit rester active.' });
          return;
        }
        enabledCategories = filtered;
      }

      let announcement = current.announcement ?? null;
      if (body.announcement !== undefined) {
        if (body.announcement === null) {
          announcement = null;
        } else {
          const ann = body.announcement as Record<string, unknown>;
          announcement = {
            title: String(ann.title || '').trim().slice(0, 90),
            message: String(ann.message || '').trim().slice(0, 280),
            active: Boolean(ann.active && String(ann.message || '').trim()),
            updatedAt: now.toDate().toISOString(),
          };
        }
      }

      const nextSettings = {
        commissionPercent,
        enabledCategories,
        announcement,
        updatedAt: now,
        updatedBy: adminSession.displayName,
      };
      await settingsRef.set(nextSettings, { merge: true });

      await writeAuditLog({
        action: 'Paramètres plateforme mis à jour',
        targetType: 'settings',
        targetId: 'settings',
        details: `Commission ${commissionPercent}% · ${enabledCategories.length} catégories`,
      });

      res.status(200).json({
        ok: true,
        platformSettings: {
          ...nextSettings,
          updatedAt: now.toDate().toISOString(),
        },
      });
      return;
    }

    res.status(400).json({ error: 'Action admin inconnue.' });
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
      error: err instanceof Error ? err.message : 'Erreur serveur lors de l’action admin.',
    });
  }
}
