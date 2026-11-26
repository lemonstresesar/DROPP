import type { LanguageCode, PriceTier } from '../types/dropp';

/**
 * Formats an integer FCFA amount as "12 500 FCFA" with regular space thousands separator.
 */
export function formatFcfa(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const formatted = safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

/**
 * Formats large social counts concisely (e.g. 14200 -> "14,2 k" in FR or "14.2K" in EN).
 */
export function formatCompactCount(count: number, lang: LanguageCode = 'fr'): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
  if (safe < 1000) return String(safe);
  if (safe < 1_000_000) {
    const val = (safe / 1000).toFixed(1).replace(/\.0$/, '');
    return lang === 'fr' ? `${val.replace('.', ',')} k` : `${val}K`;
  }
  const val = (safe / 1_000_000).toFixed(1).replace(/\.0$/, '');
  return lang === 'fr' ? `${val.replace('.', ',')} M` : `${val}M`;
}

/**
 * Resolves the applicable wholesale unit price for a requested quantity and optional variant delta.
 */
export function getUnitPriceForQty(
  tiers: PriceTier[],
  qty: number,
  fallbackPriceFcfa: number,
  variantDeltaFcfa = 0
): number {
  const safeQty = Math.max(1, Math.floor(qty));
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let matched = fallbackPriceFcfa;
  for (const tier of sorted) {
    const inMin = safeQty >= tier.minQty;
    const inMax = tier.maxQty === null || safeQty <= tier.maxQty;
    if (inMin && inMax) {
      matched = tier.unitPriceFcfa;
      break;
    }
    if (inMin) {
      matched = tier.unitPriceFcfa;
    }
  }
  return Math.max(0, Math.round(matched + variantDeltaFcfa));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
