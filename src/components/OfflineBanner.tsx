import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';

interface OfflineBannerProps {
  isOnline: boolean;
  justReconnected: boolean;
  t: DroppDictionary;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  justReconnected,
  t,
}) => {
  if (isOnline && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-opacity duration-200 ${
        !isOnline
          ? 'bg-[#F5A524] text-black border border-[#D98B10]'
          : 'bg-[#FF5A1F] text-white border border-[#E54E19]'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t.network.offlineBanner}</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t.network.backOnlineBanner}</span>
        </>
      )}
    </div>
  );
};
