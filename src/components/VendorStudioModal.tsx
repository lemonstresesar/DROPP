import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Package,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  MarketplaceCategory,
  OrderRecord,
  OrderStatus,
  UserSession,
  VendorKycApplication,
} from '../types/dropp';
import { DEMO_POSTS, IMG_WAX } from '../data/demoData';
import { uploadSignedMedia } from '../utils/cloudinary';
import { formatFcfa } from '../utils/formatters';

interface VendorStudioModalProps {
  t: DroppDictionary;
  session: UserSession | null;
  orders: OrderRecord[];
  kycApplications: VendorKycApplication[];
  initialTab?: 'publish' | 'orders' | 'stories' | 'kyc';
  onSubmitKyc: (payload: {
    shopName: string;
    city: 'Douala' | 'Yaoundé';
    neighborhood: string;
    category: MarketplaceCategory;
    cniNumber: string;
    cniFrontUrl: string;
    cniBackUrl: string;
    selfieUrl: string;
  }) => void;
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
  }) => void;
  onPublishStory: (text: string, mediaUrl?: string) => void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onClose: () => void;
}

export const VendorStudioModal: React.FC<VendorStudioModalProps> = ({
  t,
  session,
  orders,
  kycApplications,
  initialTab = 'publish',
  onSubmitKyc,
  onPublishPost,
  onPublishStory,
  onUpdateOrderStatus,
  onClose,
}) => {
  const isApprovedVendor =
    session?.role === 'admin' ||
    (session?.role === 'vendor' && session.vendorStatus === 'approved');

  const [tab, setTab] = useState<'publish' | 'orders' | 'stories' | 'kyc'>(
    isApprovedVendor ? initialTab : 'kyc'
  );

  // Publish state
  const [mediaType, setMediaType] = useState<'video' | 'carousel'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Mode');
  const [price, setPrice] = useState('15000');
  const [moq, setMoq] = useState('5');
  const [promo, setPromo] = useState('');
  const [videoUrl, setVideoUrl] = useState('/videos/wax.mp4');
  const [posterUrl, setPosterUrl] = useState(IMG_WAX);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([IMG_WAX]);
  const [mediaError, setMediaError] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [cloudinaryUploaded, setCloudinaryUploaded] = useState(false);
  const [publishedFeedback, setPublishedFeedback] = useState(false);

  // Story state
  const [storyText, setStoryText] = useState('');
  const [storyDone, setStoryDone] = useState(false);

  // KYC state
  const myKyc = kycApplications.find((k) => k.userId === session?.uid);
  const [kycShopName, setKycShopName] = useState(myKyc?.shopName || session?.displayName || '');
  const [kycCity, setKycCity] = useState<'Douala' | 'Yaoundé'>(
    session?.city === 'Yaoundé' ? 'Yaoundé' : 'Douala'
  );
  const [kycNeighborhood, setKycNeighborhood] = useState(session?.neighborhood || 'Akwa');
  const [kycCategory, setKycCategory] = useState<MarketplaceCategory>('Mode');
  const [kycCni, setKycCni] = useState(myKyc?.cniNumber || '');
  const [cniFrontUrl, setCniFrontUrl] = useState(myKyc?.cniFrontUrl || DEMO_POSTS[0].posterUrl);
  const [cniBackUrl, setCniBackUrl] = useState(myKyc?.cniBackUrl || DEMO_POSTS[1].posterUrl);
  const [selfieUrl, setSelfieUrl] = useState(myKyc?.selfieUrl || DEMO_POSTS[4].posterUrl);

  const vendorOrders = orders.filter((o) =>
    session?.role === 'admin' ? true : o.shopId === session?.shopId
  );

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError('');
    setCloudinaryUploaded(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = async () => {
      if (probe.duration > 15.5) {
        setMediaError(t.vendor.videoDurationError);
      } else {
        setIsUploadingMedia(true);
        const result = await uploadSignedMedia(file, 'video');
        setVideoUrl(result.url);
        setCloudinaryUploaded(result.mode === 'cloudinary');
        setIsUploadingMedia(false);
      }
    };
    probe.src = objUrl;
  };

  const handlePhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    if (files.length === 0) return;
    setCloudinaryUploaded(false);
    setIsUploadingMedia(true);
    const results = await Promise.all(files.map((f) => uploadSignedMedia(f, 'image')));
    const urls = results.map((r) => r.url);
    setGalleryUrls(urls);
    setPosterUrl(urls[0]);
    setCloudinaryUploaded(results.some((r) => r.mode === 'cloudinary'));
    setIsUploadingMedia(false);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApprovedVendor || mediaError) return;
    if (!title.trim() || !description.trim()) return;
    onPublishPost({
      title,
      description,
      category,
      mediaType,
      videoUrl,
      posterUrl,
      galleryUrls: mediaType === 'carousel' ? galleryUrls : undefined,
      priceFcfa: Math.max(500, Number(price) || 10000),
      moq: Math.max(1, Number(moq) || 1),
      promoPercent: promo ? Math.min(80, Math.max(1, Number(promo))) : undefined,
    });
    setTitle('');
    setDescription('');
    setPublishedFeedback(true);
    setTimeout(() => setPublishedFeedback(false), 2500);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycShopName.trim() || !kycCni.trim()) return;
    onSubmitKyc({
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
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.vendor.studioTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dropp-border)]">
          <h2 className="text-base font-bold text-[var(--dropp-text)]">{t.vendor.studioTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.close}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Studio Tabs */}
        <div className="flex border-b border-[var(--dropp-border)] px-3 overflow-x-auto">
          {(
            [
              { id: 'publish' as const, label: t.vendor.tabPublish },
              { id: 'orders' as const, label: `${t.vendor.tabOrders} (${vendorOrders.length})` },
              { id: 'stories' as const, label: t.vendor.tabStories },
              { id: 'kyc' as const, label: t.vendor.tabKyc },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] px-4 text-xs font-semibold border-b-2 whitespace-nowrap ${
                tab === item.id
                  ? 'border-[var(--dropp-accent)] text-[var(--dropp-text)]'
                  : 'border-transparent text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'publish' && (
            <div className="space-y-4">
              {!isApprovedVendor ? (
                <div className="p-4 rounded-2xl bg-[#F5A524]/15 border border-[#F5A524]/40 text-xs text-[#9A5B00] dark:text-[#FCD34D] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.vendor.kycStatusPending}</span>
                </div>
              ) : (
                <form onSubmit={handlePublish} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType('video')}
                      className={`min-h-[44px] rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        mediaType === 'video'
                          ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/15 text-[var(--dropp-text)]'
                          : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-muted)]'
                      }`}
                    >
                      <Video className="w-4 h-4" aria-hidden="true" />
                      <span>{t.vendor.publishVideoTab}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType('carousel')}
                      className={`min-h-[44px] rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        mediaType === 'carousel'
                          ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/15 text-[var(--dropp-text)]'
                          : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-muted)]'
                      }`}
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>{t.vendor.publishPhotosTab}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--dropp-text)]">
                      <span>{t.vendor.publishMediaSelect}</span>
                      <Upload className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                    </div>
                    {mediaType === 'video' ? (
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFile}
                        className="block text-xs text-[var(--dropp-muted)]"
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoFiles}
                        className="block text-xs text-[var(--dropp-muted)]"
                      />
                    )}
                    <p className="text-[11px] text-[var(--dropp-muted)]">
                      {isUploadingMedia
                        ? t.vendor.uploadingMedia
                        : cloudinaryUploaded
                          ? t.vendor.uploadedCloudinary
                          : t.vendor.cloudinaryDemoHint}
                    </p>
                    {mediaError && <p className="text-xs text-[#B42328] dark:text-[#FCA5A5]">{mediaError}</p>}
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
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-3">
              {vendorOrders.length === 0 ? (
                <p className="py-10 text-center text-xs text-[var(--dropp-muted)]">{t.orders.empty}</p>
              ) : (
                vendorOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-[var(--dropp-muted)]">
                          {order.orderId} · {order.buyerName} · {order.deliveryCity} ({order.deliveryNeighborhood})
                        </div>
                        <div className="text-sm font-bold text-[var(--dropp-text)] mt-0.5 tabular-nums">
                          {formatFcfa(order.totalFcfa)}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[var(--dropp-accent)]">{order.status}</span>
                    </div>

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
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'stories' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!storyText.trim()) return;
                onPublishStory(storyText);
                setStoryText('');
                setStoryDone(true);
                setTimeout(() => setStoryDone(false), 2000);
              }}
              className="space-y-4"
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
            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--dropp-text)]">{t.vendor.kycTitle}</h3>
                <p className="text-xs text-[var(--dropp-muted)] mt-0.5">{t.vendor.kycDesc}</p>
              </div>

              {session?.vendorStatus === 'approved' && (
                <div className="p-3 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/40 text-xs text-[#FF5A1F] font-medium">
                  {t.vendor.kycStatusApproved}
                </div>
              )}
              {session?.vendorStatus === 'pending' && (
                <div className="p-3 rounded-xl bg-[#F5A524]/15 border border-[#F5A524]/40 text-xs text-[#9A5B00] dark:text-[#FCD34D]">
                  {t.vendor.kycStatusPending}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.vendor.kycShopName}</span>
                  <input
                    type="text"
                    required
                    value={kycShopName}
                    onChange={(e) => setKycShopName(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.vendor.kycCniNumber}</span>
                  <input
                    type="text"
                    required
                    value={kycCni}
                    onChange={(e) => setKycCni(e.target.value)}
                    placeholder="112849023"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.auth.cityLabel}</span>
                  <select
                    value={kycCity}
                    onChange={(e) => setKycCity(e.target.value as 'Douala' | 'Yaoundé')}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
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
                    value={kycNeighborhood}
                    onChange={(e) => setKycNeighborhood(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2 cursor-pointer">
                  <span className="font-semibold text-[var(--dropp-text)] block">{t.vendor.kycFrontLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await uploadSignedMedia(f, 'image');
                      setCniFrontUrl(res.url);
                    }}
                    className="w-full text-[11px] text-[var(--dropp-muted)]"
                  />
                </label>
                <label className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2 cursor-pointer">
                  <span className="font-semibold text-[var(--dropp-text)] block">{t.vendor.kycBackLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await uploadSignedMedia(f, 'image');
                      setCniBackUrl(res.url);
                    }}
                    className="w-full text-[11px] text-[var(--dropp-muted)]"
                  />
                </label>
                <label className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-2 cursor-pointer">
                  <span className="font-semibold text-[var(--dropp-text)] block">{t.vendor.kycSelfieLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await uploadSignedMedia(f, 'image');
                      setSelfieUrl(res.url);
                    }}
                    className="w-full text-[11px] text-[var(--dropp-muted)]"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold"
              >
                {t.vendor.kycSubmitBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
