import { useCallback, useEffect, useState } from 'react';

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
  saveData?: boolean;
}

const DATA_SAVER_STORAGE_KEY = 'dropp_data_saver_manual';

function readNetworkInfo(): { effectiveType: string; browserSaveData: boolean } {
  if (typeof navigator === 'undefined') {
    return { effectiveType: '4g', browserSaveData: false };
  }
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return {
    effectiveType: conn?.effectiveType || '4g',
    browserSaveData: Boolean(conn?.saveData),
  };
}

export function useNetworkProfile() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const [effectiveType, setEffectiveType] = useState<string>(() => readNetworkInfo().effectiveType);
  const [manualDataSaver, setManualDataSaver] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DATA_SAVER_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const isSlowNetwork =
    effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

  const dataSaver = manualDataSaver || isSlowNetwork || readNetworkInfo().browserSaveData;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setJustReconnected(false), 3200);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const handleConnChange = () => {
      const next = readNetworkInfo();
      setEffectiveType(next.effectiveType);
    };
    conn?.addEventListener?.('change', handleConnChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      conn?.removeEventListener?.('change', handleConnChange);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const toggleManualDataSaver = useCallback(() => {
    setManualDataSaver((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DATA_SAVER_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage quota errors on low-end devices
      }
      return next;
    });
  }, []);

  return {
    isOnline,
    justReconnected,
    effectiveType,
    isSlowNetwork,
    dataSaver,
    manualDataSaver,
    toggleManualDataSaver,
  };
}
