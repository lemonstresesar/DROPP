export type UserRole = 'visitor' | 'client' | 'vendor' | 'admin';

export type VendorStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';

export type MarketplaceCategory =
  | 'Mode'
  | 'Électronique'
  | 'Beauté'
  | 'Alimentation'
  | 'Maison'
  | 'Autre';

export type LanguageCode = 'fr' | 'en';

export type NavTab = 'feed' | 'market' | 'messages' | 'profile';

export type FeedSubTab = 'following' | 'foryou';

export type MarketSortOption =
  | 'recommended'
  | 'price_asc'
  | 'price_desc'
  | 'rating_desc'
  | 'popular'
  | 'moq_asc';

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'confirmed'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export type PaymentMethod = 'wallet' | 'mtn_momo' | 'orange_money';

export type EscrowStatus = 'held' | 'released' | 'refunded' | 'disputed';

export interface PriceTier {
  minQty: number;
  maxQty: number | null;
  unitPriceFcfa: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  colorHex?: string;
  stock: number;
  priceDeltaFcfa: number;
}

export interface ProductReview {
  reviewId: string;
  postId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ShopProfile {
  shopId: string;
  ownerId: string;
  name: string;
  handle: string;
  city: 'Douala' | 'Yaoundé';
  neighborhood: string;
  category: MarketplaceCategory;
  isCertified: boolean;
  isPremium: boolean;
  vendorStatus: VendorStatus;
  memberSinceYear?: number;
  rating: number;
  salesCount: number;
  responseRate: number;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  avatarUrl: string;
  bio: string;
  hasActiveStory?: boolean;
  storyPreviewText?: string;
  storyMediaUrl?: string;
  storyExpiresAt?: string;
  isOnline?: boolean;
}

export interface FeedPost {
  postId: string;
  shopId: string;
  ownerId: string;
  shopName: string;
  shopHandle: string;
  shopAvatarUrl: string;
  shopCertified: boolean;
  city: 'Douala' | 'Yaoundé';
  neighborhood: string;
  title: string;
  description: string;
  category: MarketplaceCategory;
  mediaType: 'video' | 'carousel';
  videoUrl: string;
  posterUrl: string;
  galleryUrls?: string[];
  priceFcfa: number;
  promoPercent?: number;
  moq: number;
  samplePriceFcfa?: number;
  tiers: PriceTier[];
  variants: ProductVariant[];
  specs: Array<{ label: string; value: string }>;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  sharesCount: number;
  rating: number;
  status: 'published' | 'pending' | 'rejected';
  createdAt: string;
}

export interface PostComment {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  deliveryStatus?: 'pending' | 'sent' | 'failed';
}

export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  vendorStatus: VendorStatus;
  isCertified: boolean;
  city: string;
  neighborhood: string;
  shopId?: string;
  walletBalanceFcfa: number;
  pendingEscrowFcfa: number;
  referralBonusEarnedFcfa?: number;
  referredByCode?: string;
  hasCompletedFirstOrder?: boolean;
  referralCode: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export interface QueuedAction {
  id: string;
  type: 'like_toggle' | 'comment_create' | 'bookmark_toggle' | 'follow_toggle';
  targetId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  createdAt: number;
}

export interface LocalCartPreviewItem {
  postId: string;
  shopId: string;
  shopName: string;
  shopCity?: 'Douala' | 'Yaoundé';
  title: string;
  variantId: string;
  variantLabel: string;
  qty: number;
  moq?: number;
  isSample?: boolean;
  unitPriceFcfa: number;
  posterUrl: string;
}

export interface VendorCartGroup {
  shopId: string;
  shopName: string;
  shopCity: string;
  items: LocalCartPreviewItem[];
  subtotalFcfa: number;
  shippingFeeFcfa: number;
  totalFcfa: number;
}

export interface OrderRecord {
  orderId: string;
  globalOrderId: string;
  buyerId: string;
  buyerName: string;
  shopId: string;
  shopName: string;
  items: LocalCartPreviewItem[];
  subtotalFcfa: number;
  shippingFeeFcfa: number;
  totalFcfa: number;
  paymentMethod: PaymentMethod;
  escrowStatus: EscrowStatus;
  status: OrderStatus;
  deliveryCity: string;
  deliveryNeighborhood: string;
  deliveryPhone: string;
  createdAt: string;
  deliveredAt?: string;
  rated?: boolean;
  disputeId?: string;
  idempotencyKey?: string;
}

export interface WalletTransaction {
  txId: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'refund' | 'referral_bonus';
  amountFcfa: number;
  methodLabel: string;
  referenceId?: string;
  status: 'completed' | 'failed';
  createdAt: string;
}

export interface DealOfferCard {
  offerId: string;
  postId?: string;
  productTitle: string;
  shopId: string;
  shopName: string;
  qty: number;
  unitPriceFcfa: number;
  shippingFeeFcfa: number;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  kind: 'text' | 'image' | 'video' | 'file' | 'location' | 'offer';
  text: string;
  mediaUrl?: string;
  fileName?: string;
  locationLabel?: string;
  offer?: DealOfferCard;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  buyerId: string;
  buyerName: string;
  shopId: string;
  shopName: string;
  shopAvatarUrl: string;
  shopCertified: boolean;
  shopOnline: boolean;
  unreadCount: number;
  lastMessageText: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface RfqOffer {
  offerId: string;
  rfqId: string;
  shopId: string;
  shopName: string;
  shopCertified: boolean;
  unitPriceFcfa: number;
  deliveryDays: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface RfqRequest {
  rfqId: string;
  buyerId: string;
  buyerName: string;
  title: string;
  description: string;
  category: MarketplaceCategory;
  quantity: number;
  budgetFcfa: number;
  deadlineDays: number;
  city: string;
  photoUrl?: string;
  status: 'open' | 'awarded' | 'closed';
  offers: RfqOffer[];
  createdAt: string;
}

export interface VendorKycApplication {
  applicationId: string;
  userId: string;
  applicantName: string;
  shopName: string;
  city: 'Douala' | 'Yaoundé';
  neighborhood: string;
  category: MarketplaceCategory;
  cniNumber: string;
  cniFrontUrl: string;
  cniBackUrl: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
}

export interface DisputeRecord {
  disputeId: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  shopId: string;
  shopName: string;
  reason: string;
  amountHeldFcfa: number;
  status: 'open' | 'resolved_buyer' | 'resolved_vendor';
  resolutionNote?: string;
  createdAt: string;
}

export interface NotificationPrefs {
  orders: boolean;
  messages: boolean;
  following: boolean;
  promos: boolean;
}

export interface AppNotification {
  notifId: string;
  category: keyof NotificationPrefs;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
