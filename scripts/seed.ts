import dotenv from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';
import {
  getAdminAuth,
  getAdminFirestore,
  hasAdminCredentialsConfigured,
} from '../api/_lib/droppAuth.js';
import {
  DEMO_COMMENTS_BY_POST,
  DEMO_POSTS,
  DEMO_REVIEWS_BY_POST,
  DEMO_SHOPS,
  IMG_KARITE,
} from '../src/data/demoData.js';

dotenv.config();

const resetPasswords = process.argv.includes('--reset-passwords');

interface SeedAccountDef {
  key: string;
  emailEnv: string;
  defaultEmail: string;
  passwordEnv: string;
  displayName: string;
  role: 'client' | 'vendor' | 'admin';
  vendorStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';
  isCertified: boolean;
  city: string;
  neighborhood: string;
  shopId?: string;
  walletBalanceFcfa: number;
  pendingEscrowFcfa: number;
  referralCode: string;
}

const SEED_ACCOUNTS: SeedAccountDef[] = [
  {
    key: 'admin',
    emailEnv: 'SEED_ADMIN_EMAIL',
    defaultEmail: 'admin@dropp.test',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    displayName: 'Super Admin DROPP',
    role: 'admin',
    vendorStatus: 'none',
    isCertified: true,
    city: 'Douala',
    neighborhood: 'Bonanjo',
    walletBalanceFcfa: 0,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-ADM01',
  },
  {
    key: 'vendeur1',
    emailEnv: 'SEED_VENDOR1_EMAIL',
    defaultEmail: 'vendeur1@dropp.test',
    passwordEnv: 'SEED_VENDOR1_PASSWORD',
    displayName: 'Maison Akwa Wax',
    role: 'vendor',
    vendorStatus: 'approved',
    isCertified: true,
    city: 'Douala',
    neighborhood: 'Akwa',
    shopId: 'shop-akwa-mode',
    walletBalanceFcfa: 45000,
    pendingEscrowFcfa: 50500,
    referralCode: 'DROPP-AKWA1',
  },
  {
    key: 'vendeur2',
    emailEnv: 'SEED_VENDOR2_EMAIL',
    defaultEmail: 'vendeur2@dropp.test',
    passwordEnv: 'SEED_VENDOR2_PASSWORD',
    displayName: 'Bastos Tech Grossiste',
    role: 'vendor',
    vendorStatus: 'approved',
    isCertified: false,
    city: 'Yaoundé',
    neighborhood: 'Bastos',
    shopId: 'shop-bastos-tech',
    walletBalanceFcfa: 18000,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-BAST2',
  },
  {
    key: 'vendeur3',
    emailEnv: 'SEED_VENDOR3_EMAIL',
    defaultEmail: 'vendeur3@dropp.test',
    passwordEnv: 'SEED_VENDOR3_PASSWORD',
    displayName: 'Ndokoti & Terroir Pro',
    role: 'vendor',
    vendorStatus: 'approved',
    isCertified: true,
    city: 'Douala',
    neighborhood: 'Ndokoti',
    shopId: 'shop-ndokoti-energie',
    walletBalanceFcfa: 0,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-NDOK3',
  },
  {
    key: 'pendingVendor',
    emailEnv: 'SEED_PENDING_VENDOR_EMAIL',
    defaultEmail: 'attente@dropp.test',
    passwordEnv: 'SEED_PENDING_VENDOR_PASSWORD',
    displayName: 'Karité Lab Cameroun',
    role: 'vendor',
    vendorStatus: 'pending',
    isCertified: false,
    city: 'Yaoundé',
    neighborhood: 'Biyem-Assi',
    shopId: 'shop-bonapriso-bio',
    walletBalanceFcfa: 0,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-KARI3',
  },
  {
    key: 'suspendedVendor',
    emailEnv: 'SEED_SUSPENDED_VENDOR_EMAIL',
    defaultEmail: 'suspendu@dropp.test',
    passwordEnv: 'SEED_SUSPENDED_VENDOR_PASSWORD',
    displayName: 'Douala Imports Suspendu',
    role: 'vendor',
    vendorStatus: 'suspended',
    isCertified: false,
    city: 'Douala',
    neighborhood: 'Mboppi',
    shopId: 'shop-suspended-demo',
    walletBalanceFcfa: 0,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-SUSP4',
  },
  {
    key: 'client',
    emailEnv: 'SEED_CLIENT_EMAIL',
    defaultEmail: 'client@dropp.test',
    passwordEnv: 'SEED_CLIENT_PASSWORD',
    displayName: 'Client Démo Douala',
    role: 'client',
    vendorStatus: 'none',
    isCertified: false,
    city: 'Douala',
    neighborhood: 'Bonamoussadi',
    walletBalanceFcfa: 100000,
    pendingEscrowFcfa: 0,
    referralCode: 'DROPP-CL2026',
  },
];

async function runSeed() {
  if (!hasAdminCredentialsConfigured()) {
    console.error(
      'Erreur: FIREBASE_SERVICE_ACCOUNT manquant. Définissez le JSON ou base64 du compte de service dans votre environnement.'
    );
    process.exit(1);
  }

  const missingPasswords = SEED_ACCOUNTS.filter(
    (acc) => !process.env[acc.passwordEnv]?.trim()
  ).map((acc) => acc.passwordEnv);

  if (missingPasswords.length > 0) {
    console.error(
      `Erreur: variables de mot de passe manquantes pour le seed: ${missingPasswords.join(', ')}`
    );
    process.exit(1);
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const now = Timestamp.now();

  const uidByKey: Record<string, string> = {};

  for (const acc of SEED_ACCOUNTS) {
    const email = (process.env[acc.emailEnv]?.trim() || acc.defaultEmail).toLowerCase();
    const password = process.env[acc.passwordEnv]!.trim();

    let uid: string;
    try {
      const existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
      await auth.updateUser(uid, {
        displayName: acc.displayName,
        emailVerified: true,
        ...(resetPasswords ? { password } : {}),
      });
      console.log(
        `[Auth] Compte mis à jour (${acc.key}: ${email}${resetPasswords ? ', mot de passe réinitialisé' : ''}) -> ${uid}`
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found') {
        const created = await auth.createUser({
          email,
          password,
          displayName: acc.displayName,
          emailVerified: true,
        });
        uid = created.uid;
        console.log(`[Auth] Compte créé (${acc.key}: ${email}) -> ${uid}`);
      } else {
        throw err;
      }
    }

    uidByKey[acc.key] = uid;

    await auth.setCustomUserClaims(uid, {
      role: acc.role,
      vendorStatus: acc.vendorStatus,
      shopId: acc.shopId ?? null,
      isCertified: acc.isCertified,
    });

    if (acc.role === 'admin') {
      await db.collection('admins').doc(uid).set(
        {
          uid,
          createdAt: now,
        },
        { merge: true }
      );
    }

    await db.collection('users').doc(uid).set(
      {
        uid,
        displayName: acc.displayName,
        role: acc.role,
        vendorStatus: acc.vendorStatus,
        isCertified: acc.isCertified,
        city: acc.city,
        neighborhood: acc.neighborhood,
        ...(acc.shopId ? { shopId: acc.shopId } : {}),
        referralCode: acc.referralCode,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    await db
      .collection('users')
      .doc(uid)
      .collection('private')
      .doc('info')
      .set(
        {
          uid,
          email,
          updatedAt: now,
        },
        { merge: true }
      );

    if (acc.role !== 'admin') {
      await db.collection('wallets').doc(uid).set(
        {
          userId: uid,
          availableFcfa: acc.walletBalanceFcfa,
          pendingFcfa: acc.pendingEscrowFcfa,
          referralFcfa: 0,
          updatedAt: now,
        },
        { merge: true }
      );
    }
  }

  // Connection health doc
  await db.collection('test').doc('connection').set({ ok: true, updatedAt: now }, { merge: true });

  // Resolve real UIDs for all shops
  const ownerMap: Record<string, string> = {
    'shop-akwa-mode': uidByKey.vendeur1,
    'shop-bastos-tech': uidByKey.vendeur2,
    'shop-ndokoti-energie': uidByKey.vendeur3,
    'shop-ouest-terroir': uidByKey.vendeur3,
    'shop-bonapriso-bio': uidByKey.pendingVendor,
    'shop-suspended-demo': uidByKey.suspendedVendor,
  };

  for (const shop of DEMO_SHOPS) {
    const ownerId = ownerMap[shop.shopId] || uidByKey.vendeur1;
    await db
      .collection('shops')
      .doc(shop.shopId)
      .set(
        {
          ...shop,
          ownerId,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
  }

  // Suspended shop fixture (for testing feed/market visibility and suspended read-only orders)
  await db
    .collection('shops')
    .doc('shop-suspended-demo')
    .set(
      {
        shopId: 'shop-suspended-demo',
        ownerId: uidByKey.suspendedVendor,
        name: 'Douala Imports Suspendu',
        handle: '@doualaimposts_susp',
        city: 'Douala',
        neighborhood: 'Mboppi',
        category: 'Autre',
        isCertified: false,
        isPremium: false,
        vendorStatus: 'suspended',
        memberSinceYear: 2025,
        rating: 0,
        salesCount: 0,
        responseRate: 100,
        followersCount: 0,
        followingCount: 0,
        likesCount: 0,
        avatarUrl: IMG_KARITE,
        bio: 'Boutique temporairement suspendue par la modération.',
        hasActiveStory: false,
        isOnline: false,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  // Posts mapped to real ownerIds
  for (const post of DEMO_POSTS) {
    const ownerId = ownerMap[post.shopId] || uidByKey.vendeur1;
    await db
      .collection('posts')
      .doc(post.postId)
      .set(
        {
          ...post,
          ownerId,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
  }

  // Sample order 1: client -> vendeur1 (delivering, escrow held)
  await db
    .collection('orders')
    .doc('CMD-SEED-01')
    .set(
      {
        orderId: 'CMD-SEED-01',
        globalOrderId: 'GLB-SEED-01',
        buyerId: uidByKey.client,
        buyerName: 'Client Démo Douala',
        shopId: 'shop-akwa-mode',
        shopName: 'Maison Akwa Wax',
        vendorOwnerId: uidByKey.vendeur1,
        items: [
          {
            postId: 'post-01',
            shopId: 'shop-akwa-mode',
            shopName: 'Maison Akwa Wax',
            shopCity: 'Douala',
            title: 'Ensemble Blazer & Jupe Wax Royal Douala',
            variantId: 'v1',
            variantLabel: 'Indigo & Terracotta · M',
            qty: 2,
            unitPriceFcfa: 24500,
            posterUrl: DEMO_POSTS[0].posterUrl,
          },
        ],
        subtotalFcfa: 49000,
        shippingFeeFcfa: 1500,
        totalFcfa: 50500,
        paymentMethod: 'wallet',
        escrowStatus: 'held',
        status: 'delivering',
        deliveryCity: 'Douala',
        deliveryNeighborhood: 'Bonamoussadi',
        deliveryPhone: '677001122',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  // Sample order 2: client -> vendeur2 (disputed)
  await db
    .collection('orders')
    .doc('CMD-SEED-02')
    .set(
      {
        orderId: 'CMD-SEED-02',
        globalOrderId: 'GLB-SEED-02',
        buyerId: uidByKey.client,
        buyerName: 'Client Démo Douala',
        shopId: 'shop-bastos-tech',
        shopName: 'Bastos Tech Grossiste',
        vendorOwnerId: uidByKey.vendeur2,
        items: [
          {
            postId: 'post-02',
            shopId: 'shop-bastos-tech',
            shopName: 'Bastos Tech Grossiste',
            shopCity: 'Yaoundé',
            title: 'Pack Écouteurs ANC + Montre AMOLED Pro',
            variantId: 'v1',
            variantLabel: 'Noir Mat (Pack complet)',
            qty: 2,
            unitPriceFcfa: 18500,
            posterUrl: DEMO_POSTS[1].posterUrl,
          },
        ],
        subtotalFcfa: 37000,
        shippingFeeFcfa: 3500,
        totalFcfa: 40500,
        paymentMethod: 'mtn_momo',
        escrowStatus: 'disputed',
        status: 'disputed',
        disputeId: 'LIT-SEED-01',
        deliveryCity: 'Douala',
        deliveryNeighborhood: 'Akwa',
        deliveryPhone: '677001122',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  // Sample order 3: suspended vendor read-only order
  await db
    .collection('orders')
    .doc('CMD-SEED-03')
    .set(
      {
        orderId: 'CMD-SEED-03',
        globalOrderId: 'GLB-SEED-03',
        buyerId: uidByKey.client,
        buyerName: 'Client Démo Douala',
        shopId: 'shop-suspended-demo',
        shopName: 'Douala Imports Suspendu',
        vendorOwnerId: uidByKey.suspendedVendor,
        items: [],
        subtotalFcfa: 12000,
        shippingFeeFcfa: 1500,
        totalFcfa: 13500,
        paymentMethod: 'orange_money',
        escrowStatus: 'held',
        status: 'pending',
        deliveryCity: 'Douala',
        deliveryNeighborhood: 'Mboppi',
        deliveryPhone: '699112233',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  // Open dispute on CMD-SEED-02
  await db
    .collection('disputes')
    .doc('LIT-SEED-01')
    .set(
      {
        disputeId: 'LIT-SEED-01',
        orderId: 'CMD-SEED-02',
        buyerId: uidByKey.client,
        buyerName: 'Client Démo Douala',
        shopId: 'shop-bastos-tech',
        shopName: 'Bastos Tech Grossiste',
        vendorOwnerId: uidByKey.vendeur2,
        reason: 'Boîtier de charge reçu avec fissure visible à l’ouverture.',
        amountHeldFcfa: 40500,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  // Pending KYC dossier for pendingVendor
  await db
    .collection('kycApplications')
    .doc('KYC-SEED-01')
    .set(
      {
        applicationId: 'KYC-SEED-01',
        userId: uidByKey.pendingVendor,
        applicantName: 'Karité Lab Cameroun',
        shopName: 'Karité Lab Cameroun',
        city: 'Yaoundé',
        neighborhood: 'Biyem-Assi',
        category: 'Beauté',
        cniNumber: 'CE-2026-994182',
        cniFrontUrl: IMG_KARITE,
        cniBackUrl: IMG_KARITE,
        selfieUrl: IMG_KARITE,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  // Sample RFQ + vendor quote
  await db
    .collection('rfqs')
    .doc('RFQ-SEED-01')
    .set(
      {
        rfqId: 'RFQ-SEED-01',
        buyerId: uidByKey.client,
        buyerName: 'Client Démo Douala',
        title: 'Lot 30 tenues Wax corporate Douala',
        description: 'Recherche 30 ensembles blazer + pantalon/jupe Wax livraison Akwa sous 5 jours.',
        category: 'Mode',
        quantity: 30,
        budgetFcfa: 600000,
        deadlineDays: 5,
        city: 'Douala',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  await db
    .collection('rfqs')
    .doc('RFQ-SEED-01')
    .collection('offers')
    .doc('OFFER-SEED-01')
    .set(
      {
        offerId: 'OFFER-SEED-01',
        rfqId: 'RFQ-SEED-01',
        buyerId: uidByKey.client,
        shopId: 'shop-akwa-mode',
        shopName: 'Maison Akwa Wax',
        shopCertified: true,
        vendorOwnerId: uidByKey.vendeur1,
        unitPriceFcfa: 19500,
        deliveryDays: 4,
        message: 'Stock disponible immédiatement à notre atelier d’Akwa.',
        status: 'pending',
        createdAt: now,
      },
      { merge: true }
    );

  // Sample conversation + messages
  await db
    .collection('conversations')
    .doc('CONV-SEED-01')
    .set(
      {
        conversationId: 'CONV-SEED-01',
        buyerId: uidByKey.client,
        buyerName: 'Client Démo Douala',
        shopId: 'shop-akwa-mode',
        shopName: 'Maison Akwa Wax',
        shopAvatarUrl: DEMO_SHOPS[0].avatarUrl,
        shopCertified: true,
        shopOnline: true,
        vendorOwnerId: uidByKey.vendeur1,
        unreadCount: 0,
        lastMessageText: 'Bonjour ! Les 24500 FCFA sont négociables à partir de 15 pièces.',
        updatedAt: now,
      },
      { merge: true }
    );

  await db
    .collection('conversations')
    .doc('CONV-SEED-01')
    .collection('messages')
    .doc('MSG-SEED-01')
    .set(
      {
        messageId: 'MSG-SEED-01',
        conversationId: 'CONV-SEED-01',
        senderId: uidByKey.client,
        senderName: 'Client Démo Douala',
        buyerId: uidByKey.client,
        vendorOwnerId: uidByKey.vendeur1,
        kind: 'text',
        text: 'Bonjour Maison Akwa Wax, avez-vous les tailles M et L en stock ?',
        createdAt: now,
      },
      { merge: true }
    );

  await db
    .collection('conversations')
    .doc('CONV-SEED-01')
    .collection('messages')
    .doc('MSG-SEED-02')
    .set(
      {
        messageId: 'MSG-SEED-02',
        conversationId: 'CONV-SEED-01',
        senderId: uidByKey.vendeur1,
        senderName: 'Maison Akwa Wax',
        buyerId: uidByKey.client,
        vendorOwnerId: uidByKey.vendeur1,
        kind: 'text',
        text: 'Bonjour ! Oui, stock complet à Akwa. Négociable dès 15 pièces.',
        createdAt: now,
      },
      { merge: true }
    );

  // Lively fictional demo comments and reviews (explicitly marked isDemo + (Démo))
  for (const [postId, comments] of Object.entries(DEMO_COMMENTS_BY_POST)) {
    for (const c of comments) {
      await db
        .collection('posts')
        .doc(postId)
        .collection('comments')
        .doc(c.commentId)
        .set(
          {
            commentId: c.commentId,
            postId,
            authorId: c.authorId,
            authorName: c.authorName,
            text: c.text,
            status: 'visible',
            isDemo: true,
            createdAt: now,
          },
          { merge: true }
        );
    }
  }

  for (const [postId, reviews] of Object.entries(DEMO_REVIEWS_BY_POST)) {
    for (const r of reviews) {
      await db
        .collection('posts')
        .doc(postId)
        .collection('reviews')
        .doc(r.reviewId)
        .set(
          {
            reviewId: r.reviewId,
            postId,
            authorId: r.authorId,
            authorName: r.authorName,
            rating: r.rating,
            comment: r.comment,
            isDemo: true,
            createdAt: now,
          },
          { merge: true }
        );
    }
  }

  // Platform settings (commission, enabled categories, announcement banner)
  await db
    .collection('platformConfig')
    .doc('settings')
    .set(
      {
        commissionPercent: 5,
        enabledCategories: ['Mode', 'Électronique', 'Beauté', 'Alimentation', 'Maison', 'Autre'],
        announcement: {
          title: 'Livraison inter-villes Douala ↔ Yaoundé',
          message: 'Frais offerts dès 150 000 FCFA par boutique et paiement protégé par séquestre DROPP.',
          active: true,
          updatedAt: now.toDate().toISOString(),
        },
        updatedAt: now,
        updatedBy: 'Super Admin DROPP',
      },
      { merge: true }
    );

  // Sample pending Mobile Money withdrawal request for Admin review
  await db
    .collection('withdrawalRequests')
    .doc('WDR-SEED-01')
    .set(
      {
        requestId: 'WDR-SEED-01',
        userId: uidByKey.vendeur1,
        userName: 'Maison Akwa Wax',
        userEmail: (process.env.SEED_VENDOR1_EMAIL?.trim() || 'vendeur1@dropp.test').toLowerCase(),
        amountFcfa: 15000,
        method: 'mtn_momo',
        phone: '677889900',
        status: 'pending',
        createdAt: now,
      },
      { merge: true }
    );

  // Initial audit log entry
  await db
    .collection('auditLogs')
    .doc('LOG-SEED-01')
    .set(
      {
        logId: 'LOG-SEED-01',
        actorId: uidByKey.admin,
        actorName: 'Super Admin DROPP',
        action: 'Initialisation environnement DROPP',
        targetType: 'settings',
        targetId: 'settings',
        details: 'Commission 5% · Catégories B2B activées',
        createdAt: now,
      },
      { merge: true }
    );

  console.log('Seed DROPP terminé avec succès sur Firestore.');
}

runSeed().catch((err) => {
  console.error('Échec du seed DROPP:', err);
  process.exit(1);
});
