import type { UserSession } from '../types/dropp';

export function isSuspendedVendor(session: UserSession | null): boolean {
  return Boolean(session && session.vendorStatus === 'suspended');
}

export function isAdminUser(session: UserSession | null): boolean {
  return Boolean(session && session.role === 'admin');
}

export function isApprovedVendorUser(session: UserSession | null): boolean {
  return Boolean(
    session &&
      session.role === 'vendor' &&
      session.vendorStatus === 'approved' &&
      Boolean(session.shopId)
  );
}

export function isPendingVendorUser(session: UserSession | null): boolean {
  return Boolean(session && session.vendorStatus === 'pending');
}

export function canViewFeedAndMarket(_session: UserSession | null): boolean {
  return true;
}

export function canLikeAndComment(session: UserSession | null): boolean {
  if (!session) return false;
  if (isSuspendedVendor(session)) return false;
  if (isAdminUser(session)) return false; // Admin moderates rather than acting as buyer/liker
  return true;
}

export function canModerate(session: UserSession | null): boolean {
  return isAdminUser(session);
}

export function canBuy(session: UserSession | null): boolean {
  if (!session) return false;
  if (isAdminUser(session)) return false;
  if (isSuspendedVendor(session)) return false;
  return true;
}

export function canPublishPostOrStory(session: UserSession | null): boolean {
  return isApprovedVendorUser(session);
}

export function canViewOwnSalesOrders(session: UserSession | null): boolean {
  if (!session) return false;
  return (
    session.role === 'vendor' &&
    (session.vendorStatus === 'approved' || session.vendorStatus === 'suspended') &&
    Boolean(session.shopId)
  );
}

export function canManageOwnSalesOrders(session: UserSession | null): boolean {
  return isApprovedVendorUser(session);
}

export function canRespondToRfq(session: UserSession | null): boolean {
  return isApprovedVendorUser(session);
}

export function canCreateRfq(session: UserSession | null): boolean {
  return canBuy(session);
}

export function canRequestVendorKyc(session: UserSession | null): boolean {
  if (!session) return false;
  if (isAdminUser(session)) return false;
  if (isSuspendedVendor(session)) return false;
  if (session.vendorStatus === 'pending' || session.vendorStatus === 'approved') return false;
  return session.role === 'client' && (session.vendorStatus === 'none' || session.vendorStatus === 'rejected');
}

export function canAccessAdmin(session: UserSession | null): boolean {
  return isAdminUser(session);
}

export function canUseWalletAndReferral(session: UserSession | null): boolean {
  if (!session) return false;
  if (isAdminUser(session)) return false;
  return true;
}

export function canSendMessage(session: UserSession | null): boolean {
  if (!session) return false;
  if (isSuspendedVendor(session)) return false;
  return true;
}
