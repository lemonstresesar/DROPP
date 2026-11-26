import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Share2,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  FeedPost,
  LocalCartPreviewItem,
  PostComment,
  ShopProfile,
  UserSession,
} from '../types/dropp';
import { formatFcfa, getUnitPriceForQty } from '../utils/formatters';

interface SheetWrapperProps {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
}

const SheetWrapper: React.FC<SheetWrapperProps> = ({
  title,
  onClose,
  closeLabel,
  children,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/65 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md bg-[var(--dropp-elevated)] border-t lg:border border-[var(--dropp-border)] rounded-t-3xl lg:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
    >
      <div className="pt-2.5 pb-1 flex justify-center lg:hidden">
        <span className="w-10 h-1 rounded-full bg-[var(--dropp-border-strong)]" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--dropp-border)]">
        <h2 className="text-base font-semibold text-[var(--dropp-text)]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)] transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-7">{children}</div>
    </div>
  </div>
);

interface CommentsSheetProps {
  t: DroppDictionary;
  post: FeedPost;
  comments: PostComment[];
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onAddComment: (postId: string, text: string) => void;
  onRetryComment: (postId: string, commentId: string) => void;
  onClose: () => void;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({
  t,
  post,
  comments,
  isAuthenticated,
  onRequireAuth,
  onAddComment,
  onRetryComment,
  onClose,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!text.trim()) return;
    onAddComment(post.postId, text);
    setText('');
  };

  return (
    <SheetWrapper
      title={`${t.sheets.commentsTitle} (${comments.length})`}
      onClose={onClose}
      closeLabel={t.actions.close}
    >
      <div className="space-y-4 pb-4">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--dropp-muted)] text-center py-6">{t.sheets.commentsEmpty}</p>
        ) : (
          comments.map((c) => (
            <div key={c.commentId} className="flex flex-col gap-1 border-b border-[var(--dropp-border)] pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--dropp-muted)]">{c.authorName}</span>
                {c.deliveryStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#9A5B00] dark:text-[#F5A524]">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {t.sheets.statusPending}
                  </span>
                )}
                {c.deliveryStatus === 'failed' && (
                  <button
                    type="button"
                    onClick={() => onRetryComment(post.postId, c.commentId)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#B42328] dark:text-[#FCA5A5] hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    {t.sheets.statusFailed}
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--dropp-text)] leading-relaxed">{c.text}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 pt-3 bg-[var(--dropp-elevated)] border-t border-[var(--dropp-border)] flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isAuthenticated ? t.sheets.commentPlaceholder : t.sheets.loginToInteract}
          aria-label={t.sheets.commentPlaceholder}
          maxLength={400}
          className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)] focus:outline-none focus:border-[var(--dropp-accent)]"
        />
        <button
          type="submit"
          aria-label={t.sheets.sendComment}
          className="min-w-[44px] min-h-[44px] px-4 rounded-xl bg-[#FF5A1F] text-white font-bold text-sm flex items-center justify-center hover:bg-[#E54E19] transition-colors shrink-0"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </SheetWrapper>
  );
};

interface QuickOrderSheetProps {
  t: DroppDictionary;
  post: FeedPost;
  cartCount: number;
  onAddToCart: (item: LocalCartPreviewItem) => void;
  onOpenCart: () => void;
  onClose: () => void;
}

export const QuickOrderSheet: React.FC<QuickOrderSheetProps> = ({
  t,
  post,
  cartCount,
  onAddToCart,
  onOpenCart,
  onClose,
}) => {
  const firstInStock = post.variants.find((v) => v.stock > 0) || post.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstInStock?.id || '');
  const [isSample, setIsSample] = useState(false);
  const [qty, setQty] = useState(post.moq);
  const [addedFeedback, setAddedFeedback] = useState(false);

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
  const totalFcfa = unitPrice * effectiveQty;

  const handleAdd = () => {
    if (!selectedVariant || selectedVariant.stock === 0) return;
    onAddToCart({
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
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2200);
  };

  return (
    <SheetWrapper
      title={t.sheets.quickOrderTitle}
      onClose={onClose}
      closeLabel={t.actions.close}
    >
      <div className="space-y-4">
        {/* Product summary */}
        <div className="flex items-center gap-3">
          <img
            src={post.posterUrl}
            alt={post.title}
            referrerPolicy="no-referrer"
            className="w-16 h-20 rounded-xl object-cover bg-black shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs text-[var(--dropp-muted)]">{post.shopName} · {post.city}</p>
            <h3 className="text-sm font-semibold text-[var(--dropp-text)] line-clamp-2">{post.title}</h3>
            <p className="mt-1 text-base font-bold text-[var(--dropp-accent)] tabular-nums">
              {formatFcfa(unitPrice)} <span className="text-xs font-normal text-[var(--dropp-muted)]">/ {t.sheets.pcsUnit}</span>
            </p>
          </div>
        </div>

        {/* Wholesale Tiers */}
        <div>
          <p className="text-xs font-semibold text-[var(--dropp-muted)] mb-2">{t.sheets.wholesaleTiers}</p>
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
                  className={`p-2.5 rounded-xl border text-left transition-colors ${
                    active
                      ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/12 text-[var(--dropp-text)]'
                      : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-muted)] hover:border-[var(--dropp-border-strong)]'
                  }`}
                >
                  <div className="text-[11px] text-[var(--dropp-muted)] tabular-nums">
                    {tier.maxQty ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`} {t.sheets.pcsUnit}
                  </div>
                  <div className={`mt-0.5 text-xs font-bold tabular-nums ${active ? 'text-[var(--dropp-accent)]' : 'text-[var(--dropp-text)]'}`}>
                    {formatFcfa(tier.unitPriceFcfa)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Variants */}
        <div>
          <p className="text-xs font-semibold text-[var(--dropp-muted)] mb-2">{t.sheets.selectVariant}</p>
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
                  {outOfStock && <span className="text-[10px]">({t.sheets.outOfStock})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sample toggle + Quantity stepper */}
        <div className="flex items-center justify-between gap-4 pt-1">
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
              <span className="w-10 text-center text-sm font-bold tabular-nums text-[var(--dropp-text)]">
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

        {/* Total + CTA */}
        <div className="border-t border-[var(--dropp-border)] pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--dropp-muted)]">{t.sheets.estimatedTotal}</span>
            <span className="text-lg font-bold text-[var(--dropp-text)] tabular-nums">
              {formatFcfa(totalFcfa)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedVariant || selectedVariant.stock <= 0}
            className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
          >
            {addedFeedback ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
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
            onClick={() => {
              onClose();
              onOpenCart();
            }}
            className="w-full min-h-[44px] rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] hover:bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)] font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
            <span>
              {t.sheets.openCartCheckout}
              {cartCount > 0 ? ` (${cartCount})` : ''}
            </span>
          </button>

          <p className="text-[11px] text-[var(--dropp-muted)] text-center">
            {t.sheets.phase2CheckoutNote}
          </p>
        </div>
      </div>
    </SheetWrapper>
  );
};

interface ShareSheetProps {
  t: DroppDictionary;
  post: FeedPost;
  onClose: () => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ t, post, onClose }) => {
  const [copied, setCopied] = useState(false);
  const directUrl = `${window.location.origin}/?post=${encodeURIComponent(post.postId)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored in restricted frames
    }
  };

  const triggerNativeShare = async () => {
    if (navigator.share) {
      await navigator
        .share({
          title: post.title,
          text: `${post.shopName} — ${formatFcfa(post.priceFcfa)}`,
          url: directUrl,
        })
        .catch(() => undefined);
    }
  };

  return (
    <SheetWrapper title={t.sheets.shareTitle} onClose={onClose} closeLabel={t.actions.close}>
      <div className="space-y-3">
        <p className="text-sm text-[var(--dropp-text)] font-medium">{post.title}</p>
        <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-muted)] break-all">
          {directUrl}
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#E54E19] transition-colors"
        >
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          <span>{copied ? t.actions.linkCopied : t.actions.copyLink}</span>
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={triggerNativeShare}
            className="w-full min-h-[44px] rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[var(--dropp-text)] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[var(--dropp-surface-alt)] transition-colors"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            <span>{t.sheets.shareNative}</span>
          </button>
        )}
      </div>
    </SheetWrapper>
  );
};

interface StoryPreviewSheetProps {
  t: DroppDictionary;
  shop: ShopProfile;
  onReplyToShop: (shop: ShopProfile) => void;
  onClose: () => void;
}

export const StoryPreviewSheet: React.FC<StoryPreviewSheetProps> = ({
  t,
  shop,
  onReplyToShop,
  onClose,
}) => (
  <SheetWrapper title={`${t.sheets.storyTitle} · ${shop.name}`} onClose={onClose} closeLabel={t.actions.close}>
    <div className="space-y-4">
      {shop.storyMediaUrl && (
        <img
          src={shop.storyMediaUrl}
          alt={shop.name}
          referrerPolicy="no-referrer"
          className="w-full h-64 object-cover rounded-2xl bg-black"
        />
      )}
      <p className="text-sm text-[var(--dropp-text)] leading-relaxed">{shop.storyPreviewText}</p>
      <button
        type="button"
        onClick={() => {
          onClose();
          onReplyToShop(shop);
        }}
        className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold transition-colors"
      >
        {t.sheets.storyReplyBtn}
      </button>
    </div>
  </SheetWrapper>
);

interface CreateActionSheetProps {
  t: DroppDictionary;
  session: UserSession | null;
  onRequireAuth: () => void;
  onOpenVendorStudio: (tab?: 'publish' | 'kyc') => void;
  onOpenRfq: () => void;
  onClose: () => void;
}

export const CreateActionSheet: React.FC<CreateActionSheetProps> = ({
  t,
  session,
  onRequireAuth,
  onOpenVendorStudio,
  onOpenRfq,
  onClose,
}) => {
  const isApprovedVendor =
    session?.role === 'admin' ||
    (session?.role === 'vendor' && session.vendorStatus === 'approved');
  const isPendingVendor = session?.role === 'vendor' && session.vendorStatus === 'pending';

  const title = isPendingVendor
    ? t.sheets.createPendingTitle
    : isApprovedVendor
    ? t.sheets.createVendorTitle
    : t.sheets.createClientTitle;

  const desc = isPendingVendor
    ? t.sheets.createPendingDesc
    : isApprovedVendor
    ? t.sheets.createVendorDesc
    : t.sheets.createClientDesc;

  return (
    <SheetWrapper title={title} onClose={onClose} closeLabel={t.actions.close}>
      <div className="space-y-3">
        <p className="text-sm text-[var(--dropp-muted)] leading-relaxed">{desc}</p>
        {!session ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequireAuth();
            }}
            className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] text-white text-sm font-bold hover:bg-[#E54E19] transition-colors"
          >
            {t.profile.loginCta}
          </button>
        ) : isApprovedVendor ? (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVendorStudio('publish');
              }}
              className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold transition-colors"
            >
              {t.sheets.openVendorStudio}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRfq();
              }}
              className="w-full min-h-[44px] rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] hover:bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)] font-semibold text-sm transition-colors"
            >
              {t.sheets.openRfqModal}
            </button>
          </div>
        ) : isPendingVendor ? (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVendorStudio('kyc');
              }}
              className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold transition-colors"
            >
              {t.sheets.openKycModal}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRfq();
              }}
              className="w-full min-h-[44px] rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] hover:bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)] font-semibold text-sm transition-colors"
            >
              {t.sheets.openRfqModal}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRfq();
              }}
              className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold transition-colors"
            >
              {t.sheets.openRfqModal}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVendorStudio('kyc');
              }}
              className="w-full min-h-[44px] rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] hover:bg-[var(--dropp-surface-alt)] text-[var(--dropp-text)] font-semibold text-sm transition-colors"
            >
              {t.profile.becomeVendorBtn}
            </button>
          </div>
        )}
      </div>
    </SheetWrapper>
  );
};
