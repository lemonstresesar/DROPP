import React, { useState } from 'react';
import {
  BadgeCheck,
  Check,
  MessageSquare,
  Minus,
  Play,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  X,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  FeedPost,
  LocalCartPreviewItem,
  ProductReview,
  ShopProfile,
} from '../types/dropp';
import { formatFcfa, getUnitPriceForQty } from '../utils/formatters';
import { buildCloudinaryMediaUrl } from '../utils/cloudinary';

interface ProductDetailSheetProps {
  t: DroppDictionary;
  post: FeedPost;
  shop: ShopProfile | undefined;
  reviews: ProductReview[];
  dataSaver: boolean;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onAddToCart: (item: LocalCartPreviewItem) => void;
  onBuyNow: (item: LocalCartPreviewItem) => void;
  onAddReview: (postId: string, rating: number, comment: string) => void;
  onNegotiate: (shop: ShopProfile, post: FeedPost) => void;
  onOpenShop: (shopId: string) => void;
  onWatchVideo: (postId: string) => void;
  onClose: () => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  t,
  post,
  shop,
  reviews,
  dataSaver,
  isAuthenticated,
  onRequireAuth,
  onAddToCart,
  onBuyNow,
  onAddReview,
  onNegotiate,
  onOpenShop,
  onWatchVideo,
  onClose,
}) => {
  const gallery = post.galleryUrls && post.galleryUrls.length > 0 ? post.galleryUrls : [post.posterUrl];
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const firstInStock = post.variants.find((v) => v.stock > 0) || post.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstInStock?.id || '');
  const [isSample, setIsSample] = useState(false);
  const [qty, setQty] = useState(post.moq);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const selectedVariant = post.variants.find((v) => v.id === selectedVariantId) || firstInStock;
  const effectiveQty = isSample ? 1 : qty;
  const unitPrice = isSample
    ? (post.samplePriceFcfa ?? post.priceFcfa) + (selectedVariant?.priceDeltaFcfa || 0)
    : getUnitPriceForQty(
        post.tiers,
        effectiveQty,
        post.priceFcfa,
        selectedVariant?.priceDeltaFcfa || 0
      );

  const buildCartItem = (): LocalCartPreviewItem | null => {
    if (!selectedVariant || selectedVariant.stock <= 0) return null;
    return {
      postId: post.postId,
      shopId: post.shopId,
      shopName: post.shopName,
      shopCity: post.city,
      title: post.title,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      qty: effectiveQty,
      moq: post.moq,
      isSample,
      unitPriceFcfa: unitPrice,
      posterUrl: post.posterUrl,
    };
  };

  const handleAdd = () => {
    const item = buildCartItem();
    if (!item) return;
    onAddToCart(item);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const handleBuy = () => {
    const item = buildCartItem();
    if (!item) return;
    onBuyNow(item);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!reviewText.trim()) return;
    onAddReview(post.postId, reviewRating, reviewText);
    setReviewText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={post.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] rounded-t-3xl lg:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--dropp-border)]">
          <div className="min-w-0">
            <span className="text-xs text-[var(--dropp-muted)]">
              {post.category} · {post.city} · {post.neighborhood}
            </span>
            <h2 className="text-base font-bold text-[var(--dropp-text)] truncate">{post.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.close}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Gallery */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-[var(--dropp-border)]">
                <img
                  src={buildCloudinaryMediaUrl(gallery[activeImgIdx] || post.posterUrl, {
                    dataSaver,
                  })}
                  alt={post.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onWatchVideo(post.postId);
                  }}
                  className="absolute bottom-3 left-3 min-h-[40px] px-3.5 rounded-xl bg-black/80 backdrop-blur-sm text-white text-xs font-semibold inline-flex items-center gap-2 hover:bg-black"
                >
                  <Play className="w-3.5 h-3.5 fill-white" aria-hidden="true" />
                  <span>{t.market.watchVideo}</span>
                </button>
              </div>

              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {gallery.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImgIdx(idx)}
                      className={`w-16 h-20 rounded-xl overflow-hidden border-2 shrink-0 ${
                        activeImgIdx === idx ? 'border-[var(--dropp-accent)]' : 'border-[var(--dropp-border)]'
                      }`}
                    >
                      <img
                        src={buildCloudinaryMediaUrl(imgUrl, { dataSaver, isThumbnail: true })}
                        alt={`${post.title} ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Supplier Card */}
              {shop && (
                <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={buildCloudinaryMediaUrl(shop.avatarUrl, {
                        dataSaver,
                        isThumbnail: true,
                      })}
                      alt={shop.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-[var(--dropp-border-strong)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[var(--dropp-text)] truncate">{shop.name}</span>
                        {shop.isCertified && (
                          <BadgeCheck className="w-4 h-4 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <div className="text-xs text-[var(--dropp-muted)]">
                        {shop.city} · {t.product.memberSince} {shop.memberSinceYear || 2023}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-[var(--dropp-border)] text-xs">
                    <div>
                      <div className="font-bold text-[var(--dropp-text)] tabular-nums">{shop.rating}/5</div>
                      <div className="text-[var(--dropp-muted)]">{t.profile.shopStatsRating}</div>
                    </div>
                    <div>
                      <div className="font-bold text-[var(--dropp-text)] tabular-nums">{shop.salesCount}</div>
                      <div className="text-[var(--dropp-muted)]">{t.profile.shopStatsSales}</div>
                    </div>
                    <div>
                      <div className="font-bold text-[var(--dropp-text)] tabular-nums">{shop.responseRate}%</div>
                      <div className="text-[var(--dropp-muted)]">{t.profile.shopStatsResponse}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenShop(shop.shopId);
                      }}
                      className="min-h-[44px] px-3 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)] inline-flex items-center justify-center gap-1.5"
                    >
                      <Store className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.product.viewShopBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNegotiate(shop, post);
                      }}
                      className="min-h-[44px] px-3 rounded-xl border border-[var(--dropp-accent)]/70 text-[var(--dropp-accent)] hover:bg-[var(--dropp-accent)]/10 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.product.negotiateBtn}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Purchase Module + Specs + Reviews */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-[var(--dropp-accent)] tabular-nums">
                    {formatFcfa(unitPrice)}
                  </span>
                  <span className="text-xs text-[var(--dropp-muted)]">
                    / {t.sheets.pcsUnit} · {t.feed.moqLabel} {post.moq} {t.sheets.pcsUnit}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--dropp-muted)] leading-relaxed">{post.description}</p>
              </div>

              {/* Wholesale Tiers */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--dropp-muted)] mb-2">
                  {t.sheets.wholesaleTiers}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {post.tiers.map((tier, idx) => {
                    const active =
                      !isSample &&
                      effectiveQty >= tier.minQty &&
                      (tier.maxQty === null || effectiveQty <= tier.maxQty);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setIsSample(false);
                          setQty(tier.minQty);
                        }}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/12 text-[var(--dropp-text)]'
                            : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-muted)] hover:border-[var(--dropp-border-strong)]'
                        }`}
                      >
                        <div className="text-[11px] text-[var(--dropp-muted)] tabular-nums">
                          {tier.maxQty ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`}{' '}
                          {t.sheets.pcsUnit}
                        </div>
                        <div className={`mt-0.5 text-sm font-bold tabular-nums ${active ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-text)]'}`}>
                          {formatFcfa(tier.unitPriceFcfa)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variants */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--dropp-muted)] mb-2">
                  {t.sheets.selectVariant}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {post.variants.map((v) => {
                    const outOfStock = v.stock <= 0;
                    const selected = v.id === selectedVariantId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors flex items-center gap-2 ${
                          outOfStock
                            ? 'border-[var(--dropp-border)] opacity-50 bg-[var(--dropp-surface)] text-[var(--dropp-muted)] line-through cursor-not-allowed'
                            : selected
                            ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/15 text-[var(--dropp-text)]'
                            : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-text)] hover:border-[var(--dropp-border-strong)]'
                        }`}
                      >
                        {v.colorHex && (
                          <span
                            className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25 shrink-0"
                            style={{ backgroundColor: v.colorHex }}
                            aria-hidden="true"
                          />
                        )}
                        <span>{v.label}</span>
                        {v.priceDeltaFcfa !== 0 && !outOfStock && (
                          <span className="text-[11px] text-[var(--dropp-muted)] tabular-nums">
                            {v.priceDeltaFcfa > 0 ? `+${formatFcfa(v.priceDeltaFcfa)}` : formatFcfa(v.priceDeltaFcfa)}
                          </span>
                        )}
                        {outOfStock && (
                          <span className="text-[10px]">({t.sheets.outOfStock})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample + Quantity */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-1">
                <label className="inline-flex items-center gap-2.5 text-xs text-[var(--dropp-text)] cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={isSample}
                    onChange={(e) => setIsSample(e.target.checked)}
                    className="w-4 h-4 accent-[#FF5A1F]"
                  />
                  <span>{t.sheets.sampleOption}</span>
                </label>

                {!isSample && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="-"
                      onClick={() => setQty((q) => Math.max(post.moq, q - 1))}
                      className="w-11 h-11 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-center text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="w-12 text-center text-sm font-bold tabular-nums text-[var(--dropp-text)]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => setQty((q) => q + 1)}
                      className="w-11 h-11 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-center text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--dropp-muted)]">{t.sheets.estimatedTotal}</span>
                  <span className="text-xl font-bold text-[var(--dropp-text)] tabular-nums">
                    {formatFcfa(unitPrice * effectiveQty)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!selectedVariant || selectedVariant.stock <= 0}
                    className="min-h-[48px] rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-[var(--dropp-text)] font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                  >
                    {addedFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-[#FF5A1F]" aria-hidden="true" />
                        <span>{t.sheets.addedToCart}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                        <span>{t.sheets.addToCartPreview}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuy}
                    disabled={!selectedVariant || selectedVariant.stock <= 0}
                    className="min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                  >
                    <span>{t.product.buyNowBtn}</span>
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#FF5A1F] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.product.escrowBadge}</span>
                </div>
              </div>

              {/* Technical Specs */}
              {post.specs.length > 0 && (
                <div className="border-t border-[var(--dropp-border)] pt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-[var(--dropp-muted)]">{t.product.specsTitle}</h3>
                  <dl className="divide-y divide-[var(--dropp-border)] text-xs">
                    {post.specs.map((spec, i) => (
                      <div key={i} className="py-2 flex items-center justify-between gap-4">
                        <dt className="text-[var(--dropp-muted)]">{spec.label}</dt>
                        <dd className="text-[var(--dropp-text)] font-medium text-right">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Buyer Reviews */}
              <div className="border-t border-[var(--dropp-border)] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[var(--dropp-muted)]">
                    {t.product.reviewsTitle} ({reviews.length})
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9A5B00] dark:text-[#F5A524] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#F5A524] text-[#F5A524]" aria-hidden="true" />
                    {post.rating}/5
                  </span>
                </div>

                {reviews.length === 0 ? (
                  <p className="text-xs text-[var(--dropp-muted)]">{t.product.noReviews}</p>
                ) : (
                  <div className="space-y-2.5">
                    {reviews.map((rev) => (
                      <div key={rev.reviewId} className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--dropp-text)]">{rev.authorName}</span>
                          <span className="text-[#9A5B00] dark:text-[#F5A524] tabular-nums font-medium">{rev.rating}/5</span>
                        </div>
                        <p className="text-xs text-[var(--dropp-muted)]">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="flex items-center gap-2 pt-1">
                  <select
                    aria-label={t.profile.shopStatsRating}
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="min-h-[44px] px-2.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}/5
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={t.product.addReviewPlaceholder}
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)] focus:outline-none focus:border-[var(--dropp-accent)]"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)] shrink-0"
                  >
                    {t.product.submitReview}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
