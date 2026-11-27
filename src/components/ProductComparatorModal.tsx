import React from 'react';
import { BadgeCheck, Star, Trash2, X } from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type { FeedPost } from '../types/dropp';
import { formatFcfa } from '../utils/formatters';

interface ProductComparatorModalProps {
  t: DroppDictionary;
  posts: FeedPost[];
  onRemovePost: (postId: string) => void;
  onSelectPost: (post: FeedPost) => void;
  onClose: () => void;
}

export const ProductComparatorModal: React.FC<ProductComparatorModalProps> = ({
  t,
  posts,
  onRemovePost,
  onSelectPost,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.market.compareTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dropp-border)]">
          <h2 className="text-base font-bold text-[var(--dropp-text)]">
            {t.market.compareTitle} ({posts.length}/4)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.close}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {posts.length < 2 ? (
            <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">{t.market.compareEmpty}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {posts.map((post) => {
                const bestTier = post.tiers[post.tiers.length - 1];
                return (
                  <div
                    key={post.postId}
                    className="rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] overflow-hidden flex flex-col"
                  >
                    <div className="relative h-44 bg-black">
                      <img
                        src={post.posterUrl}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onRemovePost(post.postId)}
                        aria-label={t.cart.removeItem}
                        className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/75 text-white hover:bg-black flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                      <div className="space-y-2.5">
                        <h3 className="text-sm font-bold text-[var(--dropp-text)] line-clamp-2">{post.title}</h3>
                        <div className="flex items-center gap-1 text-[var(--dropp-muted)]">
                          <span className="truncate">{post.shopName}</span>
                          {post.shopCertified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
                          )}
                        </div>
                        <dl className="divide-y divide-[var(--dropp-border)] pt-1">
                          <div className="py-1.5 flex justify-between">
                            <dt className="text-[var(--dropp-muted)]">{t.sheets.unitPrice}</dt>
                            <dd className="font-bold text-[var(--dropp-accent)] tabular-nums">
                              {formatFcfa(post.priceFcfa)}
                            </dd>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <dt className="text-[var(--dropp-muted)]">{t.feed.moqLabel}</dt>
                            <dd className="font-semibold text-[var(--dropp-text)] tabular-nums">
                              {post.moq} {t.sheets.pcsUnit}
                            </dd>
                          </div>
                          {bestTier && (
                            <div className="py-1.5 flex justify-between">
                              <dt className="text-[var(--dropp-muted)]">{bestTier.minQty}+ {t.sheets.pcsUnit}</dt>
                              <dd className="font-semibold text-[#FF5A1F] tabular-nums">
                                {formatFcfa(bestTier.unitPriceFcfa)}
                              </dd>
                            </div>
                          )}
                          <div className="py-1.5 flex justify-between">
                            <dt className="text-[var(--dropp-muted)]">{t.auth.cityLabel}</dt>
                            <dd className="text-[var(--dropp-text)]">{post.city}</dd>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <dt className="text-[var(--dropp-muted)]">{t.profile.shopStatsRating}</dt>
                            <dd className="inline-flex items-center gap-1 text-[#9A5B00] dark:text-[#F5A524] tabular-nums font-medium">
                              <Star className="w-3 h-3 fill-[#F5A524] text-[#F5A524]" aria-hidden="true" />
                              {post.rating}/5
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectPost(post);
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white font-bold transition-colors"
                      >
                        {t.feed.orderNow}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
