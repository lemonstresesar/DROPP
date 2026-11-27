import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  FileText,
  Package,
  Play,
  Sparkles,
  Store,
  Upload,
  Video,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  FeedPost,
  MarketplaceCategory,
  OrderRecord,
  OrderStatus,
  ShopProfile,
  UserSession,
  VendorKycApplication,
} from '../types/dropp';
import { buildCloudinaryMediaUrl, uploadSignedMedia } from '../utils/cloudinary';
import { formatFcfa } from '../utils/formatters';
import {
  canManageOwnSalesOrders,
  canRequestVendorKyc,
  canViewOwnSalesOrders,
  isApprovedVendorUser,
  isPendingVendorUser,
  isSuspendedVendor,
} from '../utils/permissions';

interface VendorStudioScreenProps {
  t: DroppDictionary;
  session: UserSession | null;
  shops: ShopProfile[];
  posts: FeedPost[];
  orders: OrderRecord[];
  kycApplications: VendorKycApplication[];
  initialTab?: 'publish' | 'orders' | 'stories' | 'kyc';
  dataSaver: boolean;
  onSubmitKyc: (payload: {
    shopName: string;
    city: 'Douala' | 'Yaoundé';
    neighborhood: string;
    category: MarketplaceCategory;
    cniNumber: string;
    cniFrontUrl: string;
    cniBackUrl: string;
    selfieUrl: string;
  }) => Promise<boolean> | boolean | void;
  onPublishPost: (payload: {
    title: string;
    description: string;
    category: MarketplaceCategory;
    mediaType: 'video' | 'carousel';
    videoUrl: string;
    posterUrl: string;
    galleryUrls?: string[];
    priceFcfa: number;
    moq: number;
    promoPercent?: number;
  }) => Promise<boolean> | boolean | void;
  onPublishStory: (text: string, mediaUrl?: string) => Promise<boolean> | boolean | void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onWatchPost: (postId: string) => void;
  onOpenRfq: () => void;
  onBack: () => void;
}

export const VendorStudioScreen: React.FC<VendorStudioScreenProps> = ({
  t,
  session,
  shops,
  posts,
  orders,
  kycApplications,
  initialTab = 'publish',
  dataSaver,
  onSubmitKyc,
  onPublishPost,
  onPublishStory,
  onUpdateOrderStatus,
  onWatchPost,
  onOpenRfq,
  onBack,
}) => {
  const isApprovedVendor = isApprovedVendorUser(session);
  const canManageOrders = canManageOwnSalesOrders(session);
  const canViewOrders = canViewOwnSalesOrders(session);
  const isSuspended = isSuspendedVendor(session);
  const isPending = isPendingVendorUser(session);
  const allowKycSubmit = canRequestVendorKyc(session);

  const defaultTab: 'publish' | 'orders' | 'stories' | 'kyc' = isApprovedVendor
    ? initialTab
    : canViewOrders
      ? 'orders'
      : 'kyc';

  const [tab, setTab] = useState<'publish' | 'orders' | 'stories' | 'kyc'>(defaultTab);

  // Publish state
  const [mediaType, setMediaType] = useState<'video' | 'carousel'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Mode');
  const [price, setPrice] = useState('15000');
  const [moq, setMoq] = useState('5');
  const [promo, setPromo] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [selectedMediaLabel, setSelectedMediaLabel] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [cloudinaryUploaded, setCloudinaryUploaded] = useState(false);
  const [publishedFeedback, setPublishedFeedback] = useState(false);

  // Story state
  const [storyText, setStoryText] = useState('');
  const [storyDone, setStoryDone] = useState(false);

  // KYC state (3 photos strictly required — never default to product photos)
  const myKyc = useMemo(
    () => kycApplications.find((k) => k.userId === session?.uid),
    [kycApplications, session?.uid]
  );
  const [kycShopName, setKycShopName] = useState(myKyc?.shopName || session?.displayName || '');
  const [kycCity, setKycCity] = useState<'Douala' | 'Yaoundé'>(
    session?.city === 'Yaoundé' ? 'Yaoundé' : 'Douala'
  );
  const [kycNeighborhood, setKycNeighborhood] = useState(session?.neighborhood || 'Akwa');
  const [kycCategory, setKycCategory] = useState<MarketplaceCategory>('Mode');
  const [kycCni, setKycCni] = useState(myKyc?.cniNumber || '');
  const [cniFrontUrl, setCniFrontUrl] = useState(myKyc?.cniFrontUrl || '');
  const [cniBackUrl, setCniBackUrl] = useState(myKyc?.cniBackUrl || '');
  const [selfieUrl, setSelfieUrl] = useState(myKyc?.selfieUrl || '');
  const [frontFileName, setFrontFileName] = useState('');
  const [backFileName, setBackFileName] = useState('');
  const [selfieFileName, setSelfieFileName] = useState('');
  const [kycUploadingField, setKycUploadingField] = useState<'front' | 'back' | 'selfie' | null>(null);
  const [kycError, setKycError] = useState('');

  const myShop = useMemo(
    () =>
      shops.find(
        (s) => (session?.shopId && s.shopId === session.shopId) || (session && s.ownerId === session.uid)
      ) || null,
    [session, shops]
  );

  const shopPosts = useMemo(() => {
    if (!myShop && !session?.shopId) return [];
    const targetShopId = myShop?.shopId || session?.shopId;
    return posts.filter((p) => p.shopId === targetShopId);
  }, [myShop, posts, session?.shopId]);

  const vendorOrders = useMemo(
    () => (session?.shopId ? orders.filter((o) => o.shopId === session.shopId) : []),
    [orders, session?.shopId]
  );

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError('');
    setCloudinaryUploaded(false);
    setVideoUrl('');
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedMediaLabel(file.name);
    const objUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = async () => {
      URL.revokeObjectURL(objUrl);
      if (probe.duration > 15.5) {
        setMediaError(t.vendor.videoDurationError);
        return;
      }
      setIsUploadingMedia(true);
      const result = await uploadSignedMedia(file, 'video', 'post');
      setIsUploadingMedia(false);
      if (!result.ok) {
        setMediaError(result.error || t.vendor.cloudinaryRequiredError);
        return;
      }
      setVideoUrl(result.url);
      setCloudinaryUploaded(true);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(objUrl);
      setMediaError(t.vendor.cloudinaryRequiredError);
    };
    probe.src = objUrl;
  };

  const handlePhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError('');
    setCloudinaryUploaded(false);
    setPosterUrl('');
    setGalleryUrls([]);
    const files = Array.from(e.target.files || []).slice(0, 10);
    if (files.length === 0) return;
    setSelectedMediaLabel(
      files.length === 1 ? files[0].name : `${files.length} photos (${files[0].name})`
    );
    setIsUploadingMedia(true);
    const results = await Promise.all(files.map((f) => uploadSignedMedia(f, 'image', 'post')));
    setIsUploadingMedia(false);
    const firstErr = results.find((r) => !r.ok);
    if (firstErr && !firstErr.ok) {
      setMediaError(firstErr.error || t.vendor.cloudinaryRequiredError);
      return;
    }
    const urls = results.filter((r): r is { ok: true; url: string; mode: 'cloudinary' } => r.ok).map((r) => r.url);
    if (urls.length === 0) {
      setMediaError(t.vendor.cloudinaryRequiredError);
      return;
    }
    setGalleryUrls(urls);
    setPosterUrl(urls[0]);
    setCloudinaryUploaded(true);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApprovedVendor || mediaError) return;
    if (!title.trim() || !description.trim()) return;
    if (!posterUrl && !videoUrl) {
      setMediaError(t.vendor.cloudinaryRequiredError);
      return;
    }
    const ok = await onPublishPost({
      title,
      description,
      category,
      mediaType,
      videoUrl,
      posterUrl: posterUrl || videoUrl,
      galleryUrls: mediaType === 'carousel' ? galleryUrls : undefined,
      priceFcfa: Math.max(500, Number(price) || 10000),
      moq: Math.max(1, Number(moq) || 1),
      promoPercent: promo ? Math.min(80, Math.max(1, Number(promo))) : undefined,
    });
    if (ok !== false) {
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setPosterUrl('');
      setGalleryUrls([]);
      setSelectedMediaLabel('');
      setCloudinaryUploaded(false);
      setPublishedFeedback(true);
      setTimeout(() => setPublishedFeedback(false), 2500);
    }
  };

  const handleKycPhotoUpload = async (
    field: 'front' | 'back' | 'selfie',
    file: File | undefined
  ) => {
    if (!file) return;
    setKycError('');
    setKycUploadingField(field);
    if (field === 'front') setFrontFileName(file.name);
    if (field === 'back') setBackFileName(file.name);
    if (field === 'selfie') setSelfieFileName(file.name);

    const res = await uploadSignedMedia(file, 'image', 'kyc');
    setKycUploadingField(null);
    if (!res.ok) {
      setKycError(res.error || t.vendor.cloudinaryRequiredError);
      return;
    }
    if (field === 'front') setCniFrontUrl(res.url);
    if (field === 'back') setCniBackUrl(res.url);
    if (field === 'selfie') setSelfieUrl(res.url);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError('');
    if (!allowKycSubmit) return;
    if (!kycShopName.trim() || !kycCni.trim()) return;
    if (!cniFrontUrl || !cniBackUrl || !selfieUrl) {
      setKycError(t.vendor.kycThreePhotosRequired);
      return;
    }
    await onSubmitKyc({
      shopName: kycShopName,
      city: kycCity,
      neighborhood: kycNeighborhood,
      category: kycCategory,
      cniNumber: kycCni,
      cniFrontUrl,
      cniBackUrl,
      selfieUrl,
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--dropp-bg)] pb-24 lg:pb-10">
      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t.vendor.backToProfile}</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--dropp-text)]">{t.vendor.studioTitle}</h1>
              {myShop && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--dropp-muted)]">
                  <Store className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                  <span className="font-semibold text-[var(--dropp-text)]">{myShop.name}</span>
                  {myShop.isCertified && (
                    <BadgeCheck className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                  )}
                  <span>· {myShop.city}</span>
                </div>
              )}
            </div>
          </div>

          {isApprovedVendor && (
            <button
              type="button"
              onClick={onOpenRfq}
              className="min-h-[40px] px-3.5 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-xs font-semibold text-[var(--dropp-text)] inline-flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
              <span>{t.vendor.openRfqBtn}</span>
            </button>
          )}
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.vendor.kpiAvailableWallet}</div>
            <div className="text-base font-bold text-[var(--dropp-text)] tabular-nums mt-0.5">
              {formatFcfa(session?.walletBalanceFcfa || 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.vendor.kpiPendingEscrow}</div>
            <div className="text-base font-bold text-[#9A5B00] dark:text-[#F5A524] tabular-nums mt-0.5">
              {formatFcfa(session?.pendingEscrowFcfa || 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.vendor.kpiSalesCount}</div>
            <div className="text-base font-bold text-[var(--dropp-text)] tabular-nums mt-0.5">
              {myShop?.salesCount ?? vendorOrders.length}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
            <div className="text-[11px] text-[var(--dropp-muted)]">{t.vendor.kpiPostsCount}</div>
            <div className="text-base font-bold text-[var(--dropp-accent)] tabular-nums mt-0.5">
              {shopPosts.length}
            </div>
          </div>
        </div>

        {/* Studio Tabs */}
        <div className="flex border-b border-[var(--dropp-border)] overflow-x-auto no-scrollbar">
          {(
            [
              ...(isApprovedVendor ? [{ id: 'publish' as const, label: t.vendor.tabPublish }] : []),
              ...(canViewOrders
                ? [{ id: 'orders' as const, label: `${t.vendor.tabOrders} (${vendorOrders.length})` }]
                : []),
              ...(isApprovedVendor ? [{ id: 'stories' as const, label: t.vendor.tabStories }] : []),
              ...(allowKycSubmit || isPending || isApprovedVendor
                ? [{ id: 'kyc' as const, label: t.vendor.tabKyc }]
                : []),
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] px-4 text-xs font-semibold border-b-2 whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'border-[var(--dropp-accent)] text-[var(--dropp-text)]'
                  : 'border-transparent text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {tab === 'publish' && (
          <div className="space-y-6">
            {!isApprovedVendor ? (
              <div className="p-4 rounded-2xl bg-[#F5A524]/15 border border-[#F5A524]/40 text-xs text-[#9A5B00] dark:text-[#FCD34D] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{isSuspended ? t.errors.suspendedBlocked : t.vendor.kycStatusPending}</span>
              </div>
            ) : (
              <form
                onSubmit={handlePublish}
                className="p-5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-4"
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaType('video');
                      setMediaError('');
                      setSelectedMediaLabel('');
                    }}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                      mediaType === 'video'
                        ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/15 text-[var(--dropp-text)]'
                        : 'border-[var(--dropp-border)] bg-[var(--dropp-bg)] text-[var(--dropp-muted)]'
                    }`}
                  >
                    <Video className="w-4 h-4" aria-hidden="true" />
                    <span>{t.vendor.publishVideoTab}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaType('carousel');
                      setMediaError('');
                      setSelectedMediaLabel('');
                    }}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                      mediaType === 'carousel'
                        ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/15 text-[var(--dropp-text)]'
                        : 'border-[var(--dropp-border)] bg-[var(--dropp-bg)] text-[var(--dropp-muted)]'
                    }`}
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span>{t.vendor.publishPhotosTab}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[var(--dropp-text)]">
                    <span className="font-semibold">{t.vendor.publishMediaSelect}</span>
                    <Upload className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {mediaType === 'video' ? (
                      <>
                        <label
                          htmlFor="vendor-video-upload"
                          className="min-h-[40px] px-4 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-xs font-bold text-[var(--dropp-text)] inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                          <span>{t.vendor.chooseVideoBtn}</span>
                        </label>
                        <input
                          id="vendor-video-upload"
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFile}
                          className="sr-only"
                        />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="vendor-photos-upload"
                          className="min-h-[40px] px-4 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-xs font-bold text-[var(--dropp-text)] inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                          <span>{t.vendor.choosePhotosBtn}</span>
                        </label>
                        <input
                          id="vendor-photos-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoFiles}
                          className="sr-only"
                        />
                      </>
                    )}
                    <span className="text-xs text-[var(--dropp-muted)]">
                      {selectedMediaLabel || t.vendor.noFileChosen}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--dropp-muted)]">
                    {isUploadingMedia
                      ? t.vendor.uploadingMedia
                      : cloudinaryUploaded
                        ? t.vendor.uploadedCloudinary
                        : t.vendor.cloudinaryDemoHint}
                  </p>
                  {mediaError && (
                    <p className="text-xs font-semibold text-[#B42328] dark:text-[#FCA5A5]">
                      {mediaError}
                    </p>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.vendor.publishTitle}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)]"
                />

                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.vendor.publishDesc}
                  className="w-full p-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)]"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>Catégorie</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    >
                      <option value="Mode">Mode</option>
                      <option value="Électronique">Électronique</option>
                      <option value="Beauté">Beauté</option>
                      <option value="Alimentation">Alimentation</option>
                      <option value="Maison">Maison</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </label>
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.vendor.publishPrice}</span>
                    <input
                      type="number"
                      min={500}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.vendor.publishMoq}</span>
                    <input
                      type="number"
                      min={1}
                      value={moq}
                      onChange={(e) => setMoq(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.vendor.publishPromo}</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={promo}
                      onChange={(e) => setPromo(e.target.value)}
                      placeholder="10"
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingMedia}
                  className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  {publishedFeedback ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>{t.actions.save}</span>
                    </>
                  ) : (
                    <span>{t.vendor.publishSubmitBtn}</span>
                  )}
                </button>
              </form>
            )}

            {/* Shop existing publications */}
            {shopPosts.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-[var(--dropp-text)]">
                  {t.profile.tabPosts} ({shopPosts.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {shopPosts.map((post) => (
                    <button
                      key={post.postId}
                      type="button"
                      onClick={() => onWatchPost(post.postId)}
                      className="rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] overflow-hidden text-left group"
                    >
                      <div className="relative aspect-[3/4] bg-black">
                        <img
                          src={buildCloudinaryMediaUrl(post.posterUrl, {
                            dataSaver,
                            isThumbnail: true,
                          })}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <Play
                          className="w-4 h-4 text-white absolute top-2 right-2 drop-shadow"
                          aria-hidden="true"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-semibold text-white">
                          {post.status}
                        </span>
                      </div>
                      <div className="p-2.5 space-y-1">
                        <div className="text-xs font-semibold text-[var(--dropp-text)] line-clamp-2">
                          {post.title}
                        </div>
                        <div className="text-xs font-bold text-[var(--dropp-accent)] tabular-nums">
                          {formatFcfa(post.priceFcfa)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {isSuspended && (
              <div className="p-3.5 rounded-xl bg-[#E5484D]/15 border border-[#E5484D]/40 text-xs text-[#B42328] dark:text-[#FCA5A5] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t.errors.readOnlyOrdersHint}</span>
              </div>
            )}
            {vendorOrders.length === 0 ? (
              <p className="py-12 text-center text-xs text-[var(--dropp-muted)]">{t.orders.empty}</p>
            ) : (
              vendorOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[var(--dropp-muted)]">
                        {order.orderId} · {order.buyerName} · {order.deliveryCity} (
                        {order.deliveryNeighborhood})
                      </div>
                      <div className="text-sm font-bold text-[var(--dropp-text)] mt-0.5 tabular-nums">
                        {formatFcfa(order.totalFcfa)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[var(--dropp-accent)]">
                      {order.status}
                    </span>
                  </div>

                  {canManageOrders && (
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateOrderStatus(order.orderId, 'confirmed')}
                            className="min-h-[38px] px-3.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                          >
                            {t.vendor.acceptOrderBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateOrderStatus(order.orderId, 'cancelled')}
                            className="min-h-[38px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] text-[var(--dropp-text)] text-xs font-semibold"
                          >
                            {t.vendor.declineOrderBtn}
                          </button>
                        </>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.orderId, 'delivering')}
                          className="min-h-[38px] px-3.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Package className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.vendor.shipOrderBtn}</span>
                        </button>
                      )}
                      {order.status === 'delivering' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.orderId, 'delivered')}
                          className="min-h-[38px] px-3.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                        >
                          {t.vendor.markDeliveredBtn}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'stories' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!isApprovedVendor || !storyText.trim()) return;
              const ok = await onPublishStory(storyText);
              if (ok !== false) {
                setStoryText('');
                setStoryDone(true);
                setTimeout(() => setStoryDone(false), 2000);
              }
            }}
            className="p-5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-4"
          >
            <label className="block text-xs text-[var(--dropp-muted)] space-y-1.5">
              <span>{t.vendor.storyTextLabel}</span>
              <textarea
                rows={3}
                required
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)]"
              />
            </label>
            <button
              type="submit"
              disabled={!isApprovedVendor}
              className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{storyDone ? t.actions.save : t.vendor.storyPublishBtn}</span>
            </button>
          </form>
        )}

        {tab === 'kyc' && (
          <form
            onSubmit={handleKycSubmit}
            className="p-5 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-4"
          >
            <div>
              <h2 className="text-sm font-bold text-[var(--dropp-text)]">{t.vendor.kycTitle}</h2>
              <p className="text-xs text-[var(--dropp-muted)] mt-0.5">{t.vendor.kycDesc}</p>
            </div>

            {session?.vendorStatus === 'approved' && (
              <div className="p-3 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/40 text-xs text-[#FF5A1F] font-medium">
                {t.vendor.kycStatusApproved}
              </div>
            )}
            {isPending && (
              <div className="p-3 rounded-xl bg-[#F5A524]/15 border border-[#F5A524]/40 text-xs text-[#9A5B00] dark:text-[#FCD34D]">
                {t.vendor.kycStatusPending}
              </div>
            )}
            {myKyc?.status === 'rejected' && (
              <div className="p-3 rounded-xl bg-[#E5484D]/15 border border-[#E5484D]/40 text-xs text-[#FCA5A5]">
                {t.vendor.kycStatusRejected}
                {myKyc.rejectionReason ? ` (${myKyc.rejectionReason})` : ''}
              </div>
            )}

            {kycError && (
              <div className="p-3 rounded-xl bg-[#E5484D]/15 border border-[#E5484D]/40 text-xs text-[#B42328] dark:text-[#FCA5A5]">
                {kycError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.vendor.kycShopName}</span>
                <input
                  type="text"
                  required
                  disabled={!allowKycSubmit}
                  value={kycShopName}
                  onChange={(e) => setKycShopName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)] disabled:opacity-50"
                />
              </label>
              <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.vendor.kycCniNumber}</span>
                <input
                  type="text"
                  required
                  disabled={!allowKycSubmit}
                  value={kycCni}
                  onChange={(e) => setKycCni(e.target.value)}
                  placeholder="112849023"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)] disabled:opacity-50"
                />
              </label>
              <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.auth.cityLabel}</span>
                <select
                  disabled={!allowKycSubmit}
                  value={kycCity}
                  onChange={(e) => setKycCity(e.target.value as 'Douala' | 'Yaoundé')}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)] disabled:opacity-50"
                >
                  <option value="Douala">Douala</option>
                  <option value="Yaoundé">Yaoundé</option>
                </select>
              </label>
              <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.cart.neighborhoodLabel}</span>
                <input
                  type="text"
                  required
                  disabled={!allowKycSubmit}
                  value={kycNeighborhood}
                  onChange={(e) => setKycNeighborhood(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)] disabled:opacity-50"
                />
              </label>
              <label className="text-xs text-[var(--dropp-muted)] space-y-1 sm:col-span-2">
                <span>Catégorie</span>
                <select
                  disabled={!allowKycSubmit}
                  value={kycCategory}
                  onChange={(e) => setKycCategory(e.target.value as MarketplaceCategory)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)] disabled:opacity-50"
                >
                  <option value="Mode">Mode</option>
                  <option value="Électronique">Électronique</option>
                  <option value="Beauté">Beauté</option>
                  <option value="Alimentation">Alimentation</option>
                  <option value="Maison">Maison</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {(
                [
                  {
                    id: 'kyc-front',
                    field: 'front' as const,
                    label: t.vendor.kycFrontLabel,
                    url: cniFrontUrl,
                    fileName: frontFileName,
                  },
                  {
                    id: 'kyc-back',
                    field: 'back' as const,
                    label: t.vendor.kycBackLabel,
                    url: cniBackUrl,
                    fileName: backFileName,
                  },
                  {
                    id: 'kyc-selfie',
                    field: 'selfie' as const,
                    label: t.vendor.kycSelfieLabel,
                    url: selfieUrl,
                    fileName: selfieFileName,
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[var(--dropp-bg)] border border-[var(--dropp-border)] space-y-2"
                >
                  <span className="font-semibold text-[var(--dropp-text)] block">{item.label}</span>
                  {item.url && (
                    <img
                      src={item.url}
                      alt={item.label}
                      referrerPolicy="no-referrer"
                      className="h-24 w-full object-cover rounded-lg border border-[var(--dropp-border)] bg-black"
                    />
                  )}
                  <label
                    htmlFor={item.id}
                    className={`min-h-[38px] px-3 rounded-lg border border-[var(--dropp-border-strong)] bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)] font-semibold inline-flex items-center gap-1.5 ${
                      allowKycSubmit ? 'cursor-pointer hover:border-[var(--dropp-accent)]' : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                    <span>
                      {kycUploadingField === item.field
                        ? t.vendor.uploadingMedia
                        : t.vendor.chooseFileBtn}
                    </span>
                  </label>
                  <input
                    id={item.id}
                    type="file"
                    accept="image/*"
                    disabled={!allowKycSubmit}
                    onChange={(e) => handleKycPhotoUpload(item.field, e.target.files?.[0])}
                    className="sr-only"
                  />
                  <div className="text-[11px] text-[var(--dropp-muted)] break-all">
                    {item.fileName || (item.url ? t.vendor.uploadedCloudinary : t.vendor.noFileChosen)}
                  </div>
                </div>
              ))}
            </div>

            {allowKycSubmit && (
              <button
                type="submit"
                disabled={kycUploadingField !== null}
                className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] disabled:opacity-50 text-white text-sm font-bold"
              >
                {t.vendor.kycSubmitBtn}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
