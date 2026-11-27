import type { LanguageCode } from '../types/dropp';

export interface DroppDictionary {
  appName: string;
  tagline: string;
  nav: {
    feed: string;
    market: string;
    create: string;
    messages: string;
    profile: string;
  };
  feed: {
    following: string;
    forYou: string;
    searchPlaceholder: string;
    certified: string;
    moqLabel: string;
    orderNow: string;
    seeMore: string;
    seeLess: string;
    paused: string;
    tapToPlay: string;
    dataSaverActive: string;
    noFollowingTitle: string;
    noFollowingDesc: string;
    discoverForYou: string;
    storiesTitle: string;
    prevVideo: string;
    nextVideo: string;
  };
  actions: {
    follow: string;
    following: string;
    like: string;
    comments: string;
    bookmark: string;
    share: string;
    cart: string;
    close: string;
    cancel: string;
    retry: string;
    copyLink: string;
    linkCopied: string;
    installApp: string;
    installIosTitle: string;
    installIosStep1: string;
    installIosStep2: string;
    save: string;
    accept: string;
    decline: string;
    approve: string;
    reject: string;
    submit: string;
  };
  sheets: {
    commentsTitle: string;
    commentsEmpty: string;
    commentPlaceholder: string;
    sendComment: string;
    loginToInteract: string;
    statusPending: string;
    statusSent: string;
    statusFailed: string;
    quickOrderTitle: string;
    selectVariant: string;
    outOfStock: string;
    quantityLabel: string;
    wholesaleTiers: string;
    pcsUnit: string;
    sampleOption: string;
    unitPrice: string;
    estimatedTotal: string;
    addToCartPreview: string;
    addedToCart: string;
    openCartCheckout: string;
    phase2CheckoutNote: string;
    shareTitle: string;
    shareNative: string;
    storyTitle: string;
    storyReplyBtn: string;
    createVendorTitle: string;
    createVendorDesc: string;
    createPendingTitle: string;
    createPendingDesc: string;
    createClientTitle: string;
    createClientDesc: string;
    openVendorStudio: string;
    openRfqModal: string;
    openKycModal: string;
  };
  auth: {
    loginTitle: string;
    signupTitle: string;
    emailLabel: string;
    passwordLabel: string;
    nameLabel: string;
    cityLabel: string;
    loginSubmit: string;
    signupSubmit: string;
    switchToSignup: string;
    switchToLogin: string;
    googleSignIn: string;
    orDivider: string;
    signOut: string;
    emailPasswordDisabledNotice: string;
    genericAuthError: string;
    invalidCredentials: string;
  };
  network: {
    offlineBanner: string;
    backOnlineBanner: string;
    dataSaverLabel: string;
    dataSaverHint: string;
    slowNetworkBadge: string;
    offlineOrderBlocked: string;
  };
  market: {
    title: string;
    subtitle: string;
    allCategories: string;
    allCities: string;
    allNeighborhoods: string;
    certifiedOnly: string;
    resultsCount: string;
    watchVideo: string;
    viewProduct: string;
    noResults: string;
    filtersBtn: string;
    maxPriceLabel: string;
    maxMoqLabel: string;
    minRatingLabel: string;
    sortLabel: string;
    sortRecommended: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortRating: string;
    sortPopular: string;
    sortMoqAsc: string;
    resetFilters: string;
    compareAdd: string;
    compareSelected: string;
    compareOpen: string;
    compareTitle: string;
    compareEmpty: string;
    recommendedTitle: string;
    rfqBannerBtn: string;
    promoTag: string;
    applyFiltersBtn: string;
    demoBadge: string;
    activeFiltersLabel: string;
  };
  product: {
    detailTitle: string;
    specsTitle: string;
    reviewsTitle: string;
    noReviews: string;
    addReviewPlaceholder: string;
    submitReview: string;
    supplierCardTitle: string;
    memberSince: string;
    negotiateBtn: string;
    viewShopBtn: string;
    buyNowBtn: string;
    escrowBadge: string;
    demoBadge: string;
  };
  cart: {
    title: string;
    emptyTitle: string;
    emptyDesc: string;
    vendorSubtotal: string;
    shippingLabel: string;
    freeShippingNote: string;
    deliverySection: string;
    neighborhoodLabel: string;
    phoneLabel: string;
    paymentMethodLabel: string;
    methodWallet: string;
    methodMtn: string;
    methodOrange: string;
    simulatedOutcomeLabel: string;
    simulateSuccess: string;
    simulateFailure: string;
    grandTotal: string;
    payNowBtn: string;
    processingBtn: string;
    escrowNotice: string;
    errInsufficientWallet: string;
    errMobileFailed: string;
    errInvalidAddress: string;
    successTitle: string;
    successDesc: string;
    viewOrdersBtn: string;
    removeItem: string;
  };
  orders: {
    title: string;
    empty: string;
    filterAll: string;
    filterActive: string;
    filterDelivered: string;
    filterDisputed: string;
    statusAwaitingPayment: string;
    statusPending: string;
    statusConfirmed: string;
    statusDelivering: string;
    statusDelivered: string;
    statusCancelled: string;
    statusDisputed: string;
    escrowHeld: string;
    escrowReleased: string;
    escrowRefunded: string;
    escrowDisputed: string;
    cancelBtn: string;
    confirmReceiptBtn: string;
    openDisputeBtn: string;
    reorderBtn: string;
    rateBtn: string;
    disputePlaceholder: string;
    disputeSubmit: string;
    ratedLabel: string;
  };
  wallet: {
    title: string;
    availableLabel: string;
    escrowLabel: string;
    referralEarnedLabel: string;
    depositBtn: string;
    withdrawBtn: string;
    amountPlaceholder: string;
    historyTitle: string;
    noTransactions: string;
    insufficientBalance: string;
    txDeposit: string;
    txWithdrawal: string;
    txEscrowHold: string;
    txEscrowRelease: string;
    txRefund: string;
    txReferralBonus: string;
    phoneLabel: string;
    simulatedNotice: string;
    withdrawRequestsTitle: string;
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
  };
  messages: {
    title: string;
    subtitle: string;
    loginPrompt: string;
    onlineLabel: string;
    offlineLabel: string;
    messagePlaceholder: string;
    sendBtn: string;
    attachPhoto: string;
    attachVideo: string;
    attachFile: string;
    shareLocation: string;
    sendOfferBtn: string;
    offerCardTitle: string;
    offerAccepted: string;
    offerDeclined: string;
    offerPending: string;
    offerToOrderBtn: string;
    offerProductLabel: string;
    offerQtyLabel: string;
    offerUnitPriceLabel: string;
    offerShippingLabel: string;
    offerNoteLabel: string;
    tabChats: string;
    tabRfqs: string;
    noConversations: string;
  };
  rfq: {
    title: string;
    subtitle: string;
    createBtn: string;
    formTitleLabel: string;
    formDescLabel: string;
    formQtyLabel: string;
    formBudgetLabel: string;
    formDeadlineLabel: string;
    formPhotoLabel: string;
    submitRfqBtn: string;
    offersCountLabel: string;
    submitOfferBtn: string;
    offerPriceLabel: string;
    offerDaysLabel: string;
    offerMsgLabel: string;
    acceptOfferBtn: string;
    statusOpen: string;
    statusAwarded: string;
    noRfqs: string;
  };
  vendor: {
    studioTitle: string;
    tabPublish: string;
    tabOrders: string;
    tabStories: string;
    tabKyc: string;
    kycTitle: string;
    kycDesc: string;
    kycShopName: string;
    kycCniNumber: string;
    kycFrontLabel: string;
    kycBackLabel: string;
    kycSelfieLabel: string;
    kycSubmitBtn: string;
    kycStatusPending: string;
    kycStatusApproved: string;
    kycStatusRejected: string;
    publishVideoTab: string;
    publishPhotosTab: string;
    publishTitle: string;
    publishDesc: string;
    publishPrice: string;
    publishMoq: string;
    publishPromo: string;
    publishMediaSelect: string;
    publishSubmitBtn: string;
    videoDurationError: string;
    cloudinaryDemoHint: string;
    uploadingMedia: string;
    uploadedCloudinary: string;
    storyTextLabel: string;
    storyPublishBtn: string;
    acceptOrderBtn: string;
    shipOrderBtn: string;
    markDeliveredBtn: string;
    declineOrderBtn: string;
    cloudinaryRequiredError: string;
    chooseVideoBtn: string;
    choosePhotosBtn: string;
    chooseFileBtn: string;
    noFileChosen: string;
    kycThreePhotosRequired: string;
    tabRfq: string;
    kpiAvailableWallet: string;
    kpiPendingEscrow: string;
    kpiSalesCount: string;
    kpiPostsCount: string;
    backToProfile: string;
    openRfqBtn: string;
  };
  admin: {
    title: string;
    kpiPendingKyc: string;
    kpiActiveOrders: string;
    kpiEscrowTotal: string;
    kpiOpenDisputes: string;
    tabKyc: string;
    tabDisputes: string;
    tabShops: string;
    tabPosts: string;
    certifyBtn: string;
    uncertifyBtn: string;
    suspendBtn: string;
    refundBuyerBtn: string;
    releaseVendorBtn: string;
    disputeResolvedBuyer: string;
    disputeResolvedVendor: string;
    approvePostBtn: string;
    rejectPostBtn: string;
    accessDeniedTitle: string;
    accessDeniedDesc: string;
    backHomeBtn: string;
    tabOverview: string;
    tabUsers: string;
    tabWithdrawals: string;
    tabCategories: string;
    tabCommission: string;
    tabAnnouncements: string;
    tabAudit: string;
    searchUsersPlaceholder: string;
    suspendUserBtn: string;
    reactivateUserBtn: string;
    deleteUserBtn: string;
    confirmDeleteUser: string;
    approveWithdrawalBtn: string;
    rejectWithdrawalBtn: string;
    commissionLabel: string;
    saveSettingsBtn: string;
    announcementTitleLabel: string;
    announcementMsgLabel: string;
    announcementActiveLabel: string;
    emptyKyc: string;
    emptyUsers: string;
    emptyShops: string;
    emptyPosts: string;
    emptyDisputes: string;
    emptyWithdrawals: string;
    emptyAudit: string;
    backToProfile: string;
  };
  profile: {
    visitorTitle: string;
    visitorSubtitle: string;
    loginCta: string;
    followingCount: string;
    followersCount: string;
    likesCount: string;
    tabPosts: string;
    tabProducts: string;
    tabInfo: string;
    tabOrders: string;
    tabWallet: string;
    tabNotifs: string;
    walletLabel: string;
    escrowLabel: string;
    referralLabel: string;
    referralApplyPlaceholder: string;
    referralApplyBtn: string;
    referralHint: string;
    roleClient: string;
    roleVendor: string;
    roleAdmin: string;
    vendorPendingBanner: string;
    vendorSuspendedBanner: string;
    becomeVendorBtn: string;
    openVendorStudioBtn: string;
    openVendorOrdersReadOnlyBtn: string;
    openAdminBtn: string;
    languageLabel: string;
    themeLabel: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
    settingsTitle: string;
    emptyPosts: string;
    emptyBookmarks: string;
    savedItemsTitle: string;
    shopStatsRating: string;
    shopStatsSales: string;
    shopStatsResponse: string;
    backToMyProfile: string;
    notifPrefsTitle: string;
    notifOrders: string;
    notifMessages: string;
    notifFollowing: string;
    notifPromos: string;
    appRatingTitle: string;
    appRatingSubmitted: string;
    helpTitle: string;
    helpFaq1Q: string;
    helpFaq1A: string;
    helpFaq2Q: string;
    helpFaq2A: string;
  };
  errors: {
    title: string;
    desc: string;
    reload: string;
    retry: string;
    profileLoadTitle: string;
    profileLoadDesc: string;
    catalogLoadDesc: string;
    emptyCatalog: string;
    suspendedBlocked: string;
    adminBlocked: string;
    emailUnverified: string;
    writeFailed: string;
    readOnlyOrdersHint: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, DroppDictionary> = {
  fr: {
    appName: 'DROPP',
    tagline: 'Commerce vidéo au Cameroun',
    nav: {
      feed: 'Accueil',
      market: 'Marché',
      create: 'Publier',
      messages: 'Messages',
      profile: 'Profil',
    },
    feed: {
      following: 'Abonnements',
      forYou: 'Pour toi',
      searchPlaceholder: 'Rechercher un produit, une boutique, Douala, Yaoundé…',
      certified: 'Certifié',
      moqLabel: 'MOQ',
      orderNow: 'Commander',
      seeMore: 'Voir plus',
      seeLess: 'Réduire',
      paused: 'En pause',
      tapToPlay: 'Appuyer pour lire la vidéo',
      dataSaverActive: 'Économie de données active',
      noFollowingTitle: 'Aucune boutique suivie pour le moment',
      noFollowingDesc: 'Abonnez-vous aux fournisseurs dans « Pour toi » pour voir leurs nouveautés ici.',
      discoverForYou: 'Explorer Pour toi',
      storiesTitle: 'Stories boutiques',
      prevVideo: 'Vidéo précédente',
      nextVideo: 'Vidéo suivante',
    },
    actions: {
      follow: 'Suivre',
      following: 'Suivi',
      like: 'J’aime',
      comments: 'Commentaires',
      bookmark: 'Favori',
      share: 'Partager',
      cart: 'Panier',
      close: 'Fermer',
      cancel: 'Annuler',
      retry: 'Réessayer',
      copyLink: 'Copier le lien direct',
      linkCopied: 'Lien copié dans le presse-papiers',
      installApp: 'Installer DROPP',
      installIosTitle: 'Installer sur iPhone / iPad',
      installIosStep1: '1. Appuyez sur le bouton Partager dans la barre Safari.',
      installIosStep2: '2. Sélectionnez « Sur l’écran d’accueil ».',
      save: 'Enregistrer',
      accept: 'Accepter',
      decline: 'Refuser',
      approve: 'Approuver',
      reject: 'Rejeter',
      submit: 'Valider',
    },
    sheets: {
      commentsTitle: 'Commentaires',
      commentsEmpty: 'Soyez le premier à poser une question au fournisseur.',
      commentPlaceholder: 'Poser une question sur le prix ou la livraison…',
      sendComment: 'Envoyer',
      loginToInteract: 'Connectez-vous pour liker, commenter ou commander.',
      statusPending: 'En attente de réseau',
      statusSent: 'Envoyé',
      statusFailed: 'Échec : réessayer',
      quickOrderTitle: 'Sélection & Prix de gros',
      selectVariant: 'Variante disponible',
      outOfStock: 'Rupture',
      quantityLabel: 'Quantité',
      wholesaleTiers: 'Paliers de gros',
      pcsUnit: 'pcs',
      sampleOption: 'Commander un échantillon (1 pc)',
      unitPrice: 'Prix unitaire',
      estimatedTotal: 'Total estimé',
      addToCartPreview: 'Ajouter au panier',
      addedToCart: 'Ajouté au panier',
      openCartCheckout: 'Voir le panier & payer',
      phase2CheckoutNote: 'Paiement protégé par séquestre DROPP (MoMo, OM, Portefeuille).',
      shareTitle: 'Partager cette publication',
      shareNative: 'Partager via appareil',
      storyTitle: 'Story boutique 24 h',
      storyReplyBtn: 'Discuter avec la boutique',
      createVendorTitle: 'Espace création Vendeur',
      createVendorDesc: 'Publiez une vidéo courte (15 s max) ou un carrousel produit et gérez vos stories 24 h.',
      createPendingTitle: 'Dossier CNI en attente de validation',
      createPendingDesc: 'Votre identité est en cours de vérification par l’administrateur. Complétez ou suivez votre dossier KYC.',
      createClientTitle: 'Demander un devis (RFQ)',
      createClientDesc: 'Décrivez votre besoin en gros (quantité, budget, délai) et comparez les offres des fournisseurs.',
      openVendorStudio: 'Ouvrir l’atelier Vendeur',
      openRfqModal: 'Créer / voir mes devis (RFQ)',
      openKycModal: 'Voir mon dossier CNI',
    },
    auth: {
      loginTitle: 'Connexion à DROPP',
      signupTitle: 'Créer un compte client',
      emailLabel: 'Adresse e-mail',
      passwordLabel: 'Mot de passe',
      nameLabel: 'Nom complet',
      cityLabel: 'Ville',
      loginSubmit: 'Se connecter',
      signupSubmit: 'Créer mon compte',
      switchToSignup: 'Pas encore de compte ? S’inscrire',
      switchToLogin: 'Déjà un compte ? Se connecter',
      googleSignIn: 'Continuer avec Google',
      orDivider: 'ou',
      signOut: 'Se déconnecter',
      emailPasswordDisabledNotice:
        'La connexion par e-mail/mot de passe doit encore être activée dans la console Firebase du projet. Vous pouvez aussi utiliser Google dès maintenant.',
      genericAuthError: 'Impossible de finaliser la connexion. Vérifiez votre connexion.',
      invalidCredentials: 'E-mail ou mot de passe incorrect.',
    },
    network: {
      offlineBanner: 'Hors ligne — données en cache affichées',
      backOnlineBanner: 'Connexion rétablie',
      dataSaverLabel: 'Mode économie de données',
      dataSaverHint: 'Désactive la lecture automatique et limite les médias à 480p.',
      slowNetworkBadge: 'Réseau lent détecté · 480p',
      offlineOrderBlocked: 'Action bloquée hors ligne : reconnectez-vous pour commander ou payer.',
    },
    market: {
      title: 'Marché',
      subtitle: 'Fournisseurs gros & détail à Douala et Yaoundé',
      allCategories: 'Toutes',
      allCities: 'Toutes les villes',
      allNeighborhoods: 'Tous quartiers',
      certifiedOnly: 'Certifiés uniquement',
      resultsCount: 'produits disponibles',
      watchVideo: 'Voir la vidéo',
      viewProduct: 'Fiche & gros',
      noResults: 'Aucun produit ne correspond à votre recherche.',
      filtersBtn: 'Filtres',
      maxPriceLabel: 'Prix max (FCFA)',
      maxMoqLabel: 'MOQ max',
      minRatingLabel: 'Note min',
      sortLabel: 'Trier par',
      sortRecommended: 'Recommandés pour vous',
      sortPriceAsc: 'Prix croissant',
      sortPriceDesc: 'Prix décroissant',
      sortRating: 'Meilleures notes',
      sortPopular: 'Plus populaires',
      sortMoqAsc: 'MOQ le plus bas',
      resetFilters: 'Réinitialiser',
      compareAdd: 'Comparer',
      compareSelected: 'Comparé',
      compareOpen: 'Comparer',
      compareTitle: 'Comparateur fournisseurs',
      compareEmpty: 'Sélectionnez 2 à 4 produits pour les comparer.',
      recommendedTitle: 'Recommandé selon vos intérêts',
      rfqBannerBtn: 'Demander un devis (RFQ)',
      promoTag: 'Promo',
      applyFiltersBtn: 'Appliquer les filtres',
      demoBadge: 'Démo fictive',
      activeFiltersLabel: 'filtres actifs',
    },
    product: {
      detailTitle: 'Fiche produit grossiste',
      specsTitle: 'Caractéristiques techniques',
      reviewsTitle: 'Avis acheteurs',
      noReviews: 'Aucun avis pour le moment.',
      addReviewPlaceholder: 'Partagez votre retour sur la qualité et le délai…',
      submitReview: 'Publier l’avis',
      supplierCardTitle: 'Fournisseur vérifié',
      memberSince: 'Membre depuis',
      negotiateBtn: 'Négocier le prix',
      viewShopBtn: 'Voir la boutique',
      buyNowBtn: 'Commander maintenant',
      escrowBadge: 'Paiement protégé par séquestre DROPP',
      demoBadge: 'Démo fictive',
    },
    cart: {
      title: 'Panier multi-vendeurs',
      emptyTitle: 'Votre panier est vide',
      emptyDesc: 'Ajoutez des lots ou des échantillons depuis le flux vidéo ou le Marché.',
      vendorSubtotal: 'Sous-total boutique',
      shippingLabel: 'Livraison par palier',
      freeShippingNote: 'Livraison offerte dès 150 000 FCFA par boutique',
      deliverySection: 'Adresse de livraison',
      neighborhoodLabel: 'Quartier (ex : Akwa, Bastos, Bonamoussadi)',
      phoneLabel: 'Téléphone Mobile Money / contact',
      paymentMethodLabel: 'Moyen de paiement',
      methodWallet: 'Portefeuille DROPP',
      methodMtn: 'MTN MoMo (Simulé)',
      methodOrange: 'Orange Money (Simulé)',
      simulatedOutcomeLabel: 'Mode simulation paiement',
      simulateSuccess: 'Simuler réussite',
      simulateFailure: 'Simuler échec réseau',
      grandTotal: 'Total global à payer',
      payNowBtn: 'Payer et bloquer en séquestre',
      processingBtn: 'Traitement sécurisé…',
      escrowNotice: 'Votre argent reste bloqué en séquestre jusqu’à confirmation de réception.',
      errInsufficientWallet: 'Solde du portefeuille DROPP insuffisant pour cette commande.',
      errMobileFailed: 'Paiement Mobile Money refusé (simulation). Commande enregistrée en attente de paiement.',
      errInvalidAddress: 'Renseignez la ville, le quartier et un numéro à 8 chiffres minimum.',
      successTitle: 'Commande confirmée et protégée !',
      successDesc: 'Vos sous-commandes par vendeur sont enregistrées et les fonds sont sécurisés en séquestre.',
      viewOrdersBtn: 'Suivre mes commandes',
      removeItem: 'Retirer',
    },
    orders: {
      title: 'Mes commandes & Séquestre',
      empty: 'Aucune commande pour le moment.',
      filterAll: 'Toutes',
      filterActive: 'En cours',
      filterDelivered: 'Livrées',
      filterDisputed: 'Litiges',
      statusAwaitingPayment: 'En attente de paiement',
      statusPending: 'En attente',
      statusConfirmed: 'Confirmée',
      statusDelivering: 'En livraison',
      statusDelivered: 'Livrée',
      statusCancelled: 'Annulée',
      statusDisputed: 'En litige',
      escrowHeld: 'Séquestre bloqué',
      escrowReleased: 'Fonds libérés',
      escrowRefunded: 'Remboursé',
      escrowDisputed: 'Bloqué (litige)',
      cancelBtn: 'Annuler la commande',
      confirmReceiptBtn: 'Confirmer la réception',
      openDisputeBtn: 'Signaler un litige (24 h)',
      reorderBtn: 'Recommander',
      rateBtn: 'Noter 5/5',
      disputePlaceholder: 'Motif de réclamation (produit endommagé, quantité manquante)…',
      disputeSubmit: 'Envoyer la réclamation',
      ratedLabel: 'Commande notée',
    },
    wallet: {
      title: 'Portefeuille DROPP',
      availableLabel: 'Solde disponible',
      escrowLabel: 'Bloqué en séquestre',
      referralEarnedLabel: 'Bonus parrainage cumulé',
      depositBtn: 'Déposer (MoMo / OM)',
      withdrawBtn: 'Retirer vers Mobile Money',
      amountPlaceholder: 'Montant en FCFA (ex : 25000)',
      historyTitle: 'Historique des mouvements',
      noTransactions: 'Aucune transaction enregistrée.',
      insufficientBalance: 'Solde disponible insuffisant pour ce retrait.',
      txDeposit: 'Dépôt Mobile Money',
      txWithdrawal: 'Retrait Mobile Money',
      txEscrowHold: 'Paiement bloqué en séquestre',
      txEscrowRelease: 'Libération séquestre',
      txRefund: 'Remboursement commande',
      txReferralBonus: 'Bonus parrainage (+500 FCFA)',
      phoneLabel: 'Numéro Mobile Money (ex : 677102030)',
      simulatedNotice: 'Paiement Mobile Money simulé sur cet environnement de test (aucun prélèvement réel).',
      withdrawRequestsTitle: 'Demandes de retrait',
      statusPending: 'En attente',
      statusApproved: 'Approuvé',
      statusRejected: 'Rejeté',
    },
    messages: {
      title: 'Messages & Négociations',
      subtitle: 'Discussions directes, offres chiffrées et devis (RFQ)',
      loginPrompt: 'Connectez-vous pour discuter, envoyer des offres et négocier.',
      onlineLabel: 'En ligne',
      offlineLabel: 'Hors ligne',
      messagePlaceholder: 'Écrire un message ou demander un tarif de gros…',
      sendBtn: 'Envoyer',
      attachPhoto: 'Photo',
      attachVideo: 'Vidéo',
      attachFile: 'Fichier',
      shareLocation: 'Localisation',
      sendOfferBtn: 'Envoyer une offre chiffrée',
      offerCardTitle: 'Offre négociée fournisseur',
      offerAccepted: 'Offre acceptée',
      offerDeclined: 'Offre refusée',
      offerPending: 'En attente de réponse',
      offerToOrderBtn: 'Passer commande avec cette offre',
      offerProductLabel: 'Produit',
      offerQtyLabel: 'Quantité',
      offerUnitPriceLabel: 'Prix unitaire négocié (FCFA)',
      offerShippingLabel: 'Livraison (FCFA)',
      offerNoteLabel: 'Conditions (délai, agence…)',
      tabChats: 'Discussions',
      tabRfqs: 'Devis (RFQ)',
      noConversations: 'Aucune discussion active. Contactez une boutique depuis le Marché.',
    },
    rfq: {
      title: 'Demandes de devis (RFQ)',
      subtitle: 'Publiez votre besoin en gros et comparez les offres des fournisseurs',
      createBtn: 'Nouveau devis',
      formTitleLabel: 'Produit recherché',
      formDescLabel: 'Détails techniques, couleur, qualité souhaitée',
      formQtyLabel: 'Quantité souhaitée',
      formBudgetLabel: 'Budget total cible (FCFA)',
      formDeadlineLabel: 'Délai souhaité (jours)',
      formPhotoLabel: 'Photo de référence (optionnel)',
      submitRfqBtn: 'Publier la demande de devis',
      offersCountLabel: 'offres reçues',
      submitOfferBtn: 'Répondre avec une offre',
      offerPriceLabel: 'Prix unitaire proposé (FCFA)',
      offerDaysLabel: 'Délai livraison (jours)',
      offerMsgLabel: 'Message au client',
      acceptOfferBtn: 'Accepter et commander',
      statusOpen: 'Ouvert',
      statusAwarded: 'Attribué',
      noRfqs: 'Aucune demande de devis publiée.',
    },
    vendor: {
      studioTitle: 'Espace Vendeur DROPP',
      tabPublish: 'Publier',
      tabOrders: 'Commandes',
      tabStories: 'Story 24 h',
      tabKyc: 'Vérification CNI',
      kycTitle: 'Vérification d’identité fournisseur',
      kycDesc: 'Soumettez votre CNI recto/verso et un selfie pour obtenir l’activation de votre boutique.',
      kycShopName: 'Nom de la boutique',
      kycCniNumber: 'Numéro de CNI',
      kycFrontLabel: 'CNI Recto',
      kycBackLabel: 'CNI Verso',
      kycSelfieLabel: 'Selfie de contrôle',
      kycSubmitBtn: 'Soumettre mon dossier KYC',
      kycStatusPending: 'Dossier en attente de validation par l’administrateur.',
      kycStatusApproved: 'Boutique approuvée — vous pouvez publier et vendre.',
      kycStatusRejected: 'Dossier rejeté — corrigez les pièces et soumettez à nouveau.',
      publishVideoTab: 'Vidéo courte (≤ 15 s)',
      publishPhotosTab: 'Photos (jusqu’à 10)',
      publishTitle: 'Titre du produit',
      publishDesc: 'Description et points forts',
      publishPrice: 'Prix de base (FCFA)',
      publishMoq: 'Quantité minimale (MOQ)',
      publishPromo: 'Promotion (%)',
      publishMediaSelect: 'Choisir un fichier média',
      publishSubmitBtn: 'Publier dans le flux & Marché',
      videoDurationError: 'La vidéo dépasse 15 secondes. Choisissez un extrait de 15 s maximum.',
      cloudinaryDemoHint: 'Téléversement signé obligatoire via Cloudinary (aucun média de démo par défaut).',
      uploadingMedia: 'Envoi sécurisé vers Cloudinary en cours…',
      uploadedCloudinary: 'Média hébergé sur Cloudinary.',
      storyTextLabel: 'Annonce Story 24 h (arrivage, promo flash…)',
      storyPublishBtn: 'Publier la Story 24 h',
      acceptOrderBtn: 'Accepter',
      shipOrderBtn: 'Expédier',
      markDeliveredBtn: 'Marquer livrée',
      declineOrderBtn: 'Refuser',
      cloudinaryRequiredError: 'Cloudinary n’est pas configuré ou le média n’a pas été sélectionné. Téléversez un vrai fichier pour publier.',
      chooseVideoBtn: 'Choisir une vidéo (≤ 15 s)',
      choosePhotosBtn: 'Choisir des photos (max 10)',
      chooseFileBtn: 'Choisir une photo',
      noFileChosen: 'Aucun fichier sélectionné',
      kycThreePhotosRequired: 'Les 3 photos (CNI recto, CNI verso et selfie) sont obligatoires.',
      tabRfq: 'Devis (RFQ)',
      kpiAvailableWallet: 'Solde disponible',
      kpiPendingEscrow: 'En séquestre',
      kpiSalesCount: 'Ventes confirmées',
      kpiPostsCount: 'Publications',
      backToProfile: '← Mon profil',
      openRfqBtn: 'Répondre aux devis (RFQ)',
    },
    admin: {
      title: 'Console Super Admin DROPP',
      kpiPendingKyc: 'KYC en attente',
      kpiActiveOrders: 'Commandes actives',
      kpiEscrowTotal: 'Séquestre total',
      kpiOpenDisputes: 'Litiges ouverts',
      tabKyc: 'Validation KYC',
      tabDisputes: 'Litiges',
      tabShops: 'Boutiques',
      tabPosts: 'Modération',
      certifyBtn: 'Certifier',
      uncertifyBtn: 'Retirer badge',
      suspendBtn: 'Suspendre',
      refundBuyerBtn: 'Rembourser l’acheteur',
      releaseVendorBtn: 'Libérer au vendeur',
      disputeResolvedBuyer: 'Résolu : acheteur remboursé',
      disputeResolvedVendor: 'Résolu : fonds libérés au vendeur',
      approvePostBtn: 'Publier',
      rejectPostBtn: 'Masquer',
      accessDeniedTitle: 'Accès refusé — Espace Super Admin',
      accessDeniedDesc: 'Cette page est strictement réservée au Super Administrateur DROPP vérifié côté serveur.',
      backHomeBtn: 'Retour à l’accueil',
      tabOverview: 'Vue globale',
      tabUsers: 'Utilisateurs',
      tabWithdrawals: 'Retraits',
      tabCategories: 'Catégories',
      tabCommission: 'Commission',
      tabAnnouncements: 'Annonces',
      tabAudit: 'Journal d’audit',
      searchUsersPlaceholder: 'Rechercher par nom, e-mail, UID ou rôle…',
      suspendUserBtn: 'Suspendre',
      reactivateUserBtn: 'Réactiver',
      deleteUserBtn: 'Supprimer',
      confirmDeleteUser: 'Confirmer suppression',
      approveWithdrawalBtn: 'Approuver',
      rejectWithdrawalBtn: 'Rejeter',
      commissionLabel: 'Taux de commission plateforme (%)',
      saveSettingsBtn: 'Enregistrer les réglages',
      announcementTitleLabel: 'Titre de l’annonce globale',
      announcementMsgLabel: 'Message affiché aux utilisateurs',
      announcementActiveLabel: 'Afficher la bannière d’annonce',
      emptyKyc: 'Aucun dossier KYC vendeur soumis pour le moment.',
      emptyUsers: 'Aucun utilisateur trouvé pour cette recherche.',
      emptyShops: 'Aucune boutique enregistrée pour le moment.',
      emptyPosts: 'Aucune publication à modérer pour le moment.',
      emptyDisputes: 'Aucun litige ouvert ou archivé pour le moment.',
      emptyWithdrawals: 'Aucune demande de retrait en attente ou traitée.',
      emptyAudit: 'Aucune action administrative enregistrée dans le journal.',
      backToProfile: '← Mon profil',
    },
    profile: {
      visitorTitle: 'Bienvenue sur DROPP',
      visitorSubtitle: 'Connectez-vous pour suivre vos boutiques, enregistrer vos favoris et commander en FCFA.',
      loginCta: 'Se connecter / S’inscrire',
      followingCount: 'Abonnements',
      followersCount: 'Abonnés',
      likesCount: 'J’aime',
      tabPosts: 'Publications',
      tabProducts: 'Produits',
      tabInfo: 'Infos',
      tabOrders: 'Commandes',
      tabWallet: 'Portefeuille',
      tabNotifs: 'Alertes & Aide',
      walletLabel: 'Portefeuille DROPP',
      escrowLabel: 'En séquestre',
      referralLabel: 'Code parrainage',
      referralApplyPlaceholder: 'Code parrain (ex : DROPP-AKWA1)',
      referralApplyBtn: 'Appliquer',
      referralHint: '500 FCFA crédités après la première commande livrée du filleul.',
      roleClient: 'Client',
      roleVendor: 'Vendeur',
      roleAdmin: 'Super Admin',
      vendorPendingBanner: 'Vérification d’identité en attente — publication et commandes suspendues jusqu’à validation.',
      vendorSuspendedBanner: 'Boutique suspendue — vos publications sont masquées et les actions sont bloquées. Vos commandes restent consultables en lecture seule.',
      becomeVendorBtn: 'Devenir vendeur (KYC CNI)',
      openVendorStudioBtn: 'Ouvrir l’Espace Vendeur',
      openVendorOrdersReadOnlyBtn: 'Voir mes commandes (lecture seule)',
      openAdminBtn: 'Console Super Admin',
      languageLabel: 'Langue de l’interface',
      themeLabel: 'Apparence (Thème)',
      themeDark: 'Sombre',
      themeLight: 'Clair',
      themeSystem: 'Auto',
      settingsTitle: 'Préférences & Réseau',
      emptyPosts: 'Aucune publication pour le moment.',
      emptyBookmarks: 'Aucun favori enregistré.',
      savedItemsTitle: 'Favoris enregistrés (hors ligne inclus)',
      shopStatsRating: 'Note',
      shopStatsSales: 'Ventes',
      shopStatsResponse: 'Réponse',
      backToMyProfile: 'Mon profil',
      notifPrefsTitle: 'Préférences de notifications',
      notifOrders: 'Commandes & Séquestre',
      notifMessages: 'Messages & Offres négociées',
      notifFollowing: 'Nouveautés boutiques suivies',
      notifPromos: 'Promotions & Devis (RFQ)',
      appRatingTitle: 'Noter l’application DROPP',
      appRatingSubmitted: 'Merci pour votre note sur DROPP !',
      helpTitle: 'Aide & Support Cameroun',
      helpFaq1Q: 'Comment fonctionne le paiement protégé (séquestre) ?',
      helpFaq1A: 'Votre paiement (Portefeuille, MTN MoMo ou Orange Money) est bloqué sur DROPP jusqu’à ce que vous confirmiez la réception du colis.',
      helpFaq2Q: 'Comment expédier entre Douala et Yaoundé ?',
      helpFaq2A: 'Les fournisseurs expédient via les agences interurbaines (Buca, Finexs, Touristique) ou par coursier local sous 24 à 48 h.',
    },
    errors: {
      title: 'Un incident est survenu',
      desc: 'L’interface a rencontré une erreur inattendue. Vos données locales sont préservées.',
      reload: 'Recharger l’application',
      retry: 'Réessayer',
      profileLoadTitle: 'Impossible de charger votre profil',
      profileLoadDesc: 'La session serveur n’a pas répondu ou le compte administrateur n’est pas encore configuré.',
      catalogLoadDesc: 'Impossible de lire les produits depuis Firestore pour le moment.',
      emptyCatalog: 'Aucune publication disponible dans le catalogue pour l’instant.',
      suspendedBlocked: 'Compte vendeur suspendu : cette action est désactivée.',
      adminBlocked: 'Le compte Super Admin modère la plateforme et n’effectue pas d’achat, de like ou de publication vendeur.',
      emailUnverified: 'Vérifiez votre adresse e-mail via le lien reçu avant de soumettre une commande ou un dossier KYC.',
      writeFailed: 'Échec de l’enregistrement dans la base partagée. Réessayez.',
      readOnlyOrdersHint: 'Mode lecture seule : boutique suspendue, les changements de statut sont bloqués.',
    },
  },
  en: {
    appName: 'DROPP',
    tagline: 'Cameroon Social Commerce',
    nav: {
      feed: 'Home',
      market: 'Market',
      create: 'Create',
      messages: 'Messages',
      profile: 'Profile',
    },
    feed: {
      following: 'Following',
      forYou: 'For You',
      searchPlaceholder: 'Search products, shops, Douala, Yaoundé…',
      certified: 'Verified',
      moqLabel: 'MOQ',
      orderNow: 'Order Now',
      seeMore: 'See more',
      seeLess: 'Less',
      paused: 'Paused',
      tapToPlay: 'Tap to play video',
      dataSaverActive: 'Data Saver active',
      noFollowingTitle: 'No followed shops yet',
      noFollowingDesc: 'Follow suppliers in "For You" to see their latest drops here.',
      discoverForYou: 'Explore For You',
      storiesTitle: 'Shop stories',
      prevVideo: 'Previous video',
      nextVideo: 'Next video',
    },
    actions: {
      follow: 'Follow',
      following: 'Following',
      like: 'Like',
      comments: 'Comments',
      bookmark: 'Save',
      share: 'Share',
      cart: 'Cart',
      close: 'Close',
      cancel: 'Cancel',
      retry: 'Retry',
      copyLink: 'Copy direct link',
      linkCopied: 'Link copied to clipboard',
      installApp: 'Install DROPP',
      installIosTitle: 'Install on iPhone / iPad',
      installIosStep1: '1. Tap the Share button in Safari.',
      installIosStep2: '2. Tap "Add to Home Screen".',
      save: 'Save',
      accept: 'Accept',
      decline: 'Decline',
      approve: 'Approve',
      reject: 'Reject',
      submit: 'Submit',
    },
    sheets: {
      commentsTitle: 'Comments',
      commentsEmpty: 'Be the first to ask the supplier a question.',
      commentPlaceholder: 'Ask about wholesale pricing or delivery…',
      sendComment: 'Send',
      loginToInteract: 'Sign in to like, comment, or place orders.',
      statusPending: 'Queued offline',
      statusSent: 'Sent',
      statusFailed: 'Failed: retry',
      quickOrderTitle: 'Variants & Wholesale Tiers',
      selectVariant: 'Available variant',
      outOfStock: 'Out of stock',
      quantityLabel: 'Quantity',
      wholesaleTiers: 'Wholesale tiers',
      pcsUnit: 'pcs',
      sampleOption: 'Order a sample (1 pc)',
      unitPrice: 'Unit price',
      estimatedTotal: 'Estimated total',
      addToCartPreview: 'Add to cart',
      addedToCart: 'Added to cart',
      openCartCheckout: 'Open cart & checkout',
      phase2CheckoutNote: 'Protected by DROPP Escrow (MoMo, Orange Money, Wallet).',
      shareTitle: 'Share this post',
      shareNative: 'Share via device',
      storyTitle: '24h Shop Story',
      storyReplyBtn: 'Message this shop',
      createVendorTitle: 'Vendor Creator Studio',
      createVendorDesc: 'Publish a short product video (max 15s) or photo carousel and post 24h stories.',
      createPendingTitle: 'Vendor KYC pending verification',
      createPendingDesc: 'Your national ID application is under admin review. View or update your KYC status.',
      createClientTitle: 'Request for Quote (RFQ)',
      createClientDesc: 'Describe your wholesale need (quantity, budget, deadline) and compare supplier offers.',
      openVendorStudio: 'Open Vendor Studio',
      openRfqModal: 'Create / view RFQs',
      openKycModal: 'View KYC application',
    },
    auth: {
      loginTitle: 'Sign in to DROPP',
      signupTitle: 'Create a buyer account',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      nameLabel: 'Full name',
      cityLabel: 'City',
      loginSubmit: 'Sign in',
      signupSubmit: 'Create account',
      switchToSignup: 'New here? Sign up',
      switchToLogin: 'Already have an account? Sign in',
      googleSignIn: 'Continue with Google',
      orDivider: 'or',
      signOut: 'Sign out',
      emailPasswordDisabledNotice:
        'Email/Password sign-in must be enabled in the Firebase Console for this project. You can also sign in with Google right now.',
      genericAuthError: 'Could not complete sign-in. Please check your connection.',
      invalidCredentials: 'Incorrect email or password.',
    },
    network: {
      offlineBanner: 'Offline — showing cached data',
      backOnlineBanner: 'Back online',
      dataSaverLabel: 'Data Saver mode',
      dataSaverHint: 'Disables video autoplay and caps media at 480p.',
      slowNetworkBadge: 'Slow network · 480p',
      offlineOrderBlocked: 'Blocked offline: reconnect to place orders or pay.',
    },
    market: {
      title: 'Marketplace',
      subtitle: 'Wholesale & retail suppliers in Douala and Yaoundé',
      allCategories: 'All',
      allCities: 'All cities',
      allNeighborhoods: 'All neighborhoods',
      certifiedOnly: 'Verified only',
      resultsCount: 'products available',
      watchVideo: 'Watch video',
      viewProduct: 'Details & tiers',
      noResults: 'No products match your search.',
      filtersBtn: 'Filters',
      maxPriceLabel: 'Max price (FCFA)',
      maxMoqLabel: 'Max MOQ',
      minRatingLabel: 'Min rating',
      sortLabel: 'Sort by',
      sortRecommended: 'Recommended for you',
      sortPriceAsc: 'Price: low to high',
      sortPriceDesc: 'Price: high to low',
      sortRating: 'Top rated',
      sortPopular: 'Most popular',
      sortMoqAsc: 'Lowest MOQ',
      resetFilters: 'Reset',
      compareAdd: 'Compare',
      compareSelected: 'Comparing',
      compareOpen: 'Compare',
      compareTitle: 'Product comparison',
      compareEmpty: 'Select 2 to 4 products to compare side by side.',
      recommendedTitle: 'Recommended from your interests',
      rfqBannerBtn: 'Request a Quote (RFQ)',
      promoTag: 'Deal',
      applyFiltersBtn: 'Apply filters',
      demoBadge: 'Demo sample',
      activeFiltersLabel: 'active filters',
    },
    product: {
      detailTitle: 'Wholesale product sheet',
      specsTitle: 'Specifications',
      reviewsTitle: 'Buyer reviews',
      noReviews: 'No reviews yet.',
      addReviewPlaceholder: 'Share feedback on quality and delivery speed…',
      submitReview: 'Post review',
      supplierCardTitle: 'Supplier overview',
      memberSince: 'Member since',
      negotiateBtn: 'Negotiate price',
      viewShopBtn: 'View shop',
      buyNowBtn: 'Order now',
      escrowBadge: 'Protected by DROPP Escrow',
      demoBadge: 'Demo sample',
    },
    cart: {
      title: 'Multi-vendor cart',
      emptyTitle: 'Your cart is empty',
      emptyDesc: 'Add wholesale lots or samples from the video feed or Marketplace.',
      vendorSubtotal: 'Shop subtotal',
      shippingLabel: 'Tiered shipping',
      freeShippingNote: 'Free shipping from 150 000 FCFA per shop',
      deliverySection: 'Delivery address',
      neighborhoodLabel: 'Neighborhood (e.g., Akwa, Bastos, Bonamoussadi)',
      phoneLabel: 'Mobile Money / contact phone',
      paymentMethodLabel: 'Payment method',
      methodWallet: 'DROPP Wallet',
      methodMtn: 'MTN MoMo (Simulated)',
      methodOrange: 'Orange Money (Simulated)',
      simulatedOutcomeLabel: 'Payment simulation mode',
      simulateSuccess: 'Simulate success',
      simulateFailure: 'Simulate network failure',
      grandTotal: 'Total due',
      payNowBtn: 'Pay & lock in escrow',
      processingBtn: 'Processing safely…',
      escrowNotice: 'Funds stay locked in escrow until you confirm delivery.',
      errInsufficientWallet: 'Insufficient DROPP Wallet balance for this checkout.',
      errMobileFailed: 'Simulated Mobile Money payment failed. Orders saved as awaiting payment.',
      errInvalidAddress: 'Please enter city, neighborhood, and an 8+ digit phone number.',
      successTitle: 'Order confirmed & protected!',
      successDesc: 'Sub-orders were created per vendor and funds are safely locked in escrow.',
      viewOrdersBtn: 'Track my orders',
      removeItem: 'Remove',
    },
    orders: {
      title: 'My orders & Escrow',
      empty: 'No orders placed yet.',
      filterAll: 'All',
      filterActive: 'Active',
      filterDelivered: 'Delivered',
      filterDisputed: 'Disputed',
      statusAwaitingPayment: 'Awaiting payment',
      statusPending: 'Pending',
      statusConfirmed: 'Confirmed',
      statusDelivering: 'Delivering',
      statusDelivered: 'Delivered',
      statusCancelled: 'Cancelled',
      statusDisputed: 'Disputed',
      escrowHeld: 'Escrow held',
      escrowReleased: 'Funds released',
      escrowRefunded: 'Refunded',
      escrowDisputed: 'Frozen (dispute)',
      cancelBtn: 'Cancel order',
      confirmReceiptBtn: 'Confirm delivery',
      openDisputeBtn: 'Open dispute (24h)',
      reorderBtn: 'Reorder',
      rateBtn: 'Rate 5/5',
      disputePlaceholder: 'Dispute reason (damaged item, missing units)…',
      disputeSubmit: 'Submit dispute',
      ratedLabel: 'Order rated',
    },
    wallet: {
      title: 'DROPP Wallet',
      availableLabel: 'Available balance',
      escrowLabel: 'Held in escrow',
      referralEarnedLabel: 'Referral bonus earned',
      depositBtn: 'Deposit (MoMo / OM)',
      withdrawBtn: 'Withdraw to Mobile Money',
      amountPlaceholder: 'Amount in FCFA (e.g., 25000)',
      historyTitle: 'Transaction history',
      noTransactions: 'No transactions yet.',
      insufficientBalance: 'Insufficient available balance for withdrawal.',
      txDeposit: 'Mobile Money Deposit',
      txWithdrawal: 'Mobile Money Withdrawal',
      txEscrowHold: 'Escrow payment hold',
      txEscrowRelease: 'Escrow payout released',
      txRefund: 'Order refund',
      txReferralBonus: 'Referral bonus (+500 FCFA)',
      phoneLabel: 'Mobile Money phone (e.g., 677102030)',
      simulatedNotice: 'Simulated Mobile Money flow for testing (no real funds are charged).',
      withdrawRequestsTitle: 'Withdrawal requests',
      statusPending: 'Pending',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
    },
    messages: {
      title: 'Messages & Negotiation',
      subtitle: 'Direct supplier chat, price offer cards, and RFQs',
      loginPrompt: 'Sign in to chat, negotiate wholesale prices, and accept offers.',
      onlineLabel: 'Online',
      offlineLabel: 'Offline',
      messagePlaceholder: 'Write a message or ask for a bulk discount…',
      sendBtn: 'Send',
      attachPhoto: 'Photo',
      attachVideo: 'Video',
      attachFile: 'File',
      shareLocation: 'Location',
      sendOfferBtn: 'Send price offer card',
      offerCardTitle: 'Supplier deal offer',
      offerAccepted: 'Offer accepted',
      offerDeclined: 'Offer declined',
      offerPending: 'Awaiting response',
      offerToOrderBtn: 'Checkout with this offer',
      offerProductLabel: 'Product',
      offerQtyLabel: 'Quantity',
      offerUnitPriceLabel: 'Negotiated unit price (FCFA)',
      offerShippingLabel: 'Shipping fee (FCFA)',
      offerNoteLabel: 'Terms (lead time, bus agency…)',
      tabChats: 'Chats',
      tabRfqs: 'RFQs',
      noConversations: 'No active chats yet. Message any supplier from the Marketplace.',
    },
    rfq: {
      title: 'Requests for Quote (RFQ)',
      subtitle: 'Post your wholesale requirement and compare supplier quotes',
      createBtn: 'New RFQ',
      formTitleLabel: 'Product needed',
      formDescLabel: 'Specifications, colors, packaging',
      formQtyLabel: 'Target quantity',
      formBudgetLabel: 'Target budget (FCFA)',
      formDeadlineLabel: 'Target deadline (days)',
      formPhotoLabel: 'Reference photo (optional)',
      submitRfqBtn: 'Publish RFQ',
      offersCountLabel: 'offers received',
      submitOfferBtn: 'Submit supplier quote',
      offerPriceLabel: 'Quoted unit price (FCFA)',
      offerDaysLabel: 'Lead time (days)',
      offerMsgLabel: 'Message to buyer',
      acceptOfferBtn: 'Accept & order',
      statusOpen: 'Open',
      statusAwarded: 'Awarded',
      noRfqs: 'No RFQs posted yet.',
    },
    vendor: {
      studioTitle: 'DROPP Vendor Studio',
      tabPublish: 'Publish',
      tabOrders: 'Orders',
      tabStories: '24h Story',
      tabKyc: 'ID Verification',
      kycTitle: 'Supplier identity verification (KYC)',
      kycDesc: 'Upload front/back National ID (CNI) and selfie to unlock your storefront.',
      kycShopName: 'Shop name',
      kycCniNumber: 'National ID number',
      kycFrontLabel: 'ID Front',
      kycBackLabel: 'ID Back',
      kycSelfieLabel: 'Verification selfie',
      kycSubmitBtn: 'Submit KYC dossier',
      kycStatusPending: 'Application pending admin review.',
      kycStatusApproved: 'Shop approved — publishing and orders enabled.',
      kycStatusRejected: 'Application rejected — please update documents and resubmit.',
      publishVideoTab: 'Short video (≤ 15s)',
      publishPhotosTab: 'Photos (up to 10)',
      publishTitle: 'Product title',
      publishDesc: 'Description & highlights',
      publishPrice: 'Base price (FCFA)',
      publishMoq: 'Minimum order qty (MOQ)',
      publishPromo: 'Promo discount (%)',
      publishMediaSelect: 'Select media file',
      publishSubmitBtn: 'Publish to Feed & Market',
      videoDurationError: 'Video exceeds 15 seconds. Please select a clip of 15s or less.',
      cloudinaryDemoHint: 'Signed upload via Cloudinary is required (no default demo video).',
      uploadingMedia: 'Uploading securely to Cloudinary…',
      uploadedCloudinary: 'Media hosted on Cloudinary.',
      storyTextLabel: '24h Story caption (new stock, flash promo…)',
      storyPublishBtn: 'Publish 24h Story',
      acceptOrderBtn: 'Accept',
      shipOrderBtn: 'Ship',
      markDeliveredBtn: 'Mark delivered',
      declineOrderBtn: 'Decline',
      cloudinaryRequiredError: 'Cloudinary upload is required. Select a file and make sure Cloudinary is configured.',
      chooseVideoBtn: 'Choose video (≤ 15s)',
      choosePhotosBtn: 'Choose photos (max 10)',
      chooseFileBtn: 'Choose photo',
      noFileChosen: 'No file selected',
      kycThreePhotosRequired: 'All 3 photos (ID front, ID back, and selfie) are mandatory.',
      tabRfq: 'RFQs',
      kpiAvailableWallet: 'Available wallet',
      kpiPendingEscrow: 'In escrow',
      kpiSalesCount: 'Completed sales',
      kpiPostsCount: 'Posts',
      backToProfile: '← My profile',
      openRfqBtn: 'Reply to RFQs',
    },
    admin: {
      title: 'DROPP Super Admin Console',
      kpiPendingKyc: 'Pending KYC',
      kpiActiveOrders: 'Active orders',
      kpiEscrowTotal: 'Total escrow',
      kpiOpenDisputes: 'Open disputes',
      tabKyc: 'KYC Review',
      tabDisputes: 'Disputes',
      tabShops: 'Shops',
      tabPosts: 'Moderation',
      certifyBtn: 'Certify',
      uncertifyBtn: 'Revoke badge',
      suspendBtn: 'Suspend',
      refundBuyerBtn: 'Refund buyer',
      releaseVendorBtn: 'Release to vendor',
      disputeResolvedBuyer: 'Resolved: buyer refunded',
      disputeResolvedVendor: 'Resolved: released to vendor',
      approvePostBtn: 'Publish',
      rejectPostBtn: 'Hide',
      accessDeniedTitle: 'Access Denied — Super Admin Only',
      accessDeniedDesc: 'This screen is strictly restricted to the server-verified DROPP Super Admin.',
      backHomeBtn: 'Back to Home',
      tabOverview: 'Overview',
      tabUsers: 'Users',
      tabWithdrawals: 'Withdrawals',
      tabCategories: 'Categories',
      tabCommission: 'Commission',
      tabAnnouncements: 'Announcements',
      tabAudit: 'Audit log',
      searchUsersPlaceholder: 'Search by name, email, UID, or role…',
      suspendUserBtn: 'Suspend',
      reactivateUserBtn: 'Reactivate',
      deleteUserBtn: 'Delete',
      confirmDeleteUser: 'Confirm deletion',
      approveWithdrawalBtn: 'Approve',
      rejectWithdrawalBtn: 'Reject',
      commissionLabel: 'Platform commission rate (%)',
      saveSettingsBtn: 'Save settings',
      announcementTitleLabel: 'Global announcement title',
      announcementMsgLabel: 'Banner message shown to users',
      announcementActiveLabel: 'Show announcement banner',
      emptyKyc: 'No vendor KYC applications submitted yet.',
      emptyUsers: 'No users match this search.',
      emptyShops: 'No shops registered yet.',
      emptyPosts: 'No posts to moderate right now.',
      emptyDisputes: 'No open or archived disputes yet.',
      emptyWithdrawals: 'No pending or processed withdrawal requests.',
      emptyAudit: 'No admin audit entries recorded yet.',
      backToProfile: '← My profile',
    },
    profile: {
      visitorTitle: 'Welcome to DROPP',
      visitorSubtitle: 'Sign in to follow shops, save favorites, and order in FCFA.',
      loginCta: 'Sign in / Sign up',
      followingCount: 'Following',
      followersCount: 'Followers',
      likesCount: 'Likes',
      tabPosts: 'Posts',
      tabProducts: 'Products',
      tabInfo: 'Info',
      tabOrders: 'Orders',
      tabWallet: 'Wallet',
      tabNotifs: 'Alerts & Help',
      walletLabel: 'DROPP Wallet',
      escrowLabel: 'In escrow',
      referralLabel: 'Referral code',
      referralApplyPlaceholder: 'Referral code (e.g., DROPP-AKWA1)',
      referralApplyBtn: 'Apply',
      referralHint: '500 FCFA credited once the referred buyer completes their first delivered order.',
      roleClient: 'Buyer',
      roleVendor: 'Vendor',
      roleAdmin: 'Super Admin',
      vendorPendingBanner: 'Identity verification pending — publishing and orders locked until approved.',
      vendorSuspendedBanner: 'Shop suspended — your posts are hidden and actions are locked. You can still view your sales orders in read-only mode.',
      becomeVendorBtn: 'Become a seller (ID KYC)',
      openVendorStudioBtn: 'Open Vendor Studio',
      openVendorOrdersReadOnlyBtn: 'View sales orders (read-only)',
      openAdminBtn: 'Super Admin Console',
      languageLabel: 'Interface language',
      themeLabel: 'Appearance (Theme)',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeSystem: 'Auto',
      settingsTitle: 'Preferences & Network',
      emptyPosts: 'No posts yet.',
      emptyBookmarks: 'No saved items yet.',
      savedItemsTitle: 'Saved favorites (available offline)',
      shopStatsRating: 'Rating',
      shopStatsSales: 'Sales',
      shopStatsResponse: 'Response',
      backToMyProfile: 'My profile',
      notifPrefsTitle: 'Notification preferences',
      notifOrders: 'Orders & Escrow',
      notifMessages: 'Messages & Price Offers',
      notifFollowing: 'Followed shop drops',
      notifPromos: 'Promos & RFQs',
      appRatingTitle: 'Rate the DROPP app',
      appRatingSubmitted: 'Thank you for rating DROPP!',
      helpTitle: 'Help & Support Cameroon',
      helpFaq1Q: 'How does escrow protection work?',
      helpFaq1A: 'Your payment (Wallet, MTN MoMo, or Orange Money) stays locked on DROPP until you confirm delivery.',
      helpFaq2Q: 'How does shipping between Douala and Yaoundé work?',
      helpFaq2A: 'Suppliers ship via intercity coach agencies (Buca, Finexs, Touristique) or local couriers within 24–48h.',
    },
    errors: {
      title: 'Something went wrong',
      desc: 'The interface encountered an unexpected error. Your local cache is safe.',
      reload: 'Reload app',
      retry: 'Retry',
      profileLoadTitle: 'Unable to load your profile',
      profileLoadDesc: 'The session server did not respond or is missing configuration.',
      catalogLoadDesc: 'Unable to load products from Firestore right now.',
      emptyCatalog: 'No published items in the catalog yet.',
      suspendedBlocked: 'Suspended vendor account: this action is disabled.',
      adminBlocked: 'Super Admin moderates the platform and does not buy, like, or publish as a vendor.',
      emailUnverified: 'Please verify your email address before placing orders or submitting KYC.',
      writeFailed: 'Failed to save changes to Firestore. Please retry.',
      readOnlyOrdersHint: 'Read-only mode: shop suspended, status changes are blocked.',
    },
  },
};
