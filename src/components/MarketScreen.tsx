import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  FileText,
  Play,
  Scale,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  FeedPost,
  MarketplaceCategory,
  MarketSortOption,
  PlatformSettings,
  UserSession,
} from '../types/dropp';
import { formatFcfa } from '../utils/formatters';
import { buildCloudinaryMediaUrl } from '../utils/cloudinary';
import { filterAndSortMarketPosts } from '../utils/commerce';
import { canBuy, canCreateRfq, canRespondToRfq } from '../utils/permissions';

interface MarketScreenProps {
  t: DroppDictionary;
  session: UserSession | null;
  posts: FeedPost[];
  platformSettings?: PlatformSettings;
  catalogLoading?: boolean;
  catalogError?: string | null;
  onRetryCatalog?: () => void;
  likedIds: string[];
  recentlyViewedIds: string[];
  compareIds: string[];
  cartCount: number;
  dataSaver: boolean;
  initialQuery?: string;
  onWatchPost: (postId: string) => void;
  onOpenProductDetail: (post: FeedPost) => void;
  onToggleCompare: (postId: string) => void;
  onOpenComparator: () => void;
  onOpenCart: () => void;
  onOpenRfq: () => void;
}

const ALL_CATEGORIES: MarketplaceCategory[] = [
  'Mode',
  'Électronique',
  'Beauté',
  'Alimentation',
  'Maison',
  'Autre',
];

const NEIGHBORHOODS = [
  'ALL',
  'Akwa',
  'Bastos',
  'Bonapriso',
  'Ndokoti',
  'Mokolo',
  'Mboppi',
  'Bonamoussadi',
  'Mvan',
];

export const MarketScreen: React.FC<MarketScreenProps> = ({
  t,
  session,
  posts,
  platformSettings,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  likedIds,
  recentlyViewedIds,
  compareIds,
  cartCount,
  dataSaver,
  initialQuery = '',
  onWatchPost,
  onOpenProductDetail,
  onToggleCompare,
  onOpenComparator,
  onOpenCart,
  onOpenRfq,
}) => {
  const showCartBtn = !session || canBuy(session);
  const showRfqBtn = !session || canCreateRfq(session) || canRespondToRfq(session);

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<'ALL' | MarketplaceCategory>('ALL');
  const [city, setCity] = useState<'ALL' | 'Douala' | 'Yaoundé'>('ALL');
  const [neighborhood, setNeighborhood] = useState('ALL');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [maxPriceStr, setMaxPriceStr] = useState('');
  const [maxMoqStr, setMaxMoqStr] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<MarketSortOption>('recommended');

  const categories = useMemo<Array<'ALL' | MarketplaceCategory>>(() => {
    const enabled =
      platformSettings?.enabledCategories && platformSettings.enabledCategories.length > 0
        ? platformSettings.enabledCategories
        : ALL_CATEGORIES;
    return ['ALL', ...enabled];
  }, [platformSettings?.enabledCategories]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (category !== 'ALL') count += 1;
    if (city !== 'ALL') count += 1;
    if (neighborhood !== 'ALL') count += 1;
    if (certifiedOnly) count += 1;
    if (maxPriceStr.trim()) count += 1;
    if (maxMoqStr.trim()) count += 1;
    if (minRating > 0) count += 1;
    if (sortBy !== 'recommended') count += 1;
    return count;
  }, [category, city, neighborhood, certifiedOnly, maxPriceStr, maxMoqStr, minRating, sortBy]);

  const filtered = useMemo(() => {
    const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;
    const maxMoq = maxMoqStr ? Number(maxMoqStr) : null;
    return filterAndSortMarketPosts(posts, {
      query,
      category,
      city,
      neighborhood,
      certifiedOnly,
      minPriceFcfa: null,
      maxPriceFcfa: maxPrice && !Number.isNaN(maxPrice) ? maxPrice : null,
      maxMoq: maxMoq && !Number.isNaN(maxMoq) ? maxMoq : null,
      minRating,
      sortBy,
      likedIds,
      recentlyViewedIds,
    });
  }, [
    posts,
    query,
    category,
    city,
    neighborhood,
    certifiedOnly,
    maxPriceStr,
    maxMoqStr,
    minRating,
    sortBy,
    likedIds,
    recentlyViewedIds,
  ]);

  const resetAll = () => {
    setQuery('');
    setCategory('ALL');
    setCity('ALL');
    setNeighborhood('ALL');
    setCertifiedOnly(false);
    setMaxPriceStr('');
    setMaxMoqStr('');
    setMinRating(0);
    setSortBy('recommended');
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--dropp-bg)] pb-24 lg:pb-8">
      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-3.5">
        {/* Compact Top Header: Title + RFQ + Cart */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="text-xl font-bold text-[var(--dropp-text)] tracking-tight">
              {t.market.title}
            </h1>
            <p className="text-xs text-[var(--dropp-muted)]">
              {t.market.subtitle} · {filtered.length} {t.market.resultsCount}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {showRfqBtn && (
              <button
                type="button"
                onClick={onOpenRfq}
                className="min-h-[42px] px-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)] inline-flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                <span>{t.market.rfqBannerBtn}</span>
              </button>
            )}

            {showCartBtn && (
              <button
                type="button"
                onClick={onOpenCart}
                aria-label={t.actions.cart}
                className="relative min-h-[42px] px-3.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>{t.actions.cart}</span>
                {cartCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-black text-white text-[11px] tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Single Compact Search + Filters Drawer Trigger (Products show immediately below!) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[var(--dropp-muted)] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.feed.searchPlaceholder}
              aria-label={t.feed.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)] focus:outline-none focus:border-[var(--dropp-accent)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersDrawerOpen(true)}
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 ${
              activeFiltersCount > 0
                ? 'border-[var(--dropp-accent)] bg-[var(--dropp-accent)]/15 text-[var(--dropp-text)]'
                : 'border-[var(--dropp-border)] bg-[var(--dropp-surface)] text-[var(--dropp-text)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>
              {t.market.filtersBtn}
              {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </span>
          </button>
        </div>

        {/* Comparator Strip if >= 1 selected */}
        {compareIds.length > 0 && (
          <div className="p-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-accent)]/60 flex items-center justify-between gap-3">
            <div className="text-xs text-[var(--dropp-text)] tabular-nums">
              {compareIds.length}/4 {t.market.compareSelected}
            </div>
            <button
              type="button"
              onClick={onOpenComparator}
              className="min-h-[40px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.market.compareOpen}</span>
            </button>
          </div>
        )}

        {/* Product Grid */}
        {catalogLoading && posts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin mx-auto" />
          </div>
        ) : catalogError && posts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-[#FCA5A5]">{t.errors.catalogLoadDesc}</p>
            <p className="text-xs text-[var(--dropp-muted)]">{catalogError}</p>
            {onRetryCatalog && (
              <button
                type="button"
                onClick={onRetryCatalog}
                className="min-h-[40px] px-4 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold"
              >
                {t.errors.retry}
              </button>
            )}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--dropp-muted)]">
            {t.errors.emptyCatalog}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-[var(--dropp-muted)]">{t.market.noResults}</p>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="min-h-[40px] px-4 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-xs font-semibold text-[var(--dropp-text)]"
              >
                {t.market.resetFilters}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filtered.map((post) => {
              const inCompare = compareIds.includes(post.postId);
              return (
                <article
                  key={post.postId}
                  className="bg-[var(--dropp-surface)] border border-[var(--dropp-border)] rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-black">
                    <img
                      src={buildCloudinaryMediaUrl(post.posterUrl, {
                        dataSaver,
                        isThumbnail: true,
                      })}
                      alt={post.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onWatchPost(post.postId)}
                      aria-label={`${t.market.watchVideo} — ${post.title}`}
                      className="absolute top-2 right-2 min-w-[36px] min-h-[36px] w-9 h-9 rounded-full bg-black/75 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black"
                    >
                      <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                    </button>

                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      {post.promoPercent && (
                        <span className="px-2 py-0.5 rounded-md bg-black/85 border border-[#FF5A1F]/50 text-[#FF5A1F] text-[11px] font-bold">
                          -{post.promoPercent}%
                        </span>
                      )}
                      {post.isDemo && (
                        <span className="px-2 py-0.5 rounded-md bg-black/80 text-zinc-200 text-[10px] font-medium">
                          {t.market.demoBadge}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleCompare(post.postId)}
                      aria-pressed={inCompare}
                      className={`absolute bottom-2 right-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-sm ${
                        inCompare
                          ? 'bg-[#FF5A1F] text-white font-bold'
                          : 'bg-black/75 text-white hover:bg-black'
                      }`}
                    >
                      {inCompare ? t.market.compareSelected : t.market.compareAdd}
                    </button>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-start justify-between gap-1.5 text-[11px] text-[var(--dropp-muted)]">
                        <span className="inline-flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-[var(--dropp-text)]/90">
                            {post.shopName}
                          </span>
                          {post.shopCertified && (
                            <BadgeCheck
                              className="w-3.5 h-3.5 text-[var(--dropp-accent)] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[#9A5B00] dark:text-[#F5A524] shrink-0 tabular-nums font-medium">
                          <Star
                            className="w-3 h-3 fill-[#F5A524] text-[#F5A524]"
                            aria-hidden="true"
                          />
                          {post.rating}
                        </span>
                      </div>
                      <h2 className="mt-1 text-xs font-semibold text-[var(--dropp-text)] line-clamp-2 leading-snug">
                        {post.title}
                      </h2>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-sm font-bold text-[var(--dropp-accent)] tabular-nums">
                          {formatFcfa(post.priceFcfa)}
                        </span>
                        <span className="text-[11px] text-[var(--dropp-muted)] tabular-nums">
                          {t.feed.moqLabel} {post.moq}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenProductDetail(post)}
                        className="mt-2 w-full min-h-[40px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold transition-colors"
                      >
                        {t.market.viewProduct}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters Drawer Overlay */}
      {filtersDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setFiltersDrawerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.market.filtersBtn}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] rounded-t-3xl sm:rounded-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dropp-border)]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                <h2 className="text-base font-bold text-[var(--dropp-text)]">
                  {t.market.filtersBtn}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFiltersDrawerOpen(false)}
                aria-label={t.actions.close}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Categories */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--dropp-muted)]">Catégorie</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                          active
                            ? 'bg-[#FF5A1F] text-white'
                            : 'bg-[var(--dropp-surface)] text-[var(--dropp-text)] border border-[var(--dropp-border)]'
                        }`}
                      >
                        {cat === 'ALL' ? t.market.allCategories : cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* City, Neighborhood, Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs text-[var(--dropp-muted)]">
                  <span>{t.auth.cityLabel}</span>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value as 'ALL' | 'Douala' | 'Yaoundé')}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs font-medium text-[var(--dropp-text)]"
                  >
                    <option value="ALL">{t.market.allCities}</option>
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs text-[var(--dropp-muted)]">
                  <span>{t.cart.neighborhoodLabel}</span>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs font-medium text-[var(--dropp-text)]"
                  >
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>
                        {n === 'ALL' ? t.market.allNeighborhoods : n}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs text-[var(--dropp-muted)] sm:col-span-2">
                  <span>{t.market.sortLabel}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MarketSortOption)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs font-medium text-[var(--dropp-text)]"
                  >
                    <option value="recommended">{t.market.sortRecommended}</option>
                    <option value="price_asc">{t.market.sortPriceAsc}</option>
                    <option value="price_desc">{t.market.sortPriceDesc}</option>
                    <option value="rating_desc">{t.market.sortRating}</option>
                    <option value="popular">{t.market.sortPopular}</option>
                    <option value="moq_asc">{t.market.sortMoqAsc}</option>
                  </select>
                </label>
              </div>

              {/* Price / MOQ / Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1 text-xs text-[var(--dropp-muted)]">
                  <span>{t.market.maxPriceLabel}</span>
                  <input
                    type="number"
                    value={maxPriceStr}
                    onChange={(e) => setMaxPriceStr(e.target.value)}
                    placeholder="50000"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="space-y-1 text-xs text-[var(--dropp-muted)]">
                  <span>{t.market.maxMoqLabel}</span>
                  <input
                    type="number"
                    value={maxMoqStr}
                    onChange={(e) => setMaxMoqStr(e.target.value)}
                    placeholder="10"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="space-y-1 text-xs text-[var(--dropp-muted)]">
                  <span>{t.market.minRatingLabel}</span>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  >
                    <option value={0}>Toutes</option>
                    <option value={4.5}>4.5+</option>
                    <option value={4.8}>4.8+</option>
                  </select>
                </label>
              </div>

              <label className="inline-flex items-center gap-2.5 text-xs text-[var(--dropp-text)] min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={certifiedOnly}
                  onChange={(e) => setCertifiedOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#FF5A1F]"
                />
                <span>{t.market.certifiedOnly}</span>
              </label>
            </div>

            <div className="p-4 border-t border-[var(--dropp-border)] flex items-center gap-2.5 bg-[var(--dropp-bg)]">
              <button
                type="button"
                onClick={resetAll}
                className="min-h-[44px] px-4 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-xs font-semibold text-[var(--dropp-text)]"
              >
                {t.market.resetFilters}
              </button>
              <button
                type="button"
                onClick={() => setFiltersDrawerOpen(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
              >
                {t.market.applyFiltersBtn} ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
