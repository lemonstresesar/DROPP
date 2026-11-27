import type { AppRoute, NavTab } from '../types/dropp';

export interface ParsedRoute {
  route: AppRoute;
  shopId: string | null;
  postId: string | null;
}

export function parseDroppRoute(pathname: string, search = ''): ParsedRoute {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search || '');
  const postId = params.get('post');

  if (cleanPath === '/marche') {
    return { route: 'market', shopId: null, postId: null };
  }
  if (cleanPath === '/messages') {
    return { route: 'messages', shopId: null, postId: null };
  }
  if (cleanPath === '/profil') {
    return { route: 'profile', shopId: null, postId: null };
  }
  if (cleanPath === '/admin') {
    return { route: 'admin', shopId: null, postId: null };
  }
  if (cleanPath === '/vendeur') {
    return { route: 'vendor', shopId: null, postId: null };
  }
  if (cleanPath.startsWith('/boutique/')) {
    const rawId = cleanPath.slice('/boutique/'.length);
    const shopId = rawId ? decodeURIComponent(rawId) : null;
    if (shopId) {
      return { route: 'shop', shopId, postId: null };
    }
    return { route: 'profile', shopId: null, postId: null };
  }

  return { route: 'feed', shopId: null, postId };
}

export function buildDroppPath(input: {
  route: AppRoute;
  shopId?: string | null;
  postId?: string | null;
}): string {
  switch (input.route) {
    case 'market':
      return '/marche';
    case 'messages':
      return '/messages';
    case 'profile':
      return '/profil';
    case 'admin':
      return '/admin';
    case 'vendor':
      return '/vendeur';
    case 'shop':
      return input.shopId ? `/boutique/${encodeURIComponent(input.shopId)}` : '/profil';
    case 'feed':
    default:
      return input.postId ? `/?post=${encodeURIComponent(input.postId)}` : '/';
  }
}

export function routeToNavTab(route: AppRoute): NavTab {
  if (route === 'market') return 'market';
  if (route === 'messages') return 'messages';
  if (route === 'profile' || route === 'shop' || route === 'admin' || route === 'vendor') {
    return 'profile';
  }
  return 'feed';
}
