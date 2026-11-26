import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Check,
  Zap,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type { FeedPost, FeedSubTab, LanguageCode, ShopProfile } from '../types/dropp';
import { formatCompactCount, formatFcfa } from '../utils/formatters';
import { buildCloudinaryMediaUrl } from '../utils/cloudinary';

interface FeedScreenProps {
  t: DroppDictionary;
  lang: LanguageCode;
  posts: FeedPost[];
  shops: ShopProfile[];
  likedIds: string[];
  bookmarkedIds: string[];
  followedShopIds: string[];
  cartCount: number;
  dataSaver: boolean;
  isSlowNetwork: boolean;
  initialPostId?: string | null;
  onRequireAuth: () => void;
  isAuthenticated: boolean;
  onToggleLike: (postId: string, forceLike?: boolean) => void;
  onToggleBookmark: (postId: string) => void;
  onToggleFollow: (shopId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onOpenOrder: (post: FeedPost) => void;
  onOpenShare: (post: FeedPost) => void;
  onOpenShopProfile: (shopId: string) => void;
  onOpenStory: (shop: ShopProfile) => void;
  onOpenSearch: () => void;
  onPostVisible: (postId: string) => void;
}

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  t,
  lang,
  posts,
  shops,
  likedIds,
  bookmarkedIds,
  followedShopIds,
  cartCount,
  dataSaver,
  isSlowNetwork,
  initialPostId,
  onRequireAuth,
  isAuthenticated,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onOpenOrder,
  onOpenShare,
  onOpenShopProfile,
  onOpenStory,
  onOpenSearch,
  onPostVisible,
}) => {
  const [subTab, setSubTab] = useState<FeedSubTab>('foryou');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [pausedMap, setPausedMap] = useState<Record<string, boolean>>({});
  const [manualPlayMap, setManualPlayMap] = useState<Record<string, boolean>>({});
  const [expandedDescMap, setExpandedDescMap] = useState<Record<string, boolean>>({});
  const [videoReadyMap, setVideoReadyMap] = useState<Record<string, boolean>>({});
  const [heartBursts, setHeartBursts] = useState<Record<string, HeartBurst[]>>({});

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<{ postId: string; time: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visiblePosts = useMemo(() => {
    if (subTab === 'foryou') return posts;
    return posts.filter((p) => followedShopIds.includes(p.shopId));
  }, [posts, subTab, followedShopIds]);

  const followedStories = useMemo(
    () => shops.filter((s) => followedShopIds.includes(s.shopId) && s.hasActiveStory),
    [shops, followedShopIds]
  );

  // Jump to direct shared post if ?post=<id>
  useEffect(() => {
    if (!initialPostId || !scrollerRef.current) return;
    const idx = visiblePosts.findIndex((p) => p.postId === initialPostId);
    if (idx >= 0) {
      setActiveIndex(idx);
      const child = scrollerRef.current.children[idx] as HTMLElement | undefined;
      child?.scrollIntoView({ behavior: 'auto' });
    }
  }, [initialPostId, visiblePosts]);

  // Track active slide via IntersectionObserver
  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idxAttr = entry.target.getAttribute('data-index');
            if (idxAttr !== null) {
              const idx = Number(idxAttr);
              setActiveIndex(idx);
              const post = visiblePosts[idx];
              if (post) onPostVisible(post.postId);
            }
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    Array.from(container.children).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visiblePosts, onPostVisible]);

  // Preload poster images for the next 2 posts only (2GB RAM friendly)
  useEffect(() => {
    const upcoming = visiblePosts.slice(activeIndex + 1, activeIndex + 3);
    upcoming.forEach((p) => {
      const img = new Image();
      img.src = buildCloudinaryMediaUrl(p.posterUrl, {
        dataSaver,
        isThumbnail: false,
      });
    });
  }, [activeIndex, visiblePosts, dataSaver]);

  const scrollToIndex = useCallback(
    (nextIdx: number) => {
      if (!scrollerRef.current) return;
      const clamped = Math.max(0, Math.min(visiblePosts.length - 1, nextIdx));
      const target = scrollerRef.current.children[clamped] as HTMLElement | undefined;
      target?.scrollIntoView({ behavior: 'smooth' });
    },
    [visiblePosts.length]
  );

  // Keyboard Up/Down navigation for TikTok Web desktop convenience
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, scrollToIndex]);

  const spawnHeart = useCallback((postId: string, x: number, y: number) => {
    const id = Date.now() + Math.random();
    setHeartBursts((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), { id, x, y }],
    }));
    setTimeout(() => {
      setHeartBursts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((b) => b.id !== id),
      }));
    }, 700);
  }, []);

  const handleVideoSurfaceTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, post: FeedPost) => {
      const now = Date.now();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (lastTapRef.current && lastTapRef.current.postId === post.postId && now - lastTapRef.current.time < 280) {
        if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
        lastTapRef.current = null;
        spawnHeart(post.postId, x, y);
        if (!isAuthenticated) {
          onRequireAuth();
          return;
        }
        onToggleLike(post.postId, true);
        return;
      }

      lastTapRef.current = { postId: post.postId, time: now };
      singleTapTimerRef.current = setTimeout(() => {
        lastTapRef.current = null;
        if (dataSaver && !manualPlayMap[post.postId]) {
          setManualPlayMap((prev) => ({ ...prev, [post.postId]: true }));
          setPausedMap((prev) => ({ ...prev, [post.postId]: false }));
          return;
        }
        setPausedMap((prev) => ({ ...prev, [post.postId]: !prev[post.postId] }));
      }, 240);
    },
    [dataSaver, isAuthenticated, manualPlayMap, onRequireAuth, onToggleLike, spawnHeart]
  );

  const handleAuthenticatedAction = useCallback(
    (fn: () => void) => {
      if (!isAuthenticated) {
        onRequireAuth();
        return;
      }
      fn();
    },
    [isAuthenticated, onRequireAuth]
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[var(--dropp-bg)]">
      {/* Top Floating Navigation Tabs + Search */}
      <header className="absolute top-0 left-1/2 -translate-x-1/2 w-full lg:max-w-[410px] lg:top-4 z-30 flex items-center justify-between px-4 pt-3 pb-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none">
        <div className="w-11 shrink-0 flex items-center">
          {(dataSaver || isSlowNetwork) && (
            <span
              title={t.network.dataSaverHint}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F5A524] pointer-events-auto"
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">480p</span>
            </span>
          )}
        </div>

        <nav
          aria-label="Flux"
          className="flex items-center gap-5 pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => {
              setSubTab('following');
              setActiveIndex(0);
            }}
            className={`min-h-[44px] px-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 relative ${
              subTab === 'following' ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.feed.following}
            {subTab === 'following' && (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#FF5A1F] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('foryou');
              setActiveIndex(0);
            }}
            className={`min-h-[44px] px-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 relative ${
              subTab === 'foryou' ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.feed.forYou}
            {subTab === 'foryou' && (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#FF5A1F] rounded-full" />
            )}
          </button>
        </nav>

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={t.feed.searchPlaceholder}
          className="pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <Search className="w-5 h-5" aria-hidden="true" />
        </button>
      </header>

      {/* Stories Bar inside "Abonnements" */}
      {subTab === 'following' && followedStories.length > 0 && (
        <div className="absolute top-14 lg:top-18 left-1/2 -translate-x-1/2 w-full lg:max-w-[410px] z-20 px-4 py-1.5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3.5 overflow-x-auto no-scrollbar">
            {followedStories.map((shop) => (
              <button
                key={shop.shopId}
                type="button"
                onClick={() => onOpenStory(shop)}
                className="flex flex-col items-center gap-1 shrink-0 min-w-[56px]"
              >
                <span
                  style={{ background: 'var(--dropp-gradient)' }}
                  className="w-12 h-12 rounded-full p-0.5 shadow-md"
                >
                  <img
                    src={buildCloudinaryMediaUrl(shop.avatarUrl, {
                      dataSaver,
                      isThumbnail: true,
                    })}
                    alt={shop.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                </span>
                <span className="text-[11px] font-medium text-white drop-shadow max-w-[64px] truncate">
                  {shop.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty Following State */}
      {subTab === 'following' && visiblePosts.length === 0 ? (
        <div className="max-w-sm px-6 text-center">
          <h2 className="text-lg font-semibold text-[var(--dropp-text)]">{t.feed.noFollowingTitle}</h2>
          <p className="mt-2 text-sm text-[var(--dropp-muted)]">{t.feed.noFollowingDesc}</p>
          <button
            type="button"
            onClick={() => setSubTab('foryou')}
            className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold transition-colors"
          >
            {t.feed.discoverForYou}
          </button>
        </div>
      ) : (
        <div className="relative w-full h-full lg:w-auto lg:flex lg:items-center lg:gap-4">
          {/* Vertical Scroll-Snap Feed Container */}
          <div
            ref={scrollerRef}
            data-testid="feed-scroller"
            className="w-full h-full lg:w-[410px] lg:h-[calc(100dvh-2rem)] lg:rounded-2xl lg:overflow-hidden lg:border lg:border-[var(--dropp-border)] overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
          >
            {visiblePosts.map((post, idx) => {
              const isActive = idx === activeIndex;
              const isNear = Math.abs(idx - activeIndex) <= 1;
              const isLiked = likedIds.includes(post.postId);
              const isBookmarked = bookmarkedIds.includes(post.postId);
              const isFollowed = followedShopIds.includes(post.shopId);
              const isPaused = Boolean(pausedMap[post.postId]);
              const isExpanded = Boolean(expandedDescMap[post.postId]);
              const shouldAutoplay = isActive && !isPaused && (!dataSaver || Boolean(manualPlayMap[post.postId]));
              const posterSrc = buildCloudinaryMediaUrl(post.posterUrl, {
                dataSaver,
                isThumbnail: false,
              });
              const videoSrc = buildCloudinaryMediaUrl(post.videoUrl, {
                dataSaver,
                isThumbnail: false,
              });

              return (
                <article
                  key={post.postId}
                  data-index={idx}
                  data-testid={`feed-card-${post.postId}`}
                  className="relative w-full h-full shrink-0 snap-start snap-always overflow-hidden bg-black"
                >
                  {/* Poster-First Layer (Never a blank black screen) */}
                  <img
                    src={posterSrc}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Virtualized Video Layer: mounted only for active ±1 slide */}
                  {isNear && videoSrc && (shouldAutoplay || videoReadyMap[post.postId]) && (
                    <VideoElement
                      src={videoSrc}
                      poster={posterSrc}
                      shouldPlay={shouldAutoplay}
                      onReady={() =>
                        setVideoReadyMap((prev) =>
                          prev[post.postId] ? prev : { ...prev, [post.postId]: true }
                        )
                      }
                    />
                  )}

                  {/* Tap / Double-Tap Interactive Overlay */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${post.title} — ${isPaused ? t.feed.tapToPlay : t.feed.paused}`}
                    onClick={(e) => handleVideoSurfaceTap(e, post)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setPausedMap((prev) => ({ ...prev, [post.postId]: !prev[post.postId] }));
                      }
                    }}
                    className="absolute inset-0 z-10 cursor-pointer focus:outline-none"
                  >
                    {/* Double-tap heart burst animations */}
                    {(heartBursts[post.postId] || []).map((burst) => (
                      <Heart
                        key={burst.id}
                        className="absolute w-20 h-20 text-[#FF5A1F] fill-[#FF5A1F] pointer-events-none animate-heart-burst drop-shadow-lg"
                        style={{ left: burst.x, top: burst.y }}
                        aria-hidden="true"
                      />
                    ))}

                    {/* Data Saver Tap-to-Play or Pause Indicator */}
                    {dataSaver && !manualPlayMap[post.postId] ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 pointer-events-none">
                        <span className="w-14 h-14 rounded-full bg-black/65 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Play className="w-6 h-6 text-white fill-white ml-0.5" aria-hidden="true" />
                        </span>
                        <span className="mt-2 text-xs font-medium text-white bg-black/60 px-2.5 py-1 rounded-md">
                          {t.feed.tapToPlay}
                        </span>
                      </div>
                    ) : (
                      isPaused && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <span className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                            <Pause className="w-7 h-7 text-white fill-white" aria-hidden="true" />
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Measured Contrast Scrim for Bottom Info */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 z-10 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

                  {/* Right Action Column (Mobile inside player; Desktop keeps visible & accessible) */}
                  <div className="absolute right-2.5 bottom-20 lg:bottom-6 z-20 flex flex-col items-center gap-3.5">
                    {/* Shop Avatar + Follow '+' */}
                    <div className="relative flex flex-col items-center mb-1">
                      <button
                        type="button"
                        onClick={() => onOpenShopProfile(post.shopId)}
                        aria-label={post.shopName}
                        className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-900 shadow-md"
                      >
                        <img
                          src={buildCloudinaryMediaUrl(post.shopAvatarUrl, {
                            dataSaver,
                            isThumbnail: true,
                          })}
                          alt={post.shopName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAuthenticatedAction(() => onToggleFollow(post.shopId))}
                        aria-label={isFollowed ? t.actions.following : `${t.actions.follow} ${post.shopName}`}
                        className={`-mt-3 min-w-[26px] min-h-[26px] w-7 h-7 rounded-full flex items-center justify-center border-2 border-black transition-colors ${
                          isFollowed ? 'bg-zinc-800 text-white' : 'bg-[#FF5A1F] text-white'
                        }`}
                      >
                        {isFollowed ? (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>

                    {/* Like */}
                    <button
                      type="button"
                      onClick={() => handleAuthenticatedAction(() => onToggleLike(post.postId))}
                      aria-label={`${t.actions.like} ${post.title}`}
                      aria-pressed={isLiked}
                      className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white"
                    >
                      <Heart
                        className={`w-7 h-7 transition-transform active:scale-125 ${
                          isLiked ? 'text-[#FF5A1F] fill-[#FF5A1F]' : 'text-white drop-shadow'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold tabular-nums drop-shadow">
                        {formatCompactCount(post.likesCount, lang)}
                      </span>
                    </button>

                    {/* Comments */}
                    <button
                      type="button"
                      onClick={() => onOpenComments(post)}
                      aria-label={`${t.actions.comments} (${post.commentsCount})`}
                      className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white"
                    >
                      <MessageCircle className="w-7 h-7 drop-shadow" aria-hidden="true" />
                      <span className="text-xs font-semibold tabular-nums drop-shadow">
                        {formatCompactCount(post.commentsCount, lang)}
                      </span>
                    </button>

                    {/* Bookmark */}
                    <button
                      type="button"
                      onClick={() => handleAuthenticatedAction(() => onToggleBookmark(post.postId))}
                      aria-label={`${t.actions.bookmark} ${post.title}`}
                      aria-pressed={isBookmarked}
                      className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white"
                    >
                      <Bookmark
                        className={`w-7 h-7 transition-transform active:scale-110 ${
                          isBookmarked ? 'text-[#FF5A1F] fill-[#FF5A1F]' : 'text-white drop-shadow'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold tabular-nums drop-shadow">
                        {formatCompactCount(post.bookmarksCount, lang)}
                      </span>
                    </button>

                    {/* Share */}
                    <button
                      type="button"
                      onClick={() => onOpenShare(post)}
                      aria-label={`${t.actions.share} ${post.title}`}
                      className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white"
                    >
                      <Share2 className="w-6 h-6 drop-shadow" aria-hidden="true" />
                      <span className="text-xs font-semibold tabular-nums drop-shadow">
                        {formatCompactCount(post.sharesCount, lang)}
                      </span>
                    </button>

                    {/* Quick Cart / Order */}
                    <button
                      type="button"
                      onClick={() => onOpenOrder(post)}
                      aria-label={`${t.actions.cart} — ${post.title}`}
                      className="relative min-w-[44px] min-h-[44px] flex flex-col items-center justify-center text-white"
                    >
                      <span className="w-10 h-10 rounded-full bg-black/80 border border-[#FF5A1F]/50 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-[#FF5A1F]" aria-hidden="true" />
                      </span>
                      {cartCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5A1F] text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                          {cartCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Bottom-Left Overlay: Shop, Certified, Collapsible Description, Price FCFA, MOQ, Commander CTA */}
                  <div className="absolute left-3.5 right-16 bottom-20 lg:bottom-5 z-20 flex flex-col items-start gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onOpenShopProfile(post.shopId)}
                        className="text-sm font-bold text-white hover:underline text-left"
                      >
                        {post.shopName}
                      </button>
                      {post.shopCertified && (
                        <span
                          title={t.feed.certified}
                          className="inline-flex items-center gap-0.5 text-xs font-semibold text-sky-400"
                        >
                          <BadgeCheck className="w-4 h-4 fill-sky-500 text-white" aria-hidden="true" />
                          <span>{t.feed.certified}</span>
                        </span>
                      )}
                      <span className="text-xs text-zinc-300">· {post.city}</span>
                    </div>

                    <h2 className="text-[15px] font-semibold text-white leading-snug line-clamp-1">
                      {post.title}
                    </h2>

                    <div className="text-xs text-zinc-200 leading-relaxed max-w-[290px]">
                      <p className={isExpanded ? '' : 'line-clamp-2'}>{post.description}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDescMap((prev) => ({
                            ...prev,
                            [post.postId]: !prev[post.postId],
                          }))
                        }
                        className="mt-0.5 text-zinc-300 font-semibold hover:text-white"
                      >
                        {isExpanded ? t.feed.seeLess : t.feed.seeMore}
                      </button>
                    </div>

                    <div className="flex items-baseline gap-3 text-xs text-zinc-200">
                      <span className="text-base font-bold text-[#FF5A1F] tabular-nums">
                        {formatFcfa(post.priceFcfa)}
                      </span>
                      <span aria-hidden="true" className="text-zinc-400">·</span>
                      <span className="font-medium tabular-nums">
                        {t.feed.moqLabel} : {post.moq} {t.sheets.pcsUnit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenOrder(post)}
                      className="mt-0.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-[#FF5A1F]/25 transition-all whitespace-nowrap"
                    >
                      {t.feed.orderNow}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop TikTok Web Prev/Next Controls */}
          <div className="hidden lg:flex flex-col gap-3">
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label={t.feed.prevVideo}
              className="w-11 h-11 rounded-full bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[var(--dropp-text)] flex items-center justify-center hover:border-[var(--dropp-border-strong)] disabled:opacity-30 transition-colors"
            >
              <ChevronUp className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex >= visiblePosts.length - 1}
              aria-label={t.feed.nextVideo}
              className="w-11 h-11 rounded-full bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[var(--dropp-text)] flex items-center justify-center hover:border-[var(--dropp-border-strong)] disabled:opacity-30 transition-colors"
            >
              <ChevronDown className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface VideoElementProps {
  src: string;
  poster: string;
  shouldPlay: boolean;
  onReady: () => void;
}

const VideoElement: React.FC<VideoElementProps> = ({ src, poster, shouldPlay, onReady }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlay) {
      el.play().catch(() => {
        // Autoplay may be deferred on strict low-power mode; poster stays visible
      });
    } else {
      el.pause();
    }
  }, [shouldPlay]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={shouldPlay ? 'auto' : 'metadata'}
      onLoadedData={onReady}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};
