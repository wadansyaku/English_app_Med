import React, { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseSlotProps {
  slot?: string;
  label?: string;
  minHeightClassName?: string;
  className?: string;
}

const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID?.trim();
const DEFAULT_SLOT = import.meta.env.VITE_ADSENSE_SLOT_DEFAULT?.trim();

const ensureAdSenseScript = (clientId: string) => {
  if (document.querySelector('script[data-medace-adsense="true"]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.medaceAdsense = 'true';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  document.head.appendChild(script);
};

const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  slot,
  label = 'スポンサーリンク',
  minHeightClassName = 'min-h-[160px]',
  className = '',
}) => {
  const initialized = useRef(false);
  const [loadError, setLoadError] = useState(false);
  const resolvedSlot = useMemo(() => slot?.trim() || DEFAULT_SLOT, [slot]);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !resolvedSlot || initialized.current) return;

    ensureAdSenseScript(ADSENSE_CLIENT_ID);
    initialized.current = true;

    const frame = window.requestAnimationFrame(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn('AdSense init skipped', error);
        setLoadError(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [resolvedSlot]);

  if (!ADSENSE_CLIENT_ID || !resolvedSlot) {
    if (!import.meta.env.DEV) return null;

    return (
      <div className={`rounded-[28px] border border-dashed border-medace-200 bg-white/70 p-5 ${className}`}>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
        <div className={`mt-3 flex items-center justify-center rounded-3xl bg-slate-50 text-sm font-medium text-slate-500 ${minHeightClassName}`}>
          AdSense preview: `VITE_ADSENSE_CLIENT_ID` / `VITE_ADSENSE_SLOT_DEFAULT`
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <ins
        className={`adsbygoogle block overflow-hidden rounded-3xl bg-slate-50 ${minHeightClassName}`}
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={resolvedSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      {loadError && (
        <div className="mt-3 text-xs text-slate-400">
          広告の読み込みに失敗したため、この枠はスキップされました。
        </div>
      )}
    </div>
  );
};

export default AdSenseSlot;
